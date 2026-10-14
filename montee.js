/* Montée de niveau guidée (page Fiche) : assistant pas à pas qui applique à la fiche ce qui change au niveau suivant.
   Règles 2024 : PV (moyenne du dé de vie ou jet) + mod. de Con, nouvelles capacités de classe et de sous-classe,
   choix de la sous-classe, don (amélioration de caractéristique, faveur épique, style de combat), sorts et emplacements.
   Utilise les fonctions et données de la fiche (fiche.html, script principal) : à charger après lui. */
(function(){
'use strict';

const css=`
.lvup{border:0;border-radius:12px;padding:0;width:min(560px,94vw);max-height:92vh;box-shadow:0 10px 40px #0008;color:var(--ink);font:13px/1.45 system-ui,sans-serif}
.lvup::backdrop{background:#0007}
.lvup form{display:flex;flex-direction:column;max-height:92vh}
.lvup header{background:#2a3170;color:#fff;padding:12px 16px 10px;border-bottom:4px solid var(--gold)}
.lvup header h3{margin:0;font:italic 700 19px var(--serif)}
.lvup header small{color:#d9defa;font-size:12px}
.lvup .steps{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap}
.lvup .steps span{font-size:11px;padding:1px 7px;border-radius:9px;background:#ffffff22;color:#d9defa}
.lvup .steps span.on{background:var(--gold);color:#201700;font-weight:600}
.lvup .steps span.ok{color:#fff}
.lvup .bd{padding:12px 16px;overflow:auto;flex:1}
.lvup h4{margin:0 0 8px;font:italic 700 16px var(--serif);color:#2a3170}
.lvup p{margin:0 0 8px}
.lvup .hint{color:var(--soft);font-size:12px}
.lvup ul{margin:0 0 8px;padding-left:18px}
.lvup li{margin-bottom:5px}
.lvup label.opt{display:flex;gap:8px;align-items:flex-start;border:1px solid var(--line);border-radius:8px;padding:7px 9px;margin-bottom:6px;cursor:pointer}
.lvup label.opt:has(input:checked){border-color:#2a3170;background:#eef0fb}
.lvup label.opt input{width:auto;margin-top:2px}
.lvup select,.lvup input[type=number]{width:100%;border:1px solid var(--line);border-radius:6px;padding:5px 6px;background:#fff}
.lvup .fld{display:block;margin-bottom:8px}
.lvup .fld small{display:block;color:var(--soft);font-size:11.5px;margin-bottom:2px}
.lvup .big{font:700 22px var(--serif);color:#2e9e5b}
.lvup .roll{display:flex;gap:8px;align-items:center;margin-top:4px}
.lvup .roll input{width:70px}
.lvup .roll button,.lvup footer button{border:1px solid #2a3170;color:#2a3170;background:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:600}
.lvup footer{display:flex;gap:8px;justify-content:flex-end;padding:10px 16px;border-top:1px solid var(--line);background:#f7f8fc;border-radius:0 0 12px 12px}
.lvup footer .go{background:#2a3170;color:#fff}
.lvup footer .sp{margin-right:auto}
.lvup .desc{font-size:12px;color:#40455c;white-space:pre-line;background:#f7f8fc;border-radius:6px;padding:6px 8px;margin:4px 0 8px}
.lvup table{border-collapse:collapse;width:100%;margin-bottom:8px;font-size:12.5px}
.lvup td{padding:3px 6px;border-bottom:1px solid #e6e8f2}
.lvup td:last-child{text-align:right;font-weight:600;white-space:nowrap}
.lvup .up{color:#2e9e5b}
#bLvl{background:#2e9e5b;border-color:#2e9e5b;color:#fff;font-weight:600}
@media print{#bLvl{display:none}}
`;
document.head.insertAdjacentHTML('beforeend','<style>'+css+'</style>');

// Bouton dans la barre du haut, juste avant « Enregistrer »
const btn=document.createElement('button');
btn.type='button';btn.id='bLvl';btn.textContent='Monter de niveau';
btn.title='Assistant pas à pas : PV, nouvelles capacités, sous-classe, don, sorts';
$('#bSave').before(btn);

const ASI=/am[ée]lioration de caract[ée]ristique|faveur [ée]pique/i;
const STYLE=/style de combat/i;
const lvlReq=d=>{const m=String(d.pre||'').match(/niveau\s+(\d+)/i);return m?+m[1]:0};
const slotRow=(cst,l)=>{
  if(!cst)return null;
  if(cst.type==='pacte'){const r=(cst.emp||CD.emplacements.pacte)[l-1]||[0,0];return r[0]?{['pacte']:r[0],niv:r[1]}:{}}
  const r=(CD.emplacements[cst.type]||[])[l-1]||[];
  const o={};r.forEach((n,i)=>{if(n)o[i+1]=n});return o;
};

function open(){
  if(!CD&&!CAPD){alert('Les données de classes ne sont pas encore chargées.');return}
  calc();
  const from=lvlNow();
  if(from>=20){alert('Le personnage est déjà au niveau 20, le niveau maximum.');return}
  const to=from+1,cl=findClass(),cn=cl&&cl[0];
  const die=(cn&&CLS[cn])||dvInfo().die;
  const con0=CUR.mod.con||0;
  const sub=val('sclasse'),SC=cn&&SCD&&SCD[cn]||null;
  const subLvl=SC?Math.min(...Object.values(SC).flatMap(s=>s.feats.map(f=>f.niv))):3;
  const feats=(cn&&CAPD&&CAPD[cn]||[]).filter(f=>f.niv===to);
  const subFeats=sub&&SC&&SC[sub]?SC[sub].feats.filter(f=>f.niv===to):[];
  const needSub=!!SC&&!sub&&to>=subLvl;
  const asi=feats.some(f=>ASI.test(f.nom));
  const style=[...feats,...subFeats].some(f=>STYLE.test(f.nom));
  const tot=DERIV&&DERIV.tot||{};
  const avg=Math.floor(die/2)+1;

  // État de l'assistant
  const S={hp:'moy',roll:'',sub:'',don:asi?'asi':'',dch:{},sty:'',later:false};

  // Ce qui change avec le niveau (bonus de maîtrise, ressources, infos de classe, sorts)
  function changes(){
    const rows=[];
    const pb0=Math.ceil(from/4)+1,pb1=Math.ceil(to/4)+1;
    if(pb1!==pb0)rows.push(['Bonus de maîtrise',sg(pb0)+' → '+sg(pb1)]);
    if(cl){
      const d=cl[1];
      (d.ressources||[]).forEach(r=>{const a=maxOf(r.max,from,CUR.mod),b=maxOf(r.max,to,CUR.mod);if(a!==b)rows.push([r.nom,(a||'—')+' → '+b])});
      (d.infos||[]).forEach(x=>{if(!x.val)return;const a=x.val[from-1],b=x.val[to-1];if(a!==b)rows.push([x.nom,(a||'—')+' → '+b])});
      const hx=(d.infos||[]).find(i=>i.calc==='moitie_sup');
      if(hx&&Math.ceil(from/2)!==Math.ceil(to/2))rows.push([hx.nom,Math.ceil(from/2)+' → '+Math.ceil(to/2)]);
      if(d.liste){const a=d.liste.max[from-1]||0,b=d.liste.max[to-1]||0;if(a!==b)rows.push([d.liste.titre,a+' → '+b])}
    }
    return rows;
  }
  function spellRows(subName){
    if(!cl)return [];
    const d=cl[1];
    let cst=null;
    if(d.lanceur)cst={type:d.lanceur,mineurs:d.mineurs,prepares:d.prepares};
    else if(d.sous_classe){
      const sc=d.sous_classe,re=new RegExp(sc.re||'occult|arcanique','i');
      if(chk('sclance')||re.test(subName||''))cst={type:sc.type||'tiers',mineurs:sc.mineurs,prepares:sc.prepares,emp:sc.emp};
    }
    if(!cst)return [];
    const rows=[];
    const a=at(cst.mineurs,from)||0,b=at(cst.mineurs,to)||0;
    if(a!==b)rows.push(['Sorts mineurs connus',a+' → '+b]);
    const p=at(cst.prepares,from)||0,q=at(cst.prepares,to)||0;
    if(p!==q)rows.push(['Sorts préparés',p+' → '+q]);
    const s0=slotRow(cst,from),s1=slotRow(cst,to);
    if(cst.type==='pacte'){
      if(s0.pacte!==s1.pacte)rows.push(['Emplacements de pacte',(s0.pacte||0)+' → '+s1.pacte]);
      if(s0.niv!==s1.niv)rows.push(['Niveau des emplacements de pacte',(s0.niv||'—')+' → '+s1.niv]);
    }else for(let i=1;i<=9;i++)if((s0[i]||0)!==(s1[i]||0))rows.push(['Emplacements de niveau '+i,(s0[i]||0)+' → '+s1[i]]);
    return rows;
  }
  const table=r=>r.length?'<table>'+r.map(([a,b])=>`<tr><td>${esc(a)}</td><td class="up">${esc(b)}</td></tr>`).join('')+'</table>':'';
  const featList=a=>'<ul>'+a.map(f=>`<li><b>${esc(f.nom)}</b> — ${esc(f.desc)}</li>`).join('')+'</ul>';

  // Dons proposés : généraux (et faveurs épiques dès le niv. 19), dont le niveau requis est atteint ; plus les dons créés
  const donOpts=()=>{
    if(!DOND)return [];
    return DOND.filter(d=>(d.cat==='Général'||(d.cat==='Faveur épique'&&to>=19)||d.c_)&&lvlReq(d)<=to&&d.cat!=='Origine'&&d.cat!=='Style de combat');
  };
  const styleOpts=()=>(DOND||[]).filter(d=>d.cat==='Style de combat'&&!PX.dons.some(g=>g.id===d.id));

  const hpGain=()=>{
    const r=S.hp==='moy'?avg:Math.max(1,Math.min(die,parseInt(S.roll)||0));
    return S.hp==='jet'&&!S.roll?null:Math.max(1,r+con0);
  };

  // Étapes (seulement celles qui servent à ce niveau)
  const steps=[];
  steps.push({t:'Points de vie',h:()=>`
    <h4>Points de vie</h4>
    <p>Dé de vie : <b>d${die}</b>${cn?' ('+esc(cn)+')':''} · modificateur de Constitution <b>${sg(con0)}</b></p>
    <label class="opt"><input type="radio" name="hp" value="moy"${S.hp==='moy'?' checked':''}><span><b>Valeur fixe : ${avg} ${sg(con0)} = ${Math.max(1,avg+con0)} PV</b><br><span class="hint">La moyenne du dé (règle par défaut).</span></span></label>
    <label class="opt"><input type="radio" name="hp" value="jet"${S.hp==='jet'?' checked':''}><span><b>Lancer le d${die}</b>
      <span class="roll"><button type="button" id="lvRoll">Lancer</button><input type="number" id="lvRollV" min="1" max="${die}" value="${esc(S.roll)}" placeholder="1–${die}" aria-label="Résultat du dé"></span>
      <span class="hint">Ou saisis le résultat de ton propre dé.</span></span></label>
    <p>Gain : <span class="big">${hpGain()==null?'—':'+'+hpGain()}</span> PV max <span class="hint">(au moins 1 ; tu gagnes aussi un dé de vie)</span></p>`});
  if(feats.length||subFeats.length||changes().length)steps.push({t:'Capacités',h:()=>{
    const fs=feats.filter(f=>!ASI.test(f.nom)&&f.nom!=='Sous-classe'&&f.nom!=='Capacité de sous-classe');
    return `<h4>Ce que tu gagnes au niveau ${to}</h4>
    ${fs.length?featList(fs):''}
    ${subFeats.length?`<p><b>${esc(sub)}</b></p>`+featList(subFeats):''}
    ${!fs.length&&!subFeats.length?'<p class="hint">Pas de nouvelle capacité de classe à ce niveau, en dehors des choix des étapes suivantes.</p>':''}
    ${table(changes())}
    <p class="hint">Tout cela s'affiche tout seul sur la fiche (capacités de classe, sous-classe, réserves) dès que le niveau change.</p>`}});
  if(needSub)steps.push({t:'Sous-classe',h:()=>`
    <h4>Choisis ta sous-classe</h4>
    <p class="hint">Au niveau ${subLvl}, ton ${esc(cn)} choisit une sous-classe.</p>
    ${Object.entries(SC).map(([n,s])=>{const f=s.feats.filter(x=>x.niv<=to);return `<label class="opt"><input type="radio" name="sub" value="${esc(n)}"${S.sub===n?' checked':''}><span><b>${esc(n)}</b><br><span class="hint">${f.map(x=>esc(x.nom)).join(' · ')}</span></span></label>`}).join('')}
    <label class="opt"><input type="radio" name="sub" value=""${!S.sub?' checked':''}><span>Choisir plus tard</span></label>`});
  if(asi&&DOND)steps.push({t:'Don',h:()=>{
    const o=donOpts(),d=DOND.find(x=>x.id===S.don);
    const cats=[...new Set(o.map(x=>x.c_?'Mes créations':x.cat))];
    return `<h4>${to>=19&&feats.some(f=>/[ée]pique/i.test(f.nom))?'Faveur épique ou don':'Amélioration de caractéristique ou don'}</h4>
    <p class="hint">Prends l'amélioration de caractéristique (+2 à une, ou +1 à deux, maximum 20) ou un autre don dont tu remplis les conditions.</p>
    <label class="fld"><small>Don</small><select id="lvDon"><option value="">Choisir plus tard</option>${cats.map(c=>`<optgroup label="${esc(c)}">${o.filter(x=>(x.c_?'Mes créations':x.cat)===c).map(x=>`<option value="${esc(x.id)}"${x.id===S.don?' selected':''}>${esc(x.nom)}</option>`).join('')}</optgroup>`).join('')}</select></label>
    ${d?`${d.pre?`<p class="hint">Condition : ${esc(d.pre)}</p>`:''}<div class="desc">${esc(d.desc)}</div>${choiceHTML(d)}`:''}`}});
  if(style&&DOND)steps.push({t:'Style de combat',h:()=>{
    const o=styleOpts(),d=DOND.find(x=>x.id===S.sty);
    return `<h4>Style de combat</h4>
    <p class="hint">Tu gagnes un don de Style de combat.</p>
    <label class="fld"><small>Style</small><select id="lvSty"><option value="">Choisir plus tard</option>${o.map(x=>`<option value="${esc(x.id)}"${x.id===S.sty?' selected':''}>${esc(x.nom)}</option>`).join('')}</select></label>
    ${d?`<div class="desc">${esc(d.desc)}</div>`:''}`}});
  if(spellRows(sub).length||(needSub&&cl&&cl[1].sous_classe))steps.push({t:'Sorts',h:()=>{
    const r=spellRows(S.sub||sub);
    return `<h4>Sorts</h4>${r.length?table(r)+`<p>Choisis tes nouveaux sorts dans le <a href="grimoire.html" target="_blank" rel="noopener">Grimoire</a> une fois la montée de niveau appliquée. Les emplacements se mettent à jour tout seuls sur la fiche.</p>`:'<p class="hint">Pas de changement de sorts avec ce choix de sous-classe.</p>'}`}});
  steps.push({t:'Résumé',h:()=>{
    const g=hpGain(),mx=parseInt(val('pvmax'));
    const L=[];
    L.push(['Niveau',from+' → '+to]);
    L.push(['PV maximum',isNaN(mx)?'calculés à partir de la valeur fixe de chaque niveau':mx+' → '+(g==null?'?':mx+g)]);
    L.push(['Dés de vie',(dvInfo().tot)+'d'+die+' → '+(dvInfo().tot+1)+'d'+die]);
    if(S.sub)L.push(['Sous-classe',S.sub]);
    const d=DOND&&DOND.find(x=>x.id===S.don);
    if(d)L.push(['Don',d.nom+choiceTxt(d)]);
    const st=DOND&&DOND.find(x=>x.id===S.sty);
    if(st)L.push(['Style de combat',st.nom]);
    const miss=[];
    if(g==null)miss.push('le résultat du dé de vie');
    if(needSub&&!S.sub)miss.push('la sous-classe');
    if(asi&&!S.don)miss.push('le don');
    if(d&&(d.choix||[]).some(c=>c.t!=='texte'&&!S.dch[c.id]))miss.push('les choix du don');
    return `<h4>Résumé</h4>${table(L)}
    ${miss.length?`<p class="hint">Reste à choisir : ${miss.join(', ')}. ${g==null?'Le dé de vie est obligatoire ; ':''}le reste peut se faire plus tard sur la fiche.</p>`:''}
    <p class="hint">« Appliquer » met à jour la fiche : niveau, PV maximum et actuels${S.sub?', sous-classe':''}${d||st?', dons':''}. Si ta Constitution change, les PV des niveaux précédents suivent aussi.</p>`}});

  function choiceHTML(d){
    return (d.choix||[]).length?'<div>'+(d.choix||[]).map(c=>{
      let o;
      if(c.t==='texte')return `<label class="fld"><small>${esc(c.lbl)}</small><input type="text" data-lvch="${esc(c.id)}" value="${esc(S.dch[c.id]||'')}" style="width:100%;border:1px solid var(--line);border-radius:6px;padding:5px 6px"></label>`;
      if(c.t==='carac')o=c.opts.map(k=>[k,ABN[k]+(tot[k]!=null?' ('+tot[k]+')':'')]);
      else if(c.t==='comp')o=(c.opts||SK.map(s=>s[0])).map(n=>[n,n]);
      else o=c.opts.map(optObj).map(x=>[x.v,x.v]);
      return `<label class="fld"><small>${esc(c.lbl)}</small><select data-lvch="${esc(c.id)}"><option value="">—</option>${o.map(([v,t])=>`<option value="${esc(v)}"${v===S.dch[c.id]?' selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
    }).join('')+'</div>':'';
  }
  function choiceTxt(d){
    const a=(d.choix||[]).map(c=>S.dch[c.id]?(c.t==='carac'?ABN[S.dch[c.id]]:S.dch[c.id]):'').filter(Boolean);
    if(d.id==='asi'&&a.length===2&&a[0]===a[1])return ' ('+a[0]+' +2)';
    return a.length?' ('+a.join(', ')+')':'';
  }

  let i=0;
  const dlg=document.createElement('dialog');
  dlg.className='lvup';
  document.body.appendChild(dlg);
  function draw(){
    const s=steps[i],last=i===steps.length-1;
    dlg.innerHTML=`<form method="dialog">
      <header><h3>Monter de niveau : ${from} → ${to}</h3><small>${esc(val('nom')||'Personnage')}${cn?' · '+esc(cn):' · classe non reconnue (dé de vie d'+die+')'}</small>
      <div class="steps">${steps.map((x,j)=>`<span class="${j===i?'on':j<i?'ok':''}">${j+1}. ${esc(x.t)}</span>`).join('')}</div></header>
      <div class="bd">${s.h()}</div>
      <footer><button type="button" class="sp" data-a="x">Annuler</button>${i?'<button type="button" data-a="p">Précédent</button>':''}<button type="button" class="go" data-a="${last?'ok':'n'}"${last&&hpGain()==null?' disabled':''}>${last?'Appliquer':'Suivant'}</button></footer>
    </form>`;
  }
  dlg.addEventListener('click',e=>{
    const a=e.target.dataset&&e.target.dataset.a;
    if(e.target.id==='lvRoll'){S.hp='jet';S.roll=String(1+Math.floor(Math.random()*die));draw();return}
    if(!a)return;
    if(a==='x'){dlg.close();return}
    if(a==='p'){i--;draw();return}
    if(a==='n'){i++;draw();dlg.querySelector('.bd').scrollTop=0;return}
    if(a==='ok'){applyAll();dlg.close()}
  });
  dlg.addEventListener('change',e=>{
    const t=e.target;
    if(t.name==='hp')S.hp=t.value;
    else if(t.name==='sub')S.sub=t.value;
    else if(t.id==='lvDon'){S.don=t.value;S.dch={}}
    else if(t.id==='lvSty')S.sty=t.value;
    else if(t.dataset.lvch!==undefined)S.dch[t.dataset.lvch]=t.value;
    else if(t.id==='lvRollV'){S.hp='jet';S.roll=t.value}
    else return;
    e.stopPropagation();
    if(t.type!=='text')draw();
  });
  dlg.addEventListener('input',e=>{
    const t=e.target;
    if(t.dataset.lvch!==undefined&&t.type==='text')S.dch[t.dataset.lvch]=t.value;
    e.stopPropagation();
  });
  dlg.addEventListener('close',()=>dlg.remove());

  function applyAll(){
    const g=hpGain();if(g==null)return;
    const pvn0=fxCompute(from,Math.ceil(from/4)+1).pvn;
    const D=dvInfo(),restTxt=val('dvrest').trim();
    if(S.don)PX.dons.push({u:rid(),id:S.don,ch:Object.assign({},S.dch)});
    if(S.sty)PX.dons.push({u:rid(),id:S.sty,ch:{}});
    if(S.sub){
      el('sclasse').value=S.sub;el('sousclasse').value=S.sub;
      const sc=cl&&cl[1].sous_classe;
      if(sc&&el('sclance'))el('sclance').checked=new RegExp(sc.re||'occult|arcanique','i').test(S.sub);
    }
    el('niveau').value=to;
    if(val('clsel')&&CLS[val('clsel')])setDV();
    else{const m=val('dvtot').match(/^\s*(\d+)\s*d\s*(\d+)\s*$/i);el('dvtot').value=m?(+m[1]+1)+'d'+m[2]:to+'d'+die}
    if(restTxt!=='')el('dvrest').value=Math.min(D.tot+1,(parseInt(restTxt)||0)+1);
    LAST=new WeakMap();
    calc();
    // PV : gain du niveau, Constitution modifiée (s'applique à tous les niveaux), PV par niveau des dons et de l'espèce
    const dCon=(CUR.mod.con||0)-con0;
    const dPvn=fxCompute(to,Math.ceil(to/4)+1).pvn-pvn0;
    const add=g+dCon*to+dPvn;
    const mx=parseInt(val('pvmax')),pv=parseInt(val('pv'));
    let nmx;
    if(isNaN(mx)){   // PV max pas encore saisis : dé complet au niv. 1, valeur fixe ensuite, ce niveau-ci selon le choix
      const c1=CUR.mod.con||0,r=S.hp==='moy'?avg:Math.max(1,Math.min(die,parseInt(S.roll)||0));
      nmx=Math.max(1,die+c1)+(to-2)*Math.max(1,avg+c1)+Math.max(1,r+c1)+fxCompute(to,Math.ceil(to/4)+1).pvn;
    }else nmx=mx+add;
    el('pvmax').value=nmx;
    el('pv').value=isNaN(pv)?nmx:Math.min(nmx,pv+(isNaN(mx)?nmx:add));
    calc();autosave();
    const d=DOND&&DOND.find(x=>x.id===S.don);
    msg('Niveau '+to+' ! '+(isNaN(mx)?'PV max calculés : '+nmx:'PV max +'+add)+(d?' · don : '+d.nom:'')+(S.sub?' · '+S.sub:''));
  }

  draw();
  dlg.showModal();
}
btn.addEventListener('click',open);
})();
