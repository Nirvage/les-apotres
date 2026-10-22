const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’‘`´]/g,"'").trim();
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',5000)};
const rid=()=>Math.random().toString(36).slice(2,8);

const AB=[['for','Force'],['dex','Dextérité'],['con','Constitution'],['int','Intelligence'],['sag','Sagesse'],['cha','Charisme']];
const ABK=Object.fromEntries(AB.map(([k,n])=>[norm(n),k])),ABN=Object.fromEntries(AB);
const AR=['légères','intermédiaires','lourdes','boucliers'];
const CATC={'Origine':'#2e9e5b','Général':'#2a3170','Style de combat':'#c8402f','Faveur épique':'#7a4fc4','Manifestation occulte':'#5b3a8c'};
const MINE='Mes créations';
// Dons et manifestations occultes qu'on peut prendre plusieurs fois (règles 2024)
const REPEAT=new Set(['asi','adepte_elem','initie_magie','qualifie','mo_decharge_dechirante','mo_lance_occulte','mo_decharge_repoussante','mo_lecons_premiers']);
// Armures maîtrisées par classe (règles 2024) et dons qui en donnent ; mêmes tables que la fiche
const PROF={'Artificier':['légères','intermédiaires','boucliers'],'Barbare':['légères','intermédiaires','boucliers'],'Barde':['légères'],'Chasseur de sang':['légères','intermédiaires'],'Clerc':['légères','intermédiaires','boucliers'],'Druide':['légères','boucliers'],'Guerrier':AR,'Occultiste':['légères'],'Paladin':AR,'Rôdeur':['légères','intermédiaires','boucliers'],'Roublard':['légères']};
const DONPROF={armure_legere:['légères','boucliers'],armure_inter:['intermédiaires','boucliers'],armure_lourde:['lourdes']};
// Capacité Style de combat : Guerrier niv. 1, Paladin et Rôdeur niv. 2
const STYLE={'Guerrier':1,'Paladin':2,'Rôdeur':2};
const PTYPES=[['none','Aucun prérequis'],['niv','Un niveau minimum'],['ab','Une valeur de caractéristique'],['cast','Incantation ou Magie de pacte'],['arm','Une maîtrise d’armure ou de bouclier'],['style','La capacité Style de combat'],['occ','Un niveau d’occultiste (manifestations occultes)'],['other','Autre (à vérifier)']];

let DB=[],BASE=[],CLS=null;
const st={q:'',c:'',p:'',a:'',ok:false,open:new Set()};
const me={niv:1,ab:{for:10,dex:10,con:10,int:10,sag:10,cha:10},cast:false,style:false,occ:false,ar:new Set(),dons:[]};

// Prérequis en texte libre -> conditions vérifiables
function parsePre(pre){
 const t=norm(pre),r={niv:0,ab:null,cast:false,style:false,occ:false,more:false,ar:[],other:false};
 if(!t)return r;
 const n=t.match(/niveau (\d+)/);if(n)r.niv=+n[1];
 const a=t.match(/((?:(?:force|dexterite|constitution|intelligence|sagesse|charisme)(?:\s*,\s*|\s+ou\s+)?)+)\s+(\d+)\s+ou\s+plus/);
 if(a)r.ab={keys:a[1].match(/force|dexterite|constitution|intelligence|sagesse|charisme/g).map(x=>ABK[x]),min:+a[2]};
 r.cast=/incantation|magie de pacte|capacite sorts/.test(t);
 r.style=/style de combat/.test(t);
 // Manifestations occultes : niveau d'occultiste, plus parfois un pacte, un sort ou une autre manifestation (à vérifier)
 r.occ=/^occultiste/.test(t);r.more=r.occ&&t.includes(',');
 if(/armures? legeres/.test(t))r.ar.push('légères');
 if(/armures? intermediaires/.test(t))r.ar.push('intermédiaires');
 if(/armures? lourdes/.test(t))r.ar.push('lourdes');
 if(/bouclier/.test(t))r.ar.push('boucliers');
 r.other=!r.niv&&!r.ab&&!r.cast&&!r.style&&!r.occ&&!r.ar.length;
 return r;
}
function build(){
 const mine=(Persos.custom().dons||[]).filter(x=>x&&x.id&&x.nom);
 DB=BASE.map(x=>({...x,mine:false})).concat(mine.map(x=>({...x,mine:true}))).map(x=>{
  const P=parsePre(x.pre),types=[];
  if(!norm(x.pre))types.push('none');
  if(P.niv)types.push('niv');if(P.ab)types.push('ab');if(P.cast)types.push('cast');
  if(P.ar.length)types.push('arm');if(P.style)types.push('style');if(P.occ)types.push('occ');if(P.other&&norm(x.pre))types.push('other');
  return Object.assign(x,{P,types,c:x.mine?'#d8791a':CATC[x.cat]||'#2a3170',idx:norm([x.nom,x.en,x.cat,x.pre,x.desc,x.src,x.ed].join(' '))});
 });
 const cats=[];BASE.forEach(x=>{if(!cats.includes(x.cat))cats.push(x.cat)});
 const keep=$('#fc').value;
 $('#fc').innerHTML='<option value="">Toutes</option>'+cats.concat(mine.length?[MINE]:[]).map(c=>`<option>${esc(c)}</option>`).join('');
 $('#fc').value=cats.includes(keep)||keep===MINE&&mine.length?keep:'';st.c=$('#fc').value;
}
// Conditions non remplies par le personnage ; null si le don a un prérequis qu'on ne sait pas vérifier
function missing(x){
 const P=x.P,m=[];
 if(P.other)return null;
 if(P.niv&&me.niv<P.niv)m.push('niveau '+P.niv);
 if(P.ab&&!P.ab.keys.some(k=>me.ab[k]>=P.ab.min))m.push(P.ab.keys.map(k=>ABN[k]).join(' ou ')+' '+P.ab.min);
 if(P.cast&&!me.cast)m.push('Incantation ou Magie de pacte');
 if(P.style&&!me.style)m.push('capacité Style de combat');
 if(P.occ&&!me.occ)m.push('classe Occultiste');
 P.ar.filter(a=>!me.ar.has(a)).forEach(a=>m.push(a==='boucliers'?'maîtrise des boucliers':'maîtrise des armures '+a));
 return P.more&&!m.length?null:m;
}
const taken=x=>me.dons.filter(id=>id===x.id).length;

function descHTML(x){
 return x.desc.split('\n').filter(l=>l.trim()).map(l=>{
  const i=l.indexOf(' : ');
  return i>0&&i<60?`<p><b><i>${esc(l.slice(0,i))}.</i></b> ${esc(l.slice(i+3))}</p>`:`<p>${esc(l)}</p>`;
 }).join('');
}
function filtered(){
 const q=norm(st.q);
 return DB.filter(x=>(!q||x.idx.includes(q))
  &&(!st.c||(st.c===MINE?x.mine:x.cat===st.c&&!x.mine))
  &&(!st.p||x.types.includes(st.p))
  &&(!st.a||(st.a==='-'?!x.P.ab:x.P.ab&&x.P.ab.keys.includes(st.a)))
  &&(!st.ok||(missing(x)||[1]).length===0));
}
function render(){
 const r=filtered();
 $('#cnt').textContent=r.length+' don'+(r.length>1?'s':'')+' affiché'+(r.length>1?'s':'')+' sur '+DB.length;
 $('#bAll').textContent=r.length&&r.every(x=>st.open.has(x.id))?'Tout replier':'Tout déplier';
 const who=esc(curName());
 $('#list').innerHTML=r.length?r.map(x=>{
  const op=st.open.has(x.id),m=missing(x),n=taken(x),rep=REPEAT.has(x.id);
  const stat=m===null?`<span class="mb" title="${esc(x.pre)}">Prérequis à vérifier : ${esc(x.pre)}</span>`
   :m.length?`<span class="ko">Il manque : ${esc(m.join(', '))}</span>`
   :`<span class="ok">${x.pre?'Prérequis remplis':'Sans prérequis'}</span>`;
  const sub=[x.mine?'Création personnelle · '+x.cat:x.cat,x.pre?'Prérequis : '+x.pre:'Aucun prérequis'].join(' · ');
  const add=n&&!rep?`<button class="b" disabled title="Déjà sur la fiche de ${who}">Sur la fiche</button>`
   :`<button class="b" data-add="${esc(x.id)}" title="Ajoute ce don à la fiche de ${who}">Ajouter${n?' encore':''}</button>`;
  return `<div class="item" id="${esc(x.id)}" style="--c:${x.c}"><div class="row"><div class="rmain"><div class="rt">${esc(x.nom)}${x.mine?'<span class="pill">Création</span>':''}${rep?'<span class="pill" style="background:#5f6580">Répétable</span>':''}${x.ed?`<span class="pill" style="background:#9a6b2f" title="Absente des règles 2024">${esc(x.ed)}</span>`:''}${x.mine?'':VO.btn('dons',x.id,x.nom)}</div><div class="rs">${esc(sub)}</div>${stat}${n?` <span class="mb has">Sur la fiche${n>1?' ×'+n:''}</span>`:''}</div>
  <div class="racts">${x.mine?`<button class="b" data-edit="${esc(x.id)}">Modifier</button>`:''}${add}<button class="b" data-n="${esc(x.id)}" aria-expanded="${op}">${op?'Masquer':'Détails'}</button></div></div>${op?`<div class="det"><div class="desc">${descHTML(x)}</div>${x.en?`<div class="srcn">Nom anglais : ${esc(x.en)}</div>`:''}<div class="srcn">${x.mine?'Création personnelle':'Source : '+esc(x.src||'Manuel des joueurs 2024')+(x.r_?' · reconstitué à partir d’un résumé : à vérifier dans le livre':' · reformulé : le livre fait foi')}${x.choix&&x.choix.length?' · les choix du don se font dans la fiche':''}</div></div>`:''}</div>`;
 }).join(''):'<div class="empty-msg">Aucun don ne correspond à ces filtres.</div>';
}

/* ---------- Personnage ---------- */
const curName=()=>{const p=Persos.list().find(p=>p.actif);return p?p.nom:''};
function fillChars(){
 $('#pp').innerHTML=Persos.list().map(p=>`<option value="${esc(p.id)}"${p.actif?' selected':''}>${esc(p.nom)}</option>`).join('');
}
function findClass(d){
 if(!CLS)return null;
 const v=norm(d.classe||d.clsel);if(!v)return null;
 for(const [n,c] of Object.entries(CLS))if(norm(n)===v||(c.alias||[]).some(a=>norm(a)===v))return [n,c];
 return null;
}
// Reprend niveau, caractéristiques finales, incantation et maîtrises depuis la fiche du personnage actif
function loadChar(){
 const f=Persos.part('fiche'),d=f&&f.data||{},D=d.derive;
 const ex=d.extras||{};
 me.dons=(Array.isArray(ex.dons)?ex.dons:[]).filter(g=>g&&g.id).map(g=>g.id);
 const cl=findClass(d);
 if(D&&D.tot){
  me.niv=D.niv;AB.forEach(([k])=>me.ab[k]=D.tot[k]||10);me.cast=!!D.cast;me.ar=new Set(D.ar||[]);
 }else{   // fiche jamais rouverte depuis l'ajout de cette page : valeurs de base
  me.niv=Math.min(20,Math.max(1,parseInt(d.niveau)||1));
  AB.forEach(([k])=>me.ab[k]=parseInt(d['ab_'+k])||10);
  me.cast=!!(cl&&(cl[1].lanceur||cl[1].sous_classe&&d.sclance));
  me.ar=new Set(cl&&PROF[cl[0]]||[]);me.dons.forEach(id=>(DONPROF[id]||[]).forEach(a=>me.ar.add(a)));
 }
 const cn=D&&D.cl||cl&&cl[0]||'';
 me.style=!!(STYLE[cn]&&me.niv>=STYLE[cn]);me.occ=cn==='Occultiste';
 $('#pn').value=me.niv;
 AB.forEach(([k])=>$('#a_'+k).value=me.ab[k]);
 $('#c_cast').checked=me.cast;$('#c_style').checked=me.style;$('#c_occ').checked=me.occ;
 AR.forEach(a=>$('#c_'+a).checked=me.ar.has(a));
 $('#phint').textContent=!f?'Ce personnage n’a pas encore de fiche : indique son niveau et ses caractéristiques ici, ou remplis sa fiche.'
  :(D?'Valeurs reprises de la fiche (caractéristiques finales, bonus compris)':'Valeurs de base reprises de la fiche (ouvre la fiche une fois pour inclure les bonus d’espèce, d’historique et de dons)')
   +(cn?' · '+cn+' niveau '+me.niv:'')+'. Tu peux les modifier ici pour tester, sans changer la fiche.';
}
function readInputs(){
 me.niv=Math.min(20,Math.max(1,parseInt($('#pn').value)||1));
 AB.forEach(([k])=>me.ab[k]=parseInt($('#a_'+k).value)||10);
 me.cast=$('#c_cast').checked;me.style=$('#c_style').checked;me.occ=$('#c_occ').checked;
 me.ar=new Set(AR.filter(a=>$('#c_'+a).checked));
 render();
}
document.querySelector('.pgrid').addEventListener('input',e=>{if(e.target.id!=='pp')readInputs()});
document.querySelector('.chk').addEventListener('change',readInputs);
$('#pp').addEventListener('change',e=>{Persos.activate(e.target.value);loadChar();render()});
// Fiche modifiée dans un autre onglet : on suit
addEventListener('storage',e=>{
 if(e.key==='dnd_persos_v1'){fillChars();loadChar();render()}
 else if(e.key==='dnd_perso_custom_v1'&&BASE.length){build();render()}
});

/* ---------- Actions ---------- */
function addDon(x){
 Persos.edit(q=>{
  if(!q.fiche||!q.fiche.data)q.fiche={version:5,type:'fiche-dnd-5e',data:{nom:q.nom}};
  const d=q.fiche.data;
  if(!d.extras||typeof d.extras!=='object')d.extras={};
  if(!Array.isArray(d.extras.dons))d.extras.dons=[];
  d.extras.dons.push({u:rid(),id:x.id,ch:{}});
 });
 me.dons.push(x.id);render();
 msg('« '+x.nom+' » ajouté à la fiche de '+curName()+(x.choix&&x.choix.length?' : fais ses choix dans la fiche':''));
}
function editDon(it){
 const cats=[];BASE.forEach(x=>{if(!cats.includes(x.cat))cats.push(x.cat)});
 Custom.edit({kind:'dons',item:it,cats,
  taken:n=>DB.some(x=>x.id!==(it&&it.id)&&norm(x.nom)===norm(n)),
  done:(x,old)=>{build();render();msg(x?(old?'Don modifié':'Don « '+x.nom+' » créé'):'Don supprimé')}});
}
$('#bNew').onclick=()=>editDon(null);
$('#list').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.n){const n=b.dataset.n;st.open.has(n)?st.open.delete(n):st.open.add(n);render()}
 else if(b.dataset.add){const x=DB.find(y=>y.id===b.dataset.add);if(x)addDon(x)}
 else if(b.dataset.edit){const x=(Persos.custom().dons||[]).find(y=>y.id===b.dataset.edit);if(x)editDon(x)}
});

/* ---------- Filtres ---------- */
$('#fp').innerHTML='<option value="">Tous</option>'+PTYPES.map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join('');
$('#fa').innerHTML='<option value="">Toutes</option><option value="-">Aucune</option>'+AB.map(([k,n])=>`<option value="${k}">${n}</option>`).join('');
[['#fq','q','input'],['#fc','c','change'],['#fp','p','change'],['#fa','a','change']].forEach(([s,k,ev])=>$(s).addEventListener(ev,e=>{st[k]=e.target.value;render()}));
$('#fok').addEventListener('change',e=>{st.ok=e.target.checked;render()});
$('#bReset').onclick=()=>{Object.assign(st,{q:'',c:'',p:'',a:'',ok:false});['#fq','#fc','#fp','#fa'].forEach(s=>$(s).value='');$('#fok').checked=false;render()};
$('#bAll').onclick=()=>{const r=filtered(),all=r.length&&r.every(x=>st.open.has(x.id));r.forEach(x=>all?st.open.delete(x.id):st.open.add(x.id));render()};

fillChars();
Promise.all([fetch('assets/json/vf/dons.json').then(r=>{if(!r.ok)throw new Error('dons');return r.json()}),
             fetch('assets/json/vf/classes.json').then(r=>r.ok?r.json():null).catch(()=>null)])
 .then(([D,C])=>{
  BASE=D;CLS=C&&C.classes||null;
  build();loadChar();
  // Lien direct : dons.html#vigilant ouvre le don
  const h=decodeURIComponent(location.hash.slice(1));
  if(h&&DB.some(x=>x.id===h))st.open.add(h);
  render();
  if(h){const el=document.getElementById(h);if(el)el.scrollIntoView()}
 })
 .catch(()=>{$('#list').innerHTML='<div class="empty-msg">Impossible de charger les dons (ouvre le site via un serveur web).</div>'});
