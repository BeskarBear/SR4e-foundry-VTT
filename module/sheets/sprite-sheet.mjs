/**
 * SpriteSheet — Technomancer Sprite actor sheet for SR4 20th Anniversary.
 * Built on ApplicationV2 + ActorSheetV2 (Foundry v12+ architecture).
 *
 * ── SHEET LAYOUT — 2 TABS ─────────────────────────────────────────────────
 *   stats: Level, Matrix attribute offsets, computed attributes, Matrix CM,
 *          registration/services, sprite type selector, innate powers list
 *   notes: Enriched HTML notes field
 *
 * ── SPRITE CONTEXT ────────────────────────────────────────────────────────
 * Sprites are Technomancer companions compiled from the Resonance.
 * Unlike spirits (physical + astral CMs), sprites have only ONE condition
 * monitor — the Matrix CM (max = Level × 2).
 *
 * Matrix attributes (Response, Signal, System, Firewall, Body, Agility)
 * are all derived from Level + per-type offsets. The sheet resolves these
 * via SpriteDataModel.attr(name) and displays both the offset (editable)
 * and the computed final value.
 *
 * ── INITIATIVE IN THE MATRIX ─────────────────────────────────────────────
 * Sprites act in Matrix time, using their Response as the initiative base.
 * Initiative = Response + 1d6 (or 2d6 for high-tier sprites).
 * context.initiativePool = Response attribute for roll display.
 *
 * ── COMBAT IN THE MATRIX ─────────────────────────────────────────────────
 * Cybercombat uses Agility + Level as an approximation of the sprite's
 * combat capability (GM-assigned skill equivalent for sprite types).
 * Fault sprites are the dedicated combat type; others use combat rarely.
 *
 * @extends {HandlebarsApplicationMixin(ActorSheetV2)}
 */
import { SR4Roll } from "../dice/sr4-roll.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ActorSheetV2                   = foundry.applications.sheets.ActorSheet;

export class SpriteSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /**
   * Default sheet configuration.
   * 480×520 is slightly smaller than the spirit sheet (fewer attributes to display).
   * submitOnChange: true saves all field edits immediately.
   */
  static DEFAULT_OPTIONS = {
    classes:  ["sr4", "sheet", "actor", "sprite"],
    position: { width: 480, height: 520 },
    window:   { resizable: true },
    form:     { submitOnChange: true }
  };

  /**
   * Single template with tab support.
   * stats tab: Level, Matrix attributes, CM boxes, services/registration, powers.
   * notes tab: enriched HTML description/notes.
   */
  static PARTS = {
    sheet: { template: "systems/sr4/templates/actor/sprite-sheet.hbs" }
  };

  /**
   * Two-tab layout. "stats" for mechanics; "notes" for description/GM notes.
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
   * Prepare rendering context for the sprite sheet.
   *
   * Resolves all Matrix attributes via attr(), computes Matrix CM max,
   * initiative pool, and cybercombat pool estimate.
   *
   * @param {object} options - ApplicationV2 render options
   * @returns {Promise<object>} Rendering context containing:
   *   - actor          {SR4Actor}          The sprite actor document
   *   - system         {SpriteDataModel}   All sprite data fields
   *   - flags          {object}            Actor flags
   *   - matrixAttrs    {object}  Computed Matrix attributes (Level + offset, min 1):
   *       response, signal, system, firewall, body, agility
   *   - matrixCMMax    {number}  Level × 2 — Matrix condition monitor maximum
   *   - initiativePool {number}  Response — base for Matrix initiative (+ 1d6 rolled)
   *   - combatPool     {number}  Agility + Level — cybercombat estimate
   *   - spriteTypeChoices {object} Key→label map for sprite type selector
   *   - enrichedNotes  {string}  HTML-enriched notes for the notes tab
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys     = this.actor.system;

    context.actor  = this.actor;
    context.system = sys;
    context.flags  = this.actor.flags;

    // Resolve all Matrix attributes: Level + offset (clamped to min 1)
    context.matrixAttrs = {
      response: sys.attr("response"),
      signal:   sys.attr("signal"),
      system:   sys.attr("system"),
      firewall: sys.attr("firewall"),
      body:     sys.attr("body"),
      agility:  sys.attr("agility")
    };

    context.matrixCMMax = sys.matrixCMMax;   // Level × 2

    // Matrix initiative base: sprite uses Response as the score before dice
    // SR4A: sprite initiative = Response + 1d6 (most sprites get 1d6)
    context.initiativePool = sys.attr("response");

    // Cybercombat pool: Agility + Level (approximation for GM use)
    // Fault sprites excel at this; other types use this rarely
    context.combatPool = sys.attr("agility") + sys.level;

    // Dropdown options for sprite type selector
    context.spriteTypeChoices = {
      courier: "Courier", crack: "Crack", data: "Data",
      fault: "Fault", machine: "Machine"
    };

    // Enrich notes HTML (resolve @UUID links, roll formulas, inline content)
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
   *   .pool-roll:      Roll a flat dice pool
   *   .cm-box:         Toggle Matrix CM box state
   *   .power-add:      Append new empty power entry
   *   .power-delete:   Remove power entry at data-idx
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
   * Uses SR4Roll (hit counting: 5-6 = hit; glitch on ≥50% 1s).
   * data-pool: number of dice to roll.
   * data-label: display name for the chat message.
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
   * Toggle a Matrix condition monitor box.
   *
   * Sprites have one CM: "matrix". The toggle logic:
   *   - idx ≤ current value: reduce to idx-1 (unfill this box and all above)
   *   - idx > current value: fill to idx (fill from current+1 to idx)
   *
   * This creates intuitive click behavior: clicking a filled box unfills it,
   * clicking an empty box fills up to that point.
   *
   * @param {MouseEvent} event - Click event from a .cm-box element
   *   Requires data-monitor ("matrix") and data-idx (1-based box number)
   */
  _onCMBoxClick(event) {
    event.preventDefault();
    const el      = event.currentTarget;
    const monitor = el.dataset.monitor;    // always "matrix" for sprites
    const idx     = parseInt(el.dataset.idx);
    const current = this.actor.system.condition[monitor].value;
    const newVal  = idx <= current ? idx - 1 : idx;
    return this.actor.update({ [`system.condition.${monitor}.value`]: newVal });
  }

  /**
   * Add an empty power entry to the sprite's powers array.
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
   * Delete a power entry by index.
   *
   * @param {MouseEvent} event - Click event from a .power-delete button
   *   Requires data-idx attribute (0-based array index)
   */
  async _onPowerDelete(event) {
    event.preventDefault();
    const idx    = parseInt(event.currentTarget.dataset.idx);
    const powers = foundry.utils.deepClone(this.actor.system.powers);
    powers.splice(idx, 1);
    return this.actor.update({ "system.powers": powers });
  }
}
