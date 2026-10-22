const anchorId = name => normalizeText(name).replace(/[^a-z]+/g, '-');

let conditionTags = {};
let conditions = [];
let selectedTag = '';

function tagButtonsHtml() {
  return Object.entries(conditionTags).map(([tag, label]) => `<button type="button" data-t="${tag}" aria-pressed="false">${escapeHtml(label)}</button>`).join('');
}

function isStrongEffect(effect) {
  return /^(0|aucune|échec|rate)/.test(effect);
}

function summaryRowHtml(condition) {
  const cells = condition.m.map(effect => `<td class="${isStrongEffect(effect) ? 'o' : ''}">${escapeHtml(effect || '–')}</td>`).join('');
  return `<tr data-id="${anchorId(condition.n)}"><td><a href="#${anchorId(condition.n)}">${escapeHtml(condition.n)}</a></td>${cells}</tr>`;
}

function conditionTagsHtml(condition) {
  if (!condition.t.length) return '';
  return '<div class="tg">' + condition.t.map(tag => '<span>' + escapeHtml(conditionTags[tag]) + '</span>').join('') + '</div>';
}

function conditionSectionHtml(condition) {
  return `<section class="panel box" id="${anchorId(condition.n)}" style="--k:${condition.k}"><h2>${escapeHtml(condition.n)}${VO.btn('etats', condition.n, condition.n)}</h2>
<p class="sum">${escapeHtml(condition.s)}</p><ul>${condition.e.map(effect => '<li>' + effect + '</li>').join('')}</ul><p class="fin">${condition.f}</p>
${conditionTagsHtml(condition)}</section>`;
}

function relatedSituationsHtml(situations) {
  const rows = situations.map(situation => `<div class="r"><b>${escapeHtml(situation.n)}</b><div>${situation.h}</div></div>`).join('');
  return `<section class="panel box" id="autres" style="--k:#2a3170"><h2>Situations proches</h2>${rows}</section>`;
}

function renderConditions(situations) {
  $('#tags').innerHTML = tagButtonsHtml();
  $('#mat').innerHTML = conditions.map(summaryRowHtml).join('');
  $('#grid').innerHTML = conditions.map(conditionSectionHtml).join('')
    + relatedSituationsHtml(situations)
    + '<section class="panel empty" id="none" hidden>Aucun état ne correspond.</section>';
}

function conditionSearchText(condition) {
  return normalizeText(condition.n + ' ' + condition.a + ' ' + condition.s + ' ' + condition.e.join(' ') + ' ' + condition.f);
}

function conditionMatches(condition, searchedText) {
  const hasSelectedTag = !selectedTag || condition.t.includes(selectedTag);
  return hasSelectedTag && (!searchedText || conditionSearchText(condition).includes(searchedText));
}

function filterConditions() {
  const searchedText = normalizeText($('#q').value.trim());
  let visibleCount = 0;
  conditions.forEach(condition => {
    const visible = conditionMatches(condition, searchedText);
    const id = anchorId(condition.n);
    document.getElementById(id).hidden = !visible;
    $(`#mat tr[data-id="${id}"]`).classList.toggle('hide', !visible);
    visibleCount += visible;
  });
  const relatedSituations = $('#autres');
  relatedSituations.hidden = !!selectedTag || (!!searchedText && !normalizeText(relatedSituations.textContent).includes(searchedText));
  $('#none').hidden = !!visibleCount || !relatedSituations.hidden;
}

function toggleTagFilter(event) {
  const button = event.target.closest('button');
  if (!button) return;
  selectedTag = selectedTag === button.dataset.t ? '' : button.dataset.t;
  $$('#tags button').forEach(tagButton => tagButton.setAttribute('aria-pressed', tagButton.dataset.t === selectedTag));
  filterConditions();
}


async function loadConditions() {
  const data = await (await fetch('assets/json/vf/etats.json')).json();
  conditionTags = data.filtres;
  conditions = data.etats;
  renderConditions(data.situations);
  filterConditions();
  scrollToRequestedAnchor();
}

$('#q').oninput = filterConditions;
$('#tags').onclick = toggleTagFilter;
$('#bPrint').onclick = () => window.print();
loadConditions();
