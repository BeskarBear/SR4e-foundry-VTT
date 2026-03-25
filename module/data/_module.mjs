/**
 * @file _module.mjs — Barrel export for all SR4 TypeDataModel classes.
 *
 * All data models extend foundry.abstract.TypeDataModel and define their
 * schema via defineSchema(). Foundry validates/coerces all document data
 * through these schemas at load time.
 *
 * Imported wholesale by sr4.mjs, which registers each class in CONFIG.Actor.dataModels
 * or CONFIG.Item.dataModels.
 *
 * Actor models — describe what data an actor document stores:
 *   CharacterDataModel  character.mjs  — PC runner (8 attrs, skills, edge, CMs)
 *   NpcDataModel        npc.mjs        — GM NPC (Professional Rating, flat attrs)
 *   SpiritDataModel     spirit.mjs     — Bound/Free spirit (Force + offsets, 2 CMs)
 *   SpriteDataModel     sprite.mjs     — Technomancer sprite (Level + offsets, Matrix CM)
 *   VehicleDataModel    vehicle.mjs    — Ground/air/water/drone (Body-based CM)
 *
 * Item models — describe what data an item document stores:
 *   WeaponDataModel     weapon.mjs     — DV/AP notation, fire modes, recoil tracking
 *   ArmorDataModel      armor.mjs      — Ballistic (B) + Impact (I) ratings, mods
 *   CyberwareDataModel  cyberware.mjs  — wareType/grade/Essence cost, stat bonuses
 *   SpellDataModel      spell.mjs      — category/type/drain formula/sustained flag
 *   AdeptPowerDataModel adeptpower.mjs — PP cost, action type, leveled flag
 *   ProgramDataModel    program.mjs    — programType, rating, active flag, agent skills
 *   QualityDataModel    quality.mjs    — qualityType, BP cost, leveled support
 *   ContactDataModel    contact.mjs    — Connection + Loyalty (two-axis SR4 system)
 *   GearDataModel       gear.mjs       — general gear; isCommlink + RSSF sub-schema
 *   AmmoDataModel       ammo.mjs       — dvModifier + apModifier, damageTypeOverride
 */

// ── ACTOR DATA MODELS ────────────────────────────────────────────────────────
export { CharacterDataModel } from "./character.mjs";
export { NpcDataModel }       from "./npc.mjs";
export { SpiritDataModel }    from "./spirit.mjs";
export { SpriteDataModel }    from "./sprite.mjs";
export { VehicleDataModel }   from "./vehicle.mjs";

// ── ITEM DATA MODELS ─────────────────────────────────────────────────────────
export { WeaponDataModel }     from "./weapon.mjs";
export { ArmorDataModel }      from "./armor.mjs";
export { CyberwareDataModel }  from "./cyberware.mjs";
export { SpellDataModel }      from "./spell.mjs";
export { AdeptPowerDataModel } from "./adeptpower.mjs";
export { ProgramDataModel }    from "./program.mjs";
export { QualityDataModel }    from "./quality.mjs";
export { ContactDataModel }    from "./contact.mjs";
export { GearDataModel }       from "./gear.mjs";
export { AmmoDataModel }       from "./ammo.mjs";
