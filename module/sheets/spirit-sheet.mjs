/**
 * SpiritSheet — Bound/Free Spirit actor sheet for SR4 20th Anniversary.
 * Built on ApplicationV2 + ActorSheetV2 (Foundry v12+ architecture).
 *
 * ── SHEET LAYOUT — 2 TABS ─────────────────────────────────────────────────
 *   stats: Force, attribute offsets, computed attributes, condition monitors,
 *          binding/services, plane (physical/astral), innate powers list
 *   notes: Enriched HTML notes field (description, GM notes, etc.)
 *
 * ── SPIRIT CONTEXT ────────────────────────────────────────────────────────
 * Each spirit type has attribute OFFSETS from Force (all attribute = Force + offset).
 * The sheet resolves these via SpiritDataModel.attr(name) and presents the
 * final computed values alongside the offset inputs for easy adjustment.
 *
 * Two condition monitors (Physical and Astral) are tracked separately.
 * The CM boxes use the toggle pattern: click filled box → reduce damage,
 * click unfilled box → fill to that box.
 *
 * ── POWER LIST MANAGEMENT ─────────────────────────────────────────────────
 * Spirit powers are stored as a simple string array.
 * The sheet provides add/delete buttons for the powers list.
 * Powers are free-form text entries (no mechanical lookup).
 *
 * @extends {HandlebarsApplicationMixin(ActorSheetV2)}
 */
import { SR4Roll } from "../dice/sr4-roll.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ActorSheetV2                   = foundry.applications.sheets.ActorSheet;

export class SpiritSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /**
   * Default sheet configuration.
   * 520×580 fits the spirit stat block, two CM tracks, and powers list.
   * submitOnChange: true saves all field edits immediately.
   */
  static DEFAULT_OPTIONS = {
    classes:  ["sr4", "sheet", "actor", "spirit"],
    position: { width: 520, height: 580 },
    window:   { resizable: true },
    form:     { submitOnChange: true }
  };

  /**
   * Single template with tab support.
   * stats tab: Force, computed attributes, CM boxes, services, powers.
   * notes tab: enriched HTML description field.
   */
  static PARTS = {
    sheet: { template: "systems/sr4/templates/actor/spirit-sheet.hbs" }
  };

  /**
   * Two-tab layout. "stats" shows the mechanical data; "notes" shows long text.
   */
  static TABS = {
    primary: {
      initial: "stats",
      tabs: [
        { id: "stats" },
        { id: "notes" }
      ]
    }
  };

  // ── DATA PREP ─────────────────────────────────────────────────────────────

  /**
   * Prepare rendering context for the spirit sheet.
   *
   * Resolves all computed attributes via the attr() method,
   * derives CM maximums and combat pool, and builds select option objects.
   *
   * @param {object} options - ApplicationV2 render options
   * @returns {Promise<object>} Rendering context containing:
   *   - actor          {SR4Actor}          The spirit actor document
   *   - system         {SpiritDataModel}   All spirit data fields
   *   - flags          {object}            Actor flags
   *   - attrs          {object}  Resolved attributes (Force + offset, min 1):
   *       body, agility, reaction, strength, charisma, intuition, logic, willpower
   *   - physCMMax      {number}  Force × 2 — Physical and Astral CM maximum
   *   - initiativeBase {number}  Reaction + Intuition — initiative score before dice
   *   - combatPool     {number}  Agility + Force — estimated combat dice pool
   *   - spiritTypeChoices {object} Key→label map for the spirit type selector
   *   - planeChoices   {object}  Key→label map for the plane selector
   *   - enrichedNotes  {string}  HTML-enriched notes for the notes tab
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys     = this.actor.system;

    context.actor  = this.actor;
    context.system = sys;
    context.flags  = this.actor.flags;

    // Compute all attributes: Force + offset per attribute
    // attr() clamps to minimum 1 regardless of negative offset
    context.attrs = {
      body:      sys.attr("body"),
      agility:   sys.attr("agility"),
      reaction:  sys.attr("reaction"),
      strength:  sys.attr("strength"),
      charisma:  sys.attr("charisma"),
      intuition: sys.attr("intuition"),
      logic:     sys.attr("logic"),
      willpower: sys.attr("willpower")
    };

    context.physCMMax     = sys.physicalCMMax;   // Force × 2 (both Physical and Astral CMs)
    context.initiativeBase = sys.initiativeBase;  // Reaction + Intuition
    context.combatPool    = sys.combatPool;       // Agility + Force (estimate)

    // Dropdown option objects for the spirit type and plane selectors
    context.spiritTypeChoices = {
      air: "Air", earth: "Earth", fire: "Fire", water: "Water",
      beast: "Beast", man: "Man", plant: "Plant", task: "Task",
      guardian: "Guardian", guidance: "Guidance", shadow: "Shadow",
      illusion: "Illusion", free: "Free Spirit", other: "Other"
    };
    context.planeChoices = { physical: "Physical", astral: "Astral" };

    // Enrich the notes HTML (process @UUID links, roll formulas, etc.)
    const TE = foundry.applications.ux.TextEditor.implementation;
    context.enrichedNotes = await TE.enrichHTML(
      sys.notes ?? "", { relativeTo: this.actor }
    );

    return context;
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  /**
   * Register DOM event listeners and restore active tab after render.
   *
   * Listeners:
   *   .pool-roll:      Roll a dice pool (data-pool attribute)
   *   .cm-box:         Toggle a condition monitor box (data-monitor, data-idx)
   *   .power-add:      Append an empty entry to the powers array
   *   .power-delete:   Remove entry at data-idx from the powers array
   *
   * @param {object} context - Prepared rendering context
   * @param {object} options - ApplicationV2 render options
   */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Restore last active tab (prevents reset to "stats" on every re-render)
    this.changeTab(this.tabGroups.primary ?? "stats", "primary",
      { force: true, updatePosition: false });

    if (!this.isEditable) return;

    const html = $(this.element);
    html.find(".pool-roll").click(this._onPoolRoll.bind(this));
    html.find(".cm-box").click(this._onCMBoxClick.bind(this));
    html.find(".power-add").click(this._onPowerAdd.bind(this));
    html.find(".power-delete").click(this._onPowerDelete.bind(this));
  }

  // ── EVENT HANDLERS ────────────────────────────────────────────────────────

  /**
   * Roll a flat dice pool from a .pool-roll element.
   *
   * The spirit sheet provides roll buttons for key pools (combat pool,
   * initiative, etc.) using data-pool and data-label attributes.
   * Rolls SR4Roll(poolSize) — hits on 5+, with glitch/crit-glitch detection.
   *
   * @param {MouseEvent} event - Click event from a .pool-roll element
   */
  async _onPoolRoll(event) {
    event.preventDefault();
    const el    = event.currentTarget;
    const pool  = parseInt(el.dataset.pool);
    const label = el.dataset.label ?? "Roll";
    if (isNaN(pool)) return;
    const roll = new SR4Roll(pool, { rollLabel: label, actor: this.actor.name });
    await roll.evaluate();
    return roll.toMessage();
  }

  /**
   * Toggle a condition monitor box on click.
   *
   * SR4 condition monitor toggle logic (same pattern as NpcSheet and CharacterSheet):
   *   - data-monitor: "physical" or "astral" — which CM track
   *   - data-idx: 1-based box index (1 = first box)
   *   - If idx ≤ current value: reduce damage to idx-1 (unfill this box and above)
   *   - If idx > current value: fill damage to idx (fill to this box)
   *
   * This creates natural click behavior: clicking a filled box unfills it,
   * clicking an unfilled box fills up to that point.
   *
   * @param {MouseEvent} event - Click event from a .cm-box element
   */
  _onCMBoxClick(event) {
    event.preventDefault();
    const el      = event.currentTarget;
    const monitor = el.dataset.monitor;    // "physical" or "astral"
    const idx     = parseInt(el.dataset.idx);
    const current = this.actor.system.condition[monitor].value;
    const newVal  = idx <= current ? idx - 1 : idx;
    return this.actor.update({ [`system.condition.${monitor}.value`]: newVal });
  }

  /**
   * Add a new empty string entry to the spirit's powers array.
   *
   * Powers are stored as string[] — each entry is a power name.
   * Adding appends "" to allow the player to type the new power name.
   * Deep clone prevents Foundry's reactive proxy from tracking the mutation directly.
   *
   * @param {MouseEvent} event - Click event from the .power-add button
   */
  async _onPowerAdd(event) {
    event.preventDefault();
    const powers = foundry.utils.deepClone(this.actor.system.powers);
    powers.push("");
    return this.actor.update({ "system.powers": powers });
  }

  /**
   * Delete a power entry by index from the spirit's powers array.
   *
   * @param {MouseEvent} event - Click event from a .power-delete button
   *   Requires data-idx attribute specifying the 0-based array index to remove
   */
  async _onPowerDelete(event) {
    event.preventDefault();
    const idx    = parseInt(event.currentTarget.dataset.idx);
    const powers = foundry.utils.deepClone(this.actor.system.powers);
    powers.splice(idx, 1);
    return this.actor.update({ "system.powers": powers });
  }
}
