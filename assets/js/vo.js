/* Version originale : un bouton « VO » à côté d'un sort, d'un objet, d'un monstre, d'une classe…
   ouvre une fenêtre avec son nom anglais et le livre d'origine.

   Le texte anglais complet n'est affiché que pour le contenu du SRD (System Reference Document 5.1 / 5.2.1),
   publié par Wizards of the Coast sous licence libre CC-BY-4.0 : c'est le texte officiel, pas une retraduction.
   Le reste des livres n'est pas libre de droits : la fenêtre donne alors le nom anglais et un lien de recherche
   sur D&D Beyond, la plateforme officielle.

   Les données (json/vo/*.json) sont générées à partir des données 5etools et lues à la première ouverture.
   Usage dans une page : VO.btn('sorts', nom) renvoie le HTML du bouton ; un clic n'importe où suffit. */
(function(){
'use strict';

var FILES={
  sorts:'json/vo/sorts.json',objets:'json/vo/objets.json',equipement:'json/vo/equipement.json',monstres:'json/vo/monstres.json',
  familiers:'json/vo/familiers.json',dons:'json/vo/dons.json',classes:'json/vo/classes.json',especes:'json/vo/especes.json',
  historiques:'json/vo/historiques.json',etats:'json/vo/etats.json'
};
var SRD={
  '52':'This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.',
  '51':'This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.'
};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var DATA={},LOAD={};

function load(k){
  if(DATA[k])return Promise.resolve(DATA[k]);
  if(!LOAD[k])LOAD[k]=fetch(FILES[k]).then(function(r){if(!r.ok)throw new Error(FILES[k]);return r.json()})
    .then(function(d){DATA[k]=d;return d}).catch(function(e){LOAD[k]=null;throw e});
  return LOAD[k];
}
// json/vo/classes.json regroupe trois tables : classes, capacites, sous
function find(d,k,id){
  if(k==='classes'){
    var p=id.split('§');
    return (d[p[0]]||{})[p[1]];
  }
  return d[id];
}

var CSS='\
.vo-btn{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;min-width:30px;min-height:22px;margin-left:6px;padding:1px 6px;border:1px solid #9aa0c4;border-radius:5px;background:#fff;color:#2a3170;font:600 10.5px/1.6 var(--sans,system-ui,sans-serif);letter-spacing:.04em;vertical-align:middle;cursor:pointer;white-space:nowrap}\
.vo-btn:hover,.vo-btn:focus-visible{background:#2a3170;border-color:#2a3170;color:#fff;outline:0}\
#vo{width:min(720px,100vw - 24px);max-height:calc(100vh - 48px);margin:24px auto auto;padding:0;border:0;border-top:4px solid var(--gold,#d9a21b);border-radius:10px;background:#fff;color:var(--ink,#1d2033);font:14px/1.5 var(--sans,system-ui,sans-serif);box-shadow:0 10px 40px #000a;display:none;flex-direction:column}\
#vo[open]{display:flex}\
#vo::backdrop{background:#0b0d22b3}\
#vo .vo-h{display:flex;gap:10px;align-items:flex-start;padding:12px 14px 10px;border-bottom:1px solid #e3e5f0}\
#vo .vo-h div{flex:1;min-width:0}\
#vo .vo-n{margin:0;font:italic 700 21px/1.2 var(--serif,Georgia,serif);color:#2a3170}\
#vo .vo-s{font-size:12px;color:#5f6580}\
#vo .vo-x{border:0;background:transparent;font-size:24px;line-height:1;padding:2px 8px;cursor:pointer;color:#5f6580}\
#vo .vo-b{overflow-y:auto;padding:6px 16px 14px}\
#vo .vo-b p{margin:8px 0}#vo .vo-b h4{margin:12px 0 4px;padding-bottom:2px;border-bottom:1px solid #d9a21b;font:italic 700 15px var(--serif,Georgia,serif);color:#7a1f1f}\
#vo .vo-b ul{margin:6px 0;padding-left:20px}\
#vo .vo-sub{color:#5f6580}\
#vo .vo-t{border-collapse:collapse;font-size:12.5px;margin:6px 0;max-width:100%}#vo .vo-t td,#vo .vo-t th{border:1px solid #dde;padding:2px 6px;text-align:left;vertical-align:top}\
#vo .vo-ab td,#vo .vo-ab th{text-align:center}\
#vo .vo-note{margin-top:12px;padding:8px 10px;background:#f4f5fb;border-radius:6px;font-size:13px}\
#vo .vo-note a{color:#2f6fd0;font-weight:600}\
#vo .vo-lic{margin-top:14px;font-size:11px;color:#5f6580}\
@media screen and (max-width:700px){#vo{width:100vw;max-width:100vw;height:100%;max-height:100%;margin:0;border-radius:0}.vo-btn{min-height:26px;min-width:34px}}\
@media print{.vo-btn{display:none!important}}';

var dlg,body,title,sub;
function ui(){
  if(dlg)return;
  dlg=document.createElement('dialog');
  dlg.id='vo';
  dlg.setAttribute('aria-label','Version originale en anglais');
  dlg.innerHTML='<div class="vo-h"><div><p class="vo-n" lang="en"></p><div class="vo-s"></div></div><button type="button" class="vo-x" aria-label="Fermer">×</button></div><div class="vo-b"></div>';
  title=dlg.querySelector('.vo-n');sub=dlg.querySelector('.vo-s');body=dlg.querySelector('.vo-b');
  dlg.querySelector('.vo-x').onclick=function(){dlg.close()};
  dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
  document.body.appendChild(dlg);
}

// Page VO d'AideDD : règles 2024 (« 5.5 ») pour les livres 2024, sinon pages 2014.
// Les adresses reprennent le nom anglais : minuscules, tout le reste devient « - » (Heward's Handy Haversack → heward-s-handy-haversack)
var AIDEDD={sorts:['spell/','dnd/sorts.php?vo='],objets:['magic-item/','dnd/om.php?vo='],monstres:['monster/','dnd/monstres.php?vo='],
  familiers:['monster/','dnd/monstres.php?vo='],dons:['feat/','dnd/dons.php?vo=']};
function aidedd(k,o){
  var p=AIDEDD[k];
  if(!p||o.i||!o.s)return '';
  var slug=String(o.n).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  var v24=/Player's Handbook \(2024\)|Dungeon Master's Guide \(2024\)|Monster Manual \(2025\)/.test(o.s);
  return 'https://www.aidedd.org/'+p[v24?0:1]+slug;
}

function show(k,id,fr){
  ui();
  title.textContent='Version originale';sub.textContent=fr||'';body.innerHTML='<p class="vo-sub">Chargement…</p>';
  if(!dlg.open){try{dlg.showModal()}catch(e){dlg.setAttribute('open','')}}
  load(k).then(function(d){
    var o=find(d,k,id);
    if(!o){
      title.textContent='Pas de version originale';
      body.innerHTML='<p>Aucune version anglaise officielle n’a été trouvée pour cet élément : il vient d’une source non publiée en anglais dans les données utilisées (D&amp;D Beyond Drops, création personnelle…) ou a été ajouté au site sans équivalent.</p>';
      return;
    }
    title.textContent=o.n;
    sub.textContent=(fr?fr+' · ':'')+(o.s||'Source anglaise');
    var h='';
    if(o.h){
      h+='<div lang="en">'+o.h+'</div>';
      h+='<p class="vo-lic" lang="en">'+esc(SRD[o.l]||'')+'</p>';
    }else{
      if(o.f&&o.f.length)h+='<p class="vo-sub">Capacités (noms et niveaux du livre d’origine)</p><p lang="en">'+o.f.map(function(x){return 'Level '+x[0]+': '+esc(x[1])}).join('<br>')+'</p>';
      h+='<div class="vo-note">Le texte anglais de cet élément n’est pas sous licence libre (hors SRD), il ne peut donc pas être reproduit ici. '
        +(o.x?'Il se trouve dans le livre indiqué ci-dessus.':aidedd(k,o)?'<a href="'+aidedd(k,o)+'" target="_blank" rel="noopener">Lire la version originale sur AideDD</a>.'
          :'<a href="https://www.dndbeyond.com/search?q='+encodeURIComponent(o.n)+'" target="_blank" rel="noopener">Lire la version originale sur D&amp;D Beyond</a> (livre requis pour le contenu payant).')+'</div>';
    }
    body.innerHTML=h;body.scrollTop=0;
  }).catch(function(){
    body.innerHTML='<p>Impossible de charger la version originale. Vérifie ta connexion, puis réessaie.</p>';
  });
}

// Bouton à insérer dans une carte : VO.btn('sorts', 'Boule de feu') ; pour les classes : VO.btn('classes', 'sous§Clerc|Domaine de la Vie')
function btn(k,id,fr){
  return '<button type="button" class="vo-btn" data-vo="'+esc(k)+'" data-vo-id="'+esc(id)+'"'+(fr?' data-vo-fr="'+esc(fr)+'"':'')
    +' title="Version originale (anglais)" aria-label="Version originale en anglais">VO</button>';
}

// Capture : le clic ne déclenche pas l'action de la carte (déplier, ajouter…)
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('.vo-btn');
  if(!b)return;
  e.preventDefault();e.stopPropagation();
  show(b.getAttribute('data-vo'),b.getAttribute('data-vo-id'),b.getAttribute('data-vo-fr')||'');
},true);

var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
window.VO={btn:btn,show:show,load:load};
})();
