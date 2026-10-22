(() => {
'use strict';

const LEVEL_UP_STYLES = `
.lvup{border:0;border-radius:12px;padding:0;width:min(560px,94vw);max-height:92vh;box-shadow:0 10px 40px #0008;color:var(--ink);font:13px/1.45 system-ui,sans-serif}
.lvup::backdrop{background:#0007}
.lvup form{display:flex;flex-direction:column;max-height:92vh}
.lvup header{background:#2a3170;color:#fff;padding:12px 16px 10px;border-bottom:4px solid var(--gold)}
.lvup header h3{margin:0;font:italic 700 19px var(--serif)}
.lvup header small{color:#d9defa;font-size:12px}
.lvup .steps{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap}
.lvup .steps span{font-size:11px;padding:1px 7px;border-radius:9px;background:#ffffff22;color:#d9defa}
.lvup .steps span.on{background:var(--gold);color:#201700;font-weight:600}
.lvup .steps span.ok{color:#fff}
.lvup .bd{padding:12px 16px;overflow:auto;flex:1}
.lvup h4{margin:0 0 8px;font:italic 700 16px var(--serif);color:#2a3170}
.lvup p{margin:0 0 8px}
.lvup .hint{color:var(--soft);font-size:12px}
.lvup ul{margin:0 0 8px;padding-left:18px}
.lvup li{margin-bottom:5px}
.lvup label.opt{display:flex;gap:8px;align-items:flex-start;border:1px solid var(--line);border-radius:8px;padding:7px 9px;margin-bottom:6px;cursor:pointer}
.lvup label.opt:has(input:checked){border-color:#2a3170;background:#eef0fb}
.lvup label.opt input{width:auto;margin-top:2px}
.lvup select,.lvup input[type=number]{width:100%;border:1px solid var(--line);border-radius:6px;padding:5px 6px;background:#fff}
.lvup .fld{display:block;margin-bottom:8px}
.lvup .fld small{display:block;color:var(--soft);font-size:11.5px;margin-bottom:2px}
.lvup .big{font:700 22px var(--serif);color:#2e9e5b}
.lvup .roll{display:flex;gap:8px;align-items:center;margin-top:4px}
.lvup .roll input{width:70px}
.lvup .roll button,.lvup footer button{border:1px solid #2a3170;color:#2a3170;background:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:600}
.lvup footer{display:flex;gap:8px;justify-content:flex-end;padding:10px 16px;border-top:1px solid var(--line);background:#f7f8fc;border-radius:0 0 12px 12px}
.lvup footer .go{background:#2a3170;color:#fff}
.lvup footer .sp{margin-right:auto}
.lvup .desc{font-size:12px;color:#40455c;white-space:pre-line;background:#f7f8fc;border-radius:6px;padding:6px 8px;margin:4px 0 8px}
.lvup table{border-collapse:collapse;width:100%;margin-bottom:8px;font-size:12.5px}
.lvup td{padding:3px 6px;border-bottom:1px solid #e6e8f2}
.lvup td:last-child{text-align:right;font-weight:600;white-space:nowrap}
.lvup .up{color:#2e9e5b}
#bLvl{background:#2e9e5b;border-color:#2e9e5b;color:#fff;font-weight:600}
@media print{#bLvl{display:none}}
`;

const ABILITY_SCORE_IMPROVEMENT_PATTERN = /am[ée]lioration de caract[ée]ristique|faveur [ée]pique/i;
const FIGHTING_STYLE_PATTERN = /style de combat/i;
const EPIC_BOON_LEVEL = 19;
const DEFAULT_SUBCLASS_LEVEL = 3;
const HIT_POINTS_AVERAGE = 'moy';
const HIT_POINTS_ROLL = 'jet';
const CREATED_FEATS_GROUP = 'Mes créations';

function addLevelUpButton() {
  document.head.insertAdjacentHTML('beforeend', '<style>' + LEVEL_UP_STYLES + '</style>');
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'bLvl';
  button.textContent = 'Monter de niveau';
  button.title = 'Assistant pas à pas : PV, nouvelles capacités, sous-classe, don, sorts';
  $('#bSave').before(button);
  return button;
}

function requiredLevel(feat) {
  const match = String(feat.pre || '').match(/niveau\s+(\d+)/i);
  return match ? +match[1] : 0;
}

function spellSlotsAt(spellcasting, level) {
  if (!spellcasting) return null;
  if (spellcasting.type === 'pacte') {
    const [slotCount, slotLevel] = (spellcasting.emp || classData.emplacements.pacte)[level - 1] || [0, 0];
    return slotCount ? { pacte: slotCount, niv: slotLevel } : {};
  }
  const slotsBySpellLevel = (classData.emplacements[spellcasting.type] || [])[level - 1] || [];
  const slots = {};
  slotsBySpellLevel.forEach((slotCount, index) => { if (slotCount) slots[index + 1] = slotCount; });
  return slots;
}

const changeTableHtml = rows => rows.length ? '<table>' + rows.map(([label, change]) => `<tr><td>${escapeHtml(label)}</td><td class="up">${escapeHtml(change)}</td></tr>`).join('') + '</table>' : '';
const featureListHtml = features => '<ul>' + features.map(feature => `<li><b>${escapeHtml(feature.nom)}</b> — ${escapeHtml(feature.desc).replace(/\n/g, '<br>')}</li>`).join('') + '</ul>';
const findFeat = featId => featList && featList.find(feat => feat.id === featId);

function describeLevelUp() {
  const fromLevel = currentLevel();
  const toLevel = fromLevel + 1;
  const characterClass = findCharacterClass();
  const className = characterClass && characterClass.name;
  const hitDie = (className && CLASS_HIT_DICE[className]) || hitDiceInfo().die;
  const subclassName = fieldValue('sclasse');
  const subclasses = className && subclassData && subclassData[className] || null;
  const subclassLevel = subclasses ? Math.min(...Object.values(subclasses).flatMap(subclass => subclass.feats.map(feature => feature.niv))) : DEFAULT_SUBCLASS_LEVEL;
  const newFeatures = (className && classFeaturesData && classFeaturesData[className] || []).filter(feature => feature.niv === toLevel);
  const newSubclassFeatures = subclassName && subclasses && subclasses[subclassName] ? subclasses[subclassName].feats.filter(feature => feature.niv === toLevel) : [];
  return {
    fromLevel, toLevel, characterClass, className, hitDie, subclassName, subclasses, subclassLevel, newFeatures, newSubclassFeatures,
    constitutionModifier: latestScores.modifiers.con || 0,
    needsSubclass: !!subclasses && !subclassName && toLevel >= subclassLevel,
    grantsFeat: newFeatures.some(feature => ABILITY_SCORE_IMPROVEMENT_PATTERN.test(feature.nom)),
    grantsFightingStyle: [...newFeatures, ...newSubclassFeatures].some(feature => FIGHTING_STYLE_PATTERN.test(feature.nom)),
    abilityTotals: derivedValues && derivedValues.tot || {},
    averageHitDie: Math.floor(hitDie / 2) + 1
  };
}

function classProgressRows(levelUp) {
  const rows = [];
  const { fromLevel, toLevel, characterClass } = levelUp;
  const previousBonus = proficiencyBonusAt(fromLevel);
  const nextBonus = proficiencyBonusAt(toLevel);
  if (nextBonus !== previousBonus) rows.push(['Bonus de maîtrise', signed(previousBonus) + ' → ' + signed(nextBonus)]);
  if (!characterClass) return rows;
  const definition = characterClass.data;
  (definition.ressources || []).forEach(resource => {
    const before = resourceMaximum(resource.max, fromLevel, latestScores.modifiers);
    const after = resourceMaximum(resource.max, toLevel, latestScores.modifiers);
    if (before !== after) rows.push([resource.nom, (before || '—') + ' → ' + after]);
  });
  (definition.infos || []).forEach(info => {
    if (!info.val) return;
    const before = info.val[fromLevel - 1];
    const after = info.val[toLevel - 1];
    if (before !== after) rows.push([info.nom, (before || '—') + ' → ' + after]);
  });
  const halfLevelInfo = (definition.infos || []).find(info => info.calc === 'moitie_sup');
  if (halfLevelInfo && Math.ceil(fromLevel / 2) !== Math.ceil(toLevel / 2)) rows.push([halfLevelInfo.nom, Math.ceil(fromLevel / 2) + ' → ' + Math.ceil(toLevel / 2)]);
  if (definition.liste) {
    const before = definition.liste.max[fromLevel - 1] || 0;
    const after = definition.liste.max[toLevel - 1] || 0;
    if (before !== after) rows.push([definition.liste.titre, before + ' → ' + after]);
  }
  return rows;
}

function spellcastingAfterLevelUp(classDefinition, subclassName) {
  if (classDefinition.lanceur) return { type: classDefinition.lanceur, mineurs: classDefinition.mineurs, prepares: classDefinition.prepares };
  const subclassRule = classDefinition.sous_classe;
  if (!subclassRule) return null;
  if (!isFieldChecked('sclance') && !thirdCasterPattern(subclassRule).test(subclassName || '')) return null;
  return { type: subclassRule.type || 'tiers', mineurs: subclassRule.mineurs, prepares: subclassRule.prepares, emp: subclassRule.emp };
}

function spellSlotRows(spellcasting, fromLevel, toLevel) {
  const rows = [];
  const before = spellSlotsAt(spellcasting, fromLevel);
  const after = spellSlotsAt(spellcasting, toLevel);
  if (spellcasting.type === 'pacte') {
    if (before.pacte !== after.pacte) rows.push(['Emplacements de pacte', (before.pacte || 0) + ' → ' + after.pacte]);
    if (before.niv !== after.niv) rows.push(['Niveau des emplacements de pacte', (before.niv || '—') + ' → ' + after.niv]);
    return rows;
  }
  for (let spellLevel = 1; spellLevel <= 9; spellLevel++) {
    if ((before[spellLevel] || 0) !== (after[spellLevel] || 0)) rows.push(['Emplacements de niveau ' + spellLevel, (before[spellLevel] || 0) + ' → ' + after[spellLevel]]);
  }
  return rows;
}

function spellRows(levelUp, subclassName) {
  if (!levelUp.characterClass) return [];
  const spellcasting = spellcastingAfterLevelUp(levelUp.characterClass.data, subclassName);
  if (!spellcasting) return [];
  const { fromLevel, toLevel } = levelUp;
  const rows = [];
  const cantripsBefore = valueAtLevel(spellcasting.mineurs, fromLevel) || 0;
  const cantripsAfter = valueAtLevel(spellcasting.mineurs, toLevel) || 0;
  if (cantripsBefore !== cantripsAfter) rows.push(['Sorts mineurs connus', cantripsBefore + ' → ' + cantripsAfter]);
  const preparedBefore = valueAtLevel(spellcasting.prepares, fromLevel) || 0;
  const preparedAfter = valueAtLevel(spellcasting.prepares, toLevel) || 0;
  if (preparedBefore !== preparedAfter) rows.push(['Sorts préparés', preparedBefore + ' → ' + preparedAfter]);
  return rows.concat(spellSlotRows(spellcasting, fromLevel, toLevel));
}

function availableFeats(toLevel) {
  if (!featList) return [];
  return featList.filter(feat => (feat.cat === 'Général' || (feat.cat === 'Faveur épique' && toLevel >= EPIC_BOON_LEVEL) || feat.c_)
    && requiredLevel(feat) <= toLevel && feat.cat !== 'Origine' && feat.cat !== 'Style de combat');
}

function availableFightingStyles() {
  return (featList || []).filter(feat => feat.cat === 'Style de combat' && !extras.dons.some(takenFeat => takenFeat.id === feat.id));
}

function createWizardState(levelUp) {
  return { hitPointsMethod: HIT_POINTS_AVERAGE, rolledHitDie: '', subclass: '', featId: levelUp.grantsFeat ? 'asi' : '', featChoices: {}, fightingStyleId: '' };
}

function hitDieResult(state, levelUp) {
  if (state.hitPointsMethod === HIT_POINTS_AVERAGE) return levelUp.averageHitDie;
  return Math.max(1, Math.min(levelUp.hitDie, parseInt(state.rolledHitDie) || 0));
}

function hitPointGain(state, levelUp) {
  if (state.hitPointsMethod === HIT_POINTS_ROLL && !state.rolledHitDie) return null;
  return Math.max(1, hitDieResult(state, levelUp) + levelUp.constitutionModifier);
}

function featChoiceOptions(choice, abilityTotals) {
  if (choice.t === 'carac') return choice.opts.map(key => [key, ABILITY_NAMES[key] + (abilityTotals[key] != null ? ' (' + abilityTotals[key] + ')' : '')]);
  if (choice.t === 'comp') return (choice.opts || SKILL_NAMES).map(name => [name, name]);
  return choice.opts.map(asOption).map(option => [option.v, option.v]);
}

function featChoiceFieldHtml(choice, state, abilityTotals) {
  if (choice.t === 'texte') {
    return `<label class="fld"><small>${escapeHtml(choice.lbl)}</small><input type="text" data-lvch="${escapeHtml(choice.id)}" value="${escapeHtml(state.featChoices[choice.id] || '')}" style="width:100%;border:1px solid var(--line);border-radius:6px;padding:5px 6px"></label>`;
  }
  const options = featChoiceOptions(choice, abilityTotals).map(([value, label]) => `<option value="${escapeHtml(value)}"${value === state.featChoices[choice.id] ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
  return `<label class="fld"><small>${escapeHtml(choice.lbl)}</small><select data-lvch="${escapeHtml(choice.id)}"><option value="">—</option>${options}</select></label>`;
}

function featChoicesHtml(feat, state, abilityTotals) {
  const choices = feat.choix || [];
  return choices.length ? '<div>' + choices.map(choice => featChoiceFieldHtml(choice, state, abilityTotals)).join('') + '</div>' : '';
}

function featChoicesSummary(feat, state) {
  const chosen = (feat.choix || []).map(choice => {
    const value = state.featChoices[choice.id];
    if (!value) return '';
    return choice.t === 'carac' ? ABILITY_NAMES[value] : value;
  }).filter(Boolean);
  if (feat.id === 'asi' && chosen.length === 2 && chosen[0] === chosen[1]) return ' (' + chosen[0] + ' +2)';
  return chosen.length ? ' (' + chosen.join(', ') + ')' : '';
}

function hitPointsStepHtml(levelUp, state) {
  const { hitDie, className, constitutionModifier, averageHitDie } = levelUp;
  const gain = hitPointGain(state, levelUp);
  return `
    <h4>Points de vie</h4>
    <p>Dé de vie : <b>d${hitDie}</b>${className ? ' (' + escapeHtml(className) + ')' : ''} · modificateur de Constitution <b>${signed(constitutionModifier)}</b></p>
    <label class="opt"><input type="radio" name="hp" value="${HIT_POINTS_AVERAGE}"${state.hitPointsMethod === HIT_POINTS_AVERAGE ? ' checked' : ''}><span><b>Valeur fixe : ${averageHitDie} ${signed(constitutionModifier)} = ${Math.max(1, averageHitDie + constitutionModifier)} PV</b><br><span class="hint">La moyenne du dé (règle par défaut).</span></span></label>
    <label class="opt"><input type="radio" name="hp" value="${HIT_POINTS_ROLL}"${state.hitPointsMethod === HIT_POINTS_ROLL ? ' checked' : ''}><span><b>Lancer le d${hitDie}</b>
      <span class="roll"><button type="button" id="lvRoll">Lancer</button><input type="number" id="lvRollV" min="1" max="${hitDie}" value="${escapeHtml(state.rolledHitDie)}" placeholder="1–${hitDie}" aria-label="Résultat du dé"></span>
      <span class="hint">Ou saisis le résultat de ton propre dé.</span></span></label>
    <p>Gain : <span class="big">${gain == null ? '—' : '+' + gain}</span> PV max <span class="hint">(au moins 1 ; tu gagnes aussi un dé de vie)</span></p>`;
}

function isAutomaticFeature(feature) {
  return ABILITY_SCORE_IMPROVEMENT_PATTERN.test(feature.nom) || feature.nom === 'Sous-classe' || feature.nom === 'Capacité de sous-classe';
}

function featuresStepHtml(levelUp) {
  const shownFeatures = levelUp.newFeatures.filter(feature => !isAutomaticFeature(feature));
  const subclassFeatures = levelUp.newSubclassFeatures;
  return `<h4>Ce que tu gagnes au niveau ${levelUp.toLevel}</h4>
    ${shownFeatures.length ? featureListHtml(shownFeatures) : ''}
    ${subclassFeatures.length ? `<p><b>${escapeHtml(levelUp.subclassName)}</b></p>` + featureListHtml(subclassFeatures) : ''}
    ${!shownFeatures.length && !subclassFeatures.length ? '<p class="hint">Pas de nouvelle capacité de classe à ce niveau, en dehors des choix des étapes suivantes.</p>' : ''}
    ${changeTableHtml(classProgressRows(levelUp))}
    <p class="hint">Tout cela s'affiche tout seul sur la fiche (capacités de classe, sous-classe, réserves) dès que le niveau change.</p>`;
}

function subclassOptionHtml(name, subclass, levelUp, state) {
  const featuresSoFar = subclass.feats.filter(feature => feature.niv <= levelUp.toLevel);
  return `<label class="opt"><input type="radio" name="sub" value="${escapeHtml(name)}"${state.subclass === name ? ' checked' : ''}><span><b>${escapeHtml(name)}</b><br><span class="hint">${featuresSoFar.map(feature => escapeHtml(feature.nom)).join(' · ')}</span></span></label>`;
}

function subclassStepHtml(levelUp, state) {
  return `
    <h4>Choisis ta sous-classe</h4>
    <p class="hint">Au niveau ${levelUp.subclassLevel}, ton ${escapeHtml(levelUp.className)} choisit une sous-classe.</p>
    ${Object.entries(levelUp.subclasses).map(([name, subclass]) => subclassOptionHtml(name, subclass, levelUp, state)).join('')}
    <label class="opt"><input type="radio" name="sub" value=""${!state.subclass ? ' checked' : ''}><span>Choisir plus tard</span></label>`;
}

const featGroupName = feat => feat.c_ ? CREATED_FEATS_GROUP : feat.cat;

function featSelectHtml(feats, selectedFeatId) {
  const groups = [...new Set(feats.map(featGroupName))];
  const groupHtml = group => `<optgroup label="${escapeHtml(group)}">${feats.filter(feat => featGroupName(feat) === group).map(feat => `<option value="${escapeHtml(feat.id)}"${feat.id === selectedFeatId ? ' selected' : ''}>${escapeHtml(feat.nom)}</option>`).join('')}</optgroup>`;
  return `<select id="lvDon"><option value="">Choisir plus tard</option>${groups.map(groupHtml).join('')}</select>`;
}

function featStepTitle(levelUp) {
  const epicBoon = levelUp.toLevel >= EPIC_BOON_LEVEL && levelUp.newFeatures.some(feature => /[ée]pique/i.test(feature.nom));
  return epicBoon ? 'Faveur épique ou don' : 'Amélioration de caractéristique ou don';
}

function featStepHtml(levelUp, state) {
  const feat = findFeat(state.featId);
  const featDetails = feat ? `${feat.pre ? `<p class="hint">Condition : ${escapeHtml(feat.pre)}</p>` : ''}<div class="desc">${escapeHtml(feat.desc)}</div>${featChoicesHtml(feat, state, levelUp.abilityTotals)}` : '';
  return `<h4>${featStepTitle(levelUp)}</h4>
    <p class="hint">Prends l'amélioration de caractéristique (+2 à une, ou +1 à deux, maximum 20) ou un autre don dont tu remplis les conditions.</p>
    <label class="fld"><small>Don</small>${featSelectHtml(availableFeats(levelUp.toLevel), state.featId)}</label>
    ${featDetails}`;
}

function fightingStyleStepHtml(state) {
  const style = findFeat(state.fightingStyleId);
  const options = availableFightingStyles().map(feat => `<option value="${escapeHtml(feat.id)}"${feat.id === state.fightingStyleId ? ' selected' : ''}>${escapeHtml(feat.nom)}</option>`).join('');
  return `<h4>Style de combat</h4>
    <p class="hint">Tu gagnes un don de Style de combat.</p>
    <label class="fld"><small>Style</small><select id="lvSty"><option value="">Choisir plus tard</option>${options}</select></label>
    ${style ? `<div class="desc">${escapeHtml(style.desc)}</div>` : ''}`;
}

function spellsStepHtml(levelUp, state) {
  const rows = spellRows(levelUp, state.subclass || levelUp.subclassName);
  const body = rows.length
    ? changeTableHtml(rows) + `<p>Choisis tes nouveaux sorts dans le <a href="grimoire.html" target="_blank" rel="noopener">Grimoire</a> une fois la montée de niveau appliquée. Les emplacements se mettent à jour tout seuls sur la fiche.</p>`
    : '<p class="hint">Pas de changement de sorts avec ce choix de sous-classe.</p>';
  return `<h4>Sorts</h4>${body}`;
}

function missingChoices(levelUp, state, gain, feat) {
  const missing = [];
  if (gain == null) missing.push('le résultat du dé de vie');
  if (levelUp.needsSubclass && !state.subclass) missing.push('la sous-classe');
  if (levelUp.grantsFeat && !state.featId) missing.push('le don');
  if (feat && (feat.choix || []).some(choice => choice.t !== 'texte' && !state.featChoices[choice.id])) missing.push('les choix du don');
  return missing;
}

function summaryStepHtml(levelUp, state) {
  const gain = hitPointGain(state, levelUp);
  const maximumHitPoints = parseInt(fieldValue('pvmax'));
  const hitDice = hitDiceInfo();
  const rows = [
    ['Niveau', levelUp.fromLevel + ' → ' + levelUp.toLevel],
    ['PV maximum', isNaN(maximumHitPoints) ? 'calculés à partir de la valeur fixe de chaque niveau' : maximumHitPoints + ' → ' + (gain == null ? '?' : maximumHitPoints + gain)],
    ['Dés de vie', hitDice.total + 'd' + levelUp.hitDie + ' → ' + (hitDice.total + 1) + 'd' + levelUp.hitDie]
  ];
  if (state.subclass) rows.push(['Sous-classe', state.subclass]);
  const feat = findFeat(state.featId);
  if (feat) rows.push(['Don', feat.nom + featChoicesSummary(feat, state)]);
  const style = findFeat(state.fightingStyleId);
  if (style) rows.push(['Style de combat', style.nom]);
  const missing = missingChoices(levelUp, state, gain, feat);
  return `<h4>Résumé</h4>${changeTableHtml(rows)}
    ${missing.length ? `<p class="hint">Reste à choisir : ${missing.join(', ')}. ${gain == null ? 'Le dé de vie est obligatoire ; ' : ''}le reste peut se faire plus tard sur la fiche.</p>` : ''}
    <p class="hint">« Appliquer » met à jour la fiche : niveau, PV maximum et actuels${state.subclass ? ', sous-classe' : ''}${feat || style ? ', dons' : ''}. Si ta Constitution change, les PV des niveaux précédents suivent aussi.</p>`;
}

function wizardSteps(levelUp, state) {
  const steps = [{ title: 'Points de vie', html: () => hitPointsStepHtml(levelUp, state) }];
  if (levelUp.newFeatures.length || levelUp.newSubclassFeatures.length || classProgressRows(levelUp).length) steps.push({ title: 'Capacités', html: () => featuresStepHtml(levelUp) });
  if (levelUp.needsSubclass) steps.push({ title: 'Sous-classe', html: () => subclassStepHtml(levelUp, state) });
  if (levelUp.grantsFeat && featList) steps.push({ title: 'Don', html: () => featStepHtml(levelUp, state) });
  if (levelUp.grantsFightingStyle && featList) steps.push({ title: 'Style de combat', html: () => fightingStyleStepHtml(state) });
  const subclassCouldCast = levelUp.needsSubclass && levelUp.characterClass && levelUp.characterClass.data.sous_classe;
  if (spellRows(levelUp, levelUp.subclassName).length || subclassCouldCast) steps.push({ title: 'Sorts', html: () => spellsStepHtml(levelUp, state) });
  steps.push({ title: 'Résumé', html: () => summaryStepHtml(levelUp, state) });
  return steps;
}

function addChosenFeats(state) {
  if (state.featId) extras.dons.push({ u: randomInstanceId(), id: state.featId, ch: Object.assign({}, state.featChoices) });
  if (state.fightingStyleId) extras.dons.push({ u: randomInstanceId(), id: state.fightingStyleId, ch: {} });
}

function applyChosenSubclass(levelUp, state) {
  if (!state.subclass) return;
  sheetField('sclasse').value = state.subclass;
  sheetField('sousclasse').value = state.subclass;
  const subclassRule = levelUp.characterClass && levelUp.characterClass.data.sous_classe;
  if (subclassRule && sheetField('sclance')) sheetField('sclance').checked = thirdCasterPattern(subclassRule).test(state.subclass);
}

function raiseLevelAndHitDice(levelUp, previousHitDice, previousRemainingText) {
  sheetField('niveau').value = levelUp.toLevel;
  if (fieldValue('clsel') && CLASS_HIT_DICE[fieldValue('clsel')]) {
    updateHitDiceTotal();
  } else {
    const match = fieldValue('dvtot').match(/^\s*(\d+)\s*d\s*(\d+)\s*$/i);
    sheetField('dvtot').value = match ? (+match[1] + 1) + 'd' + match[2] : levelUp.toLevel + 'd' + levelUp.hitDie;
  }
  if (previousRemainingText !== '') sheetField('dvrest').value = Math.min(previousHitDice.total + 1, (parseInt(previousRemainingText) || 0) + 1);
}

const hitPointsPerLevelAt = level => computeEffects(level, proficiencyBonusAt(level)).hitPointsPerLevel;

function maximumHitPointsFromScratch(levelUp, state) {
  const constitutionModifier = latestScores.modifiers.con || 0;
  const firstLevel = Math.max(1, levelUp.hitDie + constitutionModifier);
  const middleLevels = (levelUp.toLevel - 2) * Math.max(1, levelUp.averageHitDie + constitutionModifier);
  const thisLevel = Math.max(1, hitDieResult(state, levelUp) + constitutionModifier);
  return firstLevel + middleLevels + thisLevel + hitPointsPerLevelAt(levelUp.toLevel);
}

function applyLevelUp(levelUp, state) {
  const gain = hitPointGain(state, levelUp);
  if (gain == null) return;
  const previousPerLevelBonus = hitPointsPerLevelAt(levelUp.fromLevel);
  const previousHitDice = hitDiceInfo();
  const previousRemainingText = fieldValue('dvrest').trim();
  addChosenFeats(state);
  applyChosenSubclass(levelUp, state);
  raiseLevelAndHitDice(levelUp, previousHitDice, previousRemainingText);
  clearRenderCache();
  recalculateSheet();
  const constitutionChange = (latestScores.modifiers.con || 0) - levelUp.constitutionModifier;
  const perLevelBonusChange = hitPointsPerLevelAt(levelUp.toLevel) - previousPerLevelBonus;
  const addedHitPoints = gain + constitutionChange * levelUp.toLevel + perLevelBonusChange;
  const maximumHitPoints = parseInt(fieldValue('pvmax'));
  const hitPoints = parseInt(fieldValue('pv'));
  const newMaximum = isNaN(maximumHitPoints) ? maximumHitPointsFromScratch(levelUp, state) : maximumHitPoints + addedHitPoints;
  sheetField('pvmax').value = newMaximum;
  sheetField('pv').value = isNaN(hitPoints) ? newMaximum : Math.min(newMaximum, hitPoints + (isNaN(maximumHitPoints) ? newMaximum : addedHitPoints));
  recalculateSheet();
  autosave();
  const feat = findFeat(state.featId);
  showSheetMessage('Niveau ' + levelUp.toLevel + ' ! ' + (isNaN(maximumHitPoints) ? 'PV max calculés : ' + newMaximum : 'PV max +' + addedHitPoints) + (feat ? ' · don : ' + feat.nom : '') + (state.subclass ? ' · ' + state.subclass : ''));
}

function wizardHtml(levelUp, state, steps, stepIndex) {
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const classLabel = levelUp.className ? ' · ' + escapeHtml(levelUp.className) : ' · classe non reconnue (dé de vie d' + levelUp.hitDie + ')';
  const stepBadges = steps.map((other, index) => `<span class="${index === stepIndex ? 'on' : index < stepIndex ? 'ok' : ''}">${index + 1}. ${escapeHtml(other.title)}</span>`).join('');
  const previousButton = stepIndex ? '<button type="button" data-a="p">Précédent</button>' : '';
  const forwardButton = `<button type="button" class="go" data-a="${isLastStep ? 'ok' : 'n'}"${isLastStep && hitPointGain(state, levelUp) == null ? ' disabled' : ''}>${isLastStep ? 'Appliquer' : 'Suivant'}</button>`;
  return `<form method="dialog">
      <header><h3>Monter de niveau : ${levelUp.fromLevel} → ${levelUp.toLevel}</h3><small>${escapeHtml(fieldValue('nom') || 'Personnage')}${classLabel}</small>
      <div class="steps">${stepBadges}</div></header>
      <div class="bd">${step.html()}</div>
      <footer><button type="button" class="sp" data-a="x">Annuler</button>${previousButton}${forwardButton}</footer>
    </form>`;
}

function updateStateFromField(field, state) {
  if (field.name === 'hp') state.hitPointsMethod = field.value;
  else if (field.name === 'sub') state.subclass = field.value;
  else if (field.id === 'lvDon') {
    state.featId = field.value;
    state.featChoices = {};
  } else if (field.id === 'lvSty') state.fightingStyleId = field.value;
  else if (field.dataset.lvch !== undefined) state.featChoices[field.dataset.lvch] = field.value;
  else if (field.id === 'lvRollV') {
    state.hitPointsMethod = HIT_POINTS_ROLL;
    state.rolledHitDie = field.value;
  } else return false;
  return true;
}

function openLevelUpWizard(levelUp) {
  const state = createWizardState(levelUp);
  const steps = wizardSteps(levelUp, state);
  let stepIndex = 0;
  const dialog = document.createElement('dialog');
  dialog.className = 'lvup';
  document.body.appendChild(dialog);
  const draw = () => { dialog.innerHTML = wizardHtml(levelUp, state, steps, stepIndex); };
  const WIZARD_ACTIONS = {
    x: () => dialog.close(),
    p: () => { stepIndex--; draw(); },
    n: () => { stepIndex++; draw(); dialog.querySelector('.bd').scrollTop = 0; },
    ok: () => { applyLevelUp(levelUp, state); dialog.close(); }
  };
  dialog.addEventListener('click', event => {
    if (event.target.id === 'lvRoll') {
      state.hitPointsMethod = HIT_POINTS_ROLL;
      state.rolledHitDie = String(1 + Math.floor(Math.random() * levelUp.hitDie));
      draw();
      return;
    }
    const action = event.target.dataset && event.target.dataset.a;
    if (action && WIZARD_ACTIONS[action]) WIZARD_ACTIONS[action]();
  });
  dialog.addEventListener('change', event => {
    const field = event.target;
    if (!updateStateFromField(field, state)) return;
    event.stopPropagation();
    if (field.type !== 'text') draw();
  });
  dialog.addEventListener('input', event => {
    const field = event.target;
    if (field.dataset.lvch !== undefined && field.type === 'text') state.featChoices[field.dataset.lvch] = field.value;
    event.stopPropagation();
  });
  dialog.addEventListener('close', () => dialog.remove());
  draw();
  dialog.showModal();
}

function startLevelUp() {
  if (!classData && !classFeaturesData) {
    alert('Les données de classes ne sont pas encore chargées.');
    return;
  }
  recalculateSheet();
  if (currentLevel() >= MAXIMUM_LEVEL) {
    alert('Le personnage est déjà au niveau 20, le niveau maximum.');
    return;
  }
  openLevelUpWizard(describeLevelUp());
}

addLevelUpButton().addEventListener('click', startLevelUp);
})();
