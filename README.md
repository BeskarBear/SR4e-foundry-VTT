# Shadowrun 4th Edition — Foundry VTT System

An unofficial, fan-made Foundry VTT game system for **Shadowrun 4th Edition 20th Anniversary** (SR4A).

> **Disclaimer:** Shadowrun is a registered trademark of The Topps Company, Inc. Catalyst Game Labs holds the exclusive tabletop license. This project is not affiliated with, endorsed by, or sponsored by Topps or Catalyst Game Labs. No copyrighted game content is included in this distribution. Users must own the relevant Shadowrun sourcebooks to populate the compendiums.

Built from scratch using Foundry v12/v13 ApplicationV2 architecture with modern ES6 DataModels.

---

## Features

- **5 actor types**: character (full PC sheet), npc, spirit, sprite, vehicle
- **10 item types**: weapon, armor, cyberware, ammo, spell, adeptpower, program, quality, contact, gear
- **SR4Roll dice engine**: pool building, hit counting (5s/6s), glitch/critical glitch detection, Rule of Six (Edge), initiative rolls (summed d6)
- **Character creation wizard**: 400 BP build point system — metatype, attributes, skills, qualities, contacts
- **19 empty compendium packs**: structure for SR4A Core + Arsenal, Augmentation, Unwired, Street Magic, Runner's Companion (user-populated)
- **Cyberpunk dark/neon CSS theme**

---

## Compendiums

The compendium packs ship **empty**. Item names, stats, and game content from Shadowrun sourcebooks are copyrighted material owned by The Topps Company, Inc. and cannot be bundled with this system.

To populate the compendiums, create items manually through Foundry VTT's item creation interface. The item data schemas match:

| Pack | Sourcebook |
|---|---|
| Weapons, Ammo, Armor, Spells, Qualities, Cyberware, Gear, Programs | SR4A Core Rulebook (CAT2600A) |
| Weapons, Ammo, Armor, Gear | Arsenal |
| Cyberware | Augmentation |
| Programs, Gear | Unwired |
| Gear, Qualities | Street Magic |
| Qualities, Gear | Runner's Companion |

---

## Compatibility

| Foundry VTT | Status |
|---|---|
| v13 | Verified |
| v12 | Supported |

---

## Installation

**Manual install** — paste this manifest URL in Foundry's system installer:

```
(add your manifest URL after uploading to GitHub)
```

**Local dev** — clone and symlink into your Foundry data directory:

```bash
git clone https://github.com/YOUR_USERNAME/sr4-system.git
ln -s $(pwd)/sr4-system ~/.local/share/FoundryVTT/Data/systems/sr4
```

---

## SR4Roll API

```javascript
// Basic pool roll
const roll = new SR4Roll(12, { rollLabel: "Pistols Attack" });
await roll.evaluate();
await roll.toMessage();

// With Edge (Rule of Six)
const edgeRoll = new SR4Roll(8, { edge: true, threshold: 3 });

// Static factory — handles defaulting automatically
const roll = await SR4Roll.rollPool(skillValue, attrValue, { rollLabel: "Hacking" });

// Buy hits (every 4 dice = 1 hit, no glitch risk)
const { hits } = SR4Roll.buyHits(12); // → 3 hits

// Initiative (dice are summed, not counted for hits)
const { score } = await SR4Roll.rollInitiative(reactionPlusIntuition, numDice);
```

---

## Project Structure

```
sr4-system/
├── system.json              # Manifest
├── LICENSE                  # GPL-3.0
├── module/
│   ├── sr4.mjs              # Entry point
│   ├── data/                # DataModel classes (no compendium data)
│   ├── dice/sr4-roll.mjs    # SR4Roll dice engine
│   ├── sheets/              # Actor/Item sheet classes
│   ├── apps/                # CharacterWizard, FireModeDialog, PoolBuilder
│   ├── combat/              # SR4Combat initiative tracker
│   └── compendiums/         # populate.mjs (no-op stub)
├── templates/               # Handlebars templates
├── styles/sr4.css           # Dark neon theme
├── lang/en.json             # Localization
└── packs/                   # Empty compendium directories
```

---

## License

System code: **GPL-3.0** — see `LICENSE`.

*Shadowrun* is a registered trademark of The Topps Company, Inc. All Shadowrun content, game mechanics text, setting material, artwork, and item data are the property of their respective copyright holders and are **not included** in this distribution.
