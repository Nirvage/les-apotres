(function () {
'use strict';

const COLOR_BY_CREATURE_TYPE = {
  'aberration': '#7a4fc4', 'bête': '#2e9e5b', 'céleste': '#c99a06', 'artificiel': '#5d6b7a', 'dragon': '#c8402f', 'élémentaire': '#d8791a', 'fée': '#12968f',
  'fiélon': '#8b1e3f', 'géant': '#8e5a2b', 'humanoïde': '#2f6fd0', 'créature monstrueuse': '#9c3d8f', 'vase': '#6b8e23', 'plante': '#3c7d3c', 'mort-vivant': '#4a4a4a', 'nuée': '#6d6875'
};
const DEFAULT_CREATURE_COLOR = '#2a3170';
const ABILITY_LABELS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
const ABILITY_KEYS = ['for', 'dex', 'con', 'int', 'sag', 'cha'];
const FRACTIONAL_CHALLENGE_LABELS = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' };
const PARTY_STORAGE_KEY = 'dnd_groupe_v1';
const CHARACTERS_STORAGE_KEY = 'dnd_persos_v1';
const COMBAT_QUEUE_STORAGE_KEY = 'dnd_combat_ajout_v1';
const GAME_MASTER_NAME = 'mj';
const XP_BUDGET_BY_LEVEL = [null, [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100], [600, 1000, 1400], [750, 1300, 1700], [1000, 1700, 2100], [1300, 2000, 2600], [1600, 2300, 3100],
  [1900, 2900, 4100], [2200, 3700, 4700], [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800], [3800, 6100, 9800], [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000]];

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function normalize(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘`´]/g, "'").trim();
}

function abilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

function signed(number) {
  return (number >= 0 ? '+' : '−') + Math.abs(number);
}

function baseCreatureType(monster) {
  return monster.typ.indexOf('nuée') === 0 ? 'nuée' : monster.typ.replace(/ \(.*$/, '');
}

function creatureColor(monster) {
  return COLOR_BY_CREATURE_TYPE[baseCreatureType(monster)] || DEFAULT_CREATURE_COLOR;
}

function experiencePoints(monster) {
  return parseInt(String(monster.px).split(',')[0].replace(/[^\d]/g, ''), 10) || 0;
}

function challengeLabel(challenge) {
  return FRACTIONAL_CHALLENGE_LABELS[challenge] || String(challenge);
}

function parseHitPoints(monster) {
  const text = String(monster.pv).replace(/[  ]/g, ' ');
  const match = /^(\d+) \((\d+)d(\d+)(?: ([+−-]) (\d+))?\)/.exec(text);
  if (!match) return { moy: parseInt(text, 10) || 1, n: 0, d: 0, b: 0 };
  const [, average, diceCount, dieSize, bonusSign, bonusValue] = match;
  const bonus = bonusSign ? (bonusSign === '+' ? 1 : -1) * bonusValue : 0;
  return { moy: +average, n: +diceCount, d: +dieSize, b: bonus };
}

function randomBelow(limit) {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return Math.floor(randomValues[0] / 4294967296 * limit);
}

function rollHitPoints(monster) {
  const hitPoints = parseHitPoints(monster);
  if (!hitPoints.n) return hitPoints.moy;
  let total = hitPoints.b;
  for (let die = 0; die < hitPoints.n; die++) total += 1 + randomBelow(hitPoints.d);
  return Math.max(1, total);
}

function armorClass(monster) {
  return parseInt(monster.ca, 10) || 10;
}

function dexterityModifier(monster) {
  return abilityModifier(monster.car[1]);
}

function initiativeBonus(monster) {
  return typeof monster.init === 'number' ? monster.init : dexterityModifier(monster);
}

function actionSectionHtml(title, actions, introduction) {
  if (!actions || !actions.length) return '';
  const intro = introduction ? '<p class="intro">' + escapeHtml(introduction) + '</p>' : '';
  const paragraphs = actions.map(action => '<p><b><i>' + escapeHtml(action.n) + '.</i></b> ' + escapeHtml(action.d).replace(/\n/g, '<br>') + '</p>').join('');
  return '<div class="sec"><h4>' + title + '</h4>' + intro + paragraphs + '</div>';
}

function statLine(label, value) {
  return value ? '<div><b>' + label + '</b> ' + escapeHtml(value) + '</div>' : '';
}

function statBlockHeaderHtml(monster) {
  const type = monster.typ[0].toUpperCase() + monster.typ.slice(1);
  return '<header><div class="ti"><h3>' + escapeHtml(monster.n) + '</h3><div class="sub">' + escapeHtml(type) + ' de taille ' + escapeHtml(monster.tail.toLowerCase()) + ', ' + escapeHtml(monster.al) + ' · ' + escapeHtml(monster.en) + '</div></div></header>';
}

function statBlockMetaHtml(monster) {
  const initiative = initiativeBonus(monster);
  const experience = String(monster.px).replace(/^([\d\s  ]+)/, '$1 PX');
  return '<dl class="meta"><div><dt>Classe d’armure</dt><dd>' + escapeHtml(monster.ca) + '</dd></div><div><dt>Points de vie</dt><dd>' + escapeHtml(monster.pv) + '</dd></div>'
    + '<div><dt>Vitesse</dt><dd>' + escapeHtml(monster.vit) + '</dd></div><div><dt>Initiative</dt><dd>' + signed(initiative) + ' (' + (10 + initiative) + ')</dd></div>'
    + '<div><dt>Facteur de puissance</dt><dd>' + escapeHtml(monster.fp) + ' · ' + escapeHtml(experience) + ' · BM ' + escapeHtml(monster.bm) + '</dd></div></dl>';
}

function abilityScoresHtml(monster) {
  return '<div class="ab6">' + monster.car.map((score, index) => '<div><b>' + ABILITY_LABELS[index] + '</b><span>' + score + ' (' + signed(abilityModifier(score)) + ')</span></div>').join('') + '</div>';
}

function statLinesHtml(monster) {
  return '<div class="lines">' + statLine('Jets de sauvegarde', monster.sauv) + statLine('Compétences', monster.comp) + statLine('Vulnérabilités', monster.vuln)
    + statLine('Résistances', monster.res) + statLine('Immunités aux dégâts', monster.imm) + statLine('Immunités aux états', monster.cimm)
    + statLine('Équipement', monster.equip) + statLine('Sens', monster.sens) + statLine('Langues', monster.langues) + '</div>';
}

function statBlockHtml(monster) {
  const source = monster.v === '2014' ? 'SRD 5.1 (règles 2014)' : 'SRD 5.2 (règles 2024)';
  return '<article class="sp" style="--c:' + creatureColor(monster) + '">' + statBlockHeaderHtml(monster)
    + '<div class="body">' + statBlockMetaHtml(monster) + abilityScoresHtml(monster) + statLinesHtml(monster)
    + actionSectionHtml('Traits', monster.traits) + actionSectionHtml('Actions', monster.actions) + actionSectionHtml('Actions bonus', monster.bonus)
    + actionSectionHtml('Réactions', monster.reac) + actionSectionHtml('Actions légendaires', monster.leg, monster.legi)
    + '<div class="srcn">Source : ' + source + ', Wizards of the Coast, licence CC BY 4.0.</div></div></article>';
}

let bestiary = null;
const monstersByName = {};

function indexBestiary(monsters) {
  bestiary = monsters;
  monsters.forEach((monster, index) => {
    monster.i = index;
    monster.idx = normalize(monster.n + ' ' + monster.en + ' ' + monster.typ);
    monstersByName[monster.n] = monster;
  });
  return monsters;
}

function loadBestiary() {
  if (bestiary) return Promise.resolve(bestiary);
  return fetch('assets/json/vf/bestiaire.json?v=20261019a')
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(indexBestiary);
}

function readJsonFromStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (error) { return undefined; }
}

function withInitiativeBonusFromOldFormat(member) {
  if (typeof member.init === 'number' && member.binit == null && member.dex == null) member.binit = member.init;
  delete member.init;
  return member;
}

function partyMembers() {
  const stored = readJsonFromStorage(PARTY_STORAGE_KEY);
  return (Array.isArray(stored) ? stored : []).filter(member => member && typeof member === 'object').map(withInitiativeBonusFromOldFormat);
}

function saveParty(members) {
  try {
    localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(members));
    return true;
  } catch (error) {
    return false;
  }
}

function isGameMasterName(name) {
  return String(name).trim().toLowerCase() === GAME_MASTER_NAME;
}

function sheetNumber(sheetData, field, fallback) {
  const value = parseInt(sheetData[field], 10);
  return isNaN(value) ? fallback : value;
}

function sheetAbilityScores(sheetData, derived) {
  const scores = {};
  ABILITY_KEYS.forEach(ability => {
    const score = derived.tot && derived.tot[ability] || sheetNumber(sheetData, 'ab_' + ability, 0);
    if (score) scores[ability] = score;
  });
  return scores;
}

function passivePerceptionFromSheet(derived) {
  if (typeof derived.pp === 'number') return derived.pp;
  return derived.tot && derived.tot.sag ? 10 + abilityModifier(derived.tot.sag) : null;
}

function characterSummaryFromSheet(character) {
  const sheetData = character.fiche && character.fiche.data || {};
  const derived = sheetData.derive || {};
  const maxHitPoints = sheetNumber(sheetData, 'pvmax', 0);
  return {
    nom: character.nom, car: sheetAbilityScores(sheetData, derived), cl: derived.cl || sheetData.classe || '',
    niveau: Math.min(20, Math.max(1, sheetNumber(sheetData, 'niveau', 1))), pvmax: maxHitPoints, pv: sheetNumber(sheetData, 'pv', maxHitPoints),
    init: typeof derived.init === 'number' ? derived.init : abilityModifier(sheetNumber(sheetData, 'ab_dex', 10)) + sheetNumber(sheetData, 'b_init', 0),
    ca: typeof derived.ca === 'number' ? derived.ca : null,
    pp: passivePerceptionFromSheet(derived)
  };
}

function charactersFromSheets() {
  const store = readJsonFromStorage(CHARACTERS_STORAGE_KEY);
  if (!store || !store.persos || !Array.isArray(store.ordre)) return [];
  return store.ordre.map(characterId => store.persos[characterId])
    .filter(character => character && !isGameMasterName(character.nom))
    .map(characterSummaryFromSheet);
}

const numberOrNull = value => typeof value === 'number' && !isNaN(value) ? value : null;

function takeMatchingSheet(sheets, name) {
  const position = sheets.findIndex(sheet => normalize(sheet.nom) === normalize(name));
  return position >= 0 ? sheets.splice(position, 1)[0] : {};
}

function mergedAbilityScores(member, sheet) {
  const scores = {};
  ABILITY_KEYS.forEach(ability => {
    const score = numberOrNull(member[ability]) != null ? member[ability] : sheet.car && sheet.car[ability];
    if (score) scores[ability] = score;
  });
  return scores;
}

function mergedInitiative(member, sheet, scores) {
  if (numberOrNull(member.dex) != null || numberOrNull(member.binit) != null) {
    return (numberOrNull(member.dex) != null ? abilityModifier(member.dex) : 0) + (member.binit || 0);
  }
  if (numberOrNull(sheet.init) != null) return sheet.init;
  return scores.dex ? abilityModifier(scores.dex) : 0;
}

function mergedPassivePerception(member, sheet, scores) {
  if (numberOrNull(member.pp) != null) return member.pp;
  if (numberOrNull(member.sag) != null) return 10 + abilityModifier(member.sag);
  if (numberOrNull(sheet.pp) != null) return sheet.pp;
  return scores.sag ? 10 + abilityModifier(scores.sag) : null;
}

function playerFromPartyMember(member, sheet, name) {
  const maxHitPoints = numberOrNull(member.pvmax) != null ? member.pvmax : sheet.pvmax || 0;
  const scores = mergedAbilityScores(member, sheet);
  const enteredByGameMaster = numberOrNull(member.pvmax) != null;
  return {
    nom: name, cl: member.cl || sheet.cl || '', car: scores, niveau: Math.min(20, Math.max(1, numberOrNull(member.niveau) || sheet.niveau || 1)),
    pvmax: maxHitPoints, pv: enteredByGameMaster || sheet.pv == null ? maxHitPoints : sheet.pv,
    init: mergedInitiative(member, sheet, scores), ca: numberOrNull(member.ca) != null ? member.ca : numberOrNull(sheet.ca),
    pp: mergedPassivePerception(member, sheet, scores), mj: true
  };
}

function players() {
  const sheets = charactersFromSheets();
  const partyPlayers = [];
  partyMembers().forEach(member => {
    const name = String(member.nom || '').trim();
    if (!name) return;
    partyPlayers.push(playerFromPartyMember(member, takeMatchingSheet(sheets, name), name));
  });
  return partyPlayers.concat(sheets);
}

function activeCharacterIsGameMaster() {
  const character = window.Persos && Persos.current();
  return !!character && isGameMasterName(character.nom);
}

function sendToCombatTracker(monsters) {
  try {
    const queue = JSON.parse(localStorage.getItem(COMBAT_QUEUE_STORAGE_KEY) || '[]');
    localStorage.setItem(COMBAT_QUEUE_STORAGE_KEY, JSON.stringify(queue.concat(monsters)));
    return true;
  } catch (error) {
    return false;
  }
}

function receiveForCombatTracker() {
  try {
    const queue = JSON.parse(localStorage.getItem(COMBAT_QUEUE_STORAGE_KEY) || '[]');
    localStorage.removeItem(COMBAT_QUEUE_STORAGE_KEY);
    return Array.isArray(queue) ? queue : [];
  } catch (error) {
    return [];
  }
}

window.Monstres = {
  load: loadBestiary, get: name => monstersByName[name], all: () => bestiary || [], block: statBlockHtml,
  esc: escapeHtml, norm: normalize, col: creatureColor, tbase: baseCreatureType, xp: experiencePoints, fpl: challengeLabel,
  pv: parseHitPoints, rollPV: rollHitPoints, ca: armorClass, dex: dexterityModifier, init: initiativeBonus, rnd: randomBelow,
  joueurs: players, fiches: charactersFromSheets, CAR: ABILITY_KEYS, cmod: abilityModifier, groupe: partyMembers, setGroupe: saveParty,
  estMJ: activeCharacterIsGameMaster, BUDGET: XP_BUDGET_BY_LEVEL, envoyer: sendToCombatTracker, recevoir: receiveForCombatTracker
};
})();
