/**
 * @file fire-mode-dialog.mjs — Fire mode and reload dialogs for SR4A ranged combat.
 *
 * ── FIRE MODE SELECTION ───────────────────────────────────────────────────────
 * SR4A ranged weapons have one or more fire modes in their mode string: "SA/BF/FA".
 * On each ranged attack the runner chooses which mode to use from those available.
 * showFireModeDialog() builds the available option set, disables options with
 * insufficient ammo, and resolves the promise with the chosen mode object.
 *
 * SR4A fire mode mechanics (p.148-152):
 * ─────────────────────────────────────────────────────────────────────────────
 * Mode   │ Option              │ Rnds │ DV Bonus │ Recoil Added │ Action Type
 * ───────┼─────────────────────┼──────┼──────────┼──────────────┼──────────────
 * SS     │ Single Shot         │  1   │   +0     │      0       │ Simple
 * SA     │ Standard            │  1   │   +0     │      0       │ Simple
 * SA     │ Double-Tap          │  2   │   +1     │     +1       │ Simple
 * BF     │ Short Burst (3)     │  3   │   +2     │     +2       │ Simple
 * BF     │ Long Burst (6)      │  6   │   +5     │     +5       │ Complex
 * FA     │ Short Burst (6)     │  6   │   +4     │     +4       │ Complex
 * FA     │ Long Burst (10)     │ 10   │   +9     │     +9       │ Complex
 * FA     │ Suppressive (20)    │ 20   │    —     │      —       │ Complex (no attack roll)
 * ─────────────────────────────────────────────────────────────────────────────
 * DV Bonus: added to the weapon's base DV for this shot only.
 *   e.g. a weapon with DV "6P" fired in BF-Short Burst deals "8P".
 *
 * Recoil system (SR4A p.148):
 *   cumulativeRecoil: running total across all shots in a combat turn.
 *   weapon.totalRC: Recoil Compensation (reduces penalty; typically 0-3 for stock weapons).
 *   Effective penalty = max(0, cumulativeRecoil − totalRC).
 *   This penalty SUBTRACTS from the attack dice pool.
 *   Recoil resets at the start of the runner's next combat turn (_onRecoilReset in sheet).
 *
 * APDS restriction (SR4A p.163):
 *   APDS ammo cannot be used in BF or FA modes due to the discarding sabot mechanism.
 *   When APDS is loaded, burst/auto options are filtered out entirely.
 *
 * Suppressive Fire (SR4A p.150):
 *   No attack roll made. Creates a suppression zone; opponents in zone must resist.
 *   Costs 20 rounds. Resolves separately from normal attack flow.
 *
 * ── RELOAD DIALOG ────────────────────────────────────────────────────────────
 * showReloadDialog() lists ammo items in the actor's inventory with quantity > 0.
 * On confirm:
 *   1. weapon.ammo.current is filled up to max (using available quantity)
 *   2. ammo item quantity is decremented by rounds loaded
 *   3. weapon stores loaded ammo stats (dvMod, apMod, damageTypeOverride)
 *      so the sheet roll code can apply them at shot time without reading the item
 */

/**
 * Master list of all fire mode options.
 * Filtered at runtime by weapon.mode string tokens (e.g. "SA/BF" → SA and BF entries only).
 * Fields:
 *   id           {string}  Unique option key, used to recover selection after dialog
 *   modes        {string[]} Which weapon.mode tokens enable this option
 *   label        {string}  Display name shown in dialog
 *   action       {string}  "Simple" or "Complex" action cost
 *   rounds       {number}  Rounds consumed from current ammo
 *   dvMod        {number}  Added to weapon base DV for this shot (0 = no change)
 *   recoilAdded  {number}  Added to cumulativeRecoil AFTER this shot
 *   suppressive  {boolean} True = no attack roll; resolves as suppression zone
 */
const ALL_FIRE_OPTIONS = [
  { id: "ss",     modes: ["SS"],     label: "Single Shot",      action: "Simple",  rounds: 1,  dvMod: 0, recoilAdded: 0,  suppressive: false },
  { id: "sa",     modes: ["SA"],     label: "Standard",         action: "Simple",  rounds: 1,  dvMod: 0, recoilAdded: 0,  suppressive: false },
  { id: "sa_dt",  modes: ["SA"],     label: "Double-Tap",       action: "Simple",  rounds: 2,  dvMod: 1, recoilAdded: 1,  suppressive: false },
  { id: "bf_s",   modes: ["BF"],     label: "Short Burst (3)",  action: "Simple",  rounds: 3,  dvMod: 2, recoilAdded: 2,  suppressive: false },
  { id: "bf_l",   modes: ["BF"],     label: "Long Burst (6)",   action: "Complex", rounds: 6,  dvMod: 5, recoilAdded: 5,  suppressive: false },
  { id: "fa_s",   modes: ["FA"],     label: "Short Burst (6)",  action: "Complex", rounds: 6,  dvMod: 4, recoilAdded: 4,  suppressive: false },
  { id: "fa_l",   modes: ["FA"],     label: "Long Burst (10)",  action: "Complex", rounds: 10, dvMod: 9, recoilAdded: 9,  suppressive: false },
  { id: "fa_sup", modes: ["FA"],     label: "Suppressive (20)", action: "Complex", rounds: 20, dvMod: 0, recoilAdded: 0,  suppressive: true  }
];

/**
 * Parse the weapon's mode string into an array of mode tokens.
 * "SA/BF/FA" → ["SA","BF","FA"]
 */
function parseModes(modeString) {
  return (modeString ?? "SA").split("/").map(s => s.trim().toUpperCase());
}

/**
 * Apply a DV modifier to a DV string like "6P" or "8P".
 * Returns the modified string, e.g. "6P" + 2 → "8P".
 */
export function applyDVMod(dvString, mod) {
  if (!mod) return dvString;
  const match = String(dvString).match(/^(\d+)([PS])/);
  if (!match) return dvString;
  const newVal = Math.max(1, parseInt(match[1]) + mod);
  return `${newVal}${match[2]}`;
}

/**
 * Show the fire mode selection dialog.
 *
 * @param {Item}   weapon  — the weapon item being fired
 * @param {Actor}  actor   — the owning actor (for context display)
 * @returns {Promise<{id, label, rounds, dvMod, recoilAdded, suppressive}|null>}
 *   Resolves with the chosen fire mode object, or null if cancelled.
 */
export async function showFireModeDialog(weapon, actor) {
  const sys      = weapon.system;
  const modeTokens = parseModes(sys.mode);
  const isAPDS   = sys.ammo?.type?.toLowerCase().includes("apds");

  // Build available options for this weapon's mode(s)
  let options = ALL_FIRE_OPTIONS.filter(opt =>
    opt.modes.some(m => modeTokens.includes(m))
  );

  // APDS restriction: cannot use BF or FA modes (RAW)
  if (isAPDS) {
    options = options.filter(opt => !["bf_s","bf_l","fa_s","fa_l","fa_sup"].includes(opt.id));
  }

  // If only one option, skip the dialog and return immediately
  if (options.length === 1) return options[0];

  const ammoNow    = sys.ammo?.current ?? 0;
  const ammoType   = sys.ammo?.type ?? "Regular";
  const recoilCum  = sys.recoilPenalty ?? 0;
  const rc         = sys.totalRC ?? sys.rc ?? 0;
  const recoilEff  = Math.max(0, recoilCum - rc);

  // Build dialog HTML
  const rows = options.map((opt, i) => {
    const effectiveDV = applyDVMod(sys.dv, opt.dvMod);
    const newRecoil   = recoilCum + opt.recoilAdded;
    const newRecoilEff = Math.max(0, newRecoil - rc);
    const noAmmo      = ammoNow < opt.rounds;
    const disabled    = noAmmo ? "disabled" : "";
    return `
      <label class="fire-mode-option ${disabled} ${noAmmo ? "no-ammo" : ""}">
        <input type="radio" name="fireMode" value="${opt.id}" ${i === 0 && !noAmmo ? "checked" : ""} ${disabled} />
        <div class="fire-mode-details">
          <span class="fire-mode-label">${opt.label}</span>
          <span class="fire-mode-action">(${opt.action})</span>
          <span class="fire-mode-stats">
            ${opt.suppressive
              ? '<em>No attack roll — suppressive fire zone</em>'
              : `DV <strong>${effectiveDV}</strong>${opt.dvMod > 0 ? ` (+${opt.dvMod})` : ""}`
            }
          </span>
          <span class="fire-mode-cost">
            <span class="${noAmmo ? "ammo-shortage" : ""}">−${opt.rounds} rnd</span>
            ${opt.recoilAdded ? `<span class="recoil-added">Recoil −${opt.recoilAdded} (eff. −${newRecoilEff})</span>` : ""}
          </span>
        </div>
      </label>`;
  }).join("");

  const content = `
    <div class="sr4-fire-mode-dialog">
      <div class="fire-mode-ammo-status">
        <span>${weapon.name}</span>
        <span class="ammo-badge ${ammoNow < 3 ? "ammo-low" : ""}">
          ${ammoType} — ${ammoNow} / ${sys.ammo?.max ?? "?"} rnd
        </span>
        ${recoilEff > 0 ? `<span class="recoil-status">Recoil −${recoilEff} (cumulative ${recoilCum}, RC ${rc})</span>` : ""}
      </div>
      <div class="fire-mode-options">${rows}</div>
    </div>`;

  return new Promise(resolve => {
    new Dialog({
      title: `${weapon.name} — Select Fire Mode`,
      content,
      buttons: {
        fire: {
          icon:  '<i class="fas fa-crosshairs"></i>',
          label: "Fire",
          callback: html => {
            const selected = html.find("input[name=fireMode]:checked").val();
            resolve(options.find(o => o.id === selected) ?? null);
          }
        },
        cancel: {
          icon:  '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "fire"
    }, {
      classes: ["dialog", "sr4", "sr4-fire-dialog"],
      width: 420
    }).render(true);
  });
}

/**
 * Show the reload dialog for a ranged weapon.
 *
 * Lists all ammo items in the actor's inventory (type === "ammo", quantity > 0).
 * On confirm:
 *   1. Fills weapon.ammo.current up to its max capacity (uses min(needed, available)).
 *   2. Decrements ammo item quantity by the rounds loaded.
 *   3. Stores the ammo's modifiers on the weapon for use at shot time:
 *        system.ammo.dvMod              → dvModifier from AmmoDataModel
 *        system.ammo.apMod              → apModifier from AmmoDataModel
 *        system.ammo.damageTypeOverride → damageTypeOverride from AmmoDataModel
 *        system.ammo.type               → ammo item name (display only)
 *
 * Storing modifiers on the weapon means the sheet's attack code can apply them
 * without needing to re-read the ammo item each shot — which matters when
 * the ammo item quantity reaches 0 mid-fight but the gun is still loaded.
 *
 * SR4A reloading: reloading takes a Simple Action (ejecting the clip) +
 * another Simple Action (inserting new clip). Track this time externally —
 * the dialog doesn't enforce action economy.
 *
 * @param {Item}   weapon  — The ranged weapon item being reloaded
 * @param {Actor}  actor   — The owning actor (source of ammo inventory)
 * @returns {Promise<boolean>} Resolves true if reload succeeded; false if cancelled or no ammo
 */
export async function showReloadDialog(weapon, actor) {
  const ammoItems = actor.items.filter(i => i.type === "ammo" && i.system.quantity > 0);
  const max       = weapon.system.ammo?.max ?? 15;
  const current   = weapon.system.ammo?.current ?? 0;
  const needed    = max - current;

  if (needed === 0) {
    ui.notifications.info(`${weapon.name} is already fully loaded.`);
    return false;
  }

  if (ammoItems.length === 0) {
    ui.notifications.warn(`No ammunition in inventory. Buy some rounds first, choom.`);
    return false;
  }

  const ammoOptions = ammoItems.map(a =>
    `<option value="${a.id}">${a.name} — ${a.system.quantity} rnd ${a.system.modifierSummary}</option>`
  ).join("");

  const content = `
    <div class="sr4-reload-dialog">
      <div class="reload-info">
        <strong>${weapon.name}</strong>: ${current}/${max} loaded. Needs ${needed} rounds to fill.
      </div>
      <div class="field-group">
        <label>Select Ammunition</label>
        <select class="reload-ammo-select" name="ammoId">
          ${ammoOptions}
        </select>
      </div>
    </div>`;

  return new Promise(resolve => {
    new Dialog({
      title: `Reload — ${weapon.name}`,
      content,
      buttons: {
        reload: {
          icon:  '<i class="fas fa-sync"></i>',
          label: "Reload",
          callback: async html => {
            const ammoId   = html.find("select[name=ammoId]").val();
            const ammoItem = actor.items.get(ammoId);
            if (!ammoItem) { resolve(false); return; }

            const sys   = ammoItem.system;
            const qty   = sys.quantity;
            const fill  = Math.min(needed, qty);

            // Update weapon: fill ammo, store loaded ammo stats
            await weapon.update({
              "system.ammo.current":            current + fill,
              "system.ammo.type":               ammoItem.name,
              "system.ammo.dvMod":              sys.dvModifier,
              "system.ammo.apMod":              sys.apModifier,
              "system.ammo.damageTypeOverride": sys.damageTypeOverride ?? ""
            });

            // Decrement ammo item quantity
            await ammoItem.update({ "system.quantity": qty - fill });

            ui.notifications.info(
              `${weapon.name} reloaded with ${fill} rounds of ${ammoItem.name}. ${qty - fill} rounds remaining in inventory.`
            );
            resolve(true);
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(false)
        }
      },
      default: "reload"
    }, {
      classes: ["dialog", "sr4", "sr4-reload-dialog"],
      width: 380
    }).render(true);
  });
}
