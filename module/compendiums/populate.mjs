/**
 * Compendium population — stub for the public release.
 *
 * Pre-populated compendium data (weapons, armor, spells, cyberware, gear,
 * programs, qualities, and ammunition) has been omitted from this distribution
 * to respect Catalyst Game Labs' intellectual property rights over Shadowrun
 * 4th Edition content. Shadowrun is a registered trademark of The Topps
 * Company, Inc.
 *
 * The compendium packs registered in system.json are empty. To populate them,
 * users must own the relevant Shadowrun sourcebooks and enter items manually
 * through Foundry VTT's item creation UI, or import their own data files.
 *
 * Sourcebook packs included in system.json (all ship empty):
 *   - SR4A Core Rulebook (CAT2600A)
 *   - Arsenal
 *   - Augmentation
 *   - Unwired
 *   - Street Magic
 *   - Runner's Companion
 */

/**
 * No-op in the public release. Compendiums ship empty and are user-populated.
 * Function signature preserved for compatibility with sr4.mjs.
 */
export async function populateCompendiums({ force = false } = {}) {
  // No bundled book data in this release.
  // Users populate compendiums manually from their own sourcebooks.
}
