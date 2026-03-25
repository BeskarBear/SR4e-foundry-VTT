/**
 * VehicleSheet — Vehicle and Drone actor sheet for SR4 20th Anniversary.
 * Built on ApplicationV2 + ActorSheetV2 (Foundry v12+ architecture).
 *
 * ── SHEET LAYOUT — 3 TABS ─────────────────────────────────────────────────
 *   stats:   Vehicle attributes (Handling/Accel/Speed/Pilot/Body/Armor/Sensor),
 *            condition monitor (current/max boxes), owner info,
 *            rigger interface flag, drone rating, embedded gear list
 *
 *   weapons: Mounted weapon summary entries (name, mount type, ammo count)
 *            plus embedded weapon items (for full weapon item sheets)
 *            Modification list (from Arsenal sourcebook)
 *
 *   notes:   Enriched HTML notes field for the GM
 *
 * ── CONDITION MONITOR ────────────────────────────────────────────────────
 * SR4 vehicle CM = 8 + ceil(Body/2).
 * Single track — all vehicle damage fills this one monitor.
 * CM boxes use the same toggle pattern as character/spirit sheets.
 *
 * ── WEAPON MOUNT MANAGEMENT ──────────────────────────────────────────────
 * Mounted weapons are stored as an array in the VehicleDataModel (summary entries).
 * More detailed weapon tracking uses embedded weapon Items (shown in weapons tab).
 * The sheet provides buttons to add/delete weapon mount entries.
 *
 * ── MODIFICATIONS ────────────────────────────────────────────────────────
 * Vehicle mods (from Arsenal) are tracked as a simple array of name/notes entries.
 * The sheet provides buttons to add/delete mod entries.
 *
 * ── ITEM DROP ────────────────────────────────────────────────────────────
 * Only weapon and gear items can be dropped onto a vehicle sheet.
 * Other item types (spells, programs, etc.) are rejected.
 * This mirrors the real limitation: vehicles don't "carry" cyberware or spells.
 *
 * @extends {HandlebarsApplicationMixin(ActorSheetV2)}
 */
import { SR4Roll } from "../dice/sr4-roll.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ActorSheetV2                   = foundry.applications.sheets.ActorSheet;

export class VehicleSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /**
   * Default sheet configuration.
   * 540×600 accommodates the stats tab with all vehicle attributes,
   * the weapons tab with mount list, and the notes tab.
   */
  static DEFAULT_OPTIONS = {
    classes:  ["sr4", "sheet", "actor", "vehicle"],
    position: { width: 540, height: 600 },
    window:   { resizable: true },
    form:     { submitOnChange: true }
  };

  /**
   * Single template with tab support.
   */
  static PARTS = {
    sheet: { template: "systems/sr4/templates/actor/vehicle-sheet.hbs" }
  };

  /**
   * Three-tab layout.
   */
  static TABS = {
    primary: {
      initial: "stats",
      tabs: [
        { id: "stats" },     // Vehicle stat block + CM + gear
        { id: "weapons" },   // Weapon mounts + modifications
        { id: "notes" }      // GM notes
      ]
    }
  };

  // ── DATA PREP ─────────────────────────────────────────────────────────────

  /**
   * Prepare rendering context for the vehicle sheet.
   *
   * @param {object} options - ApplicationV2 render options
   * @returns {Promise<object>} Rendering context containing:
   *   - actor          {SR4Actor}            The vehicle actor document
   *   - system         {VehicleDataModel}    All vehicle data fields
   *   - flags          {object}              Actor flags
   *   - conditionMax   {number}  8 + ceil(Body/2) — condition monitor maximum
   *   - pilotPool      {number}  Pilot + Handling — autopilot test pool estimate
   *   - vehicleTypeChoices {object} Key→label map for the vehicle type selector
   *   - weapons        {Item[]}  Embedded weapon items (for weapon stats tab)
   *   - gear           {Item[]}  Embedded gear items (sensors, medical, etc.)
   *   - enrichedNotes  {string}  HTML-enriched notes for the notes tab
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys     = this.actor.system;

    context.actor  = this.actor;
    context.system = sys;
    context.flags  = this.actor.flags;

    context.conditionMax = sys.conditionMax;  // 8 + ceil(Body/2)
    context.pilotPool    = sys.pilotPool;     // Pilot + Handling (rough estimate)

    // Dropdown options for vehicle type selector
    context.vehicleTypeChoices = {
      groundcraft: "Groundcraft", watercraft: "Watercraft",
      aircraft: "Aircraft", drone: "Drone", other: "Other"
    };

    // Embedded items — weapons for the weapons tab, gear for stats tab
    context.weapons = this.actor.items.filter(i => i.type === "weapon");
    context.gear    = this.actor.items.filter(i => i.type === "gear");

    // Enrich notes HTML
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
   *   .pool-roll:           Roll a flat dice pool
   *   .cm-box:              Toggle condition monitor box
   *   .item-delete:         Delete an embedded item by data-item-id
   *   .item-name:           Open an embedded item's sheet
   *   .weapon-mount-add:    Append new weapon mount entry to system.weapons
   *   .weapon-mount-delete: Remove weapon mount entry at data-idx
   *   .mod-add:             Append new modification entry to system.modifications
   *   .mod-delete:          Remove modification entry at data-idx
   *
   * @param {object} context - Prepared rendering context
   * @param {object} options - ApplicationV2 render options
   */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Restore last active tab
    this.changeTab(this.tabGroups.primary ?? "stats", "primary",
      { force: true, updatePosition: false });

    if (!this.isEditable) return;

    const html = $(this.element);
    html.find(".pool-roll").click(this._onPoolRoll.bind(this));
    html.find(".cm-box").click(this._onCMBoxClick.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-name").click(this._onItemOpen.bind(this));
    html.find(".weapon-mount-add").click(this._onWeaponMountAdd.bind(this));
    html.find(".weapon-mount-delete").click(this._onWeaponMountDelete.bind(this));
    html.find(".mod-add").click(this._onModAdd.bind(this));
    html.find(".mod-delete").click(this._onModDelete.bind(this));
  }

  // ── EVENT HANDLERS ────────────────────────────────────────────────────────

  /**
   * Roll a flat dice pool for a vehicle stat test (e.g. Pilot test).
   *
   * Vehicles use SR4Roll (hit counting: 5-6 = hit).
   * data-pool: number of dice. data-label: chat message title.
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
   * Toggle the vehicle's condition monitor box.
   *
   * Vehicle has one CM (system.condition.value — not split by track name).
   * Toggle logic:
   *   idx ≤ current: set value to idx-1 (unfill this box and above)
   *   idx > current: set value to idx (fill to this box)
   *
   * @param {MouseEvent} event - Click event from a .cm-box element
   */
  _onCMBoxClick(event) {
    event.preventDefault();
    const el      = event.currentTarget;
    // Note: vehicle uses condition.value directly (no "monitor" sub-key unlike characters)
    const idx     = parseInt(el.dataset.idx);
    const current = this.actor.system.condition.value;
    const newVal  = idx <= current ? idx - 1 : idx;
    return this.actor.update({ "system.condition.value": newVal });
  }

  /**
   * Delete an embedded item from this vehicle actor.
   * No confirmation dialog — direct delete (mirrors character sheet pattern).
   *
   * @param {MouseEvent} event - Click from .item-delete button
   */
  _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    return this.actor.items.get(itemId)?.delete();
  }

  /**
   * Open an embedded item's sheet by clicking its name.
   *
   * @param {MouseEvent} event - Click from .item-name element
   */
  _onItemOpen(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    return this.actor.items.get(itemId)?.sheet.render(true);
  }

  /**
   * Add a new empty weapon mount entry to system.weapons array.
   *
   * Weapon mounts are summary entries (not full weapon items).
   * Default to fixed mount type with 0 ammo — user fills in name and details.
   *
   * @param {MouseEvent} event - Click from .weapon-mount-add button
   */
  async _onWeaponMountAdd(event) {
    event.preventDefault();
    const mounts = foundry.utils.deepClone(this.actor.system.weapons);
    mounts.push({ name: "", mountType: "fixed", ammo: 0 });
    return this.actor.update({ "system.weapons": mounts });
  }

  /**
   * Remove a weapon mount entry by index.
   *
   * @param {MouseEvent} event - Click from .weapon-mount-delete button
   *   Requires data-idx (0-based array index)
   */
  async _onWeaponMountDelete(event) {
    event.preventDefault();
    const idx    = parseInt(event.currentTarget.dataset.idx);
    const mounts = foundry.utils.deepClone(this.actor.system.weapons);
    mounts.splice(idx, 1);
    return this.actor.update({ "system.weapons": mounts });
  }

  /**
   * Add a new empty vehicle modification entry to system.modifications array.
   *
   * Modifications are free-form name/notes pairs (Arsenal sourcebook rules).
   * User fills in the mod name and relevant stats/notes after creation.
   *
   * @param {MouseEvent} event - Click from .mod-add button
   */
  async _onModAdd(event) {
    event.preventDefault();
    const mods = foundry.utils.deepClone(this.actor.system.modifications);
    mods.push({ name: "", notes: "" });
    return this.actor.update({ "system.modifications": mods });
  }

  /**
   * Remove a modification entry by index.
   *
   * @param {MouseEvent} event - Click from .mod-delete button
   *   Requires data-idx (0-based array index)
   */
  async _onModDelete(event) {
    event.preventDefault();
    const idx  = parseInt(event.currentTarget.dataset.idx);
    const mods = foundry.utils.deepClone(this.actor.system.modifications);
    mods.splice(idx, 1);
    return this.actor.update({ "system.modifications": mods });
  }

  // ── DROP ──────────────────────────────────────────────────────────────────

  /**
   * Handle item drops onto the vehicle sheet.
   *
   * Only weapon and gear items can be added to a vehicle:
   *   - weapon: mounted guns, rockets, and vehicle weapons
   *   - gear:   sensors, medical kits, computers installed in the vehicle
   *
   * Rejects: self-drop (same actor), non-owner attempts, all other item types.
   * SR4A rationale: spells, cyberware, contacts etc. don't belong on a vehicle.
   *
   * @param {DragEvent} event - The drop event
   * @param {Item} item - The resolved Item document being dropped
   * @returns {Promise<Item[]|null>} Newly created embedded items, or null
   */
  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;
    if (this.actor.uuid === item.parent?.uuid) return null;     // prevent self-drop
    if (!["weapon", "gear"].includes(item.type)) return null;   // only weapons and gear
    return this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
  }
}
