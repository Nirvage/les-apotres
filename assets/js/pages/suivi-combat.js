const CONDITIONS = [
  ['À terre', 'Ne se déplace qu’en rampant ou en se relevant (moitié de sa vitesse). Désavantage à ses attaques. Les attaques contre lui ont l’avantage à 1,5 m ou moins, le désavantage au-delà.'],
  ['Agrippé', 'Vitesse 0. Désavantage aux attaques contre toute autre cible que celui qui l’agrippe. Peut être déplacé avec lui. S’échapper : action, test de Force (Athlétisme) ou de Dextérité (Acrobaties) contre le DD d’évasion.'],
  ['Assourdi', 'N’entend rien et rate automatiquement les tests qui reposent sur l’ouïe.'],
  ['Aveuglé', 'Ne voit rien et rate automatiquement les tests qui reposent sur la vue. Désavantage à ses attaques, avantage aux attaques contre lui.'],
  ['Charmé', 'Ne peut pas attaquer le charmeur ni le cibler avec des effets nuisibles. Le charmeur a l’avantage aux tests d’interaction sociale avec lui.'],
  ['Effrayé', 'Désavantage aux tests et aux attaques tant que la source de sa peur est en vue. Ne peut pas s’en approcher volontairement.'],
  ['Empoisonné', 'Désavantage aux jets d’attaque et aux tests de caractéristique.'],
  ['Entravé', 'Vitesse 0. Désavantage à ses attaques et aux jets de sauvegarde de Dextérité, avantage aux attaques contre lui.'],
  ['Épuisement', 'Niveaux 1 à 6 : −2 par niveau à tous les tests d20, vitesse −1,5 m par niveau. Mort au niveau 6. Un repos long retire un niveau.'],
  ['Étourdi', 'Neutralisé. Rate automatiquement les jets de sauvegarde de Force et de Dextérité. Avantage aux attaques contre lui.'],
  ['Inconscient', 'Neutralisé et à terre, lâche ce qu’il tient, vitesse 0. Rate automatiquement les sauvegardes de Force et de Dextérité. Avantage aux attaques contre lui ; une attaque qui le touche à 1,5 m ou moins est un coup critique.'],
  ['Invisible', 'Avantage à l’initiative. Les effets qui demandent de le voir ne l’affectent pas. Avantage à ses attaques, désavantage aux attaques contre lui (sauf si l’attaquant le voit).'],
  ['Neutralisé', 'Ni action, ni action bonus, ni réaction. Sa concentration est rompue, il ne peut pas parler. Désavantage à l’initiative.'],
  ['Paralysé', 'Neutralisé, vitesse 0. Rate automatiquement les sauvegardes de Force et de Dextérité. Avantage aux attaques contre lui ; une attaque qui le touche à 1,5 m ou moins est un coup critique.'],
  ['Pétrifié', 'Changé en pierre : neutralisé, vitesse 0, résistance à tous les dégâts, immunisé contre le poison. Rate automatiquement les sauvegardes de Force et de Dextérité. Avantage aux attaques contre lui.']
];
const CONDITION_DESCRIPTIONS = Object.fromEntries(CONDITIONS);
const CONCENTRATION_RULE = 'Quand une créature qui se concentre subit des dégâts : jet de sauvegarde de Constitution, DD 10 ou la moitié des dégâts si c’est plus (maximum 30). Rompue aussi si elle est neutralisée ou meurt.';
const EXHAUSTION = 'Épuisement';
const UNCONSCIOUS = 'Inconscient';
const MAX_EXHAUSTION = 6;
const MAX_MONSTERS_PER_ADD = 30;
const COMBAT_STORAGE_KEY = 'dnd_combat_v1';
const CHARACTERS_STORAGE_KEY = 'dnd_persos_v1';
const PARTY_STORAGE_KEY = 'dnd_groupe_v1';
const MESSAGE_DURATION_MS = 6000;
const PARTY_MAIN_FIELDS = [['niveau', 'Niveau'], ['ca', 'CA'], ['pvmax', 'PV max']];
const ABILITY_LABELS = { for: 'FOR', dex: 'DEX', con: 'CON', int: 'INT', sag: 'SAG', cha: 'CHA' };
const HIT_POINT_PROMPTS = { deg: 'Combien de dégâts subit ', soin: 'Combien de PV rend-on à ', ptmp: 'Combien de PV temporaires reçoit ' };

let combat = { round: 1, tour: null, list: [] };
let bestiaryRequested = false;
const openStatBlocks = new Set();
const openConditionPalettes = new Set();
const lastHitPointChange = {};

const notify = text => showMessage(text, MESSAGE_DURATION_MS);
const signed = number => (number >= 0 ? '+' : '−') + Math.abs(number);
const plural = count => count > 1 ? 's' : '';
const newCombatantId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const rollD20 = () => 1 + Monstres.rnd(20);
const combatantById = id => combat.list.find(combatant => combatant.id === id);
const isPlayerSide = combatant => combatant.type === 'pj' || combatant.type === 'fam';
const isOutOfFight = combatant => (combatant.type === 'm' || combatant.type === 'fam') && combatant.pv <= 0;
const monsterOf = combatant => combatant.type === 'm' ? Monstres.get(combatant.m) : null;
const monsterXp = combatant => Monstres.get(combatant.m) ? Monstres.xp(Monstres.get(combatant.m)) : 0;
const formatNumber = number => number.toLocaleString('fr-FR');

function saveCombat() {
  try { localStorage.setItem(COMBAT_STORAGE_KEY, JSON.stringify(combat)); } catch (error) {}
}

function loadCombat() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMBAT_STORAGE_KEY));
    if (saved && Array.isArray(saved.list)) combat = saved;
  } catch (error) {}
}

function saveAndRender() {
  saveCombat();
  renderCombat();
}

function initiativeOrder() {
  return combat.list.map((combatant, index) => [combatant, index])
    .sort(([first, firstIndex], [second, secondIndex]) => ((second.init ?? -99) - (first.init ?? -99)) || ((second.ib || 0) - (first.ib || 0)) || (firstIndex - secondIndex))
    .map(([combatant]) => combatant);
}

function combatantColor(combatant) {
  if (combatant.type === 'pj') return '#2e9e5b';
  if (combatant.type === 'fam') return '#12968f';
  return combatant.type === 'm' && Monstres.get(combatant.m) ? Monstres.col(Monstres.get(combatant.m)) : '#5d6b7a';
}

function highestNumberUsed(sameMonsters, monsterName) {
  return sameMonsters.length ? Math.max(...sameMonsters.map(combatant => parseInt(combatant.nom.replace(monsterName, ''), 10) || 1)) : 0;
}

function addMonsters(monster, quantity, hitPointMode) {
  const sameMonsters = combat.list.filter(combatant => combatant.m === monster.n);
  let number = highestNumberUsed(sameMonsters, monster.n);
  const needsNumbers = quantity > 1 || sameMonsters.length > 0;
  if (sameMonsters.length === 1 && sameMonsters[0].nom === monster.n) {
    sameMonsters[0].nom = monster.n + ' 1';
    number = 1;
  }
  for (let added = 0; added < quantity; added++) {
    const hitPoints = hitPointMode === 'de' ? Monstres.rollPV(monster) : Monstres.pv(monster).moy;
    const initiativeBonus = Monstres.init(monster);
    const id = newCombatantId();
    combat.list.push({ id, type: 'm', m: monster.n, nom: needsNumbers ? monster.n + ' ' + (++number) : monster.n, init: rollD20() + initiativeBonus, ib: initiativeBonus, ca: Monstres.ca(monster), pv: hitPoints, pvmax: hitPoints, tmp: 0, et: {}, conc: false, note: '' });
  }
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

function addTypedMonsters() {
  const monster = findMonster($('#aM').value);
  if (!monster) {
    notify('Monstre introuvable dans le bestiaire');
    return;
  }
  const quantity = Math.min(MAX_MONSTERS_PER_ADD, Math.max(1, parseInt($('#aQ').value, 10) || 1));
  addMonsters(monster, quantity, $('#aP').value);
  $('#aM').value = '';
  $('#aQ').value = 1;
  saveAndRender();
  notify(quantity + ' × ' + monster.n + ' ajouté' + plural(quantity) + ', initiative lancée');
}

function optionalNumberInput(selector) {
  const value = parseInt($(selector).value, 10);
  return isNaN(value) ? null : value;
}

function addOtherCombatant() {
  const name = $('#oN').value.trim();
  if (!name) {
    notify('Donne un nom au combattant');
    return;
  }
  const hitPoints = optionalNumberInput('#oP') || 0;
  combat.list.push({ id: newCombatantId(), type: 'autre', m: '', nom: name, init: optionalNumberInput('#oI'), ib: 0, ca: optionalNumberInput('#oC'), pv: hitPoints, pvmax: hitPoints, tmp: 0, et: {}, conc: false, note: '' });
  ['#oN', '#oI', '#oC', '#oP'].forEach(selector => { $(selector).value = ''; });
  saveAndRender();
}

function addPlayerCharacters() {
  const players = Monstres.joueurs();
  const present = new Set(combat.list.filter(combatant => combatant.type === 'pj').map(combatant => combatant.nom));
  const missing = players.filter(player => !present.has(player.nom));
  if (!players.length) {
    $('#grp').open = true;
    notify('Aucun personnage joueur : saisis le groupe en haut de la page');
    return;
  }
  if (!missing.length) {
    notify('Les personnages joueurs sont déjà dans le combat');
    return;
  }
  missing.forEach(player => combat.list.push({ id: newCombatantId(), type: 'pj', m: '', nom: player.nom, init: null, ib: player.init, ca: player.ca, pp: player.pp, pv: player.pv || player.pvmax, pvmax: player.pvmax, tmp: 0, et: {}, conc: false, note: '' }));
  saveAndRender();
  notify(missing.length + ' personnage' + plural(missing.length) + ' ajouté' + plural(missing.length) + ' : saisis leur jet d’initiative');
}

function savedCharacters() {
  try { return JSON.parse(localStorage.getItem(CHARACTERS_STORAGE_KEY)); } catch (error) { return undefined; }
}

function companionCombatant(familiar, owner) {
  const maximum = parseInt(familiar.pvmax, 10) || 0;
  const hitPoints = parseInt(familiar.pv, 10);
  const armorClass = parseInt(familiar.ca, 10);
  const initiativeBonus = parseInt(String(familiar.init || '').replace('−', '-'), 10);
  const name = (familiar.surnom || familiar.n) + ' (' + owner.nom + ')';
  return { id: newCombatantId(), type: 'fam', m: '', fm: familiar.n, pj: owner.nom, nom: name, init: null, ib: isNaN(initiativeBonus) ? 0 : initiativeBonus, ca: isNaN(armorClass) ? null : armorClass, pv: isNaN(hitPoints) ? maximum : hitPoints, pvmax: maximum, tmp: parseInt(familiar.tmp, 10) || 0, et: {}, conc: false, note: '' };
}

function missingCompanions(present) {
  const store = savedCharacters();
  const missing = [];
  (store && Array.isArray(store.ordre) ? store.ordre : []).forEach(id => {
    const owner = store.persos[id];
    if (!owner || String(owner.nom).trim().toLowerCase() === 'mj') return;
    ((owner.familiers && owner.familiers.data && owner.familiers.data.familiers) || []).forEach(familiar => {
      if (!familiar || typeof familiar !== 'object') return;
      const name = (familiar.surnom || familiar.n) + ' (' + owner.nom + ')';
      if (!present.has(name)) missing.push(companionCombatant(familiar, owner));
    });
  });
  return missing;
}

function addCompanions() {
  const present = new Set(combat.list.filter(combatant => combatant.type === 'fam').map(combatant => combatant.nom));
  const missing = missingCompanions(present);
  if (!missing.length) {
    notify(present.size ? 'Les familiers et montures sont déjà dans le combat' : 'Aucun familier ni monture : les joueurs les choisissent dans la page des familiers');
    return;
  }
  combat.list.push(...missing);
  saveAndRender();
  notify(missing.length + ' créature' + plural(missing.length) + ' ajoutée' + plural(missing.length) + ' : saisis leur initiative (un compagnon ou une monture contrôlée agit au tour de son maître)');
}

function rollPlayerInitiatives() {
  const waiting = combat.list.filter(combatant => isPlayerSide(combatant) && combatant.init == null);
  if (!waiting.length) {
    notify(combat.list.some(combatant => combatant.type === 'pj') ? 'Toutes les initiatives des personnages sont déjà saisies' : 'Ajoute d’abord les personnages joueurs');
    return;
  }
  waiting.forEach(combatant => { combatant.init = rollD20() + (combatant.ib || 0); });
  saveAndRender();
  notify('Initiative lancée pour ' + waiting.map(combatant => combatant.nom).join(', '));
}

function rerollMonsterInitiatives() {
  combat.list.forEach(combatant => { if (combatant.type === 'm') combatant.init = rollD20() + combatant.ib; });
  saveAndRender();
  notify('Initiative des monstres relancée');
}

function clearLastHitPointChanges() {
  for (const id in lastHitPointChange) delete lastHitPointChange[id];
}

function startNewCombat() {
  if (combat.list.length && !confirm('Nouveau combat : les monstres et autres combattants sont retirés, les personnages joueurs et leurs familiers restent (initiative à ressaisir). Continuer ?')) return;
  combat.list = combat.list.filter(isPlayerSide);
  combat.list.forEach(combatant => {
    combatant.init = null;
    combatant.conc = false;
  });
  combat.round = 1;
  combat.tour = null;
  openStatBlocks.clear();
  openConditionPalettes.clear();
  clearLastHitPointChanges();
  saveAndRender();
}

function moveTurn(order, direction) {
  let index = order.findIndex(combatant => combatant.id === combat.tour);
  if (index < 0) {
    combat.tour = order[0].id;
    if (combat.round < 1) combat.round = 1;
    return;
  }
  index += direction;
  if (index >= order.length) {
    index = 0;
    combat.round++;
  }
  if (index < 0) {
    if (combat.round > 1) {
      index = order.length - 1;
      combat.round--;
    } else index = 0;
  }
  combat.tour = order[index].id;
}

function stepTurn(direction) {
  const order = initiativeOrder().filter(combatant => !isOutOfFight(combatant));
  if (!order.length) return;
  moveTurn(order, direction);
  saveAndRender();
  const current = combatantById(combat.tour);
  if (current && current.type === 'pj' && current.pv <= 0) notify(current.nom + ' est à 0 PV : jet de sauvegarde contre la mort');
  const card = document.querySelector(`.cb[data-id="${combat.tour}"]`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hitPointColor(combatant) {
  const ratio = combatant.pvmax ? combatant.pv / combatant.pvmax : 1;
  return ratio > 0.5 ? '#2e9e5b' : ratio > 0.25 ? '#d8791a' : '#c8402f';
}

function playerSideSubtitle(combatant) {
  const description = combatant.type === 'pj'
    ? 'Personnage joueur · init. ' + signed(combatant.ib || 0) + (combatant.pp != null ? ' · Perception passive ' + combatant.pp : '')
    : (combatant.fm || '') + ' de ' + (combatant.pj || '');
  return description + (combatant.init == null ? ' · initiative à saisir' : '');
}

function combatantSubtitle(combatant, monster) {
  if (isPlayerSide(combatant)) return playerSideSubtitle(combatant);
  return monster ? `${monster.tail} · ${monster.typ} · FP ${monster.fp} · ${formatNumber(Monstres.xp(monster))} PX` : 'Autre combattant';
}

function conditionChipsHtml(combatant) {
  const chips = Object.keys(combatant.et).map(condition => `<button class="chip" data-a="unet" data-e="${escapeHtml(condition)}" title="${escapeHtml(CONDITION_DESCRIPTIONS[condition] || '')} (cliquer pour retirer)">${escapeHtml(condition)}${condition === EXHAUSTION ? ' ' + combatant.et[condition] : ''} ✕</button>`).join('');
  return chips + (combatant.conc ? '<button class="chip conc" data-a="conc" title="Cliquer pour retirer">Concentration ✕</button>' : '');
}

const numberFieldHtml = (field, value, label, cssClass = '') => `<label>${label}<input type="number" inputmode="numeric" data-f="${field}" value="${value ?? ''}" class="${cssClass}"></label>`;

function conditionPaletteHtml(combatant) {
  const conditions = CONDITIONS.map(([condition, description]) => `<button data-a="et" data-e="${escapeHtml(condition)}" class="${combatant.et[condition] ? 'on' : ''}" title="${escapeHtml(description)}">${escapeHtml(condition)}${condition === EXHAUSTION ? ' (niv. ' + (combatant.et[condition] || 0) + ')' : ''}<small>${escapeHtml(description.split('. ')[0])}</small></button>`).join('');
  return `<div class="pal">${conditions}<button data-a="conc" class="${combatant.conc ? 'on' : ''}">Concentration<small>JS de Con à chaque dégât</small></button></div><input class="note" data-f="note" value="${escapeHtml(combatant.note || '')}" placeholder="Note (durée d’un sort, source de la peur…)">`;
}

function paletteOrNoteHtml(combatant) {
  if (openConditionPalettes.has(combatant.id)) return conditionPaletteHtml(combatant);
  return combatant.note ? `<div class="ets"><small>${escapeHtml(combatant.note)}</small></div>` : '';
}

function hitPointBarHtml(combatant) {
  if (!combatant.pvmax) return '';
  return `<div class="hp" style="--hc:${hitPointColor(combatant)}"><i style="width:${Math.max(0, Math.min(100, combatant.pv / combatant.pvmax * 100))}%"></i></div>`;
}

function combatantCardHtml(combatant) {
  const monster = monsterOf(combatant);
  const outOfFight = isOutOfFight(combatant);
  const profileButton = monster ? `<button class="b" data-a="det">${openStatBlocks.has(combatant.id) ? 'Masquer le profil' : 'Profil'}</button>` : '';
  return `<div class="cb${combatant.id === combat.tour ? ' on' : ''}${outOfFight ? ' ko' : ''}" data-id="${combatant.id}" style="--c:${combatantColor(combatant)}">
  <div class="l1"><input class="ini" type="number" inputmode="numeric" data-f="init" value="${combatant.init ?? ''}" placeholder="?" aria-label="Initiative" title="Initiative (bonus ${combatant.ib >= 0 ? '+' : ''}${combatant.ib || 0})">
   <div class="nm"><input data-f="nom" value="${escapeHtml(combatant.nom)}" aria-label="Nom"><small>${escapeHtml(combatantSubtitle(combatant, monster))}${outOfFight ? ' · <b>hors de combat</b>' : ''}</small></div>
   <div class="st">${numberFieldHtml('ca', combatant.ca, 'CA')}${numberFieldHtml('pv', combatant.pv, 'PV')}<span class="sl">/</span>${numberFieldHtml('pvmax', combatant.pvmax, 'MAX')}${numberFieldHtml('tmp', combatant.tmp || '', 'TEMP', 'tmp')}</div></div>
  ${hitPointBarHtml(combatant)}
  <div class="l2"><input class="amt" type="number" inputmode="numeric" min="0" placeholder="Montant" aria-label="Nombre de PV (dégâts, soins ou PV temporaires)" title="Nombre de PV, puis Dégâts, Soins ou PV temp.">
   <button class="b" data-a="deg" style="--c:#c8402f">Dégâts</button><button class="b" data-a="soin" style="--c:#2e9e5b">Soins</button><button class="b" data-a="ptmp" style="--c:#12968f">PV temp.</button>
   <span class="sp1"></span>
   <button class="b" data-a="pal" style="--c:#8b1e3f">États</button>${profileButton}<button class="b" data-a="del" style="--c:#5d6b7a" title="Retirer du combat" aria-label="Retirer du combat">✕</button></div>
  <div class="fb">${escapeHtml(lastHitPointChange[combatant.id] || '')}</div>
  <div class="ets">${conditionChipsHtml(combatant)}</div>
  ${paletteOrNoteHtml(combatant)}
  ${monster && openStatBlocks.has(combatant.id) ? `<div class="det">${Monstres.block(monster)}</div>` : ''}
  </div>`;
}

function experienceFooterHtml() {
  const monsters = combat.list.filter(combatant => combatant.type === 'm');
  if (!monsters.length) return 'Les PX des monstres vaincus s’affichent ici.';
  const totalXp = monsters.reduce((total, combatant) => total + monsterXp(combatant), 0);
  const defeatedXp = monsters.filter(isOutOfFight).reduce((total, combatant) => total + monsterXp(combatant), 0);
  const playerCount = combat.list.filter(combatant => combatant.type === 'pj').length;
  const perPlayer = playerCount ? ` soit <b>${formatNumber(Math.floor(defeatedXp / playerCount))} PX</b> par personnage (${playerCount})` : '';
  return `PX des monstres de la rencontre : <b>${formatNumber(totalXp)}</b> · vaincus : <b>${formatNumber(defeatedXp)} PX</b>${perPlayer}.`;
}

function turnLineHtml(order) {
  const current = combatantById(combat.tour);
  if (current) return 'Au tour de <b>' + escapeHtml(current.nom) + '</b>';
  return order.length ? 'Clique sur « Tour suivant » pour commencer le combat.' : '';
}

function renderCombat() {
  const isGameMaster = Monstres.estMJ();
  $('#lock').hidden = isGameMaster;
  $('#mj').hidden = !isGameMaster;
  $('#lRenc').hidden = !isGameMaster;
  if (!isGameMaster) return;
  const order = initiativeOrder();
  $('#rn').textContent = 'Round ' + combat.round;
  $('#who').innerHTML = turnLineHtml(order);
  $('#list').innerHTML = order.length ? order.map(combatantCardHtml).join('') : '<div class="empty-msg">Aucun combattant. Ajoute des monstres du bestiaire, les personnages joueurs ou d’autres combattants, ou prépare une rencontre dans le <a href="rencontres.html">calculateur de rencontres</a>.</div>';
  $('#foot').innerHTML = experienceFooterHtml();
  $('#foot').hidden = !combat.list.length;
}

function applyDamage(combatant, amount) {
  const absorbed = Math.min(combatant.tmp || 0, amount);
  combatant.tmp = (combatant.tmp || 0) - absorbed;
  const hadHitPoints = combatant.pv;
  combatant.pv = Math.max(0, combatant.pv - (amount - absorbed));
  const notes = [];
  if (combatant.conc && amount > 0) notes.push(`${combatant.nom} : JS de Constitution DD ${Math.min(30, Math.max(10, Math.floor(amount / 2)))} pour garder sa concentration`);
  if (hadHitPoints > 0 && combatant.pv === 0) {
    if (combatant.type === 'pj') {
      combatant.et[UNCONSCIOUS] = 1;
      notes.push(combatant.nom + ' tombe à 0 PV : inconscient, jets contre la mort');
    } else {
      combatant.conc = false;
      notes.push(combatant.nom + ' est hors de combat');
    }
  } else if (combatant.type === 'pj' && hadHitPoints === 0 && amount > 0) notes.push(combatant.nom + ' subit des dégâts à 0 PV : un échec au jet contre la mort (deux sur un coup critique)');
  const summary = notes.join(' · ');
  if (notes.length) notify(summary);
  return summary;
}

const maximumSuffix = combatant => combatant.pvmax ? ' / ' + combatant.pvmax : '';

function damageCombatant(combatant, amount) {
  const temporary = combatant.tmp || 0;
  const notes = applyDamage(combatant, amount);
  lastHitPointChange[combatant.id] = '−' + amount + ' PV' + (temporary ? ' (dont ' + Math.min(temporary, amount) + ' temporaires)' : '') + ' → ' + combatant.pv + maximumSuffix(combatant) + (notes ? ' · ' + notes : '');
}

function healCombatant(combatant, amount) {
  const previous = combatant.pv;
  combatant.pv = combatant.pvmax ? Math.min(combatant.pvmax, combatant.pv + amount) : combatant.pv + amount;
  if (previous <= 0 && combatant.pv > 0 && combatant.type === 'pj') delete combatant.et[UNCONSCIOUS];
  lastHitPointChange[combatant.id] = '+' + (combatant.pv - previous) + ' PV soignés → ' + combatant.pv + maximumSuffix(combatant);
}

function giveTemporaryHitPoints(combatant, amount) {
  const previous = combatant.tmp || 0;
  combatant.tmp = Math.max(previous, amount);
  lastHitPointChange[combatant.id] = previous >= amount ? 'PV temporaires inchangés (' + previous + ') : ils ne se cumulent pas, on garde le plus élevé' : combatant.tmp + ' PV temporaires';
}

function removeCombatant(combatant) {
  if (!confirm('Retirer ' + combatant.nom + ' du combat ?')) return false;
  if (combat.tour === combatant.id) {
    stepTurn(1);
    if (combat.tour === combatant.id) combat.tour = null;
  }
  combat.list = combat.list.filter(other => other !== combatant);
  return true;
}

function toggleInSet(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function addExhaustionLevel(combatant) {
  const level = (combatant.et[EXHAUSTION] || 0) + 1;
  if (level > MAX_EXHAUSTION) {
    delete combatant.et[EXHAUSTION];
    return;
  }
  combatant.et[EXHAUSTION] = level;
  if (level === MAX_EXHAUSTION) notify(combatant.nom + ' : épuisement 6, la créature meurt');
}

function toggleCondition(combatant, condition, action) {
  if (condition === EXHAUSTION && action === 'et') addExhaustionLevel(combatant);
  else if (combatant.et[condition]) delete combatant.et[condition];
  else combatant.et[condition] = 1;
}

function askedAmount(card, action, combatant) {
  const typed = parseInt(card.querySelector('.amt').value, 10);
  if (typed > 0) return typed;
  return parseInt(prompt(HIT_POINT_PROMPTS[action] + combatant.nom + ' ?') || '', 10);
}

const HIT_POINT_ACTIONS = { deg: damageCombatant, soin: healCombatant, ptmp: giveTemporaryHitPoints };

function performCardAction(action, combatant, button) {
  if (action === 'pal') toggleInSet(openConditionPalettes, combatant.id);
  else if (action === 'det') toggleInSet(openStatBlocks, combatant.id);
  else if (action === 'del') return removeCombatant(combatant);
  else if (action === 'conc') combatant.conc = !combatant.conc;
  else if (action === 'et' || action === 'unet') toggleCondition(combatant, button.dataset.e, action);
  return true;
}

function handleCardClick(event) {
  const button = event.target.closest('[data-a]');
  if (!button) return;
  const card = button.closest('.cb');
  const combatant = card && combatantById(card.dataset.id);
  if (!combatant) return;
  const action = button.dataset.a;
  if (HIT_POINT_ACTIONS[action]) {
    const amount = askedAmount(card, action, combatant);
    if (!(amount > 0)) return;
    HIT_POINT_ACTIONS[action](combatant, amount);
  } else if (!performCardAction(action, combatant, button)) return;
  saveAndRender();
}

function handleCardFieldChange(event) {
  const field = event.target.dataset.f;
  const card = event.target.closest('.cb');
  if (!field || !card) return;
  const combatant = combatantById(card.dataset.id);
  if (!combatant) return;
  if (field === 'nom' || field === 'note') combatant[field] = event.target.value;
  else {
    const value = parseInt(event.target.value, 10);
    combatant[field] = isNaN(value) ? (field === 'init' || field === 'ca' ? null : 0) : value;
  }
  if (field === 'pv' && combatant.type === 'pj' && combatant.pv > 0) delete combatant.et[UNCONSCIOUS];
  if (field === 'pv' || field === 'pvmax' || field === 'tmp') delete lastHitPointChange[combatant.id];
  saveAndRender();
}

function damageOnEnter(event) {
  if (event.key !== 'Enter' || !event.target.classList.contains('amt')) return;
  const damageButton = event.target.parentNode.querySelector('[data-a=deg]');
  if (damageButton) damageButton.click();
}

const partyNumberFieldHtml = (field, label, value, placeholder) => `<label><small>${label}</small><input type="number" inputmode="numeric" data-gf="${field}" value="${value ?? ''}" placeholder="${placeholder ?? ''}" aria-label="${label}"></label>`;

function partyMemberHtml(member, index, sheets, players) {
  const key = Monstres.norm(member.nom || '');
  const sheet = sheets.find(candidate => Monstres.norm(candidate.nom) === key) || {};
  const player = players.find(candidate => Monstres.norm(candidate.nom) === key);
  const abilities = player ? player.car : {};
  const mainFields = PARTY_MAIN_FIELDS.map(([field, label]) => partyNumberFieldHtml(field, label, member[field], sheet[field])).join('');
  const abilityFields = Monstres.CAR.map(key => partyNumberFieldHtml(key, ABILITY_LABELS[key] + (abilities[key] ? ' ' + signed(Monstres.cmod(abilities[key])) : ''), member[key], sheet.car && sheet.car[key])).join('');
  const summary = player ? `<div class="gs">Initiative <b>${signed(player.init)}</b>${player.pp != null ? ' · Perception passive <b>' + player.pp + '</b>' : ''}</div>` : '';
  return `<div class="gw" data-g="${index}"><div class="g1"><label><small>Nom</small><input data-gf="nom" value="${escapeHtml(member.nom || '')}" placeholder="Nom du personnage" aria-label="Nom"></label>`
    + mainFields
    + `<button class="x" data-gx="${index}" title="Retirer du groupe" aria-label="Retirer ${escapeHtml(member.nom || '')} du groupe">✕</button></div>`
    + `<div class="g2">${abilityFields}`
    + partyNumberFieldHtml('binit', 'Init. en plus', member.binit, '0') + partyNumberFieldHtml('pp', 'Perc. passive', member.pp, player && player.pp != null ? player.pp : '') + '</div>'
    + summary + '</div>';
}

function renderParty() {
  const party = Monstres.groupe();
  const sheets = Monstres.fiches();
  const players = Monstres.joueurs();
  const namesInParty = new Set(party.map(member => Monstres.norm(member.nom || '')));
  $('#grpL').innerHTML = party.map((member, index) => partyMemberHtml(member, index, sheets, players)).join('');
  $('#grpN').textContent = players.length ? players.length + ' personnage' + plural(players.length) : 'à saisir';
  $('#bGFi').hidden = !sheets.some(sheet => !namesInParty.has(Monstres.norm(sheet.nom)));
}

function syncPlayersInCombat() {
  const players = Monstres.joueurs();
  combat.list.forEach(combatant => {
    if (combatant.type !== 'pj') return;
    const player = players.find(candidate => Monstres.norm(candidate.nom) === Monstres.norm(combatant.nom));
    if (!player) return;
    if (player.pvmax > 0) {
      if (combatant.pv === combatant.pvmax || combatant.pv > player.pvmax) combatant.pv = player.pvmax;
      combatant.pvmax = player.pvmax;
    }
    combatant.ca = player.ca;
    combatant.ib = player.init;
    combatant.pp = player.pp;
  });
  saveCombat();
}

function saveParty(party) {
  Monstres.setGroupe(party);
  syncPlayersInCombat();
  renderParty();
  renderCombat();
}

function addPartyMember() {
  const party = Monstres.groupe();
  party.push({ nom: '' });
  saveParty(party);
  const nameInputs = document.querySelectorAll('#grpL [data-gf=nom]');
  if (nameInputs.length) nameInputs[nameInputs.length - 1].focus();
}

function partyMemberFromSheet(sheet) {
  const member = { nom: sheet.nom, niveau: sheet.niveau, ca: sheet.ca, pvmax: sheet.pvmax || null, pp: sheet.pp };
  Monstres.CAR.forEach(key => { if (sheet.car[key]) member[key] = sheet.car[key]; });
  member.binit = sheet.init - (member.dex ? Monstres.cmod(member.dex) : 0) || null;
  return member;
}

function addPartyFromSheets() {
  const party = Monstres.groupe();
  const namesInParty = new Set(party.map(member => Monstres.norm(member.nom || '')));
  const missing = Monstres.fiches().filter(sheet => !namesInParty.has(Monstres.norm(sheet.nom)));
  missing.forEach(sheet => party.push(partyMemberFromSheet(sheet)));
  saveParty(party);
  notify(missing.length + ' personnage' + plural(missing.length) + ' repris des fiches');
}

function renamePlayerInCombat(previousName, newName) {
  combat.list.forEach(combatant => {
    if (combatant.type === 'pj' && previousName && Monstres.norm(combatant.nom) === Monstres.norm(previousName)) combatant.nom = newName || combatant.nom;
  });
}

function clampedPartyValue(field, value) {
  if (field === 'niveau') return Math.min(20, Math.max(1, value));
  return Monstres.CAR.includes(field) ? Math.min(30, Math.max(1, value)) : value;
}

function editPartyMember(event) {
  const field = event.target.dataset.gf;
  const row = event.target.closest('[data-g]');
  if (!field || !row) return;
  const party = Monstres.groupe();
  const member = party[+row.dataset.g];
  if (!member) return;
  const previousName = member.nom;
  if (field === 'nom') {
    member.nom = event.target.value.trim();
    renamePlayerInCombat(previousName, member.nom);
  } else {
    const value = parseInt(event.target.value, 10);
    member[field] = isNaN(value) ? null : clampedPartyValue(field, value);
  }
  saveParty(party);
}

function removePartyMember(event) {
  const button = event.target.closest('[data-gx]');
  if (!button) return;
  const party = Monstres.groupe();
  const member = party[+button.dataset.gx];
  if (!member) return;
  if (member.nom && !confirm('Retirer ' + member.nom + ' du groupe ?')) return;
  party.splice(+button.dataset.gx, 1);
  saveParty(party);
}

function addEncounterFromCalculator() {
  let addedCount = 0;
  Monstres.recevoir().forEach(entry => {
    const monster = Monstres.get(entry.n);
    if (!monster) return;
    const quantity = Math.max(1, entry.q | 0);
    addMonsters(monster, quantity, entry.mode || 'moy');
    addedCount += quantity;
  });
  if (!addedCount) return;
  saveCombat();
  notify(addedCount + ' monstre' + plural(addedCount) + ' ajouté' + plural(addedCount) + ' depuis le calculateur de rencontres');
}

function startForGameMaster() {
  renderCombat();
  if (bestiaryRequested || !Monstres.estMJ()) return;
  bestiaryRequested = true;
  renderParty();
  $('#grp').open = !Monstres.joueurs().length;
  Monstres.load().then(bestiary => {
    $('#dlM').innerHTML = bestiary.map(monster => `<option value="${escapeHtml(monster.n)}">FP ${escapeHtml(monster.fp)} · ${escapeHtml(monster.typ)}</option>`).join('');
    addEncounterFromCalculator();
    renderCombat();
  }).catch(() => notify('Impossible de charger le bestiaire (bestiaire.json)'));
}

$('#bAddM').onclick = addTypedMonsters;
$('#aM').addEventListener('keydown', event => { if (event.key === 'Enter') $('#bAddM').click(); });
$('#bAddO').onclick = addOtherCombatant;
$('#bPJ').onclick = addPlayerCharacters;
$('#bFam').onclick = addCompanions;
$('#bRollPJ').onclick = rollPlayerInitiatives;
$('#bRoll').onclick = rerollMonsterInitiatives;
$('#bNew').onclick = startNewCombat;
$('#bNext').onclick = () => stepTurn(1);
$('#bPrev').onclick = () => stepTurn(-1);
document.addEventListener('click', handleCardClick);
document.addEventListener('change', handleCardFieldChange);
document.addEventListener('keydown', damageOnEnter);
$('#bGAdd').onclick = addPartyMember;
$('#bGFi').onclick = addPartyFromSheets;
$('#grpL').addEventListener('change', editPartyMember);
$('#grpL').addEventListener('click', removePartyMember);
addEventListener('storage', event => { if (event.key === PARTY_STORAGE_KEY && Monstres.estMJ()) renderParty(); });
$('#ref').innerHTML = CONDITIONS.map(([condition, description]) => `<dt>${escapeHtml(condition)}</dt><dd>${escapeHtml(description)}</dd>`).join('') + `<dt>Concentration</dt><dd>${CONCENTRATION_RULE}</dd>`;

loadCombat();
Persos.init({ part: 'combat', mount: $('#persos'), msg: notify, collect: () => null, apply: startForGameMaster, onName: startForGameMaster });
