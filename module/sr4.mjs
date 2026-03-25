/**
 * Shadowrun 4th Edition 20th Anniversary — Foundry VTT System
 * Main entry point.
 */

// ── DATA MODELS ─────────────────────────────────────────────────────────────
import {
  CharacterDataModel,
  NpcDataModel,
  SpiritDataModel,
  SpriteDataModel,
  VehicleDataModel,
  WeaponDataModel,
  ArmorDataModel,
  CyberwareDataModel,
  SpellDataModel,
  AdeptPowerDataModel,
  ProgramDataModel,
  QualityDataModel,
  ContactDataModel,
  GearDataModel,
  AmmoDataModel
} from "./data/_module.mjs";

// ── SHEETS ──────────────────────────────────────────────────────────────────
import { CharacterSheet }   from "./sheets/character-sheet.mjs";
import { NpcSheet }         from "./sheets/npc-sheet.mjs";
import { SpiritSheet }      from "./sheets/spirit-sheet.mjs";
import { SpriteSheet }      from "./sheets/sprite-sheet.mjs";
import { VehicleSheet }     from "./sheets/vehicle-sheet.mjs";
import { SR4ItemSheet }     from "./sheets/item-sheet.mjs";

// ── APPS ────────────────────────────────────────────────────────────────────
import { CharacterWizard }   from "./apps/character-wizard.mjs";
import { PoolBuilderDialog } from "./apps/pool-builder.mjs";

// ── COMBAT ──────────────────────────────────────────────────────────────────
import { SR4Combat, SR4CombatTracker } from "./combat/sr4-combat.mjs";

// ── COMPENDIUMS ──────────────────────────────────────────────────────────────
import { populateCompendiums } from "./compendiums/populate.mjs";

// ── DICE ────────────────────────────────────────────────────────────────────
import { SR4Roll } from "./dice/sr4-roll.mjs";

/* ────────────────────────────────────────────────────────────────────────────
   INIT HOOK
   ──────────────────────────────────────────────────────────────────────── */

Hooks.once("init", async function () {
  console.log("SR4 | Initializing Shadowrun 4th Edition system");

  // Expose on game object for macros / other modules
  game.sr4 = {
    SR4Roll,
    CharacterWizard,
    PoolBuilderDialog,
    // Config shortcuts
    SKILL_GROUPS: SR4_CONSTANTS.SKILL_GROUPS,
    METATYPES:    SR4_CONSTANTS.METATYPES
  };

  // ── REGISTER COMBAT CLASSES ───────────────────────────────────────────

  CONFIG.Combat.documentClass     = SR4Combat;
  CONFIG.ui.combat                = SR4CombatTracker;

  // ── REGISTER DATA MODELS ──────────────────────────────────────────────

  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
    npc:       NpcDataModel,
    spirit:    SpiritDataModel,
    sprite:    SpriteDataModel,
    vehicle:   VehicleDataModel
  };

  CONFIG.Item.dataModels = {
    weapon:     WeaponDataModel,
    armor:      ArmorDataModel,
    cyberware:  CyberwareDataModel,
    spell:      SpellDataModel,
    adeptpower: AdeptPowerDataModel,
    program:    ProgramDataModel,
    quality:    QualityDataModel,
    contact:    ContactDataModel,
    gear:       GearDataModel,
    ammo:       AmmoDataModel
  };

  // ── REGISTER SETTINGS ──────────────────────────────────────────────────

  game.settings.register("sr4", "compendiumVersion", {
    name:    "Compendium Data Version",
    hint:    "Internal version tracking for SR4 compendium population.",
    scope:   "world",
    config:  false,
    type:    String,
    default: ""
  });

  // ── REGISTER SHEETS ───────────────────────────────────────────────────

  const { Actors, Items } = foundry.documents.collections;

  Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);

  Actors.registerSheet("sr4", CharacterSheet, {
    types:       ["character"],
    makeDefault: true,
    label:       "SR4.SheetCharacter"
  });

  Actors.registerSheet("sr4", NpcSheet, {
    types:       ["npc"],
    makeDefault: true,
    label:       "SR4.SheetNPC"
  });

  Actors.registerSheet("sr4", SpiritSheet, {
    types:       ["spirit"],
    makeDefault: true,
    label:       "SR4.SheetSpirit"
  });

  Actors.registerSheet("sr4", SpriteSheet, {
    types:       ["sprite"],
    makeDefault: true,
    label:       "SR4.SheetSprite"
  });

  Actors.registerSheet("sr4", VehicleSheet, {
    types:       ["vehicle"],
    makeDefault: true,
    label:       "SR4.SheetVehicle"
  });

  Items.registerSheet("sr4", SR4ItemSheet, {
    types:       ["weapon","armor","cyberware","ammo","spell","adeptpower",
                  "program","quality","contact","gear"],
    makeDefault: true,
    label:       "SR4.SheetItem"
  });

  // ── REGISTER HANDLEBARS HELPERS ───────────────────────────────────────

  // Equality check
  Handlebars.registerHelper("eq",  (a, b) => a === b);
  Handlebars.registerHelper("neq", (a, b) => a !== b);
  Handlebars.registerHelper("gt",  (a, b) => a > b);
  Handlebars.registerHelper("lt",  (a, b) => a < b);
  Handlebars.registerHelper("gte", (a, b) => a >= b);

  // Build an array from arguments — used in templates like {{#each (array "a" "b" "c")}}
  Handlebars.registerHelper("array", (...args) => args.slice(0, -1));

  // Loop N times
  Handlebars.registerHelper("times", function (n, block) {
    let out = "";
    for (let i = 0; i < n; i++) out += block.fn(i);
    return out;
  });

  // Condition monitor helper: render a row of boxes, marking filled ones
  // Usage: {{cmBoxes monitor="physical" value=derived.physCMCurrent max=derived.physCMMax}}
  Handlebars.registerHelper("cmBoxes", function (options) {
    const { monitor, value, max } = options.hash;
    let out = "";
    for (let i = 0; i < max; i++) {
      const filled = i < value ? "filled" : "";
      out += `<span class="cm-box ${filled}" data-monitor="${monitor}" data-idx="${i + 1}"></span>`;
      // Visual separator every 3 boxes
      if ((i + 1) % 3 === 0 && i + 1 < max) out += `<span class="cm-separator"></span>`;
    }
    return new Handlebars.SafeString(out);
  });

  // Attribute pip helper: render rating dots
  // Usage: {{attrPips value=attrs.body max=6}}
  Handlebars.registerHelper("attrPips", function (options) {
    const { value, max } = options.hash;
    let out = "";
    for (let i = 0; i < (max ?? 6); i++) {
      const filled = i < value ? "filled" : "";
      out += `<span class="attr-pip ${filled}"></span>`;
    }
    return new Handlebars.SafeString(out);
  });

  // Edge pips with current vs max
  Handlebars.registerHelper("edgePips", function (options) {
    const { current, max } = options.hash;
    let out = "";
    for (let i = 0; i < max; i++) {
      const spent = i >= current ? "spent" : "";
      out += `<span class="edge-pip ${spent}" data-idx="${i + 1}"></span>`;
    }
    return new Handlebars.SafeString(out);
  });

  // ── PRELOAD TEMPLATES ─────────────────────────────────────────────────

  return foundry.applications.handlebars.loadTemplates([
    "systems/sr4/templates/actor/partials/attributes.hbs",
    "systems/sr4/templates/actor/partials/skills-group.hbs",
    "systems/sr4/templates/actor/partials/condition-monitors.hbs",
    "systems/sr4/templates/actor/partials/gear-list.hbs",
    "systems/sr4/templates/actor/partials/matrix-panel.hbs",
    "systems/sr4/templates/actor/partials/magic-panel.hbs",
    "systems/sr4/templates/actor/spirit-sheet.hbs",
    "systems/sr4/templates/actor/sprite-sheet.hbs",
    "systems/sr4/templates/actor/vehicle-sheet.hbs",
    "systems/sr4/templates/apps/character-wizard.hbs",
    "systems/sr4/templates/item/item-sheet.hbs"
  ]);
});

/* ────────────────────────────────────────────────────────────────────────────
   READY HOOK
   ──────────────────────────────────────────────────────────────────────── */

Hooks.once("ready", async function () {
  console.log("SR4 | System ready. Welcome to the Sixth World, choom.");
  // Populate compendiums with SR4A book data on first GM load
  await populateCompendiums();
});

/* ────────────────────────────────────────────────────────────────────────────
   PRE-CREATE ACTOR — intercept character creation to open wizard
   ──────────────────────────────────────────────────────────────────────── */

Hooks.on("preCreateActor", function (actor, data, options) {
  // Bypass hook if actor was created by the wizard itself
  if (options._fromSR4Wizard) return true;
  // Only intercept PC character type
  if (data.type !== "character") return true;
  // Open the wizard instead of creating the actor directly
  new CharacterWizard().render(true);
  return false;
});

/* ────────────────────────────────────────────────────────────────────────────
   CONSTANTS
   ──────────────────────────────────────────────────────────────────────── */

const SR4_CONSTANTS = {
  METATYPES: ["human", "elf", "dwarf", "ork", "troll"],
  SKILL_GROUPS: {
    Athletics:   ["gymnastics", "running", "swimming"],
    Biotech:     ["cybertechnology", "biotechnology"],
    Cracking:    ["cybercombat", "electronicWarfare", "hacking"],
    Electronics: ["computer", "dataSearch", "hardware", "software"],
    Firearms:    ["automatics", "longarms", "pistols"],
    Stealth:     ["disguise", "palming", "sneaking"],
    Outdoors:    ["tracking"],
    Influence:   ["con", "etiquette", "leadership", "negotiation"],
    Tasking:     []  // Technomancer only; no group discount in RAW
  }
};
