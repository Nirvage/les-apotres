/* Outils partagés par les pages du MJ qui utilisent le bestiaire (suivi de combat, rencontres).
   Monstres.load() charge bestiaire.json ; Monstres.block(m) rend le profil complet d'un monstre
   (styles dans monstres.css). Les données restent celles de bestiaire.json, sans copie. */
(function(){
'use strict';
var TC={'aberration':'#7a4fc4','bête':'#2e9e5b','céleste':'#c99a06','artificiel':'#5d6b7a','dragon':'#c8402f','élémentaire':'#d8791a','fée':'#12968f','fiélon':'#8b1e3f','géant':'#8e5a2b','humanoïde':'#2f6fd0','créature monstrueuse':'#9c3d8f','vase':'#6b8e23','plante':'#3c7d3c','mort-vivant':'#4a4a4a','nuée':'#6d6875'};
var AN=['FOR','DEX','CON','INT','SAG','CHA'];
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function norm(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’‘`´]/g,"'").trim()}
function mod(n){var m=Math.floor((n-10)/2);return (m>=0?'+':'−')+Math.abs(m)}
function tbase(m){return m.typ.indexOf('nuée')===0?'nuée':m.typ.replace(/ \(.*$/,'')}
function col(m){return TC[tbase(m)]||'#2a3170'}
// « 5 900, ou 7 200 dans son repaire » -> 5900
function xp(m){return parseInt(String(m.px).split(',')[0].replace(/[^\d]/g,''),10)||0}
function fpl(x){return ({0.125:'1/8',0.25:'1/4',0.5:'1/2'})[x]||String(x)}
// « 150 (20d10 + 40) » -> {moy:150,n:20,d:10,b:40}
function pv(m){
  var s=String(m.pv).replace(/[  ]/g,' '),r=/^(\d+) \((\d+)d(\d+)(?: ([+−-]) (\d+))?\)/.exec(s);
  if(!r)return {moy:parseInt(s,10)||1,n:0,d:0,b:0};
  return {moy:+r[1],n:+r[2],d:+r[3],b:r[4]?(r[4]==='+'?1:-1)*r[5]:0};
}
function rnd(n){var a=new Uint32Array(1);crypto.getRandomValues(a);return Math.floor(a[0]/4294967296*n)}
function rollPV(m){var p=pv(m),t=p.b;if(!p.n)return p.moy;for(var i=0;i<p.n;i++)t+=1+rnd(p.d);return Math.max(1,t)}
function ca(m){return parseInt(m.ca,10)||10}
function dex(m){return Math.floor((m.car[1]-10)/2)}
// Bonus d'initiative : celui du profil 2024 (Dex + maîtrise éventuelle), sinon le modificateur de Dex (2014)
function init(m){return typeof m.init==='number'?m.init:dex(m)}
function sg(n){return (n>=0?'+':'−')+Math.abs(n)}
function sec(title,arr,intro){
  if(!arr||!arr.length)return '';
  return '<div class="sec"><h4>'+title+'</h4>'+(intro?'<p class="intro">'+esc(intro)+'</p>':'')+arr.map(function(a){return '<p><b><i>'+esc(a.n)+'.</i></b> '+esc(a.d).replace(/\n/g,'<br>')+'</p>'}).join('')+'</div>';
}
function block(m){
  function L(t,v){return v?'<div><b>'+t+'</b> '+esc(v)+'</div>':''}
  var src=m.v==='2014'?'SRD 5.1 (règles 2014)':'SRD 5.2 (règles 2024)';
  return '<article class="sp" style="--c:'+col(m)+'"><header><div class="ti"><h3>'+esc(m.n)+'</h3><div class="sub">'+esc(m.typ[0].toUpperCase()+m.typ.slice(1))+' de taille '+esc(m.tail.toLowerCase())+', '+esc(m.al)+' · '+esc(m.en)+'</div></div></header>'
   +'<div class="body"><dl class="meta"><div><dt>Classe d’armure</dt><dd>'+esc(m.ca)+'</dd></div><div><dt>Points de vie</dt><dd>'+esc(m.pv)+'</dd></div><div><dt>Vitesse</dt><dd>'+esc(m.vit)+'</dd></div><div><dt>Initiative</dt><dd>'+sg(init(m))+' ('+(10+init(m))+')</dd></div><div><dt>Facteur de puissance</dt><dd>'+esc(m.fp)+' · '+esc(String(m.px).replace(/^([\d\s\u202f\u00a0]+)/,'$1 PX'))+' · BM '+esc(m.bm)+'</dd></div></dl>'
   +'<div class="ab6">'+m.car.map(function(v,i){return '<div><b>'+AN[i]+'</b><span>'+v+' ('+mod(v)+')</span></div>'}).join('')+'</div>'
   +'<div class="lines">'+L('Jets de sauvegarde',m.sauv)+L('Compétences',m.comp)+L('Vulnérabilités',m.vuln)+L('Résistances',m.res)+L('Immunités aux dégâts',m.imm)+L('Immunités aux états',m.cimm)+L('Équipement',m.equip)+L('Sens',m.sens)+L('Langues',m.langues)+'</div>'
   +sec('Traits',m.traits)+sec('Actions',m.actions)+sec('Actions bonus',m.bonus)+sec('Réactions',m.reac)+sec('Actions légendaires',m.leg,m.legi)
   +'<div class="srcn">Source : '+src+', Wizards of the Coast, licence CC BY 4.0.</div></div></article>';
}
var DB=null,BYN={};
function load(){
  if(DB)return Promise.resolve(DB);
  return fetch('bestiaire.json?v=20261019a').then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(d){
    DB=d;d.forEach(function(m,i){m.i=i;m.idx=norm(m.n+' '+m.en+' '+m.typ);BYN[m.n]=m});return d;
  });
}
// Le groupe saisi par le MJ (personnages des joueurs dont il n'a pas la fiche) : partagé par les pages du MJ, sous une clé à part
var GKEY='dnd_groupe_v1';
var CAR=['for','dex','con','int','sag','cha'];
function cmod(v){return Math.floor((v-10)/2)}
function groupe(){
  var g;try{g=JSON.parse(localStorage.getItem(GKEY))}catch(e){}
  return (Array.isArray(g)?g:[]).filter(function(x){return x&&typeof x==='object'}).map(function(x){
    // ancien format : « init » était le bonus total, sans les caractéristiques
    if(typeof x.init==='number'&&x.binit==null&&x.dex==null)x.binit=x.init;
    delete x.init;return x;
  });
}
function setGroupe(g){try{localStorage.setItem(GKEY,JSON.stringify(g));return true}catch(e){return false}}
// Les personnages des fiches de ce navigateur (tous sauf « mj ») : niveau, PV, CA, initiative, Perception passive
function fiches(){
  var s;try{s=JSON.parse(localStorage.getItem('dnd_persos_v1'))}catch(e){}
  if(!s||!s.persos||!Array.isArray(s.ordre))return [];
  return s.ordre.map(function(id){return s.persos[id]}).filter(function(p){return p&&String(p.nom).trim().toLowerCase()!=='mj'}).map(function(p){
    var d=p.fiche&&p.fiche.data||{},n=function(k,v){var x=parseInt(d[k],10);return isNaN(x)?v:x};
    var dv=d.derive||{};   // valeurs calculées par la fiche (CA, initiative) quand elle a été ouverte
    var sag=dv.tot&&dv.tot.sag?Math.floor((dv.tot.sag-10)/2):null,car={};
    CAR.forEach(function(k){var v=dv.tot&&dv.tot[k]||n('ab_'+k,0);if(v)car[k]=v});
    return {nom:p.nom,car:car,cl:dv.cl||d.classe||'',niveau:Math.min(20,Math.max(1,n('niveau',1))),pvmax:n('pvmax',0),pv:n('pv',n('pvmax',0)),
      init:typeof dv.init==='number'?dv.init:Math.floor((n('ab_dex',10)-10)/2)+n('b_init',0),ca:typeof dv.ca==='number'?dv.ca:null,
      pp:typeof dv.pp==='number'?dv.pp:sag!=null?10+sag:null};
  });
}
// Les personnages joueurs : ceux du groupe saisi par le MJ (ses valeurs priment), complétés par les fiches de ce navigateur
function joueurs(){
  var F=fiches(),out=[];
  function num(v){return typeof v==='number'&&!isNaN(v)?v:null}
  groupe().forEach(function(g){
    var nom=String(g.nom||'').trim();if(!nom)return;
    var i=-1;F.forEach(function(f,k){if(i<0&&norm(f.nom)===norm(nom))i=k});
    var f=i>=0?F.splice(i,1)[0]:{};
    var pvmax=num(g.pvmax)!=null?g.pvmax:f.pvmax||0,car={};
    CAR.forEach(function(k){var v=num(g[k])!=null?g[k]:f.car&&f.car[k];if(v)car[k]=v});
    // Initiative : modificateur de Dextérité + bonus en plus (don Vigilant…) ; Perception passive : 10 + modificateur de Sagesse, sauf valeur saisie
    var init=num(g.dex)!=null||num(g.binit)!=null?(num(g.dex)!=null?cmod(g.dex):0)+(g.binit||0):num(f.init)!=null?f.init:car.dex?cmod(car.dex):0;
    var pp=num(g.pp)!=null?g.pp:num(g.sag)!=null?10+cmod(g.sag):num(f.pp)!=null?f.pp:car.sag?10+cmod(car.sag):null;
    out.push({nom:nom,cl:g.cl||f.cl||'',car:car,niveau:Math.min(20,Math.max(1,num(g.niveau)||f.niveau||1)),pvmax:pvmax,pv:num(g.pvmax)!=null||f.pv==null?pvmax:f.pv,
      init:init,ca:num(g.ca)!=null?g.ca:num(f.ca),pp:pp,mj:true});
  });
  return out.concat(F);
}
// Le personnage actif est-il le MJ ?
function estMJ(){var c=window.Persos&&Persos.current();return !!c&&String(c.nom).trim().toLowerCase()==='mj'}
// Budget de PX par personnage selon son niveau (Guide du maître 2024) : difficulté faible, modérée, élevée
var BUDGET=[null,[50,75,100],[100,150,200],[150,225,400],[250,375,500],[500,750,1100],[600,1000,1400],[750,1300,1700],[1000,1700,2100],[1300,2000,2600],[1600,2300,3100],
  [1900,2900,4100],[2200,3700,4700],[2600,4200,5400],[2900,4900,6200],[3300,5400,7800],[3800,6100,9800],[4500,7200,11700],[5000,8700,14200],[5500,10700,17200],[6400,13200,22000]];
// Monstres envoyés au suivi de combat depuis une autre page
var QKEY='dnd_combat_ajout_v1';
function envoyer(list){try{var q=JSON.parse(localStorage.getItem(QKEY)||'[]');localStorage.setItem(QKEY,JSON.stringify(q.concat(list)));return true}catch(e){return false}}
function recevoir(){try{var q=JSON.parse(localStorage.getItem(QKEY)||'[]');localStorage.removeItem(QKEY);return Array.isArray(q)?q:[]}catch(e){return []}}
window.Monstres={load:load,get:function(n){return BYN[n]},all:function(){return DB||[]},block:block,esc:esc,norm:norm,col:col,tbase:tbase,xp:xp,fpl:fpl,pv:pv,rollPV:rollPV,ca:ca,dex:dex,init:init,rnd:rnd,
  joueurs:joueurs,fiches:fiches,CAR:CAR,cmod:cmod,groupe:groupe,setGroupe:setGroupe,estMJ:estMJ,BUDGET:BUDGET,envoyer:envoyer,recevoir:recevoir};
})();
