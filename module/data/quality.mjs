/**
 * QualityDataModel — Positive or Negative Quality item (SR4 20th Anniversary).
 *
 * ── SR4A QUALITIES OVERVIEW (SR4A p.75-103) ──────────────────────────────────
 * Qualities are innate character traits — advantages or disadvantages that
 * distinguish a runner beyond their stats and skills.
 *
 * POSITIVE QUALITIES: advantages that cost Build Points during chargen.
 *   - Represent natural gifts, lucky breaks, or exceptional training
 *   - Maximum 25 BP spent on positive qualities at chargen (SR4A p.75)
 *   - Can be purchased with Karma after chargen at GM discretion
 *   - Examples: Ambidextrous, Analytical Mind, Combat Paralysis Immunity,
 *               Exceptional Attribute, First Impression, Lucky, Natural Athlete,
 *               Toughness, Quick Healer, Will to Live
 *
 * NEGATIVE QUALITIES: disadvantages that REFUND Build Points at chargen.
 *   - Represent flaws, weaknesses, or personal problems the runner lives with
 *   - Maximum 35 BP gained from negative qualities at chargen (SR4A p.75)
 *   - Must be roleplayed; GM may "buy off" a negative quality for 2× its BP cost
 *   - Examples: Addiction, Allergy, Amnesia, Combat Paralysis, Gremlins,
 *               Insomnia, On the Run, Sensitive System, Uncouth, Wanted
 *
 * ── BP ECONOMY ───────────────────────────────────────────────────────────────
 * The Build Point system (SR4A p.70):
 *   Starting BP = 400
 *   Positive qualities: cost BP (reduces pool); max 25 BP spent
 *   Negative qualities: refund BP (increases pool); max 35 BP gained
 *   Net adjustment from qualities: between -25 and +35 BP
 *
 * After chargen, qualities can be bought with Karma (roughly 2× BP cost in Karma)
 * or "bought off" with Karma. The Karma cost is typically 2× the BP value.
 *
 * ── LEVELED QUALITIES ────────────────────────────────────────────────────────
 * Some qualities can be taken at multiple levels for increasing effect:
 *
 *   POSITIVE examples:
 *     Lucky (level 1, one-time; not truly leveled in SR4A)
 *     Will to Live: level 1-3; each level adds 1 overflow hit before death
 *     Toughness: level 1 only (not leveled)
 *
 *   NEGATIVE examples:
 *     Addiction: levels represent mild/moderate/severe/burnout
 *     Allergy: levels represent mild/severe
 *     Gremlins: levels 1-4 increase severity of equipment glitches
 *
 * For leveled qualities: totalBP = bpCost × level (see totalBP getter).
 *
 * ── MECHANICAL EFFECTS ───────────────────────────────────────────────────────
 * The `effect` field stores a free-form description of the mechanical benefit/penalty.
 * Examples:
 *   "Ambidextrous: no off-hand penalty when using two weapons"
 *   "Analytical Mind: +2 dice on Logic-based tests"
 *   "Combat Paralysis: must pass Willpower (3) test to act in surprise rounds"
 *   "Sensitive System: double Essence cost for all cyberware"
 *
 * These effects are NOT automatically applied — they are referenced by the player
 * and GM. Only specific qualities with numeric bonuses (Exceptional Attribute, etc.)
 * would need sheet-level support.
 */
export class QualityDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── TYPE ─────────────────────────────────────────────────────────────────
      // qualityType: whether this quality is a benefit or a drawback.
      //   positive: advantage — costs BP; represents exceptional natural gifts
      //   negative: disadvantage — refunds BP; represents flaws and complications
      qualityType: new fields.StringField({ initial: "positive",
        choices: ["positive", "negative"] }),

      // ── BUILD POINT VALUE ─────────────────────────────────────────────────────
      // bpCost: the base BP cost (positive) or refund (negative) for this quality.
      // Positive quality: character pays this many BP to acquire it
      // Negative quality: character gains this many BP at chargen (drawback)
      //
      // Common positive quality costs: 5, 10, 15, 20, 25 BP
      // Common negative quality refunds: 5, 10, 15, 20 BP
      // Chargen limits: max 25 BP spent on positives; max 35 BP gained from negatives
      bpCost: new fields.NumberField({ initial: 5, min: 0, integer: true }),

      // ── EFFECT ──────────────────────────────────────────────────────────────
      // effect: free-form mechanical description for quick reference at the table.
      // Write this as a brief rules summary — not the full text, just the key mechanic.
      // Example: "+2 dice on all Logic-based tests"
      //          "Must pass Willpower(3) test to act in first pass of surprise round"
      //          "Double Essence cost for all cyberware implants"
      effect: new fields.StringField({ initial: "" }),

      // ── LEVELS ───────────────────────────────────────────────────────────────
      // isLeveled: whether this quality has multiple levels of severity/benefit.
      // For leveled qualities: totalBP = bpCost × level (see totalBP getter).
      isLeveled: new fields.BooleanField({ initial: false }),

      // level: current level of this quality (only relevant when isLeveled = true).
      // Examples: Addiction Mild=1, Moderate=2, Severe=3, Burnout=4
      //           Gremlins Level 1-4 (dice glitch frequency increases with level)
      level: new fields.NumberField({ initial: 1, min: 1, max: 4, integer: true }),

      source:      new fields.StringField({ initial: "SR4A" }),
      description: new fields.HTMLField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ───────────────────────────────────────────────────────

  /**
   * Effective BP cost or refund at the current quality level.
   *
   * For leveled qualities: totalBP = bpCost × level.
   * For flat qualities: totalBP = bpCost (level is ignored).
   *
   * The character sheet uses this to sum all quality costs/refunds
   * and compare against chargen limits (max 25 BP positive, max 35 BP negative).
   *
   * @returns {number} Total BP cost (positive) or refund (negative) for this quality
   */
  get totalBP() {
    return this.bpCost * (this.isLeveled ? this.level : 1);
  }
}
