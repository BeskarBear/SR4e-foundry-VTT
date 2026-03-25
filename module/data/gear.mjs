/**
 * GearDataModel — General equipment item data model (SR4 20th Anniversary).
 *
 * ── SR4A GEAR OVERVIEW ────────────────────────────────────────────────────────
 * "Gear" is the catch-all for everything that isn't a weapon, armor, cyberware,
 * spell, adept power, contact, quality, or program.
 *
 * This includes:
 *   - Electronics, sensors, and surveillance gear
 *   - Commlinks (wireless handhelds for Matrix access and communication)
 *   - Medical equipment and biotech supplies
 *   - Infiltration tools (sequencers, maglock crackers, gecko tape)
 *   - Explosives and demo equipment
 *   - Forgery documents and SINs
 *   - Magical reagents, foci, and supplies
 *   - Software items (Matrix programs tracked separately in ProgramDataModel)
 *   - Drones (when tracked as items rather than as Vehicle actors)
 *   - Skillsofts and knowsofts
 *
 * ── SR4 COMMLINKS ─────────────────────────────────────────────────────────────
 * The wireless Matrix means every person in the Sixth World has a commlink.
 *
 * Commlinks have four Matrix attributes:
 *   Response:  Processing speed; acts like Reaction for the device.
 *              Initiative = Response + rolled dice (for agents/drones).
 *              Caps the number of simultaneously active programs (= Response).
 *
 *   Signal:    Wireless range; determines how far the device can communicate.
 *              Signal 1 = ~1 meter (bluetooth); Signal 6 = ~100m; Signal 9 = 100km+.
 *              Higher Signal = easier to intercept (tradeoff with security).
 *
 *   System:    Core processing power.
 *              CAPS the maximum rating of programs that can run on this device.
 *              A commlink with System 3 cannot run programs rated higher than 3.
 *
 *   Firewall:  Security and intrusion resistance.
 *              Used as part of the defense against hacking attempts.
 *              The Firewall is what hackers have to defeat to access the device.
 *
 * Standard commlinks vs hacker hardware:
 *   Civilian (System 1-2): browsing, calls, basic apps; cheap, widely available
 *   Runner-grade (System 3-4): robust; can handle most operational software
 *   Military/Corp elite (System 5-6): best available; very expensive, restricted
 *
 * ── AVAILABILITY FORMAT (SR4A) ────────────────────────────────────────────────
 * SR4A availability is "Number + optional suffix" format:
 *   "4"    = Availability 4, no legal restrictions
 *   "8R"   = Availability 8, Restricted (license required)
 *   "12F"  = Availability 12, Forbidden (illegal to possess)
 *   "—"    = Always available; no test needed; legal
 * Higher number = harder to find (rolled against with Availabilty + Contacts).
 *
 * ── MAGICAL GEAR NOTES ────────────────────────────────────────────────────────
 * Foci and reagents are tracked as gear in SR4:
 *   focus:      bonded magical item — must be bonded (Karma cost = Force × 2 per type)
 *               Types: Sustaining Focus (hold sustained spell), Power Focus (+dice),
 *               Spellcasting Focus (+dice to casting), Summoning Focus, Weapon Focus
 *
 *   reagent:    raw magical material (SR4A p.205-207); used in rituals and with alchemy
 *               Rating = potency; measured in "drams"
 *
 *   magicSupplies: non-bonded ritual components and magical paraphernalia
 */
export class GearDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── CATEGORY ────────────────────────────────────────────────────────────
      // category: display and functional grouping for the gear list.
      //   electronics:   sensors, recorders, jammers, general tech
      //   commlink:      wireless handhelds; the primary Matrix hardware (isCommlink = true)
      //   software:      general software not tracked as programs (OS upgrades, etc.)
      //   surveillance:  cameras, microphones, optical bugs, tap detectors
      //   breaking:      infiltration tools (sequencer, maglock cracker, gecko tape)
      //   medical:       medkits (SR4A p.332), trauma kits, stimpatch, antidote
      //   disguise:      synthskin, facial modification, disguise kits
      //   explosives:    demolition gear, grenades, det cord, shaped charges
      //   survival:      rope, grapple gun, respirators, ration packs
      //   docsForgery:   false SINs, forged licenses, corporate credentials
      //   credstick:     electronic currency carrier (anonymous or named)
      //   other:         misc items not covered above
      //   weaponMod:     accessories that don't change weapon stats significantly
      //   matrixHardware: hardware for Matrix (signal amplifiers, repeaters, etc.)
      //   security:      security systems, locks, motion sensors, access hardware
      //   drone:         drone items (when not tracked as full Vehicle actors)
      //   skillsoft:     simsense chips for temporary skill access (require skillwires)
      //   focus:         bonded magical item (requires bonding ritual + Karma)
      //   reagent:       raw magical material used in rituals and alchemy
      //   magicSupplies: non-bonded ritual components and magical paraphernalia
      category: new fields.StringField({ initial: "electronics",
        choices: ["electronics", "commlink", "software", "surveillance",
                  "breaking", "medical", "disguise", "explosives",
                  "survival", "docsForgery", "credstick", "other",
                  "weaponMod", "matrixHardware", "security", "drone",
                  "skillsoft", "focus", "reagent", "magicSupplies"] }),

      // quantity: number of this item the character has.
      // Allows tracking multiple identical items as one entry.
      quantity: new fields.NumberField({ initial: 1, min: 0, integer: true }),

      // rating: general quality/power level for items that have one.
      // Meaning varies by category:
      //   electronics/security: signal strength, sensitivity, or quality (1-12)
      //   medical: medkit/trauma kit rating (determines Threshold for medical tests)
      //   skillsoft: effective skill level while active (1-6)
      //   focus: magical Force rating (Power Focus adds Force dice; cap for bonding)
      //   reagent: potency in drams
      //   0 = no relevant rating
      rating: new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true }),

      // ── COMMLINK SUBTYPE ─────────────────────────────────────────────────────
      // isCommlink: true = this gear is a commlink with Matrix attributes.
      // Commlinks are the ubiquitous SR4 wireless devices replacing SR3 cyberdecks.
      // When true, the commlink SchemaField is relevant.
      isCommlink: new fields.BooleanField({ initial: false }),
      commlink: new fields.SchemaField({
        // response: processing speed; caps active programs; used as Initiative base.
        response: new fields.NumberField({ initial: 1, min: 0, max: 6, integer: true }),
        // signal: wireless range; higher = farther reach but also easier to detect.
        signal:   new fields.NumberField({ initial: 1, min: 0, max: 9, integer: true }),
        // system: processing power; CAPS program rating. Programs cannot exceed System.
        system:   new fields.NumberField({ initial: 1, min: 0, max: 6, integer: true }),
        // firewall: security; resists unauthorized access; part of defense roll.
        firewall: new fields.NumberField({ initial: 1, min: 0, max: 6, integer: true })
      }),

      // ── AVAILABILITY & LEGALITY ──────────────────────────────────────────────
      // avail: SR4A availability string.
      // Format: "Number" optionally followed by "R" (Restricted) or "F" (Forbidden).
      // "—" = no test needed; always available and legal.
      avail:       new fields.StringField({ initial: "4" }),
      cost:        new fields.NumberField({ initial: 0, min: 0, integer: true }),
      source:      new fields.StringField({ initial: "SR4A" }),

      // equipped: whether this item is currently active/carried on person.
      // Non-equipped items don't affect the character's loadout or Matrix signature.
      equipped:    new fields.BooleanField({ initial: true }),
      description: new fields.HTMLField({ initial: "" }),
      notes:       new fields.StringField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ───────────────────────────────────────────────────────

  /**
   * Total nuyen cost for the quantity held.
   *
   * Quick reference for the gear list — shows actual total value rather than
   * unit cost. Useful for tracking expenditures and encumbrance cost.
   *
   * @returns {number} Total nuyen value (cost × quantity)
   */
  get totalCost() {
    return this.cost * this.quantity;
  }
}
