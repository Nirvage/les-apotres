const $=s=>document.querySelector(s);
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',5000)};
function chips(){
  $('#chips').innerHTML='';
  Persos.list().forEach(p=>{
    const b=document.createElement('button');b.type='button';b.className='pc';b.textContent=p.nom;b.title=p.nom;
    b.setAttribute('aria-pressed',p.actif);b.onclick=()=>{Persos.activate(p.id);chips()};
    $('#chips').appendChild(b);
  });
  // Espace du MJ visible uniquement avec le personnage « mj »
  const a=Persos.list().find(p=>p.actif),mj=!!a&&a.nom.trim().toLowerCase()==='mj';
  document.querySelectorAll('.mjonly').forEach(c=>c.hidden=!mj);
}
chips();
$('#bNew').onclick=()=>{const p=Persos.create();if(p){chips();msg('Personnage « '+p.nom+' » créé')}};
$('#bDel').onclick=()=>{const a=Persos.list().find(p=>p.actif);if(!a)return;const p=Persos.remove(a.id);if(p){chips();msg('« '+p.nom+' » supprimé')}};
$('#bExp').onclick=()=>{
  const o=Persos.exportActive(),nom=(o.nom||'personnage').trim().replace(/[^\p{L}\p{N}_-]+/gu,'_');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(o,null,2)],{type:'application/json'}));
  a.download='personnage_'+nom+'.json';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  msg('Personnage complet exporté (fiche, grimoire, objets, équipement, familiers, histoire…)');
};
$('#bImp').onclick=()=>$('#file').click();
$('#file').onchange=ev=>{
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{const p=Persos.importPerso(JSON.parse(r.result));chips();msg('« '+p.nom+' » importé')}
    catch(e){msg('Fichier invalide : choisis un .json exporté depuis cette page')}};
  r.readAsText(f);ev.target.value='';
};
/* ---------- Partage par lien ou QR code : le personnage est entièrement contenu dans le lien
   (après le #, jamais envoyé au serveur), compressé quand le navigateur sait le faire ---------- */
const b64u=u8=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const unb64u=t=>{const s=atob(t.replace(/-/g,'+').replace(/_/g,'/'));const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u};
const pipe=async(u8,S)=>new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new S('deflate-raw'))).arrayBuffer());
async function shareLink(o){
  let u8=new TextEncoder().encode(JSON.stringify(o)),z='j';
  if(window.CompressionStream){try{u8=await pipe(u8,CompressionStream);z='z'}catch(e){}}
  return location.href.split('#')[0]+'#perso='+z+'.'+b64u(u8);
}
async function readShare(h){
  const m=/^#perso=([zj])\.([\w-]+)$/.exec(h);if(!m)return null;
  let u8=unb64u(m[2]);
  if(m[1]==='z'){if(!window.DecompressionStream)throw new Error('zip');u8=await pipe(u8,DecompressionStream)}
  return JSON.parse(new TextDecoder().decode(u8));
}
function qrSvg(t){
  let q;
  try{q=qrcode(0,'L');q.addData(t);q.make()}catch(e){return ''}
  const n=q.getModuleCount(),m=4;let d='';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+='M'+(c+m)+' '+(r+m)+'h1v1h-1z';
  return `<svg viewBox="0 0 ${n+2*m} ${n+2*m}" shape-rendering="crispEdges" role="img" aria-label="QR code du lien"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
$('#bShare').onclick=async()=>{
  const o=Persos.shareData(),url=await shareLink(o),qr=qrSvg(url);
  const dlg=document.createElement('dialog');dlg.className='share';
  dlg.innerHTML=`<div><h3>Partager « ${o.nom.replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';')} »</h3>
   <p>Ouvre ce lien sur l’autre appareil (ou scanne le QR code avec son appareil photo) : le personnage complet y sera ajouté. Le lien contient une copie du personnage à cet instant, rien n’est envoyé sur internet.</p>
   ${qr?`<div class="qr">${qr}</div>`:`<p class="warn">Ce personnage est trop détaillé pour tenir dans un QR code : envoie plutôt le lien (message, mail…).</p>`}
   <input type="text" readonly aria-label="Lien de partage">
   <div class="acts">${navigator.share?'<button type="button" data-a="share">Envoyer…</button>':''}<button type="button" data-a="copy" class="primary">Copier le lien</button><button type="button" data-a="close">Fermer</button></div>
   <span class="smsg" role="status"></span></div>`;
  const inp=dlg.querySelector('input');inp.value=url;
  const say=t=>dlg.querySelector('.smsg').textContent=t;
  dlg.onclick=async ev=>{
    const a=ev.target.dataset&&ev.target.dataset.a;
    if(ev.target===dlg||a==='close'){dlg.close();return}
    if(a==='copy'){
      try{await navigator.clipboard.writeText(url);say('Lien copié')}
      catch(e){inp.select();say(document.execCommand('copy')?'Lien copié':'Sélectionne le lien et copie-le')}
    }
    if(a==='share'){try{await navigator.share({title:'Personnage « '+o.nom+' »',url})}catch(e){}}
  };
  dlg.onclose=()=>dlg.remove();
  document.body.appendChild(dlg);dlg.showModal();inp.scrollLeft=0;
};
// Arrivée par un lien de partage : on propose d'ajouter le personnage, puis on retire le lien de l'adresse
async function fromLink(){
  if(!/^#perso=/.test(location.hash))return;
  const h=location.hash;
  history.replaceState(null,'',location.href.split('#')[0]);
  try{
    const o=await readShare(h);if(!o)throw new Error('format');
    if(!confirm('Ajouter le personnage partagé « '+(o.nom||'Personnage')+' » à tes personnages ? Il devient le personnage actif ; tes autres personnages ne sont pas modifiés.'))return;
    const p=Persos.importPerso(o);chips();msg('« '+p.nom+' » ajouté depuis le lien de partage');
  }catch(e){msg(e.message==='zip'?'Ce navigateur est trop ancien pour lire ce lien : utilise l’export .json':'Lien de partage invalide ou incomplet (copie-le en entier)')}
}
fromLink();
window.addEventListener('hashchange',fromLink);
// Impression : chaque partie remplie est chargée dans un cadre caché, son rendu est copié (avec ses styles,
// isolés dans un shadow DOM) dans un seul document, puis le tout est imprimé en une fois
const PAGES={fiche:'fiche.html',grimoire:'grimoire.html',objets:'objets.html',equipement:'equipement.html',familiers:'familiers.html',histoire:'histoire.html'};
function inlineCss(t){
  return t.replace(/@page\s*[^{]*\{[^}]*\}/g,'').replace(/:root/g,':host')
    .replace(/(^|[\s,{};])(body|html)(?=[\s\[.:,{>+~])/g,'$1.__b')
    .replace(/(^|[\s,{};>+~(])(input|select)(?=[\s\[.:,{>+~)])/g,(m,a,t)=>a+':is('+t+',.__'+t+')');
}
// Champs remplacés par du texte simple : certains navigateurs (Firefox) n'impriment pas
// la valeur des champs placés dans un shadow DOM
function staticize(root){
  root.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select').forEach(e=>{
    const s=document.createElement('span');
    for(const a of e.attributes)if(a.name!=='value')s.setAttribute(a.name,a.value);
    s.classList.add('__in','__'+e.tagName.toLowerCase());
    if(e.tagName==='SELECT'){const o=[...e.options].find(o=>o.hasAttribute('selected'))||e.options[0];s.textContent=o?o.textContent:''}
    else s.textContent=e.getAttribute('value')||'';
    e.replaceWith(s);
  });
}
function syncValues(src,dst){
  const a=src.querySelectorAll('input,textarea,select'),b=dst.querySelectorAll('input,textarea,select');
  a.forEach((e,i)=>{
    const c=b[i];if(!c)return;
    if(e.tagName==='TEXTAREA')c.textContent=e.value;
    else if(e.tagName==='SELECT')[...c.options].forEach((o,j)=>{if(j===e.selectedIndex)o.setAttribute('selected','');else o.removeAttribute('selected')});
    else if(e.type==='checkbox'||e.type==='radio'){e.checked?c.setAttribute('checked',''):c.removeAttribute('checked')}
    else c.setAttribute('value',e.value);
  });
}
async function snapshot(k,css0){
  const fr=$('#pf');
  await new Promise(res=>{fr.onload=()=>setTimeout(res,800);fr.src=PAGES[k]});
  const d=fr.contentDocument,w=fr.contentWindow;
  w.dispatchEvent(new Event('beforeprint'));   // la page prépare son impression (taille du texte des zones trop remplies)
  // styles de la page (assets/css/pages/…) puis ceux ajoutés par ses scripts
  const own=await Promise.all([...d.querySelectorAll('link[rel=stylesheet][href*="assets/css/pages/"]')].map(async l=>(await fetch(l.href)).text()));
  const css=css0+own.join('\n')+[...d.querySelectorAll('style')].map(s=>s.textContent).join('\n');
  const roots=k==='fiche'?[...d.querySelectorAll('main.page')]:[d.querySelector('#book')];
  const wrap=document.createElement('div');
  roots.forEach(r=>{const c=r.cloneNode(true);syncValues(r,c);wrap.appendChild(c)});
  w.dispatchEvent(new Event('afterprint'));
  const t=wrap.querySelector('#titre');
  if(t&&!t.getAttribute('value'))t.setAttribute('value',(Persos.list().find(p=>p.actif)||{}).nom||'');
  staticize(wrap);
  return {k,css:inlineCss(css),html:wrap.innerHTML};
}
$('#bPrintAll').onclick=async()=>{
  const parts=Persos.printable();
  if(!parts.length){msg('Rien à imprimer : remplis d’abord la fiche ou ajoute des éléments');return}
  msg('Préparation de l’impression…');
  try{
    const css0=await (await fetch('assets/css/style.css')).text();
    const root=$('#printroot');root.innerHTML='';
    for(const k of parts){
      const s=await snapshot(k,css0);
      const host=document.createElement('section');host.className='pr-sec pr-'+(k==='fiche'?'fiche':'liste');
      const sh=host.attachShadow({mode:'open'});
      sh.innerHTML='<style>:host{display:block}.__b{background:#fff!important;min-height:0!important;padding:0!important;display:block}.__in{display:inline-grid;align-content:center;box-sizing:border-box;min-height:calc(1.3em + 5px);white-space:pre;overflow:hidden;vertical-align:bottom}</style><style>'+s.css+'</style><div class="__b" data-mode="book">'+s.html+'</div>';
      root.appendChild(host);
    }
    await new Promise(r=>setTimeout(r,300));
    window.print();
    msg('');
  }catch(e){{console.log(e.stack);msg('Impression impossible : '+e.message)}}
};
