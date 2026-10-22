const $=s=>document.querySelector(s);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',4000)};
const nb=n=>n.toLocaleString('fr-FR',{maximumFractionDigits:2});
const rnd=n=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296*n};
const ri=(a,b)=>a+Math.floor(rnd(b-a+1));
const un=l=>l[Math.floor(rnd(l.length))];
const dice=(n,f)=>{let s=0;for(let i=0;i<n;i++)s+=ri(1,f);return s};

const RN=['Courant','Peu courant','Rare','Très rare','Légendaire'];
const PRIX=[100,400,4000,40000,200000];
const SCR_R=[0,0,1,1,2,2,3,3,3,4],SCR_P=[30,50];
const FPS=['0','1/8','1/4','1/2',...Array.from({length:30},(_,i)=>String(i+1))];
const fpVal=s=>s.includes('/')?1/+s.split('/')[1]:+s;

/* Tranches de FP.
   ind : trésor individuel d'une créature [nombre de dés, faces, multiplicateur, pièce] ;
   mag : magot [dés, faces, multiplicateur] en PO, part en pièces (le reste en gemmes et objets d'art), nombre d'objets magiques [dés, faces, modificateur] ;
   rar : chances (sur 100) de chaque rareté pour un objet magique [courant, peu courant, rare, très rare, légendaire] ;
   gem/art : valeurs possibles des pierres précieuses et objets d'art */
const TR=[
 {max:4,t:'FP 0 à 4',ind:[3,6,1,'po'],mag:[2,4,100],obj:[1,4,-1],rar:[54,37,9,0,0],gem:[10,50],art:[25]},
 {max:10,t:'FP 5 à 10',ind:[2,8,10,'po'],mag:[8,10,100],obj:[1,3,0],rar:[30,51,17,2,0],gem:[50,100,500],art:[25,250]},
 {max:16,t:'FP 11 à 16',ind:[2,10,10,'pp'],mag:[8,8,1000],obj:[1,4,0],rar:[11,23,36,23,7],gem:[500,1000],art:[250,750]},
 {max:99,t:'FP 17 et plus',ind:[2,8,100,'pp'],mag:[6,10,10000],obj:[1,6,0],rar:[0,6,30,40,24],gem:[1000,5000],art:[2500,7500]}
];
const tranche=fp=>TR.find(t=>fp<=t.max);

const GEMMES={
 10:['Agate rubanée','Azurite','Hématite','Lapis-lazuli','Malachite','Obsidienne','Quartz bleu','Rhodochrosite','Œil-de-tigre','Turquoise'],
 50:['Calcédoine','Chrysoprase','Cornaline','Citrine','Jaspe','Pierre de lune','Onyx','Quartz étoilé','Sardonyx','Zircon'],
 100:['Ambre','Améthyste','Chrysobéryl','Corail','Grenat','Jade','Jais','Perle','Spinelle','Tourmaline'],
 500:['Alexandrite','Aigue-marine','Perle noire','Spinelle bleu','Péridot','Topaze'],
 1000:['Opale noire','Saphir bleu','Émeraude','Opale de feu','Opale','Rubis étoilé','Saphir étoilé','Saphir jaune'],
 5000:['Saphir noir','Diamant','Jacinthe','Rubis']
};
const ARTS={
 25:['Aiguière en argent','Statuette en os sculpté','Petit bracelet en or','Vêtements de cérémonie brodés de fil d’or','Masque de velours noir cousu de fil d’argent','Calice en cuivre filigrané d’argent','Paire de dés en os gravés','Petit miroir dans un cadre en bois peint','Mouchoir de soie brodé','Médaillon en or contenant un portrait'],
 250:['Anneau en or serti de pierres de sang','Statuette en ivoire sculpté','Grand bracelet en or','Collier en argent avec pendentif en pierre précieuse','Couronne en bronze','Robe de soie brodée de fil d’or','Grande tapisserie de belle facture','Chope en laiton incrustée de jade','Boîte de figurines animales en turquoise','Cage à oiseaux en or filigrané d’électrum'],
 750:['Calice en argent serti de pierres de lune','Épée longue plaquée d’argent, jais sur la poignée','Harpe en bois exotique incrustée d’ivoire et de zircons','Petite idole en or','Peigne en or en forme de dragon aux yeux de grenat','Bouchon de bouteille ciselé d’or et serti d’améthystes','Dague de cérémonie en électrum, perle noire au pommeau','Broche en argent et or','Statuette en obsidienne avec ornements en or','Masque de guerre en or peint'],
 2500:['Fine chaîne en or sertie d’une opale de feu','Peinture de maître ancienne','Manteau de soie et de velours brodé de pierres de lune','Bracelet en platine serti d’un saphir','Gant brodé serti d’éclats de joyaux','Bracelet de cheville incrusté de joyaux','Boîte à musique en or','Diadème en or serti de quatre aigues-marines','Cache-œil avec un faux œil en saphir et pierre de lune','Collier de petites perles roses'],
 7500:['Couronne en or incrustée de joyaux','Anneau en platine incrusté de joyaux','Petite statuette en or sertie de rubis','Coupe en or sertie d’émeraudes','Coffret à bijoux en or filigrané de platine','Sarcophage d’enfant en or peint','Plateau de jeu en jade avec des pièces en or massif','Corne à boire en ivoire incrustée d’or et de joyaux']
};

const THEMES=[
 {id:'',nom:'Tous les types'},
 {id:'arm',nom:'Armes, armures, munitions',f:t=>/^(Arme|Armure|Munition)$/.test(t)},
 {id:'conso',nom:'Potions et parchemins',f:t=>/^(Potion|Parchemin)/.test(t)},
 {id:'arc',nom:'Anneaux, baguettes, bâtons, sceptres',f:t=>/^(Anneau|Baguette|Bâton|Sceptre)$/.test(t)},
 {id:'merv',nom:'Objets merveilleux',f:t=>t==='Objet merveilleux'}
];

let OBJ=[],SP=[],POOL=null,data={liste:[],cur:null};
const estMJ=()=>{const c=Persos.current();return !!c&&c.nom.trim().toLowerCase()==='mj'};
function rar(q){
  const s=String(q||'').toLowerCase().replace(/^variable \(/,'');
  if(s.startsWith('peu courant'))return 1;if(s.startsWith('très rare'))return 3;
  if(s.startsWith('courant'))return 0;if(s.startsWith('rare'))return 2;if(s.startsWith('légendaire'))return 4;
  return null;
}
const conso=o=>/^(Potion|Parchemin|Munition)$/.test(o.t)||/consomm/i.test(o.h||'');
// Réserve des objets magiques par rareté (objets maudits exclus), parchemins de sort compris
function pool(){
  if(POOL)return POOL;
  POOL=[[],[],[],[],[]];
  OBJ.forEach(o=>{const r=rar(o.q);if(r!=null&&!/maudit/i.test(o.n))POOL[r].push({n:o.n,t:o.t,r,po:PRIX[r]/(conso(o)?2:1),k:'o'})});
  SP.forEach(s=>{const r=SCR_R[s.l];POOL[r].push({n:'Parchemin de sort : '+s.n.split('|')[0],t:'Parchemin ('+(s.l?'niveau '+s.l:'tour de magie')+')',r,po:s.l<2?SCR_P[s.l]:PRIX[r]/2,k:'s',ref:s.n})});
  return POOL;
}
function rareteAuHasard(T){let x=rnd(100);for(let r=0;r<5;r++){x-=T.rar[r];if(x<0)return r}return 4}
function objet(r,theme){
  const P=pool(),f=(THEMES.find(t=>t.id===theme)||{}).f;
  // Si le thème n'a rien dans cette rareté, on prend n'importe quel objet de la rareté
  let l=f?P[r].filter(o=>f(o.t)):P[r];if(!l.length)l=P[r];
  return {...un(l)};
}
// Pierres précieuses ou objets d'art pour une valeur donnée : un seul type de pièce par lot, regroupé par nom
function bijoux(val,vals,LIST){
  const v=vals.filter(x=>x<=val);if(!v.length)return [];
  const u=un(v),n=Math.max(1,Math.min(12,Math.round(val/u))),m={};
  for(let i=0;i<n;i++){const k=un(LIST[u]);m[k]=(m[k]||0)+1}
  return Object.entries(m).map(([n,q])=>({n,q,po:u}));
}
function pieces(po,main){
  // Répartit une somme en PO entre plusieurs pièces, la plus grosse part dans la pièce principale
  const c={pc:0,pa:0,po:0,pp:0};
  if(main==='pp'){c.pp=Math.floor(po*.8/10);po-=c.pp*10}
  else if(po>=2000){c.pp=Math.floor(po*.25/10);po-=c.pp*10}
  c.pa=Math.min(Math.floor(po*10*.1),ri(20,300));c.pc=po<200?ri(0,99):0;c.po=Math.max(0,Math.round(po-c.pa/10-c.pc/100));
  return c;
}

function generer(){
  if(!OBJ.length)return;
  const fps=$('#fp').value,fp=fpVal(fps),T=tranche(fp),mode=$('#mode').value,theme=$('#theme').value;
  const L={id:'l'+Date.now().toString(36),fp:fps,mode,theme,grp:+$('#grp').value||5,pieces:{pc:0,pa:0,po:0,pp:0},gemmes:[],arts:[],objets:[]};
  if(mode==='ind'){
    const n=Math.max(1,Math.min(50,+$('#nb').value||1)),[d,f,x,p]=T.ind;
    for(let i=0;i<n;i++)L.pieces[p]+=dice(d,f)*x;
    L.nom='Trésor de '+n+' créature'+(n>1?'s':'')+' (FP '+fps+')';
  }else{
    const [d,f,x]=T.mag,tot=dice(d,f)*x,part=tot*(.5+rnd(.25));
    L.pieces=pieces(Math.round(part),T.ind[3]);
    const reste=tot-part,g=reste*(.4+rnd(.3));
    L.gemmes=bijoux(g,T.gem,GEMMES);L.arts=bijoux(reste-g,T.art,ARTS);
    const [od,of,om]=T.obj,no=Math.max(0,dice(od,of)+om);
    for(let i=0;i<no;i++)L.objets.push(objet(rareteAuHasard(T),theme));
    L.objets.sort((a,b)=>a.r-b.r||a.n.localeCompare(b.n,'fr'));
    L.nom='Magot (FP '+fps+')';
  }
  data.liste.unshift(L);data.liste=data.liste.slice(0,20);data.cur=L.id;
  Persos.save();render();
  msg('Butin tiré : '+nb(valeur(L))+' po en tout');
}
const valeurPieces=c=>c.pc/100+c.pa/10+c.po+c.pp*10;
const valeur=L=>valeurPieces(L.pieces)+L.gemmes.reduce((s,g)=>s+g.q*g.po,0)+L.arts.reduce((s,g)=>s+g.q*g.po,0)+L.objets.reduce((s,o)=>s+o.po,0);

function detail(it){
  if(it.k==='o'){const o=OBJ.find(x=>x.n===it.n);return o?o.h:''}
  if(it.k==='s'){const s=SP.find(x=>x.n===it.ref);return s?'<b>'+(s.l?'Niveau '+s.l:'Tour de magie')+', '+esc(s.e)+'.</b> '+s.h:''}
  return '';
}
function render(){
  const mj=estMJ();
  $('#lock').hidden=mj;$('#mj').hidden=!mj;$('#bPrint').hidden=!mj;
  if(!mj)return;
  $('#saved').innerHTML=data.liste.length?'<span>Butins enregistrés :</span>'+data.liste.map(s=>`<span class="sv" aria-current="${s.id===data.cur}"><button type="button" data-open="${s.id}">${esc(s.nom)}</button><button type="button" class="x" data-del="${s.id}" aria-label="Supprimer ${esc(s.nom)}" title="Supprimer">×</button></span>`).join(''):'';
  const L=data.liste.find(x=>x.id===data.cur);
  if(!L){$('#loot').innerHTML='<section class="panel empty">Choisis le FP et le type de trésor, puis touche « Tirer le butin ».</section>';return}
  const v=valeur(L),c=L.pieces,T=tranche(fpVal(L.fp));
  const coins=[['pp','platine'],['po','or'],['pa','argent'],['pc','cuivre']].filter(([k])=>c[k]).map(([k,n])=>`<span class="coin"><b>${nb(c[k])}</b> ${k} <small>(${n})</small></span>`).join('');
  const lot=(l,cls,t)=>l.map(g=>`<div class="it plain ${cls}"><summary><span class="nm">${g.q>1?g.q+' × ':''}${esc(g.n)}<small>${t} · ${nb(g.po)} po pièce</small></span><span class="pr">${nb(g.q*g.po)} po</span></summary></div>`).join('');
  $('#loot').innerHTML=`<section class="panel loot"><div class="lhead"><input id="lnom" value="${esc(L.nom)}" aria-label="Nom du butin"><small>${esc(T.t)} · ${L.mode==='ind'?'trésor individuel':'magot'}</small></div>
<div class="tot"><span>Valeur totale : <b>${nb(Math.round(v))} po</b></span><span>Part de chacun (${L.grp} aventurier${L.grp>1?'s':''}) : <b>${nb(Math.floor(v/L.grp))} po</b></span></div>
${coins?`<div class="sec rc"><h2>Pièces</h2><div class="coins">${coins}</div></div>`:''}
${L.gemmes.length?`<div class="sec rg"><h2>Pierres précieuses</h2>${lot(L.gemmes,'rg','Pierre précieuse')}</div>`:''}
${L.arts.length?`<div class="sec ra"><h2>Objets d’art</h2>${lot(L.arts,'ra','Objet d’art')}</div>`:''}
${L.objets.length?`<div class="sec r3"><h2>Objets magiques</h2>${L.objets.map((it,i)=>{const h=detail(it);return `<details class="it r${it.r}"><summary><span class="nm">${esc(it.n)}<small>${esc(it.t)} · ${RN[it.r]}</small></span><span class="pr">${nb(it.po)} po</span><button type="button" class="rr" data-i="${i}" title="Tirer un autre objet de même rareté">↻ Autre</button></summary>${h?'<div class="h">'+h+'</div>':''}</details>`}).join('')}</div>`:(L.mode==='mag'?'<p class="empty">Pas d’objet magique dans ce magot.</p>':'')}
</section>`;
}
function desc(){
  const fps=$('#fp').value,T=tranche(fpVal(fps)),ind=$('#mode').value==='ind',[d,f,x,p]=T.ind,[md,mf,mx]=T.mag,[od,of,om]=T.obj;
  $('#lnb').hidden=!ind;
  $('#tdesc').textContent=T.t+' : '+(ind
    ?d+'d'+f+(x>1?' × '+nb(x):'')+' '+p+' par créature.'
    :md+'d'+mf+' × '+nb(mx)+' po en pièces, pierres précieuses et objets d’art, et '+od+'d'+of+(om?' − '+(-om):'')+' objets magiques ('+T.rar.map((n,r)=>n?n+' % '+RN[r].toLowerCase():'').filter(Boolean).join(', ')+').');
}

$('#fp').innerHTML=FPS.map(f=>`<option${f==='3'?' selected':''}>${f}</option>`).join('');
$('#theme').innerHTML=THEMES.map(t=>`<option value="${t.id}">${esc(t.nom)}</option>`).join('');
$('#fp').onchange=$('#mode').onchange=desc;desc();
$('#bGen').onclick=generer;
$('#saved').addEventListener('click',e=>{
  const o=e.target.closest('[data-open]'),d=e.target.closest('[data-del]');
  if(o){data.cur=o.dataset.open;Persos.save();render()}
  if(d){const s=data.liste.find(x=>x.id===d.dataset.del);if(!s||!confirm('Supprimer « '+s.nom+' » ?'))return;
    data.liste=data.liste.filter(x=>x!==s);if(data.cur===s.id)data.cur=data.liste[0]&&data.liste[0].id||null;Persos.save();render();msg('« '+s.nom+' » supprimé')}
});
$('#loot').addEventListener('click',e=>{
  const b=e.target.closest('.rr');if(!b)return;e.preventDefault();
  const L=data.liste.find(x=>x.id===data.cur);if(!L)return;
  const old=L.objets[+b.dataset.i];if(!old)return;
  L.objets[+b.dataset.i]=objet(old.r,L.theme);Persos.save();render();
  const nb2=$(`#loot .rr[data-i="${b.dataset.i}"]`);if(nb2)nb2.focus();
});
$('#loot').addEventListener('input',e=>{if(e.target.id!=='lnom')return;const L=data.liste.find(x=>x.id===data.cur);if(L){L.nom=e.target.value;Persos.save()}});
$('#loot').addEventListener('change',e=>{if(e.target.id==='lnom')render()});
$('#bPrint').onclick=()=>window.print();

Persos.init({part:'butin',mount:$('#persos'),msg,
  collect:()=>({version:1,type:'butin-dnd-5e',data}),
  apply:o=>{const d=o&&o.data;data=d&&Array.isArray(d.liste)?{liste:d.liste,cur:d.cur}:{liste:[],cur:null};render()},
  onName:render});
Promise.all(['assets/json/vf/objets.json','assets/json/vf/spells.json'].map(f=>fetch(f).then(r=>r.json()))).then(([o,s])=>{OBJ=o;SP=s;POOL=null;render()})
  .catch(()=>{$('#loot').innerHTML='<section class="panel empty">Impossible de charger les objets.</section>'});
