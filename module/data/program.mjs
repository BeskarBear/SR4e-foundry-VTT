/**
 * ProgramDataModel — Matrix Program item (SR4 20th Anniversary)
 * Common Use and Hacking programs. Agents are also represented here.
 */
export class ProgramDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── CLASSIFICATION ────────────────────────────────────────────────────
      programType: new fields.StringField({ initial: "commonUse",
        choices: ["commonUse", "hacking", "security", "agent", "tactical", "other"] }),

      // ── RATING ────────────────────────────────────────────────────────────
      // Rating determines dice pool bonus and max (capped by Response or System)
      rating: new fields.NumberField({ initial: 3, min: 1, max: 6, integer: true }),

      // ── RUNNING COST ─────────────────────────────────────────────────────
      // Each running program uses 1 Response (effectively limits active programs)
      active: new fields.BooleanField({ initial: false }),

      // ── DICE POOL EFFECT ─────────────────────────────────────────────────
      // Which roll this program adds to, e.g. "Hacking + Exploit"
      linkedSkill: new fields.StringField({ initial: "" }),
      poolBonus:   new fields.NumberField({ initial: 0, integer: true }), // usually +Rating

      // ── AGENT SPECIFIC ────────────────────────────────────────────────────
      agentSkills: new fields.ArrayField(new fields.SchemaField({
        skill: new fields.StringField({ initial: "" }),
        value: new fields.NumberField({ initial: 0, min: 0, max: 6, integer: true })
      })),

      avail:       new fields.StringField({ initial: "6" }),
      cost:        new fields.NumberField({ initial: 0, min: 0, integer: true }),
      source:      new fields.StringField({ initial: "SR4A" }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}
