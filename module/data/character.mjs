/**
 * CharacterDataModel — Player Character (SR4 20th Anniversary)
 * Full shadowrunner: attributes, skills, condition monitors, edge, matrix, magic.
 */
export class CharacterDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    // Helper: build a standard active skill field
    const skill = (initial = 0) => new fields.SchemaField({
      value: new fields.NumberField({ initial, min: 0, max: 9, integer: true }),
      specialization: new fields.StringField({ initial: "" })
    });

    return {

      // ── IDENTITY ──────────────────────────────────────────────────────────
      handle:     new fields.StringField({ initial: "" }),
      metatype:   new fields.StringField({ initial: "human",
        choices: ["human", "elf", "dwarf", "ork", "troll"] }),
      archetype:  new fields.StringField({ initial: "" }),   // Street Samurai, Decker, etc.
      gender:     new fields.StringField({ initial: "" }),
      age:        new fields.StringField({ initial: "" }),
      height:     new fields.StringField({ initial: "" }),
      weight:     new fields.StringField({ initial: "" }),
      ethnicity:  new fields.StringField({ initial: "" }),
      reputation: new fields.SchemaField({
        streetCred:  new fields.NumberField({ initial: 0, min: 0, integer: true }),
        notoriety:   new fields.NumberField({ initial: 0, min: 0, integer: true }),
        publicAware: new fields.NumberField({ initial: 0, min: 0, integer: true })
      }),

      // ── PHYSICAL ATTRIBUTES ───────────────────────────────────────────────
      // All 1-6 natural max; augmented maximum shown as separate derived value
      attributes: new fields.SchemaField({
        body:      new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true }) // bonus from ware
        }),
        agility:   new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),
        reaction:  new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),
        strength:  new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),
        // ── MENTAL ATTRIBUTES ───────────────────────────────────────────────
        charisma:  new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),
        intuition: new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),
        logic:     new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),
        willpower: new fields.SchemaField({
          base:  new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),
        // ── SPECIAL ATTRIBUTES ──────────────────────────────────────────────
        edge: new fields.SchemaField({
          base:    new fields.NumberField({ initial: 1, min: 1, max: 7, integer: true }),
          current: new fields.NumberField({ initial: 1, min: 0, max: 7, integer: true })
        }),
        // Essence: starts 6.0, reduced by invasive ware (float, 2 decimal places)
        essence: new fields.NumberField({ initial: 6.0, min: 0, max: 6, nullable: true }),
        // Magic: 0 = mundane; non-zero = Awakened (Magician/Adept/Mystic Adept)
        magic: new fields.SchemaField({
          base:    new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        }),
        // Resonance: 0 = non-Technomancer; non-zero = Technomancer
        resonance: new fields.SchemaField({
          base:    new fields.NumberField({ initial: 0, min: 0, max: 12, integer: true }),
          augmented: new fields.NumberField({ initial: 0, min: 0, integer: true })
        })
      }),

      // ── CONDITION MONITORS ────────────────────────────────────────────────
      // Track damage taken (not max — max is computed from Body/Willpower)
      condition: new fields.SchemaField({
        physical: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, integer: true })
          // max = 8 + ceil(Body / 2) — computed getter
        }),
        stun: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0, integer: true })
          // max = 8 + ceil(Willpower / 2) — computed getter
        })
      }),

      // ── INITIATIVE ────────────────────────────────────────────────────────
      // Extra initiative dice from wired reflexes, synaptic boosters, etc.
      // Base: Reaction + Intuition + 1d6 (mundane) — stored as extra dice
      initiativeDice: new fields.NumberField({ initial: 1, min: 1, max: 5, integer: true }),
      // Bonus initiative score from items (Wired Reflexes adds passes, not dice for SR4)
      initiativePasses: new fields.NumberField({ initial: 1, min: 1, max: 4, integer: true }),
      // Astral initiative dice (for Awakened)
      astralInitDice: new fields.NumberField({ initial: 2, min: 2, max: 2, integer: true }),
      // Matrix initiative dice (for deckers/TMs in VR)
      matrixInitDice: new fields.NumberField({ initial: 3, min: 3, max: 3, integer: true }),

      // ── ACTIVE SKILLS ─────────────────────────────────────────────────────
      // Skill value 0 = untrained (must default), 1-6 normal, 7 with Aptitude quality
      skills: new fields.SchemaField({

        // COMBAT ACTIVE
        archery:          skill(),
        automatics:       skill(),
        blades:           skill(),
        clubs:            skill(),
        exoticMelee:      skill(),
        exoticRanged:     skill(),
        heavyWeapons:     skill(),
        longarms:         skill(),
        pistols:          skill(),
        throwingWeapons:  skill(),
        unarmedCombat:    skill(),

        // PHYSICAL ACTIVE
        disguise:         skill(),
        escapeArtist:     skill(),
        gymnastics:       skill(),
        palming:          skill(),
        perception:       skill(),
        running:          skill(),
        sneaking:         skill(),
        swimming:         skill(),
        tracking:         skill(),

        // SOCIAL ACTIVE
        con:              skill(),
        etiquette:        skill(),
        impersonation:    skill(),
        intimidation:     skill(),
        leadership:       skill(),
        negotiation:      skill(),

        // MAGIC ACTIVE (zero for mundanes)
        assensing:        skill(),
        astralCombat:     skill(),
        banishing:        skill(),
        binding:          skill(),
        counterspelling:  skill(),
        ritualSpellcasting: skill(),
        spellcasting:     skill(),
        summoning:        skill(),

        // TECHNICAL ACTIVE
        aeronauticsMechanic: skill(),
        automotiveMechanic:  skill(),
        biotechnology:    skill(),
        chemistry:        skill(),
        computer:         skill(),
        cybercombat:      skill(),
        cybertechnology:  skill(),
        dataSearch:       skill(),
        demolitions:      skill(),
        electronicWarfare: skill(),
        forgery:          skill(),
        hacking:          skill(),
        hardware:         skill(),
        industrialMechanic: skill(),
        locksmith:        skill(),
        nauticalMechanic: skill(),
        software:         skill(),

        // VEHICLE ACTIVE
        pilotAerospace:   skill(),
        pilotAircraft:    skill(),
        pilotAnthroform:  skill(),
        pilotExotic:      skill(),
        pilotGroundCraft: skill(),
        pilotWatercraft:  skill()
      }),

      // Knowledge and language skills (free-form)
      knowledgeSkills: new fields.ArrayField(new fields.SchemaField({
        name:     new fields.StringField({ initial: "" }),
        category: new fields.StringField({ initial: "street",
          choices: ["street", "academic", "interest", "professional"] }),
        value:    new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
        specialization: new fields.StringField({ initial: "" })
      })),

      languageSkills: new fields.ArrayField(new fields.SchemaField({
        name:  new fields.StringField({ initial: "" }),
        value: new fields.NumberField({ initial: 1, min: 1, max: 12, integer: true }),
        native: new fields.BooleanField({ initial: false })
      })),

      // ── MAGIC (Awakened only) ─────────────────────────────────────────────
      awakened: new fields.SchemaField({
        type: new fields.StringField({ initial: "none",
          choices: ["none", "magician", "adept", "mysticAdept", "aspected"] }),
        tradition: new fields.StringField({ initial: "" }),
        mentor:    new fields.StringField({ initial: "" }),
        adeptPoints: new fields.SchemaField({
          total: new fields.NumberField({ initial: 0, min: 0, integer: true }),
          spent: new fields.NumberField({ initial: 0, min: 0, integer: true })
        })
      }),

      // ── MATRIX (Hackers / Deckers) ────────────────────────────────────────
      matrix: new fields.SchemaField({
        // Commlink attributes (hardware)
        commlink: new fields.SchemaField({
          response: new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),
          signal:   new fields.NumberField({ initial: 1, min: 1, max: 9, integer: true }),
          system:   new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),
          firewall: new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),
          name:     new fields.StringField({ initial: "" }),
          model:    new fields.StringField({ initial: "" })
        }),
        // Active programs (tracked separately as items, but pool here for quick ref)
        hackingPool:  new fields.NumberField({ initial: 0, min: 0, integer: true }),
        // For VR mode
        vrMode: new fields.StringField({ initial: "ar",
          choices: ["ar", "coldSim", "hotSim"] }),
        // Persona rating for quick reference
        personaRating: new fields.NumberField({ initial: 0, min: 0, integer: true })
      }),

      // ── TECHNOMANCER (if resonance > 0) ──────────────────────────────────
      // Living Persona: derived from attributes, stored for display
      // Response=Intuition, Signal=Resonance+2, System=Logic, Firewall=Willpower
      // Threading and fading tracked here
      techno: new fields.SchemaField({
        active: new fields.BooleanField({ initial: false }),
        fadingResist: new fields.NumberField({ initial: 0, min: 0, integer: true }),
        complexForms: new fields.ArrayField(new fields.SchemaField({
          name:   new fields.StringField({ initial: "" }),
          target: new fields.StringField({ initial: "" }),
          duration: new fields.StringField({ initial: "" }),
          fading:   new fields.StringField({ initial: "" }),
          notes:    new fields.StringField({ initial: "" })
        }))
      }),

      // ── NUYEN / LIFESTYLE ─────────────────────────────────────────────────
      nuyen:     new fields.NumberField({ initial: 0, min: 0, integer: true }),
      lifestyle: new fields.StringField({ initial: "street",
        choices: ["street", "squatter", "low", "middle", "high", "luxury"] }),

      // ── KARMA ─────────────────────────────────────────────────────────────
      karma: new fields.SchemaField({
        current: new fields.NumberField({ initial: 0, min: 0, integer: true }),
        total:   new fields.NumberField({ initial: 0, min: 0, integer: true })
      }),

      // ── BUILD POINTS (for character creation tracking) ───────────────────
      buildPoints: new fields.SchemaField({
        total:  new fields.NumberField({ initial: 400, integer: true }),
        spent:  new fields.NumberField({ initial: 0, min: 0, integer: true })
      }),

      // ── NOTES ─────────────────────────────────────────────────────────────
      background: new fields.HTMLField({ initial: "" }),
      notes:      new fields.HTMLField({ initial: "" }),
      gmNotes:    new fields.HTMLField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ────────────────────────────────────────────────────

  /** Total value of an attribute (base + augmented bonus) */
  attr(name) {
    const a = this.attributes[name];
    if (!a) return 0;
    if (a.base !== undefined) return a.base + (a.augmented ?? 0);
    return a;
  }

  /** Physical Condition Monitor max: 8 + ceil(Body / 2) */
  get physicalCMMax() {
    return 8 + Math.ceil(this.attr("body") / 2);
  }

  /** Stun Condition Monitor max: 8 + ceil(Willpower / 2) */
  get stunCMMax() {
    return 8 + Math.ceil(this.attr("willpower") / 2);
  }

  /** Wound modifier: -1 die per 3 boxes of damage (combined) */
  get woundModifier() {
    const physBoxes = this.condition.physical.value;
    const stunBoxes = this.condition.stun.value;
    return -Math.floor((physBoxes + stunBoxes) / 3);
  }

  /** Base initiative score (Reaction + Intuition) — dice added at roll time */
  get initiativeBase() {
    return this.attr("reaction") + this.attr("intuition");
  }

  /** Composure: Willpower + Charisma */
  get composure() {
    return this.attr("willpower") + this.attr("charisma");
  }

  /** Judge Intentions: Intuition + Charisma */
  get judgeIntentions() {
    return this.attr("intuition") + this.attr("charisma");
  }

  /** Lift/Carry: Body + Strength */
  get liftCarry() {
    return this.attr("body") + this.attr("strength");
  }

  /** Memory: Logic + Willpower */
  get memory() {
    return this.attr("logic") + this.attr("willpower");
  }

  /** Resist drain: For Magicians = Willpower + Charisma (Hermetic) or Willpower + Intuition (Shaman) */
  get drainResist() {
    return this.attr("willpower") + this.attr("charisma");
  }

  /** Living Persona (Technomancer) — Response = Intuition */
  get lpResponse() { return this.attr("intuition"); }

  /** Living Persona — Signal = Resonance + 2 */
  get lpSignal() { return this.attr("resonance") + 2; }

  /** Living Persona — System = Logic */
  get lpSystem() { return this.attr("logic"); }

  /** Living Persona — Firewall = Willpower */
  get lpFirewall() { return this.attr("willpower"); }

  /** Is this character Awakened? */
  get isAwakened() {
    return this.awakened.type !== "none" && this.attr("magic") > 0;
  }

  /** Is this character a Technomancer? */
  get isTechnomancer() {
    return this.techno.active && this.attr("resonance") > 0;
  }

  /** Remaining adept power points */
  get adeptPointsRemaining() {
    return this.awakened.adeptPoints.total - this.awakened.adeptPoints.spent;
  }
}
