/**
 * SR4Combat — Custom Combat class for SR4 20th Anniversary
 *
 * Handles SR4's initiative system:
 * - Initiative Score = Reaction + Intuition + Xd6 (sum, not hits)
 * - Multiple Initiative Passes (IPs) per Combat Turn
 * - Each IP, combatants with remaining IPs act; those without are done
 * - At start of each new Combat Turn: all combatants re-roll initiative,
 *   then reduce score by 10 for subsequent passes
 *
 * Implementation notes:
 * - initiative field stores the rolled score (Reaction + Intuition + Xd6)
 * - system.initiativePasses flag stored on combatant flags
 * - IP tracking: after each IP, combatants with score ≤ 0 are skipped
 *   until next turn
 */

import { SR4Roll } from "../dice/sr4-roll.mjs";

export class SR4Combat extends Combat {

  /**
   * Roll initiative for a single combatant.
   * Uses SR4Roll.rollInitiative (sums d6 rather than counting hits).
   *
   * @override
   */
  async rollInitiative(ids, { formula, updateTurn, messageOptions } = {}) {
    const combatantIds = typeof ids === "string" ? [ids] : ids;

    const updates = [];
    const messages = [];

    for (const id of combatantIds) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;

      const actor = combatant.actor;
      if (!actor) continue;

      const sys = actor.system;

      // Get base initiative value from actor data model
      let base   = 0;
      let numDie = 1;
      let label  = combatant.name;

      if (typeof sys.initiativeBase === "number") {
        base   = sys.initiativeBase;     // Reaction + Intuition (character)
        numDie = sys.initiativeDice ?? 1;
      } else if (sys.attributes) {
        // Vehicle or spirit fallback
        const reaction   = sys.attributes?.reaction ?? sys.attr?.("reaction") ?? 3;
        const intuition  = sys.attributes?.intuition ?? sys.attr?.("intuition") ?? 3;
        base   = reaction + intuition;
        numDie = 1;
      }

      // SR4 IP count: wired reflexes, synaptic booster, etc — pulled from actor flags
      const ipCount = actor.getFlag("sr4", "initiativePasses") ?? sys.initiativePasses ?? 1;

      // Roll initiative — dice are SUMMED, not counted for hits
      const { score, rolls } = await SR4Roll.rollInitiative(base, numDie);

      updates.push({ _id: id, initiative: score });

      // Store IP count on the combatant flag so the tracker can read it
      await combatant.setFlag("sr4", "initiativePasses", ipCount);
      await combatant.setFlag("sr4", "initiativePassesRemaining", ipCount);

      // Chat message
      const rollStr = rolls.map(r => `[${r}]`).join(" + ");
      messages.push({
        content: `<div class="sr4-initiative-roll">
          <strong>${label}</strong> — Initiative: <span class="init-score">${score}</span>
          <span class="init-breakdown">(${base} + ${rollStr})</span>
          <span class="init-ip">${ipCount} IP</span>
        </div>`,
        speaker: ChatMessage.getSpeaker({ actor })
      });
    }

    if (!updates.length) return this;

    await this.updateEmbeddedDocuments("Combatant", updates);

    if (messages.length) {
      await ChatMessage.create(messages);
    }

    return this;
  }

  /**
   * Roll initiative for ALL combatants that don't have a score yet.
   * @override
   */
  async rollAll(options) {
    const ids = this.combatants
      .filter(c => c.initiative === null || c.initiative === undefined)
      .map(c => c.id);
    return this.rollInitiative(ids, options);
  }

  /**
   * Re-roll initiative for all combatants (start of new combat turn).
   */
  async rollAllNew(options) {
    const ids = this.combatants.map(c => c.id);
    return this.rollInitiative(ids, options);
  }

  /**
   * Advance to next turn.
   * SR4 twist: when the last combatant in an IP finishes, start the next IP
   * (reduce all scores by 10, skip those ≤ 0) rather than re-rolling.
   * When all combatants are at ≤ 0, advance to a new Combat Turn and re-roll.
   *
   * @override
   */
  async nextTurn() {
    const result = await super.nextTurn();

    // After advancing, check if we need to handle IP rollover
    if (this.turn === 0 && this.round > 1) {
      // Foundry wrapped to a new round — this means all IPs are exhausted.
      // Announce new Combat Turn and optionally re-roll.
      this._announceNewCombatTurn();
    }

    return result;
  }

  /** Announce new combat turn in chat with re-roll prompt. */
  async _announceNewCombatTurn() {
    if (!game.user.isGM) return;
    const content = `
      <div class="sr4-combat-turn">
        <strong>⚡ New Combat Turn</strong>
        <p>All combatants re-roll initiative. Use the <em>Re-roll All</em> button in the combat tracker.</p>
      </div>`;
    await ChatMessage.create({ content });
  }

  /**
   * Reduce all initiative scores by 10 (start of a new Initiative Pass).
   * Combatants reaching ≤ 0 don't act this pass.
   */
  async nextInitiativePass() {
    if (!game.user.isGM) return;

    const updates = this.combatants.map(c => ({
      _id:        c.id,
      initiative: Math.max(0, (c.initiative ?? 0) - 10)
    }));

    await this.updateEmbeddedDocuments("Combatant", updates);

    const content = `<div class="sr4-ip-advance"><strong>▶ Initiative Pass</strong> — all scores reduced by 10.</div>`;
    await ChatMessage.create({ content });
  }
}

// ── SR4 COMBAT TRACKER ──────────────────────────────────────────────────────

export class SR4CombatTracker extends CombatTracker {

  /** @override — add SR4-specific buttons to the tracker header */
  async _getHeaderButtons() {
    const buttons = await super._getHeaderButtons();

    if (game.user.isGM) {
      // "Next IP" button — reduce all scores by 10
      buttons.unshift({
        label:   "Next IP",
        class:   "sr4-next-ip",
        icon:    "fas fa-fast-forward",
        onclick: () => game.combat?.nextInitiativePass()
      });

      // "Re-roll All" button — new combat turn
      buttons.unshift({
        label:   "Re-roll Turn",
        class:   "sr4-reroll-turn",
        icon:    "fas fa-dice",
        onclick: () => game.combat?.rollAllNew()
      });
    }

    return buttons;
  }

  /**
   * Augment each combatant entry with IP count and remaining IPs.
   * @override
   */
  async _prepareCombatantContext(combatant, index) {
    const ctx = await super._prepareCombatantContext(combatant, index);

    ctx.sr4 = {
      ip:          combatant.getFlag("sr4", "initiativePasses") ?? 1,
      ipRemaining: combatant.getFlag("sr4", "initiativePassesRemaining") ?? 1,
      inactive:    (combatant.initiative ?? 0) <= 0
    };

    return ctx;
  }
}
