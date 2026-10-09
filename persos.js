/* Gestion des personnages, partagée par la fiche et le grimoire.

   Un personnage = { id, nom, fiche, grimoire }. Chaque page ne lit et n'écrit que sa
   propre part ("fiche" ou "grimoire"). Tout est conservé dans le navigateur (localStorage)
   sous une seule clé ; le personnage actif est retrouvé d'une page à l'autre.

   Usage côté page :
     Persos.init({
       part:'fiche',                 // part du personnage gérée par cette page
       mount:document.querySelector('#persos'),
       collect:()=>({...}),          // renvoie les données à enregistrer
       apply:(obj,perso)=>{...},     // charge les données (obj vaut null pour un personnage vierge)
       onName:nom=>{...},            // optionnel : le nom a changé via le sélecteur
       msg:texte=>{...}              // optionnel : message de confirmation
     });
     Persos.save();                  // à appeler après chaque modification
     Persos.setName(nom);            // optionnel : la page modifie le nom du personnage
*/
(function(){
'use strict';

var KEY='dnd_persos_v1';
// Anciennes clés (un seul personnage) : reprises à la première ouverture
var LEGACY={fiche:['fiche_dnd_v2','fiche_dnd_v1'],grimoire:['grimoire_dnd_v1']};

var cfg=null,cur=null,box=null,mem=null;

function uid(){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function parse(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
function h(tag,attrs,text){
  var e=document.createElement(tag);
  for(var k in attrs)e.setAttribute(k,attrs[k]);
  if(text!=null)e.textContent=text;
  return e;
}
function say(t){if(cfg&&cfg.msg)cfg.msg(t)}

/* ---------- Stockage ---------- */
function fresh(){
  var p={id:uid(),nom:'',fiche:null,grimoire:null};
  Object.keys(LEGACY).forEach(function(part){
    for(var i=0;i<LEGACY[part].length;i++){
      var o=parse(LEGACY[part][i]);
      if(o&&o.data&&typeof o.data==='object'){p[part]=o;break}
    }
  });
  p.nom=String(p.fiche&&p.fiche.data.nom||'').trim()
    ||String(p.grimoire&&p.grimoire.data.titre||'').trim()
    ||'Personnage 1';
  var s={version:1,actif:p.id,ordre:[p.id],persos:{}};
  s.persos[p.id]=p;
  return s;
}
function read(){
  var s=parse(KEY);
  return s&&s.persos&&Array.isArray(s.ordre)&&s.ordre.length?s:null;
}
// Si le navigateur refuse d'écrire (navigation privée…), on garde l'état en mémoire pour la session
function load(){return read()||mem||(mem=fresh())}
function save(s){mem=s;try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}

/* ---------- Actions ---------- */
function flush(){
  if(!cfg||!cur)return;
  var s=load(),p=s.persos[cur];
  if(!p)return;
  p[cfg.part]=cfg.collect();
  save(s);
}
function show(p){
  try{cfg.apply(p[cfg.part],p)}catch(e){cfg.apply(null,p)}
}
function select(id){
  if(id===cur)return;
  flush();
  var s=load();
  if(!s.persos[id])return;
  s.actif=id;save(s);cur=id;
  render();show(s.persos[id]);
}
function create(){
  var s=load(),def='Personnage '+(s.ordre.length+1);
  var n=prompt('Nom du nouveau personnage :',def);
  if(n===null)return;
  n=n.trim()||def;
  flush();
  s=load();
  var p={id:uid(),nom:n,fiche:null,grimoire:null};
  s.persos[p.id]=p;s.ordre.push(p.id);s.actif=p.id;save(s);cur=p.id;
  render();show(p);
  say('Personnage « '+n+' » créé');
}
function duplicate(){
  flush();
  var s=load(),src=s.persos[cur];
  if(!src)return;
  var p=JSON.parse(JSON.stringify(src));
  p.id=uid();p.nom=src.nom+' (copie)';
  if(p.fiche&&p.fiche.data)p.fiche.data.nom=p.nom;
  s.persos[p.id]=p;
  s.ordre.splice(s.ordre.indexOf(cur)+1,0,p.id);
  s.actif=p.id;save(s);cur=p.id;
  render();show(p);
  say('« '+src.nom+' » dupliqué (fiche et grimoire)');
}
function rename(){
  var s=load(),p=s.persos[cur];
  if(!p)return;
  var n=prompt('Nouveau nom du personnage :',p.nom);
  if(n===null)return;
  n=n.trim();
  if(!n)return;
  p.nom=n;
  if(p.fiche&&p.fiche.data)p.fiche.data.nom=n;   // le nom écrit sur la fiche suit
  save(s);render();
  if(cfg.onName)cfg.onName(n);
}
function remove(){
  var s=load(),p=s.persos[cur];
  if(!p||s.ordre.length<2)return;
  if(!confirm('Supprimer « '+p.nom+' » (fiche et grimoire) ? Cette action est définitive : pense à enregistrer des .json avant.'))return;
  var i=s.ordre.indexOf(cur);
  s.ordre.splice(i,1);delete s.persos[cur];
  var next=s.ordre[Math.min(i,s.ordre.length-1)];
  s.actif=next;save(s);cur=next;
  render();show(s.persos[next]);
  say('« '+p.nom+' » supprimé');
}
// Appelé par la page quand l'utilisateur change le nom directement (ex. champ « Nom » de la fiche)
function setName(n){
  n=String(n||'').trim();
  if(!n||!cur)return;
  var s=load(),p=s.persos[cur];
  if(!p||p.nom===n)return;
  p.nom=n;save(s);render();
}

/* ---------- Interface ---------- */
function render(){
  var s=load();
  box.textContent='';
  box.appendChild(h('span',{'class':'pl'},'Personnage'));
  var g=h('div',{'class':'pchips',role:'group','aria-label':'Choisir un personnage'});
  s.ordre.forEach(function(id){
    var p=s.persos[id];
    var b=h('button',{type:'button','class':'pc','aria-pressed':String(id===cur),title:p.nom},p.nom);
    b.onclick=function(){select(id)};
    g.appendChild(b);
  });
  var nb=h('button',{type:'button','class':'pc pnew'},'+ Nouveau');
  nb.onclick=create;g.appendChild(nb);
  box.appendChild(g);
  var a=h('div',{'class':'pacts'});
  [['Renommer',rename],['Dupliquer',duplicate],['Supprimer',remove]].forEach(function(x){
    var b=h('button',{type:'button'},x[0]);
    b.onclick=x[1];
    if(x[0]==='Supprimer'&&s.ordre.length<2){b.disabled=true;b.title='Il faut garder au moins un personnage'}
    a.appendChild(b);
  });
  box.appendChild(a);
}

function init(c){
  cfg=c;box=c.mount;
  var s=load();
  cur=s.persos[s.actif]?s.actif:s.ordre[0];
  s.actif=cur;save(s);
  render();show(s.persos[cur]);
}

// Modification faite dans un autre onglet : on rafraîchit la liste, et on recharge si notre personnage a disparu
addEventListener('storage',function(e){
  if(e.key!==KEY||!cfg)return;
  var s=read();
  if(!s)return;
  if(!s.persos[cur]){
    cur=s.persos[s.actif]?s.actif:s.ordre[0];
    render();show(s.persos[cur]);
  }else render();
});

window.Persos={
  init:init,
  save:flush,
  setName:setName,
  current:function(){return load().persos[cur]}
};
})();
