(function () {
'use strict';

const VO_DATA_FILES = {
  sorts: 'assets/json/vo/sorts.json', objets: 'assets/json/vo/objets.json', equipement: 'assets/json/vo/equipement.json', monstres: 'assets/json/vo/monstres.json',
  familiers: 'assets/json/vo/familiers.json', dons: 'assets/json/vo/dons.json', classes: 'assets/json/vo/classes.json', especes: 'assets/json/vo/especes.json',
  historiques: 'assets/json/vo/historiques.json', etats: 'assets/json/vo/etats.json'
};
const SRD_ATTRIBUTION_BY_VERSION = {
  '52': 'This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.',
  '51': 'This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.'
};
const AIDEDD_PATHS_BY_KIND = {
  sorts: { edition2024: 'spell/', edition2014: 'dnd/sorts.php?vo=' },
  objets: { edition2024: 'magic-item/', edition2014: 'dnd/om.php?vo=' },
  monstres: { edition2024: 'monster/', edition2014: 'dnd/monstres.php?vo=' },
  familiers: { edition2024: 'monster/', edition2014: 'dnd/monstres.php?vo=' },
  dons: { edition2024: 'feat/', edition2014: 'dnd/dons.php?vo=' }
};
const BOOKS_2024 = /Player's Handbook \(2024\)|Dungeon Master's Guide \(2024\)|Monster Manual \(2025\)/;
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"]/g, character => HTML_ESCAPES[character]);
const loadedDataByKind = {};
const pendingLoadsByKind = {};

function loadVoData(kind) {
  if (loadedDataByKind[kind]) return Promise.resolve(loadedDataByKind[kind]);
  if (!pendingLoadsByKind[kind]) {
    pendingLoadsByKind[kind] = fetch(VO_DATA_FILES[kind])
      .then(response => {
        if (!response.ok) throw new Error(VO_DATA_FILES[kind]);
        return response.json();
      })
      .then(data => (loadedDataByKind[kind] = data))
      .catch(error => {
        pendingLoadsByKind[kind] = null;
        throw error;
      });
  }
  return pendingLoadsByKind[kind];
}

function findVoEntry(data, kind, id) {
  if (kind !== 'classes') return data[id];
  const [table, key] = id.split('§');
  return (data[table] || {})[key];
}

const VO_CSS = '\
.vo-btn{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;min-width:30px;min-height:22px;margin-left:6px;padding:1px 6px;border:1px solid #9aa0c4;border-radius:5px;background:#fff;color:#2a3170;font:600 10.5px/1.6 var(--sans,system-ui,sans-serif);letter-spacing:.04em;vertical-align:middle;cursor:pointer;white-space:nowrap}\
.vo-btn:hover,.vo-btn:focus-visible{background:#2a3170;border-color:#2a3170;color:#fff;outline:0}\
#vo{width:min(720px,100vw - 24px);max-height:calc(100vh - 48px);margin:24px auto auto;padding:0;border:0;border-top:4px solid var(--gold,#d9a21b);border-radius:10px;background:#fff;color:var(--ink,#1d2033);font:14px/1.5 var(--sans,system-ui,sans-serif);box-shadow:0 10px 40px #000a;display:none;flex-direction:column}\
#vo[open]{display:flex}\
#vo::backdrop{background:#0b0d22b3}\
#vo .vo-h{display:flex;gap:10px;align-items:flex-start;padding:12px 14px 10px;border-bottom:1px solid #e3e5f0}\
#vo .vo-h div{flex:1;min-width:0}\
#vo .vo-n{margin:0;font:italic 700 21px/1.2 var(--serif,Georgia,serif);color:#2a3170}\
#vo .vo-s{font-size:12px;color:#5f6580}\
#vo .vo-x{border:0;background:transparent;font-size:24px;line-height:1;padding:2px 8px;cursor:pointer;color:#5f6580}\
#vo .vo-b{overflow-y:auto;padding:6px 16px 14px}\
#vo .vo-b p{margin:8px 0}#vo .vo-b h4{margin:12px 0 4px;padding-bottom:2px;border-bottom:1px solid #d9a21b;font:italic 700 15px var(--serif,Georgia,serif);color:#7a1f1f}\
#vo .vo-b ul{margin:6px 0;padding-left:20px}\
#vo .vo-sub{color:#5f6580}\
#vo .vo-t{border-collapse:collapse;font-size:12.5px;margin:6px 0;max-width:100%}#vo .vo-t td,#vo .vo-t th{border:1px solid #dde;padding:2px 6px;text-align:left;vertical-align:top}\
#vo .vo-ab td,#vo .vo-ab th{text-align:center}\
#vo .vo-note{margin-top:12px;padding:8px 10px;background:#f4f5fb;border-radius:6px;font-size:13px}\
#vo .vo-note a{color:#2f6fd0;font-weight:600}\
#vo .vo-lic{margin-top:14px;font-size:11px;color:#5f6580}\
@media screen and (max-width:700px){#vo{width:100vw;max-width:100vw;height:100%;max-height:100%;margin:0;border-radius:0}.vo-btn{min-height:26px;min-width:34px}}\
@media print{.vo-btn{display:none!important}}';

let dialog, dialogBody, dialogTitle, dialogSubtitle;

function createDialog() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.id = 'vo';
  dialog.setAttribute('aria-label', 'Version originale en anglais');
  dialog.innerHTML = '<div class="vo-h"><div><p class="vo-n" lang="en"></p><div class="vo-s"></div></div><button type="button" class="vo-x" aria-label="Fermer">×</button></div><div class="vo-b"></div>';
  dialogTitle = dialog.querySelector('.vo-n');
  dialogSubtitle = dialog.querySelector('.vo-s');
  dialogBody = dialog.querySelector('.vo-b');
  dialog.querySelector('.vo-x').onclick = () => dialog.close();
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.body.appendChild(dialog);
}

function urlSlug(englishName) {
  return String(englishName).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function aideddUrl(kind, entry) {
  const paths = AIDEDD_PATHS_BY_KIND[kind];
  if (!paths || entry.i || !entry.s) return '';
  const path = BOOKS_2024.test(entry.s) ? paths.edition2024 : paths.edition2014;
  return 'https://www.aidedd.org/' + path + urlSlug(entry.n);
}

function openDialog() {
  if (dialog.open) return;
  try { dialog.showModal(); } catch (error) { dialog.setAttribute('open', ''); }
}

function showMissingVo() {
  dialogTitle.textContent = 'Pas de version originale';
  dialogBody.innerHTML = '<p>Aucune version anglaise officielle n’a été trouvée pour cet élément : il vient d’une source non publiée en anglais dans les données utilisées (D&amp;D Beyond Drops, création personnelle…) ou a été ajouté au site sans équivalent.</p>';
}

function srdTextHtml(entry) {
  return '<div lang="en">' + entry.h + '</div>'
    + '<p class="vo-lic" lang="en">' + escapeHtml(SRD_ATTRIBUTION_BY_VERSION[entry.l] || '') + '</p>';
}

function featureListHtml(entry) {
  if (!entry.f || !entry.f.length) return '';
  const lines = entry.f.map(([level, name]) => 'Level ' + level + ': ' + escapeHtml(name));
  return '<p class="vo-sub">Capacités (noms et niveaux du livre d’origine)</p><p lang="en">' + lines.join('<br>') + '</p>';
}

function whereToReadHtml(kind, entry) {
  if (entry.x) return 'Il se trouve dans le livre indiqué ci-dessus.';
  const aidedd = aideddUrl(kind, entry);
  if (aidedd) return '<a href="' + aidedd + '" target="_blank" rel="noopener">Lire la version originale sur AideDD</a>.';
  return '<a href="https://www.dndbeyond.com/search?q=' + encodeURIComponent(entry.n) + '" target="_blank" rel="noopener">Lire la version originale sur D&amp;D Beyond</a> (livre requis pour le contenu payant).';
}

function nonFreeTextHtml(kind, entry) {
  return featureListHtml(entry)
    + '<div class="vo-note">Le texte anglais de cet élément n’est pas sous licence libre (hors SRD), il ne peut donc pas être reproduit ici. '
    + whereToReadHtml(kind, entry) + '</div>';
}

function showVoEntry(kind, entry, frenchName) {
  dialogTitle.textContent = entry.n;
  dialogSubtitle.textContent = (frenchName ? frenchName + ' · ' : '') + (entry.s || 'Source anglaise');
  dialogBody.innerHTML = entry.h ? srdTextHtml(entry) : nonFreeTextHtml(kind, entry);
  dialogBody.scrollTop = 0;
}

function showVo(kind, id, frenchName) {
  createDialog();
  dialogTitle.textContent = 'Version originale';
  dialogSubtitle.textContent = frenchName || '';
  dialogBody.innerHTML = '<p class="vo-sub">Chargement…</p>';
  openDialog();
  loadVoData(kind).then(data => {
    const entry = findVoEntry(data, kind, id);
    if (entry) showVoEntry(kind, entry, frenchName);
    else showMissingVo();
  }).catch(() => {
    dialogBody.innerHTML = '<p>Impossible de charger la version originale. Vérifie ta connexion, puis réessaie.</p>';
  });
}

function voButtonHtml(kind, id, frenchName) {
  return '<button type="button" class="vo-btn" data-vo="' + escapeHtml(kind) + '" data-vo-id="' + escapeHtml(id) + '"' + (frenchName ? ' data-vo-fr="' + escapeHtml(frenchName) + '"' : '')
    + ' title="Version originale (anglais)" aria-label="Version originale en anglais">VO</button>';
}

function openVoFromButtonClick(event) {
  const button = event.target.closest && event.target.closest('.vo-btn');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  showVo(button.getAttribute('data-vo'), button.getAttribute('data-vo-id'), button.getAttribute('data-vo-fr') || '');
}

document.addEventListener('click', openVoFromButtonClick, true);
const voStyle = document.createElement('style');
voStyle.textContent = VO_CSS;
document.head.appendChild(voStyle);
window.VO = { btn: voButtonHtml, show: showVo, load: loadVoData };
})();
