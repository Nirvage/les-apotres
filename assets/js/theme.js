/* Thème sombre pour tout le site.
   Chargé à la fin du <head> de chaque page, après les feuilles de style : il choisit le thème
   (choix mémorisé, sinon le réglage du système) et, en sombre, réécrit les couleurs claires
   des feuilles de style de la page (fonds blancs → fonds sombres, textes foncés → textes clairs),
   sans toucher aux bandeaux colorés. Aucune page n'a donc besoin de sa propre version sombre.
   Bouton 🌙 / ☀️ dans la barre du haut. L'impression reste toujours en clair. */
(function(){
'use strict';
var KEY='dnd_theme';
var root=document.documentElement;
var mq=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;

function saved(){try{var v=localStorage.getItem(KEY);return v==='dark'||v==='light'?v:null}catch(e){return null}}
function wanted(){return saved()||(mq&&mq.matches?'dark':'light')}

/* ---------- Couleurs ---------- */
function clamp(x){return x<0?0:x>1?1:x}
function parse(s){
  s=s.trim().toLowerCase();
  if(s==='white')return[255,255,255,1];
  if(s==='black')return[0,0,0,1];
  var m;
  if(s[0]==='#'){
    var h=s.slice(1);
    if(h.length===3||h.length===4)h=h.replace(/./g,'$&$&');
    if(h.length!==6&&h.length!==8)return null;
    return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),h.length===8?parseInt(h.slice(6,8),16)/255:1];
  }
  if((m=s.match(/^rgba?\(([^)]*)\)$/))){
    var p=m[1].split(/[\s,\/]+/).filter(Boolean);
    if(p.length<3||p.some(function(x){return /[a-z]/.test(x)}))return null;
    var a=p.length>3?(p[3].slice(-1)==='%'?parseFloat(p[3])/100:parseFloat(p[3])):1;
    return[parseFloat(p[0]),parseFloat(p[1]),parseFloat(p[2]),a];
  }
  return null;
}
function toHsl(c){
  var r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,h=0,s=0,d=mx-mn;
  if(d){s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}
  return[h,s,l];
}
function fromHsl(h,s,l,a){
  function f(n){var k=(n+h*12)%12,q=s*Math.min(l,1-l);return Math.round(255*(l-q*Math.max(-1,Math.min(k-3,9-k,1))))}
  var hex='#'+[f(0),f(8),f(4)].map(function(v){return(v<16?'0':'')+v.toString(16)}).join('');
  return a<1?hex+Math.round(a*255).toString(16).padStart(2,'0'):hex;
}
// fond clair → fond sombre de même teinte ; fonds colorés ou foncés inchangés
function bg(c){
  if(c[3]<.9)return null;
  var x=toHsl(c);if(x[2]<.6)return null;
  // les blancs et gris deviennent un bleu nuit très sombre, assorti à la barre du haut
  if(x[1]<.12)return fromHsl(.64,.22,.13+(1-x[2])*.5,c[3]);
  return fromHsl(x[0],x[1]*.55,.13+(1-x[2])*.5,c[3]);
}
// texte foncé → texte clair de même teinte
function fg(c){
  var x=toHsl(c);if(x[2]>.5)return null;
  return fromHsl(x[0],Math.min(1,x[1]*1.05),.64+(.5-x[2])*.55,c[3]);
}
// bordures : claires → foncées, foncées → éclaircies, moyennes inchangées
function bd(c){
  if(c[3]<.5)return null;
  var x=toHsl(c);
  if(x[2]>=.7)return fromHsl(x[0],x[1]*.5,.2+(1-x[2])*.6,c[3]);
  if(x[2]<.38)return fromHsl(x[0],x[1],.45+(.38-x[2])*.4,c[3]);
  return null;
}
var COL=/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/gi;
function mapCols(v,fn){
  var hit=false;
  var out=v.replace(COL,function(t){var c=parse(t),r=c&&fn(c);if(r){hit=true;return r}return t});
  return{v:out,hit:hit};
}
// variables qui suivent déjà le thème (définies plus bas)
var OWN=/var\(--(ink|soft|line|gold|bg)\b/;

/* Découpe « a: b; c: d » en déclarations, sans couper dans les parenthèses ou les guillemets */
function decls(txt){
  var out=[],cur='',dep=0,q='';
  for(var i=0;i<txt.length;i++){
    var ch=txt[i];
    if(q){if(ch===q&&txt[i-1]!=='\\')q='';cur+=ch;continue}
    if(ch==='"'||ch==="'"){q=ch;cur+=ch;continue}
    if(ch==='(')dep++;else if(ch===')')dep--;
    if(ch===';'&&!dep){if(cur.trim())out.push(cur);cur='';continue}
    cur+=ch;
  }
  if(cur.trim())out.push(cur);
  return out.map(function(d){var k=d.indexOf(':');return k<0?null:{p:d.slice(0,k).trim(),v:d.slice(k+1).trim()}}).filter(Boolean);
}

/* Version sombre d'un bloc de déclarations ; null s'il n'y a rien à changer */
function darken(txt){
  if(!/#|rgb|white|black|var\(/i.test(txt))return null;
  var ds=decls(txt),changed=false,keptBg=false;
  ds.forEach(function(d){
    var p=d.p.toLowerCase();
    if(p.slice(0,2)==='--')return;
    if(p.indexOf('background')===0){
      var r=mapCols(d.v,bg);
      if(r.hit){d.v=r.v;changed=true}
      else if(!/^(none|transparent|initial|inherit|unset)\b/i.test(d.v)&&!OWN.test(d.v)&&p!=='background-image'&&!/url\(/.test(d.v))keptBg=true;
    }else if(p.indexOf('border')===0||p==='column-rule'||p.indexOf('column-rule-')===0){
      var r2=mapCols(d.v,bd);if(r2.hit){d.v=r2.v;changed=true}
    }
  });
  ds.forEach(function(d){
    var p=d.p.toLowerCase();
    if(p!=='color'&&p!=='caret-color'&&p!=='-webkit-text-fill-color')return;
    if(keptBg)return; // texte posé sur un fond coloré de la même règle : on garde le contraste d'origine
    var v=d.v.replace(/\s*!important\s*$/i,''),imp=v!==d.v?' !important':'';
    if(/var\(/.test(v)){
      if(OWN.test(v)&&!/var\(--(?!ink|soft|line|gold|bg)/.test(v))return;
      d.v='color-mix(in srgb,'+v+' 50%,#f2f4ff)'+imp;changed=true;
    }else{
      var r=mapCols(v,fg);if(r.hit){d.v=r.v+imp;changed=true}
    }
  });
  return changed?ds.map(function(d){return d.p+':'+d.v}).join(';'):null;
}

/* ---------- Feuilles de style ---------- */
var rules=[],seen=new WeakSet();
function walk(list,inPrint){
  for(var i=0;i<list.length;i++){
    var r=list[i];
    if(r.media&&r.cssRules){
      var mt=r.media.mediaText||'';
      if(/print/.test(mt)&&!/screen|all/.test(mt))continue;
      walk(r.cssRules,inPrint);continue;
    }
    if(r.style&&!seen.has(r)){
      seen.add(r);
      var o=r.style.cssText,d=darken(o);
      if(d!==null)rules.push({r:r,light:o,dark:d});
    }
    if(r.cssRules&&r.cssRules.length)walk(r.cssRules,inPrint);
  }
}
function scan(sheet){
  try{
    var n=sheet.ownerNode;
    if(n&&n.hasAttribute&&n.hasAttribute('data-theme-skip'))return;
    if(seen.has(sheet))return;seen.add(sheet);
    walk(sheet.cssRules,false);
  }catch(e){}
}
function scanAll(){for(var i=0;i<document.styleSheets.length;i++)scan(document.styleSheets[i])}

/* Styles posés directement sur les éléments (style="color:#…") : seul le texte foncé est éclairci */
function inline(el,dark){
  var o=el.getAttribute('data-th-light');
  if(!dark){if(o!==null){el.setAttribute('style',o);el.removeAttribute('data-th-light')}return}
  if(o!==null)return;
  var s=el.getAttribute('style')||'';
  if(!/(^|;)\s*color\s*:/i.test(s)||/background/i.test(s))return;
  var d=darken(s);
  if(d!==null){el.setAttribute('data-th-light',s);el.setAttribute('style',d)}
}
function inlineAll(dark,scope){
  (scope||document).querySelectorAll(dark?'[style*="color"]':'[data-th-light]').forEach(function(el){inline(el,dark)});
}

/* ---------- Application ---------- */
var BASE=':root[data-theme=dark]{color-scheme:dark;--ink:#e3e5f1;--soft:#a3a9c4;--line:#3d4260;'+
  '--bg:linear-gradient(160deg,#0a0c20,#1a1434 60%,#30163a)}'+
  ':root[data-theme=dark] img:not([src$=".svg"]){filter:brightness(.92)}'+
  ':root[data-theme=dark] ::placeholder{color:#8a90ab}'+
  '.th-btn{flex:none!important;min-width:38px}'+
  '.th-float{position:fixed;top:10px;right:10px;z-index:20;font-size:16px;line-height:1;padding:8px 10px;border:1px solid #ffffff55;border-radius:999px;background:#12142fcc;color:#fff;cursor:pointer}'+
  '.th-float:hover,.th-float:focus-visible{background:#2a3170;outline:2px solid var(--gold)}'+
  '@media print{.th-btn,.th-float{display:none!important}}';
var cur='light',obs=null;
function setDark(dark){
  scanAll();
  rules.forEach(function(x){var t=dark?x.dark:x.light;if(x.r.style.cssText!==t)x.r.style.cssText=t});
  if(document.body)inlineAll(dark);
}
function apply(t,keep){
  cur=t;
  if(t==='dark')root.setAttribute('data-theme','dark');else root.removeAttribute('data-theme');
  setDark(t==='dark');
  if(keep){try{localStorage.setItem(KEY,t)}catch(e){}}
  syncBtn();
}
var btns=[];
function syncBtn(){
  btns.forEach(function(b){
    var d=cur==='dark';
    b.textContent=d?'☀️':'🌙';
    b.title=d?'Passer en thème clair':'Passer en thème sombre';
    b.setAttribute('aria-label',b.title);
  });
}
function toggle(){apply(cur==='dark'?'light':'dark',true)}

var st=document.createElement('style');st.setAttribute('data-theme-skip','');st.textContent=BASE;
document.head.appendChild(st);
apply(wanted(),false);

// feuilles ajoutées plus tard (recherche.js, scripts des pages) et contenus générés
obs=new MutationObserver(function(ms){
  if(cur!=='dark')return;
  var newSheet=false;
  ms.forEach(function(m){
    m.addedNodes.forEach(function(n){
      if(n.nodeType!==1)return;
      if(n.tagName==='STYLE'||n.tagName==='LINK')newSheet=true;
      else{if(n.hasAttribute('style'))inline(n,true);if(n.firstElementChild)inlineAll(true,n)}
    });
  });
  if(newSheet)setTimeout(function(){if(cur==='dark')setDark(true)},0);
});
obs.observe(document,{childList:true,subtree:true});
window.addEventListener('load',function(){if(cur==='dark')setDark(true)});

// l'impression reste en clair
var printing=false;
function beforePrint(){if(cur==='dark'&&!printing){printing=true;root.removeAttribute('data-theme');setDark(false)}}
function afterPrint(){if(printing){printing=false;root.setAttribute('data-theme','dark');setDark(true)}}
window.addEventListener('beforeprint',beforePrint);
window.addEventListener('afterprint',afterPrint);
var pq=window.matchMedia&&matchMedia('print');
if(pq){var pl=function(e){e.matches?beforePrint():afterPrint()};pq.addEventListener?pq.addEventListener('change',pl):pq.addListener(pl)}

// sans choix enregistré, on suit le réglage du système
if(mq){var ml=function(){if(!saved())apply(mq.matches?'dark':'light',false)};mq.addEventListener?mq.addEventListener('change',ml):mq.addListener(ml)}
// un autre onglet change le thème
window.addEventListener('storage',function(e){if(e.key===KEY)apply(wanted(),false)});

function addBtn(){
  var bar=document.querySelector('.top .bar')||document.querySelector('.bar'),b=document.createElement('button');
  b.type='button';b.onclick=toggle;
  if(bar){b.className='th-btn';bar.appendChild(b)}
  else{b.className='th-float';document.body.appendChild(b)}
  btns.push(b);syncBtn();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addBtn);else addBtn();
window.Theme={toggle:toggle,set:function(t){apply(t,true)},get:function(){return cur}};
})();
