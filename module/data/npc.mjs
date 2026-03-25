/**
 * NpcDataModel — NPC / Critter (SR4 20th Anniversary)
 * Simplified stat block. Uses Professional Rating for quick resolution.
 */
export class NpcDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── IDENTITY ──────────────────────────────────────────────────────────
      role:       new fields.StringField({ initial: "" }),    // "Corp Security", "Ganger", etc.
      archetype:  new fields.StringField({ initial: "" }),
      metatype:   new fields.StringField({ initial: "human" }),
      affiliation: new fields.StringField({ initial: "" }),

      // ── PROFESSIONAL RATING (1-6) ────────────────────────────────────────
      // Shorthand: PR 1-2 = cannon fodder, 3-4 = professional, 5-6 = elite
      // Dice pools: see SR4 GM p.280. PR×2 for most combat, PR×3 for specialists
      professionalRating: new fields.NumberField({ initial: 3, min: 1, max: 6, integer: true }),

      // ── ATTRIBUTES (full set for named/recurring NPCs) ───────────────────
      attributes: new fields.SchemaField({
        body:      new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),
        agility:   new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),
        reaction:  new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),
        strength:  new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),
        charisma:  new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),
        intuition: new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),
        logic:     new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),
        willpower: new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),
        edge:      new fields.NumberField({ initial: 1, min: 0, max: 7, integer: true }),
        essence:   new fields.NumberField({ initial: 6.0, min: 0, max: 6, nullable: true }),
        magic:     new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true }),
        resonance: new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true })
      }),

      // ── KEY DICE POOLS (pre-computed for quick use) ──────────────────────
      // Store the rolled pools instead of computing from attributes each time
      pools: new fields.SchemaField({
        combat:    new fields.NumberField({ initial: 6, min: 0, integer: true }),
        defense:   new fields.NumberField({ initial: 6, min: 0, integer: true }),
        perception: new fields.NumberField({ initial: 5, min: 0, integer: true }),
        social:    new fields.NumberField({ initial: 5, min: 0, integer: true })
      }),

      // ── CONDITION MONITORS ────────────────────────────────────────────────
      condition: new fields.SchemaField({
        physical: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, integer: true }),
          max:   new fields.NumberField({ initial: 10, min: 1, integer: true })
        }),
        stun: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, integer: true }),
          max:   new fields.NumberField({ initial: 10, min: 1, integer: true })
        })
      }),

      // ── ARMOR / WEAPON SUMMARY ────────────────────────────────────────────
      armorB:  new fields.NumberField({ initial: 0, min: 0, integer: true }),
      armorI:  new fields.NumberField({ initial: 0, min: 0, integer: true }),
      weaponSummary: new fields.StringField({ initial: "" }),
      weaponPool:    new fields.NumberField({ initial: 6, min: 0, integer: true }),
      weaponDV:      new fields.StringField({ initial: "8P" }),
      weaponAP:      new fields.NumberField({ initial: 0, integer: true }),

      // ── INITIATIVE ────────────────────────────────────────────────────────
      initiativePasses: new fields.NumberField({ initial: 1, min: 1, max: 4, integer: true }),

      // ── SPECIAL ABILITIES ─────────────────────────────────────────────────
      specialAbilities: new fields.ArrayField(new fields.SchemaField({
        name:    new fields.StringField({ initial: "" }),
        notes:   new fields.StringField({ initial: "" })
      })),

      // ── NOTES ─────────────────────────────────────────────────────────────
      description: new fields.HTMLField({ initial: "" }),
      tactics:     new fields.StringField({ initial: "" }),
      notes:       new fields.HTMLField({ initial: "" })
    };
  }

  /** Physical CM max — stored directly on NPC model, not computed from Body */
  get physicalCMMax() {
    return this.condition.physical.max;
  }

  /** Stun CM max */
  get stunCMMax() {
    return this.condition.stun.max;
  }

  /** Wound modifier */
  get woundModifier() {
    const total = this.condition.physical.value + this.condition.stun.value;
    return -Math.floor(total / 3);
  }

  /** Initiative base: Reaction + Intuition */
  get initiativeBase() {
    return this.attributes.reaction + this.attributes.intuition;
  }
}
