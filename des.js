/* Lanceur de dés : formules (2d6+3, 4d6kh3, d20+5, d%), avantage / désavantage, historique.

   Un bouton rond en bas à droite ouvre le panneau. Sur la fiche de personnage, les valeurs
   deviennent cliquables : compétences, jets de sauvegarde, tests de caractéristique, initiative,
   attaque de sort, attaques (toucher + dégâts, dés doublés sur un 20 naturel) et jets contre la mort.
   Maj+clic : avantage ; Ctrl/Alt+clic : désavantage (sinon le choix du panneau, valable pour un jet).

   Usage depuis une autre page :
     Des.roll({label:'Perception',f:'d20+5'})
     Des.roll({label:'Épée longue',f:'d20+5',dmg:'1d8+3 tranchants'})
     Des.mount(element)   // panneau intégré dans la page au lieu du bouton flottant
*/
(function(){
'use strict';

var KEY='dnd_des_v1',MAXH=60;
var esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')};
var sg=function(n){return (n>=0?'+':'−')+Math.abs(n)};

// Tirage uniforme 1..n
function die(n){
  if(window.crypto&&crypto.getRandomValues){
    var a=new Uint32Array(1),lim=Math.floor(4294967296/n)*n;
    do{crypto.getRandomValues(a)}while(a[0]>=lim);
    return a[0]%n+1;
  }
  return Math.floor(Math.random()*n)+1;
}

// « 2d6 + 1d4 - 1 » -> [{s:1,n:2,f:6},{s:1,n:1,f:4},{s:-1,k:1}] ; null si la formule n'est pas comprise
function parse(f){
  var s=String(f||'').toLowerCase().replace(/[−–—]/g,'-').replace(/\s+/g,'').replace(/d%/g,'d100').replace(/^\+/,'');
  if(!s)return null;
  var re=/([+-]?)(?:(\d*)d(\d+)(?:k([hl])(\d+))?|(\d+))/g,m,T=[],pos=0;
  while((m=re.exec(s))){
    if(m.index!==pos||!m[0])return null;
    pos=re.lastIndex;
    var sgn=m[1]==='-'?-1:1;
    if(m[3]){
      var n=m[2]===''?1:+m[2],fa=+m[3];
      if(n<1||n>100||fa<2||fa>1000)return null;
      var t={s:sgn,n:n,f:fa};
      if(m[4]){t.k=m[4];t.kn=Math.min(n,Math.max(1,+m[5]))}
      T.push(t);
    }else T.push({s:sgn,c:+m[6]});
  }
  return pos===s.length&&T.length?T:null;
}
// Début d'un texte de dégâts : « 1d8+3 tranchants » -> « 1d8+3 »
function dmgFormula(txt){
  var m=String(txt||'').replace(/[−–—]/g,'-').match(/^\s*([\dd%+\-\s]+)/i);
  return m?m[1].replace(/[\s+\-]+$/,'').trim():'';
}
var nice=function(T){return T.map(function(t,i){
  var x=t.c!=null?String(t.c):(t.n>1?t.n:'')+'d'+t.f+(t.k?'k'+t.k+t.kn:'');
  return (i||t.s<0?(t.s<0?' − ':' + '):'')+x}).join('')};

// Lance une formule. o.mode : 'adv'|'dis' sur le premier d20 ; o.crit : dés doublés
function evalF(T,o){
  o=o||{};
  var tot=0,parts=[],nat=null,used=false;
  T.forEach(function(t){
    if(t.c!=null){tot+=t.s*t.c;parts.push({c:t.c,s:t.s});return}
    var n=o.crit?t.n*2:t.n,k=t.k,kn=t.kn;
    if(!used&&t.f===20&&n===1&&!k&&(o.mode==='adv'||o.mode==='dis')){n=2;k=o.mode==='adv'?'h':'l';kn=1;used=true}
    var r=[];for(var i=0;i<n;i++)r.push(die(t.f));
    var keep=r.map(function(){return true});
    if(k){
      var idx=r.map(function(v,i){return i}).sort(function(a,b){return k==='h'?r[b]-r[a]:r[a]-r[b]});
      keep=r.map(function(){return false});idx.slice(0,kn).forEach(function(i){keep[i]=true});
    }
    var sum=0;r.forEach(function(v,i){if(keep[i])sum+=v});
    if(t.f===20&&nat===null&&(n===1||kn===1))nat=r.filter(function(v,i){return keep[i]})[0];
    tot+=t.s*sum;
    parts.push({s:t.s,f:t.f,r:r,keep:keep,k:t.k,kn:t.kn,adv:used&&parts.every(function(p){return !p.adv})?o.mode:null});
  });
  return {tot:tot,parts:parts,nat:nat,usedMode:used};
}
function partsHTML(P){
  return P.map(function(p,i){
    var op=i||p.s<0?(p.s<0?' − ':' + '):'';
    if(p.c!=null)return op+p.c;
    var lab=p.adv?'d20 '+(p.adv==='adv'?'avantage':'désavantage'):p.r.length+'d'+p.f+(p.k?'k'+p.k+p.kn:'');
    return op+lab+' ['+p.r.map(function(v,j){
      var c=!p.keep[j]?'dz-x':p.f===20&&v===20?'dz-20':p.f===20&&v===1?'dz-1':'';
      return c?'<span class="'+c+'">'+v+'</span>':v}).join(', ')+']';
  }).join('');
}

// ---------- État ----------
var MODE='norm',H=[],root=null,floating=false;
try{H=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(H))H=[]}catch(e){H=[]}
function saveH(){try{localStorage.setItem(KEY,JSON.stringify(H.slice(0,MAXH)))}catch(e){}}
function who(){
  var e=document.querySelector('[data-k="nom"]');
  if(e&&e.value.trim())return e.value.trim();
  try{var c=window.Persos&&Persos.current&&Persos.current();return c&&c.nom||''}catch(x){return ''}
}

var CSS=''
 +'.dz-fab{position:fixed;right:16px;bottom:16px;z-index:40;width:56px;height:56px;border-radius:50%;border:3px solid var(--gold,#d9a21b);background:#12142f;color:var(--gold,#d9a21b);font:italic 700 17px var(--serif,Georgia,serif);cursor:pointer;box-shadow:0 4px 16px #0007;display:grid;place-items:center}'
 +'.dz-fab:hover,.dz-fab:focus-visible{outline:3px solid #fff;outline-offset:2px}'
 +'.dz-fab .dz-badge{position:absolute;top:-6px;left:-8px;font:700 10px var(--sans,system-ui);font-style:normal;background:#2e9e5b;color:#fff;border-radius:999px;padding:2px 6px}'
 +'.dz-fab .dz-badge.dis{background:#c8402f}'
 +'.dz{background:#fff;color:var(--ink,#1d2033);border-radius:12px;border-top:4px solid var(--gold,#d9a21b);box-shadow:0 8px 32px #0008;display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;font:13px/1.4 var(--sans,system-ui)}'
 +'.dz.fl{position:fixed;right:16px;bottom:84px;z-index:41;width:320px;max-height:calc(100vh - 110px);overflow:auto}'
 +'.dz[hidden]{display:none}'
 +'.dz-h{display:flex;align-items:center;gap:8px}'
 +'.dz-h b{flex:1;font:italic 700 16px var(--serif,Georgia,serif);color:#2a3170}'
 +'.dz-h button{border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:var(--soft,#5f6580);padding:2px 6px}'
 +'.dz-res{border:1.5px solid #d5d8ee;border-radius:9px;background:#f5f6fd;padding:8px 10px;min-height:64px}'
 +'.dz-res.new{animation:dzf .45s}'
 +'@keyframes dzf{from{background:#fff3cf}to{background:#f5f6fd}}'
 +'@media (prefers-reduced-motion:reduce){.dz-res.new{animation:none}}'
 +'.dz-lab{font-weight:600;color:#2a3170}'
 +'.dz-big{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}'
 +'.dz-tot{font:700 30px var(--serif,Georgia,serif);color:#2a3170;min-width:40px}'
 +'.dz-det{font-size:12px;color:var(--soft,#5f6580);overflow-wrap:anywhere}'
 +'.dz-x{text-decoration:line-through;opacity:.55}'
 +'.dz-20{color:#2e9e5b;font-weight:700}.dz-1{color:#c8402f;font-weight:700}'
 +'.dz-tag{font:700 11px var(--sans,system-ui);border-radius:999px;padding:1px 8px;color:#fff;background:#2e9e5b}'
 +'.dz-tag.ko{background:#c8402f}'
 +'.dz-dmg{margin-top:4px;padding-top:4px;border-top:1px dashed #c9cde0}'
 +'.dz-dmg .dz-tot{font-size:22px;color:#c8402f}'
 +'.dz-mode{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}'
 +'.dz button.dz-b{border:1.5px solid #2a3170;background:#fff;color:#2a3170;border-radius:6px;padding:5px 6px;font:600 12px var(--sans,system-ui);cursor:pointer;min-height:32px}'
 +'.dz button.dz-b[aria-pressed=true]{background:#2a3170;color:#fff}'
 +'.dz-mode button[data-m=adv][aria-pressed=true]{background:#2e9e5b;border-color:#2e9e5b}'
 +'.dz-mode button[data-m=dis][aria-pressed=true]{background:#c8402f;border-color:#c8402f}'
 +'.dz-f{display:flex;gap:6px}'
 +'.dz-f input{flex:1;min-width:0;border:1px solid #c9cde0;border-radius:6px;padding:6px 8px;background:#fff}'
 +'.dz-f button{background:#2a3170!important;color:#fff!important}'
 +'.dz-q{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}'
 +'.dz-q button{padding:5px 0!important}'
 +'.dz-hd summary{cursor:pointer;font-size:12px;font-weight:600;color:#2a3170}'
 +'.dz-hd summary span{font-weight:400;color:var(--soft,#5f6580)}'
 +'.dz-hh{display:flex;justify-content:flex-end}'
 +'.dz-hh button{border:0;background:transparent;color:var(--soft,#5f6580);text-decoration:underline;cursor:pointer;font-size:11px}'
 +'.dz-l{list-style:none;margin:4px 0;padding:0;overflow:auto;display:flex;flex-direction:column;gap:2px}'
 +'.dz.fl .dz-l{max-height:30vh}'
 +'.dz-l li{display:flex;gap:8px;align-items:baseline;font-size:12px;border-bottom:1px solid #eceefb;padding:3px 0}'
 +'.dz-l li b{min-width:30px;text-align:right;font:700 15px var(--serif,Georgia,serif);color:#2a3170}'
 +'.dz-l li .dz-d{flex:1;min-width:0;overflow-wrap:anywhere}'
 +'.dz-l li small{color:var(--soft,#5f6580);font-size:10.5px}'
 +'.dz-l li.e{color:var(--soft,#5f6580);justify-content:center}'
 +'.dz-hint{margin:0;font-size:11px;color:var(--soft,#5f6580)}'
 +'[data-dz]{cursor:pointer;-webkit-tap-highlight-color:transparent}'
 +'[data-dz]:hover,[data-dz]:focus-visible{text-decoration:underline;outline:none}'
 +'.dz-rb{flex:none;border:1px solid var(--c,#d8791a);background:#fff;color:var(--c,#d8791a);border-radius:5px;font:700 10px var(--sans,system-ui);padding:2px 4px;cursor:pointer;line-height:1.2}'
 +'.dz-rb:hover,.dz-rb:focus-visible{background:var(--c,#d8791a);color:#fff}'
 +'@media screen and (max-width:700px){'
 +' .dz.fl{left:8px;right:8px;bottom:8px;width:auto;max-height:70vh}'
 +' .dz-fab{right:12px;bottom:12px}'
 +' .dz button.dz-b{min-height:38px}'
 +' .dz-rb{padding:4px 7px;font-size:11px}'
 +'}'
 +'@media print{.dz,.dz-fab,.dz-rb{display:none!important}[data-dz]{text-decoration:none!important}}';

// ---------- Panneau ----------
function build(host){
  var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  root=document.createElement('section');
  root.className='dz'+(host?'':' fl');
  root.setAttribute('aria-label','Lanceur de dés');
  root.innerHTML='<div class="dz-h"><b>Lanceur de dés</b>'+(host?'':'<button type="button" class="dz-close" aria-label="Fermer le lanceur de dés">×</button>')+'</div>'
   +'<div class="dz-res" aria-live="polite"><p class="dz-hint">Tape une formule (2d6+3, 4d6kh3, d20+5, d%) ou choisis un dé.'+(document.getElementById('sk_0')?' Sur la fiche, clique sur une compétence, un jet de sauvegarde, l’initiative ou le bouton d’une attaque.':'')+'</p></div>'
   +'<div class="dz-mode" role="group" aria-label="Jet de d20"><button type="button" class="dz-b" data-m="dis">Désavantage</button><button type="button" class="dz-b" data-m="norm">Normal</button><button type="button" class="dz-b" data-m="adv">Avantage</button></div>'
   +'<form class="dz-f"><input type="text" class="dz-in" placeholder="ex. 2d6+3" aria-label="Formule de dés" autocomplete="off" enterkeyhint="go"><button type="submit" class="dz-b">Lancer</button></form>'
   +'<div class="dz-q">'+[4,6,8,10,12,20,100].map(function(f){return '<button type="button" class="dz-b" data-q="'+f+'">d'+f+'</button>'}).join('')+'</div>'
   +'<details class="dz-hd"'+(host?' open':'')+'><summary>Historique <span class="dz-n"></span></summary><ul class="dz-l"></ul><div class="dz-hh"><button type="button" class="dz-clr">Effacer l’historique</button></div></details>';
  (host||document.body).appendChild(root);
  // la fiche réagit à tous les « input » / « change » : ceux du panneau ne la concernent pas
  ['input','change'].forEach(function(t){root.addEventListener(t,function(e){e.stopPropagation()})});
  root.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.m){MODE=b.dataset.m;sync();return}
    if(b.dataset.q){roll({label:'d'+b.dataset.q,f:'1d'+b.dataset.q},e);return}
    if(b.classList.contains('dz-close')){open(false);return}
    if(b.classList.contains('dz-clr')){if(!H.length||confirm('Effacer l’historique des jets ?')){H=[];saveH();list()}}
  });
  root.querySelector('form').addEventListener('submit',function(e){
    e.preventDefault();
    var i=root.querySelector('.dz-in'),f=i.value.trim();if(!f)return;
    if(!parse(f)){show('<p class="dz-hint" style="color:#c8402f">Formule non comprise : « '+esc(f)+' ». Exemples : 2d6+3, d20+5, 4d6kh3, 1d8+1d6+2, d%.</p>');return}
    roll({label:f,f:f});
  });
  if(!host){
    var fab=document.createElement('button');
    fab.type='button';fab.className='dz-fab';fab.setAttribute('aria-label','Lanceur de dés');fab.title='Lanceur de dés';
    fab.innerHTML='d20<span class="dz-badge" hidden></span>';
    fab.addEventListener('click',function(){open(root.hidden)});
    document.body.appendChild(fab);
    root.hidden=true;floating=fab;
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!root.hidden&&root.contains(document.activeElement)){open(false);fab.focus()}});
  }
  sync();list();
}
function open(on){
  if(!root)build();
  if(!floating)return;
  root.hidden=!on;floating.setAttribute('aria-expanded',on?'true':'false');
}
function sync(){
  if(!root)return;
  root.querySelectorAll('.dz-mode button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.m===MODE?'true':'false')});
  if(floating){var g=floating.querySelector('.dz-badge');g.hidden=MODE==='norm';g.textContent=MODE==='adv'?'Av.':'Dés.';g.className='dz-badge'+(MODE==='dis'?' dis':'')}
}
function show(h){
  var r=root.querySelector('.dz-res');r.innerHTML=h;
  r.classList.remove('new');void r.offsetWidth;r.classList.add('new');
}
function list(){
  var L=root.querySelector('.dz-l');
  root.querySelector('.dz-n').textContent=H.length?'('+H.length+')':'';
  L.innerHTML=H.length?H.map(function(x){
    var d=new Date(x.t),hh=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
    return '<li><b>'+x.tot+'</b><span class="dz-d">'+esc(x.lab)+(x.tag?' · <strong>'+esc(x.tag)+'</strong>':'')+(x.dmg!=null?' · dégâts <strong>'+x.dmg+'</strong>':'')+'<br><small>'+esc(x.det)+'</small></span><small>'+(x.who?esc(x.who)+' · ':'')+hh+'</small></li>'
  }).join(''):'<li class="e">Aucun jet pour l’instant.</li>';
}
var plain=function(h){var d=document.createElement('div');d.innerHTML=h;return d.textContent};

// o : {label, f, dmg (texte de dégâts), dmgLabel, then(r)} ; ev : clic (Maj = avantage, Ctrl/Alt = désavantage)
function roll(o,ev){
  if(!root)build();
  var T=parse(o.f);if(!T)return null;
  var mode=ev&&ev.shiftKey?'adv':ev&&(ev.ctrlKey||ev.altKey||ev.metaKey)?'dis':MODE;
  var r=evalF(T,{mode:mode});
  if(r.usedMode&&MODE!=='norm'&&mode===MODE){MODE='norm';sync()}   // l'avantage choisi dans le panneau vaut pour un jet
  var tag=r.nat===20?'20 naturel':r.nat===1?'1 naturel':'';
  var dm=null,DF=o.dmg?dmgFormula(o.dmg):'',DT=DF&&parse(DF);
  if(DT)dm=evalF(DT,{crit:r.nat===20});
  if(o.dmg&&r.nat===20)tag='Critique !';
  var extra=o.then?o.then(r)||'':'';
  var h='<div class="dz-lab">'+esc(o.label)+'</div><div class="dz-big"><span class="dz-tot">'+r.tot+'</span>'
   +(tag?'<span class="dz-tag'+(r.nat===1?' ko':'')+'">'+tag+'</span>':'')
   +'<span class="dz-det">'+partsHTML(r.parts)+'</span></div>'
   +(extra?'<div class="dz-det" style="margin-top:2px">'+extra+'</div>':'');
  if(dm){
    var dtype=String(o.dmg).replace(/[−–—]/g,'-').slice(String(o.dmg).replace(/[−–—]/g,'-').indexOf(DF)+DF.length).trim();
    h+='<div class="dz-dmg"><div class="dz-big"><span class="dz-tot">'+dm.tot+'</span><span>dégâts'+(dtype?' '+esc(dtype):'')+(r.nat===20?' (dés doublés)':'')+'</span><span class="dz-det">'+partsHTML(dm.parts)+'</span></div></div>';
  }else if(o.dmg&&!DF){h+='<div class="dz-det dz-dmg">Dégâts : '+esc(o.dmg)+'</div>'}
  show(h);
  H.unshift({t:Date.now(),who:who(),lab:o.label,tot:r.tot,det:plain(partsHTML(r.parts))+(extra?' — '+plain(extra):''),tag:tag,dmg:dm?dm.tot:null});
  H=H.slice(0,MAXH);saveH();list();
  open(true);
  return r;
}

// ---------- Fiche de personnage ----------
function fiche(){
  if(!document.getElementById('sk_0'))return;
  var $=function(s){return document.querySelector(s)};
  var num=function(t){var m=String(t||'').replace(/[−–]/g,'-').match(/[+-]?\d+/);return m?+m[0]:0};
  var d20=function(n){return 'd20'+(n?(n>0?'+':'')+n:'')};
  var mark=function(e,title){if(!e)return;e.setAttribute('data-dz','');e.setAttribute('role','button');e.tabIndex=0;e.title=title+' (Maj+clic : avantage, Ctrl+clic : désavantage)'};
  var ABN={for:'Force',dex:'Dextérité',con:'Constitution',int:'Intelligence',sag:'Sagesse',cha:'Charisme'};
  var skName=function(i){var r=$('#sk_'+i);var t=r&&r.parentNode.querySelector('.t');return t?t.textContent:''};
  document.querySelectorAll('[id^="sk_"]').forEach(function(e){mark(e,'Lancer '+skName(e.id.slice(3)));var t=e.parentNode.querySelector('.t');if(t)mark(t,'Lancer '+skName(e.id.slice(3)))});
  Object.keys(ABN).forEach(function(k){
    var s=$('#sv_'+k);if(s){mark(s,'Jet de sauvegarde de '+ABN[k]);var t=s.parentNode.querySelector('.t');if(t)mark(t,'Jet de sauvegarde de '+ABN[k])}
    mark($('#m_'+k),'Test de '+ABN[k]);
  });
  mark($('#init'),'Lancer l’initiative');
  mark($('#sab'),'Attaque de sort');
  function what(e){
    var id=e.id||'',p=e.parentNode;
    if(!id&&p)id=(p.querySelector('[id^="sk_"],[id^="sv_"]')||{}).id||'';
    if(/^sk_\d+$/.test(id))return {label:skName(id.slice(3)),f:d20(num($('#'+id).textContent))};
    if(/^sv_/.test(id))return {label:'Sauvegarde de '+ABN[id.slice(3)],f:d20(num($('#'+id).textContent))};
    if(/^m_/.test(id))return {label:'Test de '+ABN[id.slice(2)],f:d20(num(e.textContent))};
    if(id==='init')return {label:'Initiative',f:d20(num(e.textContent))};
    if(id==='sab'){if(!/\d/.test(e.textContent))return null;return {label:'Attaque de sort',f:d20(num(e.textContent))}}
    return null;
  }
  function go(e,ev){var o=what(e);if(o){ev.preventDefault();roll(o,ev)}}
  document.addEventListener('click',function(ev){var e=ev.target.closest('[data-dz]');if(e)go(e,ev)});
  document.addEventListener('keydown',function(ev){if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches&&ev.target.matches('[data-dz]'))go(ev.target,ev)});

  // Attaques : un bouton par ligne (toucher + dégâts)
  var st=document.createElement('style');
  st.textContent='#atks .atk,.atk.h{grid-template-columns:2fr 1fr 2fr auto}.atk.h::after{content:"";width:26px}@media print{#atks .atk,.atk.h{grid-template-columns:2fr 1fr 2fr}.atk.h::after{display:none}}';
  document.head.appendChild(st);
  var rows=document.querySelectorAll('#atks .atk');
  function upd(){rows.forEach(function(r){var i=r.querySelectorAll('input'),b=r.querySelector('.dz-rb');b.hidden=!(i[1].value.trim()||i[2].value.trim());b.title='Lancer '+(i[0].value.trim()||'l’attaque')+' (toucher et dégâts ; Maj+clic : avantage)'})}
  rows.forEach(function(r){
    var b=document.createElement('button');b.type='button';b.className='dz-rb';b.textContent='d20';
    b.setAttribute('aria-label','Lancer cette attaque');
    b.addEventListener('click',function(ev){
      var i=r.querySelectorAll('input'),n=i[0].value.trim()||'Attaque',bo=i[1].value.trim(),dg=i[2].value.trim();
      if(/\d/.test(bo)||!dg)roll({label:n,f:d20(num(bo)),dmg:dg},ev);
      else{var df=dmgFormula(dg);if(parse(df))roll({label:n+' (dégâts)',f:df},ev)}   // pas de bonus : dégâts seuls (sort à sauvegarde…)
    });
    r.appendChild(b);
  });
  upd();
  document.addEventListener('input',upd);document.addEventListener('change',upd);
  // apply() remet les valeurs sans événement : on resynchronise quand les personnages changent
  var mo=new MutationObserver(upd);var pe=document.getElementById('persos');if(pe)mo.observe(pe,{subtree:true,childList:true,attributes:true});

  // Jets contre la mort : coche les cases toute seule
  var ds=document.querySelector('[data-k="ds1"]');
  if(ds){
    var bb=document.createElement('button');bb.type='button';bb.className='dz-rb noprint';bb.textContent='Jet contre la mort';
    bb.style.cssText='--c:#c8402f;margin-left:auto;font-size:11px;padding:3px 8px';
    ds.parentNode.appendChild(bb);
    var box=function(p,i){return document.querySelector('[data-k="'+p+i+'"]')};
    var fire=function(e){e.dispatchEvent(new Event('change',{bubbles:true}))};
    var tick=function(p,n){for(var i=1;i<=3&&n>0;i++){var c=box(p,i);if(c&&!c.checked){c.checked=true;fire(c);n--}}};
    var count=function(p){var n=0;for(var i=1;i<=3;i++){var c=box(p,i);if(c&&c.checked)n++}return n};
    bb.addEventListener('click',function(ev){
      if(count('ds')>=3||count('df')>=3){
        if(!root)build();open(true);
        show('<div class="dz-lab">Jet contre la mort</div><p class="dz-hint">'+(count('df')>=3?'Trois échecs déjà cochés.':'Trois réussites déjà cochées : le personnage est stable.')+' Décoche les cases pour recommencer.</p>');return;
      }
      roll({label:'Jet contre la mort',f:'d20',then:function(r){
        if(r.nat===20){
          for(var i=1;i<=3;i++){['ds','df'].forEach(function(p){var c=box(p,i);if(c&&c.checked){c.checked=false;fire(c)}})}
          var pv=document.querySelector('[data-k="pv"]');if(pv&&!(+pv.value>0)){pv.value='1';fire(pv)}
          return 'Tu reprends conscience avec 1 PV.';
        }
        if(r.nat===1){tick('df',2)}else if(r.tot>=10)tick('ds',1);else tick('df',1);
        var s=count('ds'),f=count('df');
        if(f>=3)return (r.nat===1?'Deux échecs. ':'Échec. ')+'Trois échecs : le personnage meurt.';
        if(s>=3)return 'Réussite. Trois réussites : le personnage est stable (0 PV).';
        return (r.nat===1?'Deux échecs':r.tot>=10?'Réussite':'Échec')+' ('+s+' réussite'+(s>1?'s':'')+', '+f+' échec'+(f>1?'s':'')+').';
      }},ev);
    });
  }
}

window.Des={roll:roll,parse:parse,open:open,mount:function(h){if(!root)build(h)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
function init(){fiche();if(!root&&!document.querySelector('[data-dz-host]'))build();else if(!root){build(document.querySelector('[data-dz-host]'))}}
})();
