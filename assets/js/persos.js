(function () {
'use strict';

const STORAGE_KEY = 'dnd_persos_v1';
const LEGACY_STORAGE_KEYS_BY_PART = { fiche: ['fiche_dnd_v2', 'fiche_dnd_v1'], grimoire: ['grimoire_dnd_v1'] };
const CUSTOM_CREATIONS_KEY = 'dnd_perso_custom_v1';
const CUSTOM_CREATION_KINDS = ['objets', 'equipement', 'dons'];
const CHARACTER_PARTS = ['fiche', 'grimoire', 'objets', 'equipement', 'familiers', 'cartes', 'histoire'];
const EVERYTHING_DELETED_LABEL = 'fiche, grimoire, objets magiques, équipement, familiers, cartes tirées et histoire';

let pageConfig = null;
let currentCharacterId = null;
let selectorContainer = null;
let storeKeptInMemory = null;
let customCreationsKeptInMemory = null;

function newCharacterId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function readJsonFromStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (error) { return null; }
}

function createElement(tag, attributes, text) {
  const element = document.createElement(tag);
  for (const name in attributes) element.setAttribute(name, attributes[name]);
  if (text != null) element.textContent = text;
  return element;
}

function showPageMessage(text) {
  if (pageConfig && pageConfig.msg) pageConfig.msg(text);
}

function blankCharacter(name) {
  return { id: newCharacterId(), nom: name, fiche: null, grimoire: null };
}

function legacyPartSave(part) {
  for (const key of LEGACY_STORAGE_KEYS_BY_PART[part]) {
    const saved = readJsonFromStorage(key);
    if (saved && saved.data && typeof saved.data === 'object') return saved;
  }
  return null;
}

function characterFromLegacySaves() {
  const character = blankCharacter('');
  Object.keys(LEGACY_STORAGE_KEYS_BY_PART).forEach(part => {
    const saved = legacyPartSave(part);
    if (saved) character[part] = saved;
  });
  character.nom = String(character.fiche && character.fiche.data.nom || '').trim()
    || String(character.grimoire && character.grimoire.data.titre || '').trim()
    || 'Personnage 1';
  return character;
}

function newStoreWith(character) {
  const store = { version: 1, actif: character.id, ordre: [character.id], persos: {} };
  store.persos[character.id] = character;
  return store;
}

function readStoreFromStorage() {
  const store = readJsonFromStorage(STORAGE_KEY);
  return store && store.persos && Array.isArray(store.ordre) && store.ordre.length ? store : null;
}

function loadStore() {
  return readStoreFromStorage() || storeKeptInMemory || (storeKeptInMemory = newStoreWith(characterFromLegacySaves()));
}

function saveStore(store) {
  storeKeptInMemory = store;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (error) {}
}

function addCharacterAndActivate(store, character, position) {
  store.persos[character.id] = character;
  if (position == null) store.ordre.push(character.id);
  else store.ordre.splice(position, 0, character.id);
  activateInStore(store, character.id);
}

function activateInStore(store, characterId) {
  store.actif = characterId;
  saveStore(store);
  currentCharacterId = characterId;
}

function setNameWrittenOnSheet(character, name) {
  if (character.fiche && character.fiche.data) character.fiche.data.nom = name;
}

function savePageDataOfCurrentCharacter() {
  if (!pageConfig || !currentCharacterId) return;
  const store = loadStore();
  const character = store.persos[currentCharacterId];
  if (!character) return;
  character[pageConfig.part] = pageConfig.collect();
  saveStore(store);
}

function displayCharacterOnPage(character) {
  try { pageConfig.apply(character[pageConfig.part], character); } catch (error) { pageConfig.apply(null, character); }
  if (pageConfig.title) pageConfig.title.value = character.nom;
}

function followNameChange(name) {
  const titleIsBeingEdited = document.activeElement === pageConfig.title && document.hasFocus();
  if (pageConfig.title && !titleIsBeingEdited) pageConfig.title.value = name;
  if (pageConfig.onName) pageConfig.onName(name);
}

function refreshSelectorAndDisplay(character) {
  renderCharacterSelector();
  displayCharacterOnPage(character);
}

function selectCharacter(characterId) {
  if (characterId === currentCharacterId) return;
  savePageDataOfCurrentCharacter();
  const store = loadStore();
  if (!store.persos[characterId]) return;
  activateInStore(store, characterId);
  refreshSelectorAndDisplay(store.persos[characterId]);
}

function askNewCharacterName(store) {
  const defaultName = 'Personnage ' + (store.ordre.length + 1);
  const answer = prompt('Nom du nouveau personnage :', defaultName);
  if (answer === null) return null;
  return answer.trim() || defaultName;
}

function createCharacterFromSelector() {
  const name = askNewCharacterName(loadStore());
  if (name === null) return;
  savePageDataOfCurrentCharacter();
  const store = loadStore();
  const character = blankCharacter(name);
  addCharacterAndActivate(store, character);
  refreshSelectorAndDisplay(character);
  showPageMessage('Personnage « ' + name + ' » créé');
}

function duplicateCurrentCharacter() {
  savePageDataOfCurrentCharacter();
  const store = loadStore();
  const original = store.persos[currentCharacterId];
  if (!original) return;
  const copy = JSON.parse(JSON.stringify(original));
  copy.id = newCharacterId();
  copy.nom = original.nom + ' (copie)';
  setNameWrittenOnSheet(copy, copy.nom);
  addCharacterAndActivate(store, copy, store.ordre.indexOf(currentCharacterId) + 1);
  refreshSelectorAndDisplay(copy);
  showPageMessage('« ' + original.nom + ' » dupliqué (fiche et grimoire)');
}

function renameCurrentCharacter() {
  const store = loadStore();
  const character = store.persos[currentCharacterId];
  if (!character) return;
  const answer = prompt('Nouveau nom du personnage :', character.nom);
  if (answer === null) return;
  const name = answer.trim();
  if (!name) return;
  character.nom = name;
  setNameWrittenOnSheet(character, name);
  saveStore(store);
  renderCharacterSelector();
  followNameChange(name);
}

function confirmCharacterDeletion(character) {
  return confirm('Supprimer « ' + character.nom + ' » (' + EVERYTHING_DELETED_LABEL + ') ? Cette action est définitive : pense à exporter le personnage avant.');
}

function removeCharacterFromStore(store, characterId) {
  const position = store.ordre.indexOf(characterId);
  store.ordre.splice(position, 1);
  delete store.persos[characterId];
  return position;
}

function deleteCurrentCharacter() {
  const store = loadStore();
  const character = store.persos[currentCharacterId];
  if (!character || store.ordre.length < 2) return;
  if (!confirmCharacterDeletion(character)) return;
  const position = removeCharacterFromStore(store, currentCharacterId);
  const nextCharacterId = store.ordre[Math.min(position, store.ordre.length - 1)];
  activateInStore(store, nextCharacterId);
  refreshSelectorAndDisplay(store.persos[nextCharacterId]);
  showPageMessage('« ' + character.nom + ' » supprimé');
}

function setCurrentCharacterName(newName) {
  const name = String(newName || '').trim();
  if (!name || !currentCharacterId) return;
  const store = loadStore();
  const character = store.persos[currentCharacterId];
  if (!character || character.nom === name) return;
  character.nom = name;
  if (pageConfig.part !== 'fiche') setNameWrittenOnSheet(character, name);
  saveStore(store);
  renderCharacterSelector();
}

function characterChip(character) {
  const chip = createElement('button', {
    type: 'button', 'class': 'pc', 'aria-pressed': String(character.id === currentCharacterId), title: character.nom
  }, character.nom);
  chip.onclick = () => selectCharacter(character.id);
  return chip;
}

function characterChips(store) {
  const group = createElement('div', { 'class': 'pchips', role: 'group', 'aria-label': 'Choisir un personnage' });
  store.ordre.forEach(characterId => group.appendChild(characterChip(store.persos[characterId])));
  const newCharacterButton = createElement('button', { type: 'button', 'class': 'pc pnew' }, '+ Nouveau');
  newCharacterButton.onclick = createCharacterFromSelector;
  group.appendChild(newCharacterButton);
  return group;
}

function characterActions(store) {
  const actions = createElement('div', { 'class': 'pacts' });
  [['Renommer', renameCurrentCharacter], ['Dupliquer', duplicateCurrentCharacter], ['Supprimer', deleteCurrentCharacter]].forEach(([label, action]) => {
    const button = createElement('button', { type: 'button' }, label);
    button.onclick = action;
    if (label === 'Supprimer' && store.ordre.length < 2) {
      button.disabled = true;
      button.title = 'Il faut garder au moins un personnage';
    }
    actions.appendChild(button);
  });
  return actions;
}

function renderCharacterSelector() {
  const store = loadStore();
  selectorContainer.textContent = '';
  selectorContainer.appendChild(createElement('span', { 'class': 'pl' }, 'Personnage'));
  selectorContainer.appendChild(characterChips(store));
  selectorContainer.appendChild(characterActions(store));
}

function bindTitleInputToCharacterName(titleInput) {
  titleInput.addEventListener('input', () => setCurrentCharacterName(titleInput.value));
  titleInput.addEventListener('blur', () => {
    const character = loadStore().persos[currentCharacterId];
    if (character && !titleInput.value.trim()) titleInput.value = character.nom;
  });
}

function initPage(config) {
  pageConfig = config;
  selectorContainer = config.mount;
  if (config.title) bindTitleInputToCharacterName(config.title);
  const store = loadStore();
  activateInStore(store, store.persos[store.actif] ? store.actif : store.ordre[0]);
  refreshSelectorAndDisplay(store.persos[currentCharacterId]);
}

function previousNameOf(oldStoreJson, characterId) {
  let oldStore = null;
  try { oldStore = JSON.parse(oldStoreJson); } catch (error) {}
  return oldStore && oldStore.persos && oldStore.persos[characterId] && oldStore.persos[characterId].nom;
}

function followChangesFromOtherTab(event) {
  if (event.key !== STORAGE_KEY || !pageConfig) return;
  const store = readStoreFromStorage();
  if (!store) return;
  if (!store.persos[currentCharacterId]) {
    currentCharacterId = store.persos[store.actif] ? store.actif : store.ordre[0];
    refreshSelectorAndDisplay(store.persos[currentCharacterId]);
    return;
  }
  renderCharacterSelector();
  const name = store.persos[currentCharacterId].nom;
  if (previousNameOf(event.oldValue, currentCharacterId) !== name) followNameChange(name);
}

addEventListener('storage', followChangesFromOtherTab);

function allCustomCreations() {
  const creations = readJsonFromStorage(CUSTOM_CREATIONS_KEY) || customCreationsKeptInMemory || {};
  CUSTOM_CREATION_KINDS.forEach(kind => { if (!Array.isArray(creations[kind])) creations[kind] = []; });
  return creations;
}

function setCustomCreations(kind, list) {
  const creations = allCustomCreations();
  creations[kind] = list;
  customCreationsKeptInMemory = creations;
  try { localStorage.setItem(CUSTOM_CREATIONS_KEY, JSON.stringify(creations)); } catch (error) {}
}

function renamedEntry(entry, oldName, newName) {
  if (entry === oldName) return newName;
  if (entry && typeof entry === 'object' && entry.n === oldName) entry.n = newName;
  return entry;
}

function renameCustomCreationEverywhere(kind, oldName, newName) {
  if (oldName === newName) return;
  const store = loadStore();
  Object.values(store.persos).forEach(character => {
    const pageData = character[kind] && character[kind].data;
    if (!pageData) return;
    ['objets', 'harmonises'].forEach(listName => {
      if (Array.isArray(pageData[listName])) pageData[listName] = pageData[listName].map(entry => renamedEntry(entry, oldName, newName));
    });
  });
  saveStore(store);
}

function pageData(character, part) {
  return character[part] && character[part].data;
}

function entryNamesOf(character, part, listName) {
  const data = pageData(character, part);
  return (data && data[listName] || []).map(entry => typeof entry === 'string' ? entry : entry && entry.n);
}

function customCreationsUsedBy(character) {
  const creations = allCustomCreations();
  const magicItemNames = entryNamesOf(character, 'objets', 'objets');
  const equipmentNames = entryNamesOf(character, 'equipement', 'objets');
  const sheetExtras = character.fiche && character.fiche.data && character.fiche.data.extras;
  const featIds = (sheetExtras && sheetExtras.dons || []).map(feat => feat.id);
  return {
    objets: creations.objets.filter(item => magicItemNames.indexOf(item.n) >= 0),
    equipement: creations.equipement.filter(item => equipmentNames.indexOf(item.n) >= 0),
    dons: creations.dons.filter(feat => featIds.indexOf(feat.id) >= 0)
  };
}

function isSameCreation(kind, existing, imported) {
  return kind === 'dons' ? existing.id === imported.id || existing.nom === imported.nom : existing.n === imported.n;
}

function mergeImportedCustomCreations(imported) {
  if (!imported || typeof imported !== 'object') return;
  const creations = allCustomCreations();
  CUSTOM_CREATION_KINDS.forEach(kind => {
    if (!Array.isArray(imported[kind])) return;
    imported[kind].forEach(creation => {
      if (!creation || typeof creation !== 'object' || !creation.n && !creation.nom) return;
      const alreadyKnown = creations[kind].some(existing => isSameCreation(kind, existing, creation));
      if (!alreadyKnown) {
        creation.c_ = 1;
        creations[kind].push(creation);
      }
    });
    setCustomCreations(kind, creations[kind]);
  });
}

function charactersSummary() {
  const store = loadStore();
  return store.ordre.map(characterId => ({ id: characterId, nom: store.persos[characterId].nom, actif: characterId === store.actif }));
}

function activateCharacter(characterId) {
  const store = loadStore();
  if (store.persos[characterId]) activateInStore(store, characterId);
}

const SKILL_NAMES = ['Acrobaties', 'Arcanes', 'Athlétisme', 'Discrétion', 'Dressage', 'Escamotage', 'Histoire', 'Intimidation', 'Intuition', 'Investigation', 'Médecine', 'Nature', 'Perception', 'Persuasion', 'Religion', 'Représentation', 'Supercherie', 'Survie'];
const ABILITY_NAMES = { for: 'Force', dex: 'Dextérité', con: 'Constitution', int: 'Intelligence', sag: 'Sagesse', cha: 'Charisme' };
const NAMED_SHEET_FIELDS = [
  ['nom', 'identité', 'nom'], ['classe', 'identité', 'classe'], ['sousclasse', 'identité', 'sous-classe'], ['espece', 'identité', 'espèce'], ['historique', 'identité', 'historique'], ['alignement', 'identité', 'alignement'], ['niveau', 'identité', 'niveau'],
  ['clsel', 'choix_dans_les_paramètres', 'classe'], ['race', 'choix_dans_les_paramètres', 'espèce'], ['sespece', 'choix_dans_les_paramètres', 'sous-espèce'], ['sclasse', 'choix_dans_les_paramètres', 'sous-classe'], ['bgsel', 'choix_dans_les_paramètres', 'historique'],
  ['b_init', 'bonus_divers', 'initiative'], ['b_ca', 'bonus_divers', 'classe_d_armure'], ['b_dd', 'bonus_divers', 'DD_de_sauvegarde'], ['b_atk', 'bonus_divers', 'attaque_de_sort'],
  ['dvtot', 'combat', 'dés_de_vie_total'], ['dvrest', 'combat', 'dés_de_vie_restants'], ['vitesse', 'combat', 'vitesse'], ['inspi', 'combat', 'inspiration'], ['pvmax', 'combat', 'pv_max'], ['pv', 'combat', 'pv_actuels'], ['pvtemp', 'combat', 'pv_temporaires'],
  ['ds1', 'jets_contre_la_mort', 'réussite_1'], ['ds2', 'jets_contre_la_mort', 'réussite_2'], ['ds3', 'jets_contre_la_mort', 'réussite_3'], ['df1', 'jets_contre_la_mort', 'échec_1'], ['df2', 'jets_contre_la_mort', 'échec_2'], ['df3', 'jets_contre_la_mort', 'échec_3'],
  ['pc', 'pièces', 'cuivre'], ['pa', 'pièces', 'argent'], ['pe', 'pièces', 'électrum'], ['po', 'pièces', 'or'], ['pp_', 'pièces', 'platine'],
  ['equip', 'textes', 'équipement'], ['capacites', 'textes', 'capacités_et_traits'], ['religion', 'textes', 'religion_et_pactes'], ['langues', 'textes', 'langues_et_maîtrises'], ['notes', 'textes', 'notes'],
  ['cast', 'sorts', 'caractéristique_d_incantation'], ['sclance', 'sorts', 'case_spéciale_cochée'], ['sorts', 'sorts', 'texte_sorts']
];

function sheetFieldReadableNames() {
  const fields = NAMED_SHEET_FIELDS.slice();
  Object.keys(ABILITY_NAMES).forEach(ability => {
    fields.push(['ab_' + ability, 'caractéristiques', ABILITY_NAMES[ability] + '_valeur']);
    fields.push(['sv_' + ability, 'caractéristiques', ABILITY_NAMES[ability] + '_sauvegarde_maîtrisée']);
  });
  SKILL_NAMES.forEach((skill, index) => {
    fields.push(['sk_' + index, 'compétences', skill + '_maîtrise']);
    fields.push(['ske_' + index, 'compétences', skill + '_expertise']);
  });
  for (let index = 0; index < 5; index++) {
    const number = index + 1;
    fields.push(['a' + index + '_n', 'attaques', 'attaque_' + number + '_nom']);
    fields.push(['a' + index + '_b', 'attaques', 'attaque_' + number + '_bonus']);
    fields.push(['a' + index + '_d', 'attaques', 'attaque_' + number + '_dégâts']);
    fields.push(['obj' + index, 'objets_liés', 'objet_' + number]);
  }
  for (let level = 1; level <= 9; level++) {
    fields.push(['sl' + level + '_u', 'emplacements_de_sorts', 'niveau_' + level + '_utilisés']);
    fields.push(['sl' + level + '_t', 'emplacements_de_sorts', 'niveau_' + level + '_total']);
  }
  return fields;
}

function readableSheet(sheet) {
  if (!sheet || !sheet.data) return null;
  const data = sheet.data;
  const content = {};
  const namedKeys = {};
  sheetFieldReadableNames().forEach(([key, section, label]) => {
    if (!(key in data)) return;
    namedKeys[key] = 1;
    (content[section] = content[section] || {})[label] = data[key];
  });
  const otherFields = {};
  Object.keys(data).forEach(key => { if (!namedKeys[key] && key !== 'ress' && key !== 'extras') otherFields[key] = data[key]; });
  if (Object.keys(otherFields).length) content.autres = otherFields;
  content.ressources_suivies = data.ress || {};
  content.choix_dons_espèce_sous_classe = data.extras || {};
  return { format: 'fiche-dnd-5e', version: sheet.version, contenu: content };
}

function internalSheet(readable) {
  if (!readable || !readable.contenu) return null;
  const content = readable.contenu;
  const data = {};
  sheetFieldReadableNames().forEach(([key, section, label]) => {
    if (content[section] && label in content[section]) data[key] = content[section][label];
  });
  Object.assign(data, content.autres || {});
  data.ress = content.ressources_suivies || {};
  data.extras = content.choix_dons_espèce_sous_classe || {};
  return { version: readable.version || 5, type: 'fiche-dnd-5e', data: data };
}

function exportActiveCharacter() {
  const store = loadStore();
  const character = store.persos[store.actif];
  const grimoire = pageData(character, 'grimoire');
  const magicItems = pageData(character, 'objets');
  const equipment = pageData(character, 'equipement');
  const familiars = pageData(character, 'familiers');
  const cards = pageData(character, 'cartes');
  return {
    format: 'personnage-dnd-5e', version: 2, nom: character.nom,
    fiche: readableSheet(character.fiche),
    grimoire: grimoire ? { titre: grimoire.titre || '', sorts: grimoire.sorts || [], sorts_prepares: grimoire.prepares || [], terrain: grimoire.terrain || '', sorts_de_dons: grimoire.dons || {} } : null,
    objets_magiques: magicItems ? { titre: magicItems.titre || '', objets: magicItems.objets || [], harmonises: magicItems.harmonises || [] } : null,
    equipement: equipment ? { titre: equipment.titre || '', objets: equipment.objets || [] } : null,
    familiers: familiars ? { titre: familiars.titre || '', familiers: familiars.familiers || [] } : null,
    cartes_tirees: cards && (cards.tirages || []).length ? cards.tirages : null,
    histoire: hasWrittenStory(character) ? character.histoire.data : null,
    creations_personnelles: customCreationsUsedBy(character)
  };
}

function pageSave(type, data) {
  return { version: 1, type: type, data: data };
}

function partsFromReadableExport(exported) {
  const grimoire = exported.grimoire;
  const magicItems = exported.objets_magiques;
  const equipment = exported.equipement;
  const familiars = exported.familiers;
  return {
    fiche: internalSheet(exported.fiche),
    grimoire: grimoire ? pageSave('grimoire-dnd-5e', { titre: grimoire.titre || '', sorts: grimoire.sorts || [], prepares: grimoire.sorts_prepares || [], terrain: grimoire.terrain || '', dons: grimoire.sorts_de_dons || {}, filtres: {} }) : null,
    objets: magicItems ? pageSave('objets-dnd-5e', { titre: magicItems.titre || '', objets: magicItems.objets || [], harmonises: magicItems.harmonises || [], filtres: {} }) : null,
    equipement: equipment ? pageSave('equipement-dnd-5e', { titre: equipment.titre || '', objets: equipment.objets || [], filtres: {} }) : null,
    familiers: familiars ? pageSave('familiers-dnd-5e', { titre: familiars.titre || '', familiers: familiars.familiers || [], filtres: {} }) : null,
    cartes: Array.isArray(exported.cartes_tirees) ? pageSave('cartes-dnd-5e', { tirages: exported.cartes_tirees }) : null,
    histoire: exported.histoire && typeof exported.histoire === 'object' ? pageSave('histoire-dnd-5e', exported.histoire) : null
  };
}

function partsFromInternalExport(exported) {
  const parts = {};
  CHARACTER_PARTS.forEach(part => { parts[part] = exported[part] && exported[part].data ? exported[part] : null; });
  return parts;
}

function importCharacter(exported) {
  if (!exported) throw new Error('format');
  let parts;
  if (exported.type === 'personnage-dnd-5e') parts = partsFromInternalExport(exported);
  else if (exported.format === 'personnage-dnd-5e') parts = partsFromReadableExport(exported);
  else throw new Error('format');
  const character = Object.assign({ id: newCharacterId(), nom: String(exported.nom || 'Personnage importé') }, parts);
  mergeImportedCustomCreations(exported.creations_personnelles);
  addCharacterAndActivate(loadStore(), character);
  return character;
}

function isEmptySheetValue(field, value) {
  return value === false || value === null || value === '' && field !== 'niveau' && field.indexOf('ab_') !== 0;
}

function withoutEmptySheetValues(sheetData) {
  Object.keys(sheetData).forEach(field => { if (isEmptySheetValue(field, sheetData[field])) delete sheetData[field]; });
}

function shareableActiveCharacter() {
  const store = loadStore();
  const character = store.persos[store.actif];
  const shared = { type: 'personnage-dnd-5e', nom: character.nom };
  CHARACTER_PARTS.forEach(part => {
    const saved = character[part];
    if (!saved || !saved.data) return;
    const data = JSON.parse(JSON.stringify(saved.data));
    delete data.filtres;
    if (part === 'fiche') withoutEmptySheetValues(data);
    shared[part] = { version: saved.version, type: saved.type, data: data };
  });
  if (!hasWrittenStory(character)) delete shared.histoire;
  const creations = customCreationsUsedBy(character);
  if (creations.objets.length || creations.equipement.length || creations.dons.length) shared.creations_personnelles = creations;
  return shared;
}

function hasWrittenStory(character) {
  const story = pageData(character, 'histoire');
  return !!story && Object.keys(story).some(section => typeof story[section] === 'string' && story[section].trim());
}

function hasListEntries(character, part, listName) {
  const data = pageData(character, part);
  return data && (data[listName] || []).length;
}

function printablePartsOfActiveCharacter() {
  const store = loadStore();
  const character = store.persos[store.actif];
  const parts = [];
  if (pageData(character, 'fiche')) parts.push('fiche');
  if (hasListEntries(character, 'grimoire', 'sorts')) parts.push('grimoire');
  if (hasListEntries(character, 'objets', 'objets')) parts.push('objets');
  if (hasListEntries(character, 'equipement', 'objets')) parts.push('equipement');
  if (hasListEntries(character, 'familiers', 'familiers')) parts.push('familiers');
  if (hasWrittenStory(character)) parts.push('histoire');
  return parts;
}

function createCharacterFromHomePage() {
  const store = loadStore();
  const name = askNewCharacterName(store);
  if (name === null) return null;
  const character = blankCharacter(name);
  addCharacterAndActivate(store, character);
  return character;
}

function isBlankCharacter(character) {
  return character && CHARACTER_PARTS.every(part => !character[part]);
}

function addFilledCharacter(name, parts) {
  const store = loadStore();
  const activeCharacter = store.persos[store.actif];
  const reuseActiveCharacter = isBlankCharacter(activeCharacter);
  const character = reuseActiveCharacter ? activeCharacter : { id: newCharacterId(), fiche: null, grimoire: null };
  character.nom = String(name || '').trim() || 'Personnage ' + (store.ordre.length + (reuseActiveCharacter ? 0 : 1));
  Object.keys(parts || {}).forEach(part => { if (CHARACTER_PARTS.indexOf(part) >= 0) character[part] = parts[part]; });
  setNameWrittenOnSheet(character, character.nom);
  if (reuseActiveCharacter) activateInStore(store, character.id);
  else addCharacterAndActivate(store, character);
  return character;
}

function deleteCharacterById(characterId) {
  const store = loadStore();
  const character = store.persos[characterId];
  if (!character) return null;
  if (!confirmCharacterDeletion(character)) return null;
  const position = removeCharacterFromStore(store, characterId);
  if (!store.ordre.length) {
    const replacement = blankCharacter('Personnage 1');
    store.persos[replacement.id] = replacement;
    store.ordre.push(replacement.id);
  }
  const nextActiveId = store.actif === characterId || !store.persos[store.actif] ? store.ordre[Math.min(position, store.ordre.length - 1)] : store.actif;
  activateInStore(store, nextActiveId);
  return character;
}

function activeCharacterPart(part) {
  const store = loadStore();
  const character = store.persos[store.actif];
  return character && character[part] || null;
}

function editActiveCharacter(modify) {
  const store = loadStore();
  const character = store.persos[store.actif];
  if (!character) return false;
  modify(character);
  saveStore(store);
  return true;
}

window.Persos = {
  create: createCharacterFromHomePage,
  remove: deleteCharacterById,
  add: addFilledCharacter,
  part: activeCharacterPart,
  list: charactersSummary,
  activate: activateCharacter,
  exportActive: exportActiveCharacter,
  shareData: shareableActiveCharacter,
  importPerso: importCharacter,
  printable: printablePartsOfActiveCharacter,
  init: initPage,
  save: savePageDataOfCurrentCharacter,
  setName: setCurrentCharacterName,
  custom: allCustomCreations,
  setCustom: setCustomCreations,
  renameCustom: renameCustomCreationEverywhere,
  current: () => loadStore().persos[currentCharacterId],
  edit: editActiveCharacter
};
})();
