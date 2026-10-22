const RARITY_COLORS = { 'Courant': '#6b7280', 'Peu courant': '#2e9e5b', 'Rare': '#2f6fd0', 'Très rare': '#7a4fc4', 'Légendaire': '#d8791a', 'Artefact': '#c8402f' };
const RARITY_ABBREVIATIONS = { 'Courant': 'C', 'Peu courant': 'PC', 'Rare': 'R', 'Très rare': 'TR', 'Légendaire': 'L', 'Artefact': 'A' };
const TYPE_COLORS = { 'Armure': '#2f6fd0', 'Arme': '#c8402f', 'Anneau': '#b8860b', 'Baguette': '#7a4fc4', 'Bâton': '#8e3a9d', 'Sceptre': '#d6458e', 'Potion': '#2e9e5b', 'Parchemin': '#12968f', 'Munition': '#d8791a', 'Objet merveilleux': '#2a3170' };
const TYPE_ORDER = ['Armure', 'Arme', 'Munition', 'Anneau', 'Baguette', 'Bâton', 'Sceptre', 'Potion', 'Parchemin', 'Objet merveilleux'];
const RARITY_ORDER = ['Courant', 'Peu courant', 'Rare', 'Très rare', 'Légendaire', 'Artefact'];
const RARITY_PRICES = { 'Courant': 100, 'Peu courant': 400, 'Rare': 4000, 'Très rare': 40000, 'Légendaire': 200000 };
const DEFAULT_COLOR = '#2a3170';
const CREATION_COLOR = '#d8791a';
const MESSAGE_DURATION_MS = 4500;
const MAX_ATTUNED_ITEMS = 3;
const MIN_FAMILY_SIZE = 4;
const WIDE_CARD_DESCRIPTION_LENGTH = 1800;

const CLASSES = ['Artificier', 'Barbare', 'Barde', 'Chasseur de sang', 'Clerc', 'Druide', 'Ensorceleur', 'Guerrier', 'Magicien', 'Moine', 'Occultiste', 'Paladin', 'Rôdeur', 'Roublard'];
const SPELLCASTING_CLASSES = ['Artificier', 'Barde', 'Clerc', 'Druide', 'Ensorceleur', 'Magicien', 'Occultiste', 'Paladin', 'Rôdeur'];
const CLASSES_BY_ARMOR_CATEGORY = { 'légère': ['Artificier', 'Barbare', 'Barde', 'Chasseur de sang', 'Clerc', 'Druide', 'Guerrier', 'Occultiste', 'Paladin', 'Rôdeur', 'Roublard'], 'intermédiaire': ['Artificier', 'Barbare', 'Chasseur de sang', 'Clerc', 'Guerrier', 'Paladin', 'Rôdeur'], 'lourde': ['Guerrier', 'Paladin'], 'Bouclier': ['Artificier', 'Barbare', 'Clerc', 'Druide', 'Guerrier', 'Paladin', 'Rôdeur'] };
const MARTIAL_CLASSES = ['Barbare', 'Chasseur de sang', 'Guerrier', 'Moine', 'Paladin', 'Rôdeur', 'Roublard'];
const CLASSES_BY_ABILITY = { 'Force': ['Barbare', 'Guerrier', 'Paladin'], 'Dextérité': ['Moine', 'Rôdeur', 'Roublard', 'Guerrier'], 'Constitution': ['Barbare', 'Guerrier', 'Paladin', 'Chasseur de sang'], 'Intelligence': ['Artificier', 'Magicien'], 'Sagesse': ['Clerc', 'Druide', 'Moine', 'Rôdeur'], 'Charisme': ['Barde', 'Ensorceleur', 'Occultiste', 'Paladin'] };

const ROLES = ['Offensif', 'Défensif', 'Soin', 'Contrôle', 'Mobilité', 'Magie', 'Amélioration', 'Détection', 'Discrétion', 'Consommable', 'Utilitaire'];
const ROLE_PATTERNS = {
  'Offensif': /\d+d\d+(?: \+ \d+)? (?:points de )?dégâts|dégâts \S+ supplémentaires|aux jets d'attaque et de dégâts|subit \d+d\d+/i,
  'Défensif': /à la CA|Classe d'Armure|\brésistance aux\b|\bimmunisé|aux jets de sauvegarde|points de vie temporaires|avantage aux jets de sauvegarde/i,
  'Soin': /regagne[rz]? (?:\d+d\d+ |des |autant de |tous ses |tous vos )?points de vie|récupère[rz]? (?:\d+d\d+ )?points de vie|guérison|soins/i,
  'Amélioration': /(?:votre|valeur de) (?:Force|Dextérité|Constitution|Intelligence|Sagesse|Charisme) (?:passe|augmente|devient)|bonus de maîtrise augmente|avantage aux tests de|bonus de \+\d aux tests/i,
  'Contrôle': /\b(?:est|soit|devient|reste|a l'état) (?:Charmée?|Effrayée?|Paralysée?|Entravée?|Étourdie?|Aveuglée?|Neutralisée?|Pétrifiée?|Inconsciente?|Assourdie?)|(?:l'état|états?) (?:Charmé|Effrayé|Paralysé|Entravé|Étourdi|Aveuglé|À terre|Neutralisé|Pétrifié|Assourdi|Agrippé|Inconscient)|\bdevient (?:Charmé|Effrayé|Paralysé|Entravé|Étourdi|Aveuglé|Neutralisé|Pétrifié)/i,
  'Mobilité': /Vitesse de (?:vol|nage|escalade|fouissement)|Vitesse (?:augmente|est doublée)|téléport|lévit|vous pouvez voler|marcher sur|portail|respirer (?:normalement )?sous l'eau|Saut/i,
  'Magie': /jets? d'attaque de sort|DD de sauvegarde de vos sorts|lancer (?:le sort |l'un des sorts |un sort |)<i>|lancez? <i>|emplacement de sort|focaliseur/i,
  'Détection': /détect|vision dans le noir|voir (?:les créatures )?invisibles?|Vision véritable|Perception|repérer|localis|lire|comprendre (?:toutes les|n'importe quelle) langue/i,
  'Discrétion': /Invisible|invisibilité|Discrétion|déguis|change[rz]? (?:votre|d')apparence|indétectable/i
};
const EFFECT_LABELS = { ca: 'CA', sv: 'jets de sauvegarde', tests: 'tests de caractéristique', init: 'initiative', satk: 'attaque de sort', sdd: 'DD des sorts', arme: 'attaque et dégâts' };
const FILTER_SELECTS = [['#ff', 'fam'], ['#fk', 'cla'], ['#fr', 'role'], ['#fc', 'cls'], ['#fs', 'sch'], ['#fl', 'lvl'], ['#fo', 'only'], ['#fb', 'src']];

let bookItems = [];
let allItems = [];
let weaponNames = null;
const itemsByName = new Map();
const state = { sel: new Set(), har: new Set(), q: '', fam: '', cla: '', role: '', cls: '', sch: '', lvl: '', only: '', tab: 0, open: new Set(), src: '' };

const notify = text => showMessage(text, MESSAGE_DURATION_MS);
const plural = count => count > 1 ? 's' : '';
const formatGold = amount => amount.toLocaleString('fr-FR') + ' po';
const plainText = html => String(html || '').replace(/<[^>]+>/g, '');
const signedNumber = number => (number < 0 ? '' : '+') + number;
const isConsumableType = type => /^(Potion|Parchemin|Munition)$/.test(type);
const isSelected = item => state.sel.has(item.n);
const isAttuned = item => state.har.has(item.n);

function raritiesNamedIn(normalizedText) {
  const rarities = [];
  if (/(^|[^a-z])courante?s?(?![a-z])/.test(normalizedText.replace(/peu courante?s?/g, '#'))) rarities.push('Courant');
  if (/peu courante?s?/.test(normalizedText)) rarities.push('Peu courant');
  if (/(^|[^a-z])rares?(?![a-z])/.test(normalizedText.replace(/tres rares?/g, '#'))) rarities.push('Rare');
  if (/tres rares?/.test(normalizedText)) rarities.push('Très rare');
  if (normalizedText.includes('legendaire')) rarities.push('Légendaire');
  if (normalizedText.includes('artefact')) rarities.push('Artefact');
  return rarities;
}

function possibleRarities(item) {
  const rarityText = normalizeText(item.q);
  let rarities = raritiesNamedIn(rarityText);
  if (rarities.length === 2 && / a /.test(rarityText)) rarities = RARITY_ORDER.slice(RARITY_ORDER.indexOf(rarities[0]), RARITY_ORDER.indexOf(rarities[1]) + 1);
  if (!rarities.length) rarities = raritiesNamedIn(normalizeText(plainText(item.h)));
  return rarities;
}

function suggestedPrice(item) {
  const rarities = possibleRarities(item);
  if (!rarities.length) return '';
  const isConsumable = isConsumableType(item.t) || /consomm/i.test(item.h || '');
  const prices = rarities.map(rarity => RARITY_PRICES[rarity]).filter(Boolean).map(price => isConsumable ? price / 2 : price);
  if (!prices.length) return 'Inestimable (artefact)';
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  return (lowest === highest ? formatGold(lowest) : formatGold(lowest) + ' à ' + formatGold(highest)) + (isConsumable ? ' (consommable)' : '') + (rarities.includes('Artefact') ? ' ; artefact inestimable' : '');
}

const mainRarity = item => RARITY_ORDER.find(rarity => normalizeText(item.q).includes(normalizeText(rarity))) || '';
const rarityColor = item => RARITY_COLORS[mainRarity(item)] || DEFAULT_COLOR;

function rarityAbbreviation(item) {
  const rarityText = normalizeText(item.q);
  const named = RARITY_ORDER.filter(rarity => rarityText.includes(normalizeText(rarity)));
  return named.length > 1 ? 'Var.' : (RARITY_ABBREVIATIONS[named[0]] || 'Var.');
}

const itemFamily = name => String(name).split(/[ '’-]/)[0];

function classesRequiredForAttunement(attunementText) {
  const required = new Set();
  if (!/\bpar (un|une)\b/.test(attunementText)) return required;
  if (attunementText.includes('lanceur de sorts')) SPELLCASTING_CLASSES.forEach(className => required.add(className));
  CLASSES.forEach(className => { if (attunementText.includes(normalizeText(className))) required.add(className); });
  return required;
}

const helpsSpellcasting = (item, text) => /jets? d.attaque de sort|DD de sauvegarde de vos sorts/i.test(text) || item.t === 'Parchemin' || (/^(Baguette|Bâton|Sceptre)$/.test(item.t) && /lancer|lancez/i.test(text));

function armorClasses(item) {
  if (item.cat === 'Bouclier') return CLASSES_BY_ARMOR_CATEGORY.Bouclier;
  return Object.keys(CLASSES_BY_ARMOR_CATEGORY).filter(category => category !== 'Bouclier' && (!item.cat || item.cat.includes(category))).flatMap(category => CLASSES_BY_ARMOR_CATEGORY[category]);
}

function recommendedClasses(item) {
  const text = plainText(item.h);
  const required = classesRequiredForAttunement(normalizeText(item.a || ''));
  if (required.size) return required;
  const recommended = new Set();
  const addAll = classes => classes.forEach(className => recommended.add(className));
  if (helpsSpellcasting(item, text)) addAll(SPELLCASTING_CLASSES);
  if (item.t === 'Armure') addAll(armorClasses(item));
  if (item.t === 'Arme' || item.t === 'Munition') addAll(MARTIAL_CLASSES);
  if (/Discrétion/.test(text)) addAll(['Roublard', 'Rôdeur', 'Moine']);
  if (/Escamotage|outils de voleur|serrure/i.test(text)) recommended.add('Roublard');
  for (const ability in CLASSES_BY_ABILITY) {
    if (new RegExp('(votre|valeur de) ' + ability + ' (passe|augmente|devient|change)', 'i').test(text)) addAll(CLASSES_BY_ABILITY[ability]);
  }
  return recommended;
}

const isConsumableItem = (item, text) => isConsumableType(item.t)
  || /^(Huile|Élixir|Philtre|Onguent|Poussière|Pastille|Graine|Baume|Encens|Pigments)/.test(item.n)
  || /usage unique|un seul usage|(?:l'objet|il|elle) (?:est consommée?|disparaît) (?:une fois|après)/i.test(text);

function itemRoles(item) {
  const text = String(item.h || '').replace(/<(?!\/?i>)[^>]+>/g, ' ');
  const roles = new Set();
  if (item.t === 'Arme' || item.t === 'Munition') roles.add('Offensif');
  if (item.t === 'Armure') roles.add('Défensif');
  if (item.t === 'Parchemin') roles.add('Magie');
  for (const role in ROLE_PATTERNS) if (ROLE_PATTERNS[role].test(text)) roles.add(role);
  if (isConsumableItem(item, text)) roles.add('Consommable');
  if (!roles.size || /contenir|ranger|range[rz]? |transport|lumière (?:vive|faible) dans un rayon|outils?\b|réparer|nettoy|cuisin|nourriture/i.test(text)) roles.add('Utilitaire');
  return roles;
}

function optionsHtml(firstLabel, values) {
  return `<option value="">${firstLabel}</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function setupCatalog(items) {
  bookItems = items;
  indexItems();
  $('#fc').innerHTML = optionsHtml('Tous', TYPE_ORDER.filter(type => allItems.some(item => item.t === type)));
  $('#fs').innerHTML = optionsHtml('Toutes', RARITY_ORDER);
  $('#fk').innerHTML = optionsHtml('Toutes', CLASSES);
  $('#fr').innerHTML = optionsHtml('Tous', ROLES);
}

function fillFamilyFilter() {
  const familySizes = {};
  allItems.forEach(item => { familySizes[item.fam] = (familySizes[item.fam] || 0) + 1; });
  const families = Object.keys(familySizes).filter(family => familySizes[family] >= MIN_FAMILY_SIZE).sort((first, second) => first.localeCompare(second, 'fr'));
  $('#ff').innerHTML = '<option value="">Toutes</option>' + families.map(family => `<option value="${escapeHtml(family)}">${escapeHtml(family)} (${familySizes[family]})</option>`).join('');
  $('#ff').value = families.includes(state.fam) ? state.fam : '';
}

function indexItems() {
  allItems = bookItems.concat(Persos.custom().objets.filter(item => item && item.n && TYPE_ORDER.includes(item.t)));
  itemsByName.clear();
  allItems.forEach((item, index) => {
    item.i = index;
    item.idx = normalizeText(item.n + ' ' + item.en);
    [item.n, item.en].forEach(name => {
      if (name && !itemsByName.has(normalizeText(name))) itemsByName.set(normalizeText(name), item);
    });
    item.fam = itemFamily(item.n);
    item.rec = recommendedClasses(item);
    item.roles = itemRoles(item);
  });
  fillFamilyFilter();
}

async function loadWeaponNames() {
  if (weaponNames) return;
  try {
    const equipment = await fetchJson('assets/json/vf/equipement.json');
    weaponNames = equipment.concat(Persos.custom().equipement).filter(gear => gear.t === 'Arme' || gear.t === 'Munition').map(gear => gear.n);
  } catch (error) {
    weaponNames = [];
  }
}

function moveSelectionAfterEdit(saved, previous) {
  if (previous && (!saved || saved.n !== previous.n)) {
    const wasAttuned = state.har.has(previous.n);
    const wasSelected = state.sel.has(previous.n);
    state.sel.delete(previous.n);
    state.har.delete(previous.n);
    state.open.delete(previous.n);
    if (saved && wasSelected) {
      state.sel.add(saved.n);
      if (wasAttuned && saved.a) state.har.add(saved.n);
    }
  }
  if (saved && !saved.a) state.har.delete(saved.n);
  if (saved && !previous) {
    state.sel.add(saved.n);
    state.open.add(saved.n);
  }
}

function editMessage(saved, previous) {
  if (!saved) return 'Objet supprimé';
  return previous ? 'Objet modifié' : '« ' + saved.n + ' » créé et ajouté à tes objets';
}

async function editCustomItem(item) {
  await loadWeaponNames();
  Custom.edit({
    kind: 'objets', item, types: TYPE_ORDER, rares: RARITY_ORDER, weapons: weaponNames,
    taken: name => itemsByName.has(normalizeText(name)),
    done: (saved, previous) => {
      moveSelectionAfterEdit(saved, previous);
      indexItems();
      renderAll();
      notify(editMessage(saved, previous));
    }
  });
}

const armorCategoryLabel = item => item.cat ? item.cat.split(' (')[0].replace(/^Armure /, '').replace(/^./, letter => letter.toUpperCase()) : '';

function attunementPillHtml(item) {
  if (!item.a) return '';
  return isAttuned(item) ? '<span class="pill hz">Harmonisé</span>' : '<span class="pill co">Harmonisation</span>';
}

function itemPillsHtml(item) {
  return (item.cat ? '<span class="pill ar">' + escapeHtml(armorCategoryLabel(item)) + '</span>' : '')
    + (item.c_ ? '<span class="pill cu">Création</span>' : '')
    + attunementPillHtml(item)
    + (item.ed === '2014' ? '<span class="pill ri">2014</span>' : '');
}

function effectText(effect) {
  if (effect.t === 'set') return Custom.ABN[effect.v] + ' ' + effect.n;
  if (effect.t === 'carac') return Custom.ABN[effect.v] + ' ' + signedNumber(effect.n);
  if (effect.t === 'vit') return 'vitesse ' + signedNumber(effect.n) + ' m';
  return EFFECT_LABELS[effect.t] ? EFFECT_LABELS[effect.t] + ' ' + signedNumber(effect.n) : '';
}

const effectsText = item => (item.fx || []).map(effectText).filter(Boolean).join(', ');
const editButtonHtml = item => item.c_ ? `<button class="b noprint" style="--c:${CREATION_COLOR}" data-act="edit" data-i="${item.i}">Modifier</button>` : '';
const voButtonHtml = item => item.c_ ? '' : VO.btn('objets', item.n, item.n);

function sourceNoteHtml(item) {
  return `<div class="srcn">Source : ${escapeHtml(item.src || '')}${item.ed === '2014' ? ' · objet en version 2014 (règles non mises à jour)' : ''}${item.r_ ? ' · description reconstituée à partir d’un résumé : à vérifier dans le livre' : ''}${item.v_ ? ' · nom français non officiel' : ''}</div>`;
}

function splitChargedSpells(html) {
  const chargedSpell = /<i>[^<]+<\/i> \(\d[^)]*\)/g;
  if ((html.match(chargedSpell) || []).length <= 1) return html;
  return html.replace(/\s*:\s*(?=<i>[^<]+<\/i> \(\d)/g, ' :<br>• ').replace(/\),?\s*(?:ou\s+)?(?=<i>[^<]+<\/i> \(\d)/g, ')<br>• ');
}

function splitDiceTable(html) {
  if (!/\b0[01][-–]\d\d /.test(html)) return html;
  return html.replace(/\s*:\s*(?=0[01][-–]\d\d )/g, ' :<br>').replace(/\s*[,;]\s+(?=\d\d(?:[-–]\d\d)?(?: :| [a-zA-ZÀ-ÿ]{2}))/g, '<br>');
}

function readableDescription(html) {
  const withParagraphs = html.replace(/([.)])\s+(?=<b>)/g, '$1<br>');
  return splitDiceTable(splitChargedSpells(withParagraphs))
    .replace(/\s*:\s*(?=niv\. \d+ )/g, ' :<br>').replace(/\s*;\s*(?=niv\. \d+ )/g, '<br>');
}

function attuneButtonHtml(item) {
  if (!item.a || !isSelected(item)) return '';
  const attuned = isAttuned(item);
  return `<button class="b har noprint${attuned ? ' on' : ''}" data-act="har" data-i="${item.i}" aria-pressed="${attuned}" title="Seuls les objets harmonisés sont importés dans les objets liés de la fiche (${MAX_ATTUNED_ITEMS} au maximum)">${attuned ? '✓ Harmonisé' : 'S’harmoniser'}</button>`;
}

function recommendedClassesText(item) {
  return item.rec.size >= CLASSES.length - 1 ? 'toutes les classes' : [...item.rec].sort((first, second) => first.localeCompare(second, 'fr')).join(', ');
}

function cardMetaHtml(item) {
  const price = suggestedPrice(item);
  const effects = effectsText(item);
  return `<dl class="meta"><div><dt>Type</dt><dd>${escapeHtml(item.cat || item.t)}</dd></div><div><dt>Rareté</dt><dd>${escapeHtml(item.q)}</dd></div>`
    + (price ? `<div><dt>Prix d’achat indicatif</dt><dd>${escapeHtml(price)}</dd></div>` : '')
    + `<div><dt>Harmonisation</dt><dd>${escapeHtml(item.a || 'Non requise')}</dd></div>`
    + (item.roles && item.roles.size ? `<div><dt>Rôle</dt><dd>${[...item.roles].join(', ')}</dd></div>` : '')
    + (item.rec && item.rec.size ? `<div><dt>Conseillé pour</dt><dd>${recommendedClassesText(item)}</dd></div>` : '')
    + (item.en ? `<div><dt>Nom anglais</dt><dd>${escapeHtml(item.en)}</dd></div>` : '')
    + (effects ? `<div><dt>Effets</dt><dd>${escapeHtml(effects)}</dd></div>` : '')
    + '</dl>';
}

function cardHtml(item, isInBook) {
  const subtitle = `${escapeHtml(item.cat || item.t)} · ${escapeHtml(item.q)}${item.a ? ' · ' + escapeHtml(item.a) : ''}${item.en ? ' · ' + escapeHtml(item.en) : ''}`;
  const bookActions = isInBook ? `<div class="racts" style="margin-top:6px">${attuneButtonHtml(item)}${editButtonHtml(item)}<button class="b rm noprint" data-act="rm" data-i="${item.i}">Retirer de mes objets</button></div>` : '';
  return `<article class="sp${item.h.length > WIDE_CARD_DESCRIPTION_LENGTH ? ' wide' : ''}" style="--c:${rarityColor(item)}"><header><div class="ti"><h3>${escapeHtml(item.n)}${itemPillsHtml(item)}${voButtonHtml(item)}</h3><div class="sub">${subtitle}</div></div><span class="lvb" title="${escapeHtml(item.q)}">${rarityAbbreviation(item)}</span></header>
  <div class="body">${cardMetaHtml(item)}
  <div class="desc">${readableDescription(item.h)}</div>${sourceNoteHtml(item)}${bookActions}</div></article>`;
}

function matchesSource(item) {
  if (!state.src) return true;
  if (state.src === 'perso') return !!item.c_;
  return !item.c_ && (state.src === '2014') === (item.ed === '2014');
}

function matchesFilters(item, searchedText) {
  return (!searchedText || item.idx.includes(searchedText))
    && (!state.fam || item.fam === state.fam)
    && (!state.cla || item.rec.has(state.cla))
    && (!state.role || item.roles.has(state.role))
    && (!state.cls || item.t === state.cls)
    && (!state.sch || possibleRarities(item).includes(state.sch))
    && (state.lvl === '' || (state.lvl === '1') === !!item.a)
    && matchesSource(item)
    && (!state.only || isSelected(item));
}

function filteredItems() {
  const searchedText = normalizeText(state.q);
  return allItems.filter(item => matchesFilters(item, searchedText));
}

function listSubtitle(item) {
  const price = suggestedPrice(item);
  return `${escapeHtml(item.cat ? item.cat.split(' (')[0] : item.t)} · ${escapeHtml(item.q)}${item.a ? ' · ' + escapeHtml(item.a) : ''}${price ? ' · ' + escapeHtml(price.split(' (')[0].split(' ;')[0]) : ''}`;
}

function listDetailsHtml(item) {
  return `<div class="det">${cardHtml(item, false)}${item.c_ ? `<div class="racts" style="margin-top:6px">${editButtonHtml(item)}</div>` : ''}</div>`;
}

function listRowHtml(item) {
  const selected = isSelected(item);
  const isOpen = state.open.has(item.n);
  return `<div class="item" style="--c:${rarityColor(item)}"><div class="row"><div class="rmain"><div class="rt">${escapeHtml(item.n)}${itemPillsHtml(item)}${voButtonHtml(item)}</div><div class="rs">${listSubtitle(item)}</div></div>
    <div class="racts">${attuneButtonHtml(item)}<button class="b" style="--c:${DEFAULT_COLOR}" data-act="det" data-i="${item.i}" aria-expanded="${isOpen}">${isOpen ? 'Masquer' : 'Détails'}</button><button class="b add${selected ? ' on' : ''}" data-act="tog" data-i="${item.i}" aria-pressed="${selected}">${selected ? '✓ Ajouté' : '+ Ajouter'}</button></div></div>${isOpen ? listDetailsHtml(item) : ''}</div>`;
}

function renderList() {
  const shown = filteredItems();
  const attunedCount = state.har.size;
  $('#cnt').textContent = shown.length + ' objet' + plural(shown.length) + ' affiché' + plural(shown.length) + ' · ' + state.sel.size + ' dans mon inventaire · ' + attunedCount + '/' + MAX_ATTUNED_ITEMS + ' harmonisé' + plural(attunedCount);
  $('#list').innerHTML = shown.length ? shown.map(listRowHtml).join('') : '<div class="empty-msg">Aucun objet ne correspond à ces filtres.</div>';
}

function selectedItemsByType() {
  const byType = TYPE_ORDER.map(() => []);
  allItems.forEach(item => { if (isSelected(item)) byType[TYPE_ORDER.indexOf(item.t)].push(item); });
  byType.forEach(list => list.sort((first, second) => RARITY_ORDER.indexOf(mainRarity(first)) - RARITY_ORDER.indexOf(mainRarity(second)) || first.n.localeCompare(second.n, 'fr')));
  return byType;
}

function bookSectionsHtml(byType) {
  return TYPE_ORDER.map((type, tab) => {
    const items = byType[tab];
    const content = items.length ? `<div class="cards">${items.map(item => cardHtml(item, true)).join('')}</div>` : '<div class="none">Aucun objet de ce type. Utilise « Choisir les objets » pour en ajouter.</div>';
    return `<section class="lvl${tab === state.tab ? ' on' : ''}${items.length ? '' : ' empty'}" style="--c:${TYPE_COLORS[type]}"><h2>${type} <span>(${items.length})</span></h2>${content}</section>`;
  }).join('');
}

function bookSummary() {
  const selectedCount = state.sel.size;
  if (!selectedCount) return 'Aucun objet sélectionné';
  const needingAttunement = allItems.filter(item => item.a && isSelected(item)).length;
  const attunedCount = state.har.size;
  const hint = attunedCount < needingAttunement && attunedCount < MAX_ATTUNED_ITEMS ? ' (choisis avec « S’harmoniser » les objets à importer dans la fiche)' : '';
  const attunement = needingAttunement ? ' · harmonisation : ' + attunedCount + '/' + MAX_ATTUNED_ITEMS + hint : '';
  return selectedCount + ' objet' + plural(selectedCount) + ' magique' + plural(selectedCount) + attunement;
}

function renderBook() {
  const byType = selectedItemsByType();
  $('#tabs').innerHTML = TYPE_ORDER.map((type, tab) => `<button class="tab" role="tab" style="--c:${TYPE_COLORS[type]}" data-act="tab" data-l="${tab}" aria-selected="${tab === state.tab}">${type}<span>${byType[tab].length}</span></button>`).join('');
  $('#levels').innerHTML = bookSectionsHtml(byType);
  $('#sum').textContent = bookSummary();
  $('#bBook').textContent = 'Mes objets (' + state.sel.size + ')';
}

function renderAll() {
  renderList();
  renderBook();
  Persos.save();
}

function collectItems() {
  return {
    version: 1, type: 'objets-dnd-5e', data: {
      titre: $('#titre').value,
      objets: allItems.filter(isSelected).map(item => item.n),
      harmonises: allItems.filter(isAttuned).map(item => item.n),
      filtres: { q: state.q, fam: state.fam, cla: state.cla, role: state.role, cls: state.cls, sch: state.sch, lvl: state.lvl, only: state.only }
    }
  };
}

function syncFilterInputs() {
  $('#fq').value = state.q;
  FILTER_SELECTS.forEach(([selector, key]) => { $(selector).value = state[key]; });
}

const findItemByName = name => itemsByName.get(normalizeText(String(name)));

function restoreSelection(savedNames, savedAttunedNames) {
  state.sel.clear();
  state.har.clear();
  let unknownCount = 0;
  savedNames.forEach(name => {
    const item = findItemByName(name);
    if (item) state.sel.add(item.n);
    else unknownCount++;
  });
  (savedAttunedNames || []).forEach(name => {
    const item = findItemByName(name);
    if (item && item.a && state.sel.has(item.n) && state.har.size < MAX_ATTUNED_ITEMS) state.har.add(item.n);
  });
  return unknownCount;
}

function restoreFilters(savedFilters) {
  ['q', 'fam', 'cla', 'role', 'cls', 'sch', 'lvl'].forEach(key => { state[key] = savedFilters[key] || ''; });
  state.only = savedFilters.only ? '1' : '';
}

function applyItems(saved) {
  const data = saved && saved.data;
  if (!data || !Array.isArray(data.objets)) throw new Error('format');
  const unknownCount = restoreSelection(data.objets, data.harmonises);
  restoreFilters(data.filtres || {});
  syncFilterInputs();
  renderAll();
  return unknownCount;
}

function startBlank() {
  state.sel.clear();
  state.har.clear();
  state.q = state.fam = state.cla = state.role = state.cls = state.sch = state.lvl = state.only = '';
  syncFilterInputs();
  renderAll();
}

function showCharacterItems(saved) {
  state.open.clear();
  state.tab = 0;
  if (saved) applyItems(saved);
  else startBlank();
}

function toggleSelected(item) {
  if (isSelected(item)) {
    state.sel.delete(item.n);
    state.har.delete(item.n);
  } else state.sel.add(item.n);
  renderAll();
}

function toggleAttunement(item) {
  if (isAttuned(item)) state.har.delete(item.n);
  else if (state.har.size >= MAX_ATTUNED_ITEMS) {
    notify('Tu ne peux t’harmoniser qu’avec ' + MAX_ATTUNED_ITEMS + ' objets à la fois : mets fin à une autre harmonisation d’abord');
    return;
  } else state.har.add(item.n);
  renderAll();
}

function toggleDetails(item) {
  if (state.open.has(item.n)) state.open.delete(item.n);
  else state.open.add(item.n);
  renderList();
}

function removeItem(item) {
  state.sel.delete(item.n);
  state.har.delete(item.n);
  renderAll();
}

const CLICK_ACTIONS = {
  tog: toggleSelected,
  har: toggleAttunement,
  det: toggleDetails,
  rm: removeItem,
  tab: (item, button) => { state.tab = +button.dataset.l; renderBook(); },
  edit: editCustomItem,
  mode: (item, button) => setMode(button.dataset.m)
};

function handleActionClick(event) {
  const button = event.target.closest('[data-act]');
  if (!button) return;
  const action = CLICK_ACTIONS[button.dataset.act];
  if (action) action(allItems[+button.dataset.i], button);
}

const hasSelectedOfType = tab => allItems.some(item => item.t === TYPE_ORDER[tab] && isSelected(item));

function showFirstFilledTab() {
  if (hasSelectedOfType(state.tab)) return;
  const firstFilledTab = TYPE_ORDER.findIndex((type, tab) => hasSelectedOfType(tab));
  if (firstFilledTab < 0) return;
  state.tab = firstFilledTab;
  renderBook();
}

function setMode(mode) {
  document.body.dataset.mode = mode;
  document.querySelectorAll('[data-act=mode]').forEach(button => button.setAttribute('aria-pressed', button.dataset.m === mode));
  if (mode === 'book') showFirstFilledTab();
  scrollTo(0, 0);
}

function onFilterChange(key) {
  return event => {
    state[key] = event.target.value;
    renderList();
    Persos.save();
  };
}

function randomItemDialogHtml(item, candidateCount) {
  const selected = isSelected(item);
  return `<p style="margin:0 0 8px;font-size:12px;color:#5a6270">Tiré au hasard parmi ${candidateCount} objet${plural(candidateCount)}</p>${cardHtml(item, false)}<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px"><button class="b" data-r="close">Fermer</button><button class="b" style="--c:#7a4fc4" data-r="again">🎲 Un autre</button><button class="b add${selected ? ' on' : ''}" data-r="add">${selected ? '✓ Ajouté' : '+ Ajouter à mes objets'}</button></div>`;
}

function showRandomItemIn(dialog, candidates) {
  const item = candidates[Math.floor(Math.random() * candidates.length)];
  dialog.innerHTML = randomItemDialogHtml(item, candidates.length);
  dialog.onclick = event => {
    const button = event.target.closest('[data-r]');
    if (!button) return;
    if (button.dataset.r === 'close') {
      dialog.close();
      dialog.remove();
    } else if (button.dataset.r === 'again') showRandomItemIn(dialog, candidates);
    else {
      if (!isSelected(item)) {
        state.sel.add(item.n);
        renderAll();
      }
      button.classList.add('on');
      button.textContent = '✓ Ajouté';
    }
  };
}

function drawRandomItem() {
  const candidates = filteredItems();
  if (!candidates.length) {
    notify('Aucun objet ne correspond à ces filtres');
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.style.cssText = 'border:0;border-radius:12px;padding:14px;width:min(640px,94vw);max-height:90vh;box-shadow:0 10px 40px #0008;background:#f6f4fb';
  showRandomItemIn(dialog, candidates);
  document.body.appendChild(dialog);
  dialog.showModal();
}

function resetFilters() {
  state.q = state.fam = state.cla = state.role = state.cls = state.sch = state.lvl = state.only = state.src = '';
  syncFilterInputs();
  renderList();
  Persos.save();
}

function saveToFile() {
  const name = fileSafeName($('#titre').value || Persos.current().nom || 'objets');
  downloadJsonFile(`objets_${name}.json`, collectItems());
  notify('Objets enregistrés dans un fichier .json');
}

function loadedMessage(unknownCount) {
  const ignored = unknownCount ? ' (' + unknownCount + ' introuvable' + plural(unknownCount) + ' ignoré' + plural(unknownCount) + ')' : '';
  return 'Objets chargés : ' + state.sel.size + ignored;
}

function loadFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      notify(loadedMessage(applyItems(JSON.parse(reader.result))));
    } catch (error) {
      notify('Fichier invalide : choisis un .json créé par cette page');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function printItems() {
  if (!state.sel.size) {
    notify('Ajoute d’abord des objets à ton inventaire');
    return;
  }
  window.print();
}

function clearItems() {
  if (!state.sel.size) return;
  if (!confirm('Retirer tous les objets de « ' + Persos.current().nom + ' » ? Pense à enregistrer un .json avant.')) return;
  state.sel.clear();
  state.har.clear();
  renderAll();
  notify('Inventaire vidé');
}

function showLoadingError() {
  $('#cnt').textContent = '';
  $('#list').innerHTML = '<div class="empty-msg">Impossible de charger la liste des objets (objets.json). Vérifie ta connexion, puis recharge la page. En local, ouvre le site via un serveur web (pas en double-cliquant sur le fichier).</div>';
}

async function startPage() {
  let items;
  try {
    items = await fetchJson('assets/json/vf/objets.json');
  } catch (error) {
    showLoadingError();
    return;
  }
  setupCatalog(items);
  Persos.init({ part: 'objets', mount: $('#persos'), title: $('#titre'), collect: collectItems, apply: showCharacterItems, msg: notify });
}

document.addEventListener('click', handleActionClick);
$('#fq').addEventListener('input', onFilterChange('q'));
FILTER_SELECTS.forEach(([selector, key]) => $(selector).addEventListener('change', onFilterChange(key)));
$('#titre').addEventListener('input', () => Persos.save());
$('#bNew').onclick = () => editCustomItem(null);
$('#bRand').onclick = drawRandomItem;
$('#bReset').onclick = resetFilters;
$('#bSave').onclick = saveToFile;
$('#bLoad').onclick = () => $('#file').click();
$('#file').onchange = loadFromFile;
$('#bPrint').onclick = printItems;
$('#bClear').onclick = clearItems;
startPage();
