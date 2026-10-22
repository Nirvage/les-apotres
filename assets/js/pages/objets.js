const RC={'Courant':'#6b7280','Peu courant':'#2e9e5b','Rare':'#2f6fd0','Très rare':'#7a4fc4','Légendaire':'#d8791a','Artefact':'#c8402f'};
const RA={'Courant':'C','Peu courant':'PC','Rare':'R','Très rare':'TR','Légendaire':'L','Artefact':'A'};
const TC={'Armure':'#2f6fd0','Arme':'#c8402f','Anneau':'#b8860b','Baguette':'#7a4fc4','Bâton':'#8e3a9d','Sceptre':'#d6458e','Potion':'#2e9e5b','Parchemin':'#12968f','Munition':'#d8791a','Objet merveilleux':'#2a3170'};
const TORDER=['Armure','Arme','Munition','Anneau','Baguette','Bâton','Sceptre','Potion','Parchemin','Objet merveilleux'];
const RORDER=['Courant','Peu courant','Rare','Très rare','Légendaire','Artefact'];
// Prix d'achat indicatif (Guide du Maître 2024) : selon la rareté, moitié prix pour les consommables (potions, parchemins, munitions)
const PRIX={'Courant':100,'Peu courant':400,'Rare':4000,'Très rare':40000,'Légendaire':200000};
const fpo=n=>n.toLocaleString('fr-FR')+' po';
// Raretés possibles d'un objet : mots exacts (« rare » n'attrape pas « très rare »), fourchettes « X à Y » complétées,
// et pour une rareté « variable » sans précision, celles citées dans la description
function raretes(s){
  const rar=m=>{const h=[];
    if(/(^|[^a-z])courante?s?(?![a-z])/.test(m.replace(/peu courante?s?/g,'#')))h.push('Courant');
    if(/peu courante?s?/.test(m))h.push('Peu courant');
    if(/(^|[^a-z])rares?(?![a-z])/.test(m.replace(/tres rares?/g,'#')))h.push('Rare');
    if(/tres rares?/.test(m))h.push('Très rare');
    if(m.includes('legendaire'))h.push('Légendaire');
    if(m.includes('artefact'))h.push('Artefact');
    return h};
  const q=norm(s.q);let hits=rar(q);
  if(hits.length===2&&/ a /.test(q))hits=RORDER.slice(RORDER.indexOf(hits[0]),RORDER.indexOf(hits[1])+1);
  if(!hits.length)hits=rar(norm(String(s.h||'').replace(/<[^>]+>/g,'')));
  return hits;
}
function prix(s){
  const hits=raretes(s);
  if(!hits.length)return '';
  const cons=/^(Potion|Parchemin|Munition)$/.test(s.t)||/consomm/i.test(s.h||'');
  const v=hits.map(r=>PRIX[r]).filter(Boolean).map(x=>cons?x/2:x);
  if(!v.length)return 'Inestimable (artefact)';
  const lo=Math.min(...v),hi=Math.max(...v);
  return (lo===hi?fpo(lo):fpo(lo)+' à '+fpo(hi))+(cons?' (consommable)':'')+(hits.includes('Artefact')?' ; artefact inestimable':'');
}
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’‘`´]/g,"'").trim();
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',4500)};
// Rareté « principale » d'un objet (la première citée quand elle varie)
const rare=s=>RORDER.find(r=>norm(s.q).includes(norm(r)))||'';
const rcol=s=>RC[rare(s)]||'#2a3170';
const rabbr=s=>{const m=norm(s.q);const hits=RORDER.filter(r=>m.includes(norm(r)));return hits.length>1?'Var.':(RA[hits[0]]||'Var.')};

// Les objets sont lus dans objets.json à l'ouverture de la page
let DB=[];
const BYN=new Map();
const MAXH=3;   // règles 2024 : 3 objets harmonisés au maximum
const st={sel:new Set(),har:new Set(),q:'',fam:'',cla:'',role:'',cls:'',sch:'',lvl:'',only:'',tab:0,open:new Set(),src:''};

let BASE=[];
function setup(data){
  BASE=data;
  index();
  const opts=(first,arr)=>`<option value="">${first}</option>`+arr.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  $('#fc').innerHTML=opts('Tous',TORDER.filter(t=>DB.some(s=>s.t===t)));
  $('#fs').innerHTML=opts('Toutes',RORDER);
  $('#fk').innerHTML=opts('Toutes',CLASSES);
  $('#fr').innerHTML=opts('Tous',ROLES);
}
const fam=n=>String(n).split(/[ '’-]/)[0];
// Objets conseillés par classe, d'après la description :
//  · harmonisation réservée (« par un magicien », « par un lanceur de sorts »…) → ces classes seulement
//  · bonus aux sorts, objet qui lance des sorts (baguette, bâton, sceptre à charges), parchemin → lanceurs de sorts
//  · armure / bouclier → classes qui maîtrisent cette catégorie ; arme → classes martiales
//  · caractéristique augmentée ou fixée → classes dont c'est la caractéristique principale ; discrétion, serrures → roublard (rôdeur, moine)
const CLASSES=['Artificier','Barbare','Barde','Chasseur de sang','Clerc','Druide','Ensorceleur','Guerrier','Magicien','Moine','Occultiste','Paladin','Rôdeur','Roublard'];
const CASTERS=['Artificier','Barde','Clerc','Druide','Ensorceleur','Magicien','Occultiste','Paladin','Rôdeur'];
const ARMCL={'légère':['Artificier','Barbare','Barde','Chasseur de sang','Clerc','Druide','Guerrier','Occultiste','Paladin','Rôdeur','Roublard'],'intermédiaire':['Artificier','Barbare','Chasseur de sang','Clerc','Guerrier','Paladin','Rôdeur'],'lourde':['Guerrier','Paladin'],'Bouclier':['Artificier','Barbare','Clerc','Druide','Guerrier','Paladin','Rôdeur']};
const MARTIAL=['Barbare','Chasseur de sang','Guerrier','Moine','Paladin','Rôdeur','Roublard'];
const STATCL={'Force':['Barbare','Guerrier','Paladin'],'Dextérité':['Moine','Rôdeur','Roublard','Guerrier'],'Constitution':['Barbare','Guerrier','Paladin','Chasseur de sang'],'Intelligence':['Artificier','Magicien'],'Sagesse':['Clerc','Druide','Moine','Rôdeur'],'Charisme':['Barde','Ensorceleur','Occultiste','Paladin']};
function recFor(s){
  const t=String(s.h||'').replace(/<[^>]+>/g,''),a=norm(s.a||''),r=new Set(),add=L=>L.forEach(c=>r.add(c));
  if(/\bpar (un|une)\b/.test(a)){
    if(a.includes('lanceur de sorts'))add(CASTERS);
    CLASSES.forEach(c=>{if(a.includes(norm(c)))r.add(c)});
    if(r.size)return r;
  }
  if(/jets? d.attaque de sort|DD de sauvegarde de vos sorts/i.test(t)||s.t==='Parchemin'||(/^(Baguette|Bâton|Sceptre)$/.test(s.t)&&/lancer|lancez/i.test(t)))add(CASTERS);
  if(s.t==='Armure'){
    if(s.cat==='Bouclier')add(ARMCL.Bouclier);
    else Object.keys(ARMCL).forEach(k=>{if(k!=='Bouclier'&&(!s.cat||s.cat.includes(k)))add(ARMCL[k])});
  }
  if(s.t==='Arme'||s.t==='Munition')add(MARTIAL);
  if(/Discrétion/.test(t))add(['Roublard','Rôdeur','Moine']);
  if(/Escamotage|outils de voleur|serrure/i.test(t))r.add('Roublard');
  for(const k in STATCL)if(new RegExp('(votre|valeur de) '+k+' (passe|augmente|devient|change)','i').test(t))add(STATCL[k]);
  return r;
}
// Rôle d'un objet (plusieurs possibles), d'après son type et sa description
const ROLES=['Offensif','Défensif','Soin','Contrôle','Mobilité','Magie','Amélioration','Détection','Discrétion','Consommable','Utilitaire'];
const ROLE_RE={
  'Offensif':/\d+d\d+(?: \+ \d+)? (?:points de )?dégâts|dégâts \S+ supplémentaires|aux jets d'attaque et de dégâts|subit \d+d\d+/i,
  'Défensif':/à la CA|Classe d'Armure|\brésistance aux\b|\bimmunisé|aux jets de sauvegarde|points de vie temporaires|avantage aux jets de sauvegarde/i,
  'Soin':/regagne[rz]? (?:\d+d\d+ |des |autant de |tous ses |tous vos )?points de vie|récupère[rz]? (?:\d+d\d+ )?points de vie|guérison|soins/i,
  'Amélioration':/(?:votre|valeur de) (?:Force|Dextérité|Constitution|Intelligence|Sagesse|Charisme) (?:passe|augmente|devient)|bonus de maîtrise augmente|avantage aux tests de|bonus de \+\d aux tests/i,
  'Contrôle':/\b(?:est|soit|devient|reste|a l'état) (?:Charmée?|Effrayée?|Paralysée?|Entravée?|Étourdie?|Aveuglée?|Neutralisée?|Pétrifiée?|Inconsciente?|Assourdie?)|(?:l'état|états?) (?:Charmé|Effrayé|Paralysé|Entravé|Étourdi|Aveuglé|À terre|Neutralisé|Pétrifié|Assourdi|Agrippé|Inconscient)|\bdevient (?:Charmé|Effrayé|Paralysé|Entravé|Étourdi|Aveuglé|Neutralisé|Pétrifié)/i,
  'Mobilité':/Vitesse de (?:vol|nage|escalade|fouissement)|Vitesse (?:augmente|est doublée)|téléport|lévit|vous pouvez voler|marcher sur|portail|respirer (?:normalement )?sous l'eau|Saut/i,
  'Magie':/jets? d'attaque de sort|DD de sauvegarde de vos sorts|lancer (?:le sort |l'un des sorts |un sort |)<i>|lancez? <i>|emplacement de sort|focaliseur/i,
  'Détection':/détect|vision dans le noir|voir (?:les créatures )?invisibles?|Vision véritable|Perception|repérer|localis|lire|comprendre (?:toutes les|n'importe quelle) langue/i,
  'Discrétion':/Invisible|invisibilité|Discrétion|déguis|change[rz]? (?:votre|d')apparence|indétectable/i,
};
function rolesOf(s){
  const t=String(s.h||'').replace(/<(?!\/?i>)[^>]+>/g,' '),r=new Set();
  if(s.t==='Arme'||s.t==='Munition')r.add('Offensif');
  if(s.t==='Armure')r.add('Défensif');
  if(s.t==='Parchemin')r.add('Magie');
  for(const k in ROLE_RE)if(ROLE_RE[k].test(t))r.add(k);
  if(/^(Potion|Parchemin|Munition)$/.test(s.t)||/^(Huile|Élixir|Philtre|Onguent|Poussière|Pastille|Graine|Baume|Encens|Pigments)/.test(s.n)||/usage unique|un seul usage|(?:l'objet|il|elle) (?:est consommée?|disparaît) (?:une fois|après)/i.test(t))r.add('Consommable');
  if(!r.size||/contenir|ranger|range[rz]? |transport|lumière (?:vive|faible) dans un rayon|outils?\b|réparer|nettoy|cuisin|nourriture/i.test(t))r.add('Utilitaire');
  return r;
}
// Objets du livre + créations personnelles (Persos.custom())
function index(){
  DB=BASE.concat(Persos.custom().objets.filter(s=>s&&s.n&&TORDER.includes(s.t)));
  BYN.clear();
  DB.forEach((s,i)=>{
    s.i=i;s.idx=norm(s.n+' '+s.en);
    [s.n,s.en].forEach(x=>{if(x&&!BYN.has(norm(x)))BYN.set(norm(x),s)});
    s.fam=fam(s.n);s.rec=recFor(s);s.roles=rolesOf(s);
  });
  // Familles : premier mot du nom, quand plus de 3 objets commencent par lui (Anneau, Cape, Bottes…)
  const cnt={};DB.forEach(s=>cnt[s.fam]=(cnt[s.fam]||0)+1);
  const F=Object.keys(cnt).filter(k=>cnt[k]>3).sort((a,b)=>a.localeCompare(b,'fr'));
  $('#ff').innerHTML='<option value="">Toutes</option>'+F.map(k=>`<option value="${esc(k)}">${esc(k)} (${cnt[k]})</option>`).join('');
  $('#ff').value=F.includes(st.fam)?st.fam:'';
}
let WEAP=null;   // armes de equipement.json (arme de base d'une arme magique créée)
async function editCustom(it){
  if(!WEAP)try{WEAP=(await (await fetch('assets/json/vf/equipement.json')).json()).concat(Persos.custom().equipement).filter(x=>x.t==='Arme'||x.t==='Munition').map(x=>x.n)}catch(e){WEAP=[]}
  Custom.edit({kind:'objets',item:it,types:TORDER,rares:RORDER,weapons:WEAP,
    taken:n=>BYN.has(norm(n)),
    done:(x,old)=>{
      if(old&&(!x||x.n!==old.n)){
        const h=st.har.has(old.n),on=st.sel.has(old.n);
        st.sel.delete(old.n);st.har.delete(old.n);st.open.delete(old.n);
        if(x&&on){st.sel.add(x.n);if(h&&x.a)st.har.add(x.n)}
      }
      if(x&&!x.a)st.har.delete(x.n);
      if(x&&!old){st.sel.add(x.n);st.open.add(x.n)}
      index();renderAll();
      msg(x?(old?'Objet modifié':'« '+x.n+' » créé et ajouté à tes objets'):'Objet supprimé');
    }});
}
// Catégorie d'armure (légère, intermédiaire, lourde, bouclier), précisée dans objets.json (cat)
const acat=s=>s.cat?s.cat.split(' (')[0].replace(/^Armure /,'').replace(/^./,c=>c.toUpperCase()):'';
const pills=s=>(s.cat?'<span class="pill ar">'+esc(acat(s))+'</span>':'')+(s.c_?'<span class="pill cu">Création</span>':'')+(s.a?(st.har.has(s.n)?'<span class="pill hz">Harmonisé</span>':'<span class="pill co">Harmonisation</span>'):'')+(s.ed==='2014'?'<span class="pill ri">2014</span>':'');
// Effets sur la fiche d'un objet créé (voir custom.js)
const FXN={ca:'CA',sv:'jets de sauvegarde',tests:'tests de caractéristique',init:'initiative',satk:'attaque de sort',sdd:'DD des sorts',arme:'attaque et dégâts'};
const sgn=n=>(n<0?'':'+')+n;
const fxText=s=>(s.fx||[]).map(f=>f.t==='set'?Custom.ABN[f.v]+' '+f.n:f.t==='carac'?Custom.ABN[f.v]+' '+sgn(f.n):f.t==='vit'?'vitesse '+sgn(f.n)+' m':FXN[f.t]?FXN[f.t]+' '+sgn(f.n):'').filter(Boolean).join(', ');
const editBtn=s=>s.c_?`<button class="b noprint" style="--c:#d8791a" data-act="edit" data-i="${s.i}">Modifier</button>`:'';
const srcNote=s=>`<div class="srcn">Source : ${esc(s.src||'')}${s.ed==='2014'?' · objet en version 2014 (règles non mises à jour)':''}${s.r_?' · description reconstituée à partir d’un résumé : à vérifier dans le livre':''}${s.v_?' · nom français non officiel':''}</div>`;
// Descriptions d'objets plus lisibles : une ligne par paragraphe en gras, par sort à charges, par résultat de table de dés et par niveau
function lines(h){
  const IT=/<i>[^<]+<\/i> \(\d[^)]*\)/g;
  h=h.replace(/([.)])\s+(?=<b>)/g,'$1<br>');
  if((h.match(IT)||[]).length>1)h=h.replace(/\s*:\s*(?=<i>[^<]+<\/i> \(\d)/g,' :<br>• ').replace(/\),?\s*(?:ou\s+)?(?=<i>[^<]+<\/i> \(\d)/g,')<br>• ');
  if(/\b0[01][-–]\d\d /.test(h))h=h.replace(/\s*:\s*(?=0[01][-–]\d\d )/g,' :<br>').replace(/\s*[,;]\s+(?=\d\d(?:[-–]\d\d)?(?: :| [a-zA-ZÀ-ÿ]{2}))/g,'<br>');
  return h.replace(/\s*:\s*(?=niv\. \d+ )/g,' :<br>').replace(/\s*;\s*(?=niv\. \d+ )/g,'<br>');
}
// Bouton d'harmonisation : seulement pour un objet de la sélection qui la demande
const harBtn=s=>s.a&&st.sel.has(s.n)?`<button class="b har noprint${st.har.has(s.n)?' on':''}" data-act="har" data-i="${s.i}" aria-pressed="${st.har.has(s.n)}" title="Seuls les objets harmonisés sont importés dans les objets liés de la fiche (${MAXH} au maximum)">${st.har.has(s.n)?'✓ Harmonisé':'S’harmoniser'}</button>`:'';
function card(s,remove){
  const col=rcol(s);
  return `<article class="sp${s.h.length>1800?' wide':''}" style="--c:${col}"><header><div class="ti"><h3>${esc(s.n)}${pills(s)}${s.c_?'':VO.btn('objets',s.n,s.n)}</h3><div class="sub">${esc(s.cat||s.t)} · ${esc(s.q)}${s.a?' · '+esc(s.a):''}${s.en?' · '+esc(s.en):''}</div></div><span class="lvb" title="${esc(s.q)}">${rabbr(s)}</span></header>
  <div class="body"><dl class="meta"><div><dt>Type</dt><dd>${esc(s.cat||s.t)}</dd></div><div><dt>Rareté</dt><dd>${esc(s.q)}</dd></div>${prix(s)?`<div><dt>Prix d’achat indicatif</dt><dd>${esc(prix(s))}</dd></div>`:''}<div><dt>Harmonisation</dt><dd>${esc(s.a||'Non requise')}</dd></div>${s.roles&&s.roles.size?`<div><dt>Rôle</dt><dd>${[...s.roles].join(', ')}</dd></div>`:''}${s.rec&&s.rec.size?`<div><dt>Conseillé pour</dt><dd>${s.rec.size>=CLASSES.length-1?'toutes les classes':[...s.rec].sort((x,y)=>x.localeCompare(y,'fr')).join(', ')}</dd></div>`:''}${s.en?`<div><dt>Nom anglais</dt><dd>${esc(s.en)}</dd></div>`:''}${fxText(s)?`<div><dt>Effets</dt><dd>${esc(fxText(s))}</dd></div>`:''}</dl>
  <div class="desc">${lines(s.h)}</div>${srcNote(s)}${remove?`<div class="racts" style="margin-top:6px">${harBtn(s)}${editBtn(s)}<button class="b rm noprint" data-act="rm" data-i="${s.i}">Retirer de mes objets</button></div>`:''}</div></article>`;
}
function filtered(){
  const q=norm(st.q);
  return DB.filter(s=>(!q||s.idx.includes(q))&&(!st.fam||s.fam===st.fam)&&(!st.cla||s.rec.has(st.cla))&&(!st.role||s.roles.has(st.role))&&(!st.cls||s.t===st.cls)&&(!st.sch||raretes(s).includes(st.sch))&&(st.lvl===''||(st.lvl==='1')===!!s.a)&&(!st.src||(st.src==='perso'?!!s.c_:!s.c_&&(st.src==='2014')===(s.ed==='2014')))&&(!st.only||st.sel.has(s.n)));
}
function renderList(){
  const r=filtered();
  $('#cnt').textContent=r.length+' objet'+(r.length>1?'s':'')+' affiché'+(r.length>1?'s':'')+' · '+st.sel.size+' dans mon inventaire · '+st.har.size+'/'+MAXH+' harmonisé'+(st.har.size>1?'s':'');
  $('#list').innerHTML=r.length?r.map(s=>{
    const on=st.sel.has(s.n),op=st.open.has(s.n),col=rcol(s);
    return `<div class="item" style="--c:${col}"><div class="row"><div class="rmain"><div class="rt">${esc(s.n)}${pills(s)}${s.c_?'':VO.btn('objets',s.n,s.n)}</div><div class="rs">${esc(s.cat?s.cat.split(' (')[0]:s.t)} · ${esc(s.q)}${s.a?' · '+esc(s.a):''}${prix(s)?' · '+esc(prix(s).split(' (')[0].split(' ;')[0]):''}</div></div>
    <div class="racts">${harBtn(s)}<button class="b" style="--c:#2a3170" data-act="det" data-i="${s.i}" aria-expanded="${op}">${op?'Masquer':'Détails'}</button><button class="b add${on?' on':''}" data-act="tog" data-i="${s.i}" aria-pressed="${on}">${on?'✓ Ajouté':'+ Ajouter'}</button></div></div>${op?`<div class="det">${card(s,false)}${s.c_?`<div class="racts" style="margin-top:6px">${editBtn(s)}</div>`:''}</div>`:''}</div>`;
  }).join(''):'<div class="empty-msg">Aucun objet ne correspond à ces filtres.</div>';
}
function renderBook(){
  const by=TORDER.map(()=>[]);
  DB.forEach(s=>{if(st.sel.has(s.n))by[TORDER.indexOf(s.t)].push(s)});
  by.forEach(a=>a.sort((x,y)=>RORDER.indexOf(rare(x))-RORDER.indexOf(rare(y))||x.n.localeCompare(y.n,'fr')));
  $('#tabs').innerHTML=TORDER.map((t,l)=>`<button class="tab" role="tab" style="--c:${TC[t]}" data-act="tab" data-l="${l}" aria-selected="${l===st.tab}">${t}<span>${by[l].length}</span></button>`).join('');
  $('#levels').innerHTML=TORDER.map((t,l)=>`<section class="lvl${l===st.tab?' on':''}${by[l].length?'':' empty'}" style="--c:${TC[t]}"><h2>${t} <span>(${by[l].length})</span></h2>${by[l].length?`<div class="cards">${by[l].map(s=>card(s,true)).join('')}</div>`:'<div class="none">Aucun objet de ce type. Utilise « Choisir les objets » pour en ajouter.</div>'}</section>`).join('');
  const nh=DB.filter(s=>s.a&&st.sel.has(s.n)).length;
  $('#sum').textContent=st.sel.size?st.sel.size+' objet'+(st.sel.size>1?'s':'')+' magique'+(st.sel.size>1?'s':'')+(nh?' · harmonisation : '+st.har.size+'/'+MAXH+(st.har.size<nh&&st.har.size<MAXH?' (choisis avec « S’harmoniser » les objets à importer dans la fiche)':''):''):'Aucun objet sélectionné';
  $('#bBook').textContent='Mes objets ('+st.sel.size+')';
}
function renderAll(){renderList();renderBook();autosave()}

// Données du personnage (sauvegarde .json et enregistrement dans le navigateur)
function collect(){
  return {version:1,type:'objets-dnd-5e',data:{
    titre:$('#titre').value,
    objets:DB.filter(s=>st.sel.has(s.n)).map(s=>s.n),
    harmonises:DB.filter(s=>st.har.has(s.n)).map(s=>s.n),
    filtres:{q:st.q,fam:st.fam,cla:st.cla,role:st.role,cls:st.cls,sch:st.sch,lvl:st.lvl,only:st.only}}};
}
function syncInputs(){$('#fq').value=st.q;$('#ff').value=st.fam;$('#fk').value=st.cla;$('#fr').value=st.role;$('#fc').value=st.cls;$('#fs').value=st.sch;$('#fl').value=st.lvl;$('#fo').value=st.only;$('#fb').value=st.src}
function apply(o){
  const d=o&&o.data;
  if(!d||!Array.isArray(d.objets))throw new Error('format');
  st.sel.clear();st.har.clear();let unknown=0;
  d.objets.forEach(n=>{const s=BYN.get(norm(String(n)));if(s)st.sel.add(s.n);else unknown++});
  (d.harmonises||[]).forEach(n=>{const s=BYN.get(norm(String(n)));if(s&&s.a&&st.sel.has(s.n)&&st.har.size<MAXH)st.har.add(s.n)});
  const f=d.filtres||{};
  st.q=f.q||'';st.fam=f.fam||'';st.cla=f.cla||'';st.role=f.role||'';st.cls=f.cls||'';st.sch=f.sch||'';st.lvl=f.lvl||'';st.only=f.only?'1':'';
  syncInputs();renderAll();
  return unknown;
}
function blank(){
  st.sel.clear();st.har.clear();st.q=st.fam=st.cla=st.role=st.cls=st.sch=st.lvl=st.only='';
  syncInputs();renderAll();
}
function show(obj){
  st.open.clear();st.tab=0;
  if(obj)apply(obj);else blank();
}
function autosave(){Persos.save()}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,s=DB[+b.dataset.i];
  if(a==='tog'){if(st.sel.has(s.n)){st.sel.delete(s.n);st.har.delete(s.n)}else st.sel.add(s.n);renderAll()}
  else if(a==='har'){
    if(st.har.has(s.n))st.har.delete(s.n);
    else if(st.har.size>=MAXH){msg('Tu ne peux t’harmoniser qu’avec '+MAXH+' objets à la fois : mets fin à une autre harmonisation d’abord');return}
    else st.har.add(s.n);
    renderAll();
  }
  else if(a==='det'){st.open.has(s.n)?st.open.delete(s.n):st.open.add(s.n);renderList()}
  else if(a==='rm'){st.sel.delete(s.n);st.har.delete(s.n);renderAll()}
  else if(a==='tab'){st.tab=+b.dataset.l;renderBook()}
  else if(a==='edit')editCustom(s);
  else if(a==='mode')setMode(b.dataset.m);
});
function setMode(m){
  document.body.dataset.mode=m;
  document.querySelectorAll('[data-act=mode]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m));
  if(m==='book'){
    const cnt=l=>DB.some(s=>s.t===TORDER[l]&&st.sel.has(s.n));
    if(!cnt(st.tab)){const f=TORDER.findIndex((t,l)=>cnt(l));if(f>=0){st.tab=f;renderBook()}}
  }
  scrollTo(0,0);
}
$('#fq').addEventListener('input',e=>{st.q=e.target.value;renderList();autosave()});
[['#ff','fam'],['#fk','cla'],['#fr','role'],['#fc','cls'],['#fs','sch'],['#fl','lvl'],['#fo','only'],['#fb','src']].forEach(([id,k])=>$(id).addEventListener('change',e=>{st[k]=e.target.value;renderList();autosave()}));
$('#titre').addEventListener('input',autosave);
$('#bNew').onclick=()=>editCustom(null);
// Objet au hasard parmi ceux qui correspondent aux filtres
$('#bRand').onclick=()=>{
  const L=filtered();if(!L.length){msg('Aucun objet ne correspond à ces filtres');return}
  const dlg=document.createElement('dialog');
  dlg.style.cssText='border:0;border-radius:12px;padding:14px;width:min(640px,94vw);max-height:90vh;box-shadow:0 10px 40px #0008;background:#f6f4fb';
  const show=()=>{
    const s=L[Math.floor(Math.random()*L.length)],on=st.sel.has(s.n);
    dlg.innerHTML=`<p style="margin:0 0 8px;font-size:12px;color:#5a6270">Tiré au hasard parmi ${L.length} objet${L.length>1?'s':''}</p>${card(s,false)}<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px"><button class="b" data-r="close">Fermer</button><button class="b" style="--c:#7a4fc4" data-r="again">🎲 Un autre</button><button class="b add${on?' on':''}" data-r="add">${on?'✓ Ajouté':'+ Ajouter à mes objets'}</button></div>`;
    dlg.onclick=e=>{const r=e.target.closest('[data-r]');if(!r)return;
      if(r.dataset.r==='close'){dlg.close();dlg.remove()}
      else if(r.dataset.r==='again')show();
      else{if(!st.sel.has(s.n)){st.sel.add(s.n);renderAll()}show.cur=s;r.classList.add('on');r.textContent='✓ Ajouté'}};
  };
  show();document.body.appendChild(dlg);dlg.showModal();
};
$('#bReset').onclick=()=>{st.q=st.fam=st.cla=st.role=st.cls=st.sch=st.lvl=st.only=st.src='';syncInputs();renderList();autosave()};

$('#bSave').onclick=()=>{
  const nom=($('#titre').value||Persos.current().nom||'objets').trim().replace(/[^\p{L}\p{N}_-]+/gu,'_');
  const blob=new Blob([JSON.stringify(collect(),null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`objets_${nom}.json`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  msg('Objets enregistrés dans un fichier .json');
};
$('#bLoad').onclick=()=>$('#file').click();
$('#file').onchange=ev=>{
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const u=apply(JSON.parse(r.result));
    msg('Objets chargés : '+st.sel.size+(u?' ('+u+' introuvable'+(u>1?'s':'')+' ignoré'+(u>1?'s':'')+')':''));
  }catch(e){msg('Fichier invalide : choisis un .json créé par cette page')}};
  r.readAsText(f);ev.target.value='';
};
$('#bPrint').onclick=()=>{
  if(!st.sel.size){msg('Ajoute d’abord des objets à ton inventaire');return}
  window.print();
};
$('#bClear').onclick=()=>{
  if(!st.sel.size)return;
  if(!confirm('Retirer tous les objets de « '+Persos.current().nom+' » ? Pense à enregistrer un .json avant.'))return;
  st.sel.clear();st.har.clear();renderAll();msg('Inventaire vidé');
};

async function boot(){
  let data;
  try{
    const r=await fetch('assets/json/vf/objets.json');
    if(!r.ok)throw new Error('HTTP '+r.status);
    data=await r.json();
  }catch(e){
    $('#cnt').textContent='';
    $('#list').innerHTML='<div class="empty-msg">Impossible de charger la liste des objets (objets.json). Vérifie ta connexion, puis recharge la page. En local, ouvre le site via un serveur web (pas en double-cliquant sur le fichier).</div>';
    return;
  }
  setup(data);
  Persos.init({part:'objets',mount:$('#persos'),title:$('#titre'),collect,apply:show,msg});
}
boot();
