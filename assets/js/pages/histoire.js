'use strict';

const STORY_SECTIONS = [
  { key: 'histoire', title: 'Histoire', help: 'son passé, d’où il vient, ce qui l’a mené à l’aventure', color: '#2a3170', isLarge: true },
  { key: 'apparence', title: 'Apparence', help: 'âge, taille, allure, signes distinctifs', color: '#2f6fd0' },
  { key: 'personnalite', title: 'Traits de personnalité', help: 'manières, habitudes, façon de parler', color: '#7a4fc4' },
  { key: 'ideaux', title: 'Idéaux', help: 'ce en quoi il croit', color: '#2e9e5b', columnGroup: 'a' },
  { key: 'liens', title: 'Liens', help: 'personnes, lieux ou objets auxquels il tient', color: '#12968f', columnGroup: 'a' },
  { key: 'defauts', title: 'Défauts', help: 'faiblesses, vices, peurs', color: '#c8402f', columnGroup: 'b' },
  { key: 'secrets', title: 'Secrets', help: 'ce que les autres ne savent pas (encore)', color: '#9c3d8f', columnGroup: 'b' },
  { key: 'allies', title: 'Alliés, ennemis et organisations', help: 'famille, mentor, rivaux, guildes, cultes…', color: '#d8791a' },
  { key: 'objectifs', title: 'Objectifs', help: 'ce qu’il veut accomplir, à court et à long terme', color: '#8a6d1f' }
];
const MESSAGE_DURATION_MS = 3500;

const storyField = key => $('#t_' + key);

function sectionElement(section) {
  const element = document.createElement('section');
  element.className = 'sec' + (section.isLarge ? ' big' : '');
  element.style.setProperty('--c', section.color);
  element.dataset.k = section.key;
  element.innerHTML = `<h2><label for="t_${section.key}">${section.title}</label><span>${section.help}</span></h2><textarea id="t_${section.key}" data-k="${section.key}" spellcheck="true"></textarea><div class="pv"></div>${section.isLarge ? '<div class="cnt"></div>' : ''}`;
  return element;
}

function buildStorySections() {
  const container = $('#secs');
  let currentGroup = null, currentGroupKey = null;
  STORY_SECTIONS.forEach(section => {
    const element = sectionElement(section);
    if (!section.columnGroup) {
      currentGroupKey = null;
      container.appendChild(element);
      return;
    }
    if (section.columnGroup !== currentGroupKey) {
      currentGroup = document.createElement('div');
      currentGroup.className = 'grid2';
      container.appendChild(currentGroup);
      currentGroupKey = section.columnGroup;
    }
    currentGroup.appendChild(element);
  });
}

function fitTextareaToContent(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 2 + 'px';
}

function updateWordCount() {
  const textarea = storyField('histoire');
  const text = textarea.value.trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  textarea.parentNode.querySelector('.cnt').textContent = wordCount + ' mot' + (wordCount > 1 ? 's' : '');
}

function fitAllTextareas() {
  document.querySelectorAll('#secs textarea').forEach(fitTextareaToContent);
  updateWordCount();
}

function collectStory() {
  const data = {};
  STORY_SECTIONS.forEach(section => { data[section.key] = storyField(section.key).value; });
  return { version: 1, type: 'histoire-dnd-5e', data: data };
}

function showStory(saved) {
  const data = saved && saved.data || {};
  STORY_SECTIONS.forEach(section => { storyField(section.key).value = String(data[section.key] || ''); });
  showCharacterSummary();
  fitAllTextareas();
}

function showCharacterSummary() {
  const character = Persos.current();
  const sheet = character && character.fiche && character.fiche.data || {};
  const classAndSubclass = [sheet.classe, sheet.sousclasse].filter(Boolean).join(' — ');
  const classLine = classAndSubclass && (classAndSubclass + (sheet.niveau ? ' niv. ' + sheet.niveau : ''));
  const background = sheet.historique && ('historique : ' + sheet.historique);
  $('#sum').textContent = [classLine, sheet.espece, background, sheet.alignement].filter(Boolean).join(' · ');
}

function isStoryEmpty() {
  return STORY_SECTIONS.every(section => !storyField(section.key).value.trim());
}

function showStoryMessage(text) {
  if (text) showMessage(text, MESSAGE_DURATION_MS);
  else $('#msg').textContent = '';
}

function handleStoryInput(event) {
  if (!event.target.matches('#secs textarea')) return;
  fitTextareaToContent(event.target);
  if (event.target.id === 't_histoire') updateWordCount();
  Persos.save();
}

function copyStoryIntoPrintBlocks() {
  document.querySelectorAll('#secs .sec').forEach(section => {
    const text = storyField(section.dataset.k).value.trim();
    section.querySelector('.pv').textContent = text;
    section.classList.toggle('vide', !text);
  });
}

function underlined(text, character) {
  return text + '\n' + character.repeat(text.length) + '\n';
}

function storyAsText(characterName) {
  let text = underlined(characterName, '=');
  STORY_SECTIONS.forEach(section => {
    const content = storyField(section.key).value.trim();
    if (content) text += '\n' + underlined(section.title, '-') + content + '\n';
  });
  return text;
}

function saveStoryAsTextFile() {
  if (isStoryEmpty()) {
    showStoryMessage('Rien à enregistrer pour l’instant');
    return;
  }
  const characterName = ($('#titre').value || Persos.current().nom || 'personnage').trim();
  downloadTextFile('histoire_' + fileSafeName(characterName) + '.txt', storyAsText(characterName), 'text/plain;charset=utf-8');
  showStoryMessage('Histoire enregistrée dans un fichier .txt');
}

function printStory() {
  if (isStoryEmpty()) {
    showStoryMessage('Écris d’abord quelque chose');
    return;
  }
  window.print();
}

function clearStory() {
  if (isStoryEmpty()) return;
  if (!confirm('Effacer toute l’histoire de « ' + Persos.current().nom + ' » ? Cette action est définitive.')) return;
  showStory(null);
  Persos.save();
  showStoryMessage('Histoire effacée');
}

buildStorySections();
document.addEventListener('input', handleStoryInput);
addEventListener('resize', fitAllTextareas);
addEventListener('beforeprint', copyStoryIntoPrintBlocks);
$('#bPrint').onclick = printStory;
$('#bSave').onclick = saveStoryAsTextFile;
$('#bClear').onclick = clearStory;
Persos.init({ part: 'histoire', mount: $('#persos'), title: $('#titre'), collect: collectStory, apply: showStory, msg: showStoryMessage });
