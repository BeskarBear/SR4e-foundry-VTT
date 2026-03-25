/**
 * ArmorDataModel — Armor / Clothing item (SR4 20th Anniversary)
 * Ballistic (B) and Impact (I) ratings.
 */
export class ArmorDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── PROTECTION ────────────────────────────────────────────────────────
      // B = vs physical (firearms), I = vs stun / melee
      armorB: new fields.NumberField({ initial: 6, min: 0, integer: true }),
      armorI: new fields.NumberField({ initial: 4, min: 0, integer: true }),

      // ── TYPE ──────────────────────────────────────────────────────────────
      armorType: new fields.StringField({ initial: "jacket",
        choices: ["clothing", "jacket", "coat", "vest", "fullbody", "helmet",
                  "shield", "other"] }),

      // ── MODIFICATIONS ─────────────────────────────────────────────────────
      mods: new fields.ArrayField(new fields.SchemaField({
        name:     new fields.StringField({ initial: "" }),
        bonusB:   new fields.NumberField({ initial: 0, integer: true }),
        bonusI:   new fields.NumberField({ initial: 0, integer: true }),
        notes:    new fields.StringField({ initial: "" })
      })),

      // ── GENERAL ───────────────────────────────────────────────────────────
      conceal:     new fields.NumberField({ initial: 0, integer: true }),
      avail:       new fields.StringField({ initial: "4" }),
      cost:        new fields.NumberField({ initial: 0, min: 0, integer: true }),
      source:      new fields.StringField({ initial: "SR4A" }),

      equipped:    new fields.BooleanField({ initial: true }),
      description: new fields.HTMLField({ initial: "" })
    };
  }

  /** Total ballistic after mods */
  get totalB() {
    return this.armorB + this.mods.reduce((sum, m) => sum + (m.bonusB ?? 0), 0);
  }

  /** Total impact after mods */
  get totalI() {
    return this.armorI + this.mods.reduce((sum, m) => sum + (m.bonusI ?? 0), 0);
  }
}
