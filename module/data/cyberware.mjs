/**
 * CyberwareDataModel — Cyberware, Bioware, Nanoware, and Geneware (SR4A).
 *
 * ── SR4 ESSENCE COST ─────────────────────────────────────────────────────────
 * Every piece of invasive cyberware reduces the character's Essence attribute.
 * Essence starts at 6.0 and can only be lost, never regained.
 * Essence loss has two significant effects:
 *
 *   1. Magic maximum: Awakened characters lose 1 point of Magic for each full
 *      point of Essence below 6. E.g. Essence 4.5 → Magic max reduced by 1.
 *      Technomancers lose Resonance the same way.
 *
 *   2. Matrix intrusion: some IC and ICE look for low-Essence signatures.
 *
 * The `essenceCost` field stores the BASE cost from the sourcebook.
 * The `actualEssenceCost` getter computes the final cost after grade and
 * ware-type multipliers are applied.
 *
 * ── GRADES AND ESSENCE MULTIPLIERS (SR4A p.340) ──────────────────────────────
 * Ware quality directly impacts how much Essence is lost during installation:
 *
 *   Used:     ×1.25 — salvaged ware; cheaper but costs MORE Essence; illegal surgery
 *   Standard: ×1.0  — factory grade; street clinics and corporate hospitals
 *   Alpha:    ×0.8  — improved tolerances; 20% less Essence than standard
 *   Beta:     ×0.7  — high-end corporate; 30% less Essence
 *   Delta:    ×0.5  — cutting-edge nanofabricated; half the Essence cost
 *
 * ── BIOWARE vs CYBERWARE ─────────────────────────────────────────────────────
 * Bioware and cultured bioware cost HALF the listed Essence compared to
 * cyberware of the same grade. This is because bioware integrates more
 * naturally with the body (grown tissue vs machined parts).
 *   actualEssence = baseCost × gradeMultiplier × 0.5 (if bioware/cultured)
 *
 * Nanoware and geneware also cost half Essence (treated as bioware for
 * Essence purposes in SR4A).
 *
 * ── CAPACITY SYSTEM (SR4A p.335) ─────────────────────────────────────────────
 * Some cyberware has "capacity" — internal space for sub-components.
 * Example: Cyberarm (Capacity 20) can hold cyberweapons, strength upgrades, etc.
 * Each sub-item consumes some capacity. This data model stores totalCapacity
 * and usedCapacity for display; actual enforcement is manual (GM + player).
 *
 * ── STAT BONUSES ─────────────────────────────────────────────────────────────
 * The `statBonuses` array describes which attributes this ware increases.
 * These bonuses are stored for sheet display and reference; they are not
 * automatically applied to actor attributes in this system (the GM or player
 * updates the character's augmented attribute values manually).
 * Example: Wired Reflexes 1 → [{ stat: "reaction", bonus: 1 }]
 */
export class CyberwareDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── WARE TYPE ──────────────────────────────────────────────────────────
      // wareType: the biological/mechanical nature of the augmentation.
      //   cyber:    machined metal/plastic; standard cyberware Essence cost
      //   bio:      vat-grown tissue augmentations; half Essence cost
      //   nano:     nanomachine-based; half Essence cost
      //   gene:     genetic modification; half Essence cost
      //   cultured: lab-grown bio from donor tissue; half Essence cost
      // The bioMultiplier getter returns 0.5 for bio/cultured/nano/gene, 1.0 for cyber.
      wareType: new fields.StringField({ initial: "cyber",
        choices: ["cyber", "bio", "nano", "gene", "cultured"] }),

      // ── GRADE ──────────────────────────────────────────────────────────────
      // grade: manufacturing quality. Higher grade → lower Essence cost → higher price.
      // See gradeMultiplier static property for the exact Essence multipliers.
      //   used:     Salvaged or black-market ware. Higher Essence, higher risk of rejection.
      //   standard: Baseline grade available at any certified clinic.
      //   alpha:    Better tolerances; 20% Essence reduction; common among corp employees.
      //   beta:     High-quality; 30% Essence reduction; requires specialized clinics.
      //   delta:    Cutting edge; 50% Essence reduction; only the wealthiest can afford this.
      grade: new fields.StringField({ initial: "used",
        choices: ["used", "standard", "alpha", "beta", "delta"] }),

      // ── ESSENCE COST ───────────────────────────────────────────────────────
      // essenceCost: the BASE Essence cost from the sourcebook (before multipliers).
      // Final cost = essenceCost × gradeMultiplier × bioMultiplier.
      // Use the actualEssenceCost getter for the true cost after all modifiers.
      essenceCost: new fields.NumberField({ initial: 0.5, min: 0 }),

      // ── CATEGORY ───────────────────────────────────────────────────────────
      // category: determines which section of the cyberware tab this appears in.
      //   headware:        cranial implants (datajack, memory, skillwire, etc.)
      //   eyeware:         ocular implants (thermographic, flare comp, smartlink)
      //   earware:         auditory implants (amplification, dampeners, select sound)
      //   bodyware:        body-wide implants (wired reflexes, orthoskin, synaptic booster)
      //   cyberLimb:       replacement limb (arm, leg, hand, foot)
      //   obvious/lethality: combat cyberware (spurs, razors, hand razors)
      //   nanotechnology:  nano-augmentation (nanohive, pain editors, etc.)
      //   genetechnologies: gene therapy and geneware
      //   bioware:         biological augmentations (muscle toner, synaptic booster, etc.)
      //   cyberlimbs:      alias for cyberLimb grouping
      //   geneware/nanoware: display aliases for respective types
      category: new fields.StringField({ initial: "augmentation",
        choices: ["augmentation", "headware", "eyeware", "earware", "bodyware",
                  "cyberLimb", "obvious", "lethality", "nanotechnology",
                  "genetechnologies", "bioware",
                  "cyberlimbs", "geneware", "nanoware"] }),

      // ── STAT BONUSES ───────────────────────────────────────────────────────
      // statBonuses: attribute bonuses provided by this ware, for reference/display.
      // Not automatically applied — player/GM manually updates actor's augmented values.
      // Example: Wired Reflexes 1 → [{ stat: "reaction", bonus: 1 }]
      //          (and also adds +1 initiative die, tracked on the character separately)
      statBonuses: new fields.ArrayField(new fields.SchemaField({
        stat:  new fields.StringField({ initial: "" }),   // attribute key ("reaction", "agility")
        bonus: new fields.NumberField({ initial: 0, integer: true })
      })),

      // ── CAPACITY ───────────────────────────────────────────────────────────
      // Cyberware with internal capacity (cyberarms, cyberlimbs) can hold sub-items.
      // capacityTotal: maximum capacity available in this piece.
      // capacityUsed:  how much is currently occupied by sub-components.
      // Manual tracking — enforced by GM, not auto-computed from embedded items.
      capacityTotal: new fields.NumberField({ initial: 0, min: 0, integer: true }),
      capacityUsed:  new fields.NumberField({ initial: 0, min: 0, integer: true }),

      // ── GENERAL ────────────────────────────────────────────────────────────
      // avail: Availability string from the sourcebook (e.g. "8R", "12F", "6").
      // R = Restricted (license required), F = Forbidden (illegal everywhere)
      avail:      new fields.StringField({ initial: "8R" }),
      cost:       new fields.NumberField({ initial: 0, min: 0, integer: true }),
      source:     new fields.StringField({ initial: "SR4A" }),

      // installed: whether this cyberware is surgically installed and active.
      // Non-installed ware doesn't contribute to Essence loss or stat bonuses.
      // This allows tracking "owned but not yet installed" cyberware.
      installed:   new fields.BooleanField({ initial: true }),
      description: new fields.HTMLField({ initial: "" }),
      notes:       new fields.StringField({ initial: "" })
    };
  }

  // ── GRADE MULTIPLIER TABLE ────────────────────────────────────────────────

  /**
   * Essence cost multipliers by grade.
   * Used = 1.25× (MORE Essence — salvage risk), Standard = 1.0×,
   * Alpha = 0.8×, Beta = 0.7×, Delta = 0.5× (half the Essence cost).
   *
   */
  static gradeMultiplier = {
    used:     1.25,  // Salvaged — worse than standard
    standard: 1.0,   // Baseline
    alpha:    0.8,   // 20% Essence reduction
    beta:     0.7,   // 30% Essence reduction
    delta:    0.5    // 50% Essence reduction
  };

  /**
   * Actual Essence cost after applying grade and ware-type multipliers.
   *
   * Formula: essenceCost × gradeMultiplier[grade] × bioMultiplier
   *
   * bioMultiplier is 0.5 for bioware/cultured/nano/gene, 1.0 for standard cyberware.
   * Rounded to 2 decimal places (how Essence fractions appear in SR4A tables).
   *
   * Example: Standard cyberware essenceCost 0.4, beta grade:
   *   0.4 × 0.7 × 1.0 = 0.28 → rounds to 0.28 Essence
   *
   * @returns {number} Final Essence cost (2 decimal precision)
   */
  get actualEssenceCost() {
    const mult = CyberwareDataModel.gradeMultiplier[this.grade] ?? 1.0;
    // Bioware/cultured/nano/gene all integrate more naturally → half Essence cost
    const bio = (this.wareType === "bio" || this.wareType === "cultured") ? 0.5 : 1.0;
    return parseFloat((this.essenceCost * mult * bio).toFixed(2));
  }
}
