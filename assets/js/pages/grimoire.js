const SCHOOL_COLORS = { 'Abjuration': '#2f6fd0', 'Divination': '#12968f', 'Enchantement': '#d6458e', 'Évocation': '#c8402f', 'Illusion': '#7a4fc4', 'Invocation': '#d8791a', 'Nécromancie': '#2e9e5b', 'Transmutation': '#b8860b' };
const LEVEL_COLORS = ['#7a4fc4', '#2f6fd0', '#12968f', '#2e9e5b', '#b8860b', '#d8791a', '#c8402f', '#d6458e', '#8e3a9d', '#2a3170'];
const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const DEFAULT_COLOR = '#2a3170';
const MESSAGE_DURATION_MS = 4500;
const WIDE_CARD_DESCRIPTION_LENGTH = 1400;
const LAND_CIRCLE = 'Cercle de la Terre';
const FILTER_SELECTS = [['#fc', 'cls'], ['#fs', 'sch'], ['#fl', 'lvl'], ['#fo', 'only'], ['#fb', 'src']];

let allSpells = [];
let alwaysPreparedRules = null;
let classesByName = {};
let spellSlotsByCasterType = null;
let featDefinitions = [];
let alwaysPreparedNames = new Set();
const spellsByName = new Map();
const state = { prep: new Set(), terrain: '', dons: {}, sel: new Set(), q: '', cls: '', sch: '', lvl: '', only: '', tab: 0, open: new Set(), src: '' };

const notify = text => showMessage(text, MESSAGE_DURATION_MS);
const plural = count => count > 1 ? 's' : '';
const levelHeading = level => level === 0 ? 'Tours de magie' : 'Niveau ' + level;
const levelLabel = level => level === 0 ? 'Tour de magie' : 'Niveau ' + level;
const schoolColor = spell => SCHOOL_COLORS[spell.e] || DEFAULT_COLOR;
const byName = (first, second) => first.name.localeCompare(second.name, 'fr');
const isInBook = spell => state.sel.has(spell.n);
const isAlwaysPrepared = spell => alwaysPreparedNames.has(spell.n);
const isPreparedInBook = spell => state.prep.has(spell.n) && isInBook(spell);
const findSpell = name => spellsByName.get(normalizeText(name));

function indexSpells(spells) {
  allSpells = spells;
  allSpells.forEach((spell, index) => {
    const [name, alias] = spell.n.split('|');
    spell.i = index;
    spell.name = name;
    spell.alias = alias || '';
    spell.idx = normalizeText(spell.n.replace('|', ' '));
    [spell.n, name, alias].forEach(key => {
      if (key && !spellsByName.has(normalizeText(key))) spellsByName.set(normalizeText(key), spell);
    });
  });
}

function optionsHtml(firstLabel, values, label = value => value) {
  return `<option value="">${firstLabel}</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(label(value))}</option>`).join('');
}

function setupCatalog(spells) {
  indexSpells(spells);
  const sortedFrench = list => list.sort((first, second) => first.localeCompare(second, 'fr'));
  $('#fc').innerHTML = optionsHtml('Toutes', sortedFrench([...new Set(allSpells.flatMap(spell => spell.c))]));
  $('#fs').innerHTML = optionsHtml('Tous', sortedFrench([...new Set(allSpells.map(spell => spell.e))]));
  $('#fl').innerHTML = optionsHtml('Tous', SPELL_LEVELS, levelLabel);
}

function sourceNoteHtml(spell) {
  if (!spell.src) return '';
  return `<div class="srcn">Source : ${escapeHtml(spell.src)}${spell.r_ ? ' · description reconstituée à partir d’un résumé : à vérifier dans le livre' : ''}${spell.v_ ? ' · nom français non officiel' : ''}${spell.ed === '2014' ? ' · sort en version 2014 (règles non mises à jour)' : ''}</div>`;
}

function preparationPillHtml(spell) {
  if (isAlwaysPrepared(spell)) return '<span class="pill al">Toujours préparé</span>';
  return state.prep.has(spell.n) ? '<span class="pill pr">Préparé</span>' : '';
}

const spellPillsHtml = spell => preparationPillHtml(spell) + (spell.cc ? '<span class="pill co">Concentration</span>' : '') + (spell.ri ? '<span class="pill ri">Rituel</span>' : '');
const canBePrepared = spell => spell.l > 0 && !isAlwaysPrepared(spell);

function bookCardActionsHtml(spell) {
  const prepared = state.prep.has(spell.n);
  const prepareButton = canBePrepared(spell) ? `<button class="b pp noprint${prepared ? ' on' : ''}" data-act="prep" data-i="${spell.i}" aria-pressed="${prepared}">${prepared ? '★ Préparé' : '☆ Préparer'}</button> ` : '';
  return prepareButton + `<button class="b rm noprint" data-act="rm" data-i="${spell.i}">Retirer du grimoire</button>`;
}

function cardHtml(spell, isInBookView) {
  return `<article class="sp${spell.h.length > WIDE_CARD_DESCRIPTION_LENGTH ? ' wide' : ''}" style="--c:${schoolColor(spell)}"><header><div class="ti"><h3>${escapeHtml(spell.name)}${spellPillsHtml(spell)}${VO.btn('sorts', spell.n, spell.name)}</h3><div class="sub">${escapeHtml(spell.e)} · ${escapeHtml(spell.c.join(', '))}${spell.alias ? ' · aussi : ' + escapeHtml(spell.alias) : ''}</div></div><span class="lvb" title="${levelLabel(spell.l)}">${spell.l}</span></header>
  <div class="body"><dl class="meta"><div><dt>Incantation</dt><dd>${escapeHtml(spell.t)}</dd></div><div><dt>Portée</dt><dd>${escapeHtml(spell.r)}</dd></div><div><dt>Composantes</dt><dd>${escapeHtml(spell.k)}</dd></div><div><dt>Durée</dt><dd>${escapeHtml(spell.d)}</dd></div></dl>
  <div class="desc">${spell.h}</div>${sourceNoteHtml(spell)}${isInBookView ? bookCardActionsHtml(spell) : ''}</div></article>`;
}

function matchesSource(spell) {
  if (!state.src) return true;
  if (state.src === 'base') return !spell.src;
  if (state.src === '2014') return spell.ed === '2014';
  return !!spell.src && spell.ed !== '2014';
}

function matchesShownOnly(spell) {
  if (!state.only) return true;
  return state.only === 'p' ? (state.prep.has(spell.n) || isAlwaysPrepared(spell)) : isInBook(spell);
}

function filteredSpells() {
  const searchedText = normalizeText(state.q);
  return allSpells.filter(spell => (!searchedText || spell.idx.includes(searchedText))
    && (!state.cls || spell.c.includes(state.cls))
    && (!state.sch || spell.e === state.sch)
    && (state.lvl === '' || spell.l === +state.lvl)
    && matchesSource(spell)
    && matchesShownOnly(spell));
}

function sheetData() {
  const sheet = Persos.part('fiche');
  return sheet && sheet.data || {};
}

function characterContext() {
  const data = sheetData();
  return { d: data, cl: data.clsel || '', sub: data.sclasse || '', lvl: Math.min(20, Math.max(1, parseInt(data.niveau) || 1)), race: data.race || '', lig: data.sespece || '' };
}

function valueForLooseKey(object, key) {
  if (!object || !key) return null;
  const searched = normalizeText(key);
  const found = Object.keys(object).find(candidate => normalizeText(candidate) === searched || normalizeText(candidate).includes(searched) || searched.includes(normalizeText(candidate)));
  return found ? object[found] : null;
}

const isLandDruid = context => context.cl === 'Druide' && /terre/i.test(context.sub);

function grantedSpellsFromRules(context) {
  const granted = [];
  const addGranted = (entries, source) => (entries || []).forEach(entry => granted.push({ sort: entry.sort, niv: entry.niv, src: source, x: entry.x }));
  const species = valueForLooseKey(alwaysPreparedRules.especes, context.race);
  if (species) {
    addGranted(species.base, context.race);
    const lineage = valueForLooseKey(species.lignages, context.lig);
    if (lineage) addGranted(lineage, context.lig || context.race);
  }
  if (context.cl) {
    addGranted(alwaysPreparedRules.classes[context.cl], context.cl);
    const subclass = valueForLooseKey(alwaysPreparedRules.sousclasses[context.cl], context.sub);
    if (subclass) addGranted(subclass, context.sub);
    if (isLandDruid(context) && state.terrain) {
      const terrains = alwaysPreparedRules.terrains[LAND_CIRCLE];
      if (terrains && terrains[state.terrain]) addGranted(terrains[state.terrain], 'Terrain : ' + state.terrain);
    }
  }
  return granted;
}

function grantedSpellsFromFeats() {
  const granted = [];
  featSpellSlots().forEach(feat => {
    feat.fixe.forEach(name => granted.push({ sort: name, niv: 1, src: feat.nom }));
    feat.choix.forEach(choice => choice.picks.forEach(name => { if (name) granted.push({ sort: name, niv: 1, src: feat.nom }); }));
  });
  return granted;
}

function keepLowestLevelGrant(granted) {
  const lowestByName = new Map();
  granted.forEach(entry => {
    const key = normalizeText(entry.sort);
    const existing = lowestByName.get(key);
    if (!existing || entry.niv < existing.niv) lowestByName.set(key, entry);
  });
  return [...lowestByName.values()];
}

function alwaysPreparedList() {
  if (!alwaysPreparedRules) return [];
  const granted = grantedSpellsFromRules(characterContext()).concat(grantedSpellsFromFeats());
  return keepLowestLevelGrant(granted);
}

function spellsWrittenInFeatText(choices) {
  return String(choices.s || '').split(/[,;\n+\/]|\bet\b/).map(findSpell).filter(Boolean);
}

function featChoiceSlot(choiceRule, index, feat, chosenList, writtenSpells, proficiencyBonus) {
  const count = choiceRule.nb === 'pb' ? proficiencyBonus : choiceRule.nb;
  const key = feat.u + '_' + index;
  const accepts = spell => spell.l === choiceRule.niv && (!choiceRule.ecoles || choiceRule.ecoles.includes(spell.e)) && (!choiceRule.rituel || spell.ri) && (!choiceRule.liste || !chosenList || spell.c.includes(chosenList));
  const savedPicks = (state.dons[key] || []).slice(0, count);
  const picks = Array.from({ length: count }, (_, position) => savedPicks[position] !== undefined ? savedPicks[position] : '');
  if (!savedPicks.some(Boolean)) {
    const fromText = writtenSpells.filter(accepts);
    picks.forEach((_, position) => { if (fromText[position]) picks[position] = fromText[position].n; });
  }
  const listNote = choiceRule.liste ? (chosenList ? ' · liste du ' + chosenList : ' · choisis d’abord la liste sur la fiche') : '';
  return { key, lbl: choiceRule.lbl + listNote, nb: count, ok: accepts, picks };
}

function featSpellSlots() {
  const context = characterContext();
  const featRules = alwaysPreparedRules && alwaysPreparedRules.dons;
  const extras = context.d.extras;
  if (!featRules || !extras || !Array.isArray(extras.dons)) return [];
  const proficiencyBonus = Math.ceil(context.lvl / 4) + 1;
  return extras.dons.filter(feat => feat && featRules[feat.id]).map(feat => {
    const rule = featRules[feat.id];
    const choices = feat.ch || {};
    const definition = featDefinitions.find(candidate => candidate.id === feat.id);
    const chosenList = rule.choix && rule.choix.some(choice => choice.liste) ? choices.liste || '' : '';
    const writtenSpells = spellsWrittenInFeatText(choices);
    const slots = (rule.choix || []).map((choiceRule, index) => featChoiceSlot(choiceRule, index, feat, chosenList, writtenSpells, proficiencyBonus));
    return { u: feat.u, nom: definition ? definition.nom : feat.id, fixe: rule.fixe || [], choix: slots };
  });
}

function alwaysPreparedSpellNames() {
  const level = characterContext().lvl;
  const names = new Set();
  alwaysPreparedList().forEach(entry => {
    if (entry.niv > level) return;
    const spell = findSpell(entry.sort);
    if (spell) names.add(spell.n);
  });
  return names;
}

function spellcastingInfo() {
  const context = characterContext();
  const classData = classesByName[context.cl];
  if (!classData) return null;
  if (classData.prepares) return { type: classData.lanceur, prepares: classData.prepares, mineurs: classData.mineurs };
  if (classData.sous_classe && context.d.sclance) {
    const subclass = classData.sous_classe;
    return { type: subclass.type || 'tiers', prepares: subclass.prepares, mineurs: subclass.mineurs, emp: subclass.emp };
  }
  return null;
}

function spellListOfClass() {
  const className = characterContext().cl;
  if (className === 'Guerrier' || className === 'Roublard') return 'Magicien';
  if (className === 'Moine') return 'Ensorceleur';
  return classesByName[className] && classesByName[className].prepares ? className : '';
}

const isOffClassList = spell => {
  const classList = spellListOfClass();
  return !!classList && !spell.c.includes(classList);
};

function maxPreparedSpells() {
  const info = spellcastingInfo();
  return info ? info.prepares[characterContext().lvl - 1] : null;
}

function maxCantrips() {
  const info = spellcastingInfo();
  return info && info.mineurs ? info.mineurs[characterContext().lvl - 1] : null;
}

function highestPreparableLevel() {
  const info = spellcastingInfo();
  const levelIndex = characterContext().lvl - 1;
  if (!info || !spellSlotsByCasterType) return null;
  if (info.type === 'pacte') {
    const pactSlots = (info.emp || spellSlotsByCasterType.pacte)[levelIndex];
    return pactSlots && pactSlots[0] ? pactSlots[1] : 0;
  }
  const slots = spellSlotsByCasterType[info.type] && spellSlotsByCasterType[info.type][levelIndex];
  return slots ? slots.length : null;
}

const isChosenPrepared = spell => isPreparedInBook(spell) && spell.l > 0 && !alwaysPreparedNames.has(spell.n);
const preparedCount = () => allSpells.filter(isChosenPrepared).length;
const cantripCount = () => allSpells.filter(spell => spell.l === 0 && isInBook(spell) && !alwaysPreparedNames.has(spell.n)).length;

function preparationRefusal(spell) {
  const maximum = maxPreparedSpells();
  const highestLevel = highestPreparableLevel();
  if (maximum != null && preparedCount() >= maximum) return 'Limite atteinte (' + maximum + ' sorts préparés) : retire d’abord un sort préparé';
  if (highestLevel != null && spell.l > highestLevel) return highestLevel ? 'Tu ne peux préparer que des sorts jusqu’au niveau ' + highestLevel + ' pour l’instant' : 'Pas encore d’emplacement de sort à ce niveau de personnage';
  return null;
}

function togglePrepared(spell) {
  if (isPreparedInBook(spell)) {
    state.prep.delete(spell.n);
    renderAll();
    return;
  }
  const refusal = preparationRefusal(spell);
  if (refusal) {
    notify(refusal);
    return;
  }
  state.prep.add(spell.n);
  state.sel.add(spell.n);
  renderAll();
  if (isOffClassList(spell)) notify('Attention : ' + spell.name + ' n’est pas dans la liste de sorts du ' + spellListOfClass());
}

function characterSummary(context) {
  const classPart = context.cl && (context.cl + (context.sub ? ' (' + context.sub + ')' : '') + ' niv. ' + context.lvl);
  const speciesPart = context.race && (context.race + (context.lig ? ' · ' + context.lig : ''));
  return [classPart, speciesPart].filter(Boolean).join(' — ');
}

function landTerrainSelectHtml(context) {
  if (!isLandDruid(context) || !alwaysPreparedRules) return '';
  const terrains = Object.keys(alwaysPreparedRules.terrains[LAND_CIRCLE]);
  return `<label>Terrain du Cercle de la Terre <select id="terr" class="noprint"><option value="">— choisir —</option>${terrains.map(terrain => `<option value="${terrain}"${terrain === state.terrain ? ' selected' : ''}>${terrain}</option>`).join('')}</select></label>`;
}

function featChoiceHtml(feat, slot) {
  const options = allSpells.filter(slot.ok).sort(byName);
  const selects = slot.picks.map((picked, position) => `<select data-don="${slot.key}" data-k="${position}" data-nb="${slot.nb}" aria-label="${escapeHtml(feat.nom)} : choix ${position + 1}"><option value="">— choisir —</option>${options.map(spell => `<option value="${escapeHtml(spell.n)}"${spell.n === picked ? ' selected' : ''}>${escapeHtml(spell.name)}</option>`).join('')}</select>`).join('');
  return `<div class="dch"><small>${escapeHtml(feat.nom)} — ${escapeHtml(slot.lbl)}</small><div class="dsel">${selects}</div></div>`;
}

function featChoicesHtml() {
  const featsWithChoices = featSpellSlots().filter(feat => feat.choix.length);
  if (!featsWithChoices.length) return '';
  return `<div class="noprint"><div style="margin-top:6px"><b>Sorts choisis grâce aux dons</b> (toujours préparés)</div>${featsWithChoices.map(feat => feat.choix.map(slot => featChoiceHtml(feat, slot)).join('')).join('')}</div>`;
}

function limitsText(maximum, highestLevel) {
  const prepared = maximum != null ? 'jusqu’à ' + maximum + ' sorts préparés' : '';
  const levels = highestLevel != null ? (highestLevel ? 'sorts de niveau 1 à ' + highestLevel : 'pas encore d’emplacement de sort') : '';
  return [prepared, levels].filter(Boolean).join(', ');
}

function contextLineHtml(context, maximum, highestLevel, count) {
  const summary = characterSummary(context);
  const limits = limitsText(maximum, highestLevel);
  const intro = summary ? escapeHtml(summary) + (limits ? ' · ' + limits : '') : 'Aucun personnage renseigné dans la fiche : choisis classe, espèce, dons et niveau pour voir les sorts toujours préparés et le nombre de sorts à préparer.';
  const noPreparation = maximum == null && context.cl ? ' · pas de sorts préparés pour cette classe/sous-classe (pour Guerrier, Roublard ou Chasseur de sang, coche la case d’incantation sur la fiche)' : '';
  const overLimit = maximum != null && count > maximum ? ' · <b style="color:#c8402f">limite dépassée : retire des sorts préparés (tu peux changer ta liste à chaque repos long)</b>' : '';
  return `<p class="ctx">${intro}${noPreparation}${overLimit}</p>`;
}

function grantedSpellChipHtml(entry, characterLevel) {
  const spell = findSpell(entry.sort);
  const notYet = entry.niv > characterLevel;
  return `<span class="ch${notYet ? ' off' : ''}${spell ? '' : ' nf'}" title="${notYet ? 'Disponible au niveau ' + entry.niv : ''}">${escapeHtml(spell ? spell.name : entry.sort)}<small>${escapeHtml(entry.src)}${entry.niv > 1 ? ' · niv. ' + entry.niv : ''}${spell ? '' : ' · hors liste'}</small></span>`;
}

function missingGrantedCount(granted, characterLevel) {
  return granted.filter(entry => {
    const spell = findSpell(entry.sort);
    return entry.niv <= characterLevel && spell && !isInBook(spell);
  }).length;
}

function alwaysPreparedSectionHtml(granted, characterLevel) {
  if (!granted.length) return '';
  const missing = missingGrantedCount(granted, characterLevel);
  const addButton = missing ? `<button class="b noprint" id="bAuto">Ajouter les ${missing} sort${plural(missing)} manquant${plural(missing)} au grimoire</button>` : '';
  return `<div><b>Toujours préparés</b> (classe, sous-classe, espèce, dons : ne comptent pas dans la limite)</div><div class="al">${granted.map(entry => grantedSpellChipHtml(entry, characterLevel)).join('')}</div>
  ${addButton}`;
}

function chosenPreparedChipHtml(spell) {
  const offList = isOffClassList(spell);
  return `<button type="button" class="ch chb${offList ? ' nf' : ''}" data-act="prep" data-i="${spell.i}" title="Ne plus préparer">${escapeHtml(spell.name)}<span class="noprint" aria-hidden="true"> ✕</span><span class="sr"> (retirer)</span><small>niv. ${spell.l}${offList ? ' · hors liste du ' + escapeHtml(spellListOfClass()) : ''}</small></button>`;
}

function preparedCountersHtml(count, maximum) {
  const cantripMaximum = maxCantrips();
  const cantrips = cantripCount();
  const preparedCounter = `<span class="cnt${maximum != null && count > maximum ? ' over' : ''}" title="Sorts préparés au choix">${count}${maximum != null ? ' / ' + maximum : ''}</span>`;
  const cantripCounter = cantripMaximum ? `<span class="cnt${cantrips > cantripMaximum ? ' over' : ''}" title="Sorts mineurs (tours de magie) de la classe">mineurs ${cantrips} / ${cantripMaximum}</span>` : '';
  return preparedCounter + cantripCounter;
}

function renderPreparedPanel() {
  alwaysPreparedNames = alwaysPreparedSpellNames();
  const context = characterContext();
  const maximum = maxPreparedSpells();
  const count = preparedCount();
  const chosen = allSpells.filter(isChosenPrepared).sort((first, second) => first.l - second.l || byName(first, second));
  $('#prep').innerHTML = `<h2>Sorts préparés ${preparedCountersHtml(count, maximum)}</h2>
  ${contextLineHtml(context, maximum, highestPreparableLevel(), count)}
  ${landTerrainSelectHtml(context)}
  ${alwaysPreparedSectionHtml(alwaysPreparedList(), context.lvl)}
  ${featChoicesHtml()}
  <div style="margin-top:6px"><b>Préparés au choix</b></div>
  <div class="al">${chosen.length ? chosen.map(chosenPreparedChipHtml).join('') : '<span style="color:var(--soft)">Aucun. Clique sur « ☆ Préparer » dans la liste des sorts ou dans les fiches ci-dessous.</span>'}</div>`;
}

function listPrepareButtonHtml(spell) {
  if (!canBePrepared(spell)) return '';
  const prepared = isPreparedInBook(spell);
  return `<button class="b pp${prepared ? ' on' : ''}" data-act="prep" data-i="${spell.i}" aria-pressed="${prepared}" title="${isInBook(spell) ? '' : 'Ajoute aussi le sort au grimoire'}">${prepared ? '★ Préparé' : '☆ Préparer'}</button>`;
}

function listRowHtml(spell) {
  const inBook = isInBook(spell);
  const isOpen = state.open.has(spell.n);
  return `<div class="item" style="--c:${schoolColor(spell)}"><div class="row"><div class="rmain"><div class="rt">${escapeHtml(spell.name)}${spellPillsHtml(spell)}${VO.btn('sorts', spell.n, spell.name)}</div><div class="rs">${escapeHtml(spell.e)} · ${levelLabel(spell.l)} · ${escapeHtml(spell.c.join(', '))} · ${escapeHtml(spell.t)} · ${escapeHtml(spell.r)}</div></div>
    <div class="racts"><button class="b" style="--c:${DEFAULT_COLOR}" data-act="det" data-i="${spell.i}" aria-expanded="${isOpen}">${isOpen ? 'Masquer' : 'Détails'}</button>${listPrepareButtonHtml(spell)}<button class="b add${inBook ? ' on' : ''}" data-act="tog" data-i="${spell.i}" aria-pressed="${inBook}">${inBook ? '✓ Ajouté' : '+ Ajouter'}</button></div></div>${isOpen ? `<div class="det">${cardHtml(spell, false)}</div>` : ''}</div>`;
}

function renderList() {
  alwaysPreparedNames = alwaysPreparedSpellNames();
  const shown = filteredSpells();
  const maximum = maxPreparedSpells();
  const count = preparedCount();
  $('#cnt').textContent = shown.length + ' sort' + plural(shown.length) + ' affiché' + plural(shown.length) + ' · ' + state.sel.size + ' dans le grimoire · ' + count + (maximum != null ? ' / ' + maximum : '') + ' préparé' + plural(count);
  $('#list').innerHTML = shown.length ? shown.map(listRowHtml).join('') : '<div class="empty-msg">Aucun sort ne correspond à ces filtres.</div>';
}

function bookSpellsByLevel() {
  const byLevel = SPELL_LEVELS.map(() => []);
  allSpells.forEach(spell => { if (isInBook(spell)) byLevel[spell.l].push(spell); });
  return byLevel;
}

function bookSectionsHtml(byLevel) {
  return byLevel.map((spells, level) => {
    const content = spells.length ? `<div class="cards">${spells.map(spell => cardHtml(spell, true)).join('')}</div>` : '<div class="none">Aucun sort à ce niveau. Utilise « Choisir les sorts » pour en ajouter.</div>';
    return `<section class="lvl${level === state.tab ? ' on' : ''}${spells.length ? '' : ' empty'}" style="--c:${LEVEL_COLORS[level]}"><h2>${levelHeading(level)} <span>(${spells.length})</span></h2>${content}</section>`;
  }).join('');
}

function renderBook() {
  renderPreparedPanel();
  const byLevel = bookSpellsByLevel();
  const bookSize = state.sel.size;
  $('#tabs').innerHTML = byLevel.map((spells, level) => `<button class="tab" role="tab" style="--c:${LEVEL_COLORS[level]}" data-act="tab" data-l="${level}" aria-selected="${level === state.tab}">${level === 0 ? 'Tours de magie' : 'Niv. ' + level}<span>${spells.length}</span></button>`).join('');
  $('#levels').innerHTML = bookSectionsHtml(byLevel);
  $('#sum').textContent = bookSize ? bookSize + ' sort' + plural(bookSize) + ' sélectionné' + plural(bookSize) : 'Aucun sort sélectionné';
  $('#bBook').textContent = 'Mon grimoire (' + bookSize + ')';
}

function renderAll() {
  renderList();
  renderBook();
  Persos.save();
}

function collectSpellbook() {
  return {
    version: 1, type: 'grimoire-dnd-5e', data: {
      titre: $('#titre').value,
      sorts: allSpells.filter(isInBook).map(spell => spell.n),
      prepares: allSpells.filter(isPreparedInBook).map(spell => spell.n),
      terrain: state.terrain,
      dons: state.dons,
      filtres: { q: state.q, cls: state.cls, sch: state.sch, lvl: state.lvl, only: state.only }
    }
  };
}

function syncFilterInputs() {
  $('#fq').value = state.q;
  FILTER_SELECTS.forEach(([selector, key]) => { $(selector).value = state[key]; });
}

function addKnownSpells(names, target) {
  let unknownCount = 0;
  names.forEach(name => {
    const spell = findSpell(String(name));
    if (spell) target.add(spell.n);
    else unknownCount++;
  });
  return unknownCount;
}

function restoreFilters(savedFilters) {
  state.q = savedFilters.q || '';
  state.cls = savedFilters.cls || '';
  state.sch = savedFilters.sch || '';
  state.lvl = savedFilters.lvl === undefined || savedFilters.lvl === null ? '' : String(savedFilters.lvl);
  state.only = savedFilters.only === 'p' ? 'p' : savedFilters.only ? '1' : '';
}

function applySpellbook(saved) {
  const data = saved && saved.data;
  if (!data || !Array.isArray(data.sorts)) throw new Error('format');
  state.sel.clear();
  const unknownCount = addKnownSpells(data.sorts, state.sel);
  restoreFilters(data.filtres || {});
  state.prep.clear();
  addKnownSpells(data.prepares || [], state.prep);
  state.terrain = data.terrain || '';
  state.dons = data.dons && typeof data.dons === 'object' ? data.dons : {};
  syncFilterInputs();
  renderAll();
  return unknownCount;
}

function startBlank() {
  state.sel.clear();
  state.prep.clear();
  state.terrain = '';
  state.dons = {};
  state.q = state.cls = state.sch = state.lvl = state.only = '';
  syncFilterInputs();
  renderAll();
}

function showCharacterSpellbook(saved) {
  state.open.clear();
  state.tab = 0;
  if (saved) applySpellbook(saved);
  else startBlank();
}

function addMissingGrantedSpells() {
  const level = characterContext().lvl;
  const spells = alwaysPreparedList().filter(entry => entry.niv <= level).map(entry => findSpell(entry.sort)).filter(Boolean);
  spells.forEach(spell => state.sel.add(spell.n));
  renderAll();
  notify(spells.length + ' sort(s) ajouté(s) au grimoire');
}

function removeFromBook(spell) {
  state.sel.delete(spell.n);
  state.prep.delete(spell.n);
  renderAll();
}

function toggleInBook(spell) {
  if (isInBook(spell)) removeFromBook(spell);
  else {
    state.sel.add(spell.n);
    renderAll();
  }
}

function toggleDetails(spell) {
  if (state.open.has(spell.n)) state.open.delete(spell.n);
  else state.open.add(spell.n);
  renderList();
}

const CLICK_ACTIONS = {
  tog: toggleInBook,
  det: toggleDetails,
  rm: removeFromBook,
  prep: togglePrepared,
  tab: (spell, button) => { state.tab = +button.dataset.l; renderBook(); },
  mode: (spell, button) => setMode(button.dataset.m)
};

function handleActionClick(event) {
  if (event.target.id === 'bAuto') return addMissingGrantedSpells();
  const button = event.target.closest('[data-act]');
  if (!button) return;
  const action = CLICK_ACTIONS[button.dataset.act];
  if (action) action(allSpells[+button.dataset.i], button);
}

const hasBookSpellsOfLevel = level => allSpells.some(spell => spell.l === level && isInBook(spell));

function showFirstFilledTab() {
  if (hasBookSpellsOfLevel(state.tab)) return;
  const firstFilledLevel = SPELL_LEVELS.find(hasBookSpellsOfLevel);
  if (firstFilledLevel === undefined) return;
  state.tab = firstFilledLevel;
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

function saveFeatSpellChoice(select) {
  const key = select.dataset.don;
  const picks = Array.from({ length: +select.dataset.nb }, (_, position) => (state.dons[key] || [])[position] || '');
  document.querySelectorAll(`[data-don="${key}"]`).forEach(choiceSelect => { picks[+choiceSelect.dataset.k] = choiceSelect.value; });
  state.dons[key] = picks;
  if (select.value) state.sel.add(select.value);
  renderAll();
}

function handlePreparedPanelChange(event) {
  const target = event.target;
  if (target.id === 'terr') {
    state.terrain = target.value;
    renderAll();
  } else if (target.dataset.don) saveFeatSpellChoice(target);
}

function resetFilters() {
  state.q = state.cls = state.sch = state.lvl = state.only = state.src = '';
  syncFilterInputs();
  renderList();
  Persos.save();
}

function saveToFile() {
  const name = fileSafeName($('#titre').value || Persos.current().nom || 'grimoire');
  downloadJsonFile(`grimoire_${name}.json`, collectSpellbook());
  notify('Grimoire enregistré dans un fichier .json');
}

function loadedMessage(unknownCount) {
  const ignored = unknownCount ? ' (' + unknownCount + ' introuvable' + plural(unknownCount) + ' ignoré' + plural(unknownCount) + ')' : '';
  return 'Grimoire chargé : ' + state.sel.size + ' sort' + plural(state.sel.size) + ignored;
}

function loadFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      notify(loadedMessage(applySpellbook(JSON.parse(reader.result))));
    } catch (error) {
      notify('Fichier invalide : choisis un .json créé par cette page');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function printSpellbook() {
  if (!state.sel.size) {
    notify('Ajoute d’abord des sorts à ton grimoire');
    return;
  }
  window.print();
}

function clearSpellbook() {
  if (!state.sel.size) return;
  if (!confirm('Retirer tous les sorts du grimoire de « ' + Persos.current().nom + ' » ? Pense à enregistrer un .json avant.')) return;
  state.sel.clear();
  state.prep.clear();
  renderAll();
  notify('Grimoire vidé');
}

function showLoadingError() {
  $('#cnt').textContent = '';
  $('#list').innerHTML = '<div class="empty-msg">Impossible de charger la liste des sorts (spells.json). Vérifie ta connexion, puis recharge la page. En local, ouvre le site via un serveur web (pas en double-cliquant sur le fichier).</div>';
}

async function loadRulesData() {
  alwaysPreparedRules = await fetchJson('assets/json/vf/sorts_auto.json').catch(() => null);
  try {
    const classData = await fetchJson('assets/json/vf/classes.json');
    classesByName = classData.classes || {};
    spellSlotsByCasterType = classData.emplacements || null;
  } catch (error) {
    classesByName = {};
  }
  featDefinitions = await fetchJson('assets/json/vf/dons.json').catch(() => []);
}

async function startPage() {
  let spells;
  try {
    spells = await fetchJson('assets/json/vf/spells.json');
  } catch (error) {
    showLoadingError();
    return;
  }
  setupCatalog(spells);
  await loadRulesData();
  Persos.init({ part: 'grimoire', mount: $('#persos'), title: $('#titre'), collect: collectSpellbook, apply: showCharacterSpellbook, msg: notify });
}

document.addEventListener('click', handleActionClick);
$('#fq').addEventListener('input', onFilterChange('q'));
FILTER_SELECTS.forEach(([selector, key]) => $(selector).addEventListener('change', onFilterChange(key)));
$('#titre').addEventListener('input', () => Persos.save());
document.addEventListener('change', handlePreparedPanelChange);
$('#bReset').onclick = resetFilters;
$('#bSave').onclick = saveToFile;
$('#bLoad').onclick = () => $('#file').click();
$('#file').onchange = loadFromFile;
$('#bPrint').onclick = printSpellbook;
$('#bClear').onclick = clearSpellbook;
startPage();
