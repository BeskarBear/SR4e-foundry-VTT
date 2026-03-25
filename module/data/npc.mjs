/**
 * @file npc.mjs
 * @description DataModel for a Non-Player Character (NPC) or Critter in
 *              Shadowrun 4th Edition 20th Anniversary (SR4A).
 *
 * NPC stat blocks differ from PC stat blocks in several important ways:
 *
 *   1. NO BUILD POINTS — NPCs are not created with the 400 BP chargen system.
 *      The GM assigns attributes directly to match the desired threat level.
 *
 *   2. PROFESSIONAL RATING (PR) — SR4A's primary NPC shorthand tool (p.280).
 *      Instead of tracking every skill individually, generic NPCs use their PR
 *      to generate dice pools on the fly: PR×2 for most actions, PR×3 for
 *      specialists in their core role. Named/recurring NPCs may have full
 *      attribute blocks instead.
 *
 *   3. STORED CONDITION MONITOR MAXIMA — Unlike PCs (whose CM maxima are
 *      computed from Body/Willpower), NPCs store their CM max as a direct field.
 *      This lets the GM set an arbitrary value for critters, spirits, or other
 *      non-standard entities without being bound by the 8+ceil(attr/2) formula.
 *
 *   4. PRE-COMPUTED POOLS — The `pools` section stores ready-to-roll dice counts
 *      for the four most common NPC actions, avoiding attribute math at the table.
 *
 *   5. SIMPLIFIED ARMOR/WEAPON SUMMARY — Rather than linked weapon items, an NPC
 *      can record its primary weapon inline as a DV string and pool count, enabling
 *      fast combat resolution without item lookups.
 *
 * SR4A reference: Core Rulebook p.280-299 (NPC archetypes and stat blocks).
 *
 * @see CharacterDataModel — full PC model with BP tracking, all skills, etc.
 */
export class NpcDataModel extends foundry.abstract.TypeDataModel {

  /**
   * Defines the Foundry DataModel schema for an NPC. Designed to be fast to set
   * up at the table and easy to run without page-flipping. Named/recurring NPCs
   * (lieutenants, major villains, recurring contacts turned hostile) can use the
   * full attribute block; generic grunts use Professional Rating alone.
   *
   * @returns {object} Foundry schema definition object
   */
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── IDENTITY ──────────────────────────────────────────────────────────
      //
      // Quick-reference flavor fields for the GM. None affect dice rolls directly,
      // but they help organize encounters and track who's who in a firefight.

      /**
       * The NPC's role in the encounter (e.g., "Corp Security", "Ganger Lieutenant",
       * "Lone Star Cop"). Used to quickly identify the NPC's purpose and remind the
       * GM what this archetype is supposed to do tactically.
       */
      role:       new fields.StringField({ initial: "" }),    // "Corp Security", "Ganger", etc.

      /**
       * Archetype label — a more specific classification within the role
       * (e.g., "Sniper", "Mage Support", "Street Doc"). Purely organizational.
       */
      archetype:  new fields.StringField({ initial: "" }),

      /**
       * Metatype (human, elf, dwarf, ork, troll). Used for flavor and to inform
       * any metatype-specific rules that might apply (e.g., Troll natural Dermal
       * Armor, Ork low-light vision). Does not automatically apply racial attribute
       * adjustments — those are set directly in the attributes block below.
       */
      metatype:   new fields.StringField({ initial: "human" }),

      /**
       * Faction or organizational affiliation (e.g., "Aztechnology", "Halloweeners",
       * "DocWagon HTR", "Lone Star"). Used for encounter tracking, reaction tables,
       * and determining who cares if this NPC dies.
       */
      affiliation: new fields.StringField({ initial: "" }),

      // ── PROFESSIONAL RATING (1-6) ────────────────────────────────────────
      //
      // Professional Rating (PR) is the SR4A shorthand for NPC competence (p.280).
      // It lets the GM run generic NPCs without tracking a full attribute/skill block.
      //
      // TIER GUIDE:
      //   PR 1-2 — Street trash, untrained civilians, panicked bystanders.
      //            Cannon fodder. Will break and run at the first sign of real violence.
      //   PR 3-4 — Professional operatives: corporate security, experienced gangers,
      //            street samurai available for hire. Competent and dangerous in groups.
      //   PR 5-6 — Elite operators: HTR teams, special forces, top-tier assassins,
      //            veteran shadowrunners turned opposition. Individually lethal.
      //
      // DICE POOL DERIVATION (SR4A p.280):
      //   • General actions:          PR × 2 dice
      //   • Core specialty actions:   PR × 3 dice
      //   • Out-of-specialty actions: PR × 1 die (defaulting)
      //
      // Example: A PR 4 security guard fires his SMG (core specialty):
      //   4 × 3 = 12 dice. Dodge (general): 4 × 2 = 8 dice.

      /**
       * Professional Rating (1-6). The primary competence shorthand for this NPC.
       * Default 3 represents a capable but unremarkable street-level professional.
       */
      professionalRating: new fields.NumberField({ initial: 3, min: 1, max: 6, integer: true }),

      // ── ATTRIBUTES (full set for named/recurring NPCs) ───────────────────
      //
      // Full attribute block for named NPCs, major antagonists, or any NPC
      // important enough to warrant individual stats. For generic grunts, these
      // can be left at default (3) and the Professional Rating pools used instead.
      //
      // KEY DIFFERENCE FROM PC MODEL: NPC attributes are stored as flat numbers,
      // NOT as base+augmented SchemaFields. There is no distinction between a natural
      // attribute and an augmented one — the final effective value is entered directly.
      // This reduces data entry friction for the GM while sacrificing the ability to
      // track pre/post-ware values (rarely needed for NPCs).
      //
      // All attributes default to 3, which is a "average person" baseline in SR4A
      // and matches a PR 3 NPC's implied competence level.

      attributes: new fields.SchemaField({
        /**
         * Body (BOD) — Physical resilience. Used for damage resistance (Body + Armor),
         * toxin resistance, and the Physical Condition Monitor on the PC model.
         * For NPCs, the CM max is stored directly rather than computed. SR4A p.51.
         */
        body:      new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

        /**
         * Agility (AGI) — Dexterity and coordination. Linked to all combat skills
         * (ranged and melee) and physical precision skills. SR4A p.51.
         */
        agility:   new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

        /**
         * Reaction (REA) — Reflexes and response speed. Feeds initiative base (REA + INT) and defense
         * tests. Increased by Wired Reflexes, Synaptic Boosters. SR4A p.51.
         */
        reaction:  new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

        /**
         * Strength (STR) — Raw physical power. Sets melee unarmed damage code and
         * many STR+N weapon damage codes. Also determines throwing range. SR4A p.51.
         */
        strength:  new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

        /**
         * Charisma (CHA) — Social presence and force of personality. Linked to all
         * social skills. Part of Hermetic drain resistance (WIL+CHA). SR4A p.52.
         */
        charisma:  new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

        /**
         * Intuition (INT) — Pattern recognition and gut instinct. Feeds initiative
         * base (REA + INT), Perception tests, and Shamanic drain resistance. SR4A p.52.
         */
        intuition: new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

        /**
         * Logic (LOG) — Analytical ability. Linked to technical and hacking skills.
         * Technomancer Living Persona System = Logic. SR4A p.52.
         */
        logic:     new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

        /**
         * Willpower (WIL) — Mental fortitude. Part of drain/fading resistance.
         * Also contributes to composure, memory, and morale tests. SR4A p.52.
         */
        willpower: new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

        /**
         * Edge (EDG) — Luck/fate points the NPC can spend (SR4A p.52). Most generic
         * NPCs have Edge 0 (no luck — they're just numbers). Named antagonists may
         * have Edge 1-3. Edge min is 0 here (unlike PCs who must have at least 1).
         */
        edge:      new fields.NumberField({ initial: 1, min: 0, max: 7, integer: true }),

        /**
         * Essence (ESS) — Life-force. Starts at 6.0; reduced by cyberware. At 0 the
         * NPC dies. For cybered NPCs, set this below 6 to reflect installed ware.
         * Caps effective Magic for Awakened NPCs just like for PCs. SR4A p.52.
         */
        essence:   new fields.NumberField({ initial: 6.0, min: 0, max: 6, nullable: true }),

        /**
         * Magic (MAG) — Awakened connection to mana. 0 for mundane NPCs. Non-zero
         * for mage enemies, shamans, adept opponents. Determines spell Force limits
         * and adept power points, same as for PCs. SR4A p.53.
         */
        magic:     new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true }),

        /**
         * Resonance (RES) — Technomancer matrix connection. 0 for non-TM NPCs.
         * Technomancer NPCs use this to derive Living Persona attributes if needed.
         * SR4A p.53.
         */
        resonance: new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true })
      }),

      // ── KEY DICE POOLS (pre-computed for quick use) ──────────────────────
      //
      // These four pools cover the vast majority of what an NPC does in combat
      // and social encounters. Pre-computing them during NPC prep lets the GM
      // grab and roll without stopping to add Agility + Pistols every time.
      //
      // For a PR-based NPC, pools are typically: PR×3 for specialty, PR×2 general.
      // For a fully-statted NPC, pools are computed manually from attributes + skills.
      //
      // Store the rolled pools instead of computing from attributes each time

      pools: new fields.SchemaField({
        /**
         * Combat attack pool — the NPC's primary offensive dice count.
         * Example derivation for a statted NPC: Agility + Pistols (or Automatics).
         * For a PR 4 security guard: 4×3 = 12 dice (core specialty).
         * Default 6 ≈ PR 3 specialist or PR 4 general.
         */
        combat:    new fields.NumberField({ initial: 6, min: 0, integer: true }),

        /**
         * Defense/dodge pool — dice rolled to avoid being hit by attacks.
         * Standard defense in SR4A: Reaction (ranged dodge) or Reaction+Intuition
         * for some melee. For PR-based NPCs: PR×2 (general action).
         * Default 6 ≈ PR 3 specialist or PR 4 general.
         */
        defense:   new fields.NumberField({ initial: 6, min: 0, integer: true }),

        /**
         * Perception pool — dice for noticing threats, hidden items, or sneaking runners.
         * SR4A: Intuition + Perception skill. For PR-based: PR×2 (general).
         * Default 5 ≈ moderate alertness.
         */
        perception: new fields.NumberField({ initial: 5, min: 0, integer: true }),

        /**
         * Social pool — dice for interpersonal interactions: intimidation, negotiation,
         * detecting lies. SR4A: Charisma + social skill. For PR-based: PR×2 (general).
         * Default 5 reflects an average social capability.
         */
        social:    new fields.NumberField({ initial: 5, min: 0, integer: true })
      }),

      // ── CONDITION MONITORS ────────────────────────────────────────────────
      //
      // Same two-track damage system as PCs (SR4A p.163-164), but the MAXIMA are
      // stored directly rather than computed from attributes. This design choice:
      //   • Allows custom CM sizes for critters (a troll with 14 Physical boxes)
      //   • Avoids requiring the GM to set a full Body/Willpower block for each NPC
      //   • Supports non-metahuman entities (spirits, drones, vehicles) with
      //     unconventional damage tracks
      //
      // Default CM max of 10 corresponds roughly to a Body/Willpower 4 character
      // (8 + ceil(4/2) = 10), matching a PR 3-4 NPC's expected toughness.
      //
      // WOUND MODIFIERS still apply to NPCs: -1 die per 3 combined damage boxes.
      // This is computed by the woundModifier getter below, identical to the PC formula.

      condition: new fields.SchemaField({
        physical: new fields.SchemaField({
          /**
           * Current Physical damage boxes filled. Starts at 0; GM fills boxes as
           * the NPC takes physical damage. When value reaches max, the NPC is dying.
           */
          value: new fields.NumberField({ initial: 0, min: 0, integer: true }),
          /**
           * Physical CM maximum. Stored directly (not derived from Body).
           * Default 10 = equivalent of Body 4. Adjust for tougher/weaker NPCs.
           * Formula if using Body: 8 + ceil(Body / 2).
           */
          max:   new fields.NumberField({ initial: 10, min: 1, integer: true })
        }),
        stun: new fields.SchemaField({
          /**
           * Current Stun damage boxes filled. When value reaches max, NPC is
           * knocked unconscious. Overflow transfers 1:1 to Physical.
           */
          value: new fields.NumberField({ initial: 0, min: 0, integer: true }),
          /**
           * Stun CM maximum. Stored directly (not derived from Willpower).
           * Default 10 = equivalent of Willpower 4.
           * Formula if using Willpower: 8 + ceil(Willpower / 2).
           */
          max:   new fields.NumberField({ initial: 10, min: 1, integer: true })
        })
      }),

      // ── ARMOR / WEAPON SUMMARY ────────────────────────────────────────────
      //
      // SR4A damage resistance (SR4A p.154-155):
      //   Attacker rolls weapon DV dice; defender rolls Body + Armor.
      //   Net attacker hits determine final damage applied to CM.
      //
      // Armor in SR4A has two values:
      //   • Ballistic (B) — resists ranged weapon damage (bullets, explosive fragments)
      //   • Impact (I)    — resists melee and blast damage (blunt force, shockwaves)
      //
      // The NPC's weapon is recorded inline here as a quick-reference summary rather
      // than requiring a linked weapon Item. The GM can override with an actual Item
      // if more detail is needed.

      /**
       * Armor Ballistic rating — the NPC's total ballistic protection (sum of all
       * worn armor layers, subject to the Layering rules if applicable). Used in
       * damage resistance vs. ranged attacks: Body + armorB dice pool.
       */
      armorB:  new fields.NumberField({ initial: 0, min: 0, integer: true }),

      /**
       * Armor Impact rating — the NPC's total impact protection against melee
       * and concussion. Used in damage resistance vs. melee/blast: Body + armorI.
       */
      armorI:  new fields.NumberField({ initial: 0, min: 0, integer: true }),

      /**
       * Weapon name / description string (e.g., "Ares Predator IV", "Katana",
       * "Remington 990 shotgun"). Free text for GM reference; no mechanical parsing.
       */
      weaponSummary: new fields.StringField({ initial: "" }),

      /**
       * Attack dice pool for the NPC's primary weapon. This is the total dice
       * rolled to hit (Agility + Weapon Skill, already summed). For PR-based NPCs,
       * typically PR×3 for combat specialists.
       */
      weaponPool:    new fields.NumberField({ initial: 6, min: 0, integer: true }),

      /**
       * Damage Value (DV) of the primary weapon in SR4A notation.
       * Format: "{number}{P|S}" — e.g., "8P" (8 Physical), "6S" (6 Stun),
       * "STR+2P" (Strength-based melee). P = Physical damage; S = Stun damage.
       * Net attacker hits add to this value to determine final damage.
       */
      weaponDV:      new fields.StringField({ initial: "8P" }),

      /**
       * Armor Penetration (AP) of the primary weapon — a negative modifier
       * applied to the defender's armor rating before the resistance roll.
       * e.g., AP -4 means the defender subtracts 4 from their effective armor.
       * AP 0 = standard ammunition with no penetration bonus/penalty.
       * Stored as a signed integer; typically 0 or negative. SR4A p.154.
       */
      weaponAP:      new fields.NumberField({ initial: 0, integer: true }),

      // ── INITIATIVE ────────────────────────────────────────────────────────
      //
      // NPC initiative follows the same formula as PCs (SR4A p.149-150):
      //   Initiative Score = Reaction + Intuition + roll(1d6 × initiativePasses worth of dice)
      //
      // The base score is computed by the initiativeBase getter. Most generic NPCs
      // get only 1 initiative pass (standard). Elite NPCs with Wired Reflexes may
      // have 2-4 passes — this is the primary reason street samurai are so dangerous.
      //
      // NOTE: The number of initiative DICE is not stored separately here — generic
      // NPCs always roll 1d6. If an NPC has multiple initiative dice (from ware), add
      // that to the roll manually or create a full CharacterDataModel actor instead.

      /**
       * Number of Initiative Passes per combat round. Standard = 1.
       * Elite NPCs (Wired Reflexes, HTR teams) may have 2-4. This grants additional
       * actions when most combatants have exhausted their passes. SR4A p.149-150.
       */
      initiativePasses: new fields.NumberField({ initial: 1, min: 1, max: 4, integer: true }),

      // ── SPECIAL ABILITIES ─────────────────────────────────────────────────
      //
      // Free-form array for any abilities, powers, or notes that don't fit the
      // standard fields. Used for:
      //   • Critter powers (Immunity to Normal Weapons, Paralyzing Howl, etc.)
      //   • Unique cyberware effects (e.g., "bone lacing: +2 Physical damage resist")
      //   • Special tactics or environmental advantages
      //   • Magical abilities for NPC mages (brief summary of known spells, spirits)
      //   • Anything the GM needs to remember mid-combat
      //
      // These are narrative/reminder entries, not mechanically parsed by the system.

      /**
       * Array of special ability entries. Each has a name and a notes field.
       * Add as many as needed for the NPC's unique capabilities.
       */
      specialAbilities: new fields.ArrayField(new fields.SchemaField({
        /** Name of the ability (e.g., "Immunity to Normal Weapons", "Wired Reflexes 2"). */
        name:    new fields.StringField({ initial: "" }),
        /** Mechanical description or reminder for the GM (e.g., "+2 initiative passes, dice pool"). */
        notes:   new fields.StringField({ initial: "" })
      })),

      // ── NOTES ─────────────────────────────────────────────────────────────

      /** Physical description, background, and flavor text for the NPC. HTML formatted. */
      description: new fields.HTMLField({ initial: "" }),

      /**
       * Tactical notes — how this NPC behaves in combat or social encounters.
       * e.g., "Takes cover immediately. Calls for backup after 1 round. Will not
       * pursue past the perimeter." Kept as plain text for quick scanning mid-session.
       */
      tactics:     new fields.StringField({ initial: "" }),

      /** Additional GM notes — connections to other NPCs, plot hooks, secrets. HTML formatted. */
      notes:       new fields.HTMLField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ────────────────────────────────────────────────────

  /**
   * Physical Condition Monitor maximum for this NPC.
   *
   * Unlike PCs (where physicalCMMax = 8 + ceil(Body/2) and is computed),
   * NPCs store their CM max as a direct field to allow custom values for
   * critters, spirits, and non-standard entities. This getter simply
   * exposes the stored value through the same interface as the PC model,
   * so sheet templates and roll macros can use identical code for both.
   *
   * @returns {number} Stored physical CM maximum
   */
  get physicalCMMax() {
    return this.condition.physical.max;
  }

  /**
   * Stun Condition Monitor maximum for this NPC.
   *
   * Same design rationale as physicalCMMax — stored directly rather than
   * computed, for flexibility with non-standard NPC types.
   *
   * @returns {number} Stored stun CM maximum
   */
  get stunCMMax() {
    return this.condition.stun.max;
  }

  /**
   * Wound modifier — the dice penalty applied to ALL dice pools based on
   * accumulated damage. Identical formula to the PC model.
   *
   * Formula: -floor((Physical boxes + Stun boxes) / 3)  (SR4A p.164)
   *
   * Examples:
   *   0-2 total boxes → 0 penalty
   *   3-5 total boxes → -1 die
   *   6-8 total boxes → -2 dice
   *
   * Apply this to the pre-computed pools values (or PR-derived pools) when
   * the NPC is damaged. An NPC at 9 boxes combined is at -3 dice to everything
   * and close to going down.
   *
   * @returns {number} Negative integer (or 0 if undamaged)
   */
  get woundModifier() {
    const total = this.condition.physical.value + this.condition.stun.value;
    return -Math.floor(total / 3);
  }

  /**
   * Base initiative score for physical (meatspace) combat, before rolling the d6.
   *
   * Formula: Reaction + Intuition  (SR4A p.149)
   *
   * Full formula at roll time:
   *   Initiative Score = Reaction + Intuition + roll(1d6)
   *
   * For NPCs with multiple initiative passes (from ware), the initiativePasses
   * field records how many times they get to act before losing their pass.
   *
   * @returns {number} Reaction + Intuition
   */
  get initiativeBase() {
    return this.attributes.reaction + this.attributes.intuition;
  }
}
