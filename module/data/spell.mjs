/**
 * SpellDataModel — Spell item (SR4 20th Anniversary)
 * For Magicians and Mystic Adepts.
 */
export class SpellDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── CLASSIFICATION ────────────────────────────────────────────────────
      category: new fields.StringField({ initial: "Combat",
        choices: ["Combat", "Detection", "Health", "Illusion", "Manipulation"] }),

      // ── SPELL TYPE ────────────────────────────────────────────────────────
      // "type" conflicts with TypeDataModel.type getter — use spellType.
      // Values: Mana/Physical (mana vs matter), or Direct/Indirect (combat subtype),
      // or Passive/Active (detection subtype).
      spellType: new fields.StringField({ initial: "Mana" }),

      // ── RANGE ─────────────────────────────────────────────────────────────
      range: new fields.StringField({ initial: "LOS" }),

      // ── DAMAGE TYPE (combat spells) ───────────────────────────────────────
      damageType: new fields.StringField({ initial: "none",
        choices: ["none", "physical", "stun"] }),

      // ── DURATION ─────────────────────────────────────────────────────────
      duration: new fields.StringField({ initial: "Instant",
        choices: ["Instant", "Sustained", "Permanent"] }),

      // ── DRAIN ─────────────────────────────────────────────────────────────
      // Drain Value notation, e.g. "(Force / 2) + 2"
      drain: new fields.StringField({ initial: "(F÷2)+2" }),

      // ── DESCRIPTOR ────────────────────────────────────────────────────────
      descriptor: new fields.StringField({ initial: "none" }), // e.g. "indirect", "area"

      // ── GENERAL ───────────────────────────────────────────────────────────
      source:      new fields.StringField({ initial: "SR4A" }),
      description: new fields.HTMLField({ initial: "" }),

      // ── SUSTAINING ────────────────────────────────────────────────────────
      // Track if currently sustained (imposes -2 to all dice pools while sustained)
      sustained: new fields.BooleanField({ initial: false }),
      force:     new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true })
    };
  }
}
