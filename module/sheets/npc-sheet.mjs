/**
 * NpcSheet — Simplified NPC actor sheet for SR4 20th Anniversary.
 *
 * SR4 NPCs are designed for fast GM use during play. Rather than the full 6-tab
 * PC sheet, NPCs use a 3-tab layout focused on combat-relevant information:
 *
 *  - stats: Professional Rating, attributes, pre-computed dice pools, condition
 *           monitors, and weapon summary. The GM can roll any pool directly from
 *           the stats tab without opening a dialog.
 *  - gear:  Weapon and gear item lists (quick add/remove via drag-drop)
 *  - notes: Description, tactics notes, and GM background
 *
 * ── NPC DESIGN PHILOSOPHY ───────────────────────────────────────────────────
 * SR4 (p.280) recommends defining NPCs by Professional Rating (PR 1-6) and
 * pre-setting their key dice pools, rather than spending time computing every
 * attribute. For named/recurring NPCs, full attributes can be set. For grunts,
 * just set the pools and let the GM roll them directly.
 *
 * Pool sizes by PR (rough guidelines):
 *  PR 1-2: 2-4 dice for most things (street-level threats, corp wageslaves)
 *  PR 3-4: 6-8 dice (gangers, corporate security, competent specialists)
 *  PR 5-6: 10+ dice (elite security, shadowrunners, legendary figures)
 *
 * Condition monitors:
 *  NPCs store Physical CM max and Stun CM max explicitly (not computed from
 *  Body/Willpower like PCs) for flexibility. Defaults: 10 each.
 */
import { SR4Roll } from "../dice/sr4-roll.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ActorSheetV2                   = foundry.applications.sheets.ActorSheet;

/**
 * Simplified NPC sheet — 3 tabs (stats/gear/notes) with quick pool roll buttons.
 *
 * @extends {HandlebarsApplicationMixin(ActorSheetV2)}
 */
export class NpcSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  // ── FOUNDRY CONFIGURATION ─────────────────────────────────────────────────

  /**
   * Default display options:
   *  - 550×600 — narrower than PC sheet (760×870); NPCs don't need full width
   *  - submitOnChange: every form field change auto-persists
   */
  static DEFAULT_OPTIONS = {
    classes:  ["sr4", "sheet", "actor", "npc"],
    position: { width: 550, height: 600 },
    window:   { resizable: true },
    form:     { submitOnChange: true }
  };

  /**
   * Single Handlebars template for the NPC sheet.
   * Uses tab blocks to switch between stats/gear/notes sections.
   */
  static PARTS = {
    sheet: { template: "systems/sr4/templates/actor/npc-sheet.hbs" }
  };

  /**
   * Tab group "primary" with three tabs:
   *  - "stats" — PR, attributes, pools, condition monitors, weapon summary
   *  - "gear"  — weapon and gear item lists
   *  - "notes" — description, tactics, and GM notes
   */
  static TABS = {
    primary: {
      initial: "stats",
      tabs: [
        { id: "stats" },
        { id: "gear"  },
        { id: "notes" }
      ]
    }
  };

  // ── DATA PREP ─────────────────────────────────────────────────────────────

  /**
   * Prepare template context for the NPC sheet.
   *
   * Enriches description and notes HTML so GM-entered links/rollable content
   * render correctly in the sheet (Foundry's inline rolls, UUID links, etc.).
   *
   * @param {object} options - Foundry render options
   * @returns {object} context
   * @returns {Actor}  context.actor                - Full Actor document
   * @returns {object} context.system               - NpcDataModel system data
   *                                                  (.professionalRating, .attributes,
   *                                                   .pools, .condition, etc.)
   * @returns {object} context.flags                - Actor flags
   * @returns {Item[]} context.weapons              - Weapon items for gear tab
   * @returns {Item[]} context.gear                 - Generic gear items
   * @returns {string} context.enrichedDescription  - HTML-enriched description
   * @returns {string} context.enrichedNotes        - HTML-enriched GM notes
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys     = this.actor.system;

    context.actor  = this.actor;
    context.system = sys;
    context.flags  = this.actor.flags;

    // Filter items for the gear tab
    context.weapons = this.actor.items.filter(i => i.type === "weapon");
    context.gear    = this.actor.items.filter(i => i.type === "gear");

    // Enrich HTML fields — converts @UUID links, inline rolls, etc.
    // Must be done async here (not in the template) before rendering.
    const TE = foundry.applications.ux.TextEditor.implementation;
    context.enrichedDescription = await TE.enrichHTML(
      sys.description ?? "", { relativeTo: this.actor }
    );
    context.enrichedNotes = await TE.enrichHTML(
      sys.notes ?? "", { relativeTo: this.actor }
    );

    return context;
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  /**
   * Attach event listeners after the sheet renders.
   * Foundry's ApplicationV2 calls this after each re-render.
   *
   * Skips listener setup when the sheet is read-only (non-owner viewing).
   *
   * @param {object} context - Same context from _prepareContext
   * @param {object} options - Foundry render options
   */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Restore the active tab (persisted in tabGroups state between renders)
    this.changeTab(this.tabGroups.primary ?? "stats", "primary",
      { force: true, updatePosition: false });

    // Read-only sheets don't need edit listeners
    if (!this.isEditable) return;

    const html = $(this.element);

    // Pool roll buttons: [data-pool="10"][data-label="Combat"]
    // Clicking one opens an SR4Roll with the given pool size
    html.find(".pool-roll").click(this._onPoolRoll.bind(this));

    // Condition Monitor checkboxes: clicking a box marks up to that box
    // (or removes the mark if clicking the current last filled box)
    html.find(".cm-box").click(this._onCMBoxClick.bind(this));

    // Item management
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-name").click(this._onItemOpen.bind(this));
  }

  // ── EVENT HANDLERS ────────────────────────────────────────────────────────

  /**
   * Roll a pre-set dice pool for this NPC.
   *
   * SR4 rule: NPCs roll a flat dice pool (no attribute+skill breakdown);
   * pool size is read from [data-pool] on the button. No threshold or Edge
   * in basic NPC rolls — GM narrates the result based on hits.
   *
   * @param {MouseEvent} event - Click from .pool-roll[data-pool][data-label]
   */
  async _onPoolRoll(event) {
    event.preventDefault();
    const el    = event.currentTarget;
    const pool  = parseInt(el.dataset.pool);    // Pre-set pool size from the sheet
    const label = el.dataset.label ?? "Roll";   // e.g. "Combat", "Defense", "Perception"
    if (isNaN(pool)) return;

    // SR4Roll: roll `pool` d6s, count hits (5-6), check glitch (half+ are 1s)
    const roll = new SR4Roll(pool, { rollLabel: label, actor: this.actor.name });
    await roll.evaluate();
    return roll.toMessage();
  }

  /**
   * Toggle a condition monitor box.
   *
   * SR4 condition monitor interaction:
   *  - Clicking an empty box (idx > current) fills boxes up to and including idx.
   *  - Clicking the last filled box (idx === current) removes that mark (decrement).
   *  - This mimics the physical act of checking/unchecking track boxes on paper.
   *
   * The wound modifier (-1 die per 3 filled boxes combined) is a computed getter
   * on NpcDataModel — it updates automatically after this write.
   *
   * @param {MouseEvent} event - Click from .cm-box[data-monitor][data-idx]
   */
  _onCMBoxClick(event) {
    event.preventDefault();
    const el      = event.currentTarget;
    const monitor = el.dataset.monitor;   // "physical" or "stun"
    const idx     = parseInt(el.dataset.idx);
    const current = this.actor.system.condition[monitor].value;

    // Toggle: clicking the current last box un-fills it; clicking higher fills to that level
    const newVal  = idx <= current ? idx - 1 : idx;
    return this.actor.update({ [`system.condition.${monitor}.value`]: newVal });
  }

  /**
   * Delete an embedded item from this NPC.
   * No confirmation dialog — NPCs are GM-controlled, fast removal is preferred.
   *
   * @param {MouseEvent} event - Click from .item-delete inside .item[data-item-id]
   */
  _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    return item.delete();
  }

  /**
   * Open the item sheet for an embedded item.
   *
   * @param {MouseEvent} event - Click from .item-name inside .item[data-item-id]
   */
  _onItemOpen(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    item.sheet.render(true);
  }

  // ── DRAG AND DROP ─────────────────────────────────────────────────────────

  /**
   * Handle an item being dropped onto this NPC sheet.
   * Adds the item to the NPC's embedded items collection.
   *
   * Guards against:
   *  - Non-owner: GM-only action
   *  - Self-drop: item already belongs to this actor (would create a duplicate)
   *
   * @param {DragEvent} event  - The drag event
   * @param {Item}      item   - The Item document being dropped
   * @returns {Promise<Item[]|null>} Created embedded documents, or null if skipped
   */
  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;
    // Skip if the item is already on this actor (would create a duplicate)
    if (this.actor.uuid === item.parent?.uuid) return null;
    return this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
  }
}
