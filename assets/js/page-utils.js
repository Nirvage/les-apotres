const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"]/g, character => HTML_ESCAPES[character]);
}

function withoutAccents(text) {
  return String(text == null ? '' : text).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeText(text) {
  return withoutAccents(text).toLowerCase().replace(/[’‘`´]/g, "'").trim();
}

let messageTimer = null;

function showMessage(text, durationMs = 4000) {
  const messageArea = $('#msg');
  messageArea.textContent = text;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { messageArea.textContent = ''; }, durationMs);
}

function scrollToRequestedAnchor() {
  if (!location.hash) return;
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(url);
  return response.json();
}

function fileSafeName(name) {
  return String(name).trim().replace(/[^\p{L}\p{N}_-]+/gu, '_');
}

function downloadTextFile(fileName, text, mimeType) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: mimeType }));
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function downloadJsonFile(fileName, data) {
  downloadTextFile(fileName, JSON.stringify(data, null, 2), 'application/json');
}

function isGameMasterActive() {
  const character = window.Persos && Persos.current();
  return !!character && character.nom.trim().toLowerCase() === 'mj';
}

function cryptoRandomBelow(limit) {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return Math.floor(randomValues[0] / 4294967296 * limit);
}

function randomItem(list) {
  return list[cryptoRandomBelow(list.length)];
}
