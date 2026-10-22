const TYPE_COLORS = { 'Arme': '#c8402f', 'Armure': '#2f6fd0', 'Munition': '#d8791a', 'Équipement d’aventurier': '#2e9e5b', 'Paquetage': '#12968f', 'Outil': '#7a4fc4', 'Monture et véhicule': '#8e5a2b' };
const TYPE_ORDER = Object.keys(TYPE_COLORS);
const DEFAULT_COLOR = '#2a3170';
const CREATION_COLOR = '#d8791a';
const MESSAGE_DURATION_MS = 4500;
const MAX_QUANTITY = 999;

let bookEquipment = [];
let allEquipment = [];
const equipmentByName = new Map();
const state = { sel: new Map(), q: '', cls: '', sch: '', lvl: '', only: '', tab: 0, open: new Set() };

const notify = text => showMessage(text, MESSAGE_DURATION_MS);
const formatNumber = number => (Math.round(number * 100) / 100).toLocaleString('fr-FR');
const formatKilograms = kilograms => formatNumber(kilograms) + ' kg';
const plural = count => count > 1 ? 's' : '';
const quantityOf = gear => state.sel.get(gear.n) || 0;
const typeColor = gear => TYPE_COLORS[gear.t] || DEFAULT_COLOR;
const clampQuantity = quantity => Math.max(0, Math.min(MAX_QUANTITY, quantity));

function indexEquipment() {
  const customEquipment = Persos.custom().equipement.filter(gear => gear && gear.n && TYPE_ORDER.includes(gear.t));
  allEquipment = bookEquipment.concat(customEquipment);
  equipmentByName.clear();
  allEquipment.forEach((gear, index) => {
    gear.i = index;
    gear.idx = normalizeText(gear.n + ' ' + gear.en + ' ' + gear.c);
    [gear.n, gear.en].forEach(name => {
      if (name && !equipmentByName.has(normalizeText(name))) equipmentByName.set(normalizeText(name), gear);
    });
  });
}

function setupCatalog(equipment) {
  bookEquipment = equipment;
  indexEquipment();
  const presentTypes = TYPE_ORDER.filter(type => allEquipment.some(gear => gear.t === type));
  $('#fc').innerHTML = '<option value="">Toutes</option>' + presentTypes.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
  fillCategoryFilter();
}

function categoriesByType() {
  const categories = {};
  bookEquipment.forEach(gear => {
    const typeCategories = categories[gear.t] = categories[gear.t] || [];
    if (!typeCategories.includes(gear.c)) typeCategories.push(gear.c);
  });
  return categories;
}

function moveSelectionAfterEdit(saved, previous) {
  if (previous && (!saved || saved.n !== previous.n)) {
    const quantity = state.sel.get(previous.n);
    state.sel.delete(previous.n);
    state.open.delete(previous.n);
    if (saved && quantity) state.sel.set(saved.n, quantity);
  }
  if (saved && !previous) {
    state.sel.set(saved.n, 1);
    state.open.add(saved.n);
  }
}

function editMessage(saved, previous) {
  if (!saved) return 'Objet supprimé';
  return previous ? 'Objet modifié' : '« ' + saved.n + ' » créé et ajouté à ton équipement';
}

function editCustomEquipment(gear) {
  Custom.edit({
    kind: 'equipement', item: gear, types: TYPE_ORDER, cats: categoriesByType(),
    taken: name => equipmentByName.has(normalizeText(name)),
    done: (saved, previous) => {
      moveSelectionAfterEdit(saved, previous);
      indexEquipment();
      fillCategoryFilter();
      renderAll();
      notify(editMessage(saved, previous));
    }
  });
}

function fillCategoryFilter() {
  const categories = [...new Set(allEquipment.filter(gear => !state.cls || gear.t === state.cls).map(gear => gear.c))];
  if (state.sch && !categories.includes(state.sch)) state.sch = '';
  $('#fs').innerHTML = '<option value="">Toutes</option>' + categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  $('#fs').value = state.sch;
}

const editButtonHtml = gear => gear.c_ ? `<button class="b noprint" style="--c:${CREATION_COLOR}" data-act="edit" data-i="${gear.i}">Modifier</button>` : '';
const nameBadgeHtml = gear => gear.c_ ? `<span class="pill" style="background:${CREATION_COLOR}">Création</span>` : VO.btn('equipement', gear.n, gear.n);

function cardMetaHtml(gear, isInBook) {
  const quantity = quantityOf(gear);
  return `<dl class="meta"><div><dt>Prix d’achat</dt><dd>${escapeHtml(gear.p || '—')}</dd></div><div><dt>Poids</dt><dd>${gear.kg ? formatKilograms(gear.kg) : '—'}</dd></div><div><dt>Catégorie</dt><dd>${escapeHtml(gear.c)}</dd></div>${gear.en ? `<div><dt>Nom anglais</dt><dd>${escapeHtml(gear.en)}</dd></div>` : ''}${isInBook ? `<div><dt>Quantité</dt><dd>${quantity} (total ${formatKilograms(quantity * gear.kg)} · ${formatNumber(quantity * gear.po)} po)</dd></div>` : ''}</dl>`;
}

function cardActionsHtml(gear, isInBook) {
  if (isInBook) return `<div class="qty noprint" style="margin-top:6px"><button class="b" data-act="dec" data-i="${gear.i}">−</button><input class="qin" type="number" min="1" max="${MAX_QUANTITY}" value="${quantityOf(gear)}" data-i="${gear.i}" aria-label="Quantité de ${escapeHtml(gear.n)}"><button class="b" data-act="inc" data-i="${gear.i}">+</button> <button class="b rm" data-act="rm" data-i="${gear.i}">Retirer</button> ${editButtonHtml(gear)}</div>`;
  return gear.c_ ? `<div class="noprint" style="margin-top:6px">${editButtonHtml(gear)}</div>` : '';
}

const descriptionHtml = gear => gear.h.replace(/([.)])\s+(?=<b>)/g, '$1<br>');

function cardHtml(gear, isInBook) {
  const badge = isInBook ? '× ' + quantityOf(gear) : escapeHtml(gear.p);
  return `<article class="sp" style="--c:${typeColor(gear)}"><header><div class="ti"><h3>${escapeHtml(gear.n)}${nameBadgeHtml(gear)}</h3><div class="sub">${escapeHtml(gear.c)}${gear.en ? ' · ' + escapeHtml(gear.en) : ''}</div></div><span class="lvb">${badge}</span></header>
  <div class="body">${cardMetaHtml(gear, isInBook)}
  <div class="desc">${descriptionHtml(gear)}</div>${cardActionsHtml(gear, isInBook)}</div></article>`;
}

function matchesFilters(gear, searchedText, maximumPrice) {
  return (!searchedText || gear.idx.includes(searchedText))
    && (!state.cls || gear.t === state.cls)
    && (!state.sch || gear.c === state.sch)
    && (maximumPrice === null || isNaN(maximumPrice) || gear.po <= maximumPrice)
    && (!state.only || (state.only === 'perso' ? !!gear.c_ : quantityOf(gear) > 0));
}

function filteredEquipment() {
  const searchedText = normalizeText(state.q);
  const maximumPrice = state.lvl === '' ? null : parseFloat(state.lvl);
  return allEquipment.filter(gear => matchesFilters(gear, searchedText, maximumPrice));
}

function equipmentTotals() {
  const totals = { kg: 0, po: 0, n: 0 };
  allEquipment.forEach(gear => {
    const quantity = quantityOf(gear);
    if (!quantity) return;
    totals.kg += quantity * gear.kg;
    totals.po += quantity * gear.po;
    totals.n += quantity;
  });
  return totals;
}

function listQuantityControlHtml(gear) {
  const quantity = quantityOf(gear);
  if (!quantity) return `<button class="b add" data-act="inc" data-i="${gear.i}">Ajouter</button>`;
  return `<span class="qty"><button class="b" data-act="dec" data-i="${gear.i}" aria-label="Retirer un exemplaire">−</button><input class="qin" type="number" min="1" max="${MAX_QUANTITY}" value="${quantity}" data-i="${gear.i}" aria-label="Quantité de ${escapeHtml(gear.n)}"><button class="b add on" data-act="inc" data-i="${gear.i}" aria-label="Ajouter un exemplaire">+</button></span>`;
}

function listRowHtml(gear) {
  const isOpen = state.open.has(gear.n);
  return `<div class="item" style="--c:${typeColor(gear)}"><div class="row"><div class="rmain"><div class="rt">${escapeHtml(gear.n)}${nameBadgeHtml(gear)}</div><div class="rs">${escapeHtml(gear.c)}${gear.kg ? ' · ' + formatKilograms(gear.kg) : ''}</div></div><span class="pr" title="Prix d’achat">${escapeHtml(gear.p || '—')}</span>
    <div class="racts"><button class="b" style="--c:${DEFAULT_COLOR}" data-act="det" data-i="${gear.i}" aria-expanded="${isOpen}">${isOpen ? 'Masquer' : 'Détails'}</button>${listQuantityControlHtml(gear)}</div></div>${isOpen ? `<div class="det">${cardHtml(gear, false)}</div>` : ''}</div>`;
}

function renderList() {
  const shown = filteredEquipment();
  const selectedTypes = state.sel.size;
  $('#cnt').textContent = shown.length + ' objet' + plural(shown.length) + ' affiché' + plural(shown.length) + ' · ' + selectedTypes + ' type' + plural(selectedTypes) + ' dans mon équipement';
  $('#list').innerHTML = shown.length ? shown.map(listRowHtml).join('') : '<div class="empty-msg">Aucun objet ne correspond à ces filtres.</div>';
}

function selectedEquipmentByType() {
  const byType = TYPE_ORDER.map(() => []);
  allEquipment.forEach(gear => { if (quantityOf(gear)) byType[TYPE_ORDER.indexOf(gear.t)].push(gear); });
  byType.forEach(list => list.sort((first, second) => first.c.localeCompare(second.c, 'fr') || first.n.localeCompare(second.n, 'fr')));
  return byType;
}

function bookTabsHtml(byType) {
  return TYPE_ORDER.map((type, tab) => `<button class="tab" role="tab" style="--c:${TYPE_COLORS[type]}" data-act="tab" data-l="${tab}" aria-selected="${tab === state.tab}">${escapeHtml(type)}<span>${byType[tab].length}</span></button>`).join('');
}

function bookSectionsHtml(byType) {
  return TYPE_ORDER.map((type, tab) => {
    const items = byType[tab];
    const content = items.length ? `<div class="cards">${items.map(gear => cardHtml(gear, true)).join('')}</div>` : '<div class="none">Aucun objet dans cette catégorie.</div>';
    return `<section class="lvl${tab === state.tab ? ' on' : ''}${items.length ? '' : ' empty'}" style="--c:${TYPE_COLORS[type]}"><h2>${escapeHtml(type)} <span>(${items.length})</span></h2>${content}</section>`;
  }).join('');
}

function renderBook() {
  const byType = selectedEquipmentByType();
  $('#tabs').innerHTML = bookTabsHtml(byType);
  $('#levels').innerHTML = bookSectionsHtml(byType);
  const totals = equipmentTotals();
  $('#sum').textContent = totals.n ? totals.n + ' objet' + plural(totals.n) + ' · ' + formatKilograms(totals.kg) + ' · valeur ' + formatNumber(totals.po) + ' po' : 'Aucun objet sélectionné';
  $('#bBook').textContent = 'Mon équipement (' + totals.n + ')';
  $('#tot').innerHTML = totals.n ? `Poids total : ${formatKilograms(totals.kg)} · Valeur totale : ${formatNumber(totals.po)} po` : '';
}

function renderAll() {
  renderList();
  renderBook();
  Persos.save();
}

function collectEquipment() {
  return {
    version: 1, type: 'equipement-dnd-5e', data: {
      titre: $('#titre').value,
      objets: allEquipment.filter(quantityOf).map(gear => ({ n: gear.n, qte: quantityOf(gear) })),
      filtres: { q: state.q, cls: state.cls, sch: state.sch, lvl: state.lvl, only: state.only }
    }
  };
}

function syncFilterInputs() {
  $('#fq').value = state.q;
  $('#fc').value = state.cls;
  fillCategoryFilter();
  $('#fl').value = state.lvl;
  $('#fo').value = state.only;
}

function savedEntryNameAndQuantity(entry) {
  if (typeof entry === 'string') return [entry, 1];
  return [entry && entry.n, Math.max(1, Math.min(MAX_QUANTITY, parseInt(entry && entry.qte) || 1))];
}

function restoreSelection(savedEntries) {
  state.sel.clear();
  let unknownCount = 0;
  savedEntries.forEach(entry => {
    const [name, quantity] = savedEntryNameAndQuantity(entry);
    const gear = equipmentByName.get(normalizeText(String(name)));
    if (gear) state.sel.set(gear.n, quantity);
    else unknownCount++;
  });
  return unknownCount;
}

function restoreFilters(savedFilters) {
  state.q = savedFilters.q || '';
  state.cls = savedFilters.cls || '';
  state.sch = savedFilters.sch || '';
  state.lvl = savedFilters.lvl || '';
  state.only = savedFilters.only === 'perso' ? 'perso' : savedFilters.only ? '1' : '';
}

function applyEquipment(saved) {
  const data = saved && saved.data;
  if (!data || !Array.isArray(data.objets)) throw new Error('format');
  const unknownCount = restoreSelection(data.objets);
  restoreFilters(data.filtres || {});
  syncFilterInputs();
  renderAll();
  return unknownCount;
}

function clearFilters() {
  state.q = state.cls = state.sch = state.lvl = state.only = '';
}

function startBlank() {
  state.sel.clear();
  clearFilters();
  syncFilterInputs();
  renderAll();
}

function showCharacterEquipment(saved) {
  state.open.clear();
  state.tab = 0;
  if (saved) applyEquipment(saved);
  else startBlank();
}

function setQuantity(gear, quantity) {
  const clamped = clampQuantity(quantity);
  if (clamped) state.sel.set(gear.n, clamped);
  else state.sel.delete(gear.n);
  renderAll();
}

function toggleDetails(gear) {
  if (state.open.has(gear.n)) state.open.delete(gear.n);
  else state.open.add(gear.n);
  renderList();
}

const hasSelectedOfType = tab => allEquipment.some(gear => gear.t === TYPE_ORDER[tab] && quantityOf(gear));

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

const CLICK_ACTIONS = {
  inc: gear => setQuantity(gear, quantityOf(gear) + 1),
  dec: gear => setQuantity(gear, quantityOf(gear) - 1),
  det: toggleDetails,
  rm: gear => setQuantity(gear, 0),
  tab: (gear, button) => { state.tab = +button.dataset.l; renderBook(); },
  edit: editCustomEquipment,
  mode: (gear, button) => setMode(button.dataset.m)
};

function handleActionClick(event) {
  const button = event.target.closest('[data-act]');
  if (!button) return;
  const action = CLICK_ACTIONS[button.dataset.act];
  if (action) action(allEquipment[+button.dataset.i], button);
}

function handleQuantityInput(event) {
  if (!event.target.classList.contains('qin')) return;
  const quantity = parseInt(event.target.value);
  setQuantity(allEquipment[+event.target.dataset.i], isNaN(quantity) ? 0 : quantity);
}

function onFilterChange(key, refreshCategories) {
  return event => {
    state[key] = event.target.value;
    if (refreshCategories) fillCategoryFilter();
    renderList();
    Persos.save();
  };
}

function resetFilters() {
  clearFilters();
  syncFilterInputs();
  renderList();
  Persos.save();
}

function saveToFile() {
  const name = fileSafeName($('#titre').value || Persos.current().nom || 'equipement');
  downloadJsonFile(`equipement_${name}.json`, collectEquipment());
  notify('Équipement enregistré dans un fichier .json');
}

function loadedMessage(unknownCount) {
  const ignored = unknownCount ? ' (' + unknownCount + ' introuvable' + plural(unknownCount) + ' ignoré' + plural(unknownCount) + ')' : '';
  return 'Équipement chargé : ' + state.sel.size + ' type(s)' + ignored;
}

function loadFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      notify(loadedMessage(applyEquipment(JSON.parse(reader.result))));
    } catch (error) {
      notify('Fichier invalide : choisis un .json créé par cette page');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function printEquipment() {
  if (!state.sel.size) {
    notify('Ajoute d’abord des objets à ton équipement');
    return;
  }
  window.print();
}

function clearEquipment() {
  if (!state.sel.size) return;
  if (!confirm('Retirer tout l’équipement de « ' + Persos.current().nom + ' » ? Pense à enregistrer un .json avant.')) return;
  state.sel.clear();
  renderAll();
  notify('Équipement vidé');
}

function showLoadingError() {
  $('#cnt').textContent = '';
  $('#list').innerHTML = '<div class="empty-msg">Impossible de charger la liste (equipement.json). Vérifie ta connexion, puis recharge la page. En local, ouvre le site via un serveur web (pas en double-cliquant sur le fichier).</div>';
}

async function startPage() {
  let equipment;
  try {
    equipment = await fetchJson('assets/json/vf/equipement.json');
  } catch (error) {
    showLoadingError();
    return;
  }
  setupCatalog(equipment);
  Persos.init({ part: 'equipement', mount: $('#persos'), title: $('#titre'), collect: collectEquipment, apply: showCharacterEquipment, msg: notify });
}

document.addEventListener('click', handleActionClick);
document.addEventListener('change', handleQuantityInput);
$('#fq').addEventListener('input', onFilterChange('q'));
$('#fc').addEventListener('change', onFilterChange('cls', true));
$('#fs').addEventListener('change', onFilterChange('sch'));
$('#fl').addEventListener('input', onFilterChange('lvl'));
$('#fo').addEventListener('change', onFilterChange('only'));
$('#titre').addEventListener('input', () => Persos.save());
$('#bNew').onclick = () => editCustomEquipment(null);
$('#bReset').onclick = resetFilters;
$('#bSave').onclick = saveToFile;
$('#bLoad').onclick = () => $('#file').click();
$('#file').onchange = loadFromFile;
$('#bPrint').onclick = printEquipment;
$('#bClear').onclick = clearEquipment;
startPage();
