const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’‘`´]/g,"'").trim();
const m=v=>String(v).replace('.',',')+' m';

// Groupes de règles : couleur et libellé
const ED={
 '2024':{l:'Manuel des joueurs 2024',c:'#2a3170'},
 'sup':{l:'Suppléments (compatibles 2024)',c:'#12968f'},
 '2014':{l:'Règles 2014 seulement',c:'#b0632a'}
};
// Particularités détectées dans le texte des traits (espèce + lignages)
const FEAT=[
 ['Vision dans le noir',/vision dans le noir/],
 ['Vol',/vitesse de vol|\bvol\b/],
 ['Nage',/vitesse de nage|\bnage\b|amphibie/],
 ['Escalade',/vitesse d'escalade|arboricole/],
 ['Téléportation',/teleport/],
 ['Résistance aux dégâts',/resistance aux degats|resistance a(ux)? (l'|la )?(acide|feu|froid|foudre|poison|degats)|immunite aux degats/],
 ['Armure naturelle',/armure naturelle|carapace/],
 ['Télépathie',/telepath/],
 ['Sorts innés',/tour de magie|toujours le sort|vous pouvez lancer|lancer .{0,40} (sans emplacement|grace a ce trait)/],
 ['Attaque naturelle',/griffes|morsure|cornes|sabots|serres|coup de tete/],
 ['Pas besoin de dormir',/transe|sans sommeil|repos de sentinelle/]
];
let DB=[];
const st={q:'',e:'',t:'',y:'',p:'',open:new Set()};

function build(E,X){
 const I=X.infos||{};
 const mk=(n,s,ed)=>{
  const inf=I[n]||s;
  const lig=s.lignage&&s.lignage.opts?s.lignage:null;
  const txt=[...s.traits,...(lig?lig.opts.flatMap(o=>o.traits||[]):[])].map(t=>t.nom+' '+t.desc).join(' ');
  const nt=norm(txt);
  const o={n,s,ed,typ:inf.type||'Humanoïde',inf,lig,src:s.src||'Manuel des joueurs 2024',
   tail:s.taille,feats:FEAT.filter(f=>f[1].test(nt)).map(f=>f[0])};
  o.idx=norm(n+' '+txt+' '+(inf.cult||'')+' '+(inf.app||'')+' '+(inf.cadre||'')+' '+(lig?lig.opts.map(x=>x.v).join(' '):''));
  o.mv=moves(norm(s.traits.filter(t=>!/\(niv\./.test(t.nom)).map(t=>t.nom+' '+t.desc).join(' ')));
  return o;
 };
 DB=[...Object.entries(E).map(([n,s])=>mk(n,s,s.src?'sup':'2024')),
     ...Object.entries(X.extra||{}).map(([n,s])=>Object.assign(mk(n,s,s.ed||'2014'),{nofiche:1}))]
   .sort((a,b)=>a.n.localeCompare(b.n,'fr'));
 const opts=(first,arr)=>`<option value="">${first}</option>`+arr.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
 $('#fe').innerHTML=`<option value="">Toutes</option>`+Object.entries(ED).map(([k,v])=>`<option value="${k}">${esc(v.l)}</option>`).join('');
 $('#ft').innerHTML=opts('Toutes',['Petite','Moyenne']);
 $('#fy').innerHTML=opts('Tous',[...new Set(DB.map(o=>o.typ))].sort());
 $('#fp').innerHTML=opts('Toutes',FEAT.map(f=>f[0]));
}
// Vitesses spéciales lisibles dans le résumé
function moves(nt){
 const r=[];
 if(/vitesse de vol/.test(nt))r.push('vol');
 if(/vitesse de nage|\bnage\b/.test(nt))r.push('nage');
 if(/vitesse d'escalade|arboricole/.test(nt))r.push('escalade');
 return r;
}
function fullBlock(o){
 const s=o.s,i=o.inf;
 const T=t=>`<p><b><i>${esc(t.nom)}.</i></b> ${esc(t.desc).replace(/\n/g,'<br>')}</p>`;
 let h=`<dl class="meta"><div><dt>Taille</dt><dd>${esc(s.taille)}</dd></div><div><dt>Vitesse</dt><dd>${m(s.vit)}${o.mv.length?' · '+o.mv.join(', '):''}</dd></div><div><dt>Type</dt><dd>${esc(o.typ)}</dd></div><div><dt>Durée de vie</dt><dd>${esc(i.age||'—')}</dd></div></dl><div class="desc">`;
 if(i.app)h+=`<h4>Apparence</h4><p>${esc(i.app)}</p>`;
 if(i.cult)h+=`<h4>Culture et origines</h4><p>${esc(i.cult)}</p>`;
 if(i.cadre)h+=`<p><b>Monde ou plan d’origine :</b> ${esc(i.cadre)}</p>`;
 h+=`<h4>Traits et pouvoirs</h4>`+s.traits.map(T).join('');
 if(o.lig){
  h+=`<h4>${esc(o.lig.lbl)} (au choix)</h4>`+o.lig.opts.map(x=>`<details class="opt"><summary>${esc(x.v)} <span>— ${esc(x.txt||'')}</span></summary>${(x.traits||[]).map(T).join('')}</details>`).join('');
 }
 if(o.ed!=='2014')h+=`<p class="srcn" style="font-style:normal">Avec les règles 2024, les augmentations de caractéristiques et les langues viennent de l’historique, pas de l’espèce.</p>`;
 h+=`</div><div class="srcn">Source : ${esc(o.src)}${o.ed==='2014'?' · espèce sans version 2024, règles 2014':''}${o.nofiche?' · pas encore proposée dans la fiche':''}${(s.r_||s.v_)?' · reconstitué à partir d’un résumé : à vérifier dans le livre':' · reformulé : le livre fait foi'}${o.nofiche?'':' · <a href="fiche.html">utilisable dans la fiche</a>'}</div>`;
 return h;
}
function filtered(){
 const q=norm(st.q);
 return DB.filter(o=>(!q||o.idx.includes(q))&&(!st.e||o.ed===st.e)&&(!st.t||o.tail.includes(st.t))&&(!st.y||o.typ===st.y)&&(!st.p||o.feats.includes(st.p)));
}
function render(){
 const r=filtered();
 $('#cnt').textContent=r.length+' espèce'+(r.length>1?'s':'')+' affichée'+(r.length>1?'s':'')+' sur '+DB.length;
 $('#bAll').textContent=r.length&&r.every(o=>st.open.has(o.n))?'Tout replier':'Tout déplier';
 $('#list').innerHTML=r.length?r.map(o=>{
  const op=st.open.has(o.n),c=ED[o.ed].c;
  const sub=[o.tail,m(o.s.vit)+(o.mv.length?' ('+o.mv.join(', ')+')':''),o.typ,o.src].join(' · ');
  return `<div class="item" id="${esc(encodeURIComponent(o.n))}" style="--c:${c}"><div class="row"><div class="rmain"><div class="rt">${esc(o.n)}${o.ed==='2014'?'<span class="pill">2014</span>':''}${VO.btn('especes',o.n,o.n)}</div><div class="rs">${esc(sub)}</div>${o.feats.length?`<div class="tags">${o.feats.map(f=>`<span class="tag">${esc(f)}</span>`).join('')}</div>`:''}</div>
  <div class="racts"><button class="b" data-n="${esc(o.n)}" aria-expanded="${op}">${op?'Masquer':'Détails'}</button></div></div>${op?`<div class="det">${fullBlock(o)}</div>`:''}</div>`;
 }).join(''):'<div class="empty-msg">Aucune espèce ne correspond à ces filtres.</div>';
}
$('#list').addEventListener('click',e=>{
 const b=e.target.closest('button[data-n]');if(!b)return;
 const n=b.dataset.n;st.open.has(n)?st.open.delete(n):st.open.add(n);render();
});
[['#fq','q','input'],['#fe','e','change'],['#ft','t','change'],['#fy','y','change'],['#fp','p','change']].forEach(([s,k,ev])=>$(s).addEventListener(ev,e=>{st[k]=e.target.value;render()}));
$('#bReset').onclick=()=>{Object.assign(st,{q:'',e:'',t:'',y:'',p:''});['#fq','#fe','#ft','#fy','#fp'].forEach(s=>$(s).value='');render()};
$('#bAll').onclick=()=>{const r=filtered(),all=r.length&&r.every(o=>st.open.has(o.n));r.forEach(o=>all?st.open.delete(o.n):st.open.add(o.n));render()};

Promise.all(['assets/json/vf/especes.json','assets/json/vf/especes_infos.json'].map(u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return r.json()})))
 .then(([E,X])=>{
  build(E,X);
  // Lien direct : especes.html#Elfe ouvre la fiche de l'espèce
  const h=decodeURIComponent(location.hash.slice(1));
  if(h&&DB.some(o=>o.n===h))st.open.add(h);
  render();
  if(h){const el=document.getElementById(encodeURIComponent(h));if(el)el.scrollIntoView()}
 })
 .catch(()=>{$('#list').innerHTML='<div class="empty-msg">Impossible de charger les espèces (ouvre le site via un serveur web).</div>'});
