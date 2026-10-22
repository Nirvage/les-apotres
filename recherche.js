/* Recherche globale : un bouton « Rechercher » dans la barre du haut de chaque page (et sur l'accueil)
   ouvre une fenêtre qui trouve un sort, un objet, un équipement, un monstre, un familier, un don,
   une espèce, un historique, une classe, une capacité de classe, une sous-classe, une règle, une quête ou une page.

   Les données sont lues à la première ouverture dans les fichiers JSON du site et dans les pages de
   règles (états, combat, guide) : rien à tenir à jour quand une donnée est ajoutée. Le mode hors ligne
   (sw.js) enregistre ces fichiers, la recherche marche donc aussi sans réseau.

   Chaque résultat se déplie pour lire sa description sans quitter la page, avec un lien vers la page
   qui le présente. Les liens « page.html?q=nom » remplissent le champ de recherche de la page d'arrivée.
   Raccourcis clavier : « / » ou Ctrl+K. */
(function(){
'use strict';

var norm=function(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’‘`]/g,"'")};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var txt=function(html){return String(html==null?'':html).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()};
var br=function(s){return esc(s).replace(/\n/g,'<br>')};
var lien=function(page,q){return page+'?q='+encodeURIComponent(q)};
var line=function(label,v){return v?'<div><b>'+esc(label)+'</b> : '+esc(v)+'</div>':''};
var liste=function(a){return (a||[]).map(function(x){return '<p><b>'+esc(x.n||x.nom)+'.</b> '+(x.d!=null?x.d:esc(x.desc))+'</p>'}).join('')};

// Types de résultats : libellé, couleur, nom de la page d'arrivée, nom du filtre
var TYPES={
  sort:['Sort','#7a4fc4','le grimoire','Sorts'],
  objet:['Objet magique','#d8791a','les objets magiques','Objets magiques'],
  equip:['Équipement','#6b7a2a','l’équipement','Équipement'],
  monstre:['Monstre','#a0302a','le bestiaire','Monstres'],
  familier:['Familier','#2e9e5b','les familiers','Familiers'],
  don:['Don','#b8860b','les dons','Dons'],
  espece:['Espèce','#12968f','les espèces','Espèces'],
  classe:['Classe','#2f6fd0','la page des classes','Classes et sous-classes'],
  histo:['Historique','#8a5a2b','','Historiques'],
  regle:['Règle','#2a3170','la page','Règles'],
  quete:['Quête','#8e3a9d','les quêtes','Quêtes'],
  page:['Page','#5f6580','la page','Pages du site']
};

/* ---------- Construction de l'index ---------- */
var IDX=null,loading=null;

function get(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(u);return r.json()}).catch(function(){return null})}
function getText(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(u);return r.text()}).catch(function(){return ''})}

function add(out,o){
  // o : {t:type, n:nom, alt:autres noms, s:ligne courte, d:fonction qui renvoie le détail HTML, body:texte cherché, href}
  o.nn=norm(o.n);o.na=norm(o.alt||'');o.nb=norm(o.body||'');
  out.push(o);
}

function build(){
  if(loading)return loading;
  var files=['spells.json','objets.json','equipement.json','bestiaire.json','familiers.json','dons.json','especes.json','especes_infos.json',
    'capacites.json','sousclasses.json','historiques.json','quetes.json','classes_infos.json'];
  loading=Promise.all(files.map(get).concat([getText('etats.html'),getText('combat.html'),getText('guide.html'),getText('./'),getText('mj.html')])).then(function(r){
    var out=[];
    var sp=r[0],ob=r[1],eq=r[2],be=r[3],fa=r[4],dn=r[5],es=r[6],ei=r[7],ca=r[8],sc=r[9],hi=r[10],qu=r[11],ci=r[12]||{};
    var clsLien=function(cl,n){return 'classes.html#'+encodeURIComponent(cl)+(n?'/'+encodeURIComponent(n):'')};
    Object.keys(ci.classes||{}).forEach(function(cl){
      var k=ci.classes[cl];
      add(out,{t:'classe',n:cl,s:'Classe · d'+k.dv+' · '+k.prim,body:[k.pitch,k.jeu].concat(k.role||[]).join(' '),href:clsLien(cl),
        d:function(){return '<p>'+esc(k.pitch)+'</p>'+line('Rôles',(k.role||[]).join(', '))+'<h4>Conseils de jeu</h4>'+(k.conseils||[]).slice(0,3).map(function(x){return '<p>'+esc(x)+'</p>'}).join('')}});
    });
    (sp||[]).forEach(function(s){
      var p=String(s.n).split('|');
      var lv=+s.l?'Niveau '+s.l:'Sort mineur';
      add(out,{t:'sort',n:p[0],alt:p.slice(1).join(' '),s:lv+' · '+(s.e||'')+((s.c||[]).length?' · '+s.c.join(', '):''),
        body:txt(s.h),href:lien('grimoire.html',p[0]),
        d:function(){return line('Incantation',s.t)+line('Portée',s.r)+line('Composantes',s.k)+line('Durée',s.d)+(p[1]?line('Aussi appelé',p.slice(1).join(', ')):'')+'<div>'+s.h+'</div>'}});
    });
    (ob||[]).forEach(function(o){
      add(out,{t:'objet',n:o.n,alt:o.en,s:[o.t,o.q,o.a].filter(Boolean).join(' · '),body:txt(o.h),href:lien('objets.html',o.n),
        d:function(){return '<div>'+o.h+'</div>'+line('Source',o.src)}});
    });
    (eq||[]).forEach(function(o){
      add(out,{t:'equip',n:o.n,alt:o.en,s:[o.c||o.t,o.p].filter(Boolean).join(' · '),body:txt(o.h),href:lien('equipement.html',o.n),
        d:function(){return line('Prix',o.p)+line('Poids',o.kg!=null?String(o.kg).replace('.',',')+' kg':'')+'<div>'+(o.h||'')+'</div>'}});
    });
    var creature=function(t,page){return function(m){
      var body=[m.typ].concat((m.traits||[]).map(function(x){return x.n}),(m.actions||[]).map(function(x){return x.n})).join(' ');
      add(out,{t:t,n:m.n,alt:m.en,s:[m.tail,m.typ,m.fp!=null?'FP '+m.fp:'',m.o].filter(Boolean).join(' · '),body:body,href:lien(page,m.n),
        d:function(){
          var C=['For','Dex','Con','Int','Sag','Cha'];
          var car=(m.car||[]).map(function(v,i){var b=Math.floor((v-10)/2);return C[i]+' '+v+' ('+(b>=0?'+':'−')+Math.abs(b)+')'}).join(' · ');
          return line('CA',m.ca)+line('PV',m.pv)+line('Vitesse',m.vit)+(car?'<div>'+esc(car)+'</div>':'')+line('Sens',m.sens)
            +liste(m.traits)+[['actions','Actions'],['bonus','Actions bonus'],['reac','Réactions'],['leg','Actions légendaires']].map(function(k){
              return (m[k[0]]||[]).length?'<h4>'+k[1]+'</h4>'+liste(m[k[0]]):''}).join('')+(m.note?'<p><i>'+esc(m.note)+'</i></p>':'');
        }});
    }};
    (be||[]).forEach(creature('monstre','bestiaire.html'));
    (fa||[]).forEach(creature('familier','familiers.html'));
    (dn||[]).forEach(function(x){
      add(out,{t:'don',n:x.nom,s:[x.cat,x.pre?'Prérequis : '+x.pre:''].filter(Boolean).join(' · '),body:x.desc,href:'dons.html#'+encodeURIComponent(x.id),
        d:function(){return '<p>'+br(x.desc)+'</p>'+line('Source',x.src)}});
    });
    var infos=(ei&&ei.infos)||{},extra=(ei&&ei.extra)||{};
    var espece=function(n,e){
      var i=infos[n]||{};
      add(out,{t:'espece',n:n,s:[e.type||i.type,e.taille,e.vit?'Vitesse '+e.vit+' m':''].filter(Boolean).join(' · '),
        body:(e.traits||[]).map(function(x){return x.nom+' '+x.desc}).join(' '),href:'especes.html#'+encodeURIComponent(n),
        d:function(){return (e.app||i.app?'<p>'+esc(e.app||i.app)+'</p>':'')+liste(e.traits)}});
    };
    Object.keys(es||{}).forEach(function(n){espece(n,es[n])});
    Object.keys(extra).forEach(function(n){if(!(es&&es[n]))espece(n,extra[n])});
    Object.keys(ca||{}).forEach(function(cl){
      (ca[cl]||[]).forEach(function(x){
        add(out,{t:'classe',n:x.nom,alt:cl,s:cl+' · niv. '+x.niv,body:x.desc,href:clsLien(cl),d:function(){return '<p>'+br(x.desc)+'</p>'}});
      });
    });
    Object.keys(sc||{}).forEach(function(cl){
      Object.keys(sc[cl]||{}).forEach(function(n){
        var f=sc[cl][n].feats||[],tip=((ci.sous||{})[cl]||{})[n];
        add(out,{t:'classe',n:n,alt:cl,s:'Sous-classe · '+cl,body:f.map(function(x){return x.nom}).join(' ')+(tip?' '+tip.t:''),href:clsLien(cl,n),
          d:function(){return (tip?'<p><i>'+esc(tip.t)+'</i></p>':'')+f.map(function(x){return '<p><b>Niv. '+x.niv+' · '+esc(x.nom)+'.</b> '+br(x.desc)+'</p>'}).join('')}});
        f.forEach(function(x){
          add(out,{t:'classe',n:x.nom,alt:n+' '+cl,s:n+' ('+cl+') · niv. '+x.niv,body:x.desc,href:clsLien(cl,n),d:function(){return '<p>'+br(x.desc)+'</p>'}});
        });
      });
    });
    Object.keys(hi||{}).forEach(function(n){
      var h=hi[n];
      add(out,{t:'histo',n:n,s:(h.comp||[]).join(', '),body:h.desc,
        d:function(){return '<p>'+br(h.desc)+'</p>'+line('Compétences',(h.comp||[]).join(', '))+line('Outil',h.outil)}});
    });
    (qu||[]).forEach(function(x){
      add(out,{t:'quete',n:x.t,s:[x.type,x.lieu,x.niv?'niv. '+x.niv:''].filter(Boolean).join(' · '),body:[x.acc,x.obj,x.lieu].join(' '),
        href:lien('quetes.html',x.t),d:function(){return line('Lieu',x.lieu)+'<p>'+esc(x.acc)+'</p><p>'+esc(x.obj)+'</p>'}});
    });
    regles(out,r[13],r[14],r[15]);
    pages(out,r[16]);pages(out,r[17]);
    IDX=out;
    return out;
  });
  return loading;
}

// Règles : lues dans le texte des pages (les états et le combat sont des listes dans leur script)
function regles(out,etats,combat,guide){
  var slug=function(s){return norm(s).replace(/[^a-z]+/g,'-')};
  var str="'((?:[^'\\\\]|\\\\.)*)'";
  var re=new RegExp("\\{n:"+str+",a:"+str+"[^]*?s:"+str,'g'),m;
  while((m=re.exec(etats))){
    (function(n,a,s){add(out,{t:'regle',n:n,alt:a,s:'État',body:s,href:'etats.html#'+slug(n),d:function(){return '<p>'+esc(s)+'</p>'}})})(m[1],m[2],m[3]);
  }
  var x=etats.split('const X=[')[1];
  if(x){
    var rx=new RegExp("\\[\\s*"+str+",\\s*"+str,'g');
    while((m=rx.exec(x.split('];')[0]))){
      (function(n,s){add(out,{t:'regle',n:n,s:'Situation proche des états',body:txt(s),href:'etats.html#autres',d:function(){return '<p>'+esc(txt(s))+'</p>'}})})(m[1],m[2]);
    }
  }
  (combat.split('const S=[')[1]||'').split(/\n \{id:/).slice(1).forEach(function(chunk){
    var head=new RegExp("^"+str+",c:"+str+",t:"+str).exec(chunk);
    if(!head)return;
    var id=head[1],titre=head[3],rows=[],rr=new RegExp("\\[\\s*"+str+",\\s*"+str+"\\]",'g'),k;
    while((k=rr.exec(chunk)))rows.push([k[1],txt(k[2])]);
    add(out,{t:'regle',n:titre,s:'Règles du combat',body:rows.map(function(x){return x[0]}).join(' '),href:'combat.html#'+id,
      d:function(){return rows.map(function(x){return '<p><b>'+esc(x[0])+'.</b> '+esc(x[1])+'</p>'}).join('')}});
    rows.forEach(function(x){
      add(out,{t:'regle',n:x[0],alt:titre,s:'Combat · '+titre,body:x[1],href:'combat.html#'+id,d:function(){return '<p>'+esc(x[1])+'</p>'}});
    });
  });
  if(guide&&window.DOMParser){
    var doc=new DOMParser().parseFromString(guide,'text/html'),h2='',id='',cur=null;
    doc.querySelectorAll('main h2,main h3,main p,main li,main td').forEach(function(el){
      if(el.tagName==='H2'||el.tagName==='H3'){
        var n=el.textContent.replace(/^\d+\.\s*/,'').trim();
        if(el.tagName==='H2'){h2=n;id=el.id||id}
        cur={parts:[]};
        (function(c){add(out,c.o={t:'regle',n:n,s:'Guide du débutant'+(el.tagName==='H3'?' · '+h2:''),body:'',href:'guide.html'+(id?'#'+id:''),
          d:function(){return c.parts.slice(0,6).map(function(p){return '<p>'+esc(p)+'</p>'}).join('')+(c.parts.length>6?'<p>…</p>':'')}})})(cur);
      }else if(cur&&!el.parentNode.closest('li,td')){
        var t=el.textContent.replace(/\s+/g,' ').trim();
        if(t){cur.parts.push(t);cur.o.nb+=' '+norm(t)}
      }
    });
  }
}

// Pages du site : les cartes de l'accueil et de l'espace du MJ
function pages(out,html){
  if(!html||!window.DOMParser)return;
  var doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('a.card').forEach(function(a){
    var h=a.querySelector('h2,h3'),p=a.querySelector('p');
    if(!h)return;
    var s=p?p.textContent.trim():'';
    add(out,{t:'page',n:h.textContent.trim(),s:s,body:s,href:a.getAttribute('href'),d:function(){return ''}});
  });
}

/* ---------- Recherche ---------- */
function score(o,q,words){
  if(o.nn===q)return 1000;
  if(o.nn.indexOf(q)===0)return 800-o.nn.length;
  var i=o.nn.indexOf(q);
  if(i>0)return (/[^a-z0-9]/.test(o.nn[i-1])?700:600)-o.nn.length;
  var all=function(s){return words.every(function(w){return s.indexOf(w)>=0})};
  if(all(o.nn))return 500-o.nn.length;
  if(o.na.indexOf(q)>=0)return 450;
  if(all(o.nn+' '+o.na))return 400;
  if(all(o.nn+' '+o.na+' '+o.nb))return 100;
  return 0;
}

/* ---------- Fenêtre ---------- */
var dlg,inp,res,chips,filt='',stamp=0;

var CSS='\
.rg-btn{white-space:nowrap}\
.rg-home{display:flex;align-items:center;gap:10px;width:100%;max-width:560px;padding:12px 16px;border:2px solid var(--gold,#d9a21b);border-radius:999px;background:#fff;color:#5f6580;font-size:15px;cursor:text;text-align:left;box-shadow:0 6px 28px #0006}\
.rg-home:hover,.rg-home:focus-visible{outline:3px solid var(--gold,#d9a21b);outline-offset:2px}\
.rg-home kbd,.rg-hint kbd{margin-left:auto;font:12px var(--sans,sans-serif);border:1px solid #c9cde0;border-radius:4px;padding:1px 6px;color:#5f6580}\
#rg{width:min(760px,100vw - 24px);max-height:calc(100vh - 48px);margin:24px auto auto;padding:0;border:0;border-top:4px solid var(--gold,#d9a21b);border-radius:10px;background:#fff;color:var(--ink,#1d2033);font:14px/1.45 var(--sans,system-ui,sans-serif);box-shadow:0 10px 40px #000a;display:none;flex-direction:column}\
#rg[open]{display:flex}\
#rg::backdrop{background:#0b0d22b3}\
#rg .rg-h{flex:0 0 auto;display:flex;gap:8px;align-items:center;padding:12px 12px 8px}\
#rg input{flex:1;min-width:0;font-size:16px;padding:9px 12px;border:1px solid #c9cde0;border-radius:8px}\
#rg .rg-x{border:0;background:transparent;font-size:22px;line-height:1;padding:4px 8px;cursor:pointer;color:#5f6580}\
#rg .rg-c{flex:0 0 auto;display:flex;gap:6px;overflow-x:auto;padding:0 12px 8px;scrollbar-width:thin}\
#rg .rg-c button{flex:0 0 auto;font-size:12px;padding:4px 10px;border:1px solid #c9cde0;border-radius:999px;background:#fff;cursor:pointer}\
#rg .rg-c button[aria-pressed=true]{background:#2a3170;border-color:#2a3170;color:#fff}\
#rg .rg-r{overflow-y:auto;border-top:1px solid #e3e5f0;padding:4px 0 8px;flex:1}\
#rg .rg-i{border-bottom:1px solid #eef0f7}\
#rg .rg-i>button{display:flex;gap:10px;align-items:baseline;width:100%;text-align:left;border:0;background:transparent;padding:8px 14px;cursor:pointer}\
#rg .rg-i>button:hover,#rg .rg-i>button:focus-visible{background:#f3f4fb;outline:0}\
#rg .rg-t{flex:0 0 auto;font-size:11px;font-weight:600;color:#fff;background:var(--k);border-radius:4px;padding:1px 6px}\
#rg .rg-n{font-weight:600}\
#rg .rg-s{display:block;font-size:12px;color:#5f6580}\
#rg .rg-d{padding:2px 16px 12px 16px;font-size:13.5px;border-left:3px solid var(--k);margin:0 14px 10px;background:#fafbff}\
#rg .rg-d p{margin:6px 0}#rg .rg-d h4{margin:10px 0 4px;font-size:13px}\
#rg .rg-d table{border-collapse:collapse;font-size:12px}#rg .rg-d td,#rg .rg-d th{border:1px solid #dde;padding:2px 5px}\
#rg .rg-go{display:inline-block;margin-top:6px;font-weight:600;color:#2f6fd0}\
#rg .rg-m{padding:14px;color:#5f6580}\
#rg mark{background:#ffe9a8;color:inherit;border-radius:2px}\
@media screen and (max-width:700px){.rg-home kbd{display:none}#rg{width:100vw;max-width:100vw;height:100%;max-height:100%;margin:0;border-radius:0}}\
@media print{.rg-btn,.rg-home{display:none!important}}';

function ui(){
  if(dlg)return;
  dlg=document.createElement('dialog');
  dlg.id='rg';
  dlg.setAttribute('aria-label','Recherche globale');
  dlg.innerHTML='<div class="rg-h"><input type="search" placeholder="Sort, objet, monstre, don, règle…" aria-label="Rechercher dans tout le site" autocomplete="off" enterkeyhint="search">'
    +'<button type="button" class="rg-x" aria-label="Fermer">×</button></div><div class="rg-c" role="group" aria-label="Filtrer par type"></div><div class="rg-r" aria-live="polite"></div>';
  document.body.appendChild(dlg);
  inp=dlg.querySelector('input');res=dlg.querySelector('.rg-r');chips=dlg.querySelector('.rg-c');
  chips.innerHTML='<button type="button" data-t="" aria-pressed="true">Tout</button>'+Object.keys(TYPES).map(function(k){
    return '<button type="button" data-t="'+k+'" aria-pressed="false">'+esc(TYPES[k][3])+'</button>'}).join('');
  chips.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    filt=b.dataset.t;chips.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b)});
    run();
  });
  dlg.querySelector('.rg-x').onclick=function(){dlg.close()};
  dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
  inp.addEventListener('input',run);
  inp.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){var f=res.querySelector('.rg-i>button');if(f){e.preventDefault();f.focus()}}
    if(e.key==='Enter'){var g=res.querySelector('.rg-i>button');if(g){e.preventDefault();g.click()}}
  });
  res.addEventListener('keydown',function(e){
    var b=e.target.closest('.rg-i>button');if(!b)return;
    var items=[].slice.call(res.querySelectorAll('.rg-i>button')),i=items.indexOf(b);
    if(e.key==='ArrowDown'&&items[i+1]){e.preventDefault();items[i+1].focus()}
    if(e.key==='ArrowUp'){e.preventDefault();(items[i-1]||inp).focus()}
  });
  res.addEventListener('click',function(e){
    var b=e.target.closest('.rg-i>button');if(!b)return;
    var li=b.parentNode,d=li.querySelector('.rg-d');
    if(d){d.remove();b.setAttribute('aria-expanded','false');return}
    var o=shown[+li.dataset.i];if(!o)return;
    d=document.createElement('div');d.className='rg-d';
    var here=o.href&&o.href.split(/[?#]/)[0]===location.pathname.split('/').pop();
    d.innerHTML=(o.d()||'')+(o.href?'<a class="rg-go" href="'+esc(o.href)+'">Ouvrir dans '+esc(TYPES[o.t][2])+' →</a>':'');
    if(here){var a=d.querySelector('.rg-go');a.addEventListener('click',function(){dlg.close();setTimeout(function(){applyQ(true)},0)})}
    li.appendChild(d);b.setAttribute('aria-expanded','true');
  });
}

var shown=[];
function hl(s,q,words){
  // surligne la recherche entière dans le nom, sinon chaque mot d'au moins 3 lettres
  // (norm garde les positions tant que le nom n'a que des lettres simples ou accentuées)
  var n=norm(s);
  if(n.length!==s.length)return esc(s);
  var on=new Array(s.length).fill(false),mark=function(w){var p=n.indexOf(w);if(p<0)return false;for(var i=p;i<p+w.length;i++)on[i]=true;return true};
  if(!mark(q))words.forEach(function(w){if(w.length>=3)mark(w)});
  var h='',open=false;
  for(var i=0;i<s.length;i++){
    if(on[i]!==open){h+=open?'</mark>':'<mark>';open=on[i]}
    h+=esc(s[i]);
  }
  return h+(open?'</mark>':'');
}
function run(){
  var q=norm(inp.value.trim()).replace(/\s+/g,' ');
  if(!q){res.innerHTML='<div class="rg-m">Tape un nom ou un mot : « boule de feu », « sac sans fond », « gobelin », « agrippé », « vigilant »…</div>';shown=[];return}
  if(!IDX){
    res.innerHTML='<div class="rg-m">Chargement des données…</div>';
    var s=++stamp;build().then(function(){if(s===stamp)run()});return;
  }
  var words=q.split(' ');
  var hits=[];
  for(var i=0;i<IDX.length;i++){
    var o=IDX[i];if(filt&&o.t!==filt)continue;
    var sc=score(o,q,words);if(sc)hits.push([sc,o]);
  }
  hits.sort(function(a,b){return b[0]-a[0]||a[1].n.localeCompare(b[1].n,'fr')});
  shown=hits.slice(0,80).map(function(h){return h[1]});
  if(!shown.length){res.innerHTML='<div class="rg-m">Rien trouvé'+(filt?' dans ce type (essaie « Tout »)':'')+'.</div>';return}
  res.innerHTML=shown.map(function(o,i){
    var T=TYPES[o.t];
    return '<div class="rg-i" data-i="'+i+'" style="--k:'+T[1]+'"><button type="button" aria-expanded="false"><span class="rg-t">'+esc(T[0])+'</span><span><span class="rg-n">'+hl(o.n,q,words)+'</span>'
      +(o.s?'<span class="rg-s">'+esc(o.s.length>140?o.s.slice(0,140)+'…':o.s)+'</span>':'')+'</span></button></div>';
  }).join('')+(hits.length>shown.length?'<div class="rg-m">'+(hits.length-shown.length)+' autres résultats : précise ta recherche.</div>':'');
}

function open(q){
  ui();
  if(!dlg.open){try{dlg.showModal()}catch(e){dlg.setAttribute('open','')}}
  if(q!=null)inp.value=q;
  inp.focus();inp.select();
  run();
  build();
}

/* ---------- Arrivée sur une page avec ?q=… ---------- */
function applyQ(force){
  var q;
  try{q=new URLSearchParams(location.search).get('q')}catch(e){q=null}
  if(!q)return;
  var f=document.getElementById('fq')||document.getElementById('q');
  if(!f||(!force&&f.value===q))return;
  // les autres filtres de la page pourraient cacher le résultat : on les remet à « tous »
  var box=f.closest('section,.qbar');
  if(box)box.querySelectorAll('select').forEach(function(s){
    if(s.value!==''&&s.options.length&&s.options[0].value===''){s.value='';s.dispatchEvent(new Event('change',{bubbles:true}))}
  });
  f.value=q;f.dispatchEvent(new Event('input',{bubbles:true}));
}

/* ---------- Mise en place ---------- */
function init(){
  var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  var bar=document.querySelector('.top .bar')||document.querySelector('.bar');
  if(bar){
    var b=document.createElement('button');
    b.type='button';b.className='rg-btn';b.textContent='🔍 Rechercher';b.title='Rechercher dans tout le site (touche /)';
    b.onclick=function(){open()};
    var home=bar.querySelector('.home');
    if(home&&home.nextSibling)bar.insertBefore(b,home.nextSibling);else bar.insertBefore(b,bar.firstChild);
  }else{
    var h=document.querySelector('body>header');
    if(h){
      var c=document.createElement('button');
      c.type='button';c.className='rg-home';
      c.innerHTML='<span aria-hidden="true">🔍</span><span>Rechercher un sort, un objet, un monstre, une règle…</span><kbd>/</kbd>';
      c.onclick=function(){open()};
      h.parentNode.insertBefore(c,h.nextSibling);
    }
  }
  document.addEventListener('keydown',function(e){
    var t=e.target,typing=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
    if((e.key==='k'||e.key==='K')&&(e.ctrlKey||e.metaKey)){e.preventDefault();open();return}
    if(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();open()}
  });
  // les pages chargent leurs données puis restaurent leurs filtres : on remplit le champ après, puis on vérifie
  applyQ();
  setTimeout(applyQ,700);
  setTimeout(applyQ,1800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.Recherche={open:open};
})();
