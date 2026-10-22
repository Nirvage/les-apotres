const TIER_LEVELS = { 1: 'Niveaux 1 à 4', 2: 'Niveaux 5 à 10', 3: 'Niveaux 11 à 16', 4: 'Niveaux 17 à 20' };
const TIER_NAMES = { 1: 'Héros locaux', 2: 'Héros du royaume', 3: 'Maîtres du royaume', 4: 'Maîtres du monde' };
const QUEST_STATUSES = { libre: 'Pas encore jouée', prevue: 'Prévue', cours: 'En cours', faite: 'Terminée' };
const PARTY_SIZE = 5;
const MAGIC_ITEM_PRICES = [['légendaire', 200000], ['très rare', 40000], ['rare', 4000], ['peu courant', 400]];

let quests = [];
let questStatusById = {};
const filters = { tier: '', type: '', status: '', text: '' };

const formatNumber = number => number.toLocaleString('fr-FR');
const minimumLevel = quest => parseInt(quest.niv, 10);
const questStatus = quest => questStatusById[quest.id] || 'libre';

function whatAShareCanBuy(goldPerAdventurer) {
  const affordable = MAGIC_ITEM_PRICES.find(([, price]) => goldPerAdventurer >= price * .75);
  if (!affordable) return 'de quoi s’équiper, pas encore un objet peu courant';
  const [rarity, price] = affordable;
  const count = Math.max(1, Math.round(goldPerAdventurer / price * 2) / 2);
  const plural = count > 1 ? 's' : '';
  return 'environ ' + String(count).replace('.', ',') + ' objet' + plural + ' ' + rarity + plural + ' chacun';
}

function statusOptionsHtml(selectedStatus) {
  return Object.keys(QUEST_STATUSES).map(status => `<option value="${status}"${status === selectedStatus ? ' selected' : ''}>${QUEST_STATUSES[status]}</option>`).join('');
}

function rewardHtml(quest) {
  const goldPerAdventurer = Math.floor(quest.po / PARTY_SIZE);
  return `<div class="po"><span>Récompense : <b>${formatNumber(quest.po)} PO</b> pour le groupe</span><span>soit <b>${formatNumber(goldPerAdventurer)} PO</b> par aventurier</span><span class="bn">Équivaut à ${whatAShareCanBuy(goldPerAdventurer)}</span>${quest.bonus ? '<span class="bn">En plus : ' + escapeHtml(quest.bonus) + '</span>' : ''}</div>`;
}

function questCardHtml(quest) {
  const status = questStatus(quest);
  return `<article class="q k${quest.tier}${status === 'faite' ? ' faite' : ''}" id="${quest.id}">
<h3>${escapeHtml(quest.t)}</h3>
<div class="tags"><span class="lv">Niveau ${escapeHtml(quest.niv)}</span><span>${escapeHtml(quest.type)}</span><span>${escapeHtml(quest.lieu)}</span></div>
<p><b>Accroche.</b> ${escapeHtml(quest.acc)}</p>
<p><b>Objectif.</b> ${escapeHtml(quest.obj)}</p>
<div><p><b>Complications</b></p><ul>${quest.comp.map(complication => '<li>' + escapeHtml(complication) + '</li>').join('')}</ul></div>
${rewardHtml(quest)}
<label class="st">Suivi <select data-id="${quest.id}">${statusOptionsHtml(status)}</select></label>
</article>`;
}

function questSearchText(quest) {
  return normalizeText([quest.t, quest.type, quest.lieu, quest.acc, quest.obj, quest.comp.join(' '), quest.bonus || ''].join(' '));
}

function visibleQuests() {
  const searchedText = normalizeText(filters.text);
  return quests.filter(quest => (!filters.tier || quest.tier == filters.tier)
    && (!filters.type || quest.type === filters.type)
    && (!filters.status || questStatus(quest) === filters.status)
    && (!searchedText || questSearchText(quest).includes(searchedText)));
}

function tierSectionHtml(tier, tierQuests) {
  const plural = tierQuests.length > 1 ? 's' : '';
  return `<section class="panel tier k${tier}"><h2>${TIER_LEVELS[tier]}<small>${TIER_NAMES[tier]} · ${tierQuests.length} quête${plural}</small></h2><div class="grid">${tierQuests.map(questCardHtml).join('')}</div></section>`;
}

function renderQuests() {
  const allowed = isGameMasterActive();
  $('#lock').hidden = allowed;
  $('#mj').hidden = !allowed;
  $('#bPrint').hidden = !allowed;
  if (!allowed || !quests.length) return;
  const shown = visibleQuests();
  $('#cnt').textContent = shown.length + ' quête' + (shown.length > 1 ? 's' : '');
  if (!shown.length) {
    $('#tiers').innerHTML = '<section class="panel empty">Aucune quête ne correspond à ces filtres.</section>';
    return;
  }
  $('#tiers').innerHTML = [1, 2, 3, 4].map(tier => {
    const tierQuests = shown.filter(quest => quest.tier === tier);
    return tierQuests.length ? tierSectionHtml(tier, tierQuests) : '';
  }).join('');
}

function selectTierFilter(event) {
  const button = event.target.closest('.f');
  if (!button) return;
  filters.tier = button.dataset.t;
  $$('#ft .f').forEach(tierButton => tierButton.setAttribute('aria-pressed', tierButton === button));
  renderQuests();
}

function changeQuestStatus(event) {
  const questId = event.target.dataset.id;
  if (!questId) return;
  const status = event.target.value;
  if (status === 'libre') delete questStatusById[questId];
  else questStatusById[questId] = status;
  Persos.save();
  showMessage('Suivi enregistré : ' + QUEST_STATUSES[status]);
  event.target.closest('.q').classList.toggle('faite', status === 'faite');
}

function highlightRandomQuest() {
  const candidates = visibleQuests().filter(quest => questStatusById[quest.id] !== 'faite');
  if (!candidates.length) {
    showMessage('Aucune quête disponible avec ces filtres');
    return;
  }
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const quest = candidates[randomValues[0] % candidates.length];
  const card = document.getElementById(quest.id);
  if (!card) return;
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
  card.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  $$('.q.flash').forEach(flashed => flashed.classList.remove('flash'));
  card.classList.add('flash');
  showMessage('Quête tirée : « ' + quest.t + ' »');
}

function applySavedQuestStatuses(saved) {
  const savedStatuses = saved && saved.data && saved.data.suivi;
  questStatusById = savedStatuses && typeof savedStatuses === 'object' ? savedStatuses : {};
  renderQuests();
}

function byTierThenLevelThenReward(first, second) {
  return first.tier - second.tier || minimumLevel(first) - minimumLevel(second) || first.po - second.po;
}

function fillQuestTypeFilter() {
  [...new Set(quests.map(quest => quest.type))].sort((first, second) => first.localeCompare(second, 'fr'))
    .forEach(type => $('#fty').add(new Option(type, type)));
}

async function loadQuests() {
  try {
    quests = (await (await fetch('assets/json/vf/quetes.json')).json()).sort(byTierThenLevelThenReward);
    fillQuestTypeFilter();
    renderQuests();
  } catch (error) {
    $('#tiers').innerHTML = '<section class="panel empty">Impossible de charger les quêtes.</section>';
  }
}

$('#ft').onclick = selectTierFilter;
$('#fty').onchange = event => { filters.type = event.target.value; renderQuests(); };
$('#fst').onchange = event => { filters.status = event.target.value; renderQuests(); };
$('#q').oninput = event => { filters.text = event.target.value; renderQuests(); };
$('#tiers').addEventListener('change', changeQuestStatus);
$('#bRand').onclick = highlightRandomQuest;
$('#bPrint').onclick = () => window.print();
Persos.init({
  part: 'quetes', mount: $('#persos'), msg: showMessage,
  collect: () => ({ version: 1, type: 'quetes-dnd-5e', data: { suivi: questStatusById } }),
  apply: applySavedQuestStatuses, onName: renderQuests
});
loadQuests();
