/**
 * @file sr4-roll.mjs — SR4 20th Anniversary dice pool engine.
 *
 * ── SR4 DICE MECHANICS (SR4A p.54-62) ────────────────────────────────────────
 * Every test in SR4 uses the same resolution method:
 *   1. Assemble a pool of d6 dice (skill + attribute + modifiers)
 *   2. Roll all dice
 *   3. Count hits: each die showing 5 or 6 = 1 hit
 *   4. Net hits = hits − threshold (or opponent's hits in opposed tests)
 *
 * GLITCH (SR4A p.56):
 *   If ≥ half the dice rolled show 1, the test suffers a "Glitch."
 *   On a glitch, something goes wrong — even if the test succeeds.
 *   Note: only initial dice count (before Rule of Six re-rolls) toward the glitch check.
 *
 * CRITICAL GLITCH (SR4A p.56):
 *   Glitch condition is met AND the roll has zero hits.
 *   Worst possible outcome — the test fails catastrophically.
 *
 * RULE OF SIX / EDGE (SR4A p.56, 72):
 *   Normal rolls: 5-6 count as hits; no re-roll.
 *   Edge spending (edge=true): each 6 is a hit AND re-rolled; chain until no 6s.
 *   This makes Edge very powerful at high die counts (explosive reroll chain).
 *   SR3 applies Rule of Six on EVERY roll, always — not limited to a resource.
 *
 * BUYING HITS (SR4A p.64):
 *   Alternative to rolling: 4 dice = 1 automatic hit, no glitch risk.
 *   pool=12 → 3 guaranteed hits. Used when time/pressure is not a factor.
 *   Implemented via the pool-builder dialog, not in this class.
 *
 * INITIATIVE ROLLS (special case):
 *   Initiative uses SR4Roll in "sum mode" — dice are summed, NOT hit-counted.
 *   SR4Combat calls rollInitiative() which sums the d6 results and adds to the
 *   base score (Reaction + Intuition). This class supports both modes.
 *
 * Usage:
 *   const roll = new SR4Roll(12);                   // 12 dice, no Edge
 *   const roll = new SR4Roll(12, { edge: true });   // with Rule of Six (Edge spend)
 *   await roll.evaluate();
 *   console.log(roll.hits, roll.isGlitch, roll.isCritGlitch);
 */
export class SR4Roll {

  /**
   * @param {number} pool      - Number of dice to roll (after modifiers)
   * @param {object} options
   * @param {boolean} [options.edge=false]    - Apply Rule of Six
   * @param {number}  [options.threshold=1]   - Threshold for success
   * @param {string}  [options.flavor=""]     - Chat message flavor text
   * @param {string}  [options.actor=""]      - Actor name for chat display
   * @param {string}  [options.rollLabel=""]  - What is being rolled
   */
  constructor(pool, options = {}) {
    this.pool       = Math.max(0, Math.floor(pool));
    this.edge       = options.edge ?? false;
    this.threshold  = options.threshold ?? 1;
    this.flavor     = options.flavor ?? "";
    this.actor      = options.actor ?? "";
    this.rollLabel  = options.rollLabel ?? "";

    this.dice       = [];   // Final die results (after re-rolls)
    this.allRolls   = [];   // All rolls including re-rolled dice (for display)
    this._evaluated = false;
  }

  // ── EVALUATION ─────────────────────────────────────────────────────────

  /**
   * Roll the dice pool.
   * Returns this for chaining.
   */
  async evaluate() {
    if (this._evaluated) return this;

    if (this.pool <= 0) {
      // Long Shot: 2d6 keep lowest, same hit counting
      const r = new Roll("2d6");
      await r.evaluate();
      const results = r.terms[0].results.map(r => r.result);
      const lowest  = Math.min(...results);
      this.dice     = [lowest];
      this.allRolls = results;
    } else {
      this.dice = await this._rollPool(this.pool, this.edge);
    }

    this._evaluated = true;
    return this;
  }

  /**
   * Roll `n` dice, applying Rule of Six if edgeMode=true.
   * @private
   */
  async _rollPool(n, edgeMode) {
    const formula = `${n}d6`;
    const r = new Roll(formula);
    await r.evaluate();
    const results = r.terms[0].results.map(res => res.result);
    this.allRolls.push(...results);

    if (!edgeMode) return results;

    // Rule of Six: re-roll all 6s, add hits for each 6, recurse
    const sixes = results.filter(d => d === 6).length;
    if (sixes > 0) {
      const rerolled = await this._rollPool(sixes, true);
      return [...results, ...rerolled];
    }
    return results;
  }

  // ── COMPUTED RESULTS ───────────────────────────────────────────────────

  /** Number of hits (dice showing 5 or 6) */
  get hits() {
    if (!this._evaluated) return 0;
    return this.dice.filter(d => d >= 5).length;
  }

  /** Number of 1s rolled (for glitch calculation) */
  get ones() {
    if (!this._evaluated) return 0;
    // For glitch, we check the initial dice pool only (not re-rolls from Rule of Six)
    // Use allRolls[0..pool-1] for base glitch check
    const baseDice = this.pool > 0 ? this.allRolls.slice(0, this.pool) : this.allRolls;
    return baseDice.filter(d => d === 1).length;
  }

  /** True if half or more of the initial pool came up 1 */
  get isGlitch() {
    if (!this._evaluated) return false;
    if (this.pool === 0) return false;
    return this.ones >= Math.ceil(this.pool / 2);
  }

  /** True if glitch AND zero hits */
  get isCritGlitch() {
    return this.isGlitch && this.hits === 0;
  }

  /** Net hits vs threshold */
  get netHits() {
    return Math.max(0, this.hits - this.threshold);
  }

  /** Success = hits >= threshold (and not a crit glitch) */
  get isSuccess() {
    return !this.isCritGlitch && this.hits >= this.threshold;
  }

  /** Did the roll score a critical success? (4+ net hits) */
  get isCritSuccess() {
    return this.netHits >= 4;
  }

  // ── DISPLAY ────────────────────────────────────────────────────────────

  /**
   * Send results to Foundry chat.
   * @param {object} [chatOptions] - Options for ChatMessage.create
   */
  async toMessage(chatOptions = {}) {
    if (!this._evaluated) await this.evaluate();

    const resultLabel = this.isCritGlitch ? "CRITICAL GLITCH"
      : this.isGlitch    ? `GLITCH — ${this.hits} ${this.hits === 1 ? "hit" : "hits"}`
      : `${this.hits} ${this.hits === 1 ? "hit" : "hits"}`;

    const diceDisplay = this.allRolls.slice(0, this.pool).map(d => {
      const cls = d === 1 ? "die-one" : d >= 5 ? "die-hit" : "die-miss";
      return `<span class="sr4-die ${cls}">${d}</span>`;
    }).join(" ");

    const rerollDisplay = this.edge && this.allRolls.length > this.pool
      ? `<div class="sr4-rerolls">↻ ${this.allRolls.slice(this.pool).map(d => {
          const cls = d === 1 ? "die-one" : d >= 5 ? "die-hit" : "die-miss";
          return `<span class="sr4-die ${cls}">${d}</span>`;
        }).join(" ")}</div>`
      : "";

    const content = `
      <div class="sr4-roll-result ${this.isCritGlitch ? "crit-glitch" : this.isGlitch ? "glitch" : this.isSuccess ? "success" : "failure"}">
        <div class="sr4-roll-header">
          <strong>${this.actor ? this.actor + ": " : ""}${this.rollLabel || "Dice Roll"}</strong>
          ${this.edge ? '<span class="sr4-edge-badge">EDGE</span>' : ""}
        </div>
        <div class="sr4-pool-label">${this.pool} dice${this.threshold > 1 ? ` vs threshold ${this.threshold}` : ""}</div>
        <div class="sr4-dice-tray">${diceDisplay}</div>
        ${rerollDisplay}
        <div class="sr4-result-label">${resultLabel}</div>
        ${this.threshold > 1 ? `<div class="sr4-net-hits">Net hits: ${this.netHits}</div>` : ""}
      </div>
    `;

    return ChatMessage.create({
      content,
      sound: CONFIG.sounds.dice,
      ...chatOptions
    });
  }

  // ── STATIC FACTORY HELPERS ─────────────────────────────────────────────

  /**
   * Build a dice pool from skill + attribute and roll it.
   * @param {number} skill     - Skill value (0 = untrained, uses -1 penalty)
   * @param {number} attribute - Linked attribute value
   * @param {object} options   - SR4Roll options + modifier (flat die modifier)
   * @returns {SR4Roll}
   */
  static async rollPool(skill, attribute, options = {}) {
    const modifier   = options.modifier ?? 0;
    const untrained  = skill === 0 ? -1 : 0;  // Defaulting penalty
    const pool       = Math.max(0, skill + attribute + modifier + untrained);
    const roll = new SR4Roll(pool, options);
    return roll.evaluate();
  }

  /**
   * Buy hits: trade 4 dice for 1 automatic hit (no rolling, no glitch risk).
   * @param {number} pool - Dice pool size
   * @returns {{ hits: number, remaining: number }}
   */
  static buyHits(pool) {
    const hits      = Math.floor(pool / 4);
    const remaining = pool % 4;
    return { hits, remaining };
  }

  /**
   * Roll initiative: base score + sum of d6 dice.
   * SR4: Initiative = Reaction + Intuition + sum(d6 × initiativeDice)
   * @param {number} base  - Reaction + Intuition (+ any bonuses)
   * @param {number} dice  - Number of d6 to roll (1 base, +1 per IP above 1)
   * @returns {{ score: number, roll: Roll }}
   */
  static async rollInitiative(base, dice = 1) {
    const r = new Roll(`${dice}d6`);
    await r.evaluate();
    const sum   = r.terms[0].results.reduce((acc, d) => acc + d.result, 0);
    const score = base + sum;
    return { score, sum, rolls: r.terms[0].results.map(d => d.result), roll: r };
  }
}
