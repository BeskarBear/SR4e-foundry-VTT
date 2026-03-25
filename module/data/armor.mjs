/**
 * ArmorDataModel — Armor and Clothing item data model (SR4 20th Anniversary).
 *
 * ── SR4 ARMOR MECHANICS (SR4A p.162-164) ────────────────────────────────────
 * SR4 uses two armor ratings — Ballistic and Impact — for damage resistance:
 *
 *   Ballistic (B): defends against firearms, energy weapons, and explosive projectiles.
 *                  Added to Body for Physical damage resistance tests vs ranged attacks.
 *
 *   Impact (I):    defends against melee weapons, concussive explosions, and falls.
 *                  Added to Body for Physical damage resistance tests vs melee attacks.
 *                  Note: Impact also applies to non-damaging stun attacks that apply
 *                  physical impact (clubs, falls, crashes).
 *
 * Damage Resistance Test: Body + Armor vs DV (modified by AP).
 *   Each net hit reduces the incoming damage by 1.
 *   If Body + Armor > DV: strong chance of soaking all damage.
 *   AP modifier is applied to the armor value: effective armor = armor + AP.
 *   (AP is typically negative, e.g. APDS is AP -6.)
 *
 * ── SR4 ARMOR STACKING (SR4A p.163) ─────────────────────────────────────────
 * Armor layering: only the highest B or I from any single piece applies for that
 * type; other pieces contribute +1 each if they have a rating ≥ 6, or nothing.
 * This data model does NOT auto-compute stacking — the GM or sheet handles it.
 *
 * ── SR4 ARMOR ENCUMBRANCE ────────────────────────────────────────────────────
 * Each point of (Ballistic + Impact) above the character's (Body × 2) imposes
 * a -1 to Agility and Reaction (SR4A p.163). This penalty is computed externally
 * and not stored in this data model.
 *
 * ── MODIFICATION SLOTS (SR4A p.447+) ─────────────────────────────────────────
 * AR4 armor can accept modifications (chemical seal, gel packs, etc.). The `mods`
 * array stores each mod and its bonus. Chemical Seal requires Full Body Armor.
 * Gel Packs: +1B/+1I. Fire Resistance: halves fire DV up to rating.
 */
export class ArmorDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── PROTECTION ─────────────────────────────────────────────────────────
      // armorB: Ballistic protection — applied to Body for resistance vs firearms.
      // Typical values: Armor Jacket 8B, Armor Vest 6B, Form-Fitting 4B, Synthleather 2B
      armorB: new fields.NumberField({ initial: 6, min: 0, integer: true }),

      // armorI: Impact protection — applied to Body for resistance vs melee/explosions.
      // Typical values: Armor Jacket 6I, Armor Vest 4I, Combat Armor 6I, Leather 2I
      armorI: new fields.NumberField({ initial: 4, min: 0, integer: true }),

      // ── TYPE ───────────────────────────────────────────────────────────────
      // armorType: display category and determines which slot the armor occupies.
      //   clothing:  Smart or protective clothing; light B/I (usually 2/0 or similar)
      //   jacket:    Standard jacket/vest combo; primary armor choice for most runners
      //   coat:      Long coat or trenchcoat; full-length coverage, similar to jacket
      //   vest:      Concealable vest; worn under clothing, contributes to stacking
      //   fullbody:  Military/full body armor; highest protection but very visible
      //   helmet:    Headgear; separate slot, adds B/I for head hit location
      //   shield:    Riot shield or ballistic shield; held item, improves cover
      //   other:     Custom or unusual armor pieces
      armorType: new fields.StringField({ initial: "jacket",
        choices: ["clothing", "jacket", "coat", "vest", "fullbody", "helmet",
                  "shield", "other"] }),

      // ── MODIFICATIONS ──────────────────────────────────────────────────────
      // mods: armor modifications from SR4A p.447 or Arsenal.
      // Each mod can grant bonusB, bonusI, or non-numeric effects (notes field).
      // Examples:
      //   Gel Packs: { name: "Gel Packs", bonusB: 1, bonusI: 1 }
      //   Fire Resistance 3: { name: "Fire Resistance 3", bonusB: 0, bonusI: 0,
      //                        notes: "Halves fire DV up to rating 3" }
      mods: new fields.ArrayField(new fields.SchemaField({
        name:     new fields.StringField({ initial: "" }),
        bonusB:   new fields.NumberField({ initial: 0, integer: true }),  // Added to armorB total
        bonusI:   new fields.NumberField({ initial: 0, integer: true }),  // Added to armorI total
        notes:    new fields.StringField({ initial: "" })
      })),

      // ── GENERAL ────────────────────────────────────────────────────────────
      // conceal: Concealability rating (SR4A p.310); see Palming skill for hiding tests
      conceal:     new fields.NumberField({ initial: 0, integer: true }),
      avail:       new fields.StringField({ initial: "4" }),   // Availability (number + R/F suffix)
      cost:        new fields.NumberField({ initial: 0, min: 0, integer: true }),
      source:      new fields.StringField({ initial: "SR4A" }),

      // equipped: whether the character is currently wearing this armor.
      // Only equipped armor contributes to damage resistance tests.
      equipped:    new fields.BooleanField({ initial: true }),
      description: new fields.HTMLField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ───────────────────────────────────────────────────────

  /**
   * Total Ballistic protection including all armor modifications.
   *
   * This is the value added to Body when resisting Physical damage from
   * firearms, energy weapons, and ranged explosive projectiles.
   * Modified by AP: effective armor for resistance test = totalB + AP.
   *
   * @returns {number} Total Ballistic armor rating
   */
  get totalB() {
    return this.armorB + this.mods.reduce((sum, m) => sum + (m.bonusB ?? 0), 0);
  }

  /**
   * Total Impact protection including all armor modifications.
   *
   * Added to Body when resisting Physical damage from melee attacks,
   * concussive explosions, and falls. Some AP modifiers (Hollow Point +2 AP)
   * make armor more effective against certain melee-type weapons.
   *
   * @returns {number} Total Impact armor rating
   */
  get totalI() {
    return this.armorI + this.mods.reduce((sum, m) => sum + (m.bonusI ?? 0), 0);
  }
}
