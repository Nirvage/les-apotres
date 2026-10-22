(function () {
'use strict';

const ABILITIES = [['for', 'Force'], ['dex', 'Dextérité'], ['con', 'Constitution'], ['int', 'Intelligence'], ['sag', 'Sagesse'], ['cha', 'Charisme']];
const SKILL_NAMES = ['Acrobaties', 'Arcanes', 'Athlétisme', 'Discrétion', 'Dressage', 'Escamotage', 'Histoire', 'Intimidation', 'Intuition', 'Investigation', 'Médecine', 'Nature', 'Perception', 'Persuasion', 'Religion', 'Représentation', 'Supercherie', 'Survie'];
const ABILITY_NAMES = {};
ABILITIES.forEach(([key, name]) => { ABILITY_NAMES[key] = name; });

const EFFECT_TYPES_BY_KIND = {
  objets: [
    { type: 'set', label: 'Caractéristique fixée à une valeur', inputs: 'cn', hint: 'ex. Bandeau d’intelligence : Intelligence 19 (sans effet si elle est déjà plus haute)' },
    { type: 'carac', label: 'Bonus à une caractéristique (max 20)', inputs: 'cn', hint: '' },
    { type: 'ca', label: 'Bonus à la CA', inputs: 'n', hint: '' },
    { type: 'sv', label: 'Bonus à tous les jets de sauvegarde', inputs: 'n', hint: '' },
    { type: 'tests', label: 'Bonus aux tests de caractéristique', inputs: 'n', hint: '' },
    { type: 'init', label: 'Bonus à l’initiative', inputs: 'n', hint: '' },
    { type: 'satk', label: 'Bonus aux attaques de sort', inputs: 'n', hint: '' },
    { type: 'sdd', label: 'Bonus au DD des sorts', inputs: 'n', hint: '' },
    { type: 'vit', label: 'Vitesse en plus (m)', inputs: 'n', hint: '' },
    { type: 'arme', label: 'Bonus aux jets d’attaque et de dégâts de l’arme', inputs: 'n', hint: '' }
  ],
  dons: [
    { type: 'carac', label: 'Caractéristique +1', inputs: 'c*', hint: '' },
    { type: 'comp', label: 'Maîtrise d’une compétence', inputs: 's*', hint: '' },
    { type: 'exp', label: 'Expertise d’une compétence', inputs: 's*', hint: '' },
    { type: 'sv', label: 'Maîtrise d’un jet de sauvegarde', inputs: 'c*', hint: '' },
    { type: 'init_pb', label: 'Initiative + bonus de maîtrise', inputs: '', hint: '' },
    { type: 'pv_niv', label: 'PV max en plus par niveau', inputs: 'n', hint: '' },
    { type: 'vit', label: 'Vitesse en plus (m)', inputs: 'n', hint: '' },
    { type: 'ca', label: 'Bonus à la CA', inputs: 'n', hint: '' },
    { type: 'res', label: 'Réserve d’utilisations', inputs: 'r', hint: '' }
  ]
};
const PLAYER_CHOICE = ['*', 'Au choix du joueur'];
const RESOURCE_MAX_OPTIONS = [['pb', 'Bonus de maîtrise'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']];
const RECOVERY_OPTIONS = ['repos long', 'repos court ou long'];
const COIN_VALUES_IN_GOLD = { pp: 10, po: 1, pe: .5, pa: .1, pc: .01 };
const KIND_TITLES = { objets: 'objet magique', equipement: 'objet d’équipement', dons: 'don' };

const escapeHtml = value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const trimmed = value => String(value || '').trim();
const textToHtml = text => escapeHtml(trimmed(text)).replace(/\n+/g, '<br>');
const parseDecimal = value => parseFloat(String(value).replace(',', '.'));

function optionsHtml(choices, selectedValue) {
  return choices.map(choice => {
    const value = Array.isArray(choice) ? choice[0] : choice;
    const label = Array.isArray(choice) ? choice[1] : choice;
    return '<option value="' + escapeHtml(value) + '"' + (value === selectedValue ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
  }).join('');
}

function priceInGold(price) {
  const match = String(price || '').replace(',', '.').match(/([\d.]+)\s*(pp|po|pe|pa|pc)?/i);
  if (!match) return 0;
  const amount = parseFloat(match[1]) || 0;
  const coin = (match[2] || 'po').toLowerCase();
  return amount * COIN_VALUES_IN_GOLD[coin];
}

const EDITOR_CSS = '.cx{border:0;border-radius:12px;padding:0;width:min(560px,94vw);max-height:92vh;box-shadow:0 10px 40px #0008}'
 +'.cx::backdrop{background:#0008}'
 +'.cx form{display:flex;flex-direction:column;gap:9px;padding:14px 16px 16px}'
 +'.cx h3{margin:0;font:italic 700 18px var(--serif);color:#2a3170}'
 +'.cx .cg{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}'
 +'.cx label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--soft);min-width:0}'
 +'.cx label.full{grid-column:1/-1}'
 +'.cx label.chk{flex-direction:row;align-items:center;gap:6px;font-size:13px;color:var(--ink)}'
 +'.cx input:not([type=checkbox]),.cx select,.cx textarea{width:100%;border:1px solid var(--line);border-radius:5px;padding:6px 8px;background:#fff;font-size:13px}'
 +'.cx textarea{min-height:110px;resize:vertical}'
 +'.cx fieldset{border:1px solid var(--line);border-radius:8px;padding:6px 10px 10px;margin:0}'
 +'.cx legend{font:700 12px var(--sans);color:#2a3170;padding:0 4px}'
 +'.cx .fxr{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}'
 +'.cx .fxr select,.cx .fxr input{width:auto;flex:1 1 120px}'
 +'.cx .fxr input[type=number]{flex:0 0 70px}'
 +'.cx .fxr .fxh{flex:1 1 100%;font-size:11px;color:var(--soft)}'
 +'.cx .cb{border:1.5px solid var(--c,#2a3170);background:#fff;color:var(--c,#2a3170);border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:600;font-size:12px;min-height:34px}'
 +'.cx .cb.ok{background:#2a3170;color:#fff}'
 +'.cx .cb.del{--c:#c8402f;margin-right:auto}'
 +'.cx .acts{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}'
 +'.cx .err{color:#c8402f;font-size:12px;margin:0}'
 +'.cx .hint{margin:0;font-size:12px;color:var(--soft)}'
 +'.cx [hidden]{display:none!important}'
 +'@media (max-width:560px){.cx .cg{grid-template-columns:1fr}}';

function effectDefinition(kind, type) {
  const definitions = EFFECT_TYPES_BY_KIND[kind];
  return definitions.find(definition => definition.type === type) || definitions[0];
}

function defaultEffectValue(definition) {
  return definition.type === 'set' ? 19 : 1;
}

function resourceInputsHtml(effect) {
  return '<input type="text" data-f="nom" placeholder="Nom de la réserve" value="' + escapeHtml(effect.nom || '') + '">'
    + '<select data-f="max" aria-label="Nombre d’utilisations">' + optionsHtml(RESOURCE_MAX_OPTIONS, String(effect.max || 'pb')) + '</select>'
    + '<select data-f="repos" aria-label="Récupération">' + optionsHtml(RECOVERY_OPTIONS, effect.repos || 'repos long') + '</select>';
}

function effectRowHtml(kind, effect) {
  effect = effect || {};
  const definition = effectDefinition(kind, effect.t);
  const inputs = definition.inputs;
  const allowsPlayerChoice = inputs.indexOf('*') >= 0;
  const abilityChoices = (allowsPlayerChoice ? [PLAYER_CHOICE] : []).concat(ABILITIES);
  const skillChoices = (allowsPlayerChoice ? [PLAYER_CHOICE] : []).concat(SKILL_NAMES.map(skill => [skill, skill]));
  const typeChoices = EFFECT_TYPES_BY_KIND[kind].map(other => [other.type, other.label]);
  let html = '<div class="fxr"><select data-f="t" aria-label="Type d’effet">' + optionsHtml(typeChoices, definition.type) + '</select>';
  if (inputs[0] === 'c') html += '<select data-f="c" aria-label="Caractéristique">' + optionsHtml(abilityChoices, effect.c || '') + '</select>';
  if (inputs[0] === 's') html += '<select data-f="c" aria-label="Compétence">' + optionsHtml(skillChoices, effect.c || '') + '</select>';
  if (inputs.indexOf('n') >= 0) html += '<input type="number" data-f="n" aria-label="Valeur" value="' + escapeHtml(effect.n != null ? effect.n : defaultEffectValue(definition)) + '">';
  if (inputs === 'r') html += resourceInputsHtml(effect);
  html += '<button type="button" class="cb" style="--c:#c8402f" data-fxdel>Retirer</button>';
  if (definition.hint) html += '<span class="fxh">' + escapeHtml(definition.hint) + '</span>';
  return html + '</div>';
}

function readEffectRows(container) {
  return [...container.querySelectorAll('.fxr')].map(row => {
    const effect = {};
    row.querySelectorAll('[data-f]').forEach(field => { effect[field.dataset.f] = field.value; });
    if ('n' in effect) effect.n = parseDecimal(effect.n) || 0;
    return effect;
  });
}

function abilityFeatEffect(effect, choiceId, choices) {
  const isSave = effect.t === 'sv';
  if (effect.c !== '*') return isSave ? { t: 'sv', v: effect.c } : { t: 'carac', v: effect.c, max: 20 };
  choices.push({ id: choiceId, t: 'carac', lbl: isSave ? 'Jet de sauvegarde' : 'Caractéristique +1', opts: ABILITIES.map(([key]) => key) });
  return isSave ? { t: 'sv', c: choiceId } : { t: 'carac', c: choiceId, max: 20 };
}

function skillFeatEffect(effect, choiceId, choices) {
  if (effect.c !== '*') return { t: effect.t, v: effect.c };
  choices.push({ id: choiceId, t: 'comp', lbl: effect.t === 'exp' ? 'Expertise' : 'Compétence' });
  return { t: effect.t, c: choiceId };
}

function resourceFeatEffect(effect, number) {
  if (!trimmed(effect.nom)) return null;
  return { t: 'res', id: 'r' + number, nom: trimmed(effect.nom), max: effect.max === 'pb' ? 'pb' : +effect.max || 1, repos: effect.repos };
}

function featEffect(effect, number, choices) {
  const choiceId = 'c' + number;
  if (effect.t === 'carac' || effect.t === 'sv') return abilityFeatEffect(effect, choiceId, choices);
  if (effect.t === 'comp' || effect.t === 'exp') return skillFeatEffect(effect, choiceId, choices);
  if (effect.t === 'res') return resourceFeatEffect(effect, number);
  if (effect.t === 'init_pb') return { t: 'init_pb' };
  return effect.n ? { t: effect.t, n: effect.n } : null;
}

function featEffectsAndChoices(effects) {
  const choices = [];
  const featEffects = effects.map((effect, index) => featEffect(effect, index + 1, choices)).filter(Boolean);
  return { fx: featEffects, choix: choices };
}

function magicItemEffects(effects) {
  return effects.filter(effect => effect.n).map(effect => {
    const itemEffect = { t: effect.t, n: effect.n };
    if (effect.c) itemEffect.v = effect.c;
    return itemEffect;
  });
}

function addEditorStyleOnce() {
  if (document.getElementById('cxcss')) return;
  const style = document.createElement('style');
  style.id = 'cxcss';
  style.textContent = EDITOR_CSS;
  document.head.appendChild(style);
}

function magicItemFieldsHtml(options, item, formValues) {
  return '<label>Type<select name="t">' + optionsHtml(options.types, item ? item.t : 'Objet merveilleux') + '</select></label>'
    + '<label>Rareté<select name="q">' + optionsHtml(options.rares, item ? item.q : 'Peu courant') + '</select></label>'
    + '<label class="chk"><input type="checkbox" name="a"' + (item && item.a ? ' checked' : '') + '> Demande une harmonisation</label>'
    + '<label>Précision (facultatif)<input name="ap" placeholder="par un magicien" value="' + escapeHtml(formValues.ap) + '"></label>'
    + '<label class="full" data-w>Arme de base<select name="base"><option value="">—</option>' + optionsHtml(options.weapons || [], item && item.base || '') + '</select></label>';
}

function equipmentFieldsHtml(options, item, formValues) {
  return '<label>Type<select name="t">' + optionsHtml(options.types, item ? item.t : 'Équipement d’aventurier') + '</select></label>'
    + '<label>Catégorie<input name="c" list="cxcats" value="' + escapeHtml(item ? item.c : '') + '"><datalist id="cxcats"></datalist></label>'
    + '<label>Coût<input name="p" placeholder="15 po" value="' + escapeHtml(item ? item.p : '') + '"></label>'
    + '<label>Poids (kg)<input name="kg" type="number" min="0" step="0.05" value="' + escapeHtml(item ? item.kg : '') + '"></label>'
    + '<label data-w>Dégâts<input name="deg" placeholder="1d8 tranchants" value="' + escapeHtml(formValues.deg) + '"></label>'
    + '<label data-w>Propriétés<input name="prop" placeholder="Finesse, Légère" value="' + escapeHtml(formValues.prop) + '"></label>'
    + '<label class="full" data-ar>Classe d’armure<input name="ca" placeholder="12 + mod. de Dex (max 2)" value="' + escapeHtml(formValues.ca) + '"></label>';
}

function featFieldsHtml(options, item) {
  return '<label>Catégorie<select name="cat">' + optionsHtml(options.cats, item ? item.cat : 'Général') + '</select></label>'
    + '<label>Prérequis (facultatif)<input name="pre" placeholder="Niveau 4+" value="' + escapeHtml(item && item.pre) + '"></label>';
}

function kindFieldsHtml(kind, options, item, formValues) {
  if (kind === 'objets') return magicItemFieldsHtml(options, item, formValues);
  if (kind === 'equipement') return equipmentFieldsHtml(options, item, formValues);
  return featFieldsHtml(options, item);
}

function effectsFieldsetHtml(kind, formValues) {
  if (!EFFECT_TYPES_BY_KIND[kind]) return '';
  const hint = kind === 'dons'
    ? 'Appliqués automatiquement quand le don est ajouté à la fiche.'
    : 'Appliqués sur la fiche quand tu es harmonisé avec l’objet, ou dès qu’il est dans tes objets s’il ne demande pas d’harmonisation.';
  const rows = (formValues.fx || []).map(effect => effectRowHtml(kind, effect)).join('');
  return '<fieldset><legend>Effets sur la fiche</legend><p class="hint">' + hint + '</p><div data-fx>' + rows + '</div><button type="button" class="cb" data-fxadd style="margin-top:8px">+ Ajouter un effet</button></fieldset>';
}

function creationName(kind, item) {
  return kind === 'dons' ? item.nom : item.n;
}

function editorFormHtml(options) {
  const { kind, item } = options;
  const isFeat = kind === 'dons';
  const formValues = item && item.f_ || {};
  const description = isFeat ? item && item.desc : formValues.d;
  const deleteButton = item ? '<button type="button" class="cb del" data-del>Supprimer</button>' : '';
  return '<form method="dialog"><h3>' + (item ? 'Modifier' : 'Créer') + ' un ' + KIND_TITLES[kind] + '</h3><div class="cg">'
    + '<label class="full">Nom<input name="n" required maxlength="80" value="' + escapeHtml(item && creationName(kind, item)) + '"></label>'
    + kindFieldsHtml(kind, options, item, formValues)
    + '<label class="full">Description<textarea name="d">' + escapeHtml(description) + '</textarea></label></div>'
    + effectsFieldsetHtml(kind, formValues)
    + '<p class="err" data-err></p><div class="acts">' + deleteButton + '<button type="button" class="cb" data-cancel>Annuler</button><button type="submit" class="cb ok">Enregistrer</button></div></form>';
}

const isWeaponType = type => type === 'Arme' || type === 'Munition';

function magicItemFromForm(form, name, description, effects) {
  const attunementDetail = trimmed(form.ap.value);
  const attunement = form.a.checked ? 'Harmonisation' + (attunementDetail ? ' (' + attunementDetail + ')' : '') : '';
  const baseWeapon = isWeaponType(form.t.value) ? form.base.value : '';
  const baseWeaponHeader = baseWeapon ? escapeHtml(form.t.value) + ' (' + escapeHtml(baseWeapon.toLowerCase()) + ').' + (trimmed(description) ? '<br>' : '') : '';
  const item = {
    n: name, en: '', t: form.t.value, q: form.q.value, a: attunement, h: baseWeaponHeader + textToHtml(description),
    src: 'Création personnelle', c_: 1, fx: magicItemEffects(effects), f_: { ap: attunementDetail, d: description, fx: effects }
  };
  if (baseWeapon) item.base = baseWeapon;
  return item;
}

function equipmentFromForm(form, name, description) {
  const type = form.t.value;
  const damage = isWeaponType(type) ? trimmed(form.deg.value) : '';
  const properties = isWeaponType(type) ? trimmed(form.prop.value) : '';
  const armorClass = type === 'Armure' ? trimmed(form.ca.value) : '';
  const header = (damage ? 'Dégâts : ' + escapeHtml(damage) + '. ' : '') + (properties ? 'Propriétés : ' + escapeHtml(properties) + '. ' : '') + (armorClass ? 'Classe d’armure : ' + escapeHtml(armorClass) + '. ' : '');
  return {
    n: name, en: '', t: type, c: trimmed(form.c.value) || type, p: trimmed(form.p.value) || '—', po: priceInGold(form.p.value),
    kg: Math.max(0, parseDecimal(form.kg.value) || 0), h: (header ? trimmed(header) + (trimmed(description) ? '<br>' : '') : '') + textToHtml(description),
    src: 'Création personnelle', c_: 1, f_: { deg: damage, prop: properties, ca: armorClass, d: description }
  };
}

function newFeatId() {
  return 'perso_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function featFromForm(form, name, description, effects, existingFeat) {
  const featEffects = featEffectsAndChoices(effects);
  return {
    id: existingFeat ? existingFeat.id : newFeatId(), nom: name, cat: form.cat.value, pre: trimmed(form.pre.value), desc: trimmed(description),
    choix: featEffects.choix, fx: featEffects.fx, src: 'Création personnelle', c_: 1, f_: { fx: effects }
  };
}

function isSameCreation(kind, first, second) {
  return kind === 'dons' ? first.id === second.id : first.n === second.n;
}

function saveCreation(kind, creation, previous) {
  const creations = Persos.custom()[kind];
  const position = previous ? creations.findIndex(existing => isSameCreation(kind, existing, previous)) : -1;
  if (position >= 0) creations[position] = creation;
  else creations.push(creation);
  Persos.setCustom(kind, creations);
}

function deleteCreation(kind, creation) {
  const remaining = Persos.custom()[kind].filter(existing => existing !== creation && !isSameCreation(kind, existing, creation));
  Persos.setCustom(kind, remaining);
}

function bindTypeDependentFields(dialog, form, options) {
  const { kind, item } = options;
  const categoryList = dialog.querySelector('#cxcats');
  const showFieldsForType = () => {
    const type = form.t && form.t.value;
    dialog.querySelectorAll('[data-w]').forEach(field => { field.hidden = !isWeaponType(type); });
    dialog.querySelectorAll('[data-ar]').forEach(field => { field.hidden = type !== 'Armure'; });
    if (kind !== 'equipement') return;
    const categories = (options.cats && options.cats[type]) || [];
    categoryList.innerHTML = optionsHtml(categories);
    if (!item && !form.c.dataset.touched) form.c.value = categories[0] || '';
  };
  if (form.t) form.t.addEventListener('change', showFieldsForType);
  if (form.c && kind === 'equipement') form.c.addEventListener('input', () => { form.c.dataset.touched = 1; });
  showFieldsForType();
}

function bindEffectRows(dialog, kind) {
  const effectsContainer = dialog.querySelector('[data-fx]');
  if (!effectsContainer) return;
  dialog.querySelector('[data-fxadd]').onclick = () => effectsContainer.insertAdjacentHTML('beforeend', effectRowHtml(kind));
  effectsContainer.addEventListener('change', event => {
    if (event.target.dataset.f !== 't') return;
    event.target.closest('.fxr').outerHTML = effectRowHtml(kind, { t: event.target.value });
  });
  effectsContainer.addEventListener('click', event => {
    if (event.target.closest('[data-fxdel]')) event.target.closest('.fxr').remove();
  });
}

function nameError(options, name, previousName) {
  if (!name) return 'Donne un nom.';
  if (name !== previousName && options.taken(name)) return 'Ce nom est déjà utilisé : choisis-en un autre.';
  return '';
}

function creationFromForm(dialog, form, options) {
  const { kind, item } = options;
  const name = trimmed(form.n.value);
  const description = form.d.value;
  const effectsContainer = dialog.querySelector('[data-fx]');
  const effects = effectsContainer ? readEffectRows(effectsContainer) : [];
  if (kind === 'objets') return magicItemFromForm(form, name, description, effects);
  if (kind === 'equipement') return equipmentFromForm(form, name, description);
  return featFromForm(form, name, description, effects, item);
}

function submitCreation(dialog, form, options, closeEditor) {
  const { kind, item } = options;
  const name = trimmed(form.n.value);
  const previousName = item ? creationName(kind, item) : null;
  const error = nameError(options, name, previousName);
  if (error) {
    dialog.querySelector('[data-err]').textContent = error;
    return;
  }
  const creation = creationFromForm(dialog, form, options);
  saveCreation(kind, creation, item);
  if (previousName && previousName !== name && kind !== 'dons') Persos.renameCustom(kind, previousName, name);
  closeEditor();
  options.done(creation, item);
}

function confirmAndDeleteCreation(options, closeEditor) {
  const { kind, item } = options;
  if (!confirm('Supprimer « ' + creationName(kind, item) + ' » de tes créations ? Il sera retiré de tous les personnages qui l’utilisent.')) return;
  deleteCreation(kind, item);
  closeEditor();
  options.done(null, item);
}

function openCreationEditor(options) {
  addEditorStyleOnce();
  const dialog = document.createElement('dialog');
  dialog.className = 'cx';
  dialog.innerHTML = editorFormHtml(options);
  document.body.appendChild(dialog);
  const form = dialog.querySelector('form');
  const closeEditor = () => {
    dialog.close();
    dialog.remove();
  };
  bindTypeDependentFields(dialog, form, options);
  bindEffectRows(dialog, options.kind);
  dialog.querySelector('[data-cancel]').onclick = closeEditor;
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeEditor();
  });
  if (options.item) dialog.querySelector('[data-del]').onclick = () => confirmAndDeleteCreation(options, closeEditor);
  form.onsubmit = event => {
    event.preventDefault();
    submitCreation(dialog, form, options, closeEditor);
  };
  dialog.showModal();
  form.n.focus();
}

window.Custom = { edit: openCreationEditor, ABN: ABILITY_NAMES };
})();
