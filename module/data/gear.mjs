/**
 * GearDataModel — General equipment item (SR4 20th Anniversary)
 * Catch-all for anything that doesn't fit a more specific category.
 * Commlinks, electronics, explosives, street gear, surveillance, etc.
 */
export class GearDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── CLASSIFICATION ────────────────────────────────────────────────────
      category: new fields.StringField({ initial: "electronics",
        choices: ["electronics", "commlink", "software", "surveillance",
                  "breaking", "medical", "disguise", "explosives",
                  "survival", "docsForgery", "credstick", "other",
                  "weaponMod", "matrixHardware", "security", "drone",
                  "skillsoft", "focus", "reagent", "magicSupplies"] }),

      // ── QUANTITY ─────────────────────────────────────────────────────────
      quantity: new fields.NumberField({ initial: 1, min: 0, integer: true }),

      // ── GENERAL ───────────────────────────────────────────────────────────
      rating:      new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true }),
      avail:       new fields.StringField({ initial: "4" }),
      cost:        new fields.NumberField({ initial: 0, min: 0, integer: true }),
      source:      new fields.StringField({ initial: "SR4A" }),

      // ── COMMLINK SPECIFICS ────────────────────────────────────────────────
      // If this is a commlink, store its matrix attributes
      isCommlink:  new fields.BooleanField({ initial: false }),
      commlink: new fields.SchemaField({
        response: new fields.NumberField({ initial: 1, min: 0, max: 6, integer: true }),
        signal:   new fields.NumberField({ initial: 1, min: 0, max: 9, integer: true }),
        system:   new fields.NumberField({ initial: 1, min: 0, max: 6, integer: true }),
        firewall: new fields.NumberField({ initial: 1, min: 0, max: 6, integer: true })
      }),

      equipped:    new fields.BooleanField({ initial: true }),
      description: new fields.HTMLField({ initial: "" }),
      notes:       new fields.StringField({ initial: "" })
    };
  }

  /** Total cost for quantity */
  get totalCost() {
    return this.cost * this.quantity;
  }
}
