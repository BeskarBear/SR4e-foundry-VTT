/**
 * @file populate.mjs — Compendium seeding for the SR4 system.
 *
 * ── PURPOSE ───────────────────────────────────────────────────────────────────
 * Seeds core compendium packs with [Example] schema demonstration items on first
 * load, then tracks the version in a world setting to avoid re-seeding on reload.
 *
 * ── IP NOTICE ─────────────────────────────────────────────────────────────────
 * Actual SR4A book content (weapon names, spell stats, cyberware costs, etc.) has
 * been removed from this distribution to respect Catalyst Game Labs' intellectual
 * property rights. Shadowrun is a registered trademark of The Topps Company, Inc.
 *
 * The [Example] items shipped here use generic placeholder names/stats and are
 * intended only to show GMs the correct data schema for each item type.
 * Replace or supplement them with your own entries from your sourcebooks.
 *
 * ── HOW TO ADD YOUR OWN CONTENT ───────────────────────────────────────────────
 *   Option A — In-app: Compendium tab → right-click pack → Edit → Create Item
 *   Option B — Import: prepare a .json file (Foundry export format), then
 *              Compendium → Import Data
 *   Option C — Programmatically: add entries to sr4-example-data.mjs and bump
 *              CURRENT_VERSION to trigger re-seeding on next system load.
 *
 * ── PACK MAP ──────────────────────────────────────────────────────────────────
 * Only core packs are seeded. Supplement packs (Arsenal, Augmentation, etc.)
 * are left empty — they exist as organizational slots for GM-created content.
 *
 * Full schema quick-reference: sr4-example-data.mjs header comment.
 * Extended guide: docs/COMPENDIUM_GUIDE.md
 */

import {
  EXAMPLE_WEAPONS, EXAMPLE_AMMO, EXAMPLE_ARMOR,
  EXAMPLE_SPELLS, EXAMPLE_QUALITIES, EXAMPLE_CYBERWARE,
  EXAMPLE_GEAR, EXAMPLE_PROGRAMS
} from "../data/sr4-example-data.mjs";

/**
 * Bump CURRENT_VERSION when the example items change to trigger re-seeding
 * on next world load. Format: semver string (major.minor.patch).
 */
const CURRENT_VERSION = "0.2.0";

/**
 * Map of Foundry pack collection name → example data array.
 * Pack names must match the "name" fields in system.json packs array exactly.
 * Only these core packs receive example items; supplement/sourcebook packs are skipped.
 * Full pack collection IDs are resolved as "sr4.<packName>" (e.g. "sr4.sr4-weapons").
 */
const PACK_MAP = {
  "sr4-weapons":   EXAMPLE_WEAPONS,   // Firearms, melee, explosives (DV/AP notation)
  "sr4-ammo":      EXAMPLE_AMMO,      // Ammunition (dvModifier + apModifier system)
  "sr4-armor":     EXAMPLE_ARMOR,     // Body armor (Ballistic + Impact ratings)
  "sr4-spells":    EXAMPLE_SPELLS,    // Spells (Force, drain formula, sustained flag)
  "sr4-qualities": EXAMPLE_QUALITIES, // Positive (cost BP) + Negative (refund BP) qualities
  "sr4-cyberware": EXAMPLE_CYBERWARE, // Cyberware/bioware (Essence costs, grade multipliers)
  "sr4-gear":      EXAMPLE_GEAR,      // General gear including commlinks (R/S/Sys/FW)
  "sr4-programs":  EXAMPLE_PROGRAMS   // Matrix programs (Common Use / Hacking / Security / Agent)
};

/**
 * Populate core compendium packs with [Example] schema items.
 *
 * Called from the READY hook (sr4.mjs) every time the system loads,
 * but actually runs only when the stored version ≠ CURRENT_VERSION (or force=true).
 *
 * Process per pack:
 *   1. Unlock the pack (if locked)
 *   2. Fetch the current index
 *   3. If version mismatch and pack has items: delete all existing entries first
 *   4. Create new entries from the corresponding EXAMPLE_* array
 *   5. Re-lock the pack
 *
 * On version update: existing example items are REPLACED (deleted + re-created).
 * GM-added items will also be deleted if they're in a core pack — store custom
 * items in supplement packs or in world items to avoid loss on version bump.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.force=false] - Force re-seed even if version matches.
 *   Useful for manual re-seeding from macros: game.sr4?.populateCompendiums?.({ force: true })
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
