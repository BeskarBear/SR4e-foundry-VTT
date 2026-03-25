/**
 * SpriteDataModel — Technomancer Sprite (SR4 20th Anniversary)
 * Attributes derived from Level. Powers based on sprite type.
 * Types: Courier, Crack, Data, Fault, Machine
 */
export class SpriteDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── SPRITE TYPE ───────────────────────────────────────────────────────
      spriteType: new fields.StringField({ initial: "data",
        choices: ["courier", "crack", "data", "fault", "machine"] }),

      // ── LEVEL (determines all attributes) ────────────────────────────────
      level: new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

      // ── MATRIX ATTRIBUTES ────────────────────────────────────────────────
      // Stored as offsets from Level (each sprite type has a different table)
      attrOffsets: new fields.SchemaField({
        response:  new fields.NumberField({ initial: 0, integer: true }),
        signal:    new fields.NumberField({ initial: 0, integer: true }),
        system:    new fields.NumberField({ initial: 0, integer: true }),
        firewall:  new fields.NumberField({ initial: 0, integer: true }),
        body:      new fields.NumberField({ initial: 0, integer: true }),
        agility:   new fields.NumberField({ initial: 0, integer: true })
      }),

      // ── CONDITION MONITOR ─────────────────────────────────────────────────
      condition: new fields.SchemaField({
        matrix: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, integer: true })
          // max = Level × 2; computed getter
        })
      }),

      // ── REGISTRATION ──────────────────────────────────────────────────────
      registered: new fields.BooleanField({ initial: false }),
      services:   new fields.NumberField({ initial: 0, min: 0, integer: true }),
      compiler:   new fields.StringField({ initial: "" }),  // TM who compiled/registered

      // ── POWERS ────────────────────────────────────────────────────────────
      powers: new fields.ArrayField(new fields.StringField({ initial: "" })),

      // ── NOTES ─────────────────────────────────────────────────────────────
      notes: new fields.HTMLField({ initial: "" })
    };
  }

  /** Matrix attribute value = Level + offset */
  attr(name) {
    const offset = this.attrOffsets[name] ?? 0;
    return Math.max(1, this.level + offset);
  }

  /** Matrix CM: Level × 2 */
  get matrixCMMax() {
    return this.level * 2;
  }
}
