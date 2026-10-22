(function () {
'use strict';

const normalize = text => String(text == null ? '' : text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘`]/g, "'");
const escapeHtml = text => String(text == null ? '' : text).replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
const plainText = html => String(html == null ? '' : html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const withLineBreaks = text => escapeHtml(text).replace(/\n/g, '<br>');
const searchLink = (page, query) => page + '?q=' + encodeURIComponent(query);
const labeledLine = (label, value) => value ? '<div><b>' + escapeHtml(label) + '</b> : ' + escapeHtml(value) + '</div>' : '';
const namedParagraphs = entries => (entries || []).map(entry => '<p><b>' + escapeHtml(entry.n || entry.nom) + '.</b> ' + (entry.d != null ? entry.d : escapeHtml(entry.desc)) + '</p>').join('');
const paragraph = text => '<p>' + escapeHtml(text) + '</p>';
const joinPresent = (values, separator) => values.filter(Boolean).join(separator);

const RESULT_TYPES = {
  sort: { label: 'Sort', color: '#7a4fc4', destination: 'le grimoire', filterLabel: 'Sorts' },
  objet: { label: 'Objet magique', color: '#d8791a', destination: 'les objets magiques', filterLabel: 'Objets magiques' },
  equip: { label: 'Équipement', color: '#6b7a2a', destination: 'l’équipement', filterLabel: 'Équipement' },
  monstre: { label: 'Monstre', color: '#a0302a', destination: 'le bestiaire', filterLabel: 'Monstres' },
  familier: { label: 'Familier', color: '#2e9e5b', destination: 'les familiers', filterLabel: 'Familiers' },
  don: { label: 'Don', color: '#b8860b', destination: 'les dons', filterLabel: 'Dons' },
  espece: { label: 'Espèce', color: '#12968f', destination: 'les espèces', filterLabel: 'Espèces' },
  classe: { label: 'Classe', color: '#2f6fd0', destination: 'la page des classes', filterLabel: 'Classes et sous-classes' },
  histo: { label: 'Historique', color: '#8a5a2b', destination: '', filterLabel: 'Historiques' },
  regle: { label: 'Règle', color: '#2a3170', destination: 'la page', filterLabel: 'Règles' },
  quete: { label: 'Quête', color: '#8e3a9d', destination: 'les quêtes', filterLabel: 'Quêtes' },
  page: { label: 'Page', color: '#5f6580', destination: 'la page', filterLabel: 'Pages du site' }
};
const DATA_FILES = {
  spells: 'assets/json/vf/spells.json', magicItems: 'assets/json/vf/objets.json', equipment: 'assets/json/vf/equipement.json',
  monsters: 'assets/json/vf/bestiaire.json', familiars: 'assets/json/vf/familiers.json', feats: 'assets/json/vf/dons.json',
  species: 'assets/json/vf/especes.json', speciesInfo: 'assets/json/vf/especes_infos.json', classFeatures: 'assets/json/vf/capacites.json',
  subclasses: 'assets/json/vf/sousclasses.json', backgrounds: 'assets/json/vf/historiques.json', quests: 'assets/json/vf/quetes.json',
  classInfo: 'assets/json/vf/classes_infos.json', conditions: 'assets/json/vf/etats.json', combatRules: 'assets/json/vf/combat.json'
};
const HTML_PAGES = { guide: 'guide.html', home: './', gameMaster: 'mj.html' };
const ABILITY_SHORT_NAMES = ['For', 'Dex', 'Con', 'Int', 'Sag', 'Cha'];
const MONSTER_ACTION_GROUPS = [['actions', 'Actions'], ['bonus', 'Actions bonus'], ['reac', 'Réactions'], ['leg', 'Actions légendaires']];
const MAX_SHOWN_RESULTS = 80;
const MAX_SUBTITLE_LENGTH = 140;

let searchIndex = null;
let searchIndexLoading = null;

function fetchJsonOrNull(url) {
  return fetch(url).then(response => {
    if (!response.ok) throw new Error(url);
    return response.json();
  }).catch(() => null);
}

function fetchTextOrEmpty(url) {
  return fetch(url).then(response => {
    if (!response.ok) throw new Error(url);
    return response.text();
  }).catch(() => '');
}

async function fetchAll(urlsByName, fetcher) {
  const names = Object.keys(urlsByName);
  const contents = await Promise.all(names.map(name => fetcher(urlsByName[name])));
  const contentByName = {};
  names.forEach((name, index) => { contentByName[name] = contents[index]; });
  return contentByName;
}

function addResult(results, result) {
  result.normalizedName = normalize(result.n);
  result.normalizedAlternatives = normalize(result.alt || '');
  result.normalizedBody = normalize(result.body || '');
  results.push(result);
  return result;
}

const classPageLink = (className, subclassName) => 'classes.html#' + encodeURIComponent(className) + (subclassName ? '/' + encodeURIComponent(subclassName) : '');

function addClasses(results, classInfo) {
  Object.keys(classInfo.classes || {}).forEach(className => {
    const info = classInfo.classes[className];
    addResult(results, {
      t: 'classe', n: className, vo: ['classes', 'classes§' + className], s: 'Classe · d' + info.dv + ' · ' + info.prim,
      body: [info.pitch, info.jeu].concat(info.role || []).join(' '), href: classPageLink(className),
      d: () => paragraph(info.pitch) + labeledLine('Rôles', (info.role || []).join(', ')) + '<h4>Conseils de jeu</h4>' + (info.conseils || []).slice(0, 3).map(paragraph).join('')
    });
  });
}

function spellSubtitle(spell) {
  const level = +spell.l ? 'Niveau ' + spell.l : 'Sort mineur';
  const classes = (spell.c || []).length ? ' · ' + spell.c.join(', ') : '';
  return level + ' · ' + (spell.e || '') + classes;
}

function spellDetailHtml(spell, otherNames) {
  return labeledLine('Incantation', spell.t) + labeledLine('Portée', spell.r) + labeledLine('Composantes', spell.k) + labeledLine('Durée', spell.d)
    + (otherNames.length ? labeledLine('Aussi appelé', otherNames.join(', ')) : '') + '<div>' + spell.h + '</div>';
}

function addSpells(results, spells) {
  (spells || []).forEach(spell => {
    const [name, ...otherNames] = String(spell.n).split('|');
    addResult(results, {
      t: 'sort', n: name, vo: ['sorts', spell.n], alt: otherNames.join(' '), s: spellSubtitle(spell),
      body: plainText(spell.h), href: searchLink('grimoire.html', name), d: () => spellDetailHtml(spell, otherNames)
    });
  });
}

function addMagicItems(results, magicItems) {
  (magicItems || []).forEach(item => {
    addResult(results, {
      t: 'objet', n: item.n, vo: ['objets', item.n], alt: item.en, s: joinPresent([item.t, item.q, item.a], ' · '), body: plainText(item.h),
      href: searchLink('objets.html', item.n), d: () => '<div>' + item.h + '</div>' + labeledLine('Source', item.src)
    });
  });
}

function weightLabel(item) {
  return item.kg != null ? String(item.kg).replace('.', ',') + ' kg' : '';
}

function addEquipment(results, equipment) {
  (equipment || []).forEach(item => {
    addResult(results, {
      t: 'equip', n: item.n, vo: ['equipement', item.n], alt: item.en, s: joinPresent([item.c || item.t, item.p], ' · '), body: plainText(item.h),
      href: searchLink('equipement.html', item.n), d: () => labeledLine('Prix', item.p) + labeledLine('Poids', weightLabel(item)) + '<div>' + (item.h || '') + '</div>'
    });
  });
}

function abilityScoresLine(scores) {
  return (scores || []).map((score, index) => {
    const modifier = Math.floor((score - 10) / 2);
    return ABILITY_SHORT_NAMES[index] + ' ' + score + ' (' + (modifier >= 0 ? '+' : '−') + Math.abs(modifier) + ')';
  }).join(' · ');
}

function creatureDetailHtml(creature) {
  const abilities = abilityScoresLine(creature.car);
  const actionGroups = MONSTER_ACTION_GROUPS.map(([key, title]) => (creature[key] || []).length ? '<h4>' + title + '</h4>' + namedParagraphs(creature[key]) : '').join('');
  return labeledLine('CA', creature.ca) + labeledLine('PV', creature.pv) + labeledLine('Vitesse', creature.vit) + (abilities ? '<div>' + escapeHtml(abilities) + '</div>' : '')
    + labeledLine('Sens', creature.sens) + namedParagraphs(creature.traits) + actionGroups + (creature.note ? '<p><i>' + escapeHtml(creature.note) + '</i></p>' : '');
}

function addCreatures(results, creatures, type, page) {
  (creatures || []).forEach(creature => {
    const names = (list) => (list || []).map(entry => entry.n);
    addResult(results, {
      t: type, n: creature.n, vo: [type === 'monstre' ? 'monstres' : 'familiers', creature.n], alt: creature.en,
      s: joinPresent([creature.tail, creature.typ, creature.fp != null ? 'FP ' + creature.fp : '', creature.o], ' · '),
      body: [creature.typ].concat(names(creature.traits), names(creature.actions)).join(' '), href: searchLink(page, creature.n),
      d: () => creatureDetailHtml(creature)
    });
  });
}

function addFeats(results, feats) {
  (feats || []).forEach(feat => {
    addResult(results, {
      t: 'don', n: feat.nom, vo: ['dons', feat.id], s: joinPresent([feat.cat, feat.pre ? 'Prérequis : ' + feat.pre : ''], ' · '), body: feat.desc,
      href: 'dons.html#' + encodeURIComponent(feat.id), d: () => '<p>' + withLineBreaks(feat.desc) + '</p>' + labeledLine('Source', feat.src)
    });
  });
}

function addOneSpecies(results, name, species, info) {
  const appearance = species.app || info.app;
  addResult(results, {
    t: 'espece', n: name, vo: ['especes', name], s: joinPresent([species.type || info.type, species.taille, species.vit ? 'Vitesse ' + species.vit + ' m' : ''], ' · '),
    body: (species.traits || []).map(trait => trait.nom + ' ' + trait.desc).join(' '), href: 'especes.html#' + encodeURIComponent(name),
    d: () => (appearance ? paragraph(appearance) : '') + namedParagraphs(species.traits)
  });
}

function addSpecies(results, species, speciesInfo) {
  const infos = (speciesInfo && speciesInfo.infos) || {};
  const extraSpecies = (speciesInfo && speciesInfo.extra) || {};
  Object.keys(species || {}).forEach(name => addOneSpecies(results, name, species[name], infos[name] || {}));
  Object.keys(extraSpecies).forEach(name => {
    if (!(species && species[name])) addOneSpecies(results, name, extraSpecies[name], infos[name] || {});
  });
}

function addClassFeatures(results, classFeatures) {
  Object.keys(classFeatures || {}).forEach(className => {
    (classFeatures[className] || []).forEach(feature => {
      addResult(results, {
        t: 'classe', n: feature.nom, alt: className, vo: ['classes', 'capacites§' + className + '|' + feature.niv + '|' + feature.nom],
        s: className + ' · niv. ' + feature.niv, body: feature.desc, href: classPageLink(className), d: () => '<p>' + withLineBreaks(feature.desc) + '</p>'
      });
    });
  });
}

function subclassDetailHtml(features, tip) {
  return (tip ? '<p><i>' + escapeHtml(tip.t) + '</i></p>' : '')
    + features.map(feature => '<p><b>Niv. ' + feature.niv + ' · ' + escapeHtml(feature.nom) + '.</b> ' + withLineBreaks(feature.desc) + '</p>').join('');
}

function addOneSubclass(results, className, subclassName, features, tip) {
  const vo = ['classes', 'sous§' + className + '|' + subclassName];
  addResult(results, {
    t: 'classe', n: subclassName, alt: className, vo: vo, s: 'Sous-classe · ' + className,
    body: features.map(feature => feature.nom).join(' ') + (tip ? ' ' + tip.t : ''), href: classPageLink(className, subclassName),
    d: () => subclassDetailHtml(features, tip)
  });
  features.forEach(feature => {
    addResult(results, {
      t: 'classe', n: feature.nom, alt: subclassName + ' ' + className, vo: vo, s: subclassName + ' (' + className + ') · niv. ' + feature.niv,
      body: feature.desc, href: classPageLink(className, subclassName), d: () => '<p>' + withLineBreaks(feature.desc) + '</p>'
    });
  });
}

function addSubclasses(results, subclasses, classInfo) {
  Object.keys(subclasses || {}).forEach(className => {
    Object.keys(subclasses[className] || {}).forEach(subclassName => {
      const tip = ((classInfo.sous || {})[className] || {})[subclassName];
      addOneSubclass(results, className, subclassName, subclasses[className][subclassName].feats || [], tip);
    });
  });
}

function addBackgrounds(results, backgrounds) {
  Object.keys(backgrounds || {}).forEach(name => {
    const background = backgrounds[name];
    addResult(results, {
      t: 'histo', n: name, vo: ['historiques', name], s: (background.comp || []).join(', '), body: background.desc,
      d: () => '<p>' + withLineBreaks(background.desc) + '</p>' + labeledLine('Compétences', (background.comp || []).join(', ')) + labeledLine('Outil', background.outil)
    });
  });
}

function addQuests(results, quests) {
  (quests || []).forEach(quest => {
    addResult(results, {
      t: 'quete', n: quest.t, s: joinPresent([quest.type, quest.lieu, quest.niv ? 'niv. ' + quest.niv : ''], ' · '), body: [quest.acc, quest.obj, quest.lieu].join(' '),
      href: searchLink('quetes.html', quest.t), d: () => labeledLine('Lieu', quest.lieu) + paragraph(quest.acc) + paragraph(quest.obj)
    });
  });
}

const conditionAnchor = name => normalize(name).replace(/[^a-z]+/g, '-');

function addConditionRules(results, conditionsData) {
  if (!conditionsData) return;
  (conditionsData.etats || []).forEach(condition => {
    addResult(results, {
      t: 'regle', n: condition.n, alt: condition.a, vo: ['etats', condition.n], s: 'État', body: condition.s,
      href: 'etats.html#' + conditionAnchor(condition.n), d: () => paragraph(condition.s)
    });
  });
  (conditionsData.situations || []).forEach(situation => {
    const text = plainText(situation.h);
    addResult(results, { t: 'regle', n: situation.n, s: 'Situation proche des états', body: text, href: 'etats.html#autres', d: () => paragraph(text) });
  });
}

function addCombatRules(results, combatSections) {
  (combatSections || []).forEach(section => {
    const href = 'combat.html#' + section.id;
    const rules = section.rows.map(rule => ({ name: rule.n, text: plainText(rule.h) }));
    addResult(results, {
      t: 'regle', n: section.t, s: 'Règles du combat', body: rules.map(rule => rule.name).join(' '), href: href,
      d: () => rules.map(rule => '<p><b>' + escapeHtml(rule.name) + '.</b> ' + escapeHtml(rule.text) + '</p>').join('')
    });
    rules.forEach(rule => {
      addResult(results, { t: 'regle', n: rule.name, alt: section.t, s: 'Combat · ' + section.t, body: rule.text, href: href, d: () => paragraph(rule.text) });
    });
  });
}

function guideSectionDetailHtml(paragraphs) {
  return paragraphs.slice(0, 6).map(paragraph).join('') + (paragraphs.length > 6 ? '<p>…</p>' : '');
}

function addGuideRules(results, guideHtml) {
  if (!guideHtml || !window.DOMParser) return;
  const guide = new DOMParser().parseFromString(guideHtml, 'text/html');
  let chapterTitle = '', chapterId = '', currentSection = null;
  guide.querySelectorAll('main h2,main h3,main p,main li,main td').forEach(element => {
    if (element.tagName === 'H2' || element.tagName === 'H3') {
      const title = element.textContent.replace(/^\d+\.\s*/, '').trim();
      if (element.tagName === 'H2') {
        chapterTitle = title;
        chapterId = element.id || chapterId;
      }
      const paragraphs = [];
      const result = addResult(results, {
        t: 'regle', n: title, s: 'Guide du débutant' + (element.tagName === 'H3' ? ' · ' + chapterTitle : ''), body: '',
        href: 'guide.html' + (chapterId ? '#' + chapterId : ''), d: () => guideSectionDetailHtml(paragraphs)
      });
      currentSection = { paragraphs: paragraphs, result: result };
    } else if (currentSection && !element.parentNode.closest('li,td')) {
      const text = element.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      currentSection.paragraphs.push(text);
      currentSection.result.normalizedBody += ' ' + normalize(text);
    }
  });
}

function addSitePages(results, pageHtml) {
  if (!pageHtml || !window.DOMParser) return;
  const page = new DOMParser().parseFromString(pageHtml, 'text/html');
  page.querySelectorAll('a.card').forEach(card => {
    const heading = card.querySelector('h2,h3');
    if (!heading) return;
    const description = card.querySelector('p');
    const summary = description ? description.textContent.trim() : '';
    addResult(results, { t: 'page', n: heading.textContent.trim(), s: summary, body: summary, href: card.getAttribute('href'), d: () => '' });
  });
}

async function buildSearchIndex() {
  const [data, pages] = await Promise.all([fetchAll(DATA_FILES, fetchJsonOrNull), fetchAll(HTML_PAGES, fetchTextOrEmpty)]);
  const classInfo = data.classInfo || {};
  const results = [];
  addClasses(results, classInfo);
  addSpells(results, data.spells);
  addMagicItems(results, data.magicItems);
  addEquipment(results, data.equipment);
  addCreatures(results, data.monsters, 'monstre', 'bestiaire.html');
  addCreatures(results, data.familiars, 'familier', 'familiers.html');
  addFeats(results, data.feats);
  addSpecies(results, data.species, data.speciesInfo);
  addClassFeatures(results, data.classFeatures);
  addSubclasses(results, data.subclasses, classInfo);
  addBackgrounds(results, data.backgrounds);
  addQuests(results, data.quests);
  addConditionRules(results, data.conditions);
  addCombatRules(results, data.combatRules);
  addGuideRules(results, pages.guide);
  addSitePages(results, pages.home);
  addSitePages(results, pages.gameMaster);
  searchIndex = results;
  return results;
}

function loadSearchIndex() {
  if (!searchIndexLoading) searchIndexLoading = buildSearchIndex();
  return searchIndexLoading;
}

function containsAllWords(text, words) {
  return words.every(word => text.indexOf(word) >= 0);
}

function relevanceScore(result, query, words) {
  const name = result.normalizedName;
  if (name === query) return 1000;
  if (name.indexOf(query) === 0) return 800 - name.length;
  const position = name.indexOf(query);
  if (position > 0) return (/[^a-z0-9]/.test(name[position - 1]) ? 700 : 600) - name.length;
  if (containsAllWords(name, words)) return 500 - name.length;
  if (result.normalizedAlternatives.indexOf(query) >= 0) return 450;
  const nameAndAlternatives = name + ' ' + result.normalizedAlternatives;
  if (containsAllWords(nameAndAlternatives, words)) return 400;
  if (containsAllWords(nameAndAlternatives + ' ' + result.normalizedBody, words)) return 100;
  return 0;
}

const SEARCH_CSS = '\
.rg-btn{white-space:nowrap}\
.rg-home{display:flex;align-items:center;gap:10px;width:100%;max-width:560px;padding:12px 16px;border:2px solid var(--gold,#d9a21b);border-radius:999px;background:#fff;color:#5f6580;font-size:15px;cursor:text;text-align:left;box-shadow:0 6px 28px #0006}\
.rg-home:hover,.rg-home:focus-visible{outline:3px solid var(--gold,#d9a21b);outline-offset:2px}\
.rg-home kbd,.rg-hint kbd{margin-left:auto;font:12px var(--sans,sans-serif);border:1px solid #c9cde0;border-radius:4px;padding:1px 6px;color:#5f6580}\
#rg{width:min(760px,100vw - 24px);max-height:calc(100vh - 48px);margin:24px auto auto;padding:0;border:0;border-top:4px solid var(--gold,#d9a21b);border-radius:10px;background:#fff;color:var(--ink,#1d2033);font:14px/1.45 var(--sans,system-ui,sans-serif);box-shadow:0 10px 40px #000a;display:none;flex-direction:column}\
#rg[open]{display:flex}\
#rg::backdrop{background:#0b0d22b3}\
#rg .rg-h{flex:0 0 auto;display:flex;gap:8px;align-items:center;padding:12px 12px 8px}\
#rg input{flex:1;min-width:0;font-size:16px;padding:9px 12px;border:1px solid #c9cde0;border-radius:8px}\
#rg .rg-x{border:0;background:transparent;font-size:22px;line-height:1;padding:4px 8px;cursor:pointer;color:#5f6580}\
#rg .rg-c{flex:0 0 auto;display:flex;gap:6px;overflow-x:auto;padding:0 12px 8px;scrollbar-width:thin}\
#rg .rg-c button{flex:0 0 auto;font-size:12px;padding:4px 10px;border:1px solid #c9cde0;border-radius:999px;background:#fff;cursor:pointer}\
#rg .rg-c button[aria-pressed=true]{background:#2a3170;border-color:#2a3170;color:#fff}\
#rg .rg-r{overflow-y:auto;border-top:1px solid #e3e5f0;padding:4px 0 8px;flex:1}\
#rg .rg-i{border-bottom:1px solid #eef0f7}\
#rg .rg-i>button{display:flex;gap:10px;align-items:baseline;width:100%;text-align:left;border:0;background:transparent;padding:8px 14px;cursor:pointer}\
#rg .rg-i>button:hover,#rg .rg-i>button:focus-visible{background:#f3f4fb;outline:0}\
#rg .rg-t{flex:0 0 auto;font-size:11px;font-weight:600;color:#fff;background:var(--k);border-radius:4px;padding:1px 6px}\
#rg .rg-n{font-weight:600}\
#rg .rg-s{display:block;font-size:12px;color:#5f6580}\
#rg .rg-d{padding:2px 16px 12px 16px;font-size:13.5px;border-left:3px solid var(--k);margin:0 14px 10px;background:#fafbff}\
#rg .rg-d p{margin:6px 0}#rg .rg-d h4{margin:10px 0 4px;font-size:13px}\
#rg .rg-d table{border-collapse:collapse;font-size:12px}#rg .rg-d td,#rg .rg-d th{border:1px solid #dde;padding:2px 5px}\
#rg .rg-go{display:inline-block;margin-top:6px;font-weight:600;color:#2f6fd0}\
#rg .rg-m{padding:14px;color:#5f6580}\
#rg .rg-vo{display:flex;align-items:center;gap:2px;font-size:12px;color:#5f6580}#rg .rg-vo .vo-btn{margin-left:0}\
#rg mark{background:#ffe9a8;color:inherit;border-radius:2px}\
@media screen and (max-width:700px){.rg-home kbd{display:none}#rg{width:100vw;max-width:100vw;height:100%;max-height:100%;margin:0;border-radius:0}}\
@media print{.rg-btn,.rg-home{display:none!important}}';

let dialog, searchInput, resultsContainer, typeFilters;
let selectedType = '';
let searchRunId = 0;
let shownResults = [];

function typeFilterButtonsHtml() {
  return '<button type="button" data-t="" aria-pressed="true">Tout</button>' + Object.keys(RESULT_TYPES).map(type =>
    '<button type="button" data-t="' + type + '" aria-pressed="false">' + escapeHtml(RESULT_TYPES[type].filterLabel) + '</button>').join('');
}

function selectTypeFilter(event) {
  const button = event.target.closest('button');
  if (!button) return;
  selectedType = button.dataset.t;
  typeFilters.querySelectorAll('button').forEach(filterButton => filterButton.setAttribute('aria-pressed', filterButton === button));
  runSearch();
}

const resultButtons = () => [...resultsContainer.querySelectorAll('.rg-i>button')];

function handleSearchInputKeys(event) {
  const firstResult = resultButtons()[0];
  if (!firstResult) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    firstResult.focus();
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    firstResult.click();
  }
}

function moveFocusBetweenResults(event) {
  const button = event.target.closest('.rg-i>button');
  if (!button) return;
  const buttons = resultButtons();
  const position = buttons.indexOf(button);
  if (event.key === 'ArrowDown' && buttons[position + 1]) {
    event.preventDefault();
    buttons[position + 1].focus();
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    (buttons[position - 1] || searchInput).focus();
  }
}

function isLinkToCurrentPage(href) {
  return href && href.split(/[?#]/)[0] === location.pathname.split('/').pop();
}

function resultDetailHtml(result) {
  const voLine = result.vo && window.VO ? '<p class="rg-vo">' + window.VO.btn(result.vo[0], result.vo[1], result.n) + ' <span>Version originale en anglais</span></p>' : '';
  const openLink = result.href ? '<a class="rg-go" href="' + escapeHtml(result.href) + '">Ouvrir dans ' + escapeHtml(RESULT_TYPES[result.t].destination) + ' →</a>' : '';
  return (result.d() || '') + voLine + openLink;
}

function toggleResultDetail(event) {
  const button = event.target.closest('.rg-i>button');
  if (!button) return;
  const item = button.parentNode;
  const openDetail = item.querySelector('.rg-d');
  if (openDetail) {
    openDetail.remove();
    button.setAttribute('aria-expanded', 'false');
    return;
  }
  const result = shownResults[+item.dataset.i];
  if (!result) return;
  const detail = document.createElement('div');
  detail.className = 'rg-d';
  detail.innerHTML = resultDetailHtml(result);
  if (isLinkToCurrentPage(result.href)) {
    detail.querySelector('.rg-go').addEventListener('click', () => {
      dialog.close();
      setTimeout(() => fillPageSearchFromUrl(true), 0);
    });
  }
  item.appendChild(detail);
  button.setAttribute('aria-expanded', 'true');
}

function createSearchDialog() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.id = 'rg';
  dialog.setAttribute('aria-label', 'Recherche globale');
  dialog.innerHTML = '<div class="rg-h"><input type="search" placeholder="Sort, objet, monstre, don, règle…" aria-label="Rechercher dans tout le site" autocomplete="off" enterkeyhint="search">'
    + '<button type="button" class="rg-x" aria-label="Fermer">×</button></div><div class="rg-c" role="group" aria-label="Filtrer par type"></div><div class="rg-r" aria-live="polite"></div>';
  document.body.appendChild(dialog);
  searchInput = dialog.querySelector('input');
  resultsContainer = dialog.querySelector('.rg-r');
  typeFilters = dialog.querySelector('.rg-c');
  typeFilters.innerHTML = typeFilterButtonsHtml();
  typeFilters.addEventListener('click', selectTypeFilter);
  dialog.querySelector('.rg-x').onclick = () => dialog.close();
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  searchInput.addEventListener('input', runSearch);
  searchInput.addEventListener('keydown', handleSearchInputKeys);
  resultsContainer.addEventListener('keydown', moveFocusBetweenResults);
  resultsContainer.addEventListener('click', toggleResultDetail);
}

function highlightedPositions(normalizedName, query, words) {
  const highlighted = new Array(normalizedName.length).fill(false);
  const highlight = word => {
    const start = normalizedName.indexOf(word);
    if (start < 0) return false;
    for (let index = start; index < start + word.length; index++) highlighted[index] = true;
    return true;
  };
  if (!highlight(query)) words.forEach(word => { if (word.length >= 3) highlight(word); });
  return highlighted;
}

function highlightMatches(name, query, words) {
  const normalizedName = normalize(name);
  if (normalizedName.length !== name.length) return escapeHtml(name);
  const highlighted = highlightedPositions(normalizedName, query, words);
  let html = '', insideMark = false;
  for (let index = 0; index < name.length; index++) {
    if (highlighted[index] !== insideMark) {
      html += insideMark ? '</mark>' : '<mark>';
      insideMark = highlighted[index];
    }
    html += escapeHtml(name[index]);
  }
  return html + (insideMark ? '</mark>' : '');
}

function showMessage(text) {
  resultsContainer.innerHTML = '<div class="rg-m">' + text + '</div>';
}

function rankedMatches(query, words) {
  const matches = [];
  searchIndex.forEach(result => {
    if (selectedType && result.t !== selectedType) return;
    const score = relevanceScore(result, query, words);
    if (score) matches.push({ score: score, result: result });
  });
  return matches.sort((first, second) => second.score - first.score || first.result.n.localeCompare(second.result.n, 'fr'));
}

function shortSubtitle(subtitle) {
  return subtitle.length > MAX_SUBTITLE_LENGTH ? subtitle.slice(0, MAX_SUBTITLE_LENGTH) + '…' : subtitle;
}

function resultItemHtml(result, index, query, words) {
  const type = RESULT_TYPES[result.t];
  return '<div class="rg-i" data-i="' + index + '" style="--k:' + type.color + '"><button type="button" aria-expanded="false"><span class="rg-t">' + escapeHtml(type.label) + '</span><span><span class="rg-n">' + highlightMatches(result.n, query, words) + '</span>'
    + (result.s ? '<span class="rg-s">' + escapeHtml(shortSubtitle(result.s)) + '</span>' : '') + '</span></button></div>';
}

function runSearch() {
  const query = normalize(searchInput.value.trim()).replace(/\s+/g, ' ');
  if (!query) {
    showMessage('Tape un nom ou un mot : « boule de feu », « sac sans fond », « gobelin », « agrippé », « vigilant »…');
    shownResults = [];
    return;
  }
  if (!searchIndex) {
    showMessage('Chargement des données…');
    const runId = ++searchRunId;
    loadSearchIndex().then(() => { if (runId === searchRunId) runSearch(); });
    return;
  }
  const words = query.split(' ');
  const matches = rankedMatches(query, words);
  shownResults = matches.slice(0, MAX_SHOWN_RESULTS).map(match => match.result);
  if (!shownResults.length) {
    showMessage('Rien trouvé' + (selectedType ? ' dans ce type (essaie « Tout »)' : '') + '.');
    return;
  }
  const hiddenCount = matches.length - shownResults.length;
  resultsContainer.innerHTML = shownResults.map((result, index) => resultItemHtml(result, index, query, words)).join('')
    + (hiddenCount > 0 ? '<div class="rg-m">' + hiddenCount + ' autres résultats : précise ta recherche.</div>' : '');
}

function openSearch(query) {
  createSearchDialog();
  if (!dialog.open) {
    try { dialog.showModal(); } catch (error) { dialog.setAttribute('open', ''); }
  }
  if (query != null) searchInput.value = query;
  searchInput.focus();
  searchInput.select();
  runSearch();
  loadSearchIndex();
}

function queryFromUrl() {
  try { return new URLSearchParams(location.search).get('q'); } catch (error) { return null; }
}

function resetOtherFilters(searchField) {
  const filtersArea = searchField.closest('section,.qbar');
  if (!filtersArea) return;
  filtersArea.querySelectorAll('select').forEach(select => {
    const firstOptionIsAll = select.options.length && select.options[0].value === '';
    if (select.value !== '' && firstOptionIsAll) {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

function fillPageSearchFromUrl(force) {
  const query = queryFromUrl();
  if (!query) return;
  const searchField = document.getElementById('fq') || document.getElementById('q');
  if (!searchField || (!force && searchField.value === query)) return;
  resetOtherFilters(searchField);
  searchField.value = query;
  searchField.dispatchEvent(new Event('input', { bubbles: true }));
}

function addSearchButtonToBar(bar) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rg-btn';
  button.textContent = '🔍 Rechercher';
  button.title = 'Rechercher dans tout le site (touche /)';
  button.onclick = () => openSearch();
  const homeLink = bar.querySelector('.home');
  if (homeLink && homeLink.nextSibling) bar.insertBefore(button, homeLink.nextSibling);
  else bar.insertBefore(button, bar.firstChild);
}

function addSearchFieldUnderHeader(header) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rg-home';
  button.innerHTML = '<span aria-hidden="true">🔍</span><span>Rechercher un sort, un objet, un monstre, une règle…</span><kbd>/</kbd>';
  button.onclick = () => openSearch();
  header.parentNode.insertBefore(button, header.nextSibling);
}

function isTypingIn(element) {
  return element && (/^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName) || element.isContentEditable);
}

function openSearchFromKeyboard(event) {
  if ((event.key === 'k' || event.key === 'K') && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    openSearch();
    return;
  }
  if (event.key === '/' && !isTypingIn(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    openSearch();
  }
}

function initSearch() {
  const style = document.createElement('style');
  style.textContent = SEARCH_CSS;
  document.head.appendChild(style);
  const bar = document.querySelector('.top .bar') || document.querySelector('.bar');
  const header = document.querySelector('body>header');
  if (bar) addSearchButtonToBar(bar);
  else if (header) addSearchFieldUnderHeader(header);
  document.addEventListener('keydown', openSearchFromKeyboard);
  fillPageSearchFromUrl();
  setTimeout(fillPageSearchFromUrl, 700);
  setTimeout(fillPageSearchFromUrl, 1800);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSearch);
else initSearch();
window.Recherche = { open: openSearch };
})();
