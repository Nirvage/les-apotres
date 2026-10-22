const RULE_EDITIONS = {
  '2024': { label: 'Manuel des joueurs 2024', color: '#2a3170' },
  'sup': { label: 'Suppléments (compatibles 2024)', color: '#12968f' },
  '2014': { label: 'Règles 2014 seulement', color: '#b0632a' }
};
const NOTABLE_FEATURES = [
  ['Vision dans le noir', /vision dans le noir/],
  ['Vol', /vitesse de vol|\bvol\b/],
  ['Nage', /vitesse de nage|\bnage\b|amphibie/],
  ['Escalade', /vitesse d'escalade|arboricole/],
  ['Téléportation', /teleport/],
  ['Résistance aux dégâts', /resistance aux degats|resistance a(ux)? (l'|la )?(acide|feu|froid|foudre|poison|degats)|immunite aux degats/],
  ['Armure naturelle', /armure naturelle|carapace/],
  ['Télépathie', /telepath/],
  ['Sorts innés', /tour de magie|toujours le sort|vous pouvez lancer|lancer .{0,40} (sans emplacement|grace a ce trait)/],
  ['Attaque naturelle', /griffes|morsure|cornes|sabots|serres|coup de tete/],
  ['Pas besoin de dormir', /transe|sans sommeil|repos de sentinelle/]
];
const DEFAULT_FILTERS = { q: '', e: '', t: '', y: '', p: '' };
const FILTER_INPUTS = [['#fq', 'q', 'input'], ['#fe', 'e', 'change'], ['#ft', 't', 'change'], ['#fy', 'y', 'change'], ['#fp', 'p', 'change']];

let allSpecies = [];
const filters = Object.assign({}, DEFAULT_FILTERS);
const openSpeciesNames = new Set();

const meters = value => String(value).replace('.', ',') + ' m';
const traitText = trait => trait.nom + ' ' + trait.desc;

function specialMovements(normalizedTraits) {
  const movements = [];
  if (/vitesse de vol/.test(normalizedTraits)) movements.push('vol');
  if (/vitesse de nage|\bnage\b/.test(normalizedTraits)) movements.push('nage');
  if (/vitesse d'escalade|arboricole/.test(normalizedTraits)) movements.push('escalade');
  return movements;
}

function speciesEntry(name, species, edition, infoByName) {
  const info = infoByName[name] || species;
  const lineage = species.lignage && species.lignage.opts ? species.lignage : null;
  const lineageTraits = lineage ? lineage.opts.flatMap(option => option.traits || []) : [];
  const allTraitsText = [...species.traits, ...lineageTraits].map(traitText).join(' ');
  const normalizedTraits = normalizeText(allTraitsText);
  const lineageNames = lineage ? lineage.opts.map(option => option.v).join(' ') : '';
  const baseTraitsText = species.traits.filter(trait => !/\(niv\./.test(trait.nom)).map(traitText).join(' ');
  return {
    n: name, s: species, ed: edition, typ: info.type || 'Humanoïde', inf: info, lig: lineage, src: species.src || 'Manuel des joueurs 2024',
    tail: species.taille, feats: NOTABLE_FEATURES.filter(([, pattern]) => pattern.test(normalizedTraits)).map(([label]) => label),
    idx: normalizeText(name + ' ' + allTraitsText + ' ' + (info.cult || '') + ' ' + (info.app || '') + ' ' + (info.cadre || '') + ' ' + lineageNames),
    mv: specialMovements(normalizeText(baseTraitsText))
  };
}

function optionsHtml(firstLabel, values) {
  return `<option value="">${firstLabel}</option>` + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function fillFilterOptions() {
  $('#fe').innerHTML = '<option value="">Toutes</option>' + Object.entries(RULE_EDITIONS).map(([key, edition]) => `<option value="${key}">${escapeHtml(edition.label)}</option>`).join('');
  $('#ft').innerHTML = optionsHtml('Toutes', ['Petite', 'Moyenne']);
  $('#fy').innerHTML = optionsHtml('Tous', [...new Set(allSpecies.map(entry => entry.typ))].sort());
  $('#fp').innerHTML = optionsHtml('Toutes', NOTABLE_FEATURES.map(([label]) => label));
}

function buildSpeciesList(species, speciesInfo) {
  const infoByName = speciesInfo.infos || {};
  const mainSpecies = Object.entries(species).map(([name, data]) => speciesEntry(name, data, data.src ? 'sup' : '2024', infoByName));
  const extraSpecies = Object.entries(speciesInfo.extra || {}).map(([name, data]) => Object.assign(speciesEntry(name, data, data.ed || '2014', infoByName), { nofiche: 1 }));
  allSpecies = [...mainSpecies, ...extraSpecies].sort((first, second) => first.n.localeCompare(second.n, 'fr'));
  fillFilterOptions();
}

const traitHtml = trait => `<p><b><i>${escapeHtml(trait.nom)}.</i></b> ${escapeHtml(trait.desc).replace(/\n/g, '<br>')}</p>`;

function lineageHtml(lineage) {
  const options = lineage.opts.map(option => `<details class="opt"><summary>${escapeHtml(option.v)} <span>— ${escapeHtml(option.txt || '')}</span></summary>${(option.traits || []).map(traitHtml).join('')}</details>`).join('');
  return `<h4>${escapeHtml(lineage.lbl)} (au choix)</h4>` + options;
}

function descriptionHtml(entry) {
  const info = entry.inf;
  let html = '';
  if (info.app) html += `<h4>Apparence</h4><p>${escapeHtml(info.app)}</p>`;
  if (info.cult) html += `<h4>Culture et origines</h4><p>${escapeHtml(info.cult)}</p>`;
  if (info.cadre) html += `<p><b>Monde ou plan d’origine :</b> ${escapeHtml(info.cadre)}</p>`;
  html += '<h4>Traits et pouvoirs</h4>' + entry.s.traits.map(traitHtml).join('');
  if (entry.lig) html += lineageHtml(entry.lig);
  if (entry.ed !== '2014') html += '<p class="srcn" style="font-style:normal">Avec les règles 2024, les augmentations de caractéristiques et les langues viennent de l’historique, pas de l’espèce.</p>';
  return html;
}

function sourceNoteHtml(entry) {
  const species = entry.s;
  const reliability = (species.r_ || species.v_) ? ' · reconstitué à partir d’un résumé : à vérifier dans le livre' : ' · reformulé : le livre fait foi';
  return `<div class="srcn">Source : ${escapeHtml(entry.src)}${entry.ed === '2014' ? ' · espèce sans version 2024, règles 2014' : ''}${entry.nofiche ? ' · pas encore proposée dans la fiche' : ''}${reliability}${entry.nofiche ? '' : ' · <a href="fiche.html">utilisable dans la fiche</a>'}</div>`;
}

function speciesDetailsHtml(entry) {
  const movements = entry.mv.length ? ' · ' + entry.mv.join(', ') : '';
  return `<dl class="meta"><div><dt>Taille</dt><dd>${escapeHtml(entry.s.taille)}</dd></div><div><dt>Vitesse</dt><dd>${meters(entry.s.vit)}${movements}</dd></div><div><dt>Type</dt><dd>${escapeHtml(entry.typ)}</dd></div><div><dt>Durée de vie</dt><dd>${escapeHtml(entry.inf.age || '—')}</dd></div></dl>`
    + `<div class="desc">${descriptionHtml(entry)}</div>` + sourceNoteHtml(entry);
}

function filteredSpecies() {
  const searchedText = normalizeText(filters.q);
  return allSpecies.filter(entry => (!searchedText || entry.idx.includes(searchedText)) && (!filters.e || entry.ed === filters.e)
    && (!filters.t || entry.tail.includes(filters.t)) && (!filters.y || entry.typ === filters.y) && (!filters.p || entry.feats.includes(filters.p)));
}

function speciesRowHtml(entry) {
  const isOpen = openSpeciesNames.has(entry.n);
  const summary = [entry.tail, meters(entry.s.vit) + (entry.mv.length ? ' (' + entry.mv.join(', ') + ')' : ''), entry.typ, entry.src].join(' · ');
  const tags = entry.feats.length ? `<div class="tags">${entry.feats.map(feature => `<span class="tag">${escapeHtml(feature)}</span>`).join('')}</div>` : '';
  return `<div class="item" id="${escapeHtml(encodeURIComponent(entry.n))}" style="--c:${RULE_EDITIONS[entry.ed].color}"><div class="row"><div class="rmain"><div class="rt">${escapeHtml(entry.n)}${entry.ed === '2014' ? '<span class="pill">2014</span>' : ''}${VO.btn('especes', entry.n, entry.n)}</div><div class="rs">${escapeHtml(summary)}</div>${tags}</div>
  <div class="racts"><button class="b" data-n="${escapeHtml(entry.n)}" aria-expanded="${isOpen}">${isOpen ? 'Masquer' : 'Détails'}</button></div></div>${isOpen ? `<div class="det">${speciesDetailsHtml(entry)}</div>` : ''}</div>`;
}

function allShownAreOpen(shown) {
  return shown.length && shown.every(entry => openSpeciesNames.has(entry.n));
}

function renderSpecies() {
  const shown = filteredSpecies();
  const plural = shown.length > 1 ? 's' : '';
  $('#cnt').textContent = shown.length + ' espèce' + plural + ' affichée' + plural + ' sur ' + allSpecies.length;
  $('#bAll').textContent = allShownAreOpen(shown) ? 'Tout replier' : 'Tout déplier';
  $('#list').innerHTML = shown.length ? shown.map(speciesRowHtml).join('') : '<div class="empty-msg">Aucune espèce ne correspond à ces filtres.</div>';
}

function toggleSpeciesDetails(event) {
  const button = event.target.closest('button[data-n]');
  if (!button) return;
  const name = button.dataset.n;
  if (openSpeciesNames.has(name)) openSpeciesNames.delete(name);
  else openSpeciesNames.add(name);
  renderSpecies();
}

function resetFilters() {
  Object.assign(filters, DEFAULT_FILTERS);
  FILTER_INPUTS.forEach(([selector]) => { $(selector).value = ''; });
  renderSpecies();
}

function toggleAllShown() {
  const shown = filteredSpecies();
  const closeAll = allShownAreOpen(shown);
  shown.forEach(entry => closeAll ? openSpeciesNames.delete(entry.n) : openSpeciesNames.add(entry.n));
  renderSpecies();
}

function openSpeciesFromUrlHash() {
  const requestedName = decodeURIComponent(location.hash.slice(1));
  if (requestedName && allSpecies.some(entry => entry.n === requestedName)) openSpeciesNames.add(requestedName);
  renderSpecies();
  if (!requestedName) return;
  const row = document.getElementById(encodeURIComponent(requestedName));
  if (row) row.scrollIntoView();
}

async function loadSpecies() {
  try {
    const [species, speciesInfo] = await Promise.all([fetchJson('assets/json/vf/especes.json'), fetchJson('assets/json/vf/especes_infos.json')]);
    buildSpeciesList(species, speciesInfo);
    openSpeciesFromUrlHash();
  } catch (error) {
    $('#list').innerHTML = '<div class="empty-msg">Impossible de charger les espèces (ouvre le site via un serveur web).</div>';
  }
}

$('#list').addEventListener('click', toggleSpeciesDetails);
FILTER_INPUTS.forEach(([selector, key, eventType]) => $(selector).addEventListener(eventType, event => {
  filters[key] = event.target.value;
  renderSpecies();
}));
$('#bReset').onclick = resetFilters;
$('#bAll').onclick = toggleAllShown;
loadSpecies();
