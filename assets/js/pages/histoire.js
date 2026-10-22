'use strict';
const $=s=>document.querySelector(s);
let tm=0;
function msg(t){const m=$('#msg');m.textContent=t;clearTimeout(tm);if(t)tm=setTimeout(()=>m.textContent='',3500)}

// Parties de l'histoire : [clé, titre, aide, couleur, grande zone, groupe de deux colonnes]
const SECS=[
 ['histoire','Histoire','son passé, d’où il vient, ce qui l’a mené à l’aventure','#2a3170',1],
 ['apparence','Apparence','âge, taille, allure, signes distinctifs','#2f6fd0'],
 ['personnalite','Traits de personnalité','manières, habitudes, façon de parler','#7a4fc4'],
 ['ideaux','Idéaux','ce en quoi il croit','#2e9e5b',0,'a'],
 ['liens','Liens','personnes, lieux ou objets auxquels il tient','#12968f',0,'a'],
 ['defauts','Défauts','faiblesses, vices, peurs','#c8402f',0,'b'],
 ['secrets','Secrets','ce que les autres ne savent pas (encore)','#9c3d8f',0,'b'],
 ['allies','Alliés, ennemis et organisations','famille, mentor, rivaux, guildes, cultes…','#d8791a'],
 ['objectifs','Objectifs','ce qu’il veut accomplir, à court et à long terme','#8a6d1f'],
];
const KEYS=SECS.map(s=>s[0]);

(function build(){
  const root=$('#secs');let grp=null,gk=null;
  SECS.forEach(([k,t,aide,c,big,g])=>{
    const s=document.createElement('section');
    s.className='sec'+(big?' big':'');s.style.setProperty('--c',c);s.dataset.k=k;
    s.innerHTML=`<h2><label for="t_${k}">${t}</label><span>${aide}</span></h2><textarea id="t_${k}" data-k="${k}" spellcheck="true"></textarea><div class="pv"></div>${big?'<div class="cnt"></div>':''}`;
    if(g){if(g!==gk){grp=document.createElement('div');grp.className='grid2';root.appendChild(grp);gk=g}grp.appendChild(s)}
    else{gk=null;root.appendChild(s)}
  });
})();

// La zone de texte grandit avec son contenu
function fit(t){t.style.height='auto';t.style.height=t.scrollHeight+2+'px'}
function count(){
  const t=$('#t_histoire'),n=t.value.trim()?t.value.trim().split(/\s+/).length:0;
  t.parentNode.querySelector('.cnt').textContent=n+' mot'+(n>1?'s':'');
}
function fitAll(){document.querySelectorAll('#secs textarea').forEach(fit);count()}

function collect(){
  const d={};
  KEYS.forEach(k=>d[k]=$('#t_'+k).value);
  return {version:1,type:'histoire-dnd-5e',data:d};
}
function show(obj){
  const d=obj&&obj.data||{};
  KEYS.forEach(k=>$('#t_'+k).value=String(d[k]||''));
  summary();fitAll();
}
// Résumé tiré de la fiche (classe, niveau, espèce, historique)
function summary(){
  const p=Persos.current(),f=p&&p.fiche&&p.fiche.data||{};
  const cl=[f.classe,f.sousclasse].filter(Boolean).join(' — ');
  $('#sum').textContent=[cl&&(cl+(f.niveau?' niv. '+f.niveau:'')),f.espece,f.historique&&('historique : '+f.historique),f.alignement].filter(Boolean).join(' · ');
}
function empty(){return KEYS.every(k=>!$('#t_'+k).value.trim())}

document.addEventListener('input',e=>{
  if(e.target.matches('#secs textarea')){fit(e.target);if(e.target.id==='t_histoire')count();Persos.save()}
});
addEventListener('resize',fitAll);

// Impression : le texte est recopié dans des blocs simples (les zones de texte ne s'impriment pas en entier)
addEventListener('beforeprint',()=>{
  document.querySelectorAll('#secs .sec').forEach(s=>{
    const v=$('#t_'+s.dataset.k).value.trim();
    s.querySelector('.pv').textContent=v;
    s.classList.toggle('vide',!v);
  });
});
$('#bPrint').onclick=()=>{if(empty()){msg('Écris d’abord quelque chose');return}window.print()};
$('#bSave').onclick=()=>{
  if(empty()){msg('Rien à enregistrer pour l’instant');return}
  const nom=($('#titre').value||Persos.current().nom||'personnage').trim();
  let t=nom+'\n'+'='.repeat(nom.length)+'\n';
  SECS.forEach(([k,tt])=>{const v=$('#t_'+k).value.trim();if(v)t+='\n'+tt+'\n'+'-'.repeat(tt.length)+'\n'+v+'\n'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([t],{type:'text/plain;charset=utf-8'}));
  a.download='histoire_'+nom.replace(/[^\p{L}\p{N}_-]+/gu,'_')+'.txt';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  msg('Histoire enregistrée dans un fichier .txt');
};
$('#bClear').onclick=()=>{
  if(empty())return;
  if(!confirm('Effacer toute l’histoire de « '+Persos.current().nom+' » ? Cette action est définitive.'))return;
  show(null);Persos.save();msg('Histoire effacée');
};

Persos.init({part:'histoire',mount:$('#persos'),title:$('#titre'),collect,apply:show,msg});
