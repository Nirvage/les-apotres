const ABILITIES = [['for', 'Force'], ['dex', 'Dextérité'], ['con', 'Constitution'], ['int', 'Intelligence'], ['sag', 'Sagesse'], ['cha', 'Charisme']];
const ABILITY_KEY_BY_NORMALIZED_NAME = Object.fromEntries(ABILITIES.map(([key, name]) => [normalizeText(name), key]));
const ABILITY_NAME_BY_KEY = Object.fromEntries(ABILITIES);
const ARMOR_TRAININGS = ['légères', 'intermédiaires', 'lourdes', 'boucliers'];
const CATEGORY_COLORS = { 'Origine': '#2e9e5b', 'Général': '#2a3170', 'Style de combat': '#c8402f', 'Faveur épique': '#7a4fc4', 'Manifestation occulte': '#5b3a8c' };
const DEFAULT_COLOR = '#2a3170';
const CREATION_COLOR = '#d8791a';
const MY_CREATIONS_CATEGORY = 'Mes créations';
const MESSAGE_DURATION_MS = 5000;
const REPEATABLE_FEAT_IDS = new Set(['asi', 'adepte_elem', 'initie_magie', 'qualifie', 'mo_decharge_dechirante', 'mo_lance_occulte', 'mo_decharge_repoussante', 'mo_lecons_premiers']);
const ARMOR_TRAINING_BY_CLASS = { 'Artificier': ['légères', 'intermédiaires', 'boucliers'], 'Barbare': ['légères', 'intermédiaires', 'boucliers'], 'Barde': ['légères'], 'Chasseur de sang': ['légères', 'intermédiaires'], 'Clerc': ['légères', 'intermédiaires', 'boucliers'], 'Druide': ['légères', 'boucliers'], 'Guerrier': ARMOR_TRAININGS, 'Occultiste': ['légères'], 'Paladin': ARMOR_TRAININGS, 'Rôdeur': ['légères', 'intermédiaires', 'boucliers'], 'Roublard': ['légères'] };
const ARMOR_TRAINING_BY_FEAT = { armure_legere: ['légères', 'boucliers'], armure_inter: ['intermédiaires', 'boucliers'], armure_lourde: ['lourdes'] };
const FIGHTING_STYLE_LEVEL_BY_CLASS = { 'Guerrier': 1, 'Paladin': 2, 'Rôdeur': 2 };
const PREREQUISITE_TYPES = [['none', 'Aucun prérequis'], ['niv', 'Un niveau minimum'], ['ab', 'Une valeur de caractéristique'], ['cast', 'Incantation ou Magie de pacte'], ['arm', 'Une maîtrise d’armure ou de bouclier'], ['style', 'La capacité Style de combat'], ['occ', 'Un niveau d’occultiste (manifestations occultes)'], ['other', 'Autre (à vérifier)']];
const ABILITY_NAMES_PATTERN = 'force|dexterite|constitution|intelligence|sagesse|charisme';
const ABILITY_PREREQUISITE_PATTERN = new RegExp(`((?:(?:${ABILITY_NAMES_PATTERN})(?:\\s*,\\s*|\\s+ou\\s+)?)+)\\s+(\\d+)\\s+ou\\s+plus`);
const FILTER_INPUTS = [['#fq', 'q', 'input'], ['#fc', 'c', 'change'], ['#fp', 'p', 'change'], ['#fa', 'a', 'change']];
const CHARACTERS_STORAGE_KEY = 'dnd_persos_v1';
const CUSTOM_STORAGE_KEY = 'dnd_perso_custom_v1';

let allFeats = [];
let bookFeats = [];
let classesByName = null;
const filters = { q: '', c: '', p: '', a: '', ok: false, open: new Set() };
const character = { niv: 1, ab: { for: 10, dex: 10, con: 10, int: 10, sag: 10, cha: 10 }, cast: false, style: false, occ: false, ar: new Set(), dons: [] };

const notify = text => showMessage(text, MESSAGE_DURATION_MS);
const plural = count => count > 1 ? 's' : '';
const randomId = () => Math.random().toString(36).slice(2, 8);
const clampLevel = value => Math.min(20, Math.max(1, parseInt(value) || 1));

function abilityPrerequisite(normalizedText) {
  const match = normalizedText.match(ABILITY_PREREQUISITE_PATTERN);
  if (!match) return null;
  return { keys: match[1].match(new RegExp(ABILITY_NAMES_PATTERN, 'g')).map(name => ABILITY_KEY_BY_NORMALIZED_NAME[name]), min: +match[2] };
}

function armorPrerequisites(normalizedText) {
  const trainings = [];
  if (/armures? legeres/.test(normalizedText)) trainings.push('légères');
  if (/armures? intermediaires/.test(normalizedText)) trainings.push('intermédiaires');
  if (/armures? lourdes/.test(normalizedText)) trainings.push('lourdes');
  if (/bouclier/.test(normalizedText)) trainings.push('boucliers');
  return trainings;
}

function parsePrerequisite(prerequisiteText) {
  const text = normalizeText(prerequisiteText);
  const parsed = { niv: 0, ab: null, cast: false, style: false, occ: false, more: false, ar: [], other: false };
  if (!text) return parsed;
  const level = text.match(/niveau (\d+)/);
  if (level) parsed.niv = +level[1];
  parsed.ab = abilityPrerequisite(text);
  parsed.cast = /incantation|magie de pacte|capacite sorts/.test(text);
  parsed.style = /style de combat/.test(text);
  parsed.occ = /^occultiste/.test(text);
  parsed.more = parsed.occ && text.includes(',');
  parsed.ar = armorPrerequisites(text);
  parsed.other = !parsed.niv && !parsed.ab && !parsed.cast && !parsed.style && !parsed.occ && !parsed.ar.length;
  return parsed;
}

function prerequisiteTypes(feat, parsed) {
  const hasPrerequisite = !!normalizeText(feat.pre);
  const types = [];
  if (!hasPrerequisite) types.push('none');
  if (parsed.niv) types.push('niv');
  if (parsed.ab) types.push('ab');
  if (parsed.cast) types.push('cast');
  if (parsed.ar.length) types.push('arm');
  if (parsed.style) types.push('style');
  if (parsed.occ) types.push('occ');
  if (parsed.other && hasPrerequisite) types.push('other');
  return types;
}

function indexedFeat(feat) {
  const parsed = parsePrerequisite(feat.pre);
  return Object.assign(feat, {
    P: parsed, types: prerequisiteTypes(feat, parsed),
    c: feat.mine ? CREATION_COLOR : CATEGORY_COLORS[feat.cat] || DEFAULT_COLOR,
    idx: normalizeText([feat.nom, feat.en, feat.cat, feat.pre, feat.desc, feat.src, feat.ed].join(' '))
  });
}

const customFeats = () => (Persos.custom().dons || []).filter(feat => feat && feat.id && feat.nom);

function bookCategories() {
  const categories = [];
  bookFeats.forEach(feat => { if (!categories.includes(feat.cat)) categories.push(feat.cat); });
  return categories;
}

function fillCategoryFilter(hasCustomFeats) {
  const categories = bookCategories();
  const previousCategory = $('#fc').value;
  const options = categories.concat(hasCustomFeats ? [MY_CREATIONS_CATEGORY] : []);
  $('#fc').innerHTML = '<option value="">Toutes</option>' + options.map(category => `<option>${escapeHtml(category)}</option>`).join('');
  const keepPrevious = categories.includes(previousCategory) || previousCategory === MY_CREATIONS_CATEGORY && hasCustomFeats;
  $('#fc').value = keepPrevious ? previousCategory : '';
  filters.c = $('#fc').value;
}

function buildFeatList() {
  const mine = customFeats();
  allFeats = bookFeats.map(feat => ({ ...feat, mine: false })).concat(mine.map(feat => ({ ...feat, mine: true }))).map(indexedFeat);
  fillCategoryFilter(mine.length > 0);
}

function missingPrerequisites(feat) {
  const parsed = feat.P;
  if (parsed.other) return null;
  const missing = [];
  if (parsed.niv && character.niv < parsed.niv) missing.push('niveau ' + parsed.niv);
  if (parsed.ab && !parsed.ab.keys.some(key => character.ab[key] >= parsed.ab.min)) missing.push(parsed.ab.keys.map(key => ABILITY_NAME_BY_KEY[key]).join(' ou ') + ' ' + parsed.ab.min);
  if (parsed.cast && !character.cast) missing.push('Incantation ou Magie de pacte');
  if (parsed.style && !character.style) missing.push('capacité Style de combat');
  if (parsed.occ && !character.occ) missing.push('classe Occultiste');
  parsed.ar.filter(training => !character.ar.has(training)).forEach(training => missing.push(training === 'boucliers' ? 'maîtrise des boucliers' : 'maîtrise des armures ' + training));
  return parsed.more && !missing.length ? null : missing;
}

const timesTaken = feat => character.dons.filter(id => id === feat.id).length;
const meetsAllPrerequisites = feat => (missingPrerequisites(feat) || [1]).length === 0;

function descriptionHtml(feat) {
  return feat.desc.split('\n').filter(line => line.trim()).map(line => {
    const separator = line.indexOf(' : ');
    if (separator > 0 && separator < 60) return `<p><b><i>${escapeHtml(line.slice(0, separator))}.</i></b> ${escapeHtml(line.slice(separator + 3))}</p>`;
    return `<p>${escapeHtml(line)}</p>`;
  }).join('');
}

function matchesCategory(feat) {
  if (!filters.c) return true;
  return filters.c === MY_CREATIONS_CATEGORY ? feat.mine : feat.cat === filters.c && !feat.mine;
}

function matchesAbility(feat) {
  if (!filters.a) return true;
  return filters.a === '-' ? !feat.P.ab : feat.P.ab && feat.P.ab.keys.includes(filters.a);
}

function filteredFeats() {
  const searchedText = normalizeText(filters.q);
  return allFeats.filter(feat => (!searchedText || feat.idx.includes(searchedText))
    && matchesCategory(feat)
    && (!filters.p || feat.types.includes(filters.p))
    && matchesAbility(feat)
    && (!filters.ok || meetsAllPrerequisites(feat)));
}

const allShownAreOpen = shown => shown.length && shown.every(feat => filters.open.has(feat.id));

function prerequisiteStatusHtml(feat) {
  const missing = missingPrerequisites(feat);
  if (missing === null) return `<span class="mb" title="${escapeHtml(feat.pre)}">Prérequis à vérifier : ${escapeHtml(feat.pre)}</span>`;
  if (missing.length) return `<span class="ko">Il manque : ${escapeHtml(missing.join(', '))}</span>`;
  return `<span class="ok">${feat.pre ? 'Prérequis remplis' : 'Sans prérequis'}</span>`;
}

function addButtonHtml(feat, characterName) {
  const count = timesTaken(feat);
  if (count && !REPEATABLE_FEAT_IDS.has(feat.id)) return `<button class="b" disabled title="Déjà sur la fiche de ${characterName}">Sur la fiche</button>`;
  return `<button class="b" data-add="${escapeHtml(feat.id)}" title="Ajoute ce don à la fiche de ${characterName}">Ajouter${count ? ' encore' : ''}</button>`;
}

function featPillsHtml(feat) {
  return (feat.mine ? '<span class="pill">Création</span>' : '')
    + (REPEATABLE_FEAT_IDS.has(feat.id) ? '<span class="pill" style="background:#5f6580">Répétable</span>' : '')
    + (feat.ed ? `<span class="pill" style="background:#9a6b2f" title="Absente des règles 2024">${escapeHtml(feat.ed)}</span>` : '')
    + (feat.mine ? '' : VO.btn('dons', feat.id, feat.nom));
}

function sourceNoteHtml(feat) {
  const origin = feat.mine ? 'Création personnelle' : 'Source : ' + escapeHtml(feat.src || 'Manuel des joueurs 2024') + (feat.r_ ? ' · reconstitué à partir d’un résumé : à vérifier dans le livre' : ' · reformulé : le livre fait foi');
  const choices = feat.choix && feat.choix.length ? ' · les choix du don se font dans la fiche' : '';
  return `<div class="srcn">${origin}${choices}</div>`;
}

function featDetailsHtml(feat) {
  return `<div class="det"><div class="desc">${descriptionHtml(feat)}</div>${feat.en ? `<div class="srcn">Nom anglais : ${escapeHtml(feat.en)}</div>` : ''}${sourceNoteHtml(feat)}</div>`;
}

function featRowHtml(feat, characterName) {
  const isOpen = filters.open.has(feat.id);
  const count = timesTaken(feat);
  const subtitle = [feat.mine ? 'Création personnelle · ' + feat.cat : feat.cat, feat.pre ? 'Prérequis : ' + feat.pre : 'Aucun prérequis'].join(' · ');
  const takenBadge = count ? ` <span class="mb has">Sur la fiche${count > 1 ? ' ×' + count : ''}</span>` : '';
  const editButton = feat.mine ? `<button class="b" data-edit="${escapeHtml(feat.id)}">Modifier</button>` : '';
  return `<div class="item" id="${escapeHtml(feat.id)}" style="--c:${feat.c}"><div class="row"><div class="rmain"><div class="rt">${escapeHtml(feat.nom)}${featPillsHtml(feat)}</div><div class="rs">${escapeHtml(subtitle)}</div>${prerequisiteStatusHtml(feat)}${takenBadge}</div>
  <div class="racts">${editButton}${addButtonHtml(feat, characterName)}<button class="b" data-n="${escapeHtml(feat.id)}" aria-expanded="${isOpen}">${isOpen ? 'Masquer' : 'Détails'}</button></div></div>${isOpen ? featDetailsHtml(feat) : ''}</div>`;
}

function renderFeats() {
  const shown = filteredFeats();
  $('#cnt').textContent = shown.length + ' don' + plural(shown.length) + ' affiché' + plural(shown.length) + ' sur ' + allFeats.length;
  $('#bAll').textContent = allShownAreOpen(shown) ? 'Tout replier' : 'Tout déplier';
  const characterName = escapeHtml(activeCharacterName());
  $('#list').innerHTML = shown.length ? shown.map(feat => featRowHtml(feat, characterName)).join('') : '<div class="empty-msg">Aucun don ne correspond à ces filtres.</div>';
}

function activeCharacterName() {
  const active = Persos.list().find(entry => entry.actif);
  return active ? active.nom : '';
}

function fillCharacterSelect() {
  $('#pp').innerHTML = Persos.list().map(entry => `<option value="${escapeHtml(entry.id)}"${entry.actif ? ' selected' : ''}>${escapeHtml(entry.nom)}</option>`).join('');
}

function findClass(sheetData) {
  if (!classesByName) return null;
  const className = normalizeText(sheetData.classe || sheetData.clsel);
  if (!className) return null;
  for (const [name, classData] of Object.entries(classesByName)) {
    if (normalizeText(name) === className || (classData.alias || []).some(alias => normalizeText(alias) === className)) return [name, classData];
  }
  return null;
}

function takeDerivedValues(derived) {
  character.niv = derived.niv;
  ABILITIES.forEach(([key]) => { character.ab[key] = derived.tot[key] || 10; });
  character.cast = !!derived.cast;
  character.ar = new Set(derived.ar || []);
}

function takeBaseValues(sheetData, classEntry) {
  character.niv = clampLevel(sheetData.niveau);
  ABILITIES.forEach(([key]) => { character.ab[key] = parseInt(sheetData['ab_' + key]) || 10; });
  character.cast = !!(classEntry && (classEntry[1].lanceur || classEntry[1].sous_classe && sheetData.sclance));
  character.ar = new Set(classEntry && ARMOR_TRAINING_BY_CLASS[classEntry[0]] || []);
  character.dons.forEach(id => (ARMOR_TRAINING_BY_FEAT[id] || []).forEach(training => character.ar.add(training)));
}

function showCharacterInInputs() {
  $('#pn').value = character.niv;
  ABILITIES.forEach(([key]) => { $('#a_' + key).value = character.ab[key]; });
  $('#c_cast').checked = character.cast;
  $('#c_style').checked = character.style;
  $('#c_occ').checked = character.occ;
  ARMOR_TRAININGS.forEach(training => { $('#c_' + training).checked = character.ar.has(training); });
}

function characterHint(sheet, derived, className) {
  if (!sheet) return 'Ce personnage n’a pas encore de fiche : indique son niveau et ses caractéristiques ici, ou remplis sa fiche.';
  const origin = derived ? 'Valeurs reprises de la fiche (caractéristiques finales, bonus compris)' : 'Valeurs de base reprises de la fiche (ouvre la fiche une fois pour inclure les bonus d’espèce, d’historique et de dons)';
  return origin + (className ? ' · ' + className + ' niveau ' + character.niv : '') + '. Tu peux les modifier ici pour tester, sans changer la fiche.';
}

function loadActiveCharacter() {
  const sheet = Persos.part('fiche');
  const sheetData = sheet && sheet.data || {};
  const derived = sheetData.derive;
  const extras = sheetData.extras || {};
  character.dons = (Array.isArray(extras.dons) ? extras.dons : []).filter(feat => feat && feat.id).map(feat => feat.id);
  const classEntry = findClass(sheetData);
  if (derived && derived.tot) takeDerivedValues(derived);
  else takeBaseValues(sheetData, classEntry);
  const className = derived && derived.cl || classEntry && classEntry[0] || '';
  character.style = !!(FIGHTING_STYLE_LEVEL_BY_CLASS[className] && character.niv >= FIGHTING_STYLE_LEVEL_BY_CLASS[className]);
  character.occ = className === 'Occultiste';
  showCharacterInInputs();
  $('#phint').textContent = characterHint(sheet, derived, className);
}

function readCharacterInputs() {
  character.niv = clampLevel($('#pn').value);
  ABILITIES.forEach(([key]) => { character.ab[key] = parseInt($('#a_' + key).value) || 10; });
  character.cast = $('#c_cast').checked;
  character.style = $('#c_style').checked;
  character.occ = $('#c_occ').checked;
  character.ar = new Set(ARMOR_TRAININGS.filter(training => $('#c_' + training).checked));
  renderFeats();
}

function followOtherTabChanges(event) {
  if (event.key === CHARACTERS_STORAGE_KEY) {
    fillCharacterSelect();
    loadActiveCharacter();
    renderFeats();
  } else if (event.key === CUSTOM_STORAGE_KEY && bookFeats.length) {
    buildFeatList();
    renderFeats();
  }
}

function ensureFeatList(characterEntry) {
  if (!characterEntry.fiche || !characterEntry.fiche.data) characterEntry.fiche = { version: 5, type: 'fiche-dnd-5e', data: { nom: characterEntry.nom } };
  const sheetData = characterEntry.fiche.data;
  if (!sheetData.extras || typeof sheetData.extras !== 'object') sheetData.extras = {};
  if (!Array.isArray(sheetData.extras.dons)) sheetData.extras.dons = [];
  return sheetData.extras.dons;
}

function addFeatToSheet(feat) {
  Persos.edit(characterEntry => ensureFeatList(characterEntry).push({ u: randomId(), id: feat.id, ch: {} }));
  character.dons.push(feat.id);
  renderFeats();
  notify('« ' + feat.nom + ' » ajouté à la fiche de ' + activeCharacterName() + (feat.choix && feat.choix.length ? ' : fais ses choix dans la fiche' : ''));
}

function editMessage(saved, previous) {
  if (!saved) return 'Don supprimé';
  return previous ? 'Don modifié' : 'Don « ' + saved.nom + ' » créé';
}

function editCustomFeat(feat) {
  Custom.edit({
    kind: 'dons', item: feat, cats: bookCategories(),
    taken: name => allFeats.some(candidate => candidate.id !== (feat && feat.id) && normalizeText(candidate.nom) === normalizeText(name)),
    done: (saved, previous) => {
      buildFeatList();
      renderFeats();
      notify(editMessage(saved, previous));
    }
  });
}

function toggleFeatDetails(id) {
  if (filters.open.has(id)) filters.open.delete(id);
  else filters.open.add(id);
  renderFeats();
}

function handleListClick(event) {
  const button = event.target.closest('button');
  if (!button) return;
  const { n: detailsId, add: addId, edit: editId } = button.dataset;
  if (detailsId) toggleFeatDetails(detailsId);
  else if (addId) {
    const feat = allFeats.find(candidate => candidate.id === addId);
    if (feat) addFeatToSheet(feat);
  } else if (editId) {
    const feat = customFeats().find(candidate => candidate.id === editId);
    if (feat) editCustomFeat(feat);
  }
}

function resetFilters() {
  Object.assign(filters, { q: '', c: '', p: '', a: '', ok: false });
  FILTER_INPUTS.forEach(([selector]) => { $(selector).value = ''; });
  $('#fok').checked = false;
  renderFeats();
}

function toggleAllShown() {
  const shown = filteredFeats();
  const closeAll = allShownAreOpen(shown);
  shown.forEach(feat => closeAll ? filters.open.delete(feat.id) : filters.open.add(feat.id));
  renderFeats();
}

function fillFilterOptions() {
  $('#fp').innerHTML = '<option value="">Tous</option>' + PREREQUISITE_TYPES.map(([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`).join('');
  $('#fa').innerHTML = '<option value="">Toutes</option><option value="-">Aucune</option>' + ABILITIES.map(([key, name]) => `<option value="${key}">${name}</option>`).join('');
}

function openRequestedFeat() {
  const requestedId = decodeURIComponent(location.hash.slice(1));
  if (requestedId && allFeats.some(feat => feat.id === requestedId)) filters.open.add(requestedId);
  renderFeats();
  if (!requestedId) return;
  const row = document.getElementById(requestedId);
  if (row) row.scrollIntoView();
}

const fetchOptionalJson = url => fetchJson(url).catch(() => null);

async function loadFeats() {
  try {
    const [feats, classes] = await Promise.all([fetchJson('assets/json/vf/dons.json'), fetchOptionalJson('assets/json/vf/classes.json')]);
    bookFeats = feats;
    classesByName = classes && classes.classes || null;
    buildFeatList();
    loadActiveCharacter();
    openRequestedFeat();
  } catch (error) {
    $('#list').innerHTML = '<div class="empty-msg">Impossible de charger les dons (ouvre le site via un serveur web).</div>';
  }
}

document.querySelector('.pgrid').addEventListener('input', event => { if (event.target.id !== 'pp') readCharacterInputs(); });
document.querySelector('.chk').addEventListener('change', readCharacterInputs);
$('#pp').addEventListener('change', event => {
  Persos.activate(event.target.value);
  loadActiveCharacter();
  renderFeats();
});
addEventListener('storage', followOtherTabChanges);
$('#bNew').onclick = () => editCustomFeat(null);
$('#list').addEventListener('click', handleListClick);
fillFilterOptions();
FILTER_INPUTS.forEach(([selector, key, eventType]) => $(selector).addEventListener(eventType, event => {
  filters[key] = event.target.value;
  renderFeats();
}));
$('#fok').addEventListener('change', event => {
  filters.ok = event.target.checked;
  renderFeats();
});
$('#bReset').onclick = resetFilters;
$('#bAll').onclick = toggleAllShown;

fillCharacterSelect();
loadFeats();
