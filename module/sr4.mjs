/**
 * @file sr4.mjs — Shadowrun 4th Edition 20th Anniversary system entry point.
 *
 * ── SYSTEM OVERVIEW ──────────────────────────────────────────────────────────
 * SR4 20th Anniversary (SR4A) is a hit-based, dice-pool system.
 * Every test is roll-and-count: assemble a pool of d6s, count 5s and 6s as
 * hits, net hits (hits − opponent's hits or threshold) determine outcome.
 *
 * Key SR4A mechanics this system implements:
 *   - Glitch: ≥ half the dice show 1 → bad things happen
 *   - Critical Glitch: glitch AND zero hits → catastrophic failure
 *   - Rule of Six: normal rolls don't re-roll 6s; Edge spend grants re-rolls
 *   - Edge pool: spend to re-roll failures, add dice, seize initiative
 *   - Initiative: score = Reaction + Intuition + 1d6 (or more); subtract 10 each pass
 *   - Condition Monitors: Physical CM = 8+ceil(Body/2); Stun CM = 8+ceil(Willpower/2)
 *   - DV/AP notation: e.g. "6P-1" (6 Physical damage, -1 Armor Penetration)
 *   - Recoil: cumulative negative modifier to ranged attack dice pools
 *   - Armor: only highest armor value applies; no stacking
 *
 * ── ARCHITECTURE ─────────────────────────────────────────────────────────────
 * Five Actor types:   character / npc / spirit / sprite / vehicle
 * Ten Item types:     weapon / armor / cyberware / ammo / spell / adeptpower /
 *                     program / quality / contact / gear
 * Two App types:      CharacterWizard (400 BP chargen) / PoolBuilderDialog (roll UI)
 * One roll engine:    SR4Roll (glitch detection, Rule of Six)
 * One combat engine:  SR4Combat + SR4CombatTracker
 *
 * @module sr4
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

  // Expose on game.sr4 for macros, other modules, and developer console access.
  // Usage in a macro: new game.sr4.SR4Roll(8, { rollLabel: "Attack" }).evaluate()
  game.sr4 = {
    SR4Roll,           // Dice engine — SR4Roll(poolSize, opts) counts 5-6 as hits
    CharacterWizard,   // 400 BP character creation wizard
    PoolBuilderDialog, // General-purpose dice pool builder dialog
    // Lookup shortcuts
    SKILL_GROUPS: SR4_CONSTANTS.SKILL_GROUPS, // Combat/Physical/Social/… → [skill keys]
    METATYPES:    SR4_CONSTANTS.METATYPES      // ["human","elf","dwarf","ork","troll"]
  };

  // ── REGISTER COMBAT CLASSES ───────────────────────────────────────────
  // SR4Combat extends Combat: initiative = Reaction + Intuition + 1d6,
  // subtract 10 from score after each pass.
  // SR4CombatTracker provides the initiative-order HUD with pass tracking.
  CONFIG.Combat.documentClass     = SR4Combat;
  CONFIG.ui.combat                = SR4CombatTracker;

  // ── REGISTER DATA MODELS ──────────────────────────────────────────────
  // Foundry uses these to validate and migrate document data.
  // Each class extends foundry.abstract.TypeDataModel and defines defineSchema().
  // Actor types:
  //   character — PC runner, full 400 BP / 8 attributes / condition monitors
  //   npc       — GM NPC, streamlined (Professional Rating, flat attributes)
  //   spirit    — Bound/Free spirit (attribute offsets from Force)
  //   sprite    — Technomancer compiled sprite (Level + offsets, Matrix CM only)
  //   vehicle   — Ground/air/water/drone (Body-based CM, mounted weapons)
  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
    npc:       NpcDataModel,
    spirit:    SpiritDataModel,
    sprite:    SpriteDataModel,
    vehicle:   VehicleDataModel
  };

  // Item types:
  //   weapon     — firearms, melee, explosives (DV/AP notation, fire modes, recoil)
  //   armor      — body armor with Ballistic + Impact ratings
  //   cyberware  — cyber/bio/nano/gene with Essence costs and grade multipliers
  //   spell      — Mana/Physical spells with Force, drain formula, sustained flag
  //   adeptpower — Physical Adept powers with PP costs (0.25–4.0 PP)
  //   program    — Matrix programs (Common Use / Hacking / Security / Agent)
  //   quality    — Positive (cost BP) / Negative (refund BP, max 35 BP) qualities
  //   contact    — Connection (1-6) + Loyalty (1-6) two-axis system
  //   gear       — General equipment; commlinks have isCommlink + RSSF subschema
  //   ammo       — Ammunition with dvModifier + apModifier
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
  // compendiumVersion: hidden world setting used by populateCompendiums() to
  // track whether the example compendium items have been seeded. When the
  // system version changes, the old items are cleared and new ones seeded.
  // Players never see this setting (config: false).
  game.settings.register("sr4", "compendiumVersion", {
    name:    "Compendium Data Version",
    hint:    "Internal version tracking for SR4 compendium population.",
    scope:   "world",
    config:  false,
    type:    String,
    default: ""
  });

  // ── REGISTER SHEETS ───────────────────────────────────────────────────
  // Unregister Foundry's generic ActorSheet first so SR4 sheets become the
  // default without requiring the user to manually select them.
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
  // Comparison helpers for use in {{#if}} blocks within .hbs templates.
  // Example: {{#if (eq itemType "weapon")}} ... {{/if}}
  Handlebars.registerHelper("eq",  (a, b) => a === b);
  Handlebars.registerHelper("neq", (a, b) => a !== b);
  Handlebars.registerHelper("gt",  (a, b) => a > b);
  Handlebars.registerHelper("lt",  (a, b) => a < b);
  Handlebars.registerHelper("gte", (a, b) => a >= b);

  // Build an array from arguments — used in templates like:
  // {{#each (array "physical" "stun")}}...{{/each}}
  Handlebars.registerHelper("array", (...args) => args.slice(0, -1));

  // Loop N times — renders block.fn(i) for i in [0, n).
  // Usage: {{#times conditionMax}}  <span class="box {{#if (lt @index cmValue)}}filled{{/if}}"></span>  {{/times}}
  Handlebars.registerHelper("times", function (n, block) {
    let out = "";
    for (let i = 0; i < n; i++) out += block.fn(i);
    return out;
  });

  /**
   * SR4 Condition Monitor box row renderer.
   *
   * Generates a row of clickable CM boxes with:
   *   - "filled" CSS class on boxes ≤ current damage value
   *   - data-monitor attribute for the sheet's _onCMBoxClick handler
   *   - data-idx (1-based) for the toggle logic (idx ≤ current → reduce; idx > current → fill)
   *   - visual separator span every 3 boxes (SR4A groups CM boxes in rows of 3)
   *
   * Usage: {{{cmBoxes monitor="physical" value=physCMCurrent max=physCMMax}}}
   *   - monitor: "physical" or "stun" (character/spirit) or "matrix" (sprite) or "vehicle" (vehicle)
   *   - value:   current boxes filled (0-based count, e.g. 4 = 4 boxes filled)
   *   - max:     total boxes (Physical CM = 8 + ceil(Body/2), Stun = 8 + ceil(Will/2))
   */
  Handlebars.registerHelper("cmBoxes", function (options) {
    const { monitor, value, max } = options.hash;
    let out = "";
    for (let i = 0; i < max; i++) {
      const filled = i < value ? "filled" : "";
      out += `<span class="cm-box ${filled}" data-monitor="${monitor}" data-idx="${i + 1}"></span>`;
      // Visual separator every 3 boxes — mirrors SR4A's 3-box groupings on CM tracks
      if ((i + 1) % 3 === 0 && i + 1 < max) out += `<span class="cm-separator"></span>`;
    }
    return new Handlebars.SafeString(out);
  });

  /**
   * Attribute pip row renderer — shows filled/empty dots for attribute values.
   *
   * Usage: {{{attrPips value=attrs.body max=6}}}
   *   - value: current attribute value
   *   - max:   maximum (default 6; trolls/dwarfs may have 8-10 racial maxes)
   *
   * CSS classes: "attr-pip" base; "filled" for values ≤ current.
   */
  Handlebars.registerHelper("attrPips", function (options) {
    const { value, max } = options.hash;
    let out = "";
    for (let i = 0; i < (max ?? 6); i++) {
      const filled = i < value ? "filled" : "";
      out += `<span class="attr-pip ${filled}"></span>`;
    }
    return new Handlebars.SafeString(out);
  });

  /**
   * Edge pip row renderer — shows remaining/spent Edge pips.
   *
   * In SR4A, Edge is a dual-role attribute:
   *   - Permanent Edge (max) = character's base Edge rating
   *   - Current Edge (current) = remaining points available to spend this session
   *   - Spending edge: reroll failures, add dice, go first in initiative, etc.
   *   - Edge refreshes at GM discretion or between runs.
   *
   * Pips ≥ current get "spent" class; pips < current are active.
   * data-idx (1-based) is read by _onEdgePipClick in the character sheet.
   *
   * Usage: {{{edgePips current=system.attributes.edge.current max=system.attributes.edge.base}}}
   */
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
  // Preloading caches compiled Handlebars templates at startup.
  // Partials are small reusable sections (attributes, CM rows, gear lists)
  // included by the main sheet templates via {{> "systems/sr4/templates/..."}}
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
  // Seed compendiums with [Example] items if not already populated.
  // Actual SR4A content (weapon names, spell stats, gear costs) is NOT included
  // to respect Catalyst Game Labs / The Topps Company IP.
  // GMs add their own data from sourcebooks via the compendium editor.
  await populateCompendiums();
});

/* ────────────────────────────────────────────────────────────────────────────
   PRE-CREATE ACTOR — intercept character creation to open wizard
   ──────────────────────────────────────────────────────────────────────── */

// preCreateActor: intercept new "character" actor creation and route to the
// 400 BP wizard instead of creating a blank actor directly.
//   - Returns false (cancels creation) and opens CharacterWizard.
//   - When the wizard creates the actor it passes { _fromSR4Wizard: true }
//     which bypasses this hook — preventing an infinite loop.
//   - NPC / spirit / sprite / vehicle actors bypass the wizard entirely.
//   - SR4A chargen: 400 BP total; metatype costs 0-40 BP; each attribute
//     point above racial min = 10 BP; each skill point = 4 BP; specs = +2 BP;
//     positive qualities cost BP; negative qualities refund BP (max 35 BP cap).
Hooks.on("preCreateActor", function (actor, data, options) {
  // Bypass hook if actor was created by the wizard itself
  if (options._fromSR4Wizard) return true;
  // Only intercept PC character type
  if (data.type !== "character") return true;
  // Cancel the direct creation and open the wizard instead
  new CharacterWizard().render(true);
  return false;
});

/* ────────────────────────────────────────────────────────────────────────────
   CONSTANTS
   ──────────────────────────────────────────────────────────────────────── */

/**
 * SR4_CONSTANTS — System-level lookup tables referenced by sheets and the wizard.
 *
 * METATYPES (SR4A p.62-71):
 *   Human: 0 BP, balanced stats, highest Edge max (7)
 *   Elf:   30 BP, high Charisma/Agility, low-light vision
 *   Dwarf: 25 BP, high Body/Strength/Willpower, thermographic vision, +20% Lifestyle cost
 *   Ork:   20 BP, high Body/Strength, lower Charisma/Logic max, low-light vision
 *   Troll: 40 BP, highest Body/Strength, dermal armor (+5), +1 Reach, +20% Lifestyle cost
 *
 * SKILL_GROUPS (SR4A p.121):
 *   Skill groups allow group-level purchase/improvement at a discount.
 *   Buying a group at rank N costs N × 10 BP at chargen (vs N × 4 BP per individual skill).
 *   A group level is lost if ANY member skill has individual levels added later.
 *   RAW: Tasking (Technomancer skills) has no formal skill group.
 *
 * These keys match CharacterDataModel.skills object keys exactly.
 */
const SR4_CONSTANTS = {
  METATYPES: ["human", "elf", "dwarf", "ork", "troll"],
  SKILL_GROUPS: {
    Athletics:   ["gymnastics", "running", "swimming"],           // STR-based physical
    Biotech:     ["cybertechnology", "biotechnology"],            // LOG — repair and biotech
    Cracking:    ["cybercombat", "electronicWarfare", "hacking"], // LOG — Matrix offense
    Electronics: ["computer", "dataSearch", "hardware", "software"], // LOG — Matrix general
    Firearms:    ["automatics", "longarms", "pistols"],           // AGI — ranged combat
    Stealth:     ["disguise", "palming", "sneaking"],             // AGI — staying hidden
    Outdoors:    ["tracking"],                                    // INT — single-skill group
    Influence:   ["con", "etiquette", "leadership", "negotiation"], // CHA — social skills
    Tasking:     []  // Technomancer Complex Forms — no formal group discount in RAW
  }
};
