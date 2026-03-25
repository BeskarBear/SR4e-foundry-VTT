/**
 * @file pool-builder.mjs — SR4 Dice Pool Builder Dialog.
 *
 * Interactive dialog for assembling a SR4 dice pool from skill + attribute +
 * situational modifiers, then rolling or buying hits.
 *
 * ── SR4 POOL ASSEMBLY (SR4A p.62-64) ─────────────────────────────────────────
 * A dice pool = skill rating + linked attribute + modifiers.
 *   Trained skill (value > 0): pool = skill + attribute
 *   Defaulting (value = 0):    pool = attribute − 1 (no skill penalty)
 *   Specialization match:      pool += 2 (only when the spec applies)
 *   Wound modifier:            pool -= (condition damage penalty)
 *   Other modifiers:           ±dice from equipment, environment, magic, etc.
 *
 * ── BUY HITS (SR4A p.64) ──────────────────────────────────────────────────────
 * Instead of rolling, a character may "buy" hits at 1 hit per 4 dice in the pool.
 * No glitch risk when buying hits. Only possible when not opposed/under time pressure.
 *
 * ── RULE OF SIX / EDGE ────────────────────────────────────────────────────────
 * In SR4, the Rule of Six only activates when spending Edge.
 * Normal rolls: each 5 or 6 counts as 1 hit; no re-roll.
 * Edge spending: each 6 is a hit AND re-rolled; chain continues until no 6s remain.
 *
 * Usage:
 *   const result = await PoolBuilderDialog.show({ actor, skill: "pistols", label: "Attack" });
 *   // Returns SR4Roll result object, or null if cancelled.
 */

import { SR4Roll } from "../dice/sr4-roll.mjs";

// ── SKILL → ATTRIBUTE MAP ────────────────────────────────────────────────────

const SKILL_ATTR = {
  // Combat
  archery:          "agility",
  automatics:       "agility",
  blades:           "agility",
  clubs:            "agility",
  exoticMelee:      "agility",
  exoticRanged:     "agility",
  heavyWeapons:     "agility",
  longarms:         "agility",
  pistols:          "agility",
  throwingWeapons:  "agility",
  unarmedCombat:    "agility",
  // Physical
  disguise:         "intuition",
  escapeArtist:     "agility",
  gymnastics:       "agility",
  palming:          "agility",
  perception:       "intuition",
  running:          "strength",
  sneaking:         "agility",
  swimming:         "body",
  tracking:         "intuition",
  // Social
  con:              "charisma",
  etiquette:        "charisma",
  impersonation:    "charisma",
  intimidation:     "charisma",
  leadership:       "charisma",
  negotiation:      "charisma",
  // Magic
  assensing:        "intuition",
  astralCombat:     "intuition",
  banishing:        "magic",
  binding:          "magic",
  counterspelling:  "magic",
  ritualSpellcasting: "magic",
  spellcasting:     "magic",
  summoning:        "magic",
  // Technical
  aeronauticsMechanic: "logic",
  automotiveMechanic:  "logic",
  biotechnology:    "logic",
  chemistry:        "logic",
  computer:         "logic",
  cybercombat:      "logic",
  cybertechnology:  "logic",
  dataSearch:       "logic",
  demolitions:      "logic",
  electronicWarfare: "logic",
  forgery:          "agility",
  hacking:          "logic",
  hardware:         "logic",
  industrialMechanic: "logic",
  locksmith:        "agility",
  nauticalMechanic: "logic",
  software:         "logic",
  // Vehicle
  pilotAerospace:   "reaction",
  pilotAircraft:    "reaction",
  pilotAnthroform:  "reaction",
  pilotExotic:      "reaction",
  pilotGroundCraft: "reaction",
  pilotWatercraft:  "reaction"
};

const ATTR_LABELS = {
  body:      "Body",      agility:   "Agility",
  reaction:  "Reaction",  strength:  "Strength",
  charisma:  "Charisma",  intuition: "Intuition",
  logic:     "Logic",     willpower: "Willpower",
  edge:      "Edge",      magic:     "Magic",
  resonance: "Resonance"
};

const ALL_ATTRS = Object.keys(ATTR_LABELS);

const SKILL_LABELS = {
  archery:"Archery", automatics:"Automatics", blades:"Blades",
  clubs:"Clubs", exoticMelee:"Exotic Melee", exoticRanged:"Exotic Ranged",
  heavyWeapons:"Heavy Weapons", longarms:"Longarms", pistols:"Pistols",
  throwingWeapons:"Throwing Weapons", unarmedCombat:"Unarmed Combat",
  disguise:"Disguise", escapeArtist:"Escape Artist", gymnastics:"Gymnastics",
  palming:"Palming", perception:"Perception", running:"Running",
  sneaking:"Sneaking", swimming:"Swimming", tracking:"Tracking",
  con:"Con", etiquette:"Etiquette", impersonation:"Impersonation",
  intimidation:"Intimidation", leadership:"Leadership", negotiation:"Negotiation",
  assensing:"Assensing", astralCombat:"Astral Combat", banishing:"Banishing",
  binding:"Binding", counterspelling:"Counterspelling",
  ritualSpellcasting:"Ritual Spellcasting", spellcasting:"Spellcasting",
  summoning:"Summoning", aeronauticsMechanic:"Aeronautics Mechanic",
  automotiveMechanic:"Automotive Mechanic", biotechnology:"Biotechnology",
  chemistry:"Chemistry", computer:"Computer", cybercombat:"Cybercombat",
  cybertechnology:"Cybertechnology", dataSearch:"Data Search",
  demolitions:"Demolitions", electronicWarfare:"Electronic Warfare",
  forgery:"Forgery", hacking:"Hacking", hardware:"Hardware",
  industrialMechanic:"Industrial Mechanic", locksmith:"Locksmith",
  nauticalMechanic:"Nautical Mechanic", software:"Software",
  pilotAerospace:"Pilot Aerospace", pilotAircraft:"Pilot Aircraft",
  pilotAnthroform:"Pilot Anthroform", pilotExotic:"Pilot Exotic",
  pilotGroundCraft:"Pilot Ground Craft", pilotWatercraft:"Pilot Watercraft"
};

// ── HELPERS ──────────────────────────────────────────────────────────────────

/** Pull attribute value from an actor, 0 if missing. */
function actorAttrValue(actor, attrKey) {
  if (!actor?.system) return 0;
  const sys = actor.system;
  // CharacterDataModel exposes sys.attr()
  if (typeof sys.attr === "function") return sys.attr(attrKey) ?? 0;
  // Fallback for simpler actor types
  return sys.attributes?.[attrKey] ?? 0;
}

/** Pull skill value from a character actor, 0 if missing. */
function actorSkillValue(actor, skillKey) {
  return actor?.system?.skills?.[skillKey]?.value ?? 0;
}

/** Wound modifier from combined physical+stun damage. */
function actorWoundMod(actor) {
  if (!actor?.system) return 0;
  const sys = actor.system;
  if (typeof sys.woundModifier === "number") return sys.woundModifier;
  // Manual calculation fallback
  const phys = sys.condition?.physical?.value ?? 0;
  const stun = sys.condition?.stun?.value ?? 0;
  return -Math.floor((phys + stun) / 3);
}

// ── DIALOG CLASS ─────────────────────────────────────────────────────────────

export class PoolBuilderDialog {

  /**
   * @param {object}      options
   * @param {Actor|null}  options.actor      — actor context (optional)
   * @param {string}      options.skill      — initial skill key
   * @param {string}      options.attribute  — initial attribute override
   * @param {string}      options.label      — roll label
   * @param {number}      options.threshold  — initial threshold (0 = none)
   */
  constructor(options = {}) {
    this.actor     = options.actor   ?? null;
    this.skill     = options.skill   ?? "";
    this.attribute = options.attribute ?? (options.skill ? (SKILL_ATTR[options.skill] ?? "agility") : "agility");
    this.label     = options.label   ?? "Roll";
    this.threshold = options.threshold ?? 0;
    this.mods      = [];   // [{ label, value }]
  }

  // ── STATIC FACTORY ────────────────────────────────────────────────────────

  /**
   * Open the pool builder and return a Promise that resolves with the SR4Roll
   * result object, or null if cancelled.
   */
  static async show(options = {}) {
    return new PoolBuilderDialog(options)._open();
  }

  // ── INTERNAL ─────────────────────────────────────────────────────────────

  _open() {
    return new Promise(resolve => {
      const dialog = new Dialog({
        title:   this.label ?? "Dice Pool Builder",
        content: this._buildContent(),
        buttons: {
          roll: {
            icon:  '<i class="fas fa-dice"></i>',
            label: "Roll",
            callback: html => resolve(this._onRoll(html, false))
          },
          buyHits: {
            icon:  '<i class="fas fa-coins"></i>',
            label: "Buy Hits",
            callback: html => resolve(this._onRoll(html, true))
          },
          cancel: {
            icon:  '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "roll",
        render:  html => this._onDialogRender(html),
        close:   () => resolve(null)
      }, { width: 440, classes: ["sr4", "dialog", "pool-builder-dialog"] });

      dialog.render(true);
    });
  }

  // ── CONTENT BUILDER ───────────────────────────────────────────────────────

  _buildContent() {
    const actor     = this.actor;
    const hasSkills = actor?.type === "character";

    // ── Skill section ──
    const skillSection = hasSkills
      ? this._buildSkillSelect()
      : this._buildManualPool();

    // ── Attribute select ──
    const attrOptions = ALL_ATTRS.map(k => {
      const val  = actorAttrValue(actor, k);
      const sel  = k === this.attribute ? "selected" : "";
      const disp = actor ? ` [${val}]` : "";
      return `<option value="${k}" ${sel}>${ATTR_LABELS[k]}${disp}</option>`;
    }).join("");

    const attrVal = actorAttrValue(actor, this.attribute);

    // ── Wound modifier ──
    const woundMod = actorWoundMod(actor);

    // ── Modifier rows ──
    const modRows = this.mods.map((m, i) => this._modRowHTML(i, m.label, m.value)).join("");

    return `
<div class="pool-builder">

  ${actor ? `<div class="pb-actor-name">${actor.name}</div>` : ""}

  ${skillSection}

  <div class="pb-row">
    <label>Attribute</label>
    <select class="pb-attr-select">
      ${attrOptions}
    </select>
    <span class="pb-attr-val pb-val">${actor ? attrVal : "—"}</span>
  </div>

  <div class="pb-row pb-spec-row">
    <label><input type="checkbox" class="pb-spec-check" /> Specialization (+2)</label>
    <input type="text" class="pb-spec-label" placeholder="Specialization name" />
  </div>

  <div class="pb-modifiers">
    <div class="pb-mod-list">${modRows}</div>
    <button type="button" class="pb-mod-add">+ Add Modifier</button>
  </div>

  ${woundMod !== 0 ? `
  <div class="pb-row pb-wound-row">
    <label>Wound Modifier</label>
    <input type="number" class="pb-wound-mod" value="${woundMod}" />
  </div>` : `
  <div class="pb-row pb-wound-row">
    <label>Wound Modifier</label>
    <input type="number" class="pb-wound-mod" value="0" />
  </div>`}

  <div class="pb-total-row">
    <span class="pb-total-label">Pool:</span>
    <span class="pb-total">—</span>
    <span class="pb-total-breakdown"></span>
  </div>

  <div class="pb-row pb-options-row">
    <label>Threshold <input type="number" class="pb-threshold" value="${this.threshold}" min="0" /></label>
    <label><input type="checkbox" class="pb-edge-check" /> Edge (Rule of Six)</label>
  </div>

  <input type="hidden" class="pb-roll-label" value="${this.label}" />
</div>`;
  }

  _buildSkillSelect() {
    const actor = this.actor;
    const options = Object.entries(SKILL_LABELS)
      .sort(([,a],[,b]) => a.localeCompare(b))
      .map(([key, label]) => {
        const val = actorSkillValue(actor, key);
        const sel = key === this.skill ? "selected" : "";
        return `<option value="${key}" data-linked="${SKILL_ATTR[key] ?? "agility"}" ${sel}>${label} [${val}]</option>`;
      }).join("");

    const val = actorSkillValue(actor, this.skill);

    return `
  <div class="pb-row">
    <label>Skill</label>
    <select class="pb-skill-select">
      <option value="">— Manual —</option>
      ${options}
    </select>
    <span class="pb-skill-val pb-val">${this.skill ? val : "—"}</span>
  </div>`;
  }

  _buildManualPool() {
    return `
  <div class="pb-row">
    <label>Base Pool</label>
    <input type="number" class="pb-manual-pool" value="0" min="0" />
    <span class="pb-val">dice</span>
  </div>`;
  }

  _modRowHTML(idx, label = "", value = 0) {
    return `
  <div class="pb-mod-row" data-idx="${idx}">
    <input type="text"   class="pb-mod-label" placeholder="Modifier label" value="${label}" />
    <input type="number" class="pb-mod-val"   value="${value}" />
    <button type="button" class="pb-mod-remove" data-idx="${idx}">✕</button>
  </div>`;
  }

  // ── RENDER HOOK ───────────────────────────────────────────────────────────

  _onDialogRender(html) {
    const self = this;

    function recalc() {
      const actor    = self.actor;
      const hasSkills = actor?.type === "character";

      let basePool = 0;
      let parts    = [];

      if (hasSkills) {
        const skillSel = html.find(".pb-skill-select").val();
        if (skillSel) {
          const sv = actorSkillValue(actor, skillSel);
          basePool += sv;
          parts.push(`Skill ${sv}`);
        }
      } else {
        const mp = parseInt(html.find(".pb-manual-pool").val()) || 0;
        basePool += mp;
        parts.push(`Base ${mp}`);
      }

      // Attribute
      const attrKey = html.find(".pb-attr-select").val();
      const attrVal = actorAttrValue(actor, attrKey);
      if (actor) {
        basePool += attrVal;
        parts.push(`${ATTR_LABELS[attrKey] ?? attrKey} ${attrVal}`);
      }

      // Specialization
      if (html.find(".pb-spec-check").is(":checked")) {
        basePool += 2;
        parts.push("Spec +2");
      }

      // Modifiers
      html.find(".pb-mod-row").each((_, row) => {
        const v = parseInt($(row).find(".pb-mod-val").val()) || 0;
        if (v !== 0) {
          const lbl = $(row).find(".pb-mod-label").val() || "Mod";
          basePool += v;
          parts.push(`${lbl} ${v > 0 ? "+" : ""}${v}`);
        }
      });

      // Wound modifier
      const wound = parseInt(html.find(".pb-wound-mod").val()) || 0;
      if (wound !== 0) {
        basePool += wound;
        parts.push(`Wound ${wound}`);
      }

      const finalPool = Math.max(0, basePool);
      html.find(".pb-total").text(`${finalPool} dice`);
      html.find(".pb-total-breakdown").text(`(${parts.join(" + ")})`);
    }

    // Skill select: auto-update linked attribute + values
    html.find(".pb-skill-select").on("change", function () {
      const opt    = $(this).find(":selected");
      const linked = opt.data("linked");
      if (linked) html.find(".pb-attr-select").val(linked);
      const actor  = self.actor;
      const sv     = actorSkillValue(actor, this.value);
      html.find(".pb-skill-val").text(this.value ? sv : "—");
      const attrKey = html.find(".pb-attr-select").val();
      html.find(".pb-attr-val").text(actorAttrValue(actor, attrKey));
      recalc();
    });

    // Attribute select: update displayed value
    html.find(".pb-attr-select").on("change", function () {
      html.find(".pb-attr-val").text(actorAttrValue(self.actor, this.value));
      recalc();
    });

    // Anything else that changes the pool
    html.on("change", ".pb-spec-check, .pb-wound-mod, .pb-mod-val, .pb-manual-pool", recalc);
    html.on("click",  ".pb-spec-check, .pb-edge-check", recalc);

    // Add modifier
    html.find(".pb-mod-add").on("click", () => {
      const idx = html.find(".pb-mod-row").length;
      html.find(".pb-mod-list").append(self._modRowHTML(idx));
      html.find(".pb-mod-remove").last().on("click", function () {
        $(this).closest(".pb-mod-row").remove();
        recalc();
      });
    });

    // Remove modifier (existing rows)
    html.find(".pb-mod-remove").on("click", function () {
      $(this).closest(".pb-mod-row").remove();
      recalc();
    });

    // Initial calculation
    recalc();
  }

  // ── ROLL HANDLER ─────────────────────────────────────────────────────────

  async _onRoll(html, buyHits) {
    const actor    = this.actor;
    const hasSkills = actor?.type === "character";

    let pool  = 0;
    let parts = [];

    if (hasSkills) {
      const skillKey = html.find(".pb-skill-select").val();
      if (skillKey) {
        const sv = actorSkillValue(actor, skillKey);
        pool += sv;
        parts.push(SKILL_LABELS[skillKey] ?? skillKey);
      }
    } else {
      const mp = parseInt(html.find(".pb-manual-pool").val()) || 0;
      pool += mp;
    }

    const attrKey = html.find(".pb-attr-select").val();
    const attrVal = actorAttrValue(actor, attrKey);
    pool += attrVal;
    parts.push(ATTR_LABELS[attrKey] ?? attrKey);

    if (html.find(".pb-spec-check").is(":checked")) {
      pool += 2;
      const specLabel = html.find(".pb-spec-label").val();
      parts.push(specLabel ? `Spec (${specLabel})` : "Spec");
    }

    html.find(".pb-mod-row").each((_, row) => {
      const v   = parseInt($(row).find(".pb-mod-val").val()) || 0;
      const lbl = $(row).find(".pb-mod-label").val() || "Mod";
      if (v !== 0) { pool += v; parts.push(`${lbl} ${v > 0 ? "+" : ""}${v}`); }
    });

    const wound = parseInt(html.find(".pb-wound-mod").val()) || 0;
    if (wound !== 0) { pool += wound; parts.push(`Wound ${wound}`); }

    pool = Math.max(0, pool);

    const useEdge   = html.find(".pb-edge-check").is(":checked");
    const threshold = parseInt(html.find(".pb-threshold").val()) || 0;
    const rollLabel = html.find(".pb-roll-label").val() || parts.join(" + ");

    if (buyHits) {
      const { hits } = SR4Roll.buyHits(pool);
      const msg = `<div class="sr4-buy-hits"><strong>${rollLabel}</strong><br/>Pool ${pool} → <strong>${hits} hits</strong> (bought, no glitch risk)</div>`;
      ChatMessage.create({ content: msg, speaker: ChatMessage.getSpeaker({ actor }) });
      return { pool, hits, isGlitch: false, isCritGlitch: false, bought: true };
    }

    const roll = new SR4Roll(pool, { rollLabel, actor: actor?.name, edge: useEdge, threshold });
    await roll.evaluate();
    await roll.toMessage();
    return roll;
  }
}
