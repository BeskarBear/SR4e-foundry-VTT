/**
 * ContactDataModel — Contact item data model (SR4 20th Anniversary).
 *
 * ── SR4A CONTACT SYSTEM (SR4A p.108-110) ─────────────────────────────────────
 * Contacts are the lifeblood of shadow work — fixers, street docs, corp insiders,
 * and gang leaders who can supply gear, information, and work to the team.
 *
 * SR4A contacts use a two-axis rating system:
 *
 *   Connection (1-6): How well-placed, resourceful, and capable the contact is.
 *                     Reflects their access to information, gear, and networks.
 *                     1 = Street-level; works in their immediate environment only
 *                     3 = Mid-level professional; regional reach
 *                     6 = Megacorp executive, top-tier fixer, high-level government official
 *
 *   Loyalty (1-6):    How much the contact trusts and cares about the runner.
 *                     Reflects emotional investment in the relationship.
 *                     1 = Barely knows you; purely transactional
 *                     3 = Established working relationship; gives benefit of the doubt
 *                     6 = Close friend or family; would take personal risks for you
 *
 * The two axes create nuanced roleplay opportunities:
 *   - High Connection, low Loyalty: powerful but mercenary — will help for the right price
 *   - Low Connection, high Loyalty: limited resources but deeply invested in your success
 *   - High Connection, high Loyalty: extremely valuable; rare and hard to maintain
 *
 * ── USING CONTACTS (SR4A p.109) ──────────────────────────────────────────────
 * Using a contact is a roleplaying interaction, not a test in most cases.
 * The GM sets whether the contact can fulfill a request based on Connection.
 * Loyalty determines how willing they are to help, especially for:
 *   - Dangerous requests (Loyalty 4+ to take personal risk)
 *   - Sensitive information (Loyalty 3+ to betray confidence)
 *   - Free assistance (Loyalty 5+ to help without payment)
 *   - Hiding the runner from law enforcement (Loyalty 6 — extreme trust)
 *
 * When a test is required (contested interests, unusual request):
 *   Charisma + Etiquette vs appropriate social defense.
 *   Loyalty may add bonus dice (Loyalty as a direct pool bonus at GM discretion).
 *
 * ── BUILD POINT COST (SR4A p.108) ────────────────────────────────────────────
 * During character generation (Build Point method):
 *   Contact BP cost = Connection + Loyalty (one contact per BP point)
 *   Starting contacts limit: varies by character background
 *
 * ── CONTACT MAINTENANCE ──────────────────────────────────────────────────────
 * Contacts in SR4 are classified as:
 *   Active:   Requires regular interaction (monthly); costs time
 *   Passive:  Relationship maintained by reputation; no maintenance cost
 *
 * There are no formal rules for contact rating decay,
 * but GMs may reduce Loyalty over time for neglected relationships.
 * Good deeds, favors, and payment improve Loyalty; failures and demands reduce it.
 */
export class ContactDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── RATINGS ─────────────────────────────────────────────────────────────
      // connection: how powerful, resourceful, and well-connected this contact is.
      // Determines WHAT they can provide — their sphere of influence and access.
      //   1: Street vendor, minor fence, local gang member
      //   2: Mid-level dealer, beat cop, corporate clerk
      //   3: Experienced fixer, medical professional, journalist with access
      //   4: Regional executive, high-ranking law enforcement, specialist broker
      //   5: Corporate VP, major crime boss, top-tier information broker
      //   6: Megacorp board member, high government official, shadow legend
      connection: new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),

      // loyalty: how much this contact cares about the runner personally.
      // Determines HOW WILLING they are to help, especially beyond basic transactions.
      //   1: Barely know each other; purely professional
      //   2: Familiar; will do standard business reliably
      //   3: Associates; will give benefit of the doubt, small favors
      //   4: Friends; will take some personal risk for you
      //   5: Close friends; significant personal investment in your success
      //   6: Family/deep trust; will take serious risks; true allies
      loyalty: new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),

      // ── IDENTITY ────────────────────────────────────────────────────────────
      // role: the contact's function/occupation — quick-reference for what they can provide.
      // Examples: "Fixer", "Street Doc", "Aztechnology Corp Security", "Lone Star Detective"
      role: new fields.StringField({ initial: "" }),

      // affiliation: the organization, faction, or group the contact belongs to.
      // Can signal conflicts of interest or potential leverage.
      // Examples: "Aztechnology", "Yakuza", "Star", "Halloweeners", "DocWagon"
      affiliation: new fields.StringField({ initial: "" }),

      // location: where the contact operates or lives.
      // Important for geographic availability and local knowledge.
      location: new fields.StringField({ initial: "" }),

      // how: how the runner met this contact.
      // Adds roleplay flavor and may establish the basis of the Loyalty rating.
      // Examples: "Saved during a run gone wrong", "Old classmate from tech school"
      how: new fields.StringField({ initial: "" }),

      description: new fields.HTMLField({ initial: "" }),
      notes:       new fields.StringField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ───────────────────────────────────────────────────────

  /**
   * Build Point cost for this contact during character creation.
   *
   * SR4A p.108: Contact BP cost = Connection + Loyalty.
   * Characters typically purchase multiple contacts at varying Connection/Loyalty values.
   * A Connection 4 / Loyalty 3 contact costs 7 BP — a significant investment.
   * A Connection 1 / Loyalty 1 contact costs only 2 BP — minimal but useful.
   *
   * @returns {number} Total Build Points spent on this contact
   */
  get bpCost() {
    return this.connection + this.loyalty;
  }
}
