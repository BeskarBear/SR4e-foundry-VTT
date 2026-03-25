/**
 * NpcSheet — Simplified NPC sheet for SR4 20th Anniversary
 * ApplicationV2 + ActorSheetV2 framework.
 */
import { SR4Roll } from "../dice/sr4-roll.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ActorSheetV2                   = foundry.applications.sheets.ActorSheet;

export class NpcSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ["sr4", "sheet", "actor", "npc"],
    position: { width: 550, height: 600 },
    window:   { resizable: true },
    form:     { submitOnChange: true }
  };

  static PARTS = {
    sheet: { template: "systems/sr4/templates/actor/npc-sheet.hbs" }
  };

  static TABS = {
    primary: {
      initial: "stats",
      tabs: [
        { id: "stats" },
        { id: "gear" },
        { id: "notes" }
      ]
    }
  };

  // ── DATA PREP ────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys     = this.actor.system;

    context.actor  = this.actor;
    context.system = sys;
    context.flags  = this.actor.flags;

    context.weapons = this.actor.items.filter(i => i.type === "weapon");
    context.gear    = this.actor.items.filter(i => i.type === "gear");

    const TE = foundry.applications.ux.TextEditor.implementation;
    context.enrichedDescription = await TE.enrichHTML(
      sys.description ?? "", { relativeTo: this.actor }
    );
    context.enrichedNotes = await TE.enrichHTML(
      sys.notes ?? "", { relativeTo: this.actor }
    );

    return context;
  }

  // ── RENDER ──────────────────────────────────────────────────────────────

  async _onRender(context, options) {
    await super._onRender(context, options);

    this.changeTab(this.tabGroups.primary ?? "stats", "primary",
      { force: true, updatePosition: false });

    if (!this.isEditable) return;

    const html = $(this.element);
    html.find(".pool-roll").click(this._onPoolRoll.bind(this));
    html.find(".cm-box").click(this._onCMBoxClick.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-name").click(this._onItemOpen.bind(this));
  }

  // ── EVENT HANDLERS ───────────────────────────────────────────────────────

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

  _onCMBoxClick(event) {
    event.preventDefault();
    const el      = event.currentTarget;
    const monitor = el.dataset.monitor;
    const idx     = parseInt(el.dataset.idx);
    const current = this.actor.system.condition[monitor].value;
    const newVal  = idx <= current ? idx - 1 : idx;
    return this.actor.update({ [`system.condition.${monitor}.value`]: newVal });
  }

  _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    return item.delete();
  }

  _onItemOpen(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    item.sheet.render(true);
  }

  // ── DROP ──────────────────────────────────────────────────────────────────

  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;
    if (this.actor.uuid === item.parent?.uuid) return null;
    return this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
  }
}
