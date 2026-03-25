/**
 * CharacterSheet — Player character sheet for SR4 20th Anniversary
 * ApplicationV2 + ActorSheetV2 framework.
 */
import { SR4Roll }                                           from "../dice/sr4-roll.mjs";
import { showFireModeDialog, showReloadDialog, applyDVMod } from "../apps/fire-mode-dialog.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ActorSheetV2                   = foundry.applications.sheets.ActorSheet;

export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ["sr4", "sheet", "actor", "character"],
    position: { width: 750, height: 850 },
    window:   { resizable: true },
    form:     { submitOnChange: true }
  };

  static PARTS = {
    sheet: { template: "systems/sr4/templates/actor/character-sheet.hbs" }
  };

  static TABS = {
    primary: {
      initial: "core",
      tabs: [
        { id: "core" },
        { id: "skills" },
        { id: "gear" },
        { id: "matrix" },
        { id: "magic" },
        { id: "bio" }
      ]
    }
  };

  // ── DATA PREP ────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys     = this.actor.system;

    // V2 provides context.document — expose actor alias for templates
    context.actor  = this.actor;
    context.system = sys;
    context.flags  = this.actor.flags;

    context.attrs = {
      body:      sys.attr("body"),
      agility:   sys.attr("agility"),
      reaction:  sys.attr("reaction"),
      strength:  sys.attr("strength"),
      charisma:  sys.attr("charisma"),
      intuition: sys.attr("intuition"),
      logic:     sys.attr("logic"),
      willpower: sys.attr("willpower"),
      edge:      sys.attributes.edge,
      essence:   sys.attributes.essence ?? 6.0,   // null-guard for empty inputs
      magic:     sys.attr("magic"),
      resonance: sys.attr("resonance")
    };

    context.derived = {
      initiativeBase:  sys.initiativeBase,
      initiativeDice:  sys.initiativeDice,
      physCMMax:       sys.physicalCMMax,
      stunCMMax:       sys.stunCMMax,
      woundModifier:   sys.woundModifier,
      composure:       sys.composure,
      judgeIntentions: sys.judgeIntentions,
      liftCarry:       sys.liftCarry,
      memory:          sys.memory
    };

    if (sys.isTechnomancer) {
      context.livingPersona = {
        response: sys.lpResponse,
        signal:   sys.lpSignal,
        system:   sys.lpSystem,
        firewall: sys.lpFirewall
      };
    }

    // ── ESSENCE BREAKDOWN ──────────────────────────────────────────────────
    const essenceBase  = 6.0;
    const essenceLost  = this.actor.items
      .filter(i => i.type === "cyberware" && i.system.installed)
      .reduce((sum, i) => sum + i.system.actualEssenceCost, 0);
    context.essence = {
      base:    essenceBase,
      lost:    parseFloat(essenceLost.toFixed(2)),
      current: parseFloat(Math.max(0, essenceBase - essenceLost).toFixed(2))
    };

    context.weapons    = this.actor.items.filter(i => i.type === "weapon");
    context.armor      = this.actor.items.filter(i => i.type === "armor");
    context.cyberware  = this.actor.items.filter(i => i.type === "cyberware");
    context.spells     = this.actor.items.filter(i => i.type === "spell");
    context.adeptPowers = this.actor.items.filter(i => i.type === "adeptpower");
    context.programs   = this.actor.items.filter(i => i.type === "program");
    context.qualities  = this.actor.items.filter(i => i.type === "quality");
    context.contacts   = this.actor.items.filter(i => i.type === "contact");
    context.gear       = this.actor.items.filter(i => i.type === "gear");
    context.ammoItems  = this.actor.items.filter(i => i.type === "ammo");

    context.skillGroups = this._prepareSkillGroups(sys);

    context.metatypeChoices = {
      human: "Human", elf: "Elf", dwarf: "Dwarf", ork: "Ork", troll: "Troll"
    };

    return context;
  }

  /**
   * Organize skills into display groups with linked attributes.
   * @private
   */
  _prepareSkillGroups(sys) {
    const a = {
      body:      sys.attr("body"),
      agility:   sys.attr("agility"),
      reaction:  sys.attr("reaction"),
      strength:  sys.attr("strength"),
      charisma:  sys.attr("charisma"),
      intuition: sys.attr("intuition"),
      logic:     sys.attr("logic"),
      willpower: sys.attr("willpower"),
      magic:     sys.attr("magic"),
      resonance: sys.attr("resonance")
    };

    const groups = {
      "Combat": [
        ["archery",         "Archery",          "agility"],
        ["automatics",      "Automatics",        "agility"],
        ["blades",          "Blades",            "agility"],
        ["clubs",           "Clubs",             "agility"],
        ["exoticMelee",     "Exotic Melee",      "agility"],
        ["exoticRanged",    "Exotic Ranged",     "agility"],
        ["heavyWeapons",    "Heavy Weapons",     "agility"],
        ["longarms",        "Longarms",          "agility"],
        ["pistols",         "Pistols",           "agility"],
        ["throwingWeapons", "Throwing Weapons",  "agility"],
        ["unarmedCombat",   "Unarmed Combat",    "agility"]
      ],
      "Physical": [
        ["disguise",        "Disguise",          "intuition"],
        ["escapeArtist",    "Escape Artist",     "agility"],
        ["gymnastics",      "Gymnastics",        "agility"],
        ["palming",         "Palming",           "agility"],
        ["perception",      "Perception",        "intuition"],
        ["running",         "Running",           "strength"],
        ["sneaking",        "Sneaking",          "agility"],
        ["swimming",        "Swimming",          "strength"],
        ["tracking",        "Tracking",          "intuition"]
      ],
      "Social": [
        ["con",             "Con",               "charisma"],
        ["etiquette",       "Etiquette",         "charisma"],
        ["impersonation",   "Impersonation",     "charisma"],
        ["intimidation",    "Intimidation",      "charisma"],
        ["leadership",      "Leadership",        "charisma"],
        ["negotiation",     "Negotiation",       "charisma"]
      ],
      "Magic": [
        ["assensing",           "Assensing",          "intuition"],
        ["astralCombat",        "Astral Combat",      "willpower"],
        ["banishing",           "Banishing",          "magic"],
        ["binding",             "Binding",            "magic"],
        ["counterspelling",     "Counterspelling",    "magic"],
        ["ritualSpellcasting",  "Ritual Spellcasting","magic"],
        ["spellcasting",        "Spellcasting",       "magic"],
        ["summoning",           "Summoning",          "magic"]
      ],
      "Technical": [
        ["aeronauticsMechanic", "Aeronautics Mech.",  "logic"],
        ["automotiveMechanic",  "Automotive Mech.",   "logic"],
        ["biotechnology",       "Biotechnology",      "logic"],
        ["chemistry",           "Chemistry",          "logic"],
        ["computer",            "Computer",           "logic"],
        ["cybercombat",         "Cybercombat",        "logic"],
        ["cybertechnology",     "Cybertechnology",    "logic"],
        ["dataSearch",          "Data Search",        "logic"],
        ["demolitions",         "Demolitions",        "logic"],
        ["electronicWarfare",   "Electronic Warfare", "logic"],
        ["forgery",             "Forgery",            "logic"],
        ["hacking",             "Hacking",            "logic"],
        ["hardware",            "Hardware",           "logic"],
        ["industrialMechanic",  "Industrial Mech.",   "logic"],
        ["locksmith",           "Locksmith",          "agility"],
        ["nauticalMechanic",    "Nautical Mech.",     "logic"],
        ["software",            "Software",           "logic"]
      ],
      "Vehicle": [
        ["pilotAerospace",   "Pilot Aerospace",    "reaction"],
        ["pilotAircraft",    "Pilot Aircraft",     "reaction"],
        ["pilotAnthroform",  "Pilot Anthroform",   "reaction"],
        ["pilotExotic",      "Pilot Exotic",       "reaction"],
        ["pilotGroundCraft", "Pilot Ground Craft", "reaction"],
        ["pilotWatercraft",  "Pilot Watercraft",   "reaction"]
      ]
    };

    const prepared = {};
    for (const [groupName, skills] of Object.entries(groups)) {
      prepared[groupName] = skills.map(([key, label, attrKey]) => {
        const skillData = sys.skills[key] ?? { value: 0, specialization: "" };
        const attrVal   = a[attrKey] ?? 0;
        const pool      = skillData.value > 0
          ? skillData.value + attrVal
          : attrVal - 1;
        return {
          key, label, attrKey, attrVal,
          value:          skillData.value,
          specialization: skillData.specialization,
          pool:           Math.max(0, pool),
          specPool:       Math.max(0, pool + (skillData.specialization ? 2 : 0)),
          untrained:      skillData.value === 0
        };
      });
    }

    return prepared;
  }

  // ── RENDER ──────────────────────────────────────────────────────────────

  async _onRender(context, options) {
    await super._onRender(context, options); // sets up DragDrop from ActorSheetV2

    // Restore the active tab on every render (re-renders would reset to template default)
    this.changeTab(this.tabGroups.primary ?? "core", "primary",
      { force: true, updatePosition: false });

    if (!this.isEditable) return;

    const html = $(this.element);

    html.find(".attr-roll").click(this._onAttrRoll.bind(this));
    html.find(".skill-roll").click(this._onSkillRoll.bind(this));
    html.find(".edge-pip").click(this._onEdgePipClick.bind(this));
    html.find(".cm-box").click(this._onCMBoxClick.bind(this));
    html.find(".item-equip").click(this._onItemEquip.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-name").click(this._onItemOpen.bind(this));
    html.find(".weapon-roll").click(this._onWeaponRoll.bind(this));
    html.find(".weapon-reload").click(this._onWeaponReload.bind(this));
    html.find(".recoil-reset").click(this._onRecoilReset.bind(this));
    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".program-active-toggle").on("change", this._onProgramToggle.bind(this));
  }

  // ── EVENT HANDLERS ───────────────────────────────────────────────────────

  async _onAttrRoll(event) {
    event.preventDefault();
    const el    = event.currentTarget;
    const attr1 = el.dataset.attr1;
    const attr2 = el.dataset.attr2;
    const sys   = this.actor.system;
    const pool  = sys.attr(attr1) + (attr2 ? sys.attr(attr2) : 0);
    const label = el.dataset.label ?? attr1;
    const roll  = new SR4Roll(pool, { rollLabel: label, actor: this.actor.name });
    await roll.evaluate();
    return roll.toMessage();
  }

  async _onSkillRoll(event) {
    event.preventDefault();
    const el       = event.currentTarget;
    const skillKey = el.dataset.skill;
    const attrKey  = el.dataset.attr;
    const useSpec  = el.dataset.spec === "true";
    const sys      = this.actor.system;
    const skillData = sys.skills[skillKey];
    const attrVal   = sys.attr(attrKey);
    let pool = skillData.value > 0
      ? skillData.value + attrVal
      : attrVal - 1;
    if (useSpec && skillData.specialization) pool += 2;
    pool = Math.max(0, pool);
    const label     = el.dataset.label ?? skillKey;
    const specLabel = useSpec && skillData.specialization ? ` (${skillData.specialization})` : "";
    const roll = new SR4Roll(pool, {
      rollLabel: label + specLabel,
      actor: this.actor.name
    });
    await roll.evaluate();
    return roll.toMessage();
  }

  async _onWeaponRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;

    const wsys    = item.system;
    const isRanged = wsys.isRanged ?? wsys.weaponType !== "melee";

    if (!isRanged) {
      const sys      = this.actor.system;
      const skillMap = {
        blades: "blades", clubs: "clubs", unarmedCombat: "unarmedCombat",
        exoticMelee: "exoticMelee", throwingWeapons: "throwingWeapons"
      };
      const skillKey  = skillMap[wsys.category] ?? wsys.category;
      const skillData = sys.skills[skillKey] ?? { value: 0, specialization: "" };
      const attrVal   = sys.attr("agility");
      const pool      = Math.max(0, skillData.value + attrVal + sys.woundModifier);
      const roll = new SR4Roll(pool, { rollLabel: `${item.name} (melee)`, actor: this.actor.name });
      await roll.evaluate();
      return roll.toMessage();
    }

    const ammoCurrent = wsys.ammo?.current ?? 0;
    if (ammoCurrent <= 0) {
      ui.notifications.warn(`${item.name}: no ammo loaded. Reload first, choom.`);
      return;
    }

    const chosen = await showFireModeDialog(item, this.actor);
    if (!chosen) return;

    if (ammoCurrent < chosen.rounds) {
      ui.notifications.warn(
        `${item.name}: not enough ammo for ${chosen.label} (need ${chosen.rounds}, have ${ammoCurrent}).`
      );
      return;
    }

    if (chosen.suppressive) {
      await item.update({ "system.ammo.current": ammoCurrent - chosen.rounds });
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<div class="sr4-roll-card">
          <div class="roll-header"><strong>${item.name}</strong> — Suppressive Fire</div>
          <div class="roll-result">20 rounds expended. Zone suppressed — targets must test Reaction+Edge vs. ${item.name} attack pool to act.</div>
          <div class="roll-ammo">Ammo remaining: ${ammoCurrent - 20}/${wsys.ammo?.max ?? "?"}</div>
        </div>`
      });
      return;
    }

    const sys       = this.actor.system;
    const skillKey  = wsys.category;
    const skillData = sys.skills[skillKey] ?? { value: 0, specialization: "" };
    const agility   = sys.attr("agility");
    const recoilCum = wsys.recoilPenalty ?? 0;
    const rc        = wsys.totalRC ?? wsys.rc ?? 0;
    const recoilEff = Math.max(0, recoilCum - rc);
    const pool      = Math.max(0, skillData.value + agility + sys.woundModifier - recoilEff);

    const ammoDVMod  = wsys.ammo?.dvMod ?? 0;
    const ammoAPMod  = wsys.ammo?.apMod ?? 0;
    const totalDVMod = chosen.dvMod + ammoDVMod;
    const effectiveDV = applyDVMod(wsys.dv, totalDVMod);
    const effectiveAP = (wsys.ap ?? 0) + ammoAPMod;
    const ammoType    = wsys.ammo?.type ?? "Regular";
    const dmgTypeOverride = wsys.ammo?.damageTypeOverride ?? "";

    const newAmmo   = ammoCurrent - chosen.rounds;
    const newRecoil = recoilCum + chosen.recoilAdded;
    await item.update({
      "system.ammo.current":  newAmmo,
      "system.recoilPenalty": newRecoil
    });

    const roll = new SR4Roll(pool, {
      rollLabel: `${item.name} (${chosen.label})`,
      actor:     this.actor.name
    });
    await roll.evaluate();

    const baseMsg   = await roll.toMessage({ create: false });
    const apDisplay = effectiveAP >= 0 ? `+${effectiveAP}` : `${effectiveAP}`;
    const ammoLine  = `<div class="roll-ammo-line">
      <span class="ammo-type-badge">${ammoType}</span>
      DV <strong>${effectiveDV}${dmgTypeOverride ? ` (${dmgTypeOverride})` : ""}</strong>
      AP <strong>${apDisplay}</strong>
      ${chosen.dvMod > 0 ? `<span class="fire-bonus">+${chosen.dvMod} DV fire bonus</span>` : ""}
      | Ammo: ${newAmmo}/${wsys.ammo?.max ?? "?"} rnd
      ${newRecoil > 0 ? `| Recoil: −${Math.max(0, newRecoil - rc)} (cum ${newRecoil})` : ""}
    </div>`;

    const content = (baseMsg.content ?? "") + ammoLine;
    return ChatMessage.create({ ...baseMsg, content });
  }

  async _onWeaponReload(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    return showReloadDialog(item, this.actor);
  }

  async _onRecoilReset(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await item.update({ "system.recoilPenalty": 0 });
    ui.notifications.info(`${item.name}: recoil reset.`);
  }

  _onEdgePipClick(event) {
    event.preventDefault();
    const idx     = parseInt(event.currentTarget.dataset.idx);
    const current = this.actor.system.attributes.edge.current;
    const newVal  = idx < current ? idx : idx + 1;
    return this.actor.update({
      "system.attributes.edge.current": Math.min(newVal, this.actor.system.attributes.edge.base)
    });
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

  _onItemEquip(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    return item.update({ "system.equipped": !item.system.equipped });
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

  async _onItemCreate(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    const name = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    return this.actor.createEmbeddedDocuments("Item", [{ name, type }]);
  }

  _onProgramToggle(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    return item.update({ "system.active": event.currentTarget.checked });
  }

  // ── DROP ──────────────────────────────────────────────────────────────────

  // V2: _onDropItem receives the resolved Item document, not raw drag data
  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;
    if (this.actor.uuid === item.parent?.uuid) return null;
    return this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
  }
}
