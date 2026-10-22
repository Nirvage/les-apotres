
function tableOfContentsHtml(sections) {
  return sections.map(section => `<a href="#${section.id}">${escapeHtml(section.c)}</a>`).join('');
}

function ruleRowHtml(rule) {
  return `<div class="r"><b>${escapeHtml(rule.n)}</b><div>${rule.h}</div></div>`;
}

function sectionHtml(section) {
  const note = section.note ? '<p>' + escapeHtml(section.note) + '</p>' : '';
  return `<section class="panel box" id="${section.id}" style="--k:${section.k}"><h2>${escapeHtml(section.t)}</h2>${note}
${section.rows.map(ruleRowHtml).join('')}</section>`;
}

function renderRules(sections) {
  $('#toc').innerHTML = tableOfContentsHtml(sections);
  $('#grid').innerHTML = sections.map(sectionHtml).join('')
    + '<section class="panel empty" id="none" hidden>Rien ne correspond à cette recherche.</section>';
}

function filterSectionRows(section, searchedText) {
  const titleMatches = !searchedText || normalizeText(section.querySelector('h2').textContent).includes(searchedText);
  let visibleRows = 0;
  section.querySelectorAll('.r').forEach(row => {
    const visible = titleMatches || normalizeText(row.textContent).includes(searchedText);
    row.classList.toggle('hide', !visible);
    visibleRows += visible;
  });
  section.hidden = !visibleRows;
  return visibleRows;
}

function filterRules(text) {
  const searchedText = normalizeText(text.trim());
  const visibleRows = $$('.box').reduce((total, section) => total + filterSectionRows(section, searchedText), 0);
  $('#none').hidden = !!visibleRows;
}


async function loadRules() {
  const sections = await (await fetch('assets/json/vf/combat.json')).json();
  renderRules(sections);
  filterRules($('#q').value);
  scrollToRequestedAnchor();
}

$('#q').oninput = event => filterRules(event.target.value);
$('#bPrint').onclick = () => window.print();
loadRules();
