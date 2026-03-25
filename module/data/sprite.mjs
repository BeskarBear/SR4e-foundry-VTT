/**
 * SpriteDataModel — Technomancer Sprite actor data model (SR4 20th Anniversary).
 *
 * ── SR4A TECHNOMANCERS AND SPRITES (SR4A p.230-243) ──────────────────────────
 * Technomancers are metahumans with an innate, biological connection to the
 * Matrix. They process wireless data through their brain directly — no commlink
 * or cyberdeck required. The Matrix is to them what magic is to the Awakened.
 *
 * Sprites are the Technomancer equivalent of spirits: entities woven from living
 * code, compiled from the Resonance (the hidden underlying reality of the Matrix).
 * Where mages summon spirits, Technomancers COMPILE sprites.
 *
 * ── SPRITES vs SPIRITS — KEY DIFFERENCES ────────────────────────────────────
 *   Spirits exist in astral space; Sprites exist in the Matrix (and the Resonance)
 *   Spirits have physical attributes; Sprites have Matrix attributes
 *   Spirits are summoned with Conjuring; Sprites are compiled with Compiling skill
 *   Spirit Force → all stats; Sprite Level → all Matrix stats
 *   Spirits can materialize physically; Sprites can manifest in the physical world
 *     only as IC-like apparitions (limited physical interaction)
 *
 * ── SPRITE TYPES (SR4A p.235-238) ────────────────────────────────────────────
 *   courier:  Fast, stealthy messengers; specialize in data transmission.
 *             Attribute profile: high Response and Signal; lower Firewall.
 *             Powers: Bandwidth, Cookie, Hash, Watermark.
 *
 *   crack:    Intrusion specialists — the hackers of the sprite world.
 *             High Signal; good at bypassing Firewall.
 *             Powers: Exploit, Sniff, Spoof, Track.
 *
 *   data:     Information storage and analysis specialists.
 *             High System; excellent at data manipulation and research.
 *             Powers: Analyze, Browse, Edit, Search.
 *
 *   fault:    Combat sprites — offensive attackers in Matrix combat.
 *             High Firewall paradoxically; strong Body; attack-focused.
 *             Powers: Attack, Armor, Blackout, Biofeedback.
 *             Note: Fault sprites can cause Biofeedback damage to IC and operators.
 *
 *   machine:  Industrial sprites specializing in rigging and hardware control.
 *             High Body; interact with physical devices through DNI.
 *             Powers: Diagnostics, Scan, Stability, Tinkerer.
 *
 * ── SPRITE ATTRIBUTES ────────────────────────────────────────────────────────
 * Sprites use Matrix attributes rather than physical ones:
 *
 *   Response:  Processing speed; determines initiative and action economy.
 *              Equivalent to Reaction in physical combat.
 *              Initiative = Response + rolled d6s (2d6 default).
 *
 *   Signal:    Wireless range and transmission strength.
 *              Sets how far the sprite can reach in the Matrix.
 *              Also used for communication and detection tests.
 *
 *   System:    Core intelligence; reasoning and complex task performance.
 *              Used for most active Matrix skill tests.
 *              Equivalent to Logic/Intelligence for Matrix purposes.
 *
 *   Firewall:  Defense against intrusion and hostile programs.
 *              Used to resist attacks, detection, and manipulation.
 *              Equivalent to Armor for Matrix purposes.
 *
 *   Body:      Physical structure of the sprite's code construct.
 *              Used to resist Matrix damage (replaces physical Body).
 *              Some sprites can also interact minimally with physical world.
 *
 *   Agility:   Nimbleness within the Matrix; evasion and precision.
 *              Used for Matrix combat dodge tests and some task tests.
 *
 * All attributes = Level + offset (per sprite type table, SR4A p.235-238).
 *
 * ── COMPILING AND REGISTERING (SR4A p.231) ───────────────────────────────────
 * Compiling: TM rolls Compiling + Resonance vs Level (extended test).
 *   Services = net hits. Drain = Fading Value (Level÷2, rounded up) Stun damage,
 *   resisted by Resonance + Firewall.
 *
 * Registering: extends services and reduces Fading cost for future use.
 *   A registered sprite can be called without recompiling.
 *   Cost: Registering test, additional Fading.
 *
 * ── CONDITION MONITOR ────────────────────────────────────────────────────────
 * Sprites have ONE condition monitor — the Matrix CM.
 * Max = Level × 2 (SR4A p.234).
 * When filled, the sprite is crashed/destroyed (returns to Resonance).
 * Sprites don't separate physical/astral CM like spirits do.
 */
export class SpriteDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── CLASSIFICATION ──────────────────────────────────────────────────────
      // spriteType: determines attribute offsets, innate powers, and combat style.
      // See sprite type overview above for each type's specialty.
      spriteType: new fields.StringField({ initial: "data",
        choices: ["courier", "crack", "data", "fault", "machine"] }),

      // ── LEVEL ────────────────────────────────────────────────────────────────
      // level: the sprite's primary power rating (1-12).
      // Drives all attribute values, CM maximum, and compiling Fading.
      // Technomancer sets this when compiling (higher = stronger but more Fading).
      // Cannot exceed the Technomancer's Resonance attribute.
      level: new fields.NumberField({ initial: 3, min: 1, max: 12, integer: true }),

      // ── ATTRIBUTE OFFSETS ────────────────────────────────────────────────────
      // attrOffsets: per-attribute modifiers from Level baseline.
      // Final attribute value = Math.max(1, level + offset).
      // Set from the sprite type table in SR4A p.235-238.
      //
      // Example — Fault Sprite offsets: body=+1, agility=+2, response=+1, signal=-1,
      //           system=0, firewall=+3 (strong defenders/attackers)
      //
      // All offsets default to 0 (all attributes = Level).
      attrOffsets: new fields.SchemaField({
        response:  new fields.NumberField({ initial: 0, integer: true }),
        signal:    new fields.NumberField({ initial: 0, integer: true }),
        system:    new fields.NumberField({ initial: 0, integer: true }),
        firewall:  new fields.NumberField({ initial: 0, integer: true }),
        body:      new fields.NumberField({ initial: 0, integer: true }),
        agility:   new fields.NumberField({ initial: 0, integer: true })
      }),

      // ── CONDITION MONITOR ────────────────────────────────────────────────────
      // condition.matrix: damage the sprite has taken in Matrix combat.
      // Max = Level × 2 (computed via matrixCMMax getter).
      // Single track — sprites don't have a separate physical CM like spirits.
      condition: new fields.SchemaField({
        matrix: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, integer: true })
          // max computed via matrixCMMax getter: Level × 2
        })
      }),

      // ── REGISTRATION ────────────────────────────────────────────────────────
      // registered: whether this sprite has been formally registered by its compiler.
      // Unregistered sprites serve for one task (or one day if more than one service).
      // Registered sprites persist between sessions; can be recalled without recompiling.
      registered: new fields.BooleanField({ initial: false }),

      // services: remaining tasks this sprite owes the Technomancer.
      // Each action the sprite performs costs 1 service.
      // When services = 0, the sprite's obligation ends (it may decompile or wander).
      services: new fields.NumberField({ initial: 0, min: 0, integer: true }),

      // compiler: free-form reference to the Technomancer who compiled/registered this sprite.
      // Used for display — typically the TM's character name or Actor ID.
      compiler: new fields.StringField({ initial: "" }),

      // ── INNATE POWERS ────────────────────────────────────────────────────────
      // powers: list of this sprite's innate complex forms/powers by name.
      // Each sprite type has a set of exclusive powers (SR4A p.235-238).
      // Stored as strings for display — effects are resolved by GM.
      powers: new fields.ArrayField(new fields.StringField({ initial: "" })),

      notes: new fields.HTMLField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ───────────────────────────────────────────────────────

  /**
   * Resolve a specific sprite Matrix attribute value from Level + offset.
   *
   * SR4A sprites: each Matrix attribute = Level + attrOffset[name].
   * Minimum value is 1 (no attribute can drop below 1).
   *
   * @param {string} name - Attribute key (e.g. "response", "signal", "firewall")
   * @returns {number} Final Matrix attribute value (min 1)
   */
  attr(name) {
    const offset = this.attrOffsets[name] ?? 0;
    return Math.max(1, this.level + offset);
  }

  /**
   * Matrix condition monitor maximum.
   *
   * SR4A p.234: Sprite Matrix CM = Level × 2.
   * Same formula as spirit condition monitors (Force × 2 for spirits).
   * Single track for sprites — no separate physical/astral split.
   *
   * @returns {number} Max boxes on the Matrix condition monitor
   */
  get matrixCMMax() {
    return this.level * 2;
  }
}
