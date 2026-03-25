/**
 * @file character-wizard.mjs — SR4 20th Anniversary 400 BP character creation wizard.
 *
 * ── OVERVIEW ─────────────────────────────────────────────────────────────────
 * SR4A uses a Build Point system (SR4A p.88-98): every character starts with
 * 400 BP and spends them across metatype, attributes, skills, qualities, and contacts.
 * BP is a unified currency — spend it however you like across all character categories.
 *
 * The wizard walks the player through six steps in order, tracking the BP budget
 * in real time. No step is gated — the player can navigate freely and the final
 * "Create" button is gated only on budget validity.
 *
 * ── SIX STEPS ────────────────────────────────────────────────────────────────
 * 0. Concept    — Handle/name, metatype, archetype, awakened/technomancer type,
 *                  magic tradition, gender, age.
 *                  Metatype selection immediately adjusts attribute minimums and costs.
 *                  Awakened category adds the quality cost and unlocks Magic/Resonance.
 *
 * 1. Attributes — 8 core attributes (Body/Agility/Reaction/Strength/Charisma/
 *                  Intuition/Logic/Willpower) + Edge + Magic/Resonance (if awakened).
 *                  Each point above racial minimum costs 10 BP.
 *                  Racial maximums are enforced (e.g. Troll Body max 10, Edge max 4).
 *
 * 2. Skills     — Active skills: 4 BP per point (max 6 at chargen).
 *                  Specializations: +2 BP each; add +2 dice for matching situations.
 *                  Skill groups: buy all member skills at the same rank for 10 BP/rank.
 *                  Knowledge skills: free pool = (Logic + Intuition) × 3 points.
 *                  Languages: drawn from free knowledge pool; native languages are free.
 *
 * 3. Qualities  — Positive qualities cost BP (hard cap: 25 BP total). SR4A p.89.
 *                  Negative qualities refund BP (hard cap: 35 BP total). SR4A p.89.
 *                  Quickpick panel provides common qualities from SR4A Core.
 *                  Custom qualities can be added with free-form name + BP cost.
 *
 * 4. Contacts   — Each contact costs Connection + Loyalty BP (1 BP per rating point).
 *                  Connection (1-6) = capability/network reach;
 *                  Loyalty (1-6) = trust/willingness to help. Total = BP cost.
 *                  Nuyen allocation: 1 BP = 2,000¥ starting cash.
 *
 * 5. Review     — BP summary breakdown; validation warnings; Create Actor button.
 *                  Disabled if over 400 BP budget OR negative quality cap exceeded.
 *
 * ── ACTOR CREATION ───────────────────────────────────────────────────────────
 * _createActor() builds the full actor data payload including:
 *   - system.attributes: all 8 attrs with { base, augmented: 0 } + edge.current
 *   - system.skills: merged group + individual purchases via _buildSkillsPayload()
 *   - system.awakened: tradition, adeptPoints (magic), complex forms (techno)
 *   - system.nuyen: bpAllocated × 2000
 *   - items: quality items (including awakened meta-quality) and contact items
 *
 * The actor is created with _fromSR4Wizard: true to bypass the preCreateActor hook
 * and prevent the wizard from re-opening on the new actor.
 *
 * ── METATYPE DATA ─────────────────────────────────────────────────────────────
 * METATYPE_DATA stores racial attribute ranges (SR4A p.70-71).
 * When metatype changes, _clampAttrsToMetatype() clamps all current attr values
 * to the new racial min/max so no invalid state persists.
 *
 * ── BP COMPUTATION ───────────────────────────────────────────────────────────
 * _computeBP() is called on every render pass and returns a complete breakdown
 * object used both for the progress bar and the Review step summary table.
 * All state lives in this._wizardData — the class has no persistent Foundry
 * document until _createActor() is called.
 */

// ── CONSTANTS ────────────────────────────────────────────────────────────────

/**
 * BP cost to select each metatype (SR4A p.70-71).
 * These are flat "meta-quality" costs paid from the 400 BP budget.
 * Human is free because all racial attribute bonuses are baked into the minimums.
 */
const METATYPE_BP = { human: 0, elf: 30, dwarf: 25, ork: 20, troll: 40 };

/**
 * BP cost of the Awakened/Technomancer meta-quality (SR4A p.89, 90).
 * These qualities grant access to Magic/Resonance ratings and related skills.
 *   magician:     Full spellcasting + conjuring + initiation
 *   adept:        Physical adept powers (PP = Magic rating)
 *   mysticAdept:  Both magician and adept paths — most expensive
 *   aspected:     One magical discipline only (sorcery OR conjuring OR enchanting)
 *   technomancer: Matrix powers via Resonance; Complex Forms instead of programs
 */
const AWAKENED_BP = {
  none: 0, magician: 15, adept: 10, mysticAdept: 25, aspected: 15, technomancer: 5
};

/** Racial attribute min → natural max. Source: SR4A p.70–71. */
const METATYPE_DATA = {
  human: {
    label: "Human",
    min: { body:1, agility:1, reaction:1, strength:1, charisma:1, intuition:1, logic:1, willpower:1, edge:1 },
    max: { body:6, agility:6, reaction:6, strength:6, charisma:6, intuition:6, logic:6, willpower:6, edge:7 },
    special: []
  },
  elf: {
    label: "Elf",
    min: { body:1, agility:2, reaction:1, strength:1, charisma:3, intuition:1, logic:1, willpower:1, edge:1 },
    max: { body:6, agility:6, reaction:6, strength:6, charisma:8, intuition:6, logic:6, willpower:6, edge:6 },
    special: ["Low-light vision"]
  },
  dwarf: {
    label: "Dwarf",
    min: { body:2, agility:2, reaction:1, strength:3, charisma:1, intuition:1, logic:1, willpower:2, edge:2 },
    max: { body:8, agility:6, reaction:6, strength:8, charisma:6, intuition:6, logic:6, willpower:7, edge:6 },
    special: ["Thermographic vision", "+2 dice to resist Disease", "+20% Lifestyle cost"]
  },
  ork: {
    label: "Ork",
    min: { body:3, agility:1, reaction:1, strength:3, charisma:1, intuition:1, logic:1, willpower:1, edge:1 },
    max: { body:8, agility:6, reaction:6, strength:8, charisma:5, intuition:6, logic:5, willpower:6, edge:5 },
    special: ["Low-light vision"]
  },
  troll: {
    label: "Troll",
    min: { body:5, agility:1, reaction:1, strength:5, charisma:1, intuition:1, logic:1, willpower:1, edge:1 },
    max: { body:10, agility:6, reaction:6, strength:10, charisma:4, intuition:6, logic:5, willpower:6, edge:4 },
    special: ["Thermographic vision", "+1 Reach", "+5 dermal armor", "+20% Lifestyle cost"]
  }
};

/** Skill groups for wizard display. Keys match SR4_CONSTANTS.SKILL_GROUPS in sr4.mjs. */
const SKILL_GROUP_DEFS = {
  Athletics:   { skills: ["gymnastics","running","swimming"],              attrKey: "strength" },
  Biotech:     { skills: ["cybertechnology","biotechnology"],              attrKey: "logic"    },
  Cracking:    { skills: ["cybercombat","electronicWarfare","hacking"],    attrKey: "logic"    },
  Electronics: { skills: ["computer","dataSearch","hardware","software"],  attrKey: "logic"    },
  Firearms:    { skills: ["automatics","longarms","pistols"],              attrKey: "agility"  },
  Stealth:     { skills: ["disguise","palming","sneaking"],                attrKey: "agility"  },
  Influence:   { skills: ["con","etiquette","leadership","negotiation"],   attrKey: "charisma" }
};

/** All active skill keys — must match CharacterDataModel.skills keys exactly. */
const ALL_SKILL_KEYS = [
  "archery","automatics","blades","clubs","exoticMelee","exoticRanged",
  "heavyWeapons","longarms","pistols","throwingWeapons","unarmedCombat",
  "disguise","escapeArtist","gymnastics","palming","perception","running",
  "sneaking","swimming","tracking","con","etiquette","impersonation",
  "intimidation","leadership","negotiation","assensing","astralCombat",
  "banishing","binding","counterspelling","ritualSpellcasting","spellcasting",
  "summoning","aeronauticsMechanic","automotiveMechanic","biotechnology",
  "chemistry","computer","cybercombat","cybertechnology","dataSearch",
  "demolitions","electronicWarfare","forgery","hacking","hardware",
  "industrialMechanic","locksmith","nauticalMechanic","software",
  "pilotAerospace","pilotAircraft","pilotAnthroform","pilotExotic",
  "pilotGroundCraft","pilotWatercraft"
];

/** Skill display info: key → { label, attrKey, group } */
const SKILL_INFO = {
  archery:          { label: "Archery",           attrKey: "agility",   group: "Combat"    },
  automatics:       { label: "Automatics",         attrKey: "agility",   group: "Combat"    },
  blades:           { label: "Blades",             attrKey: "agility",   group: "Combat"    },
  clubs:            { label: "Clubs",              attrKey: "agility",   group: "Combat"    },
  exoticMelee:      { label: "Exotic Melee",       attrKey: "agility",   group: "Combat"    },
  exoticRanged:     { label: "Exotic Ranged",      attrKey: "agility",   group: "Combat"    },
  heavyWeapons:     { label: "Heavy Weapons",      attrKey: "agility",   group: "Combat"    },
  longarms:         { label: "Longarms",           attrKey: "agility",   group: "Combat"    },
  pistols:          { label: "Pistols",            attrKey: "agility",   group: "Combat"    },
  throwingWeapons:  { label: "Throwing Weapons",   attrKey: "agility",   group: "Combat"    },
  unarmedCombat:    { label: "Unarmed Combat",     attrKey: "agility",   group: "Combat"    },
  disguise:         { label: "Disguise",           attrKey: "intuition", group: "Physical"  },
  escapeArtist:     { label: "Escape Artist",      attrKey: "agility",   group: "Physical"  },
  gymnastics:       { label: "Gymnastics",         attrKey: "agility",   group: "Physical"  },
  palming:          { label: "Palming",            attrKey: "agility",   group: "Physical"  },
  perception:       { label: "Perception",         attrKey: "intuition", group: "Physical"  },
  running:          { label: "Running",            attrKey: "strength",  group: "Physical"  },
  sneaking:         { label: "Sneaking",           attrKey: "agility",   group: "Physical"  },
  swimming:         { label: "Swimming",           attrKey: "strength",  group: "Physical"  },
  tracking:         { label: "Tracking",           attrKey: "intuition", group: "Physical"  },
  con:              { label: "Con",                attrKey: "charisma",  group: "Social"    },
  etiquette:        { label: "Etiquette",          attrKey: "charisma",  group: "Social"    },
  impersonation:    { label: "Impersonation",      attrKey: "charisma",  group: "Social"    },
  intimidation:     { label: "Intimidation",       attrKey: "charisma",  group: "Social"    },
  leadership:       { label: "Leadership",         attrKey: "charisma",  group: "Social"    },
  negotiation:      { label: "Negotiation",        attrKey: "charisma",  group: "Social"    },
  assensing:        { label: "Assensing",          attrKey: "intuition", group: "Magic"     },
  astralCombat:     { label: "Astral Combat",      attrKey: "willpower", group: "Magic"     },
  banishing:        { label: "Banishing",          attrKey: "magic",     group: "Magic"     },
  binding:          { label: "Binding",            attrKey: "magic",     group: "Magic"     },
  counterspelling:  { label: "Counterspelling",    attrKey: "magic",     group: "Magic"     },
  ritualSpellcasting: { label: "Ritual Spellcasting", attrKey: "magic",  group: "Magic"     },
  spellcasting:     { label: "Spellcasting",       attrKey: "magic",     group: "Magic"     },
  summoning:        { label: "Summoning",          attrKey: "magic",     group: "Magic"     },
  aeronauticsMechanic: { label: "Aeronautics Mech.", attrKey: "logic",   group: "Technical" },
  automotiveMechanic: { label: "Automotive Mech.", attrKey: "logic",    group: "Technical" },
  biotechnology:    { label: "Biotechnology",      attrKey: "logic",     group: "Technical" },
  chemistry:        { label: "Chemistry",          attrKey: "logic",     group: "Technical" },
  computer:         { label: "Computer",           attrKey: "logic",     group: "Technical" },
  cybercombat:      { label: "Cybercombat",        attrKey: "logic",     group: "Technical" },
  cybertechnology:  { label: "Cybertechnology",    attrKey: "logic",     group: "Technical" },
  dataSearch:       { label: "Data Search",        attrKey: "logic",     group: "Technical" },
  demolitions:      { label: "Demolitions",        attrKey: "logic",     group: "Technical" },
  electronicWarfare: { label: "Electronic Warfare", attrKey: "logic",    group: "Technical" },
  forgery:          { label: "Forgery",            attrKey: "logic",     group: "Technical" },
  hacking:          { label: "Hacking",            attrKey: "logic",     group: "Technical" },
  hardware:         { label: "Hardware",           attrKey: "logic",     group: "Technical" },
  industrialMechanic: { label: "Industrial Mech.", attrKey: "logic",    group: "Technical" },
  locksmith:        { label: "Locksmith",          attrKey: "agility",   group: "Technical" },
  nauticalMechanic: { label: "Nautical Mech.",     attrKey: "logic",     group: "Technical" },
  software:         { label: "Software",           attrKey: "logic",     group: "Technical" },
  pilotAerospace:   { label: "Pilot Aerospace",    attrKey: "reaction",  group: "Vehicle"   },
  pilotAircraft:    { label: "Pilot Aircraft",     attrKey: "reaction",  group: "Vehicle"   },
  pilotAnthroform:  { label: "Pilot Anthroform",   attrKey: "reaction",  group: "Vehicle"   },
  pilotExotic:      { label: "Pilot Exotic",       attrKey: "reaction",  group: "Vehicle"   },
  pilotGroundCraft: { label: "Pilot Ground Craft", attrKey: "reaction",  group: "Vehicle"   },
  pilotWatercraft:  { label: "Pilot Watercraft",   attrKey: "reaction",  group: "Vehicle"   }
};

/** Common positive qualities for quickpick. BP costs from SR4A. */
const COMMON_POS_QUALITIES = [
  { name: "Ambidextrous",          bpCost:  5 },
  { name: "Analytical Mind",       bpCost:  5 },
  { name: "First Impression",      bpCost:  5 },
  { name: "Mentor Spirit",         bpCost:  5 },
  { name: "Aptitude",              bpCost: 10 },
  { name: "Codeslinger",           bpCost: 10 },
  { name: "Common Sense",          bpCost: 10 },
  { name: "High Pain Tolerance",   bpCost: 10 },
  { name: "Home Ground",           bpCost: 10 },
  { name: "Natural Hardening",     bpCost: 10 },
  { name: "Photographic Memory",   bpCost: 10 },
  { name: "Quick Healer",          bpCost: 10 },
  { name: "Spirit Affinity",       bpCost: 10 },
  { name: "Toughness",             bpCost: 10 },
  { name: "Lucky",                 bpCost: 20 }
];

/** Common negative qualities for quickpick. bpCost = BP refunded. */
const COMMON_NEG_QUALITIES = [
  { name: "Addiction (Mild)",          bpCost:  5 },
  { name: "Allergy (Uncommon, Mild)",  bpCost:  5 },
  { name: "Day Job",                   bpCost:  5 },
  { name: "Dependents",               bpCost:  5 },
  { name: "Distinctive Style",        bpCost:  5 },
  { name: "SINner (National)",         bpCost:  5 },
  { name: "Simsense Vertigo",          bpCost:  5 },
  { name: "Addiction (Moderate)",      bpCost: 10 },
  { name: "Allergy (Common, Mild)",    bpCost: 10 },
  { name: "Gremlins",                  bpCost: 10 },
  { name: "In Debt",                   bpCost: 10 },
  { name: "Low Pain Tolerance",        bpCost: 10 },
  { name: "SINner (Corporate)",        bpCost: 10 },
  { name: "Sensitive System",          bpCost: 15 },
  { name: "Combat Paralysis",          bpCost: 20 },
  { name: "Uncouth",                   bpCost: 20 },
  { name: "Uneducated",               bpCost: 20 }
];

const STEP_NAMES = ["Concept", "Attributes", "Skills", "Qualities", "Contacts", "Review"];

const ATTR_KEYS = ["body","agility","reaction","strength","charisma","intuition","logic","willpower","edge"];
const ATTR_LABELS = {
  body: "Body", agility: "Agility", reaction: "Reaction", strength: "Strength",
  charisma: "Charisma", intuition: "Intuition", logic: "Logic", willpower: "Willpower",
  edge: "Edge", magic: "Magic", resonance: "Resonance"
};

// ── WIZARD CLASS ─────────────────────────────────────────────────────────────

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CharacterWizard extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id:      "sr4-character-wizard",
    classes: ["sr4", "sr4-wizard"],
    window: {
      title:     "SR4 — Character Creation (400 BP)",
      resizable: true
    },
    position: {
      width:  760,
      height: 680
    }
  };

  static PARTS = {
    main: { template: "systems/sr4/templates/apps/character-wizard.hbs" }
  };

  constructor(options = {}) {
    super(options);
    this._wizardData = CharacterWizard._defaultData();
  }

  // ── STATIC HELPERS ───────────────────────────────────────────────────────

  static _defaultData() {
    const meta = METATYPE_DATA.human;
    return {
      step:      0,
      actorName: "",

      concept: {
        handle:          "",
        archetype:       "",
        metatype:        "human",
        awakenedCategory: "none",   // none|magician|adept|mysticAdept|aspected|technomancer
        tradition:       "",
        gender:          "",
        age:             ""
      },

      attributes: {
        body:      meta.min.body,
        agility:   meta.min.agility,
        reaction:  meta.min.reaction,
        strength:  meta.min.strength,
        charisma:  meta.min.charisma,
        intuition: meta.min.intuition,
        logic:     meta.min.logic,
        willpower: meta.min.willpower,
        edge:      meta.min.edge,
        magic:     1,
        resonance: 1
      },

      skills: {
        active: {},   // { skillKey: { value: n, specialization: "" } }
        groups: {},   // { groupName: rank }
        knowledge: [],
        languages:  []
      },

      qualities: {
        positive: [],
        negative: []
      },

      contacts: [],

      nuyen: { bpAllocated: 0 }
    };
  }

  // ── DATA PREPARATION ─────────────────────────────────────────────────────

  async _prepareContext(options) {
    const d     = this._wizardData;
    const bp    = this._computeBP();
    const meta  = METATYPE_DATA[d.concept.metatype];
    const awakCat = d.concept.awakenedCategory;
    const isAwakened = ["magician","adept","mysticAdept","aspected"].includes(awakCat);
    const isTechno   = awakCat === "technomancer";

    // Build attribute rows for the template — pre-split into Physical / Mental / Special
    const makeAttrRow = k => ({
      key:    k,
      label:  ATTR_LABELS[k],
      value:  d.attributes[k],
      min:    meta.min[k] ?? 1,
      max:    meta.max[k] ?? 6,
      bpCost: Math.max(0, d.attributes[k] - (meta.min[k] ?? 1)) * 10,
      atMin:  d.attributes[k] <= (meta.min[k] ?? 1),
      atMax:  d.attributes[k] >= (meta.max[k] ?? 6)
    });
    const attrPhysical = ["body","agility","reaction","strength"].map(makeAttrRow);
    const attrMental   = ["charisma","intuition","logic","willpower"].map(makeAttrRow);
    const attrEdge     = makeAttrRow("edge");
    // All rows combined for review step
    const attrRows = [...attrPhysical, ...attrMental, attrEdge];

    // Magic / Resonance row (conditional)
    const specAttrKey = isTechno ? "resonance" : "magic";
    const specAttrRow = (isAwakened || isTechno) ? {
      key:    specAttrKey,
      label:  ATTR_LABELS[specAttrKey],
      value:  d.attributes[specAttrKey],
      min:    1,
      max:    6,
      bpCost: Math.max(0, d.attributes[specAttrKey] - 1) * 10,
      atMin:  d.attributes[specAttrKey] <= 1,
      atMax:  d.attributes[specAttrKey] >= 6
    } : null;

    // Build skill groups for the skills step
    const skillGroupsTemplate = this._buildSkillGroupsForTemplate(d, isAwakened);

    // Quickpick — mark which qualities are already selected
    const selectedPosNames = new Set(d.qualities.positive.map(q => q.name));
    const selectedNegNames = new Set(d.qualities.negative.map(q => q.name));
    const posQuickpick = COMMON_POS_QUALITIES.map(q => ({
      ...q, selected: selectedPosNames.has(q.name)
    }));
    const negQuickpick = COMMON_NEG_QUALITIES.map(q => ({
      ...q, selected: selectedNegNames.has(q.name)
    }));

    // BP progress percent (capped at 100 for the bar)
    const bpPercent = Math.min(100, Math.round((bp.totalSpent / 400) * 100));

    // Free knowledge skill pool
    const freeKnowledge = (d.attributes.logic + d.attributes.intuition) * 3;
    const usedKnowledge = d.skills.knowledge.reduce((s, k) => s + (k.value ?? 0), 0)
                        + d.skills.languages.filter(l => !l.native).reduce((s, l) => s + (l.value ?? 0), 0);

    // Step nav — pre-compute display number
    const steps = STEP_NAMES.map((name, i) => ({
      name, idx: i, num: i + 1, active: i === d.step, past: i < d.step
    }));

    return {
      step:      d.step,
      actorName: d.actorName,
      concept:   d.concept,

      attrPhysical,
      attrMental,
      attrEdge,
      attrRows,
      specAttrRow,
      isAwakened,
      isTechno,
      metatypeLabel: meta.label,
      metatypeSpecial: meta.special,
      // Computed sums for the template (avoids needing 'add' helper in critical places)
      fixedBP: (METATYPE_BP[d.concept.metatype] ?? 0) + (AWAKENED_BP[awakCat] ?? 0),

      skillGroupsTemplate,
      skills: d.skills,
      freeKnowledge,
      usedKnowledge,
      freeKnowledgeRemaining: Math.max(0, freeKnowledge - usedKnowledge),
      logicVal: d.attributes.logic,
      intuitionVal: d.attributes.intuition,

      qualities: d.qualities,
      posQuickpick,
      negQuickpick,

      contacts: d.contacts.map(c => ({
        ...c,
        connectionPlusLoyalty: (c.connection ?? 1) + (c.loyalty ?? 1)
      })),
      nuyen: {
        bpAllocated: d.nuyen.bpAllocated,
        nuyenValue:  d.nuyen.bpAllocated * 2000
      },

      bp,
      bpPercent,
      steps,

      // Metatype / awakened type choice arrays (for selects)
      metatypeChoices: Object.entries(METATYPE_DATA).map(([k, v]) => ({
        value: k, label: v.label, bp: METATYPE_BP[k], selected: k === d.concept.metatype
      })),
      awakenedChoices: [
        { value: "none",         label: "Mundane",          bp: 0  },
        { value: "magician",     label: "Magician",         bp: 15 },
        { value: "adept",        label: "Adept",            bp: 10 },
        { value: "mysticAdept",  label: "Mystic Adept",     bp: 25 },
        { value: "aspected",     label: "Aspected Magician",bp: 15 },
        { value: "technomancer", label: "Technomancer",     bp: 5  }
      ].map(c => ({ ...c, selected: c.value === d.concept.awakenedCategory })),

      // For skill groups tab
      skillGroupDefs: Object.entries(SKILL_GROUP_DEFS).map(([name, def]) => {
        const rank = d.skills.groups[name] ?? 0;
        return { name, skills: def.skills.map(k => SKILL_INFO[k]?.label ?? k).join(", "), rank, groupBP: rank * 10 };
      }),

      // Review / validation
      validation: {
        overBudget:     bp.overBudget,
        negQualOverCap: bp.negQualOverCap,
        noName:         !(d.actorName || d.concept.handle),
        canCreate:      !bp.overBudget && !bp.negQualOverCap && !!(d.actorName || d.concept.handle)
      }
    };
  }

  /** Organize skills by display group for the skills step template. */
  _buildSkillGroupsForTemplate(d, isAwakened) {
    const groups = {};
    // Group skills
    for (const key of ALL_SKILL_KEYS) {
      const info = SKILL_INFO[key];
      if (!info) continue;
      // Hide magic skills if not awakened
      if (info.group === "Magic" && !isAwakened) continue;
      if (!groups[info.group]) groups[info.group] = [];
      const active = d.skills.active[key] ?? { value: 0, specialization: "" };
      // Check if this skill is covered by a group purchase
      const groupName = this._skillGroupName(key);
      const groupRank = groupName ? (d.skills.groups[groupName] ?? 0) : 0;
      const effectiveValue = Math.max(active.value, groupRank);
      groups[info.group].push({
        key,
        label:          info.label,
        attrKey:        info.attrKey,
        value:          active.value,
        specialization: active.specialization,
        effectiveValue,
        inGroup:        !!groupName,
        groupCovered:   groupRank > 0 && active.value <= groupRank,
        bpCost:         active.value * 4 + (active.specialization ? 2 : 0)
      });
    }

    // Convert to array for Handlebars iteration
    const ORDER = ["Combat","Physical","Social","Technical","Vehicle","Magic"];
    return ORDER.filter(g => groups[g]).map(g => ({ name: g, skills: groups[g] }));
  }

  /** Find which skill group (if any) a skill belongs to. */
  _skillGroupName(skillKey) {
    for (const [name, def] of Object.entries(SKILL_GROUP_DEFS)) {
      if (def.skills.includes(skillKey)) return name;
    }
    return null;
  }

  // ── LISTENERS ────────────────────────────────────────────────────────────

  _onRender(context, options) {
    const html = $(this.element);

    // Step navigation
    html.find(".btn-next").click(this._onNextStep.bind(this));
    html.find(".btn-prev").click(this._onPrevStep.bind(this));
    html.find(".wizard-step-nav").click(this._onNavStep.bind(this));

    // Step 0 — Concept
    html.find(".concept-field").on("change", this._onConceptChange.bind(this));
    html.find(".awakened-select").on("change", this._onAwakenedChange.bind(this));

    // Step 1 — Attributes (buttons with data-attr)
    html.find(".attr-btn[data-attr]").click(this._onAttrStep.bind(this));
    // Step 2 — Skill group stepper buttons (buttons with data-group)
    html.find(".attr-btn[data-group]").click(this._onGroupStep.bind(this));

    // Step 2 — Skills (individual)
    html.find(".skill-input").on("change", this._onSkillChange.bind(this));
    html.find(".skill-spec").on("change", this._onSpecChange.bind(this));
    // Skill groups
    html.find(".group-input").on("change", this._onGroupChange.bind(this));
    // Knowledge / language
    html.find(".add-knowledge").click(() => { this._wizardData.skills.knowledge.push({ name:"", category:"street", value:1 }); this.render(); });
    html.find(".add-language").click(() => { this._wizardData.skills.languages.push({ name:"", value:1, native:false }); this.render(); });
    html.find(".remove-knowledge").click(this._onRemoveKnowledge.bind(this));
    html.find(".remove-language").click(this._onRemoveLanguage.bind(this));
    html.find(".knowledge-field").on("change", this._onKnowledgeChange.bind(this));
    html.find(".language-field").on("change", this._onLanguageChange.bind(this));

    // Step 3 — Qualities
    html.find(".quickpick-quality").click(this._onQuickpickQuality.bind(this));
    html.find(".add-quality").click(this._onAddQuality.bind(this));
    html.find(".remove-quality").click(this._onRemoveQuality.bind(this));
    html.find(".quality-field").on("change", this._onQualityChange.bind(this));

    // Step 4 — Contacts
    html.find(".add-contact").click(() => { this._wizardData.contacts.push({ name:"", role:"", connection:1, loyalty:1 }); this.render(); });
    html.find(".remove-contact").click(this._onRemoveContact.bind(this));
    html.find(".contact-field").on("change", this._onContactChange.bind(this));
    html.find(".nuyen-input").on("change", this._onNuyenChange.bind(this));

    // Step 5 — Review
    html.find(".btn-create-actor").click(this._onCreateActor.bind(this));
    html.find(".btn-cancel").click(() => this.close());
  }

  // ── NAVIGATION HANDLERS ──────────────────────────────────────────────────

  _onNextStep() {
    if (this._wizardData.step < STEP_NAMES.length - 1) {
      this._wizardData.step++;
      this.render();
    }
  }

  _onPrevStep() {
    if (this._wizardData.step > 0) {
      this._wizardData.step--;
      this.render();
    }
  }

  _onNavStep(event) {
    const target = parseInt(event.currentTarget.dataset.step);
    if (!isNaN(target)) { this._wizardData.step = target; this.render(); }
  }

  // ── CONCEPT HANDLERS ─────────────────────────────────────────────────────

  _onConceptChange(event) {
    const { name, value } = event.currentTarget;
    if (name === "actorName") {
      this._wizardData.actorName = value;
    } else {
      this._wizardData.concept[name] = value;
      if (name === "metatype") this._clampAttrsToMetatype(value);
    }
    this.render();
  }

  _onAwakenedChange(event) {
    const cat = event.currentTarget.value;
    this._wizardData.concept.awakenedCategory = cat;
    if (cat === "none") { this._wizardData.attributes.magic = 1; this._wizardData.attributes.resonance = 1; }
    this.render();
  }

  _clampAttrsToMetatype(metatype) {
    const meta = METATYPE_DATA[metatype];
    const attrs = this._wizardData.attributes;
    for (const k of ATTR_KEYS) {
      attrs[k] = Math.min(Math.max(attrs[k], meta.min[k] ?? 1), meta.max[k] ?? 6);
    }
  }

  // ── ATTRIBUTE HANDLERS ───────────────────────────────────────────────────

  _onAttrStep(event) {
    const { attr, delta: rawDelta } = event.currentTarget.dataset;
    const delta = parseInt(rawDelta);
    const d     = this._wizardData;
    const meta  = METATYPE_DATA[d.concept.metatype];
    const isTechno = d.concept.awakenedCategory === "technomancer";
    const isAwakened = ["magician","adept","mysticAdept","aspected"].includes(d.concept.awakenedCategory);
    const specAttr = isTechno ? "resonance" : "magic";
    let min, max;
    if (attr === "magic" || attr === "resonance") {
      if (attr !== specAttr || (!isAwakened && !isTechno)) return;
      min = 1; max = 6;
    } else {
      min = meta.min[attr] ?? 1;
      max = meta.max[attr] ?? 6;
    }
    d.attributes[attr] = Math.min(Math.max((d.attributes[attr] ?? min) + delta, min), max);
    this.render();
  }

  // ── SKILL HANDLERS ───────────────────────────────────────────────────────

  _onSkillChange(event) {
    const { skill } = event.currentTarget.dataset;
    const val = parseInt(event.currentTarget.value) || 0;
    const clamped = Math.min(Math.max(val, 0), 6);
    if (!this._wizardData.skills.active[skill]) {
      this._wizardData.skills.active[skill] = { value: 0, specialization: "" };
    }
    this._wizardData.skills.active[skill].value = clamped;
    this.render();
  }

  _onSpecChange(event) {
    const { skill } = event.currentTarget.dataset;
    if (!this._wizardData.skills.active[skill]) {
      this._wizardData.skills.active[skill] = { value: 0, specialization: "" };
    }
    this._wizardData.skills.active[skill].specialization = event.currentTarget.value;
    this.render();
  }

  _onGroupStep(event) {
    const { group, delta: rawDelta } = event.currentTarget.dataset;
    const delta   = parseInt(rawDelta);
    const current = this._wizardData.skills.groups[group] ?? 0;
    this._wizardData.skills.groups[group] = Math.min(Math.max(current + delta, 0), 4);
    this.render();
  }

  _onGroupChange(event) {
    const { group } = event.currentTarget.dataset;
    const val = Math.min(Math.max(parseInt(event.currentTarget.value) || 0, 0), 4);
    this._wizardData.skills.groups[group] = val;
    this.render();
  }

  _onRemoveKnowledge(event) {
    this._wizardData.skills.knowledge.splice(parseInt(event.currentTarget.dataset.idx), 1);
    this.render();
  }

  _onRemoveLanguage(event) {
    this._wizardData.skills.languages.splice(parseInt(event.currentTarget.dataset.idx), 1);
    this.render();
  }

  _onKnowledgeChange(event) {
    const { idx, field } = event.currentTarget.dataset;
    const k = this._wizardData.skills.knowledge[parseInt(idx)];
    if (!k) return;
    k[field] = event.currentTarget.type === "number" ? (parseInt(event.currentTarget.value) || 1) : event.currentTarget.value;
    this.render();
  }

  _onLanguageChange(event) {
    const { idx, field } = event.currentTarget.dataset;
    const l = this._wizardData.skills.languages[parseInt(idx)];
    if (!l) return;
    if (event.currentTarget.type === "checkbox") l[field] = event.currentTarget.checked;
    else if (event.currentTarget.type === "number") l[field] = parseInt(event.currentTarget.value) || 1;
    else l[field] = event.currentTarget.value;
    this.render();
  }

  // ── QUALITY HANDLERS ─────────────────────────────────────────────────────

  _onQuickpickQuality(event) {
    const { type, name, bp: rawBp } = event.currentTarget.dataset;
    const bpCost = parseInt(rawBp);
    const list = this._wizardData.qualities[type];
    const existingIdx = list.findIndex(q => q.name === name);
    if (existingIdx >= 0) list.splice(existingIdx, 1); // toggle off
    else list.push({ name, bpCost, isLeveled: false, level: 1, effect: "" });
    this.render();
  }

  _onAddQuality(event) {
    const type = event.currentTarget.dataset.type;
    this._wizardData.qualities[type].push({ name: "", bpCost: 5, isLeveled: false, level: 1, effect: "" });
    this.render();
  }

  _onRemoveQuality(event) {
    const { type, idx } = event.currentTarget.dataset;
    this._wizardData.qualities[type].splice(parseInt(idx), 1);
    this.render();
  }

  _onQualityChange(event) {
    const { type, idx, field } = event.currentTarget.dataset;
    const q = this._wizardData.qualities[type][parseInt(idx)];
    if (!q) return;
    if (event.currentTarget.type === "number")   q[field] = parseInt(event.currentTarget.value) || 0;
    else if (event.currentTarget.type === "checkbox") q[field] = event.currentTarget.checked;
    else q[field] = event.currentTarget.value;
    this.render();
  }

  // ── CONTACT / NUYEN HANDLERS ─────────────────────────────────────────────

  _onRemoveContact(event) {
    this._wizardData.contacts.splice(parseInt(event.currentTarget.dataset.idx), 1);
    this.render();
  }

  _onContactChange(event) {
    const { idx, field } = event.currentTarget.dataset;
    const c = this._wizardData.contacts[parseInt(idx)];
    if (!c) return;
    c[field] = event.currentTarget.type === "number" ? parseInt(event.currentTarget.value) : event.currentTarget.value;
    this.render();
  }

  _onNuyenChange(event) {
    const bp = this._computeBP();
    const maxAllocatable = bp.remaining + this._wizardData.nuyen.bpAllocated;
    this._wizardData.nuyen.bpAllocated = Math.min(Math.max(0, parseInt(event.target.value) || 0), maxAllocatable);
    this.render();
  }

  // ── BP CALCULATION ───────────────────────────────────────────────────────

  /**
   * Compute the full BP breakdown for the current wizard state.
   *
   * Called on every render — this is the single source of truth for the BP
   * budget display and the Review step validation.
   *
   * BP breakdown:
   *   metatypeBP   — flat cost of the chosen metatype (METATYPE_BP lookup)
   *   awakenedBP   — flat cost of awakened/technomancer quality (AWAKENED_BP lookup)
   *   attrBP       — 10 BP per attribute point above racial minimum
   *                   Magic/Resonance: first point free (included in awakenedBP);
   *                   additional points cost 10 BP each above 1
   *   skillBP      — 4 BP per active skill point + 2 BP per specialization
   *                   + 10 BP per skill group rank
   *   posQualBP    — sum of positive quality costs (no hard cap on spending, but
   *                   effectively limited by the 400 BP total budget)
   *   negQualRefund — sum of negative quality refunds, capped at 35 BP (SR4A p.89)
   *   contactBP    — 1 BP per (Connection + Loyalty) across all contacts
   *   nuyenBP      — 1 BP = 2,000¥ starting nuyen (optional allocation)
   *
   * @returns {{
   *   metatypeBP: number, awakenedBP: number, attrBP: number, skillBP: number,
   *   posQualBP: number, negQualTotal: number, negQualRefund: number,
   *   negQualOverCap: boolean, contactBP: number, nuyenBP: number, nuyenValue: number,
   *   totalSpent: number, remaining: number, overBudget: boolean
   * }}
   */
  _computeBP() {
    const d = this._wizardData;
    const metatype = d.concept.metatype;
    const awakCat  = d.concept.awakenedCategory;
    const meta     = METATYPE_DATA[metatype];
    const isAwakened = ["magician","adept","mysticAdept","aspected"].includes(awakCat);
    const isTechno   = awakCat === "technomancer";

    const metatypeBP  = METATYPE_BP[metatype] ?? 0;
    const awakenedBP  = AWAKENED_BP[awakCat]  ?? 0;

    // Attributes (10 BP per point above racial min)
    let attrBP = 0;
    for (const k of ATTR_KEYS) {
      attrBP += Math.max(0, d.attributes[k] - (meta.min[k] ?? 1)) * 10;
    }
    // Magic / Resonance start at 1 free (included in awakened quality cost), points above 1 cost 10 BP
    const specAttr = isTechno ? "resonance" : "magic";
    if (isAwakened || isTechno) {
      attrBP += Math.max(0, d.attributes[specAttr] - 1) * 10;
    }

    // Skills: 4 BP/point, +2 BP per specialization
    let skillBP = 0;
    for (const [, data] of Object.entries(d.skills.active)) {
      skillBP += (data.value ?? 0) * 4;
      if (data.specialization) skillBP += 2;
    }
    // Skill groups: 10 BP per group rank
    for (const [, rank] of Object.entries(d.skills.groups)) {
      skillBP += (rank ?? 0) * 10;
    }

    // Qualities
    let posQualBP = d.qualities.positive.reduce((s, q) => s + (q.bpCost ?? 0) * (q.isLeveled ? (q.level ?? 1) : 1), 0);
    const negQualTotal = d.qualities.negative.reduce((s, q) => s + (q.bpCost ?? 0) * (q.isLeveled ? (q.level ?? 1) : 1), 0);
    const negQualRefund = Math.min(negQualTotal, 35);  // Hard cap: 35 BP refund max

    // Contacts: 1 BP per (Connection + Loyalty)
    const contactBP = d.contacts.reduce((s, c) => s + (c.connection ?? 1) + (c.loyalty ?? 1), 0);

    // Nuyen: 1 BP = 2,000¥
    const nuyenBP    = d.nuyen.bpAllocated ?? 0;
    const nuyenValue = nuyenBP * 2000;

    const totalSpent = metatypeBP + awakenedBP + attrBP + skillBP + posQualBP - negQualRefund + contactBP + nuyenBP;
    const remaining  = 400 - totalSpent;

    return {
      metatypeBP, awakenedBP, attrBP, skillBP,
      posQualBP, negQualTotal, negQualRefund, negQualOverCap: negQualTotal > 35,
      contactBP, nuyenBP, nuyenValue,
      totalSpent, remaining,
      overBudget: totalSpent > 400
    };
  }

  // ── ACTOR CREATION ───────────────────────────────────────────────────────

  /**
   * Validate BP budget then trigger actor creation.
   * Shows notification if over budget or negative quality cap exceeded.
   */
  async _onCreateActor(event) {
    const bp = this._computeBP();
    if (bp.overBudget) {
      ui.notifications.warn(`SR4 | Over budget by ${-bp.remaining} BP. Reduce spending before creating.`);
      return;
    }
    if (bp.negQualOverCap) {
      ui.notifications.warn("SR4 | Negative quality refund exceeds 35 BP cap. Remove some negative qualities.");
      return;
    }
    await this._createActor();
  }

  /**
   * Build and create the Foundry Actor document from wizard state.
   *
   * Constructs system data matching CharacterDataModel's schema exactly,
   * then creates embedded quality and contact items in the same call.
   * Passes { _fromSR4Wizard: true } to bypass the preCreateActor hook.
   */
  async _createActor() {
    const d   = this._wizardData;
    const bp  = this._computeBP();
    const awakCat    = d.concept.awakenedCategory;
    const isAwakened = ["magician","adept","mysticAdept","aspected"].includes(awakCat);
    const isTechno   = awakCat === "technomancer";

    // ── ACTOR SYSTEM DATA ──────────────────────────────────────────────
    const systemData = {
      handle:    d.concept.handle,
      archetype: d.concept.archetype,
      metatype:  d.concept.metatype,
      gender:    d.concept.gender,
      age:       d.concept.age,

      attributes: {
        body:      { base: d.attributes.body,      augmented: 0 },
        agility:   { base: d.attributes.agility,   augmented: 0 },
        reaction:  { base: d.attributes.reaction,  augmented: 0 },
        strength:  { base: d.attributes.strength,  augmented: 0 },
        charisma:  { base: d.attributes.charisma,  augmented: 0 },
        intuition: { base: d.attributes.intuition, augmented: 0 },
        logic:     { base: d.attributes.logic,     augmented: 0 },
        willpower: { base: d.attributes.willpower, augmented: 0 },
        edge:      { base: d.attributes.edge, current: d.attributes.edge },
        essence:   6.0,
        magic:     { base: isAwakened ? d.attributes.magic : 0, augmented: 0 },
        resonance: { base: isTechno   ? d.attributes.resonance : 0, augmented: 0 }
      },

      skills:         this._buildSkillsPayload(d),
      knowledgeSkills: d.skills.knowledge.map(k => ({
        name: k.name, category: k.category ?? "street", value: k.value, specialization: ""
      })),
      languageSkills: d.skills.languages.map(l => ({
        name: l.name, value: l.value, native: l.native ?? false
      })),

      awakened: {
        type:      isAwakened ? awakCat : "none",
        tradition: d.concept.tradition ?? "",
        mentor:    "",
        adeptPoints: {
          total: (awakCat === "adept" || awakCat === "mysticAdept") ? d.attributes.magic : 0,
          spent: 0
        }
      },

      techno: { active: isTechno, fadingResist: 0, complexForms: [] },

      nuyen:     bp.nuyenValue,
      lifestyle: "street",

      buildPoints: { total: 400, spent: bp.totalSpent }
    };

    // ── ITEM PAYLOADS ───────────────────────────────────────────────────
    const items = [];

    // Awakened/Technomancer quality item
    if (awakCat !== "none") {
      const awakLabels = {
        magician: "Magician", adept: "Adept", mysticAdept: "Mystic Adept",
        aspected: "Aspected Magician", technomancer: "Technomancer"
      };
      items.push({
        name: awakLabels[awakCat],
        type: "quality",
        system: {
          qualityType: "positive", bpCost: AWAKENED_BP[awakCat],
          isLeveled: false, level: 1,
          effect: "Awakened or Technomancer meta-quality", source: "SR4A"
        }
      });
    }

    // Positive qualities
    for (const q of d.qualities.positive) {
      if (!q.name) continue;
      items.push({
        name: q.name, type: "quality",
        system: { qualityType: "positive", bpCost: q.bpCost, isLeveled: q.isLeveled, level: q.level, effect: q.effect ?? "", source: "SR4A" }
      });
    }

    // Negative qualities
    for (const q of d.qualities.negative) {
      if (!q.name) continue;
      items.push({
        name: q.name, type: "quality",
        system: { qualityType: "negative", bpCost: q.bpCost, isLeveled: q.isLeveled, level: q.level, effect: q.effect ?? "", source: "SR4A" }
      });
    }

    // Contacts
    for (const c of d.contacts) {
      if (!c.name) continue;
      items.push({
        name: c.name, type: "contact",
        system: { connection: c.connection, loyalty: c.loyalty, role: c.role ?? "", affiliation: "", location: "", how: "" }
      });
    }

    // ── CREATE ACTOR ────────────────────────────────────────────────────
    const actorData = {
      name:   d.actorName || d.concept.handle || "New Runner",
      type:   "character",
      system: systemData,
      items
    };

    const actor = await Actor.create(actorData, { _fromSR4Wizard: true });
    if (actor) {
      actor.sheet.render(true);
      this.close();
      ui.notifications.info(`SR4 | ${actor.name} created successfully. Welcome to the Sixth World.`);
    }
  }

  /**
   * Build the skills payload for the actor document.
   *
   * Merges group purchases and individual skill points into the final
   * skills object matching CharacterDataModel.skills schema.
   *
   * Logic:
   *   1. All skills initialize at { value: 0, specialization: "" }
   *   2. Group purchases set all member skills to group rank
   *   3. Individual purchases override if HIGHER (keeps higher of group vs individual)
   *      This matches SR4A rule: you can't "double-buy" skills already covered by a group,
   *      but you can exceed the group rank individually (which breaks the group).
   *
   * @param {object} d - Current _wizardData
   * @returns {object} Skills payload matching CharacterDataModel.skills keys
   */
  _buildSkillsPayload(d) {
    const payload = {};
    for (const key of ALL_SKILL_KEYS) {
      payload[key] = { value: 0, specialization: "" };
    }

    // Group purchases first (all members get the group rank)
    for (const [groupName, rank] of Object.entries(d.skills.groups)) {
      if (!rank) continue;
      const def = SKILL_GROUP_DEFS[groupName];
      if (!def) continue;
      for (const key of def.skills) {
        payload[key] = { value: rank, specialization: "" };
      }
    }

    // Individual purchases override if higher
    for (const [key, data] of Object.entries(d.skills.active)) {
      if (!data.value) continue;
      payload[key] = {
        value:          Math.max(payload[key]?.value ?? 0, data.value),
        specialization: data.specialization ?? ""
      };
    }

    return payload;
  }
}
