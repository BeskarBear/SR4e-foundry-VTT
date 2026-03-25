/**
 * Compendium population — seeds example/template items on first load.
 *
 * The pre-populated book content (exact weapon names, spell stats, cyberware
 * costs, etc.) has been removed from this distribution to respect Catalyst
 * Game Labs' intellectual property rights. Shadowrun is a registered trademark
 * of The Topps Company, Inc.
 *
 * Instead, each core compendium pack is seeded with clearly-labeled [Example]
 * items that demonstrate the data schema. Replace or supplement these with
 * your own entries from your sourcebooks.
 *
 * Supplement packs (sr4-*-arsenal, sr4-cyberware-augmentation, etc.) are left
 * completely empty — they exist for users who want to organise their own data
 * by sourcebook.
 *
 * HOW TO ADD YOUR OWN ITEMS:
 *   1. Open the compendium (Compendium tab → right-click → Edit)
 *   2. Click "Create Item" and fill in the fields, or use the Import button
 *      to load items from a JSON file
 *
 * Full schema reference: docs/COMPENDIUM_GUIDE.md
 */

import {
  EXAMPLE_WEAPONS, EXAMPLE_AMMO, EXAMPLE_ARMOR,
  EXAMPLE_SPELLS, EXAMPLE_QUALITIES, EXAMPLE_CYBERWARE,
  EXAMPLE_GEAR, EXAMPLE_PROGRAMS
} from "../data/sr4-example-data.mjs";

const CURRENT_VERSION = "0.2.0";

// Only core packs get example items. Supplement packs are left empty.
const PACK_MAP = {
  "sr4-weapons":   EXAMPLE_WEAPONS,
  "sr4-ammo":      EXAMPLE_AMMO,
  "sr4-armor":     EXAMPLE_ARMOR,
  "sr4-spells":    EXAMPLE_SPELLS,
  "sr4-qualities": EXAMPLE_QUALITIES,
  "sr4-cyberware": EXAMPLE_CYBERWARE,
  "sr4-gear":      EXAMPLE_GEAR,
  "sr4-programs":  EXAMPLE_PROGRAMS
};

/**
 * Populate core compendium packs with schema example items.
 * Runs once per world when compendiumVersion doesn't match CURRENT_VERSION.
 */
export async function populateCompendiums({ force = false } = {}) {
  if (!game.user.isGM) return;

  const storedVersion = game.settings.get("sr4", "compendiumVersion");
  if (!force && storedVersion === CURRENT_VERSION) return;

  ui.notifications.info("SR4 | Loading example compendium items…");

  let totalCreated = 0;

  for (const [packName, data] of Object.entries(PACK_MAP)) {
    const collectionId = `sr4.${packName}`;
    const pack = game.packs.get(collectionId);
    if (!pack) {
      console.warn(`SR4 | Pack "${collectionId}" not found.`);
      continue;
    }

    const wasLocked = pack.locked;
    if (wasLocked) await pack.configure({ locked: false });
    await pack.getIndex();

    if ((force || storedVersion !== CURRENT_VERSION) && pack.index.size > 0) {
      const ids = pack.index.map(e => e._id);
      await pack.documentClass.deleteDocuments(ids, { pack: collectionId });
      await pack.getIndex();
    }

    if (!force && pack.index.size > 0) {
      if (wasLocked) await pack.configure({ locked: true });
      continue;
    }

    try {
      const created = await pack.documentClass.createDocuments(data, {
        pack: collectionId,
        keepId: false
      });
      totalCreated += created.length;
      console.log(`SR4 | Seeded ${created.length} example items into "${packName}".`);
    } catch (err) {
      console.error(`SR4 | Failed to seed "${packName}":`, err);
    }

    if (wasLocked) await pack.configure({ locked: true });
  }

  await game.settings.set("sr4", "compendiumVersion", CURRENT_VERSION);
  ui.notifications.info(
    `SR4 | Compendiums ready — ${totalCreated} example items loaded. ` +
    `Replace or supplement these with your own entries from your sourcebooks.`
  );
}
