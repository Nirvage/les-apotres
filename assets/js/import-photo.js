(function () {
'use strict';

const TESSERACT_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
const OCR_LANGUAGES = 'fra+eng';
const MAXIMUM_IMAGE_SIDE = 2400;
const MAXIMUM_LEVEL = 20;
const MAXIMUM_SCORE = 30;
const DEFAULT_SCORE = 10;
const ABILITY_WINDOW_LENGTH = 60;
const SAVE_WINDOW_LENGTH = 140;
const SAVE_SECTION_LINE_COUNT = 12;
const HEADER_FOLLOWING_LINE_COUNT = 3;
const LANGUAGE_LINE_COUNT = 3;
const SPEED_UNIT_WINDOW_LENGTH = 120;
const METERS_PER_FOOT = 0.3;
const SPEED_IN_FEET_THRESHOLD = 20;
const NAME_MAXIMUM_LENGTH = 48;
const DEFAULT_HIT_DIE = 8;
const SUBCLASS_WORD_MINIMUM = 5;
const PAGE_SEGMENTATION_SINGLE_BLOCK = '6';
const PAGE_SEGMENTATION_SPARSE_TEXT = '11';
const PAGE_SEGMENTATION_MODES = [PAGE_SEGMENTATION_SINGLE_BLOCK, PAGE_SEGMENTATION_SPARSE_TEXT];
const PAGE_GAP = 100;
const FEAT_SECTION_LINE_COUNT = 8;
const INVOCATION_CATEGORY = 'Manifestation occulte';

const ABILITIES = [
  { key: 'for', name: 'Force', labels: ['force', 'strength'], abbreviations: ['FOR', 'STR'] },
  { key: 'dex', name: 'Dextérité', labels: ['dexterite', 'dexterity'], abbreviations: ['DEX'] },
  { key: 'con', name: 'Constitution', labels: ['constitution'], abbreviations: ['CON'] },
  { key: 'int', name: 'Intelligence', labels: ['intelligence'], abbreviations: ['INT'] },
  { key: 'sag', name: 'Sagesse', labels: ['sagesse', 'wisdom'], abbreviations: ['SAG', 'WIS'] },
  { key: 'cha', name: 'Charisme', labels: ['charisme', 'charisma'], abbreviations: ['CHA'] }
];

const SKILLS = [
  { name: 'Acrobaties', ability: 'dex', aliases: ['acrobatics'] },
  { name: 'Arcanes', ability: 'int', aliases: ['arcana'] },
  { name: 'Athlétisme', ability: 'for', aliases: ['athletics'] },
  { name: 'Discrétion', ability: 'dex', aliases: ['stealth'] },
  { name: 'Dressage', ability: 'sag', aliases: ['animal handling'] },
  { name: 'Escamotage', ability: 'dex', aliases: ['sleight of hand'] },
  { name: 'Histoire', ability: 'int', aliases: ['history'] },
  { name: 'Intimidation', ability: 'cha', aliases: [] },
  { name: 'Intuition', ability: 'sag', aliases: ['insight', 'perspicacite'] },
  { name: 'Investigation', ability: 'int', aliases: [] },
  { name: 'Médecine', ability: 'sag', aliases: ['medicine'] },
  { name: 'Nature', ability: 'int', aliases: [] },
  { name: 'Perception', ability: 'sag', aliases: [] },
  { name: 'Persuasion', ability: 'cha', aliases: [] },
  { name: 'Religion', ability: 'int', aliases: [] },
  { name: 'Représentation', ability: 'cha', aliases: ['performance'] },
  { name: 'Supercherie', ability: 'cha', aliases: ['deception', 'tromperie'] },
  { name: 'Survie', ability: 'sag', aliases: ['survival'] }
];

const CLASS_ALIASES = {
  'Artificier': ['artificer', 'artificiere'], 'Barbare': ['barbarian'], 'Barde': ['bard'], 'Chasseur de sang': ['blood hunter', 'chasseuse de sang'],
  'Clerc': ['cleric'], 'Druide': ['druid'], 'Ensorceleur': ['sorcerer', 'ensorceleuse'], 'Guerrier': ['fighter', 'guerriere'],
  'Magicien': ['wizard', 'magicienne'], 'Moine': ['monk', 'moniale'], 'Occultiste': ['warlock', 'sorcier', 'sorciere'], 'Paladin': ['paladine'],
  'Rôdeur': ['ranger', 'rodeuse'], 'Roublard': ['rogue', 'roublarde']
};

const SPECIES_ALIASES = {
  'Elfe': ['elf'], 'Nain': ['dwarf', 'naine'], 'Halfelin': ['halfling', 'halfeline'], 'Humain': ['human', 'humaine'], 'Drakéide': ['dragonborn', 'drakeide'],
  'Tieffelin': ['tiefling', 'tieflin'], 'Homme-lézard': ['lizardfolk'], 'Forgé de guerre': ['warforged'], 'Changelin': ['changeling'],
  'Gobelin': ['goblin'], 'Gobelours': ['bugbear'], 'Hobgobelin': ['hobgoblin'], 'Gnome des profondeurs': ['deep gnome', 'svirfneblin']
};

const BACKGROUND_ALIASES = {
  'Criminel': ['criminal'], 'Artiste': ['entertainer'], 'Fermier': ['farmer'], 'Garde': ['guard'], 'Ermite': ['hermit'],
  'Marchand': ['merchant'], 'Marin': ['sailor'], 'Soldat': ['soldier'], 'Voyageur': ['wayfarer']
};

const ALIGNMENTS = [
  { name: 'Loyal Bon', aliases: ['lawful good'] }, { name: 'Neutre Bon', aliases: ['neutral good'] },
  { name: 'Chaotique Bon', aliases: ['chaotic good'] }, { name: 'Loyal Neutre', aliases: ['lawful neutral'] },
  { name: 'Chaotique Neutre', aliases: ['chaotic neutral'] }, { name: 'Loyal Mauvais', aliases: ['lawful evil'] },
  { name: 'Neutre Mauvais', aliases: ['neutral evil'] }, { name: 'Chaotique Mauvais', aliases: ['chaotic evil'] },
  { name: 'Neutre', aliases: ['true neutral', 'neutral'] }
];

const LABELS = {
  name: /(nom du personnage|character name|^nom\b|^name\b)\s*:?/,
  level: /(?:niveau|niv\.?|level|lvl)\s*:?\s*(\d{1,2})\b/,
  levelBeforeWord: /\b(\d{1,2})\s*(?:e|er|eme|th|st|nd|rd)?\s*niveau\b/,
  proficiencyBonus: /(?:bonus de maitrise|proficiency bonus)\D{0,12}(\d)\b/,
  maximumHitPoints: /(?:points de vie max\w*|pv max\w*|hit point maximum|maximum de points de vie|max hp)\D{0,20}(\d{1,3})\b/,
  currentAndMaximumHitPoints: /(?:points de vie|\bpv\b|hit points)\D{0,12}\d{1,3}\s*\/\s*(\d{1,3})\b/,
  speed: /(?:vitesse|speed)/,
  speedWithUnit: /(?:^|[^\d.,+-])(\d{1,3}(?:[.,]\d{1,2})?)\s*(m\b|ft\b|pieds\b|')/,
  speedWithoutUnit: /^[^\d+-]{0,12}(\d{1,3}(?:[.,]\d{1,2})?)\b/,
  languages: /(?:langues|languages)\s*:?\s*(.*)/,
  goldAfterNumber: /\b(\d{1,6})\s*(?:po|gp|pieces? d'or)\b/,
  goldBeforeNumber: /\b(?:po|gp)\s*:?\s*(\d{1,6})\b/,
  saveSection: /(jets? de sauvegarde|saving throws?)/,
  saveAfterLabel: /(?:sauvegarde|saving throw)\D{0,8}([+-]\s?\d{1,2})/g,
  saveBeforeLabel: /([+-]\s?\d{1,2})\s*(?:jet\s*de\s*)?sauvegarde/g,
  classSection: /(classe|class)/,
  speciesSection: /(espece|race|species)/,
  backgroundSection: /(historique|background|passe)/,
  alignmentSection: /(alignement|alignment)/,
  featSection: /\b(dons|feats)\b/,
  otherHeaders: /(nom du personnage|character name|espece|alignement|alignment|historique|background|classe|class|niveau|level|joueur|player)/
};

const HIT_DICE_BY_CLASS = { 'Artificier': 8, 'Barbare': 12, 'Barde': 8, 'Chasseur de sang': 10, 'Clerc': 8, 'Druide': 8, 'Ensorceleur': 6, 'Guerrier': 10, 'Magicien': 6, 'Moine': 8, 'Occultiste': 8, 'Paladin': 10, 'Rôdeur': 10, 'Roublard': 8 };

const LANGUAGE_ALIASES = {
  'Commun': ['common'], 'Commun des signes': ['common sign language', 'langue des signes'], 'Draconique': ['draconic'],
  'Elfique': ['elvish'], 'Géant': ['giant'], 'Gnome': ['gnomish'], 'Gobelin': ['goblin'], 'Halfelin': ['halfling'],
  'Nain': ['dwarvish', 'nanien'], 'Orc': ['orcish'], 'Abyssal': [], 'Céleste': ['celestial'], 'Infernal': [],
  'Primordial': ['aquan', 'auran', 'ignan', 'terran'], 'Profond': ['deep speech', 'langue des profondeurs'], 'Sylvestre': ['sylvan'],
  'Commun des profondeurs': ['undercommon'], 'Druidique': ['druidic'], 'Argot des voleurs': ["thieves' cant", 'jargon des voleurs']
};

const BACKGROUNDS_TOO_COMMON_TO_GUESS = ['Garde', 'Guide', 'Noble', 'Sage'];

const SIGNED_NUMBERS = /[+-]\s?\d{1,2}\b/g;
const ANY_NUMBER = /[+-]?\s?\d{1,2}\b/g;
const LINE_START_NUMBER = /^\W*?([+-]?\s?\d{1,2})\b/;

let tesseractLoading = null;
let gameData = null;

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordPattern = alias => new RegExp('(^|[^a-z])' + escapeRegExp(normalizeText(alias)) + '($|[^a-z])');
const abilityModifier = score => Math.floor((score - 10) / 2);
const proficiencyBonusAt = level => Math.ceil(level / 4) + 1;
const clampLevel = level => Math.min(MAXIMUM_LEVEL, Math.max(1, level || 1));
const isScore = number => number >= 1 && number <= MAXIMUM_SCORE;
const parseSigned = text => parseInt(text.replace(/\s/g, ''), 10);
const frenchDecimal = number => String(number).replace('.', ',');
const normalizeDashes = text => String(text).replace(/[−–—]/g, '-');

function aliasEntries(names, aliasesByName) {
  const entries = [];
  names.forEach(name => {
    [name, ...(aliasesByName[name] || [])].forEach(alias => entries.push({ name, pattern: wordPattern(alias), length: alias.length }));
  });
  return entries.sort((first, second) => second.length - first.length);
}

function findKnownName(text, entries) {
  const found = entries.find(entry => entry.pattern.test(text));
  return found ? found.name : '';
}

function linesAround(lines, labelPattern) {
  const index = lines.findIndex(line => labelPattern.test(line));
  return index < 0 ? '' : lines.slice(Math.max(0, index - 1), index + 2).join('\n');
}

function findNameNearLabelOrAnywhere(lines, text, labelPattern, entries) {
  return findKnownName(linesAround(lines, labelPattern), entries) || findKnownName(text, entries);
}

function firstMatchNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

function isPlausibleName(candidate) {
  const cleaned = candidate.trim();
  return cleaned.length >= 2 && cleaned.length <= NAME_MAXIMUM_LENGTH && /\p{L}{2}/u.test(cleaned) && !LABELS.otherHeaders.test(normalizeText(cleaned));
}

function firstPlausibleLine(rawLines) {
  const found = rawLines.map(line => line.replace(/[|_]+/g, '').trim()).find(line => isPlausibleName(line) && /^[\p{L}' ’-]+$/u.test(line));
  return found || '';
}

function readCharacterName(rawLines, lines) {
  const index = lines.findIndex(line => LABELS.name.test(line));
  if (index < 0) return firstPlausibleLine(rawLines);
  const afterLabel = rawLines[index].replace(/^.*?(nom du personnage|character name|nom|name)\s*:?/i, '');
  const candidates = [afterLabel, rawLines[index - 1] || '', rawLines[index + 1] || ''].map(candidate => candidate.replace(/[|_]+/g, '').trim());
  return candidates.find(isPlausibleName) || '';
}

function abilityLabelPositions(text, upperText, ability) {
  const positions = [];
  ability.labels.forEach(label => {
    for (const match of text.matchAll(new RegExp(escapeRegExp(label), 'g'))) positions.push({ source: text, end: match.index + label.length });
  });
  ability.abbreviations.forEach(abbreviation => {
    for (const match of upperText.matchAll(new RegExp('\\b' + abbreviation + '\\b', 'g'))) positions.push({ source: upperText, end: match.index + abbreviation.length });
  });
  return positions;
}

function windowAfter(position, length) {
  const window = position.source.slice(position.end, position.end + length);
  const otherLabel = window.search(/force|strength|dexterit|constitution|intelligence|sagesse|wisdom|charism|\b(FOR|STR|DEX|CON|INT|SAG|WIS|CHA)\b/i);
  return otherLabel < 0 ? window : window.slice(0, otherLabel);
}

function scoreFromWindow(window) {
  return scoreFromTokens((window.match(ANY_NUMBER) || []).map(token => token.replace(/\s/g, '')));
}

function scoreFromTokens(numbers) {
  const unsignedScore = numbers.find(token => !/^[+-]/.test(token) && isScore(parseInt(token, 10)));
  if (unsignedScore) return parseInt(unsignedScore, 10);
  const modifier = numbers.find(token => /^[+-]/.test(token));
  return modifier ? DEFAULT_SCORE + 2 * parseSigned(modifier) : 0;
}

function headerPatterns(ability) {
  return ability.labels.map(label => new RegExp('^\\W*' + label.toUpperCase() + '\\b'));
}

function lineStartNumbersBelow(upperLines, headerIndex) {
  return upperLines.slice(headerIndex + 1, headerIndex + 1 + HEADER_FOLLOWING_LINE_COUNT)
    .map(line => line.match(LINE_START_NUMBER))
    .filter(Boolean)
    .map(match => match[1].replace(/\s/g, ''));
}

function scoreBelowHeader(upperLines, ability) {
  const patterns = headerPatterns(ability);
  for (let index = 0; index < upperLines.length; index++) {
    if (!patterns.some(pattern => pattern.test(upperLines[index]))) continue;
    const score = scoreFromTokens(lineStartNumbersBelow(upperLines, index));
    if (isScore(score)) return score;
  }
  return 0;
}

function readAbilityScore(text, upperText, ability) {
  const headerScore = scoreBelowHeader(upperText.split('\n'), ability);
  if (headerScore) return headerScore;
  for (const position of abilityLabelPositions(text, upperText, ability)) {
    const score = scoreFromWindow(windowAfter(position, ABILITY_WINDOW_LENGTH));
    if (isScore(score)) return score;
  }
  return 0;
}

function readLevel(text, className) {
  const classAliases = className ? [className, ...(CLASS_ALIASES[className] || [])] : [];
  const classFollowedByLevel = classAliases.map(alias => new RegExp('(?:^|[^a-z])' + escapeRegExp(normalizeText(alias)) + '\\s*:?\\s*(\\d{1,2})\\b'));
  const level = firstMatchNumber(text, [LABELS.level, LABELS.levelBeforeWord, ...classFollowedByLevel]);
  if (level >= 1 && level <= MAXIMUM_LEVEL) return level;
  const proficiencyBonus = firstMatchNumber(text, [LABELS.proficiencyBonus]);
  return proficiencyBonus >= 2 ? (proficiencyBonus - 2) * 4 + 1 : 1;
}

function readSpeed(text) {
  const labelPosition = text.search(LABELS.speed);
  if (labelPosition < 0) return '';
  const afterLabel = text.slice(labelPosition).replace(LABELS.speed, '');
  const match = afterLabel.slice(0, SPEED_UNIT_WINDOW_LENGTH).match(LABELS.speedWithUnit) || afterLabel.match(LABELS.speedWithoutUnit);
  if (!match) return '';
  const value = parseFloat(match[1].replace(',', '.'));
  const unit = match[2] || '';
  const inFeet = /ft|pieds|'/.test(unit) || (!unit && value >= SPEED_IN_FEET_THRESHOLD);
  const meters = Math.round((inFeet ? value * METERS_PER_FOOT : value) * 2) / 2;
  return frenchDecimal(meters) + ' m';
}

function readLanguages(rawLines, lines) {
  const index = lines.findIndex(line => LABELS.languages.test(line));
  if (index < 0) return '';
  const region = lines.slice(index, index + LANGUAGE_LINE_COUNT).join('\n');
  const known = aliasEntries(Object.keys(LANGUAGE_ALIASES), LANGUAGE_ALIASES)
    .filter(entry => entry.pattern.test(region))
    .sort((first, second) => region.search(first.pattern) - region.search(second.pattern));
  const names = [...new Set(known.map(entry => entry.name))];
  if (names.length) return names.join(', ');
  const remainder = rawLines[index].replace(/^.*?(langues|languages)\s*:?/i, '').trim();
  return LABELS.otherHeaders.test(normalizeText(remainder)) ? '' : remainder;
}

function readAlignment(lines, text) {
  const entries = aliasEntries(ALIGNMENTS.map(alignment => alignment.name), Object.fromEntries(ALIGNMENTS.map(alignment => [alignment.name, alignment.aliases])));
  const nearLabel = findKnownName(linesAround(lines, LABELS.alignmentSection), entries);
  if (nearLabel) return nearLabel;
  return findKnownName(text, entries.filter(entry => entry.name !== 'Neutre'));
}

function signedNumberInLine(line, label) {
  const labelPosition = line.search(label);
  const signedNumbers = [...line.matchAll(SIGNED_NUMBERS)];
  const afterLabel = signedNumbers.find(match => match.index > labelPosition);
  const beforeLabel = signedNumbers.filter(match => match.index < labelPosition).pop();
  const found = afterLabel || beforeLabel;
  return found ? parseSigned(found[0]) : null;
}

function lostMinusSign(value, modifier) {
  return modifier < 0 && value === -modifier;
}

function proficiencyFromValue(value, modifier, proficiencyBonus) {
  if (value == null || lostMinusSign(value, modifier)) return 0;
  if (value - modifier === 2 * proficiencyBonus) return 2;
  return value - modifier === proficiencyBonus ? 1 : 0;
}

function readSkillProficiencies(lines, scores, proficiencyBonus) {
  return SKILLS.map(skill => {
    const patterns = [skill.name, ...skill.aliases].map(wordPattern);
    const line = lines.find(candidate => patterns.some(pattern => pattern.test(candidate)));
    if (!line) return 0;
    const label = patterns.find(pattern => pattern.test(line));
    return proficiencyFromValue(signedNumberInLine(line, label), abilityModifier(scores[skill.ability] || DEFAULT_SCORE), proficiencyBonus);
  });
}

function saveValuesInWindow(window) {
  return [...window.matchAll(LABELS.saveAfterLabel), ...window.matchAll(LABELS.saveBeforeLabel)].map(match => parseSigned(match[1]));
}

function saveValuesInsideAbilityBoxes(text, upperText, ability) {
  return abilityLabelPositions(text, upperText, ability)
    .flatMap(position => saveValuesInWindow(position.source.slice(position.end, position.end + SAVE_WINDOW_LENGTH).toLowerCase()));
}

function saveValuesInSaveSection(lines, ability) {
  const start = lines.findIndex(line => LABELS.saveSection.test(line));
  if (start < 0) return [];
  const labelPatterns = ability.labels.map(wordPattern);
  return lines.slice(start, start + SAVE_SECTION_LINE_COUNT)
    .map(line => {
      const label = labelPatterns.find(pattern => pattern.test(line));
      return label ? signedNumberInLine(line, label) : null;
    })
    .filter(value => value != null);
}

function readSavingThrows(lines, text, upperText, scores, proficiencyBonus) {
  const saves = {};
  ABILITIES.forEach(ability => {
    const modifier = abilityModifier(scores[ability.key] || DEFAULT_SCORE);
    const values = [...saveValuesInsideAbilityBoxes(text, upperText, ability), ...saveValuesInSaveSection(lines, ability)];
    saves[ability.key] = values.some(value => proficiencyFromValue(value, modifier, proficiencyBonus) === 1);
  });
  return saves;
}

function readBackground(lines, text, backgroundNames) {
  const entries = aliasEntries(backgroundNames, BACKGROUND_ALIASES);
  const nearLabel = findKnownName(linesAround(lines, LABELS.backgroundSection), entries);
  return nearLabel || findKnownName(text, entries.filter(entry => !BACKGROUNDS_TOO_COMMON_TO_GUESS.includes(entry.name)));
}

function readFeats(lines, feats) {
  const index = lines.findIndex(line => LABELS.featSection.test(line));
  if (index < 0) return [];
  const region = lines.slice(index, index + FEAT_SECTION_LINE_COUNT).join('\n');
  return feats.filter(feat => wordPattern(feat.name).test(region)).map(feat => feat.name);
}

function readGold(text) {
  return firstMatchNumber(text, [LABELS.goldAfterNumber, LABELS.goldBeforeNumber]);
}

function readMaximumHitPoints(text) {
  return firstMatchNumber(text, [LABELS.maximumHitPoints, LABELS.currentAndMaximumHitPoints]);
}

function readCharacterSheetFromText(ocrText, names) {
  const rawText = normalizeDashes(ocrText);
  const rawLines = rawText.split('\n');
  const lines = rawLines.map(normalizeText);
  const text = lines.join('\n');
  const upperText = withoutAccents(rawText);
  const className = findNameNearLabelOrAnywhere(lines, text, LABELS.classSection, aliasEntries(names.classes, CLASS_ALIASES));
  const level = clampLevel(readLevel(text, className));
  const scores = Object.fromEntries(ABILITIES.map(ability => [ability.key, readAbilityScore(text, upperText, ability)]));
  const proficiencyBonus = proficiencyBonusAt(level);
  return {
    nom: readCharacterName(rawLines, lines),
    classe: className,
    niveau: level,
    espece: findNameNearLabelOrAnywhere(lines, text, LABELS.speciesSection, aliasEntries(names.species, SPECIES_ALIASES)),
    historique: readBackground(lines, text, names.backgrounds),
    alignement: readAlignment(lines, text),
    scores,
    pvmax: readMaximumHitPoints(text),
    vitesse: readSpeed(text),
    langues: readLanguages(rawLines, lines),
    po: readGold(text),
    dons: readFeats(lines, names.feats),
    saves: readSavingThrows(lines, text, upperText, scores, proficiencyBonus),
    skills: readSkillProficiencies(lines, scores, proficiencyBonus)
  };
}

function firstKnownName(candidates, entries) {
  return candidates.map(candidate => findKnownName(normalizeText(candidate), entries)).find(Boolean) || '';
}

function closestSubclass(candidates, subclassNames) {
  const candidateWords = candidates.flatMap(candidate => normalizeText(candidate).split(/[^a-z]+/)).filter(word => word.length >= SUBCLASS_WORD_MINIMUM);
  const nameWords = name => normalizeText(name).split(/[^a-z]+/).filter(word => word.length >= SUBCLASS_WORD_MINIMUM);
  const matches = name => nameWords(name).some(word => candidateWords.some(candidate => word.startsWith(candidate) || candidate.startsWith(word)));
  return subclassNames.find(matches) || '';
}

function mergedProficiencies(spatialValues, textProficiencies, abilityOf, scores, proficiencyBonus) {
  return textProficiencies.map((textProficiency, index) => {
    const value = spatialValues[index];
    return value == null ? textProficiency : proficiencyFromValue(value, abilityModifier(scores[abilityOf(index)] || DEFAULT_SCORE), proficiencyBonus);
  });
}

function mergedSaves(spatial, textSaves, scores, proficiencyBonus) {
  return Object.fromEntries(ABILITIES.map(ability => {
    const value = spatial.saveValues[ability.key];
    const modifier = abilityModifier(scores[ability.key] || DEFAULT_SCORE);
    return [ability.key, value == null ? textSaves[ability.key] : proficiencyFromValue(value, modifier, proficiencyBonus) === 1];
  }));
}

function mergeSpatialReading(sheet, spatial, names) {
  const className = firstKnownName(spatial.texts.className, aliasEntries(names.classes, CLASS_ALIASES)) || sheet.classe;
  const backgroundText = spatial.texts.background[0] || '';
  const level = spatial.level || sheet.niveau;
  const scores = Object.assign({}, sheet.scores, spatial.scores);
  const proficiencyBonus = proficiencyBonusAt(level);
  const skillProficiencies = mergedProficiencies(spatial.skillValues, sheet.skills, index => SKILLS[index].ability, scores, proficiencyBonus);
  return Object.assign({}, sheet, {
    nom: spatial.texts.name[0] || sheet.nom,
    classe: className,
    sousclasse: closestSubclass(spatial.texts.subclass, names.subclassesOf(className)) || spatial.texts.subclass[0] || '',
    niveau: level,
    espece: firstKnownName(spatial.texts.species, aliasEntries(names.species, SPECIES_ALIASES)) || sheet.espece,
    historique: firstKnownName(spatial.texts.background, aliasEntries(names.backgrounds, BACKGROUND_ALIASES)) || backgroundText || sheet.historique,
    scores,
    pvmax: spatial.maximumHitPoints || sheet.pvmax,
    vitesse: (spatial.speedText && readSpeed('vitesse ' + normalizeText(spatial.speedText))) || sheet.vitesse,
    saves: mergedSaves(spatial, sheet.saves, scores, proficiencyBonus),
    skills: skillProficiencies
  });
}

function readCharacterSheet(ocrText, names, words) {
  const sheet = Object.assign({ sousclasse: '' }, readCharacterSheetFromText(ocrText, names));
  return words && words.length ? mergeSpatialReading(sheet, LectureSpatiale.read(words), names) : sheet;
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractLoading) return tesseractLoading;
  tesseractLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TESSERACT_SCRIPT_URL;
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => {
      tesseractLoading = null;
      reject(new Error('tesseract'));
    };
    document.head.appendChild(script);
  });
  return tesseractLoading;
}

async function loadGameData() {
  if (gameData) return gameData;
  const [classes, species, backgrounds, subclasses, feats] = await Promise.all([
    fetchJson('assets/json/vf/classes.json'),
    fetchJson('assets/json/vf/especes.json'),
    fetchJson('assets/json/vf/historiques.json'),
    fetchJson('assets/json/vf/sousclasses.json'),
    fetchJson('assets/json/vf/dons.json')
  ]);
  gameData = { classes, species, backgrounds, subclasses, feats };
  return gameData;
}

function knownNames(data) {
  return {
    classes: Object.keys(data.classes.classes),
    species: Object.keys(data.species),
    backgrounds: Object.keys(data.backgrounds),
    subclassesOf: className => Object.keys(data.subclasses[className] || {}),
    allSubclasses: [...new Set(Object.values(data.subclasses).flatMap(Object.keys))],
    feats: data.feats.filter(feat => feat.cat !== INVOCATION_CATEGORY).map(feat => ({ id: feat.id, name: feat.nom }))
  };
}

function scaledSize(width, height) {
  const ratio = Math.min(1, MAXIMUM_IMAGE_SIDE / Math.max(width, height));
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

function contrastStretch(pixels) {
  let darkest = 255;
  let lightest = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const gray = 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
    pixels[index] = gray;
    darkest = Math.min(darkest, gray);
    lightest = Math.max(lightest, gray);
  }
  const range = Math.max(1, lightest - darkest);
  for (let index = 0; index < pixels.length; index += 4) {
    const stretched = (pixels[index] - darkest) * 255 / range;
    pixels[index] = pixels[index + 1] = pixels[index + 2] = stretched;
  }
}

async function preparedImage(file) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = scaledSize(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  contrastStretch(image.data);
  context.putImageData(image, 0, 0);
  return canvas;
}

function shiftedWords(words, verticalOffset) {
  return words.map(word => ({ text: word.text, confidence: word.confidence, bbox: { x0: word.bbox.x0, x1: word.bbox.x1, y0: word.bbox.y0 + verticalOffset, y1: word.bbox.y1 + verticalOffset } }));
}

async function recognizeImages(files, onProgress) {
  const Tesseract = await loadTesseract();
  const passCount = files.length * PAGE_SEGMENTATION_MODES.length;
  let currentPass = 0;
  const reportProgress = message => {
    if (message.status === 'recognizing text') onProgress((currentPass + message.progress) / passCount, 'Lecture de la photo ' + (Math.floor(currentPass / PAGE_SEGMENTATION_MODES.length) + 1) + ' sur ' + files.length + ' (passe ' + (currentPass % PAGE_SEGMENTATION_MODES.length + 1) + ')…');
    else onProgress(0, 'Préparation de la lecture (téléchargement la première fois)…');
  };
  const worker = await Tesseract.createWorker(OCR_LANGUAGES, 1, { logger: reportProgress });
  const reading = { text: '', words: [] };
  let verticalOffset = 0;
  try {
    for (const file of files) {
      const image = await preparedImage(file);
      for (const mode of PAGE_SEGMENTATION_MODES) {
        await worker.setParameters({ tessedit_pageseg_mode: mode });
        const result = await worker.recognize(image);
        if (mode === PAGE_SEGMENTATION_SINGLE_BLOCK) reading.text += result.data.text + '\n';
        reading.words.push(...shiftedWords(result.data.words || [], verticalOffset));
        currentPass++;
      }
      verticalOffset += image.height + PAGE_GAP;
    }
  } finally {
    await worker.terminate();
  }
  return reading;
}

function optionsHtml(names, selected) {
  return '<option value="">—</option>' + names.map(name => `<option${name === selected ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('');
}

function inputHtml(label, name, value, attributes) {
  return `<label><small>${label}</small><input name="${name}" value="${escapeHtml(value)}" ${attributes || ''}></label>`;
}

function suggestionInputHtml(label, name, value, suggestions) {
  const listId = 'ip-' + name;
  return `<label><small>${label}</small><input name="${name}" value="${escapeHtml(value)}" list="${listId}"><datalist id="${listId}">${suggestions.map(suggestion => `<option value="${escapeHtml(suggestion)}">`).join('')}</datalist></label>`;
}

function selectHtml(label, name, names, selected) {
  return `<label><small>${label}</small><select name="${name}">${optionsHtml(names, selected)}</select></label>`;
}

function abilityRowHtml(ability, sheet) {
  const score = sheet.scores[ability.key] || '';
  const checked = sheet.saves[ability.key] ? ' checked' : '';
  return `<label class="ipab"><small>${ability.name}</small><input name="ab_${ability.key}" type="number" min="1" max="30" value="${score}" placeholder="?">`
    + `<span><input type="checkbox" name="sv_${ability.key}"${checked}> sauv.</span></label>`;
}

function skillRowHtml(skill, index, proficiency) {
  const choices = ['—', 'Maîtrise', 'Expertise'];
  const options = choices.map((choice, level) => `<option value="${level}"${level === proficiency ? ' selected' : ''}>${choice}</option>`).join('');
  return `<label class="ipsk"><span>${skill.name}</span><select name="sk_${index}">${options}</select></label>`;
}

function reviewFormHtml(sheet, names, ocrText) {
  return `<p class="iphint">Vérifie et corrige ce qui a été lu sur la photo avant de créer le personnage. Les caractéristiques sont les valeurs finales écrites sur la fiche.</p>
   <div class="ipgrid">
    ${inputHtml('Nom', 'nom', sheet.nom, 'required')}
    ${selectHtml('Classe', 'classe', names.classes, sheet.classe)}
    ${inputHtml('Niveau', 'niveau', sheet.niveau, 'type="number" min="1" max="20"')}
    ${selectHtml('Espèce', 'espece', names.species, sheet.espece)}
    ${suggestionInputHtml('Sous-classe', 'sousclasse', sheet.sousclasse, sheet.classe ? names.subclassesOf(sheet.classe) : names.allSubclasses)}
    ${suggestionInputHtml('Historique', 'historique', sheet.historique, names.backgrounds)}
    ${selectHtml('Alignement', 'alignement', ALIGNMENTS.map(alignment => alignment.name), sheet.alignement)}
    ${inputHtml('PV maximum', 'pvmax', sheet.pvmax || '', 'type="number" min="1"')}
    ${inputHtml('Vitesse', 'vitesse', sheet.vitesse)}
    ${inputHtml('Pièces d’or', 'po', sheet.po || '', 'type="number" min="0"')}
    <label class="ipwide"><small>Langues</small><input name="langs" value="${escapeHtml(sheet.langues)}"></label>
    <label class="ipwide"><small>Dons (séparés par des virgules)</small><input name="dons" value="${escapeHtml(sheet.dons.join(', '))}"></label>
   </div>
   <h4>Caractéristiques et jets de sauvegarde maîtrisés</h4>
   <div class="ipabs">${ABILITIES.map(ability => abilityRowHtml(ability, sheet)).join('')}</div>
   <h4>Compétences</h4>
   <div class="ipsks">${SKILLS.map((skill, index) => skillRowHtml(skill, index, sheet.skills[index])).join('')}</div>
   <details class="ipraw"><summary>Texte lu sur la photo</summary>
    <p class="iphint">Tu peux corriger ce texte puis relancer l’analyse.</p>
    <textarea name="ocr" rows="8">${escapeHtml(ocrText)}</textarea>
    <button type="button" data-act="reparse">Relire ce texte</button>
   </details>`;
}

function photoStepHtml() {
  return `<p class="iphint">Prends en photo ta fiche papier (bien à plat, cadrée, sans reflet). Tu peux ajouter plusieurs photos, par exemple une par page. La lecture se fait dans ton navigateur : aucune image n’est envoyée.</p>
   <div class="ipbtns">
    <label class="ippick primary">Prendre une photo<input type="file" accept="image/*" capture="environment" data-pick hidden></label>
    <label class="ippick">Choisir des images<input type="file" accept="image/*" multiple data-pick hidden></label>
   </div>
   <div class="ipthumbs" data-thumbs></div>
   <div class="ipprogress" data-progress hidden><progress max="1" value="0"></progress><small data-progress-text></small></div>`;
}

function dialogHtml() {
  return `<form method="dialog" novalidate><h3>Importer une fiche depuis une photo</h3>
   <div data-body>${photoStepHtml()}</div>
   <p class="iperr" data-err></p>
   <div class="ipactions"><button type="button" data-act="cancel">Annuler</button><button type="submit" class="primary" data-submit disabled>Lire la fiche</button></div></form>`;
}

function numberField(form, name) {
  return parseInt(form.elements[name].value, 10) || 0;
}

function sheetFromReview(form, names) {
  const level = clampLevel(numberField(form, 'niveau'));
  const className = form.elements.classe.value;
  const speciesName = form.elements.espece.value;
  const backgroundText = form.elements.historique.value.trim();
  const backgroundName = names.backgrounds.includes(backgroundText) ? backgroundText : '';
  const subclassText = form.elements.sousclasse.value.trim();
  const speed = form.elements.vitesse.value.trim();
  const maximumHitPoints = numberField(form, 'pvmax');
  const sheet = { nom: form.elements.nom.value.trim(), niveau: String(level), alignement: form.elements.alignement.value, langs: form.elements.langs.value.trim() };
  ABILITIES.forEach(ability => {
    sheet['ab_' + ability.key] = String(numberField(form, 'ab_' + ability.key) || DEFAULT_SCORE);
    if (form.elements['sv_' + ability.key].checked) sheet['sv_' + ability.key] = true;
  });
  SKILLS.forEach((skill, index) => {
    const proficiency = numberField(form, 'sk_' + index);
    if (proficiency >= 1) sheet['sk_' + index] = true;
    if (proficiency === 2) sheet['ske_' + index] = true;
  });
  if (className) addClass(sheet, className, level);
  if (maximumHitPoints) sheet.pv = sheet.pvmax = String(maximumHitPoints);
  if (speciesName) Object.assign(sheet, { race: speciesName, espece: speciesName, sespece: '' });
  if (backgroundText) sheet.historique = backgroundText;
  if (backgroundName) sheet.bgsel = backgroundName;
  if (subclassText) addSubclass(sheet, subclassText, names.subclassesOf(className));
  if (speed) sheet.vitesse = speed;
  if (numberField(form, 'po')) sheet.po = String(numberField(form, 'po'));
  sheet.extras = {
    sp: { k: speciesName, ch: {}, auto: speed },
    bg: { k: backgroundName, ch: {} },
    dons: takenFeats(form.elements.dons.value, names.feats), spl: [], auto: {}, mal: [], oh: {}
  };
  return sheet;
}

const randomFeatInstanceId = () => Math.random().toString(36).slice(2, 8);

function takenFeats(featText, feats) {
  return featText.split(',').map(name => normalizeText(name)).filter(Boolean)
    .map(name => feats.find(feat => normalizeText(feat.name) === name))
    .filter(Boolean)
    .map(feat => ({ u: randomFeatInstanceId(), id: feat.id, ch: {} }));
}

function addSubclass(sheet, subclassText, knownSubclasses) {
  sheet.sousclasse = subclassText;
  if (knownSubclasses.includes(subclassText)) sheet.sclasse = subclassText;
}

function addClass(sheet, className, level) {
  const hitDie = HIT_DICE_BY_CLASS[className] || DEFAULT_HIT_DIE;
  Object.assign(sheet, { classe: className, clsel: className, dvtot: level + 'd' + hitDie, dvrest: String(level) });
}


function createCharacterFromReview(form, names) {
  const sheet = sheetFromReview(form, names);
  return Persos.add(sheet.nom, { fiche: { version: 5, type: 'fiche-dnd-5e', data: sheet } });
}

function createImportDialog(options) {
  const dialog = document.createElement('dialog');
  dialog.className = 'ipdlg';
  dialog.innerHTML = dialogHtml();
  document.body.appendChild(dialog);
  return {
    options: options || {},
    dialog,
    form: dialog.querySelector('form'),
    body: dialog.querySelector('[data-body]'),
    submitButton: dialog.querySelector('[data-submit]'),
    errorArea: dialog.querySelector('[data-err]'),
    files: [],
    reviewing: false,
    reading: false
  };
}

function closeImportDialog(importDialog) {
  importDialog.dialog.close();
  importDialog.dialog.remove();
}

function showImportError(importDialog, text) {
  importDialog.errorArea.textContent = text;
}

function thumbnailElement(importDialog, file, index) {
  const thumbnail = document.createElement('figure');
  const image = document.createElement('img');
  image.src = URL.createObjectURL(file);
  image.alt = 'Photo ' + (index + 1);
  image.onload = () => URL.revokeObjectURL(image.src);
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.textContent = '×';
  removeButton.title = 'Retirer cette photo';
  removeButton.onclick = () => {
    importDialog.files.splice(index, 1);
    renderThumbnails(importDialog);
  };
  thumbnail.append(image, removeButton);
  return thumbnail;
}

function renderThumbnails(importDialog) {
  const container = importDialog.body.querySelector('[data-thumbs]');
  container.replaceChildren(...importDialog.files.map((file, index) => thumbnailElement(importDialog, file, index)));
  importDialog.submitButton.disabled = !importDialog.files.length;
}

function addPickedFiles(importDialog, input) {
  importDialog.files.push(...[...input.files].filter(file => file.type.startsWith('image/')));
  input.value = '';
  showImportError(importDialog, '');
  renderThumbnails(importDialog);
}

function setPhotoPickersEnabled(importDialog, enabled) {
  importDialog.body.querySelectorAll('[data-pick]').forEach(input => { input.disabled = !enabled; });
}

function showProgress(importDialog, fraction, text) {
  const progress = importDialog.body.querySelector('[data-progress]');
  progress.hidden = false;
  progress.querySelector('progress').value = fraction;
  progress.querySelector('[data-progress-text]').textContent = text;
}

function showReview(importDialog, ocrText, data, words) {
  const names = knownNames(data);
  importDialog.body.innerHTML = reviewFormHtml(readCharacterSheet(ocrText, names, words), names, ocrText);
  importDialog.body.querySelector('[data-act="reparse"]').onclick = () => showReview(importDialog, importDialog.form.elements.ocr.value, data);
  importDialog.submitButton.textContent = 'Créer le personnage';
  importDialog.submitButton.disabled = false;
  importDialog.reviewing = true;
}

async function readPhotos(importDialog) {
  importDialog.reading = true;
  importDialog.submitButton.disabled = true;
  setPhotoPickersEnabled(importDialog, false);
  showImportError(importDialog, '');
  try {
    const reportProgress = (fraction, text) => showProgress(importDialog, fraction, text);
    const [data, reading] = await Promise.all([loadGameData(), recognizeImages(importDialog.files, reportProgress)]);
    showReview(importDialog, reading.text, data, reading.words);
  } catch (error) {
    showImportError(importDialog, 'La lecture a échoué. Vérifie ta connexion internet (nécessaire la première fois) et réessaie.');
    setPhotoPickersEnabled(importDialog, true);
    importDialog.submitButton.disabled = !importDialog.files.length;
  }
  importDialog.reading = false;
}

function confirmReview(importDialog) {
  const nameField = importDialog.form.elements.nom;
  if (!nameField.value.trim()) {
    showImportError(importDialog, 'Indique au moins le nom du personnage.');
    nameField.focus();
    return;
  }
  const character = createCharacterFromReview(importDialog.form, knownNames(gameData));
  closeImportDialog(importDialog);
  if (importDialog.options.onImported) importDialog.options.onImported(character);
}

function submitImportDialog(importDialog) {
  if (importDialog.reading) return;
  if (importDialog.reviewing) confirmReview(importDialog);
  else readPhotos(importDialog);
}

function bindImportDialog(importDialog) {
  const { dialog, form, body } = importDialog;
  body.querySelectorAll('[data-pick]').forEach(input => { input.onchange = () => addPickedFiles(importDialog, input); });
  dialog.querySelector('[data-act="cancel"]').onclick = () => closeImportDialog(importDialog);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (!importDialog.reading) closeImportDialog(importDialog);
  });
  dialog.addEventListener('input', event => event.stopPropagation());
  dialog.addEventListener('change', event => event.stopPropagation());
  form.onsubmit = event => {
    event.preventDefault();
    submitImportDialog(importDialog);
  };
}

function openPhotoImport(options) {
  const importDialog = createImportDialog(options);
  bindImportDialog(importDialog);
  importDialog.dialog.showModal();
}

window.ImportPhoto = { open: openPhotoImport, read: readCharacterSheet };
})();
