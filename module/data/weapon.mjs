/**
 * @file weapon.mjs
 * @description DataModel for a Weapon item in Shadowrun 4th Edition
 *              20th Anniversary (SR4A).
 *
 * This model covers all weapon categories: melee, ranged, thrown, grenades, and
 * explosives. The same DataModel handles everything from a hold-out pistol to an
 * assault rifle to a monofilament whip, using weaponType and category to gate
 * which mechanics apply to each instance.
 *
 * ── SR4A COMBAT RESOLUTION OVERVIEW (p.144-175) ──────────────────────────────
 * 1. ATTACK:    Attacker rolls (Skill + linked Attribute) dice.
 *              Net hits above threshold 1 increase effective DV.
 * 2. DEFENSE:  Defender rolls Reaction (ranged) or Reaction+Intuition (melee).
 *              Net hits reduce attacker's net hits.
 * 3. RESISTANCE: Defender rolls (Body + Armor) vs. final modified DV.
 *               Net hits above DV = damage absorbed; remaining hits fill CM.
 *
 * ── SR4 DAMAGE NOTATION ──────────────────────────────────────────────────────
 * SR4 weapons use Damage Value (DV) + damage type notation:
 *   "8P"    — DV 8, Physical damage (resisted by Body + Armor; fills Physical CM)
 *   "6S"    — DV 6, Stun damage (resisted by Body + Armor; fills Stun CM)
 *   "STR+2P"— Melee weapons where DV = Strength + modifier (computed at roll time)
 *
 * Armor Penetration (AP) modifies the effective armor value before resistance:
 *   AP -4   — reduces defender's armor rating by 4 (APDS ammo, for example)
 *   AP +0   — no modification (standard ball ammo)
 *   AP +2   — harder to penetrate (Hollow Point; better DV vs. unarmored, worse vs. armor)
 *
 * ── SR4 FIRE MODES (SR4A p.146-148) ─────────────────────────────────────────
 * Fire mode affects rounds consumed, dice pool modifiers, and DV bonuses:
 *   SS  — Single Shot: 1 round; no modifier
 *   SA  — Semi-Auto: 1 round; no modifier (SA Burst: +1 DV, -2 dice, 3 rounds)
 *   BF  — Burst Fire: +2 DV, -2 def dice (narrow/3 rounds) or +2 dice/-2 DV (wide/10)
 *   FA  — Full Auto: narrow burst +6 DV/-9 def (6 rounds); wide +9 DV/-9 def (10 rds)
 *
 * ── SR4 RECOIL (SR4A p.148-149) ─────────────────────────────────────────────
 * Recoil is a NEGATIVE DICE POOL modifier.
 * Uncompensated recoil = rounds fired this action - total RC (Recoil Compensation).
 * Total RC = character's STR/3 (round up) + weapon RC + accessory RC bonuses.
 * Recoil accumulates across actions within a combat turn; resets at turn start.
 *
 * ── LINKED SKILL ─────────────────────────────────────────────────────────────
 * The `category` field determines which PC active skill is used for the attack
 * dice pool. All firearm skills and melee skills link to Agility (SR4A p.130-131).
 * Melee weapons use: Blades, Clubs, or Unarmed Combat.
 * Ranged weapons use: Pistols, Automatics, Longarms, Heavy Weapons, etc.
 *
 * SR4A reference: Core Rulebook p.144-175 (combat), p.310-330 (weapon tables).
 */
export class WeaponDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── CLASSIFICATION ──────────────────────────────────────────────────────
      // weaponType governs which sheet tab it appears in and roll logic.
      // isMelee / isRanged getters are derived from this field.

      /**
       * Broad weapon type. Governs which combat rules apply to this weapon:
       *   • melee     — close combat; Reach applies; defense = REA+INT; no ammo/recoil
       *   • ranged    — firearm or projector; fire mode + ammo + recoil all apply
       *   • thrown    — hurled weapon (knife, shuriken, grenade); range = STR × table
       *   • grenade   — area-effect; uses grenade deviation rules for indirect throws
       *   • explosive — planted/proximity detonated; Demolitions skill governs use
       */
      weaponType: new fields.StringField({ initial: "ranged",
        choices: ["melee", "ranged", "thrown", "grenade", "explosive"] }),

      /**
       * Weapon category — maps to the PC active skill used for the attack dice pool.
       * All categories link to Agility as the governing attribute (SR4A p.130-131).
       *
       * Category → Linked Skill:
       *   blades/clubs/unarmedCombat/exoticMelee → Blades / Clubs / Unarmed Combat
       *   pistols          → Pistols (hold-outs, semi-autos, heavy pistols)
       *   automatics       → Automatics (SMGs, assault rifles, machine pistols)
       *   longarms         → Longarms (sniper rifles, shotguns, hunting rifles)
       *   heavyWeapons     → Heavy Weapons (LMGs, rocket launchers, grenade launchers)
       *   exoticRanged     → Exotic Ranged Weapon
       *   throwingWeapons  → Throwing Weapons (thrown knives, shuriken, grenades)
       *   grenades         → Throwing Weapons (manual throw) or Heavy Weapons (launcher)
       *   launchers        → Heavy Weapons (grenade/rocket launcher)
       *   exotic           → catch-all for non-standard weapons
       */
      category:   new fields.StringField({ initial: "pistols",
        choices: ["blades", "clubs", "unarmedCombat", "exoticMelee",
                  "pistols", "automatics", "longarms", "heavyWeapons",
                  "exoticRanged", "throwingWeapons", "grenades", "launchers",
                  "exotic"] }),

      // ── DAMAGE ─────────────────────────────────────────────────────────────
      //
      // Final damage formula at resolution time:
      //   Effective DV = weapon.dv + ammo.dvMod + attacker net hits - defender net hits
      //   Resistance dice = Body + (Armor + ammo.apMod + weapon.ap)   [minimum 1 die]
      //   Boxes of damage applied = max(0, Effective DV - resistance hits)

      /**
       * Base Damage Value (DV) in SR4A string notation. Stored as a string because
       * some melee weapons scale with Strength rather than using a flat number.
       *
       * Common formats:
       *   "8P"      — DV 8, Physical (typical heavy pistol)
       *   "6S"      — DV 6, Stun (taser, stun baton)
       *   "STR+2P"  — Strength + 2, Physical (sword, most blades)
       *   "STR+3P"  — Strength + 3, Physical (large melee: claymore, combat axe)
       *   "10P-2"   — DV 10, AP-2 baked into DV string (some sourcebook entries)
       *
       * The roll engine parses this string at attack time to resolve "STR" references
       * against the wielding actor's Strength and applies ammo.dvMod on top.
       * Stored as string: "8P" → DV 8, Physical
       * Strength-based melee: "STR+2P" → computed at roll time using actor's STR
       */
      dv:          new fields.StringField({ initial: "8P" }),

      /**
       * Armor Penetration (AP) — modifier subtracted from the defender's effective
       * armor rating before the resistance roll (SR4A p.154).
       *
       * Negative = armor-piercing (reduces defender's armor pool):
       *   0    — standard ball ammo / mundane melee
       *  -2    — APDS handgun loads
       *  -4    — most rifle APDS; standard assault rifle ball
       *  -6    — sniper rifles; military APDS
       *  -8    — anti-vehicle / heavy APDS loads
       *
       * Positive = harder to penetrate (worse AP, used by some flechette/HP rounds):
       *  +2    — Hollow Point (better DV vs. unarmored, but armor blocks more)
       *  +5    — Flechette (spreads on impact; nearly useless vs. armor)
       *
       * ammo.apMod adds to this value when non-standard ammo is loaded.
       * Examples: standard ammo AP 0, APDS -6, Hollow Point +2 (worse vs armor)
       */
      ap:          new fields.NumberField({ initial: 0, integer: true }),

      /**
       * Base damage type — Physical (fills Physical CM) or Stun (fills Stun CM).
       * Physical is lethal; a character whose Physical CM fills begins dying.
       * Stun knocks out; overflow from a full Stun CM transfers 1:1 to Physical.
       *
       * Most firearms deal Physical. Tasers, stun batons, and some melee deal Stun.
       * ammo.damageTypeOverride can change this for the currently loaded ammo
       * (e.g., Gel rounds change a normally-Physical pistol to Stun).
       */
      // damageType: whether this weapon inflicts Physical or Stun damage by default.
      // Note: ammo type can override this (e.g. Stick-n-Shock → Stun)
      damageType:  new fields.StringField({ initial: "physical",
        choices: ["physical", "stun"] }),

      // ── RANGED SPECIFICS ───────────────────────────────────────────────────
      // These fields only apply to weaponType "ranged" (and partly "thrown").
      // isRanged getter identifies which weapons these apply to.

      /**
       * Available fire modes — determines which attack options the wielder can choose
       * each action (SR4A p.146-148). Slash-separated combos mean the weapon supports
       * multiple modes; the attacker selects which to use for each individual attack.
       *
       * Mode → Dice/DV modifier → Rounds consumed:
       *   SS       — no modifier; 1 round (bolt-action rifles, some pistols)
       *   SA       — no modifier; 1 round (most modern pistols, semi-auto longarms)
       *   SA Burst — -2 dice to attacker; +1 DV; 3 rounds (optional SA upgrade)
       *   BF Narrow— -2 dice to defender; +2 DV; 3 rounds
       *   BF Wide  — +2 dice to attacker; -2 DV; 10 rounds (suppression variant)
       *   FA Narrow— -9 dice to defender; +6 DV; 6 rounds
       *   FA Wide  — -9 dice to defender; +9 DV; 10 rounds
       *
       * Common weapon mode profiles:
       *   "SS"         — bolt-action rifle, revolver
       *   "SA"         — semi-auto pistol, hunting rifle
       *   "SA/BF"      — SMG, carbine (versatile)
       *   "SA/BF/FA"   — assault rifle (full military)
       *   "BF/FA"      — LMG, SAW (no precision mode)
       */
      // mode: which fire modes this weapon supports — determines available options
      // in the FireModeDialog. Slash-separated combos mean multiple modes available.
      mode: new fields.StringField({ initial: "SA",
        choices: ["SS", "SA", "BF", "FA", "SS/SA", "SA/BF", "SA/BF/FA", "BF/FA"] }),

      /**
       * Weapon Recoil Compensation (RC) — the weapon frame's built-in ability to
       * absorb recoil (SR4A p.148-149). Added to the character's personal RC
       * (= STR / 3, rounded up) to get total RC for the attack sequence.
       *
       * The totalRC getter adds this to all installed accessory rcBonus values.
       *
       * Typical weapon RC values:
       *   0 — pistols, hold-outs (low recoil by caliber)
       *   1 — SMGs with built-in compensators; semi-auto shotguns
       *   2 — assault rifles with gas system; LMGs
       *   4+ — vehicle-mounted weapons with dedicated hydraulic dampers
       *
       * Bipods and gas vents add more RC via the accessories array (see totalRC getter).
       */
      // rc: Weapon's base Recoil Compensation. Accessories add more (see totalRC getter).
      rc:   new fields.NumberField({ initial: 0, min: 0, integer: true }),

      /**
       * Ammunition tracking. Covers current count, capacity, and the stat modifications
       * from the currently loaded ammo type.
       *
       * Design note: dvMod, apMod, and damageTypeOverride are COPIED from the ammo item
       * at reload time so the weapon always knows its effective stats without a DB lookup.
       */
      // ammo: current ammunition state.
      //   current/max:           rounds remaining / magazine capacity
      //   type:                  display name of loaded ammo (e.g. "APDS", "Hollow Point")
      //   dvMod/apMod/damageTypeOverride: copied from AmmoDataModel on reload
      ammo: new fields.SchemaField({
        /**
         * Current rounds remaining in the loaded magazine/cylinder/belt.
         * When this hits 0, the weapon is empty — reloading costs a Complex Action
         * (Simple Action with Speed Loader quality). SR4A p.147.
         */
        current:            new fields.NumberField({ initial: 0, min: 0, integer: true }),

        /**
         * Maximum ammunition capacity for this weapon. Typical values by category:
         *   Hold-out pistol: 5     Heavy pistol: 15    SMG: 30
         *   Assault rifle:  30+   Shotgun (pump): 5-10  LMG belt: 100+
         * Set to 0 for melee weapons that don't track ammo.
         */
        max:                new fields.NumberField({ initial: 15, min: 0, integer: true }),

        /**
         * Name/type of the currently loaded ammo for display purposes.
         * e.g., "Regular", "APDS", "Hollow Point", "Gel", "Stick-n-Shock", "Explosive".
         * SR4A p.322-325 documents all ammo types and their stat modifications.
         */
        type:               new fields.StringField({ initial: "Regular" }),

        // These three fields are COPIED from the AmmoDataModel when reloaded,
        // so the weapon always knows its current effective stats without a DB lookup.

        /**
         * DV modifier from the loaded ammo. Added to weapon base DV at roll time.
         *   Regular: 0  |  Explosive: +2  |  Hollow Point: +2  |  Gel: 0
         * SR4A p.322-325.
         */
        dvMod:              new fields.NumberField({ initial: 0, integer: true }),

        /**
         * AP modifier from the loaded ammo. Added to weapon base AP at roll time.
         *   Regular: 0  |  APDS: -4  |  Hollow Point: +2  |  Flechette: +5
         * Negative = more penetrating (good for attacker); positive = less penetrating.
         * SR4A p.322-325.
         */
        apMod:              new fields.NumberField({ initial: 0, integer: true }),

        /**
         * Damage type override from loaded ammo. Overrides weapon's base damageType.
         *   "none"     — use weapon's default damageType field
         *   "stun"     — Gel, Stick-n-Shock: converts Physical weapon to Stun damage
         *   "physical" — unusual; for special rounds that convert Stun weapons to Physical
         * SR4A p.322-325: Gel/Stick-n-Shock forces "stun".
         */
        damageTypeOverride: new fields.StringField({ initial: "none",
          choices: ["none", "physical", "stun"] })
      }),

      // ── MELEE SPECIFICS ────────────────────────────────────────────────────
      // Only applies to weaponType "melee". Ignored for ranged/thrown/grenade.

      /**
       * Reach rating — the weapon's effective striking distance relative to bare hands.
       * Used in melee combat to determine who gets a dice pool bonus (SR4A p.155).
       *
       * When two melee combatants have different Reach:
       *   Higher Reach attacker/defender gains +(Reach difference) dice.
       *   This incentivizes longer weapons in open ground; tight spaces negate it.
       *
       * Reach 0 — bare hands, short knife, hold-out blade
       * Reach 1 — sword, axe, baton, combat knife, spear (most standard melee)
       * Reach 2 — polearm, staff, naginata, monofilament whip
       * Reach 3 — extreme reach; very long polearms
       *
       * In SR4, Reach grants +2 dice per point of difference (SR4A p.161).
       * reach: bonus to Close Combat tests (SR4A p.161)
       */
      reach: new fields.NumberField({ initial: 0, min: 0, max: 3, integer: true }),

      // ── GENERAL ────────────────────────────────────────────────────────────
      // Equipment meta-fields for acquisition, legality, and sheet organization.

      /**
       * Concealability rating — how easy this weapon is to hide on a person.
       * Higher = easier to conceal. Used for Palming + Agility tests (SR4A p.310).
       *
       * Approximate guide:
       *   -8 or lower — vehicle weapon; impossible to conceal
       *    0          — obvious weapon (assault rifle, shotgun, greatsword)
       *    3          — concealable with heavy jacket (heavy pistol, combat knife)
       *    4          — concealable with long coat (SMG under a coat)
       *    6          — easily hidden (hold-out pistol, small knife)
       *    8+         — palm-sized (micro-pistol, push-dagger)
       *
       * Conceal: Concealability rating (SR4A p.310); higher = easier to hide
       */
      conceal:     new fields.NumberField({ initial: 0, integer: true }),

      /**
       * Availability — how difficult this weapon is to acquire.
       * Format: "{rating}{R|F|}" — e.g., "6", "10R", "12F" (SR4A p.311).
       *   No suffix — legal; available at sporting goods, pawn shops
       *   R (Restricted) — requires firearms license; gun shops / street contacts
       *   F (Forbidden)  — military/government only; illegal civilian ownership
       * The rating is the threshold for an Availability Test when purchasing.
       */
      // Availability (number string, optionally suffixed R/F for restricted/forbidden)
      avail:       new fields.StringField({ initial: "6" }),

      /**
       * Cost in Nuyen (¥). The street or retail price. SR4A p.316-322.
       * Used for character nuyen tracking and purchasing tests.
       * Typical ranges: hold-out ¥180, heavy pistol ¥650, assault rifle ¥1,500,
       * katana ¥1,000, monofilament whip ¥7,500.
       */
      // Cost in Nuyen
      cost:        new fields.NumberField({ initial: 0, min: 0, integer: true }),

      /**
       * Source book abbreviation — which SR4A publication this weapon stat block
       * comes from (e.g., "SR4A" = core rulebook, "Arsenal" = gear supplement).
       * Purely for GM reference when cross-checking stats.
       */
      // Sourcebook reference
      source:      new fields.StringField({ initial: "SR4A" }),

      // ── MODIFICATIONS ──────────────────────────────────────────────────────
      // Accessories and modifications installed on this weapon. Each entry
      // contributes rcBonus to the totalRC getter. Other effects (dice bonuses,
      // conceal changes) are noted in the notes field.
      //
      // Common accessories and typical RC bonuses:
      //   Bipod:              +2 RC when prone/braced (0 when standing)
      //   Gas Vent 1/2/3:     +1/+2/+3 RC (permanentlyinstalled)
      //   Foregrip:           +1 RC
      //   Shock Pad:          +1 RC (shotguns and rifles)
      //   Folding Stock:      +1 RC (deployed); -1 Conceal when deployed
      //   Smartgun System:    0 RC; grants +2 dice when used with Smartlink

      /**
       * Array of installed weapon accessories/modifications. The rcBonus values
       * are summed by the totalRC getter. Other mechanical effects go in notes.
       */
      accessories: new fields.ArrayField(new fields.SchemaField({
        /** Accessory name (e.g., "Smartgun System", "Gas Vent 2", "Folding Stock"). */
        name:    new fields.StringField({ initial: "" }),
        /**
         * Recoil Compensation bonus provided by this accessory. Summed with weapon
         * base RC in the totalRC getter. Most accessories are 0 RC.
         */
        rcBonus: new fields.NumberField({ initial: 0, integer: true }),
        /**
         * Notes on other mechanical effects (e.g., "+2 dice to attacks within 50m",
         * "reduces noise signature by 3", "-1 Conceal when deployed").
         */
        notes:   new fields.StringField({ initial: "" })
      })),

      // ── SESSION TRACKING ───────────────────────────────────────────────────

      /**
       * Current uncompensated recoil penalty — a NEGATIVE dice pool modifier
       * applied to the next attack with this weapon (SR4A p.148-149).
       *
       * NOT a TN penalty (that was SR3). In SR4, it directly reduces the dice pool.
       *
       * Accumulation formula:
       *   After each attack: recoilPenalty += max(0, roundsFired - totalRC_remaining)
       *   Resets to 0 at the start of each Initiative Pass (SR4A p.148).
       *
       * The FireModeDialog writes to this field when a fire mode is selected.
       * A character with STR 4 (personal RC 2) + weapon totalRC 2 = 4 total RC.
       * Firing a full FA burst (10 rounds) accumulates 10 - 4 = 6 uncompensated recoil.
       */
      // recoilPenalty: accumulated uncompensated recoil for this combat turn.
      // Formula: penalty += max(0, roundsFired - RC); resets at start of each turn.
      recoilPenalty: new fields.NumberField({ initial: 0, min: 0, integer: true }),

      /**
       * Whether this weapon is currently equipped/drawn and ready for use.
       * Unequipped weapons require a Draw Weapon action to make ready:
       *   Holstered/quick-draw accessible: Free Action
       *   Stowed in bag or under clothing: Complex Action
       * SR4A p.162.
       */
      equipped:    new fields.BooleanField({ initial: true }),

      /** Rich-text weapon description, flavor text, and mechanical notes. */
      description: new fields.HTMLField({ initial: "" }),

      /** Plain-text quick notes (special rules reminders, house rule modifications). */
      notes:       new fields.StringField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ───────────────────────────────────────────────────────

  /**
   * Total Recoil Compensation: weapon's base RC plus all accessory RC bonuses.
   *
   * SR4A p.158: Recoil compensation reduces the recoil penalty from sustained fire.
   * Each point of RC negates 1 point of accumulated recoil penalty.
   * Example: Ares Predator V (RC 1) + gas vent 3 (RC 3) = totalRC 4.
   *
   * @returns {number} Total RC available per action phase
   */
  get totalRC() {
    return this.rc + this.accessories.reduce((sum, a) => sum + (a.rcBonus ?? 0), 0);
  }

  /**
   * Whether this is a ranged weapon (uses Firearms/Throwing skills).
   * Thrown weapons and grenades count as ranged for fire mode and range band rules.
   *
   * @returns {boolean}
   */
  get isRanged() {
    return ["ranged", "thrown", "grenade"].includes(this.weaponType);
  }

  /**
   * Whether this is a melee weapon (uses Close Combat skill group).
   *
   * @returns {boolean}
   */
  get isMelee() {
    return this.weaponType === "melee";
  }
}
