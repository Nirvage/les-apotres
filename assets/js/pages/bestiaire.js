const TC={'aberration':'#7a4fc4','bête':'#2e9e5b','céleste':'#c99a06','artificiel':'#5d6b7a','dragon':'#c8402f','élémentaire':'#d8791a','fée':'#12968f','fiélon':'#8b1e3f','géant':'#8e5a2b','humanoïde':'#2f6fd0','créature monstrueuse':'#9c3d8f','vase':'#6b8e23','plante':'#3c7d3c','mort-vivant':'#4a4a4a','nuée':'#6d6875'};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’‘`´]/g,"'").trim();
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',4500)};
const ini=m=>{const b=typeof m.init==='number'?m.init:Math.floor((m.car[1]-10)/2);return (b>=0?'+':'−')+Math.abs(b)+' ('+(10+b)+')'};
const mod=n=>{const m=Math.floor((n-10)/2);return (m>=0?'+':'−')+Math.abs(m)};
const AN=['FOR','DEX','CON','INT','SAG','CHA'];
const SIZES=['Très petite','Petite','Moyenne','Moyenne ou petite','Grande','Très grande','Gigantesque'];
const KEY='dnd_bestiaire_filtres_v1';
let DB=[];
const st={q:'',t:'',s:'',v:'',min:'',max:'',x:'',o:'nom',open:new Set()};
const tbase=m=>m.typ.startsWith('nuée')?'nuée':m.typ.replace(/ \(.*$/,'');
const col=m=>TC[tbase(m)]||'#2a3170';

function setup(data){
  DB=data;
  DB.forEach((m,i)=>{m.i=i;m.idx=norm(m.n+' '+m.en+' '+m.typ);
    const all=['traits','actions','bonus','reac','leg'].flatMap(k=>m[k]||[]);
    m.sort=all.some(a=>/^Incantation/.test(a.n));});
  const opts=(first,arr,lab=x=>x)=>`<option value="">${first}</option>`+arr.map(x=>`<option value="${esc(x)}">${esc(lab(x))}</option>`).join('');
  const types=[...new Set(DB.map(tbase))].sort((a,b)=>a.localeCompare(b,'fr'));
  $('#ft').innerHTML=opts('Tous',types,x=>x[0].toUpperCase()+x.slice(1));
  $('#fs').innerHTML=opts('Toutes',SIZES.filter(x=>DB.some(m=>m.tail===x)));
  const fps=[...new Set(DB.map(m=>m.fpn))].sort((a,b)=>a-b);
  const fpl=x=>({0.125:'1/8',0.25:'1/4',0.5:'1/2'})[x]||String(x);
  $('#fmin').innerHTML=opts('—',fps,fpl);$('#fmax').innerHTML=opts('—',fps,fpl);
}
function sec(title,arr,intro){
  if(!arr||!arr.length)return '';
  return `<div class="sec"><h4>${title}</h4>${intro?`<p class="intro">${esc(intro)}</p>`:''}${arr.map(a=>`<p><b><i>${esc(a.n)}.</i></b> ${esc(a.d).replace(/\n/g,'<br>')}</p>`).join('')}</div>`;
}
function block(m){
  const L=(t,v)=>v?`<div><b>${t}</b> ${esc(v)}</div>`:'';
  const src=m.v==='2014'?'SRD 5.1 (règles 2014) : ce monstre n’a pas de version 2024 dans le SRD 5.2':'SRD 5.2 (règles 2024)';
  return `<article class="sp" style="--c:${col(m)}"><header><div class="ti"><h3>${esc(m.n)}</h3><div class="sub">${esc(m.typ[0].toUpperCase()+m.typ.slice(1))} de taille ${esc(m.tail.toLowerCase())}, ${esc(m.al)} · ${esc(m.en)}</div></div></header>
  <div class="body"><dl class="meta"><div><dt>Classe d’armure</dt><dd>${esc(m.ca)}</dd></div><div><dt>Points de vie</dt><dd>${esc(m.pv)}</dd></div><div><dt>Vitesse</dt><dd>${esc(m.vit)}</dd></div><div><dt>Initiative</dt><dd>${ini(m)}</dd></div><div><dt>Facteur de puissance</dt><dd>${esc(m.fp)} · ${esc(m.px).replace(/^([\d  ]+)/,"$1 PX")} · BM ${esc(m.bm)}</dd></div></dl>
  <div class="ab6">${m.car.map((v,i)=>`<div><b>${AN[i]}</b><span>${v} (${mod(v)})</span></div>`).join('')}</div>
  <div class="lines">${L('Jets de sauvegarde',m.sauv)}${L('Compétences',m.comp)}${L('Vulnérabilités',m.vuln)}${L('Résistances',m.res)}${L('Immunités aux dégâts',m.imm)}${L('Immunités aux états',m.cimm)}${L('Équipement',m.equip)}${L('Sens',m.sens)}${L('Langues',m.langues)}</div>
  ${sec('Traits',m.traits)}${sec('Actions',m.actions)}${sec('Actions bonus',m.bonus)}${sec('Réactions',m.reac)}${sec('Actions légendaires',m.leg,m.legi)}
  <div class="srcn">Source : ${src}, Wizards of the Coast, licence CC BY 4.0. Traduction française du site : en cas de doute, le livre fait foi.</div>
  </div></article>`;
}
function filtered(){
  const q=norm(st.q),mn=st.min===''?-1:+st.min,mx=st.max===''?99:+st.max;
  const r=DB.filter(m=>(!q||m.idx.includes(q))&&(!st.t||tbase(m)===st.t)&&(!st.s||m.tail===st.s)&&(!st.v||m.v===st.v)&&m.fpn>=mn&&m.fpn<=mx
    &&(!st.x||(st.x==='leg'&&m.leg)||(st.x==='sort'&&m.sort)||(st.x==='vol'&&/vol /.test(m.vit))||(st.x==='nage'&&/nage /.test(m.vit))));
  if(st.o==='fp')r.sort((a,b)=>a.fpn-b.fpn||a.i-b.i);
  else if(st.o==='fpd')r.sort((a,b)=>b.fpn-a.fpn||a.i-b.i);
  return r;
}
function renderList(){
  const r=filtered();
  $('#cnt').textContent=r.length+' monstre'+(r.length>1?'s':'')+' sur '+DB.length;
  $('#list').innerHTML=r.length?r.map(m=>{
    const op=st.open.has(m.i);
    return `<div class="item" style="--c:${col(m)}"><div class="row" data-act="det" data-i="${m.i}" role="button" tabindex="0" aria-expanded="${op}"><div class="rmain"><div class="rt">${esc(m.n)}<span class="en">${esc(m.en)}</span>${m.v==='2014'?'<span class="pill" title="Pas de version 2024 dans le SRD">2014</span>':''}${m.leg?'<span class="pill leg">légendaire</span>':''}${VO.btn('monstres',m.n,m.n)}</div><div class="rs">${esc(m.tail)} · ${esc(m.typ)} · CA ${esc(m.ca)} · PV ${esc(m.pv.split(' ')[0])}</div></div>
    <div class="fpb">FP ${esc(m.fp)}<small>${esc(m.px.split(',')[0])} PX</small></div></div>${op?`<div class="det">${block(m)}</div>`:''}</div>`;
  }).join(''):'<div class="empty-msg">Aucun monstre ne correspond à ces filtres.</div>';
}
function save(){try{const {open,...f}=st;localStorage.setItem(KEY,JSON.stringify(f))}catch(e){}}
function load(){try{const f=JSON.parse(localStorage.getItem(KEY)||'{}');for(const k of ['q','t','s','v','min','max','x','o'])if(typeof f[k]==='string')st[k]=f[k]}catch(e){}}
const FIELDS=[['#fq','q'],['#ft','t'],['#fs','s'],['#fv','v'],['#fmin','min'],['#fmax','max'],['#fx','x'],['#fo','o']];
function syncInputs(){FIELDS.forEach(([id,k])=>{$(id).value=st[k];if($(id).value!==st[k])st[k]=$(id).value})}
function toggle(i){st.open.has(i)?st.open.delete(i):st.open.add(i);renderList()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act=det]');if(b)toggle(+b.dataset.i)});
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('[data-act=det]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggle(+b.dataset.i)}});
$('#fq').addEventListener('input',e=>{st.q=e.target.value;renderList();save()});
FIELDS.slice(1).forEach(([id,k])=>$(id).addEventListener('change',e=>{st[k]=e.target.value;renderList();save()}));
$('#bReset').onclick=()=>{Object.assign(st,{q:'',t:'',s:'',v:'',min:'',max:'',x:'',o:'nom'});syncInputs();renderList();save()};
$('#bClose').onclick=()=>{st.open.clear();renderList()};
$('#bRand').onclick=()=>{
  const r=filtered();if(!r.length){msg('Aucun monstre ne correspond aux filtres');return}
  const m=r[Math.floor(Math.random()*r.length)];
  st.open.add(m.i);renderList();
  const el=document.querySelector(`[data-act=det][data-i="${m.i}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  msg('Monstre tiré : '+m.n);
};

async function boot(){
  let data;
  try{
    const r=await fetch('json/vf/bestiaire.json?v=20261019a');
    if(!r.ok)throw new Error('HTTP '+r.status);
    data=await r.json();
  }catch(e){
    $('#cnt').textContent='';
    $('#list').innerHTML='<div class="empty-msg">Impossible de charger le bestiaire (bestiaire.json). Vérifie ta connexion, puis recharge la page. En local, ouvre le site via un serveur web (pas en double-cliquant sur le fichier).</div>';
    return;
  }
  setup(data);load();syncInputs();renderList();
}
boot();
