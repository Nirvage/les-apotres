const RARITY_NAMES = ['Courant', 'Peu courant', 'Rare', 'Très rare', 'Légendaire'];
const RARITY_PRICES = [100, 400, 4000, 40000, 200000];
const SCROLL_RARITY_BY_SPELL_LEVEL = [0, 0, 1, 1, 2, 2, 3, 3, 3, 4];
const LOW_LEVEL_SCROLL_PRICES = [30, 50];
const CHALLENGE_RATINGS = ['0', '1/8', '1/4', '1/2', ...Array.from({ length: 30 }, (_, index) => String(index + 1))];
const MAX_SAVED_LOOTS = 20;
const MAX_INDIVIDUAL_CREATURES = 50;
const MAX_VALUABLES_PER_LOT = 12;
const COIN_NAMES = [['pp', 'platine'], ['po', 'or'], ['pa', 'argent'], ['pc', 'cuivre']];

const TREASURE_TIERS = [
  { maxChallenge: 4, label: 'FP 0 à 4', individualCoins: [3, 6, 1, 'po'], hoardGold: [2, 4, 100], magicItemCount: [1, 4, -1], rarityChances: [54, 37, 9, 0, 0], gemValues: [10, 50], artValues: [25] },
  { maxChallenge: 10, label: 'FP 5 à 10', individualCoins: [2, 8, 10, 'po'], hoardGold: [8, 10, 100], magicItemCount: [1, 3, 0], rarityChances: [30, 51, 17, 2, 0], gemValues: [50, 100, 500], artValues: [25, 250] },
  { maxChallenge: 16, label: 'FP 11 à 16', individualCoins: [2, 10, 10, 'pp'], hoardGold: [8, 8, 1000], magicItemCount: [1, 4, 0], rarityChances: [11, 23, 36, 23, 7], gemValues: [500, 1000], artValues: [250, 750] },
  { maxChallenge: 99, label: 'FP 17 et plus', individualCoins: [2, 8, 100, 'pp'], hoardGold: [6, 10, 10000], magicItemCount: [1, 6, 0], rarityChances: [0, 6, 30, 40, 24], gemValues: [1000, 5000], artValues: [2500, 7500] }
];

const GEMS_BY_VALUE = {
  10: ['Agate rubanée', 'Azurite', 'Hématite', 'Lapis-lazuli', 'Malachite', 'Obsidienne', 'Quartz bleu', 'Rhodochrosite', 'Œil-de-tigre', 'Turquoise'],
  50: ['Calcédoine', 'Chrysoprase', 'Cornaline', 'Citrine', 'Jaspe', 'Pierre de lune', 'Onyx', 'Quartz étoilé', 'Sardonyx', 'Zircon'],
  100: ['Ambre', 'Améthyste', 'Chrysobéryl', 'Corail', 'Grenat', 'Jade', 'Jais', 'Perle', 'Spinelle', 'Tourmaline'],
  500: ['Alexandrite', 'Aigue-marine', 'Perle noire', 'Spinelle bleu', 'Péridot', 'Topaze'],
  1000: ['Opale noire', 'Saphir bleu', 'Émeraude', 'Opale de feu', 'Opale', 'Rubis étoilé', 'Saphir étoilé', 'Saphir jaune'],
  5000: ['Saphir noir', 'Diamant', 'Jacinthe', 'Rubis']
};
const ART_OBJECTS_BY_VALUE = {
  25: ['Aiguière en argent', 'Statuette en os sculpté', 'Petit bracelet en or', 'Vêtements de cérémonie brodés de fil d’or', 'Masque de velours noir cousu de fil d’argent', 'Calice en cuivre filigrané d’argent', 'Paire de dés en os gravés', 'Petit miroir dans un cadre en bois peint', 'Mouchoir de soie brodé', 'Médaillon en or contenant un portrait'],
  250: ['Anneau en or serti de pierres de sang', 'Statuette en ivoire sculpté', 'Grand bracelet en or', 'Collier en argent avec pendentif en pierre précieuse', 'Couronne en bronze', 'Robe de soie brodée de fil d’or', 'Grande tapisserie de belle facture', 'Chope en laiton incrustée de jade', 'Boîte de figurines animales en turquoise', 'Cage à oiseaux en or filigrané d’électrum'],
  750: ['Calice en argent serti de pierres de lune', 'Épée longue plaquée d’argent, jais sur la poignée', 'Harpe en bois exotique incrustée d’ivoire et de zircons', 'Petite idole en or', 'Peigne en or en forme de dragon aux yeux de grenat', 'Bouchon de bouteille ciselé d’or et serti d’améthystes', 'Dague de cérémonie en électrum, perle noire au pommeau', 'Broche en argent et or', 'Statuette en obsidienne avec ornements en or', 'Masque de guerre en or peint'],
  2500: ['Fine chaîne en or sertie d’une opale de feu', 'Peinture de maître ancienne', 'Manteau de soie et de velours brodé de pierres de lune', 'Bracelet en platine serti d’un saphir', 'Gant brodé serti d’éclats de joyaux', 'Bracelet de cheville incrusté de joyaux', 'Boîte à musique en or', 'Diadème en or serti de quatre aigues-marines', 'Cache-œil avec un faux œil en saphir et pierre de lune', 'Collier de petites perles roses'],
  7500: ['Couronne en or incrustée de joyaux', 'Anneau en platine incrusté de joyaux', 'Petite statuette en or sertie de rubis', 'Coupe en or sertie d’émeraudes', 'Coffret à bijoux en or filigrané de platine', 'Sarcophage d’enfant en or peint', 'Plateau de jeu en jade avec des pièces en or massif', 'Corne à boire en ivoire incrustée d’or et de joyaux']
};

const ITEM_THEMES = [
  { id: '', name: 'Tous les types' },
  { id: 'arm', name: 'Armes, armures, munitions', matchesType: type => /^(Arme|Armure|Munition)$/.test(type) },
  { id: 'conso', name: 'Potions et parchemins', matchesType: type => /^(Potion|Parchemin)/.test(type) },
  { id: 'arc', name: 'Anneaux, baguettes, bâtons, sceptres', matchesType: type => /^(Anneau|Baguette|Bâton|Sceptre)$/.test(type) },
  { id: 'merv', name: 'Objets merveilleux', matchesType: type => type === 'Objet merveilleux' }
];

let magicItems = [];
let spells = [];
let magicItemPool = null;
let loots = { liste: [], cur: null };

const formatNumber = number => number.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const plural = count => count > 1 ? 's' : '';
const challengeValue = rating => rating.includes('/') ? 1 / +rating.split('/')[1] : +rating;
const treasureTier = challenge => TREASURE_TIERS.find(tier => challenge <= tier.maxChallenge);
const currentLoot = () => loots.liste.find(loot => loot.id === loots.cur);

function randomFraction(scale) {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return randomValues[0] / 4294967296 * scale;
}

const randomIntegerBetween = (minimum, maximum) => minimum + Math.floor(randomFraction(maximum - minimum + 1));
const randomElement = list => list[Math.floor(randomFraction(list.length))];

function rollDice(count, faces) {
  let total = 0;
  for (let roll = 0; roll < count; roll++) total += randomIntegerBetween(1, faces);
  return total;
}

function rarityIndex(rarityText) {
  const rarity = String(rarityText || '').toLowerCase().replace(/^variable \(/, '');
  if (rarity.startsWith('peu courant')) return 1;
  if (rarity.startsWith('très rare')) return 3;
  if (rarity.startsWith('courant')) return 0;
  if (rarity.startsWith('rare')) return 2;
  if (rarity.startsWith('légendaire')) return 4;
  return null;
}

const isConsumable = item => /^(Potion|Parchemin|Munition)$/.test(item.t) || /consomm/i.test(item.h || '');
const spellLevelLabel = level => level ? 'niveau ' + level : 'tour de magie';

function buildMagicItemPool() {
  const pool = [[], [], [], [], []];
  magicItems.forEach(item => {
    const rarity = rarityIndex(item.q);
    if (rarity != null && !/maudit/i.test(item.n)) pool[rarity].push({ n: item.n, t: item.t, r: rarity, po: RARITY_PRICES[rarity] / (isConsumable(item) ? 2 : 1), k: 'o' });
  });
  spells.forEach(spell => {
    const rarity = SCROLL_RARITY_BY_SPELL_LEVEL[spell.l];
    const price = spell.l < 2 ? LOW_LEVEL_SCROLL_PRICES[spell.l] : RARITY_PRICES[rarity] / 2;
    pool[rarity].push({ n: 'Parchemin de sort : ' + spell.n.split('|')[0], t: 'Parchemin (' + spellLevelLabel(spell.l) + ')', r: rarity, po: price, k: 's', ref: spell.n });
  });
  return pool;
}

function itemPoolByRarity() {
  if (!magicItemPool) magicItemPool = buildMagicItemPool();
  return magicItemPool;
}

function randomRarity(tier) {
  let roll = randomFraction(100);
  for (let rarity = 0; rarity < 5; rarity++) {
    roll -= tier.rarityChances[rarity];
    if (roll < 0) return rarity;
  }
  return 4;
}

function randomMagicItem(rarity, themeId) {
  const itemsOfRarity = itemPoolByRarity()[rarity];
  const matchesType = (ITEM_THEMES.find(theme => theme.id === themeId) || {}).matchesType;
  const themedItems = matchesType ? itemsOfRarity.filter(item => matchesType(item.t)) : itemsOfRarity;
  return { ...randomElement(themedItems.length ? themedItems : itemsOfRarity) };
}

function randomValuables(totalValue, possibleValues, namesByValue) {
  const affordableValues = possibleValues.filter(value => value <= totalValue);
  if (!affordableValues.length) return [];
  const unitValue = randomElement(affordableValues);
  const count = Math.max(1, Math.min(MAX_VALUABLES_PER_LOT, Math.round(totalValue / unitValue)));
  const quantityByName = {};
  for (let index = 0; index < count; index++) {
    const name = randomElement(namesByValue[unitValue]);
    quantityByName[name] = (quantityByName[name] || 0) + 1;
  }
  return Object.entries(quantityByName).map(([name, quantity]) => ({ n: name, q: quantity, po: unitValue }));
}

function splitIntoCoins(goldValue, mainCoin) {
  const coins = { pc: 0, pa: 0, po: 0, pp: 0 };
  let remainingGold = goldValue;
  if (mainCoin === 'pp') coins.pp = Math.floor(remainingGold * 0.8 / 10);
  else if (remainingGold >= 2000) coins.pp = Math.floor(remainingGold * 0.25 / 10);
  remainingGold -= coins.pp * 10;
  coins.pa = Math.min(Math.floor(remainingGold * 10 * 0.1), randomIntegerBetween(20, 300));
  coins.pc = remainingGold < 200 ? randomIntegerBetween(0, 99) : 0;
  coins.po = Math.max(0, Math.round(remainingGold - coins.pa / 10 - coins.pc / 100));
  return coins;
}

const coinsValue = coins => coins.pc / 100 + coins.pa / 10 + coins.po + coins.pp * 10;
const valuablesValue = valuables => valuables.reduce((total, valuable) => total + valuable.q * valuable.po, 0);
const lootValue = loot => coinsValue(loot.pieces) + valuablesValue(loot.gemmes) + valuablesValue(loot.arts) + loot.objets.reduce((total, item) => total + item.po, 0);

function fillIndividualTreasure(loot, tier, challengeRating) {
  const creatureCount = Math.max(1, Math.min(MAX_INDIVIDUAL_CREATURES, +$('#nb').value || 1));
  const [diceCount, faces, multiplier, coin] = tier.individualCoins;
  for (let creature = 0; creature < creatureCount; creature++) loot.pieces[coin] += rollDice(diceCount, faces) * multiplier;
  loot.nom = 'Trésor de ' + creatureCount + ' créature' + plural(creatureCount) + ' (FP ' + challengeRating + ')';
}

function fillHoard(loot, tier, challengeRating, themeId) {
  const [diceCount, faces, multiplier] = tier.hoardGold;
  const totalGold = rollDice(diceCount, faces) * multiplier;
  const coinGold = totalGold * (0.5 + randomFraction(0.25));
  loot.pieces = splitIntoCoins(Math.round(coinGold), tier.individualCoins[3]);
  const valuablesGold = totalGold - coinGold;
  const gemGold = valuablesGold * (0.4 + randomFraction(0.3));
  loot.gemmes = randomValuables(gemGold, tier.gemValues, GEMS_BY_VALUE);
  loot.arts = randomValuables(valuablesGold - gemGold, tier.artValues, ART_OBJECTS_BY_VALUE);
  const [itemDiceCount, itemFaces, itemModifier] = tier.magicItemCount;
  const itemCount = Math.max(0, rollDice(itemDiceCount, itemFaces) + itemModifier);
  for (let index = 0; index < itemCount; index++) loot.objets.push(randomMagicItem(randomRarity(tier), themeId));
  loot.objets.sort((first, second) => first.r - second.r || first.n.localeCompare(second.n, 'fr'));
  loot.nom = 'Magot (FP ' + challengeRating + ')';
}

function rememberLoot(loot) {
  loots.liste.unshift(loot);
  loots.liste = loots.liste.slice(0, MAX_SAVED_LOOTS);
  loots.cur = loot.id;
  Persos.save();
  renderPage();
}

function generateLoot() {
  if (!magicItems.length) return;
  const challengeRating = $('#fp').value;
  const tier = treasureTier(challengeValue(challengeRating));
  const mode = $('#mode').value;
  const themeId = $('#theme').value;
  const loot = { id: 'l' + Date.now().toString(36), fp: challengeRating, mode, theme: themeId, grp: +$('#grp').value || 5, pieces: { pc: 0, pa: 0, po: 0, pp: 0 }, gemmes: [], arts: [], objets: [] };
  if (mode === 'ind') fillIndividualTreasure(loot, tier, challengeRating);
  else fillHoard(loot, tier, challengeRating, themeId);
  rememberLoot(loot);
  showMessage('Butin tiré : ' + formatNumber(lootValue(loot)) + ' po en tout');
}

function itemDetailsHtml(lootItem) {
  if (lootItem.k === 'o') {
    const item = magicItems.find(candidate => candidate.n === lootItem.n);
    return item ? item.h : '';
  }
  if (lootItem.k === 's') {
    const spell = spells.find(candidate => candidate.n === lootItem.ref);
    return spell ? '<b>' + (spell.l ? 'Niveau ' + spell.l : 'Tour de magie') + ', ' + escapeHtml(spell.e) + '.</b> ' + spell.h : '';
  }
  return '';
}

function savedLootsHtml() {
  if (!loots.liste.length) return '';
  return '<span>Butins enregistrés :</span>' + loots.liste.map(loot => `<span class="sv" aria-current="${loot.id === loots.cur}"><button type="button" data-open="${loot.id}">${escapeHtml(loot.nom)}</button><button type="button" class="x" data-del="${loot.id}" aria-label="Supprimer ${escapeHtml(loot.nom)}" title="Supprimer">×</button></span>`).join('');
}

function coinsHtml(coins) {
  return COIN_NAMES.filter(([coin]) => coins[coin]).map(([coin, metal]) => `<span class="coin"><b>${formatNumber(coins[coin])}</b> ${coin} <small>(${metal})</small></span>`).join('');
}

function valuablesHtml(valuables, cssClass, label) {
  return valuables.map(valuable => `<div class="it plain ${cssClass}"><summary><span class="nm">${valuable.q > 1 ? valuable.q + ' × ' : ''}${escapeHtml(valuable.n)}<small>${label} · ${formatNumber(valuable.po)} po pièce</small></span><span class="pr">${formatNumber(valuable.q * valuable.po)} po</span></summary></div>`).join('');
}

function valuablesSectionHtml(valuables, cssClass, title, label) {
  return valuables.length ? `<div class="sec ${cssClass}"><h2>${title}</h2>${valuablesHtml(valuables, cssClass, label)}</div>` : '';
}

function magicItemHtml(item, index) {
  const details = itemDetailsHtml(item);
  return `<details class="it r${item.r}"><summary><span class="nm">${escapeHtml(item.n)}<small>${escapeHtml(item.t)} · ${RARITY_NAMES[item.r]}</small></span><span class="pr">${formatNumber(item.po)} po</span><button type="button" class="rr" data-i="${index}" title="Tirer un autre objet de même rareté">↻ Autre</button></summary>${details ? '<div class="h">' + details + '</div>' : ''}</details>`;
}

function magicItemsSectionHtml(loot) {
  if (loot.objets.length) return `<div class="sec r3"><h2>Objets magiques</h2>${loot.objets.map(magicItemHtml).join('')}</div>`;
  return loot.mode === 'mag' ? '<p class="empty">Pas d’objet magique dans ce magot.</p>' : '';
}

function lootHtml(loot) {
  const value = lootValue(loot);
  const tier = treasureTier(challengeValue(loot.fp));
  const coins = coinsHtml(loot.pieces);
  return `<section class="panel loot"><div class="lhead"><input id="lnom" value="${escapeHtml(loot.nom)}" aria-label="Nom du butin"><small>${escapeHtml(tier.label)} · ${loot.mode === 'ind' ? 'trésor individuel' : 'magot'}</small></div>
<div class="tot"><span>Valeur totale : <b>${formatNumber(Math.round(value))} po</b></span><span>Part de chacun (${loot.grp} aventurier${plural(loot.grp)}) : <b>${formatNumber(Math.floor(value / loot.grp))} po</b></span></div>
${coins ? `<div class="sec rc"><h2>Pièces</h2><div class="coins">${coins}</div></div>` : ''}
${valuablesSectionHtml(loot.gemmes, 'rg', 'Pierres précieuses', 'Pierre précieuse')}
${valuablesSectionHtml(loot.arts, 'ra', 'Objets d’art', 'Objet d’art')}
${magicItemsSectionHtml(loot)}
</section>`;
}

function renderPage() {
  const isGameMaster = isGameMasterActive();
  $('#lock').hidden = isGameMaster;
  $('#mj').hidden = !isGameMaster;
  $('#bPrint').hidden = !isGameMaster;
  if (!isGameMaster) return;
  $('#saved').innerHTML = savedLootsHtml();
  const loot = currentLoot();
  $('#loot').innerHTML = loot ? lootHtml(loot) : '<section class="panel empty">Choisis le FP et le type de trésor, puis touche « Tirer le butin ».</section>';
}

function individualTreasureDescription(tier) {
  const [diceCount, faces, multiplier, coin] = tier.individualCoins;
  return diceCount + 'd' + faces + (multiplier > 1 ? ' × ' + formatNumber(multiplier) : '') + ' ' + coin + ' par créature.';
}

function hoardDescription(tier) {
  const [diceCount, faces, multiplier] = tier.hoardGold;
  const [itemDiceCount, itemFaces, itemModifier] = tier.magicItemCount;
  const rarityOdds = tier.rarityChances.map((chance, rarity) => chance ? chance + ' % ' + RARITY_NAMES[rarity].toLowerCase() : '').filter(Boolean).join(', ');
  return diceCount + 'd' + faces + ' × ' + formatNumber(multiplier) + ' po en pièces, pierres précieuses et objets d’art, et ' + itemDiceCount + 'd' + itemFaces + (itemModifier ? ' − ' + (-itemModifier) : '') + ' objets magiques (' + rarityOdds + ').';
}

function describeTreasure() {
  const tier = treasureTier(challengeValue($('#fp').value));
  const isIndividual = $('#mode').value === 'ind';
  $('#lnb').hidden = !isIndividual;
  $('#tdesc').textContent = tier.label + ' : ' + (isIndividual ? individualTreasureDescription(tier) : hoardDescription(tier));
}

function openLoot(id) {
  loots.cur = id;
  Persos.save();
  renderPage();
}

function deleteLoot(id) {
  const loot = loots.liste.find(candidate => candidate.id === id);
  if (!loot || !confirm('Supprimer « ' + loot.nom + ' » ?')) return;
  loots.liste = loots.liste.filter(candidate => candidate !== loot);
  if (loots.cur === loot.id) loots.cur = loots.liste[0] && loots.liste[0].id || null;
  Persos.save();
  renderPage();
  showMessage('« ' + loot.nom + ' » supprimé');
}

function handleSavedLootsClick(event) {
  const openButton = event.target.closest('[data-open]');
  const deleteButton = event.target.closest('[data-del]');
  if (openButton) openLoot(openButton.dataset.open);
  if (deleteButton) deleteLoot(deleteButton.dataset.del);
}

function rerollMagicItem(event) {
  const button = event.target.closest('.rr');
  if (!button) return;
  event.preventDefault();
  const loot = currentLoot();
  if (!loot) return;
  const index = +button.dataset.i;
  const previousItem = loot.objets[index];
  if (!previousItem) return;
  loot.objets[index] = randomMagicItem(previousItem.r, loot.theme);
  Persos.save();
  renderPage();
  const newButton = $(`#loot .rr[data-i="${button.dataset.i}"]`);
  if (newButton) newButton.focus();
}

function renameCurrentLoot(event) {
  if (event.target.id !== 'lnom') return;
  const loot = currentLoot();
  if (!loot) return;
  loot.nom = event.target.value;
  Persos.save();
}

function applySavedLoots(saved) {
  const savedLoots = saved && saved.data;
  loots = savedLoots && Array.isArray(savedLoots.liste) ? { liste: savedLoots.liste, cur: savedLoots.cur } : { liste: [], cur: null };
  renderPage();
}

async function loadCatalogs() {
  try {
    [magicItems, spells] = await Promise.all(['assets/json/vf/objets.json', 'assets/json/vf/spells.json'].map(fetchJson));
    magicItemPool = null;
    renderPage();
  } catch (error) {
    $('#loot').innerHTML = '<section class="panel empty">Impossible de charger les objets.</section>';
  }
}

$('#fp').innerHTML = CHALLENGE_RATINGS.map(rating => `<option${rating === '3' ? ' selected' : ''}>${rating}</option>`).join('');
$('#theme').innerHTML = ITEM_THEMES.map(theme => `<option value="${theme.id}">${escapeHtml(theme.name)}</option>`).join('');
$('#fp').onchange = $('#mode').onchange = describeTreasure;
describeTreasure();
$('#bGen').onclick = generateLoot;
$('#saved').addEventListener('click', handleSavedLootsClick);
$('#loot').addEventListener('click', rerollMagicItem);
$('#loot').addEventListener('input', renameCurrentLoot);
$('#loot').addEventListener('change', event => { if (event.target.id === 'lnom') renderPage(); });
$('#bPrint').onclick = () => window.print();

Persos.init({ part: 'butin', mount: $('#persos'), msg: showMessage, collect: () => ({ version: 1, type: 'butin-dnd-5e', data: loots }), apply: applySavedLoots, onName: renderPage });
loadCatalogs();
