const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const br=s=>esc(s).replace(/\n/g,'<br>');
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’‘`´]/g,"'").trim();
const CPLX=['','Simple','Intermédiaire','Exigeante'];
const dots=n=>'●'.repeat(n)+'○'.repeat(3-n);
const PB=n=>2+Math.floor((n-1)/4);
// Couleur des pastilles de source
const GC={'2024':'#2a3170','2014':'#b0632a','ps':'#12968f','tiers':'#8e3a9d'};
// Une ligne par niveau dans les listes « niv. 3 … ; niv. 5 … »
const lvlLines=s=>String(s).replace(/ ; (?=niv\. ?\d)/g,'\n');

let INFO=null,SC={},CAP={},CLD={},EMP={},DB=[],CL=[];
const st={q:'',r:'',s:'',c:'',open:new Set()};

// Source d'une sous-classe : classes_infos.json, sinon la mention en tête de sa première capacité
function source(cl,n,sc){
 const i=(INFO.sous[cl]||{})[n];
 if(i&&INFO.sources[i.src])return {l:INFO.sources[i.src][0],g:INFO.sources[i.src][1]};
 const d=((sc.feats||[])[0]||{}).desc||'';
 let m=/Sous-classe (?:homebrew )?de ([^.]+?) \(([^,)]+)(?:, contenu tiers)?\)/.exec(d);
 if(m)return {l:m[1]+' ('+m[2]+')',g:/contenu tiers/.test(d)?'tiers':'ps'};
 if(/Plane Shift/.test(d))return {l:'Plane Shift',g:'ps'};
 return {l:'',g:''};
}
function build(){
 CL=Object.keys(INFO.classes).filter(c=>SC[c]||CAP[c]);
 Object.keys(SC).forEach(c=>{if(!CL.includes(c)&&CAP[c])CL.push(c)});
 CL.sort((a,b)=>a.localeCompare(b,'fr'));
 DB=[];
 CL.forEach(cl=>{
  Object.entries(SC[cl]||{}).forEach(([n,sc])=>{
   const i=(INFO.sous[cl]||{})[n]||{};
   const src=source(cl,n,sc);
   const feats=sc.feats||[];
   DB.push({cl,n,sc,i,src,feats,r:i.r||[],c:i.c||0,
    idx:norm([n,cl,i.t||'',src.l,feats.map(f=>f.nom+' '+f.desc).join(' ')].join(' ')),
    nidx:norm(n+' '+(i.t||'')+' '+feats.map(f=>f.nom).join(' '))});
  });
 });
 const roles=[...new Set([...Object.values(INFO.classes).flatMap(c=>c.role||[]),...DB.flatMap(o=>o.r)])].sort((a,b)=>a.localeCompare(b,'fr'));
 $('#fr').innerHTML='<option value="">Tous</option>'+roles.map(r=>`<option>${esc(r)}</option>`).join('');
 $('#fs').innerHTML='<option value="">Toutes</option>'+Object.entries(INFO.groupes).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('');
 $('#fc').innerHTML='<option value="">Toutes</option>'+[1,2,3].map(n=>`<option value="${n}">${CPLX[n]}</option>`).join('');
}
const subOk=o=>(!st.r||o.r.includes(st.r))&&(!st.s||o.src.g===st.s)&&(!st.c||o.c===+st.c);
function classOk(cl){
 const k=INFO.classes[cl]||{};
 const q=norm(st.q);
 const own=(!st.r||(k.role||[]).includes(st.r))&&(!st.c||k.cplx===+st.c);
 const qOk=!q||norm(cl+' '+(k.pitch||'')+' '+(k.jeu||'')).includes(q)||(CAP[cl]||[]).some(f=>norm(f.nom).includes(q));
 return (own&&qOk&&!st.s)||DB.some(o=>o.cl===cl&&subOk(o)&&(!q||o.idx.includes(q)));
}
function subFiltered(cl){
 const q=norm(st.q);
 return DB.filter(o=>(!cl||o.cl===cl)&&subOk(o)&&(!q||o.idx.includes(q)||(cl&&norm(cl).includes(q))));
}

/* ---------- Vue d'ensemble ---------- */
function overview(){
 const cls=CL.filter(classOk);
 const q=norm(st.q),filt=q||st.r||st.s||st.c;
 const subs=filt?subFiltered(''):[];
 $('#cnt').textContent=cls.length+' classe'+(cls.length>1?'s':'')+(filt?' · '+subs.length+' sous-classe'+(subs.length>1?'s':'')+' trouvée'+(subs.length>1?'s':''):' · '+DB.length+' sous-classes');
 let h=cls.length?'<div class="grid">'+cls.map(cl=>{
  const k=INFO.classes[cl]||{},n=Object.keys(SC[cl]||{}).length;
  return `<a class="ccard" href="#${encodeURIComponent(cl)}" style="--c:${k.c||'#2a3170'}"><h3>${esc(cl)}${k.tiers?'<span class="pill" style="--pc:'+GC.tiers+'">tiers</span>':''}</h3><p>${esc(k.pitch||'')}</p>
   <div class="cm">${k.dv?'d'+k.dv+' · ':''}${esc(k.prim||'')}<br>${k.cplx?'<span class="dots" title="Difficulté">'+dots(k.cplx)+'</span> '+CPLX[k.cplx]+' · ':''}${n} sous-classe${n>1?'s':''}</div></a>`;
 }).join('')+'</div>':'<div class="empty-msg" style="margin-top:12px">Aucune classe ne correspond à ces filtres.</div>';
 if(filt)h+='<h2 class="sec">Sous-classes trouvées</h2>'+subList(subs,true);
 else h+='<p class="srcn" style="color:#cfd4f5">Choisis une classe pour lire sa présentation, des conseils de jeu, sa progression et toutes ses sous-classes. Textes reformulés à partir des règles 2024 : le livre fait foi.</p>';
 $('#view').innerHTML=h;
}

/* ---------- Fiche d'une classe ---------- */
function progression(cl,k){
 const caps=CAP[cl]||[],d=CLD[cl]||{};
 const scLv=[...new Set(DB.filter(o=>o.cl===cl).flatMap(o=>o.feats.map(f=>f.niv)))];
 const cols=[];
 (d.infos||[]).forEach(x=>{if(Array.isArray(x.val))cols.push([x.nom,x.val])});
 // Les ressources « Nom · niv. N » (Arcanum mystique) tiennent dans une seule colonne : niveaux de sort disponibles
 const grp={};
 (d.ressources||[]).forEach(x=>{
  if(!Array.isArray(x.max))return;
  const m=/^(.+?) · niv\. (\d+)$/.exec(x.nom);
  if(!m)return cols.push([x.nom,x.max]);
  if(!grp[m[1]])cols.push([m[1],grp[m[1]]=Array(20).fill('')]);
  x.max.forEach((v,i)=>{if(v)grp[m[1]][i]+=(grp[m[1]][i]?', ':'niv. ')+m[2]});
 });
 Object.values(grp).forEach(a=>a.forEach((v,i)=>{if(!v)a[i]='—'}));
 if(d.mineurs)cols.push(['Sorts mineurs',d.mineurs]);
 if(d.prepares)cols.push(['Sorts préparés',d.prepares]);
 const emp=d.lanceur&&EMP[d.lanceur];
 let h='<div class="tblw"><table class="prog"><thead><tr><th>Niv.</th><th>Maîtrise</th><th>Capacités</th>'+cols.map(c=>`<th>${esc(c[0])}</th>`).join('')+(emp?`<th>${d.lanceur==='pacte'?'Emplacements (niv.)':'Emplacements'}</th>`:'')+'</tr></thead><tbody>';
 for(let n=1;n<=20;n++){
  const f=caps.filter(x=>x.niv===n).map(x=>x.nom==='Sous-classe'?'<span class="sc">Sous-classe</span>':esc(x.nom));
  if(scLv.includes(n)&&!caps.some(x=>x.niv===n&&x.nom==='Sous-classe'))f.push('<span class="sc">Capacité de sous-classe</span>');
  let e='';
  if(emp){const s=emp[n-1]||[];e=d.lanceur==='pacte'?(s[0]?s[0]+' (niv. '+s[1]+')':'—'):(s.length?s.join(' · '):'—')}
  h+=`<tr><td class="n">${n}</td><td class="n">+${PB(n)}</td><td>${f.join(', ')||'—'}</td>${cols.map(c=>`<td class="n">${esc(c[1][n-1]??'—')}</td>`).join('')}${emp?`<td class="n">${esc(e)}</td>`:''}</tr>`;
 }
 h+='</tbody></table></div>';
 if(emp&&d.lanceur!=='pacte')h+='<p class="srcn">Emplacements : nombre d’emplacements de niveau 1 · 2 · 3…</p>';
 return h;
}
function classView(cl){
 const k=INFO.classes[cl]||{},c=k.c||'#2a3170';
 const subs=subFiltered(cl),all=DB.filter(o=>o.cl===cl).length;
 $('#cnt').textContent=subs.length+' sous-classe'+(subs.length>1?'s':'')+' affichée'+(subs.length>1?'s':'')+' sur '+all;
 const li=a=>(a||[]).map(x=>`<li>${esc(x)}</li>`).join('');
 let h=`<div class="nav"><a class="b" href="#">← Toutes les classes</a>${CL.map(x=>x===cl?'':`<a class="b" style="--c:${(INFO.classes[x]||{}).c||'#2a3170'}" href="#${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}</div>
 <article class="cls" style="--c:${c}"><header class="chead"><h2>${esc(cl)}${VO.btn('classes','classes§'+cl,cl)}</h2>${k.pitch?`<p>${esc(k.pitch)}</p>`:''}</header><div class="cbody">`;
 if(k.dv)h+=`<dl class="meta"><div><dt>Dé de vie</dt><dd>d${k.dv}</dd></div><div><dt>Caractéristique principale</dt><dd>${esc(k.prim)}</dd></div><div><dt>Jets de sauvegarde</dt><dd>${esc(k.sv)}</dd></div><div><dt>Difficulté</dt><dd><span class="dots">${dots(k.cplx)}</span> ${CPLX[k.cplx]}</dd></div><div><dt>Armures</dt><dd>${esc(k.arm)}</dd></div><div><dt>Armes</dt><dd>${esc(k.armes)}</dd></div><div><dt>Magie</dt><dd>${esc(k.inc)}</dd></div><div><dt>Rôles</dt><dd>${esc((k.role||[]).join(', '))}</dd></div></dl>`;
 if(k.tiers)h+=`<p class="srcn" style="font-style:normal">Classe tiers : ${esc((INFO.sources[k.tiers]||[''])[0])}. Demande l’accord du MJ.</p>`;
 if(k.jeu)h+=`<h3>Le style de jeu</h3><p>${esc(k.jeu)}</p>`;
 if(k.conseils)h+=`<h3>Conseils de jeu</h3><ul>${li(k.conseils)}</ul>`;
 if(k.eviter)h+=`<h3>Pièges à éviter</h3><ul>${li(k.eviter)}</ul>`;
 if(k.depart)h+=`<h3>Pour bien démarrer</h3><p>${esc(k.depart)}</p>`;
 if(k.groupe)h+=`<h3>Dans le groupe</h3><p>${esc(k.groupe)}</p>`;
 h+=`<div class="nav"><a class="b" href="creation.html">Créer un personnage</a><a class="b" href="grimoire.html">Voir les sorts</a><a class="b" href="dons.html">Voir les dons</a></div>`;
 h+=`<h3>Progression</h3>${progression(cl,k)}`;
 if((CAP[cl]||[]).length)h+=`<h3>Capacités de classe</h3>`+CAP[cl].filter(f=>f.nom!=='Sous-classe').map(f=>`<details class="feat"><summary>${esc(f.nom)} <span>· niv. ${f.niv}</span>${VO.btn('classes','capacites§'+cl+'|'+f.niv+'|'+f.nom,f.nom)}</summary><p>${br(lvlLines(f.desc))}</p></details>`).join('');
 h+=`</div></article><h2 class="sec">Sous-classes de ${esc(cl)} (${all})</h2>`+subList(subs,false);
 $('#view').innerHTML=h;
}
function subList(subs,withClass){
 if(!subs.length)return '<div class="empty-msg">Aucune sous-classe ne correspond à ces filtres.</div>';
 return '<div class="list">'+subs.map(o=>{
  const key=o.cl+'/'+o.n,op=st.open.has(key),c=(INFO.classes[o.cl]||{}).c||'#2a3170';
  const sub=[withClass?o.cl:'',o.src.l,o.c?CPLX[o.c]:''].filter(Boolean).join(' · ');
  return `<div class="item" id="${esc(encodeURIComponent(key))}" style="--c:${c}"><div class="row"><div class="rmain"><div class="rt">${esc(o.n)}${VO.btn('classes','sous§'+o.cl+'|'+o.n,o.n)}${o.src.g&&o.src.g!=='2024'?`<span class="pill" style="--pc:${GC[o.src.g]}">${o.src.g==='tiers'?'tiers':o.src.g==='ps'?'Plane Shift':'2014'}</span>`:''}</div><div class="rs">${esc(sub)}</div>${o.r.length?`<div class="tags">${o.r.map(r=>`<span class="tag">${esc(r)}</span>`).join('')}</div>`:''}${o.i.t?`<div class="tip">${esc(o.i.t)}</div>`:''}</div>
  <div class="racts"><button class="b" data-k="${esc(key)}" aria-expanded="${op}">${op?'Masquer':'Capacités'}</button></div></div>${op?`<div class="det">${o.feats.map(f=>`<p><b>Niv. ${f.niv} · ${esc(f.nom)}.</b> ${br(lvlLines(f.desc))}</p>`).join('')}<div class="srcn">${o.src.l?'Source : '+esc(o.src.l)+' · ':''}reformulé : le livre fait foi · <a href="fiche.html">utilisable dans la fiche</a></div></div>`:''}</div>`;
 }).join('')+'</div>';
}

/* ---------- Navigation ---------- */
function route(){
 const parts=location.hash.slice(1).split('/').map(x=>{try{return decodeURIComponent(x)}catch(e){return x}});
 return {cl:CL.includes(parts[0])?parts[0]:'',sub:parts.slice(1).join('/')};
}
function render(){
 if(!INFO)return;
 const r=route();
 if(r.cl)classView(r.cl);else overview();
}
function go(scroll){
 const r=route();
 if(r.cl&&r.sub){
  const key=r.cl+'/'+r.sub;
  st.open.add(key);render();
  const el=document.getElementById(encodeURIComponent(key));if(el)el.scrollIntoView();
 }else{render();if(scroll)window.scrollTo(0,0)}
}
addEventListener('hashchange',()=>go(true));
$('#view').addEventListener('click',e=>{
 const b=e.target.closest('button[data-k]');if(!b)return;
 const k=b.dataset.k;st.open.has(k)?st.open.delete(k):st.open.add(k);render();
});
[['#fq','q','input'],['#fr','r','change'],['#fs','s','change'],['#fc','c','change']].forEach(([s,k,ev])=>$(s).addEventListener(ev,e=>{st[k]=e.target.value;render()}));
$('#bReset').onclick=()=>{Object.assign(st,{q:'',r:'',s:'',c:''});['#fq','#fr','#fs','#fc'].forEach(s=>$(s).value='');render()};

Promise.all(['assets/json/vf/classes_infos.json','assets/json/vf/sousclasses.json','assets/json/vf/capacites.json','assets/json/vf/classes.json'].map(u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return r.json()})))
 .then(([I,S,C,K])=>{
  INFO=I;SC=S||{};CAP=C||{};CLD=(K&&K.classes)||{};EMP=(K&&K.emplacements)||{};
  build();go(false);
 })
 .catch(()=>{$('#view').innerHTML='<div class="empty-msg">Impossible de charger les classes (ouvre le site via un serveur web).</div>'});
