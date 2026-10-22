const TC={'Arme':'#c8402f','Armure':'#2f6fd0','Munition':'#d8791a','Équipement d’aventurier':'#2e9e5b','Paquetage':'#12968f','Outil':'#7a4fc4','Monture et véhicule':'#8e5a2b'};
const TORDER=Object.keys(TC);
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’‘`´]/g,"'").trim();
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',4500)};
const fmt=n=>(Math.round(n*100)/100).toLocaleString('fr-FR');
const fkg=n=>fmt(n)+' kg';
let DB=[];const BYN=new Map();
const st={sel:new Map(),q:'',cls:'',sch:'',lvl:'',only:'',tab:0,open:new Set()};
const qty=s=>st.sel.get(s.n)||0;

let BASE=[];
function setup(data){
  BASE=data;
  index();
  $('#fc').innerHTML='<option value="">Toutes</option>'+TORDER.filter(t=>DB.some(s=>s.t===t)).map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  fillSub();
}
// Objets du livre + créations personnelles (Persos.custom())
function index(){
  DB=BASE.concat(Persos.custom().equipement.filter(s=>s&&s.n&&TORDER.includes(s.t)));
  BYN.clear();
  DB.forEach((s,i)=>{s.i=i;s.idx=norm(s.n+' '+s.en+' '+s.c);[s.n,s.en].forEach(x=>{if(x&&!BYN.has(norm(x)))BYN.set(norm(x),s)})});
}
function editCustom(it){
  const cats={};BASE.forEach(s=>{(cats[s.t]=cats[s.t]||[]).includes(s.c)||cats[s.t].push(s.c)});
  Custom.edit({kind:'equipement',item:it,types:TORDER,cats,
    taken:n=>BYN.has(norm(n)),
    done:(x,old)=>{
      if(old&&(!x||x.n!==old.n)){
        const q=st.sel.get(old.n);st.sel.delete(old.n);st.open.delete(old.n);
        if(x&&q)st.sel.set(x.n,q);
      }
      if(x&&!old){st.sel.set(x.n,1);st.open.add(x.n)}
      index();fillSub();renderAll();
      msg(x?(old?'Objet modifié':'« '+x.n+' » créé et ajouté à ton équipement'):'Objet supprimé');
    }});
}
const editBtn=s=>s.c_?`<button class="b noprint" style="--c:#d8791a" data-act="edit" data-i="${s.i}">Modifier</button>`:'';
function fillSub(){
  const subs=[...new Set(DB.filter(s=>!st.cls||s.t===st.cls).map(s=>s.c))];
  if(st.sch&&!subs.includes(st.sch))st.sch='';
  $('#fs').innerHTML='<option value="">Toutes</option>'+subs.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  $('#fs').value=st.sch;
}
function card(s,remove){
  const col=TC[s.t]||'#2a3170',q=qty(s);
  return `<article class="sp" style="--c:${col}"><header><div class="ti"><h3>${esc(s.n)}${s.c_?'<span class="pill" style="background:#d8791a">Création</span>':VO.btn('equipement',s.n,s.n)}</h3><div class="sub">${esc(s.c)}${s.en?' · '+esc(s.en):''}</div></div><span class="lvb">${remove?'× '+q:esc(s.p)}</span></header>
  <div class="body"><dl class="meta"><div><dt>Prix d’achat</dt><dd>${esc(s.p||'—')}</dd></div><div><dt>Poids</dt><dd>${s.kg?fkg(s.kg):'—'}</dd></div><div><dt>Catégorie</dt><dd>${esc(s.c)}</dd></div>${s.en?`<div><dt>Nom anglais</dt><dd>${esc(s.en)}</dd></div>`:''}${remove?`<div><dt>Quantité</dt><dd>${q} (total ${fkg(q*s.kg)} · ${fmt(q*s.po)} po)</dd></div>`:''}</dl>
  <div class="desc">${s.h.replace(/([.)])\s+(?=<b>)/g,'$1<br>')}</div>${remove?`<div class="qty noprint" style="margin-top:6px"><button class="b" data-act="dec" data-i="${s.i}">−</button><input class="qin" type="number" min="1" max="999" value="${q}" data-i="${s.i}" aria-label="Quantité de ${esc(s.n)}"><button class="b" data-act="inc" data-i="${s.i}">+</button> <button class="b rm" data-act="rm" data-i="${s.i}">Retirer</button> ${editBtn(s)}</div>`:s.c_?`<div class="noprint" style="margin-top:6px">${editBtn(s)}</div>`:''}</div></article>`;
}
function filtered(){
  const q=norm(st.q),max=st.lvl===''?null:parseFloat(st.lvl);
  return DB.filter(s=>(!q||s.idx.includes(q))&&(!st.cls||s.t===st.cls)&&(!st.sch||s.c===st.sch)&&(max===null||isNaN(max)||s.po<=max)&&(!st.only||(st.only==='perso'?!!s.c_:qty(s)>0)));
}
function totals(){let kg=0,po=0,n=0;DB.forEach(s=>{const q=qty(s);if(q){kg+=q*s.kg;po+=q*s.po;n+=q}});return{kg,po,n}}
function renderList(){
  const r=filtered(),t=totals();
  $('#cnt').textContent=r.length+' objet'+(r.length>1?'s':'')+' affiché'+(r.length>1?'s':'')+' · '+st.sel.size+' type'+(st.sel.size>1?'s':'')+' dans mon équipement';
  $('#list').innerHTML=r.length?r.map(s=>{
    const q=qty(s),op=st.open.has(s.n),col=TC[s.t]||'#2a3170';
    const act=q?`<span class="qty"><button class="b" data-act="dec" data-i="${s.i}" aria-label="Retirer un exemplaire">−</button><input class="qin" type="number" min="1" max="999" value="${q}" data-i="${s.i}" aria-label="Quantité de ${esc(s.n)}"><button class="b add on" data-act="inc" data-i="${s.i}" aria-label="Ajouter un exemplaire">+</button></span>`:`<button class="b add" data-act="inc" data-i="${s.i}">Ajouter</button>`;
    return `<div class="item" style="--c:${col}"><div class="row"><div class="rmain"><div class="rt">${esc(s.n)}${s.c_?'<span class="pill" style="background:#d8791a">Création</span>':VO.btn('equipement',s.n,s.n)}</div><div class="rs">${esc(s.c)}${s.kg?' · '+fkg(s.kg):''}</div></div><span class="pr" title="Prix d’achat">${esc(s.p||'—')}</span>
    <div class="racts"><button class="b" style="--c:#2a3170" data-act="det" data-i="${s.i}" aria-expanded="${op}">${op?'Masquer':'Détails'}</button>${act}</div></div>${op?`<div class="det">${card(s,false)}</div>`:''}</div>`;
  }).join(''):'<div class="empty-msg">Aucun objet ne correspond à ces filtres.</div>';
}
function renderBook(){
  const by=TORDER.map(()=>[]);
  DB.forEach(s=>{if(qty(s))by[TORDER.indexOf(s.t)].push(s)});
  by.forEach(a=>a.sort((x,y)=>x.c.localeCompare(y.c,'fr')||x.n.localeCompare(y.n,'fr')));
  $('#tabs').innerHTML=TORDER.map((t,l)=>`<button class="tab" role="tab" style="--c:${TC[t]}" data-act="tab" data-l="${l}" aria-selected="${l===st.tab}">${esc(t)}<span>${by[l].length}</span></button>`).join('');
  $('#levels').innerHTML=TORDER.map((t,l)=>`<section class="lvl${l===st.tab?' on':''}${by[l].length?'':' empty'}" style="--c:${TC[t]}"><h2>${esc(t)} <span>(${by[l].length})</span></h2>${by[l].length?`<div class="cards">${by[l].map(s=>card(s,true)).join('')}</div>`:'<div class="none">Aucun objet dans cette catégorie.</div>'}</section>`).join('');
  const t=totals();
  $('#sum').textContent=t.n?t.n+' objet'+(t.n>1?'s':'')+' · '+fkg(t.kg)+' · valeur '+fmt(t.po)+' po':'Aucun objet sélectionné';
  $('#bBook').textContent='Mon équipement ('+t.n+')';
  $('#tot').innerHTML=t.n?`Poids total : ${fkg(t.kg)} · Valeur totale : ${fmt(t.po)} po`:'';
}
function renderAll(){renderList();renderBook();autosave()}

function collect(){
  return {version:1,type:'equipement-dnd-5e',data:{
    titre:$('#titre').value,
    objets:DB.filter(s=>qty(s)).map(s=>({n:s.n,qte:qty(s)})),
    filtres:{q:st.q,cls:st.cls,sch:st.sch,lvl:st.lvl,only:st.only}}};
}
function syncInputs(){$('#fq').value=st.q;$('#fc').value=st.cls;fillSub();$('#fl').value=st.lvl;$('#fo').value=st.only}
function apply(o){
  const d=o&&o.data;
  if(!d||!Array.isArray(d.objets))throw new Error('format');
  st.sel.clear();let unknown=0;
  d.objets.forEach(x=>{
    const n=typeof x==='string'?x:x&&x.n,q=typeof x==='string'?1:Math.max(1,Math.min(999,parseInt(x&&x.qte)||1));
    const s=BYN.get(norm(String(n)));if(s)st.sel.set(s.n,q);else unknown++;
  });
  const f=d.filtres||{};
  st.q=f.q||'';st.cls=f.cls||'';st.sch=f.sch||'';st.lvl=f.lvl||'';st.only=f.only==='perso'?'perso':f.only?'1':'';
  syncInputs();renderAll();
  return unknown;
}
function blank(){st.sel.clear();st.q=st.cls=st.sch=st.lvl=st.only='';syncInputs();renderAll()}
function show(obj){st.open.clear();st.tab=0;if(obj)apply(obj);else blank()}
function autosave(){Persos.save()}
function setQ(s,q){q=Math.max(0,Math.min(999,q));q?st.sel.set(s.n,q):st.sel.delete(s.n);renderAll()}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,s=DB[+b.dataset.i];
  if(a==='inc')setQ(s,qty(s)+1);
  else if(a==='dec')setQ(s,qty(s)-1);
  else if(a==='det'){st.open.has(s.n)?st.open.delete(s.n):st.open.add(s.n);renderList()}
  else if(a==='rm')setQ(s,0);
  else if(a==='tab'){st.tab=+b.dataset.l;renderBook()}
  else if(a==='edit')editCustom(s);
  else if(a==='mode')setMode(b.dataset.m);
});
function setMode(m){
  document.body.dataset.mode=m;
  document.querySelectorAll('[data-act=mode]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m));
  if(m==='book'){
    const cnt=l=>DB.some(s=>s.t===TORDER[l]&&qty(s));
    if(!cnt(st.tab)){const f=TORDER.findIndex((t,l)=>cnt(l));if(f>=0){st.tab=f;renderBook()}}
  }
  scrollTo(0,0);
}
document.addEventListener('change',e=>{
  if(!e.target.classList.contains('qin'))return;
  const s=DB[+e.target.dataset.i],v=parseInt(e.target.value);
  setQ(s,isNaN(v)?0:v);
});
$('#fq').addEventListener('input',e=>{st.q=e.target.value;renderList();autosave()});
$('#fc').addEventListener('change',e=>{st.cls=e.target.value;fillSub();renderList();autosave()});
$('#fs').addEventListener('change',e=>{st.sch=e.target.value;renderList();autosave()});
$('#fl').addEventListener('input',e=>{st.lvl=e.target.value;renderList();autosave()});
$('#fo').addEventListener('change',e=>{st.only=e.target.value;renderList();autosave()});
$('#titre').addEventListener('input',autosave);
$('#bNew').onclick=()=>editCustom(null);
$('#bReset').onclick=()=>{st.q=st.cls=st.sch=st.lvl=st.only='';syncInputs();renderList();autosave()};

$('#bSave').onclick=()=>{
  const nom=($('#titre').value||Persos.current().nom||'equipement').trim().replace(/[^\p{L}\p{N}_-]+/gu,'_');
  const blob=new Blob([JSON.stringify(collect(),null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`equipement_${nom}.json`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  msg('Équipement enregistré dans un fichier .json');
};
$('#bLoad').onclick=()=>$('#file').click();
$('#file').onchange=ev=>{
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const u=apply(JSON.parse(r.result));
    msg('Équipement chargé : '+st.sel.size+' type(s)'+(u?' ('+u+' introuvable'+(u>1?'s':'')+' ignoré'+(u>1?'s':'')+')':''));
  }catch(e){msg('Fichier invalide : choisis un .json créé par cette page')}};
  r.readAsText(f);ev.target.value='';
};
$('#bPrint').onclick=()=>{if(!st.sel.size){msg('Ajoute d’abord des objets à ton équipement');return}window.print()};
$('#bClear').onclick=()=>{
  if(!st.sel.size)return;
  if(!confirm('Retirer tout l’équipement de « '+Persos.current().nom+' » ? Pense à enregistrer un .json avant.'))return;
  st.sel.clear();renderAll();msg('Équipement vidé');
};

async function boot(){
  let data;
  try{
    const r=await fetch('json/vf/equipement.json');
    if(!r.ok)throw new Error('HTTP '+r.status);
    data=await r.json();
  }catch(e){
    $('#cnt').textContent='';
    $('#list').innerHTML='<div class="empty-msg">Impossible de charger la liste (equipement.json). Vérifie ta connexion, puis recharge la page. En local, ouvre le site via un serveur web (pas en double-cliquant sur le fichier).</div>';
    return;
  }
  setup(data);
  Persos.init({part:'equipement',mount:$('#persos'),title:$('#titre'),collect,apply:show,msg});
}
boot();
