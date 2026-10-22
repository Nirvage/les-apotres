const $=s=>document.querySelector(s);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',4000)};
const nb=n=>n.toLocaleString('fr-FR',{maximumFractionDigits:2});
const rnd=n=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296*n};
const ri=(a,b)=>a+Math.floor(rnd(b-a+1));
function pick(l,n){l=l.slice();const r=[];while(r.length<n&&l.length)r.push(l.splice(Math.floor(rnd(l.length)),1)[0]);return r}

const RN=['Courant','Peu courant','Rare','Très rare','Légendaire'];
const PRIX=[100,400,4000,40000,200000];
// Parchemins de sort (Guide du Maître 2024) : rareté selon le niveau du sort ; prix du Manuel des joueurs pour les niveaux 0 et 1
const SCR_R=[0,0,1,1,2,2,3,3,3,4],SCR_P=[30,50];
const TAILLES={
  village:{f:.25,max:2,c:.4,nom:'Village'},
  bourg:{f:.4,max:3,c:.6,nom:'Bourg'},
  ville:{f:.65,max:3,c:.8,nom:'Ville'},
  capitale:{f:1,max:4,c:1,nom:'Grande ville'}
};
const RX=s=>new RegExp('^('+s+')','i');
/* Types de boutique.
   q : nombre d'objets magiques par rareté [courant, peu courant, rare, très rare, légendaire] en grande ville ;
   mag : objets magiques vendus ; cour : marchandise courante (equipement.json) ; scr : parchemins de sort (classes, ou [] pour toutes) */
const TYPES=[
 {id:'armurerie',nom:'Armurerie',d:'Armes, armures, boucliers et munitions, ordinaires et magiques.',q:[4,9,6,3,1],
  mag:o=>/^(Arme|Armure|Munition)$/.test(o.t),cour:e=>/^(Arme|Armure|Munition)$/.test(e.t)},
 {id:'cordonnier',nom:'Cordonnier et tailleur',d:'Vêtements, bottes, capes, gants, ceintures, chapeaux et robes.',q:[3,7,6,3,1],
  mag:o=>o.t==='Objet merveilleux'&&RX('Bottes|Chaussons|Sandales|Cape|Manteau|Gants|Gantelets|Robe|Ceinture|Chapeau|Bandeau|Bracelets|Masque|Casque|Capuche|Écharpe|Voile').test(o.n),
  cour:e=>/(V[êe]tements|^Robe|^Costume|^Sac|^Bourse|^Couverture|cordonnier|travailleur du cuir|tisserand|^Parfum)/i.test(e.n)},
 {id:'alchimiste',nom:'Alchimiste',d:'Potions, huiles, élixirs, poussières et ingrédients.',q:[6,12,9,4,1],
  mag:o=>(o.t==='Potion'||RX('Huile|Élixir|Philtre|Poussière|Onguent|Baume|Pigments|Fiole|Sels').test(o.n))&&!/^Potion de soins/.test(o.n),
  cour:e=>/(Acide|Antitoxine|Feu grégeois|Eau bénite|Potion|Poison|Fiole|Bouteille|alchimiste|herboriste|empoisonneur|Parfum|Composants)/i.test(e.n)},
 {id:'magie',nom:'Boutique de magie',d:'Baguettes, bâtons, sceptres, anneaux, objets merveilleux et parchemins.',q:[8,15,10,10,3],
  mag:o=>/^(Baguette|Bâton|Sceptre|Anneau|Objet merveilleux|Parchemin)$/.test(o.t),scr:[],
  cour:e=>/(Focalisation arcanique|Livre de sorts|Composants|Parchemin de sort)/i.test(e.n)},
 {id:'joaillier',nom:'Joaillier',d:'Anneaux, amulettes, colliers, broches, pierres précieuses et gemmes.',q:[3,7,6,3,2],
  mag:o=>o.t==='Anneau'||(o.t==='Objet merveilleux'&&RX('Amulette|Collier|Broche|Médaillon|Pierre|Gemme|Perle|Diadème|Couronne|Bracelets|Talisman|Scarabée|Joyau').test(o.n)),
  cour:e=>/(joaillier|^Loupe|Symbole sacré \(amulette\))/i.test(e.n),gemmes:true},
 {id:'libraire',nom:'Libraire et scribe',d:'Livres, manuels, cartes, matériel d’écriture et parchemins de sort.',q:[9,9,6,3,1],
  mag:o=>o.t==='Objet merveilleux'&&RX('Livre|Manuel|Tome|Grimoire|Codex|Traité|Plume|Carte|Recueil').test(o.n)&&!/^Cartes merveilleuses/.test(o.n),scr:[],
  cour:e=>/(^Livre|^Papier|^Parchemin \(|^Encre|^Plume|^Carte|^Étui|calligraphe|cartographe|contrefaçon)/i.test(e.n)},
 {id:'temple',nom:'Temple',d:'Articles religieux, soins, eau bénite et parchemins de sorts divins.',q:[6,7,4,1,0],
  mag:o=>/^Potion de soins/.test(o.n)||RX('Amulette du dévot|Encensoir du dévot|Collier de prière|Talisman du bien|Eau|Perle de pouvoir|Scarabée de protection').test(o.n),scr:['Clerc','Paladin'],
  cour:e=>/(Symbole sacré|Eau bénite|Trousse de soins|Antitoxine|herboriste|Potion de guérison|Chandelle|Encens)/i.test(e.n)},
 {id:'ecurie',nom:'Écurie et charron',d:'Montures, selles, chariots et barques ; quelques objets magiques pour les montures.',q:[1,3,3,2,0],
  mag:o=>RX('Fer|Fers|Figurine merveilleuse|Selle|Bride').test(o.n),
  cour:e=>e.t==='Monture et véhicule'&&e.po<1000&&!/^Écurie/.test(e.n)},
 {id:'musique',nom:'Luthier',d:'Instruments de musique, ordinaires et magiques.',q:[1,4,4,1,1],
  mag:o=>RX('Instrument|Flûte|Lyre|Luth|Harpe|Tambour|Cor |Cornemuse|Mandoline|Cithare|Carillon|Lyre').test(o.n),
  cour:e=>/Instruments de musique/.test(e.c||'')},
 {id:'bazar',nom:'Bazar d’aventurier',d:'Matériel d’aventure, paquetages, outils, jeux et quelques babioles magiques.',q:[6,4,1,0,0],
  mag:o=>o.t==='Objet merveilleux',
  cour:e=>/^(Équipement d’aventurier|Outil|Paquetage)$/.test(e.t)&&!/Potion|Poison|Parchemin de sort|Focalisation|Livre de sorts/.test(e.n)}
];
const GEMMES=[['Azurite',10],['Hématite',10],['Malachite',10],['Turquoise',10],['Cornaline',50],['Jaspe',50],['Onyx',50],['Pierre de lune',50],['Ambre',100],['Améthyste',100],['Grenat',100],['Perle',100],['Jade',100],['Aigue-marine',500],['Perle noire',500],['Topaze',500],['Opale noire',1000],['Émeraude',1000],['Saphir bleu',1000],['Diamant',5000],['Rubis',5000],['Saphir étoilé',5000]];

let OBJ=[],EQ=[],SP=[],data={liste:[],cur:null};
const estMJ=()=>{const c=Persos.current();return !!c&&c.nom.trim().toLowerCase()==='mj'};
// Rareté principale d'un objet (la première citée quand elle varie) ; null pour les artefacts et les raretés non précisées
function rar(q){
  const s=String(q||'').toLowerCase().replace(/^variable \(/,'');
  if(s.startsWith('peu courant'))return 1;if(s.startsWith('très rare'))return 3;
  if(s.startsWith('courant'))return 0;if(s.startsWith('rare'))return 2;if(s.startsWith('légendaire'))return 4;
  return null;
}
const conso=o=>/^(Potion|Parchemin|Munition)$/.test(o.t)||/consomm/i.test(o.h||'');
const varie=(p,on)=>{if(!on)return p;const v=p*(.8+rnd(.4));return v>=1000?Math.round(v/50)*50:v>=100?Math.round(v/5)*5:Math.max(1,Math.round(v))};

function generer(){
  const T=TYPES.find(t=>t.id===$('#type').value),S=TAILLES[$('#taille').value],vp=$('#varp').checked;
  // Réserve d'objets magiques par rareté, parchemins de sort compris
  const pool=[[],[],[],[],[]];
  OBJ.forEach(o=>{const r=rar(o.q);if(r!=null&&T.mag(o)&&!/maudit/i.test(o.n))pool[r].push({n:o.n,t:o.t,r,base:PRIX[r]/(conso(o)?2:1),k:'o'})});
  if(T.scr)SP.forEach(s=>{
    if(T.scr.length&&!s.c.some(c=>T.scr.includes(c)))return;
    const r=SCR_R[s.l],nom=s.n.split('|')[0];
    pool[r].push({n:'Parchemin de sort : '+nom,t:'Parchemin ('+(s.l?'niveau '+s.l:'tour de magie')+')',r,base:s.l<2?SCR_P[s.l]:PRIX[r]/2,k:'s',ref:s.n});
  });
  const items=[];
  T.q.forEach((q,r)=>{
    if(!q||r>S.max)return;
    const n=Math.round(q*S.f*(.75+rnd(.5)));
    pick(pool[r],n).forEach(o=>items.push({...o,po:varie(o.base,vp),qty:o.t.startsWith('Potion')||o.k==='s'||o.t==='Munition'?ri(1,3):1}));
  });
  items.sort((a,b)=>a.r-b.r||a.n.localeCompare(b.n,'fr'));
  // Marchandise courante : une partie du catalogue selon la taille de la localité
  const cp=EQ.filter(T.cour);
  const cour=pick(cp,Math.max(Math.min(cp.length,4),Math.min(40*S.c,Math.round(cp.length*S.c*(.8+rnd(.2)))))).map(e=>({n:e.n,t:e.c||e.t,k:'e',p:e.p,po:e.po,
    qty:e.t==='Monture et véhicule'?ri(1,3):e.po<=1?ri(5,20):e.po<=50?ri(1,6):ri(1,2)}));
  if(T.gemmes)pick(GEMMES.filter(g=>g[1]<=[50,500,1000,5000,5000][S.max]),Math.round(GEMMES.length*S.c*.7)).forEach(g=>cour.push({n:g[0],t:'Pierre précieuse',k:'g',p:nb(g[1])+' po',po:g[1],qty:ri(1,4)}));
  cour.sort((a,b)=>a.t.localeCompare(b.t,'fr')||a.po-b.po);
  const shop={id:'b'+Date.now().toString(36),nom:T.nom+' ('+S.nom.toLowerCase()+')',type:T.id,taille:$('#taille').value,magie:items,courant:cour};
  data.liste.unshift(shop);data.liste=data.liste.slice(0,20);data.cur=shop.id;
  Persos.save();render();
  msg('Inventaire généré : '+items.length+' objet'+(items.length>1?'s':'')+' magique'+(items.length>1?'s':''));
}

function detail(it){
  if(it.k==='o'){const o=OBJ.find(x=>x.n===it.n);return o?o.h:''}
  if(it.k==='s'){const s=SP.find(x=>x.n===it.ref);return s?'<b>'+(s.l?'Niveau '+s.l:'Tour de magie')+', '+esc(s.e)+'.</b> '+s.h:''}
  if(it.k==='e'){const e=EQ.find(x=>x.n===it.n);return e?e.h||'':''}
  return '';
}
function ligne(it,i,sec){
  const out=!it.qty,h=detail(it);
  const prix=it.k==='e'||it.k==='g'?esc(it.p):nb(it.po)+' po'+(it.po!==it.base?'<s>'+nb(it.base)+'</s>':'');
  return `<details class="it ${it.k==='o'||it.k==='s'?'r'+it.r:'rc'}${out?' out':''}"><summary><span class="nm">${esc(it.n)}<small>${esc(it.t)}${it.k==='o'||it.k==='s'?' · '+RN[it.r]:''}</small></span>
<span class="pr">${prix}</span><span class="qt">${out?'Épuisé':'Stock : '+it.qty}</span>${out?'':`<button type="button" class="sold" data-sec="${sec}" data-i="${i}">Vendu</button>`}</summary>${h?'<div class="h">'+h+'</div>':''}</details>`;
}
function render(){
  const mj=estMJ();
  $('#lock').hidden=mj;$('#mj').hidden=!mj;$('#bPrint').hidden=!mj;
  if(!mj||!OBJ.length)return;
  $('#saved').innerHTML=data.liste.length?'<span>Boutiques enregistrées :</span>'+data.liste.map(s=>`<span class="sv" aria-current="${s.id===data.cur}"><button type="button" data-open="${s.id}">${esc(s.nom)}</button><button type="button" class="x" data-del="${s.id}" aria-label="Supprimer ${esc(s.nom)}" title="Supprimer">×</button></span>`).join(''):'';
  const s=data.liste.find(x=>x.id===data.cur);
  if(!s){$('#shop').innerHTML='<section class="panel empty">Choisis un type de boutique puis touche « Générer l’inventaire ».</section>';return}
  const cnt=RN.map((n,r)=>[n,s.magie.filter(x=>x.r===r).length]).filter(x=>x[1]);
  const T=TYPES.find(t=>t.id===s.type)||{};
  $('#shop').innerHTML=`<section class="panel shop"><div class="shead"><input id="snom" value="${esc(s.nom)}" aria-label="Nom de la boutique"><small>${esc(T.nom||'')} · ${esc((TAILLES[s.taille]||{}).nom||'')}</small></div>
<div class="sum">${cnt.map(([n,c])=>`<span class="r${RN.indexOf(n)}" style="background:var(--k)">${c} ${n.toLowerCase()}${c>1?'s':''}</span>`).join('')}${s.courant.length?`<span class="rc" style="background:var(--k)">${s.courant.length} article${s.courant.length>1?'s':''} courant${s.courant.length>1?'s':''}</span>`:''}</div>
${s.magie.length?`<div class="sec"><h2 style="--k:#7a4fc4">Objets magiques</h2>${s.magie.map((it,i)=>ligne(it,i,'magie')).join('')}</div>`:''}
${s.courant.length?`<div class="sec"><h2 style="--k:#9a8f7a">Marchandise courante</h2>${s.courant.map((it,i)=>ligne(it,i,'courant')).join('')}</div>`:''}
${!s.magie.length&&!s.courant.length?'<p class="empty">Rien en stock.</p>':''}</section>`;
}
$('#type').onchange=()=>{const T=TYPES.find(t=>t.id===$('#type').value);$('#tdesc').textContent=T.d+' En grande ville : '+T.q.map((n,r)=>n+' '+RN[r].toLowerCase()).filter(x=>!x.startsWith('0')).join(', ')+' (environ deux tiers en ville, un tiers dans un bourg, un quart dans un village ; pas de légendaire hors des grandes villes, ni de très rare au village).'};
$('#bGen').onclick=generer;
$('#saved').onclick=e=>{
  const o=e.target.dataset.open,d=e.target.dataset.del;
  if(o){data.cur=o;Persos.save();render()}
  if(d){const s=data.liste.find(x=>x.id===d);if(!s||!confirm('Supprimer « '+s.nom+' » ?'))return;
    data.liste=data.liste.filter(x=>x.id!==d);if(data.cur===d)data.cur=data.liste[0]?data.liste[0].id:null;Persos.save();render();msg('Boutique supprimée')}
};
$('#shop').addEventListener('click',e=>{
  const b=e.target.closest('.sold');if(!b)return;e.preventDefault();
  const s=data.liste.find(x=>x.id===data.cur),it=s&&s[b.dataset.sec][b.dataset.i];if(!it)return;
  it.qty--;Persos.save();render();msg('« '+it.n+' » vendu'+(it.qty?' (reste '+it.qty+')':' : épuisé'));
});
$('#shop').addEventListener('input',e=>{if(e.target.id!=='snom')return;const s=data.liste.find(x=>x.id===data.cur);if(s){s.nom=e.target.value;Persos.save()}});
$('#shop').addEventListener('change',e=>{if(e.target.id==='snom')render()});
$('#bPrint').onclick=()=>window.print();

Persos.init({part:'boutiques',mount:$('#persos'),msg,
  collect:()=>({version:1,type:'boutiques-dnd-5e',data}),
  apply:o=>{const d=o&&o.data;data=d&&Array.isArray(d.liste)?{liste:d.liste,cur:d.cur}:{liste:[],cur:null};render()},
  onName:render});
TYPES.forEach(t=>$('#type').add(new Option(t.nom,t.id)));$('#type').onchange();
Promise.all(['assets/json/vf/objets.json','assets/json/vf/equipement.json','assets/json/vf/spells.json'].map(f=>fetch(f).then(r=>r.json()))).then(([o,e,s])=>{OBJ=o;EQ=e;SP=s;render()})
  .catch(()=>{$('#shop').innerHTML='<section class="panel empty">Impossible de charger les objets.</section>'});
