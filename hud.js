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
let _inVehicle = false;
function setVehicle(inVehicle, speedKmh, fuelPct, gearLabel, seatbeltOn) {
  _inVehicle = inVehicle;
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

// ---------------- editor mode (drag panels + export final HTML, test only) ----------------
function initEditor() {
  const toolbar = document.getElementById('editor-toolbar');
  const toggleBtn = document.getElementById('editor-toggle');
  const exportBtn = document.getElementById('editor-export');
  if (!toolbar || !toggleBtn || !exportBtn) return;

  toolbar.style.display = 'flex';

  const targets = ['.tl-panel', '.tr-panel', '.vitals', '.speedo', '.notify-stack'];
  let editing = false;
  let dragEl = null, startX = 0, startY = 0, startLeft = 0, startTop = 0;

  function setEditing(on) {
    editing = on;
    toggleBtn.textContent = 'Двигать элементы: ' + (on ? 'вкл' : 'выкл');
    toggleBtn.classList.toggle('active', on);
    targets.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.classList.toggle('editable', on);
    });
  }

  function pxToNum(v) { return parseFloat(v) || 0; }

  function onPointerDown(e) {
    if (!editing) return;
    dragEl = e.currentTarget;
    dragEl.setPointerCapture(e.pointerId);
    const rect = dragEl.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    dragEl.style.left = rect.left + 'px';
    dragEl.style.top = rect.top + 'px';
    dragEl.style.right = 'auto';
    dragEl.style.bottom = 'auto';
    dragEl.style.transform = 'none';
  }
  function onPointerMove(e) {
    if (!editing || !dragEl) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    dragEl.style.left = (startLeft + dx) + 'px';
    dragEl.style.top = (startTop + dy) + 'px';
  }
  function onPointerUp(e) {
    if (dragEl) { try { dragEl.releasePointerCapture(e.pointerId); } catch {} }
    dragEl = null;
  }

  targets.forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
  });

  toggleBtn.addEventListener('click', () => setEditing(!editing));

  exportBtn.addEventListener('click', () => {
    const wasEditing = editing;
    setEditing(false);
    const clone = document.documentElement.cloneNode(true);
    clone.querySelector('#editor-toolbar')?.remove();
    clone.querySelectorAll('.editable').forEach(el => el.classList.remove('editable'));
    const html = '<!DOCTYPE html>\n' + clone.outerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(a.href);
    if (wasEditing) setEditing(true);
  });
}

// ---------------- demo data (only shown outside the real cef client) ----------------
if (typeof cef === 'undefined') {
  setLevel(42, 67, 172);
  setOnline(986, 995);
  setPing(92);
  setDistrict(18, 'Casa Grande');
  setVitals(100, 0, 100);
  setMoney(10074989, 171225869, 1157);
  setVehicle(true, 0, 76, 'D', true);
  initEditor();
  setTimeout(() => pushNotify('Пример уведомления: получен штраф 500$'), 1200);
}

// ---------------- подписка на события CEF (с ретраем как в auth) ----------------
function setupCefListeners() {
  if (typeof cef === 'undefined') { setTimeout(setupCefListeners, 200); return; }
  cef.on('hud:ping', (val) => {
    console.log('HUD PING RECEIVED:', val);
    if (dbg) dbg.textContent = 'PING: ' + JSON.stringify(val);
  });
  const dbg = document.getElementById('hud-debug');
  cef.on('hud:main', (...args) => {
    console.log('MAIN:', args);
    if (dbg) dbg.textContent = 'MAIN: ' + args.map(v=>JSON.stringify(v)).join(' | ');
    const [money, playerid, onlinePlayers, hp, armor, hunger, ping, speed] = args;
    if (els.cash) els.cash.textContent = fmt(money);
    if (els.id) els.id.textContent = playerid;
    if (els.online) els.online.textContent = fmt(onlinePlayers);
    if (els.health) els.health.textContent = Math.round(hp);
    if (els.armor) els.armor.textContent = Math.round(armor);
    if (els.food) els.food.textContent = hunger;
    if (els.ping) els.ping.textContent = `${ping}ms`;
    if (els.speedoKmh) els.speedoKmh.textContent = speed;
  });
  cef.on('hud:extra', (...args) => {
    console.log('EXTRA:', args);
    if (dbg) dbg.textContent = 'EXTRA: ' + args.map(v=>JSON.stringify(v)).join(' | ');
    const [level, exp, expNeed, creditCard, donate, districtId, inVehicle, fuel, gear, seatbelt] = args;
    if (els.lvl) els.lvl.textContent = level;
    if (els.exp) els.exp.textContent = `${fmt(exp)}/${fmt(expNeed)}`;
    if (els.expFill) {
      const pct = expNeed > 0 ? Math.min((exp / expNeed) * 100, 100) : 0;
      els.expFill.style.width = pct + '%';
    }
    if (els.card) els.card.textContent = fmt(creditCard);
    if (els.donate) els.donate.textContent = fmt(donate);
  });
  cef.on('hud:notify', pushNotify);
  cef.on('hud:menu', () => menuOpen());
}
setupCefListeners();

// ---------------- theme/style support ----------------
const THEMES = ['default','blue','green','gold','pink','orange','purple','rainbow'];
const THEME_LABELS = {
  default:'Default (Red)', blue:'Blue', green:'Green', gold:'Gold',
  pink:'Pink', orange:'Orange', purple:'Purple', rainbow:'Rainbow'
};
const themeGradients = {
  default: ['#ff4d4d','#a10f16'], blue:['#4d7bff','#164ba1'],
  green:['#4dff7b','#16a14b'], gold:['#ffd14d','#a17b16'],
  pink:['#ff4d9a','#a1165a'], orange:['#ff9a4d','#a15a16'],
  purple:['#9a4dff','#5a16a1'], rainbow:['#ff4d4d','#a10f16']
};
function setStyle(name) {
  document.body.className = document.body.className.replace(/theme-\S+/g,'').trim();
  if (name && name !== 'default') document.body.classList.add('theme-'+name);
  const g = themeGradients[name] || themeGradients.default;
  const s0 = document.querySelector('.lg-stop-0');
  const s1 = document.querySelector('.lg-stop-1');
  if (s0) s0.setAttribute('stop-color',g[0]);
  if (s1) s1.setAttribute('stop-color',g[1]);
}

// ==========================================================
// SETTINGS MENU — SA:MP dialog style with pages
// ==========================================================
const STORAGE_KEY = 'funrussia_hud_settings';
const DRAGGABLE = ['.tl-panel','.tr-panel','.vitals','.speedo','.notify-stack'];

// ---- default settings ----
const DEFAULTS = {
  hudEnabled: true,
  showSpeedo: true,
  showVitals: true,
  showMoney: true,
  showTopPanel: true,
  theme: 'default',
  customColors: {},
  positions: {}
};

let S = loadSettings();

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch {}
}

// ---- apply saved settings on load ----
applyAllSettings();
document.body.classList.remove('hud-off'); // force HUD on regardless of saved setting
function applyAllSettings() {
  applyHudVisibility();
  applyPositions();
  if (S.theme) setStyle(S.theme);
}

function applyHudVisibility() {
  document.body.classList.toggle('hud-off', !S.hudEnabled);
  if (!S.hudEnabled) return;
  els.speedo.style.display = (_inVehicle && S.showSpeedo) ? 'flex' : 'none';
  document.querySelector('.vitals')?.classList.toggle('menu-hidden', !S.showVitals);
  document.querySelector('.tr-money')?.closest('.tr-panel')?.classList.toggle('menu-hidden', !S.showMoney);
  document.querySelector('.tl-panel')?.classList.toggle('menu-hidden', !S.showTopPanel);
}

// ---- menu DOM refs ----
const menuEl = document.getElementById('hud-menu');
const menuBody = document.getElementById('menu-body');
const menuTitle = document.getElementById('menu-title');
const menuBack = document.getElementById('menu-back');
const overlayEl = document.getElementById('menu-overlay');
let menuPage = null; // null = closed, else page name

// ---- page stack ----
function menuOpen(page) {
  menuPage = page || null;
  menuEl.classList.remove('menu-hidden');
  renderPage(menuPage);
}
function menuClose() {
  menuPage = null;
  menuEl.classList.add('menu-hidden');
  if (window.cef) cef.emit('hud:menuclose');
}
function renderPage(page) {
  menuBack.style.display = page ? 'block' : 'none';
  menuBody.innerHTML = '';
  if (!page) renderMain();
  else if (page === 'display') renderDisplay();
  else if (page === 'theme') renderTheme();
  else if (page === 'positions') renderPositions();
  else if (page === 'colors') renderColors();
}

function addItem(parent, {label, icon, arrow, onClick, right}) {
  const btn = document.createElement('button');
  btn.className = 'menu-item';
  if (icon) { const s = document.createElement('span'); s.className='menu-icon'; s.textContent=icon; btn.appendChild(s); }
  const t = document.createElement('span');
  t.style.flex = '1';
  t.textContent = label;
  btn.appendChild(t);
  if (right) btn.appendChild(right);
  if (arrow) { const a = document.createElement('span'); a.className='menu-arrow'; a.textContent='▶'; btn.appendChild(a); }
  btn.addEventListener('click', onClick || (() => {}));
  parent.appendChild(btn);
}
function addLabel(parent, text) {
  const l = document.createElement('div'); l.className='menu-label'; l.textContent=text; parent.appendChild(l);
}
function addSep(parent) {
  const s = document.createElement('div'); s.className='menu-sep'; parent.appendChild(s);
}

function makeToggle(on, cb) {
  const btn = document.createElement('button');
  btn.className = 'menu-toggle' + (on ? ' on' : '');
  btn.addEventListener('click', () => { btn.classList.toggle('on'); cb(btn.classList.contains('on')); });
  return btn;
}
function makeRadio(on, cb) {
  const d = document.createElement('div');
  d.className = 'menu-radio' + (on ? ' on' : '');
  d.addEventListener('click', () => { if (!d.classList.contains('on')) { d.classList.add('on'); cb(); }});
  return d;
}
function makeColorSwatch(hex, cb) {
  const d = document.createElement('div');
  d.className = 'menu-color-swatch';
  d.style.background = hex;
  const inp = document.createElement('input');
  inp.type = 'color';
  inp.value = hex;
  inp.addEventListener('input', () => { d.style.background = inp.value; cb(inp.value); });
  d.appendChild(inp);
  return d;
}

// ---- MAIN MENU ----
function renderMain() {
  menuTitle.textContent = 'HUD Settings';
  addItem(menuBody, { label:'HUD Display', icon:'👁', arrow:true, onClick:()=>menuOpen('display') });
  addItem(menuBody, { label:'Theme', icon:'🎨', arrow:true, onClick:()=>menuOpen('theme') });
  addItem(menuBody, { label:'Position Editor', icon:'✋', arrow:true, onClick:()=>menuOpen('positions') });
  addItem(menuBody, { label:'Custom Colors', icon:'🌈', arrow:true, onClick:()=>menuOpen('colors') });
  addSep(menuBody);
  addItem(menuBody, { label:'Reset to Defaults', icon:'↺', onClick:()=>{ resetDefaults(); menuClose(); } });
}

// ---- DISPLAY PAGE ----
function renderDisplay() {
  menuTitle.textContent = 'HUD Display';
  addItem(menuBody, {
    label:'HUD Enabled', icon:'👁',
    right: makeToggle(S.hudEnabled, v => { S.hudEnabled=v; saveSettings(); applyHudVisibility(); })
  });
  addItem(menuBody, {
    label:'Speedometer', icon:'🚗',
    right: makeToggle(S.showSpeedo, v => { S.showSpeedo=v; saveSettings(); applyHudVisibility(); })
  });
  addItem(menuBody, {
    label:'Vitals (HP/Armor/Food)', icon:'❤',
    right: makeToggle(S.showVitals, v => { S.showVitals=v; saveSettings(); applyHudVisibility(); })
  });
  addItem(menuBody, {
    label:'Money Panel', icon:'💰',
    right: makeToggle(S.showMoney, v => { S.showMoney=v; saveSettings(); applyHudVisibility(); })
  });
  addItem(menuBody, {
    label:'Top Panel (Level/Online)', icon:'📊',
    right: makeToggle(S.showTopPanel, v => { S.showTopPanel=v; saveSettings(); applyHudVisibility(); })
  });
}

// ---- THEME PAGE ----
function renderTheme() {
  menuTitle.textContent = 'Theme';
  THEMES.forEach(t => {
    addItem(menuBody, {
      label: THEME_LABELS[t] || t,
      icon: t === 'default' ? '🔴' : '🎨',
      right: makeRadio(S.theme === t, () => { S.theme = t; saveSettings(); setStyle(t); renderTheme(); })
    });
  });
}

// ---- POSITION EDITOR ----
let posDragEl = null, posStartX = 0, posStartY = 0, posStartLeft = 0, posStartTop = 0;
let posEditing = false;

function renderPositions() {
  menuTitle.textContent = 'Position Editor';
  const h = document.createElement('div');
  h.className = 'pos-hint';
  h.textContent = posEditing ? 'Drag any HUD element to reposition it' : 'Tap "Unlock" to start moving elements';
  menuBody.appendChild(h);
  const row = document.createElement('div'); row.className='pos-btn-row';
  const lockBtn = document.createElement('button');
  lockBtn.textContent = posEditing ? '🔒 Lock' : '🔓 Unlock';
  lockBtn.className = posEditing ? 'primary' : '';
  lockBtn.addEventListener('click', () => { posEditing = !posEditing; renderPositions(); });
  row.appendChild(lockBtn);
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Save';
  saveBtn.addEventListener('click', () => {
    DRAGGABLE.forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;
      if (el.style.left && el.style.top) {
        S.positions[sel] = { left: parseFloat(el.style.left), top: parseFloat(el.style.top) };
      }
    });
    saveSettings();
    pushNotify('Positions saved');
  });
  row.appendChild(saveBtn);
  const resetBtn = document.createElement('button');
  resetBtn.textContent = '↺ Reset';
  resetBtn.addEventListener('click', () => {
    S.positions = {};
    saveSettings();
    applyPositions();
    pushNotify('Positions reset');
  });
  row.appendChild(resetBtn);
  menuBody.appendChild(row);
}

function applyPositions() {
  DRAGGABLE.forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    const pos = S.positions[sel];
    if (pos) {
      el.style.left = pos.left + 'px';
      el.style.top = pos.top + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.transform = 'none';
    } else {
      el.style.left = ''; el.style.top = ''; el.style.right = ''; el.style.bottom = '';
      el.style.transform = '';
    }
  });
}

// ---- position drag handlers (live) ----
function posPointerDown(e) {
  if (!posEditing) return;
  posDragEl = e.currentTarget;
  posDragEl.setPointerCapture(e.pointerId);
  const r = posDragEl.getBoundingClientRect();
  posStartX = e.clientX; posStartY = e.clientY;
  posStartLeft = r.left; posStartTop = r.top;
  posDragEl.style.left = r.left+'px'; posDragEl.style.top = r.top+'px';
  posDragEl.style.right = 'auto'; posDragEl.style.bottom = 'auto';
  posDragEl.style.transform = 'none';
}
function posPointerMove(e) {
  if (!posEditing || !posDragEl) return;
  posDragEl.style.left = (posStartLeft + e.clientX - posStartX) + 'px';
  posDragEl.style.top = (posStartTop + e.clientY - posStartY) + 'px';
}
function posPointerUp(e) {
  if (posDragEl) { try { posDragEl.releasePointerCapture(e.pointerId); } catch {} }
  if (posDragEl) {
    const sel = '[style*="left"]';
    // auto-save position on drop
    DRAGGABLE.forEach(s => {
      const el = document.querySelector(s);
      if (el === posDragEl && el.style.left) {
        S.positions[s] = { left: parseFloat(el.style.left), top: parseFloat(el.style.top) };
        saveSettings();
      }
    });
  }
  posDragEl = null;
}

// ---- attach position drag to all panels ----
DRAGGABLE.forEach(sel => {
  const el = document.querySelector(sel);
  if (!el) return;
  el.addEventListener('pointerdown', posPointerDown);
  el.addEventListener('pointermove', posPointerMove);
  el.addEventListener('pointerup', posPointerUp);
});

// ---- CUSTOM COLORS PAGE ----
const COLOR_KEYS = [
  { key:'accent', label:'Accent Color', default:'#e0202b' },
  { key:'health', label:'Health Icon', default:'#e0202b' },
  { key:'armor', label:'Armor Icon', default:'#9aa3ad' },
  { key:'food', label:'Food Icon', default:'#e0a020' },
  { key:'moneyCash', label:'Money Cash', default:'#58c96a' },
  { key:'moneyCard', label:'Money Card', default:'#58c96a' },
  { key:'donate', label:'Donate Icon', default:'#e0202b' },
  { key:'panelBg', label:'Panel Background', default:'rgba(12,12,15,0.72)' }
];

function renderColors() {
  menuTitle.textContent = 'Custom Colors';
  COLOR_KEYS.forEach(c => {
    const cur = S.customColors[c.key] || c.default;
    const row = document.createElement('div'); row.className='menu-color-row';
    const lbl = document.createElement('span'); lbl.textContent = c.label;
    row.appendChild(lbl);
    const swatch = makeColorSwatch(cur, val => {
      S.customColors[c.key] = val;
      saveSettings();
      applyCustomColors();
    });
    row.appendChild(swatch);
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '↺';
    resetBtn.style.cssText = 'background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;';
    resetBtn.addEventListener('click', () => {
      delete S.customColors[c.key];
      saveSettings();
      applyCustomColors();
      renderColors();
    });
    row.appendChild(resetBtn);
    menuBody.appendChild(row);
  });
  addSep(menuBody);
  addItem(menuBody, { label:'Reset all colors to default', icon:'↺', onClick:()=>{
    S.customColors = {};
    saveSettings();
    applyCustomColors();
    renderColors();
  }});
}

function applyCustomColors() {
  const cc = S.customColors;
  if (cc.accent) document.documentElement.style.setProperty('--accent', cc.accent);
  else document.documentElement.style.removeProperty('--accent');
  if (cc.health) document.querySelector('.vital-health svg')?.style.setProperty('fill', cc.health);
  else document.querySelector('.vital-health svg')?.style.removeProperty('fill');
  if (cc.armor) document.querySelector('.vital-armor svg')?.style.setProperty('fill', cc.armor);
  else document.querySelector('.vital-armor svg')?.style.removeProperty('fill');
  if (cc.food) document.querySelector('.vital-food svg')?.style.setProperty('stroke', cc.food);
  else document.querySelector('.vital-food svg')?.style.removeProperty('stroke');
  if (cc.moneyCash) document.querySelector('.money-cash')?.style.setProperty('color', cc.moneyCash);
  else document.querySelector('.money-cash')?.style.removeProperty('color');
  if (cc.moneyCard) document.querySelector('.money-card')?.style.setProperty('stroke', cc.moneyCard);
  else document.querySelector('.money-card')?.style.removeProperty('stroke');
  if (cc.donate) document.querySelector('.money-donate')?.style.setProperty('stroke', cc.donate);
  else document.querySelector('.money-donate')?.style.removeProperty('stroke');
  if (cc.panelBg) {
    document.querySelectorAll('.tl-panel,.tr-panel,.vitals,.speedo-main').forEach(el => {
      el.style.setProperty('background', cc.panelBg);
    });
  } else {
    document.querySelectorAll('.tl-panel,.tr-panel,.vitals,.speedo-main').forEach(el => {
      el.style.removeProperty('background');
    });
  }
}

// ---- reset all ----
function resetDefaults() {
  S = { ...DEFAULTS };
  S.customColors = {};
  S.positions = {};
  saveSettings();
  applyAllSettings();
  applyCustomColors();
  pushNotify('Settings reset to defaults');
}

// ---- overlay close ----
overlayEl.addEventListener('click', menuClose);
menuBack.addEventListener('click', () => { menuPage = null; renderPage(null); });
document.getElementById('menu-close').addEventListener('click', menuClose);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menuEl.classList.contains('menu-hidden')) menuClose(); });

// ---- apply custom colors on startup ----
applyCustomColors();
