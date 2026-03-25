/**
 * SR4ItemSheet — generic item sheet for all SR4 item types.
 * ApplicationV2 + ItemSheetV2 framework.
 * Single template with type-specific sections toggled via Handlebars {{#if}}.
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
const ItemSheetV2                    = foundry.applications.sheets.ItemSheet;

export class SR4ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ["sr4", "sheet", "item-sheet"],
    position: { width: 480, height: 540 },
    window:   { resizable: true },
    form:     { submitOnChange: true }
  };

  static PARTS = {
    sheet: { template: "systems/sr4/templates/item/item-sheet.hbs" }
  };

  /** @override */
  get title() {
    return `${this.item.name} — ${this._typeLabel}`;
  }

  get _typeLabel() {
    const labels = {
      weapon:     "Weapon",
      armor:      "Armor",
      cyberware:  "Cyberware / Bioware",
      ammo:       "Ammunition",
      spell:      "Spell",
      adeptpower: "Adept Power",
      program:    "Program",
      quality:    "Quality",
      contact:    "Contact",
      gear:       "Gear"
    };
    return labels[this.item.type] ?? this.item.type;
  }

  /** @override */
  async _prepareContext(options) {
    const context     = await super._prepareContext(options);
    context.item      = this.item;
    context.system    = this.item.system;
    context.itemType  = this.item.type;
    context.typeLabel = this._typeLabel;
    return context;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;
    // Future: specialized listeners (e.g. add/remove accessories)
  }
}
