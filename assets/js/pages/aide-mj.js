const TAVERN_NAME_STARTS = ['Le Sanglier', 'La Chope', 'Le Griffon', 'La Licorne', 'Le Dragon', 'Le Corbeau', 'La Lanterne', 'Le Tonneau', 'La Sirène', 'Le Gobelin', 'Le Chevalier', 'La Truie', 'Le Hibou', 'La Couronne', 'Le Marteau', 'Le Chat'];
const TAVERN_NAME_ENDINGS = [
  { masculine: 'Ivre' }, { masculine: 'Fêlé', feminine: 'Fêlée' }, { masculine: 'Doré', feminine: 'Dorée' }, { masculine: 'qui Rit' },
  { masculine: 'Endormi', feminine: 'Endormie' }, { masculine: 'Borgne' }, { masculine: 'Rouillé', feminine: 'Rouillée' }, { masculine: 'd’Argent' },
  { masculine: 'Hurlant', feminine: 'Hurlante' }, { masculine: 'Boiteux', feminine: 'Boiteuse' }, { masculine: 'Joyeux', feminine: 'Joyeuse' },
  { masculine: 'Noir', feminine: 'Noire' }, { masculine: 'Repu', feminine: 'Repue' }, { masculine: 'Perdu', feminine: 'Perdue' }, { masculine: 'des Brumes' }, { masculine: 'du Pendu' }
];
const TAVERN_ATMOSPHERES = ['bondée et bruyante', 'calme, presque vide', 'enfumée, fréquentée par des marins', 'propre et chère', 'louche, pleine de regards en coin', 'familiale, odeur de soupe', 'tenue par une ancienne aventurière', 'où un barde chante faux'];

function randomTavern() {
  const start = randomItem(TAVERN_NAME_STARTS);
  const ending = randomItem(TAVERN_NAME_ENDINGS);
  const isFeminine = /^La /.test(start);
  return start + ' ' + (isFeminine && ending.feminine || ending.masculine) + ' : ' + randomItem(TAVERN_ATMOSPHERES);
}

function showPageIfGameMaster() {
  const allowed = isGameMasterActive();
  $('#lock').hidden = allowed;
  $('#mj').hidden = !allowed;
  $('#bPrint').hidden = !allowed;
}

function tableOfContentsHtml(sections) {
  return sections.map(section => `<a href="#${section.id}">${escapeHtml(section.t.split(' :')[0])}</a>`).join('');
}

function priceRowHtml(row) {
  return `<tr><td>${escapeHtml(row.n)}${row.d ? '<small>' + escapeHtml(row.d) + '</small>' : ''}</td><td class="p">${escapeHtml(row.p)}</td></tr>`;
}

function tavernGeneratorHtml(section) {
  if (section.id !== 'taverne') return '';
  return '<div class="gen"><button type="button" id="bTav">Nom de taverne au hasard</button><output id="tav" aria-live="polite"></output></div>';
}

function priceSectionHtml(section) {
  return `<section class="panel box" id="${section.id}" style="--k:${section.k}"><h2>${escapeHtml(section.t)}</h2>${section.note ? '<p>' + escapeHtml(section.note) + '</p>' : ''}
<table><thead><tr><th>${escapeHtml(section.cols[0])}</th><th style="text-align:right">${escapeHtml(section.cols[1])}</th></tr></thead><tbody>${section.rows.map(priceRowHtml).join('')}</tbody></table>
${tavernGeneratorHtml(section)}</section>`;
}

function renderPriceSections(sections) {
  $('#toc').innerHTML = tableOfContentsHtml(sections);
  $('#grid').innerHTML = sections.map(priceSectionHtml).join('')
    + '<section class="panel empty" id="none" hidden>Rien ne correspond à cette recherche.</section>';
  $('#bTav').onclick = () => { $('#tav').textContent = randomTavern(); };
}

function filterSectionRows(section, searchedText) {
  const titleMatches = !searchedText || normalizeText(section.querySelector('h2').textContent).includes(searchedText);
  let visibleRows = 0;
  section.querySelectorAll('tbody tr').forEach(row => {
    const visible = titleMatches || normalizeText(row.textContent).includes(searchedText);
    row.classList.toggle('hide', !visible);
    visibleRows += visible;
  });
  section.hidden = !visibleRows;
  return visibleRows;
}

function filterPrices() {
  const searchedText = normalizeText($('#q').value);
  const visibleRows = $$('.box').reduce((total, section) => total + filterSectionRows(section, searchedText), 0);
  $('#none').hidden = !!visibleRows;
}

async function loadPrices() {
  renderPriceSections(await fetchJson('assets/json/vf/aide-mj.json'));
  if ($('#q').value) filterPrices();
}

$('#q').oninput = filterPrices;
$('#bPrint').onclick = () => window.print();
Persos.init({ part: 'aidemj', mount: $('#persos'), msg: showMessage, collect: () => null, apply: showPageIfGameMaster, onName: showPageIfGameMaster });
loadPrices();
