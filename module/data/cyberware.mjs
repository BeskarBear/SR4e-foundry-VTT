/**
 * CyberwareDataModel — Cyberware / Bioware / Nanoware / Geneware item (SR4 20th Anniversary)
 * Tracks Essence cost and grade. Bioware uses half Essence.
 */
export class CyberwareDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── TYPE ──────────────────────────────────────────────────────────────
      wareType: new fields.StringField({ initial: "cyber",
        choices: ["cyber", "bio", "nano", "gene", "cultured"] }),

      // ── GRADE ─────────────────────────────────────────────────────────────
      // Grade affects Essence multiplier and Availability
      // Used: 1.0×, Alpha: 0.8×, Beta: 0.7×, Delta: 0.5×
      grade: new fields.StringField({ initial: "used",
        choices: ["used", "standard", "alpha", "beta", "delta"] }),

      // ── ESSENCE COST ──────────────────────────────────────────────────────
      // Base Essence cost before grade multiplier
      essenceCost: new fields.NumberField({ initial: 0.5, min: 0 }),

      // ── CATEGORY ─────────────────────────────────────────────────────────
      category: new fields.StringField({ initial: "augmentation",
        choices: ["augmentation", "headware", "eyeware", "earware", "bodyware",
                  "cyberLimb", "obvious", "lethality", "nanotechnology",
                  "genetechnologies", "bioware",
                  "cyberlimbs", "geneware", "nanoware"] }),

      // ── MECHANICS ─────────────────────────────────────────────────────────
      // Stat bonuses provided (tracked here for display; applied via item effects)
      statBonuses: new fields.ArrayField(new fields.SchemaField({
        stat:  new fields.StringField({ initial: "" }),  // e.g. "agility", "reaction"
        bonus: new fields.NumberField({ initial: 0, integer: true })
      })),

      // ── CAPACITY ─────────────────────────────────────────────────────────
      // Some cyberware has capacity for sub-items (cyberweapons, etc.)
      capacityTotal: new fields.NumberField({ initial: 0, min: 0, integer: true }),
      capacityUsed:  new fields.NumberField({ initial: 0, min: 0, integer: true }),

      // ── GENERAL ───────────────────────────────────────────────────────────
      avail:      new fields.StringField({ initial: "8R" }),
      cost:       new fields.NumberField({ initial: 0, min: 0, integer: true }),
      source:     new fields.StringField({ initial: "SR4A" }),

      installed:   new fields.BooleanField({ initial: true }),
      description: new fields.HTMLField({ initial: "" }),
      notes:       new fields.StringField({ initial: "" })
    };
  }

  /** Grade multipliers for Essence cost */
  static gradeMultiplier = {
    used:     1.25,
    standard: 1.0,
    alpha:    0.8,
    beta:     0.7,
    delta:    0.5
  };

  /** Actual Essence cost after grade multiplier */
  get actualEssenceCost() {
    const mult = CyberwareDataModel.gradeMultiplier[this.grade] ?? 1.0;
    // Bioware costs half Essence compared to cyberware
    const bio = (this.wareType === "bio" || this.wareType === "cultured") ? 0.5 : 1.0;
    return parseFloat((this.essenceCost * mult * bio).toFixed(2));
  }
}
