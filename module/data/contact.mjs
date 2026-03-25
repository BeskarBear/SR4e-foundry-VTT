/**
 * ContactDataModel — Contact item (SR4 20th Anniversary)
 * Connection 1-6, Loyalty 1-6.
 */
export class ContactDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── RATINGS ───────────────────────────────────────────────────────────
      // Connection: how well-placed/resourceful they are (1=street, 6=megacorp VP)
      connection: new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),
      // Loyalty: how much they trust/like you (1=barely knows you, 6=ride-or-die)
      loyalty:    new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),

      // ── IDENTITY ──────────────────────────────────────────────────────────
      role:        new fields.StringField({ initial: "" }),  // e.g. "Fixer", "Street Doc"
      affiliation: new fields.StringField({ initial: "" }),  // Corp, gang, etc.
      location:    new fields.StringField({ initial: "" }),
      how:         new fields.StringField({ initial: "" }),  // How you met

      // ── BUILD POINT COST ──────────────────────────────────────────────────
      // Each contact costs (Connection + Loyalty) BP during chargen
      // computed getter below

      description: new fields.HTMLField({ initial: "" }),
      notes:       new fields.StringField({ initial: "" })
    };
  }

  /** BP cost: Connection + Loyalty */
  get bpCost() {
    return this.connection + this.loyalty;
  }
}
