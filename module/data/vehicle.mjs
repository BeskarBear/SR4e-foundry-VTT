/**
 * VehicleDataModel — Vehicle and Drone actor data model (SR4 20th Anniversary).
 *
 * ── SR4A VEHICLE OVERVIEW (SR4A p.156-165, Arsenal) ──────────────────────────
 * Vehicles in SR4 operate under a clean stat block with 7 core attributes.
 * Vehicles use a Condition Monitor formula derived from Body (like characters).
 *
 * SR4A Vehicle Attributes:
 *
 *   Handling:  The vehicle's maneuverability rating.
 *              LOWER = better (acts as a threshold, not a bonus).
 *              Used as the threshold for Vehicle skill tests.
 *              Range: 1 (exceptional) to 6 (barely controllable).
 *              Standard cars: 3-4. Sports cars: 1-2. Military vehicles: 2-3.
 *
 *   Accel:     Acceleration in meters per combat turn.
 *              Limits how quickly the vehicle reaches top speed.
 *              Used in chase tests and evasive maneuvers.
 *
 *   Speed:     Maximum speed in meters per combat turn.
 *              Determines the "speed class" for chases.
 *
 *   Pilot:     The vehicle's autopilot/drone intelligence rating.
 *              1-6 scale (similar to a character's Logic or Intuition).
 *              When no rigger is jacked in, Pilot dice are used for maneuvers.
 *              For drones: Pilot IS the drone's effective skill rating.
 *
 *   Body:      Structural integrity — primary damage resistance stat.
 *              Used in Damage Resistance tests (Body + Armor).
 *              Also determines the Condition Monitor maximum: 8 + ceil(Body/2).
 *              Range: typically 4-20. Sports cars: 8. Military APCs: 18+.
 *
 *   Armor:     Damage reduction. Added to Body for resistance tests.
 *              Works like a single combined B/I rating (not split like character armor).
 *              Higher Armor = more total hits needed to damage the vehicle.
 *
 *   Sensor:    Electronic detection suite quality.
 *              Used for detection, targeting, electronic warfare.
 *              Range: 1-6. Standard cars: 1-2. Military/high-end: 4-6.
 *
 *   Seating:   Number of occupants (driver + passengers). Informational only.
 *
 * ── CONDITION MONITOR (SR4A p.157) ───────────────────────────────────────────
 * Vehicle CM Max = 8 + ceil(Body ÷ 2)
 * This is the same formula as PC character Physical CM (8 + ceil(Body/2)).
 * All vehicle damage is tracked on ONE condition monitor (no physical/stun split).
 *
 * Damage resolution for vehicles:
 *   1. Attacker rolls attack + net hits → DV (Damage Value)
 *   2. Vehicle resists: Body + Armor dice (SR4 standard opposition test)
 *   3. Net hits against DV reduced by AP if applicable
 *   4. Unsoaked hits fill CM boxes
 *   5. When CM fills: vehicle is destroyed/inoperable
 *
 * Wound-equivalent penalties for vehicles kick in at specific thresholds:
 *   >25% boxes filled: -1 Handling
 *   >50% boxes filled: -2 Handling, reduce maximum speed
 *   >75% boxes filled: -3 Handling; further restrictions
 *   CM filled:         vehicle destroyed; crash if moving
 *
 * ── SR4 RIGGING (SR4A p.244-253) ─────────────────────────────────────────────
 * A Rigger (character with a Control Rig cyberware) jacks into a vehicle:
 *   - riggerInterface: vehicle MUST have this built-in (not all vehicles do)
 *   - While rigged: character's Intuition replaces Pilot for all vehicle tests
 *   - Character uses Vehicle skill directly instead of Pilot rating
 *   - Damage to vehicle can cause Biofeedback (Stun damage to the rigger)
 *
 * Without rigging:
 *   - Occupied vehicle: driver uses Vehicle skill
 *   - Drone/autonomous: Pilot rating used as dice pool for all maneuvers
 *
 * ── DRONES (SR4A p.246-252) ──────────────────────────────────────────────────
 * Drones are smaller, typically cheaper, autonomous/remote vehicles.
 * droneRating: the drone's overall quality tier (1-6), affects available sensors,
 * signal range, and ability to receive complex commands.
 * Drones are most useful for Riggers who send them on remote tasks.
 *
 * ── VEHICLE WEAPONS ──────────────────────────────────────────────────────────
 *   fixed:     Fires only in the direction the vehicle faces
 *   turret:    360° arc; can aim independently of vehicle heading
 *   concealed: Hidden mount; looks like a normal vehicle from outside
 * Weapons listed here are summary entries; full weapon stats would be on
 * separate weapon items for significant vehicles/encounters.
 */
export class VehicleDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {

      // ── IDENTITY ────────────────────────────────────────────────────────────
      // vehicleType: broad category determining applicable rules and terrain.
      //   groundcraft: cars, trucks, motorcycles, tanks, wheeled/tracked vehicles
      //   watercraft:  boats, submarines, hovercraft
      //   aircraft:    fixed-wing, rotary, VTOL, aerospace
      //   drone:       remotely operated or autonomous small vehicles
      //   other:       exo-suits, alien tech, custom designs
      vehicleType: new fields.StringField({ initial: "groundcraft",
        choices: ["groundcraft", "watercraft", "aircraft", "drone", "other"] }),

      // model: manufacturer and model name (e.g. "Eurocar Westwind 3000").
      model: new fields.StringField({ initial: "" }),

      // owner: the character who owns/operates this vehicle — free-form text.
      owner: new fields.StringField({ initial: "" }),

      // ── VEHICLE ATTRIBUTES ──────────────────────────────────────────────────
      attributes: new fields.SchemaField({
        // handling: maneuverability rating (LOWER = better).
        // Used as the THRESHOLD for Vehicle + skill tests (not a TN modifier).
        // Crash threshold = Handling; at speed, the Threshold may increase.
        handling: new fields.NumberField({ initial: 3, min: 1, max: 6, integer: true }),

        // accel: maximum acceleration (meters per combat turn).
        // Important for chase tests, evasive maneuvers, and pursuit.
        accel: new fields.NumberField({ initial: 10, min: 0, integer: true }),

        // speed: maximum speed (meters per combat turn).
        // Determines speed class for chases; higher = faster in pursuit.
        speed: new fields.NumberField({ initial: 60, min: 0, integer: true }),

        // pilot: autopilot/drone AI rating (1-6).
        // Provides dice for vehicle actions when no one is actively rigging.
        // Drones use Pilot for ALL actions when operating autonomously.
        pilot: new fields.NumberField({ initial: 1, min: 1, max: 6, integer: true }),

        // body: structural integrity — primary stat for damage resistance.
        // Determines CM max: 8 + ceil(Body÷2).
        // Vehicle combat rolls: Body + Armor dice to resist damage.
        body: new fields.NumberField({ initial: 8, min: 1, max: 20, integer: true }),

        // armor: protection rating — added to Body for resistance tests.
        // A single value covering all attack vectors (not split like character B/I armor).
        // AP modifiers subtract from this before calculating resistance.
        armor: new fields.NumberField({ initial: 6, min: 0, integer: true }),

        // sensor: electronic detection rating (1-6).
        // Used for detection tests, targeting assistance, EW, and drone awareness.
        sensor: new fields.NumberField({ initial: 2, min: 1, max: 6, integer: true }),

        // seating: occupant capacity (driver + passengers). Informational only.
        seating: new fields.NumberField({ initial: 4, min: 0, integer: true })
      }),

      // ── RIGGER INTERFACE ────────────────────────────────────────────────────
      // riggerInterface: whether this vehicle has a built-in control rig socket.
      // Only vehicles with riggerInterface = true can be "jumped into" by a Rigger.
      // Adding a rigger interface to a vehicle costs money and requires modification.
      riggerInterface: new fields.BooleanField({ initial: false }),

      // droneRating: overall quality tier for drones (1-6).
      // Affects the drone's command capacity, reaction time, and sensor integration.
      // 0 = not a drone. Higher = more capable but more expensive.
      droneRating: new fields.NumberField({ initial: 0, min: 0, max: 6, integer: true }),

      // ── CONDITION MONITOR ───────────────────────────────────────────────────
      // condition.value: current damage boxes filled on the vehicle's CM.
      // Max = 8 + ceil(Body÷2) — computed via conditionMax getter.
      // Single track — all vehicle damage goes here (no physical/stun split).
      // When condition.value reaches conditionMax: vehicle is destroyed/inoperable.
      condition: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0, integer: true })
      }),

      // ── MOUNTED WEAPONS ────────────────────────────────────────────────────
      // weapons: summary list of vehicle-mounted weapons.
      //   name:      weapon identifier (e.g. "Ares MPL-LMG", "Stinger Missile Pod")
      //   mountType: targeting system (fixed/turret/concealed)
      //   ammo:      current ammunition count for this weapon
      weapons: new fields.ArrayField(new fields.SchemaField({
        name:      new fields.StringField({ initial: "" }),
        mountType: new fields.StringField({ initial: "fixed",
          choices: ["fixed", "turret", "concealed"] }),
        ammo:      new fields.NumberField({ initial: 0, min: 0, integer: true })
      })),

      // ── VEHICLE MODIFICATIONS ───────────────────────────────────────────────
      // modifications: list of modifications installed on this vehicle.
      // Modifications change performance, add capabilities, or improve survivability.
      // (Arsenal sourcebook has the full modification rules for SR4.)
      // Stored as summary entries — the GM tracks actual stats in description.
      modifications: new fields.ArrayField(new fields.SchemaField({
        name:  new fields.StringField({ initial: "" }),
        notes: new fields.StringField({ initial: "" })
      })),

      // ── ECONOMY ─────────────────────────────────────────────────────────────
      cost:  new fields.NumberField({ initial: 0, min: 0, integer: true }),
      // avail: SR4A availability (number + R/F suffix, e.g. "8R", "12F", "6").
      avail: new fields.StringField({ initial: "8" }),

      notes: new fields.HTMLField({ initial: "" })
    };
  }

  // ── COMPUTED GETTERS ───────────────────────────────────────────────────────

  /**
   * Vehicle Condition Monitor maximum.
   *
   * SR4A p.157: Vehicle CM = 8 + ceil(Body ÷ 2).
   * The same formula as PC Physical CM (SR4 uses unified CM formula).
   * Example: Body 8 → 8 + ceil(8/2) = 8 + 4 = 12 boxes.
   *          Body 14 → 8 + ceil(14/2) = 8 + 7 = 15 boxes.
   *
   * @returns {number} Maximum condition monitor boxes for this vehicle
   */
  get conditionMax() {
    return 8 + Math.ceil(this.attributes.body / 2);
  }

  /**
   * Pilot test pool when vehicle is autonomous (no rigger jacked in).
   *
   * In SR4A, when a Pilot AI handles a vehicle maneuver, it rolls Pilot dice
   * against the Handling threshold. In rigging, the character's Intuition replaces Pilot.
   *
   * Note: this is NOT how the rulebook calculates rigging tests — it's an
   * estimate for the autopilot mode. Handling is the THRESHOLD, not added to the pool.
   * This getter provides a convenient summary for the vehicle sheet display.
   *
   * SR4A rigging rule (correct formula):
   *   Vehicle test: Rigging skill + Intuition (character) vs Handling threshold
   *   Autopilot test: Pilot + Sensor (drone AI) vs Handling threshold
   *
   * @returns {number} Approximate auto-pilot dice (Pilot + Handling as pool estimate)
   */
  get pilotPool() {
    return this.attributes.pilot + this.attributes.handling;
  }
}
