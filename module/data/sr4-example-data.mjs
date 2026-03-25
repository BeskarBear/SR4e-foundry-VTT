/**
 * SR4 Foundry VTT — Example Compendium Data
 *
 * These are generic template items that ship with the system to demonstrate
 * the data schema for each item type. They use placeholder names and stats.
 *
 * Replace or delete these via Foundry's compendium editor once you have
 * real entries from your sourcebooks.
 *
 * NAMING CONVENTION: All example items are prefixed with "[Example]" so
 * they are easy to identify and remove.
 *
 * ─── SCHEMA QUICK REFERENCE ─────────────────────────────────────────────────
 *
 * weapon  → { weaponType, category, dv, ap, damageType, mode, rc, ammo{current,max,type},
 *             reach, conceal, avail, cost, source, accessories[], recoilPenalty,
 *             equipped, description, notes }
 *
 * armor   → { armorB, armorI, armorType, mods[], conceal, avail, cost, source,
 *             equipped, description }
 *
 * ammo    → { ammoType, quantity, dvModifier, apModifier, damageTypeOverride,
 *             isElectric, tracerBonus, noAutofire, avail, cost, perRounds,
 *             source, description }
 *
 * spell   → { category, spellType, range, damageType, duration, drain,
 *             descriptor, source, description, sustained, force }
 *
 * quality → { qualityType, bpCost, effect, isLeveled, level, source, description }
 *
 * cyberware → { wareType, grade, essenceCost, category, statBonuses[],
 *               capacityTotal, capacityUsed, avail, cost, source,
 *               installed, description, notes }
 *
 * gear    → { category, quantity, rating, avail, cost, source, isCommlink,
 *             commlink{response,signal,system,firewall}, equipped,
 *             description, notes }
 *
 * program → { programType, rating, active, linkedSkill, poolBonus,
 *             agentSkills[], avail, cost, source, description }
 * ────────────────────────────────────────────────────────────────────────────
 */

// ── WEAPONS ──────────────────────────────────────────────────────────────────

export const EXAMPLE_WEAPONS = [
  {
    name: "[Example] Light Pistol",
    type: "weapon",
    img: "icons/weapons/guns/gun-pistol-brown.webp",
    system: {
      weaponType:    "ranged",
      category:      "pistols",
      dv:            "4P",          // Damage Value — number + P(hysical) or S(tun)
      ap:            0,             // Armor Penetration — negative = better vs armor
      damageType:    "physical",
      mode:          "SA",          // SS / SA / BF / FA — Single Shot / Semi-Auto / Burst / Full Auto
      rc:            0,             // Recoil Compensation
      ammo: {
        current:     10,
        max:         10,
        type:        "Regular",
        dvMod:       0,
        apMod:       0,
        damageTypeOverride: "none"
      },
      reach:         0,             // Melee only — 0 for ranged
      conceal:       6,             // Concealability — higher = easier to hide
      avail:         "2",           // Availability — number + optional R(estricted)/F(orbidden)
      cost:          150,           // Nuyen
      source:        "",            // e.g. "SR4A p.315" — fill from your own book
      accessories:   [],
      recoilPenalty: 0,
      equipped:      true,
      description:   "<p>A compact, lightweight pistol. Good concealability, modest stopping power.</p>",
      notes:         "Template — replace stats from your sourcebook."
    }
  },
  {
    name: "[Example] Heavy Pistol",
    type: "weapon",
    img: "icons/weapons/guns/gun-pistol-brown.webp",
    system: {
      weaponType:    "ranged",
      category:      "pistols",
      dv:            "5P",
      ap:            -1,
      damageType:    "physical",
      mode:          "SA",
      rc:            0,
      ammo: {
        current:     15,
        max:         15,
        type:        "Regular",
        dvMod:       0,
        apMod:       0,
        damageTypeOverride: "none"
      },
      reach:         0,
      conceal:       5,
      avail:         "4R",
      cost:          350,
      source:        "",
      accessories:   [],
      recoilPenalty: 0,
      equipped:      true,
      description:   "<p>The standard heavy pistol. Reliable, high-stopping-power sidearm. Restricted availability in most jurisdictions.</p>",
      notes:         "Template — replace stats from your sourcebook."
    }
  },
  {
    name: "[Example] Assault Rifle",
    type: "weapon",
    img: "icons/weapons/guns/gun-rifle-sniper.webp",
    system: {
      weaponType:    "ranged",
      category:      "longarms",
      dv:            "6P",
      ap:            -1,
      damageType:    "physical",
      mode:          "SA/BF/FA",    // Multiple modes — runner's choice each turn
      rc:            2,
      ammo: {
        current:     30,
        max:         30,
        type:        "Regular",
        dvMod:       0,
        apMod:       0,
        damageTypeOverride: "none"
      },
      reach:         0,
      conceal:       1,             // Low — can't hide a rifle
      avail:         "6R",
      cost:          1200,
      source:        "",
      accessories:   [],
      recoilPenalty: 0,
      equipped:      false,
      description:   "<p>Full-sized assault rifle. Versatile fire modes. Difficult to conceal.</p>",
      notes:         "Template — replace stats from your sourcebook."
    }
  },
  {
    name: "[Example] Combat Knife",
    type: "weapon",
    img: "icons/weapons/daggers/dagger-curved.webp",
    system: {
      weaponType:    "melee",
      category:      "blades",
      dv:            "STR+1P",      // Melee DV often uses STR attribute
      ap:            -1,
      damageType:    "physical",
      mode:          "SS",          // Not applicable for melee but required field
      rc:            0,
      ammo: { current: 0, max: 0, type: "—", dvMod: 0, apMod: 0, damageTypeOverride: "none" },
      reach:         0,             // 0 = standard reach; 1+ = long weapons
      conceal:       6,
      avail:         "2",
      cost:          30,
      source:        "",
      accessories:   [],
      recoilPenalty: 0,
      equipped:      true,
      description:   "<p>Standard fighting knife. DV = Strength + 1. Concealable.</p>",
      notes:         "Template — replace stats from your sourcebook."
    }
  },
  {
    name: "[Example] Stun Baton",
    type: "weapon",
    img: "icons/weapons/clubs/club-baton-winged.webp",
    system: {
      weaponType:    "melee",
      category:      "clubs",
      dv:            "STR+2S",      // Stun damage
      ap:            0,
      damageType:    "stun",        // Stun — fills Stun CM, not Physical
      mode:          "SS",
      rc:            0,
      ammo: { current: 0, max: 0, type: "—", dvMod: 0, apMod: 0, damageTypeOverride: "none" },
      reach:         1,
      conceal:       4,
      avail:         "4R",
      cost:          750,
      source:        "",
      accessories:   [],
      recoilPenalty: 0,
      equipped:      false,
      description:   "<p>Electric stun weapon. Deals Stun damage only. Reach 1.</p>",
      notes:         "Template — replace stats from your sourcebook."
    }
  }
];

// ── AMMUNITION ────────────────────────────────────────────────────────────────

export const EXAMPLE_AMMO = [
  {
    name: "[Example] Regular Ammo",
    type: "ammo",
    img: "icons/weapons/ammunition/bullets-cartridge-shell.webp",
    system: {
      ammoType:            "Regular",
      quantity:            30,
      dvModifier:          0,         // Added to weapon's DV when loaded
      apModifier:          0,         // Added to weapon's AP when loaded
      damageTypeOverride:  "none",    // Override to "stun" for gel/shock rounds
      isElectric:          false,
      tracerBonus:         false,
      noAutofire:          false,
      avail:               "—",
      cost:                10,        // Per box of perRounds rounds
      perRounds:           10,
      source:              "",
      description:         "Standard factory ammunition. No stat modifiers."
    }
  },
  {
    name: "[Example] Armor-Piercing Ammo",
    type: "ammo",
    img: "icons/weapons/ammunition/bullets-cartridge-shell.webp",
    system: {
      ammoType:            "APDS",
      quantity:            30,
      dvModifier:          0,
      apModifier:          -4,        // Negative AP = better penetration
      damageTypeOverride:  "none",
      isElectric:          false,
      tracerBonus:         false,
      noAutofire:          true,      // APDS cannot be used in BF/FA modes (RAW)
      avail:               "8F",
      cost:                70,
      perRounds:           10,
      source:              "",
      description:         "Armor-Defeating Discarding Sabot. -4 AP. Cannot be used in burst or full-auto modes."
    }
  },
  {
    name: "[Example] Gel Rounds",
    type: "ammo",
    img: "icons/weapons/ammunition/bullets-cartridge-shell.webp",
    system: {
      ammoType:            "Gel Rounds",
      quantity:            30,
      dvModifier:          -1,        // Slightly weaker
      apModifier:          0,
      damageTypeOverride:  "stun",    // Always Stun regardless of weapon
      isElectric:          false,
      tracerBonus:         false,
      noAutofire:          false,
      avail:               "2",
      cost:                25,
      perRounds:           10,
      source:              "",
      description:         "Non-lethal gel ammunition. -1 DV, converts all damage to Stun."
    }
  }
];

// ── ARMOR ─────────────────────────────────────────────────────────────────────

export const EXAMPLE_ARMOR = [
  {
    name: "[Example] Concealable Vest",
    type: "armor",
    img: "icons/equipment/chest/vest-cloth-tattered.webp",
    system: {
      armorB:      4,         // Ballistic — vs firearms / projectiles
      armorI:      2,         // Impact — vs melee / explosions / stun
      armorType:   "vest",
      mods:        [],        // Armor mods that add bonuses: { name, bonusB, bonusI, notes }
      conceal:     8,         // High — can wear under clothing
      avail:       "4",
      cost:        250,
      source:      "",
      equipped:    false,
      description: "<p>Concealable body armor worn under normal clothing. Moderate ballistic protection.</p>"
    }
  },
  {
    name: "[Example] Armored Jacket",
    type: "armor",
    img: "icons/equipment/chest/vest-leather-armor-black.webp",
    system: {
      armorB:      8,
      armorI:      6,
      armorType:   "jacket",
      mods:        [],
      conceal:     5,
      avail:       "4",
      cost:        900,
      source:      "",
      equipped:    true,
      description: "<p>Street-level armored jacket. The most popular all-around armor for shadowrunners.</p>"
    }
  },
  {
    name: "[Example] Full Body Armor",
    type: "armor",
    img: "icons/equipment/chest/breastplate-steel-grey.webp",
    system: {
      armorB:      16,
      armorI:      14,
      armorType:   "fullbody",
      mods:        [
        { name: "Helmet", bonusB: 2, bonusI: 2, notes: "Full-face protection" }
      ],
      conceal:     1,
      avail:       "12R",
      cost:        11000,
      source:      "",
      equipped:    false,
      description: "<p>Heavy military-grade full body armor. Excellent protection, zero concealability.</p>"
    }
  }
];

// ── SPELLS ────────────────────────────────────────────────────────────────────

export const EXAMPLE_SPELLS = [
  {
    name: "[Example] Direct Combat Spell (Mana)",
    type: "spell",
    img: "icons/magic/lightning/bolt-blue.webp",
    system: {
      category:    "Combat",
      spellType:   "Mana",        // Mana = affects living things; resisted with Willpower
      range:       "LOS",         // Line of Sight — caster must see target
      damageType:  "stun",        // Direct mana bolt → usually Stun
      duration:    "Instant",     // Instant / Sustained / Permanent
      drain:       "(F÷2)+2",     // Drain Value formula — F = Force
      descriptor:  "direct",
      source:      "",
      description: "<p>Direct combat spell affecting the target's life force. Resisted with Willpower + Body. Deals Stun damage.</p>",
      sustained:   false,
      force:       0
    }
  },
  {
    name: "[Example] Indirect Combat Spell (Physical)",
    type: "spell",
    img: "icons/magic/fire/flame-burning-orange.webp",
    system: {
      category:    "Combat",
      spellType:   "Physical",    // Physical = affects matter; resisted with Body
      range:       "LOS",
      damageType:  "physical",
      duration:    "Instant",
      drain:       "(F÷2)+3",     // Higher drain for more destructive spells
      descriptor:  "indirect",
      source:      "",
      description: "<p>Indirect elemental attack. Creates a physical manifestation (fire, lightning, etc.). Resisted with Body + armor.</p>",
      sustained:   false,
      force:       0
    }
  },
  {
    name: "[Example] Detection Spell (Active)",
    type: "spell",
    img: "icons/magic/perception/eye-ringed-green.webp",
    system: {
      category:    "Detection",
      spellType:   "Active",
      range:       "LOS (A)",     // Area — affects a zone
      damageType:  "none",
      duration:    "Sustained",   // Must sustain — costs +2 to all dice pools while active
      drain:       "(F÷2)",
      descriptor:  "",
      source:      "",
      description: "<p>Sustained detection spell. Reveals information about targets or environment. +2 TN to all other tests while sustained.</p>",
      sustained:   false,
      force:       0
    }
  },
  {
    name: "[Example] Health Spell",
    type: "spell",
    img: "icons/magic/life/cross-green-white.webp",
    system: {
      category:    "Health",
      spellType:   "Mana",
      range:       "Touch",
      damageType:  "none",
      duration:    "Permanent",
      drain:       "(F÷2)+2",
      descriptor:  "healing",
      source:      "",
      description: "<p>Heals Physical damage. Net hits reduce damage boxes. Can only be applied once per wound — further healing requires mundane medicine.</p>",
      sustained:   false,
      force:       0
    }
  },
  {
    name: "[Example] Manipulation Spell",
    type: "spell",
    img: "icons/magic/control/buff-flight-wings-blue.webp",
    system: {
      category:    "Manipulation",
      spellType:   "Physical",
      range:       "LOS",
      damageType:  "none",
      duration:    "Sustained",
      drain:       "(F÷2)+1",
      descriptor:  "environmental",
      source:      "",
      description: "<p>Manipulates physical matter or forces. Effect depends on specific spell — levitate objects, control weather, etc.</p>",
      sustained:   false,
      force:       0
    }
  }
];

// ── QUALITIES ─────────────────────────────────────────────────────────────────

export const EXAMPLE_QUALITIES = [
  {
    name: "[Example] Positive Quality (5 BP)",
    type: "quality",
    img: "icons/magic/symbols/star-glowing-yellow.webp",
    system: {
      qualityType: "positive",
      bpCost:      5,             // Build Points spent during character creation
      effect:      "+2 dice to [specific skill or situation]",
      isLeveled:   false,
      level:       1,
      source:      "",
      description: "<p>Template positive quality. Replace name, effect, and BP cost from your sourcebook.</p>"
    }
  },
  {
    name: "[Example] Positive Quality (Leveled, 10 BP/level)",
    type: "quality",
    img: "icons/magic/symbols/star-glowing-yellow.webp",
    system: {
      qualityType: "positive",
      bpCost:      10,
      effect:      "Effect scales with level (e.g. +1 die per level to [skill])",
      isLeveled:   true,
      level:       1,            // Current level (1–4 typically)
      source:      "",
      description: "<p>Template leveled positive quality. Total BP cost = bpCost × level. Replace from your sourcebook.</p>"
    }
  },
  {
    name: "[Example] Negative Quality (–5 BP)",
    type: "quality",
    img: "icons/magic/symbols/triangle-red.webp",
    system: {
      qualityType: "negative",
      bpCost:      5,            // BP refunded at character creation
      effect:      "-2 dice to [specific skill or situation]",
      isLeveled:   false,
      level:       1,
      source:      "",
      description: "<p>Template negative quality. Refunds BP during character creation. Replace from your sourcebook.</p>"
    }
  }
];

// ── CYBERWARE ─────────────────────────────────────────────────────────────────

export const EXAMPLE_CYBERWARE = [
  {
    name: "[Example] Reaction Enhancer",
    type: "cyberware",
    img: "icons/equipment/hand/glove-worn-torn.webp",
    system: {
      wareType:       "cyber",
      grade:          "standard",   // used / standard / alpha / beta / delta
      essenceCost:    0.3,          // Base Essence cost (before grade multiplier)
      category:       "augmentation",
      statBonuses:    [
        { stat: "reaction", bonus: 1 }  // Each instance adds +1 Reaction
      ],
      capacityTotal:  0,
      capacityUsed:   0,
      avail:          "8",
      cost:           14000,
      source:         "",
      installed:      true,
      description:    "<p>Enhances neural pathways for faster reaction speed. +1 Reaction per level. Stackable up to rating 3.</p>",
      notes:          "Template — verify Essence cost and grade multipliers from your sourcebook.\n\nGrade multipliers: Used ×1.25 | Standard ×1.0 | Alpha ×0.8 | Beta ×0.7 | Delta ×0.5"
    }
  },
  {
    name: "[Example] Cyberware Weapon (Retractable)",
    type: "cyberware",
    img: "icons/weapons/daggers/dagger-broad-brown.webp",
    system: {
      wareType:       "cyber",
      grade:          "standard",
      essenceCost:    0.35,
      category:       "bodyware",
      statBonuses:    [],
      capacityTotal:  0,
      capacityUsed:   0,
      avail:          "6R",
      cost:           16000,
      source:         "",
      installed:      true,
      description:    "<p>Retractable cyberware weapon. Uses Unarmed Combat skill. Deals Physical damage. Concealable when retracted.</p>",
      notes:          "Template — add a separate weapon item for the actual attack stats."
    }
  },
  {
    name: "[Example] Bioware Enhancement",
    type: "cyberware",
    img: "icons/magic/life/heart-red-strong.webp",
    system: {
      wareType:       "bio",        // Bioware — half Essence cost vs equivalent cyber
      grade:          "standard",
      essenceCost:    0.3,          // Bio halves this automatically in the data model
      category:       "bioware",
      statBonuses:    [
        { stat: "body", bonus: 1 }
      ],
      capacityTotal:  0,
      capacityUsed:   0,
      avail:          "6",
      cost:           50000,
      source:         "",
      installed:      true,
      description:    "<p>Bioware body enhancement. Costs half the Essence of equivalent cyberware. Less detectable by cyberware scanners.</p>",
      notes:          "Template — wareType 'bio' automatically halves Essence cost in the data model."
    }
  }
];

// ── GEAR ──────────────────────────────────────────────────────────────────────

export const EXAMPLE_GEAR = [
  {
    name: "[Example] Basic Commlink",
    type: "gear",
    img: "icons/tools/hand/trophy-cup-silver.webp",
    system: {
      category:    "commlink",
      quantity:    1,
      rating:      0,
      avail:       "—",
      cost:        100,
      source:      "",
      isCommlink:  true,           // Enables the commlink stats block
      commlink: {
        response:  1,              // Limits Matrix Initiative and programs running
        signal:    1,              // Range — 1 = 10m, 3 = 100m, 5 = 1km, etc.
        system:    1,              // Limits rating of programs the OS can run
        firewall:  1               // Defense against Matrix attacks and hacking
      },
      equipped:    true,
      description: "<p>Entry-level commlink. Low stats but cheap and easily available. Replace Response/Signal/System/Firewall with values from your sourcebook.</p>",
      notes:       "Template — commlink stats from your sourcebook."
    }
  },
  {
    name: "[Example] Mid-Grade Commlink",
    type: "gear",
    img: "icons/tools/hand/trophy-cup-gold.webp",
    system: {
      category:    "commlink",
      quantity:    1,
      rating:      0,
      avail:       "4",
      cost:        2000,
      source:      "",
      isCommlink:  true,
      commlink: {
        response:  3,
        signal:    3,
        system:    3,
        firewall:  3
      },
      equipped:    false,
      description: "<p>Mid-range commlink. Balanced stats for everyday use.</p>",
      notes:       "Template — replace stats from your sourcebook."
    }
  },
  {
    name: "[Example] Medkit",
    type: "gear",
    img: "icons/tools/medical/syringe-needle-red.webp",
    system: {
      category:    "medical",
      quantity:    1,
      rating:      6,              // Rating adds to First Aid dice pool
      avail:       "2",
      cost:        1500,
      source:      "",
      isCommlink:  false,
      commlink:    { response: 0, signal: 0, system: 0, firewall: 0 },
      equipped:    true,
      description: "<p>Medical supply kit. Rating adds to First Aid tests. Supplies depleted with use — rating tracks remaining uses.</p>",
      notes:       ""
    }
  },
  {
    name: "[Example] Fake SIN (Identity Document)",
    type: "gear",
    img: "icons/sundries/documents/document-paper-grey-rolls.webp",
    system: {
      category:    "docsForgery",
      quantity:    1,
      rating:      4,              // Rating = quality of forgery; checked against scanner
      avail:       "12F",
      cost:        10000,
      source:      "",
      isCommlink:  false,
      commlink:    { response: 0, signal: 0, system: 0, firewall: 0 },
      equipped:    false,
      description: "<p>Fake System Identification Number (SIN). Rating 4 — passes most civilian scanners. Corporate scanners may be more thorough.</p>",
      notes:       ""
    }
  }
];

// ── PROGRAMS ─────────────────────────────────────────────────────────────────

export const EXAMPLE_PROGRAMS = [
  {
    name: "[Example] Browse (Common Use)",
    type: "program",
    img: "icons/magic/symbols/rune-glowing-blue.webp",
    system: {
      programType:  "commonUse",
      rating:       3,              // Rating = dice pool bonus and cap
      active:       false,          // Loaded into commlink's active memory?
      linkedSkill:  "Computer",     // Which skill this assists
      poolBonus:    3,              // Typically = rating
      agentSkills:  [],
      avail:        "—",
      cost:         0,              // Common Use programs are often free
      source:       "",
      description:  "<p>Common Use data search and browsing program. Adds Rating dice to Computer + Browse extended tests when searching for data.</p>"
    }
  },
  {
    name: "[Example] Attack Program (Hacking)",
    type: "program",
    img: "icons/magic/lightning/bolt-orange.webp",
    system: {
      programType:  "hacking",
      rating:       4,
      active:       false,
      linkedSkill:  "Cybercombat",  // Cybercombat + Attack vs Response + Firewall
      poolBonus:    4,
      agentSkills:  [],
      avail:        "8F",           // Most hacking programs are Forbidden
      cost:         1000,
      source:       "",
      description:  "<p>Offensive Matrix program. Adds Rating dice to Cybercombat attacks. Each box of Matrix damage = 1 box Stun to target (hot-sim) or program damage.</p>"
    }
  },
  {
    name: "[Example] Exploit (Hacking)",
    type: "program",
    img: "icons/magic/symbols/rune-glowing-orange.webp",
    system: {
      programType:  "hacking",
      rating:       4,
      active:       false,
      linkedSkill:  "Hacking",      // Hacking + Exploit for Hack on the Fly
      poolBonus:    4,
      agentSkills:  [],
      avail:        "8F",
      cost:         2000,
      source:       "",
      description:  "<p>Core intrusion program. Used in Hack on the Fly (extended test vs. target's System + Firewall) and Probe the Target operations.</p>"
    }
  }
];
