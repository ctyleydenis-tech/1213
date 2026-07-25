// ==========================================================
// Fun Russia HUD v2 — full replacement (top bars, minimap,
// speedometer, vitals, money, notifications).
// Talks to samp-cef's browser-side JS API.
//
// Expected Pawn -> browser events (see readme.txt for full list):
//   cef_emit_event(playerid, "hud:level", lvl, expCur, expMax);
//   cef_emit_event(playerid, "hud:online", playerid, onlineCount);
//   cef_emit_event(playerid, "hud:ping", pingMs);
//   cef_emit_event(playerid, "hud:district", districtId, districtName);
//   cef_emit_event(playerid, "hud:vitals", health, armor, food);
//   cef_emit_event(playerid, "hud:money", cash, card, donate);
//   cef_emit_event(playerid, "hud:minimap", playerX, playerY, heading, JSON.stringify(blips));
//   cef_emit_event(playerid, "hud:vehicle", inVehicle, speedKmh, fuelPct, gearLabel, seatbeltOn);
//   cef_emit_event(playerid, "hud:notify", text);
// ==========================================================

const els = {
  lvl: document.getElementById('hud-lvl'),
  expFill: document.getElementById('hud-exp-fill'),
  exp: document.getElementById('hud-exp'),
  online: document.getElementById('hud-online'),
  id: document.getElementById('hud-id'),
  ping: document.getElementById('hud-ping'),
  districtName: document.getElementById('hud-district-name'),
  health: document.getElementById('hud-health'),
  armor: document.getElementById('hud-armor'),
  food: document.getElementById('hud-food'),
  cash: document.getElementById('hud-cash'),
  card: document.getElementById('hud-card'),
  donate: document.getElementById('hud-donate'),
  speedo: document.getElementById('speedo'),
  speedoKmh: document.getElementById('speedo-kmh'),
  speedoArcFill: document.getElementById('speedo-arc-fill'),
  speedoGear: document.getElementById('speedo-gear'),
  speedoBelt: document.getElementById('speedo-belt'),
  fuelFill: document.getElementById('speedo-fuel-fill'),
  fuelPct: document.getElementById('speedo-fuel-pct'),
  notifyStack: document.getElementById('notify-stack')
};

const MAX_SPEED_KMH = 220;     // used only to scale the arc fill
const ARC_LENGTH = 283;        // path length of the speedo arc (see index.html)

function fmt(n) { return Number(n).toLocaleString('ru-RU'); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ---------------- top-left: level / exp / online / id ----------------
function setLevel(lvl, expCur, expMax) {
  els.lvl.textContent = lvl;
  els.exp.textContent = `${fmt(expCur)}/${fmt(expMax)}`;
  const pct = expMax > 0 ? clamp((expCur / expMax) * 100, 0, 100) : 0;
  els.expFill.style.width = pct + '%';
}
function setOnline(playerId, onlineCount) {
  els.id.textContent = playerId;
  els.online.textContent = fmt(onlineCount);
}

// ---------------- top-right: ping / district / money ----------------
function setPing(pingMs) {
  els.ping.textContent = `${Math.round(pingMs)}ms`;
}
function setDistrict(id, name) {
  els.districtName.textContent = name;
}
function setMoney(cash, card, donate) {
  els.cash.textContent = fmt(cash);
  els.card.textContent = fmt(card);
  els.donate.textContent = fmt(donate);
}

// ---------------- vitals ----------------
function setVitals(health, armor, food) {
  els.health.textContent = Math.round(health);
  els.armor.textContent = Math.round(armor);
  els.food.textContent = Math.round(food);
}

// Minimap: intentionally not handled here — the native SA:MP radar is
// kept as-is (rendered by the game client itself, not by this CEF page).
// Only the district name badge is driven from this HUD.

// ---------------- speedometer / vehicle ----------------
function setVehicle(inVehicle, speedKmh, fuelPct, gearLabel, seatbeltOn) {
  els.speedo.style.display = inVehicle ? 'flex' : 'none';
  if (!inVehicle) return;

  const kmh = Math.round(speedKmh);
  els.speedoKmh.textContent = kmh;

  const pct = clamp(kmh / MAX_SPEED_KMH, 0, 1);
  els.speedoArcFill.style.strokeDashoffset = String(ARC_LENGTH * (1 - pct));

  els.speedoGear.textContent = gearLabel || 'D';

  const f = clamp(fuelPct, 0, 100);
  els.fuelFill.style.height = f + '%';
  els.fuelPct.textContent = Math.round(f) + '%';

  els.speedoBelt.classList.toggle('off', !seatbeltOn);
}

// ---------------- notifications ----------------
function pushNotify(text) {
  const el = document.createElement('div');
  el.className = 'notify';
  el.textContent = text;
  els.notifyStack.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ---------------- demo data (only shown outside the real cef client) ----------------
if (!window.cef) {
  setLevel(42, 67, 172);
  setOnline(986, 995);
  setPing(92);
  setDistrict(18, 'Casa Grande');
  setVitals(100, 0, 100);
  setMoney(10074989, 171225869, 1157);
  setVehicle(true, 0, 76, 'D', true);
  setTimeout(() => pushNotify('Пример уведомления: получен штраф 500$'), 1200);
}

if (window.cef) {
  cef.on('hud:level', setLevel);
  cef.on('hud:online', setOnline);
  cef.on('hud:ping', setPing);
  cef.on('hud:district', setDistrict);
  cef.on('hud:vitals', setVitals);
  cef.on('hud:money', setMoney);
  cef.on('hud:vehicle', setVehicle);
  cef.on('hud:notify', pushNotify);
}
