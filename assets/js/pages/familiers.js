const ORIGIN_COLORS = { 'Appel de familier': '#2e9e5b', 'Pacte de la chaîne (Occultiste)': '#7a4fc4', 'Compagnon primordial (Rôdeur)': '#8e5a2b', 'Appel de destrier (Paladin)': '#b0306a', 'Monture': '#5d6b7a', 'Défenseur d’acier (Artificier)': '#2f6fd0', 'Serviteur homoncule (Artificier / Magicien)': '#d8791a', 'Autre animal (accord du MJ)': '#b8860b' };
const ORIGIN_ORDER = Object.keys(ORIGIN_COLORS);
const ORIGIN_SHORT_NAMES = { 'Appel de familier': 'Appel de familier', 'Pacte de la chaîne (Occultiste)': 'Pacte de la chaîne', 'Compagnon primordial (Rôdeur)': 'Compagnon primordial', 'Appel de destrier (Paladin)': 'Appel de destrier', 'Monture': 'Monture', 'Défenseur d’acier (Artificier)': 'Défenseur d’acier', 'Serviteur homoncule (Artificier / Magicien)': 'Homoncule', 'Autre animal (accord du MJ)': 'Autre animal' };
const STEED_ORIGIN = 'Appel de destrier (Paladin)';
const ABILITY_ABBREVIATIONS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
const CONDITIONS = ['À terre', 'Agrippé', 'Assourdi', 'Aveuglé', 'Charmé', 'Effrayé', 'Empoisonné', 'Entravé', 'Épuisement', 'Étourdi', 'Inconscient', 'Invisible', 'Neutralisé', 'Paralysé', 'Pétrifié'];
const STEED_SPELL_LEVELS = [2, 3, 4, 5, 6, 7, 8, 9];
const AT_ZERO_HIT_POINTS = {
  'Appel de familier': 'il disparaît (Appel de familier peut le rappeler)',
  'Pacte de la chaîne (Occultiste)': 'il disparaît (Appel de familier peut le rappeler)',
  [STEED_ORIGIN]: 'il disparaît (relancer le sort pour le rappeler)',
  'Compagnon primordial (Rôdeur)': 's’il meurt, une action de Magie et un emplacement de sort le ramènent à la vie dans l’heure qui suit',
  'Défenseur d’acier (Artificier)': 's’il est détruit, des outils de forgeron et un emplacement de sort le réparent dans l’heure qui suit'
};
const CLASS_BY_ORIGIN = { 'Compagnon primordial (Rôdeur)': 'Rôdeur', 'Défenseur d’acier (Artificier)': 'Artificier', 'Serviteur homoncule (Artificier / Magicien)': 'Artificier' };
const DEFAULT_COLOR = '#2a3170';
const MESSAGE_DURATION_MS = 4500;

let allCreatures = [];
const creaturesByName = new Map();
const state = { sel: new Map(), q: '', cls: '', sch: '', lvl: '', only: '', tab: 0, open: new Set() };

const notify = text => showMessage(text, MESSAGE_DURATION_MS);
const plural = count => count > 1 ? 's' : '';
const signed = number => (number < 0 ? '−' : '+') + Math.abs(number);
const abilityModifierText = score => {
  const modifier = Math.floor((score - 10) / 2);
  return (modifier >= 0 ? '+' : '−') + Math.abs(modifier);
};
const isChosen = creature => state.sel.has(creature.n);
const originColor = creature => ORIGIN_COLORS[creature.o] || DEFAULT_COLOR;
const creatureFamily = creature => creature.typ.split(' ')[0];
const freshTracking = () => ({ s: '', pv: '', tmp: '', max: '', nv: 2, et: [] });

function ownerStats() {
  const owner = Persos.current() || {};
  const sheetData = owner.fiche && owner.fiche.data || {};
  const derived = sheetData.derive || {};
  const totals = derived.tot || {};
  const level = derived.niv || Math.min(20, Math.max(1, parseInt(sheetData.niveau, 10) || 1));
  const modifier = key => Math.floor(((totals[key] || parseInt(sheetData['ab_' + key], 10) || 10) - 10) / 2);
  return {
    nom: owner.nom || '', fiche: !!owner.fiche, niv: level, cl: derived.cl || sheetData.classe || sheetData.clsel || '',
    pb: derived.pb || Math.ceil(level / 4) + 1, int: modifier('int'), sag: modifier('sag'),
    atk: typeof derived.atk === 'number' ? derived.atk : null, dd: typeof derived.dd === 'number' ? derived.dd : null
  };
}

const dependsOnOwner = creature => /Rôdeur|Artificier|niveau du sort/.test(creature.ca + ' ' + creature.pv);

function proficiencyFormula(match, sign, amount, doubled, owner) {
  const value = (sign === '−' ? -amount : +amount) + (doubled ? 2 : 1) * owner.pb;
  return sign ? signed(value) : String(value);
}

function substituteOwnerValues(text, creature, owner, spellLevel) {
  if (!text || !dependsOnOwner(creature)) return text;
  let result = text
    .replace(/(\d+) \+ mod\. de Sagesse du Rôdeur/g, (match, amount) => String(+amount + owner.sag))
    .replace(/mod\. de Sagesse du Rôdeur/g, String(owner.sag))
    .replace(/mod\. d’Intelligence/g, String(owner.int))
    .replace(/niveau (de Rôdeur|d’Artificier)/g, String(owner.niv))
    .replace(/niveau du sort/g, String(spellLevel))
    .replace(/(?<![\w])([+−]?)(\d+) \+ (2×)?BM\b/g, (match, sign, amount, doubled) => proficiencyFormula(match, sign, amount, doubled, owner))
    .replace(/\bBM\b/g, String(owner.pb));
  if (owner.atk != null) result = result.replace(/bonus d’attaque de sort (du Rôdeur|de l’Artificier|du lanceur)/g, signed(owner.atk));
  if (owner.dd != null) result = result.replace(/DD de sauvegarde des sorts du Rôdeur|votre DD de sort/g, 'DD ' + owner.dd);
  return result;
}

function evaluateArithmetic(expression) {
  const normalized = expression.replace(/×/g, '*').replace(/−/g, '-');
  return /^[\d\s+*-]+$/.test(normalized) ? Function('return ' + normalized)() : null;
}

function creatureStats(creature, tracking) {
  const owner = ownerStats();
  const spellLevel = Math.min(9, Math.max(2, +(tracking && tracking.nv) || 2));
  const isDependent = dependsOnOwner(creature);
  const numericValue = text => isDependent ? evaluateArithmetic(substituteOwnerValues(text, creature, owner, spellLevel)) : parseInt(text, 10) || null;
  return { P: owner, nv: spellLevel, d: isDependent, ca: numericValue(creature.ca), max: numericValue(creature.pv) };
}

function calculationNote(creature, stats) {
  const owner = stats.P;
  const ownerClass = CLASS_BY_ORIGIN[creature.o];
  if (!owner.fiche) return 'Remplis la fiche du personnage : ces valeurs en dépendent (niveau 1 et caractéristiques à 10 en attendant).';
  let note = 'Calculé d’après la fiche de ' + owner.nom + ' : niveau ' + owner.niv + (ownerClass ? ' de ' + ownerClass : '') + ', BM ' + signed(owner.pb);
  if (/Sagesse/.test(creature.ca)) note += ', Sagesse ' + signed(owner.sag);
  if (/Intelligence/.test(creature.pv)) note += ', Intelligence ' + signed(owner.int);
  if (creature.o === STEED_ORIGIN) note += ', sort de niveau ' + stats.nv;
  if (owner.atk != null) note += ', attaque de sort ' + signed(owner.atk);
  note += '.';
  if (ownerClass && owner.cl && owner.cl !== ownerClass) note += ' La fiche indique la classe ' + owner.cl + ' : le niveau total est utilisé.';
  if (owner.atk == null) note += ' Ouvre la fiche une fois pour obtenir le bonus d’attaque de sort.';
  return note;
}

function currentMaximum(tracking, stats) {
  const maximum = parseInt(tracking.max, 10);
  return isNaN(maximum) ? stats.max : maximum;
}

function currentHitPoints(tracking, maximum) {
  const hitPoints = parseInt(tracking.pv, 10);
  return isNaN(hitPoints) ? (maximum || 0) : hitPoints;
}

function hitPointBar(hitPoints, maximum) {
  const percent = maximum ? Math.max(0, Math.min(100, hitPoints / maximum * 100)) : 100;
  const color = percent > 50 ? '#2e9e5b' : percent > 25 ? '#d8791a' : '#c8402f';
  return { w: percent + '%', c: color };
}

function steedLevelSelectHtml(creature, stats) {
  if (creature.o !== STEED_ORIGIN) return '';
  return `<label>Niveau du sort<select data-f="nv" data-i="${creature.i}">${STEED_SPELL_LEVELS.map(level => `<option${level === stats.nv ? ' selected' : ''}>${level}</option>`).join('')}</select></label>`;
}

function trackerFieldsHtml(creature, tracking, stats, hitPoints) {
  const index = creature.i;
  return `<div class="trk1">
   <label>Surnom<input type="text" data-f="s" data-i="${index}" value="${escapeHtml(tracking.s || '')}" placeholder="Nom du familier" size="14"></label>
   ${steedLevelSelectHtml(creature, stats)}
   <div class="big">CA<span>${stats.ca ?? '—'}</span></div>
   <label>PV<input class="n" type="number" inputmode="numeric" data-f="pv" data-i="${index}" value="${hitPoints}"></label><span class="sl">/</span>
   <label>Max<input class="n" type="number" inputmode="numeric" data-f="max" data-i="${index}" value="${escapeHtml(tracking.max || '')}" placeholder="${stats.max ?? ''}" title="Vide : la valeur du profil${stats.d ? ' (calculée)' : ''}"></label>
   <label>Temp.<input class="n tm" type="number" inputmode="numeric" data-f="tmp" data-i="${index}" value="${escapeHtml(tracking.tmp || '')}"></label>
  </div>`;
}

function trackerButtonsHtml(creature, tracking) {
  const index = creature.i;
  const conditions = tracking.et || [];
  const conditionOptions = CONDITIONS.filter(condition => !conditions.includes(condition)).map(condition => `<option>${condition}</option>`).join('');
  return `<div class="trk2 noprint"><input class="amt" type="number" inputmode="numeric" min="0" placeholder="PV" aria-label="Montant de PV">
   <button class="b" style="--c:#c8402f" data-act="hp" data-k="dmg" data-i="${index}">Dégâts</button><button class="b" style="--c:#2e9e5b" data-act="hp" data-k="heal" data-i="${index}">Soins</button><button class="b" style="--c:#12968f" data-act="hp" data-k="tmp" data-i="${index}">PV temp.</button><button class="b" data-act="hp" data-k="full" data-i="${index}" title="PV au maximum, sans PV temporaires ni états">Repos long</button>
   <select data-f="et" data-i="${index}" aria-label="Ajouter un état"><option value="">+ État…</option>${conditionOptions}</select>
   <span class="sp1"></span><button class="b rm" data-act="rm" data-i="${index}">Retirer</button></div>`;
}

function conditionChipsHtml(creature, tracking) {
  return `<div class="ets">${(tracking.et || []).map(condition => `<button class="chip" data-act="unet" data-i="${creature.i}" data-e="${escapeHtml(condition)}" title="Retirer l’état">${escapeHtml(condition)} ✕</button>`).join('')}</div>`;
}

function trackerHtml(creature, tracking, stats) {
  const maximum = currentMaximum(tracking, stats);
  const hitPoints = currentHitPoints(tracking, maximum);
  const bar = hitPointBar(hitPoints, maximum);
  return `<div class="trk" data-i="${creature.i}">
  ${trackerFieldsHtml(creature, tracking, stats, hitPoints)}
  <div class="hp"><i style="width:${bar.w};background:${bar.c}"></i></div>
  ${trackerButtonsHtml(creature, tracking)}
  ${conditionChipsHtml(creature, tracking)}
  </div>`;
}

function indexCreatures(creatures) {
  allCreatures = creatures;
  allCreatures.forEach((creature, index) => {
    creature.i = index;
    creature.idx = normalizeText(creature.n + ' ' + creature.en + ' ' + creature.typ);
    [creature.n, creature.en].forEach(name => {
      if (name && !creaturesByName.has(normalizeText(name))) creaturesByName.set(normalizeText(name), creature);
    });
  });
}

function optionsHtml(firstLabel, values) {
  return `<option value="">${firstLabel}</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function setupCatalog(creatures) {
  indexCreatures(creatures);
  $('#fc').innerHTML = optionsHtml('Toutes', ORIGIN_ORDER.filter(origin => allCreatures.some(creature => creature.o === origin)));
  $('#fs').innerHTML = optionsHtml('Tous', [...new Set(allCreatures.map(creatureFamily))]);
  $('#fl').innerHTML = optionsHtml('Toutes', [...new Set(allCreatures.map(creature => creature.tail))]);
}

function statValueHtml(text, computedValue, stats) {
  return stats.d && computedValue != null ? `${computedValue} <small>(${escapeHtml(text)})</small>` : escapeHtml(text);
}

function statBlockMetaHtml(creature, stats) {
  return `<div class="meta" style="grid-template-columns:1fr 1fr 1fr"><div><dt>Classe d’armure</dt><dd>${statValueHtml(creature.ca, stats.ca, stats)}</dd></div><div><dt>Points de vie</dt><dd>${statValueHtml(creature.pv, stats.max, stats)}</dd></div><div><dt>Vitesse</dt><dd>${escapeHtml(creature.vit)}</dd></div>${creature.init ? `<div><dt>Initiative</dt><dd>${escapeHtml(creature.init)}</dd></div>` : ''}</div>`;
}

function abilityScoresHtml(creature) {
  return `<div class="ab6">${creature.car.map((score, index) => `<div><b>${ABILITY_ABBREVIATIONS[index]}</b><span>${score} (${abilityModifierText(score)})</span></div>`).join('')}</div>`;
}

function featureListHtml(features, substitute, heading) {
  if (!features.length) return '';
  const title = heading ? `<b style="color:var(--c)">${heading}</b>` : '';
  return '<div class="desc">' + title + features.map(feature => `<p><b><i>${escapeHtml(feature.n)}.</i></b> ${escapeHtml(substitute(feature.d))}</p>`).join('') + '</div>';
}

function sourceNoteHtml(creature) {
  const edition = creature.ed === '2014' ? ' · fiche 2014 (pas de version 2024 trouvée)' : '';
  const reliability = (creature.r_ || creature.v_) ? ' · texte reconstitué à partir d’un résumé : à vérifier dans le livre' : ' · reformulé : le livre fait foi';
  return `<div class="srcn">${escapeHtml(creature.note)} · Source : ${escapeHtml(creature.src || '')}${edition}${reliability}</div>`;
}

function statBlockHtml(creature, withTracker) {
  const tracking = state.sel.get(creature.n) || {};
  const stats = creatureStats(creature, tracking);
  const substitute = text => substituteOwnerValues(text, creature, stats.P, stats.nv);
  const line = (label, value) => value ? `<div><b>${label}</b> ${escapeHtml(substitute(value))}</div>` : '';
  const nickname = withTracker && tracking.s ? tracking.s + ' — ' : '';
  return `<article class="sp" style="--c:${originColor(creature)}"><header><div class="ti"><h3>${escapeHtml(nickname)}${escapeHtml(creature.n)}${VO.btn('familiers', creature.n, creature.n)}</h3><div class="sub">${escapeHtml(creature.tail)} · ${escapeHtml(creature.typ)} · ${escapeHtml(creature.en)}</div></div><span class="lvb" title="Origine">${escapeHtml(ORIGIN_SHORT_NAMES[creature.o] || '')}</span></header>
  <div class="body stat">${withTracker ? trackerHtml(creature, tracking, stats) : ''}${statBlockMetaHtml(creature, stats)}
  ${stats.d ? `<div class="calc">${escapeHtml(calculationNote(creature, stats))}</div>` : ''}
  ${abilityScoresHtml(creature)}
  ${line('Jets de sauvegarde', creature.sauv)}${line('Compétences', creature.comp)}${line('Résistances / immunités', creature.res)}${line('Sens', creature.sens)}${line('Langues', creature.langues)}${line('Dangerosité', creature.dd)}
  ${featureListHtml(creature.traits, substitute)}
  ${featureListHtml(creature.actions, substitute, 'Actions')}
  ${sourceNoteHtml(creature)}
  </div></article>`;
}

function filteredCreatures() {
  const searchedText = normalizeText(state.q);
  return allCreatures.filter(creature => (!searchedText || creature.idx.includes(searchedText))
    && (!state.cls || creature.o === state.cls)
    && (!state.sch || creatureFamily(creature) === state.sch)
    && (!state.lvl || creature.tail === state.lvl)
    && (!state.only || isChosen(creature)));
}

function listRowHtml(creature) {
  const chosen = isChosen(creature);
  const isOpen = state.open.has(creature.n);
  return `<div class="item" style="--c:${originColor(creature)}"><div class="row"><div class="rmain"><div class="rt">${escapeHtml(creature.n)}${VO.btn('familiers', creature.n, creature.n)}</div><div class="rs">${escapeHtml(creature.tail)} · ${escapeHtml(creature.typ)} · CA ${escapeHtml(creature.ca)} · PV ${escapeHtml(creature.pv)} · ${escapeHtml(ORIGIN_SHORT_NAMES[creature.o] || '')}</div></div>
    <div class="racts"><button class="b" style="--c:${DEFAULT_COLOR}" data-act="det" data-i="${creature.i}" aria-expanded="${isOpen}">${isOpen ? 'Masquer' : 'Détails'}</button><button class="b add${chosen ? ' on' : ''}" data-act="tog" data-i="${creature.i}" aria-pressed="${chosen}">${chosen ? 'Choisi ✓' : 'Choisir'}</button></div></div>${isOpen ? `<div class="det">${statBlockHtml(creature, false)}</div>` : ''}</div>`;
}

function renderList() {
  const shown = filteredCreatures();
  const chosenCount = state.sel.size;
  $('#cnt').textContent = shown.length + ' créature' + plural(shown.length) + ' affichée' + plural(shown.length) + ' · ' + chosenCount + ' choisie' + plural(chosenCount);
  $('#list').innerHTML = shown.length ? shown.map(listRowHtml).join('') : '<div class="empty-msg">Aucune créature ne correspond à ces filtres.</div>';
}

function chosenCreaturesByOrigin() {
  const byOrigin = ORIGIN_ORDER.map(() => []);
  allCreatures.forEach(creature => { if (isChosen(creature)) byOrigin[ORIGIN_ORDER.indexOf(creature.o)].push(creature); });
  return byOrigin;
}

function bookTabsHtml(byOrigin) {
  return ORIGIN_ORDER.map((origin, tab) => `<button class="tab" role="tab" style="--c:${ORIGIN_COLORS[origin]}" data-act="tab" data-l="${tab}" aria-selected="${tab === state.tab}">${escapeHtml(ORIGIN_SHORT_NAMES[origin])}<span>${byOrigin[tab].length}</span></button>`).join('');
}

function bookSectionsHtml(byOrigin) {
  return ORIGIN_ORDER.map((origin, tab) => {
    const creatures = byOrigin[tab];
    const content = creatures.length ? `<div class="cards">${creatures.map(creature => statBlockHtml(creature, true)).join('')}</div>` : '<div class="none">Aucune créature dans cette catégorie.</div>';
    return `<section class="lvl${tab === state.tab ? ' on' : ''}${creatures.length ? '' : ' empty'}" style="--c:${ORIGIN_COLORS[origin]}"><h2>${escapeHtml(origin)} <span>(${creatures.length})</span></h2>${content}</section>`;
  }).join('');
}

function bookSummary(chosenCount) {
  if (!chosenCount) return 'Aucune créature choisie';
  const suffix = plural(chosenCount);
  return chosenCount + ' familier' + suffix + ', compagnon' + suffix + ' ou monture' + suffix + ' : PV et états suivis en combat, enregistrés avec le personnage';
}

function renderBook() {
  const byOrigin = chosenCreaturesByOrigin();
  $('#tabs').innerHTML = bookTabsHtml(byOrigin);
  $('#levels').innerHTML = bookSectionsHtml(byOrigin);
  $('#sum').textContent = bookSummary(state.sel.size);
  $('#bBook').textContent = 'Mes familiers (' + state.sel.size + ')';
}

function renderAll() {
  renderList();
  renderBook();
  Persos.save();
}

function savedCreature(creature) {
  const tracking = state.sel.get(creature.n);
  const stats = creatureStats(creature, tracking);
  return { n: creature.n, surnom: tracking.s || '', pv: tracking.pv || '', tmp: tracking.tmp || '', max: tracking.max || '', nv: stats.nv, et: tracking.et || [], ca: stats.ca, pvmax: currentMaximum(tracking, stats), init: creature.init || '' };
}

function collectFamiliars() {
  return {
    version: 1, type: 'familiers-dnd-5e', data: {
      titre: $('#titre').value,
      familiers: allCreatures.filter(isChosen).map(savedCreature),
      filtres: { q: state.q, cls: state.cls, sch: state.sch, lvl: state.lvl, only: state.only }
    }
  };
}

function syncFilterInputs() {
  $('#fq').value = state.q;
  $('#fc').value = state.cls;
  $('#fs').value = state.sch;
  $('#fl').value = state.lvl;
  $('#fo').value = state.only;
}

function trackingFromSaved(entry) {
  if (!entry || typeof entry !== 'object') return freshTracking();
  return Object.assign(freshTracking(), { s: String(entry.surnom || ''), pv: String(entry.pv ?? ''), tmp: String(entry.tmp || ''), max: String(entry.max || ''), nv: +entry.nv || 2, et: Array.isArray(entry.et) ? entry.et.map(String) : [] });
}

function restoreChosenCreatures(savedEntries) {
  state.sel.clear();
  let unknownCount = 0;
  savedEntries.forEach(entry => {
    const name = typeof entry === 'string' ? entry : entry && entry.n;
    const creature = creaturesByName.get(normalizeText(String(name)));
    if (creature) state.sel.set(creature.n, trackingFromSaved(entry));
    else unknownCount++;
  });
  return unknownCount;
}

function restoreFilters(savedFilters) {
  state.q = savedFilters.q || '';
  state.cls = savedFilters.cls || '';
  state.sch = savedFilters.sch || '';
  state.lvl = savedFilters.lvl || '';
  state.only = savedFilters.only ? '1' : '';
}

function applyFamiliars(saved) {
  const data = saved && saved.data;
  if (!data || !Array.isArray(data.familiers)) throw new Error('format');
  const unknownCount = restoreChosenCreatures(data.familiers);
  restoreFilters(data.filtres || {});
  syncFilterInputs();
  renderAll();
  return unknownCount;
}

function clearFilters() {
  state.q = state.cls = state.sch = state.lvl = state.only = '';
}

function startBlank() {
  state.sel.clear();
  clearFilters();
  syncFilterInputs();
  renderAll();
}

function showCharacterFamiliars(saved) {
  state.open.clear();
  state.tab = 0;
  if (saved) applyFamiliars(saved);
  else startBlank();
}

function toggleChosen(creature) {
  if (isChosen(creature)) state.sel.delete(creature.n);
  else state.sel.set(creature.n, freshTracking());
  renderAll();
}

function removeCondition(creature, condition) {
  const tracking = state.sel.get(creature.n);
  tracking.et = (tracking.et || []).filter(existing => existing !== condition);
  renderBook();
  Persos.save();
}

function toggleDetails(creature) {
  if (state.open.has(creature.n)) state.open.delete(creature.n);
  else state.open.add(creature.n);
  renderList();
}

function enteredAmount(button) {
  return Math.max(0, parseInt(button.closest('.trk').querySelector('.amt').value, 10) || 0);
}

const CLICK_ACTIONS = {
  tog: toggleChosen,
  hp: (creature, button) => changeHitPoints(creature, button.dataset.k, enteredAmount(button)),
  unet: (creature, button) => removeCondition(creature, button.dataset.e),
  det: toggleDetails,
  rm: creature => { state.sel.delete(creature.n); renderAll(); },
  tab: (creature, button) => { state.tab = +button.dataset.l; renderBook(); },
  mode: (creature, button) => setMode(button.dataset.m)
};

function handleActionClick(event) {
  const button = event.target.closest('[data-act]');
  if (!button) return;
  const action = CLICK_ACTIONS[button.dataset.act];
  if (action) action(allCreatures[+button.dataset.i], button);
}

function trackedFieldTarget(event, acceptsField) {
  const field = event.target.dataset && event.target.dataset.f;
  if (!field || !acceptsField(field)) return null;
  const creature = allCreatures[+event.target.dataset.i];
  const tracking = state.sel.get(creature.n);
  return tracking ? { field, creature, tracking } : null;
}

const isSelectField = field => field === 'et' || field === 'nv';

function handleTrackerTyping(event) {
  const target = trackedFieldTarget(event, field => !isSelectField(field));
  if (!target) return;
  target.tracking[target.field] = event.target.value;
  Persos.save();
  if (target.field !== 's') refreshHitPointBar(target.creature);
}

function handleTrackerSelect(event) {
  const target = trackedFieldTarget(event, isSelectField);
  if (!target) return;
  const { field, tracking } = target;
  const value = event.target.value;
  if (field === 'nv') tracking.nv = +value;
  else if (value && !(tracking.et = tracking.et || []).includes(value)) tracking.et.push(value);
  renderBook();
  Persos.save();
}

function damageOnEnter(event) {
  if (event.key !== 'Enter' || !event.target.classList.contains('amt')) return;
  const damageButton = event.target.parentNode.querySelector('[data-k=dmg]');
  if (damageButton) damageButton.click();
}

function refreshHitPointBar(creature) {
  const barFill = document.querySelector(`.trk[data-i="${creature.i}"] .hp i`);
  if (!barFill) return;
  const tracking = state.sel.get(creature.n);
  const maximum = currentMaximum(tracking, creatureStats(creature, tracking));
  const bar = hitPointBar(currentHitPoints(tracking, maximum), maximum);
  barFill.style.width = bar.w;
  barFill.style.background = bar.c;
}

function applyDamage(points, amount, creature, name) {
  const absorbed = Math.min(points.tmp, amount);
  points.tmp -= absorbed;
  const hadHitPoints = points.pv > 0;
  points.pv = Math.max(0, points.pv - (amount - absorbed));
  if (hadHitPoints && points.pv === 0) notify(name + ' tombe à 0 PV : ' + (AT_ZERO_HIT_POINTS[creature.o] || 'hors de combat'));
}

function applyTemporaryHitPoints(points, amount) {
  if (amount <= points.tmp) notify('Les PV temporaires ne se cumulent pas : on garde le plus élevé');
  points.tmp = Math.max(points.tmp, amount);
}

function applyLongRest(points, tracking, name) {
  points.pv = points.max || points.pv;
  points.tmp = 0;
  tracking.et = [];
  notify(name + ' : PV au maximum');
}

function changeHitPoints(creature, kind, amount) {
  const tracking = state.sel.get(creature.n);
  if (!tracking) return;
  const maximum = currentMaximum(tracking, creatureStats(creature, tracking));
  const name = tracking.s || creature.n;
  const points = { pv: currentHitPoints(tracking, maximum), tmp: parseInt(tracking.tmp, 10) || 0, max: maximum };
  if (kind !== 'full' && !amount) {
    notify('Saisis un nombre de PV');
    return;
  }
  if (kind === 'dmg') applyDamage(points, amount, creature, name);
  else if (kind === 'heal') points.pv = maximum ? Math.min(maximum, points.pv + amount) : points.pv + amount;
  else if (kind === 'tmp') applyTemporaryHitPoints(points, amount);
  else applyLongRest(points, tracking, name);
  tracking.pv = String(points.pv);
  tracking.tmp = points.tmp ? String(points.tmp) : '';
  renderBook();
  Persos.save();
}

const hasChosenOfOrigin = tab => allCreatures.some(creature => creature.o === ORIGIN_ORDER[tab] && isChosen(creature));

function showFirstFilledTab() {
  if (hasChosenOfOrigin(state.tab)) return;
  const firstFilledTab = ORIGIN_ORDER.findIndex((origin, tab) => hasChosenOfOrigin(tab));
  if (firstFilledTab < 0) return;
  state.tab = firstFilledTab;
  renderBook();
}

function setMode(mode) {
  document.body.dataset.mode = mode;
  document.querySelectorAll('[data-act=mode]').forEach(button => button.setAttribute('aria-pressed', button.dataset.m === mode));
  if (mode === 'book') showFirstFilledTab();
  scrollTo(0, 0);
}

function onFilterChange(key) {
  return event => {
    state[key] = event.target.value;
    renderList();
    Persos.save();
  };
}

function resetFilters() {
  clearFilters();
  syncFilterInputs();
  renderList();
  Persos.save();
}

function saveToFile() {
  const name = fileSafeName($('#titre').value || Persos.current().nom || 'familiers');
  downloadJsonFile(`familiers_${name}.json`, collectFamiliars());
  notify('Familiers enregistrés dans un fichier .json');
}

function loadedMessage(unknownCount) {
  const ignored = unknownCount ? ' (' + unknownCount + ' introuvable' + plural(unknownCount) + ' ignoré' + plural(unknownCount) + ')' : '';
  return 'Familiers chargés : ' + state.sel.size + ignored;
}

function loadFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      notify(loadedMessage(applyFamiliars(JSON.parse(reader.result))));
    } catch (error) {
      notify('Fichier invalide : choisis un .json créé par cette page');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function printFamiliars() {
  if (!state.sel.size) {
    notify('Choisis d’abord des familiers');
    return;
  }
  window.print();
}

function clearFamiliars() {
  if (!state.sel.size) return;
  if (!confirm('Retirer tous les familiers de « ' + Persos.current().nom + ' » ? Pense à enregistrer un .json avant.')) return;
  state.sel.clear();
  renderAll();
  notify('Familiers retirés');
}

function showLoadingError() {
  $('#cnt').textContent = '';
  $('#list').innerHTML = '<div class="empty-msg">Impossible de charger la liste (familiers.json). Vérifie ta connexion, puis recharge la page. En local, ouvre le site via un serveur web (pas en double-cliquant sur le fichier).</div>';
}

async function startPage() {
  let creatures;
  try {
    creatures = await fetchJson('assets/json/vf/familiers.json');
  } catch (error) {
    showLoadingError();
    return;
  }
  setupCatalog(creatures);
  Persos.init({ part: 'familiers', mount: $('#persos'), title: $('#titre'), collect: collectFamiliars, apply: showCharacterFamiliars, msg: notify });
}

document.addEventListener('click', handleActionClick);
document.addEventListener('input', handleTrackerTyping);
document.addEventListener('change', handleTrackerSelect);
document.addEventListener('keydown', damageOnEnter);
$('#fq').addEventListener('input', onFilterChange('q'));
[['#fc', 'cls'], ['#fs', 'sch'], ['#fl', 'lvl'], ['#fo', 'only']].forEach(([selector, key]) => $(selector).addEventListener('change', onFilterChange(key)));
$('#titre').addEventListener('input', () => Persos.save());
$('#bReset').onclick = resetFilters;
$('#bSave').onclick = saveToFile;
$('#bLoad').onclick = () => $('#file').click();
$('#file').onchange = loadFromFile;
$('#bPrint').onclick = printFamiliars;
$('#bClear').onclick = clearFamiliars;
startPage();
