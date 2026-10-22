const RENAMED_CARDS = { Clef: 'Clé', Parques: 'Destins', 'Traître': 'Voleur', Vizir: 'Sage', Artificiel: 'Créature artificielle' };
const EFFECT_LABELS = { B: 'Bénéfique', N: 'Néfaste', M: 'Mitigée' };
const DECK_STORAGE_KEY = 'cartes_deck';
const DECK_2014_ID = 'dmt2014';
const DECK_2024_INDEX = 1;
const EXPANDED_DECK_INDEX = 2;

let decks = [];
let decksById = {};
let selectedDeckId = '';
let selectedEffect = '';
let draws = [];

const stripTags = html => html.replace(/<[^>]+>/g, '');
const searchText = text => withoutAccents(text).replace(/<[^>]+>/g, '').toLowerCase();
const byCardName = (first, second) => first.n.localeCompare(second.n, 'fr');
const plural = count => count > 1 ? 's' : '';
const findCard = (deckId, name) => decksById[deckId] && decksById[deckId].cartes.find(card => card.n === name);

function prepareDecks(loadedDecks) {
  decks = loadedDecks;
  decks[DECK_2024_INDEX].cartes.sort(byCardName);
  const baseCards = decks[DECK_2024_INDEX].cartes.map(card => ({ n: card.n, en: card.en, k: card.k, t: card.t, base: 1 }));
  decks[EXPANDED_DECK_INDEX].cartes = [...decks[EXPANDED_DECK_INDEX].cartes, ...baseCards].sort(byCardName);
  decksById = Object.fromEntries(decks.map(deck => [deck.id, deck]));
}

function restoreSelectedDeck() {
  selectedDeckId = decks[0].id;
  try {
    const savedDeckId = localStorage.getItem(DECK_STORAGE_KEY);
    if (decks.some(deck => deck.id === savedDeckId)) selectedDeckId = savedDeckId;
  } catch (error) {}
}

function rememberSelectedDeck() {
  try { localStorage.setItem(DECK_STORAGE_KEY, selectedDeckId); } catch (error) {}
}

function cardTagsHtml(card) {
  return `<div class="tags"><span>${EFFECT_LABELS[card.k]}</span>${card.j13 ? '<span class="t13">Jeu de 13</span>' : ''}${card.base ? '<span class="t13">Jeu de base</span>' : ''}</div>`;
}

function catalogCardHtml(deck, card) {
  return `<article class="card k-${card.k}" data-n="${card.n}" data-s="${searchText(card.n + ' ' + card.en + ' ' + card.t)}" data-k="${card.k}">
  <h3>${card.n}<small>${card.en}</small></h3>
  ${cardTagsHtml(card)}
  <p>${card.t}</p>
  <div class="act"><button type="button" class="draw" data-d="${deck.id}" data-n="${card.n}">J’ai tiré cette carte</button><span class="drawn" hidden></span></div></article>`;
}

function drawnCardHtml(card) {
  return `<article class="card k-${card.k}"><h3>${card.n}<small>${card.en}</small></h3>${cardTagsHtml(card)}<p>${card.t}</p></article>`;
}

function deckTabHtml(deck) {
  return `<button type="button" data-d="${deck.id}" style="--c:${deck.c}"><b>${deck.titre}</b>${deck.en} · ${deck.cartes.length} cartes<br><small>${deck.resume}</small></button>`;
}

function deckSectionHtml(deck) {
  const hasSmallDeck = deck.cartes.some(card => card.j13);
  const smallDeckNote = hasSmallDeck ? ' La mention « jeu de 13 » signale les cartes présentes dans le petit jeu ; les autres n’existent que dans le jeu de 22 cartes.' : '';
  const sizeSelect = hasSmallDeck ? '<label>Jeu <select class="size" aria-label="Taille du jeu"><option value="22">de 22 cartes</option><option value="13">de 13 cartes</option></select></label>' : '';
  return `<section class="panel deck" id="${deck.id}" style="--c:${deck.c}">
 <h2>${deck.titre} <small style="font:400 13px var(--sans);opacity:.85">— ${deck.en}</small></h2>
 <div class="rules">${deck.regles}<p style="color:var(--soft);font-size:12.5px">Source : ${deck.src}.${smallDeckNote}</p></div>
 <div class="drawbox">
  ${sizeSelect}
  <button type="button" class="rand" data-d="${deck.id}">🎴 Tirer une carte au hasard</button>
  <span class="left"></span>
  <div class="res" role="status" aria-live="polite"></div>
 </div>
 <div class="grid">${deck.cartes.map(card => catalogCardHtml(deck, card)).join('')}</div>
 <p class="empty" hidden>Aucune carte ne correspond.</p>
</section>`;
}

function renderDecks() {
  $('#tabs').innerHTML = decks.map(deckTabHtml).join('');
  $('#decks').innerHTML = decks.map(deckSectionHtml).join('');
}

function filterDeckCards(deck, searched) {
  const section = document.getElementById(deck.id);
  section.hidden = deck.id !== selectedDeckId;
  let shownCount = 0;
  section.querySelectorAll('.grid .card').forEach(cardElement => {
    const matches = (!selectedEffect || cardElement.dataset.k === selectedEffect) && (!searched || cardElement.dataset.s.includes(searched));
    cardElement.hidden = !matches;
    if (matches) shownCount++;
  });
  section.querySelector('.empty').hidden = shownCount > 0;
  if (deck.id === selectedDeckId) $('#cnt').textContent = shownCount + ' carte' + plural(shownCount) + ' sur ' + deck.cartes.length;
}

function renderFilters() {
  $$('#tabs button').forEach(button => button.setAttribute('aria-pressed', button.dataset.d === selectedDeckId));
  $$('.f').forEach(button => button.setAttribute('aria-pressed', button.dataset.k === selectedEffect));
  const searched = searchText($('#q').value.trim());
  decks.forEach(deck => filterDeckCards(deck, searched));
}

function selectDeck(event) {
  const button = event.target.closest('button');
  if (!button) return;
  selectedDeckId = button.dataset.d;
  rememberSelectedDeck();
  renderFilters();
}

function drawDateLabel(draw) {
  return draw.t ? new Date(draw.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function drawLineHtml(draw, index) {
  const card = findCard(draw.d, draw.n);
  const deck = decksById[draw.d];
  const date = drawDateLabel(draw);
  const details = (deck ? escapeHtml(deck.titre) : '') + (date ? ' · ' + date : '') + (card ? ' — ' + stripTags(card.t) : '');
  return `<li class="k-${card ? card.k : 'M'}"><span class="num">${index + 1}.</span>
<span class="what"><b>${escapeHtml(draw.n)}</b> <small>${details}</small></span>
<button type="button" class="rm" data-rm="${index}" aria-label="Retirer ce tirage" title="Retirer ce tirage">×</button>
<input data-note="${index}" value="${escapeHtml(draw.note || '')}" placeholder="Note : choix fait, objet reçu, PNJ…" aria-label="Note sur ce tirage"></li>`;
}

function drawCountsByCard() {
  const counts = {};
  draws.forEach(draw => {
    const key = draw.d + '|' + draw.n;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function markDrawnCards() {
  const counts = drawCountsByCard();
  $$('.grid .card').forEach(cardElement => {
    const count = counts[cardElement.closest('.deck').id + '|' + cardElement.dataset.n] || 0;
    const badge = cardElement.querySelector('.drawn');
    cardElement.classList.toggle('got', count > 0);
    badge.hidden = !count;
    badge.textContent = 'Tirée' + (count > 1 ? ' ×' + count : '');
  });
}

function remainingCards(drawBox) {
  const deckId = drawBox.closest('.deck').id;
  const sizeSelect = drawBox.querySelector('.size');
  const alreadyDrawn = new Set(draws.filter(draw => draw.d === deckId).map(draw => draw.n));
  const smallDeckOnly = sizeSelect && sizeSelect.value === '13';
  return decksById[deckId].cartes.filter(card => !alreadyDrawn.has(card.n) && !(smallDeckOnly && !card.j13));
}

function updateDrawBoxes() {
  $$('.drawbox').forEach(drawBox => {
    const remaining = remainingCards(drawBox);
    drawBox.querySelector('.rand').disabled = !remaining.length;
    drawBox.querySelector('.left').textContent = remaining.length
      ? remaining.length + ' carte' + plural(remaining.length) + ' pas encore tirée' + plural(remaining.length)
      : 'Toutes les cartes de ce jeu ont été tirées';
  });
}

function renderDraws() {
  const character = Persos.current();
  $('#trnom').textContent = character ? character.nom : '';
  $('#bClearT').hidden = !draws.length;
  $('#trlist').innerHTML = draws.length ? draws.map(drawLineHtml).join('') : '<li class="none">Aucune carte tirée pour l’instant.</li>';
  markDrawnCards();
  updateDrawBoxes();
}

const newDraw = (deckId, cardName) => ({ d: deckId, n: cardName, t: new Date().toISOString(), note: '' });

function drawRandomCard(button) {
  const drawBox = button.closest('.drawbox');
  const remaining = remainingCards(drawBox);
  if (!remaining.length) return false;
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const card = remaining[randomValues[0] % remaining.length];
  draws.push(newDraw(button.dataset.d, card.n));
  drawBox.querySelector('.res').innerHTML = drawnCardHtml(card);
  showMessage('Carte tirée : « ' + card.n + ' » (ajoutée aux cartes tirées)');
  return true;
}

function recordDrawnCard(button) {
  draws.push(newDraw(button.dataset.d, button.dataset.n));
  showMessage('« ' + button.dataset.n + ' » ajoutée aux cartes tirées');
}

function removeDraw(button) {
  const removed = draws.splice(+button.dataset.rm, 1)[0];
  if (removed) showMessage('« ' + removed.n + ' » retirée');
}

function handleDrawClick(event) {
  const button = event.target.closest('.draw,.rm,.rand');
  if (!button) return;
  if (button.classList.contains('rand')) {
    if (!drawRandomCard(button)) return;
  } else if (button.classList.contains('draw')) recordDrawnCard(button);
  else removeDraw(button);
  renderDraws();
  Persos.save();
}

function changeDeckSize(event) {
  if (!event.target.classList.contains('size')) return;
  event.target.closest('.drawbox').querySelector('.res').innerHTML = '';
  renderDraws();
}

function editDrawNote(event) {
  const index = event.target.dataset.note;
  if (index == null || !draws[index]) return;
  draws[index].note = event.target.value;
  Persos.save();
}

function clearDraws() {
  if (!draws.length || !confirm('Effacer toutes les cartes tirées de « ' + Persos.current().nom + ' » ?')) return;
  draws = [];
  renderDraws();
  Persos.save();
  showMessage('Cartes tirées effacées');
}

function applySavedDraws(saved) {
  $$('.res').forEach(result => { result.innerHTML = ''; });
  draws = saved && saved.data && Array.isArray(saved.data.tirages) ? saved.data.tirages.filter(draw => draw && draw.n) : [];
  draws.forEach(draw => { if (draw.d !== DECK_2014_ID && RENAMED_CARDS[draw.n]) draw.n = RENAMED_CARDS[draw.n]; });
  renderDraws();
}

function startDrawTracking() {
  document.addEventListener('change', changeDeckSize);
  document.addEventListener('click', handleDrawClick);
  $('#trlist').addEventListener('input', editDrawNote);
  $('#bClearT').onclick = clearDraws;
  Persos.init({ part: 'cartes', mount: $('#persos'), msg: showMessage, collect: () => ({ version: 1, type: 'cartes-dnd-5e', data: { tirages: draws } }), apply: applySavedDraws, onName: renderDraws });
}

async function startPage() {
  try {
    prepareDecks(await fetchJson('assets/json/vf/cartes.json'));
  } catch (error) {
    $('#decks').innerHTML = '<p class="empty">Impossible de charger les cartes (ouvre le site via un serveur web).</p>';
    return;
  }
  restoreSelectedDeck();
  renderDecks();
  $('#tabs').onclick = selectDeck;
  $$('.f').forEach(button => { button.onclick = () => { selectedEffect = button.dataset.k; renderFilters(); }; });
  $('#q').oninput = renderFilters;
  renderFilters();
  startDrawTracking();
}

$('#bPrint').onclick = () => window.print();
startPage();
