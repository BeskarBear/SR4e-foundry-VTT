/**
 * SpiritSheet — Bound/Free Spirit sheet for SR4 20th Anniversary
 * ApplicationV2 + ActorSheetV2 framework.
 */
import { SR4Roll } from "../dice/sr4-roll.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ActorSheetV2                   = foundry.applications.sheets.ActorSheet;

export class SpiritSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ["sr4", "sheet", "actor", "spirit"],
    position: { width: 520, height: 580 },
    window:   { resizable: true },
    form:     { submitOnChange: true }
  };

  static PARTS = {
    sheet: { template: "systems/sr4/templates/actor/spirit-sheet.hbs" }
  };

  static TABS = {
    primary: {
      initial: "stats",
      tabs: [
        { id: "stats" },
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

    // Computed attributes (Force + offset)
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

    context.physCMMax    = sys.physicalCMMax;
    context.initiativeBase = sys.initiativeBase;
    context.combatPool   = sys.combatPool;

    context.spiritTypeChoices = {
      air: "Air", earth: "Earth", fire: "Fire", water: "Water",
      beast: "Beast", man: "Man", plant: "Plant", task: "Task",
      guardian: "Guardian", guidance: "Guidance", shadow: "Shadow",
      illusion: "Illusion", free: "Free Spirit", other: "Other"
    };
    context.planeChoices = { physical: "Physical", astral: "Astral" };

    const TE = foundry.applications.ux.TextEditor.implementation;
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
    html.find(".power-add").click(this._onPowerAdd.bind(this));
    html.find(".power-delete").click(this._onPowerDelete.bind(this));
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

  async _onPowerAdd(event) {
    event.preventDefault();
    const powers = foundry.utils.deepClone(this.actor.system.powers);
    powers.push("");
    return this.actor.update({ "system.powers": powers });
  }

  async _onPowerDelete(event) {
    event.preventDefault();
    const idx    = parseInt(event.currentTarget.dataset.idx);
    const powers = foundry.utils.deepClone(this.actor.system.powers);
    powers.splice(idx, 1);
    return this.actor.update({ "system.powers": powers });
  }
}
