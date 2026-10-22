const COLOR_BY_CREATURE_TYPE = {
  'aberration': '#7a4fc4', 'bête': '#2e9e5b', 'céleste': '#c99a06', 'artificiel': '#5d6b7a', 'dragon': '#c8402f', 'élémentaire': '#d8791a', 'fée': '#12968f',
  'fiélon': '#8b1e3f', 'géant': '#8e5a2b', 'humanoïde': '#2f6fd0', 'créature monstrueuse': '#9c3d8f', 'vase': '#6b8e23', 'plante': '#3c7d3c', 'mort-vivant': '#4a4a4a', 'nuée': '#6d6875'
};
const ABILITY_LABELS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
const SIZES = ['Très petite', 'Petite', 'Moyenne', 'Moyenne ou petite', 'Grande', 'Très grande', 'Gigantesque'];
const ACTION_GROUPS = ['traits', 'actions', 'bonus', 'reac', 'leg'];
const FRACTIONAL_CHALLENGE_LABELS = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' };
const FILTERS_STORAGE_KEY = 'dnd_bestiaire_filtres_v1';
const MESSAGE_DURATION_MS = 4500;
const DEFAULT_FILTERS = { q: '', t: '', s: '', v: '', min: '', max: '', x: '', o: 'nom' };
const FILTER_FIELDS = [['#fq', 'q'], ['#ft', 't'], ['#fs', 's'], ['#fv', 'v'], ['#fmin', 'min'], ['#fmax', 'max'], ['#fx', 'x'], ['#fo', 'o']];

let bestiary = [];
const filters = Object.assign({}, DEFAULT_FILTERS);
const openMonsterIndexes = new Set();

const signed = number => (number >= 0 ? '+' : '−') + Math.abs(number);
const abilityModifier = score => Math.floor((score - 10) / 2);
const baseCreatureType = monster => monster.typ.startsWith('nuée') ? 'nuée' : monster.typ.replace(/ \(.*$/, '');
const creatureColor = monster => COLOR_BY_CREATURE_TYPE[baseCreatureType(monster)] || '#2a3170';
const challengeLabel = challenge => FRACTIONAL_CHALLENGE_LABELS[challenge] || String(challenge);
const capitalized = text => text[0].toUpperCase() + text.slice(1);

function initiativeText(monster) {
  const bonus = typeof monster.init === 'number' ? monster.init : abilityModifier(monster.car[1]);
  return signed(bonus) + ' (' + (10 + bonus) + ')';
}

function castsSpells(monster) {
  return ACTION_GROUPS.flatMap(group => monster[group] || []).some(action => /^Incantation/.test(action.n));
}

function optionsHtml(firstLabel, values, label = value => value) {
  return `<option value="">${firstLabel}</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(label(value))}</option>`).join('');
}

function indexBestiary(monsters) {
  bestiary = monsters;
  bestiary.forEach((monster, index) => {
    monster.i = index;
    monster.idx = normalizeText(monster.n + ' ' + monster.en + ' ' + monster.typ);
    monster.sort = castsSpells(monster);
  });
}

function fillFilterOptions() {
  const types = [...new Set(bestiary.map(baseCreatureType))].sort((first, second) => first.localeCompare(second, 'fr'));
  $('#ft').innerHTML = optionsHtml('Tous', types, capitalized);
  $('#fs').innerHTML = optionsHtml('Toutes', SIZES.filter(size => bestiary.some(monster => monster.tail === size)));
  const challenges = [...new Set(bestiary.map(monster => monster.fpn))].sort((first, second) => first - second);
  $('#fmin').innerHTML = optionsHtml('—', challenges, challengeLabel);
  $('#fmax').innerHTML = optionsHtml('—', challenges, challengeLabel);
}

function actionSectionHtml(title, actions, introduction) {
  if (!actions || !actions.length) return '';
  const intro = introduction ? `<p class="intro">${escapeHtml(introduction)}</p>` : '';
  return `<div class="sec"><h4>${title}</h4>${intro}${actions.map(action => `<p><b><i>${escapeHtml(action.n)}.</i></b> ${escapeHtml(action.d).replace(/\n/g, '<br>')}</p>`).join('')}</div>`;
}

const statLine = (label, value) => value ? `<div><b>${label}</b> ${escapeHtml(value)}</div>` : '';

function statBlockHtml(monster) {
  const source = monster.v === '2014' ? 'SRD 5.1 (règles 2014) : ce monstre n’a pas de version 2024 dans le SRD 5.2' : 'SRD 5.2 (règles 2024)';
  return `<article class="sp" style="--c:${creatureColor(monster)}"><header><div class="ti"><h3>${escapeHtml(monster.n)}</h3><div class="sub">${escapeHtml(capitalized(monster.typ))} de taille ${escapeHtml(monster.tail.toLowerCase())}, ${escapeHtml(monster.al)} · ${escapeHtml(monster.en)}</div></div></header>
  <div class="body"><dl class="meta"><div><dt>Classe d’armure</dt><dd>${escapeHtml(monster.ca)}</dd></div><div><dt>Points de vie</dt><dd>${escapeHtml(monster.pv)}</dd></div><div><dt>Vitesse</dt><dd>${escapeHtml(monster.vit)}</dd></div><div><dt>Initiative</dt><dd>${initiativeText(monster)}</dd></div><div><dt>Facteur de puissance</dt><dd>${escapeHtml(monster.fp)} · ${escapeHtml(monster.px).replace(/^([\d  ]+)/, '$1 PX')} · BM ${escapeHtml(monster.bm)}</dd></div></dl>
  <div class="ab6">${monster.car.map((score, index) => `<div><b>${ABILITY_LABELS[index]}</b><span>${score} (${signed(abilityModifier(score))})</span></div>`).join('')}</div>
  <div class="lines">${statLine('Jets de sauvegarde', monster.sauv)}${statLine('Compétences', monster.comp)}${statLine('Vulnérabilités', monster.vuln)}${statLine('Résistances', monster.res)}${statLine('Immunités aux dégâts', monster.imm)}${statLine('Immunités aux états', monster.cimm)}${statLine('Équipement', monster.equip)}${statLine('Sens', monster.sens)}${statLine('Langues', monster.langues)}</div>
  ${actionSectionHtml('Traits', monster.traits)}${actionSectionHtml('Actions', monster.actions)}${actionSectionHtml('Actions bonus', monster.bonus)}${actionSectionHtml('Réactions', monster.reac)}${actionSectionHtml('Actions légendaires', monster.leg, monster.legi)}
  <div class="srcn">Source : ${source}, Wizards of the Coast, licence CC BY 4.0. Traduction française du site : en cas de doute, le livre fait foi.</div>
  </div></article>`;
}

function matchesSpecialFilter(monster) {
  switch (filters.x) {
    case '': return true;
    case 'leg': return !!monster.leg;
    case 'sort': return monster.sort;
    case 'vol': return /vol /.test(monster.vit);
    case 'nage': return /nage /.test(monster.vit);
    default: return false;
  }
}

function filteredMonsters() {
  const searchedText = normalizeText(filters.q);
  const minimumChallenge = filters.min === '' ? -1 : +filters.min;
  const maximumChallenge = filters.max === '' ? 99 : +filters.max;
  const monsters = bestiary.filter(monster => (!searchedText || monster.idx.includes(searchedText))
    && (!filters.t || baseCreatureType(monster) === filters.t) && (!filters.s || monster.tail === filters.s) && (!filters.v || monster.v === filters.v)
    && monster.fpn >= minimumChallenge && monster.fpn <= maximumChallenge && matchesSpecialFilter(monster));
  if (filters.o === 'fp') monsters.sort((first, second) => first.fpn - second.fpn || first.i - second.i);
  else if (filters.o === 'fpd') monsters.sort((first, second) => second.fpn - first.fpn || first.i - second.i);
  return monsters;
}

function monsterRowHtml(monster) {
  const isOpen = openMonsterIndexes.has(monster.i);
  const badges = (monster.v === '2014' ? '<span class="pill" title="Pas de version 2024 dans le SRD">2014</span>' : '') + (monster.leg ? '<span class="pill leg">légendaire</span>' : '');
  return `<div class="item" style="--c:${creatureColor(monster)}"><div class="row" data-act="det" data-i="${monster.i}" role="button" tabindex="0" aria-expanded="${isOpen}"><div class="rmain"><div class="rt">${escapeHtml(monster.n)}<span class="en">${escapeHtml(monster.en)}</span>${badges}${VO.btn('monstres', monster.n, monster.n)}</div><div class="rs">${escapeHtml(monster.tail)} · ${escapeHtml(monster.typ)} · CA ${escapeHtml(monster.ca)} · PV ${escapeHtml(monster.pv.split(' ')[0])}</div></div>
    <div class="fpb">FP ${escapeHtml(monster.fp)}<small>${escapeHtml(monster.px.split(',')[0])} PX</small></div></div>${isOpen ? `<div class="det">${statBlockHtml(monster)}</div>` : ''}</div>`;
}

function renderMonsterList() {
  const monsters = filteredMonsters();
  $('#cnt').textContent = monsters.length + ' monstre' + (monsters.length > 1 ? 's' : '') + ' sur ' + bestiary.length;
  $('#list').innerHTML = monsters.length ? monsters.map(monsterRowHtml).join('') : '<div class="empty-msg">Aucun monstre ne correspond à ces filtres.</div>';
}

function saveFilters() {
  try { localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters)); } catch (error) {}
}

function restoreFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTERS_STORAGE_KEY) || '{}');
    Object.keys(DEFAULT_FILTERS).forEach(key => { if (typeof saved[key] === 'string') filters[key] = saved[key]; });
  } catch (error) {}
}

function syncFilterInputs() {
  FILTER_FIELDS.forEach(([selector, key]) => {
    const input = $(selector);
    input.value = filters[key];
    if (input.value !== filters[key]) filters[key] = input.value;
  });
}

function toggleMonsterDetails(monsterIndex) {
  if (openMonsterIndexes.has(monsterIndex)) openMonsterIndexes.delete(monsterIndex);
  else openMonsterIndexes.add(monsterIndex);
  renderMonsterList();
}

function changeFilter(key, value) {
  filters[key] = value;
  renderMonsterList();
  saveFilters();
}

function resetFilters() {
  Object.assign(filters, DEFAULT_FILTERS);
  syncFilterInputs();
  renderMonsterList();
  saveFilters();
}

function openRandomMonster() {
  const monsters = filteredMonsters();
  if (!monsters.length) {
    showMessage('Aucun monstre ne correspond aux filtres', MESSAGE_DURATION_MS);
    return;
  }
  const monster = monsters[Math.floor(Math.random() * monsters.length)];
  openMonsterIndexes.add(monster.i);
  renderMonsterList();
  const row = document.querySelector(`[data-act=det][data-i="${monster.i}"]`);
  if (row) row.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showMessage('Monstre tiré : ' + monster.n, MESSAGE_DURATION_MS);
}

function showLoadingError() {
  $('#cnt').textContent = '';
  $('#list').innerHTML = '<div class="empty-msg">Impossible de charger le bestiaire (bestiaire.json). Vérifie ta connexion, puis recharge la page. En local, ouvre le site via un serveur web (pas en double-cliquant sur le fichier).</div>';
}

async function loadBestiary() {
  let monsters;
  try {
    monsters = await fetchJson('assets/json/vf/bestiaire.json?v=20261019a');
  } catch (error) {
    showLoadingError();
    return;
  }
  indexBestiary(monsters);
  fillFilterOptions();
  restoreFilters();
  syncFilterInputs();
  renderMonsterList();
}

document.addEventListener('click', event => {
  const row = event.target.closest('[data-act=det]');
  if (row) toggleMonsterDetails(+row.dataset.i);
});
document.addEventListener('keydown', event => {
  const row = event.target.closest && event.target.closest('[data-act=det]');
  if (!row || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  toggleMonsterDetails(+row.dataset.i);
});
$('#fq').addEventListener('input', event => changeFilter('q', event.target.value));
FILTER_FIELDS.slice(1).forEach(([selector, key]) => $(selector).addEventListener('change', event => changeFilter(key, event.target.value)));
$('#bReset').onclick = resetFilters;
$('#bClose').onclick = () => {
  openMonsterIndexes.clear();
  renderMonsterList();
};
$('#bRand').onclick = openRandomMonster;
loadBestiary();
