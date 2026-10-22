const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',4000)};
const nb=n=>n.toLocaleString('fr-FR');
const TIERS={1:'Niveaux 1 à 4',2:'Niveaux 5 à 10',3:'Niveaux 11 à 16',4:'Niveaux 17 à 20'};
const TN={1:'Héros locaux',2:'Héros du royaume',3:'Maîtres du royaume',4:'Maîtres du monde'};
const ST={libre:'Pas encore jouée',prevue:'Prévue',cours:'En cours',faite:'Terminée'};
const GROUPE=5;
const PRIX=[['légendaire',200000],['très rare',40000],['rare',4000],['peu courant',400]];
// Ce que la part d'un aventurier permet d'acheter, en objets magiques
function achat(pp){
  const r=PRIX.find(x=>pp>=x[1]*.75);
  if(!r)return 'de quoi s’équiper, pas encore un objet peu courant';
  const n=Math.max(1,Math.round(pp/r[1]*2)/2);
  return 'environ '+String(n).replace('.',',')+' objet'+(n>1?'s':'')+' '+r[0]+(n>1?'s':'')+' chacun';
}
let QS=[],suivi={},filt={t:'',ty:'',st:'',q:''};
// La page n'est visible que si le personnage actif s'appelle « mj »
const estMJ=()=>{const c=Persos.current();return !!c&&c.nom.trim().toLowerCase()==='mj'};
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const minNiv=q=>parseInt(q.niv,10);

function carte(q){
  const s=suivi[q.id]||'libre',pp=Math.floor(q.po/GROUPE);
  return `<article class="q k${q.tier}${s==='faite'?' faite':''}" id="${q.id}">
<h3>${esc(q.t)}</h3>
<div class="tags"><span class="lv">Niveau ${esc(q.niv)}</span><span>${esc(q.type)}</span><span>${esc(q.lieu)}</span></div>
<p><b>Accroche.</b> ${esc(q.acc)}</p>
<p><b>Objectif.</b> ${esc(q.obj)}</p>
<div><p><b>Complications</b></p><ul>${q.comp.map(c=>'<li>'+esc(c)+'</li>').join('')}</ul></div>
<div class="po"><span>Récompense : <b>${nb(q.po)} PO</b> pour le groupe</span><span>soit <b>${nb(pp)} PO</b> par aventurier</span><span class="bn">Équivaut à ${achat(pp)}</span>${q.bonus?'<span class="bn">En plus : '+esc(q.bonus)+'</span>':''}</div>
<label class="st">Suivi <select data-id="${q.id}">${Object.keys(ST).map(k=>`<option value="${k}"${k===s?' selected':''}>${ST[k]}</option>`).join('')}</select></label>
</article>`;
}
function visibles(){
  const w=norm(filt.q.trim());
  return QS.filter(q=>(!filt.t||q.tier==filt.t)&&(!filt.ty||q.type===filt.ty)&&(!filt.st||(suivi[q.id]||'libre')===filt.st)
    &&(!w||norm([q.t,q.type,q.lieu,q.acc,q.obj,q.comp.join(' '),q.bonus||''].join(' ')).includes(w)));
}
function render(){
  const mj=estMJ();
  $('#lock').hidden=mj;$('#mj').hidden=!mj;$('#bPrint').hidden=!mj;
  if(!mj||!QS.length)return;
  const v=visibles();
  $('#cnt').textContent=v.length+' quête'+(v.length>1?'s':'');
  $('#tiers').innerHTML=v.length?[1,2,3,4].map(t=>{
    const l=v.filter(q=>q.tier===t);if(!l.length)return '';
    return `<section class="panel tier k${t}"><h2>${TIERS[t]}<small>${TN[t]} · ${l.length} quête${l.length>1?'s':''}</small></h2><div class="grid">${l.map(carte).join('')}</div></section>`;
  }).join(''):'<section class="panel empty">Aucune quête ne correspond à ces filtres.</section>';
}
$('#ft').onclick=e=>{const b=e.target.closest('.f');if(!b)return;filt.t=b.dataset.t;$$('#ft .f').forEach(x=>x.setAttribute('aria-pressed',x===b));render()};
$('#fty').onchange=e=>{filt.ty=e.target.value;render()};
$('#fst').onchange=e=>{filt.st=e.target.value;render()};
$('#q').oninput=e=>{filt.q=e.target.value;render()};
$('#tiers').addEventListener('change',e=>{
  const id=e.target.dataset.id;if(!id)return;
  if(e.target.value==='libre')delete suivi[id];else suivi[id]=e.target.value;
  Persos.save();msg('Suivi enregistré : '+ST[e.target.value]);
  e.target.closest('.q').classList.toggle('faite',e.target.value==='faite');
});
$('#bRand').onclick=()=>{
  const v=visibles().filter(q=>suivi[q.id]!=='faite');
  if(!v.length){msg('Aucune quête disponible avec ces filtres');return}
  const a=new Uint32Array(1);crypto.getRandomValues(a);const q=v[a[0]%v.length];
  const el=document.getElementById(q.id);if(!el)return;
  el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center'});
  $$('.q.flash').forEach(x=>x.classList.remove('flash'));el.classList.add('flash');
  msg('Quête tirée : « '+q.t+' »');
};
$('#bPrint').onclick=()=>window.print();

Persos.init({part:'quetes',mount:$('#persos'),msg,
  collect:()=>({version:1,type:'quetes-dnd-5e',data:{suivi}}),
  apply:o=>{suivi=o&&o.data&&o.data.suivi&&typeof o.data.suivi==='object'?o.data.suivi:{};render()},
  onName:render});
fetch('json/vf/quetes.json').then(r=>r.json()).then(d=>{
  QS=d.sort((a,b)=>a.tier-b.tier||minNiv(a)-minNiv(b)||a.po-b.po);
  [...new Set(QS.map(q=>q.type))].sort((a,b)=>a.localeCompare(b,'fr')).forEach(t=>$('#fty').add(new Option(t,t)));
  render();
}).catch(()=>{$('#tiers').innerHTML='<section class="panel empty">Impossible de charger les quêtes.</section>'});
