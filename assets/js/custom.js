/* Éditeur des créations personnelles (objets magiques, équipement, dons).

   Les créations sont rangées par persos.js (Persos.custom(), Persos.setCustom) et ont la même
   forme que les objets de objets.json / equipement.json / dons.json, avec en plus :
     c_:1     marque de création personnelle
     f_:{…}   valeurs saisies dans le formulaire (pour pouvoir les modifier ensuite)

   Usage côté page :
     Custom.edit({
       kind:'objets'|'equipement'|'dons',
       item,                    // création à modifier, ou null pour en créer une
       types, rares, cats,      // listes de choix propres à la page
       taken:nom=>bool,         // vrai si ce nom est déjà utilisé par un autre élément
       done:(item,old)=>{…}     // appelé après enregistrement (item null = supprimée)
     });
*/
(function(){
'use strict';

var AB=[['for','Force'],['dex','Dextérité'],['con','Constitution'],['int','Intelligence'],['sag','Sagesse'],['cha','Charisme']];
var SKN=['Acrobaties','Arcanes','Athlétisme','Discrétion','Dressage','Escamotage','Histoire','Intimidation','Intuition','Investigation','Médecine','Nature','Perception','Persuasion','Religion','Représentation','Supercherie','Survie'];
var ABN={};AB.forEach(function(a){ABN[a[0]]=a[1]});

// Effets possibles. arg : ce qu'il faut saisir (c = caractéristique, s = compétence, n = nombre, r = réserve)
var FX={
  objets:[
    ['set','Caractéristique fixée à une valeur','cn','ex. Bandeau d’intelligence : Intelligence 19 (sans effet si elle est déjà plus haute)'],
    ['carac','Bonus à une caractéristique (max 20)','cn',''],
    ['ca','Bonus à la CA','n',''],
    ['sv','Bonus à tous les jets de sauvegarde','n',''],
    ['tests','Bonus aux tests de caractéristique','n',''],
    ['init','Bonus à l’initiative','n',''],
    ['satk','Bonus aux attaques de sort','n',''],
    ['sdd','Bonus au DD des sorts','n',''],
    ['vit','Vitesse en plus (m)','n',''],
    ['arme','Bonus aux jets d’attaque et de dégâts de l’arme','n','']
  ],
  dons:[
    ['carac','Caractéristique +1','c*',''],
    ['comp','Maîtrise d’une compétence','s*',''],
    ['exp','Expertise d’une compétence','s*',''],
    ['sv','Maîtrise d’un jet de sauvegarde','c*',''],
    ['init_pb','Initiative + bonus de maîtrise','',''],
    ['pv_niv','PV max en plus par niveau','n',''],
    ['vit','Vitesse en plus (m)','n',''],
    ['ca','Bonus à la CA','n',''],
    ['res','Réserve d’utilisations','r','']
  ]
};

var esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')};
var trim=function(s){return String(s||'').trim()};
var html=function(s){return esc(trim(s)).replace(/\n+/g,'<br>')};
var opts=function(a,cur){return a.map(function(x){var v=Array.isArray(x)?x[0]:x,t=Array.isArray(x)?x[1]:x;return '<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(t)+'</option>'}).join('')};
// « 15 po », « 2 pa », « 5 pc » -> valeur en po
function toPo(p){
  var m=String(p||'').replace(',','.').match(/([\d.]+)\s*(pp|po|pe|pa|pc)?/i);
  if(!m)return 0;
  var n=parseFloat(m[1])||0,u=(m[2]||'po').toLowerCase();
  return n*({pp:10,po:1,pe:.5,pa:.1,pc:.01})[u];
}

var CSS='.cx{border:0;border-radius:12px;padding:0;width:min(560px,94vw);max-height:92vh;box-shadow:0 10px 40px #0008}'
 +'.cx::backdrop{background:#0008}'
 +'.cx form{display:flex;flex-direction:column;gap:9px;padding:14px 16px 16px}'
 +'.cx h3{margin:0;font:italic 700 18px var(--serif);color:#2a3170}'
 +'.cx .cg{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}'
 +'.cx label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--soft);min-width:0}'
 +'.cx label.full{grid-column:1/-1}'
 +'.cx label.chk{flex-direction:row;align-items:center;gap:6px;font-size:13px;color:var(--ink)}'
 +'.cx input:not([type=checkbox]),.cx select,.cx textarea{width:100%;border:1px solid var(--line);border-radius:5px;padding:6px 8px;background:#fff;font-size:13px}'
 +'.cx textarea{min-height:110px;resize:vertical}'
 +'.cx fieldset{border:1px solid var(--line);border-radius:8px;padding:6px 10px 10px;margin:0}'
 +'.cx legend{font:700 12px var(--sans);color:#2a3170;padding:0 4px}'
 +'.cx .fxr{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}'
 +'.cx .fxr select,.cx .fxr input{width:auto;flex:1 1 120px}'
 +'.cx .fxr input[type=number]{flex:0 0 70px}'
 +'.cx .fxr .fxh{flex:1 1 100%;font-size:11px;color:var(--soft)}'
 +'.cx .cb{border:1.5px solid var(--c,#2a3170);background:#fff;color:var(--c,#2a3170);border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:600;font-size:12px;min-height:34px}'
 +'.cx .cb.ok{background:#2a3170;color:#fff}'
 +'.cx .cb.del{--c:#c8402f;margin-right:auto}'
 +'.cx .acts{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}'
 +'.cx .err{color:#c8402f;font-size:12px;margin:0}'
 +'.cx .hint{margin:0;font-size:12px;color:var(--soft)}'
 +'.cx [hidden]{display:none!important}'
 +'@media (max-width:560px){.cx .cg{grid-template-columns:1fr}}';

function fxRow(kind,f){
  f=f||{};
  var defs=FX[kind],d=defs.find(function(x){return x[0]===f.t})||defs[0];
  var ab=AB.slice(),sk=SKN.map(function(s){return [s,s]});
  if(d[2].indexOf('*')>=0){ab.unshift(['*','Au choix du joueur']);sk.unshift(['*','Au choix du joueur'])}
  var a=d[2],h='<div class="fxr"><select data-f="t" aria-label="Type d’effet">'+opts(defs.map(function(x){return [x[0],x[1]]}),d[0])+'</select>';
  if(a[0]==='c')h+='<select data-f="c" aria-label="Caractéristique">'+opts(ab,f.c||'')+'</select>';
  if(a[0]==='s')h+='<select data-f="c" aria-label="Compétence">'+opts(sk,f.c||'')+'</select>';
  if(a.indexOf('n')>=0)h+='<input type="number" data-f="n" aria-label="Valeur" value="'+esc(f.n!=null?f.n:(d[0]==='set'?19:1))+'">';
  if(a==='r')h+='<input type="text" data-f="nom" placeholder="Nom de la réserve" value="'+esc(f.nom||'')+'"><select data-f="max" aria-label="Nombre d’utilisations">'+opts([['pb','Bonus de maîtrise'],['1','1'],['2','2'],['3','3'],['4','4'],['5','5']],String(f.max||'pb'))+'</select><select data-f="repos" aria-label="Récupération">'+opts(['repos long','repos court ou long'],f.repos||'repos long')+'</select>';
  h+='<button type="button" class="cb" style="--c:#c8402f" data-fxdel>Retirer</button>';
  if(d[3])h+='<span class="fxh">'+esc(d[3])+'</span>';
  return h+'</div>';
}
function readFx(box){
  return [].map.call(box.querySelectorAll('.fxr'),function(r){
    var o={};
    r.querySelectorAll('[data-f]').forEach(function(e){o[e.dataset.f]=e.value});
    if('n' in o)o.n=parseFloat(String(o.n).replace(',','.'))||0;
    return o;
  });
}
// Effets saisis -> effets et choix au format de dons.json
function donFx(list){
  var fx=[],choix=[],i=0;
  list.forEach(function(f){
    i++;
    if(f.t==='carac'||f.t==='sv'){
      if(f.c==='*'){choix.push({id:'c'+i,t:'carac',lbl:f.t==='sv'?'Jet de sauvegarde':'Caractéristique +1',opts:AB.map(function(a){return a[0]})});fx.push(f.t==='carac'?{t:'carac',c:'c'+i,max:20}:{t:'sv',c:'c'+i})}
      else fx.push(f.t==='carac'?{t:'carac',v:f.c,max:20}:{t:'sv',v:f.c});
    }else if(f.t==='comp'||f.t==='exp'){
      if(f.c==='*'){choix.push({id:'c'+i,t:'comp',lbl:f.t==='exp'?'Expertise':'Compétence'});fx.push({t:f.t,c:'c'+i})}
      else fx.push({t:f.t,v:f.c});
    }else if(f.t==='res'){
      if(trim(f.nom))fx.push({t:'res',id:'r'+i,nom:trim(f.nom),max:f.max==='pb'?'pb':+f.max||1,repos:f.repos});
    }else if(f.t==='init_pb')fx.push({t:'init_pb'});
    else if(f.n)fx.push({t:f.t,n:f.n});
  });
  return {fx:fx,choix:choix};
}
// Effets saisis -> effets au format des objets magiques de la fiche (FXO dans fiche.html)
function objFx(list){
  return list.filter(function(f){return f.n}).map(function(f){var o={t:f.t,n:f.n};if(f.c)o.v=f.c;return o});
}

function edit(o){
  if(!document.getElementById('cxcss')){var st=document.createElement('style');st.id='cxcss';st.textContent=CSS;document.head.appendChild(st)}
  var kind=o.kind,it=o.item,f=it&&it.f_||{},isDon=kind==='dons';
  var title={objets:'objet magique',equipement:'objet d’équipement',dons:'don'}[kind];
  var dlg=document.createElement('dialog');dlg.className='cx';
  var h='<form method="dialog"><h3>'+(it?'Modifier':'Créer')+' un '+title+'</h3><div class="cg">';
  h+='<label class="full">Nom<input name="n" required maxlength="80" value="'+esc(isDon?it&&it.nom:it&&it.n)+'"></label>';
  if(kind==='objets'){
    h+='<label>Type<select name="t">'+opts(o.types,it?it.t:'Objet merveilleux')+'</select></label>';
    h+='<label>Rareté<select name="q">'+opts(o.rares,it?it.q:'Peu courant')+'</select></label>';
    h+='<label class="chk"><input type="checkbox" name="a"'+(it&&it.a?' checked':'')+'> Demande une harmonisation</label>';
    h+='<label>Précision (facultatif)<input name="ap" placeholder="par un magicien" value="'+esc(f.ap)+'"></label>';
    h+='<label class="full" data-w>Arme de base<select name="base"><option value="">—</option>'+opts(o.weapons||[],it&&it.base||'')+'</select></label>';
  }else if(kind==='equipement'){
    h+='<label>Type<select name="t">'+opts(o.types,it?it.t:'Équipement d’aventurier')+'</select></label>';
    h+='<label>Catégorie<input name="c" list="cxcats" value="'+esc(it?it.c:'')+'"><datalist id="cxcats"></datalist></label>';
    h+='<label>Coût<input name="p" placeholder="15 po" value="'+esc(it?it.p:'')+'"></label>';
    h+='<label>Poids (kg)<input name="kg" type="number" min="0" step="0.05" value="'+esc(it?it.kg:'')+'"></label>';
    h+='<label data-w>Dégâts<input name="deg" placeholder="1d8 tranchants" value="'+esc(f.deg)+'"></label>';
    h+='<label data-w>Propriétés<input name="prop" placeholder="Finesse, Légère" value="'+esc(f.prop)+'"></label>';
    h+='<label class="full" data-ar>Classe d’armure<input name="ca" placeholder="12 + mod. de Dex (max 2)" value="'+esc(f.ca)+'"></label>';
  }else{
    h+='<label>Catégorie<select name="cat">'+opts(o.cats,it?it.cat:'Général')+'</select></label>';
    h+='<label>Prérequis (facultatif)<input name="pre" placeholder="Niveau 4+" value="'+esc(it&&it.pre)+'"></label>';
  }
  h+='<label class="full">Description<textarea name="d">'+esc(isDon?it&&it.desc:f.d)+'</textarea></label></div>';
  if(FX[kind])h+='<fieldset><legend>Effets sur la fiche</legend><p class="hint">'+(isDon?'Appliqués automatiquement quand le don est ajouté à la fiche.':'Appliqués sur la fiche quand tu es harmonisé avec l’objet, ou dès qu’il est dans tes objets s’il ne demande pas d’harmonisation.')+'</p><div data-fx>'+(f.fx||[]).map(function(x){return fxRow(kind,x)}).join('')+'</div><button type="button" class="cb" data-fxadd style="margin-top:8px">+ Ajouter un effet</button></fieldset>';
  h+='<p class="err" data-err></p><div class="acts">'+(it?'<button type="button" class="cb del" data-del>Supprimer</button>':'')+'<button type="button" class="cb" data-cancel>Annuler</button><button type="submit" class="cb ok">Enregistrer</button></div></form>';
  dlg.innerHTML=h;
  document.body.appendChild(dlg);
  var F=dlg.querySelector('form'),q=function(s){return dlg.querySelector(s)},fxb=q('[data-fx]');
  // Champs propres aux armes / armures
  function upd(){
    var t=F.t&&F.t.value;
    dlg.querySelectorAll('[data-w]').forEach(function(e){e.hidden=t!=='Arme'&&t!=='Munition'});
    dlg.querySelectorAll('[data-ar]').forEach(function(e){e.hidden=t!=='Armure'});
    if(kind==='equipement'){
      var cs=(o.cats&&o.cats[t])||[];
      q('#cxcats').innerHTML=opts(cs);
      if(!it&&!F.c.dataset.touched)F.c.value=cs[0]||'';
    }
  }
  if(F.t)F.t.addEventListener('change',upd);
  if(F.c&&kind==='equipement')F.c.addEventListener('input',function(){F.c.dataset.touched=1});
  upd();
  if(fxb){
    q('[data-fxadd]').onclick=function(){fxb.insertAdjacentHTML('beforeend',fxRow(kind))};
    fxb.addEventListener('change',function(e){
      if(e.target.dataset.f!=='t')return;
      var r=e.target.closest('.fxr');r.outerHTML=fxRow(kind,{t:e.target.value});
    });
    fxb.addEventListener('click',function(e){if(e.target.closest('[data-fxdel]'))e.target.closest('.fxr').remove()});
  }
  function close(){dlg.close();dlg.remove()}
  q('[data-cancel]').onclick=close;
  dlg.addEventListener('cancel',function(e){e.preventDefault();close()});
  if(it)q('[data-del]').onclick=function(){
    if(!confirm('Supprimer « '+(isDon?it.nom:it.n)+' » de tes créations ? Il sera retiré de tous les personnages qui l’utilisent.'))return;
    var c=Persos.custom()[kind].filter(function(x){return x!==it&&(isDon?x.id!==it.id:x.n!==it.n)});
    Persos.setCustom(kind,c);close();o.done(null,it);
  };
  F.onsubmit=function(e){
    e.preventDefault();
    var n=trim(F.n.value),old=it?(isDon?it.nom:it.n):null;
    if(!n){q('[data-err]').textContent='Donne un nom.';return}
    if(n!==old&&o.taken(n)){q('[data-err]').textContent='Ce nom est déjà utilisé : choisis-en un autre.';return}
    var d=F.d.value,fxs=fxb?readFx(fxb):[],x;
    if(kind==='objets'){
      var a=F.a.checked?'Harmonisation'+(trim(F.ap.value)?' ('+trim(F.ap.value)+')':''):'',w=F.t.value==='Arme'||F.t.value==='Munition';
      var base=w?F.base.value:'';
      // « Arme (épée longue). » en tête de description : c'est ce que lit l'import des armes de la fiche
      x={n:n,en:'',t:F.t.value,q:F.q.value,a:a,h:(base?esc(F.t.value)+' ('+esc(base.toLowerCase())+').'+(trim(d)?'<br>':''):'')+html(d),src:'Création personnelle',c_:1,fx:objFx(fxs),f_:{ap:trim(F.ap.value),d:d,fx:fxs}};
      if(base)x.base=base;
    }else if(kind==='equipement'){
      var t=F.t.value,ww=t==='Arme'||t==='Munition',g=ww?trim(F.deg.value):'',pr=ww?trim(F.prop.value):'',ca=t==='Armure'?trim(F.ca.value):'';
      var head=(g?'Dégâts : '+esc(g)+'. ':'')+(pr?'Propriétés : '+esc(pr)+'. ':'')+(ca?'Classe d’armure : '+esc(ca)+'. ':'');
      x={n:n,en:'',t:t,c:trim(F.c.value)||t,p:trim(F.p.value)||'—',po:toPo(F.p.value),kg:Math.max(0,parseFloat(String(F.kg.value).replace(',','.'))||0),h:(head?trim(head)+(trim(d)?'<br>':''):'')+html(d),src:'Création personnelle',c_:1,f_:{deg:g,prop:pr,ca:ca,d:d}};
    }else{
      var r=donFx(fxs);
      x={id:it?it.id:'perso_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),nom:n,cat:F.cat.value,pre:trim(F.pre.value),desc:trim(d),choix:r.choix,fx:r.fx,src:'Création personnelle',c_:1,f_:{fx:fxs}};
    }
    var c=Persos.custom()[kind];
    var i=it?c.findIndex(function(y){return isDon?y.id===it.id:y.n===it.n}):-1;
    if(i>=0)c[i]=x;else c.push(x);
    Persos.setCustom(kind,c);
    if(old&&old!==n&&!isDon)Persos.renameCustom(kind,old,n);
    close();o.done(x,it);
  };
  dlg.showModal();
  F.n.focus();
}

window.Custom={edit:edit,ABN:ABN};
})();
