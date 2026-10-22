const COMPLEXITY_LABELS = ['', 'Simple', 'Intermédiaire', 'Exigeante'];
const SOURCE_GROUP_COLORS = { '2024': '#2a3170', '2014': '#b0632a', 'ps': '#12968f', 'tiers': '#8e3a9d' };
const DEFAULT_CLASS_COLOR = '#2a3170';
const DEFAULT_FILTERS = { q: '', r: '', s: '', c: '' };
const FILTER_INPUTS = [['#fq', 'q', 'input'], ['#fr', 'r', 'change'], ['#fs', 's', 'change'], ['#fc', 'c', 'change']];

let classInfo = null;
let subclassesByClass = {};
let featuresByClass = {};
let classDataByName = {};
let spellSlotsByCasterType = {};
let subclasses = [];
let classNames = [];
const filters = Object.assign({}, DEFAULT_FILTERS);
const openSubclassKeys = new Set();

const withLineBreaks = text => escapeHtml(text).replace(/\n/g, '<br>');
const complexityDots = level => '●'.repeat(level) + '○'.repeat(3 - level);
const proficiencyBonus = level => 2 + Math.floor((level - 1) / 4);
const oneLevelPerLine = text => String(text).replace(/ ; (?=niv\. ?\d)/g, '\n');
const plural = count => count > 1 ? 's' : '';
const classColor = className => (classInfo.classes[className] || {}).c || DEFAULT_CLASS_COLOR;

function subclassSource(className, subclassName, subclass) {
  const info = (classInfo.sous[className] || {})[subclassName];
  if (info && classInfo.sources[info.src]) return { l: classInfo.sources[info.src][0], g: classInfo.sources[info.src][1] };
  const firstFeatureText = ((subclass.feats || [])[0] || {}).desc || '';
  const mention = /Sous-classe (?:homebrew )?de ([^.]+?) \(([^,)]+)(?:, contenu tiers)?\)/.exec(firstFeatureText);
  if (mention) return { l: mention[1] + ' (' + mention[2] + ')', g: /contenu tiers/.test(firstFeatureText) ? 'tiers' : 'ps' };
  if (/Plane Shift/.test(firstFeatureText)) return { l: 'Plane Shift', g: 'ps' };
  return { l: '', g: '' };
}

function listClassNames() {
  const names = Object.keys(classInfo.classes).filter(name => subclassesByClass[name] || featuresByClass[name]);
  Object.keys(subclassesByClass).forEach(name => { if (!names.includes(name) && featuresByClass[name]) names.push(name); });
  return names.sort((first, second) => first.localeCompare(second, 'fr'));
}

function subclassEntry(className, subclassName, subclass) {
  const info = (classInfo.sous[className] || {})[subclassName] || {};
  const source = subclassSource(className, subclassName, subclass);
  const features = subclass.feats || [];
  return {
    cl: className, n: subclassName, sc: subclass, i: info, src: source, feats: features, r: info.r || [], c: info.c || 0,
    idx: normalizeText([subclassName, className, info.t || '', source.l, features.map(feature => feature.nom + ' ' + feature.desc).join(' ')].join(' '))
  };
}

function fillFilterOptions() {
  const allRoles = [...Object.values(classInfo.classes).flatMap(info => info.role || []), ...subclasses.flatMap(entry => entry.r)];
  const roles = [...new Set(allRoles)].sort((first, second) => first.localeCompare(second, 'fr'));
  $('#fr').innerHTML = '<option value="">Tous</option>' + roles.map(role => `<option>${escapeHtml(role)}</option>`).join('');
  $('#fs').innerHTML = '<option value="">Toutes</option>' + Object.entries(classInfo.groupes).map(([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`).join('');
  $('#fc').innerHTML = '<option value="">Toutes</option>' + [1, 2, 3].map(level => `<option value="${level}">${COMPLEXITY_LABELS[level]}</option>`).join('');
}

function buildClassesAndSubclasses() {
  classNames = listClassNames();
  subclasses = [];
  classNames.forEach(className => {
    Object.entries(subclassesByClass[className] || {}).forEach(([subclassName, subclass]) => subclasses.push(subclassEntry(className, subclassName, subclass)));
  });
  fillFilterOptions();
}

function subclassMatchesFilters(entry) {
  return (!filters.r || entry.r.includes(filters.r)) && (!filters.s || entry.src.g === filters.s) && (!filters.c || entry.c === +filters.c);
}

function classMatchesFilters(className) {
  const info = classInfo.classes[className] || {};
  const searchedText = normalizeText(filters.q);
  const ownFiltersMatch = (!filters.r || (info.role || []).includes(filters.r)) && (!filters.c || info.cplx === +filters.c);
  const textMatches = !searchedText || normalizeText(className + ' ' + (info.pitch || '') + ' ' + (info.jeu || '')).includes(searchedText)
    || (featuresByClass[className] || []).some(feature => normalizeText(feature.nom).includes(searchedText));
  if (ownFiltersMatch && textMatches && !filters.s) return true;
  return subclasses.some(entry => entry.cl === className && subclassMatchesFilters(entry) && (!searchedText || entry.idx.includes(searchedText)));
}

function filteredSubclasses(className) {
  const searchedText = normalizeText(filters.q);
  return subclasses.filter(entry => (!className || entry.cl === className) && subclassMatchesFilters(entry)
    && (!searchedText || entry.idx.includes(searchedText) || (className && normalizeText(className).includes(searchedText))));
}

function classCardHtml(className) {
  const info = classInfo.classes[className] || {};
  const subclassCount = Object.keys(subclassesByClass[className] || {}).length;
  const thirdPartyPill = info.tiers ? '<span class="pill" style="--pc:' + SOURCE_GROUP_COLORS.tiers + '">tiers</span>' : '';
  const complexity = info.cplx ? '<span class="dots" title="Difficulté">' + complexityDots(info.cplx) + '</span> ' + COMPLEXITY_LABELS[info.cplx] + ' · ' : '';
  return `<a class="ccard" href="#${encodeURIComponent(className)}" style="--c:${info.c || DEFAULT_CLASS_COLOR}"><h3>${escapeHtml(className)}${thirdPartyPill}</h3><p>${escapeHtml(info.pitch || '')}</p>
   <div class="cm">${info.dv ? 'd' + info.dv + ' · ' : ''}${escapeHtml(info.prim || '')}<br>${complexity}${subclassCount} sous-classe${plural(subclassCount)}</div></a>`;
}

function renderOverview() {
  const shownClasses = classNames.filter(classMatchesFilters);
  const isFiltered = normalizeText(filters.q) || filters.r || filters.s || filters.c;
  const foundSubclasses = isFiltered ? filteredSubclasses('') : [];
  const subclassCount = isFiltered
    ? ' · ' + foundSubclasses.length + ' sous-classe' + plural(foundSubclasses.length) + ' trouvée' + plural(foundSubclasses.length)
    : ' · ' + subclasses.length + ' sous-classes';
  $('#cnt').textContent = shownClasses.length + ' classe' + plural(shownClasses.length) + subclassCount;
  let html = shownClasses.length
    ? '<div class="grid">' + shownClasses.map(classCardHtml).join('') + '</div>'
    : '<div class="empty-msg" style="margin-top:12px">Aucune classe ne correspond à ces filtres.</div>';
  if (isFiltered) html += '<h2 class="sec">Sous-classes trouvées</h2>' + subclassListHtml(foundSubclasses, true);
  else html += '<p class="srcn" style="color:#cfd4f5">Choisis une classe pour lire sa présentation, des conseils de jeu, sa progression et toutes ses sous-classes. Textes reformulés à partir des règles 2024 : le livre fait foi.</p>';
  $('#view').innerHTML = html;
}

function spellLevelsColumn(resources, columns) {
  const spellLevelsByName = {};
  resources.forEach(resource => {
    if (!Array.isArray(resource.max)) return;
    const match = /^(.+?) · niv\. (\d+)$/.exec(resource.nom);
    if (!match) {
      columns.push([resource.nom, resource.max]);
      return;
    }
    const [, name, spellLevel] = match;
    if (!spellLevelsByName[name]) columns.push([name, spellLevelsByName[name] = Array(20).fill('')]);
    resource.max.forEach((uses, index) => {
      if (uses) spellLevelsByName[name][index] += (spellLevelsByName[name][index] ? ', ' : 'niv. ') + spellLevel;
    });
  });
  Object.values(spellLevelsByName).forEach(levels => levels.forEach((value, index) => { if (!value) levels[index] = '—'; }));
}

function progressionColumns(classData) {
  const columns = [];
  (classData.infos || []).forEach(info => { if (Array.isArray(info.val)) columns.push([info.nom, info.val]); });
  spellLevelsColumn(classData.ressources || [], columns);
  if (classData.mineurs) columns.push(['Sorts mineurs', classData.mineurs]);
  if (classData.prepares) columns.push(['Sorts préparés', classData.prepares]);
  return columns;
}

function featuresGainedAt(className, level, subclassLevels) {
  const classFeatures = featuresByClass[className] || [];
  const names = classFeatures.filter(feature => feature.niv === level).map(feature => feature.nom === 'Sous-classe' ? '<span class="sc">Sous-classe</span>' : escapeHtml(feature.nom));
  const hasSubclassChoice = classFeatures.some(feature => feature.niv === level && feature.nom === 'Sous-classe');
  if (subclassLevels.includes(level) && !hasSubclassChoice) names.push('<span class="sc">Capacité de sous-classe</span>');
  return names.join(', ') || '—';
}

function spellSlotsText(casterType, slots) {
  if (casterType === 'pacte') return slots[0] ? slots[0] + ' (niv. ' + slots[1] + ')' : '—';
  return slots.length ? slots.join(' · ') : '—';
}

function progressionTableHtml(className) {
  const classData = classDataByName[className] || {};
  const subclassLevels = [...new Set(subclasses.filter(entry => entry.cl === className).flatMap(entry => entry.feats.map(feature => feature.niv)))];
  const columns = progressionColumns(classData);
  const slotTable = classData.lanceur && spellSlotsByCasterType[classData.lanceur];
  const slotHeader = slotTable ? `<th>${classData.lanceur === 'pacte' ? 'Emplacements (niv.)' : 'Emplacements'}</th>` : '';
  let html = '<div class="tblw"><table class="prog"><thead><tr><th>Niv.</th><th>Maîtrise</th><th>Capacités</th>' + columns.map(([name]) => `<th>${escapeHtml(name)}</th>`).join('') + slotHeader + '</tr></thead><tbody>';
  for (let level = 1; level <= 20; level++) {
    const columnCells = columns.map(([, values]) => `<td class="n">${escapeHtml(values[level - 1] ?? '—')}</td>`).join('');
    const slotCell = slotTable ? `<td class="n">${escapeHtml(spellSlotsText(classData.lanceur, slotTable[level - 1] || []))}</td>` : '';
    html += `<tr><td class="n">${level}</td><td class="n">+${proficiencyBonus(level)}</td><td>${featuresGainedAt(className, level, subclassLevels)}</td>${columnCells}${slotCell}</tr>`;
  }
  html += '</tbody></table></div>';
  if (slotTable && classData.lanceur !== 'pacte') html += '<p class="srcn">Emplacements : nombre d’emplacements de niveau 1 · 2 · 3…</p>';
  return html;
}

function listItemsHtml(items) {
  return (items || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

function classMetaHtml(info) {
  if (!info.dv) return '';
  return `<dl class="meta"><div><dt>Dé de vie</dt><dd>d${info.dv}</dd></div><div><dt>Caractéristique principale</dt><dd>${escapeHtml(info.prim)}</dd></div><div><dt>Jets de sauvegarde</dt><dd>${escapeHtml(info.sv)}</dd></div><div><dt>Difficulté</dt><dd><span class="dots">${complexityDots(info.cplx)}</span> ${COMPLEXITY_LABELS[info.cplx]}</dd></div><div><dt>Armures</dt><dd>${escapeHtml(info.arm)}</dd></div><div><dt>Armes</dt><dd>${escapeHtml(info.armes)}</dd></div><div><dt>Magie</dt><dd>${escapeHtml(info.inc)}</dd></div><div><dt>Rôles</dt><dd>${escapeHtml((info.role || []).join(', '))}</dd></div></dl>`;
}

function classAdviceHtml(info) {
  let html = '';
  if (info.tiers) html += `<p class="srcn" style="font-style:normal">Classe tiers : ${escapeHtml((classInfo.sources[info.tiers] || [''])[0])}. Demande l’accord du MJ.</p>`;
  if (info.jeu) html += `<h3>Le style de jeu</h3><p>${escapeHtml(info.jeu)}</p>`;
  if (info.conseils) html += `<h3>Conseils de jeu</h3><ul>${listItemsHtml(info.conseils)}</ul>`;
  if (info.eviter) html += `<h3>Pièges à éviter</h3><ul>${listItemsHtml(info.eviter)}</ul>`;
  if (info.depart) html += `<h3>Pour bien démarrer</h3><p>${escapeHtml(info.depart)}</p>`;
  if (info.groupe) html += `<h3>Dans le groupe</h3><p>${escapeHtml(info.groupe)}</p>`;
  return html;
}

function classFeaturesHtml(className) {
  const classFeatures = featuresByClass[className] || [];
  if (!classFeatures.length) return '';
  return '<h3>Capacités de classe</h3>' + classFeatures.filter(feature => feature.nom !== 'Sous-classe').map(feature =>
    `<details class="feat"><summary>${escapeHtml(feature.nom)} <span>· niv. ${feature.niv}</span>${VO.btn('classes', 'capacites§' + className + '|' + feature.niv + '|' + feature.nom, feature.nom)}</summary><p>${withLineBreaks(oneLevelPerLine(feature.desc))}</p></details>`).join('');
}

function otherClassesNavigationHtml(className) {
  return `<div class="nav"><a class="b" href="#">← Toutes les classes</a>${classNames.map(other => other === className ? '' : `<a class="b" style="--c:${classColor(other)}" href="#${encodeURIComponent(other)}">${escapeHtml(other)}</a>`).join('')}</div>`;
}

function renderClassPage(className) {
  const info = classInfo.classes[className] || {};
  const shownSubclasses = filteredSubclasses(className);
  const subclassTotal = subclasses.filter(entry => entry.cl === className).length;
  $('#cnt').textContent = shownSubclasses.length + ' sous-classe' + plural(shownSubclasses.length) + ' affichée' + plural(shownSubclasses.length) + ' sur ' + subclassTotal;
  $('#view').innerHTML = otherClassesNavigationHtml(className)
    + `\n <article class="cls" style="--c:${info.c || DEFAULT_CLASS_COLOR}"><header class="chead"><h2>${escapeHtml(className)}${VO.btn('classes', 'classes§' + className, className)}</h2>${info.pitch ? `<p>${escapeHtml(info.pitch)}</p>` : ''}</header><div class="cbody">`
    + classMetaHtml(info) + classAdviceHtml(info)
    + '<div class="nav"><a class="b" href="creation.html">Créer un personnage</a><a class="b" href="grimoire.html">Voir les sorts</a><a class="b" href="dons.html">Voir les dons</a></div>'
    + `<h3>Progression</h3>${progressionTableHtml(className)}` + classFeaturesHtml(className)
    + `</div></article><h2 class="sec">Sous-classes de ${escapeHtml(className)} (${subclassTotal})</h2>` + subclassListHtml(shownSubclasses, false);
}

function sourcePillHtml(source) {
  if (!source.g || source.g === '2024') return '';
  const label = source.g === 'tiers' ? 'tiers' : source.g === 'ps' ? 'Plane Shift' : '2014';
  return `<span class="pill" style="--pc:${SOURCE_GROUP_COLORS[source.g]}">${label}</span>`;
}

function subclassDetailsHtml(entry) {
  const features = entry.feats.map(feature => `<p><b>Niv. ${feature.niv} · ${escapeHtml(feature.nom)}.</b> ${withLineBreaks(oneLevelPerLine(feature.desc))}</p>`).join('');
  return `<div class="det">${features}<div class="srcn">${entry.src.l ? 'Source : ' + escapeHtml(entry.src.l) + ' · ' : ''}reformulé : le livre fait foi · <a href="fiche.html">utilisable dans la fiche</a></div></div>`;
}

function subclassItemHtml(entry, showClassName) {
  const key = entry.cl + '/' + entry.n;
  const isOpen = openSubclassKeys.has(key);
  const summary = [showClassName ? entry.cl : '', entry.src.l, entry.c ? COMPLEXITY_LABELS[entry.c] : ''].filter(Boolean).join(' · ');
  const roles = entry.r.length ? `<div class="tags">${entry.r.map(role => `<span class="tag">${escapeHtml(role)}</span>`).join('')}</div>` : '';
  const tip = entry.i.t ? `<div class="tip">${escapeHtml(entry.i.t)}</div>` : '';
  return `<div class="item" id="${escapeHtml(encodeURIComponent(key))}" style="--c:${classColor(entry.cl)}"><div class="row"><div class="rmain"><div class="rt">${escapeHtml(entry.n)}${VO.btn('classes', 'sous§' + entry.cl + '|' + entry.n, entry.n)}${sourcePillHtml(entry.src)}</div><div class="rs">${escapeHtml(summary)}</div>${roles}${tip}</div>
  <div class="racts"><button class="b" data-k="${escapeHtml(key)}" aria-expanded="${isOpen}">${isOpen ? 'Masquer' : 'Capacités'}</button></div></div>${isOpen ? subclassDetailsHtml(entry) : ''}</div>`;
}

function subclassListHtml(entries, showClassName) {
  if (!entries.length) return '<div class="empty-msg">Aucune sous-classe ne correspond à ces filtres.</div>';
  return '<div class="list">' + entries.map(entry => subclassItemHtml(entry, showClassName)).join('') + '</div>';
}

function safelyDecoded(part) {
  try { return decodeURIComponent(part); } catch (error) { return part; }
}

function currentRoute() {
  const parts = location.hash.slice(1).split('/').map(safelyDecoded);
  return { className: classNames.includes(parts[0]) ? parts[0] : '', subclassName: parts.slice(1).join('/') };
}

function renderCurrentView() {
  if (!classInfo) return;
  const route = currentRoute();
  if (route.className) renderClassPage(route.className);
  else renderOverview();
}

function followRoute(scrollToTop) {
  const route = currentRoute();
  if (route.className && route.subclassName) {
    const key = route.className + '/' + route.subclassName;
    openSubclassKeys.add(key);
    renderCurrentView();
    const item = document.getElementById(encodeURIComponent(key));
    if (item) item.scrollIntoView();
    return;
  }
  renderCurrentView();
  if (scrollToTop) window.scrollTo(0, 0);
}

function toggleSubclassDetails(event) {
  const button = event.target.closest('button[data-k]');
  if (!button) return;
  const key = button.dataset.k;
  if (openSubclassKeys.has(key)) openSubclassKeys.delete(key);
  else openSubclassKeys.add(key);
  renderCurrentView();
}

function resetFilters() {
  Object.assign(filters, DEFAULT_FILTERS);
  FILTER_INPUTS.forEach(([selector]) => { $(selector).value = ''; });
  renderCurrentView();
}

async function loadClasses() {
  try {
    const [info, subclassData, featureData, classData] = await Promise.all(['assets/json/vf/classes_infos.json', 'assets/json/vf/sousclasses.json', 'assets/json/vf/capacites.json', 'assets/json/vf/classes.json'].map(fetchJson));
    classInfo = info;
    subclassesByClass = subclassData || {};
    featuresByClass = featureData || {};
    classDataByName = (classData && classData.classes) || {};
    spellSlotsByCasterType = (classData && classData.emplacements) || {};
    buildClassesAndSubclasses();
    followRoute(false);
  } catch (error) {
    $('#view').innerHTML = '<div class="empty-msg">Impossible de charger les classes (ouvre le site via un serveur web).</div>';
  }
}

addEventListener('hashchange', () => followRoute(true));
$('#view').addEventListener('click', toggleSubclassDetails);
FILTER_INPUTS.forEach(([selector, key, eventType]) => $(selector).addEventListener(eventType, event => {
  filters[key] = event.target.value;
  renderCurrentView();
}));
$('#bReset').onclick = resetFilters;
loadClasses();
