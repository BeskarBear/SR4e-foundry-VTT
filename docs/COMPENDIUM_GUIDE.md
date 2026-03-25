# Compendium Guide — SR4 Foundry VTT System

This guide explains how to add your own items to the compendium packs from your Shadowrun 4th Edition sourcebooks.

The system ships with `[Example]` template items in each core pack demonstrating the schema. You can edit, replace, or delete those and add your own.

---

## How to Add Items

**Method 1 — In Foundry (easiest):**
1. Open the Compendium tab in Foundry VTT
2. Right-click the relevant pack → **Edit**
3. Click **Create Item**, give it a name and type, fill in the fields

**Method 2 — JSON Import:**
1. Create a `.json` file matching the format below
2. In the compendium, click the **Import** button and select your file

**Method 3 — Edit `sr4-example-data.mjs` directly:**
Modify `/module/data/sr4-example-data.mjs` and rebuild. The `populate.mjs`
script runs on first GM load (or when you force a repopulate).

---

## Pack Structure

| Pack Name | Item Type | Sourcebook |
|---|---|---|
| `sr4-weapons` | weapon | SR4A Core |
| `sr4-ammo` | ammo | SR4A Core |
| `sr4-armor` | armor | SR4A Core |
| `sr4-spells` | spell | SR4A Core |
| `sr4-qualities` | quality | SR4A Core |
| `sr4-cyberware` | cyberware | SR4A Core |
| `sr4-gear` | gear | SR4A Core |
| `sr4-programs` | program | SR4A Core |
| `sr4-weapons-arsenal` | weapon | Arsenal |
| `sr4-ammo-arsenal` | ammo | Arsenal |
| `sr4-armor-arsenal` | armor | Arsenal |
| `sr4-gear-arsenal` | gear | Arsenal |
| `sr4-cyberware-augmentation` | cyberware | Augmentation |
| `sr4-programs-unwired` | program | Unwired |
| `sr4-gear-unwired` | gear | Unwired |
| `sr4-gear-streetmagic` | gear | Street Magic |
| `sr4-qualities-streetmagic` | quality | Street Magic |
| `sr4-qualities-runnerscompanion` | quality | Runner's Companion |
| `sr4-gear-runnerscompanion` | gear | Runner's Companion |

---

## Item Schemas

All items share a common Foundry wrapper:

```json
{
  "name": "Item Name",
  "type": "weapon",
  "img": "icons/weapons/guns/gun-pistol-brown.webp",
  "system": { }
}
```

The `system` object is what varies by item type.

---

### weapon

Used for all ranged weapons, melee weapons, thrown weapons, and grenades.

```json
{
  "weaponType": "ranged",
  "category":   "pistols",
  "dv":         "5P",
  "ap":         -1,
  "damageType": "physical",
  "mode":       "SA",
  "rc":         0,
  "ammo": {
    "current":            15,
    "max":                15,
    "type":               "Regular",
    "dvMod":              0,
    "apMod":              0,
    "damageTypeOverride": "none"
  },
  "reach":         0,
  "conceal":       5,
  "avail":         "4R",
  "cost":          350,
  "source":        "SR4A p.315",
  "accessories":   [],
  "recoilPenalty": 0,
  "equipped":      true,
  "description":   "",
  "notes":         ""
}
```

**Field reference:**

| Field | Type | Notes |
|---|---|---|
| `weaponType` | string | `ranged` / `melee` / `thrown` / `grenade` / `explosive` |
| `category` | string | `pistols` / `automatics` / `longarms` / `heavyWeapons` / `blades` / `clubs` / `unarmedCombat` / `exoticMelee` / `exoticRanged` / `throwingWeapons` / `grenades` / `launchers` |
| `dv` | string | Damage value — `"5P"`, `"6S"`, `"STR+2P"` |
| `ap` | integer | Armor penetration. Negative = better vs armor |
| `damageType` | string | `physical` / `stun` |
| `mode` | string | `SS` / `SA` / `BF` / `FA` — or combos like `SA/BF/FA` |
| `rc` | integer | Recoil compensation (base; accessories add more) |
| `ammo.max` | integer | Magazine capacity |
| `ammo.type` | string | Currently loaded ammo type name |
| `reach` | integer | Melee only: 0 = normal, 1 = long weapon, 2 = very long |
| `conceal` | integer | Concealability rating (higher = easier to hide) |
| `avail` | string | e.g. `"4R"` (number + optional R/F for Restricted/Forbidden) |
| `cost` | integer | Nuyen |
| `source` | string | Optional book/page reference |

---

### armor

```json
{
  "armorB":    8,
  "armorI":    6,
  "armorType": "jacket",
  "mods": [
    { "name": "Helmet", "bonusB": 2, "bonusI": 2, "notes": "" }
  ],
  "conceal":     5,
  "avail":       "4",
  "cost":        900,
  "source":      "SR4A p.325",
  "equipped":    true,
  "description": ""
}
```

| Field | Type | Notes |
|---|---|---|
| `armorB` | integer | Ballistic rating — vs firearms and projectiles |
| `armorI` | integer | Impact rating — vs melee, explosions, stun |
| `armorType` | string | `clothing` / `jacket` / `coat` / `vest` / `fullbody` / `helmet` / `shield` |
| `mods` | array | Armor modifications — each adds bonusB/bonusI |

---

### ammo

```json
{
  "ammoType":           "APDS",
  "quantity":           30,
  "dvModifier":         0,
  "apModifier":         -4,
  "damageTypeOverride": "none",
  "isElectric":         false,
  "tracerBonus":        false,
  "noAutofire":         true,
  "avail":              "8F",
  "cost":               70,
  "perRounds":          10,
  "source":             "SR4A p.162",
  "description":        ""
}
```

| Field | Type | Notes |
|---|---|---|
| `ammoType` | string | `Regular` / `APDS` / `Explosive` / `Frangible` / `Gel Rounds` / `Hollow Point` / `Stick-n-Shock` / `Tracer` / `Subsonic` / `Injection` / `White Phosphorus` / `Custom` / `AV` / `Capsule` / `ExEx` / `Hi-C Plastique` / `Silver` / `Tracker` |
| `dvModifier` | integer | Added to weapon DV when loaded (+/–) |
| `apModifier` | integer | Added to weapon AP when loaded (negative = better) |
| `damageTypeOverride` | string | `none` / `physical` / `stun` — overrides weapon's damage type |
| `isElectric` | boolean | Stick-n-Shock style electric damage |
| `noAutofire` | boolean | APDS cannot be used in BF/FA modes (RAW) |
| `perRounds` | integer | How many rounds per cost unit (e.g. 10 rounds per 70¥) |

---

### spell

```json
{
  "category":    "Combat",
  "spellType":   "Mana",
  "range":       "LOS",
  "damageType":  "stun",
  "duration":    "Instant",
  "drain":       "(F÷2)+2",
  "descriptor":  "direct",
  "source":      "SR4A p.204",
  "description": "",
  "sustained":   false,
  "force":       0
}
```

| Field | Type | Notes |
|---|---|---|
| `category` | string | `Combat` / `Detection` / `Health` / `Illusion` / `Manipulation` |
| `spellType` | string | `Mana` (resisted by Willpower) / `Physical` (resisted by Body) / `Active` / `Passive` / `Direct` / `Indirect` |
| `range` | string | `LOS` / `Touch` / `LOS (A)` (area) / `Special` |
| `damageType` | string | `none` / `physical` / `stun` — for combat spells |
| `duration` | string | `Instant` / `Sustained` / `Permanent` |
| `drain` | string | Drain value formula, e.g. `"(F÷2)+2"` |
| `sustained` | boolean | Is this spell currently being sustained? (+2 to all pools while true) |
| `force` | integer | Currently cast at this Force (0 = not cast) |

---

### quality

```json
{
  "qualityType": "positive",
  "bpCost":      10,
  "effect":      "+2 dice to [skill/situation]",
  "isLeveled":   false,
  "level":       1,
  "source":      "SR4A p.89",
  "description": ""
}
```

| Field | Type | Notes |
|---|---|---|
| `qualityType` | string | `positive` (costs BP) / `negative` (refunds BP) |
| `bpCost` | integer | BP cost (positive) or BP refund (negative) per level |
| `isLeveled` | boolean | True if quality has multiple levels (totalBP = bpCost × level) |
| `level` | integer | Current level, 1–4 |

---

### cyberware

```json
{
  "wareType":     "cyber",
  "grade":        "standard",
  "essenceCost":  1.0,
  "category":     "augmentation",
  "statBonuses":  [
    { "stat": "reaction", "bonus": 1 }
  ],
  "capacityTotal": 0,
  "capacityUsed":  0,
  "avail":         "8R",
  "cost":          55000,
  "source":        "SR4A p.342",
  "installed":     true,
  "description":   "",
  "notes":         ""
}
```

| Field | Type | Notes |
|---|---|---|
| `wareType` | string | `cyber` / `bio` / `nano` / `gene` / `cultured` — bioware halves Essence cost automatically |
| `grade` | string | `used` (×1.25 Ess) / `standard` (×1.0) / `alpha` (×0.8) / `beta` (×0.7) / `delta` (×0.5) |
| `essenceCost` | number | Base Essence before grade multiplier |
| `category` | string | `augmentation` / `headware` / `eyeware` / `earware` / `bodyware` / `cyberLimb` / `bioware` etc. |
| `statBonuses` | array | `{ stat: "reaction", bonus: 1 }` — for display; effects handle actual bonuses |

**Essence calculation** (handled automatically by the data model):

```
actualEssence = essenceCost × gradeMultiplier × (0.5 if bioware, else 1.0)
```

---

### gear

Catch-all for electronics, commlinks, explosives, medical supplies, documents, etc.

```json
{
  "category":   "commlink",
  "quantity":   1,
  "rating":     4,
  "avail":      "8",
  "cost":       3000,
  "source":     "SR4A p.320",
  "isCommlink": true,
  "commlink": {
    "response": 4,
    "signal":   3,
    "system":   4,
    "firewall": 3
  },
  "equipped":    true,
  "description": "",
  "notes":       ""
}
```

| Field | Type | Notes |
|---|---|---|
| `category` | string | `electronics` / `commlink` / `software` / `surveillance` / `breaking` / `medical` / `disguise` / `explosives` / `survival` / `docsForgery` / `credstick` / `weaponMod` / `matrixHardware` / `security` / `drone` / `skillsoft` / `focus` / `reagent` / `magicSupplies` |
| `rating` | integer | General-purpose rating (skill bonus, quality level, etc.) |
| `isCommlink` | boolean | Shows the Matrix stats block when true |
| `commlink.response` | integer | Limits Matrix Initiative and simultaneous active programs |
| `commlink.signal` | integer | Wireless range (1=10m, 3=100m, 5=1km, 7=10km, 9=100km) |
| `commlink.system` | integer | Limits max rating of installed programs |
| `commlink.firewall` | integer | Defense against hacking and Matrix attacks |

---

### program

```json
{
  "programType":  "hacking",
  "rating":       4,
  "active":       false,
  "linkedSkill":  "Hacking",
  "poolBonus":    4,
  "agentSkills":  [],
  "avail":        "8F",
  "cost":         2000,
  "source":       "SR4A p.228",
  "description":  ""
}
```

| Field | Type | Notes |
|---|---|---|
| `programType` | string | `commonUse` / `hacking` / `security` / `agent` / `tactical` |
| `rating` | integer | Dice pool bonus; capped by commlink's Response or System |
| `active` | boolean | Currently loaded/running |
| `linkedSkill` | string | Which skill this adds dice to (e.g. `"Hacking"`, `"Cybercombat"`) |
| `poolBonus` | integer | Usually = rating |
| `agentSkills` | array | For agent programs: `{ skill: "Hacking", value: 4 }` |

---

## Example JSON File (for import)

You can create a `.json` file and import it directly into a compendium. Format:

```json
[
  {
    "name": "My Pistol",
    "type": "weapon",
    "img": "icons/weapons/guns/gun-pistol-brown.webp",
    "system": {
      "weaponType": "ranged",
      "category": "pistols",
      "dv": "5P",
      "ap": -1,
      "damageType": "physical",
      "mode": "SA",
      "rc": 0,
      "ammo": { "current": 15, "max": 15, "type": "Regular", "dvMod": 0, "apMod": 0, "damageTypeOverride": "none" },
      "reach": 0,
      "conceal": 5,
      "avail": "4R",
      "cost": 350,
      "source": "SR4A p.315",
      "accessories": [],
      "recoilPenalty": 0,
      "equipped": true,
      "description": "",
      "notes": ""
    }
  }
]
```

---

## Foundry Icon Paths

Foundry ships with a large icon library. Useful paths:

```
icons/weapons/guns/gun-pistol-brown.webp
icons/weapons/guns/gun-rifle-sniper.webp
icons/weapons/guns/gun-pistol-flintlock.webp
icons/weapons/daggers/dagger-curved.webp
icons/weapons/clubs/club-baton-winged.webp
icons/weapons/ammunition/bullets-cartridge-shell.webp
icons/equipment/chest/vest-leather-armor-black.webp
icons/equipment/chest/breastplate-steel-grey.webp
icons/magic/lightning/bolt-blue.webp
icons/magic/fire/flame-burning-orange.webp
icons/magic/life/cross-green-white.webp
icons/magic/symbols/star-glowing-yellow.webp
icons/magic/symbols/rune-glowing-blue.webp
icons/tools/medical/syringe-needle-red.webp
icons/sundries/documents/document-paper-grey-rolls.webp
```

Browse the full library in Foundry via the **File Browser** (any image field → click the folder icon).
