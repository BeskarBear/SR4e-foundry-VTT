/**
 * SpiritDataModel — Bound or Free Spirit (SR4 20th Anniversary)
 * Attributes derived from Force. Powers based on spirit type.
 */
export class SpiritDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── SPIRIT TYPE ───────────────────────────────────────────────────────
      spiritType: new fields.StringField({ initial: "air",
        choices: ["air", "earth", "fire", "water", "beast", "man",
                  "plant", "task", "guardian", "guidance", "shadow", "illusion", "free", "other"] }),
      tradition: new fields.StringField({ initial: "" }),  // Which tradition summoned it
      plane:     new fields.StringField({ initial: "physical",
        choices: ["physical", "astral"] }),

      // ── FORCE (determines all attributes) ────────────────────────────────
      force: new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

      // ── ATTRIBUTES (base = Force; modifiers per spirit type table) ────────
      // Stored as offsets from Force (e.g., Air spirit Body = Force-2, so offset=-2)
      attrOffsets: new fields.SchemaField({
        body:      new fields.NumberField({ initial: 0, integer: true }),
        agility:   new fields.NumberField({ initial: 0, integer: true }),
        reaction:  new fields.NumberField({ initial: 0, integer: true }),
        strength:  new fields.NumberField({ initial: 0, integer: true }),
        charisma:  new fields.NumberField({ initial: 0, integer: true }),
        intuition: new fields.NumberField({ initial: 0, integer: true }),
        logic:     new fields.NumberField({ initial: 0, integer: true }),
        willpower: new fields.NumberField({ initial: 0, integer: true })
      }),

      // ── CONDITION MONITORS ────────────────────────────────────────────────
      condition: new fields.SchemaField({
        physical: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, integer: true })
          // max = Force × 2; computed getter
        }),
        astral: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, integer: true })
          // max = Force × 2
        })
      }),

      // ── BINDING ───────────────────────────────────────────────────────────
      bound:   new fields.BooleanField({ initial: false }),
      services: new fields.NumberField({ initial: 0, min: 0, integer: true }),
      summoner: new fields.StringField({ initial: "" }),

      // ── POWERS ────────────────────────────────────────────────────────────
      powers: new fields.ArrayField(new fields.StringField({ initial: "" })),

      // ── NOTES ─────────────────────────────────────────────────────────────
      notes: new fields.HTMLField({ initial: "" })
    };
  }

  /** Attribute value = Force + offset */
  attr(name) {
    const offset = this.attrOffsets[name] ?? 0;
    return Math.max(1, this.force + offset);
  }

  /** Physical CM: Force × 2 */
  get physicalCMMax() {
    return this.force * 2;
  }

  /** Initiative base */
  get initiativeBase() {
    return this.attr("reaction") + this.attr("intuition");
  }

  /** Combat pool (varies by spirit — use Agility + skill approximation) */
  get combatPool() {
    return this.attr("agility") + this.force;
  }
}
