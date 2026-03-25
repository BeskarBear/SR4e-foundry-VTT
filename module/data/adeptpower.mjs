/**
 * AdeptPowerDataModel — Physical Adept power item (SR4 20th Anniversary).
 *
 * ── SR4A PHYSICAL ADEPTS (SR4A p.195-206) ────────────────────────────────────
 * Physical Adepts are Awakened characters who channel their Magic directly into
 * personal physical enhancement rather than spellcasting or spirit summoning.
 * They cannot normally cast spells or summon spirits (Mystic Adepts are the exception).
 *
 * The core mechanic is Power Points (PP):
 *   - Available PP = Magic attribute rating
 *   - Spent on powers permanently (until Magic drops from Essence loss)
 *   - Total PP spent across all powers ≤ Magic at all times
 *   - If cyberware reduces Essence → Magic drops → PP may exceed available → lose powers
 *
 * ── POWER POINT COSTS (SR4A p.196-206) ───────────────────────────────────────
 * Power costs range from 0.25 to 4.0 Power Points:
 *
 *   0.25 PP:  Minor sensory or minor enhancement (some innate powers)
 *   0.5 PP:   Standard minor physical enhancement (Traceless Walk, Keratin Control)
 *   1.0 PP:   Significant powers (Mystic Armor base, Killing Hands, Pain Resistance)
 *   2.0 PP:   Major abilities (Adept Centering, Improved Attribute base level)
 *   4.0 PP:   Elite rare powers (certain high-tier adept abilities)
 *
 * LEVELED POWERS: many powers can be bought multiple times for stacking effect.
 *   totalPP = ppCost × levels (when isLeveled = true)
 *   Examples:
 *     Improved Ability (Combat): 0.5 PP/level → add +1 die per level to one skill
 *     Mystic Armor: 1 PP/level → +1 Ballistic/Impact per level
 *     Increased Reflexes: level 1=1.5 PP (adds +1d6), level 2=3 PP (+2d6), level 3=5 PP (+3d6)
 *
 * NON-LEVELED: flat PP cost, binary on/off.
 *   Examples: Killing Hands (1 PP), Body Control (1 PP), Rapid Draw (0.5 PP)
 *
 * ── ACTION TYPES (SR4A p.60-61) ──────────────────────────────────────────────
 * SR4A uses a structured action economy. Adept powers specify their action cost:
 *
 *   passive:   Always on while the adept has Magic > 0. No action required.
 *              Examples: Mystic Armor (always protecting), Improved Attribute (always boosted),
 *                        Natural Immunity, Thermographic Vision
 *
 *   free:      Takes a Free Action to activate. Can do one Free Action per Initiative Pass.
 *              Examples: Killing Hands (declare before striking), Rapid Draw (holster/draw),
 *                        Attribute Boost (trigger the boost)
 *
 *   simple:    Takes a Simple Action. Most characters get two Simple Actions per pass.
 *              Examples: Elemental Strike (channel element), some detection powers,
 *                        activating a complex sustained power
 *
 *   complex:   Takes the full Complex Action (replaces both simple actions).
 *              Reserved for powerful or complex activations.
 *              Examples: High-level Centering, some ritual-equivalent adept abilities
 *
 * ── ACTIVE POWER MAINTENANCE ─────────────────────────────────────────────────
 * "Sustained" is implicit in SR4A — activated powers remain until dismissed as a Free Action.
 * No dice pool penalty for maintaining active adept powers (unlike sustained spells).
 *
 * ── CYBERWARE AND ESSENCE LOSS ───────────────────────────────────────────────
 * Physical Adepts interact with cyberware the same way as other Awakened:
 *   - Each cyberware installation reduces Essence
 *   - Each full point of Essence lost below 6.0 reduces Magic by 1
 *   - Reduced Magic = fewer PP available
 *   - If spent PP exceeds available PP: GM removes powers starting from most recently acquired
 * Most pure adepts avoid cyberware (called "Burnout" when they sacrifice Magic for chrome).
 */
export class AdeptPowerDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── POWER POINT COST ────────────────────────────────────────────────────
      // ppCost: Power Points per level (if leveled) or total cost (if flat).
      // Common values: 0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0
      // The totalPP getter computes actual PP consumed from ppCost × levels.
      ppCost: new fields.NumberField({ initial: 1.0, min: 0.25 }),

      // levels: current level of this power (only meaningful when isLeveled = true).
      // Each level purchases one increment of the stacking bonus.
      // Maximum levels vary by power type (usually 6, see SR4A power description).
      levels: new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),

      // isLeveled: whether this power can be bought multiple times.
      // true  → totalPP = ppCost × levels
      // false → totalPP = ppCost (levels field is ignored)
      isLeveled: new fields.BooleanField({ initial: false }),

      // ── ACTIVATION ─────────────────────────────────────────────────────────
      // action: the SR4A action type required to activate this power.
      // See action type overview in the file-level JSDoc.
      //   passive: always on — no activation needed
      //   free:    Free Action (1 per initiative pass, from the free action pool)
      //   simple:  Simple Action (characters get 2 per pass standard)
      //   complex: Complex Action (replaces both simple actions)
      action: new fields.StringField({ initial: "passive",
        choices: ["passive", "free", "simple", "complex"] }),

      source:      new fields.StringField({ initial: "SR4A" }),
      description: new fields.HTMLField({ initial: "" }),
      notes:       new fields.StringField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ───────────────────────────────────────────────────────

  /**
   * Total Power Points consumed by this power at its current level.
   *
   * For leveled powers: totalPP = ppCost × levels.
   * For flat powers: totalPP = ppCost (levels field is ignored).
   *
   * The character sheet sums totalPP across all adept powers and compares
   * to the character's current Magic attribute to check for overallocation.
   *
   * @returns {number} Total Power Points spent on this power
   */
  get totalPP() {
    return this.ppCost * (this.isLeveled ? this.levels : 1);
  }
}
