'use strict';

const MESSAGE_DURATION_MS = 3500;
const MAXIMUM_LEVEL = 20;
const DEFAULT_ABILITY_CAP = 20;
const DEFAULT_SPEED_METERS = 9;
const ATTACK_ROW_COUNT = 5;
const ATTUNED_ITEM_SLOT_COUNT = 5;
const SPELL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const UNARMORED_SOURCE = 'Sans armure';
const BONUS_MODE_TWO_AND_ONE = '+2 / +1';
const BONUS_MODE_THREE_ONES = '+1 / +1 / +1';
const THIRD_CASTER_SUBCLASS_PATTERN = 'occult|arcanique';
const AUTOMATIC_CHECK_TITLE = 'Accordée par un effet (espèce, don…)';

const ABILITIES = [
  { key: 'for', name: 'Force', color: '#c8402f' },
  { key: 'dex', name: 'Dextérité', color: '#2e9e5b' },
  { key: 'con', name: 'Constitution', color: '#d8791a' },
  { key: 'int', name: 'Intelligence', color: '#2f6fd0' },
  { key: 'sag', name: 'Sagesse', color: '#7a4fc4' },
  { key: 'cha', name: 'Charisme', color: '#d6458e' }
];
const ABILITY_NAMES = Object.fromEntries(ABILITIES.map(ability => [ability.key, ability.name]));

const SKILLS = [
  { name: 'Acrobaties', ability: 'dex' }, { name: 'Arcanes', ability: 'int' }, { name: 'Athlétisme', ability: 'for' },
  { name: 'Discrétion', ability: 'dex' }, { name: 'Dressage', ability: 'sag' }, { name: 'Escamotage', ability: 'dex' },
  { name: 'Histoire', ability: 'int' }, { name: 'Intimidation', ability: 'cha' }, { name: 'Intuition', ability: 'sag' },
  { name: 'Investigation', ability: 'int' }, { name: 'Médecine', ability: 'sag' }, { name: 'Nature', ability: 'int' },
  { name: 'Perception', ability: 'sag' }, { name: 'Persuasion', ability: 'cha' }, { name: 'Religion', ability: 'int' },
  { name: 'Représentation', ability: 'cha' }, { name: 'Supercherie', ability: 'cha' }, { name: 'Survie', ability: 'sag' }
];
const SKILL_NAMES = SKILLS.map(skill => skill.name);
const PERCEPTION_INDEX = SKILL_NAMES.indexOf('Perception');

const CLASS_HIT_DICE = { 'Artificier': 8, 'Barbare': 12, 'Barde': 8, 'Chasseur de sang': 10, 'Clerc': 8, 'Druide': 8, 'Ensorceleur': 6, 'Guerrier': 10, 'Magicien': 6, 'Moine': 8, 'Occultiste': 8, 'Paladin': 10, 'Rôdeur': 10, 'Roublard': 8 };
const RESOURCE_COLORS = ['#c8402f', '#2e9e5b', '#d8791a', '#7a4fc4', '#d6458e', '#12968f'];

const sheetField = key => document.querySelector(`[data-k="${key}"]`);
const fieldValue = key => { const field = sheetField(key); return field ? field.value : ''; };
const isFieldChecked = key => { const field = sheetField(key); return !!(field && field.checked); };
const fieldNumber = key => parseInt(fieldValue(key)) || 0;
const signed = number => (number >= 0 ? '+' : '') + number;
const frenchDecimal = number => String(number).replace('.', ',');
const valueAtLevel = (list, level) => Array.isArray(list) ? list[level - 1] : undefined;
const abilityModifier = score => Math.floor((score - 10) / 2);
const proficiencyBonusAt = level => Math.ceil(level / 4) + 1;
const clampLevel = rawLevel => Math.min(MAXIMUM_LEVEL, Math.max(1, parseInt(rawLevel) || 1));
const currentLevel = () => clampLevel(fieldValue('niveau'));
const textWithoutTags = html => html.replace(/<[^>]+>/g, '');
const showSheetMessage = text => showMessage(text, MESSAGE_DURATION_MS);
const randomInstanceId = () => Math.random().toString(36).slice(2, 8);
const skillIndex = name => SKILL_NAMES.indexOf(name);
const asOption = option => typeof option === 'string' ? { v: option } : option;
const labelBeforeParenthesis = label => String(label).split(' (')[0];
const dispatchInputEvent = element => element.dispatchEvent(new Event('input', { bubbles: true }));
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const thirdCasterPattern = subclassRule => new RegExp(subclassRule.re || THIRD_CASTER_SUBCLASS_PATTERN, 'i');

function skillRowHtml(skill, index) {
  return `<div class="row"><input type="checkbox" class="m" data-k="sk_${index}" title="Maîtrise" aria-label="Maîtrise ${skill.name}"><input type="checkbox" class="e" data-k="ske_${index}" title="Expertise" aria-label="Expertise ${skill.name}"><span class="v" id="sk_${index}">+0</span><span class="t">${skill.name}</span></div>`;
}

function abilityBlockHtml(ability) {
  const skillRows = SKILLS.map((skill, index) => ({ skill, index })).filter(({ skill }) => skill.ability === ability.key);
  const rowsHtml = skillRows.map(({ skill, index }) => skillRowHtml(skill, index)).join('');
  return `<section class="abil" style="--c:${ability.color};flex:${skillRows.length + 1} 1 auto"><header><span class="nm">${ability.name}</span><input class="sc" data-k="ab_${ability.key}" type="number" min="1" max="30" value="10" aria-label="Valeur de ${ability.name}"><span class="fin" id="f_${ability.key}" hidden></span><div class="mod" id="m_${ability.key}">+0</div></header>
  <div class="body"><div class="row sv"><input type="checkbox" class="m" data-k="sv_${ability.key}" aria-label="Maîtrise du jet de sauvegarde ${ability.name}"><span class="sp"></span><span class="v" id="sv_${ability.key}">+0</span><span class="t">Jet de sauvegarde</span></div>${rowsHtml}</div></section>`;
}

function attackRowsHtml() {
  return Array.from({ length: ATTACK_ROW_COUNT }, (unused, index) => `<div class="atk"><input data-k="a${index}_n"><input data-k="a${index}_b"><input data-k="a${index}_d"></div>`).join('');
}

function manualSpellSlotsHtml() {
  return SPELL_LEVELS.map(level => `<div class="slot"><b>Niveau ${level}</b><input data-k="sl${level}_u" type="number" min="0" placeholder="util." aria-label="Emplacements utilisés niveau ${level}"><input data-k="sl${level}_t" type="number" min="0" placeholder="total" aria-label="Emplacements totaux niveau ${level}"></div>`).join('');
}

function classSelectHtml() {
  return '<option value="">Choisir…</option>' + Object.entries(CLASS_HIT_DICE).map(([className, hitDie]) => `<option value="${className}">${className} (d${hitDie})</option>`).join('');
}

function buildSheetLayout() {
  $('#stackA').innerHTML = ABILITIES.slice(0, 4).map(abilityBlockHtml).join('');
  $('#stackB').insertAdjacentHTML('afterbegin', ABILITIES.slice(4).map(abilityBlockHtml).join(''));
  $('#atks').innerHTML = attackRowsHtml();
  $('#slots').innerHTML = manualSpellSlotsHtml();
  $('#clsel').innerHTML = classSelectHtml();
}

buildSheetLayout();

let classData = null;
let classDataFailed = false;
let speciesData = null;
let featList = null;
let subclassData = null;
let classFeaturesData = null;
let backgroundData = null;
let bookFeats = null;
let equipmentData = null;
let magicItemData = null;

let extraPools = [];
let resourceState = {};
let renderCache = new WeakMap();
let chargedItems = [];
let curseFilterText = '';
let latestScores = { modifiers: { for: 0, dex: 0 }, proficiencyBonus: 2 };
let derivedValues = null;

const createEmptyExtras = () => ({ sp: { k: '', ch: {} }, bg: { k: '', ch: {} }, dons: [], spl: [], auto: {}, mal: [], oh: {} });
let extras = createEmptyExtras();

function clearRenderCache() {
  renderCache = new WeakMap();
}

function replaceResourceState(state) {
  resourceState = state;
  clearRenderCache();
}

function setHtmlIfChanged(element, html) {
  if (renderCache.get(element) === html) return;
  element.innerHTML = html;
  renderCache.set(element, html);
}

function setVisible(selector, visible) {
  $(selector).hidden = !visible;
}

function forgetResourcesWithPrefix(prefix) {
  Object.keys(resourceState).forEach(key => { if (key.startsWith(prefix)) delete resourceState[key]; });
}

function remainingInPool(key, maximum) {
  return resourceState[key] === undefined ? maximum : Math.min(maximum, Math.max(0, +resourceState[key] || 0));
}

function findCharacterClass() {
  const wanted = normalizeText(fieldValue('classe'));
  if (!classData || !wanted) return null;
  for (const [name, data] of Object.entries(classData.classes)) {
    if (normalizeText(name) === wanted || (data.alias || []).some(alias => normalizeText(alias) === wanted)) return { name, data };
  }
  return null;
}

function spellcastingOf(classDefinition) {
  if (classDefinition.lanceur) return { type: classDefinition.lanceur, carac: classDefinition.carac, mineurs: classDefinition.mineurs, prepares: classDefinition.prepares };
  const subclassRule = classDefinition.sous_classe;
  if (!subclassRule || !isFieldChecked('sclance')) return null;
  return { type: subclassRule.type || 'tiers', carac: subclassRule.carac, mineurs: subclassRule.mineurs, prepares: subclassRule.prepares, emp: subclassRule.emp };
}

function resourceMaximum(maximumRule, level, modifiers) {
  if (Array.isArray(maximumRule)) return maximumRule[level - 1] || 0;
  if (maximumRule && maximumRule.mod) return level >= (maximumRule.niv || 1) ? Math.max(1, modifiers[maximumRule.mod]) : 0;
  return 0;
}

function trackingCheckboxesHtml(key, count, label) {
  return Array.from({ length: count }, (unused, index) => `<input type="checkbox" data-r="${key}_${index}" aria-label="${escapeHtml(label)} ${index + 1}"${resourceState[key + '_' + index] ? ' checked' : ''}>`).join('');
}

const NO_SPELL_SLOTS_HTML = '<div class="mgnone">Aucun emplacement de sorts à ce niveau.</div>';

function pactSlotsHtml(spellcasting, level) {
  const [slotCount, slotLevel] = (spellcasting.emp || classData.emplacements.pacte)[level - 1];
  if (!slotCount) return NO_SPELL_SLOTS_HTML;
  return `<div class="slot pact"><b>Magie de pacte · niveau ${slotLevel}</b><span class="bx">${trackingCheckboxesHtml('pc', slotCount, 'Emplacement de pacte')}</span></div>`;
}

function spellSlotsHtml(spellcasting, level) {
  if (spellcasting.type === 'pacte') return pactSlotsHtml(spellcasting, level);
  const slotsBySpellLevel = classData.emplacements[spellcasting.type][level - 1] || [];
  return slotsBySpellLevel.map((slotCount, index) => {
    const spellLevel = index + 1;
    return slotCount ? `<div class="slot"><b>Niveau ${spellLevel}</b><span class="bx">${trackingCheckboxesHtml('sl' + spellLevel, slotCount, 'Emplacement de niveau ' + spellLevel)}</span></div>` : '';
  }).join('') || NO_SPELL_SLOTS_HTML;
}

function classInfoValue(info, level, modifiers, proficiencyBonus) {
  if (info.calc === 'dd:sag') return level >= (info.niv || 1) ? 8 + proficiencyBonus + modifiers.sag : null;
  if (info.calc === 'moitie_sup') return Math.ceil(level / 2);
  return info.val[level - 1];
}

function classInfoTilesHtml(classDefinition, level, modifiers, proficiencyBonus) {
  return (classDefinition.infos || []).map((info, index) => {
    const value = classInfoValue(info, level, modifiers, proficiencyBonus);
    if (value == null) return '';
    return `<div class="tile" style="--c:${RESOURCE_COLORS[(index + 3) % RESOURCE_COLORS.length]}"><span class="lbl">${escapeHtml(info.nom)}</span><span class="calc">${escapeHtml(value)}</span></div>`;
  }).join('');
}

function poolInputHtml(key, maximum, ariaLabel, unit) {
  const remaining = remainingInPool(key, maximum);
  return `<span class="pool"><input type="number" min="0" max="${maximum}" data-r="${escapeHtml(key)}" value="${remaining}" aria-label="${escapeHtml(ariaLabel)}"> / ${maximum}${unit ? ' ' + unit : ''}</span>`;
}

function resourceCardHtml(color, name, controlHtml, restText) {
  return `<div class="rs" style="--c:${color}"><div class="rh"><b>${escapeHtml(name)}</b>${controlHtml}</div><small>${escapeHtml(restText || '')}</small></div>`;
}

function classResourcesHtml(classDefinition, level, modifiers) {
  return (classDefinition.ressources || []).map((resource, index) => {
    const maximum = resourceMaximum(resource.max, level, modifiers);
    if (!maximum) return '';
    const key = 'r_' + resource.id;
    const control = resource.mode === 'reserve'
      ? poolInputHtml(key, maximum, resource.nom + ' restants', resource.unite)
      : `<span class="bx">${trackingCheckboxesHtml(key, maximum, resource.nom)}</span>`;
    return resourceCardHtml(RESOURCE_COLORS[index % RESOURCE_COLORS.length], resource.nom, control, resource.repos);
  }).join('');
}

const CHARGE_COUNT_PATTERNS = [
  /(?<![\p{L}])(?:a|ont|possèdent?|possède|contient|contiennent|de ses)\s+(\d+)\s+charges(?![\p{L}])/iu,
  /^[^:(]{0,40}[:(]\s*(\d+) charges/u
];
const RECHARGE_PATTERNS = [
  /(?:regagnen?t?|récupèren?t?|en récupère)\s+(?:(toutes)|(\d+d\d+(?:\s*[+-]\s*\d+)?|\d+)(?:\s+charges?)?)[^.;]*?(?:à l'aube|chaque aube|au lever du soleil|au crépuscule|à minuit)/i,
  /les regagne toutes[^.;]*?(?:à l'aube|chaque aube)/i
];

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function rechargeMoment(rechargeText) {
  if (/crépuscule/i.test(rechargeText)) return 'au crépuscule';
  if (/minuit/i.test(rechargeText)) return 'à minuit';
  return 'à l’aube';
}

function itemCharges(descriptionHtml) {
  const text = String(descriptionHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const chargeMatch = firstMatch(text, CHARGE_COUNT_PATTERNS);
  if (!chargeMatch || +chargeMatch[1] < 2) return null;
  const rechargeMatch = firstMatch(text, RECHARGE_PATTERNS);
  if (!rechargeMatch) return { max: +chargeMatch[1], recharge: null, when: '' };
  const recharge = rechargeMatch[2] ? rechargeMatch[2].replace(/\s+/g, '') : 'all';
  return { max: +chargeMatch[1], recharge, when: rechargeMoment(rechargeMatch[0]) };
}

function ownedMagicItemNames() {
  const part = Persos.part('objets');
  return part && part.data && part.data.objets || [];
}

function chargedItemRestText(item) {
  if (item.recharge === 'all') return 'Toutes ses charges reviennent ' + item.when + ' (repos long).';
  if (item.recharge) return 'Regagne ' + item.recharge + ' charge' + (item.recharge === '1' ? '' : 's') + ' ' + item.when + ' : lancé au repos long.';
  return 'Ne se recharge pas tout seul : voir la description de l’objet.';
}

function findChargedItems() {
  return [...new Set(ownedMagicItemNames())].map(name => {
    const item = findMagicItem(name);
    const charges = item && itemCharges(item.h);
    return charges ? Object.assign(charges, { name, key: 'ch_' + name }) : null;
  }).filter(Boolean);
}

function renderChargedItems() {
  chargedItems = findChargedItems();
  const html = chargedItems.map(item => resourceCardHtml('#d6458e', item.name, poolInputHtml(item.key, item.max, item.name + ' : charges restantes'), chargedItemRestText(item))).join('');
  setHtmlIfChanged($('#chRes'), html);
  $('#chRes').hidden = !html;
  $('#secCh').hidden = !html;
}

function shortRestRecoveryNames() {
  const characterClass = findCharacterClass();
  const level = currentLevel();
  const names = [];
  const spellcasting = characterClass && spellcastingOf(characterClass.data);
  if (spellcasting && spellcasting.type === 'pacte') names.push('emplacements de pacte');
  if (characterClass) {
    (characterClass.data.ressources || []).forEach(resource => {
      if (shortRestGain(resource.repos || '') && resourceMaximum(resource.max, level, latestScores.modifiers)) names.push(resource.nom);
    });
  }
  extraPools.forEach(pool => { if (shortRestGain(pool.restText || '')) names.push(pool.name); });
  return names;
}

function renderRestHint() {
  const shortRestNames = shortRestRecoveryNames();
  const shortRestPart = shortRestNames.length ? ', ' + escapeHtml(shortRestNames.join(', ')) : '';
  const chargesPart = chargedItems.some(item => item.recharge) ? ', charges des objets' : '';
  setHtmlIfChanged($('#restHint'), '<b>Repos court</b> : dés de vie' + shortRestPart + '. <b>Repos long</b> : tout' + chargesPart + '.');
}

function renderSpellcastingNote(classRecognized) {
  const note = $('#mgNote');
  if (classDataFailed) {
    note.textContent = 'Les données de classes n’ont pas pu être chargées : saisie manuelle.';
    note.hidden = false;
  } else if (!classRecognized && classData && fieldValue('classe').trim()) {
    note.textContent = 'Classe non reconnue (multiclasse, classe maison…) : emplacements à saisir à la main.';
    note.hidden = false;
  } else {
    note.hidden = true;
  }
}

function spellcastingSectionTitle(characterClass, spellcasting) {
  if (!characterClass) return 'Incantation';
  return (spellcasting ? 'Incantation et capacités' : 'Capacités de classe') + ' — ' + characterClass.name;
}

function renderSpellcastingSection(modifiers, proficiencyBonus, level, characterClass, spellcasting) {
  const classRecognized = !!characterClass;
  const classDefinition = characterClass && characterClass.data;
  const subclassRule = classRecognized && classDefinition.sous_classe;
  setVisible('#mgBar', !!subclassRule);
  setVisible('#sclWrap', !!subclassRule);
  if (subclassRule) $('#sclTxt').textContent = 'Sous-classe lanceuse de sorts (' + subclassRule.nom + ')';
  setVisible('#castTiles', !classRecognized || !!spellcasting);
  $('#castTiles').className = 'tiles' + (classRecognized ? ' t5' : '');
  setVisible('#tMin', classRecognized);
  setVisible('#tPrep', classRecognized);
  setVisible('#slots', !classRecognized);
  setVisible('#secSlots', classRecognized && !!spellcasting);
  setVisible('#slotsAuto', classRecognized && !!spellcasting);
  renderSpellcastingNote(classRecognized);
  sheetField('cast').options[0].textContent = spellcasting ? 'Auto : ' + ABILITY_NAMES[spellcasting.carac] : '—';
  $('#mgTitle').textContent = spellcastingSectionTitle(characterClass, spellcasting);
  $('#sorts').placeholder = !classRecognized || spellcasting ? 'Tours de magie, sorts préparés…' : 'Options choisies, notes de classe…';
  if (!classRecognized) {
    setVisible('#secCls', false);
    setVisible('#clsInfos', false);
    setVisible('#clsRes', false);
    return;
  }
  if (spellcasting) {
    $('#nmin').textContent = valueAtLevel(spellcasting.mineurs, level) || '—';
    $('#nprep').textContent = valueAtLevel(spellcasting.prepares, level) || '—';
    setHtmlIfChanged($('#slotsAuto'), spellSlotsHtml(spellcasting, level));
  }
  const infoTiles = classInfoTilesHtml(classDefinition, level, modifiers, proficiencyBonus);
  const resources = classResourcesHtml(classDefinition, level, modifiers);
  setHtmlIfChanged($('#clsInfos'), infoTiles);
  setHtmlIfChanged($('#clsRes'), resources);
  setVisible('#clsInfos', !!infoTiles);
  setVisible('#clsRes', !!resources);
  setVisible('#secCls', !!(infoTiles || resources));
}

function findBackground() {
  return backgroundData && extras.bg.k && backgroundData[extras.bg.k] ? { name: extras.bg.k, data: backgroundData[extras.bg.k] } : null;
}

function syncBackgroundOriginFeat() {
  const background = findBackground();
  extras.dons = extras.dons.filter(takenFeat => {
    if (!takenFeat.bg) return true;
    const stillGranted = background && takenFeat.id === background.data.don;
    if (!stillGranted) forgetResourcesWithPrefix('d' + takenFeat.u + '_');
    return stillGranted;
  });
  const originFeatMissing = background && featList && !extras.dons.some(takenFeat => takenFeat.bg) && featList.some(feat => feat.id === background.data.don);
  if (originFeatMissing) extras.dons.unshift({ u: randomInstanceId(), id: background.data.don, ch: Object.assign({}, background.data.don_ch), bg: 1 });
}

function findSpecies() {
  const wanted = normalizeText(fieldValue('race'));
  if (!speciesData || !wanted) return null;
  for (const name in speciesData) if (normalizeText(name) === wanted) return { name, data: speciesData[name] };
  return null;
}

function selectedLineageOption(species) {
  return species && species.data.lignage ? species.data.lignage.opts.find(option => option.v === fieldValue('sespece')) : null;
}

function extraResourceMaximum(maximumRule, level, proficiencyBonus, modifiers) {
  if (maximumRule === 'pb') return proficiencyBonus;
  if (typeof maximumRule === 'number') return maximumRule;
  if (Array.isArray(maximumRule)) return maximumRule[level - 1] || 0;
  if (maximumRule && maximumRule.mod) return Math.max(maximumRule.min || 0, modifiers[maximumRule.mod] || 0);
  return 0;
}

const plusOneToThree = buildEffects => [1, 2, 3].map(bonus => ['+' + bonus, buildEffects(bonus)]);
const spellAttackAndSaveBonus = bonus => [{ t: 'satk', n: bonus }, { t: 'sdd', n: bonus }];
const setAbility = (ability, score) => ({ t: 'set', v: ability, n: score });
const raiseAbility = (ability, bonus, cap) => ({ t: 'carac', v: ability, n: bonus, max: cap });

const MAGIC_ITEM_EFFECTS = {
  "Amulette de bonne santé": [setAbility('con', 19)],
  "Bandeau d'intelligence": [setAbility('int', 19)],
  "Gantelets de puissance d'ogre": [setAbility('for', 19)],
  "Ceinturon de force de géant": { choices: [
    ['Géant des collines (Force 21)', [setAbility('for', 21)]],
    ['Géant du givre (Force 23)', [setAbility('for', 23)]],
    ['Géant des pierres (Force 23)', [setAbility('for', 23)]],
    ['Géant du feu (Force 25)', [setAbility('for', 25)]],
    ['Géant des nuages (Force 27)', [setAbility('for', 27)]],
    ['Géant des tempêtes (Force 29)', [setAbility('for', 29)]]
  ] },
  "Ceinturon des nains": [raiseAbility('con', 2, 20)],
  "Éclat de Xeluan": [raiseAbility('for', 4, 22), { t: 'satk', n: 1 }],
  "Pierre de Ioun": { choices: [
    ['Agilité (Dextérité +2)', [raiseAbility('dex', 2, 20)]],
    ['Vigueur (Constitution +2)', [raiseAbility('con', 2, 20)]],
    ['Intuition (Sagesse +2)', [raiseAbility('sag', 2, 20)]],
    ['Intellect (Intelligence +2)', [raiseAbility('int', 2, 20)]],
    ['Commandement (Charisme +2)', [raiseAbility('cha', 2, 20)]],
    ['Force (Force +2)', [raiseAbility('for', 2, 20)]],
    ['Protection (CA +1)', [{ t: 'ca', n: 1 }]],
    ['Autre pierre (pas d’effet sur la fiche)', []]
  ] },
  "Anneau de protection": [{ t: 'ca', n: 1 }, { t: 'sv', n: 1 }],
  "Cape de protection": [{ t: 'ca', n: 1 }, { t: 'sv', n: 1 }],
  "Armure d'écailles de dragon": [{ t: 'ca', n: 1 }],
  "Armure démoniaque": [{ t: 'ca', n: 1 }],
  "Armure de golem de cuir": [{ t: 'ca', n: 1 }],
  "Mailles de l'éfrit": [{ t: 'ca', n: 3 }],
  "Armure de scorpion": [{ t: 'init', n: 5 }],
  "Bâton de défense": [{ t: 'ca', n: 1 }],
  "Bouclier du cavalier": [{ t: 'ca', n: 2 }],
  "Bouclier de bélier": [{ t: 'ca', n: 1 }],
  "Bouclier de la tortue": [{ t: 'ca', n: 1 }],
  "Bracelets de défense": [{ t: 'ca', n: 2, cond: 'sans armure ni bouclier', noA: 1, noS: 1 }],
  "Insigne de la Garde": [{ t: 'ca', n: 2, cond: 'sans bouclier', noS: 1 }],
  "Scarabée de protection": [{ t: 'ca', n: 1 }],
  "Robe de l'archimage": [{ t: 'cab', b: 15, cond: 'sans armure' }, ...spellAttackAndSaveBonus(2)],
  "Robe aux étoiles": [{ t: 'sv', n: 1 }],
  "Lame porte-bonheur": [{ t: 'sv', n: 1 }],
  "Pierre porte-bonheur": [{ t: 'sv', n: 1 }, { t: 'tests', n: 1 }],
  "Morsure de Harkon": [{ t: 'sv', n: 1 }, { t: 'tests', n: 1 }],
  "Bâton de surpuissance": [{ t: 'ca', n: 2 }, { t: 'sv', n: 2 }, { t: 'satk', n: 2 }],
  "Bâton du thaumaturge": [{ t: 'satk', n: 2 }],
  "Bâton des forêts": [{ t: 'satk', n: 2 }],
  "Bâton aveuglant": [{ t: 'satk', n: 1 }],
  "Bâton de l'ivoire griffu": [{ t: 'satk', n: 1 }],
  "Bâton du voyageur": [{ t: 'satk', n: 1 }],
  "Talisman du bien absolu": [{ t: 'satk', n: 2 }],
  "Talisman du mal absolu": [{ t: 'satk', n: 2 }],
  "Bracelets de célérité": [{ t: 'vit', n: 3 }],
  "Armure +1, +2 ou +3": { choices: plusOneToThree(bonus => [{ t: 'arm', n: bonus }]) },
  "Bouclier +1, +2 ou +3": { choices: plusOneToThree(bonus => [{ t: 'arm', n: bonus }]) },
  "Baguette du mage de guerre +1, +2 ou +3": { choices: plusOneToThree(bonus => [{ t: 'satk', n: bonus }]) },
  "Amulette du dévot": { choices: plusOneToThree(spellAttackAndSaveBonus) },
  "Grimoire arcanique": { choices: plusOneToThree(spellAttackAndSaveBonus) },
  "Outil universel": { choices: plusOneToThree(spellAttackAndSaveBonus) },
  "Sceptre du gardien des pactes": { choices: plusOneToThree(spellAttackAndSaveBonus) },
  "Tambour du faiseur de rythme": { choices: plusOneToThree(spellAttackAndSaveBonus) },
  "Fiole de puits de sang": { choices: plusOneToThree(spellAttackAndSaveBonus) },
  "Faucille lunaire": { choices: plusOneToThree(spellAttackAndSaveBonus) },
  "Jeu du donneur de destin": { choices: [['Rare (+1)', spellAttackAndSaveBonus(1)], ['Très rare (+2)', spellAttackAndSaveBonus(2)], ['Légendaire (+3)', spellAttackAndSaveBonus(3)]] }
};

const hasVersionChoice = itemEffects => !!itemEffects && !Array.isArray(itemEffects);

function attunedItems() {
  const part = Persos.part('objets');
  return part && part.data && Array.isArray(part.data.harmonises) ? part.data.harmonises : [];
}

function customEntries(kind) {
  try {
    const custom = Persos.custom && Persos.custom();
    return custom && Array.isArray(custom[kind]) ? custom[kind] : [];
  } catch (error) {
    return [];
  }
}

function customItemEffects(name) {
  const item = customEntries('objets').find(entry => entry.n === name);
  return item && Array.isArray(item.fx) ? item.fx.filter(effect => effect.t !== 'arme') : null;
}

function magicItemEffects(name) {
  const itemEffects = MAGIC_ITEM_EFFECTS[name];
  if (!itemEffects) return customItemEffects(name);
  if (Array.isArray(itemEffects)) return itemEffects;
  const chosenVersion = itemEffects.choices.find(([label]) => label === extras.oh[name]);
  return chosenVersion ? chosenVersion[1] : [];
}

function createEffectTotals(level, proficiencyBonus) {
  return {
    level, proficiencyBonus,
    caps: {}, abilityBonuses: {}, abilityMinimums: {}, savingThrowProficiencies: {}, skillProficiencies: {},
    initiativeBonus: 0, hitPointsPerLevel: 0, speedBonus: 0, armorClassBonus: 0,
    conditionalArmorClassBonuses: [], unarmoredBases: [],
    savingThrowBonus: 0, abilityCheckBonus: 0, spellAttackBonus: 0, spellSaveDcBonus: 0,
    resources: [], lines: [],
    species: findSpecies(), characterClass: findCharacterClass()
  };
}

function addAbilityBonus(totals, ability, bonus, cap, source) {
  totals.abilityBonuses[ability] = (totals.abilityBonuses[ability] || 0) + bonus;
  totals.caps[ability] = Math.max(totals.caps[ability] || DEFAULT_ABILITY_CAP, cap);
  totals.lines.push([source, ABILITY_NAMES[ability] + ' +' + bonus]);
}

function applyBackgroundAbilityBonuses(totals, choices, source) {
  const mode = choices.mode || BONUS_MODE_TWO_AND_ONE;
  const background = findBackground();
  const backgroundAbilities = background ? background.data.carac : [];
  if (mode === BONUS_MODE_THREE_ONES) {
    backgroundAbilities.forEach(ability => addAbilityBonus(totals, ability, 1, DEFAULT_ABILITY_CAP, source));
    return;
  }
  if (choices.a2) addAbilityBonus(totals, choices.a2, 2, DEFAULT_ABILITY_CAP, source);
  if (choices.a1 && choices.a1 !== choices.a2) addAbilityBonus(totals, choices.a1, 1, DEFAULT_ABILITY_CAP, source);
}

const EFFECT_APPLIERS = {
  carac(totals, effect, target, choices, source) {
    if (target) addAbilityBonus(totals, target, effect.n || 1, effect.max || DEFAULT_ABILITY_CAP, source);
  },
  set(totals, effect, target, choices, source) {
    totals.abilityMinimums[target] = Math.max(totals.abilityMinimums[target] || 0, effect.n);
    totals.lines.push([source, ABILITY_NAMES[target] + ' ' + effect.n + ' (si plus faible)']);
  },
  sv(totals, effect, target, choices, source) {
    if (effect.n) {
      totals.savingThrowBonus += effect.n;
      totals.lines.push([source, 'jets de sauvegarde ' + signed(effect.n)]);
    } else if (target) {
      totals.savingThrowProficiencies[target] = 1;
      totals.lines.push([source, 'maîtrise du jet de sauvegarde de ' + ABILITY_NAMES[target]]);
    }
  },
  tests(totals, effect, target, choices, source) {
    totals.abilityCheckBonus += effect.n;
    totals.lines.push([source, 'tests de caractéristique et initiative ' + signed(effect.n)]);
  },
  init(totals, effect, target, choices, source) {
    totals.initiativeBonus += effect.n;
    totals.lines.push([source, 'initiative ' + signed(effect.n)]);
  },
  satk(totals, effect, target, choices, source) {
    totals.spellAttackBonus += effect.n;
    totals.lines.push([source, 'attaque de sort ' + signed(effect.n)]);
  },
  sdd(totals, effect, target, choices, source) {
    totals.spellSaveDcBonus += effect.n;
    totals.lines.push([source, 'DD des sorts ' + signed(effect.n)]);
  },
  bg_carac(totals, effect, target, choices, source) {
    applyBackgroundAbilityBonuses(totals, choices, source);
  },
  comp(totals, effect, target, choices, source) {
    const index = skillIndex(target);
    if (index < 0) return;
    totals.skillProficiencies[index] = Math.max(totals.skillProficiencies[index] || 0, 1);
    totals.lines.push([source, 'maîtrise : ' + target]);
  },
  exp(totals, effect, target, choices, source) {
    const index = skillIndex(target);
    if (index < 0) return;
    totals.skillProficiencies[index] = 2;
    totals.lines.push([source, 'expertise : ' + target]);
  },
  init_pb(totals, effect, target, choices, source) {
    totals.initiativeBonus += totals.proficiencyBonus;
    totals.lines.push([source, 'initiative ' + signed(totals.proficiencyBonus)]);
  },
  pv_niv(totals, effect, target, choices, source) {
    totals.hitPointsPerLevel += effect.n * totals.level;
    totals.lines.push([source, 'PV max +' + effect.n * totals.level + ' (' + effect.n + ' par niveau)']);
  },
  vit(totals, effect, target, choices, source) {
    totals.speedBonus += effect.n;
    totals.lines.push([source, 'vitesse +' + frenchDecimal(effect.n) + ' m']);
  },
  ca(totals, effect, target, choices, source) {
    if (effect.noA || effect.noS || effect.reqA) totals.conditionalArmorClassBonuses.push(effect);
    else totals.armorClassBonus += effect.n;
    totals.lines.push([source, 'CA +' + effect.n + (effect.cond ? ' (' + effect.cond + ')' : '')]);
  },
  cab(totals, effect, target, choices, source) {
    totals.unarmoredBases.push({ source, base: effect.b || 10, abilities: effect.m || [], noShield: effect.noS, condition: effect.cond });
  },
  res(totals, effect, target, choices, source, keyPrefix) {
    totals.resources.push({ key: keyPrefix + effect.id, name: effect.nom, maximumRule: effect.max, restText: effect.repos, level: effect.niv });
  }
};

function applyEffects(totals, effectList, choices, source, keyPrefix) {
  for (const effect of effectList) {
    if (effect.niv && totals.level < effect.niv) continue;
    const target = effect.v || (effect.c ? choices[effect.c] : null);
    const applier = EFFECT_APPLIERS[effect.t];
    if (applier) applier(totals, effect, target, choices, source, keyPrefix);
  }
}

function applySpeciesEffects(totals) {
  const species = totals.species;
  if (!species) return;
  const choices = extras.sp.ch;
  const lineage = selectedLineageOption(species);
  applyEffects(totals, species.data.fx, choices, species.name, 'e_');
  if (lineage) applyEffects(totals, lineage.fx || [], choices, species.name + ' (' + labelBeforeParenthesis(lineage.v) + ')', 'e_');
}

function applyBackgroundEffects(totals) {
  const background = findBackground();
  if (background) applyEffects(totals, background.data.fx, extras.bg.ch, 'Historique (' + background.name + ')', 'h_');
}

function applyFeatEffects(totals) {
  if (!featList) return;
  for (const takenFeat of extras.dons) {
    const feat = featList.find(entry => entry.id === takenFeat.id);
    if (feat) applyEffects(totals, feat.fx, takenFeat.ch, feat.nom, 'd' + takenFeat.u + '_');
  }
}

function selectedSubclassDefinition(characterClass) {
  return characterClass && subclassData && subclassData[characterClass.name] && subclassData[characterClass.name][fieldValue('sclasse')];
}

function applySubclassEffects(totals) {
  const subclass = selectedSubclassDefinition(totals.characterClass);
  if (subclass) applyEffects(totals, subclass.fx || [], {}, fieldValue('sclasse'), 's_');
}

function applyMagicItemEffects(totals) {
  for (const name of attunedItems()) {
    const itemEffects = magicItemEffects(name);
    if (itemEffects) applyEffects(totals, effectsWhenWorn(name, itemEffects), {}, name, 'o_');
  }
  for (const name of ownedMagicItemNames()) {
    const customItem = customEntries('objets').find(entry => entry.n === name);
    if (customItem && !customItem.a && customItem.fx && customItem.fx.length) applyEffects(totals, effectsWhenWorn(name, customItemEffects(name)), {}, name, 'o_');
  }
}

function applyClassFeatureEffects(totals) {
  const characterClass = totals.characterClass;
  if (!characterClass || !classFeaturesData || !classFeaturesData[characterClass.name]) return;
  for (const feature of classFeaturesData[characterClass.name]) {
    if (feature.niv > totals.level) continue;
    const sheetEffects = (feature.fx || []).filter(effect => effect.t !== 'res').map(effect => ({ ...effect, niv: 0 }));
    applyEffects(totals, sheetEffects, {}, feature.nom, 'c_');
  }
}

function computeEffects(level, proficiencyBonus) {
  const totals = createEffectTotals(level, proficiencyBonus);
  applySpeciesEffects(totals);
  applyBackgroundEffects(totals);
  applyFeatEffects(totals);
  applySubclassEffects(totals);
  applyMagicItemEffects(totals);
  applyClassFeatureEffects(totals);
  return totals;
}

function selectOptionsHtml(options, currentValue) {
  return options.map(([value, label]) => `<option value="${escapeHtml(value)}"${value === currentValue ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function choiceOptionPairs(choice) {
  if (choice.t === 'carac') return choice.opts.map(key => [key, ABILITY_NAMES[key]]);
  if (choice.t === 'comp') return (choice.opts || SKILL_NAMES).map(name => [name, name]);
  return choice.opts.map(asOption).map(option => [option.v, option.v]);
}

function choiceFieldHtml(path, choice, currentValue) {
  const attribute = `data-x="${path}|${choice.id}"`;
  if (choice.t === 'texte') return `<label class="ch"><small>${escapeHtml(choice.lbl)}</small><input type="text" ${attribute} value="${escapeHtml(currentValue || '')}"></label>`;
  return `<label class="ch"><small>${escapeHtml(choice.lbl)}</small><select ${attribute}><option value="">—</option>${selectOptionsHtml(choiceOptionPairs(choice), currentValue)}</select></label>`;
}

function choiceFieldsHtml(path, choices, currentValues) {
  return choices.map(choice => choiceFieldHtml(path, choice, currentValues[choice.id])).join('');
}

function extraPoolHtml(pool) {
  return resourceCardHtml('#12968f', pool.name, poolInputHtml(pool.key, pool.max, pool.name + ' restants'), pool.restText);
}

function poolsWithPrefix(pools, prefix) {
  return pools.filter(pool => pool.key.startsWith(prefix)).map(extraPoolHtml).join('');
}

function splitSpellListByLevel(listHtml) {
  return listHtml.split(/\s*\(niv\. (\d+)\)(?:,\s*)?/).reduce((html, part, index, parts) => {
    if (index % 2 || !part.trim()) return html;
    return html + '<br>niv. ' + parts[index + 1] + ' : ' + part.trim();
  }, '');
}

function oneLevelPerLine(html) {
  if (/; niv\. \d/.test(html)) return html.replace(/\s*:\s*(?=niv\. \d+ )/, ' :<br>').replace(/\s*;\s*(?=niv\. \d+ )/g, '<br>');
  return html.replace(/(préparés\s*:\s*)((?:[^().:;]+\(niv\. \d+\)(?:,\s*)?){2,})/, (match, lead, list) => lead.replace(/\s*:\s*$/, ' :') + splitSpellListByLevel(list));
}

const formattedDescription = description => oneLevelPerLine(escapeHtml(description)).replace(/\n/g, '<br>');

function traitsListHtml(traits) {
  return `<ul class="xl">${traits.map(trait => `<li><b>${escapeHtml(trait.nom)}</b> — ${formattedDescription(trait.desc)}</li>`).join('')}</ul>`;
}

function featuresByLevelHtml(features, level) {
  return '<ul class="xl">' + features.map(feature => feature.niv <= level
    ? `<li><b>Niv. ${feature.niv} · ${escapeHtml(feature.nom)}</b> — ${formattedDescription(feature.desc)}</li>`
    : `<li class="fut"><b>Niv. ${feature.niv} · ${escapeHtml(feature.nom)}</b> (pas encore acquis)</li>`).join('') + '</ul>';
}

function speciesCardTitle(species) {
  if (!species) return 'Espèce';
  const lineage = selectedLineageOption(species);
  return 'Espèce — ' + species.name + (lineage ? ' (' + labelBeforeParenthesis(lineage.v) + ')' : '');
}

function lineageHtml(speciesDefinition, lineage) {
  if (!lineage) return `<p class="xh">Choisissez un ${escapeHtml(speciesDefinition.lignage.lbl.toLowerCase())} dans les paramètres (sous-espèce).</p>`;
  return `<p class="xh"><b>${escapeHtml(speciesDefinition.lignage.lbl)} : ${escapeHtml(lineage.v)}</b></p>` + traitsListHtml(lineage.traits || [{ nom: lineage.v, desc: lineage.txt || '' }]);
}

function speciesCardHtml(species, pools) {
  if (!speciesData) return '<p class="xh">Les données d’espèces n’ont pas pu être chargées.</p>';
  if (!species) return `<p class="xh">${fieldValue('race').trim() ? 'Espèce non reconnue : aucun trait automatique.' : 'Choisissez une espèce dans les paramètres.'}</p>`;
  const definition = species.data;
  let html = `<p class="xh">Taille : ${escapeHtml(definition.taille)} · Vitesse de base : ${frenchDecimal(definition.vit)} m</p>` + traitsListHtml(definition.traits);
  if (definition.lignage) html += lineageHtml(definition, selectedLineageOption(species));
  if (definition.choix.length) html += `<div class="chs">${choiceFieldsHtml('sp', definition.choix, extras.sp.ch)}</div>`;
  return html + poolsWithPrefix(pools, 'e_');
}

function renderSpeciesCard(species, pools) {
  $('#xSpT').textContent = speciesCardTitle(species);
  setHtmlIfChanged($('#xSp'), speciesCardHtml(species, pools));
}

function backgroundCardHtml(background) {
  const definition = background.data;
  const originFeat = featList && featList.find(feat => feat.id === definition.don);
  return `<p class="xh">${escapeHtml(definition.desc)}</p><ul class="xl"><li><b>Caractéristiques</b> — ${definition.carac.map(key => ABILITY_NAMES[key]).join(', ')} : +2 / +1, ou +1 à chacune</li><li><b>Compétences</b> — ${definition.comp.join(', ')}</li><li><b>Outil</b> — ${escapeHtml(definition.outil)}</li><li><b>Don d’origine</b> — ${escapeHtml(originFeat ? originFeat.nom : definition.don)} (ajouté dans la liste des dons)</li></ul><p class="xh">${escapeHtml(definition.equip)}</p><div class="chs">${choiceFieldsHtml('bg', definition.choix, extras.bg.ch)}</div>`;
}

function renderBackgroundCard(background) {
  $('#xBgC').hidden = !background;
  if (!background) return;
  $('#xBgT').textContent = 'Historique — ' + background.name;
  setHtmlIfChanged($('#xBg'), backgroundCardHtml(background));
}

function renderSubclassCard(subclass, level, pools) {
  $('#xSubC').hidden = !subclass;
  if (!subclass) return;
  $('#xSubT').textContent = 'Sous-classe — ' + fieldValue('sclasse');
  setHtmlIfChanged($('#xSub'), featuresByLevelHtml(subclass.feats, level) + poolsWithPrefix(pools, 's_'));
}

function renderClassFeaturesPage(characterClass, level) {
  const features = characterClass && classFeaturesData && classFeaturesData[characterClass.name];
  $('#pg4').classList.toggle('empty', !features);
  $('#pg4').hidden = !features;
  if (!features) return;
  $('#xClsT').textContent = 'Capacités de classe — ' + characterClass.name + ' (niveau ' + level + ')';
  setHtmlIfChanged($('#xCls'), featuresByLevelHtml(features, level));
}

function takenFeatHtml(takenFeat, pools) {
  const feat = featList.find(entry => entry.id === takenFeat.id);
  if (!feat) return '';
  const details = escapeHtml(feat.cat) + (feat.pre ? ' · ' + escapeHtml(feat.pre) : '') + (takenFeat.bg ? ' · de l’historique' : '') + (feat.c_ ? ' · création' : '');
  const editButton = feat.c_ ? `<button type="button" class="noprint" data-donedit="${escapeHtml(feat.id)}">Modifier</button>` : '';
  const removeButton = takenFeat.bg ? '' : `<button type="button" class="noprint" data-del="${takenFeat.u}">Retirer</button>`;
  const choices = feat.choix.length ? `<div class="chs">${choiceFieldsHtml('d' + takenFeat.u, feat.choix, takenFeat.ch)}</div>` : '';
  return `<div class="don" style="--c:#c8402f"><div class="dh"><b>${escapeHtml(feat.nom)}</b><span>${details}</span>${editButton}${removeButton}</div><p>${escapeHtml(feat.desc)}</p>`
    + choices + poolsWithPrefix(pools, 'd' + takenFeat.u + '_') + '</div>';
}

function renderFeatsCard(pools) {
  const html = !featList
    ? '<p class="xh">Les données de dons n’ont pas pu être chargées.</p>'
    : extras.dons.map(takenFeat => takenFeatHtml(takenFeat, pools)).join('') || '<p class="xh">Aucun don. Ajoutez-en avec la liste ci-dessus (un même don peut être pris plusieurs fois).</p>';
  setHtmlIfChanged($('#xDons'), html);
}

function itemsWithSheetEffects() {
  const names = attunedItems().slice();
  ownedMagicItemNames().forEach(name => {
    const item = findMagicItem(name);
    if (hasVersionChoice(MAGIC_ITEM_EFFECTS[name]) && item && !item.a && !names.includes(name)) names.push(name);
  });
  return names;
}

function itemEffectSummaryHtml(name) {
  const itemEffects = MAGIC_ITEM_EFFECTS[name];
  const customEffects = customItemEffects(name);
  if (!itemEffects && customEffects && customEffects.length) return `<li><b>${escapeHtml(name)}</b> — effets appliqués (voir « Effets appliqués »)</li>`;
  if (!itemEffects) return `<li><b>${escapeHtml(name)}</b> — pas d’effet chiffré à appliquer sur la fiche</li>`;
  if (Array.isArray(itemEffects)) return `<li><b>${escapeHtml(name)}</b> — effets appliqués (voir « Effets appliqués »)</li>`;
  const versionChoice = { id: name, lbl: 'Version de l’objet', opts: itemEffects.choices.map(([label]) => label) };
  return `<li><b>${escapeHtml(name)}</b><div class="chs">${choiceFieldHtml('oh', versionChoice, extras.oh[name])}</div></li>`;
}

function renderMagicItemsCard(itemNames) {
  $('#xObC').hidden = !itemNames.length;
  if (itemNames.length) setHtmlIfChanged($('#xOb'), '<ul class="xl">' + itemNames.map(itemEffectSummaryHtml).join('') + '</ul>');
}

function finalSpeed(effects) {
  if (effects.species) return effects.species.data.vit + effects.speedBonus;
  return effects.speedBonus ? DEFAULT_SPEED_METERS + effects.speedBonus : null;
}

function renderAppliedEffectsCard(effects, abilityTotals) {
  const effectRow = (label, value) => `<b>${label}</b><span>${value}</span>`;
  let rows = effects.lines.map(([source, description]) => effectRow(escapeHtml(source), escapeHtml(description))).join('');
  const speed = finalSpeed(effects);
  if (speed != null) rows += effectRow('Vitesse', frenchDecimal(speed) + ' m');
  const changedAbilities = ABILITIES.filter(({ key }) => effects.abilityBonuses[key] || effects.abilityMinimums[key]).map(({ key }) => `${ABILITY_NAMES[key]} ${abilityTotals[key]}`).join(', ');
  if (changedAbilities) rows += effectRow('Caractéristiques finales', escapeHtml(changedAbilities));
  setHtmlIfChanged($('#xFx'), rows
    ? `<div class="fxs">${rows}</div><p class="xh">Les bonus de caractéristique, d’initiative, de CA, de sauvegarde, de sorts (objets harmonisés compris) et les maîtrises sont déjà appliqués à la fiche (cases cochées automatiquement). Ajoutez vous-même les PV maximum supplémentaires.</p>`
    : '<p class="xh">Aucun effet pour le moment.</p>');
}

function renderExtras(effects, level, proficiencyBonus, modifiers, abilityTotals) {
  const pools = effects.resources
    .map(resource => ({ key: resource.key, name: resource.name, restText: resource.restText, level: resource.level, max: extraResourceMaximum(resource.maximumRule, level, proficiencyBonus, modifiers) }))
    .filter(pool => pool.max > 0);
  extraPools = pools;
  const background = findBackground();
  const subclass = selectedSubclassDefinition(effects.characterClass);
  const itemNames = itemsWithSheetEffects();
  renderSpeciesCard(effects.species, pools);
  renderBackgroundCard(background);
  renderSubclassCard(subclass, level, pools);
  renderClassFeaturesPage(effects.characterClass, level);
  renderFeatsCard(pools);
  renderMagicItemsCard(itemNames);
  renderAppliedEffectsCard(effects, abilityTotals);
  $('#pg3').classList.toggle('empty', !effects.species && !extras.dons.length && !subclass && !background && !itemNames.length);
}

function curseRowHtml(curse, chosenCurses, limitReached, filter) {
  const checked = chosenCurses.includes(curse.nom);
  const hidden = filter && !normalizeText(curse.court + ' ' + curse.en + ' ' + curse.desc).includes(filter);
  const amplified = curse.amp ? `<br><em>Amplifiée :</em> ${escapeHtml(curse.amp)}` : '';
  return `<label class="mrow${checked ? ' on' : ''}"${hidden ? ' hidden' : ''}><input type="checkbox" class="noprint" data-mal="${escapeHtml(curse.nom)}"${checked ? ' checked' : ''}${!checked && limitReached ? ' disabled' : ''}><span><b>${escapeHtml(curse.court)}</b> <small>${escapeHtml(curse.en)}</small><br>${escapeHtml(curse.desc)}${amplified}</span></label>`;
}

function subclassBonusCurseHtml(bonusCurse, subclassName) {
  return `<div class="mrow on og"><span><b>${escapeHtml(bonusCurse.nom.replace(/\s*\(.*$/, ''))}</b> <small>offerte par ${escapeHtml(subclassName)} · hors limite</small><br>${escapeHtml(bonusCurse.desc)}</span></div>`;
}

function renderClassChoiceList(characterClass, level) {
  const choiceList = characterClass && characterClass.data.liste;
  $('#xMalC').hidden = !choiceList;
  if (!choiceList) return;
  const maximum = choiceList.max[level - 1] || 0;
  const chosenCurses = extras.mal.filter(name => choiceList.items.some(item => item.nom === name));
  const limitReached = chosenCurses.length >= maximum;
  const subclassName = fieldValue('sclasse');
  const subclassCurse = choiceList.ordres[subclassName];
  const bonusCurse = subclassCurse && subclassCurse.niv <= level ? subclassCurse : null;
  $('#xMalT').textContent = choiceList.titre + ' — ' + chosenCurses.length + ' / ' + maximum;
  const filter = normalizeText(curseFilterText);
  setHtmlIfChanged($('#xMal'), (maximum ? '' : '<p class="xh">Aucune malédiction connue à ce niveau.</p>')
    + `<p class="xh noprint">Coche tes malédictions connues (${maximum} à ce niveau) ; tu peux en échanger une à chaque niveau gagné. Une fois la limite atteinte, décoche-en une pour en changer.</p>`
    + choiceList.items.map(curse => curseRowHtml(curse, chosenCurses, limitReached, filter)).join('')
    + (bonusCurse ? subclassBonusCurseHtml(bonusCurse, subclassName) : ''));
}

function handleCurseToggle(event) {
  const checkbox = event.target.closest && event.target.closest('[data-mal]');
  if (!checkbox) return;
  const curseName = checkbox.dataset.mal;
  extras.mal = extras.mal.filter(name => name !== curseName);
  if (checkbox.checked) extras.mal.push(curseName);
  recalculateSheet();
  autosave();
}

function handleCurseFilter(event) {
  if (event.target.id !== 'malQ') return;
  curseFilterText = event.target.value;
  recalculateSheet();
}

function syncAutomaticCheckbox(checkbox, granted, grantedStore, storeKey) {
  if (!checkbox) return;
  if (granted && !checkbox.checked) {
    checkbox.checked = true;
    grantedStore[storeKey] = 1;
  }
  if (!granted && grantedStore[storeKey]) {
    checkbox.checked = false;
    delete grantedStore[storeKey];
  }
  if (checkbox.dataset.t0 === undefined) checkbox.dataset.t0 = checkbox.title || '';
  checkbox.disabled = !!granted;
  checkbox.title = granted ? AUTOMATIC_CHECK_TITLE : checkbox.dataset.t0;
}

function syncAutomaticChecks(effects) {
  const granted = extras.auto = extras.auto || {};
  granted.sk = granted.sk || {};
  granted.ske = granted.ske || {};
  granted.sv = granted.sv || {};
  SKILLS.forEach((skill, index) => {
    const expertise = effects.skillProficiencies[index] === 2;
    const proficiency = expertise || effects.skillProficiencies[index] >= 1;
    syncAutomaticCheckbox(sheetField('sk_' + index), proficiency, granted.sk, index);
    syncAutomaticCheckbox(sheetField('ske_' + index), expertise, granted.ske, index);
  });
  ABILITIES.forEach(({ key }) => syncAutomaticCheckbox(sheetField('sv_' + key), !!effects.savingThrowProficiencies[key], granted.sv, key));
}

function plainOptionsHtml(names) {
  return names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
}

function fillSubclassSelect() {
  const characterClass = findCharacterClass();
  const select = $('#sclasse');
  const previousValue = select.value;
  const subclassNames = characterClass && subclassData && subclassData[characterClass.name] ? Object.keys(subclassData[characterClass.name]) : [];
  setHtmlIfChanged(select, '<option value="">—</option>' + plainOptionsHtml(subclassNames));
  if (select.value === previousValue) return;
  select.value = previousValue;
  if (select.value !== previousValue && fieldValue('sousclasse') === previousValue) sheetField('sousclasse').value = '';
}

function fillLineageSelect() {
  const species = findSpecies();
  const select = $('#sespece');
  const previousValue = select.value;
  const lineage = species && species.data.lignage;
  setHtmlIfChanged(select, lineage
    ? `<option value="">${escapeHtml(lineage.lbl)}…</option>` + plainOptionsHtml(lineage.opts.map(option => option.v))
    : '<option value="">— (aucune sous-espèce)</option>');
  select.disabled = !lineage;
  if (select.value !== previousValue) select.value = previousValue;
}

function ensureSpeciesOption(speciesName) {
  const select = $('#race');
  if (!speciesName || [...select.options].some(option => option.value === speciesName)) return;
  const option = document.createElement('option');
  option.value = speciesName;
  option.textContent = speciesName + ' (personnalisé)';
  select.appendChild(option);
}

function syncSpeciesField() {
  const speciesName = fieldValue('race');
  const lineageName = fieldValue('sespece');
  sheetField('espece').value = speciesName ? (lineageName ? speciesName + ' (' + labelBeforeParenthesis(lineageName) + ')' : speciesName) : '';
}

const armorList = () => (equipmentData || []).concat(customEntries('equipement')).filter(item => item && item.t === 'Armure' && item.h);
const isShield = item => item.c === 'Bouclier' || /^bouclier/i.test(item.n);
const findMagicItem = name => customEntries('objets').find(item => item.n === name) || (magicItemData || []).find(item => item.n === name);
const isWornGear = name => { const item = findMagicItem(name); return !!(item && item.t === 'Armure'); };
const effectsWhenWorn = (name, itemEffects) => isWornGear(name) ? itemEffects.filter(effect => effect.t !== 'ca' || effect.noA || effect.noS) : itemEffects;

function armorStats(armor) {
  const text = textWithoutTags(armor.h);
  const armorClassMatch = text.match(/Classe d.armure\s*:\s*(\d+)(\s*\+\s*(?:le\s+)?mod[^(.]*\.?[^(.]*(?:\(\s*max\.?\s*\+?\s*(\d+)\s*\))?)?/i);
  if (!armorClassMatch) return null;
  const strengthMatch = text.match(/Force requise\s*:\s*(?:Force\s*)?(\d+)/i);
  return {
    base: +armorClassMatch[1],
    dex: armorClassMatch[2] ? (armorClassMatch[3] != null ? +armorClassMatch[3] : null) : 0,
    str: strengthMatch ? +strengthMatch[1] : 0,
    disc: /Désavantage aux tests de Discrétion/i.test(text)
  };
}

function armorClassFor(stats, dexterityModifier) {
  if (stats.dex === 0) return stats.base;
  if (stats.dex == null) return stats.base + dexterityModifier;
  return stats.base + Math.min(dexterityModifier, stats.dex);
}

function itemDescriptionHead(text, normalize) {
  return normalize((text.match(/^[^.]*?\(([^)]*)\)/) || [])[1] || '') + ' | ' + normalize(text.split('.')[0]);
}

const ARMOR_CATEGORIES = [['legere', 'Armure légère'], ['intermediaire', 'Armure intermédiaire'], ['lourde', 'Armure lourde']];

function baseArmorsFor(magicArmor) {
  const bodyArmors = armorList().filter(armor => !isShield(armor) && armorStats(armor));
  let head = itemDescriptionHead(textWithoutTags(magicArmor.h), normalizeText);
  const armorKey = armor => normalizeText(armor.n).replace(/^armure (de |d'|a )?/, '');
  const matches = [];
  for (const armor of [...bodyArmors].sort((first, second) => armorKey(second).length - armorKey(first).length)) {
    const pattern = new RegExp('(^|[^a-z])' + escapeRegExp(armorKey(armor)) + '(?![a-z])', 'g');
    if (pattern.test(head)) {
      matches.push(armor);
      head = head.replace(pattern, '$1#');
    }
  }
  if (matches.length) return matches;
  const categories = ARMOR_CATEGORIES.filter(([keyword]) => head.includes(keyword)).map(([, category]) => category);
  return categories.length ? bodyArmors.filter(armor => categories.includes(armor.c)) : bodyArmors;
}

function magicArmorBonus(item) {
  const itemEffects = magicItemEffects(item.n);
  if (itemEffects) return itemEffects.filter(effect => (effect.t === 'ca' && !effect.noA && !effect.noS) || effect.t === 'arm').reduce((total, effect) => total + (+effect.n || 0), 0);
  const match = textWithoutTags(item.h).match(/bonus de \+(\d) à la CA/);
  return match ? +match[1] : 0;
}

function equipmentPartItems() {
  const part = Persos.part('equipement');
  return part && part.data && part.data.objets || [];
}

function ownedMundaneGear(ownedNames) {
  const bodies = [];
  const shields = [];
  armorList().filter(armor => ownedNames.includes(armor.n)).forEach(armor => {
    if (isShield(armor)) {
      const shieldBonus = textWithoutTags(armor.h).match(/\+\s*(\d+)\s*à la classe d.armure/i);
      shields.push({ n: armor.n, ca: shieldBonus ? +shieldBonus[1] : 2 });
      return;
    }
    const stats = armorStats(armor);
    if (stats) bodies.push({ n: armor.n, st: stats, b: 0 });
  });
  return { bodies, shields };
}

function adjustedMagicArmorStats(item, stats) {
  const text = textWithoutTags(item.h);
  const adjusted = { ...stats };
  if (/n.impose pas le désavantage|n'a pas cette contrainte/i.test(text)) adjusted.disc = false;
  if (/Force minimale[^.]*n'a pas cette contrainte/i.test(text)) adjusted.str = 0;
  if (/modificateur de Dextérité complet/i.test(text)) adjusted.dex = null;
  return adjusted;
}

function addMagicGear(name, ownedNames, dexterityModifier, gear) {
  const item = findMagicItem(name);
  if (!item || item.t !== 'Armure' || !item.h || (item.a && !gear.attuned.has(name))) return;
  const bonus = magicArmorBonus(item);
  if (isShield(item) || /^(armure \()?bouclier/i.test(textWithoutTags(item.h))) {
    gear.shields.push({ n: name, ca: 2 + bonus });
    return;
  }
  const options = baseArmorsFor(item).map(armor => ({ armor, stats: armorStats(armor) }));
  if (!options.length) return;
  const ownedOptions = options.filter(option => ownedNames.includes(option.armor.n));
  const candidates = ownedOptions.length ? ownedOptions : options;
  const best = candidates.sort((first, second) => armorClassFor(second.stats, dexterityModifier) - armorClassFor(first.stats, dexterityModifier))[0];
  gear.bodies.push({ n: name, st: adjustedMagicArmorStats(item, best.stats), b: bonus, base: best.armor.n, mg: 1 });
}

function bestGear(dexterityModifier) {
  const ownedNames = equipmentPartItems().map(item => item.n);
  const gear = { ...ownedMundaneGear(ownedNames), attuned: new Set(attunedItems()) };
  ownedMagicItemNames().forEach(name => addMagicGear(name, ownedNames, dexterityModifier, gear));
  const bodyArmorClass = body => armorClassFor(body.st, dexterityModifier) + body.b;
  const armor = gear.bodies.sort((first, second) => bodyArmorClass(second) - bodyArmorClass(first) || (second.mg || 0) - (first.mg || 0))[0] || null;
  const shield = gear.shields.sort((first, second) => second.ca - first.ca)[0] || null;
  return { armor, shield };
}

const CLASS_PROFICIENCIES = {
  'Artificier': { armor: ['légères', 'intermédiaires', 'boucliers'], weapons: 'Armes courantes', tools: 'Outils de voleur, outils de bricoleur, un type d’outils d’artisan au choix' },
  'Barbare': { armor: ['légères', 'intermédiaires', 'boucliers'], weapons: 'Armes courantes et armes de guerre', tools: '' },
  'Barde': { armor: ['légères'], weapons: 'Armes courantes', tools: 'Trois instruments de musique au choix' },
  'Chasseur de sang': { armor: ['légères', 'intermédiaires'], weapons: 'Armes courantes et armes de guerre', tools: 'Matériel d’alchimiste' },
  'Clerc': { armor: ['légères', 'intermédiaires', 'boucliers'], weapons: 'Armes courantes', tools: '' },
  'Druide': { armor: ['légères', 'boucliers'], weapons: 'Armes courantes', tools: 'Matériel d’herboriste' },
  'Ensorceleur': { armor: [], weapons: 'Armes courantes', tools: '' },
  'Guerrier': { armor: ['légères', 'intermédiaires', 'lourdes', 'boucliers'], weapons: 'Armes courantes et armes de guerre', tools: '' },
  'Magicien': { armor: [], weapons: 'Armes courantes', tools: '' },
  'Moine': { armor: [], weapons: 'Armes courantes et armes de guerre ayant la propriété Légère', tools: 'Un type d’outils d’artisan ou un instrument de musique au choix' },
  'Occultiste': { armor: ['légères'], weapons: 'Armes courantes', tools: '' },
  'Paladin': { armor: ['légères', 'intermédiaires', 'lourdes', 'boucliers'], weapons: 'Armes courantes et armes de guerre', tools: '' },
  'Rôdeur': { armor: ['légères', 'intermédiaires', 'boucliers'], weapons: 'Armes courantes et armes de guerre', tools: '' },
  'Roublard': { armor: ['légères'], weapons: 'Armes courantes et armes de guerre ayant la propriété Finesse ou Légère', tools: 'Outils de voleur' }
};
const FEAT_ARMOR_TRAINING = { armure_legere: ['légères', 'boucliers'], armure_inter: ['intermédiaires', 'boucliers'], armure_lourde: ['lourdes'] };
const ARMOR_TRAINING_ORDER = ['légères', 'intermédiaires', 'lourdes', 'boucliers'];

function joinWithAnd(items) {
  return items.length > 1 ? items.slice(0, -1).join(', ') + ' et ' + items.at(-1) : items[0];
}

function armorTrainingText(trainings) {
  if (!trainings.length) return 'Aucune';
  const bodyArmors = trainings.filter(training => training !== 'boucliers');
  const shields = trainings.includes('boucliers') ? (bodyArmors.length ? ', boucliers' : 'Boucliers') : '';
  return (bodyArmors.length ? 'Armures ' + joinWithAnd(bodyArmors) : '') + shields;
}

function renderProficiencies(characterClass) {
  const classProficiencies = characterClass && CLASS_PROFICIENCIES[characterClass.name];
  const armorTrainings = new Set(classProficiencies ? classProficiencies.armor : []);
  const tools = [];
  if (classProficiencies && classProficiencies.tools) tools.push(classProficiencies.tools);
  const background = findBackground();
  if (background && background.data.outil) tools.push(background.data.outil);
  for (const takenFeat of extras.dons) {
    (FEAT_ARMOR_TRAINING[takenFeat.id] || []).forEach(training => armorTrainings.add(training));
    if (takenFeat.id === 'artisan' && takenFeat.ch.o) tools.push(takenFeat.ch.o);
    if (takenFeat.id === 'musicien' && takenFeat.ch.i) tools.push(takenFeat.ch.i);
  }
  const orderedTrainings = ARMOR_TRAINING_ORDER.filter(training => armorTrainings.has(training));
  if (derivedValues) derivedValues.ar = orderedTrainings;
  setHtmlIfChanged($('#prof'), characterClass || tools.length || orderedTrainings.length
    ? `<div><b>Armures :</b> ${escapeHtml(armorTrainingText(orderedTrainings))}</div><div><b>Armes :</b> ${escapeHtml(classProficiencies ? classProficiencies.weapons : '—')}</div><div><b>Outils :</b> ${escapeHtml(tools.join(' ; ') || 'Aucun')}</div>`
    : '<div style="color:var(--soft)">Choisis une classe et un historique dans les Paramètres.</div>');
}

const LANGUAGE_GROUPS = [
  ['Langues courantes', ['Commun', 'Commun des signes', 'Draconique', 'Elfique', 'Géant', 'Gnome', 'Gobelin', 'Halfelin', 'Nain', 'Orc']],
  ['Langues rares', ['Abyssal', 'Céleste', 'Commun des profondeurs', 'Druidique', 'Infernal', 'Primordial', 'Profond', 'Sylvestre', 'Argot des voleurs']]
];
const ALL_LANGUAGES = LANGUAGE_GROUPS.flatMap(([, languages]) => languages);
const chosenLanguages = () => fieldValue('langs').split(',').map(language => language.trim()).filter(Boolean);

function languagePickerHtml() {
  return LANGUAGE_GROUPS.map(([groupName, languages]) => `<small>${groupName}</small>` + languages.map(language => `<label><input type="checkbox" data-lang="${escapeHtml(language)}">${escapeHtml(language)}</label>`).join('')).join('');
}

function renderLanguages() {
  const languages = chosenLanguages();
  setHtmlIfChanged($('#langList'), languages.length ? languages.map(language => `<span>${escapeHtml(language)}</span>`).join('') : '<i>Aucune langue choisie</i>');
  const picker = $('#langPick');
  if (!picker.childElementCount) picker.innerHTML = languagePickerHtml();
  picker.querySelectorAll('[data-lang]').forEach(checkbox => { checkbox.checked = languages.includes(checkbox.dataset.lang); });
}

function languageSortRank(language) {
  return ALL_LANGUAGES.indexOf(language) + 1 || 99;
}

function handleLanguageToggle(event) {
  const checkbox = event.target.closest && event.target.closest('[data-lang]');
  if (!checkbox) return;
  const languages = chosenLanguages().filter(language => language !== checkbox.dataset.lang);
  if (checkbox.checked) languages.push(checkbox.dataset.lang);
  languages.sort((first, second) => languageSortRank(first) - languageSortRank(second));
  sheetField('langs').value = languages.join(', ');
  renderLanguages();
  autosave();
}

function computeAbilityScores(effects) {
  const totals = {};
  const modifiers = {};
  const bases = {};
  ABILITIES.forEach(({ key }) => {
    const base = parseInt(fieldValue('ab_' + key)) || 10;
    let total = effects.abilityBonuses[key] ? Math.max(base, Math.min(effects.caps[key] || DEFAULT_ABILITY_CAP, base + effects.abilityBonuses[key])) : base;
    if (effects.abilityMinimums[key]) total = Math.max(total, effects.abilityMinimums[key]);
    bases[key] = base;
    totals[key] = total;
    modifiers[key] = abilityModifier(total);
  });
  return { bases, totals, modifiers };
}

function renderAbilityScores(scores, effects, proficiencyBonus) {
  const bonusTitle = 'Valeur finale avec les bonus (espèce, historique, dons, objets harmonisés)';
  ABILITIES.forEach(({ key }) => {
    const base = scores.bases[key];
    const total = scores.totals[key];
    $('#m_' + key).textContent = signed(scores.modifiers[key]);
    const finalScore = $('#f_' + key);
    finalScore.hidden = total === base;
    finalScore.textContent = '→ ' + total;
    finalScore.title = bonusTitle;
    sheetField('ab_' + key).title = total !== base ? 'Valeur de base ; ' + total + ' avec les bonus (espèce, historique, dons, objets harmonisés)' : '';
    $('#sv_' + key).textContent = signed(scores.modifiers[key] + (isFieldChecked('sv_' + key) ? proficiencyBonus : 0) + effects.savingThrowBonus);
    $('#sv_' + key).classList.toggle('fx', !!effects.savingThrowProficiencies[key]);
  });
}

function skillProficiencyBonus(index, proficiencyBonus) {
  if (isFieldChecked('ske_' + index)) return 2 * proficiencyBonus;
  return isFieldChecked('sk_' + index) ? proficiencyBonus : 0;
}

function renderSkills(modifiers, effects, proficiencyBonus) {
  SKILLS.forEach((skill, index) => {
    const output = $('#sk_' + index);
    output.textContent = signed(modifiers[skill.ability] + skillProficiencyBonus(index, proficiencyBonus) + effects.abilityCheckBonus);
    output.classList.toggle('fx', !!effects.skillProficiencies[index]);
  });
}

function bestUnarmoredBase(unarmoredBases, modifiers, hasShield) {
  return unarmoredBases
    .filter(option => !(option.noShield && hasShield))
    .map(option => ({ option, value: option.base + modifiers.dex + option.abilities.reduce((total, ability) => total + modifiers[ability], 0) }))
    .sort((first, second) => second.value - first.value)[0];
}

function armorClassWith(armor, shield, effects, modifiers, unarmoredBases) {
  let total;
  let unarmoredBase = null;
  if (armor) {
    total = armorClassFor(armor.st, modifiers.dex) + armor.b;
  } else {
    const best = bestUnarmoredBase(unarmoredBases, modifiers, shield);
    total = best.value;
    unarmoredBase = best.option;
  }
  if (shield) total += shield.ca;
  effects.conditionalArmorClassBonuses.forEach(bonus => {
    if (!(bonus.noA && armor) && !(bonus.noS && shield) && !(bonus.reqA && !armor)) total += bonus.n;
  });
  return { total, unarmoredBase, armor, shield };
}

function bestArmorClass(gear, effects, modifiers) {
  const unarmoredBases = [{ source: UNARMORED_SOURCE, base: 10, abilities: [] }].concat(effects.unarmoredBases);
  const combinations = [[gear.armor, gear.shield], [null, gear.shield], [gear.armor, null], [null, null]];
  return combinations
    .map(([armor, shield]) => armorClassWith(armor, shield, effects, modifiers, unarmoredBases))
    .reduce((best, candidate) => candidate.total > best.total ? candidate : best);
}

function wornArmorDescription(stats, magicBonus) {
  const dexterityPart = stats.dex === 0 ? '' : stats.dex == null ? ' + Dex' : ' + Dex (max. +' + stats.dex + ')';
  return 'armure portée : CA ' + stats.base + dexterityPart + (magicBonus ? ' + ' + magicBonus : '');
}

function unarmoredDescription(unarmoredBase) {
  const prefix = unarmoredBase.source !== UNARMORED_SOURCE ? 'sans armure : ' : '';
  const abilityParts = unarmoredBase.abilities.map(ability => ' + ' + ABILITY_NAMES[ability]).join('');
  return prefix + 'CA ' + unarmoredBase.base + ' + Dex' + abilityParts + (unarmoredBase.noShield ? ' (sans bouclier)' : '');
}

function addArmorEffectLines(effects, gear, best, abilityTotals) {
  if (best.shield) effects.lines.unshift([best.shield.n, 'bouclier : CA +' + best.shield.ca]);
  else if (gear.shield) effects.lines.unshift([gear.shield.n, 'bouclier non utilisé : la CA est meilleure sans']);
  if (best.armor) {
    const armor = best.armor;
    const stats = armor.st;
    effects.lines.unshift([armor.n + (armor.base ? ' (' + armor.base.toLowerCase() + ')' : ''), wornArmorDescription(stats, armor.b)]);
    if (stats.str && abilityTotals.for < stats.str) {
      effects.speedBonus -= 3;
      effects.lines.push([armor.n, 'Force ' + stats.str + ' requise : vitesse −3 m']);
    }
    if (stats.disc) effects.lines.push([armor.n, 'désavantage aux tests de Discrétion']);
    return;
  }
  if (gear.armor) effects.lines.unshift([gear.armor.n, 'armure non portée : la CA est meilleure sans']);
  effects.lines.unshift([best.unarmoredBase.source, unarmoredDescription(best.unarmoredBase)]);
}

function spellcastingAbility(spellcasting) {
  return fieldValue('cast') || (spellcasting ? spellcasting.carac : '');
}

function renderSpellcastingNumbers(castingAbility, proficiencyBonus, modifiers, effects) {
  const spellSaveDc = 8 + proficiencyBonus + modifiers[castingAbility] + fieldNumber('b_dd') + effects.spellSaveDcBonus;
  const spellAttack = proficiencyBonus + modifiers[castingAbility] + fieldNumber('b_atk') + effects.spellAttackBonus;
  $('#dc').textContent = castingAbility ? spellSaveDc : '—';
  $('#sab').textContent = castingAbility ? signed(spellAttack) : '—';
  derivedValues.pb = proficiencyBonus;
  if (castingAbility) {
    derivedValues.atk = spellAttack;
    derivedValues.dd = spellSaveDc;
  }
}

function speedPlaceholder(effects) {
  if (!effects.species && !effects.speedBonus) return '9 m';
  return frenchDecimal((effects.species ? effects.species.data.vit : DEFAULT_SPEED_METERS) + effects.speedBonus) + ' m';
}

function recalculateSheet() {
  const level = currentLevel();
  const proficiencyBonus = proficiencyBonusAt(level);
  fillSubclassSelect();
  syncBackgroundOriginFeat();
  const effects = computeEffects(level, proficiencyBonus);
  syncAutomaticChecks(effects);
  fillLineageSelect();
  const scores = computeAbilityScores(effects);
  const modifiers = scores.modifiers;
  renderAbilityScores(scores, effects, proficiencyBonus);
  renderSkills(modifiers, effects, proficiencyBonus);
  $('#pb').textContent = signed(proficiencyBonus);
  const initiative = modifiers.dex + fieldNumber('b_init') + effects.initiativeBonus + effects.abilityCheckBonus;
  $('#init').textContent = signed(initiative);
  const gear = bestGear(modifiers.dex);
  const best = bestArmorClass(gear, effects, modifiers);
  addArmorEffectLines(effects, gear, best, scores.totals);
  const armorClass = best.total + fieldNumber('b_ca') + effects.armorClassBonus;
  const passivePerception = 10 + modifiers.sag + skillProficiencyBonus(PERCEPTION_INDEX, proficiencyBonus) + effects.abilityCheckBonus;
  $('#ca').textContent = armorClass;
  $('#pp').textContent = passivePerception;
  const characterClass = findCharacterClass();
  const spellcasting = characterClass ? spellcastingOf(characterClass.data) : null;
  derivedValues = { niv: level, tot: { ...scores.totals }, cl: characterClass ? characterClass.name : '', cast: !!spellcasting, ar: [], ca: armorClass, init: initiative, pp: passivePerception };
  renderSpellcastingNumbers(spellcastingAbility(spellcasting), proficiencyBonus, modifiers, effects);
  latestScores = { modifiers, proficiencyBonus };
  sheetField('vitesse').placeholder = speedPlaceholder(effects);
  renderSpellcastingSection(modifiers, proficiencyBonus, level, characterClass, spellcasting);
  renderClassChoiceList(characterClass, level);
  renderProficiencies(characterClass);
  renderLanguages();
  renderExtras(effects, level, proficiencyBonus, modifiers, scores.totals);
  renderChargedItems();
  renderRestHint();
}

function updateHitDiceTotal() {
  const className = fieldValue('clsel');
  if (className && CLASS_HIT_DICE[className]) sheetField('dvtot').value = currentLevel() + 'd' + CLASS_HIT_DICE[className];
}

function handleClassSelection() {
  const className = fieldValue('clsel');
  if (!className) return;
  sheetField('classe').value = className;
  updateHitDiceTotal();
  recalculateSheet();
  autosave();
}

function collectSheet() {
  const data = {};
  document.querySelectorAll('[data-k]').forEach(field => { data[field.dataset.k] = field.type === 'checkbox' ? field.checked : field.value; });
  data.ress = resourceState;
  data.extras = extras;
  data.derive = derivedValues;
  return { version: 5, type: 'fiche-dnd-5e', data };
}

const deepCopy = value => JSON.parse(JSON.stringify(value));
const isObject = value => !!value && typeof value === 'object';

function restoreExtras(savedExtras) {
  const restored = createEmptyExtras();
  if (!isObject(savedExtras)) return restored;
  const saved = deepCopy(savedExtras);
  restored.sp = Object.assign(restored.sp, saved.sp || {});
  restored.spl = Array.isArray(saved.spl) ? saved.spl.filter(spell => spell && spell.n) : [];
  restored.bg = Object.assign(restored.bg, saved.bg || {});
  if (!restored.bg.ch) restored.bg.ch = {};
  restored.dons = Array.isArray(saved.dons) ? saved.dons.filter(takenFeat => takenFeat && takenFeat.id && takenFeat.u) : [];
  restored.dons.forEach(takenFeat => { takenFeat.ch = takenFeat.ch || {}; });
  restored.auto = isObject(saved.auto) ? saved.auto : {};
  restored.mal = Array.isArray(saved.mal) ? saved.mal.filter(name => typeof name === 'string') : [];
  if (!restored.sp.ch) restored.sp.ch = {};
  restored.oh = isObject(saved.oh) ? saved.oh : {};
  return restored;
}

function applySheet(sheet) {
  const data = sheet && sheet.data;
  if (!isObject(data)) throw new Error('format');
  ensureSpeciesOption(data.race);
  document.querySelectorAll('[data-k]').forEach(field => {
    if (!(field.dataset.k in data)) return;
    if (field.type === 'checkbox') field.checked = !!data[field.dataset.k];
    else field.value = data[field.dataset.k];
  });
  replaceResourceState(isObject(data.ress) ? deepCopy(data.ress) : {});
  extras = restoreExtras(data.extras);
  fillSubclassSelect();
  sheetField('sclasse').value = data.sclasse || '';
  fillLineageSelect();
  sheetField('sespece').value = data.sespece || '';
  recalculateSheet();
}

function defaultFieldValue(key) {
  if (key === 'niveau') return '1';
  return key.startsWith('ab_') ? '10' : '';
}

function resetSheet() {
  document.querySelectorAll('[data-k]').forEach(field => {
    if (field.type === 'checkbox') {
      field.checked = false;
      field.disabled = false;
    } else if (field.tagName === 'SELECT') {
      field.selectedIndex = 0;
    } else {
      field.value = defaultFieldValue(field.dataset.k);
    }
  });
  replaceResourceState({});
  extras = createEmptyExtras();
}

function showCharacter(sheet, character) {
  resetSheet();
  if (sheet) applySheet(sheet);
  sheetField('nom').value = character.nom;
  recalculateSheet();
}

function autosave() {
  Persos.save();
}

const normalizeWeaponName = text => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘]/g, "'");

function weaponNameVariants(weapon, weapons) {
  const englishName = weapon.en && !weapons.some(other => normalizeWeaponName(other.n) === normalizeWeaponName(weapon.en)) ? weapon.en : '';
  return [weapon.n, englishName, weapon.n === 'Serpe' ? 'faucille' : ''].filter(Boolean);
}

function weaponsNamedIn(head, weapons) {
  const matches = [];
  let remainingHead = head;
  for (const weapon of [...weapons].sort((first, second) => second.n.length - first.n.length)) {
    for (const name of weaponNameVariants(weapon, weapons)) {
      const pattern = new RegExp('(^|[^a-z])' + escapeRegExp(normalizeWeaponName(name)) + '(?![a-z])', 'g');
      if (!pattern.test(remainingHead)) continue;
      if (!matches.includes(weapon)) matches.push(weapon);
      remainingHead = remainingHead.replace(pattern, '$1#');
    }
  }
  return { matches, remainingHead };
}

function weaponsByFamily(head, weapons) {
  if (/\barc\b/.test(head)) return weapons.filter(weapon => /^arc /.test(normalizeWeaponName(weapon.n)));
  if (/epee/.test(head)) return weapons.filter(weapon => /epee|rapiere|cimeterre/.test(normalizeWeaponName(weapon.n)));
  if (/hache/.test(head)) return weapons.filter(weapon => /hache/.test(normalizeWeaponName(weapon.n)));
  if (/corps a corps/.test(head)) return weapons.filter(weapon => /corps à corps/.test(weapon.c));
  return weapons;
}

function baseWeaponChoices(magicWeapon, weapons) {
  const text = textWithoutTags(magicWeapon.h);
  if (magicWeapon.base) {
    const chosenBase = weapons.filter(weapon => weapon.n === magicWeapon.base);
    if (chosenBase.length) return chosenBase;
  }
  if (/b[aâ]ton de combat/i.test(text)) return weapons.filter(weapon => weapon.n === 'Bâton');
  const head = itemDescriptionHead(text, normalizeWeaponName) + ' | ' + normalizeWeaponName(magicWeapon.n);
  const { matches, remainingHead } = weaponsNamedIn(head, weapons);
  if (matches.length) return weapons.filter(weapon => matches.includes(weapon));
  return weaponsByFamily(remainingHead, weapons);
}

function magicWeaponBonus(item) {
  const chosenVersion = hasVersionChoice(MAGIC_ITEM_EFFECTS[item.n]) && extras.oh[item.n];
  if (chosenVersion && /\+(\d)/.test(chosenVersion)) return +chosenVersion.match(/\+(\d)/)[1];
  const weaponEffect = Array.isArray(item.fx) && item.fx.find(effect => effect.t === 'arme');
  if (weaponEffect) return +weaponEffect.n || 0;
  const match = textWithoutTags(item.h).match(/\+(\d) aux jets d'attaque et de dégâts/);
  return match ? +match[1] : 0;
}

function attackAbilityModifier(weapon, properties) {
  const modifiers = latestScores.modifiers;
  if (/à distance/.test(weapon.c)) return modifiers.dex;
  if (/Finesse/.test(properties)) return Math.max(modifiers.for, modifiers.dex);
  return modifiers.for;
}

function attackLine(name, weapon, magicBonus, proficient) {
  const damage = (weapon.h.match(/Dégâts : ([^.]*)\./) || [])[1] || '';
  const properties = (weapon.h.match(/Propriétés : ([^.]*)\./) || [])[1] || '';
  const abilityBonus = attackAbilityModifier(weapon, properties);
  const toHit = abilityBonus + (proficient ? latestScores.proficiencyBonus : 0) + magicBonus;
  const damageBonus = abilityBonus + magicBonus;
  const damageParts = damage.match(/^(\S+)\s+(.*)$/);
  return [name, signed(toHit), damageParts ? damageParts[1] + (damageBonus ? signed(damageBonus) : '') + ' ' + damageParts[2] : damage];
}

async function loadImportLists() {
  const [spells, magicItems] = await Promise.all(['assets/json/vf/spells.json', 'assets/json/vf/objets.json'].map(fetchJson));
  if (!equipmentData) equipmentData = await fetchJson('assets/json/vf/equipement.json');
  return { spells, magicItems };
}

function gatherImportSources(spells, magicItems) {
  const magicItemsByName = {};
  magicItems.concat(customEntries('objets')).forEach(item => { magicItemsByName[item.n] = item; });
  const weapons = equipmentData.concat(customEntries('equipement')).filter(item => item.t === 'Arme' && item.h);
  const equipmentItems = equipmentPartItems();
  const grimoire = Persos.part('grimoire');
  const spellNames = grimoire && grimoire.data && grimoire.data.sorts || [];
  const magicItemsPart = Persos.part('objets');
  const magicItemsData = magicItemsPart && magicItemsPart.data || {};
  const ownedNames = magicItemsData.objets || [];
  const attuned = new Set(magicItemsData.harmonises || []);
  const owned = ownedNames.map(name => magicItemsByName[name] || { n: name, a: '' });
  const usableItems = owned.filter(item => !item.a || attuned.has(item.n)).sort((first, second) => !!second.a - !!first.a);
  const notAttunedNames = owned.filter(item => item.a && !attuned.has(item.n)).map(item => item.n);
  const attunedSlots = Array.from({ length: ATTUNED_ITEM_SLOT_COUNT }, (unused, index) => sheetField('obj' + index));
  const staleSlots = attunedSlots.filter(slot => {
    const name = slot.value.trim();
    const item = magicItemsByName[name];
    return item && item.a && !attuned.has(name);
  });
  const weaponCandidates = importableWeapons(equipmentItems, weapons, magicItemsByName);
  return { spells, spellNames, equipmentItems, ownedNames, usableItems, notAttunedNames, attunedSlots, staleSlots, weaponCandidates };
}

function importableWeapons(equipmentItems, weapons, magicItemsByName) {
  const candidates = [];
  equipmentItems.forEach(entry => {
    const weapon = weapons.find(candidate => candidate.n === entry.n);
    if (weapon) candidates.push({ nom: weapon.n, opts: [weapon], mb: 0 });
  });
  attunedItems().forEach(name => {
    const item = magicItemsByName[name];
    if (!item || !item.h) return;
    if (item.t !== 'Arme' && !/b[aâ]ton de combat/i.test(item.h)) return;
    const options = baseWeaponChoices(item, weapons);
    if (options.length) candidates.push({ nom: name, opts: options, mb: magicWeaponBonus(item), magic: 1 });
  });
  return candidates;
}

const importHeadingHtml = title => `<h4 style="margin:10px 0 4px;font:700 13px system-ui;color:#2a3170">${title}</h4>`;
const importCheckboxHtml = (attribute, label, extraHtml = '') => `<label style="display:flex;gap:8px;align-items:center;font-size:13px;flex:1 1 220px"><input type="checkbox" ${attribute} checked> ${label}</label>${extraHtml}`;
const importRowHtml = html => `<div style="display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center">${html}</div>`;
const plural = (count, word) => count + ' ' + word + (count > 1 ? 's' : '');

function importMagicItemsHtml(sources) {
  let html = importHeadingHtml('Objets magiques') + sources.usableItems.map((item, index) => importRowHtml(importCheckboxHtml(`data-o="${index}"`, escapeHtml(item.n) + (item.a ? ' → objets liés (harmonisé)' : ' → inventaire')))).join('');
  if (sources.notAttunedNames.length) {
    html += `<p style="margin:4px 0 0;color:var(--soft);font-size:12px">Non importés car tu n’es pas harmonisé avec eux : ${sources.notAttunedNames.map(name => escapeHtml(name)).join(', ')}.${sources.staleSlots.length ? ' Ils seront retirés des objets liés.' : ''}</p>`;
  }
  return html;
}

function importWeaponRowHtml(candidate, index) {
  const label = '<b>' + escapeHtml(candidate.nom) + '</b>' + (candidate.mb ? ' (' + signed(candidate.mb) + ')' : '');
  let baseWeapon = '';
  if (candidate.opts.length > 1) baseWeapon = `<select data-w="${index}" aria-label="Arme de base">${candidate.opts.map((weapon, optionIndex) => `<option value="${optionIndex}">${escapeHtml(weapon.n)}</option>`).join('')}</select>`;
  else if (candidate.magic) baseWeapon = `<small>${escapeHtml(candidate.opts[0].n)}</small>`;
  const proficiency = `<label style="display:flex;gap:4px;align-items:center;font-size:12px"><input type="checkbox" data-p="${index}" checked> maîtrisée</label>`;
  return importRowHtml(importCheckboxHtml(`data-u="${index}"`, label) + baseWeapon + proficiency);
}

function importDialogHtml(sources) {
  let html = '<h3 style="margin:0 0 4px;font:italic 700 18px var(--serif)">Importer dans la fiche</h3><p style="margin:0;color:var(--soft);font-size:12px">Ce qui a été choisi sur les pages Équipement, Objets magiques et Grimoire. Décoche ce que tu ne veux pas importer.</p><div style="max-height:62vh;overflow:auto">';
  if (sources.equipmentItems.length) html += importHeadingHtml('Équipement') + importRowHtml(importCheckboxHtml('data-s="eq"', plural(sources.equipmentItems.length, 'objet') + ' → inventaire (zone Équipement)'));
  if (sources.usableItems.length || sources.notAttunedNames.length) html += importMagicItemsHtml(sources);
  if (sources.weaponCandidates.length) {
    html += importHeadingHtml('Armes → attaques') + sources.weaponCandidates.map(importWeaponRowHtml).join('')
      + '<p style="margin:4px 0 0;color:var(--soft);font-size:11px">Pour toucher : Force (Dextérité à distance, la meilleure des deux pour Finesse) + maîtrise + bonus magique.</p>';
  }
  if (sources.spellNames.length) html += importHeadingHtml('Sorts') + importRowHtml(importCheckboxHtml('data-s="sp"', plural(sources.spellNames.length, 'sort') + ' du grimoire → zone de sorts, par niveau'));
  return html + '</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button type="button" id="ic">Annuler</button><button type="button" id="ik" style="background:#2a3170;color:#fff;border:0;border-radius:6px;padding:6px 14px">Importer</button></div>';
}

function createDialog(cssText, html) {
  const dialog = document.createElement('dialog');
  dialog.style.cssText = cssText;
  dialog.innerHTML = html;
  document.body.appendChild(dialog);
  dialog.showModal();
  return dialog;
}

function closeAndRemove(dialog) {
  dialog.close();
  dialog.remove();
}

function createInventoryEditor() {
  const inventory = sheetField('equip');
  const lines = inventory.value.split('\n');
  return {
    put(name, quantity, replaceExisting) {
      const index = lines.findIndex(line => line.replace(/^\d+×\s*/, '').trim() === name);
      if (index < 0) lines.push(quantity + '× ' + name);
      else if (replaceExisting) lines[index] = quantity + '× ' + name;
    },
    save() {
      const newValue = lines.filter((line, index, all) => line.trim() || (index > 0 && index < all.length - 1)).join('\n').replace(/^\n+/, '');
      if (newValue === inventory.value) return;
      inventory.value = newValue;
      dispatchInputEvent(inventory);
    }
  };
}

function importMagicItems(sources, isChecked, inventory, report) {
  sources.staleSlots.forEach(slot => {
    slot.value = '';
    dispatchInputEvent(slot);
  });
  let skippedCount = 0;
  sources.usableItems.forEach((item, index) => {
    if (!isChecked(`[data-o="${index}"]`)) return;
    if (!item.a) {
      inventory.put(item.n, 1, false);
      return;
    }
    if (sources.attunedSlots.some(slot => slot.value.trim() === item.n)) return;
    const freeSlot = sources.attunedSlots.find(slot => !slot.value.trim());
    if (!freeSlot) {
      skippedCount++;
      return;
    }
    freeSlot.value = item.n;
    dispatchInputEvent(freeSlot);
  });
  if (sources.usableItems.length) report.done.push('objets magiques');
  if (skippedCount) report.warnings.push('Il n’y a que 5 emplacements d’objets liés : ' + skippedCount + ' objet(s) harmonisé(s) non ajouté(s).');
}

function importWeapons(sources, dialog, isChecked, report) {
  const attackRows = Array.from({ length: ATTACK_ROW_COUNT }, (unused, index) => ['n', 'b', 'd'].map(column => sheetField('a' + index + '_' + column)));
  let skippedCount = 0;
  sources.weaponCandidates.forEach((candidate, index) => {
    if (!isChecked(`[data-u="${index}"]`)) return;
    const baseSelect = dialog.querySelector(`[data-w="${index}"]`);
    const weapon = candidate.opts[baseSelect ? +baseSelect.value : 0];
    const line = attackLine(candidate.nom, weapon, candidate.mb, isChecked(`[data-p="${index}"]`));
    const row = attackRows.find(cells => cells[0].value.trim() === candidate.nom) || attackRows.find(cells => cells.every(cell => !cell.value.trim()));
    if (!row) {
      skippedCount++;
      return;
    }
    row.forEach((cell, column) => {
      cell.value = line[column];
      dispatchInputEvent(cell);
    });
  });
  if (sources.weaponCandidates.length) report.done.push('armes');
  if (skippedCount) report.warnings.push('Il n’y a que 5 lignes d’attaque : ' + skippedCount + ' arme(s) non ajoutée(s).');
}

function spellLinesByLevel(spells, spellNames) {
  const spellsByName = {};
  spells.forEach(spell => { spellsByName[spell.n] = spell; });
  const namesByLevel = Array.from({ length: 10 }, () => []);
  spellNames.map(name => spellsByName[name]).filter(Boolean).forEach(spell => namesByLevel[spell.l].push(spell.n.split('|')[0]));
  namesByLevel.forEach(names => names.sort((first, second) => first.localeCompare(second, 'fr')));
  return namesByLevel.map((names, level) => names.length ? (level ? 'Niveau ' + level : 'Tours de magie') + ' : ' + names.join(', ') : '').filter(Boolean);
}

function importSpells(sources, report) {
  const spellArea = sheetField('sorts');
  const keptLines = spellArea.value.split('\n').filter(line => !/^(Tours de magie|Niveau \d) : /.test(line));
  spellArea.value = spellLinesByLevel(sources.spells, sources.spellNames).concat(keptLines.filter(line => line.trim())).join('\n');
  extras.spl = [];
  dispatchInputEvent(spellArea);
  report.done.push('sorts');
}

function applyImport(sources, dialog) {
  const isChecked = selector => { const checkbox = dialog.querySelector(selector); return !!(checkbox && checkbox.checked); };
  const report = { warnings: [], done: [] };
  const inventory = createInventoryEditor();
  if (isChecked('[data-s="eq"]')) {
    sources.equipmentItems.forEach(item => inventory.put(item.n, item.qte, true));
    report.done.push('équipement');
  }
  importMagicItems(sources, isChecked, inventory, report);
  inventory.save();
  recalculateSheet();
  importWeapons(sources, dialog, isChecked, report);
  if (isChecked('[data-s="sp"]')) importSpells(sources, report);
  recalculateSheet();
  autosave();
  closeAndRemove(dialog);
  if (report.warnings.length) alert(report.warnings.join('\n'));
  showSheetMessage(report.done.length ? 'Importé : ' + report.done.join(', ') : 'Rien d’importé');
}

async function openImportDialog() {
  Persos.save();
  recalculateSheet();
  let lists;
  try {
    lists = await loadImportLists();
  } catch (error) {
    alert('Impossible de lire les listes du site (sorts, objets, équipement).');
    return;
  }
  const sources = gatherImportSources(lists.spells, lists.magicItems);
  if (!sources.equipmentItems.length && !sources.spellNames.length && !sources.ownedNames.length) {
    alert('Rien à importer : choisis d’abord de l’équipement, des objets magiques ou des sorts sur les autres pages.');
    return;
  }
  const dialog = createDialog('border:0;border-radius:12px;padding:16px 20px;width:min(560px,94vw);box-shadow:0 10px 40px #0008', importDialogHtml(sources));
  dialog.querySelector('#ic').onclick = () => closeAndRemove(dialog);
  dialog.querySelector('#ik').onclick = () => applyImport(sources, dialog);
}

function handleImportClick(event) {
  if (event.target.closest('#bImp')) openImportDialog();
}

function hitDiceInfo() {
  const match = fieldValue('dvtot').match(/(\d+)\s*d\s*(\d+)/i);
  const total = match ? +match[1] : currentLevel();
  const die = match ? +match[2] : (CLASS_HIT_DICE[fieldValue('clsel')] || 8);
  const remainingText = fieldValue('dvrest').trim();
  return { total, die, remaining: remainingText === '' ? total : Math.max(0, Math.min(total, parseInt(remainingText) || 0)) };
}

function shortRestGain(restText) {
  const text = normalizeText(restText);
  if (!text.includes('court')) return 0;
  const levelRequirement = text.match(/court[^·]*des le niv\. (\d+)|des le niv\. (\d+)[^·]*court/);
  if (levelRequirement && currentLevel() < +(levelRequirement[1] || levelRequirement[2])) return 0;
  return /1 (?:recuperee |de plus )?au repos court/.test(text) ? 1 : 'all';
}

function refillPool(key, maximum, gain) {
  if (gain === 'all') {
    delete resourceState[key];
    return;
  }
  const remaining = resourceState[key] === undefined ? maximum : +resourceState[key];
  if (remaining + gain >= maximum) delete resourceState[key];
  else resourceState[key] = remaining + gain;
}

function refillCheckboxes(key, maximum, gain) {
  let toRecover = gain === 'all' ? maximum : gain;
  for (let index = maximum - 1; index >= 0 && toRecover > 0; index--) {
    if (!resourceState[key + '_' + index]) continue;
    delete resourceState[key + '_' + index];
    toRecover--;
  }
}

const restGain = (kind, restText) => kind === 'long' ? 'all' : shortRestGain(restText || '');

function restoreClassResources(kind, recovered) {
  const characterClass = findCharacterClass();
  if (!characterClass) return;
  const level = currentLevel();
  (characterClass.data.ressources || []).forEach(resource => {
    const gain = restGain(kind, resource.repos);
    if (!gain) return;
    const maximum = resourceMaximum(resource.max, level, latestScores.modifiers);
    if (!maximum) return;
    if (resource.mode === 'reserve') refillPool('r_' + resource.id, maximum, gain);
    else refillCheckboxes('r_' + resource.id, maximum, gain);
    recovered.push(resource.nom);
  });
}

function restoreExtraPools(kind, recovered) {
  extraPools.forEach(pool => {
    const gain = restGain(kind, pool.restText);
    if (!gain) return;
    refillPool(pool.key, pool.max, gain);
    recovered.push(pool.name);
  });
}

function rollRechargeAmount(recharge) {
  const parts = recharge.match(/^(\d+)(?:d(\d+))?([+-]\d+)?$/);
  if (!parts) return null;
  const rolled = parts[2] ? Array.from({ length: +parts[1] }, () => 1 + Math.floor(Math.random() * +parts[2])).reduce((total, roll) => total + roll, 0) : +parts[1];
  return Math.max(0, rolled + (+parts[3] || 0));
}

function rechargeItemsAtDawn(recovered) {
  chargedItems.forEach(item => {
    if (!item.recharge || resourceState[item.key] === undefined) return;
    const remaining = Math.min(item.max, Math.max(0, +resourceState[item.key] || 0));
    const gain = item.recharge === 'all' ? item.max : rollRechargeAmount(item.recharge);
    if (gain === null) return;
    refillPool(item.key, item.max, gain);
    const recoveredCharges = Math.min(gain, item.max - remaining);
    recovered.push(item.name + ' +' + recoveredCharges + ' charge' + (recoveredCharges > 1 ? 's' : ''));
  });
}

function restoreResources(kind) {
  const recovered = [];
  restoreClassResources(kind, recovered);
  restoreExtraPools(kind, recovered);
  if (kind === 'long') rechargeItemsAtDawn(recovered);
  return recovered;
}

function setFieldAndNotify(key, value) {
  const field = sheetField(key);
  if (!field) return;
  field.value = value;
  dispatchInputEvent(field);
}

const DEATH_SAVE_KEYS = ['ds1', 'ds2', 'ds3', 'df1', 'df2', 'df3'];
const recoveredSuffix = recovered => recovered.length ? ' · rechargé : ' + recovered.join(', ') : '';

function clearDeathSaves() {
  DEATH_SAVE_KEYS.forEach(key => {
    const checkbox = sheetField(key);
    if (!checkbox || !checkbox.checked) return;
    checkbox.checked = false;
    dispatchInputEvent(checkbox);
  });
}

function clearSpellSlotUsage() {
  Object.keys(resourceState).forEach(key => { if (/^(sl\d|pc)_/.test(key)) delete resourceState[key]; });
  SPELL_LEVELS.forEach(level => { if (fieldValue('sl' + level + '_u')) setFieldAndNotify('sl' + level + '_u', ''); });
}

function takeLongRest() {
  if (!confirm('Repos long : PV au maximum, tous les dés de vie récupérés, emplacements de sorts et capacités rechargés, objets à charges rechargés comme à l’aube. Continuer ?')) return;
  const maximumHitPoints = parseInt(fieldValue('pvmax'));
  if (!isNaN(maximumHitPoints)) setFieldAndNotify('pv', maximumHitPoints);
  setFieldAndNotify('pvtemp', '');
  clearDeathSaves();
  setFieldAndNotify('dvrest', hitDiceInfo().total);
  clearSpellSlotUsage();
  const recovered = restoreResources('long');
  replaceResourceState(resourceState);
  recalculateSheet();
  autosave();
  showSheetMessage('Repos long terminé' + recoveredSuffix(recovered));
}

function shortRestDialogHtml(hitDice, constitutionModifier, hitPoints, maximumHitPoints) {
  return `<h3 style="margin:0 0 6px;font:italic 700 18px var(--serif)">Repos court</h3>
   <p style="margin:0 0 8px;font-size:13px">Dés de vie restants : <b>${hitDice.remaining}</b> / ${hitDice.total} (d${hitDice.die}) · modificateur de Constitution ${signed(constitutionModifier)}<br>PV : <b>${isNaN(hitPoints) ? '—' : hitPoints}</b>${isNaN(maximumHitPoints) ? '' : ' / ' + maximumHitPoints}</p>
   <label style="display:flex;gap:8px;align-items:center;font-size:13px">Dés à dépenser <input type="number" id="rsn" min="0" max="${hitDice.remaining}" value="${hitDice.remaining ? 1 : 0}" style="width:60px"></label>
   <p id="rsr" style="margin:8px 0 0;font-size:13px;color:#2e9e5b;min-height:1em"></p>
   <p style="margin:6px 0 0;font-size:11px;color:#6b7280">Chaque dé rend 1d${hitDice.die} ${signed(constitutionModifier)} PV (au moins 0). Les capacités qui reviennent au repos court sont aussi rechargées (magie de pacte, etc.).</p>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button type="button" id="rsc">Annuler</button><button type="button" id="rsk" style="background:#2a3170;color:#fff;border:0;border-radius:6px;padding:6px 14px">Lancer et récupérer</button></div>`;
}

function spendHitDice(dialog, hitDice, constitutionModifier, hitPoints, maximumHitPoints) {
  const diceCount = Math.max(0, Math.min(hitDice.remaining, parseInt(dialog.querySelector('#rsn').value) || 0));
  const rolls = Array.from({ length: diceCount }, () => 1 + Math.floor(Math.random() * hitDice.die));
  const healing = rolls.reduce((total, roll) => total + Math.max(0, roll + constitutionModifier), 0);
  if (diceCount) {
    const current = isNaN(hitPoints) ? 0 : hitPoints;
    setFieldAndNotify('pv', isNaN(maximumHitPoints) ? current + healing : Math.min(maximumHitPoints, current + healing));
    setFieldAndNotify('dvrest', hitDice.remaining - diceCount);
  }
  Object.keys(resourceState).forEach(key => { if (/^pc_/.test(key)) delete resourceState[key]; });
  const recovered = restoreResources('court');
  replaceResourceState(resourceState);
  recalculateSheet();
  autosave();
  closeAndRemove(dialog);
  const diceReport = diceCount ? 'Dés : ' + rolls.join(' + ') + ' ' + (constitutionModifier ? '(' + signed(constitutionModifier) + ' chacun) ' : '') + '→ +' + healing + ' PV' : 'Repos court terminé';
  showSheetMessage(diceReport + recoveredSuffix(recovered));
}

function openShortRestDialog() {
  recalculateSheet();
  const hitDice = hitDiceInfo();
  const constitutionModifier = latestScores.modifiers.con || 0;
  const hitPoints = parseInt(fieldValue('pv'));
  const maximumHitPoints = parseInt(fieldValue('pvmax'));
  const dialog = createDialog('border:0;border-radius:12px;padding:16px 20px;width:min(420px,94vw);box-shadow:0 10px 40px #0008', shortRestDialogHtml(hitDice, constitutionModifier, hitPoints, maximumHitPoints));
  dialog.querySelector('#rsc').onclick = () => closeAndRemove(dialog);
  dialog.querySelector('#rsk').onclick = () => spendHitDice(dialog, hitDice, constitutionModifier, hitPoints, maximumHitPoints);
}

function handleResourceEdit(input) {
  const key = input.dataset.r;
  if (input.type === 'checkbox') {
    if (input.checked) resourceState[key] = 1;
    else delete resourceState[key];
  } else if (input.value === '') {
    delete resourceState[key];
  } else {
    resourceState[key] = Math.max(0, parseInt(input.value) || 0);
  }
  clearRenderCache();
  autosave();
}

function choiceStoreFor(path) {
  if (path === 'sp') return extras.sp.ch;
  if (path === 'bg') return extras.bg.ch;
  if (path === 'oh') return extras.oh;
  return (extras.dons.find(takenFeat => 'd' + takenFeat.u === path) || {}).ch;
}

function handleExtraChoiceEdit(input) {
  const [path, choiceId] = input.dataset.x.split('|');
  const choices = choiceStoreFor(path);
  if (!choices) return;
  choices[choiceId] = input.value;
  if (input.type === 'text') {
    autosave();
    return;
  }
  recalculateSheet();
  autosave();
}

function handleSpeciesChange() {
  const species = findSpecies();
  const speciesName = species ? species.name : '';
  if (speciesName !== extras.sp.k) {
    extras.sp = { k: speciesName, ch: {}, auto: extras.sp.auto };
    sheetField('sespece').value = '';
    const speciesSpeed = species ? frenchDecimal(species.data.vit) + ' m' : '';
    if (!fieldValue('vitesse').trim() || fieldValue('vitesse') === extras.sp.auto) {
      sheetField('vitesse').value = speciesSpeed;
      extras.sp.auto = speciesSpeed;
    }
  }
  syncSpeciesField();
}

function handleBackgroundChange() {
  if (fieldValue('bgsel') === extras.bg.k) return;
  extras.bg = { k: fieldValue('bgsel'), ch: {} };
  sheetField('historique').value = fieldValue('bgsel');
}

function handleSubclassChange() {
  sheetField('sousclasse').value = fieldValue('sclasse');
  const characterClass = findCharacterClass();
  const subclassRule = characterClass && characterClass.data.sous_classe;
  if (subclassRule && sheetField('sclance')) sheetField('sclance').checked = thirdCasterPattern(subclassRule).test(fieldValue('sclasse'));
}

const FIELD_EDIT_SIDE_EFFECTS = {
  nom: () => Persos.setName(fieldValue('nom')),
  niveau: updateHitDiceTotal,
  race: handleSpeciesChange,
  sespece: syncSpeciesField,
  bgsel: handleBackgroundChange,
  sclasse: handleSubclassChange,
  clsel: clearRenderCache,
  classe: clearRenderCache
};

function linkExpertiseAndProficiency(key, checkbox) {
  if (key.startsWith('ske_') && checkbox.checked) {
    const proficiency = sheetField('sk_' + key.slice(4));
    if (proficiency) proficiency.checked = true;
  }
  if (key.startsWith('sk_') && !checkbox.checked) {
    const expertise = sheetField('ske_' + key.slice(3));
    if (expertise) expertise.checked = false;
  }
}

function handleFieldEdit(field) {
  const key = field.dataset && field.dataset.k;
  if (key) {
    linkExpertiseAndProficiency(key, field);
    if (Object.hasOwn(FIELD_EDIT_SIDE_EFFECTS, key)) FIELD_EDIT_SIDE_EFFECTS[key]();
  }
  recalculateSheet();
  autosave();
}

function handleSheetEdit(event) {
  const target = event.target;
  if (target.dataset && target.dataset.r !== undefined) {
    handleResourceEdit(target);
    return;
  }
  if (target.dataset && target.dataset.x !== undefined) {
    handleExtraChoiceEdit(target);
    return;
  }
  handleFieldEdit(target);
}

function saveSheetToFile() {
  downloadJsonFile(`fiche_${fileSafeName(fieldValue('nom') || 'personnage')}.json`, collectSheet());
  showSheetMessage('Fiche enregistrée dans un fichier .json');
}

function loadSheetFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applySheet(JSON.parse(reader.result));
      if (fieldValue('nom').trim()) Persos.setName(fieldValue('nom'));
      else sheetField('nom').value = Persos.current().nom;
      autosave();
      showSheetMessage('Fiche chargée : ' + file.name);
    } catch (error) {
      showSheetMessage('Fichier invalide : choisissez un .json créé par cette fiche');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function shrinkTextareasToFit() {
  document.querySelectorAll('textarea').forEach(textarea => {
    let fontSize = 11;
    textarea.style.fontSize = fontSize + 'px';
    while (textarea.scrollHeight > textarea.clientHeight + 1 && fontSize > 6) {
      fontSize -= .5;
      textarea.style.fontSize = fontSize + 'px';
    }
  });
}

function restoreTextareaFontSize() {
  document.querySelectorAll('textarea').forEach(textarea => { textarea.style.fontSize = ''; });
}

function bookFeatCategories() {
  const categories = [];
  bookFeats.forEach(feat => { if (!categories.includes(feat.cat)) categories.push(feat.cat); });
  return categories;
}

function featOptionGroupHtml(label, feats) {
  if (!feats.length) return '';
  return `<optgroup label="${escapeHtml(label)}">${feats.map(feat => `<option value="${escapeHtml(feat.id)}">${escapeHtml(feat.nom)}</option>`).join('')}</optgroup>`;
}

function rebuildFeatIndex() {
  const createdFeats = Persos.custom().dons.filter(feat => feat && feat.id && feat.nom);
  featList = bookFeats.concat(createdFeats);
  $('#donSel').innerHTML = '<option value="">Choisir un don…</option>' + featOptionGroupHtml('Mes créations', createdFeats) + bookFeatCategories().map(category => featOptionGroupHtml(category, bookFeats.filter(feat => feat.cat === category))).join('');
}

function forgetTakenFeat(predicate) {
  extras.dons.filter(predicate).forEach(takenFeat => forgetResourcesWithPrefix('d' + takenFeat.u + '_'));
  extras.dons = extras.dons.filter(takenFeat => !predicate(takenFeat));
}

function afterCustomFeatEdited(feat, previousFeat) {
  if (!feat && previousFeat) forgetTakenFeat(takenFeat => takenFeat.id === previousFeat.id);
  if (feat && !previousFeat) extras.dons.push({ u: randomInstanceId(), id: feat.id, ch: {} });
  rebuildFeatIndex();
  clearRenderCache();
  recalculateSheet();
  autosave();
  if (!feat) showSheetMessage('Don supprimé');
  else showSheetMessage(previousFeat ? 'Don modifié' : 'Don « ' + feat.nom + ' » créé et ajouté à la fiche');
}

function editCustomFeat(feat) {
  if (!bookFeats) {
    alert('Les données de dons n’ont pas pu être chargées.');
    return;
  }
  Custom.edit({
    kind: 'dons',
    item: feat,
    cats: bookFeatCategories(),
    taken: name => featList.some(entry => normalizeText(entry.nom) === normalizeText(name)),
    done: afterCustomFeatEdited
  });
}

function handleCustomFeatEditClick(event) {
  const button = event.target.closest && event.target.closest('[data-donedit]');
  if (button) editCustomFeat(featList.find(feat => feat.id === button.dataset.donedit));
}

function addSelectedFeat() {
  const featId = $('#donSel').value;
  if (!featId || !featList) return;
  extras.dons.push({ u: randomInstanceId(), id: featId, ch: {} });
  recalculateSheet();
  autosave();
}

function handleFeatRemoveClick(event) {
  const instanceId = event.target.dataset && event.target.dataset.del;
  if (!instanceId) return;
  extras.dons = extras.dons.filter(takenFeat => takenFeat.u !== instanceId);
  forgetResourcesWithPrefix('d' + instanceId + '_');
  clearRenderCache();
  recalculateSheet();
  autosave();
}

function clearSheet() {
  const character = Persos.current();
  if (!confirm('Effacer toute la fiche de « ' + character.nom + ' » ? Pensez à enregistrer un .json avant.')) return;
  showCharacter(null, character);
  autosave();
  showSheetMessage('Fiche vidée');
}

function recalculateWhenRestoredFromCache(event) {
  if (event.persisted) recalculateSheet();
}

const SHEET_DATA_FILES = {
  classes: 'assets/json/vf/classes.json',
  species: 'assets/json/vf/especes.json',
  feats: 'assets/json/vf/dons.json',
  subclasses: 'assets/json/vf/sousclasses.json',
  classFeatures: 'assets/json/vf/capacites.json',
  backgrounds: 'assets/json/vf/historiques.json',
  equipment: 'assets/json/vf/equipement.json',
  magicItems: 'assets/json/vf/objets.json'
};

async function loadSheetData() {
  const names = Object.keys(SHEET_DATA_FILES);
  const results = await Promise.allSettled(names.map(name => fetchJson(SHEET_DATA_FILES[name])));
  return Object.fromEntries(names.map((name, index) => [name, results[index].status === 'fulfilled' ? results[index].value : null]));
}

function fillSelectWithNames(selector, placeholder, names) {
  $(selector).innerHTML = `<option value="">${placeholder}</option>` + plainOptionsHtml(names);
}

function storeSheetData(loaded) {
  if (loaded.equipment) equipmentData = loaded.equipment;
  if (loaded.magicItems) magicItemData = loaded.magicItems;
  if (loaded.backgrounds) {
    backgroundData = loaded.backgrounds;
    fillSelectWithNames('#bgsel', '—', Object.keys(backgroundData));
  }
  if (loaded.classes) classData = loaded.classes;
  else classDataFailed = true;
  if (loaded.species) speciesData = loaded.species;
  if (loaded.feats) featList = loaded.feats;
  if (loaded.subclasses) subclassData = loaded.subclasses;
  if (loaded.classFeatures) classFeaturesData = loaded.classFeatures;
  if (speciesData) fillSelectWithNames('#race', 'Choisir…', Object.keys(speciesData));
  if (featList) {
    bookFeats = featList;
    rebuildFeatIndex();
  }
}

async function startSheetPage() {
  storeSheetData(await loadSheetData());
  Persos.init({
    part: 'fiche',
    mount: $('#persos'),
    collect: collectSheet,
    apply: showCharacter,
    onName: name => { sheetField('nom').value = name; },
    msg: showSheetMessage
  });
  Persos.save();
}

document.addEventListener('change', handleCurseToggle);
document.addEventListener('input', handleCurseFilter);
document.addEventListener('input', handleLanguageToggle, true);
$('#clsel').addEventListener('change', handleClassSelection);
document.addEventListener('click', handleImportClick);
$('#bLong').onclick = takeLongRest;
$('#bShort').onclick = openShortRestDialog;
window.addEventListener('pageshow', recalculateWhenRestoredFromCache);
document.addEventListener('input', handleSheetEdit);
document.addEventListener('change', handleSheetEdit);
$('#bSave').onclick = saveSheetToFile;
$('#bLoad').onclick = () => $('#file').click();
$('#file').onchange = loadSheetFromFile;
addEventListener('beforeprint', shrinkTextareasToFit);
addEventListener('afterprint', restoreTextareaFontSize);
$('#bPrint').onclick = () => window.print();
$('#bDonNew').onclick = () => editCustomFeat(null);
document.addEventListener('click', handleCustomFeatEditClick);
$('#bDon').onclick = addSelectedFeat;
document.addEventListener('click', handleFeatRemoveClick);
$('#bReset').onclick = clearSheet;
startSheetPage();
