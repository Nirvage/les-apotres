const RARITY_NAMES = ['Courant', 'Peu courant', 'Rare', 'Très rare', 'Légendaire'];
const RARITY_PRICES = [100, 400, 4000, 40000, 200000];
const SCROLL_RARITY_BY_SPELL_LEVEL = [0, 0, 1, 1, 2, 2, 3, 3, 3, 4];
const LOW_LEVEL_SCROLL_PRICES = [30, 50];
const MAX_SAVED_SHOPS = 20;
const SETTLEMENT_SIZES = {
  village: { stockFactor: 0.25, maxRarity: 2, mundaneShare: 0.4, name: 'Village' },
  bourg: { stockFactor: 0.4, maxRarity: 3, mundaneShare: 0.6, name: 'Bourg' },
  ville: { stockFactor: 0.65, maxRarity: 3, mundaneShare: 0.8, name: 'Ville' },
  capitale: { stockFactor: 1, maxRarity: 4, mundaneShare: 1, name: 'Grande ville' }
};
const GEM_MAX_VALUE_BY_MAX_RARITY = [50, 500, 1000, 5000, 5000];

const nameStartsWith = alternatives => new RegExp('^(' + alternatives + ')', 'i');

const SHOP_TYPES = [
  {
    id: 'armurerie', name: 'Armurerie', description: 'Armes, armures, boucliers et munitions, ordinaires et magiques.', magicItemsPerRarity: [4, 9, 6, 3, 1],
    sellsMagicItem: item => /^(Arme|Armure|Munition)$/.test(item.t),
    sellsMundaneItem: gear => /^(Arme|Armure|Munition)$/.test(gear.t)
  },
  {
    id: 'cordonnier', name: 'Cordonnier et tailleur', description: 'Vêtements, bottes, capes, gants, ceintures, chapeaux et robes.', magicItemsPerRarity: [3, 7, 6, 3, 1],
    sellsMagicItem: item => item.t === 'Objet merveilleux' && nameStartsWith('Bottes|Chaussons|Sandales|Cape|Manteau|Gants|Gantelets|Robe|Ceinture|Chapeau|Bandeau|Bracelets|Masque|Casque|Capuche|Écharpe|Voile').test(item.n),
    sellsMundaneItem: gear => /(V[êe]tements|^Robe|^Costume|^Sac|^Bourse|^Couverture|cordonnier|travailleur du cuir|tisserand|^Parfum)/i.test(gear.n)
  },
  {
    id: 'alchimiste', name: 'Alchimiste', description: 'Potions, huiles, élixirs, poussières et ingrédients.', magicItemsPerRarity: [6, 12, 9, 4, 1],
    sellsMagicItem: item => (item.t === 'Potion' || nameStartsWith('Huile|Élixir|Philtre|Poussière|Onguent|Baume|Pigments|Fiole|Sels').test(item.n)) && !/^Potion de soins/.test(item.n),
    sellsMundaneItem: gear => /(Acide|Antitoxine|Feu grégeois|Eau bénite|Potion|Poison|Fiole|Bouteille|alchimiste|herboriste|empoisonneur|Parfum|Composants)/i.test(gear.n)
  },
  {
    id: 'magie', name: 'Boutique de magie', description: 'Baguettes, bâtons, sceptres, anneaux, objets merveilleux et parchemins.', magicItemsPerRarity: [8, 15, 10, 10, 3],
    sellsMagicItem: item => /^(Baguette|Bâton|Sceptre|Anneau|Objet merveilleux|Parchemin)$/.test(item.t), scrollClasses: [],
    sellsMundaneItem: gear => /(Focalisation arcanique|Livre de sorts|Composants|Parchemin de sort)/i.test(gear.n)
  },
  {
    id: 'joaillier', name: 'Joaillier', description: 'Anneaux, amulettes, colliers, broches, pierres précieuses et gemmes.', magicItemsPerRarity: [3, 7, 6, 3, 2],
    sellsMagicItem: item => item.t === 'Anneau' || (item.t === 'Objet merveilleux' && nameStartsWith('Amulette|Collier|Broche|Médaillon|Pierre|Gemme|Perle|Diadème|Couronne|Bracelets|Talisman|Scarabée|Joyau').test(item.n)),
    sellsMundaneItem: gear => /(joaillier|^Loupe|Symbole sacré \(amulette\))/i.test(gear.n), sellsGems: true
  },
  {
    id: 'libraire', name: 'Libraire et scribe', description: 'Livres, manuels, cartes, matériel d’écriture et parchemins de sort.', magicItemsPerRarity: [9, 9, 6, 3, 1],
    sellsMagicItem: item => item.t === 'Objet merveilleux' && nameStartsWith('Livre|Manuel|Tome|Grimoire|Codex|Traité|Plume|Carte|Recueil').test(item.n) && !/^Cartes merveilleuses/.test(item.n), scrollClasses: [],
    sellsMundaneItem: gear => /(^Livre|^Papier|^Parchemin \(|^Encre|^Plume|^Carte|^Étui|calligraphe|cartographe|contrefaçon)/i.test(gear.n)
  },
  {
    id: 'temple', name: 'Temple', description: 'Articles religieux, soins, eau bénite et parchemins de sorts divins.', magicItemsPerRarity: [6, 7, 4, 1, 0],
    sellsMagicItem: item => /^Potion de soins/.test(item.n) || nameStartsWith('Amulette du dévot|Encensoir du dévot|Collier de prière|Talisman du bien|Eau|Perle de pouvoir|Scarabée de protection').test(item.n), scrollClasses: ['Clerc', 'Paladin'],
    sellsMundaneItem: gear => /(Symbole sacré|Eau bénite|Trousse de soins|Antitoxine|herboriste|Potion de guérison|Chandelle|Encens)/i.test(gear.n)
  },
  {
    id: 'ecurie', name: 'Écurie et charron', description: 'Montures, selles, chariots et barques ; quelques objets magiques pour les montures.', magicItemsPerRarity: [1, 3, 3, 2, 0],
    sellsMagicItem: item => nameStartsWith('Fer|Fers|Figurine merveilleuse|Selle|Bride').test(item.n),
    sellsMundaneItem: gear => gear.t === 'Monture et véhicule' && gear.po < 1000 && !/^Écurie/.test(gear.n)
  },
  {
    id: 'musique', name: 'Luthier', description: 'Instruments de musique, ordinaires et magiques.', magicItemsPerRarity: [1, 4, 4, 1, 1],
    sellsMagicItem: item => nameStartsWith('Instrument|Flûte|Lyre|Luth|Harpe|Tambour|Cor |Cornemuse|Mandoline|Cithare|Carillon|Lyre').test(item.n),
    sellsMundaneItem: gear => /Instruments de musique/.test(gear.c || '')
  },
  {
    id: 'bazar', name: 'Bazar d’aventurier', description: 'Matériel d’aventure, paquetages, outils, jeux et quelques babioles magiques.', magicItemsPerRarity: [6, 4, 1, 0, 0],
    sellsMagicItem: item => item.t === 'Objet merveilleux',
    sellsMundaneItem: gear => /^(Équipement d’aventurier|Outil|Paquetage)$/.test(gear.t) && !/Potion|Poison|Parchemin de sort|Focalisation|Livre de sorts/.test(gear.n)
  }
];
const GEMS = [['Azurite', 10], ['Hématite', 10], ['Malachite', 10], ['Turquoise', 10], ['Cornaline', 50], ['Jaspe', 50], ['Onyx', 50], ['Pierre de lune', 50], ['Ambre', 100], ['Améthyste', 100], ['Grenat', 100], ['Perle', 100], ['Jade', 100], ['Aigue-marine', 500], ['Perle noire', 500], ['Topaze', 500], ['Opale noire', 1000], ['Émeraude', 1000], ['Saphir bleu', 1000], ['Diamant', 5000], ['Rubis', 5000], ['Saphir étoilé', 5000]];

let magicItems = [];
let equipment = [];
let spells = [];
let shops = { liste: [], cur: null };

const formatNumber = number => number.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const plural = count => count > 1 ? 's' : '';

function randomFraction(scale) {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return randomValues[0] / 4294967296 * scale;
}

const randomIntegerBetween = (minimum, maximum) => minimum + Math.floor(randomFraction(maximum - minimum + 1));

function randomSample(list, count) {
  const remaining = list.slice();
  const sample = [];
  while (sample.length < count && remaining.length) sample.push(remaining.splice(Math.floor(randomFraction(remaining.length)), 1)[0]);
  return sample;
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

function roundedPrice(price) {
  if (price >= 1000) return Math.round(price / 50) * 50;
  if (price >= 100) return Math.round(price / 5) * 5;
  return Math.max(1, Math.round(price));
}

const varyPrice = (basePrice, shouldVary) => shouldVary ? roundedPrice(basePrice * (0.8 + randomFraction(0.4))) : basePrice;

const selectedShopType = () => SHOP_TYPES.find(type => type.id === $('#type').value);
const currentShop = () => shops.liste.find(shop => shop.id === shops.cur);
const shopTypeById = id => SHOP_TYPES.find(type => type.id === id);

function addMagicItemsToPool(pool, shopType) {
  magicItems.forEach(item => {
    const rarity = rarityIndex(item.q);
    if (rarity == null || !shopType.sellsMagicItem(item) || /maudit/i.test(item.n)) return;
    pool[rarity].push({ n: item.n, t: item.t, r: rarity, base: RARITY_PRICES[rarity] / (isConsumable(item) ? 2 : 1), k: 'o' });
  });
}

const spellLevelLabel = level => level ? 'niveau ' + level : 'tour de magie';

function addSpellScrollsToPool(pool, shopType) {
  if (!shopType.scrollClasses) return;
  spells.forEach(spell => {
    if (shopType.scrollClasses.length && !spell.c.some(className => shopType.scrollClasses.includes(className))) return;
    const rarity = SCROLL_RARITY_BY_SPELL_LEVEL[spell.l];
    const price = spell.l < 2 ? LOW_LEVEL_SCROLL_PRICES[spell.l] : RARITY_PRICES[rarity] / 2;
    pool[rarity].push({ n: 'Parchemin de sort : ' + spell.n.split('|')[0], t: 'Parchemin (' + spellLevelLabel(spell.l) + ')', r: rarity, base: price, k: 's', ref: spell.n });
  });
}

function magicItemPoolByRarity(shopType) {
  const pool = [[], [], [], [], []];
  addMagicItemsToPool(pool, shopType);
  addSpellScrollsToPool(pool, shopType);
  return pool;
}

const sellsSeveralCopies = item => item.t.startsWith('Potion') || item.k === 's' || item.t === 'Munition';

function magicStock(shopType, size, shouldVaryPrices) {
  const pool = magicItemPoolByRarity(shopType);
  const stock = [];
  shopType.magicItemsPerRarity.forEach((countInCapital, rarity) => {
    if (!countInCapital || rarity > size.maxRarity) return;
    const count = Math.round(countInCapital * size.stockFactor * (0.75 + randomFraction(0.5)));
    randomSample(pool[rarity], count).forEach(item => stock.push({ ...item, po: varyPrice(item.base, shouldVaryPrices), qty: sellsSeveralCopies(item) ? randomIntegerBetween(1, 3) : 1 }));
  });
  return stock.sort((first, second) => first.r - second.r || first.n.localeCompare(second.n, 'fr'));
}

function mundaneQuantity(gear) {
  if (gear.t === 'Monture et véhicule') return randomIntegerBetween(1, 3);
  if (gear.po <= 1) return randomIntegerBetween(5, 20);
  if (gear.po <= 50) return randomIntegerBetween(1, 6);
  return randomIntegerBetween(1, 2);
}

function mundaneStockSize(catalogSize, size) {
  const minimum = Math.min(catalogSize, 4);
  const sized = Math.min(40 * size.mundaneShare, Math.round(catalogSize * size.mundaneShare * (0.8 + randomFraction(0.2))));
  return Math.max(minimum, sized);
}

function gemStock(size) {
  const affordableGems = GEMS.filter(([, value]) => value <= GEM_MAX_VALUE_BY_MAX_RARITY[size.maxRarity]);
  return randomSample(affordableGems, Math.round(GEMS.length * size.mundaneShare * 0.7))
    .map(([name, value]) => ({ n: name, t: 'Pierre précieuse', k: 'g', p: formatNumber(value) + ' po', po: value, qty: randomIntegerBetween(1, 4) }));
}

function mundaneStock(shopType, size) {
  const catalog = equipment.filter(shopType.sellsMundaneItem);
  const stock = randomSample(catalog, mundaneStockSize(catalog.length, size))
    .map(gear => ({ n: gear.n, t: gear.c || gear.t, k: 'e', p: gear.p, po: gear.po, qty: mundaneQuantity(gear) }));
  if (shopType.sellsGems) stock.push(...gemStock(size));
  return stock.sort((first, second) => first.t.localeCompare(second.t, 'fr') || first.po - second.po);
}

function rememberShop(shop) {
  shops.liste.unshift(shop);
  shops.liste = shops.liste.slice(0, MAX_SAVED_SHOPS);
  shops.cur = shop.id;
  Persos.save();
  renderPage();
}

function generateShop() {
  const shopType = selectedShopType();
  const sizeKey = $('#taille').value;
  const size = SETTLEMENT_SIZES[sizeKey];
  const magic = magicStock(shopType, size, $('#varp').checked);
  const mundane = mundaneStock(shopType, size);
  rememberShop({ id: 'b' + Date.now().toString(36), nom: shopType.name + ' (' + size.name.toLowerCase() + ')', type: shopType.id, taille: sizeKey, magie: magic, courant: mundane });
  showMessage('Inventaire généré : ' + magic.length + ' objet' + plural(magic.length) + ' magique' + plural(magic.length));
}

function scrollDetailsHtml(spell) {
  return '<b>' + (spell.l ? 'Niveau ' + spell.l : 'Tour de magie') + ', ' + escapeHtml(spell.e) + '.</b> ' + spell.h;
}

function itemDetailsHtml(stockItem) {
  if (stockItem.k === 'o') {
    const item = magicItems.find(candidate => candidate.n === stockItem.n);
    return item ? item.h : '';
  }
  if (stockItem.k === 's') {
    const spell = spells.find(candidate => candidate.n === stockItem.ref);
    return spell ? scrollDetailsHtml(spell) : '';
  }
  if (stockItem.k === 'e') {
    const gear = equipment.find(candidate => candidate.n === stockItem.n);
    return gear ? gear.h || '' : '';
  }
  return '';
}

const isMagicStockItem = stockItem => stockItem.k === 'o' || stockItem.k === 's';

function priceHtml(stockItem) {
  if (stockItem.k === 'e' || stockItem.k === 'g') return escapeHtml(stockItem.p);
  return formatNumber(stockItem.po) + ' po' + (stockItem.po !== stockItem.base ? '<s>' + formatNumber(stockItem.base) + '</s>' : '');
}

function stockLineHtml(stockItem, index, section) {
  const isSoldOut = !stockItem.qty;
  const details = itemDetailsHtml(stockItem);
  const rarityClass = isMagicStockItem(stockItem) ? 'r' + stockItem.r : 'rc';
  const rarityLabel = isMagicStockItem(stockItem) ? ' · ' + RARITY_NAMES[stockItem.r] : '';
  const soldButton = isSoldOut ? '' : `<button type="button" class="sold" data-sec="${section}" data-i="${index}">Vendu</button>`;
  return `<details class="it ${rarityClass}${isSoldOut ? ' out' : ''}"><summary><span class="nm">${escapeHtml(stockItem.n)}<small>${escapeHtml(stockItem.t)}${rarityLabel}</small></span>
<span class="pr">${priceHtml(stockItem)}</span><span class="qt">${isSoldOut ? 'Épuisé' : 'Stock : ' + stockItem.qty}</span>${soldButton}</summary>${details ? '<div class="h">' + details + '</div>' : ''}</details>`;
}

function savedShopsHtml() {
  if (!shops.liste.length) return '';
  return '<span>Boutiques enregistrées :</span>' + shops.liste.map(shop => `<span class="sv" aria-current="${shop.id === shops.cur}"><button type="button" data-open="${shop.id}">${escapeHtml(shop.nom)}</button><button type="button" class="x" data-del="${shop.id}" aria-label="Supprimer ${escapeHtml(shop.nom)}" title="Supprimer">×</button></span>`).join('');
}

function stockSummaryHtml(shop) {
  const rarityCounts = RARITY_NAMES.map((name, rarity) => [name, shop.magie.filter(item => item.r === rarity).length]).filter(([, count]) => count);
  const magicBadges = rarityCounts.map(([name, count]) => `<span class="r${RARITY_NAMES.indexOf(name)}" style="background:var(--k)">${count} ${name.toLowerCase()}${plural(count)}</span>`).join('');
  const mundaneCount = shop.courant.length;
  const mundaneBadge = mundaneCount ? `<span class="rc" style="background:var(--k)">${mundaneCount} article${plural(mundaneCount)} courant${plural(mundaneCount)}</span>` : '';
  return `<div class="sum">${magicBadges}${mundaneBadge}</div>`;
}

function stockSectionHtml(shop, section, title, color) {
  const items = shop[section];
  return items.length ? `<div class="sec"><h2 style="--k:${color}">${title}</h2>${items.map((item, index) => stockLineHtml(item, index, section)).join('')}</div>` : '';
}

function shopHtml(shop) {
  const shopType = shopTypeById(shop.type) || {};
  const sizeName = (SETTLEMENT_SIZES[shop.taille] || {}).name || '';
  return `<section class="panel shop"><div class="shead"><input id="snom" value="${escapeHtml(shop.nom)}" aria-label="Nom de la boutique"><small>${escapeHtml(shopType.name || '')} · ${escapeHtml(sizeName)}</small></div>
${stockSummaryHtml(shop)}
${stockSectionHtml(shop, 'magie', 'Objets magiques', '#7a4fc4')}
${stockSectionHtml(shop, 'courant', 'Marchandise courante', '#9a8f7a')}
${!shop.magie.length && !shop.courant.length ? '<p class="empty">Rien en stock.</p>' : ''}</section>`;
}

function renderPage() {
  const isGameMaster = isGameMasterActive();
  $('#lock').hidden = isGameMaster;
  $('#mj').hidden = !isGameMaster;
  $('#bPrint').hidden = !isGameMaster;
  if (!isGameMaster || !magicItems.length) return;
  $('#saved').innerHTML = savedShopsHtml();
  const shop = currentShop();
  $('#shop').innerHTML = shop ? shopHtml(shop) : '<section class="panel empty">Choisis un type de boutique puis touche « Générer l’inventaire ».</section>';
}

function describeSelectedShopType() {
  const shopType = selectedShopType();
  const capitalStock = shopType.magicItemsPerRarity.map((count, rarity) => count + ' ' + RARITY_NAMES[rarity].toLowerCase()).filter(text => !text.startsWith('0')).join(', ');
  $('#tdesc').textContent = shopType.description + ' En grande ville : ' + capitalStock + ' (environ deux tiers en ville, un tiers dans un bourg, un quart dans un village ; pas de légendaire hors des grandes villes, ni de très rare au village).';
}

function openShop(id) {
  shops.cur = id;
  Persos.save();
  renderPage();
}

function deleteShop(id) {
  const shop = shops.liste.find(candidate => candidate.id === id);
  if (!shop || !confirm('Supprimer « ' + shop.nom + ' » ?')) return;
  shops.liste = shops.liste.filter(candidate => candidate.id !== id);
  if (shops.cur === id) shops.cur = shops.liste[0] ? shops.liste[0].id : null;
  Persos.save();
  renderPage();
  showMessage('Boutique supprimée');
}

function handleSavedShopsClick(event) {
  const { open, del } = event.target.dataset;
  if (open) openShop(open);
  if (del) deleteShop(del);
}

function sellOneItem(event) {
  const button = event.target.closest('.sold');
  if (!button) return;
  event.preventDefault();
  const shop = currentShop();
  const stockItem = shop && shop[button.dataset.sec][button.dataset.i];
  if (!stockItem) return;
  stockItem.qty--;
  Persos.save();
  renderPage();
  showMessage('« ' + stockItem.n + ' » vendu' + (stockItem.qty ? ' (reste ' + stockItem.qty + ')' : ' : épuisé'));
}

function renameCurrentShop(event) {
  if (event.target.id !== 'snom') return;
  const shop = currentShop();
  if (!shop) return;
  shop.nom = event.target.value;
  Persos.save();
}

function applySavedShops(saved) {
  const savedShops = saved && saved.data;
  shops = savedShops && Array.isArray(savedShops.liste) ? { liste: savedShops.liste, cur: savedShops.cur } : { liste: [], cur: null };
  renderPage();
}

async function loadCatalogs() {
  try {
    [magicItems, equipment, spells] = await Promise.all(['assets/json/vf/objets.json', 'assets/json/vf/equipement.json', 'assets/json/vf/spells.json'].map(fetchJson));
    renderPage();
  } catch (error) {
    $('#shop').innerHTML = '<section class="panel empty">Impossible de charger les objets.</section>';
  }
}

$('#type').onchange = describeSelectedShopType;
$('#bGen').onclick = generateShop;
$('#saved').onclick = handleSavedShopsClick;
$('#shop').addEventListener('click', sellOneItem);
$('#shop').addEventListener('input', renameCurrentShop);
$('#shop').addEventListener('change', event => { if (event.target.id === 'snom') renderPage(); });
$('#bPrint').onclick = () => window.print();

Persos.init({ part: 'boutiques', mount: $('#persos'), msg: showMessage, collect: () => ({ version: 1, type: 'boutiques-dnd-5e', data: shops }), apply: applySavedShops, onName: renderPage });
SHOP_TYPES.forEach(type => $('#type').add(new Option(type.name, type.id)));
describeSelectedShopType();
loadCatalogs();
