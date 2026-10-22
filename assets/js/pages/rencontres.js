const DIFFICULTIES = [['Faible', '#2e9e5b'], ['Modérée', '#d8791a'], ['Élevée', '#c8402f']];
const ENCOUNTER_STORAGE_KEY = 'dnd_rencontre_v1';
const MESSAGE_DURATION_MS = 6000;
const MAX_MONSTER_COUNT = 30;
const MAX_SUGGESTIONS = 6;
const MAX_SUGGESTION_ATTEMPTS = 400;
const SUGGESTION_KINDS = ['solo', 'groupe', 'groupe', 'chef', 'chef'];

let encounterState = { g: [], e: [] };
let suggestions = [];
let bestiaryRequested = false;
const openMonsterNames = new Set();

const formatNumber = number => number.toLocaleString('fr-FR');
const notify = text => showMessage(text, MESSAGE_DURATION_MS);

function saveEncounter() {
  try { localStorage.setItem(ENCOUNTER_STORAGE_KEY, JSON.stringify(encounterState)); } catch (error) {}
}

function loadEncounter() {
  try {
    const saved = JSON.parse(localStorage.getItem(ENCOUNTER_STORAGE_KEY));
    if (saved && Array.isArray(saved.g) && Array.isArray(saved.e)) encounterState = saved;
  } catch (error) {}
}

function saveAndRender() {
  saveEncounter();
  renderPage();
}

const levelOptionsHtml = selectedLevel => Array.from({ length: 20 }, (_, index) => `<option${index + 1 === selectedLevel ? ' selected' : ''}>${index + 1}</option>`).join('');
const partyBudgets = () => [0, 1, 2].map(difficulty => encounterState.g.reduce((total, member) => total + Monstres.BUDGET[member.niv][difficulty], 0));
const averagePartyLevel = () => encounterState.g.length ? encounterState.g.reduce((total, member) => total + member.niv, 0) / encounterState.g.length : 1;
const partySize = () => Math.max(1, encounterState.g.length);

function takePartyFromPlayers(quiet) {
  const players = Monstres.joueurs();
  if (!players.length) {
    if (!quiet) notify('Aucun personnage joueur : saisis le groupe dans le suivi de combat ou crée leurs fiches');
    return false;
  }
  encounterState.g = players.map(player => ({ nom: player.nom, niv: player.niveau }));
  return true;
}

function partyMemberHtml(member, index) {
  return `<span class="pj"><input data-i="${index}" data-f="nom" value="${escapeHtml(member.nom)}" aria-label="Nom"><select data-i="${index}" data-f="niv" aria-label="Niveau">${levelOptionsHtml(member.niv)}</select><button data-del="${index}" title="Retirer" aria-label="Retirer ${escapeHtml(member.nom)}">✕</button></span>`;
}

function renderParty() {
  $('#grp').innerHTML = encounterState.g.map(partyMemberHtml).join('') || '<span class="empty">Ajoute au moins un personnage.</span>';
  const budgets = partyBudgets();
  $('#bud').innerHTML = DIFFICULTIES.map(([label, color], difficulty) => `<div style="--k:${color}"><span>Difficulté ${label.toLowerCase()}</span><b>${formatNumber(budgets[difficulty])} PX</b></div>`).join('');
}

function encounterRows() {
  return encounterState.e.map((entry, index) => ({ entry, index, monster: Monstres.get(entry.n) })).filter(row => row.monster);
}

function reachedDifficulty(totalXp, budgets) {
  let reached = -1;
  budgets.forEach((budget, difficulty) => { if (totalXp >= budget) reached = difficulty; });
  return reached;
}

function encounterVerdict(totalXp, budgets) {
  if (totalXp > budgets[2]) return ['Au-delà du budget « élevé » : rencontre potentiellement mortelle', '#8b1e3f'];
  const difficulty = reachedDifficulty(totalXp, budgets);
  if (difficulty < 0) return ['Sous le budget « faible » : rencontre très facile', '#5d6b7a'];
  return ['Difficulté ' + DIFFICULTIES[difficulty][0].toLowerCase(), DIFFICULTIES[difficulty][1]];
}

function encounterWarnings(rows, creatureCount) {
  const averageLevel = averagePartyLevel();
  const players = partySize();
  const warnings = rows.filter(({ monster }) => monster.fpn > averageLevel)
    .map(({ monster }) => `${monster.n} (FP ${monster.fp}) a un FP supérieur au niveau moyen du groupe (${Math.round(averageLevel * 10) / 10}) : ses attaques peuvent mettre un personnage hors de combat d’un seul coup.`);
  if (creatureCount > 2 * players) warnings.push(`${creatureCount} créatures pour ${players} personnage${players > 1 ? 's' : ''} : au-delà de deux par personnage, le combat devient long et plus dangereux que ne l’indique le budget.`);
  return warnings;
}

function monsterRowHtml({ entry, index, monster }) {
  const isOpen = openMonsterNames.has(monster.n);
  const xp = Monstres.xp(monster);
  const quantity = `<span class="qty"><button data-q="${index}" data-d="-1" aria-label="Un de moins">−</button><b>${entry.q}</b><button data-q="${index}" data-d="1" aria-label="Un de plus">+</button></span>`;
  const row = `<tr><td style="--c:${Monstres.col(monster)}"><button class="mn" data-open="${escapeHtml(monster.n)}" aria-expanded="${isOpen}">${escapeHtml(monster.n)}</button><small>${escapeHtml(monster.tail)} · ${escapeHtml(monster.typ)} · CA ${escapeHtml(monster.ca)} · PV ${Monstres.pv(monster).moy}</small></td><td class="n hm">${escapeHtml(monster.fp)}</td><td class="n">${formatNumber(xp)}</td><td class="n">${quantity}</td><td class="n"><b>${formatNumber(xp * entry.q)}</b></td></tr>`;
  return row + (isOpen ? `<tr class="det"><td colspan="5">${Monstres.block(monster)}</td></tr>` : '');
}

function totalLineHtml(totalXp, creatureCount) {
  const perCharacter = encounterState.g.length ? ` · ${formatNumber(Math.floor(totalXp / partySize()))} PX par personnage` : '';
  return `<div class="tot">Total : <b>${formatNumber(totalXp)} PX</b> pour ${creatureCount} créature${creatureCount > 1 ? 's' : ''}${perCharacter}</div>`;
}

function gaugeHtml(totalXp, budgets, verdictColor) {
  const scaleMaximum = Math.max(budgets[2] * 1.25, totalXp);
  const percentOfScale = value => Math.min(100, value / scaleMaximum * 100);
  const markers = budgets.map((budget, difficulty) => `<span style="left:${percentOfScale(budget)}%">${DIFFICULTIES[difficulty][0]}</span>`).join('');
  return `<div class="gauge" style="--gc:${verdictColor}"><i style="width:${percentOfScale(totalXp)}%"></i>${markers}</div>`;
}

function renderEncounter() {
  const rows = encounterRows();
  if (!rows.length) {
    $('#enc').innerHTML = '<p class="empty">Aucun monstre pour l’instant. Ajoute-en ci-dessus ou choisis une rencontre proposée plus bas.</p>';
    $('#send').hidden = true;
    return;
  }
  $('#send').hidden = false;
  const budgets = partyBudgets();
  const totalXp = rows.reduce((total, row) => total + Monstres.xp(row.monster) * row.entry.q, 0);
  const creatureCount = rows.reduce((total, row) => total + row.entry.q, 0);
  const [verdictText, verdictColor] = encounterVerdict(totalXp, budgets);
  $('#enc').innerHTML = `<table><thead><tr><th>Monstre</th><th class="n hm">FP</th><th class="n">PX</th><th class="n">Nombre</th><th class="n">Total</th></tr></thead><tbody>${rows.map(monsterRowHtml).join('')}</tbody></table>
  ${totalLineHtml(totalXp, creatureCount)}
  ${gaugeHtml(totalXp, budgets, verdictColor)}
  <div class="verdict" style="--gc:${verdictColor}">${verdictText}</div><div class="warn">${encounterWarnings(rows, creatureCount).map(escapeHtml).join('<br>')}</div>`;
}

function renderPage() {
  const isGameMaster = Monstres.estMJ();
  $('#lock').hidden = isGameMaster;
  $('#mj').hidden = !isGameMaster;
  $('#lComb').hidden = !isGameMaster;
  if (!isGameMaster) return;
  renderParty();
  renderEncounter();
}

function findMonster(searchedText) {
  const searched = Monstres.norm(searchedText);
  if (!searched) return null;
  const bestiary = Monstres.all();
  return bestiary.find(monster => Monstres.norm(monster.n) === searched || Monstres.norm(monster.en) === searched)
    || bestiary.find(monster => Monstres.norm(monster.n).startsWith(searched))
    || bestiary.find(monster => (' ' + monster.idx).includes(' ' + searched))
    || bestiary.find(monster => monster.idx.includes(searched));
}

function addMonsters(name, quantity) {
  const existing = encounterState.e.find(entry => entry.n === name);
  if (existing) existing.q = Math.min(MAX_MONSTER_COUNT, existing.q + quantity);
  else encounterState.e.push({ n: name, q: quantity });
}

function editPartyMember(event) {
  const index = +event.target.dataset.i;
  const field = event.target.dataset.f;
  if (!encounterState.g[index]) return;
  encounterState.g[index][field] = field === 'niv' ? +event.target.value : event.target.value;
  saveAndRender();
}

function removePartyMember(event) {
  const button = event.target.closest('[data-del]');
  if (!button) return;
  encounterState.g.splice(+button.dataset.del, 1);
  saveAndRender();
}

function addPartyMember() {
  const party = encounterState.g;
  const level = party.length ? party[party.length - 1].niv : 1;
  party.push({ nom: 'Personnage ' + (party.length + 1), niv: level });
  saveAndRender();
}

function replacePartyWithPlayers() {
  if (!takePartyFromPlayers()) return;
  saveAndRender();
  notify('Groupe repris des personnages joueurs (niveaux saisis dans le suivi de combat ou sur leur fiche)');
}

function setWholePartyLevel(event) {
  const level = +event.target.value;
  if (!level) return;
  encounterState.g.forEach(member => { member.niv = level; });
  event.target.value = '';
  saveAndRender();
}

function addTypedMonster() {
  const monster = findMonster($('#aM').value);
  if (!monster) {
    notify('Monstre introuvable dans le bestiaire');
    return;
  }
  addMonsters(monster.n, Math.min(MAX_MONSTER_COUNT, Math.max(1, parseInt($('#aQ').value, 10) || 1)));
  $('#aM').value = '';
  $('#aQ').value = 1;
  saveAndRender();
}

function changeMonsterQuantity(button) {
  const index = +button.dataset.q;
  const entry = encounterState.e[index];
  entry.q += +button.dataset.d;
  if (entry.q < 1) encounterState.e.splice(index, 1);
  saveAndRender();
}

function toggleStatBlock(button) {
  const name = button.dataset.open;
  if (openMonsterNames.has(name)) openMonsterNames.delete(name);
  else openMonsterNames.add(name);
  renderPage();
}

function handleEncounterClick(event) {
  const quantityButton = event.target.closest('[data-q]');
  const nameButton = event.target.closest('[data-open]');
  if (quantityButton) changeMonsterQuantity(quantityButton);
  else if (nameButton) toggleStatBlock(nameButton);
}

function clearEncounter() {
  encounterState.e = [];
  openMonsterNames.clear();
  saveAndRender();
}

function sendToCombatTracker() {
  if (!encounterState.e.length) return;
  const hitPointMode = $('#pvMode').value;
  if (!Monstres.envoyer(encounterState.e.map(entry => ({ n: entry.n, q: entry.q, mode: hitPointMode })))) {
    notify('Impossible d’enregistrer la rencontre dans ce navigateur');
    return;
  }
  location.href = 'suivi-combat.html';
}

function monstersWorthXpBetween(pool, minimumXp, maximumXp) {
  return pool.filter(monster => {
    const xp = Monstres.xp(monster);
    return xp >= minimumXp && xp <= maximumXp;
  });
}

function soloSuggestion(pool, budget) {
  const candidates = monstersWorthXpBetween(pool, budget * 0.6, budget);
  return candidates.length ? { t: 'Un seul adversaire', l: [[randomItem(candidates), 1]] } : null;
}

function bandSuggestion(pool, budget, maximumCount) {
  const count = 2 + cryptoRandomBelow(maximumCount - 1);
  const candidates = monstersWorthXpBetween(pool, budget * 0.6 / count, budget / count);
  return candidates.length ? { t: 'Une bande', l: [[randomItem(candidates), count]] } : null;
}

function leaderWithMinionsSuggestion(pool, budget, maximumCount) {
  const leaders = monstersWorthXpBetween(pool, budget * 0.35, budget * 0.65);
  if (!leaders.length) return null;
  const leader = randomItem(leaders);
  const remainingBudget = budget - Monstres.xp(leader);
  const minionCount = 2 + cryptoRandomBelow(Math.max(1, Math.min(6, maximumCount) - 1));
  let minions = monstersWorthXpBetween(pool, remainingBudget * 0.5 / minionCount, remainingBudget / minionCount).filter(monster => monster !== leader);
  const minionsOfLeaderType = minions.filter(monster => Monstres.tbase(monster) === Monstres.tbase(leader));
  if (minionsOfLeaderType.length) minions = minionsOfLeaderType;
  return minions.length ? { t: 'Un chef et ses sbires', l: [[leader, 1], [randomItem(minions), minionCount]] } : null;
}

function suggestionOfKind(kind, pool, budget, maximumCount) {
  if (kind === 'solo') return soloSuggestion(pool, budget);
  if (kind === 'groupe') return bandSuggestion(pool, budget, maximumCount);
  return leaderWithMinionsSuggestion(pool, budget, maximumCount);
}

function suggestionPool(creatureType, environment) {
  return Monstres.all().filter(monster => Monstres.xp(monster) >= 10 && (!creatureType || Monstres.tbase(monster) === creatureType) && (!environment || monster.v === environment));
}

function generateSuggestions(budget, pool) {
  const found = [];
  const seenCombinations = new Set();
  const maximumCount = Math.min(8, 2 * partySize());
  for (let attempt = 0; attempt < MAX_SUGGESTION_ATTEMPTS && found.length < MAX_SUGGESTIONS; attempt++) {
    const suggestion = suggestionOfKind(randomItem(SUGGESTION_KINDS), pool, budget, maximumCount);
    if (!suggestion) continue;
    const combination = suggestion.l.map(([monster, count]) => monster.n + count).join('|');
    if (seenCombinations.has(combination)) continue;
    seenCombinations.add(combination);
    suggestion.px = suggestion.l.reduce((total, [monster, count]) => total + Monstres.xp(monster) * count, 0);
    if (suggestion.px > budget) continue;
    found.push(suggestion);
  }
  return found;
}

function suggestionHtml(suggestion, index, budget, color) {
  const monsters = suggestion.l.map(([monster, count]) => `<li>${count > 1 ? count + ' × ' : ''}<b>${escapeHtml(monster.n)}</b> <small>(FP ${escapeHtml(monster.fp)}, ${formatNumber(Monstres.xp(monster))} PX)</small></li>`).join('');
  return `<div class="sug" style="--k:${color}"><h3>${escapeHtml(suggestion.t)}</h3><ul>${monsters}</ul><div class="px">${formatNumber(suggestion.px)} PX sur un budget de ${formatNumber(budget)}</div><button class="b" data-sug="${index}">Utiliser cette rencontre</button></div>`;
}

function proposeEncounters() {
  const difficulty = +$('#sD').value;
  const budget = partyBudgets()[difficulty];
  if (!encounterState.g.length) {
    notify('Ajoute d’abord les personnages du groupe');
    return;
  }
  suggestions = generateSuggestions(budget, suggestionPool($('#sT').value, $('#sV').value));
  $('#sugs').innerHTML = suggestions.length
    ? suggestions.map((suggestion, index) => suggestionHtml(suggestion, index, budget, DIFFICULTIES[difficulty][1])).join('')
    : '<p class="empty">Aucune combinaison trouvée avec ces filtres : essaie un autre type de créature ou une autre difficulté.</p>';
}

function useSuggestion(event) {
  const button = event.target.closest('[data-sug]');
  if (!button) return;
  const suggestion = suggestions[+button.dataset.sug];
  encounterState.e = suggestion.l.map(([monster, count]) => ({ n: monster.n, q: count }));
  openMonsterNames.clear();
  saveAndRender();
  $('#enc').scrollIntoView({ behavior: 'smooth', block: 'center' });
  notify('Rencontre reprise : ajuste-la si besoin, puis lance le combat');
}

function fillBestiaryLists(bestiary) {
  $('#dlM').innerHTML = bestiary.map(monster => `<option value="${escapeHtml(monster.n)}">FP ${escapeHtml(monster.fp)} · ${escapeHtml(monster.typ)}</option>`).join('');
  const creatureTypes = [...new Set(bestiary.map(Monstres.tbase))].sort((first, second) => first.localeCompare(second, 'fr'));
  $('#sT').innerHTML = '<option value="">Tous</option>' + creatureTypes.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type[0].toUpperCase() + type.slice(1))}</option>`).join('');
}

function startForGameMaster() {
  renderPage();
  if (bestiaryRequested || !Monstres.estMJ()) return;
  bestiaryRequested = true;
  if (!encounterState.g.length && !takePartyFromPlayers(true)) encounterState.g = [1, 2, 3, 4].map(number => ({ nom: 'Personnage ' + number, niv: 1 }));
  saveEncounter();
  Monstres.load().then(bestiary => {
    fillBestiaryLists(bestiary);
    renderPage();
  }).catch(() => notify('Impossible de charger le bestiaire (bestiaire.json)'));
}

$('#grp').addEventListener('change', editPartyMember);
$('#grp').addEventListener('click', removePartyMember);
$('#bAddPJ').onclick = addPartyMember;
$('#bPJ').onclick = replacePartyWithPlayers;
$('#allLvl').innerHTML += levelOptionsHtml(0);
$('#allLvl').onchange = setWholePartyLevel;
$('#bAdd').onclick = addTypedMonster;
$('#aM').addEventListener('keydown', event => { if (event.key === 'Enter') $('#bAdd').click(); });
$('#enc').addEventListener('click', handleEncounterClick);
$('#bClear').onclick = clearEncounter;
$('#bSend').onclick = sendToCombatTracker;
$('#bSug').onclick = proposeEncounters;
$('#sugs').addEventListener('click', useSuggestion);

loadEncounter();
Persos.init({ part: 'rencontres', mount: $('#persos'), msg: notify, collect: () => null, apply: startForGameMaster, onName: startForGameMaster });
