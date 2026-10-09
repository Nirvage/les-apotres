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

/* ---------- Export / import du personnage complet (utilisé par la page d'accueil) ---------- */
var PARTS=['fiche','grimoire','objets','equipement'];
function listAll(){var s=load();return s.ordre.map(function(id){return {id:id,nom:s.persos[id].nom,actif:id===s.actif}})}
function activate(id){var s=load();if(!s.persos[id])return;s.actif=id;save(s);cur=id}
/* Fiche : clés internes <-> noms lisibles pour le fichier exporté */
var SKN=['Acrobaties','Arcanes','Athlétisme','Discrétion','Dressage','Escamotage','Histoire','Intimidation','Intuition','Investigation','Médecine','Nature','Perception','Persuasion','Religion','Représentation','Supercherie','Survie'];
var ABN={for:'Force',dex:'Dextérité',con:'Constitution',int:'Intelligence',sag:'Sagesse',cha:'Charisme'};
function fmap(){
  var m=[],i;
  function add(k,sec,lab){m.push([k,sec,lab])}
  [['nom','identité','nom'],['classe','identité','classe'],['sousclasse','identité','sous-classe'],['espece','identité','espèce'],['historique','identité','historique'],['alignement','identité','alignement'],['niveau','identité','niveau'],
   ['clsel','choix_dans_les_paramètres','classe'],['race','choix_dans_les_paramètres','espèce'],['sespece','choix_dans_les_paramètres','sous-espèce'],['sclasse','choix_dans_les_paramètres','sous-classe'],['bgsel','choix_dans_les_paramètres','historique'],
   ['b_init','bonus_divers','initiative'],['b_ca','bonus_divers','classe_d_armure'],['b_dd','bonus_divers','DD_de_sauvegarde'],['b_atk','bonus_divers','attaque_de_sort'],
   ['dvtot','combat','dés_de_vie_total'],['dvrest','combat','dés_de_vie_restants'],['vitesse','combat','vitesse'],['inspi','combat','inspiration'],['pvmax','combat','pv_max'],['pv','combat','pv_actuels'],['pvtemp','combat','pv_temporaires'],
   ['ds1','jets_contre_la_mort','réussite_1'],['ds2','jets_contre_la_mort','réussite_2'],['ds3','jets_contre_la_mort','réussite_3'],['df1','jets_contre_la_mort','échec_1'],['df2','jets_contre_la_mort','échec_2'],['df3','jets_contre_la_mort','échec_3'],
   ['pc','pièces','cuivre'],['pa','pièces','argent'],['pe','pièces','électrum'],['po','pièces','or'],['pp_','pièces','platine'],
   ['equip','textes','équipement'],['capacites','textes','capacités_et_traits'],['religion','textes','religion_et_pactes'],['langues','textes','langues_et_maîtrises'],['notes','textes','notes'],
   ['cast','sorts','caractéristique_d_incantation'],['sclance','sorts','case_spéciale_cochée'],['sorts','sorts','texte_sorts']].forEach(function(x){add(x[0],x[1],x[2])});
  Object.keys(ABN).forEach(function(k){add('ab_'+k,'caractéristiques',ABN[k]+'_valeur');add('sv_'+k,'caractéristiques',ABN[k]+'_sauvegarde_maîtrisée')});
  for(i=0;i<SKN.length;i++){add('sk_'+i,'compétences',SKN[i]+'_maîtrise');add('ske_'+i,'compétences',SKN[i]+'_expertise')}
  for(i=0;i<5;i++){add('a'+i+'_n','attaques','attaque_'+(i+1)+'_nom');add('a'+i+'_b','attaques','attaque_'+(i+1)+'_bonus');add('a'+i+'_d','attaques','attaque_'+(i+1)+'_dégâts');add('obj'+i,'objets_liés','objet_'+(i+1))}
  for(i=1;i<=9;i++){add('sl'+i+'_u','emplacements_de_sorts','niveau_'+i+'_utilisés');add('sl'+i+'_t','emplacements_de_sorts','niveau_'+i+'_total')}
  return m;
}
function ficheLisible(f){
  if(!f||!f.data)return null;
  var d=f.data,o={},m=fmap(),used={};
  m.forEach(function(x){
    if(!(x[0] in d))return;
    used[x[0]]=1;
    (o[x[1]]=o[x[1]]||{})[x[2]]=d[x[0]];
  });
  var other={};Object.keys(d).forEach(function(k){if(!used[k]&&k!=='ress'&&k!=='extras')other[k]=d[k]});
  if(Object.keys(other).length)o.autres=other;
  o.ressources_suivies=d.ress||{};
  o.choix_dons_espèce_sous_classe=d.extras||{};
  return {format:'fiche-dnd-5e',version:f.version,contenu:o};
}
function ficheInterne(l){
  if(!l||!l.contenu)return null;
  var c=l.contenu,d={};
  fmap().forEach(function(x){if(c[x[1]]&&x[2] in c[x[1]])d[x[0]]=c[x[1]][x[2]]});
  Object.assign(d,c.autres||{});
  d.ress=c.ressources_suivies||{};d.extras=c.choix_dons_espèce_sous_classe||{};
  return {version:l.version||5,type:'fiche-dnd-5e',data:d};
}
function exportActive(){
  var s=load(),p=s.persos[s.actif];
  var o={format:'personnage-dnd-5e',version:2,nom:p.nom};
  o.fiche=ficheLisible(p.fiche);
  var g=p.grimoire&&p.grimoire.data;
  o.grimoire=g?{titre:g.titre||'',sorts:g.sorts||[]}:null;
  var m=p.objets&&p.objets.data;
  o.objets_magiques=m?{titre:m.titre||'',objets:m.objets||[]}:null;
  var e=p.equipement&&p.equipement.data;
  o.equipement=e?{titre:e.titre||'',objets:e.objets||[]}:null;
  return o;
}
function importPerso(o){
  if(!o)throw new Error('format');
  var s=load(),p={id:uid(),nom:String(o.nom||'Personnage importé')};
  if(o.type==='personnage-dnd-5e'){   // ancien format (v1) : parties internes telles quelles
    PARTS.forEach(function(k){p[k]=o[k]&&o[k].data?o[k]:null});
  }else if(o.format==='personnage-dnd-5e'){
    p.fiche=ficheInterne(o.fiche);
    p.grimoire=o.grimoire?{version:1,type:'grimoire-dnd-5e',data:{titre:o.grimoire.titre||'',sorts:o.grimoire.sorts||[],filtres:{}}}:null;
    p.objets=o.objets_magiques?{version:1,type:'objets-dnd-5e',data:{titre:o.objets_magiques.titre||'',objets:o.objets_magiques.objets||[],filtres:{}}}:null;
    p.equipement=o.equipement?{version:1,type:'equipement-dnd-5e',data:{titre:o.equipement.titre||'',objets:o.equipement.objets||[],filtres:{}}}:null;
  }else throw new Error('format');
  s.persos[p.id]=p;s.ordre.push(p.id);s.actif=p.id;save(s);cur=p.id;
  return p;
}
// Parties qui contiennent quelque chose à imprimer pour le personnage actif
function printable(){
  var s=load(),p=s.persos[s.actif],r=[];
  function d(k){return p[k]&&p[k].data}
  if(d('fiche'))r.push('fiche');
  if(d('grimoire')&&(d('grimoire').sorts||[]).length)r.push('grimoire');
  if(d('objets')&&(d('objets').objets||[]).length)r.push('objets');
  if(d('equipement')&&(d('equipement').objets||[]).length)r.push('equipement');
  return r;
}

window.Persos={
  part:function(k){var s=load(),q=s.persos[s.actif];return q&&q[k]||null},
  list:listAll,activate:activate,exportActive:exportActive,importPerso:importPerso,printable:printable,
  init:init,
  save:flush,
  setName:setName,
  current:function(){return load().persos[cur]}
};
})();
