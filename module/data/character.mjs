/**
 * @file character.mjs
 * @description DataModel for a Player Character (PC) in Shadowrun 4th Edition
 *              20th Anniversary (SR4A).
 *
 * In SR4A, a player character is a shadowrunner — a professional criminal who
 * operates in the shadows of a dystopian near-future megacorporate world. PCs are
 * built using a Build Point (BP) system at chargen and advance through Karma
 * afterward. This model stores the full stat block: all eight primary attributes,
 * the three special attributes (Edge, Essence, Magic/Resonance), the complete
 * active skill list, condition monitors, and subsystem data for Matrix (hacking)
 * and magic/technomancer characters.
 *
 * SR4A rules reference: Core Rulebook (CAT2600A), Chapters 2 (Metatypes),
 * 5 (Skills), 9 (Initiative), 10 (Combat), 13 (Magic), 14 (Matrix).
 *
 * @see NpcDataModel — simplified stat block for non-player characters
 */
export class CharacterDataModel extends foundry.abstract.TypeDataModel {

  /**
   * Defines the Foundry DataModel schema for a PC. Every persisted property on
   * the Actor's `system` object must be declared here. Derived/computed values
   * (things calculated from stored values at runtime) are expressed as getters
   * below rather than schema fields — they are never stored in the database.
   *
   * Field organization follows the SR4A character sheet layout:
   *   Identity → Attributes → Condition Monitors → Initiative →
   *   Skills → Magic → Matrix → Technomancer → Resources → Karma → Notes
   *
   * @returns {object} Foundry schema definition object
   */
  static defineSchema() {
    const fields = foundry.data.fields;

    // ── SKILL FIELD HELPER ───────────────────────────────────────────────────
    //
    // In SR4A, every active skill has:
    //   • A rating (0–6; 0 means unskilled — character must use the default
    //     attribute at -1 die, unless the skill is "untrainable").
    //   • An optional specialization (+2 dice when the specialization applies,
    //     SR4A p.122). Only one specialization per skill at a time.
    //   • Natural maximum is 6; Aptitude quality raises one skill's max to 7.
    //   • Maximum augmented rating (via Cerebral Booster etc.) is attribute×2,
    //     capped at 9 for most skills.
    //
    // `initial: 0` means a freshly created character is unskilled in everything
    // until points are assigned.
    const skill = (initial = 0) => new fields.SchemaField({
      value: new fields.NumberField({ initial, min: 0, max: 9, integer: true }),
      specialization: new fields.StringField({ initial: "" })
    });

    return {

      // ── IDENTITY ──────────────────────────────────────────────────────────
      //
      // Flavor/biographical fields. None of these directly affect dice rolls,
      // but metatype is mechanically meaningful: each metatype has different
      // attribute minimums/maximums and special racial abilities (SR4A p.66-72).
      // Orks and Trolls have higher Body/Strength caps; Elves have higher
      // Charisma/Agility caps; Dwarves have higher Body/Strength/Willpower caps.
      // Those caps are enforced at the attribute schema level (max: 12 covers
      // the highest possible augmented maximum for any metatype).

      /** Street name / runner handle (e.g., "Fastjack", "Cayman"). Not a legal name. */
      handle:     new fields.StringField({ initial: "" }),

      /**
       * Character's metatype. SR4A defines five metahuman metatypes. Each has
       * different racial attribute adjustments (SR4A p.66-72):
       *   • human       — no adjustments; highest natural Edge maximum (7)
       *   • elf         — Agility +1 max, Charisma +2 max; Low-Light Vision
       *   • dwarf       — Body/Strength +2 max, Willpower +2 max, Logic +1 max;
       *                   Thermographic Vision; +2 dice vs. pathogens/toxins
       *   • ork         — Body +3 max, Strength +2 max; Low-Light Vision;
       *                   lower natural Charisma/Logic maxima
       *   • troll       — Body/Strength +4 max; Thermographic Vision; Dermal
       *                   Armor +1; severely reduced social attribute maxima
       */
      metatype:   new fields.StringField({ initial: "human",
        choices: ["human", "elf", "dwarf", "ork", "troll"] }),

      /**
       * Character concept / archetype string (e.g., "Street Samurai", "Decker",
       * "Shaman", "Face"). Purely descriptive — no mechanical effect. Helps the
       * GM and player quickly identify the runner's role in the group.
       */
      archetype:  new fields.StringField({ initial: "" }),   // Street Samurai, Decker, etc.

      /** Gender identity (free text). No mechanical effect in SR4A. */
      gender:     new fields.StringField({ initial: "" }),

      /** Age (free text — could be "27" or "Appears mid-30s"). No mechanical effect. */
      age:        new fields.StringField({ initial: "" }),

      /** Height in runner's preferred units. No mechanical effect. */
      height:     new fields.StringField({ initial: "" }),

      /** Weight in runner's preferred units. No mechanical effect. */
      weight:     new fields.StringField({ initial: "" }),

      /** Ethnic background / cultural heritage. No mechanical effect. */
      ethnicity:  new fields.StringField({ initial: "" }),

      /**
       * Reputation tracks — these DO have mechanical weight in social situations
       * and when dealing with contacts (SR4A p.264-265):
       *
       *   • streetCred  — how well-known and respected the runner is on the street.
       *                   Positive rep. Adds dice to Charisma-based rolls when dealing
       *                   with underworld contacts who know the runner's rep.
       *   • notoriety   — infamy from bad acts (running amok, killing civilians,
       *                   betraying employers). Subtracts dice from social tests with
       *                   contacts who've heard the stories.
       *   • publicAware — fame/notoriety with the general (legal) public. High values
       *                   can make it difficult to operate covertly.
       *
       * All three begin at 0 and increase through play events, GM award, or
       * specific qualities. They cannot normally be purchased with BP/Karma.
       */
      reputation: new fields.SchemaField({
        streetCred:  new fields.NumberField({ initial: 0, min: 0, integer: true }),
        notoriety:   new fields.NumberField({ initial: 0, min: 0, integer: true }),
        publicAware: new fields.NumberField({ initial: 0, min: 0, integer: true })
      }),

      // ── PHYSICAL ATTRIBUTES ───────────────────────────────────────────────
      //
      // SR4A has eight primary attributes plus three special attributes.
      // Primary attributes have a natural maximum of 6 (metatype adjusted) and
      // an augmented maximum of (natural max × 1.5, rounded down), which is the
      // ceiling for cyberware/bioware improvements.
      //
      // Each attribute is stored as a SchemaField with two sub-fields:
      //   • base      — the character's "natural" value, bought with BP/Karma.
      //                 This is what degrades if a toxin/drain specifically
      //                 targets the natural attribute.
      //   • augmented — the BONUS added on top of base from cyberware, bioware,
      //                 adept powers, spells, etc. The total (base + augmented)
      //                 is what gets used in dice pools. The augmented field
      //                 stores just the delta, not the final total.
      //
      // The attr() helper (below) computes base + augmented on the fly.
      //
      // Max stored as 12 in schema — the absolute ceiling for any metatype
      // after augmentation (e.g., a Troll with Body 9 natural max can push to
      // 13 augmented, but most humans cap at 9). Actual enforcement is handled
      // by the sheet/validation logic, not the schema min/max alone.

      attributes: new fields.SchemaField({

        /**
         * Body (BOD) — SR4A p.51. Physical resilience and toughness.
         * Governs the Physical Condition Monitor maximum (see physicalCMMax getter).
         * Key attribute for:
         *   • Damage Resistance tests (Body + Armor)
         *   • Toxin/pathogen resistance (Body)
         *   • Knockdown resistance
         *   • Carrying capacity (with Strength)
         * Metatype caps: Human 6, Elf 6, Dwarf 8, Ork 9, Troll 10.
         */
        body:      new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true }) // bonus from ware
        }),

        /**
         * Agility (AGI) — SR4A p.51. Physical dexterity and hand-eye coordination.
         * The single most important combat attribute for physical attackers:
         *   • All ranged combat skills link to Agility (Pistols, Automatics, etc.)
         *   • All melee combat skills link to Agility (Blades, Clubs, etc.)
         *   • Sneaking, Gymnastics, Palming, Escape Artist also use Agility
         * Metatype caps: Human 6, Elf 7, Dwarf 6, Ork 6, Troll 5.
         */
        agility:   new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),

        /**
         * Reaction (REA) — SR4A p.51. Reflexes and response speed. Primary attribute.
         * Key uses:
         *   • Initiative base score: Reaction + Intuition (+ initiative dice)
         *   • Defense tests: Reaction (to dodge incoming ranged attacks)
         *   • Driving/piloting reaction-based dodge tests
         * Metatype caps: Human 6, Elf 6, Dwarf 5, Ork 5, Troll 5.
         * Wired Reflexes/Synaptic Boosters increase this, and also add
         * extra initiative dice and/or initiative passes.
         */
        reaction:  new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),

        /**
         * Strength (STR) — SR4A p.51. Raw physical power.
         * Key uses:
         *   • Melee damage value for unarmed combat: STR damage code
         *   • Melee weapon damage codes often expressed as "STR+2P" etc.
         *   • Lift/Carry tests (with Body)
         *   • Throwing distance for grenades/thrown weapons
         * Metatype caps: Human 6, Elf 6, Dwarf 8, Ork 8, Troll 10.
         */
        strength:  new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),

        // ── MENTAL ATTRIBUTES ───────────────────────────────────────────────
        //
        // Mental attributes govern social, technical, and magical actions.
        // Awakened characters rely heavily on Willpower and Charisma/Intuition
        // for drain resistance. Deckers/TMs rely on Logic for hacking pools.

        /**
         * Charisma (CHA) — SR4A p.52. Force of personality, social presence.
         * Key uses:
         *   • All social skills: Con, Etiquette, Intimidation, Leadership, Negotiation
         *   • Composure tests (Willpower + Charisma)
         *   • Judge Intentions (Intuition + Charisma)
         *   • Hermetic drain resistance (Willpower + Charisma)
         *   • Governs the Stun Condition Monitor for Sprites (not PCs)
         * Metatype caps: Human 6, Elf 8, Dwarf 6, Ork 5, Troll 4.
         */
        charisma:  new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),

        /**
         * Intuition (INT) — SR4A p.52. Gut feelings, pattern recognition, awareness.
         * Key uses:
         *   • Initiative base score: Reaction + Intuition
         *   • Perception tests (Intuition-based)
         *   • Judge Intentions (Intuition + Charisma)
         *   • Tracking and many investigation skills
         *   • Astral Perception for Awakened (Intuition-linked)
         *   • Technomancer Living Persona: Response = Intuition
         *   • Shaman drain resistance (Willpower + Intuition in some traditions)
         * Metatype caps: Human 6, Elf 6, Dwarf 7, Ork 5, Troll 5.
         */
        intuition: new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),

        /**
         * Logic (LOG) — SR4A p.52. Rational thinking, memory, analytical ability.
         * Key uses:
         *   • All technical skills: Computer, Hacking, Hardware, Software, Chemistry
         *   • Memory tests (Logic + Willpower)
         *   • First Aid and Medicine tests
         *   • Technomancer Living Persona: System = Logic
         *   • Hacking dice pools (Hacking/Cybercombat skill + Logic vs. Firewall)
         * Metatype caps: Human 6, Elf 6, Dwarf 7, Ork 4, Troll 4.
         */
        logic:     new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),

        /**
         * Willpower (WIL) — SR4A p.52. Mental fortitude, self-control, perseverance.
         * Key uses:
         *   • Stun Condition Monitor maximum: 8 + ceil(Willpower / 2)
         *   • Composure tests (Willpower + Charisma)
         *   • Memory tests (Logic + Willpower)
         *   • Drain resistance for all magic traditions (Willpower + tradition attribute)
         *   • Technomancer Fading resistance (Willpower + Resonance)
         *   • Technomancer Living Persona: Firewall = Willpower
         *   • Resisting addiction, fear, and morale effects
         * Metatype caps: Human 6, Elf 6, Dwarf 8, Ork 5, Troll 5.
         */
        willpower: new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),

        // ── SPECIAL ATTRIBUTES ──────────────────────────────────────────────
        //
        // Special attributes are bought separately from primaries and have
        // different BP costs and restrictions. They are never defaulted on.

        /**
         * Edge (EDG) — SR4A p.52. Luck, fate, the intangible quality that keeps
         * shadowrunners alive when everything goes wrong.
         *
         * Mechanically, Edge is a dual-purpose attribute:
         *   1. RATING — used in very limited social/non-combat tests.
         *   2. POOL — spendable points that refresh between sessions (or via the
         *      Revive the Fallen Edge burn). Each point can be spent to:
         *        • Reroll all failed dice once per test (SR4A p.67)
         *        • Go first in initiative (before rolling)
         *        • Negate a single bad effect (Glitch downgrade, etc.)
         *        • Hang on at 0 Physical CM boxes (one time per session)
         *
         * `base`    = the character's Edge rating (bought with BP; max 7 for humans,
         *             lower for other metatypes; most start at 1-4).
         * `current` = Edge points remaining in the current session pool. Starts
         *             equal to `base` at session start and ticks down as spent.
         *             Cannot exceed `base`.
         *
         * Edge does NOT have an `augmented` sub-field — cyberware/bioware cannot
         * boost Edge; it can only be raised with Karma between sessions.
         */
        edge: new fields.SchemaField({
          base:    new fields.NumberField({ initial: 1, min: 1, max: 7, integer: true }),
          current: new fields.NumberField({ initial: 1, min: 0, max: 7, integer: true })
        }),

        /**
         * Essence (ESS) — SR4A p.52. The metaphysical life-force and humanity of
         * the character. All characters start at exactly 6.0.
         *
         * Each piece of invasive cyberware or bioware reduces Essence by its
         * Essence Cost value (e.g., Wired Reflexes 1 costs 2.0 Essence).
         * Essence reductions are permanent — you cannot regain lost Essence
         * (except in extraordinary circumstances like the Essence of the Machine
         * quality from Runner's Companion).
         *
         * Critical consequences of low Essence:
         *   • When Essence reaches 0, the character dies immediately.
         *   • For Awakened characters: effective Magic = min(Magic, floor(Essence)).
         *     A mage who drops to Essence 3.1 effectively has Magic capped at 3
         *     until the next time they buy Magic up — but they can never recover
         *     the lost floor. This is why mages avoid chrome.
         *   • Magic cannot exceed floor(Essence) even if the rating is higher.
         *
         * Stored as a float to allow fractional values (e.g., 5.5 after a 0.5
         * Essence cyberware). `nullable: true` allows null if not tracked.
         */
        // Essence: starts 6.0, reduced by invasive ware (float, 2 decimal places)
        essence: new fields.NumberField({ initial: 6.0, min: 0, max: 6, nullable: true }),

        /**
         * Magic (MAG) — SR4A p.53. The Awakened character's connection to the
         * mana field. 0 for mundanes; non-zero for Magicians, Adepts, Mystic
         * Adepts, and Aspected Magicians.
         *
         * Magic rating determines:
         *   • Maximum Force of spells a Magician can cast (Force ≤ Magic×2 to
         *     avoid guaranteed drain).
         *   • Total Adept Power Points for an Adept (equal to Magic rating).
         *   • Spellcasting and summoning dice pools include Magic as a modifier
         *     in some tests.
         *   • Effective Magic is capped by floor(Essence) — see Essence field above.
         *
         * `base`      = purchased rating (bought at chargen with BP; max 6 for most,
         *               raised with Karma in play).
         * `augmented` = bonus from exceptional means (very rare; the Magical
         *               compounds optional rule, adept centering, etc.).
         *
         * For mundane characters, both fields stay at 0. The isAwakened getter
         * checks awakened.type AND magic.base > 0.
         */
        // Magic: 0 = mundane; non-zero = Awakened (Magician/Adept/Mystic Adept)
        magic: new fields.SchemaField({
          base:    new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),

        /**
         * Resonance (RES) — SR4A p.53. The Technomancer's innate connection to the
         * Matrix. Analogous to Magic for Technomancers; 0 for non-Technomancers.
         *
         * Resonance rating determines:
         *   • Technomancer's Living Persona attributes (see lpSignal getter).
         *   • Total number of Registered Sprites a TM can maintain (Resonance).
         *   • Threading (improvised complex forms) uses Resonance in the dice pool.
         *   • Fading resistance: Willpower + Resonance (analogous to drain resist).
         *
         * Technomancers cannot use cyberware (it reduces Essence, which caps
         * effective Resonance just like it caps Magic). Most TMs are 'soft' —
         * avoiding chrome entirely.
         *
         * `base`      = purchased Resonance rating.
         * `augmented` = bonus from exceptional means (extremely rare in canon).
         */
        // Resonance: 0 = non-Technomancer; non-zero = Technomancer
        resonance: new fields.SchemaField({
          base:    new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        })
      }),

      // ── CONDITION MONITORS ────────────────────────────────────────────────
      //
      // SR4A uses two condition monitors to track damage (SR4A p.163-164):
      //
      //   PHYSICAL — tracks physical (lethal) damage from bullets, blades,
      //   fire, crashing vehicles, etc. Filling the Physical CM means the
      //   character is dying and will begin to die on the next initiative pass
      //   unless stabilized.
      //
      //   STUN — tracks stun (non-lethal) damage from tasers, fists, some
      //   spells, and overflow from a full Stun CM (excess stun overflows to
      //   Physical). Filling the Stun CM knocks the character unconscious.
      //
      // Damage is recorded in BOXES (each box = 1 point of damage of that type).
      // The maximum boxes on each monitor are COMPUTED from attributes (see
      // physicalCMMax and stunCMMax getters) — only the current damage taken
      // is stored here.
      //
      // WOUND MODIFIERS (SR4A p.164): every 3 boxes of total damage (Physical
      // + Stun combined) imposes a -1 die penalty to ALL dice pools. This is
      // computed by the woundModifier getter.

      // Track damage taken (not max — max is computed from Body/Willpower)
      condition: new fields.SchemaField({
        physical: new fields.SchemaField({
          /**
           * Current Physical damage boxes filled. Increases as the character
           * takes physical damage. Never stored negative; capped by physicalCMMax
           * at the sheet level.
           * physicalCMMax = 8 + ceil(Body / 2) — see getter below.
           */
          value: new fields.NumberField({ initial: 0, min: 0, integer: true })
          // max = 8 + ceil(Body / 2) — computed getter, not stored
        }),
        stun: new fields.SchemaField({
          /**
           * Current Stun damage boxes filled. Increases as the character takes
           * stun damage. When this fills, excess stun overflows 1:1 to Physical.
           * stunCMMax = 8 + ceil(Willpower / 2) — see getter below.
           */
          value: new fields.NumberField({ initial: 0, min: 0, integer: true })
          // max = 8 + ceil(Willpower / 2) — computed getter, not stored
        })
      }),

      // ── INITIATIVE ────────────────────────────────────────────────────────
      //
      // SR4A Initiative (SR4A p.149-150):
      //   Initiative Score = Reaction + Intuition + roll(initiativeDice × d6)
      //
      // Characters act in descending initiative score order. After everyone acts,
      // all scores drop by 10; anyone still at 1+ gets another action (an
      // "Initiative Pass"). Repeat until everyone is at 0 or below.
      //
      // Standard mundane humans roll 1d6 for initiative. Cyberware and magic
      // can increase BOTH the number of dice AND the number of passes:
      //   • Wired Reflexes 1 → +1 initiative die AND +1 initiative pass
      //   • Wired Reflexes 2 → +2 initiative dice AND +2 passes
      //   • Synaptic Booster 1 → +1 die AND +1 pass (bioware equivalent)
      //   • Reaction enhancers → only increase Reaction score, not dice/passes
      //
      // Astral and Matrix initiative use completely different base scores but
      // follow the same subtraction-by-10 structure.

      /**
       * Number of d6s rolled for physical (meatspace) initiative.
       * Base value is 1 (mundane). Increased by Wired Reflexes, Synaptic
       * Boosters, and similar reaction-enhancing cyberware/bioware.
       * Maximum 5 dice in practice (Wired Reflexes 3 gives +3 dice → 4 total,
       * but edge cases could reach 5 with stacked effects).
       * SR4A p.149.
       */
      // Extra initiative dice from wired reflexes, synaptic boosters, etc.
      // Base: Reaction + Intuition + 1d6 (mundane) — stored as extra dice
      initiativeDice: new fields.NumberField({ initial: 1, min: 1, max: 5, integer: true }),

      /**
       * Number of Initiative Passes per combat round (physical initiative).
       * Base value is 1. Increased by the same ware that increases initiative dice
       * (Wired Reflexes, Synaptic Booster). Maximum 4 passes in practice.
       * More passes = more actions per round, hence extreme value of high-end ware.
       * SR4A p.149-150.
       */
      // Bonus initiative passes from items (Wired Reflexes adds passes in SR4)
      initiativePasses: new fields.NumberField({ initial: 1, min: 1, max: 4, integer: true }),

      /**
       * Astral initiative dice count (for Awakened characters in astral space).
       * Astral Initiative Score = Intuition × 2 + roll(astralInitDice × d6).
       * Fixed at 2d6 for all Awakened; the min/max both set to 2 enforces this.
       * SR4A p.193.
       */
      // Astral initiative dice (for Awakened)
      astralInitDice: new fields.NumberField({ initial: 2, min: 2, max: 2, integer: true }),

      /**
       * Matrix initiative dice count (for hackers/Technomancers in VR).
       * Matrix (VR) Initiative Score = Response + System + roll(matrixInitDice × d6).
       * Fixed at 3d6 for cold-sim VR; hot-sim VR adds +1 bonus die (handled at
       * roll time based on vrMode). SR4A p.226.
       */
      // Matrix initiative dice (for deckers/TMs in VR)
      matrixInitDice: new fields.NumberField({ initial: 3, min: 3, max: 3, integer: true }),

      // ── ACTIVE SKILLS ─────────────────────────────────────────────────────
      //
      // SR4A Active Skills (SR4A Ch.5, p.118). Every skill links to one primary
      // attribute. Dice pool for a skill test = Skill Rating + Linked Attribute.
      //
      // DEFAULTING (SR4A p.119): If a character has no rating in a skill (0),
      // they may still attempt the test at -1 die using only the linked attribute,
      // UNLESS the skill is marked Untrainable (e.g., Astral Combat for mundanes).
      //
      // SPECIALIZATIONS (SR4A p.122): A single specialization can be added to any
      // skill. When the specialization applies, the character rolls +2 additional
      // dice. Specializations cost 2 BP at chargen or 2 Karma in play.
      //
      // SKILL MAXIMUMS:
      //   • Normal max at chargen: 6 (or 7 with Aptitude quality for one skill)
      //   • Normal augmented max: cannot be raised above natural max with ware
      //     (exception: Cerebral Booster raises Logic-based skill pools indirectly)
      //
      // Skills are grouped here by type for readability and to match the SR4A
      // skill list. The schema stores ALL defined active skills; a skill with
      // value 0 is simply unskilled.

      // Skill value 0 = untrained (must default), 1-6 normal, 7 with Aptitude quality
      skills: new fields.SchemaField({

        // ── COMBAT ACTIVE SKILLS ─────────────────────────────────────────
        // All ranged combat skills link to Agility.
        // All melee combat skills also link to Agility.
        // Unarmed Combat links to Agility.
        // SR4A p.130-131 (combat skills section).

        // COMBAT ACTIVE
        /**
         * Archery (AGI) — SR4A p.130. Bows, crossbows, and similar muscle-powered
         * ranged weapons. A niche skill but silent and controllable.
         */
        archery:          skill(),

        /**
         * Automatics (AGI) — SR4A p.130. Submachine guns, assault rifles, and
         * light machine guns. The bread-and-butter skill for street samurai. Covers
         * burst fire and full-auto modes that require burst/FA-capable weapons.
         */
        automatics:       skill(),

        /**
         * Blades (AGI) — SR4A p.130. All edged melee weapons: knives, swords,
         * monofilament whips, and similar cutting implements. Damage code is
         * usually expressed as STR+N P or S.
         */
        blades:           skill(),

        /**
         * Clubs (AGI) — SR4A p.130. Impact melee weapons: batons, staves,
         * hammers, saps. Typically deals Stun rather than Physical damage.
         */
        clubs:            skill(),

        /**
         * Exotic Melee Weapon (AGI) — SR4A p.130. Covers unusual melee weapons
         * that don't fit other categories. Each exotic weapon may require its own
         * separate skill.
         */
        exoticMelee:      skill(),

        /**
         * Exotic Ranged Weapon (AGI) — SR4A p.130. Non-standard ranged weapons:
         * gyrojet pistols, net guns, spearguns, shuriken launchers, etc. Each
         * may require a separate skill instance.
         */
        exoticRanged:     skill(),

        /**
         * Heavy Weapons (AGI) — SR4A p.130. Machine guns, grenade launchers,
         * rocket launchers, and other crew-served or very large weapons. High
         * recoil (usually requires a Strength check or mount). Typically military
         * hardware that's hard to conceal.
         */
        heavyWeapons:     skill(),

        /**
         * Longarms (AGI) — SR4A p.130. Rifles, shotguns, and sniper rifles.
         * Key skill for sharpshooters and overwatch specialists.
         */
        longarms:         skill(),

        /**
         * Pistols (AGI) — SR4A p.130. Light pistols, heavy pistols, machine
         * pistols, hold-outs. The most common weapon skill among shadowrunners
         * due to concealability.
         */
        pistols:          skill(),

        /**
         * Throwing Weapons (AGI) — SR4A p.130. Grenades, shuriken, throwing
         * knives, and other hurled weapons. Range determined by Strength.
         */
        throwingWeapons:  skill(),

        /**
         * Unarmed Combat (AGI) — SR4A p.130. Bare-knuckle fighting, martial arts,
         * and cyber-implant melee (spurs, hand razors, etc. when used as part of
         * a strike). Damage value = STR (Stun, converted to Physical with a Called
         * Shot or with weapons).
         */
        unarmedCombat:    skill(),

        // ── PHYSICAL ACTIVE SKILLS ───────────────────────────────────────
        // Skills governing physical actions other than combat.
        // Most link to Agility or Intuition. SR4A p.131-132.

        // PHYSICAL ACTIVE
        /**
         * Disguise (INT) — SR4A p.131. Changing one's appearance to deceive
         * observers. Opposed by Perception.
         */
        disguise:         skill(),

        /**
         * Escape Artist (AGI) — SR4A p.131. Slipping out of restraints,
         * squeezing through narrow spaces, and similar contortion feats.
         */
        escapeArtist:     skill(),

        /**
         * Gymnastics (AGI) — SR4A p.131. Athletic movement: running obstacles,
         * climbing, acrobatics, falling safely. Also used for diving for cover.
         */
        gymnastics:       skill(),

        /**
         * Palming (AGI) — SR4A p.131. Sleight of hand — concealing objects,
         * picking pockets, card tricks, passing contraband. Opposed by Perception.
         */
        palming:          skill(),

        /**
         * Perception (INT) — SR4A p.131. Noticing things. One of the most
         * universally rolled skills. Spot ambushes, find clues, detect surveillance.
         */
        perception:       skill(),

        /**
         * Running (STR) — SR4A p.131. Sprint speed and endurance over distance.
         * Determines how far a character moves when sprinting beyond base movement.
         */
        running:          skill(),

        /**
         * Sneaking (AGI) — SR4A p.131. Moving without being heard or seen.
         * Opposed by Perception. Critical for infiltration runs.
         */
        sneaking:         skill(),

        /**
         * Swimming (STR) — SR4A p.132. Staying afloat, swimming distance,
         * underwater maneuvering. Linked to Strength.
         */
        swimming:         skill(),

        /**
         * Tracking (INT) — SR4A p.132. Following trails through terrain;
         * reading signs of passage. Linked to Intuition.
         */
        tracking:         skill(),

        // ── SOCIAL ACTIVE SKILLS ─────────────────────────────────────────
        // Skills governing interactions with other characters.
        // All link to Charisma. SR4A p.132.

        // SOCIAL ACTIVE
        /**
         * Con (CHA) — SR4A p.132. Fast-talking, misdirection, and deception
         * in interpersonal contexts.
         */
        con:              skill(),

        /**
         * Etiquette (CHA) — SR4A p.132. Knowing correct behaviors and protocols
         * for a given social group (corporate, street, tribal, etc.).
         * Specialization options: Corporate, Street, Gang, etc.
         */
        etiquette:        skill(),

        /**
         * Impersonation (CHA) — SR4A p.132. Mimicking a specific person's voice,
         * mannerisms, and behavior. Usually combined with Disguise.
         */
        impersonation:    skill(),

        /**
         * Intimidation (CHA) — SR4A p.132. Coercing compliance through fear,
         * threats, or implied violence.
         */
        intimidation:     skill(),

        /**
         * Leadership (CHA) — SR4A p.132. Inspiring, commanding, and directing
         * groups in extended operations.
         */
        leadership:       skill(),

        /**
         * Negotiation (CHA) — SR4A p.132. Bargaining, deal-making, and formal
         * discussion aimed at mutual agreement. Used when setting run fees, buying
         * gear, and resolving disputes without violence.
         */
        negotiation:      skill(),

        // ── MAGIC ACTIVE SKILLS ──────────────────────────────────────────
        // Only Awakened characters use these skills. Rating 0 is effectively
        // forbidden for mundanes (most are Untrainable). SR4A p.132-133.

        // MAGIC ACTIVE (zero for mundanes)
        /**
         * Assensing (INT) — SR4A p.132. Reading the astral aura of a person,
         * place, or object. Requires Astral Perception (free for Awakened).
         */
        assensing:        skill(),

        /**
         * Astral Combat (WIL) — SR4A p.132. Fighting in astral space. Uses
         * Willpower as linked attribute. Mundane characters cannot use this skill.
         */
        astralCombat:     skill(),

        /**
         * Banishing (MAG) — SR4A p.132. Disrupting or dispersing summoned
         * spirits. Opposed by the spirit's resistance roll.
         */
        banishing:        skill(),

        /**
         * Binding (MAG) — SR4A p.132. Formalizing the service relationship
         * with a spirit for additional services beyond initial summoning.
         */
        binding:          skill(),

        /**
         * Counterspelling (MAG) — SR4A p.132. Defending against incoming spells
         * (adding dice to Spell Defense rolls) and dispelling ongoing spells.
         * One of the most important defensive tools for a combat mage.
         */
        counterspelling:  skill(),

        /**
         * Ritual Spellcasting (MAG) — SR4A p.133. Casting extended ritual spells
         * that take longer but can affect targets at great range.
         */
        ritualSpellcasting: skill(),

        /**
         * Spellcasting (MAG) — SR4A p.133. The primary offensive/utility skill
         * for Magicians. Used to cast spells (Force dice, resisted by target).
         * Drain resistance is separate (Willpower + CHA or INT by tradition).
         */
        spellcasting:     skill(),

        /**
         * Summoning (MAG) — SR4A p.133. Calling spirits from the metaplanes.
         * Net hits determine services granted; drain is suffered from the attempt.
         */
        summoning:        skill(),

        // ── TECHNICAL ACTIVE SKILLS ──────────────────────────────────────
        // Skills for tech, medicine, hacking, crafting, and engineering.
        // Mostly link to Logic. SR4A p.133-134.

        // TECHNICAL ACTIVE
        /**
         * Aeronautics Mechanic (LOG) — SR4A p.133. Repairing and modifying
         * aircraft and aerospace vehicles.
         */
        aeronauticsMechanic: skill(),

        /**
         * Automotive Mechanic (LOG) — SR4A p.133. Repairing and modifying
         * ground vehicles. The most commonly useful mechanic skill.
         */
        automotiveMechanic:  skill(),

        /**
         * Biotechnology (LOG) — SR4A p.133. Knowledge and application of
         * bioware, medical biotech, and biological engineering.
         */
        biotechnology:    skill(),

        /**
         * Chemistry (LOG) — SR4A p.133. Synthesizing compounds: pharmaceuticals,
         * explosives, drugs, toxins. Requires a lab and time.
         */
        chemistry:        skill(),

        /**
         * Computer (LOG) — SR4A p.133. General matrix operations: standard programs,
         * AR navigation, basic data search and manipulation. NOT the hacking skill.
         */
        computer:         skill(),

        /**
         * Cybercombat (LOG) — SR4A p.133. Fighting IC, hostile agents, and opposing
         * hackers in direct matrix combat. The decker's primary offensive matrix skill.
         */
        cybercombat:      skill(),

        /**
         * Cybertechnology (LOG) — SR4A p.133. Installing, repairing, and modifying
         * cyberware. Requires a medical facility.
         */
        cybertechnology:  skill(),

        /**
         * Data Search (LOG) — SR4A p.133. Searching the matrix for information.
         * Threshold set by how obscure/hidden the data is.
         */
        dataSearch:       skill(),

        /**
         * Demolitions (LOG) — SR4A p.133. Placing, shaping, and defusing explosives.
         * Failure is dramatic. Critical failure is lethal.
         */
        demolitions:      skill(),

        /**
         * Electronic Warfare (LOG) — SR4A p.133. Jamming signals, spoofing comms,
         * defeating tracking systems, and counter-electronic operations.
         */
        electronicWarfare: skill(),

        /**
         * Forgery (LOG) — SR4A p.133. Creating fake documents, identities,
         * and other fraudulent physical or digital records.
         */
        forgery:          skill(),

        /**
         * Hacking (LOG) — SR4A p.133. Unauthorized system access. Defeats security
         * programs (Firewall), plants exploits, manipulates system data.
         */
        hacking:          skill(),

        /**
         * Hardware (LOG) — SR4A p.133. Building, repairing, and modifying electronic
         * and mechanical hardware (comms, drones, weapons modifications).
         */
        hardware:         skill(),

        /**
         * Industrial Mechanic (LOG) — SR4A p.133. Heavy industrial machinery:
         * factory equipment, construction rigs, non-vehicle mechanical systems.
         */
        industrialMechanic: skill(),

        /**
         * Locksmith (AGI) — SR4A p.134. Picking locks, defeating physical security,
         * safe-cracking. One of the few Technical skills linked to Agility.
         */
        locksmith:        skill(),

        /**
         * Nautical Mechanic (LOG) — SR4A p.134. Repairing and modifying watercraft.
         */
        nauticalMechanic: skill(),

        /**
         * Software (LOG) — SR4A p.134. Writing, modifying, and analyzing programs.
         * Technomancers use this alongside Hacking for digital operations.
         */
        software:         skill(),

        // ── VEHICLE ACTIVE SKILLS ────────────────────────────────────────
        // All Pilot skills link to Reaction (physical reflexes key to vehicle
        // control). SR4A p.134-135.

        // VEHICLE ACTIVE
        /**
         * Pilot Aerospace (REA) — SR4A p.134. Spacecraft and high-altitude
         * aircraft including shuttles and similar. Extremely niche.
         */
        pilotAerospace:   skill(),

        /**
         * Pilot Aircraft (REA) — SR4A p.134. Fixed-wing aircraft, VTOL, rotary-
         * wing craft (helicopters), and similar atmospheric vehicles.
         */
        pilotAircraft:    skill(),

        /**
         * Pilot Anthroform (REA) — SR4A p.134. Anthroform drones and bipedal
         * robotic platforms. A specialty rigger skill.
         */
        pilotAnthroform:  skill(),

        /**
         * Pilot Exotic Vehicle (REA) — SR4A p.134. Non-standard vehicles that
         * don't fit other categories (hovercrafts, powered armor, etc.).
         */
        pilotExotic:      skill(),

        /**
         * Pilot Ground Craft (REA) — SR4A p.134. Cars, trucks, motorcycles, and
         * other ground vehicles. Most commonly used Pilot skill. Riggers specialize
         * here; non-riggers still want a few dice for getaway driving.
         */
        pilotGroundCraft: skill(),

        /**
         * Pilot Watercraft (REA) — SR4A p.134. Boats, submarines, and other
         * waterborne vehicles.
         */
        pilotWatercraft:  skill()
      }),

      // ── KNOWLEDGE & LANGUAGE SKILLS ───────────────────────────────────────
      //
      // Knowledge Skills (SR4A p.122-123) are free-form — players name them.
      // They represent background expertise (street knowledge, academic
      // disciplines, professional experience, interests/hobbies). The GM
      // determines which attribute applies based on the type of knowledge test.
      //
      // Categories (SR4A p.122):
      //   • street     — underground culture, criminal networks, gang turf
      //   • academic   — formal/scholarly knowledge (history, science, etc.)
      //   • interest   — hobbies, entertainment, personal passions
      //   • professional — career-level expertise (medicine, law, security)
      //
      // Knowledge skills are bought with a separate pool of (LOG + INT) × 3
      // free points at chargen (SR4A p.83) and with Karma in play (1 Karma each).
      // Specializations work the same as active skill specializations (+2 dice).

      // Knowledge and language skills (free-form)
      /**
       * Array of knowledge skill entries. Each entry is a named skill with a
       * category, rating, and optional specialization.
       */
      knowledgeSkills: new fields.ArrayField(new fields.SchemaField({
        /** Name of the knowledge skill (e.g., "Aztechnology Corporate Politics"). */
        name:     new fields.StringField({ initial: "" }),
        /**
         * Category determines which attribute the GM typically calls for:
         * Street → usually INT, Academic → LOG, Professional → LOG, Interest → INT.
         */
        category: new fields.StringField({ initial: "street",
          choices: ["street", "academic", "interest", "professional"] }),
        /** Skill rating 1-12 (knowledge skills can sometimes exceed 6 in play). */
        value:    new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
        /** Optional specialization for +2 dice when it applies. */
        specialization: new fields.StringField({ initial: "" })
      })),

      /**
       * Language skills (SR4A p.123). Characters get their native language free.
       * Additional languages cost BP at chargen or Karma in play.
       * Ratings: 1=Tourist, 3=Conversational, 5=Fluent, 7=Native-equivalent, 9=Expert.
       */
      languageSkills: new fields.ArrayField(new fields.SchemaField({
        /** Language name (e.g., "English", "Aztlan Spanish", "Or'zet"). */
        name:  new fields.StringField({ initial: "" }),
        /** Language proficiency rating. Native speakers default to N (treated as rating 12). */
        value: new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
        /**
         * True if this is the character's native language. Native languages are
         * given free at chargen based on metatype/background. SR4A p.123.
         */
        native: new fields.BooleanField({ initial: false })
      })),

      // ── MAGIC (Awakened only) ─────────────────────────────────────────────
      //
      // Awakened characters — those with a connection to mana — fall into
      // four categories in SR4A (p.176-177):
      //   • magician     — full spellcasting, summoning, astral projection
      //   • adept        — channels magic internally for physical enhancement;
      //                    adept powers instead of spells; no spellcasting
      //   • mysticAdept  — partial access to both; splits Magic between spell
      //                    pool and adept power points (via BP/Karma allocation)
      //   • aspected     — specializes in one magical art only; cheaper but limited
      //   • none         — mundane (no magic)
      //
      // Magical tradition (hermetic vs. shaman vs. other) affects which attribute
      // modifies drain resistance (CHA for hermetic, INT for shaman by default).

      awakened: new fields.SchemaField({
        /**
         * Type of Awakened character. Determines which magical abilities are
         * available. "none" = mundane (default). SR4A p.176.
         */
        type: new fields.StringField({ initial: "none",
          choices: ["none", "magician", "adept", "mysticAdept", "aspected"] }),

        /**
         * Magical tradition (e.g., "Hermetic", "Shamanic", "Buddhist", "Wiccan").
         * Tradition determines which spirits can be summoned, the drain resistance
         * attribute (Hermetic: WIL+CHA; Shaman: WIL+INT), and astral interactions.
         * SR4A p.183-184.
         */
        tradition: new fields.StringField({ initial: "" }),

        /**
         * Mentor spirit (e.g., "Shark", "Bear", "Raven", "Wolf"). Optional.
         * Grants +2 dice in one category and imposes a behavioral compulsion.
         * SR4A p.197.
         */
        mentor:    new fields.StringField({ initial: "" }),

        /**
         * Adept Power Points — only relevant for Adepts and Mystic Adepts.
         *   • `total` = total power points = Magic rating (pure Adept) or the
         *               portion of Magic allocated to adept powers (Mystic Adept).
         *   • `spent` = power points committed to purchased adept powers. Each
         *               power costs a fixed number of points (SR4A p.194-196).
         * adeptPointsRemaining getter = total - spent.
         */
        adeptPoints: new fields.SchemaField({
          total: new fields.NumberField({ initial: 0, min: 0, integer: true }),
          spent: new fields.NumberField({ initial: 0, min: 0, integer: true })
        })
      }),

      // ── MATRIX (Hackers / Deckers) ────────────────────────────────────────
      //
      // In SR4A, the Matrix runs on wireless mesh networking and AR overlays.
      // Every character has a commlink; Deckers (hackers) have high-end
      // commlinks running hacking programs to penetrate secure hosts.
      //
      // COMMLINK ATTRIBUTES (SR4A p.216-217):
      //   • Response  — Speed/reaction time of the hardware. Limits max dice
      //                 pools in many matrix actions.
      //   • Signal    — Wireless range and signal strength (higher = longer reach).
      //   • System    — OS/software platform quality. Determines how many programs
      //                 can run simultaneously (= System rating) and caps many pools.
      //   • Firewall  — Security hardening. Primary defense vs. intrusion attempts.
      //                 Hacking+Exploit vs. Firewall+System to breach a system.

      matrix: new fields.SchemaField({
        /**
         * The character's commlink hardware and software configuration.
         * Even mundane characters have one (SR4A p.216). Deckers invest heavily
         * here. Technomancers use their Living Persona instead (see techno + lp* getters).
         */
        commlink: new fields.SchemaField({
          /**
           * Response (1-6) — commlink hardware speed. Caps many matrix action dice
           * pools. Used in matrix initiative calculation (Response + System). SR4A p.217.
           */
          response: new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),

          /**
           * Signal (1-9) — wireless broadcast range in meters (roughly 10^Signal m).
           * Signal 1 ≈ 10m; Signal 6 ≈ 1km; Signal 9 = global (satellite uplink).
           * SR4A p.217.
           */
          signal:   new fields.NumberField({ initial: 1, min: 1, max: 9, integer: true }),

          /**
           * System (1-6) — OS quality. Limits programs running simultaneously
           * (= System rating). Part of defense: Firewall + System vs. attacker pool.
           * SR4A p.217.
           */
          system:   new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),

          /**
           * Firewall (1-6) — security hardening. Primary defense vs. unauthorized
           * access. Most intrusion attempts roll: Hacking + Exploit vs. Firewall + System.
           * SR4A p.217.
           */
          firewall: new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),

          /** Flavor name of the commlink device (e.g., "Hermes Ikon", "Novatech Airwave"). */
          name:     new fields.StringField({ initial: "" }),

          /** Model/brand for quick identification on the character sheet. */
          model:    new fields.StringField({ initial: "" })
        }),

        // Active programs (tracked separately as items, but pool here for quick ref)
        /**
         * Hacking pool — pre-computed quick-reference pool for common matrix attacks
         * (typically Hacking or Cybercombat + Logic). Updated by sheet logic.
         */
        hackingPool:  new fields.NumberField({ initial: 0, min: 0, integer: true }),

        /**
         * Current VR mode — affects matrix initiative and test modifiers (SR4A p.226):
         *   • ar       — Augmented Reality. Uses physical initiative. Safer but slower.
         *   • coldSim  — Cold-sim VR. Full immersion; matrix init = Response+System+3d6;
         *                Stun damage from IC/fading.
         *   • hotSim   — Hot-sim VR. Full immersion with biofeedback; +1 die all matrix
         *                tests, +1 initiative die (4d6 total); Physical damage from IC/fading.
         *                Illegal and extremely dangerous.
         */
        // For VR mode
        vrMode: new fields.StringField({ initial: "ar",
          choices: ["ar", "coldSim", "hotSim"] }),

        // Persona rating for quick reference
        /**
         * Persona rating — quick-reference value for the decker's virtual body strength.
         * Often approximates commlink System or Response for informal rulings.
         */
        personaRating: new fields.NumberField({ initial: 0, min: 0, integer: true })
      }),

      // ── TECHNOMANCER (if resonance > 0) ──────────────────────────────────
      //
      // Technomancers (SR4A p.232-245) connect to the Matrix through innate
      // Resonance rather than hardware. Instead of a commlink, they project a
      // "Living Persona" — a manifestation of their mind in the Matrix with
      // attributes derived from their own stats:
      //
      //   Living Persona attributes (computed by getters below):
      //     Response = Intuition
      //     Signal   = Resonance + 2
      //     System   = Logic
      //     Firewall = Willpower
      //
      // Instead of programs, TMs use "Complex Forms" — learned thought patterns
      // that achieve the same effects. They can also "Thread" (improvise complex
      // forms) at the cost of Fading damage.
      //
      // FADING (SR4A p.239): the TM equivalent of drain. Resisted with
      // Resonance + Willpower. Fading can be Stun or Physical depending on
      // the Threading result severity.

      // Living Persona: derived from attributes, stored for display
      // Response=Intuition, Signal=Resonance+2, System=Logic, Firewall=Willpower
      // Threading and fading tracked here
      techno: new fields.SchemaField({
        /**
         * Whether this character is a Technomancer. Must be true AND resonance > 0
         * for the isTechnomancer getter to return true.
         */
        active: new fields.BooleanField({ initial: false }),

        /**
         * Fading resistance pool (pre-computed for display). In play:
         * Fading Resist = Resonance + Willpower dice (SR4A p.239).
         * Stored here as a reference value; actual roll uses live attribute values.
         */
        fadingResist: new fields.NumberField({ initial: 0, min: 0, integer: true }),

        /**
         * Array of Complex Forms known by the Technomancer. Complex forms are
         * the TM equivalent of programs — each is a learned pattern/technique.
         * SR4A p.240-243 lists available complex forms.
         *
         * Each entry records:
         *   • name     — form name (e.g., "Armor", "Attack", "Decrypt")
         *   • target   — what it targets (Device, IC, Persona, Sprite, etc.)
         *   • duration — S (Sustained), P (Permanent), I (Instantaneous)
         *   • fading   — Fading value when threaded (e.g., "L-3", "L+2")
         *   • notes    — free text for reminders, house rules, etc.
         */
        complexForms: new fields.ArrayField(new fields.SchemaField({
          name:   new fields.StringField({ initial: "" }),
          target: new fields.StringField({ initial: "" }),
          duration: new fields.StringField({ initial: "" }),
          fading:   new fields.StringField({ initial: "" }),
          notes:    new fields.StringField({ initial: "" })
        }))
      }),

      // ── NUYEN / LIFESTYLE ─────────────────────────────────────────────────
      //
      // Nuyen (¥) is the standard currency of the Sixth World. SR4A p.310-315
      // covers equipment costs. Starting nuyen at chargen depends on the
      // Resources priority selected (Priority A = ¥1,000,000; Priority E = ¥5,000).
      //
      // Lifestyle (SR4A p.328-330) represents where the character lives and
      // the recurring monthly cost. Monthly costs by tier:
      //   • street   — free (homeless, squatting)
      //   • squatter — ¥100/month
      //   • low      — ¥2,000/month
      //   • middle   — ¥5,000/month
      //   • high     — ¥10,000/month
      //   • luxury   — ¥100,000/month

      /** Current nuyen on hand. Decremented by purchases, upkeep, bribes. */
      nuyen:     new fields.NumberField({ initial: 0, min: 0, integer: true }),

      /**
       * Current lifestyle tier. The GM may allow the character to live below their
       * paid lifestyle but not above without extra nuyen. Affects certain social tests.
       */
      lifestyle: new fields.StringField({ initial: "street",
        choices: ["street", "squatter", "low", "middle", "high", "luxury"] }),

      // ── KARMA ─────────────────────────────────────────────────────────────
      //
      // Karma is SR4A's experience point system (SR4A p.264):
      //   • current — unspent Karma available to spend.
      //   • total   — all Karma ever earned (tracks advancement level).
      //
      // Karma costs (SR4A p.265):
      //   • Active skill +1:       (new rating) × 2 Karma
      //   • Attribute +1:          (new rating) × 5 Karma
      //   • New skill at rating 1: 4 Karma
      //   • Specialization:        2 Karma
      //   • Complex form (TM):     4 Karma
      //   • Spell:                 5 Karma
      //   • Edge +1:               25 Karma (very expensive)
      //
      // NOTE: Edge is the spendable resource for gaining advantages; it is NOT a Karma Pool.

      karma: new fields.SchemaField({
        /** Karma available to spend. Decremented when improvements are purchased. */
        current: new fields.NumberField({ initial: 0, min: 0, integer: true }),
        /**
         * Lifetime total Karma earned. Always increases; never decremented.
         * Used to gauge overall character power level.
         */
        total:   new fields.NumberField({ initial: 0, min: 0, integer: true })
      }),

      // ── BUILD POINTS (for character creation tracking) ───────────────────
      //
      // SR4A uses a Build Point (BP) system for character creation (SR4A p.82-90).
      // Standard starting characters have 400 BP to spend on:
      //   • Metatype racial qualities (variable cost)
      //   • Attributes: (attribute rating) × 10 BP (above racial minimum)
      //   • Skills: (skill rating) × 2 BP; skill groups × 5 BP per rating
      //   • Complex forms (TM): 4 BP each
      //   • Spells: 3 BP each
      //   • Resources (nuyen): 1 BP per ¥5,000
      //   • Qualities: positive costs BP; negative grants BP
      //   • Contacts: (Loyalty + Connection) BP per contact
      //
      // This section tracks the BP budget for chargen assistance only;
      // it has no mechanical effect during play.

      buildPoints: new fields.SchemaField({
        /**
         * Total BP pool. Standard = 400. May be higher for more powerful games
         * (Runner's Companion suggests 500 BP for experienced archetypes).
         */
        total:  new fields.NumberField({ initial: 400, integer: true }),
        /**
         * BP spent so far. Sheet logic should sum all purchases and update this.
         * Remaining BP = total - spent.
         */
        spent:  new fields.NumberField({ initial: 0, min: 0, integer: true })
      }),

      // ── NOTES ─────────────────────────────────────────────────────────────
      //
      // Free-text / HTML fields for narrative content. Stored as HTML to allow
      // rich formatting in the Foundry editor widget.

      /** Character's background, history, and personality notes. Player-facing. */
      background: new fields.HTMLField({ initial: "" }),

      /** General notes — contacts met, run logs, gear wish lists, etc. */
      notes:      new fields.HTMLField({ initial: "" }),

      /** GM-only notes (secrets, hidden agendas, planned reveals). Hidden from player. */
      gmNotes:    new fields.HTMLField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ────────────────────────────────────────────────────
  //
  // These values are DERIVED at runtime from stored schema fields. They are
  // never persisted to the database — recalculated every time they're accessed.
  // This ensures they stay in sync with base attributes and augmented bonuses
  // without requiring manual updates.

  /**
   * Returns the effective total value of a named attribute, combining the stored
   * `base` (natural rating) with any `augmented` bonus from cyberware, bioware,
   * adept powers, spells, or other enhancements.
   *
   * This is the value that goes into dice pools for all game tests.
   *
   * @param {string} name - Attribute key (e.g., "body", "agility", "magic")
   * @returns {number} base + augmented, or 0 if attribute not found.
   *
   * @example
   * // A character with Body 4 base and Titanium Bone Lacing (+2 augmented):
   * this.attr("body") // => 6
   */
  attr(name) {
    const a = this.attributes[name];
    if (!a) return 0;
    // Edge is stored differently (base+current), but all true attributes have
    // base + augmented. Essence is a flat NumberField (no sub-fields).
    if (a.base !== undefined) return a.base + (a.augmented ?? 0);
    return a;
  }

  /**
   * Maximum boxes on the Physical Condition Monitor.
   *
   * Formula: 8 + ceil(Body / 2)  (SR4A p.163)
   *
   * Examples by Body:
   *   Body 1 → 9 boxes   Body 4 → 10 boxes   Body 7 → 12 boxes
   *   Body 2 → 9 boxes   Body 5 → 11 boxes   Body 8 → 12 boxes
   *   Body 3 → 10 boxes  Body 6 → 11 boxes   Body 9 → 13 boxes
   *
   * When all Physical boxes are filled, the character is dying and falls
   * unconscious; they lose 1 box per Combat Turn until stabilized.
   *
   * @returns {number} Physical CM maximum
   */
  get physicalCMMax() {
    return 8 + Math.ceil(this.attr("body") / 2);
  }

  /**
   * Maximum boxes on the Stun Condition Monitor.
   *
   * Formula: 8 + ceil(Willpower / 2)  (SR4A p.163)
   *
   * Examples by Willpower:
   *   WIL 1 → 9 boxes   WIL 4 → 10 boxes   WIL 7 → 12 boxes
   *   WIL 2 → 9 boxes   WIL 5 → 11 boxes
   *   WIL 3 → 10 boxes  WIL 6 → 11 boxes
   *
   * When all Stun boxes are filled, the character is knocked unconscious.
   * Overflow stun damage transfers to the Physical CM at 1:1.
   *
   * @returns {number} Stun CM maximum
   */
  get stunCMMax() {
    return 8 + Math.ceil(this.attr("willpower") / 2);
  }

  /**
   * Wound modifier — the dice penalty applied to ALL dice pools (including
   * defense, initiative, and skill tests) based on accumulated damage.
   *
   * Formula: -floor((Physical boxes + Stun boxes) / 3)  (SR4A p.164)
   *
   * Examples:
   *   0-2 boxes total  →  0 penalty
   *   3-5 boxes total  → -1 die
   *   6-8 boxes total  → -2 dice
   *   9-11 boxes total → -3 dice
   *
   * This is one of the most significant attrition mechanics in SR4A — characters
   * in a protracted firefight degrade rapidly. Street medics and stim patches
   * exist specifically to counteract this.
   *
   * @returns {number} Negative integer (or 0 if undamaged). Apply to all pools.
   */
  get woundModifier() {
    const physBoxes = this.condition.physical.value;
    const stunBoxes = this.condition.stun.value;
    return -Math.floor((physBoxes + stunBoxes) / 3);
  }

  /**
   * Base initiative score for physical (meatspace) combat, before rolling dice.
   *
   * Formula: Reaction + Intuition  (SR4A p.149)
   *
   * At the start of each Initiative Phase, the character rolls their initiative
   * dice (initiativeDice × d6) and adds this base score to get their Initiative
   * Score for that pass.
   *
   * Full formula: Initiative Score = Reaction + Intuition + Σ(initiativeDice × d6)
   *
   * @returns {number} Reaction + Intuition (pre-dice component of initiative)
   */
  get initiativeBase() {
    return this.attr("reaction") + this.attr("intuition");
  }

  /**
   * Composure test dice pool — used when a character must maintain emotional
   * control under stress (witnessing horrific violence, social humiliation, etc.).
   *
   * Formula: Willpower + Charisma  (SR4A p.134)
   *
   * Threshold is set by the GM based on severity of the trigger.
   *
   * @returns {number} Willpower + Charisma
   */
  get composure() {
    return this.attr("willpower") + this.attr("charisma");
  }

  /**
   * Judge Intentions test dice pool — used to sense whether someone is lying,
   * gauge emotional state, or read surface motivations.
   *
   * Formula: Intuition + Charisma  (SR4A p.134)
   *
   * Opposed by Con or Composure depending on context.
   *
   * @returns {number} Intuition + Charisma
   */
  get judgeIntentions() {
    return this.attr("intuition") + this.attr("charisma");
  }

  /**
   * Lift/Carry test dice pool — used when attempting to lift very heavy objects
   * or carry loads beyond normal capacity.
   *
   * Formula: Body + Strength  (SR4A p.134)
   *
   * Threshold determined by the object's weight relative to SR4A carrying tables.
   *
   * @returns {number} Body + Strength
   */
  get liftCarry() {
    return this.attr("body") + this.attr("strength");
  }

  /**
   * Memory test dice pool — used when a character must recall information
   * accurately, resist memory manipulation, or remember details under duress.
   *
   * Formula: Logic + Willpower  (SR4A p.135)
   *
   * @returns {number} Logic + Willpower
   */
  get memory() {
    return this.attr("logic") + this.attr("willpower");
  }

  /**
   * Drain resistance dice pool for a Hermetic Magician (the default tradition).
   *
   * Formula: Willpower + Charisma  (SR4A p.185, Hermetic tradition)
   *
   * IMPORTANT: This getter assumes the Hermetic tradition. Shamanic tradition
   * uses Willpower + Intuition instead. A full implementation would select the
   * formula based on awakened.tradition.
   *
   * Drain is suffered after every spell cast. Net drain DV =
   * Drain Value - Spellcasting hits (minimum 0). Overflow drain is Stun damage
   * (Physical if Force > double Magic rating).
   *
   * @returns {number} Willpower + Charisma (Hermetic drain resist pool)
   */
  get drainResist() {
    return this.attr("willpower") + this.attr("charisma");
  }

  // ── TECHNOMANCER LIVING PERSONA ──────────────────────────────────────────
  //
  // Technomancers do not use a hardware commlink. Instead their Resonance
  // manifests as a Living Persona in the Matrix with attributes derived
  // directly from their own mental attributes (SR4A p.235).

  /**
   * Living Persona: Response attribute.
   * Formula: Response = Intuition  (SR4A p.235)
   * Governs the TM's reaction speed in the matrix.
   * @returns {number} Intuition
   */
  get lpResponse() { return this.attr("intuition"); }

  /**
   * Living Persona: Signal attribute.
   * Formula: Signal = Resonance + 2  (SR4A p.235)
   * Governs wireless broadcast range. The +2 reflects the TM's innate reach.
   * @returns {number} Resonance + 2
   */
  get lpSignal() { return this.attr("resonance") + 2; }

  /**
   * Living Persona: System attribute.
   * Formula: System = Logic  (SR4A p.235)
   * Governs the TM's processing power and number of complex forms run simultaneously.
   * @returns {number} Logic
   */
  get lpSystem() { return this.attr("logic"); }

  /**
   * Living Persona: Firewall attribute.
   * Formula: Firewall = Willpower  (SR4A p.235)
   * Primary defense against intrusion — harder to break the will, harder to hack.
   * @returns {number} Willpower
   */
  get lpFirewall() { return this.attr("willpower"); }

  // ── CHARACTER TYPE FLAGS ─────────────────────────────────────────────────

  /**
   * Returns true if this character is Awakened (has a magical nature).
   * Requires BOTH a non-"none" awakened type AND an actual Magic rating > 0.
   * Guards against data entry errors where type is set but Magic was never purchased.
   * @returns {boolean}
   */
  get isAwakened() {
    return this.awakened.type !== "none" && this.attr("magic") > 0;
  }

  /**
   * Returns true if this character is a Technomancer.
   * Requires BOTH the techno.active flag AND a Resonance rating > 0.
   * @returns {boolean}
   */
  get isTechnomancer() {
    return this.techno.active && this.attr("resonance") > 0;
  }

  /**
   * Remaining unspent Adept Power Points.
   *
   * Adept Power Points equal the character's Magic rating (pure Adepts) or the
   * allocated portion (Mystic Adepts). Each adept power purchased costs a fixed
   * number of power points (SR4A p.194-196).
   *
   * A negative return value means the character has over-allocated — the sheet
   * should flag this as an error.
   *
   * @returns {number} total - spent (may be negative if over-allocated)
   */
  get adeptPointsRemaining() {
    return this.awakened.adeptPoints.total - this.awakened.adeptPoints.spent;
  }
}
