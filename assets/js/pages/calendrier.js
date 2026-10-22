const PRESETS = {
  harptos: {
    nom: 'Calendrier de Harptos (Royaumes oubliés)', ere: 'CV', sem: 10, semNom: 'décade', bis: 4, lune: 30.4375,
    segs: 'Marteau;30\n*Plein-Hiver\nAlturiak;30\nChes;30\nTarsakh;30\n*Verdherbe\nMirtul;30\nKythorn;30\nFlammerègle;30\n*Mi-été\n+Rencontre des Boucliers\nÉléasias;30\nÉleint;30\n*Hautemoisson\nMarpenoth;30\nUktar;30\n*Fête de la Lune\nNuitombe;30',
    rep: 'Ches;19;Équinoxe de printemps;Printemps\nKythorn;20;Solstice d’été;Été\nÉleint;21;Équinoxe d’automne;Automne\nNuitombe;20;Solstice d’hiver;Hiver',
    annee: 1492, lune0: [1372, 'Plein-Hiver', 1]
  },
  simple: {
    nom: 'Simple : 12 mois de 30 jours', ere: '', sem: 7, semNom: 'semaine', bis: 0, lune: 28,
    segs: 'Premier mois;30\nDeuxième mois;30\nTroisième mois;30\nQuatrième mois;30\nCinquième mois;30\nSixième mois;30\nSeptième mois;30\nHuitième mois;30\nNeuvième mois;30\nDixième mois;30\nOnzième mois;30\nDouzième mois;30',
    rep: 'Troisième mois;21;Équinoxe de printemps;Printemps\nSixième mois;21;Solstice d’été;Été\nNeuvième mois;21;Équinoxe d’automne;Automne\nDouzième mois;21;Solstice d’hiver;Hiver',
    annee: 1, lune0: [1, 'Premier mois', 1]
  },
  perso: { nom: 'Personnalisé' }
};
const DEFAULT_PRESET = 'harptos';
const MOON_PHASES = [['🌕', 'Pleine lune'], ['🌖', 'Lune gibbeuse décroissante'], ['🌗', 'Dernier quartier'], ['🌘', 'Dernier croissant'], ['🌑', 'Nouvelle lune'], ['🌒', 'Premier croissant'], ['🌓', 'Premier quartier'], ['🌔', 'Lune gibbeuse croissante']];
const MAIN_MOON_PHASES = [[0, 0], [0.25, 2], [0.5, 4], [0.75, 6]];
const SETTINGS_INPUTS = ['#cEre', '#cSem', '#cSemNom', '#cBis', '#cLune', '#cSegs', '#cRep'];
const MAX_UPCOMING_EVENTS = 10;
const MAX_PAST_EVENTS = 12;
const MAX_DAYS_JUMP = 100000;

let campaign = null;
let calendar = null;
let shownMonth = null;
let selectedDate = null;

const positiveModulo = (value, divisor) => ((value % divisor) + divisor) % divisor;
const countLabel = (count, word) => count + ' ' + word + (Math.abs(count) > 1 ? 's' : '');
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function parseSegmentLine(rawLine) {
  let line = rawLine.trim();
  if (!line) return null;
  const isFestival = /^[*+]/.test(line);
  const isLeapDay = line[0] === '+';
  if (isFestival) line = line.slice(1).trim();
  const [name, days] = line.split(';').map(part => part.trim());
  const dayCount = parseInt(days, 10) || (isFestival ? 1 : 30);
  return name ? { nom: name, j: clamp(dayCount, 1, 400), fete: isFestival, bis: isLeapDay } : null;
}

function parseSegments(text) {
  const segments = String(text || '').split('\n').map(parseSegmentLine).filter(Boolean);
  if (!segments.length) segments.push({ nom: 'Mois', j: 30, fete: false, bis: false });
  if (!segments.some(segment => !segment.fete)) segments[0].fete = false;
  return segments;
}

function parseLandmarks(text, segments, indexOfSegment) {
  const landmarks = [];
  String(text || '').split('\n').forEach(line => {
    const [monthName, day, title, season] = line.split(';').map(part => (part || '').trim());
    const segmentIndex = indexOfSegment(monthName);
    const dayNumber = parseInt(day, 10);
    if (segmentIndex >= 0 && dayNumber >= 1 && dayNumber <= segments[segmentIndex].j && title) landmarks.push({ s: segmentIndex, j: dayNumber, t: title, sa: season });
  });
  return landmarks;
}

const totalDays = segments => segments.reduce((total, segment) => total + segment.j, 0);

function compileCalendar(settings) {
  const segments = parseSegments(settings.segs);
  const indexOfSegment = name => segments.findIndex(segment => segment.nom.toLowerCase() === String(name).trim().toLowerCase());
  const leapDays = totalDays(segments.filter(segment => segment.bis));
  const leapCycle = Math.max(0, parseInt(settings.bis, 10) || 0);
  return {
    segments, indexOfSegment,
    landmarks: parseLandmarks(settings.rep, segments, indexOfSegment),
    commonYearDays: totalDays(segments.filter(segment => !segment.bis)),
    leapDays,
    leapCycle: leapDays ? leapCycle : 0,
    weekLength: clamp(parseInt(settings.sem, 10) || 7, 1, 20),
    weekName: settings.semNom || 'semaine',
    moonCycle: Math.max(1, +settings.lune || 28),
    era: settings.ere || ''
  };
}

const isLeapYear = year => calendar.leapCycle > 0 && positiveModulo(year, calendar.leapCycle) === 0;
const leapYearsBefore = year => calendar.leapCycle ? Math.floor((year + calendar.leapCycle - 1) / calendar.leapCycle) : 0;
const yearStartDay = year => calendar.commonYearDays * year + calendar.leapDays * leapYearsBefore(year);
const segmentExistsInYear = (year, segmentIndex) => !calendar.segments[segmentIndex].bis || isLeapYear(year);

function toDayNumber(date) {
  let dayNumber = yearStartDay(date.y);
  for (let segmentIndex = 0; segmentIndex < date.s; segmentIndex++) {
    if (segmentExistsInYear(date.y, segmentIndex)) dayNumber += calendar.segments[segmentIndex].j;
  }
  return dayNumber + date.j - 1;
}

function yearOfDay(dayNumber) {
  const averageYearLength = calendar.commonYearDays + (calendar.leapCycle ? calendar.leapDays / calendar.leapCycle : 0);
  let year = Math.floor(dayNumber / averageYearLength);
  while (yearStartDay(year) > dayNumber) year--;
  while (yearStartDay(year + 1) <= dayNumber) year++;
  return year;
}

function fromDayNumber(dayNumber) {
  const year = yearOfDay(dayNumber);
  let remainingDays = dayNumber - yearStartDay(year);
  for (let segmentIndex = 0; segmentIndex < calendar.segments.length; segmentIndex++) {
    if (!segmentExistsInYear(year, segmentIndex)) continue;
    if (remainingDays < calendar.segments[segmentIndex].j) return { y: year, s: segmentIndex, j: remainingDays + 1 };
    remainingDays -= calendar.segments[segmentIndex].j;
  }
  const lastIndex = calendar.segments.length - 1;
  return { y: year, s: lastIndex, j: calendar.segments[lastIndex].j };
}

function validDate(date) {
  if (!date) return null;
  const year = date.y | 0;
  let segmentIndex = clamp(date.s | 0, 0, calendar.segments.length - 1);
  if (!segmentExistsInYear(year, segmentIndex)) segmentIndex = positiveModulo(segmentIndex - 1, calendar.segments.length);
  return { y: year, s: segmentIndex, j: clamp(date.j | 0 || 1, 1, calendar.segments[segmentIndex].j) };
}

function dateLabel(date, withoutYear) {
  const segment = calendar.segments[date.s];
  const year = withoutYear ? '' : ' ' + date.y + (calendar.era ? ' ' + calendar.era : '');
  const dayAndMonth = segment.fete && segment.j === 1 ? segment.nom : date.j + (date.j === 1 ? 'ᵉʳ' : '') + ' ' + segment.nom;
  return dayAndMonth + year;
}

const moonPhaseFraction = dayNumber => positiveModulo((dayNumber - campaign.lune0) / calendar.moonCycle, 1);
const moonPhaseOf = dayNumber => MOON_PHASES[positiveModulo(Math.round(moonPhaseFraction(dayNumber) * 8), 8)];

function mainMoonPhaseOn(dayNumber) {
  const halfDay = 0.5 / calendar.moonCycle;
  for (const [target, phaseIndex] of MAIN_MOON_PHASES) {
    const fraction = moonPhaseFraction(dayNumber);
    const distance = Math.min(Math.abs(fraction - target), 1 - Math.abs(fraction - target));
    if (distance < halfDay || (Math.abs(distance - halfDay) < 1e-9 && fraction < target)) return MOON_PHASES[phaseIndex];
  }
  return null;
}

function seasonOn(dayNumber) {
  if (!calendar.landmarks.some(landmark => landmark.sa)) return '';
  for (let daysBack = 0; daysBack <= calendar.commonYearDays + calendar.leapDays; daysBack++) {
    const date = fromDayNumber(dayNumber - daysBack);
    const landmark = calendar.landmarks.find(candidate => candidate.sa && candidate.s === date.s && candidate.j === date.j);
    if (landmark) return landmark.sa;
  }
  return '';
}

const isSameDayOfYear = (item, date) => item.s === date.s && item.j === date.j;
const eventHappensOn = (event, date) => isSameDayOfYear(event, date) && (event.an ? event.y <= date.y : event.y === date.y);

function eventsOn(date) {
  const events = [];
  const segment = calendar.segments[date.s];
  if (segment.fete) events.push({ k: 'fete', t: segment.nom });
  calendar.landmarks.forEach(landmark => { if (isSameDayOfYear(landmark, date)) events.push({ k: 'rp', t: landmark.t }); });
  campaign.evts.forEach(event => { if (eventHappensOn(event, date)) events.push({ k: 'ev', t: event.t, n: event.n, e: event }); });
  return events;
}

const todayNumber = () => toDayNumber(campaign.jour);

const ordinalLabel = number => number === 1 ? '1ʳᵉ ' : number + 'ᵉ ';

function campaignDayHtml(elapsedDays) {
  if (elapsedDays < 0) return '<span>Avant le début de la campagne</span>';
  return '<span>Jour <b>' + (elapsedDays + 1) + '</b> de la campagne (' + countLabel(elapsedDays, 'jour') + ' écoulé' + (elapsedDays > 1 ? 's' : '') + ')</span>';
}

function weekOfMonthHtml() {
  if (calendar.segments[campaign.jour.s].fete) return '<span>Jour de fête</span>';
  const week = Math.floor((campaign.jour.j - 1) / calendar.weekLength) + 1;
  return '<span>' + ordinalLabel(week) + escapeHtml(calendar.weekName) + ' du mois</span>';
}

function todaySummaryHtml() {
  const today = todayNumber();
  const [moonIcon, moonName] = moonPhaseOf(today);
  const season = seasonOn(today);
  const todayEvents = eventsOn(campaign.jour);
  return [
    campaignDayHtml(today - toDayNumber(campaign.debut)),
    weekOfMonthHtml(),
    '<span><span class="moon">' + moonIcon + '</span> ' + moonName + '</span>',
    season ? '<span>Saison : <b>' + escapeHtml(season) + '</b></span>' : '',
    todayEvents.length ? '<span>Aujourd’hui : <b>' + todayEvents.map(event => escapeHtml(event.t)).join(', ') + '</b></span>' : ''
  ].join('');
}

function renderPage() {
  const isGameMaster = isGameMasterActive();
  $('#lock').hidden = isGameMaster;
  $('#mj').hidden = !isGameMaster;
  if (!isGameMaster || !campaign) return;
  $('#tDate').textContent = dateLabel(campaign.jour);
  $('#tSub').innerHTML = todaySummaryHtml();
  $('#bPw').textContent = '+ 1 ' + calendar.weekName;
  renderMonth();
  renderSelectedDay();
  renderEventLists();
}

function monthWithFollowingFestivals(year, segmentIndex) {
  const group = [segmentIndex];
  for (let next = segmentIndex + 1; next < calendar.segments.length && calendar.segments[next].fete; next++) {
    if (segmentExistsInYear(year, next)) group.push(next);
  }
  return group;
}

const firstMonthIndex = () => calendar.segments.findIndex(segment => !segment.fete);

function shiftShownMonth(direction) {
  let { y: year, s: segmentIndex } = shownMonth;
  do {
    segmentIndex += direction;
    if (segmentIndex < 0) { segmentIndex = calendar.segments.length - 1; year--; }
    if (segmentIndex >= calendar.segments.length) { segmentIndex = 0; year++; }
  } while (calendar.segments[segmentIndex].fete);
  shownMonth = { y: year, s: segmentIndex };
  renderMonth();
}

function lastMonthIndex() {
  let index = calendar.segments.length - 1;
  while (calendar.segments[index].fete) index--;
  return index;
}

function monthContaining(date) {
  let segmentIndex = date.s;
  while (segmentIndex > 0 && calendar.segments[segmentIndex].fete) segmentIndex--;
  if (calendar.segments[segmentIndex].fete) return { y: date.y - 1, s: lastMonthIndex() };
  return { y: date.y, s: segmentIndex };
}

function dayCellClasses(dayNumber, isFestival, events) {
  const classes = ['dc'];
  if (isFestival) classes.push('fete');
  if (dayNumber === todayNumber()) classes.push('now');
  if (selectedDate && dayNumber === toDayNumber(selectedDate)) classes.push('sel');
  if (events.length) classes.push('has');
  if (events.length && events.every(event => event.k === 'rp')) classes.push('rp');
  return classes.join(' ');
}

function dayCellHtml(date, isFestival) {
  const dayNumber = toDayNumber(date);
  const events = eventsOn(date).filter(event => event.k !== 'fete');
  const moonMark = mainMoonPhaseOn(dayNumber);
  const ariaLabel = escapeHtml(dateLabel(date)) + (events.length ? ' : ' + escapeHtml(events.map(event => event.t).join(', ')) : '');
  return `<button type="button" class="${dayCellClasses(dayNumber, isFestival, events)}" data-a="${dayNumber}" aria-label="${ariaLabel}">`
    + `<span class="nb">${isFestival ? escapeHtml(calendar.segments[date.s].nom) : date.j}</span>${moonMark ? `<span class="ic" title="${moonMark[1]}">${moonMark[0]}</span>` : ''}`
    + events.slice(0, 2).map(event => `<span class="ev">${escapeHtml(event.t)}</span>`).join('') + '</button>';
}

function segmentCellsHtml(year, segmentIndex, isFestival) {
  let html = '';
  for (let day = 1; day <= calendar.segments[segmentIndex].j; day++) html += dayCellHtml({ y: year, s: segmentIndex, j: day }, isFestival);
  return html;
}

function renderMonth() {
  const { y: year, s: segmentIndex } = shownMonth;
  $('#vTitle').textContent = calendar.segments[segmentIndex].nom + ' ' + year + (calendar.era ? ' ' + calendar.era : '');
  if (document.activeElement !== $('#vYear')) $('#vYear').value = year;
  $('#grid').style.setProperty('--w', calendar.weekLength);
  const festivals = monthWithFollowingFestivals(year, segmentIndex).slice(1);
  $('#grid').innerHTML = segmentCellsHtml(year, segmentIndex, false) + festivals.map(festival => segmentCellsHtml(year, festival, true)).join('');
}

function relativeDayLabel(difference) {
  if (difference === 0) return 'Aujourd’hui';
  return difference > 0 ? 'Dans ' + countLabel(difference, 'jour') : 'Il y a ' + countLabel(-difference, 'jour');
}

function dayEventHtml(event) {
  const note = event.n ? '<small>' + escapeHtml(event.n) + '</small>' : '';
  const yearly = event.e && event.e.an ? '<small>Chaque année</small>' : '';
  const deleteButton = event.e ? `<button data-del="${event.e.id}">Supprimer</button>` : '';
  return `<li class="${event.k === 'ev' ? '' : event.k}"><span class="what">${escapeHtml(event.t)}${note}${yearly}</span>${deleteButton}</li>`;
}

function dayEventsHtml(events) {
  return events.length ? '<ul class="list" style="margin-top:6px">' + events.map(dayEventHtml).join('') + '</ul>' : '<p class="empty">Rien de noté ce jour.</p>';
}

function newEventFormHtml(isAnotherDay) {
  return `<form class="form" id="fEv">
 <input type="text" id="eT" placeholder="Nouvel événement (fête, rendez-vous, échéance…)" aria-label="Titre de l’événement" maxlength="120" required>
 <textarea id="eN" placeholder="Note (facultatif)" aria-label="Note" maxlength="1000"></textarea>
 <label><input type="checkbox" id="eA"> Revient chaque année</label>
 <div class="row"><button class="btn p">Ajouter</button>${isAnotherDay ? '<button type="button" class="btn" id="bGo">On est ce jour-là</button>' : ''}</div>
</form>`;
}

function renderSelectedDay() {
  const date = selectedDate || campaign.jour;
  const dayNumber = toDayNumber(date);
  const [moonIcon, moonName] = moonPhaseOf(dayNumber);
  const difference = dayNumber - todayNumber();
  $('#day').innerHTML = `<h2>${escapeHtml(dateLabel(date))}</h2>
<p>${relativeDayLabel(difference)} · <span class="moon">${moonIcon}</span> ${moonName}</p>
${dayEventsHtml(eventsOn(date))}
${newEventFormHtml(difference !== 0)}`;
}

function upcomingEvents(today, includeFestivals) {
  const upcoming = [];
  const searchSpan = Math.max(400, Math.round((calendar.commonYearDays + calendar.leapDays) * 1.5));
  for (let daysAhead = 1; daysAhead <= searchSpan && upcoming.length < MAX_UPCOMING_EVENTS; daysAhead++) {
    const date = fromDayNumber(today + daysAhead);
    eventsOn(date).forEach(event => { if (event.k === 'ev' || includeFestivals) upcoming.push({ date, daysAhead, event }); });
  }
  return upcoming.slice(0, MAX_UPCOMING_EVENTS);
}

function upcomingEventHtml({ date, daysAhead, event }, today) {
  const when = daysAhead === 1 ? 'Demain' : 'Dans ' + daysAhead + ' j';
  return `<li class="${event.k === 'ev' ? '' : event.k}"><span class="when go" data-a="${today + daysAhead}">${when}</span><span class="what">${escapeHtml(event.t)}<small>${escapeHtml(dateLabel(date))}${event.n ? ' · ' + escapeHtml(event.n) : ''}</small></span></li>`;
}

function pastEvents(today) {
  return campaign.evts.filter(event => !event.an && toDayNumber(event) < today)
    .sort((first, second) => toDayNumber(second) - toDayNumber(first))
    .slice(0, MAX_PAST_EVENTS);
}

function pastEventHtml(event, today) {
  const dayNumber = toDayNumber(event);
  const daysAgo = today - dayNumber;
  return `<li><span class="when go" data-a="${dayNumber}">${daysAgo === 1 ? 'Hier' : 'Il y a ' + daysAgo + ' j'}</span><span class="what">${escapeHtml(event.t)}<small>${escapeHtml(dateLabel(event))}${event.n ? ' · ' + escapeHtml(event.n) : ''}</small></span><button data-del="${event.id}">Supprimer</button></li>`;
}

function renderEventLists() {
  const today = todayNumber();
  const upcoming = upcomingEvents(today, $('#fFetes').checked);
  $('#next').innerHTML = upcoming.length ? upcoming.map(entry => upcomingEventHtml(entry, today)).join('')
    : '<li class="empty" style="border:0;background:none">Aucun événement prévu. Touche un jour du calendrier pour en ajouter un.</li>';
  const past = pastEvents(today);
  $('#past').innerHTML = past.length ? past.map(event => pastEventHtml(event, today)).join('')
    : '<li class="empty" style="border:0;background:none">Les événements passés s’afficheront ici.</li>';
}

function setToday(dayNumber, announcement) {
  campaign.jour = fromDayNumber(dayNumber);
  selectedDate = null;
  shownMonth = monthContaining(campaign.jour);
  Persos.save();
  renderPage();
  if (announcement) showMessage(announcement + ' : ' + dateLabel(campaign.jour));
}

function advanceOneMonth() {
  let { y: year, s: segmentIndex, j: day } = campaign.jour;
  do {
    segmentIndex++;
    if (segmentIndex >= calendar.segments.length) { segmentIndex = 0; year++; }
  } while (calendar.segments[segmentIndex].fete || !segmentExistsInYear(year, segmentIndex));
  setToday(toDayNumber({ y: year, s: segmentIndex, j: Math.min(day, calendar.segments[segmentIndex].j) }), 'Un mois passe');
}

function advanceSeveralDays() {
  const days = clamp(parseInt($('#nJ').value, 10) || 1, 1, MAX_DAYS_JUMP);
  setToday(todayNumber() + days, countLabel(days, 'jour') + ' passent');
}

function showTodayMonth() {
  shownMonth = monthContaining(campaign.jour);
  selectedDate = null;
  renderMonth();
  renderSelectedDay();
}

function changeShownYear(event) {
  const year = parseInt(event.target.value, 10);
  if (isNaN(year)) return;
  shownMonth.y = year;
  renderMonth();
}

function selectDayInGrid(event) {
  const cell = event.target.closest('.dc');
  if (!cell) return;
  selectedDate = fromDayNumber(+cell.dataset.a);
  renderMonth();
  renderSelectedDay();
  if (matchMedia('(max-width:800px)').matches) $('#day').scrollIntoView({ block: 'nearest' });
}

function goToListedDay(link) {
  selectedDate = fromDayNumber(+link.dataset.a);
  shownMonth = monthContaining(selectedDate);
  renderMonth();
  renderSelectedDay();
  $('#day').scrollIntoView({ block: 'nearest' });
}

function deleteEvent(button) {
  const event = campaign.evts.find(candidate => candidate.id === button.dataset.del);
  if (!event || !confirm('Supprimer « ' + event.t + ' » ?')) return;
  campaign.evts = campaign.evts.filter(candidate => candidate !== event);
  Persos.save();
  renderPage();
  showMessage('Événement supprimé');
}

function handlePageClick(event) {
  const listedDay = event.target.closest('.go[data-a]');
  if (listedDay) return goToListedDay(listedDay);
  const deleteButton = event.target.closest('[data-del]');
  if (deleteButton) return deleteEvent(deleteButton);
  if (event.target.id === 'bGo' && selectedDate) setToday(toDayNumber(selectedDate), 'Date du jour');
}

const newEventId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function addEvent(event) {
  if (event.target.id !== 'fEv') return;
  event.preventDefault();
  const title = $('#eT').value.trim();
  if (!title) return;
  const date = selectedDate || campaign.jour;
  campaign.evts.push({ id: newEventId(), y: date.y, s: date.s, j: date.j, t: title, n: $('#eN').value.trim(), an: $('#eA').checked });
  Persos.save();
  renderPage();
  showMessage('Événement ajouté : ' + title);
}

function fillSettings() {
  const settings = campaign.cal;
  $('#cPreset').value = settings.preset || 'perso';
  $('#cEre').value = settings.ere || '';
  $('#cSem').value = settings.sem;
  $('#cSemNom').value = settings.semNom || '';
  $('#cBis').value = settings.bis || 0;
  $('#cLune').value = settings.lune;
  $('#cSegs').value = settings.segs;
  $('#cRep').value = settings.rep || '';
}

function fillSettingsFromPreset(event) {
  const preset = PRESETS[event.target.value];
  if (!preset.segs) return;
  $('#cEre').value = preset.ere;
  $('#cSem').value = preset.sem;
  $('#cSemNom').value = preset.semNom;
  $('#cBis').value = preset.bis;
  $('#cLune').value = preset.lune;
  $('#cSegs').value = preset.segs;
  $('#cRep').value = preset.rep;
}

function settingsFromInputs() {
  return {
    preset: $('#cPreset').value, ere: $('#cEre').value.trim(), sem: +$('#cSem').value, semNom: $('#cSemNom').value.trim() || 'semaine',
    bis: +$('#cBis').value, lune: +$('#cLune').value, segs: $('#cSegs').value, rep: $('#cRep').value
  };
}

function applySettings() {
  const previousCalendar = calendar;
  const previousSegmentName = segmentIndex => previousCalendar.segments[segmentIndex] && previousCalendar.segments[segmentIndex].nom;
  const fullMoonDate = fromDayNumber(campaign.lune0);
  const keptDates = ['jour', 'debut'].map(key => ({ key, name: previousSegmentName(campaign[key].s), date: campaign[key] }));
  campaign.cal = settingsFromInputs();
  calendar = compileCalendar(campaign.cal);
  const sameNamedDate = (date, name) => {
    const segmentIndex = calendar.indexOfSegment(name);
    return validDate({ y: date.y, s: segmentIndex >= 0 ? segmentIndex : Math.min(date.s, calendar.segments.length - 1), j: date.j });
  };
  keptDates.forEach(({ key, name, date }) => { campaign[key] = sameNamedDate(date, name); });
  campaign.lune0 = toDayNumber(sameNamedDate(fullMoonDate, previousSegmentName(fullMoonDate.s)));
  campaign.evts = campaign.evts.map(event => {
    const segmentIndex = calendar.indexOfSegment(previousSegmentName(event.s));
    return segmentIndex < 0 ? null : Object.assign(event, validDate({ y: event.y, s: segmentIndex, j: event.j }));
  }).filter(Boolean);
  selectedDate = null;
  shownMonth = monthContaining(campaign.jour);
  fillSettings();
  Persos.save();
  renderPage();
  showMessage('Calendrier mis à jour');
}

function startCampaignToday() {
  campaign.debut = Object.assign({}, campaign.jour);
  Persos.save();
  renderPage();
  showMessage('La campagne commence le ' + dateLabel(campaign.jour));
}

function setFullMoonToday() {
  campaign.lune0 = todayNumber();
  Persos.save();
  renderPage();
  showMessage('Pleine lune le ' + dateLabel(campaign.jour));
}

function defaultCampaign(presetKey) {
  const key = presetKey || DEFAULT_PRESET;
  const preset = PRESETS[key];
  const settings = { preset: key, ere: preset.ere, sem: preset.sem, semNom: preset.semNom, bis: preset.bis, lune: preset.lune, segs: preset.segs, rep: preset.rep };
  calendar = compileCalendar(settings);
  const firstDay = { y: preset.annee, s: firstMonthIndex(), j: 1 };
  const [moonYear, moonSegmentName, moonDay] = preset.lune0;
  return { cal: settings, jour: firstDay, debut: Object.assign({}, firstDay), lune0: toDayNumber({ y: moonYear, s: Math.max(0, calendar.indexOfSegment(moonSegmentName)), j: moonDay }), evts: [] };
}

function savedCampaign(data) {
  calendar = compileCalendar(data.cal);
  const events = (Array.isArray(data.evts) ? data.evts : []).filter(event => event && event.t && calendar.segments[event.s]).map(event => Object.assign(event, validDate(event)));
  return { cal: data.cal, jour: validDate(data.jour), debut: validDate(data.debut || data.jour), lune0: +data.lune0 || 0, evts: events };
}

function loadCampaign(saved) {
  const data = saved && saved.data;
  campaign = data && data.cal && data.jour ? savedCampaign(data) : defaultCampaign();
  selectedDate = null;
  shownMonth = monthContaining(campaign.jour);
  fillSettings();
  renderPage();
}

$('#bP1').onclick = () => setToday(todayNumber() + 1, 'Nouveau jour');
$('#bM1').onclick = () => setToday(todayNumber() - 1, 'Retour d’un jour');
$('#bPw').onclick = () => setToday(todayNumber() + calendar.weekLength, 'Une ' + calendar.weekName + ' passe');
$('#bPm').onclick = advanceOneMonth;
$('#bPn').onclick = advanceSeveralDays;
$('#vPrev').onclick = () => shiftShownMonth(-1);
$('#vNext').onclick = () => shiftShownMonth(1);
$('#vNow').onclick = showTodayMonth;
$('#vYear').onchange = changeShownYear;
$('#grid').onclick = selectDayInGrid;
document.addEventListener('click', handlePageClick);
document.addEventListener('submit', addEvent);
$('#fFetes').onchange = renderEventLists;

Object.keys(PRESETS).forEach(key => $('#cPreset').add(new Option(PRESETS[key].nom, key)));
$('#cPreset').onchange = fillSettingsFromPreset;
SETTINGS_INPUTS.forEach(selector => $(selector).addEventListener('input', () => { $('#cPreset').value = 'perso'; }));
$('#cApply').onclick = applySettings;
$('#cStart').onclick = startCampaignToday;
$('#cMoon').onclick = setFullMoonToday;

Persos.init({ part: 'calendrier', mount: $('#persos'), msg: showMessage, collect: () => ({ version: 1, type: 'calendrier-dnd-5e', data: campaign }), apply: loadCampaign, onName: renderPage });
