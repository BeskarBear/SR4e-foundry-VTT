/**
 * SpiritDataModel — Bound or Free Spirit actor data model (SR4 20th Anniversary).
 *
 * ── SR4A SPIRIT OVERVIEW (SR4A p.181-196) ────────────────────────────────────
 * Spirits are astral entities with physical manifestation capability.
 * Each spirit type has attribute OFFSETS from Force that vary by spirit type and plane of existence.
 *
 * Force is the primary rating — it drives:
 *   - Base attribute values (all attribute = Force + offset)
 *   - Physical and Astral condition monitor maximums (Force × 2 each)
 *   - Initiative dice (spirits roll 2d6 initiative by default)
 *   - Innate ability power level (Elemental Attack DV = Force, etc.)
 *   - Drain on the summoner (F÷2 rounded up for unbound spirits)
 *
 * ── ATTRIBUTE OFFSETS (SR4A p.185-193) ──────────────────────────────────────
 * Each spirit type modifies base Force for specific attributes.
 * Stored as `attrOffsets` — the final value = Math.max(1, Force + offset).
 * Common SR4A offsets by spirit type:
 *
 *   Air Spirit:      Body -2, Agility +3, Reaction +4, Strength -3
 *   Earth Spirit:    Body +4, Agility -2, Reaction -1, Strength +4
 *   Fire Spirit:     Body -1, Agility +1, Reaction +3, Strength -2
 *   Water Spirit:    Body +1, Agility 0, Reaction +2, Strength +1
 *   Beast Spirit:    Varies wildly by totem domain
 *   Man Spirit:      Charisma +2, Intuition +2, Logic +1
 *   Task Spirit:     Charisma -2, Logic +2, Willpower +2
 *   Guardian Spirit: Body +2, Agility +1, Reaction +2, Willpower +2
 *
 * Setting offsets: for an Air Spirit at Force 5, Body = 5 + (-2) = 3 (min 1).
 * All attributes have a minimum of 1 regardless of negative offsets.
 *
 * ── SPIRIT TYPES (SR4A p.185) ────────────────────────────────────────────────
 * SR4 recognizes spirits by domain rather than strict Hermetic/Shamanic split:
 *
 *   air:      Invisible servants of the wind; fast, agile, poor body
 *   earth:    Heavy, powerful, slow; terrain bound to natural stone/soil
 *   fire:     Volatile and destructive; burns while materialized
 *   water:    Fluid and adaptable; can manifest as rain, ice, or steam
 *   beast:    Animal-domain spirits; shape varies by totem's animal type
 *   man:      Humanity-domain; high social stats; often summoned by Hermetics
 *   plant:    Plant/nature domain (less common; Magic in the Shadows equivalent)
 *   task:     Pure utilitarian spirits; no combat ability; excellent for work
 *   guardian: Defense-focused; protect locations, ward against intrusions
 *   guidance: Mentor-type; provide advice and skill bonuses to summoner
 *   shadow:   Toxic/dark spirits; corrupted nature entities
 *   illusion: Reality-bending spirits; specialize in sensory manipulation
 *   free:     Unbound spirits with their own agendas; not controlled by anyone
 *   other:    Custom or unique spirit types not fitting standard categories
 *
 * ── TRADITION AND SUMMONING ──────────────────────────────────────────────────
 * Spirit availability depends on the summoner's magical tradition (SR4A p.182):
 *   Hermetics: summon elementals (air/earth/fire/water/man) via ritual
 *   Shamans:   summon nature spirits (beast/man/plant/guardian/etc.) in their domain
 *   Other:     tradition-specific spirits as defined by the custom tradition
 *
 * Summoning: Summoning skill + Magic vs Force (extended test).
 * Services = net hits on the Summoning test.
 * Drain = (Force÷2, rounded up) Stun damage, resisted by Willpower + Body.
 *
 * Binding: spend additional services; Binding test extends the spirit's service
 * duration beyond a single day. A bound spirit remains until services are exhausted.
 *
 * ── CONDITION MONITORS (SR4A p.186) ──────────────────────────────────────────
 * SR4 spirits have TWO condition monitors (not the single track of SR3 spirits):
 *
 *   Physical CM: used when spirit is materialized on physical plane.
 *                Max = Force × 2 (not the 8+Body/2 formula for vehicles/other).
 *                Boxes heal when spirit dematerializes (return to astral).
 *
 *   Astral CM:   used when spirit is in astral space or engaging in astral combat.
 *                Max = Force × 2.
 *                Damage taken in astral form only fills this track.
 *
 * When either CM fills to max, the spirit is banished:
 *   - Returns to its native plane
 *   - If Force ≤ 0 from damage, spirit is permanently destroyed
 *
 * ── PLANE (SR4A p.184) ───────────────────────────────────────────────────────
 *   physical: spirit is materialized — visible, tangible, can interact with physical world
 *   astral:   spirit is in astral form — invisible to mundanes, intangible physically
 *             Can be seen and attacked by Awakened/Technomancers with astral perception
 *
 * ── SERVICES ─────────────────────────────────────────────────────────────────
 * services: total remaining tasks the spirit owes the summoner.
 * Each meaningful action depletes 1 service. When services = 0:
 *   Unbound spirit: immediately free (may or may not be hostile)
 *   Bound spirit: spirit is released from binding; may become free spirit
 */
export class SpiritDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── CLASSIFICATION ──────────────────────────────────────────────────────
      // spiritType: determines the spirit's domain, available powers, and which
      // summoner traditions can call upon it. See spirit type overview above.
      spiritType: new fields.StringField({ initial: "air",
        choices: ["air", "earth", "fire", "water", "beast", "man",
                  "plant", "task", "guardian", "guidance", "shadow", "illusion", "free", "other"] }),

      // tradition: the magical tradition of the summoner who called this spirit.
      // Free-form text — used for display and GM reference only.
      // Example: "Hermetic", "Shamanic", "Wuxing"
      tradition: new fields.StringField({ initial: "" }),

      // plane: which plane of existence the spirit currently occupies.
      //   physical: materialized — visible and physical, uses Physical CM for damage
      //   astral:   dematerialized in astral space — uses Astral CM for damage
      // Switching planes is a Simple Action (SR4A p.184).
      plane: new fields.StringField({ initial: "physical",
        choices: ["physical", "astral"] }),

      // ── FORCE ────────────────────────────────────────────────────────────────
      // force: the spirit's primary power rating (1-12).
      // Determines base attribute values, CM maximums, and summoning drain.
      // The summoner sets Force when calling the spirit (higher = more powerful
      // but costs more drain). Cannot exceed the summoner's Magic attribute.
      force: new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

      // ── ATTRIBUTE OFFSETS ────────────────────────────────────────────────────
      // attrOffsets: per-attribute modifiers from Force baseline.
      // Final attribute value = Math.max(1, force + offset).
      //
      // Set these based on the SR4A spirit type table (p.185-193).
      // Example for Air Spirit: body=-2, agility=+3, reaction=+4, strength=-3
      // All offsets default to 0 (all attributes = Force, like a neutral spirit).
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

      // ── CONDITION MONITORS ───────────────────────────────────────────────────
      // ── CONDITION MONITORS ───────────────────────────────────────────────────
      // Two separate condition monitors: Physical and Astral.
      // physical.value: damage boxes filled on the physical CM.
      //   Max = Force × 2. Active when spirit is materialized on physical plane.
      // astral.value: damage boxes filled on the astral CM.
      //   Max = Force × 2. Active when spirit is in astral form.
      condition: new fields.SchemaField({
        physical: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, integer: true })
          // max computed via physicalCMMax getter: Force × 2
        }),
        astral: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, integer: true })
          // max computed via physicalCMMax getter: Force × 2 (same formula)
        })
      }),

      // ── BINDING & SERVICES ───────────────────────────────────────────────────
      // bound: whether this spirit has been formally bound by its summoner.
      // Unbound spirits serve only for one day or until services are exhausted.
      // Bound spirits persist until services run out (SR4A p.183).
      bound: new fields.BooleanField({ initial: false }),

      // services: number of tasks this spirit owes its summoner.
      // Decremented each time the spirit performs an action.
      // When services = 0, the binding expires.
      services: new fields.NumberField({ initial: 0, min: 0, integer: true }),

      // summoner: free-form reference to the Awakened character who controls this spirit.
      // Used for display only — typically the summoner's character name or Actor ID.
      summoner: new fields.StringField({ initial: "" }),

      // ── INNATE POWERS ────────────────────────────────────────────────────────
      // powers: list of innate spirit abilities by name.
      // SR4A spirits have type-specific power lists (SR4A p.186-193).
      // Stored as simple strings for display — the GM resolves their effects.
      // Common powers: Materialization, Astral Form, Elemental Attack, Guard,
      //                Immunity to Normal Weapons, Natural Weapon, Movement,
      //                Accident, Binding, Engulf, Fear, Noxious Breath, Search.
      powers: new fields.ArrayField(new fields.StringField({ initial: "" })),

      notes: new fields.HTMLField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ───────────────────────────────────────────────────────

  /**
   * Resolve a specific spirit attribute value from Force + offset.
   *
   * SR4A spirits: each attribute = Force + attrOffset[name].
   * Minimum value is 1 (no attribute can drop below 1 regardless of offset).
   *
   * @param {string} name - Attribute key (e.g. "body", "agility", "charisma")
   * @returns {number} Final attribute value (min 1)
   */
  attr(name) {
    const offset = this.attrOffsets[name] ?? 0;
    return Math.max(1, this.force + offset);
  }

  /**
   * Physical condition monitor maximum.
   *
   * SR4A p.186: spirit Physical CM = Force × 2.
   * This is different from PC characters (8 + ceil(Body/2)) or vehicles (8 + ceil(Body/2)).
   * Spirits use a simpler formula because their Body is already Force-derived.
   *
   * The same formula applies to the Astral CM.
   *
   * @returns {number} Max boxes on the Physical (or Astral) condition monitor
   */
  get physicalCMMax() {
    return this.force * 2;
  }

  /**
   * Initiative base score (before rolling dice).
   *
   * SR4A: Initiative = (Reaction + Intuition) + rolled d6s.
   * Spirits roll Reaction + Intuition as their base initiative score.
   * The number of d6s rolled depends on spirit type and whether the spirit
   * has initiative powers (most spirits get 2d6 by default).
   *
   * @returns {number} Initiative base (Reaction + Intuition attribute values)
   */
  get initiativeBase() {
    return this.attr("reaction") + this.attr("intuition");
  }

  /**
   * Combat dice pool estimate for this spirit.
   *
   * In SR4, combat rolls use Agility + appropriate combat skill.
   * Spirits don't have formal skills, so we use Agility + Force as an
   * approximation of their natural combat prowess.
   * The GM can substitute this with a fixed pool for simplicity.
   *
   * @returns {number} Estimated combat dice pool (Agility + Force)
   */
  get combatPool() {
    return this.attr("agility") + this.force;
  }
}
