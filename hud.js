// ==========================================================
// Fun Russia HUD (top info bar + vitals + money grid)
// Talks to samp-cef's browser-side JS API.
//
// Pawn -> browser events expected:
//   cef_emit_event(playerid, "hud:level", lvl, expCur, expMax);
//   cef_emit_event(playerid, "hud:online", playerid, onlineCount);
//   cef_emit_event(playerid, "hud:ping", ping);
//   cef_emit_event(playerid, "hud:district", districtId, districtName);
//   cef_emit_event(playerid, "hud:vitals", health, armor, food);
//   cef_emit_event(playerid, "hud:money", cash, card, weight, bank, deposit, donate);
//
// Create browser UNFOCUSED so the player keeps game control:
//   cef_create_browser(playerid, BROWSER_HUD, "hud/index.html", false, false);
// ==========================================================

const els = {
  lvl: document.getElementById('hud-lvl'),
  exp: document.getElementById('hud-exp'),
  online: document.getElementById('hud-online'),
  id: document.getElementById('hud-id'),
  ping: document.getElementById('hud-ping'),
  districtId: document.getElementById('hud-district-id'),
  districtName: document.getElementById('hud-district-name'),
  health: document.getElementById('hud-health'),
  armor: document.getElementById('hud-armor'),
  food: document.getElementById('hud-food'),
  cash: document.getElementById('hud-cash'),
  card: document.getElementById('hud-card'),
  weight: document.getElementById('hud-weight'),
  bank: document.getElementById('hud-bank'),
  deposit: document.getElementById('hud-deposit'),
  donate: document.getElementById('hud-donate')
};

function safeNum(v, fallback = 0) { const n = Number(v); return isNaN(n) ? fallback : n; }
function fmt(n) { return safeNum(n).toLocaleString('ru-RU'); }

function setLevel(lvl, expCur, expMax) {
  els.lvl.textContent = safeNum(lvl);
  els.exp.textContent = `${safeNum(expCur)}/${safeNum(expMax)}`;
}
function setOnline(playerId, onlineCount) {
  els.id.textContent = safeNum(playerId);
  els.online.textContent = fmt(onlineCount);
}
function setPing(ping, latencyMs) {
  els.ping.textContent = latencyMs !== undefined ? `${safeNum(ping)} (${safeNum(latencyMs)}ms)` : `${safeNum(ping)}`;
}
function setDistrict(id, name) {
  els.districtId.textContent = safeNum(id);
  els.districtName.textContent = name || '—';
}
function setVitals(health, armor, food) {
  els.health.textContent = Math.round(safeNum(health));
  els.armor.textContent = Math.round(safeNum(armor));
  els.food.textContent = Math.round(safeNum(food));
}
function setMoney(cash, card, weight, bank, deposit, donate) {
  els.cash.textContent = fmt(cash);
  els.card.textContent = fmt(card);
  els.weight.textContent = fmt(weight);
  els.bank.textContent = fmt(bank);
  els.deposit.textContent = fmt(deposit);
  els.donate.textContent = fmt(donate);
}

setLevel(42, 67, 172);
setOnline(986, 995);
setPing('92.7', '10.8');
setDistrict(18, 'Casa-Grande');
setVitals(100, 0, 100);
setMoney(10074989, 0, 171225869, 3464159, 157686721, 1157);

function setupCef() {
  if (window.cef) {
    cef.on('hud:level', setLevel);
    cef.on('hud:online', setOnline);
    cef.on('hud:ping', (ping, latencyMs) => setPing(ping, latencyMs));
    cef.on('hud:district', setDistrict);
    cef.on('hud:vitals', setVitals);
    cef.on('hud:money', setMoney);
  } else {
    setTimeout(setupCef, 200);
  }
}
setupCef();
