const $=s=>document.querySelector(s);
const M=Monstres,esc=M.esc,fr=n=>n.toLocaleString('fr-FR');
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',6000)};
const DIFF=[['Faible','#2e9e5b'],['Modérée','#d8791a'],['Élevée','#c8402f']];
const KEY='dnd_rencontre_v1';
let S={g:[],e:[]};
const open=new Set();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.g)&&Array.isArray(s.e))S=s}catch(e){}}
const lvlOpts=v=>Array.from({length:20},(_,i)=>`<option${i+1===v?' selected':''}>${i+1}</option>`).join('');
const budget=()=>[0,1,2].map(k=>S.g.reduce((s,p)=>s+M.BUDGET[p.niv][k],0));
const avgLvl=()=>S.g.length?S.g.reduce((s,p)=>s+p.niv,0)/S.g.length:1;
function fromPJ(quiet){
  const J=M.joueurs();
  if(!J.length){if(!quiet)msg('Aucun personnage joueur : saisis le groupe dans le suivi de combat ou crée leurs fiches');return false}
  S.g=J.map(j=>({nom:j.nom,niv:j.niveau}));return true;
}

function renderGroup(){
  $('#grp').innerHTML=S.g.map((p,i)=>`<span class="pj"><input data-i="${i}" data-f="nom" value="${esc(p.nom)}" aria-label="Nom"><select data-i="${i}" data-f="niv" aria-label="Niveau">${lvlOpts(p.niv)}</select><button data-del="${i}" title="Retirer" aria-label="Retirer ${esc(p.nom)}">✕</button></span>`).join('')||'<span class="empty">Ajoute au moins un personnage.</span>';
  const B=budget();
  $('#bud').innerHTML=DIFF.map(([n,k],i)=>`<div style="--k:${k}"><span>Difficulté ${n.toLowerCase()}</span><b>${fr(B[i])} PX</b></div>`).join('');
}
function renderEnc(){
  const B=budget(),rows=S.e.map((x,i)=>({x,i,m:M.get(x.n)})).filter(r=>r.m);
  const tot=rows.reduce((s,r)=>s+M.xp(r.m)*r.x.q,0),cnt=rows.reduce((s,r)=>s+r.x.q,0);
  if(!rows.length){$('#enc').innerHTML='<p class="empty">Aucun monstre pour l’instant. Ajoute-en ci-dessus ou choisis une rencontre proposée plus bas.</p>';$('#send').hidden=true;return}
  $('#send').hidden=false;
  let lv=-1;B.forEach((b,i)=>{if(tot>=b)lv=i});
  const top=Math.max(B[2]*1.25,tot),pct=v=>Math.min(100,v/top*100);
  const verdict=tot>B[2]?['Au-delà du budget « élevé » : rencontre potentiellement mortelle','#8b1e3f']:lv<0?['Sous le budget « faible » : rencontre très facile','#5d6b7a']:['Difficulté '+DIFF[lv][0].toLowerCase(),DIFF[lv][1]];
  const al=avgLvl(),np=Math.max(1,S.g.length),W=[];
  rows.forEach(r=>{if(r.m.fpn>al)W.push(`${r.m.n} (FP ${r.m.fp}) a un FP supérieur au niveau moyen du groupe (${Math.round(al*10)/10}) : ses attaques peuvent mettre un personnage hors de combat d’un seul coup.`)});
  if(cnt>2*np)W.push(`${cnt} créatures pour ${np} personnage${np>1?'s':''} : au-delà de deux par personnage, le combat devient long et plus dangereux que ne l’indique le budget.`);
  $('#enc').innerHTML=`<table><thead><tr><th>Monstre</th><th class="n hm">FP</th><th class="n">PX</th><th class="n">Nombre</th><th class="n">Total</th></tr></thead><tbody>${rows.map(({x,i,m})=>`<tr><td style="--c:${M.col(m)}"><button class="mn" data-open="${esc(m.n)}" aria-expanded="${open.has(m.n)}">${esc(m.n)}</button><small>${esc(m.tail)} · ${esc(m.typ)} · CA ${esc(m.ca)} · PV ${M.pv(m).moy}</small></td><td class="n hm">${esc(m.fp)}</td><td class="n">${fr(M.xp(m))}</td><td class="n"><span class="qty"><button data-q="${i}" data-d="-1" aria-label="Un de moins">−</button><b>${x.q}</b><button data-q="${i}" data-d="1" aria-label="Un de plus">+</button></span></td><td class="n"><b>${fr(M.xp(m)*x.q)}</b></td></tr>${open.has(m.n)?`<tr class="det"><td colspan="5">${M.block(m)}</td></tr>`:''}`).join('')}</tbody></table>
  <div class="tot">Total : <b>${fr(tot)} PX</b> pour ${cnt} créature${cnt>1?'s':''}${S.g.length?` · ${fr(Math.floor(tot/np))} PX par personnage`:''}</div>
  <div class="gauge" style="--gc:${verdict[1]}"><i style="width:${pct(tot)}%"></i>${B.map((b,i)=>`<span style="left:${pct(b)}%">${DIFF[i][0]}</span>`).join('')}</div>
  <div class="verdict" style="--gc:${verdict[1]}">${verdict[0]}</div><div class="warn">${W.map(esc).join('<br>')}</div>`;
}
function render(){
  const mj=M.estMJ();
  $('#lock').hidden=mj;$('#mj').hidden=!mj;$('#lComb').hidden=!mj;
  if(!mj)return;
  renderGroup();renderEnc();
}
function findM(v){
  const n=M.norm(v);if(!n)return null;
  const A=M.all();
  return A.find(m=>M.norm(m.n)===n||M.norm(m.en)===n)||A.find(m=>M.norm(m.n).startsWith(n))||A.find(m=>(' '+m.idx).includes(' '+n))||A.find(m=>m.idx.includes(n));
}
function addE(n,q){const x=S.e.find(e=>e.n===n);if(x)x.q=Math.min(30,x.q+q);else S.e.push({n,q})}

$('#grp').addEventListener('change',e=>{const i=+e.target.dataset.i,f=e.target.dataset.f;if(!S.g[i])return;S.g[i][f]=f==='niv'?+e.target.value:e.target.value;save();render()});
$('#grp').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;S.g.splice(+b.dataset.del,1);save();render()});
$('#bAddPJ').onclick=()=>{const l=S.g.length?S.g[S.g.length-1].niv:1;S.g.push({nom:'Personnage '+(S.g.length+1),niv:l});save();render()};
$('#bPJ').onclick=()=>{if(fromPJ()){save();render();msg('Groupe repris des personnages joueurs (niveaux saisis dans le suivi de combat ou sur leur fiche)')}};
$('#allLvl').innerHTML+=lvlOpts(0);
$('#allLvl').onchange=e=>{const v=+e.target.value;if(!v)return;S.g.forEach(p=>p.niv=v);e.target.value='';save();render()};
$('#bAdd').onclick=()=>{
  const m=findM($('#aM').value);if(!m){msg('Monstre introuvable dans le bestiaire');return}
  addE(m.n,Math.min(30,Math.max(1,parseInt($('#aQ').value,10)||1)));$('#aM').value='';$('#aQ').value=1;save();render();
};
$('#aM').addEventListener('keydown',e=>{if(e.key==='Enter')$('#bAdd').click()});
$('#enc').addEventListener('click',e=>{
  const q=e.target.closest('[data-q]'),o=e.target.closest('[data-open]');
  if(q){const x=S.e[+q.dataset.q];x.q+=+q.dataset.d;if(x.q<1)S.e.splice(+q.dataset.q,1);save();render()}
  else if(o){const n=o.dataset.open;open.has(n)?open.delete(n):open.add(n);render()}
});
$('#bClear').onclick=()=>{S.e=[];open.clear();save();render()};
$('#bSend').onclick=()=>{
  if(!S.e.length)return;
  const mode=$('#pvMode').value;
  if(!M.envoyer(S.e.map(x=>({n:x.n,q:x.q,mode})))){msg('Impossible d’enregistrer la rencontre dans ce navigateur');return}
  location.href='suivi-combat.html';
};

// Propositions : un monstre seul, un groupe identique, ou un chef et ses sbires, dans le budget choisi
const pick=a=>a[M.rnd(a.length)];
function propose(){
  const k=+$('#sD').value,B=budget()[k],t=$('#sT').value,v=$('#sV').value,np=Math.max(1,S.g.length);
  if(!S.g.length){msg('Ajoute d’abord les personnages du groupe');return}
  const pool=M.all().filter(m=>M.xp(m)>=10&&(!t||M.tbase(m)===t)&&(!v||m.v===v));
  const inR=(lo,hi,arr=pool)=>arr.filter(m=>{const x=M.xp(m);return x>=lo&&x<=hi});
  const out=[],seen=new Set(),maxN=Math.min(8,2*np);
  for(let tries=0;tries<400&&out.length<6;tries++){
    const kind=pick(['solo','groupe','groupe','chef','chef']);let s=null;
    if(kind==='solo'){const c=inR(B*.6,B);if(c.length)s={t:'Un seul adversaire',l:[[pick(c),1]]}}
    else if(kind==='groupe'){const n=2+M.rnd(maxN-1),c=inR(B*.6/n,B/n);if(c.length&&n>=2)s={t:'Une bande',l:[[pick(c),n]]}}
    else{
      const c=inR(B*.35,B*.65);if(!c.length)continue;
      const L=pick(c),R=B-M.xp(L),n=2+M.rnd(Math.max(1,Math.min(6,maxN)-1));
      let mc=inR(R*.5/n,R/n).filter(m=>m!==L);const same=mc.filter(m=>M.tbase(m)===M.tbase(L));if(same.length)mc=same;
      if(mc.length)s={t:'Un chef et ses sbires',l:[[L,1],[pick(mc),n]]};
    }
    if(!s)continue;
    const key=s.l.map(([m,n])=>m.n+n).join('|');if(seen.has(key))continue;seen.add(key);
    s.px=s.l.reduce((a,[m,n])=>a+M.xp(m)*n,0);if(s.px>B)continue;
    out.push(s);
  }
  window.SUG=out;
  $('#sugs').innerHTML=out.length?out.map((s,i)=>`<div class="sug" style="--k:${DIFF[k][1]}"><h3>${esc(s.t)}</h3><ul>${s.l.map(([m,n])=>`<li>${n>1?n+' × ':''}<b>${esc(m.n)}</b> <small>(FP ${esc(m.fp)}, ${fr(M.xp(m))} PX)</small></li>`).join('')}</ul><div class="px">${fr(s.px)} PX sur un budget de ${fr(B)}</div><button class="b" data-sug="${i}">Utiliser cette rencontre</button></div>`).join('')
    :'<p class="empty">Aucune combinaison trouvée avec ces filtres : essaie un autre type de créature ou une autre difficulté.</p>';
}
$('#bSug').onclick=propose;
$('#sugs').addEventListener('click',e=>{
  const b=e.target.closest('[data-sug]');if(!b)return;const s=window.SUG[+b.dataset.sug];
  S.e=s.l.map(([m,n])=>({n:m.n,q:n}));open.clear();save();render();
  $('#enc').scrollIntoView({behavior:'smooth',block:'center'});msg('Rencontre reprise : ajuste-la si besoin, puis lance le combat');
});

load();
let ready=false;
function boot(){
  render();
  if(ready||!M.estMJ())return;
  ready=true;
  if(!S.g.length&&!fromPJ(true))S.g=[1,2,3,4].map(i=>({nom:'Personnage '+i,niv:1}));
  save();
  M.load().then(db=>{
    $('#dlM').innerHTML=db.map(m=>`<option value="${esc(m.n)}">FP ${esc(m.fp)} · ${esc(m.typ)}</option>`).join('');
    const types=[...new Set(db.map(M.tbase))].sort((a,b)=>a.localeCompare(b,'fr'));
    $('#sT').innerHTML='<option value="">Tous</option>'+types.map(x=>`<option value="${esc(x)}">${esc(x[0].toUpperCase()+x.slice(1))}</option>`).join('');
    render();
  }).catch(()=>msg('Impossible de charger le bestiaire (bestiaire.json)'));
}
Persos.init({part:'rencontres',mount:$('#persos'),msg,collect:()=>null,apply:boot,onName:boot});
