const TC={'Appel de familier':'#2e9e5b','Pacte de la chaîne (Occultiste)':'#7a4fc4','Compagnon primordial (Rôdeur)':'#8e5a2b','Appel de destrier (Paladin)':'#b0306a','Monture':'#5d6b7a','Défenseur d’acier (Artificier)':'#2f6fd0','Serviteur homoncule (Artificier / Magicien)':'#d8791a','Autre animal (accord du MJ)':'#b8860b'};
const TORDER=Object.keys(TC);
const TSHORT={'Appel de familier':'Appel de familier','Pacte de la chaîne (Occultiste)':'Pacte de la chaîne','Compagnon primordial (Rôdeur)':'Compagnon primordial','Appel de destrier (Paladin)':'Appel de destrier','Monture':'Monture','Défenseur d’acier (Artificier)':'Défenseur d’acier','Serviteur homoncule (Artificier / Magicien)':'Homoncule','Autre animal (accord du MJ)':'Autre animal'};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’‘`´]/g,"'").trim();
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',4500)};
const mod=n=>{const m=Math.floor((n-10)/2);return (m>=0?'+':'−')+Math.abs(m)};
const AN=['FOR','DEX','CON','INT','SAG','CHA'];
let DB=[];const BYN=new Map();
const st={sel:new Map(),q:'',cls:'',sch:'',lvl:'',only:'',tab:0,open:new Set()};
const has=s=>st.sel.has(s.n);
const sg=n=>(n<0?'−':'+')+Math.abs(n);
const ETATS=['À terre','Agrippé','Assourdi','Aveuglé','Charmé','Effrayé','Empoisonné','Entravé','Épuisement','Étourdi','Inconscient','Invisible','Neutralisé','Paralysé','Pétrifié'];
const DESTRIER='Appel de destrier (Paladin)';
const fresh=()=>({s:'',pv:'',tmp:'',max:'',nv:2,et:[]});
// À 0 PV
const KO={'Appel de familier':'il disparaît (Appel de familier peut le rappeler)','Pacte de la chaîne (Occultiste)':'il disparaît (Appel de familier peut le rappeler)',[DESTRIER]:'il disparaît (relancer le sort pour le rappeler)',
  'Compagnon primordial (Rôdeur)':'s’il meurt, une action de Magie et un emplacement de sort le ramènent à la vie dans l’heure qui suit',
  'Défenseur d’acier (Artificier)':'s’il est détruit, des outils de forgeron et un emplacement de sort le réparent dans l’heure qui suit'};

/* Valeurs qui dépendent du personnage actif (compagnon primordial, défenseur d'acier, homoncule, coursier),
   lues sur sa fiche (valeurs calculées par la fiche quand elle a été ouverte) */
const CLS={'Compagnon primordial (Rôdeur)':'Rôdeur','Défenseur d’acier (Artificier)':'Artificier','Serviteur homoncule (Artificier / Magicien)':'Artificier'};
function pj(){
  const p=Persos.current()||{},d=p.fiche&&p.fiche.data||{},v=d.derive||{},tot=v.tot||{};
  const niv=v.niv||Math.min(20,Math.max(1,parseInt(d.niveau,10)||1));
  const m=k=>Math.floor(((tot[k]||parseInt(d['ab_'+k],10)||10)-10)/2);
  return {nom:p.nom||'',fiche:!!p.fiche,niv,cl:v.cl||d.classe||d.clsel||'',pb:v.pb||Math.ceil(niv/4)+1,int:m('int'),sag:m('sag'),
    atk:typeof v.atk==='number'?v.atk:null,dd:typeof v.dd==='number'?v.dd:null};
}
const dep=s=>/Rôdeur|Artificier|niveau du sort/.test(s.ca+' '+s.pv);
function subst(t,s,P,nv){
  if(!t||!dep(s))return t;
  t=t.replace(/(\d+) \+ mod\. de Sagesse du Rôdeur/g,(x,a)=>String(+a+P.sag))
   .replace(/mod\. de Sagesse du Rôdeur/g,String(P.sag))
   .replace(/mod\. d’Intelligence/g,String(P.int))
   .replace(/niveau (de Rôdeur|d’Artificier)/g,String(P.niv))
   .replace(/niveau du sort/g,String(nv))
   .replace(/(?<![\w])([+−]?)(\d+) \+ (2×)?BM\b/g,(x,g,a,two)=>{const n=(g==='−'?-a:+a)+(two?2:1)*P.pb;return g?sg(n):String(n)})
   .replace(/\bBM\b/g,String(P.pb));
  if(P.atk!=null)t=t.replace(/bonus d’attaque de sort (du Rôdeur|de l’Artificier|du lanceur)/g,sg(P.atk));
  if(P.dd!=null)t=t.replace(/DD de sauvegarde des sorts du Rôdeur|votre DD de sort/g,'DD '+P.dd);
  return t;
}
function stats(s,e){
  const P=pj(),nv=Math.min(9,Math.max(2,+(e&&e.nv)||2)),d=dep(s);
  const val=t=>{
    if(!d)return parseInt(t,10)||null;
    const x=subst(t,s,P,nv).replace(/×/g,'*').replace(/−/g,'-');
    return /^[\d\s+*-]+$/.test(x)?Function('return '+x)():null;
  };
  return {P,nv,d,ca:val(s.ca),max:val(s.pv)};
}
function calcLine(s,t){
  const P=t.P,c=CLS[s.o];
  if(!P.fiche)return 'Remplis la fiche du personnage : ces valeurs en dépendent (niveau 1 et caractéristiques à 10 en attendant).';
  let r='Calculé d’après la fiche de '+P.nom+' : niveau '+P.niv+(c?' de '+c:'')+', BM '+sg(P.pb);
  if(/Sagesse/.test(s.ca))r+=', Sagesse '+sg(P.sag);
  if(/Intelligence/.test(s.pv))r+=', Intelligence '+sg(P.int);
  if(s.o===DESTRIER)r+=', sort de niveau '+t.nv;
  if(P.atk!=null)r+=', attaque de sort '+sg(P.atk);
  r+='.';
  if(c&&P.cl&&P.cl!==c)r+=' La fiche indique la classe '+P.cl+' : le niveau total est utilisé.';
  if(P.atk==null)r+=' Ouvre la fiche une fois pour obtenir le bonus d’attaque de sort.';
  return r;
}
const curMax=(e,t)=>{const m=parseInt(e.max,10);return isNaN(m)?t.max:m};
const curPv=(e,max)=>{const v=parseInt(e.pv,10);return isNaN(v)?(max||0):v};
function hpBar(pv,max){
  const r=max?Math.max(0,Math.min(100,pv/max*100)):100;
  return {w:r+'%',c:r>50?'#2e9e5b':r>25?'#d8791a':'#c8402f'};
}
function tracker(s,e,t){
  const max=curMax(e,t),pv=curPv(e,max),b=hpBar(pv,max),i=s.i;
  return `<div class="trk" data-i="${i}">
  <div class="trk1">
   <label>Surnom<input type="text" data-f="s" data-i="${i}" value="${esc(e.s||'')}" placeholder="Nom du familier" size="14"></label>
   ${s.o===DESTRIER?`<label>Niveau du sort<select data-f="nv" data-i="${i}">${[2,3,4,5,6,7,8,9].map(n=>`<option${n===t.nv?' selected':''}>${n}</option>`).join('')}</select></label>`:''}
   <div class="big">CA<span>${t.ca??'—'}</span></div>
   <label>PV<input class="n" type="number" inputmode="numeric" data-f="pv" data-i="${i}" value="${pv}"></label><span class="sl">/</span>
   <label>Max<input class="n" type="number" inputmode="numeric" data-f="max" data-i="${i}" value="${esc(e.max||'')}" placeholder="${t.max??''}" title="Vide : la valeur du profil${t.d?' (calculée)':''}"></label>
   <label>Temp.<input class="n tm" type="number" inputmode="numeric" data-f="tmp" data-i="${i}" value="${esc(e.tmp||'')}"></label>
  </div>
  <div class="hp"><i style="width:${b.w};background:${b.c}"></i></div>
  <div class="trk2 noprint"><input class="amt" type="number" inputmode="numeric" min="0" placeholder="PV" aria-label="Montant de PV">
   <button class="b" style="--c:#c8402f" data-act="hp" data-k="dmg" data-i="${i}">Dégâts</button><button class="b" style="--c:#2e9e5b" data-act="hp" data-k="heal" data-i="${i}">Soins</button><button class="b" style="--c:#12968f" data-act="hp" data-k="tmp" data-i="${i}">PV temp.</button><button class="b" data-act="hp" data-k="full" data-i="${i}" title="PV au maximum, sans PV temporaires ni états">Repos long</button>
   <select data-f="et" data-i="${i}" aria-label="Ajouter un état"><option value="">+ État…</option>${ETATS.filter(x=>!(e.et||[]).includes(x)).map(x=>`<option>${x}</option>`).join('')}</select>
   <span class="sp1"></span><button class="b rm" data-act="rm" data-i="${i}">Retirer</button></div>
  <div class="ets">${(e.et||[]).map(x=>`<button class="chip" data-act="unet" data-i="${i}" data-e="${esc(x)}" title="Retirer l’état">${esc(x)} ✕</button>`).join('')}</div>
  </div>`;
}

function setup(data){
  DB=data;
  DB.forEach((s,i)=>{s.i=i;s.idx=norm(s.n+' '+s.en+' '+s.typ);[s.n,s.en].forEach(x=>{if(x&&!BYN.has(norm(x)))BYN.set(norm(x),s)})});
  const opts=(first,arr)=>`<option value="">${first}</option>`+arr.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  $('#fc').innerHTML=opts('Toutes',TORDER.filter(t=>DB.some(s=>s.o===t)));
  $('#fs').innerHTML=opts('Tous',[...new Set(DB.map(s=>s.typ.split(' ')[0]))]);
  $('#fl').innerHTML=opts('Toutes',[...new Set(DB.map(s=>s.tail))]);
}
function block(s,full){
  const col=TC[s.o]||'#2a3170',e=st.sel.get(s.n)||{},t=stats(s,e),X=v=>subst(v,s,t.P,t.nv);
  const L=(n,v)=>v?`<div><b>${n}</b> ${esc(X(v))}</div>`:'';
  const V=(v,n)=>t.d&&n!=null?`${n} <small>(${esc(v)})</small>`:esc(v);
  return `<article class="sp" style="--c:${col}"><header><div class="ti"><h3>${esc(full&&e.s?e.s+' — ':'')}${esc(s.n)}${VO.btn('familiers',s.n,s.n)}</h3><div class="sub">${esc(s.tail)} · ${esc(s.typ)} · ${esc(s.en)}</div></div><span class="lvb" title="Origine">${esc(TSHORT[s.o]||'')}</span></header>
  <div class="body stat">${full?tracker(s,e,t):''}<div class="meta" style="grid-template-columns:1fr 1fr 1fr"><div><dt>Classe d’armure</dt><dd>${V(s.ca,t.ca)}</dd></div><div><dt>Points de vie</dt><dd>${V(s.pv,t.max)}</dd></div><div><dt>Vitesse</dt><dd>${esc(s.vit)}</dd></div>${s.init?`<div><dt>Initiative</dt><dd>${esc(s.init)}</dd></div>`:''}</div>
  ${t.d?`<div class="calc">${esc(calcLine(s,t))}</div>`:''}
  <div class="ab6">${s.car.map((v,i)=>`<div><b>${AN[i]}</b><span>${v} (${mod(v)})</span></div>`).join('')}</div>
  ${L('Jets de sauvegarde',s.sauv)}${L('Compétences',s.comp)}${L('Résistances / immunités',s.res)}${L('Sens',s.sens)}${L('Langues',s.langues)}${L('Dangerosité',s.dd)}
  ${s.traits.length?'<div class="desc">'+s.traits.map(x=>`<p><b><i>${esc(x.n)}.</i></b> ${esc(X(x.d))}</p>`).join('')+'</div>':''}
  ${s.actions.length?'<div class="desc"><b style="color:var(--c)">Actions</b>'+s.actions.map(x=>`<p><b><i>${esc(x.n)}.</i></b> ${esc(X(x.d))}</p>`).join('')+'</div>':''}
  <div class="srcn">${esc(s.note)} · Source : ${esc(s.src||'')}${s.ed==='2014'?' · fiche 2014 (pas de version 2024 trouvée)':''}${(s.r_||s.v_)?' · texte reconstitué à partir d’un résumé : à vérifier dans le livre':' · reformulé : le livre fait foi'}</div>
  </div></article>`;
}
function filtered(){
  const q=norm(st.q);
  return DB.filter(s=>(!q||s.idx.includes(q))&&(!st.cls||s.o===st.cls)&&(!st.sch||s.typ.split(' ')[0]===st.sch)&&(!st.lvl||s.tail===st.lvl)&&(!st.only||has(s)));
}
function renderList(){
  const r=filtered();
  $('#cnt').textContent=r.length+' créature'+(r.length>1?'s':'')+' affichée'+(r.length>1?'s':'')+' · '+st.sel.size+' choisie'+(st.sel.size>1?'s':'');
  $('#list').innerHTML=r.length?r.map(s=>{
    const on=has(s),op=st.open.has(s.n),col=TC[s.o]||'#2a3170';
    return `<div class="item" style="--c:${col}"><div class="row"><div class="rmain"><div class="rt">${esc(s.n)}${VO.btn('familiers',s.n,s.n)}</div><div class="rs">${esc(s.tail)} · ${esc(s.typ)} · CA ${esc(s.ca)} · PV ${esc(s.pv)} · ${esc(TSHORT[s.o]||'')}</div></div>
    <div class="racts"><button class="b" style="--c:#2a3170" data-act="det" data-i="${s.i}" aria-expanded="${op}">${op?'Masquer':'Détails'}</button><button class="b add${on?' on':''}" data-act="tog" data-i="${s.i}" aria-pressed="${on}">${on?'Choisi ✓':'Choisir'}</button></div></div>${op?`<div class="det">${block(s,false)}</div>`:''}</div>`;
  }).join(''):'<div class="empty-msg">Aucune créature ne correspond à ces filtres.</div>';
}
function renderBook(){
  const by=TORDER.map(()=>[]);
  DB.forEach(s=>{if(has(s))by[TORDER.indexOf(s.o)].push(s)});
  $('#tabs').innerHTML=TORDER.map((t,l)=>`<button class="tab" role="tab" style="--c:${TC[t]}" data-act="tab" data-l="${l}" aria-selected="${l===st.tab}">${esc(TSHORT[t])}<span>${by[l].length}</span></button>`).join('');
  $('#levels').innerHTML=TORDER.map((t,l)=>`<section class="lvl${l===st.tab?' on':''}${by[l].length?'':' empty'}" style="--c:${TC[t]}"><h2>${esc(t)} <span>(${by[l].length})</span></h2>${by[l].length?`<div class="cards">${by[l].map(s=>block(s,true)).join('')}</div>`:'<div class="none">Aucune créature dans cette catégorie.</div>'}</section>`).join('');
  $('#sum').textContent=st.sel.size?st.sel.size+' familier'+(st.sel.size>1?'s':'')+', compagnon'+(st.sel.size>1?'s':'')+' ou monture'+(st.sel.size>1?'s':'')+' : PV et états suivis en combat, enregistrés avec le personnage':'Aucune créature choisie';
  $('#bBook').textContent='Mes familiers ('+st.sel.size+')';
}
function renderAll(){renderList();renderBook();autosave()}

function collect(){
  return {version:1,type:'familiers-dnd-5e',data:{
    titre:$('#titre').value,
    // ca et pvmax : valeurs calculées, lues par le suivi de combat du MJ
    familiers:DB.filter(has).map(s=>{const e=st.sel.get(s.n),t=stats(s,e);
      return {n:s.n,surnom:e.s||'',pv:e.pv||'',tmp:e.tmp||'',max:e.max||'',nv:t.nv,et:e.et||[],ca:t.ca,pvmax:curMax(e,t),init:s.init||''}}),
    filtres:{q:st.q,cls:st.cls,sch:st.sch,lvl:st.lvl,only:st.only}}};
}
function syncInputs(){$('#fq').value=st.q;$('#fc').value=st.cls;$('#fs').value=st.sch;$('#fl').value=st.lvl;$('#fo').value=st.only}
function apply(o){
  const d=o&&o.data;
  if(!d||!Array.isArray(d.familiers))throw new Error('format');
  st.sel.clear();let unknown=0;
  d.familiers.forEach(x=>{
    const n=typeof x==='string'?x:x&&x.n,s=BYN.get(norm(String(n)));
    if(s)st.sel.set(s.n,Object.assign(fresh(),x&&typeof x==='object'?{s:String(x.surnom||''),pv:String(x.pv??''),tmp:String(x.tmp||''),max:String(x.max||''),nv:+x.nv||2,et:Array.isArray(x.et)?x.et.map(String):[]}:{}));else unknown++;
  });
  const f=d.filtres||{};
  st.q=f.q||'';st.cls=f.cls||'';st.sch=f.sch||'';st.lvl=f.lvl||'';st.only=f.only?'1':'';
  syncInputs();renderAll();
  return unknown;
}
function blank(){st.sel.clear();st.q=st.cls=st.sch=st.lvl=st.only='';syncInputs();renderAll()}
function show(obj){st.open.clear();st.tab=0;if(obj)apply(obj);else blank()}
function autosave(){Persos.save()}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,s=DB[+b.dataset.i];
  if(a==='tog'){has(s)?st.sel.delete(s.n):st.sel.set(s.n,fresh());renderAll()}
  else if(a==='hp')hp(s,b.dataset.k,Math.max(0,parseInt(b.closest('.trk').querySelector('.amt').value,10)||0));
  else if(a==='unet'){const e=st.sel.get(s.n);e.et=(e.et||[]).filter(x=>x!==b.dataset.e);renderBook();autosave()}
  else if(a==='det'){st.open.has(s.n)?st.open.delete(s.n):st.open.add(s.n);renderList()}
  else if(a==='rm'){st.sel.delete(s.n);renderAll()}
  else if(a==='tab'){st.tab=+b.dataset.l;renderBook()}
  else if(a==='mode')setMode(b.dataset.m);
});
document.addEventListener('input',e=>{
  const f=e.target.dataset&&e.target.dataset.f;if(!f||f==='et'||f==='nv')return;
  const s=DB[+e.target.dataset.i],o=st.sel.get(s.n);if(!o)return;
  o[f]=e.target.value;autosave();
  if(f!=='s')bar(s);
});
document.addEventListener('change',e=>{
  const f=e.target.dataset&&e.target.dataset.f;if(f!=='et'&&f!=='nv')return;
  const s=DB[+e.target.dataset.i],o=st.sel.get(s.n);if(!o)return;
  if(f==='nv')o.nv=+e.target.value;
  else if(e.target.value&&!(o.et=o.et||[]).includes(e.target.value))o.et.push(e.target.value);
  renderBook();autosave();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.classList.contains('amt')){const b=e.target.parentNode.querySelector('[data-k=dmg]');if(b)b.click()}
});
// Barre de PV mise à jour sans redessiner (on garde le champ en cours de saisie)
function bar(s){
  const el=document.querySelector(`.trk[data-i="${s.i}"] .hp i`);if(!el)return;
  const e=st.sel.get(s.n),max=curMax(e,stats(s,e)),b=hpBar(curPv(e,max),max);
  el.style.width=b.w;el.style.background=b.c;
}
// Dégâts (les PV temporaires d'abord), soins, PV temporaires, repos long
function hp(s,k,n){
  const e=st.sel.get(s.n);if(!e)return;
  const max=curMax(e,stats(s,e)),nom=e.s||s.n;
  let pv=curPv(e,max),tmp=parseInt(e.tmp,10)||0;
  if(k!=='full'&&!n){msg('Saisis un nombre de PV');return}
  if(k==='dmg'){
    const t=Math.min(tmp,n);tmp-=t;const was=pv;pv=Math.max(0,pv-(n-t));
    if(was>0&&pv===0)msg(nom+' tombe à 0 PV : '+(KO[s.o]||'hors de combat'));
  }else if(k==='heal')pv=max?Math.min(max,pv+n):pv+n;
  else if(k==='tmp'){if(n<=tmp)msg('Les PV temporaires ne se cumulent pas : on garde le plus élevé');tmp=Math.max(tmp,n)}
  else{pv=max||pv;tmp=0;e.et=[];msg(nom+' : PV au maximum')}
  e.pv=String(pv);e.tmp=tmp?String(tmp):'';
  renderBook();autosave();
}
function setMode(m){
  document.body.dataset.mode=m;
  document.querySelectorAll('[data-act=mode]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m));
  if(m==='book'){
    const cnt=l=>DB.some(s=>s.o===TORDER[l]&&has(s));
    if(!cnt(st.tab)){const f=TORDER.findIndex((t,l)=>cnt(l));if(f>=0){st.tab=f;renderBook()}}
  }
  scrollTo(0,0);
}
$('#fq').addEventListener('input',e=>{st.q=e.target.value;renderList();autosave()});
[['#fc','cls'],['#fs','sch'],['#fl','lvl'],['#fo','only']].forEach(([id,k])=>$(id).addEventListener('change',e=>{st[k]=e.target.value;renderList();autosave()}));
$('#titre').addEventListener('input',autosave);
$('#bReset').onclick=()=>{st.q=st.cls=st.sch=st.lvl=st.only='';syncInputs();renderList();autosave()};

$('#bSave').onclick=()=>{
  const nom=($('#titre').value||Persos.current().nom||'familiers').trim().replace(/[^\p{L}\p{N}_-]+/gu,'_');
  const blob=new Blob([JSON.stringify(collect(),null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`familiers_${nom}.json`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  msg('Familiers enregistrés dans un fichier .json');
};
$('#bLoad').onclick=()=>$('#file').click();
$('#file').onchange=ev=>{
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const u=apply(JSON.parse(r.result));
    msg('Familiers chargés : '+st.sel.size+(u?' ('+u+' introuvable'+(u>1?'s':'')+' ignoré'+(u>1?'s':'')+')':''));
  }catch(e){msg('Fichier invalide : choisis un .json créé par cette page')}};
  r.readAsText(f);ev.target.value='';
};
$('#bPrint').onclick=()=>{if(!st.sel.size){msg('Choisis d’abord des familiers');return}window.print()};
$('#bClear').onclick=()=>{
  if(!st.sel.size)return;
  if(!confirm('Retirer tous les familiers de « '+Persos.current().nom+' » ? Pense à enregistrer un .json avant.'))return;
  st.sel.clear();renderAll();msg('Familiers retirés');
};

async function boot(){
  let data;
  try{
    const r=await fetch('json/vf/familiers.json');
    if(!r.ok)throw new Error('HTTP '+r.status);
    data=await r.json();
  }catch(e){
    $('#cnt').textContent='';
    $('#list').innerHTML='<div class="empty-msg">Impossible de charger la liste (familiers.json). Vérifie ta connexion, puis recharge la page. En local, ouvre le site via un serveur web (pas en double-cliquant sur le fichier).</div>';
    return;
  }
  setup(data);
  Persos.init({part:'familiers',mount:$('#persos'),title:$('#titre'),collect,apply:show,msg});
}
boot();
