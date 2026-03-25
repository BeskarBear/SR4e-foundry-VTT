/**
 * VehicleDataModel — Vehicle / Drone (SR4 20th Anniversary)
 */
export class VehicleDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // ── IDENTITY ──────────────────────────────────────────────────────────
      vehicleType: new fields.StringField({ initial: "groundcraft",
        choices: ["groundcraft", "watercraft", "aircraft", "drone", "other"] }),
      model:       new fields.StringField({ initial: "" }),
      owner:       new fields.StringField({ initial: "" }),

      // ── VEHICLE ATTRIBUTES ────────────────────────────────────────────────
      attributes: new fields.SchemaField({
        handling:  new fields.NumberField({ initial: 3, min: 1, max: 6, integer: true }),
        accel:     new fields.NumberField({ initial: 10, min: 0, integer: true }),  // m/CT
        speed:     new fields.NumberField({ initial: 60, min: 0, integer: true }),  // m/CT max
        pilot:     new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),
        body:      new fields.NumberField({ initial: 8, min: 1, max: 20, integer: true }),
        armor:     new fields.NumberField({ initial: 6, min: 0, integer: true }),
        sensor:    new fields.NumberField({ initial: 2, min: 1, max: 6, integer: true }),
        seating:   new fields.NumberField({ initial: 4, min: 0, integer: true })
      }),

      // ── RIGGER INTERFACE ─────────────────────────────────────────────────
      riggerInterface: new fields.BooleanField({ initial: false }),
      droneRating:     new fields.NumberField({ initial: 0, min: 0, max: 6, integer: true }),

      // ── CONDITION MONITOR ─────────────────────────────────────────────────
      // Vehicle CM max = Body / 2 rounded up + 8
      condition: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0, integer: true })
      }),

      // ── WEAPONS ───────────────────────────────────────────────────────────
      weapons: new fields.ArrayField(new fields.SchemaField({
        name:      new fields.StringField({ initial: "" }),
        mountType: new fields.StringField({ initial: "fixed",
          choices: ["fixed", "turret", "concealed"] }),
        ammo:      new fields.NumberField({ initial: 0, min: 0, integer: true })
      })),

      // ── MODIFICATIONS ─────────────────────────────────────────────────────
      modifications: new fields.ArrayField(new fields.SchemaField({
        name:  new fields.StringField({ initial: "" }),
        notes: new fields.StringField({ initial: "" })
      })),

      // ── ECONOMY ───────────────────────────────────────────────────────────
      cost:      new fields.NumberField({ initial: 0, min: 0, integer: true }),
      avail:     new fields.StringField({ initial: "8" }),

      notes: new fields.HTMLField({ initial: "" })
    };
  }

  /** Vehicle CM max: 8 + ceil(Body / 2) */
  get conditionMax() {
    return 8 + Math.ceil(this.attributes.body / 2);
  }

  /** Rigging test pool: Pilot + Handling */
  get pilotPool() {
    return this.attributes.pilot + this.attributes.handling;
  }
}
