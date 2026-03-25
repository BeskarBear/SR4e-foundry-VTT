/**
 * AmmoDataModel — Ammunition item data model (SR4 20th Anniversary).
 *
 * ── SR4A AMMUNITION SYSTEM (SR4A p.162-163, 312-313) ─────────────────────────
 * SR4 ammunition works through two primary modifiers applied to the weapon:
 *
 *   DV Modifier:  Changes the Damage Value of the round.
 *                 DV = base weapon DV + dvModifier.
 *                 Positive = more damage (Explosive, ExEx).
 *                 Negative = less damage (Subsonic, Frangible).
 *
 *   AP Modifier:  Changes the Armor Penetration of the round.
 *                 Effective armor = target's armor rating + AP modifier.
 *                 NEGATIVE AP = better penetration (e.g. APDS is AP -6).
 *                 Positive AP = less penetrating (Hollow Point, Gel Rounds).
 *
 * ── DAMAGE TYPE ───────────────────────────────────────────────────────────────
 * Damage types:
 *   Physical: fills Physical CM boxes; can cause death if track fills
 *   Stun:     fills Stun CM boxes; target goes unconscious when full
 *
 * Most ammo uses the weapon's default damage type.
 * Some ammo OVERRIDES the damage type:
 *   Gel Rounds:       Physical → Stun (non-lethal conversion)
 *   Stick-n-Shock:    Physical → Stun + Electric (electric shock effect)
 *   Hollow Point:     no override — remains Physical but modified DV/AP
 *
 * ── AMMO TYPES AND THEIR EFFECTS ─────────────────────────────────────────────
 *   Regular:         No modifier (DV+0, AP+0). Standard ball ammunition.
 *
 *   APDS:            Armor Piercing Discarding Sabot.
 *                    DV+0, AP-6. Excellent penetration vs armored targets.
 *                    Cannot be used with Burst Fire or Full Auto (manufacturing constraint).
 *
 *   Explosive:       Fragmenting or expanding explosive round.
 *                    DV+1, AP-1. More damage but slightly less penetration.
 *                    Available for pistols, SMGs, rifles.
 *
 *   Frangible:       Designed to fragment on impact; reduced penetration.
 *                    DV-1, AP+4. Poor penetration; minimal collateral damage.
 *                    Good for non-lethal or close-quarters situations.
 *
 *   Gel Rounds:      Non-lethal rubber/gel projectiles.
 *                    DV+0, AP+2, damage type → Stun. Safer for captured targets.
 *
 *   Hollow Point:    Wide expansion on impact for maximum tissue damage.
 *                    DV+1, AP+2. More damage to unarmored; ineffective vs armor.
 *                    Excellent vs unprotected targets; terrible vs any armor.
 *
 *   Stick-n-Shock:   Electromagnetic shock rounds (Ares specialty).
 *                    DV-2, AP+0, Electric, damage type → Stun.
 *                    Electric discharge knocks out target; non-lethal option.
 *
 *   Tracer:          Phosphorescent marker rounds mixed with regular ammo.
 *                    No stat modifier. In burst fire at low/no light: +2 dice.
 *
 *   Subsonic:        Reduced powder charge for sound suppression.
 *                    DV-1, AP+0. Required for maximum silencer effectiveness.
 *
 *   Injection:       Hollow-point delivery system for drugs, toxins, chemicals.
 *                    DV-3, AP+0. Delivers payload on hit; damage is incidental.
 *
 *   White Phosphorus: Incendiary rounds.
 *                    High DV+3; sets fires; AP-1. Illegal in many zones.
 *
 *   AV:              Anti-Vehicle rounds.
 *                    Massive AP modifier; effective only vs armored vehicles.
 *
 *   Capsule:         Drug delivery shells (similar to injection).
 *                    Low DV; delivers inhaled agents as cloud on impact.
 *
 *   ExEx:            Extra-Explosive. Maximum fragmentation.
 *                    DV+2, AP-1. Restricted; used for maximum lethality.
 *
 *   Hi-C Plastique:  High-pressure plastique rounds for exceptional penetration.
 *                    DV+0, AP-8. One of the best anti-armor options.
 *
 *   Silver:          Silver rounds for certain awakened creatures.
 *                    Cosmetically modified; standard stats but bypasses some immunity.
 *
 *   Tracker:         GPS-tagged rounds.
 *                    Standard DV; marks target location for tracking.
 *
 *   Shotgun types:   Flechette, Slug, Dragon's Breath, Stun shot for shotguns.
 *                    Each has radically different DV and AP profiles.
 *                    Flechette: DV+0, AP+1 vs body armor, +2 vs unarmored.
 *
 *   Peak-Discharge:  Heavy electrical round. High AP, delivers electrical burst.
 *
 * ── COST PER ROUND ────────────────────────────────────────────────────────────
 * The `cost` field is cost per BOX of rounds.
 * `perRounds` specifies how many rounds are in that box.
 * Cost per round = cost ÷ perRounds.
 * This allows accurate tracking of ammunition economics when buying in bulk.
 */
export class AmmoDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── TYPE & QUANTITY ────────────────────────────────────────────────────
      // ammoType: the SR4A ammunition designation.
      // Determines default DV/AP modifiers, damage type override, and special flags.
      // These modifiers are APPLIED TO THE WEAPON when the ammo is loaded.
      ammoType: new fields.StringField({ initial: "Regular",
        choices: ["Regular","APDS","Explosive","Frangible","Gel Rounds",
                  "Hollow Point","Stick-n-Shock","Tracer","Subsonic",
                  "Injection","White Phosphorus","Custom",
                  "AV","Capsule","ExEx","Hi-C Plastique","Silver","Tracker",
                  "Shotgun Flechette","Shotgun Slug","Dragon's Breath",
                  "Shotgun Stun","Peak-Discharge"] }),

      // quantity: current count of rounds in this batch/box.
      quantity: new fields.NumberField({ initial: 30, min: 0, integer: true }),

      // ── DV AND AP MODIFIERS ────────────────────────────────────────────────
      // dvModifier: adjustment to the weapon's base Damage Value when this ammo is loaded.
      // Applied at shot time: effective DV = weapon.dv + dvModifier.
      // Positive = more damage; Negative = less damage.
      // Examples: Explosive +1, Hollow Point +1, Gel Rounds +0, Subsonic -1
      dvModifier: new fields.NumberField({ initial: 0, integer: true }),

      // apModifier: adjustment to the weapon's base AP rating.
      // Applied at shot time: effective AP = weapon.ap + apModifier.
      // NEGATIVE = better penetration (bypasses more armor).
      // Examples: APDS -6 (excellent penetration), Hollow Point +2 (bad vs armor)
      //           Hi-C Plastique -8 (exceptional anti-armor)
      apModifier: new fields.NumberField({ initial: 0, integer: true }),

      // ── DAMAGE TYPE OVERRIDE ───────────────────────────────────────────────
      // damageTypeOverride: replaces the weapon's default damage type.
      //   none:     use weapon's default damage type (Physical for most firearms)
      //   physical: force Physical damage (rare — most weapons already deal Physical)
      //   stun:     convert to Stun damage (Gel Rounds, Stick-n-Shock, shotgun stun)
      // This override is critical for non-lethal takedowns and electric shock effects.
      damageTypeOverride: new fields.StringField({ initial: "none",
        choices: ["none", "physical", "stun"] }),

      // ── SPECIAL FLAGS ─────────────────────────────────────────────────────
      // isElectric: this ammo delivers an electric shock on hit.
      // Used for: Stick-n-Shock, some Peak-Discharge variants.
      // Electric damage interacts with augmented characters differently — metal-heavy
      // cyberware can conduct the electricity (bonus damage to heavily augmented).
      isElectric: new fields.BooleanField({ initial: false }),

      // tracerBonus: this ammo includes phosphorescent tracer rounds.
      // In burst fire or full auto in low/no light conditions: +2 dice to attack.
      // Does not affect DV or AP — purely a visibility modifier.
      tracerBonus: new fields.BooleanField({ initial: false }),

      // noAutofire: this ammo cannot be used with Burst Fire or Full Auto modes.
      // Primarily applies to APDS (manufacturing constraint — the discarding sabot
      // is incompatible with the mechanical cycling of BF/FA modes).
      // The FireModeDialog checks this flag before allowing fire mode selection.
      noAutofire: new fields.BooleanField({ initial: false }),

      // ── AVAILABILITY & COST ────────────────────────────────────────────────
      // avail: SR4A availability string (e.g. "—", "4R", "8F").
      // "—" = always available, no license required (Regular, Hollow Point).
      // R = Restricted (APDS, Explosive); F = Forbidden (White Phosphorus, Hi-C Plastique).
      avail:     new fields.StringField({ initial: "—" }),

      // cost: price in nuyen for a box/pack of these rounds.
      cost:      new fields.NumberField({ initial: 20, min: 0, integer: true }),

      // perRounds: how many rounds are in the box at the listed cost.
      // Cost per individual round = cost ÷ perRounds.
      // Standard boxes: 20 rounds (most pistol/SMG), 10 rounds (rifles), etc.
      perRounds: new fields.NumberField({ initial: 20, min: 1, integer: true }),

      source:      new fields.StringField({ initial: "" }),
      description: new fields.StringField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ───────────────────────────────────────────────────────

  /**
   * Human-readable modifier summary string for quick display on the gear list.
   *
   * Combines all modifiers into a compact, readable format:
   *   "(+2 DV / -6 AP → Stun / Electric / No BF/FA)"
   *
   * Used by the inventory UI to show ammo effects without opening the item sheet.
   *
   * @returns {string} Modifier summary, or empty string if no modifiers
   */
  get modifierSummary() {
    const parts = [];
    if (this.dvModifier !== 0)
      parts.push(`${this.dvModifier > 0 ? "+" : ""}${this.dvModifier} DV`);
    if (this.apModifier !== 0)
      parts.push(`${this.apModifier > 0 ? "+" : ""}${this.apModifier} AP`);
    if (this.damageTypeOverride && this.damageTypeOverride !== "none")
      parts.push(`→ ${this.damageTypeOverride}`);
    if (this.isElectric)  parts.push("Electric");
    if (this.tracerBonus) parts.push("Tracer");
    if (this.noAutofire)  parts.push("No BF/FA");
    return parts.length ? `(${parts.join(" / ")})` : "";
  }
}
