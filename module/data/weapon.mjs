/**
 * WeaponDataModel — Weapon item (SR4 20th Anniversary)
 * Covers melee and ranged. DV/AP format: "8P" / "9S-2" etc.
 */
export class WeaponDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── CLASSIFICATION ────────────────────────────────────────────────────
      weaponType: new fields.StringField({ initial: "ranged",
        choices: ["melee", "ranged", "thrown", "grenade", "explosive"] }),
      category:   new fields.StringField({ initial: "pistols",
        choices: ["blades", "clubs", "unarmedCombat", "exoticMelee",
                  "pistols", "automatics", "longarms", "heavyWeapons",
                  "exoticRanged", "throwingWeapons", "grenades", "launchers",
                  "exotic"] }),

      // ── DAMAGE ────────────────────────────────────────────────────────────
      // DV stored as string because SR4 uses notation like "8P" or "9S"
      // damageType: P = Physical, S = Stun
      dv:          new fields.StringField({ initial: "8P" }),    // e.g. "8P", "6S", "STR+2P"
      ap:          new fields.NumberField({ initial: 0, integer: true }),
      damageType:  new fields.StringField({ initial: "physical",
        choices: ["physical", "stun"] }),

      // ── RANGED SPECIFICS ─────────────────────────────────────────────────
      // Mode: SS=single shot, SA=semi-auto, BF=burst fire, FA=full auto
      mode: new fields.StringField({ initial: "SA",
        choices: ["SS", "SA", "BF", "FA", "SS/SA", "SA/BF", "SA/BF/FA", "BF/FA"] }),
      rc:   new fields.NumberField({ initial: 0, min: 0, integer: true }),
      ammo: new fields.SchemaField({
        current:            new fields.NumberField({ initial: 0, min: 0, integer: true }),
        max:                new fields.NumberField({ initial: 15, min: 0, integer: true }),
        type:               new fields.StringField({ initial: "Regular" }),
        // Modifiers from the currently loaded ammo type (copied on reload)
        dvMod:              new fields.NumberField({ initial: 0, integer: true }),
        apMod:              new fields.NumberField({ initial: 0, integer: true }),
        damageTypeOverride: new fields.StringField({ initial: "none",
          choices: ["none", "physical", "stun"] })
      }),

      // ── MELEE SPECIFICS ───────────────────────────────────────────────────
      reach: new fields.NumberField({ initial: 0, min: 0, max: 3, integer: true }),

      // ── GENERAL ───────────────────────────────────────────────────────────
      conceal:     new fields.NumberField({ initial: 0, integer: true }),
      avail:       new fields.StringField({ initial: "6" }),
      cost:        new fields.NumberField({ initial: 0, min: 0, integer: true }),
      source:      new fields.StringField({ initial: "SR4A" }),

      // ── MODIFICATIONS ─────────────────────────────────────────────────────
      accessories: new fields.ArrayField(new fields.SchemaField({
        name:   new fields.StringField({ initial: "" }),
        rcBonus: new fields.NumberField({ initial: 0, integer: true }),
        notes:  new fields.StringField({ initial: "" })
      })),

      // ── RECOIL TRACKING ───────────────────────────────────────────────────
      // Current session recoil — reset when relevant
      recoilPenalty: new fields.NumberField({ initial: 0, min: 0, integer: true }),

      equipped:    new fields.BooleanField({ initial: true }),
      description: new fields.HTMLField({ initial: "" }),
      notes:       new fields.StringField({ initial: "" })
    };
  }

  /** Effective RC (weapon base + accessories) */
  get totalRC() {
    return this.rc + this.accessories.reduce((sum, a) => sum + (a.rcBonus ?? 0), 0);
  }

  /** Is ranged? */
  get isRanged() {
    return ["ranged", "thrown", "grenade"].includes(this.weaponType);
  }

  /** Is melee? */
  get isMelee() {
    return this.weaponType === "melee";
  }
}
