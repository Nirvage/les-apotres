const DIFFICULTIES = [['Faible', '#2e9e5b'], ['Modérée', '#d8791a'], ['Élevée', '#c8402f']];
const MAX_ENCOUNTER_ATTEMPTS = 300;
const ENCOUNTER_KINDS = ['solo', 'bande', 'chef', 'chef'];

const DIFFICULTY_CLASSES = [['Très facile', '5'], ['Facile', '10'], ['Moyenne', '15'], ['Difficile', '20'], ['Très difficile', '25'], ['Presque impossible', '30']];
const ACTIONS = [['Attaquer', 'une attaque d’arme ou à mains nues (dégâts, agripper ou pousser)'], ['Magie', 'lancer un sort, utiliser un objet magique'],
  ['Foncer', 'déplacement en plus égal à la Vitesse'], ['Se désengager', 'pas d’attaque d’opportunité ce tour'],
  ['Esquiver', 'attaques contre soi à désavantage, avantage aux sauvegardes de Dex'], ['Aider', 'avantage à un allié (test ou prochaine attaque contre un ennemi à 1,5 m)'],
  ['Se cacher', 'Discrétion DD 15 hors de vue : devient invisible'], ['Chercher', 'Sagesse (Perception, Intuition, Médecine, Survie)'],
  ['Étudier', 'Intelligence (Arcanes, Histoire, Investigation, Nature, Religion)'], ['Influencer', 'Charisme ou Sagesse (Dressage) pour changer une attitude'],
  ['Utiliser un objet', 'objet non magique, deuxième interaction'], ['Se tenir prêt', 'une action déclenchée plus tard par la réaction']];
const CONDITIONS = [['À terre', 'ramper ; se relever = ½ Vitesse ; ses attaques à désavantage ; contre lui : avantage à 1,5 m, désavantage au-delà'],
  ['Agrippé', 'Vitesse 0 ; désavantage contre les autres cibles ; sortie : For (Athlétisme) ou Dex (Acrobaties) contre 8 + For + maîtrise'],
  ['Assourdi', 'rate les tests liés à l’ouïe'], ['Aveuglé', 'rate les tests liés à la vue ; ses attaques à désavantage, contre lui avantage'],
  ['Charmé', 'ne peut pas nuire au charmeur ; avantage social pour le charmeur'], ['Effrayé', 'source en vue : tests et attaques à désavantage ; ne peut pas s’en approcher'],
  ['Empoisonné', 'attaques et tests à désavantage'], ['Entravé', 'Vitesse 0 ; ses attaques à désavantage, contre lui avantage ; désavantage en sauvegarde de Dex'],
  ['Épuisement', 'par niveau : −2 aux tests d20 et −1,5 m de Vitesse ; mort au niveau 6 ; −1 niveau par repos long'],
  ['Étourdi', 'neutralisé ; échec auto. sauvegardes For et Dex ; contre lui avantage'],
  ['Inconscient', 'neutralisé, à terre, Vitesse 0 ; échec For et Dex ; contre lui avantage, critique à 1,5 m'],
  ['Invisible', 'avantage à l’initiative et à ses attaques ; contre lui désavantage'],
  ['Neutralisé', 'ni action, ni action bonus, ni réaction ; concentration rompue ; ne parle pas'],
  ['Paralysé', 'neutralisé, Vitesse 0 ; échec For et Dex ; contre lui avantage, critique à 1,5 m'],
  ['Pétrifié', 'neutralisé, Vitesse 0 ; échec For et Dex ; contre lui avantage ; résistance à tous les dégâts']];
const COMBAT_RULES = [['Abri partiel', '+2 CA et sauvegardes de Dex'], ['Abri important', '+5 CA et sauvegardes de Dex'], ['Abri total', 'pas ciblable directement'],
  ['Concentration', 'sauvegarde de Con DD 10 ou ½ dégâts (max. 30)'], ['Coup critique', '20 naturel : tous les dés de dégâts lancés deux fois'],
  ['Attaque à distance', 'désavantage si un ennemi est à 1,5 m ou au-delà de la portée normale'],
  ['Jets contre la mort', 'd20 au début du tour : 10+ réussite ; 3 réussites stable, 3 échecs mort ; 1 = deux échecs, 20 = 1 PV'],
  ['Stabiliser', 'Médecine DD 10 ou trousse de soins ; 1 PV au bout de 1d4 heures'],
  ['Chute', '1d6 par 3 m (max. 20d6), à terre'], ['Souffle', '1 + mod. Con minutes, puis mod. Con rounds (min. 1), puis 0 PV'],
  ['Surprise', 'désavantage à l’initiative']];
const IMPROVISED_DAMAGE = [['1 à 4', '1d10', '2d10', '4d10'], ['5 à 10', '2d10', '4d10', '10d10'], ['11 à 16', '4d10', '10d10', '18d10'], ['17 à 20', '10d10', '18d10', '24d10']];
const COMMON_PRICES = [['Chope de bière', '4 pc'], ['Repas modeste / confortable', '3 pa / 5 pa'], ['Chambre modeste / confortable', '5 pa / 8 pa'],
  ['Train de vie modeste / aisé (jour)', '1 po / 4 po'], ['Ouvrier / artisan qualifié (jour)', '2 pa / 2 po'],
  ['Sort niv. 1 / 2 / 3', '50 / 200 / 300 po'], ['Potion de soins', '50 po'], ['Objet peu courant / rare', '400 / 4 000 po'], ['Très rare / légendaire', '40 000 / 200 000 po']];
const TRAVEL_PACES = [['Rapide', '48 km/jour', '−5 Perception passive'], ['Normale', '36 km/jour', ''], ['Lente', '24 km/jour', 'Discrétion possible']];
const REST_RULES = [['Repos court', '1 h : dépenser des dés de vie'], ['Repos long', '8 h (6 de sommeil), un par 24 h : tous les PV, la moitié des DV, −1 épuisement'],
  ['Marche forcée', 'au-delà de 8 h : sauvegarde de Con DD 10 + 1 par heure ou épuisement'], ['Nourriture et eau', '500 g et 4 l par jour']];

const EMPTY_SCREEN_STATE = { lvl: 0, np: 0, tir: null };
let screenState = Object.assign({}, EMPTY_SCREEN_STATE);

const formatNumber = number => number.toLocaleString('fr-FR');
const signed = number => (number >= 0 ? '+' : '−') + Math.abs(number);

function partyMembers() {
  return Monstres.joueurs().map(player => ({ nom: player.nom, cl: player.cl || '', niv: player.niveau, pv: player.pvmax, ca: player.ca, init: player.init, pp: player.pp }));
}

function averagePartyLevel(party) {
  return party.length ? Math.round(party.reduce((total, member) => total + member.niv, 0) / party.length) : 1;
}

const partyLevel = () => screenState.lvl || averagePartyLevel(partyMembers());
const playerCount = () => screenState.np || partyMembers().length || 4;

function monstersWorthXpBetween(pool, minimumXp, maximumXp) {
  return pool.filter(monster => {
    const xp = Monstres.xp(monster);
    return xp >= minimumXp && xp <= maximumXp;
  });
}

function soloEncounter(pool, budget) {
  const candidates = monstersWorthXpBetween(pool, budget * 0.6, budget);
  return candidates.length ? { t: 'Un adversaire seul', l: [[randomItem(candidates), 1]] } : null;
}

function bandEncounter(pool, budget, maximumCount) {
  const count = 2 + cryptoRandomBelow(maximumCount - 1);
  const candidates = monstersWorthXpBetween(pool, budget * 0.6 / count, budget / count);
  return candidates.length ? { t: 'Une bande', l: [[randomItem(candidates), count]] } : null;
}

function leaderWithMinionsEncounter(pool, budget, maximumCount) {
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

function encounterOfKind(kind, pool, budget, maximumCount) {
  if (kind === 'solo') return soloEncounter(pool, budget);
  if (kind === 'bande') return bandEncounter(pool, budget, maximumCount);
  return leaderWithMinionsEncounter(pool, budget, maximumCount);
}

const encounterXp = groups => groups.reduce((total, [monster, count]) => total + Monstres.xp(monster) * count, 0);

function randomEncounter(budget, players) {
  const pool = Monstres.all().filter(monster => Monstres.xp(monster) >= 10);
  const maximumCount = Math.min(8, 2 * players);
  for (let attempt = 0; attempt < MAX_ENCOUNTER_ATTEMPTS; attempt++) {
    const encounter = encounterOfKind(randomItem(ENCOUNTER_KINDS), pool, budget, maximumCount);
    if (!encounter) continue;
    const xp = encounterXp(encounter.l);
    if (xp > budget) continue;
    return { t: encounter.t, px: xp, l: encounter.l.map(([monster, count]) => ({ n: monster.n, q: count })) };
  }
  return null;
}

function drawEncounters() {
  screenState.tir = [0, 1, 2].map(difficulty => randomEncounter(Monstres.BUDGET[partyLevel()][difficulty] * playerCount(), playerCount()));
  Persos.save();
  renderScreen();
}

function drawEncountersWhenBestiaryLoaded() {
  if (Monstres.all().length) drawEncounters();
}

const panelHtml = (title, color, body, note) => `<section class="panel box" style="--k:${color}"><h2>${escapeHtml(title)}</h2>${note ? '<p>' + escapeHtml(note) + '</p>' : ''}${body}</section>`;

function tableHtml(columns, rows, numericColumns = []) {
  const cellClass = index => numericColumns.includes(index) ? ' class="n"' : '';
  const header = columns.map((column, index) => `<th${cellClass(index)}>${escapeHtml(column)}</th>`).join('');
  const body = rows.map(row => '<tr>' + row.map((cell, index) => `<td${cellClass(index)}>${escapeHtml(cell)}</td>`).join('') + '</tr>').join('');
  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

const definitionListHtml = rows => '<dl>' + rows.map(([term, definition]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(definition)}</dd>`).join('') + '</dl>';

function numberOptionsHtml(count, selectedValue) {
  return Array.from({ length: count }, (_, index) => `<option value="${index + 1}"${index + 1 === selectedValue ? ' selected' : ''}>${index + 1}</option>`).join('');
}

function partyPanelBody(party) {
  if (!party.length) return '<p class="vide">Aucun personnage joueur : saisis le groupe dans le <a href="suivi-combat.html">suivi de combat</a> (ou crée leurs fiches depuis l’accueil).</p>';
  const rows = party.map(member => [member.nom + (member.cl ? ' (' + member.cl + ')' : ''), member.niv, member.ca ?? '–', member.pv || '–', member.init == null ? '–' : signed(member.init), member.pp ?? '–']);
  return tableHtml(['Personnage', 'Niv', 'CA', 'PV', 'Init', 'Perc'], rows, [1, 2, 3, 4, 5]);
}

function encounterGroupHtml(group) {
  const monster = Monstres.get(group.n);
  const stats = monster ? ` <small>(FP ${escapeHtml(monster.fp)}, CA ${Monstres.ca(monster)}, ${Monstres.pv(monster).moy} PV)</small>` : '';
  return (group.q > 1 ? group.q + ' × ' : '') + '<b>' + escapeHtml(group.n) + '</b>' + stats;
}

function encounterHtml(encounter, difficulty) {
  const [label, color] = DIFFICULTIES[difficulty];
  const content = encounter
    ? escapeHtml(encounter.t) + ' : ' + encounter.l.map(encounterGroupHtml).join(' + ') + ` <small>· ${formatNumber(encounter.px)} PX</small>`
    : '<small>rien trouvé dans ce budget</small>';
  return `<div class="renc" style="--c:${color}"><b class="t">${label}</b>${content}</div>`;
}

function encountersPanelBody() {
  return screenState.tir ? screenState.tir.map(encounterHtml).join('') : '<p class="vide">Le bestiaire charge…</p>';
}

function budgetPanelHtml(level, players) {
  const budget = Monstres.BUDGET[level];
  const rows = DIFFICULTIES.map(([label], difficulty) => [label, formatNumber(budget[difficulty]), formatNumber(budget[difficulty] * players)]);
  const note = `Niveau ${level}, ${players} joueur${players > 1 ? 's' : ''}. Additionne les PX des monstres (règles 2024, pas de multiplicateur).`;
  return panelHtml('Budget de rencontre', '#7a4fc4', tableHtml(['Difficulté', 'Par perso', 'Groupe'], rows, [1, 2]), note);
}

function referencePanelsHtml() {
  return [
    panelHtml('Degrés de difficulté', '#2a3170', tableHtml(['Difficulté', 'DD'], DIFFICULTY_CLASSES, [1])),
    panelHtml('Actions', '#8e3a9d', definitionListHtml(ACTIONS), 'Par tour : un déplacement, une action, une action bonus si une règle la donne, une réaction par round.'),
    panelHtml('États', '#6b7280', definitionListHtml(CONDITIONS)),
    panelHtml('Combat', '#c8402f', definitionListHtml(COMBAT_RULES)),
    panelHtml('Dégâts improvisés', '#5c4a1e', tableHtml(['Niveaux', 'Gênant', 'Dangereux', 'Mortel'], IMPROVISED_DAMAGE, [1, 2, 3]), 'Pièges, chutes de pierres, lave… Repères du Guide du maître. DD de sauvegarde : 10-11 gênant, 12-15 dangereux, 16-20 mortel.'),
    panelHtml('Voyage et repos', '#9c3d8f', tableHtml(['Allure', 'Distance', ''], TRAVEL_PACES) + definitionListHtml(REST_RULES)),
    panelHtml('Prix courants', '#7a5600', tableHtml(['Article', 'Prix'], COMMON_PRICES, [1]))
  ];
}

function showOnlyForGameMaster(isGameMaster) {
  $('#lock').hidden = isGameMaster;
  $('#mj').hidden = !isGameMaster;
  $('#bPrint').hidden = !isGameMaster;
}

function renderScreen() {
  const isGameMaster = Monstres.estMJ();
  showOnlyForGameMaster(isGameMaster);
  if (!isGameMaster) return;
  const level = partyLevel();
  const players = playerCount();
  $('#sLvl').innerHTML = numberOptionsHtml(20, level);
  $('#sNp').innerHTML = numberOptionsHtml(8, players);
  $('#ecran').innerHTML = [
    panelHtml('Le groupe', '#2f6fd0', partyPanelBody(partyMembers())),
    budgetPanelHtml(level, players),
    panelHtml('Rencontres rapides', '#8b1e3f', encountersPanelBody()),
    ...referencePanelsHtml()
  ].join('');
}

function changeScreenSetting(key, value) {
  screenState[key] = value;
  screenState.tir = null;
  Persos.save();
  renderScreen();
  drawEncountersWhenBestiaryLoaded();
}

function loadEncountersForGameMaster() {
  Monstres.load()
    .then(() => screenState.tir ? renderScreen() : drawEncounters())
    .catch(() => showMessage('Bestiaire indisponible'));
}

function applySavedScreen(savedState) {
  screenState = Object.assign({}, EMPTY_SCREEN_STATE, savedState || {});
  renderScreen();
  if (Monstres.estMJ()) loadEncountersForGameMaster();
}

$('#sLvl').onchange = event => changeScreenSetting('lvl', +event.target.value);
$('#sNp').onchange = event => changeScreenSetting('np', +event.target.value);
$('#bTir').onclick = drawEncountersWhenBestiaryLoaded;
$('#bPrint').onclick = () => window.print();
Persos.init({ part: 'ecranmj', mount: $('#persos'), msg: showMessage, collect: () => screenState, apply: applySavedScreen, onName: () => applySavedScreen(screenState) });
