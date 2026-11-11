(function () {
'use strict';

const ROW_TOLERANCE = 0.6;
const VALUE_ABOVE_DEPTH = 3.5;
const NUMBER_ABOVE_DEPTH = 4;
const NUMBER_ABOVE_SIDE_MARGIN = 2;
const VALUE_BELOW_DEPTH = 5;
const VALUE_BELOW_SIDE_MARGIN = 3;
const LABEL_PHRASE_GAP = 2;
const NEXT_COLUMN_GAP = 3;
const DEFAULT_FIELD_WIDTH = 30;
const WORD_GAP = 2;
const MINIMUM_WORD_SIZE = 6;
const SAME_SPOT_OVERLAP = 0.5;
const LABEL_HEIGHT_RATIO = 1.6;
const ROW_ANCHOR_DISTANCE = 4;
const ABILITY_BOX_HALF_WIDTH = 6;
const ABILITY_BOX_DEPTH = 6;
const ROW_VALUE_MAXIMUM_GAP = 6;
const SAVE_COLUMN_TOLERANCE = 8;
const MAXIMUM_SCORE = 30;
const MAXIMUM_MODIFIER = 10;
const MAXIMUM_LEVEL = 20;
const MAXIMUM_HIT_POINTS = 999;
const DEFAULT_SCORE = 10;
const CURRENT_HIT_POINTS_DISTANCE = 15;

const ABILITY_HEADERS = [
  { key: 'for', pattern: /^(force|strength)$/ },
  { key: 'dex', pattern: /^dexterit[ey]$/ },
  { key: 'con', pattern: /^constitution$/ },
  { key: 'int', pattern: /^intelligence$/ },
  { key: 'sag', pattern: /^(sagesse|wisdom)$/ },
  { key: 'cha', pattern: /^(charisme|charisma)$/ }
];

const SKILL_PREFIXES = [
  ['acrob'], ['arcan'], ['athle'], ['discr', 'steal'], ['dress', 'anima'], ['escam', 'sleig'],
  ['histo'], ['intim'], ['intui', 'insig', 'perspi'], ['inves'], ['medec', 'medic'], ['natur'],
  ['perce'], ['persu'], ['relig'], ['repres', 'perfo'], ['superc', 'tromp', 'decep'], ['survi']
];

const TEXT_FIELD_LABELS = {
  name: /^(personnage|character)$/,
  className: /^(classe|class)$/,
  species: /^(espece|species|race)$/,
  background: /^(historique|background)$/,
  subclass: /^(sous-classe|subclass)$/
};

const LABELS = {
  level: /^(niveau|level)$/,
  maximum: /^max$/,
  current: /^(actuel|current)$/,
  speed: /^(vitesse|speed)$/,
  save: /^(sauvegard|saving)/
};

const SIGNED_OR_PLAIN_NUMBER = /^[+-]?\d{1,3}$/;

const isUppercase = word => /\p{Lu}/u.test(word.raw) && word.raw === word.raw.toUpperCase();
const numberValue = word => SIGNED_OR_PLAIN_NUMBER.test(word.key) ? parseInt(word.key, 10) : null;
const isNumber = word => numberValue(word) !== null;
const isSigned = word => /^[+-]/.test(word.key);
const abilityModifier = score => Math.floor((score - 10) / 2);
const sameRow = (first, second) => Math.abs(first.centerY - second.centerY) < ROW_TOLERANCE * Math.max(first.height, second.height);
const similarHeight = (word, label) => word.height >= label.height / LABEL_HEIGHT_RATIO && word.height <= label.height * LABEL_HEIGHT_RATIO;
const byLeft = (first, second) => first.x0 - second.x0;

function wordKey(text) {
  return normalizeText(String(text).replace(/[−–—]/g, '-')).replace(/^[^a-z0-9+-]+|[^a-z0-9]+$/g, '');
}

function preparedWord(word) {
  const { x0, y0, x1, y1 } = word.bbox;
  return { confidence: word.confidence || 0, raw: word.text.trim(), text: word.text.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.)]+$/gu, ''), key: wordKey(word.text), x0, y0, x1, y1, height: Math.max(1, y1 - y0), centerX: (x0 + x1) / 2, centerY: (y0 + y1) / 2 };
}

function horizontalOverlapRatio(first, second) {
  const overlap = Math.min(first.x1, second.x1) - Math.max(first.x0, second.x0);
  return overlap / Math.max(1, Math.min(first.x1 - first.x0, second.x1 - second.x0));
}

const sameSpot = (first, second) => sameRow(first, second) && horizontalOverlapRatio(first, second) > SAME_SPOT_OVERLAP;

function mostConfidentReadings(words) {
  return words.filter(word => !words.some(other => other !== word && sameSpot(other, word)
    && (other.confidence > word.confidence || (other.confidence === word.confidence && words.indexOf(other) < words.indexOf(word)))));
}

const isReadableSize = word => word.height >= MINIMUM_WORD_SIZE && word.x1 - word.x0 >= MINIMUM_WORD_SIZE;

function uppercaseLabels(words, pattern) {
  return words.filter(word => pattern.test(word.key) && isUppercase(word));
}

function labelPhraseStart(words, label) {
  let start = label;
  let previous = null;
  do {
    previous = words.find(word => word !== start && sameRow(word, start) && isUppercase(word) && similarHeight(word, label) && word.x1 <= start.x0 && start.x0 - word.x1 < LABEL_PHRASE_GAP * start.height);
    if (previous) start = previous;
  } while (previous);
  return start;
}

function nextColumnStart(words, label) {
  const following = words
    .filter(word => sameRow(word, label) && isUppercase(word) && similarHeight(word, label) && word.x0 > label.x1 + NEXT_COLUMN_GAP * label.height)
    .sort(byLeft)[0];
  return following ? following.x0 : label.x0 + DEFAULT_FIELD_WIDTH * label.height;
}

function contiguousFromLeft(rowWords) {
  const contiguous = rowWords.slice(0, 1);
  for (const word of rowWords.slice(1)) {
    const last = contiguous[contiguous.length - 1];
    if (word.x0 - last.x1 > WORD_GAP * last.height) break;
    contiguous.push(word);
  }
  return contiguous;
}

function rowAnchoredAt(candidates, start) {
  const anchors = candidates.filter(word => Math.abs(word.x0 - start.x0) < ROW_ANCHOR_DISTANCE * start.height);
  if (!anchors.length) return [];
  const anchor = anchors.reduce((lowest, word) => word.y1 > lowest.y1 ? word : lowest);
  return contiguousFromLeft(candidates.filter(word => sameRow(word, anchor) && word.x0 >= anchor.x0).sort(byLeft));
}

function textAboveLabel(words, label) {
  const start = labelPhraseStart(words, label);
  const left = start.x0 - label.height;
  const right = Math.min(nextColumnStart(words, label), start.x0 + DEFAULT_FIELD_WIDTH * label.height) - label.height;
  const candidates = words.filter(word => word.centerX >= left && word.centerX <= right
    && word.y1 <= label.y0 + ROW_TOLERANCE * label.height && word.y1 >= label.y0 - VALUE_ABOVE_DEPTH * label.height
    && !sameRow(word, label));
  return rowAnchoredAt(candidates, start).map(word => word.text).join(' ').trim();
}

function textFieldCandidates(words, pattern) {
  return uppercaseLabels(words, pattern).map(label => textAboveLabel(words, label)).filter(Boolean);
}

function numberAboveLabel(words, label) {
  const candidates = words.filter(word => isNumber(word)
    && word.centerX >= label.x0 - NUMBER_ABOVE_SIDE_MARGIN * label.height && word.centerX <= label.x1 + NUMBER_ABOVE_SIDE_MARGIN * label.height
    && word.y1 <= label.y0 + ROW_TOLERANCE * label.height && word.y1 >= label.y0 - NUMBER_ABOVE_DEPTH * label.height);
  const closest = candidates.sort((first, second) => second.y1 - first.y1)[0];
  return closest ? numberValue(closest) : null;
}

function readLevel(words) {
  const levels = uppercaseLabels(words, LABELS.level).map(label => numberAboveLabel(words, label));
  return levels.find(level => level >= 1 && level <= MAXIMUM_LEVEL) || 0;
}

function maximumHitPointsLabels(words) {
  const maximumLabels = uppercaseLabels(words, LABELS.maximum).sort(byLeft);
  const currentLabel = uppercaseLabels(words, LABELS.current)[0];
  if (!currentLabel) return maximumLabels;
  const distance = label => label.x0 > currentLabel.x0 && sameRow(label, currentLabel) ? label.x0 - currentLabel.x0 : Infinity;
  return maximumLabels.filter(label => distance(label) < CURRENT_HIT_POINTS_DISTANCE * currentLabel.height).concat(maximumLabels);
}

function readMaximumHitPoints(words) {
  const values = maximumHitPointsLabels(words).map(label => numberAboveLabel(words, label));
  return values.find(value => value >= 1 && value <= MAXIMUM_HIT_POINTS) || 0;
}

function readSpeedText(words) {
  for (const header of uppercaseLabels(words, LABELS.speed)) {
    const below = words.filter(word => word.centerX >= header.x0 - VALUE_BELOW_SIDE_MARGIN * header.height
      && word.centerX <= header.x1 + VALUE_BELOW_SIDE_MARGIN * header.height
      && word.y0 >= header.y1 - ROW_TOLERANCE * header.height && word.y0 <= header.y1 + VALUE_BELOW_DEPTH * header.height
      && /\d/.test(word.key));
    const first = below.sort((first, second) => first.y0 - second.y0)[0];
    if (first) return words.filter(word => sameRow(word, first) && Math.abs(word.centerX - first.centerX) < VALUE_BELOW_DEPTH * header.height).sort(byLeft).map(word => word.raw).join(' ');
  }
  return '';
}

function numbersInAbilityBox(words, header) {
  return words.filter(word => isNumber(word)
    && Math.abs(word.centerX - header.centerX) <= ABILITY_BOX_HALF_WIDTH * header.height
    && word.y0 >= header.y1 - ROW_TOLERANCE * header.height && word.y0 <= header.y1 + ABILITY_BOX_DEPTH * header.height);
}

function scoreFromBoxNumbers(numbers) {
  const plainScores = numbers.filter(word => !isSigned(word) && numberValue(word) >= 1 && numberValue(word) <= MAXIMUM_SCORE).map(numberValue);
  const modifiers = numbers.map(numberValue).filter(value => Math.abs(value) <= MAXIMUM_MODIFIER);
  const consistent = plainScores.find(score => modifiers.includes(abilityModifier(score)));
  if (consistent) return consistent;
  if (plainScores.length) return Math.max(...plainScores);
  const signed = numbers.find(isSigned);
  return signed ? DEFAULT_SCORE + 2 * numberValue(signed) : 0;
}

function abilityHeaders(words) {
  return ABILITY_HEADERS.flatMap(ability => uppercaseLabels(words, ability.pattern).map(header => ({ key: ability.key, header })));
}

function readScores(words, headers) {
  const scores = {};
  headers.forEach(({ key, header }) => {
    if (scores[key]) return;
    const score = scoreFromBoxNumbers(numbersInAbilityBox(words, header));
    if (score >= 1 && score <= MAXIMUM_SCORE) scores[key] = score;
  });
  return scores;
}

function numberLeftOnRow(words, label) {
  const candidates = words.filter(word => isNumber(word) && sameRow(word, label) && word.x1 <= label.x0 + label.height * ROW_TOLERANCE
    && label.x0 - word.x1 < ROW_VALUE_MAXIMUM_GAP * label.height);
  const closest = candidates.sort((first, second) => second.x1 - first.x1)[0];
  return closest ? numberValue(closest) : null;
}

function owningAbility(headers, saveLabel) {
  const above = headers
    .filter(({ header }) => header.y1 < saveLabel.y0 && Math.abs(header.centerX - saveLabel.centerX) < SAVE_COLUMN_TOLERANCE * saveLabel.height)
    .sort((first, second) => second.header.y1 - first.header.y1);
  return above.length ? above[0].key : '';
}

function readSaveValues(words, headers) {
  const values = {};
  words.filter(word => LABELS.save.test(word.key)).forEach(saveLabel => {
    const abilityKey = owningAbility(headers, saveLabel);
    const value = numberLeftOnRow(words, saveLabel);
    if (abilityKey && value !== null && !(abilityKey in values)) values[abilityKey] = value;
  });
  return values;
}

function skillValue(words, prefixes) {
  const labels = words.filter(word => prefixes.some(prefix => word.key.startsWith(prefix)));
  for (const label of labels) {
    const value = numberLeftOnRow(words, label);
    if (value !== null) return value;
  }
  return null;
}

function readCharacterSheetWords(rawWords) {
  const words = mostConfidentReadings(rawWords.filter(word => word.text && word.text.trim() && word.bbox).map(preparedWord).filter(word => word.key && isReadableSize(word)));
  const headers = abilityHeaders(words);
  return {
    texts: Object.fromEntries(Object.entries(TEXT_FIELD_LABELS).map(([field, pattern]) => [field, textFieldCandidates(words, pattern)])),
    level: readLevel(words),
    maximumHitPoints: readMaximumHitPoints(words),
    speedText: readSpeedText(words),
    scores: readScores(words, headers),
    saveValues: readSaveValues(words, headers),
    skillValues: SKILL_PREFIXES.map(prefixes => skillValue(words, prefixes))
  };
}

window.LectureSpatiale = { read: readCharacterSheetWords };
})();
