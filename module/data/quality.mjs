/**
 * QualityDataModel — Positive or Negative Quality (SR4 20th Anniversary)
 */
export class QualityDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── TYPE ──────────────────────────────────────────────────────────────
      qualityType: new fields.StringField({ initial: "positive",
        choices: ["positive", "negative"] }),

      // ── BUILD POINT COST ──────────────────────────────────────────────────
      // Positive qualities cost BP; negative qualities refund BP
      bpCost: new fields.NumberField({ initial: 5, min: 0, integer: true }),

      // ── MECHANICAL EFFECT ─────────────────────────────────────────────────
      effect: new fields.StringField({ initial: "" }),

      // ── LEVELS ────────────────────────────────────────────────────────────
      isLeveled: new fields.BooleanField({ initial: false }),
      level:     new fields.NumberField({ initial: 1, min: 1, max: 4, integer: true }),

      source:      new fields.StringField({ initial: "SR4A" }),
      description: new fields.HTMLField({ initial: "" })
    };
  }

  /** Effective BP cost (base × level if leveled) */
  get totalBP() {
    return this.bpCost * (this.isLeveled ? this.level : 1);
  }
}
