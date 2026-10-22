'use strict';
const MARTIAL_WEAPON_CLASSES = ['Barbare', 'Chasseur de sang', 'Guerrier', 'Paladin', 'Rôdeur'];
const ARMOR_TRAINING_BY_CLASS = {
  'Artificier': ['légères', 'intermédiaires', 'boucliers'], 'Barbare': ['légères', 'intermédiaires', 'boucliers'], 'Barde': ['légères'],
  'Chasseur de sang': ['légères', 'intermédiaires'], 'Clerc': ['légères', 'intermédiaires', 'boucliers'], 'Druide': ['légères', 'boucliers'],
  'Ensorceleur': [], 'Guerrier': ['légères', 'intermédiaires', 'lourdes', 'boucliers'], 'Magicien': [], 'Moine': [], 'Occultiste': ['légères'],
  'Paladin': ['légères', 'intermédiaires', 'lourdes', 'boucliers'], 'Rôdeur': ['légères', 'intermédiaires', 'boucliers'], 'Roublard': ['légères']
};
const EXTRA_ATTACK_CLASSES = ['Barbare', 'Chasseur de sang', 'Guerrier', 'Moine', 'Paladin', 'Rôdeur'];
const FIGHTING_STYLES = ['archerie', 'duel', 'deux_mains', 'defense'];
const ARMOR_TYPE_NAMES = { s: 'Sans armure', l: 'Armure légère', i: 'Armure intermédiaire', h: 'Armure lourde' };
const ARMOR_TRAINING_BY_TYPE = { l: 'légères', i: 'intermédiaires', h: 'lourdes' };
const UNLIMITED_DEXTERITY = 99;
const MAX_COMPARED = 4;
const ASCENDING_FIRST_COLUMNS = ['n', 'ma', 'dt', 'pr', 'on'];
const TAB_STORAGE_KEY = 'cmp_tab';
const TARGET_AC_STORAGE_KEY = 'cmp_ca';
const CHARACTERS_STORAGE_KEY = 'dnd_persos_v1';

const WEAPON_COLUMNS = [
  ['pick', '', null],
  ['n', 'Arme', row => searchKey(row.weapon.n)],
  ['dmg', 'Dégâts', row => row.weapon.diceCount * (row.weapon.dieSize + 1) / 2 + row.weapon.flatDamage, 'hm'],
  ['hit', 'Toucher', row => row.stats.hit, 'n'],
  ['ph', 'Par coup', row => row.stats.perHit, 'n'],
  ['exp', 'Par attaque', row => row.stats.expected, 'n'],
  ['rd', 'Par tour', row => row.stats.perRound, 'n'],
  ['ma', 'Maîtrise d’arme', row => row.weapon.mastery],
  ['pr', 'Propriétés', row => row.weapon.props.join(), 'hm'],
  ['rg', 'Portée', row => parseFloat(row.weapon.range) || (row.weapon.reach ? 3 : 1.5), 'hm'],
  ['kg', 'Poids', row => row.weapon.kg, 'n hm'],
  ['po', 'Prix', row => row.weapon.po, 'n hm']
];
const ARMOR_COLUMNS = [
  ['pick', '', null],
  ['n', 'Armure', row => searchKey(row.armor.n)],
  ['ca', 'CA obtenue', row => row.stats.ac, 'n'],
  ['dt', 'Calcul', row => row.armor.base],
  ['fo', 'Force', row => row.armor.strength, 'n'],
  ['di', 'Discrétion', row => row.armor.stealthDisadvantage ? 1 : 0],
  ['kg', 'Poids', row => row.armor.kg, 'n hm'],
  ['po', 'Prix', row => row.armor.po, 'n hm'],
  ['on', 'Enfiler / retirer', row => row.armor.type, 'hm']
];

let weapons = [];
let armors = [];
const character = {};
const weaponSort = { k: 'rd', dir: -1 };
const armorSort = { k: 'ca', dir: -1 };
const picked = { w: new Set(), a: new Set() };

const searchKey = text => withoutAccents(text).toLowerCase();
const signed = number => (number < 0 ? '−' : '+') + Math.abs(number);
const formatDecimal = number => (Math.round(number * 10) / 10).toLocaleString('fr-FR');
const abilityModifier = score => Math.floor(((parseInt(score) || 10) - 10) / 2);
const plural = count => count > 1 ? 's' : '';
const inputNumber = (selector, fallback) => {
  const value = parseInt($(selector).value);
  return isNaN(value) ? fallback : value;
};

function attacksPerAction(className, level) {
  if (className === 'Guerrier') return level >= 20 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1;
  return EXTRA_ATTACK_CLASSES.includes(className) && level >= 5 ? 2 : 1;
}

const splitProperties = text => text.split(/,\s*(?![^()]*\))/).map(property => property.trim()).filter(property => property && property !== 'aucune');

function masteryDescription(html) {
  const masteryPart = (html || '').split('<b>Maîtrise ')[1];
  if (!masteryPart) return '';
  return (masteryPart.split('</b> (')[1] || '').replace(/\)\s*Utilisable.*$/, '').replace(/<[^>]+>/g, '');
}

function parseWeapon(gear) {
  const match = /Dégâts\s*:\s*(?:(\d+)d(\d+)|(\d+))\s+([^.]+?)\.\s*Propriétés\s*:\s*([^.]*?)\.\s*Maîtrise\s*:\s*([^.<]+)/.exec(gear.h || '');
  if (!match) return null;
  const props = splitProperties(match[5]);
  const hasProperty = name => props.some(property => property.startsWith(name));
  const versatile = props.find(property => property.startsWith('Polyvalente'));
  const versatileDice = versatile && /(\d+)d(\d+)/.exec(versatile);
  const rangedProperty = props.find(property => /^(Lancer|Munitions)/.test(property));
  const rangeValue = rangedProperty && /\(([^)]+)\)/.exec(rangedProperty);
  const category = gear.c || '';
  return {
    n: gear.n, en: gear.en || '', martial: /guerre/.test(category), ranged: /distance/.test(category),
    diceCount: match[1] ? +match[1] : 0, dieSize: match[2] ? +match[2] : 0, flatDamage: match[3] ? +match[3] : 0, damageType: match[4].trim(),
    versatileDiceCount: versatileDice ? +versatileDice[1] : 0, versatileDieSize: versatileDice ? +versatileDice[2] : 0,
    props, mastery: match[6].trim(), masteryDescription: masteryDescription(gear.h),
    finesse: hasProperty('Finesse'), light: hasProperty('Légère'), twoHanded: hasProperty('À deux mains'), reach: hasProperty('Allonge'), thrown: hasProperty('Lancer'),
    range: rangeValue ? rangeValue[1] : '', kg: gear.kg || 0, po: gear.po || 0, price: gear.p || '', custom: gear.c_
  };
}

function armorTypeOf(category) {
  if (/lourde/.test(category)) return 'h';
  return /intermédiaire/.test(category) ? 'i' : 'l';
}

function parseArmor(gear) {
  const html = gear.h || '';
  const category = gear.c || '';
  if (/Bouclier/.test(category)) return null;
  const match = /Classe d’armure\s*:\s*(\d+)(\s*\+\s*mod\. de Dex(?:\s*\(max\.\s*\+(\d+)\))?)?/.exec(html);
  if (!match) return null;
  const strength = /Force\s+(\d+)/.exec(html);
  const donning = /Enfiler\s*:\s*([^;]+);\s*retirer\s*:\s*([^.]+)/.exec(html);
  return {
    n: gear.n, en: gear.en || '', type: armorTypeOf(category), base: +match[1], maxDexterity: match[2] ? (match[3] ? +match[3] : UNLIMITED_DEXTERITY) : 0,
    strength: strength ? +strength[1] : 0, stealthDisadvantage: /Désavantage aux tests de Discrétion/.test(html),
    donning: donning ? donning[1].trim() + ' / ' + donning[2].trim() : '', kg: gear.kg || 0, po: gear.po || 0, price: gear.p || '', custom: gear.c_
  };
}

function sheetClassName(sheetData, derived) {
  return derived.cl || (Object.keys(ARMOR_TRAINING_BY_CLASS).find(className => searchKey(sheetData.classe).startsWith(searchKey(className))) || '');
}

function ownedEquipmentNames() {
  const equipment = Persos.part('equipement');
  return (equipment && equipment.data && equipment.data.objets || []).map(entry => entry.n);
}

function activeCharacterName() {
  return (Persos.current && Persos.list().find(entry => entry.actif) || {}).nom || '';
}

function fillFromSheet() {
  const sheet = Persos.part('fiche');
  const sheetData = sheet && sheet.data || {};
  const derived = sheetData.derive || {};
  const totals = derived.tot || {};
  const abilityScore = key => totals[key] || parseInt(sheetData['ab_' + key]) || 10;
  const className = sheetClassName(sheetData, derived);
  const level = derived.niv || Math.min(20, Math.max(1, parseInt(sheetData.niveau) || 1));
  $('#cl').value = className;
  $('#niv').value = level;
  ['for', 'dex', 'con', 'sag'].forEach(key => { $('#a_' + key).value = abilityScore(key); });
  $('#natk').value = attacksPerAction(className, level);
  const featIds = (sheetData.extras && sheetData.extras.dons || []).map(feat => feat.id);
  FIGHTING_STYLES.forEach(style => { $('#o_' + style).checked = featIds.includes(style); });
  const owned = ownedEquipmentNames();
  character.own = new Set(owned);
  character.arProf = derived.ar && derived.ar.length ? derived.ar : null;
  const ownsShield = owned.some(name => /^Bouclier/.test(name));
  $('#o_bouc').checked = ownsShield && (!className || (character.arProf || ARMOR_TRAINING_BY_CLASS[className] || []).includes('boucliers'));
  const name = activeCharacterName();
  $('#srcTxt').textContent = sheet ? 'Valeurs reprises de la fiche' + (name ? ' de « ' + name + ' »' : '') + ' ; tu peux les modifier ici pour comparer (rien n’est enregistré).' : 'Aucune fiche remplie : saisis tes valeurs ou ouvre la fiche de personnage.';
}

function fillCharacterSelect() {
  $('#perso').innerHTML = Persos.list().map(entry => `<option value="${escapeHtml(entry.id)}"${entry.actif ? ' selected' : ''}>${escapeHtml(entry.nom || 'Sans nom')}</option>`).join('');
}

function readForm() {
  const className = $('#cl').value;
  const level = Math.min(20, Math.max(1, inputNumber('#niv', 1)));
  character.cl = className;
  character.niv = level;
  character.pb = Math.ceil(level / 4) + 1;
  character.mod = {};
  ['for', 'dex', 'con', 'sag'].forEach(key => { character.mod[key] = abilityModifier($('#a_' + key).value); });
  character.str = inputNumber('#a_for', 10);
  character.targetAc = inputNumber('#tca', 15);
  character.attacks = Math.max(1, inputNumber('#natk', 1));
  character.shield = $('#o_bouc').checked;
  FIGHTING_STYLES.forEach(style => { character[style] = $('#o_' + style).checked; });
  character.armorTraining = className ? (character.arProf && character.arProfCl === className ? character.arProf : ARMOR_TRAINING_BY_CLASS[className] || []) : null;
}

function isWeaponProficient(weapon) {
  if (!character.cl || !weapon.martial) return true;
  if (MARTIAL_WEAPON_CLASSES.includes(character.cl)) return true;
  if (character.cl === 'Moine') return weapon.light;
  if (character.cl === 'Roublard') return weapon.light || weapon.finesse;
  return false;
}

const averageDie = (faces, greatWeaponFighting) => greatWeaponFighting ? (faces * (faces + 1) / 2 + 3) / faces : (faces + 1) / 2;

function attackAbility(weapon) {
  const { for: strength, dex: dexterity } = character.mod;
  if (weapon.ranged) return { value: dexterity, label: 'Dex' };
  if (weapon.finesse) return { value: Math.max(strength, dexterity), label: dexterity > strength ? 'Dex' : 'For' };
  return { value: strength, label: 'For' };
}

function possibleGrips(weapon) {
  const grips = [];
  if (!weapon.twoHanded) grips.push({ hands: 1, diceCount: weapon.diceCount, dieSize: weapon.dieSize });
  if ((weapon.twoHanded && !character.shield) || (weapon.versatileDiceCount && !character.shield)) grips.push({ hands: 2, diceCount: weapon.versatileDiceCount || weapon.diceCount, dieSize: weapon.versatileDieSize || weapon.dieSize });
  return grips;
}

function gripDamage(weapon, grip, ability, hitChance) {
  const greatWeaponFighting = character.deux_mains && grip.hands === 2 && !weapon.ranged;
  const dice = grip.diceCount * averageDie(grip.dieSize, greatWeaponFighting);
  const flat = weapon.flatDamage + ability + (character.duel && grip.hands === 1 && !weapon.ranged ? 2 : 0);
  const perHit = Math.max(1, dice + flat);
  return { ...grip, dice, flat, perHit, expected: hitChance * perHit + 0.05 * dice, greatWeaponFighting };
}

function weaponStats(weapon) {
  const ability = attackAbility(weapon);
  const proficient = isWeaponProficient(weapon);
  const hit = ability.value + (proficient ? character.pb : 0) + (weapon.ranged && character.archerie ? 2 : 0);
  const grips = possibleGrips(weapon);
  const impossibleWithShield = !grips.length;
  if (impossibleWithShield) grips.push({ hands: 2, diceCount: weapon.diceCount, dieSize: weapon.dieSize });
  const hitChance = Math.min(0.95, Math.max(0.05, (21 + hit - character.targetAc) / 20));
  let best = null;
  for (const grip of grips) {
    const damage = gripDamage(weapon, grip, ability.value, hitChance);
    if (!best || damage.expected > best.expected) best = damage;
  }
  return { ability: ability.value, abilityLabel: ability.label, proficient, hit, hitChance, impossibleWithShield, ...best, perRound: best.expected * character.attacks };
}

const damageText = weapon => (weapon.diceCount ? weapon.diceCount + 'd' + weapon.dieSize : weapon.flatDamage) + (weapon.versatileDiceCount ? ' (' + weapon.versatileDiceCount + 'd' + weapon.versatileDieSize + ')' : '');
const rangeText = weapon => weapon.ranged ? weapon.range : (weapon.reach ? '3 m' : '1,5 m') + (weapon.thrown ? ' ; lancer ' + weapon.range : '');
const isUsable = row => row.stats.proficient && !row.stats.impossibleWithShield;

function weaponMatchesFilters(row, filters) {
  const { weapon, stats } = row;
  return (!filters.category || (filters.category === 'g') === weapon.martial)
    && (!filters.range || (filters.range === 'd') === weapon.ranged)
    && (!filters.proficientOnly || stats.proficient)
    && (!filters.ownedOnly || character.own.has(weapon.n))
    && (!filters.searched || searchKey(weapon.n + ' ' + weapon.en + ' ' + weapon.props.join(' ') + ' ' + weapon.mastery + ' ' + weapon.damageType).includes(filters.searched));
}

function weaponFilters() {
  return { searched: searchKey($('#wq').value), category: $('#wcat').value, range: $('#wrng').value, proficientOnly: $('#wprof').checked, ownedOnly: $('#wown').checked };
}

function weaponTagsHtml(weapon, stats) {
  const tags = [];
  if (character.own.has(weapon.n)) tags.push('<span class="tag in">Dans l’équipement</span>');
  if (!stats.proficient) tags.push('<span class="tag no">Non maîtrisée</span>');
  if (stats.impossibleWithShield) tags.push('<span class="tag wa">Impossible avec un bouclier</span>');
  if (weapon.custom) tags.push('<span class="tag in">Création</span>');
  return tags.join('');
}

function hitExplanation(weapon, stats) {
  return [stats.abilityLabel + ' ' + signed(stats.ability), stats.proficient ? 'maîtrise ' + signed(character.pb) : '', weapon.ranged && character.archerie ? 'Archerie +2' : ''].filter(Boolean).join(', ');
}

function damageExplanation(weapon, stats) {
  const flatPart = stats.flat < 0 ? '− ' + (-stats.flat) : '+ ' + stats.flat;
  const duelNote = character.duel && stats.hands === 1 && !weapon.ranged ? ' (dont Duel +2)' : '';
  return formatDecimal(stats.dice) + ' (dés' + (stats.greatWeaponFighting ? ', style Arme à deux mains' : '') + ') ' + flatPart + duelNote;
}

function weaponRowHtml({ weapon, stats }, bestPerRound) {
  const grip = weapon.versatileDiceCount ? (stats.hands === 2 ? 'à deux mains' : 'à une main') : '';
  const isBest = bestPerRound != null && !stats.impossibleWithShield && stats.proficient && Math.abs(stats.perRound - bestPerRound) < 1e-9;
  const rowClass = [!stats.proficient || stats.impossibleWithShield ? 'off' : '', isBest ? 'best' : ''].join(' ');
  return `<tr class="${rowClass}"><td class="pick"><input type="checkbox" data-pk="w" value="${escapeHtml(weapon.n)}" aria-label="Comparer ${escapeHtml(weapon.n)}"${picked.w.has(weapon.n) ? ' checked' : ''}></td>
<td><span class="nm">${escapeHtml(weapon.n)}</span><div class="sub">${weapon.martial ? 'Guerre' : 'Courante'} · ${weapon.ranged ? 'distance' : 'corps à corps'}${grip ? ' · ' + grip : ''}</div>${weaponTagsHtml(weapon, stats)}</td>
<td class="hm">${escapeHtml(damageText(weapon))}<div class="sub">${escapeHtml(weapon.damageType)}</div></td>
<td class="n" title="${escapeHtml(hitExplanation(weapon, stats))}">${signed(stats.hit)}<div class="sub">${Math.round(stats.hitChance * 100)} %</div></td>
<td class="n" title="${escapeHtml(damageExplanation(weapon, stats))}">${formatDecimal(stats.perHit)}</td>
<td class="n">${formatDecimal(stats.expected)}</td>
<td class="n big">${formatDecimal(stats.perRound)}</td>
<td><span class="ms" title="${escapeHtml(weapon.masteryDescription)}">${escapeHtml(weapon.mastery)}</span></td>
<td class="hm">${escapeHtml(weapon.props.join(', ') || '—')}</td>
<td class="hm">${escapeHtml(rangeText(weapon))}</td>
<td class="n hm">${formatDecimal(weapon.kg)} kg</td>
<td class="n hm">${escapeHtml(weapon.price)}</td></tr>`;
}

const WEAPON_COMPARISON_ROWS = [
  ['Dégâts', row => damageText(row.weapon) + ' ' + row.weapon.damageType, null],
  ['Toucher', row => signed(row.stats.hit) + ' (' + Math.round(row.stats.hitChance * 100) + ' %)', row => row.stats.hit],
  ['Par coup', row => formatDecimal(row.stats.perHit), row => row.stats.perHit],
  ['Par attaque', row => formatDecimal(row.stats.expected), row => row.stats.expected],
  ['Par tour', row => formatDecimal(row.stats.perRound), row => row.stats.perRound],
  ['Maîtrise d’arme', row => row.weapon.mastery, null],
  ['Portée', row => rangeText(row.weapon), null],
  ['Poids', row => formatDecimal(row.weapon.kg) + ' kg', row => -row.weapon.kg],
  ['Prix', row => row.weapon.price, row => -row.weapon.po]
];

const weaponWarning = row => [!row.stats.proficient ? 'non maîtrisée' : '', row.stats.impossibleWithShield ? 'impossible avec un bouclier' : ''].filter(Boolean).join(', ');

function renderWeapons() {
  const allRows = weapons.map(weapon => ({ weapon, stats: weaponStats(weapon) }));
  const filters = weaponFilters();
  const rows = allRows.filter(row => weaponMatchesFilters(row, filters));
  sortRows(rows, WEAPON_COLUMNS, weaponSort);
  const usable = rows.filter(isUsable);
  const bestPerRound = usable.length ? Math.max(...usable.map(row => row.stats.perRound)) : null;
  $('#wcnt').textContent = rows.length + ' arme' + plural(rows.length) + ' · cible CA ' + character.targetAc + ' · ' + character.attacks + ' attaque' + plural(character.attacks) + ' par action · bonus de maîtrise ' + signed(character.pb);
  $('#wt').innerHTML = tableHeadHtml(WEAPON_COLUMNS, weaponSort) + '<tbody>' + rows.map(row => weaponRowHtml(row, bestPerRound)).join('') + '</tbody>';
  renderComparison('w', allRows.filter(row => picked.w.has(row.weapon.n)), WEAPON_COMPARISON_ROWS, row => row.weapon.n, weaponWarning);
}

function armorOptions() {
  const options = [{ n: 'Sans armure', type: 's', base: 10, maxDexterity: UNLIMITED_DEXTERITY, kg: 0, po: 0, price: '—', donning: '', strength: 0, stealthDisadvantage: false }];
  if (character.cl === 'Barbare') options.push({ n: 'Défense sans armure (Barbare)', type: 's', base: 10, maxDexterity: UNLIMITED_DEXTERITY, bonusAbility: ['con', 'Con'], kg: 0, po: 0, price: '—', donning: '', strength: 0, stealthDisadvantage: false });
  if (character.cl === 'Moine') options.push({ n: 'Défense sans armure (Moine)', type: 's', base: 10, maxDexterity: UNLIMITED_DEXTERITY, bonusAbility: ['sag', 'Sag'], kg: 0, po: 0, price: '—', donning: '', strength: 0, stealthDisadvantage: false, noShield: true });
  options.push({ n: 'Armure du mage (sort)', type: 's', base: 13, maxDexterity: UNLIMITED_DEXTERITY, kg: 0, po: 0, price: '—', donning: '', strength: 0, stealthDisadvantage: false, spell: true });
  return options.concat(armors);
}

function armorStats(armor) {
  const dexterityBonus = Math.min(armor.maxDexterity, character.mod.dex);
  const proficient = armor.type === 's' || !character.armorTraining || character.armorTraining.includes(ARMOR_TRAINING_BY_TYPE[armor.type]);
  const shieldProficient = !character.armorTraining || character.armorTraining.includes('boucliers');
  const shieldBonus = character.shield && !armor.noShield ? 2 : 0;
  const defenseBonus = character.defense && armor.type !== 's' ? 1 : 0;
  const abilityBonus = armor.bonusAbility ? character.mod[armor.bonusAbility[0]] : 0;
  const parts = [String(armor.base)];
  if (armor.maxDexterity) parts.push('Dex ' + signed(dexterityBonus) + (armor.maxDexterity < UNLIMITED_DEXTERITY && character.mod.dex > armor.maxDexterity ? ' (max.)' : ''));
  if (armor.bonusAbility) parts.push(armor.bonusAbility[1] + ' ' + signed(abilityBonus));
  if (shieldBonus) parts.push('bouclier +2');
  if (defenseBonus) parts.push('Défense +1');
  return { ac: armor.base + dexterityBonus + abilityBonus + shieldBonus + defenseBonus, parts, proficient, shieldProficient, slowed: armor.strength && character.str < armor.strength };
}

function armorFilters() {
  return { searched: searchKey($('#aq').value), category: $('#acat').value, proficientOnly: $('#aprof').checked, noStealthPenalty: $('#adisc').checked };
}

function armorMatchesFilters({ armor, stats }, filters) {
  return (!filters.category || armor.type === filters.category)
    && (!filters.proficientOnly || stats.proficient)
    && (!filters.noStealthPenalty || !armor.stealthDisadvantage)
    && (!filters.searched || searchKey(armor.n + ' ' + armor.en).includes(filters.searched));
}

function armorTagsHtml(armor, stats) {
  const tags = [];
  if (character.own.has(armor.n)) tags.push('<span class="tag in">Dans l’équipement</span>');
  if (!stats.proficient) tags.push('<span class="tag no">Non maîtrisée</span>');
  if (stats.slowed) tags.push('<span class="tag wa">Vitesse −3 m</span>');
  if (armor.spell) tags.push('<span class="tag in">Sort, 8 h, sans armure</span>');
  if (armor.noShield && character.shield) tags.push('<span class="tag wa">Sans bouclier</span>');
  if (armor.custom) tags.push('<span class="tag in">Création</span>');
  return tags.join('');
}

const isWearableBest = row => row.stats.proficient && !row.armor.spell && !row.stats.slowed;

function strengthCellHtml(armor, stats) {
  if (!armor.strength) return '—';
  return stats.slowed ? '<b style="color:#a8321f">' + armor.strength + '</b>' : armor.strength;
}

function armorRowHtml(row, bestAc) {
  const { armor, stats } = row;
  const rowClass = [!stats.proficient ? 'off' : '', bestAc != null && isWearableBest(row) && stats.ac === bestAc ? 'best' : ''].join(' ');
  return `<tr class="${rowClass}"><td class="pick"><input type="checkbox" data-pk="a" value="${escapeHtml(armor.n)}" aria-label="Comparer ${escapeHtml(armor.n)}"${picked.a.has(armor.n) ? ' checked' : ''}></td>
<td><span class="nm">${escapeHtml(armor.n)}</span><div class="sub">${escapeHtml(ARMOR_TYPE_NAMES[armor.type])}</div>${armorTagsHtml(armor, stats)}</td>
<td class="n big">${stats.ac}</td>
<td>${escapeHtml(stats.parts.join(' + '))}</td>
<td class="n">${strengthCellHtml(armor, stats)}</td>
<td>${armor.stealthDisadvantage ? '<span class="tag wa">Désavantage</span>' : '—'}</td>
<td class="n hm">${armor.kg ? formatDecimal(armor.kg) + ' kg' : '—'}</td>
<td class="n hm">${escapeHtml(armor.price)}</td>
<td class="hm">${escapeHtml(armor.donning || '—')}</td></tr>`;
}

const ARMOR_COMPARISON_ROWS = [
  ['CA obtenue', row => String(row.stats.ac), row => row.stats.ac],
  ['Type', row => ARMOR_TYPE_NAMES[row.armor.type], null],
  ['Force requise', row => row.armor.strength ? String(row.armor.strength) : '—', null],
  ['Discrétion', row => row.armor.stealthDisadvantage ? 'désavantage' : 'normale', row => row.armor.stealthDisadvantage ? 0 : 1],
  ['Poids', row => row.armor.kg ? formatDecimal(row.armor.kg) + ' kg' : '—', row => -row.armor.kg],
  ['Prix', row => row.armor.price, row => -row.armor.po],
  ['Enfiler / retirer', row => row.armor.donning || '—', null]
];

const armorWarning = row => [!row.stats.proficient ? 'non maîtrisée' : '', row.stats.slowed ? 'Vitesse −3 m' : ''].filter(Boolean).join(', ');

function armorCountText(count, allRows) {
  const shieldNote = character.shield ? ' · avec bouclier' : '';
  const untrainedShield = character.shield && !allRows[0].stats.shieldProficient ? ' (non maîtrisé)' : '';
  return count + ' option' + plural(count) + ' · Dextérité ' + signed(character.mod.dex) + shieldNote + untrainedShield;
}

function renderArmors() {
  const allRows = armorOptions().map(armor => ({ armor, stats: armorStats(armor) }));
  const filters = armorFilters();
  const rows = allRows.filter(row => armorMatchesFilters(row, filters));
  sortRows(rows, ARMOR_COLUMNS, armorSort);
  const wearable = allRows.filter(isWearableBest);
  const bestAc = wearable.length ? Math.max(...wearable.map(row => row.stats.ac)) : null;
  $('#acnt').textContent = armorCountText(rows.length, allRows);
  $('#at').innerHTML = tableHeadHtml(ARMOR_COLUMNS, armorSort) + '<tbody>' + rows.map(row => armorRowHtml(row, bestAc)).join('') + '</tbody>';
  renderComparison('a', allRows.filter(row => picked.a.has(row.armor.n)), ARMOR_COMPARISON_ROWS, row => row.armor.n, armorWarning);
}

function tableHeadHtml(columns, sort) {
  return '<thead><tr>' + columns.map(([key, label, sortValue, cssClass]) => `<th${cssClass ? ` class="${cssClass}"` : ''}${sortValue ? ` data-s="${key}" tabindex="0"` : ''}${sort.k === key ? ` aria-sort="${sort.dir < 0 ? 'descending' : 'ascending'}"` : ''}>${escapeHtml(label)}</th>`).join('') + '</tr></thead>';
}

const unusableLast = row => !row.stats.proficient || row.stats.impossibleWithShield ? 1 : 0;

function sortRows(rows, columns, sort) {
  const sortValue = (columns.find(column => column[0] === sort.k) || [])[2];
  if (!sortValue) return;
  rows.sort((first, second) => {
    const firstValue = sortValue(first);
    const secondValue = sortValue(second);
    const comparison = typeof firstValue === 'string' ? firstValue.localeCompare(secondValue, 'fr') : firstValue - secondValue;
    return unusableLast(first) - unusableLast(second) || comparison * sort.dir;
  });
}

function isBestOf(rows, row, value) {
  return value && rows.length > 1 && rows.every(other => value(other) <= value(row)) && rows.some(other => value(other) < value(row));
}

function comparisonCardHtml(row, rows, comparisonRows, nameOf, warningOf) {
  const warning = warningOf(row);
  const details = comparisonRows.map(([label, text, value]) => `<dt>${escapeHtml(label)}</dt><dd${isBestOf(rows, row, value) ? ' class="top"' : ''}>${escapeHtml(text(row))}</dd>`).join('');
  return `<div class="cc"><b class="t">${escapeHtml(nameOf(row))}</b>${warning ? `<span class="tag no">${escapeHtml(warning)}</span>` : ''}<dl>${details}</dl></div>`;
}

function renderComparison(kind, rows, comparisonRows, nameOf, warningOf) {
  const box = $('#' + kind + 'cmp');
  if (!rows.length) {
    box.innerHTML = '';
    return;
  }
  const pickOrder = [...picked[kind]];
  rows.sort((first, second) => pickOrder.indexOf(nameOf(first)) - pickOrder.indexOf(nameOf(second)));
  box.innerHTML = `<div class="cmpbox"><h3><span>Comparaison (${rows.length})</span><button type="button" class="b" data-clr="${kind}">Tout décocher</button></h3><div class="cgrid">`
    + rows.map(row => comparisonCardHtml(row, rows, comparisonRows, nameOf, warningOf)).join('') + '</div></div>';
}

function renderPage() {
  readForm();
  renderWeapons();
  renderArmors();
}

function sortByColumn(header) {
  const sort = header.closest('#wt') ? weaponSort : armorSort;
  const key = header.dataset.s;
  sort.dir = sort.k === key ? -sort.dir : (ASCENDING_FIRST_COLUMNS.includes(key) ? 1 : -1);
  sort.k = key;
  renderPage();
}

function handlePageClick(event) {
  const header = event.target.closest('th[data-s]');
  if (header) return sortByColumn(header);
  const clearButton = event.target.closest('[data-clr]');
  if (clearButton) {
    picked[clearButton.dataset.clr].clear();
    renderPage();
  }
}

function togglePicked(checkbox) {
  const pickedSet = picked[checkbox.dataset.pk];
  if (checkbox.checked) {
    pickedSet.add(checkbox.value);
    if (pickedSet.size > MAX_COMPARED) pickedSet.delete(pickedSet.values().next().value);
  } else pickedSet.delete(checkbox.value);
  renderPage();
}

const resetAttackCount = () => { $('#natk').value = attacksPerAction($('#cl').value, inputNumber('#niv', 1)); };

function rememberTargetAc() {
  try { localStorage.setItem(TARGET_AC_STORAGE_KEY, $('#tca').value); } catch (error) {}
}

function handleFormChange(event) {
  const checkbox = event.target.closest('[data-pk]');
  if (checkbox) return togglePicked(checkbox);
  const id = event.target.id;
  if (id === 'cl') {
    character.arProfCl = null;
    resetAttackCount();
  }
  if (id === 'niv') resetAttackCount();
  if (id === 'tca') rememberTargetAc();
  if (event.target.closest('.panel,.view')) renderPage();
}

function showTab(selectedKind) {
  ['w', 'a'].forEach(kind => {
    $('#t_' + kind).setAttribute('aria-selected', kind === selectedKind);
    $('#v_' + kind).hidden = kind !== selectedKind;
  });
  try { localStorage.setItem(TAB_STORAGE_KEY, selectedKind); } catch (error) {}
}

function reloadFromSheet() {
  fillFromSheet();
  character.arProfCl = $('#cl').value;
}

function restoreSavedPreferences() {
  try { if (localStorage.getItem(TAB_STORAGE_KEY) === 'a') $('#t_a').click(); } catch (error) {}
  let targetAc = '15';
  try { targetAc = localStorage.getItem(TARGET_AC_STORAGE_KEY) || targetAc; } catch (error) {}
  $('#tca').value = targetAc;
}

async function loadEquipment() {
  let bookEquipment = [];
  try {
    bookEquipment = await fetchJson('assets/json/vf/equipement.json');
  } catch (error) {
    $('#wcnt').textContent = 'Impossible de charger equipement.json (ouvre le site par un serveur web).';
  }
  let customEquipment = [];
  try { customEquipment = Persos.custom().equipement || []; } catch (error) {}
  const equipment = bookEquipment.concat(customEquipment.filter(gear => gear && gear.n));
  weapons = equipment.filter(gear => gear.t === 'Arme').map(parseWeapon).filter(Boolean);
  armors = equipment.filter(gear => gear.t === 'Armure').map(parseArmor).filter(Boolean);
}

async function startPage() {
  restoreSavedPreferences();
  fillCharacterSelect();
  reloadFromSheet();
  await loadEquipment();
  renderPage();
}

function followOtherTabChanges(event) {
  if (event.key !== CHARACTERS_STORAGE_KEY) return;
  fillCharacterSelect();
  reloadFromSheet();
  renderPage();
}

Object.keys(ARMOR_TRAINING_BY_CLASS).forEach(className => $('#cl').insertAdjacentHTML('beforeend', `<option>${escapeHtml(className)}</option>`));
$('#perso').addEventListener('change', event => {
  Persos.activate(event.target.value);
  fillFromSheet();
  renderPage();
});
$('#reload').addEventListener('click', () => {
  fillFromSheet();
  renderPage();
});
document.addEventListener('click', handlePageClick);
document.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('th[data-s]')) event.target.click(); });
document.addEventListener('change', handleFormChange);
document.addEventListener('input', event => { if (event.target.matches('#wq,#aq')) renderPage(); });
['w', 'a'].forEach(kind => $('#t_' + kind).addEventListener('click', () => showTab(kind)));
startPage();
addEventListener('storage', followOtherTabChanges);
