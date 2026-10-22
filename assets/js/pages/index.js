const MESSAGE_DURATION_MS = 5000;
const PRINTABLE_PAGES = { fiche: 'fiche.html', grimoire: 'grimoire.html', objets: 'objets.html', equipement: 'equipement.html', familiers: 'familiers.html', histoire: 'histoire.html' };
const PRINT_FRAME_SETTLE_MS = 800;
const SHADOW_BASE_CSS = ':host{display:block}.__b{background:#fff!important;min-height:0!important;padding:0!important;display:block}.__in{display:inline-grid;align-content:center;box-sizing:border-box;min-height:calc(1.3em + 5px);white-space:pre;overflow:hidden;vertical-align:bottom}';

const notify = text => showMessage(text, MESSAGE_DURATION_MS);
const activeCharacterSummary = () => Persos.list().find(character => character.actif);

function characterChip(character) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'pc';
  chip.textContent = character.nom;
  chip.title = character.nom;
  chip.setAttribute('aria-pressed', character.actif);
  chip.onclick = () => {
    Persos.activate(character.id);
    renderCharacterChips();
  };
  return chip;
}

function renderCharacterChips() {
  $('#chips').innerHTML = '';
  Persos.list().forEach(character => $('#chips').appendChild(characterChip(character)));
  const active = activeCharacterSummary();
  const isGameMaster = !!active && active.nom.trim().toLowerCase() === 'mj';
  document.querySelectorAll('.mjonly').forEach(card => { card.hidden = !isGameMaster; });
}

function createCharacter() {
  const character = Persos.create();
  if (!character) return;
  renderCharacterChips();
  notify('Personnage « ' + character.nom + ' » créé');
}

function deleteActiveCharacter() {
  const active = activeCharacterSummary();
  if (!active) return;
  const deleted = Persos.remove(active.id);
  if (!deleted) return;
  renderCharacterChips();
  notify('« ' + deleted.nom + ' » supprimé');
}

function exportActiveCharacter() {
  const exported = Persos.exportActive();
  downloadJsonFile('personnage_' + fileSafeName(exported.nom || 'personnage') + '.json', exported);
  notify('Personnage complet exporté (fiche, grimoire, objets, équipement, familiers, histoire…)');
}

function importCharacterFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const character = Persos.importPerso(JSON.parse(reader.result));
      renderCharacterChips();
      notify('« ' + character.nom + ' » importé');
    } catch (error) {
      notify('Fichier invalide : choisis un .json exporté depuis cette page');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function toBase64Url(bytes) {
  let binary = '';
  for (let start = 0; start < bytes.length; start += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(start, start + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function transformBytes(bytes, StreamClass) {
  const stream = new Blob([bytes]).stream().pipeThrough(new StreamClass('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function shareLink(character) {
  let bytes = new TextEncoder().encode(JSON.stringify(character));
  let encoding = 'j';
  if (window.CompressionStream) {
    try {
      bytes = await transformBytes(bytes, CompressionStream);
      encoding = 'z';
    } catch (error) {}
  }
  return location.href.split('#')[0] + '#perso=' + encoding + '.' + toBase64Url(bytes);
}

async function readSharedCharacter(hash) {
  const match = /^#perso=([zj])\.([\w-]+)$/.exec(hash);
  if (!match) return null;
  const [, encoding, payload] = match;
  let bytes = fromBase64Url(payload);
  if (encoding === 'z') {
    if (!window.DecompressionStream) throw new Error('zip');
    bytes = await transformBytes(bytes, DecompressionStream);
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function qrCodeSvg(text) {
  let qr;
  try {
    qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
  } catch (error) {
    return '';
  }
  const size = qr.getModuleCount();
  const margin = 4;
  let path = '';
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (qr.isDark(row, column)) path += 'M' + (column + margin) + ' ' + (row + margin) + 'h1v1h-1z';
    }
  }
  const box = size + 2 * margin;
  return `<svg viewBox="0 0 ${box} ${box}" shape-rendering="crispEdges" role="img" aria-label="QR code du lien"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

function htmlEntities(text) {
  return text.replace(/[&<>"]/g, character => '&#' + character.charCodeAt(0) + ';');
}

function shareDialogHtml(characterName, qrSvg) {
  const qrBlock = qrSvg ? `<div class="qr">${qrSvg}</div>` : '<p class="warn">Ce personnage est trop détaillé pour tenir dans un QR code : envoie plutôt le lien (message, mail…).</p>';
  const nativeShareButton = navigator.share ? '<button type="button" data-a="share">Envoyer…</button>' : '';
  return `<div><h3>Partager « ${htmlEntities(characterName)} »</h3>
   <p>Ouvre ce lien sur l’autre appareil (ou scanne le QR code avec son appareil photo) : le personnage complet y sera ajouté. Le lien contient une copie du personnage à cet instant, rien n’est envoyé sur internet.</p>
   ${qrBlock}
   <input type="text" readonly aria-label="Lien de partage">
   <div class="acts">${nativeShareButton}<button type="button" data-a="copy" class="primary">Copier le lien</button><button type="button" data-a="close">Fermer</button></div>
   <span class="smsg" role="status"></span></div>`;
}

async function copyLink(url, linkInput, showStatus) {
  try {
    await navigator.clipboard.writeText(url);
    showStatus('Lien copié');
  } catch (error) {
    linkInput.select();
    showStatus(document.execCommand('copy') ? 'Lien copié' : 'Sélectionne le lien et copie-le');
  }
}

async function openShareDialog() {
  const character = Persos.shareData();
  const url = await shareLink(character);
  const dialog = document.createElement('dialog');
  dialog.className = 'share';
  dialog.innerHTML = shareDialogHtml(character.nom, qrCodeSvg(url));
  const linkInput = dialog.querySelector('input');
  linkInput.value = url;
  const showStatus = text => { dialog.querySelector('.smsg').textContent = text; };
  dialog.onclick = async event => {
    const action = event.target.dataset && event.target.dataset.a;
    if (event.target === dialog || action === 'close') {
      dialog.close();
      return;
    }
    if (action === 'copy') await copyLink(url, linkInput, showStatus);
    if (action === 'share') {
      try { await navigator.share({ title: 'Personnage « ' + character.nom + ' »', url }); } catch (error) {}
    }
  };
  dialog.onclose = () => dialog.remove();
  document.body.appendChild(dialog);
  dialog.showModal();
  linkInput.scrollLeft = 0;
}

async function importCharacterFromSharedLink() {
  if (!/^#perso=/.test(location.hash)) return;
  const hash = location.hash;
  history.replaceState(null, '', location.href.split('#')[0]);
  try {
    const character = await readSharedCharacter(hash);
    if (!character) throw new Error('format');
    if (!confirm('Ajouter le personnage partagé « ' + (character.nom || 'Personnage') + ' » à tes personnages ? Il devient le personnage actif ; tes autres personnages ne sont pas modifiés.')) return;
    const imported = Persos.importPerso(character);
    renderCharacterChips();
    notify('« ' + imported.nom + ' » ajouté depuis le lien de partage');
  } catch (error) {
    notify(error.message === 'zip' ? 'Ce navigateur est trop ancien pour lire ce lien : utilise l’export .json' : 'Lien de partage invalide ou incomplet (copie-le en entier)');
  }
}

function scopeCssToShadowRoot(css) {
  return css.replace(/@page\s*[^{]*\{[^}]*\}/g, '').replace(/:root/g, ':host')
    .replace(/(^|[\s,{};])(body|html)(?=[\s\[.:,{>+~])/g, '$1.__b')
    .replace(/(^|[\s,{};>+~(])(input|select)(?=[\s\[.:,{>+~)])/g, (match, before, tag) => before + ':is(' + tag + ',.__' + tag + ')');
}

function selectedOptionText(select) {
  const option = [...select.options].find(candidate => candidate.hasAttribute('selected')) || select.options[0];
  return option ? option.textContent : '';
}

function replaceFieldsWithText(root) {
  root.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select').forEach(field => {
    const text = document.createElement('span');
    for (const attribute of field.attributes) if (attribute.name !== 'value') text.setAttribute(attribute.name, attribute.value);
    text.classList.add('__in', '__' + field.tagName.toLowerCase());
    text.textContent = field.tagName === 'SELECT' ? selectedOptionText(field) : field.getAttribute('value') || '';
    field.replaceWith(text);
  });
}

function copyFieldValue(source, copy) {
  if (source.tagName === 'TEXTAREA') {
    copy.textContent = source.value;
    return;
  }
  if (source.tagName === 'SELECT') {
    [...copy.options].forEach((option, index) => {
      if (index === source.selectedIndex) option.setAttribute('selected', '');
      else option.removeAttribute('selected');
    });
    return;
  }
  if (source.type === 'checkbox' || source.type === 'radio') {
    if (source.checked) copy.setAttribute('checked', '');
    else copy.removeAttribute('checked');
    return;
  }
  copy.setAttribute('value', source.value);
}

function copyFieldValues(source, copy) {
  const copiedFields = copy.querySelectorAll('input,textarea,select');
  source.querySelectorAll('input,textarea,select').forEach((field, index) => {
    if (copiedFields[index]) copyFieldValue(field, copiedFields[index]);
  });
}

function loadPageInPrintFrame(part) {
  const frame = $('#pf');
  return new Promise(resolve => {
    frame.onload = () => setTimeout(resolve, PRINT_FRAME_SETTLE_MS);
    frame.src = PRINTABLE_PAGES[part];
  }).then(() => frame);
}

async function pageCss(frameDocument, siteCss) {
  const pageStyleLinks = [...frameDocument.querySelectorAll('link[rel=stylesheet][href*="assets/css/pages/"]')];
  const pageStyles = await Promise.all(pageStyleLinks.map(async link => (await fetch(link.href)).text()));
  const scriptStyles = [...frameDocument.querySelectorAll('style')].map(style => style.textContent);
  return siteCss + pageStyles.join('\n') + scriptStyles.join('\n');
}

async function printableSnapshot(part, siteCss) {
  const frame = await loadPageInPrintFrame(part);
  const frameDocument = frame.contentDocument, frameWindow = frame.contentWindow;
  frameWindow.dispatchEvent(new Event('beforeprint'));
  const css = await pageCss(frameDocument, siteCss);
  const roots = part === 'fiche' ? [...frameDocument.querySelectorAll('main.page')] : [frameDocument.querySelector('#book')];
  const wrapper = document.createElement('div');
  roots.forEach(root => {
    const copy = root.cloneNode(true);
    copyFieldValues(root, copy);
    wrapper.appendChild(copy);
  });
  frameWindow.dispatchEvent(new Event('afterprint'));
  const title = wrapper.querySelector('#titre');
  if (title && !title.getAttribute('value')) title.setAttribute('value', (activeCharacterSummary() || {}).nom || '');
  replaceFieldsWithText(wrapper);
  return { css: scopeCssToShadowRoot(css), html: wrapper.innerHTML };
}

function printSection(part, snapshot) {
  const section = document.createElement('section');
  section.className = 'pr-sec pr-' + (part === 'fiche' ? 'fiche' : 'liste');
  const shadow = section.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<style>' + SHADOW_BASE_CSS + '</style><style>' + snapshot.css + '</style><div class="__b" data-mode="book">' + snapshot.html + '</div>';
  return section;
}

async function printWholeCharacter() {
  const parts = Persos.printable();
  if (!parts.length) {
    notify('Rien à imprimer : remplis d’abord la fiche ou ajoute des éléments');
    return;
  }
  notify('Préparation de l’impression…');
  try {
    const siteCss = await (await fetch('assets/css/style.css')).text();
    const printRoot = $('#printroot');
    printRoot.innerHTML = '';
    for (const part of parts) printRoot.appendChild(printSection(part, await printableSnapshot(part, siteCss)));
    await new Promise(resolve => setTimeout(resolve, 300));
    window.print();
    notify('');
  } catch (error) {
    console.log(error.stack);
    notify('Impression impossible : ' + error.message);
  }
}

renderCharacterChips();
$('#bNew').onclick = createCharacter;
$('#bDel').onclick = deleteActiveCharacter;
$('#bExp').onclick = exportActiveCharacter;
$('#bImp').onclick = () => $('#file').click();
$('#file').onchange = importCharacterFile;
$('#bShare').onclick = openShareDialog;
$('#bPrintAll').onclick = printWholeCharacter;
importCharacterFromSharedLink();
window.addEventListener('hashchange', importCharacterFromSharedLink);
