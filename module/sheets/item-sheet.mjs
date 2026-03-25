/**
 * SR4ItemSheet — Generic item sheet for all SR4 item types.
 * Built on ApplicationV2 + ItemSheetV2 (Foundry v12+ architecture).
 *
 * ── DESIGN PHILOSOPHY ────────────────────────────────────────────────────────
 * All 10 SR4 item types share a single sheet class with a single template.
 * Type-specific sections are shown/hidden in the Handlebars template using
 * `{{#if (eq itemType "weapon")}}` conditionals.
 *
 * This "one sheet for all types" pattern avoids maintaining 10 separate
 * sheet classes with near-identical boilerplate, at the cost of a larger
 * template file. The context.itemType field drives all conditional display.
 *
 * Supported item types:
 *   weapon      — SR4A firearms, melee weapons, explosives
 *   armor       — Body armor with B/I ratings and mods
 *   cyberware   — Cyberware/bioware/nano/gene with Essence costs
 *   ammo        — Ammunition with DV/AP modifiers
 *   spell       — Spells for Magicians and Mystic Adepts
 *   adeptpower  — Physical Adept powers (PP cost, action type)
 *   program     — Matrix programs (Common Use, Hacking, Security, Agent)
 *   quality     — Positive/Negative qualities (BP cost)
 *   contact     — Contacts (Connection + Loyalty ratings)
 *   gear        — General equipment (commlinks, medical, explosives, etc.)
 *
 * ── TEMPLATE STRUCTURE ────────────────────────────────────────────────────────
 * The single template (item/item-sheet.hbs) renders:
 *   1. Header: item name (editable), type label, image
 *   2. Type-specific body sections (hidden based on itemType)
 *   3. Common footer: source, description (enriched HTML)
 *
 * All fields use submitOnChange: true — no explicit Save button needed.
 * Every input change immediately saves to the Foundry document.
 *
 * @extends {HandlebarsApplicationMixin(ItemSheetV2)}
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
const ItemSheetV2                    = foundry.applications.sheets.ItemSheet;

export class SR4ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  /**
   * Default sheet configuration.
   *
   * 480×540 is enough for most item types; the sheet is resizable for
   * items with long descriptions or many mods (e.g. weapon accessories).
   * submitOnChange: true saves every field change without a Submit button.
   */
  static DEFAULT_OPTIONS = {
    classes:  ["sr4", "sheet", "item-sheet"],
    position: { width: 480, height: 540 },
    window:   { resizable: true },
    form:     { submitOnChange: true }
  };

  /**
   * Single shared template for all item types.
   * The template uses itemType conditionals to show/hide type-specific sections.
   */
  static PARTS = {
    sheet: { template: "systems/sr4/templates/item/item-sheet.hbs" }
  };

  // ── TITLE ─────────────────────────────────────────────────────────────────

  /**
   * Window title shown in the application's title bar.
   *
   * Format: "Item Name — Item Type Label"
   * Example: "Ares Predator IV — Weapon" or "Wired Reflexes 2 — Cyberware / Bioware"
   *
   * @override
   * @returns {string} Window title string
   */
  get title() {
    return `${this.item.name} — ${this._typeLabel}`;
  }

  /**
   * Human-readable label for this item's type.
   *
   * Used in the window title and as a display header on the sheet.
   * Falls back to raw item.type if no label is defined (graceful handling of
   * future item types not yet in the lookup table).
   *
   * @returns {string} Localized/readable type name
   */
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

  // ── DATA PREP ─────────────────────────────────────────────────────────────

  /**
   * Prepare rendering context for the item sheet.
   *
   * Provides the minimum required context:
   *   - item: the full Item document (for name, img, flags, etc.)
   *   - system: the item's TypeDataModel data (all schema fields)
   *   - itemType: the item.type string (drives template conditionals)
   *   - typeLabel: human-readable type name (for display in template header)
   *
   * The template uses `{{#if (eq itemType "weapon")}}` blocks to show
   * only the relevant fields for the current item type.
   *
   * @override
   * @param {object} options - ApplicationV2 render options
   * @returns {Promise<object>} Rendering context
   */
  async _prepareContext(options) {
    const context     = await super._prepareContext(options);
    context.item      = this.item;
    context.system    = this.item.system;
    context.itemType  = this.item.type;     // drives {{#if (eq itemType "X")}} in template
    context.typeLabel = this._typeLabel;    // human-readable display header
    return context;
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  /**
   * Post-render hook for attaching DOM event listeners.
   *
   * Currently minimal — the basic field form uses submitOnChange.
   * Future: type-specific listeners can be added here (e.g. add/remove mods
   * for weapons, add stat bonuses for cyberware, etc.)
   *
   * @override
   * @param {object} context - Prepared rendering context
   * @param {object} options - ApplicationV2 render options
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;
    // Future: specialized listeners (e.g. add/remove weapon accessories, mods)
  }
}
