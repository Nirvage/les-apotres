(function () {
'use strict';

const HISTORY_STORAGE_KEY = 'dnd_des_v1';
const MAX_HISTORY_LENGTH = 60;
const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];
const ABILITY_NAMES = { for: 'Force', dex: 'Dextérité', con: 'Constitution', int: 'Intelligence', sag: 'Sagesse', cha: 'Charisme' };
const ROLL_HINT = ' (Maj+clic : avantage, Ctrl+clic : désavantage)';
const NORMAL = 'norm';
const ADVANTAGE = 'adv';
const DISADVANTAGE = 'dis';

const escapeHtml = value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const withAsciiMinus = text => String(text).replace(/[−–—]/g, '-');

function rollDie(faces) {
  if (window.crypto && crypto.getRandomValues) {
    const randomValues = new Uint32Array(1);
    const unbiasedLimit = Math.floor(4294967296 / faces) * faces;
    do { crypto.getRandomValues(randomValues); } while (randomValues[0] >= unbiasedLimit);
    return randomValues[0] % faces + 1;
  }
  return Math.floor(Math.random() * faces) + 1;
}

function normalizedFormula(formula) {
  return withAsciiMinus(String(formula || '').toLowerCase()).replace(/\s+/g, '').replace(/d%/g, 'd100').replace(/^\+/, '');
}

function diceTerm(sign, countText, facesText, keepWhich, keepCountText) {
  const count = countText === '' ? 1 : +countText;
  const faces = +facesText;
  if (count < 1 || count > 100 || faces < 2 || faces > 1000) return null;
  const term = { s: sign, n: count, f: faces };
  if (keepWhich) {
    term.k = keepWhich;
    term.kn = Math.min(count, Math.max(1, +keepCountText));
  }
  return term;
}

function parseFormula(formula) {
  const text = normalizedFormula(formula);
  if (!text) return null;
  const termPattern = /([+-]?)(?:(\d*)d(\d+)(?:k([hl])(\d+))?|(\d+))/g;
  const terms = [];
  let position = 0, match;
  while ((match = termPattern.exec(text))) {
    if (match.index !== position || !match[0]) return null;
    position = termPattern.lastIndex;
    const [, signText, countText, facesText, keepWhich, keepCountText, constantText] = match;
    const sign = signText === '-' ? -1 : 1;
    if (!facesText) {
      terms.push({ s: sign, c: +constantText });
      continue;
    }
    const term = diceTerm(sign, countText, facesText, keepWhich, keepCountText);
    if (!term) return null;
    terms.push(term);
  }
  return position === text.length && terms.length ? terms : null;
}

function damageFormula(damageText) {
  const match = withAsciiMinus(damageText || '').match(/^\s*([\dd%+\-\s]+)/i);
  return match ? match[1].replace(/[\s+\-]+$/, '').trim() : '';
}

function signPrefix(index, sign) {
  if (!index && sign >= 0) return '';
  return sign < 0 ? ' − ' : ' + ';
}

function keptDice(rolls, keepWhich, keepCount) {
  if (!keepWhich) return rolls.map(() => true);
  const kept = rolls.map(() => false);
  rolls.map((value, index) => index)
    .sort((first, second) => keepWhich === 'h' ? rolls[second] - rolls[first] : rolls[first] - rolls[second])
    .slice(0, keepCount)
    .forEach(index => { kept[index] = true; });
  return kept;
}

function evaluateFormula(terms, options) {
  options = options || {};
  let total = 0, naturalRoll = null, modeApplied = false;
  const parts = [];
  terms.forEach(term => {
    if (term.c != null) {
      total += term.s * term.c;
      parts.push({ c: term.c, s: term.s });
      return;
    }
    let count = options.crit ? term.n * 2 : term.n;
    let keepWhich = term.k, keepCount = term.kn;
    const appliesMode = !modeApplied && term.f === 20 && count === 1 && !keepWhich && (options.mode === ADVANTAGE || options.mode === DISADVANTAGE);
    if (appliesMode) {
      count = 2;
      keepWhich = options.mode === ADVANTAGE ? 'h' : 'l';
      keepCount = 1;
      modeApplied = true;
    }
    const rolls = [];
    for (let index = 0; index < count; index++) rolls.push(rollDie(term.f));
    const kept = keptDice(rolls, keepWhich, keepCount);
    const sum = rolls.reduce((total, value, index) => total + (kept[index] ? value : 0), 0);
    if (term.f === 20 && naturalRoll === null && (count === 1 || keepCount === 1)) naturalRoll = rolls.filter((value, index) => kept[index])[0];
    total += term.s * sum;
    const showsMode = modeApplied && parts.every(part => !part.adv);
    parts.push({ s: term.s, f: term.f, r: rolls, keep: kept, k: term.k, kn: term.kn, adv: showsMode ? options.mode : null });
  });
  return { tot: total, parts: parts, nat: naturalRoll, usedMode: modeApplied };
}

function dieValueClass(part, value, index) {
  if (!part.keep[index]) return 'dz-x';
  if (part.f === 20 && value === 20) return 'dz-20';
  if (part.f === 20 && value === 1) return 'dz-1';
  return '';
}

function partLabel(part) {
  if (part.adv) return 'd20 ' + (part.adv === ADVANTAGE ? 'avantage' : 'désavantage');
  return part.r.length + 'd' + part.f + (part.k ? 'k' + part.k + part.kn : '');
}

function partsHtml(parts) {
  return parts.map((part, index) => {
    const prefix = signPrefix(index, part.s);
    if (part.c != null) return prefix + part.c;
    const values = part.r.map((value, valueIndex) => {
      const valueClass = dieValueClass(part, value, valueIndex);
      return valueClass ? '<span class="' + valueClass + '">' + value + '</span>' : value;
    });
    return prefix + partLabel(part) + ' [' + values.join(', ') + ']';
  }).join('');
}

let d20Mode = NORMAL;
let rollHistory = loadHistory();
let panel = null;
let floatingButton = false;

function loadHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
    return Array.isArray(history) ? history : [];
  } catch (error) {
    return [];
  }
}

function saveHistory() {
  try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(rollHistory.slice(0, MAX_HISTORY_LENGTH))); } catch (error) {}
}

function rollerName() {
  const nameField = document.querySelector('[data-k="nom"]');
  if (nameField && nameField.value.trim()) return nameField.value.trim();
  try {
    const character = window.Persos && Persos.current && Persos.current();
    return character && character.nom || '';
  } catch (error) {
    return '';
  }
}

const DICE_CSS = ''
 +'.dz-fab{position:fixed;right:16px;bottom:16px;z-index:40;width:56px;height:56px;border-radius:50%;border:3px solid var(--gold,#d9a21b);background:#12142f;color:var(--gold,#d9a21b);font:italic 700 17px var(--serif,Georgia,serif);cursor:pointer;box-shadow:0 4px 16px #0007;display:grid;place-items:center}'
 +'.dz-fab:hover,.dz-fab:focus-visible{outline:3px solid #fff;outline-offset:2px}'
 +'.dz-fab .dz-badge{position:absolute;top:-6px;left:-8px;font:700 10px var(--sans,system-ui);font-style:normal;background:#2e9e5b;color:#fff;border-radius:999px;padding:2px 6px}'
 +'.dz-fab .dz-badge.dis{background:#c8402f}'
 +'.dz{background:#fff;color:var(--ink,#1d2033);border-radius:12px;border-top:4px solid var(--gold,#d9a21b);box-shadow:0 8px 32px #0008;display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;font:13px/1.4 var(--sans,system-ui)}'
 +'.dz.fl{position:fixed;right:16px;bottom:84px;z-index:41;width:320px;max-height:calc(100vh - 110px);overflow:auto}'
 +'.dz[hidden]{display:none}'
 +'.dz-h{display:flex;align-items:center;gap:8px}'
 +'.dz-h b{flex:1;font:italic 700 16px var(--serif,Georgia,serif);color:#2a3170}'
 +'.dz-h button{border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:var(--soft,#5f6580);padding:2px 6px}'
 +'.dz-res{border:1.5px solid #d5d8ee;border-radius:9px;background:#f5f6fd;padding:8px 10px;min-height:64px}'
 +'.dz-res.new{animation:dzf .45s}'
 +'@keyframes dzf{from{background:#fff3cf}to{background:#f5f6fd}}'
 +'@media (prefers-reduced-motion:reduce){.dz-res.new{animation:none}}'
 +'.dz-lab{font-weight:600;color:#2a3170}'
 +'.dz-big{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}'
 +'.dz-tot{font:700 30px var(--serif,Georgia,serif);color:#2a3170;min-width:40px}'
 +'.dz-det{font-size:12px;color:var(--soft,#5f6580);overflow-wrap:anywhere}'
 +'.dz-x{text-decoration:line-through;opacity:.55}'
 +'.dz-20{color:#2e9e5b;font-weight:700}.dz-1{color:#c8402f;font-weight:700}'
 +'.dz-tag{font:700 11px var(--sans,system-ui);border-radius:999px;padding:1px 8px;color:#fff;background:#2e9e5b}'
 +'.dz-tag.ko{background:#c8402f}'
 +'.dz-dmg{margin-top:4px;padding-top:4px;border-top:1px dashed #c9cde0}'
 +'.dz-dmg .dz-tot{font-size:22px;color:#c8402f}'
 +'.dz-mode{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}'
 +'.dz button.dz-b{border:1.5px solid #2a3170;background:#fff;color:#2a3170;border-radius:6px;padding:5px 6px;font:600 12px var(--sans,system-ui);cursor:pointer;min-height:32px}'
 +'.dz button.dz-b[aria-pressed=true]{background:#2a3170;color:#fff}'
 +'.dz-mode button[data-m=adv][aria-pressed=true]{background:#2e9e5b;border-color:#2e9e5b}'
 +'.dz-mode button[data-m=dis][aria-pressed=true]{background:#c8402f;border-color:#c8402f}'
 +'.dz-f{display:flex;gap:6px}'
 +'.dz-f input{flex:1;min-width:0;border:1px solid #c9cde0;border-radius:6px;padding:6px 8px;background:#fff}'
 +'.dz-f button{background:#2a3170!important;color:#fff!important}'
 +'.dz-q{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}'
 +'.dz-q button{padding:5px 0!important}'
 +'.dz-hd summary{cursor:pointer;font-size:12px;font-weight:600;color:#2a3170}'
 +'.dz-hd summary span{font-weight:400;color:var(--soft,#5f6580)}'
 +'.dz-hh{display:flex;justify-content:flex-end}'
 +'.dz-hh button{border:0;background:transparent;color:var(--soft,#5f6580);text-decoration:underline;cursor:pointer;font-size:11px}'
 +'.dz-l{list-style:none;margin:4px 0;padding:0;overflow:auto;display:flex;flex-direction:column;gap:2px}'
 +'.dz.fl .dz-l{max-height:30vh}'
 +'.dz-l li{display:flex;gap:8px;align-items:baseline;font-size:12px;border-bottom:1px solid #eceefb;padding:3px 0}'
 +'.dz-l li b{min-width:30px;text-align:right;font:700 15px var(--serif,Georgia,serif);color:#2a3170}'
 +'.dz-l li .dz-d{flex:1;min-width:0;overflow-wrap:anywhere}'
 +'.dz-l li small{color:var(--soft,#5f6580);font-size:10.5px}'
 +'.dz-l li.e{color:var(--soft,#5f6580);justify-content:center}'
 +'.dz-hint{margin:0;font-size:11px;color:var(--soft,#5f6580)}'
 +'[data-dz]{cursor:pointer;-webkit-tap-highlight-color:transparent}'
 +'[data-dz]:hover,[data-dz]:focus-visible{text-decoration:underline;outline:none}'
 +'.dz-rb{flex:none;border:1px solid var(--c,#d8791a);background:#fff;color:var(--c,#d8791a);border-radius:5px;font:700 10px var(--sans,system-ui);padding:2px 4px;cursor:pointer;line-height:1.2}'
 +'.dz-rb:hover,.dz-rb:focus-visible{background:var(--c,#d8791a);color:#fff}'
 +'@media screen and (max-width:700px){'
 +' .dz.fl{left:8px;right:8px;bottom:8px;width:auto;max-height:70vh}'
 +' .dz-fab{right:12px;bottom:12px}'
 +' .dz button.dz-b{min-height:38px}'
 +' .dz-rb{padding:4px 7px;font-size:11px}'
 +'}'
 +'@media print{.dz,.dz-fab,.dz-rb{display:none!important}[data-dz]{text-decoration:none!important}}';

function panelHtml(isEmbedded) {
  const closeButton = isEmbedded ? '' : '<button type="button" class="dz-close" aria-label="Fermer le lanceur de dés">×</button>';
  const sheetHint = document.getElementById('sk_0') ? ' Sur la fiche, clique sur une compétence, un jet de sauvegarde, l’initiative ou le bouton d’une attaque.' : '';
  const quickDiceButtons = QUICK_DICE.map(faces => '<button type="button" class="dz-b" data-q="' + faces + '">d' + faces + '</button>').join('');
  return '<div class="dz-h"><b>Lanceur de dés</b>' + closeButton + '</div>'
    + '<div class="dz-res" aria-live="polite"><p class="dz-hint">Tape une formule (2d6+3, 4d6kh3, d20+5, d%) ou choisis un dé.' + sheetHint + '</p></div>'
    + '<div class="dz-mode" role="group" aria-label="Jet de d20"><button type="button" class="dz-b" data-m="dis">Désavantage</button><button type="button" class="dz-b" data-m="norm">Normal</button><button type="button" class="dz-b" data-m="adv">Avantage</button></div>'
    + '<form class="dz-f"><input type="text" class="dz-in" placeholder="ex. 2d6+3" aria-label="Formule de dés" autocomplete="off" enterkeyhint="go"><button type="submit" class="dz-b">Lancer</button></form>'
    + '<div class="dz-q">' + quickDiceButtons + '</div>'
    + '<details class="dz-hd"' + (isEmbedded ? ' open' : '') + '><summary>Historique <span class="dz-n"></span></summary><ul class="dz-l"></ul><div class="dz-hh"><button type="button" class="dz-clr">Effacer l’historique</button></div></details>';
}

function clearHistoryAfterConfirmation() {
  if (rollHistory.length && !confirm('Effacer l’historique des jets ?')) return;
  rollHistory = [];
  saveHistory();
  renderHistory();
}

function handlePanelClick(event) {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.m) {
    d20Mode = button.dataset.m;
    syncModeButtons();
    return;
  }
  if (button.dataset.q) {
    rollDice({ label: 'd' + button.dataset.q, f: '1d' + button.dataset.q }, event);
    return;
  }
  if (button.classList.contains('dz-close')) {
    setPanelOpen(false);
    return;
  }
  if (button.classList.contains('dz-clr')) clearHistoryAfterConfirmation();
}

function rollTypedFormula(event) {
  event.preventDefault();
  const formula = panel.querySelector('.dz-in').value.trim();
  if (!formula) return;
  if (!parseFormula(formula)) {
    showResult('<p class="dz-hint" style="color:#c8402f">Formule non comprise : « ' + escapeHtml(formula) + ' ». Exemples : 2d6+3, d20+5, 4d6kh3, 1d8+1d6+2, d%.</p>');
    return;
  }
  rollDice({ label: formula, f: formula });
}

function addFloatingButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dz-fab';
  button.setAttribute('aria-label', 'Lanceur de dés');
  button.title = 'Lanceur de dés';
  button.innerHTML = 'd20<span class="dz-badge" hidden></span>';
  button.addEventListener('click', () => setPanelOpen(panel.hidden));
  document.body.appendChild(button);
  panel.hidden = true;
  floatingButton = button;
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || panel.hidden || !panel.contains(document.activeElement)) return;
    setPanelOpen(false);
    button.focus();
  });
}

function buildPanel(host) {
  const style = document.createElement('style');
  style.textContent = DICE_CSS;
  document.head.appendChild(style);
  panel = document.createElement('section');
  panel.className = 'dz' + (host ? '' : ' fl');
  panel.setAttribute('aria-label', 'Lanceur de dés');
  panel.innerHTML = panelHtml(!!host);
  (host || document.body).appendChild(panel);
  ['input', 'change'].forEach(type => panel.addEventListener(type, event => event.stopPropagation()));
  panel.addEventListener('click', handlePanelClick);
  panel.querySelector('form').addEventListener('submit', rollTypedFormula);
  if (!host) addFloatingButton();
  syncModeButtons();
  renderHistory();
}

function setPanelOpen(open) {
  if (!panel) buildPanel();
  if (!floatingButton) return;
  panel.hidden = !open;
  floatingButton.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function syncModeButtons() {
  if (!panel) return;
  panel.querySelectorAll('.dz-mode button').forEach(button => button.setAttribute('aria-pressed', button.dataset.m === d20Mode ? 'true' : 'false'));
  if (!floatingButton) return;
  const badge = floatingButton.querySelector('.dz-badge');
  badge.hidden = d20Mode === NORMAL;
  badge.textContent = d20Mode === ADVANTAGE ? 'Av.' : 'Dés.';
  badge.className = 'dz-badge' + (d20Mode === DISADVANTAGE ? ' dis' : '');
}

function showResult(html) {
  const result = panel.querySelector('.dz-res');
  result.innerHTML = html;
  result.classList.remove('new');
  void result.offsetWidth;
  result.classList.add('new');
}

function twoDigits(number) {
  return ('0' + number).slice(-2);
}

function historyEntryHtml(entry) {
  const date = new Date(entry.t);
  const time = twoDigits(date.getHours()) + ':' + twoDigits(date.getMinutes());
  return '<li><b>' + entry.tot + '</b><span class="dz-d">' + escapeHtml(entry.lab) + (entry.tag ? ' · <strong>' + escapeHtml(entry.tag) + '</strong>' : '')
    + (entry.dmg != null ? ' · dégâts <strong>' + entry.dmg + '</strong>' : '') + '<br><small>' + escapeHtml(entry.det) + '</small></span><small>'
    + (entry.who ? escapeHtml(entry.who) + ' · ' : '') + time + '</small></li>';
}

function renderHistory() {
  panel.querySelector('.dz-n').textContent = rollHistory.length ? '(' + rollHistory.length + ')' : '';
  panel.querySelector('.dz-l').innerHTML = rollHistory.length ? rollHistory.map(historyEntryHtml).join('') : '<li class="e">Aucun jet pour l’instant.</li>';
}

function htmlToText(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.textContent;
}

function modeForClick(event) {
  if (event && event.shiftKey) return ADVANTAGE;
  if (event && (event.ctrlKey || event.altKey || event.metaKey)) return DISADVANTAGE;
  return d20Mode;
}

function naturalRollTag(naturalRoll) {
  if (naturalRoll === 20) return '20 naturel';
  if (naturalRoll === 1) return '1 naturel';
  return '';
}

function damageTypeText(damageText, formula) {
  const text = withAsciiMinus(damageText);
  return text.slice(text.indexOf(formula) + formula.length).trim();
}

function damageHtml(request, damageRoll, formula, isCritical) {
  if (damageRoll) {
    const damageType = damageTypeText(request.dmg, formula);
    return '<div class="dz-dmg"><div class="dz-big"><span class="dz-tot">' + damageRoll.tot + '</span><span>dégâts' + (damageType ? ' ' + escapeHtml(damageType) : '') + (isCritical ? ' (dés doublés)' : '')
      + '</span><span class="dz-det">' + partsHtml(damageRoll.parts) + '</span></div></div>';
  }
  if (request.dmg && !formula) return '<div class="dz-det dz-dmg">Dégâts : ' + escapeHtml(request.dmg) + '</div>';
  return '';
}

function rollResultHtml(request, roll, tag, extraText) {
  return '<div class="dz-lab">' + escapeHtml(request.label) + '</div><div class="dz-big"><span class="dz-tot">' + roll.tot + '</span>'
    + (tag ? '<span class="dz-tag' + (roll.nat === 1 ? ' ko' : '') + '">' + tag + '</span>' : '')
    + '<span class="dz-det">' + partsHtml(roll.parts) + '</span></div>'
    + (extraText ? '<div class="dz-det" style="margin-top:2px">' + extraText + '</div>' : '');
}

function rememberRoll(request, roll, tag, extraText, damageRoll) {
  rollHistory.unshift({
    t: Date.now(), who: rollerName(), lab: request.label, tot: roll.tot,
    det: htmlToText(partsHtml(roll.parts)) + (extraText ? ' — ' + htmlToText(extraText) : ''), tag: tag, dmg: damageRoll ? damageRoll.tot : null
  });
  rollHistory = rollHistory.slice(0, MAX_HISTORY_LENGTH);
  saveHistory();
  renderHistory();
}

function rollDice(request, event) {
  if (!panel) buildPanel();
  const terms = parseFormula(request.f);
  if (!terms) return null;
  const mode = modeForClick(event);
  const roll = evaluateFormula(terms, { mode: mode });
  if (roll.usedMode && d20Mode !== NORMAL && mode === d20Mode) {
    d20Mode = NORMAL;
    syncModeButtons();
  }
  const isCritical = roll.nat === 20;
  const formula = request.dmg ? damageFormula(request.dmg) : '';
  const damageTerms = formula && parseFormula(formula);
  const damageRoll = damageTerms ? evaluateFormula(damageTerms, { crit: isCritical }) : null;
  const tag = request.dmg && isCritical ? 'Critique !' : naturalRollTag(roll.nat);
  const extraText = request.then ? request.then(roll) || '' : '';
  showResult(rollResultHtml(request, roll, tag, extraText) + damageHtml(request, damageRoll, formula, isCritical));
  rememberRoll(request, roll, tag, extraText, damageRoll);
  setPanelOpen(true);
  return roll;
}

const $ = selector => document.querySelector(selector);

function firstSignedNumber(text) {
  const match = String(text || '').replace(/[−–]/g, '-').match(/[+-]?\d+/);
  return match ? +match[0] : 0;
}

function d20Formula(bonus) {
  return 'd20' + (bonus ? (bonus > 0 ? '+' : '') + bonus : '');
}

function makeRollable(element, title) {
  if (!element) return;
  element.setAttribute('data-dz', '');
  element.setAttribute('role', 'button');
  element.tabIndex = 0;
  element.title = title + ROLL_HINT;
}

function makeRollableWithLabel(element, title) {
  makeRollable(element, title);
  const label = element && element.parentNode.querySelector('.t');
  if (label) makeRollable(label, title);
}

function skillName(skillIndex) {
  const skill = $('#sk_' + skillIndex);
  const label = skill && skill.parentNode.querySelector('.t');
  return label ? label.textContent : '';
}

function markSheetRollables() {
  document.querySelectorAll('[id^="sk_"]').forEach(skill => makeRollableWithLabel(skill, 'Lancer ' + skillName(skill.id.slice(3))));
  Object.keys(ABILITY_NAMES).forEach(ability => {
    const save = $('#sv_' + ability);
    if (save) makeRollableWithLabel(save, 'Jet de sauvegarde de ' + ABILITY_NAMES[ability]);
    makeRollable($('#m_' + ability), 'Test de ' + ABILITY_NAMES[ability]);
  });
  makeRollable($('#init'), 'Lancer l’initiative');
  makeRollable($('#sab'), 'Attaque de sort');
}

function rollableId(element) {
  if (element.id) return element.id;
  const row = element.parentNode;
  return row ? (row.querySelector('[id^="sk_"],[id^="sv_"]') || {}).id || '' : '';
}

function sheetRollRequest(element) {
  const id = rollableId(element);
  if (/^sk_\d+$/.test(id)) return { label: skillName(id.slice(3)), f: d20Formula(firstSignedNumber($('#' + id).textContent)) };
  if (/^sv_/.test(id)) return { label: 'Sauvegarde de ' + ABILITY_NAMES[id.slice(3)], f: d20Formula(firstSignedNumber($('#' + id).textContent)) };
  if (/^m_/.test(id)) return { label: 'Test de ' + ABILITY_NAMES[id.slice(2)], f: d20Formula(firstSignedNumber(element.textContent)) };
  if (id === 'init') return { label: 'Initiative', f: d20Formula(firstSignedNumber(element.textContent)) };
  if (id === 'sab' && /\d/.test(element.textContent)) return { label: 'Attaque de sort', f: d20Formula(firstSignedNumber(element.textContent)) };
  return null;
}

function rollFromSheetElement(element, event) {
  const request = sheetRollRequest(element);
  if (!request) return;
  event.preventDefault();
  rollDice(request, event);
}

function addAttackColumnStyle() {
  const style = document.createElement('style');
  style.textContent = '#atks .atk,.atk.h{grid-template-columns:2fr 1fr 2fr auto}.atk.h::after{content:"";width:26px}@media print{#atks .atk,.atk.h{grid-template-columns:2fr 1fr 2fr}.atk.h::after{display:none}}';
  document.head.appendChild(style);
}

function attackInputs(row) {
  const [nameInput, bonusInput, damageInput] = row.querySelectorAll('input');
  return { name: nameInput.value.trim(), bonus: bonusInput.value.trim(), damage: damageInput.value.trim() };
}

function updateAttackButtons(rows) {
  rows.forEach(row => {
    const attack = attackInputs(row);
    const button = row.querySelector('.dz-rb');
    button.hidden = !(attack.bonus || attack.damage);
    button.title = 'Lancer ' + (attack.name || 'l’attaque') + ' (toucher et dégâts ; Maj+clic : avantage)';
  });
}

function rollAttack(row, event) {
  const attack = attackInputs(row);
  const name = attack.name || 'Attaque';
  if (/\d/.test(attack.bonus) || !attack.damage) {
    rollDice({ label: name, f: d20Formula(firstSignedNumber(attack.bonus)), dmg: attack.damage }, event);
    return;
  }
  const formula = damageFormula(attack.damage);
  if (parseFormula(formula)) rollDice({ label: name + ' (dégâts)', f: formula }, event);
}

function addAttackButtons() {
  addAttackColumnStyle();
  const rows = document.querySelectorAll('#atks .atk');
  rows.forEach(row => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dz-rb';
    button.textContent = 'd20';
    button.setAttribute('aria-label', 'Lancer cette attaque');
    button.addEventListener('click', event => rollAttack(row, event));
    row.appendChild(button);
  });
  const refresh = () => updateAttackButtons(rows);
  refresh();
  document.addEventListener('input', refresh);
  document.addEventListener('change', refresh);
  const characterSelector = document.getElementById('persos');
  if (characterSelector) new MutationObserver(refresh).observe(characterSelector, { subtree: true, childList: true, attributes: true });
}

const deathSaveBox = (kind, number) => document.querySelector('[data-k="' + kind + number + '"]');
const notifyChange = element => element.dispatchEvent(new Event('change', { bubbles: true }));

function checkedDeathSaves(kind) {
  let count = 0;
  for (let number = 1; number <= 3; number++) {
    const box = deathSaveBox(kind, number);
    if (box && box.checked) count++;
  }
  return count;
}

function checkDeathSaves(kind, count) {
  for (let number = 1; number <= 3 && count > 0; number++) {
    const box = deathSaveBox(kind, number);
    if (box && !box.checked) {
      box.checked = true;
      notifyChange(box);
      count--;
    }
  }
}

function regainConsciousness() {
  for (let number = 1; number <= 3; number++) {
    ['ds', 'df'].forEach(kind => {
      const box = deathSaveBox(kind, number);
      if (box && box.checked) {
        box.checked = false;
        notifyChange(box);
      }
    });
  }
  const hitPoints = document.querySelector('[data-k="pv"]');
  if (hitPoints && !(+hitPoints.value > 0)) {
    hitPoints.value = '1';
    notifyChange(hitPoints);
  }
  return 'Tu reprends conscience avec 1 PV.';
}

function plural(count, word) {
  return count + ' ' + word + (count > 1 ? 's' : '');
}

function applyDeathSaveRoll(roll) {
  if (roll.nat === 20) return regainConsciousness();
  if (roll.nat === 1) checkDeathSaves('df', 2);
  else if (roll.tot >= 10) checkDeathSaves('ds', 1);
  else checkDeathSaves('df', 1);
  const successes = checkedDeathSaves('ds'), failures = checkedDeathSaves('df');
  if (failures >= 3) return (roll.nat === 1 ? 'Deux échecs. ' : 'Échec. ') + 'Trois échecs : le personnage meurt.';
  if (successes >= 3) return 'Réussite. Trois réussites : le personnage est stable (0 PV).';
  const outcome = roll.nat === 1 ? 'Deux échecs' : roll.tot >= 10 ? 'Réussite' : 'Échec';
  return outcome + ' (' + plural(successes, 'réussite') + ', ' + plural(failures, 'échec') + ').';
}

function showDeathSavesAlreadyDecided() {
  if (!panel) buildPanel();
  setPanelOpen(true);
  const status = checkedDeathSaves('df') >= 3 ? 'Trois échecs déjà cochés.' : 'Trois réussites déjà cochées : le personnage est stable.';
  showResult('<div class="dz-lab">Jet contre la mort</div><p class="dz-hint">' + status + ' Décoche les cases pour recommencer.</p>');
}

function addDeathSaveButton() {
  const firstSuccessBox = deathSaveBox('ds', 1);
  if (!firstSuccessBox) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dz-rb noprint';
  button.textContent = 'Jet contre la mort';
  button.style.cssText = '--c:#c8402f;margin-left:auto;font-size:11px;padding:3px 8px';
  firstSuccessBox.parentNode.appendChild(button);
  button.addEventListener('click', event => {
    if (checkedDeathSaves('ds') >= 3 || checkedDeathSaves('df') >= 3) {
      showDeathSavesAlreadyDecided();
      return;
    }
    rollDice({ label: 'Jet contre la mort', f: 'd20', then: applyDeathSaveRoll }, event);
  });
}

function rollFromSheetKeyboard(event) {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches && event.target.matches('[data-dz]')) rollFromSheetElement(event.target, event);
}

function connectCharacterSheet() {
  if (!document.getElementById('sk_0')) return;
  markSheetRollables();
  document.addEventListener('click', event => {
    const element = event.target.closest('[data-dz]');
    if (element) rollFromSheetElement(element, event);
  });
  document.addEventListener('keydown', rollFromSheetKeyboard);
  addAttackButtons();
  addDeathSaveButton();
}

function initDiceRoller() {
  connectCharacterSheet();
  if (panel) return;
  const host = document.querySelector('[data-dz-host]');
  buildPanel(host || undefined);
}

window.Des = { roll: rollDice, parse: parseFormula, open: setPanelOpen, mount: host => { if (!panel) buildPanel(host); } };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDiceRoller);
else initDiceRoller();
})();
