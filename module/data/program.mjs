/**
 * ProgramDataModel — Matrix Program item data model (SR4 20th Anniversary).
 *
 * ── SR4A MATRIX OVERVIEW (SR4A p.216-243) ────────────────────────────────────
 * In SR4, everyone is connected wirelessly via commlinks.
 * Hackers use commlinks with enhanced hardware and specialized hacking software.
 * Any commlink can run programs; the four core commlink attributes (R/Sig/Sys/FW)
 * replace the old persona program model.
 *
 * Matrix attributes (on commlinks/nodes, not personas):
 *   Response:  Processing speed; initiative and action economy
 *   Signal:    Wireless transmission range (1=1m, 9=100km+)
 *   System:    Core processing; caps program rating (System ≥ program rating)
 *   Firewall:  Security; defense vs hacking, IC attacks, unauthorized access
 *
 * The hacker's physical commlink stats ARE their Matrix "persona" stats.
 * To hack, you need: high Response, Signal to reach the target, System to run
 * strong programs, and Firewall to survive counterattacks.
 *
 * ── PROGRAM CATEGORIES (SR4A p.225-230) ──────────────────────────────────────
 *
 *   commonUse:   Standard civilian/professional programs.
 *                Available legally; used for everyday Matrix tasks.
 *                Examples: Analyze (investigate node/program), Browse (search data),
 *                          Command (control devices), Edit (modify files),
 *                          Encrypt (secure comms), Track (trace data/signal)
 *
 *   hacking:     Intrusion and exploitation programs — typically RESTRICTED or FORBIDDEN.
 *                Core hacker tools for unauthorized access, privilege escalation.
 *                Examples: Exploit (crack node access), Spoof (fake credentials),
 *                          Stealth (hide from detection), Sniffer (intercept traffic),
 *                          Decrypt (break encryption), DataBomb (trap files/nodes)
 *
 *   security:    Defensive programs used by security specialists and corporations.
 *                Also includes attack programs that respond to intrusions.
 *                Examples: Armor (resist Matrix damage), Attack (damage IC/hackers),
 *                          Black Hammer (high-damage attack), Medic (repair Matrix damage)
 *
 *   agent:       Autonomous AI program that can act independently in the Matrix.
 *                Runs on a commlink with its own skills and decision-making.
 *                Hackers deploy agents to handle routine tasks while they focus elsewhere.
 *                Agents can be given complex instructions; they roll their own skill dice.
 *                Forbidden in most jurisdictions.
 *
 *   tactical:    Specialized programs for combat scenarios.
 *                Examples: Electronic Warfare programs, signal jamming,
 *                          tactical overlay maps, enhanced target assistance
 *
 *   other:       Custom, experimental, or cutting-edge programs not in standard lists.
 *
 * ── PROGRAM RATING AND LIMITS ─────────────────────────────────────────────────
 * Program rating determines effectiveness (dice bonus or threshold reduction).
 * HARD LIMIT: Program rating cannot exceed the commlink's System attribute.
 * Also: running programs consumes processing capacity (each program uses 1 Response).
 * Maximum simultaneous active programs = Response rating.
 *
 * ── HACKING ROLL FORMULA ─────────────────────────────────────────────────────
 * Most hacking tests follow: Hacking (or Electronics) skill + attribute vs threshold.
 * Programs add dice to specific tests via the linkedSkill and poolBonus fields.
 * Example: Exploit program (rating 4) used with Hacking + Exploit = +4 dice to crack tests.
 *
 * ── AGENTS (SR4A p.228) ──────────────────────────────────────────────────────
 * Agent programs are sophisticated AI routines:
 *   - Have their own set of Matrix skills (stored in agentSkills array)
 *   - Can be assigned tasks and operate independently
 *   - Rating sets their effective skill cap (can't have skills > agent rating)
 *   - Are illegal in most jurisdictions (Forbidden availability)
 *   - Can be detected and crashed like any other persona
 */
export class ProgramDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── CLASSIFICATION ──────────────────────────────────────────────────────
      // programType: the program's functional category.
      // Determines which Matrix actions it assists and its legal status.
      // See the category overview in the file-level JSDoc.
      programType: new fields.StringField({ initial: "commonUse",
        choices: ["commonUse", "hacking", "security", "agent", "tactical", "other"] }),

      // ── RATING ──────────────────────────────────────────────────────────────
      // rating: the program's power level (1-6 standard; higher in specialized decks).
      // HARD LIMIT: rating ≤ System attribute of the commlink running it.
      // Determines dice pool contribution and effectiveness against defenses.
      rating: new fields.NumberField({ initial: 3, min: 1, max: 6, integer: true }),

      // active: whether this program is currently running on the commlink.
      // Each active program consumes 1 Response (max active = Response rating).
      // Only active programs provide their dice bonuses.
      // Agents also need to be active to perform their autonomous tasks.
      active: new fields.BooleanField({ initial: false }),

      // ── DICE POOL EFFECT ─────────────────────────────────────────────────────
      // linkedSkill: the Matrix skill or test this program supplements.
      // Displayed on the sheet for reference during play.
      // Examples: "Hacking + Exploit" (for Exploit program),
      //           "Electronic Warfare" (for tactical programs),
      //           "Cybercombat + Attack" (for Attack program)
      linkedSkill: new fields.StringField({ initial: "" }),

      // poolBonus: dice added to the linked test when this program is active.
      // For most programs: poolBonus = rating (the program adds its rating as dice).
      // Some programs have a flat bonus instead (set by the sourcebook text).
      poolBonus: new fields.NumberField({ initial: 0, integer: true }),

      // ── AGENT SKILLS ────────────────────────────────────────────────────────
      // agentSkills: the autonomous skills this agent program can roll.
      // Only relevant when programType = "agent".
      // Each entry is a Matrix skill the agent has been programmed with.
      //   skill: Matrix skill name (e.g. "Hacking", "Cybercombat", "Electronic Warfare")
      //   value: the agent's dice pool for that skill (capped at agent rating)
      // The agent rolls these skills independently when performing assigned tasks.
      agentSkills: new fields.ArrayField(new fields.SchemaField({
        skill: new fields.StringField({ initial: "" }),
        value: new fields.NumberField({ initial: 0, min: 0, max: 6, integer: true })
      })),

      // ── AVAILABILITY & COST ──────────────────────────────────────────────────
      // avail: SR4A availability string (number + optional R/F suffix).
      //   No suffix: legal, no license required
      //   R = Restricted: SIN + license check required
      //   F = Forbidden: illegal to possess; black market only (agents, black IC, etc.)
      avail:       new fields.StringField({ initial: "6" }),
      cost:        new fields.NumberField({ initial: 0, min: 0, integer: true }),
      source:      new fields.StringField({ initial: "SR4A" }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}
