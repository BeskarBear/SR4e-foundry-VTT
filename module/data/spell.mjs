/**
 * SpellDataModel — Spell item data model (SR4 20th Anniversary).
 *
 * ── SR4A SPELLCASTING OVERVIEW (SR4A p.176-214) ──────────────────────────────
 * Magic in SR4 works on a hit-counting system:
 *
 *   1. DECLARE FORCE: The mage sets Force (1 to their Magic attribute).
 *      Higher Force = more potent effect AND more drain.
 *      For Sustained spells, Force is also the "cap" on sustained magnitude.
 *
 *   2. SPELLCASTING ROLL: Spellcasting + Magic, count hits.
 *      Target number is always 5 (standard SR4 threshold applies here too).
 *      More hits = stronger effect and harder to resist.
 *
 *   3. RESISTANCE ROLL: Target resists based on spell type.
 *      Mana spells:     target rolls Willpower (mental/spiritual effect)
 *      Physical spells: target rolls Body (material effect)
 *      Indirect spells: target can dodge with Reaction first, then resist with Body+armor
 *      Net hits from spellcasting vs resistance = effect level.
 *
 *   4. DRAIN RESISTANCE: After casting, the mage resists drain.
 *      Drain Value (DV) is derived from spell Force: typically (Force÷2, rounded up).
 *      Tradition-dependent resistance:
 *        Hermetic tradition: Willpower + Logic
 *        Shamanic tradition: Willpower + Intuition
 *      If Force ≤ caster's Magic: Drain is Stun damage.
 *      If Force > caster's Magic: Drain is Physical damage (extremely dangerous).
 *
 * ── MANA vs PHYSICAL (SR4A p.178) ────────────────────────────────────────────
 *   Mana:     Affects living minds and spirits; channeled through the astral.
 *             Target resists with Willpower.
 *             Does NOT affect drones, vehicles, or non-living matter.
 *
 *   Physical: Affects the physical world, including non-living matter.
 *             Target resists with Body.
 *             Can affect drones and vehicles.
 *             DOES NOT work in astral space.
 *
 * ── SR4 SPELL CATEGORIES (SR4A p.179) ────────────────────────────────────────
 *   Combat:        Direct damage spells. Two subcategories:
 *                    Direct: bypasses armor entirely; resisted by Willpower (Mana)
 *                      or Body (Physical). Most powerful type.
 *                    Indirect: manifests physically (fireball, lightning bolt);
 *                      target can dodge (Reaction); then resists with Body+armor.
 *                  Damage type: Physical or Stun (see damageType field).
 *
 *   Detection:     Sensory and information spells. Two subtypes:
 *                    Active: mage reaches out to target; can be resisted (Willpower)
 *                    Passive: mage passively receives information; less likely to alert
 *                  Examples: Detect Life, Clairvoyance, Astral Sight, Mind Probe
 *
 *   Health:        Healing and harmful biological effects.
 *                  Healing spells remove Physical/Stun damage boxes.
 *                  Harmful health spells damage the target's body or mind.
 *                  Examples: Heal, Antidote, Detox, Stabilize, Cause Disease
 *
 *   Illusion:      Create false sensory experiences. Single/multi-sense variants.
 *                  Physical illusions: affect sensors and cameras (Physical type)
 *                  Mana illusions: only affect living minds (Mana type)
 *                  Examples: Chaotic World, Phantasm, Invisibility, Silence
 *
 *   Manipulation:  Control matter, energy, minds, or space.
 *                  Mental: Control Emotions, Mob Mind, Compel Truth
 *                  Physical: Levitate, Armor, Control Vehicle, Mana Barrier
 *
 * ── SUSTAINED SPELLS (SR4A p.181) ─────────────────────────────────────────────
 * Sustained spells require ongoing concentration.
 * While ANY spell is sustained:
 *   - ALL dice pools the caster rolls suffer -2 dice.
 *   - Each additional sustained spell adds another -2 dice.
 *   - A Sustaining Focus can hold one spell without the dice pool penalty.
 *
 * ── DRAIN VALUE NOTATION ─────────────────────────────────────────────────────
 * SR4 drain is written as a formula, e.g.:
 *   "(F÷2)+2"  — Force÷2 rounded up, plus 2
 *   "(F÷2)"    — Force÷2 rounded up (standard drain)
 *   "(F÷2)+3"  — Harder drain; high-force spells can be extremely draining
 *   "(F-1)"    — Light drain (some simple Detection spells)
 *
 * The stored string is used for display and by the sheet to show DV.
 * Actual drain calculation happens at cast time.
 */
export class SpellDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── CLASSIFICATION ──────────────────────────────────────────────────────
      // category: the SR4A school of magic for this spell.
      // Determines base mechanics, resistance attribute, and subtype options.
      category: new fields.StringField({ initial: "Combat",
        choices: ["Combat", "Detection", "Health", "Illusion", "Manipulation"] }),

      // ── SPELL TYPE ──────────────────────────────────────────────────────────
      // spellType: free-form text combining multiple descriptor dimensions.
      // In SR4A, spells have multiple descriptors: Mana/Physical, Direct/Indirect,
      // Active/Passive. This field stores the primary type for display and rolls.
      // Note: "type" conflicts with TypeDataModel.type — hence "spellType".
      //
      // Common values:
      //   "Mana"          — affects living beings; resisted by Willpower
      //   "Physical"      — affects matter; resisted by Body
      //   "Direct"        — no dodge possible; armor bypassed
      //   "Indirect"      — can be dodged; physical manifestation; armor applies
      //   "Active"        — caster probes; target may resist
      //   "Passive"       — caster receives info; no target resistance
      spellType: new fields.StringField({ initial: "Mana" }),

      // ── RANGE ──────────────────────────────────────────────────────────────
      // range: how far the spell can reach from the caster.
      // Free-form text matching SR4A spell descriptions (e.g. "LOS", "Touch", "LOS(A)").
      //   LOS:    Line of Sight — visible target; most common
      //   Touch:  physical contact required (touch attack roll if resisted)
      //   LOS(A): area effect — all targets within radius of a LOS point
      //   Self:   affects caster only
      //   Special: unique mechanic per spell
      range: new fields.StringField({ initial: "LOS" }),

      // ── DAMAGE TYPE ────────────────────────────────────────────────────────
      // damageType: for Combat spells, whether damage is Physical or Stun.
      //   none:     non-damaging spell (Detection/Health/Illusion/Manipulation)
      //   physical: fills Physical CM boxes; potentially lethal
      //   stun:     fills Stun CM boxes; non-lethal but can KO
      // Note: Direct Mana combat spells (Manaball, Stunball) deal Stun by default.
      //       Direct Physical combat spells (Powerball) deal Physical damage.
      damageType: new fields.StringField({ initial: "none",
        choices: ["none", "physical", "stun"] }),

      // ── DURATION ───────────────────────────────────────────────────────────
      // duration: how long the spell's effect persists.
      //   Instant:   effect resolves immediately; cannot be maintained
      //   Sustained: caster concentrates to maintain; -2 to ALL dice pools while sustained
      //              A Sustaining Focus removes this penalty for one held spell
      //   Permanent: effect is lasting and doesn't require concentration
      //              Typically higher drain cost; some Health spells are permanent
      duration: new fields.StringField({ initial: "Instant",
        choices: ["Instant", "Sustained", "Permanent"] }),

      // ── DRAIN ──────────────────────────────────────────────────────────────
      // drain: the Drain Value formula string, as printed in SR4A.
      // Resisted with Willpower + tradition attribute (Logic for Hermetics,
      // Intuition for Shamans) at TN 5 (SR4 standard threshold).
      //
      // SR4 drain notes:
      //   - DV = result of formula using actual cast Force
      //   - Tradition-dependent resistance: Hermetic = Will+Log, Shamanic = Will+Int
      //   - Force ≤ Magic: unresisted boxes are Stun
      //   - Force > Magic: unresisted boxes become Physical damage (burn-out risk)
      //
      // Examples:
      //   "(F÷2)+2" — Manabolt/Stunbolt standard drain
      //   "(F÷2)+3" — Heavier spells (combat area spells)
      //   "(F÷2)+1" — Lighter drain (simple Detection spells)
      //   "(F-1)"   — Very easy drain (trivial utility spells)
      drain: new fields.StringField({ initial: "(F÷2)+2" }),

      // ── DESCRIPTOR ─────────────────────────────────────────────────────────
      // descriptor: secondary classifier for template display and rules tags.
      // Examples: "indirect", "area", "touch", "elemental"
      // Used in sheet display only — does not drive mechanical lookups.
      descriptor: new fields.StringField({ initial: "none" }),

      // ── STATUS ─────────────────────────────────────────────────────────────
      // sustained: whether the caster is currently maintaining this spell.
      // When true, ALL of the caster's dice pools are reduced by 2.
      // This stacks with other sustained spells (3 sustained = -6 to all pools).
      // When true, all of the caster's dice pools are reduced by 2 (stacks per spell sustained).
      sustained: new fields.BooleanField({ initial: false }),

      // force: current Force level this spell is set to (0 = not configured).
      // Determines both power (hits × Force effects) and drain cost.
      // Cannot exceed the caster's Magic rating without Physical drain risk.
      force: new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true }),

      source:      new fields.StringField({ initial: "SR4A" }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}
