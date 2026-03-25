/**
 * AmmoDataModel — Ammunition item for SR4 20th Anniversary.
 */
export class AmmoDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── TYPE & QUANTITY ───────────────────────────────────────────────────
      ammoType: new fields.StringField({ initial: "Regular",
        choices: ["Regular","APDS","Explosive","Frangible","Gel Rounds",
                  "Hollow Point","Stick-n-Shock","Tracer","Subsonic",
                  "Injection","White Phosphorus","Custom",
                  "AV","Capsule","ExEx","Hi-C Plastique","Silver","Tracker",
                  "Shotgun Flechette","Shotgun Slug","Dragon's Breath",
                  "Shotgun Stun","Peak-Discharge"] }),
      quantity: new fields.NumberField({ initial: 30, min: 0, integer: true }),

      // ── STAT MODIFIERS (applied to weapon when loaded) ─────────────────────
      dvModifier: new fields.NumberField({ initial: 0, integer: true }),
      apModifier: new fields.NumberField({ initial: 0, integer: true }),

      // Optional damage type override — e.g. Gel, Stick-n-Shock → Stun
      damageTypeOverride: new fields.StringField({ initial: "none",
        choices: ["none", "physical", "stun"] }),

      // ── SPECIAL FLAGS ─────────────────────────────────────────────────────
      // Electric stun damage (Stick-n-Shock, shock rounds)
      isElectric:   new fields.BooleanField({ initial: false }),
      // Tracer rounds grant bonus dice in burst fire in low/no light
      tracerBonus:  new fields.BooleanField({ initial: false }),
      // APDS cannot be used with BF or FA modes (RAW restriction)
      noAutofire:   new fields.BooleanField({ initial: false }),

      // ── AVAILABILITY & COST ───────────────────────────────────────────────
      avail:     new fields.StringField({ initial: "—" }),
      cost:      new fields.NumberField({ initial: 20, min: 0, integer: true }),
      perRounds: new fields.NumberField({ initial: 20, min: 1, integer: true }),
      source:    new fields.StringField({ initial: "" }),

      description: new fields.StringField({ initial: "" })
    };
  }

  /** Human-readable modifier string, e.g. "(+2 DV / -1 AP → Stun)" */
  get modifierSummary() {
    const parts = [];
    if (this.dvModifier !== 0) parts.push(`${this.dvModifier > 0 ? "+" : ""}${this.dvModifier} DV`);
    if (this.apModifier !== 0) parts.push(`${this.apModifier > 0 ? "+" : ""}${this.apModifier} AP`);
    if (this.damageTypeOverride && this.damageTypeOverride !== "none") parts.push(`→ ${this.damageTypeOverride}`);
    if (this.isElectric)  parts.push("Electric");
    if (this.noAutofire)  parts.push("No BF/FA");
    return parts.length ? `(${parts.join(" / ")})` : "";
  }
}
