'use strict';

const MESSAGE_DURATION_MS = 3500;
const MAXIMUM_LEVEL = 20;
const MAXIMUM_ABILITY_SCORE = 20;
const POINT_BUY_BUDGET = 27;
const POINT_BUY_MINIMUM = 8;
const POINT_BUY_MAXIMUM = 15;
const LANGUAGES_TO_CHOOSE = 2;
const BACKGROUND_GOLD = 50;
const SUBCLASS_LEVEL = 3;
const EPIC_BOON_LEVEL = 19;

const ABILITIES = [
  { key: 'for', name: 'Force', color: '#c8402f' },
  { key: 'dex', name: 'Dextérité', color: '#2e9e5b' },
  { key: 'con', name: 'Constitution', color: '#d8791a' },
  { key: 'int', name: 'Intelligence', color: '#2f6fd0' },
  { key: 'sag', name: 'Sagesse', color: '#7a4fc4' },
  { key: 'cha', name: 'Charisme', color: '#d6458e' }
];
const ABILITY_NAMES = Object.fromEntries(ABILITIES.map(ability => [ability.key, ability.name]));
const ABILITY_KEYS = ABILITIES.map(ability => ability.key);

const SKILL_NAMES = ['Acrobaties', 'Arcanes', 'Athlétisme', 'Discrétion', 'Dressage', 'Escamotage', 'Histoire', 'Intimidation', 'Intuition', 'Investigation', 'Médecine', 'Nature', 'Perception', 'Persuasion', 'Religion', 'Représentation', 'Supercherie', 'Survie'];
const ANY_SKILL = '*';

const MUSICAL_INSTRUMENT_PLACEHOLDER = '@instrument';
const DEFAULT_MUSICAL_INSTRUMENT = 'Luth';

const item = (name, quantity = 1) => ({ name, quantity });
const goldOnly = gold => ({ label: gold + ' po', items: [], gold });

const CLASSES = {
  'Barbare': {
    hitDie: 12, primaryAbilities: ['for'], savingThrows: ['for', 'con'], skillCount: 2,
    skillChoices: ['Athlétisme', 'Dressage', 'Intimidation', 'Nature', 'Perception', 'Survie'],
    recommendedScores: [15, 13, 14, 10, 12, 8],
    description: 'Guerrier sauvage porté par sa Rage, très résistant au corps à corps.',
    equipmentOptions: [
      { label: 'Grande hache, 4 hachettes, paquetage d’explorateur et 15 po', items: [item('Grande hache'), item('Hachette', 4), item('Paquetage d’explorateur')], gold: 15 },
      goldOnly(75)
    ]
  },
  'Barde': {
    hitDie: 8, primaryAbilities: ['cha'], savingThrows: ['dex', 'cha'], skillCount: 3,
    skillChoices: ANY_SKILL,
    recommendedScores: [8, 14, 12, 13, 10, 15],
    description: 'Artiste dont la musique et les mots tissent la magie ; inspire ses alliés.',
    equipmentOptions: [
      { label: 'Armure de cuir, 2 dagues, un instrument de musique, paquetage d’artiste et 19 po', items: [item('Armure de cuir'), item('Dague', 2), item(MUSICAL_INSTRUMENT_PLACEHOLDER), item('Paquetage d’artiste')], gold: 19 },
      goldOnly(90)
    ]
  },
  'Clerc': {
    hitDie: 8, primaryAbilities: ['sag'], savingThrows: ['sag', 'cha'], skillCount: 2,
    skillChoices: ['Histoire', 'Intuition', 'Médecine', 'Persuasion', 'Religion'],
    recommendedScores: [14, 8, 13, 10, 15, 12],
    description: 'Prêtre qui canalise le pouvoir de sa divinité : soins, protection et colère divine.',
    equipmentOptions: [
      { label: 'Chemise de mailles, bouclier, masse d’armes, symbole sacré, paquetage de prêtre et 7 po', items: [item('Chemise de mailles'), item('Bouclier'), item('Masse d’armes'), item('Symbole sacré (amulette)'), item('Paquetage de prêtre')], gold: 7 },
      goldOnly(110)
    ]
  },
  'Druide': {
    hitDie: 8, primaryAbilities: ['sag'], savingThrows: ['int', 'sag'], skillCount: 2,
    skillChoices: ['Arcanes', 'Dressage', 'Intuition', 'Médecine', 'Nature', 'Perception', 'Religion', 'Survie'],
    recommendedScores: [8, 12, 14, 13, 15, 10],
    description: 'Gardien de la nature qui en tire sa magie et peut prendre une forme animale.',
    equipmentOptions: [
      { label: 'Armure de cuir, bouclier, serpe, focaliseur druidique, paquetage d’explorateur, matériel d’herboriste et 9 po', items: [item('Armure de cuir'), item('Bouclier'), item('Serpe'), item('Focalisation druidique (houx)'), item('Paquetage d’explorateur'), item('Matériel d’herboriste')], gold: 9 },
      goldOnly(50)
    ]
  },
  'Ensorceleur': {
    hitDie: 6, primaryAbilities: ['cha'], savingThrows: ['con', 'cha'], skillCount: 2,
    skillChoices: ['Arcanes', 'Intimidation', 'Intuition', 'Persuasion', 'Religion', 'Supercherie'],
    recommendedScores: [10, 13, 14, 8, 12, 15],
    description: 'La magie coule dans ses veines ; il la façonne grâce à la métamagie.',
    equipmentOptions: [
      { label: 'Lance, 2 dagues, focaliseur arcanique (cristal), paquetage d’exploration souterraine et 28 po', items: [item('Lance'), item('Dague', 2), item('Focalisation arcanique (cristal)'), item('Paquetage d’exploration souterraine')], gold: 28 },
      goldOnly(50)
    ]
  },
  'Guerrier': {
    hitDie: 10, primaryAbilities: ['for', 'dex'], savingThrows: ['for', 'con'], skillCount: 2,
    skillChoices: ['Acrobaties', 'Athlétisme', 'Dressage', 'Histoire', 'Intimidation', 'Intuition', 'Perception', 'Persuasion', 'Survie'],
    recommendedScores: [15, 14, 13, 8, 10, 12],
    description: 'Maître des armes et des armures, polyvalent et solide.',
    equipmentOptions: [
      { label: 'Cotte de mailles, épée à deux mains, fléau d’armes, 8 javelines, paquetage d’exploration souterraine et 4 po', items: [item('Cotte de mailles'), item('Épée à deux mains'), item('Fléau d’armes'), item('Javeline', 8), item('Paquetage d’exploration souterraine')], gold: 4 },
      { label: 'Armure de cuir clouté, cimeterre, épée courte, arc long, 20 flèches, carquois, paquetage d’exploration souterraine et 11 po', items: [item('Armure de cuir clouté'), item('Cimeterre'), item('Épée courte'), item('Arc long'), item('Flèches (20)'), item('Carquois'), item('Paquetage d’exploration souterraine')], gold: 11 },
      goldOnly(155)
    ]
  },
  'Magicien': {
    hitDie: 6, primaryAbilities: ['int'], savingThrows: ['int', 'sag'], skillCount: 2,
    skillChoices: ['Arcanes', 'Histoire', 'Intuition', 'Investigation', 'Médecine', 'Nature', 'Religion'],
    recommendedScores: [8, 12, 13, 15, 14, 10],
    description: 'Érudit de la magie qui apprend ses sorts dans un grimoire.',
    equipmentOptions: [
      { label: '2 dagues, focaliseur arcanique (bâton), robe, livre de sorts, paquetage d’érudit et 5 po', items: [item('Dague', 2), item('Focalisation arcanique (bâton)'), item('Robe'), item('Livre de sorts'), item('Paquetage d’érudit')], gold: 5 },
      goldOnly(55)
    ]
  },
  'Moine': {
    hitDie: 8, primaryAbilities: ['dex', 'sag'], savingThrows: ['for', 'dex'], skillCount: 2,
    skillChoices: ['Acrobaties', 'Athlétisme', 'Discrétion', 'Histoire', 'Intuition', 'Religion'],
    recommendedScores: [12, 15, 13, 10, 14, 8],
    description: 'Combattant à mains nues, rapide et discipliné, qui puise dans sa Concentration.',
    equipmentOptions: [
      { label: 'Lance, 5 dagues, outils d’artisan ou instrument choisi, paquetage d’explorateur et 11 po', items: [item('Lance'), item('Dague', 5), item('Paquetage d’explorateur')], gold: 11 },
      goldOnly(50)
    ]
  },
  'Occultiste': {
    hitDie: 8, primaryAbilities: ['cha'], savingThrows: ['sag', 'cha'], skillCount: 2,
    skillChoices: ['Arcanes', 'Histoire', 'Intimidation', 'Investigation', 'Nature', 'Religion', 'Supercherie'],
    recommendedScores: [8, 14, 13, 12, 10, 15],
    description: 'Lié par un pacte à une puissance de l’au-delà qui lui accorde ses dons.',
    equipmentOptions: [
      { label: 'Armure de cuir, serpe, 2 dagues, focaliseur arcanique (orbe), livre de savoir occulte, paquetage d’érudit et 15 po', items: [item('Armure de cuir'), item('Serpe'), item('Dague', 2), item('Focalisation arcanique (orbe)'), item('Livre'), item('Paquetage d’érudit')], gold: 15 },
      goldOnly(100)
    ]
  },
  'Paladin': {
    hitDie: 10, primaryAbilities: ['for', 'cha'], savingThrows: ['sag', 'cha'], skillCount: 2,
    skillChoices: ['Athlétisme', 'Intimidation', 'Intuition', 'Médecine', 'Persuasion', 'Religion'],
    recommendedScores: [15, 10, 13, 8, 12, 14],
    description: 'Guerrier sacré lié par un serment ; frappe divine et imposition des mains.',
    equipmentOptions: [
      { label: 'Cotte de mailles, bouclier, épée longue, 6 javelines, symbole sacré, paquetage de prêtre et 9 po', items: [item('Cotte de mailles'), item('Bouclier'), item('Épée longue'), item('Javeline', 6), item('Symbole sacré (emblème)'), item('Paquetage de prêtre')], gold: 9 },
      goldOnly(150)
    ]
  },
  'Rôdeur': {
    hitDie: 10, primaryAbilities: ['dex', 'sag'], savingThrows: ['for', 'dex'], skillCount: 3,
    skillChoices: ['Athlétisme', 'Discrétion', 'Dressage', 'Intuition', 'Investigation', 'Nature', 'Perception', 'Survie'],
    recommendedScores: [12, 15, 13, 8, 14, 10],
    description: 'Chasseur et pisteur des terres sauvages, à l’arc comme à la lame.',
    equipmentOptions: [
      { label: 'Armure de cuir clouté, cimeterre, épée courte, arc long, 20 flèches, carquois, focaliseur druidique, paquetage d’explorateur et 7 po', items: [item('Armure de cuir clouté'), item('Cimeterre'), item('Épée courte'), item('Arc long'), item('Flèches (20)'), item('Carquois'), item('Focalisation druidique (houx)'), item('Paquetage d’explorateur')], gold: 7 },
      goldOnly(150)
    ]
  },
  'Roublard': {
    hitDie: 8, primaryAbilities: ['dex'], savingThrows: ['dex', 'int'], skillCount: 4, expertiseCount: 2,
    skillChoices: ['Acrobaties', 'Athlétisme', 'Discrétion', 'Escamotage', 'Intimidation', 'Intuition', 'Investigation', 'Perception', 'Persuasion', 'Représentation', 'Supercherie'],
    recommendedScores: [12, 15, 13, 14, 10, 8],
    description: 'Spécialiste de la discrétion et des attaques sournoises, aux multiples talents.',
    equipmentOptions: [
      { label: 'Armure de cuir, 2 dagues, épée courte, arc court, 20 flèches, carquois, outils de voleur, paquetage de cambrioleur et 8 po', items: [item('Armure de cuir'), item('Dague', 2), item('Épée courte'), item('Arc court'), item('Flèches (20)'), item('Carquois'), item('Outils de voleur'), item('Paquetage de cambrioleur')], gold: 8 },
      goldOnly(100)
    ]
  },
  'Artificier': {
    hitDie: 8, primaryAbilities: ['int'], savingThrows: ['con', 'int'], skillCount: 2,
    skillChoices: ['Arcanes', 'Escamotage', 'Histoire', 'Investigation', 'Médecine', 'Nature', 'Perception'],
    recommendedScores: [8, 14, 13, 15, 12, 10],
    description: 'Inventeur qui insuffle la magie dans des objets et des infusions.',
    equipmentOptions: [
      { label: 'Armure de cuir clouté, dague, outils de voleur, outils de bricoleur, paquetage d’exploration souterraine et 16 po', items: [item('Armure de cuir clouté'), item('Dague'), item('Outils de voleur'), item('Outils de bricoleur'), item('Paquetage d’exploration souterraine')], gold: 16 },
      goldOnly(150)
    ]
  },
  'Chasseur de sang': {
    hitDie: 10, primaryAbilities: ['for', 'dex', 'int'], savingThrows: ['dex', 'int'], skillCount: 3,
    skillChoices: ['Acrobaties', 'Arcanes', 'Athlétisme', 'Histoire', 'Intuition', 'Investigation', 'Religion', 'Survie'],
    recommendedScores: [15, 12, 14, 13, 10, 8],
    description: 'Traqueur de monstres qui sacrifie sa vitalité pour des rites de sang (contenu non officiel, Critical Role).',
    equipmentOptions: [
      { label: 'Armure de cuir clouté, épée longue, arbalète légère, 20 carreaux, étui à carreaux, outils d’alchimiste, paquetage d’explorateur et 10 po', items: [item('Armure de cuir clouté'), item('Épée longue'), item('Arbalète légère'), item('Carreaux (20)'), item('Étui à carreaux'), item('Outils d’alchimiste'), item('Paquetage d’explorateur')], gold: 10 },
      goldOnly(100)
    ]
  }
};

const SPELLCASTING_CLASSES = ['Barde', 'Clerc', 'Druide', 'Ensorceleur', 'Magicien', 'Occultiste', 'Artificier', 'Paladin', 'Rôdeur'];
const MUSICAL_INSTRUMENTS = ['Luth', 'Lyre', 'Flûte', 'Flûte de Pan', 'Cor', 'Tambour', 'Dulcimer', 'Cornemuse', 'Chalumeau', 'Viole'];
const COMMON_LANGUAGES = ['Commun des signes', 'Draconique', 'Elfique', 'Géant', 'Gnome', 'Gobelin', 'Halfelin', 'Nain', 'Orc'];
const ALIGNMENTS = ['Loyal Bon', 'Neutre Bon', 'Chaotique Bon', 'Loyal Neutre', 'Neutre', 'Chaotique Neutre', 'Loyal Mauvais', 'Neutre Mauvais', 'Chaotique Mauvais'];
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

const BONUS_MODE_TWO_AND_ONE = '+2 / +1';
const BONUS_MODE_THREE_ONES = '+1 / +1 / +1';
const BONUS_MODES = [BONUS_MODE_TWO_AND_ONE, BONUS_MODE_THREE_ONES];

const METHOD_STANDARD_ARRAY = 'std';
const METHOD_POINT_BUY = 'pb';
const METHOD_ROLL = 'roll';
const SCORE_METHODS = [[METHOD_STANDARD_ARRAY, 'Tableau standard'], [METHOD_POINT_BUY, 'Achat de points'], [METHOD_ROLL, 'Jets de dés']];

const BACKGROUND_EQUIPMENT_GOLD = 'po';
const BACKGROUND_EQUIPMENT_KIT = 'lot';

const ABILITY_SCORE_IMPROVEMENT_FEAT_ID = 'asi';
const HUMAN_SPECIES = 'Humain';
const PLAYERS_HANDBOOK_2024 = 'Manuel des joueurs 2024';
const BASE_FEAT_LEVELS = [4, 8, 12, 16, 19];
const EXTRA_FEAT_LEVELS_BY_CLASS = { 'Guerrier': [6, 14], 'Roublard': [10] };
const THIRD_CASTER_SUBCLASS_PATTERN = 'occult|arcanique';

const DRAFT_STORAGE_KEY = 'dnd_creation_brouillon';

let speciesData = null;
let backgroundData = null;
let featList = null;
let subclassData = null;
let classData = null;

const signed = number => (number >= 0 ? '+' : '') + number;
const frenchDecimal = number => String(number).replace('.', ',');
const abilityModifier = score => Math.floor((score - 10) / 2);
const showCreationMessage = text => showMessage(text, MESSAGE_DURATION_MS);

function defaultScoreAssignment() {
  return { for: 0, dex: 1, con: 2, int: 3, sag: 4, cha: 5 };
}

function createBlankDraft() {
  return {
    step: 0, max: 0, niv: 1, sc: '', asi: {}, cl: '', bg: '', bgch: { mode: BONUS_MODE_TWO_AND_ONE }, feat: {}, esp: '', lig: '', spch: {}, hfeat: '', hfeatch: {},
    meth: METHOD_STANDARD_ARRAY, pool: STANDARD_ARRAY.slice(), as: defaultScoreAssignment(), pb: { for: 8, dex: 8, con: 8, int: 8, sag: 8, cha: 8 }, rolls: null,
    sk: [], ex: [], eq: 0, bgeq: BACKGROUND_EQUIPMENT_GOLD, instr: DEFAULT_MUSICAL_INSTRUMENT, langs: [], nom: '', align: '', done: false
  };
}

function loadSavedDraft() {
  try {
    const savedDraft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY));
    if (savedDraft && typeof savedDraft === 'object') return Object.assign(createBlankDraft(), savedDraft, { done: false });
  } catch (error) {
    return createBlankDraft();
  }
  return createBlankDraft();
}

let draft = loadSavedDraft();

function saveDraft() {
  try { localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft)); } catch (error) { return; }
}

function forgetSavedDraft() {
  try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch (error) { return; }
}

const STEPS = [
  { title: 'Classe', render: renderClassStep },
  { title: 'Historique', render: renderBackgroundStep },
  { title: 'Espèce', render: renderSpeciesStep },
  { title: 'Caractéristiques', render: renderAbilitiesStep },
  { title: 'Compétences', render: renderSkillsStep },
  { title: 'Équipement et langues', render: renderEquipmentStep },
  { title: 'Résumé', render: renderSummaryStep }
];
const LAST_STEP_INDEX = STEPS.length - 1;

const selectedClass = () => CLASSES[draft.cl];
const selectedBackground = () => backgroundData && backgroundData[draft.bg];
const selectedSpecies = () => speciesData && speciesData[draft.esp];
const characterLevel = () => Math.min(MAXIMUM_LEVEL, Math.max(1, parseInt(draft.niv) || 1));
const findFeat = featId => (featList || []).find(feat => feat.id === featId);
const featEffects = feat => feat.fx || [];
const effectsOfType = (effects, type) => effects.filter(effect => effect.t === type);
const levelChoicesKey = level => 'ac' + level;
const isHuman = () => draft.esp === HUMAN_SPECIES;
const usesPointBuy = () => draft.meth === METHOD_POINT_BUY;
const usesRolls = () => draft.meth === METHOD_ROLL;
const awaitsFirstRoll = () => usesRolls() && !draft.rolls;
const subclassIsDue = () => characterLevel() >= SUBCLASS_LEVEL;

function subclassNames() {
  return subclassData && subclassData[draft.cl] ? Object.keys(subclassData[draft.cl]) : [];
}

function selectedLineage() {
  const species = selectedSpecies();
  return species && species.lignage ? species.lignage.opts.find(option => option.v === draft.lig) : null;
}

function speciesEffects() {
  const species = selectedSpecies();
  if (!species) return [];
  const lineage = selectedLineage() || {};
  return [...species.fx, ...(lineage.fx || [])];
}

function featLevels() {
  const classExtraLevels = EXTRA_FEAT_LEVELS_BY_CLASS[draft.cl] || [];
  return [...BASE_FEAT_LEVELS, ...classExtraLevels].filter(level => level <= characterLevel()).sort((first, second) => first - second);
}

function defaultLevelFeatChoices(featId) {
  if (featId !== ABILITY_SCORE_IMPROVEMENT_FEAT_ID) return {};
  const mainAbility = (selectedClass() || { primaryAbilities: ['for'] }).primaryAbilities[0];
  return { a: mainAbility, b: mainAbility };
}

function levelFeat(level) {
  const featId = draft.asi[level] || ABILITY_SCORE_IMPROVEMENT_FEAT_ID;
  return { feat: findFeat(featId), choices: draft[levelChoicesKey(level)] || defaultLevelFeatChoices(featId) };
}

function backgroundFeatChoices(background) {
  return Object.assign({}, background.don_ch || {}, draft.feat);
}

function acquiredFeats() {
  const feats = [];
  const background = selectedBackground();
  if (background && findFeat(background.don)) feats.push({ feat: findFeat(background.don), choices: backgroundFeatChoices(background) });
  if (isHuman() && findFeat(draft.hfeat)) feats.push({ feat: findFeat(draft.hfeat), choices: draft.hfeatch });
  featLevels().forEach(level => {
    const earnedFeat = levelFeat(level);
    if (earnedFeat.feat) feats.push(earnedFeat);
  });
  return feats;
}

function scorePool() {
  return usesRolls() && draft.rolls ? draft.rolls : STANDARD_ARRAY;
}

function baseScores() {
  if (usesPointBuy()) return Object.fromEntries(ABILITY_KEYS.map(key => [key, draft.pb[key]]));
  const pool = scorePool();
  return Object.fromEntries(ABILITY_KEYS.map(key => [key, pool[draft.as[key]]]));
}

function addBackgroundBonuses(addBonus) {
  const background = selectedBackground();
  if (!background) return;
  if (draft.bgch.mode === BONUS_MODE_THREE_ONES) {
    background.carac.forEach(key => addBonus(key, 1));
    return;
  }
  addBonus(draft.bgch.a2, 2);
  if (draft.bgch.a1 !== draft.bgch.a2) addBonus(draft.bgch.a1, 1);
}

function abilityBonuses() {
  const bonuses = {};
  const addBonus = (key, amount) => { if (key) bonuses[key] = (bonuses[key] || 0) + amount; };
  addBackgroundBonuses(addBonus);
  effectsOfType(speciesEffects(), 'carac').forEach(effect => addBonus(effect.v || draft.spch[effect.c], effect.n || 1));
  acquiredFeats().forEach(({ feat, choices }) => {
    effectsOfType(featEffects(feat), 'carac').forEach(effect => addBonus(effect.v || choices[effect.c], effect.n || 1));
  });
  return bonuses;
}

function finalScores() {
  const base = baseScores();
  const bonuses = abilityBonuses();
  return Object.fromEntries(ABILITY_KEYS.map(key => [key, Math.min(MAXIMUM_ABILITY_SCORE, base[key] + (bonuses[key] || 0))]));
}

function grantedSkills() {
  const sourceBySkill = {};
  const grant = (skill, source) => { if (skill && !sourceBySkill[skill]) sourceBySkill[skill] = source; };
  const background = selectedBackground();
  if (background) background.comp.forEach(skill => grant(skill, 'historique'));
  effectsOfType(speciesEffects(), 'comp').forEach(effect => grant(effect.v || draft.spch[effect.c], 'espèce'));
  acquiredFeats().forEach(({ feat, choices }) => {
    effectsOfType(featEffects(feat), 'comp').forEach(effect => grant(effect.v || choices[effect.c], feat.nom));
  });
  return sourceBySkill;
}

function hitPointsPerLevelBonus() {
  const featEffectList = acquiredFeats().flatMap(({ feat }) => featEffects(feat));
  return effectsOfType([...speciesEffects(), ...featEffectList], 'pv_niv').reduce((total, effect) => total + effect.n, 0);
}

function averageHitPointsPerLevel(hitDie) {
  return hitDie / 2 + 1;
}

function hitPoints() {
  const characterClass = selectedClass();
  if (!characterClass) return 0;
  const level = characterLevel();
  const constitutionModifier = abilityModifier(finalScores().con);
  const firstLevelHitPoints = characterClass.hitDie + constitutionModifier;
  const laterLevelsHitPoints = (level - 1) * Math.max(1, averageHitPointsPerLevel(characterClass.hitDie) + constitutionModifier);
  return Math.max(1, firstLevelHitPoints + laterLevelsHitPoints + hitPointsPerLevelBonus() * level);
}

function pointBuySpent() {
  return ABILITY_KEYS.reduce((total, key) => total + POINT_BUY_COST[draft.pb[key]], 0);
}

function applyBackgroundBonusDefaults() {
  const background = selectedBackground();
  if (!background) return;
  const primaryAbilities = (selectedClass() ? selectedClass().primaryAbilities : []).filter(key => background.carac.includes(key));
  const preferredOrder = [...primaryAbilities, ...background.carac.filter(key => !primaryAbilities.includes(key))];
  const choices = draft.bgch;
  if (!background.carac.includes(choices.a2)) choices.a2 = preferredOrder[0];
  if (!background.carac.includes(choices.a1) || choices.a1 === choices.a2) choices.a1 = preferredOrder.find(key => key !== choices.a2);
}

function applyRecommendedScores() {
  const characterClass = selectedClass();
  if (!characterClass) return;
  const pool = scorePool();
  const recommendedScore = key => characterClass.recommendedScores[ABILITY_KEYS.indexOf(key)];
  const abilitiesByPriority = ABILITY_KEYS.slice().sort((first, second) => recommendedScore(second) - recommendedScore(first));
  const poolIndexesByValue = pool.map((value, index) => index).sort((first, second) => pool[second] - pool[first]);
  abilitiesByPriority.forEach((key, rank) => { draft.as[key] = poolIndexesByValue[rank]; });
  if (usesPointBuy()) abilitiesByPriority.forEach((key, rank) => { draft.pb[key] = STANDARD_ARRAY[rank]; });
}

function abilityList(keys, separator) {
  return keys.map(key => ABILITY_NAMES[key]).join(separator);
}

function optionButton(pressed, action, value, title, subtitle) {
  return `<button type="button" class="opt" aria-pressed="${pressed}" data-act="${action}" data-v="${escapeHtml(value)}"><b>${escapeHtml(title)}</b>${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ''}</button>`;
}

function segmentButton(action, value, label, pressed) {
  return `<button type="button" data-act="${action}" data-v="${value}" aria-pressed="${pressed}">${label}</button>`;
}

function selectField(path, options, currentValue, placeholder) {
  const optionTags = options.map(option => {
    const [value, label] = Array.isArray(option) ? option : [option, option];
    return `<option value="${escapeHtml(value)}"${value === currentValue ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
  return `<select data-set="${path}"><option value="">${escapeHtml(placeholder || '—')}</option>${optionTags}</select>`;
}

function labelledField(caption, fieldHtml, style) {
  return `<label${style ? ` style="${style}"` : ''}><small>${escapeHtml(caption)}</small>${fieldHtml}</label>`;
}

function choiceOptions(choice) {
  if (choice.t === 'carac') return choice.opts.map(key => [key, ABILITY_NAMES[key]]);
  if (choice.t === 'comp') return choice.opts || SKILL_NAMES;
  return choice.opts.map(option => typeof option === 'string' ? option : option.v);
}

function choiceField(path, choice, currentValue) {
  const fieldPath = path + '.' + choice.id;
  if (choice.t === 'texte') return labelledField(choice.lbl, `<input type="text" data-set="${fieldPath}" value="${escapeHtml(currentValue || '')}">`);
  return labelledField(choice.lbl, selectField(fieldPath, choiceOptions(choice), currentValue));
}

function choiceFields(path, choices, currentValues) {
  return choices.map(choice => choiceField(path, choice, currentValues[choice.id])).join('');
}

function originFeatBox(feat, path, choices) {
  const choicesHtml = feat.choix.length ? `<div class="chs">${choiceFields(path, feat.choix, choices)}</div>` : '';
  return `<div class="box"><h3>Don d’origine : ${escapeHtml(feat.nom)}</h3><p style="white-space:pre-line">${escapeHtml(feat.desc)}</p>${choicesHtml}</div>`;
}

function levelSelectHtml() {
  const levelOptions = Array.from({ length: MAXIMUM_LEVEL }, (unused, index) => {
    const level = index + 1;
    return `<option value="${level}"${level === characterLevel() ? ' selected' : ''}>Niveau ${level}</option>`;
  }).join('');
  return `<div class="chs"><label style="flex:0 1 180px;min-width:140px"><small>Niveau de départ</small><select data-set="niv">${levelOptions}</select></label></div>`;
}

function classButtonsHtml() {
  return Object.entries(CLASSES).map(([className, characterClass]) => {
    return optionButton(draft.cl === className, 'cl', className, className, 'd' + characterClass.hitDie + ' · ' + abilityList(characterClass.primaryAbilities, ' / '));
  }).join('');
}

function classSkillsDescription(characterClass) {
  const choices = characterClass.skillChoices === ANY_SKILL ? 'parmi toutes' : 'parmi ' + characterClass.skillChoices.join(', ');
  return `${characterClass.skillCount} au choix ${choices}`;
}

function classDetailsHtml(characterClass) {
  const hitDie = characterClass.hitDie;
  const expertise = characterClass.expertiseCount ? `<li><b>Expertise :</b> ${characterClass.expertiseCount} compétences maîtrisées au choix</li>` : '';
  return `<div class="box"><h3>${escapeHtml(draft.cl)}</h3><p>${escapeHtml(characterClass.description)}</p><ul>
   <li><b>Caractéristique principale :</b> ${abilityList(characterClass.primaryAbilities, ', ')}</li>
   <li><b>Dé de vie :</b> d${hitDie} (au niveau 1 : ${hitDie} + modificateur de Constitution points de vie ; ensuite ${averageHitPointsPerLevel(hitDie)} + modificateur de Constitution par niveau)</li>
   <li><b>Jets de sauvegarde :</b> ${abilityList(characterClass.savingThrows, ' et ')}</li>
   <li><b>Compétences :</b> ${classSkillsDescription(characterClass)}</li>${expertise}</ul></div>`;
}

function subclassChoiceHtml() {
  const sortedSubclasses = subclassNames().sort((first, second) => first.localeCompare(second));
  return `<div class="box"><h3>Sous-classe (niveau 3)</h3><p>Ton personnage a atteint le niveau 3 : choisis sa sous-classe. Ses capacités s’afficheront sur la fiche.</p><div class="chs">${labelledField('Sous-classe de ' + draft.cl, selectField('sc', sortedSubclasses, draft.sc, 'Choisir…'))}</div></div>`;
}

function renderClassStep() {
  const characterClass = selectedClass();
  const laterLevelsNote = characterLevel() > 1 ? '<p class="lbl">Les points de vie des niveaux après le premier utilisent la valeur moyenne du dé de vie. Les dons gagnés en montant de niveau se choisissent à l’étape Caractéristiques.</p>' : '';
  let html = `<h2>1. Choisis ton niveau et ta classe</h2><p class="lead">La classe décide de ce que fait ton personnage en aventure : combattre, lancer des sorts, se faufiler… Elle donne les dés de vie, les jets de sauvegarde maîtrisés et une partie des compétences.</p>
   ${levelSelectHtml()}
   ${laterLevelsNote}<div class="opts">${classButtonsHtml()}</div>`;
  if (characterClass) html += classDetailsHtml(characterClass);
  if (characterClass && subclassIsDue() && subclassNames().length) html += subclassChoiceHtml();
  return html;
}

function backgroundButtonsHtml() {
  return Object.entries(backgroundData).map(([backgroundName, background]) => {
    return optionButton(draft.bg === backgroundName, 'bg', backgroundName, backgroundName, background.carac.map(key => ABILITY_NAMES[key].slice(0, 3)).join(', '));
  }).join('');
}

function backgroundBonusSelectsHtml(background) {
  const abilityOptions = keys => keys.map(key => [key, ABILITY_NAMES[key]]);
  const twoPointsField = labelledField('+2 en', selectField('bgch.a2', abilityOptions(background.carac), draft.bgch.a2));
  const onePointField = labelledField('+1 en', selectField('bgch.a1', abilityOptions(background.carac.filter(key => key !== draft.bgch.a2)), draft.bgch.a1));
  return `<div class="chs">${twoPointsField}${onePointField}</div>`;
}

function backgroundDetailsHtml(background, bonusMode) {
  const originFeat = findFeat(background.don);
  const modeButtons = BONUS_MODES.map(mode => segmentButton('mode', mode, mode, mode === bonusMode)).join('');
  const advice = selectedClass() ? `<p class="lbl">Conseil : mets le +2 dans ${abilityList(selectedClass().primaryAbilities, ' ou ')} si c’est possible.</p>` : '';
  return `<div class="box"><h3>${escapeHtml(draft.bg)}${VO.btn('historiques', draft.bg, draft.bg)}</h3><p>${escapeHtml(background.desc)}</p><ul>
   <li><b>Compétences :</b> ${background.comp.join(', ')}</li><li><b>Outil :</b> ${escapeHtml(background.outil)}</li><li><b>Don d’origine :</b> ${escapeHtml(originFeat ? originFeat.nom : background.don)}</li></ul>
   <p class="lbl">Bonus de caractéristiques (${abilityList(background.carac, ', ')})</p>
   <div class="seg">${modeButtons}</div>
   ${bonusMode === BONUS_MODE_TWO_AND_ONE ? backgroundBonusSelectsHtml(background) : ''}
   ${advice}</div>`;
}

function renderBackgroundStep() {
  const background = selectedBackground();
  let html = `<h2>2. Choisis ton historique</h2><p class="lead">L’historique raconte ce que faisait ton personnage avant l’aventure. Dans les règles 2024, il donne +2 / +1 (ou +1 à trois) à des caractéristiques, deux compétences, un outil et un don d’origine.</p><div class="opts">${backgroundButtonsHtml()}</div>`;
  if (!background) return html;
  html += backgroundDetailsHtml(background, draft.bgch.mode || BONUS_MODE_TWO_AND_ONE);
  const originFeat = findFeat(background.don);
  if (originFeat) html += originFeatBox(originFeat, 'feat', backgroundFeatChoices(background));
  return html;
}

function speciesTraitsHtml(species) {
  return species.traits.map(trait => `<li><b>${escapeHtml(trait.nom)}</b> — ${escapeHtml(trait.desc).replace(/\n/g, '<br>')}</li>`).join('');
}

function lineageChoiceHtml(species) {
  const lineage = selectedLineage();
  const lineageSelect = labelledField(species.lignage.lbl, selectField('lig', species.lignage.opts.map(option => option.v), draft.lig, 'Choisir…'));
  return `<div class="chs">${lineageSelect}</div>${lineage ? `<p>${escapeHtml(lineage.txt || '')}</p>` : ''}`;
}

function humanVersatileFeatHtml() {
  const originFeats = (featList || []).filter(feat => feat.cat === 'Origine');
  let html = `<div class="box"><h3>Polyvalent : un don d’origine en plus</h3><div class="chs">${labelledField('Don d’origine', selectField('hfeat', originFeats.map(feat => [feat.id, feat.nom]), draft.hfeat, 'Choisir…'))}</div></div>`;
  const chosenFeat = findFeat(draft.hfeat);
  if (chosenFeat) html += originFeatBox(chosenFeat, 'hfeatch', draft.hfeatch);
  return html;
}

function speciesDetailsHtml() {
  const species = selectedSpecies();
  if (!species) return '';
  let html = `<div class="box"><h3>${escapeHtml(draft.esp)}</h3><p>Taille : ${escapeHtml(species.taille)} · Vitesse : ${frenchDecimal(species.vit)} m${species.src ? ' · ' + escapeHtml(species.src) : ''}</p><ul>${speciesTraitsHtml(species)}</ul>`;
  if (species.lignage) html += lineageChoiceHtml(species);
  if (species.choix.length) html += `<div class="chs">${choiceFields('spch', species.choix, draft.spch)}</div>`;
  html += '</div>';
  if (isHuman()) html += humanVersatileFeatHtml();
  return html;
}

function speciesGridHtml(speciesNames, detailsHtml) {
  const buttons = speciesNames.map(name => {
    const species = speciesData[name];
    return optionButton(draft.esp === name, 'esp', name, name, species.taille + ' · ' + frenchDecimal(species.vit) + ' m');
  }).join('');
  return `<div class="opts">${buttons}</div>` + (speciesNames.includes(draft.esp) ? detailsHtml : '');
}

function isCoreRulebookSpecies(name) {
  const source = speciesData[name].src;
  return source === PLAYERS_HANDBOOK_2024 || !source;
}

function speciesNamesBySource(names) {
  const namesBySource = {};
  names.forEach(name => {
    const source = speciesData[name].src;
    (namesBySource[source] = namesBySource[source] || []).push(name);
  });
  return namesBySource;
}

function supplementSpeciesHtml(supplementNames, detailsHtml) {
  if (!supplementNames.length) return '';
  let html = `<h3 class="sub">Autres espèces (suppléments)</h3>`;
  Object.entries(speciesNamesBySource(supplementNames)).forEach(([source, names]) => {
    html += `<p class="lbl">${escapeHtml(source)}</p>` + speciesGridHtml(names.sort((first, second) => first.localeCompare(second)), detailsHtml);
  });
  return html;
}

function renderSpeciesStep() {
  const detailsHtml = speciesDetailsHtml();
  const allNames = Object.keys(speciesData);
  const coreNames = allNames.filter(isCoreRulebookSpecies);
  const supplementNames = allNames.filter(name => !coreNames.includes(name));
  return `<h2>3. Choisis ton espèce</h2><p class="lead">L’espèce donne la taille, la vitesse et des traits (vision dans le noir, résistances, magie innée…). Dans les règles 2024 elle ne modifie pas les caractéristiques.</p>`
    + speciesGridHtml(coreNames, detailsHtml)
    + supplementSpeciesHtml(supplementNames, detailsHtml);
}

function scoreMethodHelpHtml() {
  if (draft.meth === METHOD_STANDARD_ARRAY) return '<p class="lbl">Répartis 15, 14, 13, 12, 10 et 8. Choisir une valeur déjà prise échange les deux caractéristiques.</p>';
  if (usesPointBuy()) {
    const spent = pointBuySpent();
    const overBudget = spent > POINT_BUY_BUDGET;
    return `<p class="pts${overBudget ? ' bad' : ''}">Points dépensés : ${spent} / ${POINT_BUY_BUDGET}${overBudget ? ' (trop !)' : ''}</p><p class="lbl">Chaque valeur va de 8 à 15. Coût : 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9 points.</p>`;
  }
  if (usesRolls()) {
    const rollButton = `<div class="seg"><button type="button" data-act="roll" aria-pressed="false">🎲 ${draft.rolls ? 'Relancer' : 'Lancer les dés'}</button></div>`;
    const rollResults = draft.rolls ? `<p class="dice">Résultats : ${draft.rolls.join(', ')} (total ${draft.rolls.reduce((total, roll) => total + roll, 0)})</p>` : '';
    return `<p class="lbl">Lance 4d6 six fois et garde les trois meilleurs dés à chaque fois.</p>${rollButton}${rollResults}`;
  }
  return '';
}

function abilityScoreControlHtml(ability, pool) {
  if (usesPointBuy()) {
    return `<div class="ctl"><button type="button" data-act="pb-" data-v="${ability.key}" aria-label="Baisser ${ability.name}">−</button><b>${draft.pb[ability.key]}</b><button type="button" data-act="pb+" data-v="${ability.key}" aria-label="Monter ${ability.name}">+</button></div>`;
  }
  const options = pool.map((value, index) => `<option value="${index}"${draft.as[ability.key] === index ? ' selected' : ''}>${value}</option>`).join('');
  return `<div class="ctl"><select data-as="${ability.key}" aria-label="${ability.name}">${options}</select></div>`;
}

function abilityScoresGridHtml() {
  const base = baseScores();
  const bonuses = abilityBonuses();
  const finals = finalScores();
  const pool = usesRolls() ? draft.rolls : STANDARD_ARRAY;
  const cards = ABILITIES.map(ability => {
    const key = ability.key;
    const bonusDetail = bonuses[key] ? `${base[key]} ${signed(bonuses[key])} → ` : '';
    return `<div class="ab" style="--c:${ability.color}"><div class="n">${ability.name}</div>${abilityScoreControlHtml(ability, pool)}<div class="fin">${bonusDetail}<b>${finals[key]}</b> (${signed(abilityModifier(finals[key]))})</div></div>`;
  }).join('');
  return `<div class="abg">${cards}</div>`;
}

function levelFeatOptions(level) {
  const isAvailable = feat => feat.cat === 'Général' || (level >= EPIC_BOON_LEVEL && feat.cat === 'Faveur épique');
  return (featList || []).filter(isAvailable).map(feat => [feat.id, feat.nom + (feat.cat === 'Faveur épique' ? ' (faveur épique)' : '')]);
}

function levelFeatDescriptionHtml(feat) {
  if (!feat || feat.id === ABILITY_SCORE_IMPROVEMENT_FEAT_ID) return '';
  const prerequisite = feat.pre ? '<i>Prérequis : ' + escapeHtml(feat.pre) + '</i>\n' : '';
  return `<p style="white-space:pre-line">${prerequisite}${escapeHtml(feat.desc)}</p>`;
}

function levelFeatBoxHtml(level) {
  const { feat, choices } = levelFeat(level);
  const featSelect = labelledField('Don', selectField('asi.' + level, levelFeatOptions(level), draft.asi[level] || ABILITY_SCORE_IMPROVEMENT_FEAT_ID));
  const featChoices = feat ? choiceFields(levelChoicesKey(level), feat.choix, choices) : '';
  return `<div class="box"><h3>Niveau ${level}</h3><div class="chs">${featSelect}${featChoices}</div>${levelFeatDescriptionHtml(feat)}</div>`;
}

function levelFeatsHtml() {
  const levels = featLevels();
  if (!selectedClass() || !levels.length) return '';
  return `<h3 class="sub">Dons gagnés en montant de niveau</h3><p class="lbl">À chacun de ces niveaux, prends une Amélioration de caractéristique (+2 à une, ou +1 à deux) ou un autre don général. Au niveau 19, une faveur épique est conseillée. Le maximum reste 20.</p>`
    + levels.map(levelFeatBoxHtml).join('');
}

function renderAbilitiesStep() {
  const methodButtons = SCORE_METHODS.map(([method, label]) => segmentButton('meth', method, label, draft.meth === method)).join('');
  let html = `<h2>4. Détermine tes caractéristiques</h2><p class="lead">Choisis une méthode, puis répartis les valeurs. Les bonus de l’historique et des dons s’ajoutent ensuite (maximum 20).</p>
   <div class="seg">${methodButtons}</div>`;
  html += scoreMethodHelpHtml();
  if (selectedClass()) html += `<div class="seg"><button type="button" data-act="sugg" aria-pressed="false">Répartition conseillée pour ${escapeHtml(draft.cl)}</button></div>`;
  if (awaitsFirstRoll()) return html;
  html += abilityScoresGridHtml();
  html += levelFeatsHtml();
  if (selectedClass()) html += `<p class="lbl" style="margin-top:10px">Points de vie au niveau ${characterLevel()} : <b>${hitPoints()}</b></p>`;
  return html;
}

function remainingSkillsLabel(remaining) {
  if (remaining > 0) return 'Encore ' + remaining + ' à choisir';
  if (remaining === 0) return 'C’est complet';
  return 'Trop de compétences cochées';
}

function classSkillCheckboxHtml(skill, sourceBySkill, remaining) {
  const alreadyGranted = !!sourceBySkill[skill];
  const checked = alreadyGranted || draft.sk.includes(skill);
  const disabled = alreadyGranted || (!checked && remaining <= 0);
  return `<label class="${alreadyGranted ? 'got' : ''}"><input type="checkbox" data-sk="${escapeHtml(skill)}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}><span>${escapeHtml(skill)}</span></label>`;
}

function expertiseBoxHtml(expertiseCount, proficientSkills) {
  draft.ex = draft.ex.filter(skill => proficientSkills.includes(skill));
  const remaining = expertiseCount - draft.ex.length;
  const checkboxes = SKILL_NAMES.filter(skill => proficientSkills.includes(skill)).map(skill => {
    const checked = draft.ex.includes(skill);
    return `<label><input type="checkbox" data-ex="${escapeHtml(skill)}"${checked ? ' checked' : ''}${!checked && remaining <= 0 ? ' disabled' : ''}><span>${escapeHtml(skill)}</span></label>`;
  }).join('');
  return `<div class="box"><h3>Expertise</h3><p>Choisis ${expertiseCount} compétences que tu maîtrises : ton bonus de maîtrise y compte double. ${remaining > 0 ? 'Encore ' + remaining + ' à choisir.' : ''}</p><div class="sk">${checkboxes}</div></div>`;
}

function renderSkillsStep() {
  const characterClass = selectedClass();
  if (!characterClass) return '<h2>5. Compétences</h2><p class="warn">Choisis d’abord une classe.</p>';
  const sourceBySkill = grantedSkills();
  const choosableSkills = characterClass.skillChoices === ANY_SKILL ? SKILL_NAMES : characterClass.skillChoices;
  draft.sk = draft.sk.filter(skill => choosableSkills.includes(skill) && !sourceBySkill[skill]);
  const remaining = characterClass.skillCount - draft.sk.length;
  const checkboxes = choosableSkills.map(skill => classSkillCheckboxHtml(skill, sourceBySkill, remaining)).join('');
  let html = `<h2>5. Choisis tes compétences de classe</h2><p class="lead">${escapeHtml(draft.cl)} : ${characterClass.skillCount} compétences au choix. Celles que tu as déjà (historique, espèce, don) ne comptent pas : prends-en d’autres.</p>
   <p class="pts${remaining < 0 ? ' bad' : ''}">${remainingSkillsLabel(remaining)}</p>
   <div class="sk">${checkboxes}</div>`;
  const grantedEntries = Object.entries(sourceBySkill);
  if (grantedEntries.length) html += `<p class="lbl">Déjà acquises : ${grantedEntries.map(([skill, source]) => escapeHtml(skill) + ' (' + escapeHtml(source) + ')').join(', ')}</p>`;
  if (characterClass.expertiseCount) html += expertiseBoxHtml(characterClass.expertiseCount, [...Object.keys(sourceBySkill), ...draft.sk]);
  return html;
}

function radioLine(name, attributes, checked, contentHtml) {
  return `<label style="display:flex;gap:6px;margin:4px 0"><input type="radio" name="${name}" ${attributes}${checked ? ' checked' : ''}><span>${contentHtml}</span></label>`;
}

function chosenEquipmentOption() {
  const characterClass = selectedClass();
  return characterClass ? characterClass.equipmentOptions[draft.eq] : undefined;
}

function needsMusicalInstrumentChoice() {
  const option = chosenEquipmentOption();
  return !!option && option.items.some(equipment => equipment.name === MUSICAL_INSTRUMENT_PLACEHOLDER);
}

function classEquipmentBoxHtml(characterClass) {
  const optionLetter = index => String.fromCharCode(65 + index);
  const options = characterClass.equipmentOptions.map((option, index) => {
    return radioLine('eq', `data-eq="${index}"`, draft.eq === index, `<b>${optionLetter(index)}</b> — ${escapeHtml(option.label)}`);
  }).join('');
  const instrumentChoice = needsMusicalInstrumentChoice() ? `<div class="chs">${labelledField('Instrument de musique', selectField('instr', MUSICAL_INSTRUMENTS, draft.instr))}</div>` : '';
  return `<div class="box"><h3>Équipement de ${escapeHtml(draft.cl)}</h3>${options}
   ${instrumentChoice}</div>`;
}

function backgroundEquipmentBoxHtml(background) {
  const goldOption = radioLine('bgeq', `data-bgeq="${BACKGROUND_EQUIPMENT_GOLD}"`, draft.bgeq === BACKGROUND_EQUIPMENT_GOLD, `${BACKGROUND_GOLD} po`);
  const kitOption = radioLine('bgeq', `data-bgeq="${BACKGROUND_EQUIPMENT_KIT}"`, draft.bgeq === BACKGROUND_EQUIPMENT_KIT, `Le lot de l’historique (voir le Manuel des joueurs, à ajouter toi-même sur la page Équipement ; l’outil « ${escapeHtml(background.outil)} » est noté)`);
  return `<div class="box"><h3>Équipement de l’historique (${escapeHtml(draft.bg)})</h3>
   ${goldOption}
   ${kitOption}</div>`;
}

function languagesBoxHtml() {
  draft.langs = draft.langs.filter(language => COMMON_LANGUAGES.includes(language));
  const chosenCount = draft.langs.length;
  const remainingNote = chosenCount < LANGUAGES_TO_CHOOSE ? ' (encore ' + (LANGUAGES_TO_CHOOSE - chosenCount) + ')' : '';
  const checkboxes = COMMON_LANGUAGES.map(language => {
    const checked = draft.langs.includes(language);
    return `<label><input type="checkbox" data-lang="${escapeHtml(language)}"${checked ? ' checked' : ''}${!checked && chosenCount >= LANGUAGES_TO_CHOOSE ? ' disabled' : ''}>${escapeHtml(language)}</label>`;
  }).join('');
  return `<div class="box"><h3>Langues</h3><p>Tu parles le Commun et deux langues courantes au choix${remainingNote}.</p><div class="lang">${checkboxes}</div></div>`;
}

function renderEquipmentStep() {
  const characterClass = selectedClass();
  const background = selectedBackground();
  let html = `<h2>6. Équipement et langues</h2><p class="lead">Prends le lot d’équipement de ta classe ou de l’or pour acheter toi-même. L’équipement est ajouté à la page Équipement : la CA et les attaques de la fiche en découlent.</p>`;
  if (characterClass) html += classEquipmentBoxHtml(characterClass);
  if (background) html += backgroundEquipmentBoxHtml(background);
  html += languagesBoxHtml();
  return html;
}

function missingChoices() {
  const missing = [];
  const characterClass = selectedClass();
  const background = selectedBackground();
  const species = selectedSpecies();
  if (!characterClass) missing.push('la classe');
  if (!background) missing.push('l’historique');
  if (!species) missing.push('l’espèce');
  if (characterClass && subclassIsDue() && subclassNames().length && !draft.sc) missing.push('la sous-classe');
  if (species && species.lignage && !draft.lig) missing.push(species.lignage.lbl.toLowerCase());
  if (species) species.choix.filter(choice => choice.t !== 'texte' && !draft.spch[choice.id]).forEach(choice => missing.push(choice.lbl.toLowerCase() + ' (espèce)'));
  if (isHuman() && !findFeat(draft.hfeat)) missing.push('le don d’origine de l’humain');
  if (background && draft.bgch.mode !== BONUS_MODE_THREE_ONES && (!draft.bgch.a2 || !draft.bgch.a1)) missing.push('les bonus de l’historique');
  if (awaitsFirstRoll()) missing.push('les jets de caractéristiques');
  if (usesPointBuy() && pointBuySpent() > POINT_BUY_BUDGET) missing.push('l’achat de points (plus de 27 points)');
  if (characterClass && draft.sk.length < characterClass.skillCount) missing.push((characterClass.skillCount - draft.sk.length) + ' compétence(s) de classe');
  if (characterClass && characterClass.expertiseCount && draft.ex.length < characterClass.expertiseCount) missing.push('l’expertise');
  if (draft.langs.length < LANGUAGES_TO_CHOOSE) missing.push('les langues');
  return missing;
}

function classSummary(characterClass) {
  if (!characterClass) return '—';
  const subclass = draft.sc && subclassIsDue() ? ' · ' + escapeHtml(draft.sc) : '';
  return escapeHtml(draft.cl) + ' niveau ' + characterLevel() + ' (d' + characterClass.hitDie + ')' + subclass;
}

function speciesSummary(species) {
  if (!species) return '—';
  const lineage = selectedLineage();
  return escapeHtml(draft.esp) + (lineage ? ' (' + escapeHtml(lineage.v) + ')' : '');
}

function abilitiesSummary() {
  const finals = finalScores();
  return ABILITIES.map(ability => ability.name.slice(0, 3) + ' ' + finals[ability.key] + ' (' + signed(abilityModifier(finals[ability.key])) + ')').join(' · ');
}

function skillsSummary() {
  const skills = [...Object.keys(grantedSkills()), ...draft.sk].sort((first, second) => first.localeCompare(second));
  return skills.map(skill => draft.ex.includes(skill) ? skill + ' (expertise)' : skill).join(', ') || '—';
}

function equipmentSummary(characterClass, background) {
  const option = chosenEquipmentOption();
  const classPart = characterClass && option ? escapeHtml(option.label) : '—';
  const backgroundPart = background ? escapeHtml(draft.bgeq === BACKGROUND_EQUIPMENT_GOLD ? ' ; 50 po (historique)' : ' ; lot de l’historique') : '';
  return classPart + backgroundPart;
}

function renderSummaryStep() {
  const characterClass = selectedClass();
  const background = selectedBackground();
  const missing = missingChoices();
  const nameField = labelledField('Nom du personnage', `<input type="text" data-set="nom" value="${escapeHtml(draft.nom)}" placeholder="Nom">`);
  let html = `<h2>7. Dernières touches</h2><p class="lead">Donne un nom à ton personnage, vérifie le résumé, puis crée-le. Tout reste modifiable ensuite sur la fiche.</p>
   <div class="chs">${nameField}${labelledField('Alignement', selectField('align', ALIGNMENTS, draft.align))}</div>`;
  if (missing.length) html += `<p class="warn">À compléter (facultatif, tu peux aussi le faire sur la fiche) : ${missing.map(choice => escapeHtml(choice)).join(', ')}.</p>`;
  html += `<dl class="rec">
   <dt>Classe</dt><dd>${classSummary(characterClass)}</dd>
   <dt>Historique</dt><dd>${background ? escapeHtml(draft.bg) : '—'}</dd>
   <dt>Espèce</dt><dd>${speciesSummary(selectedSpecies())}</dd>
   <dt>Caractéristiques</dt><dd>${abilitiesSummary()}</dd>
   <dt>Points de vie</dt><dd>${characterClass ? hitPoints() : '—'}</dd>
   <dt>Jets de sauvegarde</dt><dd>${characterClass ? abilityList(characterClass.savingThrows, ', ') : '—'}</dd>
   <dt>Compétences</dt><dd>${escapeHtml(skillsSummary())}</dd>
   <dt>Dons</dt><dd>${escapeHtml(acquiredFeats().map(({ feat }) => feat.nom).join(', ') || '—')}</dd>
   <dt>Langues</dt><dd>${escapeHtml(['Commun', ...draft.langs].join(', '))}</dd>
   <dt>Équipement</dt><dd>${equipmentSummary(characterClass, background)}</dd></dl>`;
  return html;
}

function stepTabsHtml() {
  return STEPS.map((step, index) => {
    const current = index === draft.step ? ' aria-current="step"' : '';
    const locked = index > draft.max ? ' disabled' : '';
    return `<button type="button" data-go="${index}"${current}${locked} class="${index < draft.max ? 'ok' : ''}">${index + 1}. ${step.title}</button>`;
  }).join('');
}

function currentStepIsIncomplete() {
  const requiredSelectionMissing = [!selectedClass(), !selectedBackground(), !selectedSpecies()];
  return requiredSelectionMissing[draft.step];
}

function stepNavigationHtml() {
  const previousButton = `<button type="button" data-act="prev"${draft.step ? '' : ' disabled'}>← Précédent</button>`;
  const forwardButton = draft.step === LAST_STEP_INDEX
    ? '<button type="button" class="primary" data-act="create">Créer le personnage</button>'
    : `<button type="button" class="primary" data-act="next"${currentStepIsIncomplete() ? ' disabled' : ''}>Suivant →</button>`;
  return `<div class="nav">${previousButton}${forwardButton}</div>`;
}

function render() {
  if (draft.done) return;
  $('#steps').innerHTML = stepTabsHtml();
  $('#main').innerHTML = STEPS[draft.step].render() + stepNavigationHtml();
  saveDraft();
}

function goToStep(stepIndex) {
  draft.step = Math.max(0, Math.min(LAST_STEP_INDEX, stepIndex));
  draft.max = Math.max(draft.max, draft.step);
  render();
  scrollTo({ top: 0, behavior: 'smooth' });
}

function defaultCharacterName() {
  return draft.esp && draft.cl ? draft.cl + ' ' + draft.esp.toLowerCase() : '';
}

function isThirdCasterSubclass() {
  const subclassRule = classData && classData.classes[draft.cl] && classData.classes[draft.cl].sous_classe;
  return !!subclassRule && new RegExp(subclassRule.re || THIRD_CASTER_SUBCLASS_PATTERN, 'i').test(draft.sc);
}

function addClassToSheet(sheet, characterClass) {
  const level = characterLevel();
  sheet.classe = draft.cl;
  sheet.clsel = draft.cl;
  sheet.dvtot = level + 'd' + characterClass.hitDie;
  sheet.dvrest = String(level);
  if (subclassIsDue() && draft.sc && subclassNames().includes(draft.sc)) {
    sheet.sousclasse = draft.sc;
    sheet.sclasse = draft.sc;
    if (isThirdCasterSubclass()) sheet.sclance = true;
  }
  const maximumHitPoints = String(hitPoints());
  sheet.pv = maximumHitPoints;
  sheet.pvmax = maximumHitPoints;
  characterClass.savingThrows.forEach(key => { sheet['sv_' + key] = true; });
  draft.sk.forEach(skill => { sheet['sk_' + SKILL_NAMES.indexOf(skill)] = true; });
  draft.ex.forEach(skill => {
    sheet['sk_' + SKILL_NAMES.indexOf(skill)] = true;
    sheet['ske_' + SKILL_NAMES.indexOf(skill)] = true;
  });
}

function addSpeciesToSheet(sheet, species, speciesExtras) {
  const lineage = selectedLineage();
  sheet.race = draft.esp;
  sheet.sespece = draft.lig || '';
  sheet.espece = lineage ? draft.esp + ' (' + String(lineage.v).split(' (')[0] + ')' : draft.esp;
  sheet.vitesse = frenchDecimal(species.vit) + ' m';
  Object.assign(speciesExtras, { k: draft.esp, ch: Object.assign({}, draft.spch), auto: sheet.vitesse });
}

const randomFeatInstanceId = () => Math.random().toString(36).slice(2, 8);

function addBackgroundToSheet(sheet, background, backgroundExtras, feats) {
  sheet.historique = draft.bg;
  sheet.bgsel = draft.bg;
  backgroundExtras.k = draft.bg;
  backgroundExtras.ch = { mode: draft.bgch.mode || BONUS_MODE_TWO_AND_ONE, a2: draft.bgch.a2 || '', a1: draft.bgch.a1 || '' };
  if (findFeat(background.don)) feats.push({ u: randomFeatInstanceId(), id: background.don, ch: backgroundFeatChoices(background), bg: 1 });
}

function addLaterFeats(feats) {
  if (isHuman() && findFeat(draft.hfeat)) feats.push({ u: randomFeatInstanceId(), id: draft.hfeat, ch: Object.assign({}, draft.hfeatch) });
  featLevels().forEach(level => {
    const { feat, choices } = levelFeat(level);
    if (feat) feats.push({ u: randomFeatInstanceId(), id: feat.id, ch: Object.assign({}, choices) });
  });
}

function startingItems(characterClass) {
  const quantityByItem = new Map();
  const option = characterClass && characterClass.equipmentOptions[draft.eq];
  if (!option) return quantityByItem;
  option.items.forEach(({ name, quantity }) => {
    const itemName = name === MUSICAL_INSTRUMENT_PLACEHOLDER ? draft.instr || DEFAULT_MUSICAL_INSTRUMENT : name;
    quantityByItem.set(itemName, (quantityByItem.get(itemName) || 0) + quantity);
  });
  return quantityByItem;
}

function startingGold(characterClass, background) {
  const option = characterClass && characterClass.equipmentOptions[draft.eq];
  const classGold = option ? option.gold : 0;
  const backgroundGold = background && draft.bgeq === BACKGROUND_EQUIPMENT_GOLD ? BACKGROUND_GOLD : 0;
  return classGold + backgroundGold;
}

function equipmentNotes(background) {
  const notes = [];
  if (background && draft.bgeq !== BACKGROUND_EQUIPMENT_GOLD) notes.push('Lot d’équipement de l’historique ' + draft.bg + ' (voir le Manuel des joueurs), dont : ' + background.outil + '.');
  if (draft.cl === 'Moine' && draft.eq === 0) notes.push('Moine : un type d’outils d’artisan ou un instrument de musique au choix, à ajouter sur la page Équipement.');
  return notes;
}

function buildCharacterParts() {
  const characterClass = selectedClass();
  const background = selectedBackground();
  const species = selectedSpecies();
  const scores = baseScores();
  const name = draft.nom.trim() || defaultCharacterName();
  const sheet = { nom: name, niveau: String(characterLevel()), alignement: draft.align };
  ABILITY_KEYS.forEach(key => { sheet['ab_' + key] = String(scores[key]); });
  if (characterClass) addClassToSheet(sheet, characterClass);
  const speciesExtras = { k: '', ch: {} };
  if (species) addSpeciesToSheet(sheet, species, speciesExtras);
  const backgroundExtras = { k: '', ch: {} };
  const feats = [];
  if (background) addBackgroundToSheet(sheet, background, backgroundExtras, feats);
  addLaterFeats(feats);
  sheet.langs = ['Commun', ...draft.langs].join(', ');
  const items = startingItems(characterClass);
  const notes = equipmentNotes(background);
  sheet.po = String(startingGold(characterClass, background));
  if (notes.length) sheet.notes = notes.join('\n');
  sheet.extras = { sp: speciesExtras, bg: backgroundExtras, dons: feats, spl: [], auto: {}, mal: [], oh: {} };
  const parts = { fiche: { version: 5, type: 'fiche-dnd-5e', data: sheet } };
  if (items.size) parts.equipement = { version: 1, type: 'equipement-dnd-5e', data: { titre: name, objets: [...items].map(([itemName, quantity]) => ({ n: itemName, qte: quantity })), filtres: {} } };
  return { name, parts };
}

function creationDoneHtml(character) {
  const subclassNote = characterLevel() < SUBCLASS_LEVEL ? ' (la sous-classe se choisit au niveau 3)' : '';
  const spellsLink = SPELLCASTING_CLASSES.includes(draft.cl) ? '<a href="grimoire.html">Choisir les sorts</a>' : '';
  return `<div class="done"><h2>« ${escapeHtml(character.nom)} » est prêt !</h2><p class="lead">Le personnage est créé et sélectionné. Sur la fiche, ouvre les Paramètres pour ajuster les options restantes${subclassNote}.</p>
   <div class="links"><a class="primary" href="fiche.html">Ouvrir la fiche</a>${spellsLink}<a href="equipement.html">Voir l’équipement</a><a href="histoire.html">Écrire son histoire</a></div>
   <p style="margin-top:16px"><button type="button" class="opt" style="display:inline-block" data-act="again"><b>Créer un autre personnage</b></button></p></div>`;
}

function confirmCreationDespiteMissingChoices() {
  const missing = missingChoices();
  return !missing.length || confirm('Il manque encore : ' + missing.join(', ') + '.\nCréer le personnage quand même ? (tu pourras compléter sur la fiche)');
}

function createCharacter() {
  if (!confirmCreationDespiteMissingChoices()) return;
  const { name, parts } = buildCharacterParts();
  const character = Persos.add(name, parts);
  forgetSavedDraft();
  draft.done = true;
  $('#steps').innerHTML = '';
  $('#main').innerHTML = creationDoneHtml(character);
}

function startNewDraft() {
  draft = createBlankDraft();
  render();
}

function restartCreation() {
  if (!confirm('Tout recommencer depuis le début ?')) return;
  draft = createBlankDraft();
  forgetSavedDraft();
  render();
  showCreationMessage('Création recommencée');
}

function setDraftValue(path, value) {
  const [key, subKey] = path.split('.');
  const levelChoicesMatch = /^ac(\d+)$/.exec(key);
  if (levelChoicesMatch && !draft[key]) draft[key] = Object.assign({}, levelFeat(+levelChoicesMatch[1]).choices);
  if (!subKey) {
    draft[key] = value;
    return;
  }
  draft[key] = draft[key] || {};
  draft[key][subKey] = value;
}

function chooseClass(className) {
  if (draft.cl === className) return;
  draft.cl = className;
  draft.sc = '';
  draft.sk = [];
  draft.ex = [];
  draft.eq = 0;
  applyRecommendedScores();
  applyBackgroundBonusDefaults();
}

function chooseBackground(backgroundName) {
  if (draft.bg === backgroundName) return;
  draft.bg = backgroundName;
  draft.feat = {};
  draft.bgch = { mode: draft.bgch.mode || BONUS_MODE_TWO_AND_ONE };
  applyBackgroundBonusDefaults();
}

function chooseSpecies(speciesName) {
  if (draft.esp === speciesName) return;
  draft.esp = speciesName;
  draft.lig = '';
  draft.spch = {};
}

function chooseBonusMode(mode) {
  draft.bgch.mode = mode;
  applyBackgroundBonusDefaults();
}

function chooseScoreMethod(method) {
  draft.meth = method;
  if (method !== METHOD_POINT_BUY) draft.as = defaultScoreAssignment();
  applyRecommendedScores();
}

function rollFourDiceKeepThreeHighest() {
  const dice = [0, 0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)).sort((first, second) => second - first);
  return dice[0] + dice[1] + dice[2];
}

function rollAbilityScores() {
  draft.rolls = Array.from({ length: ABILITY_KEYS.length }, rollFourDiceKeepThreeHighest);
  draft.as = defaultScoreAssignment();
  applyRecommendedScores();
}

function changePointBuyScore(abilityKey, step) {
  const newScore = draft.pb[abilityKey] + step;
  if (newScore < POINT_BUY_MINIMUM || newScore > POINT_BUY_MAXIMUM) return;
  const spentAfterChange = pointBuySpent() - POINT_BUY_COST[draft.pb[abilityKey]] + POINT_BUY_COST[newScore];
  if (step > 0 && spentAfterChange > POINT_BUY_BUDGET) {
    showCreationMessage('Plus assez de points');
    return;
  }
  draft.pb[abilityKey] = newScore;
  render();
}

const thenRender = change => value => {
  change(value);
  render();
};

const CLICK_ACTIONS = {
  cl: thenRender(chooseClass),
  bg: thenRender(chooseBackground),
  esp: thenRender(chooseSpecies),
  mode: thenRender(chooseBonusMode),
  meth: thenRender(chooseScoreMethod),
  sugg: thenRender(applyRecommendedScores),
  roll: thenRender(rollAbilityScores),
  'pb+': abilityKey => changePointBuyScore(abilityKey, 1),
  'pb-': abilityKey => changePointBuyScore(abilityKey, -1),
  prev: () => goToStep(draft.step - 1),
  next: () => goToStep(draft.step + 1),
  create: createCharacter,
  again: startNewDraft
};

function handleClick(event) {
  const stepTab = event.target.closest('[data-go]');
  if (stepTab) {
    goToStep(+stepTab.dataset.go);
    return;
  }
  const actionButton = event.target.closest('[data-act]');
  if (!actionButton) return;
  const action = CLICK_ACTIONS[actionButton.dataset.act];
  if (action) action(actionButton.dataset.v);
}

function applyFieldSideEffects(path) {
  if (path === 'bgch.a2') applyBackgroundBonusDefaults();
  if (path === 'hfeat') draft.hfeatch = {};
  if (path.startsWith('asi.')) delete draft[levelChoicesKey(path.slice(4))];
}

function handleFieldChange(field) {
  const path = field.dataset.set;
  setDraftValue(path, field.value);
  applyFieldSideEffects(path);
  if (field.type === 'text') {
    saveDraft();
    return;
  }
  render();
}

function handleScoreAssignmentChange(field) {
  const abilityKey = field.dataset.as;
  const poolIndex = +field.value;
  const abilityHoldingValue = ABILITY_KEYS.find(key => key !== abilityKey && draft.as[key] === poolIndex);
  if (abilityHoldingValue) draft.as[abilityHoldingValue] = draft.as[abilityKey];
  draft.as[abilityKey] = poolIndex;
  render();
}

function toggledList(list, value, checked) {
  return checked ? [...list, value] : list.filter(entry => entry !== value);
}

const CHANGE_HANDLERS = [
  ['set', handleFieldChange],
  ['as', handleScoreAssignmentChange],
  ['sk', field => { draft.sk = toggledList(draft.sk, field.dataset.sk, field.checked); render(); }],
  ['ex', field => { draft.ex = toggledList(draft.ex, field.dataset.ex, field.checked); render(); }],
  ['lang', field => { draft.langs = toggledList(draft.langs, field.dataset.lang, field.checked); render(); }],
  ['eq', field => { draft.eq = +field.dataset.eq; render(); }],
  ['bgeq', field => { draft.bgeq = field.dataset.bgeq; render(); }]
];

function handleChange(event) {
  const field = event.target;
  const matchingHandler = CHANGE_HANDLERS.find(([attribute]) => field.dataset[attribute] !== undefined);
  if (matchingHandler) matchingHandler[1](field);
}

function handleTextInput(event) {
  const field = event.target;
  if (!field.dataset.set || field.type !== 'text') return;
  setDraftValue(field.dataset.set, field.value);
  saveDraft();
}

function forgetUnknownSelections() {
  if (!CLASSES[draft.cl]) draft.cl = '';
  if (!backgroundData[draft.bg]) draft.bg = '';
  if (!speciesData[draft.esp]) draft.esp = '';
}

async function loadCreationData() {
  [speciesData, backgroundData, featList, subclassData, classData] = await Promise.all([
    fetchJson('assets/json/vf/especes.json'),
    fetchJson('assets/json/vf/historiques.json'),
    fetchJson('assets/json/vf/dons.json'),
    fetchJson('assets/json/vf/sousclasses.json'),
    fetchJson('assets/json/vf/classes.json')
  ]);
}

async function startCreationPage() {
  try {
    await loadCreationData();
  } catch (error) {
    $('#main').innerHTML = '<p class="warn">Impossible de charger les données (ouvre le site via un serveur web).</p>';
    return;
  }
  forgetUnknownSelections();
  render();
}

document.addEventListener('click', handleClick);
document.addEventListener('change', handleChange);
document.addEventListener('input', handleTextInput);
$('#bRestart').onclick = restartCreation;
startCreationPage();
