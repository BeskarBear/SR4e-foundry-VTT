/**
 * AdeptPowerDataModel — Adept Power item (SR4 20th Anniversary)
 */
export class AdeptPowerDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // Power Point cost (may be fractional, e.g. 0.25, 0.5, 1, 2)
      ppCost:      new fields.NumberField({ initial: 1.0, min: 0.25 }),
      // Levels: some powers can be bought multiple times
      levels:      new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),
      // True if this power can be taken multiple times for cumulative effect
      isLeveled:   new fields.BooleanField({ initial: false }),

      action:      new fields.StringField({ initial: "passive",
        choices: ["passive", "free", "simple", "complex"] }),

      source:      new fields.StringField({ initial: "SR4A" }),
      description: new fields.HTMLField({ initial: "" }),
      notes:       new fields.StringField({ initial: "" })
    };
  }

  /** Total PP cost (ppCost × levels) */
  get totalPP() {
    return this.ppCost * (this.isLeveled ? this.levels : 1);
  }
}
