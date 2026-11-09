(function () {
'use strict';

const LINK_ICON = '🔗';
const COPIED_ICON = '✓';
const COPIED_FEEDBACK_MS = 1600;
const SCROLL_GAP_PX = 8;
const TARGET_CLASS = 'lien-cible';

const STYLE = '.lien-btn{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;min-width:28px;min-height:22px;margin-left:6px;padding:0 5px;border:1px solid #9aa0c4;border-radius:5px;background:#fff;color:#2a3170;font:400 12px/1.6 var(--sans,system-ui,sans-serif);font-style:normal;vertical-align:middle;cursor:pointer}\
.lien-btn:hover,.lien-btn:focus-visible{background:#2a3170;border-color:#2a3170;outline:0}\
.lien-btn.copie{background:#2e9e5b;border-color:#2e9e5b;color:#fff}\
.lien-cible{animation:lien-cible 2.6s ease-out}\
@keyframes lien-cible{0%,40%{box-shadow:0 0 0 3px #d8a21a}100%{box-shadow:0 0 0 3px transparent}}\
@media screen and (max-width:700px){.lien-btn{min-height:26px;min-width:32px}}\
@media print{.lien-btn{display:none!important}}';

function addStyle() {
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function anchorSlug(name) {
  return String(name == null ? '' : name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’‘`´']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function requestedAnchor() {
  const fragment = location.hash.slice(1);
  try { return decodeURIComponent(fragment); } catch (error) { return fragment; }
}

function isRequested(anchor) {
  const requestedSlug = anchorSlug(requestedAnchor());
  return !!requestedSlug && requestedSlug === anchorSlug(anchor);
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function copyButtonHtml(fragment, label) {
  const title = escapeAttribute('Copier le lien vers « ' + label + ' »');
  return '<button type="button" class="lien-btn" data-lien="' + escapeAttribute(fragment) + '" title="' + title + '" aria-label="' + title + '">' + LINK_ICON + '</button>';
}

const entryUrl = fragment => location.href.split('#')[0] + '#' + fragment;

function stickyHeaderHeight() {
  const header = document.querySelector('.top');
  const isPinned = header && ['sticky', 'fixed'].includes(getComputedStyle(header).position);
  return isPinned ? header.offsetHeight : 0;
}

function revealEntry(elementId) {
  const entry = document.getElementById(elementId);
  if (!entry) return;
  document.querySelectorAll('.' + TARGET_CLASS).forEach(element => element.classList.remove(TARGET_CLASS));
  entry.classList.add(TARGET_CLASS);
  window.scrollTo(0, entry.getBoundingClientRect().top + window.scrollY - stickyHeaderHeight() - SCROLL_GAP_PX);
}

async function writeToClipboard(text) {
  if (!navigator.clipboard || !window.isSecureContext) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    return false;
  }
}

function showCopiedFeedback(button) {
  button.classList.add('copie');
  button.textContent = COPIED_ICON;
  setTimeout(() => {
    button.classList.remove('copie');
    button.textContent = LINK_ICON;
  }, COPIED_FEEDBACK_MS);
  if (typeof showMessage === 'function' && document.getElementById('msg')) showMessage('Lien copié');
}

async function copyLinkFromClick(event) {
  const button = event.target.closest && event.target.closest('.lien-btn');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const url = entryUrl(button.dataset.lien);
  history.replaceState(history.state, '', url);
  if (await writeToClipboard(url)) showCopiedFeedback(button);
  else window.prompt('Copie ce lien :', url);
}

addStyle();
document.addEventListener('click', copyLinkFromClick, true);

window.EntryLinks = { slug: anchorSlug, isRequested: isRequested, button: copyButtonHtml, reveal: revealEntry };
})();
