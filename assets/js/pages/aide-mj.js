const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',4000)};
const rnd=n=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return Math.floor(a[0]/4294967296*n)};
const un=l=>l[rnd(l.length)];
// Chaque section : titre, couleur, note, en-têtes de colonnes, lignes [libellé, prix, précision]
const S=[
 {id:'monnaie',t:'Monnaie',k:'#7a5600',note:'Une pièce pèse environ 10 g (50 pièces = 500 g).',cols:['Pièce','Vaut'],rows:[
  ['Pièce de cuivre (pc)','1 pc','Une miche de pain, une chandelle'],
  ['Pièce d’argent (pa)','10 pc','Une journée de travail non qualifié'],
  ['Pièce d’électrum (pe)','5 pa = 50 pc','Rare, souvent tirée de vieux trésors'],
  ['Pièce d’or (po)','10 pa = 100 pc','Une journée de travail qualifié (2 po)'],
  ['Pièce de platine (pp)','10 po = 1 000 pc','Grosses transactions, nobles et banquiers']]},
 {id:'taverne',t:'Taverne : boire et manger',k:'#c8402f',cols:['Article','Prix'],rows:[
  ['Bière (chope)','4 pc'],['Bière (pichet, 4 chopes)','2 pa'],['Cidre ou hydromel (chope)','5 pc','Prix indicatif'],
  ['Vin ordinaire (pichet)','2 pa'],['Vin fin (bouteille)','10 po'],['Eau-de-vie (verre)','1 pa','Prix indicatif'],
  ['Pain (miche)','2 pc'],['Fromage (gros morceau)','1 pa'],['Viande (gros morceau)','3 pa'],
  ['Banquet (par personne)','10 po'],
  ['Repas sordide','3 pc','Gruau, pain rassis'],['Repas pauvre','6 pc','Soupe et pain'],['Repas modeste','3 pa','Ragoût, pain, fromage'],
  ['Repas confortable','5 pa','Viande, légumes, dessert'],['Repas aisé','8 pa','Plats cuisinés, bon vin'],['Repas aristocratique','2 po','Mets raffinés, plusieurs services']]},
 {id:'auberge',t:'Auberge : dormir',k:'#d8791a',note:'Prix par nuit et par personne.',cols:['Chambre','Prix'],rows:[
  ['Sordide','7 pc','Paillasse dans la salle commune'],['Pauvre','1 pa','Dortoir, couverture'],['Modeste','5 pa','Lit dans une chambre partagée'],
  ['Confortable','8 pa','Chambre individuelle'],['Aisée','2 po','Belle chambre, bain chaud'],['Aristocratique','4 po','Suite, service personnel'],
  ['Écurie pour une monture','5 pa','Fourrage compris']]},
 {id:'vie',t:'Train de vie (par jour)',k:'#2e9e5b',note:'Coût global d’une journée (nourriture, logement, entretien) entre deux aventures.',cols:['Train de vie','Prix'],rows:[
  ['Misérable','gratuit','Sans abri, à la rue'],['Sordide','1 pa','Taudis, égouts'],['Pauvre','2 pa','Quartier pauvre, chambre louée'],
  ['Modeste','1 po','Petite maison ou chambre correcte'],['Confortable','2 po','Maison dans un bon quartier'],
  ['Aisé','4 po','Belle maison, quelques domestiques'],['Aristocratique','10 po et plus','Manoir, serviteurs, vie mondaine']]},
 {id:'services',t:'Services et embauche',k:'#12968f',cols:['Service','Prix'],rows:[
  ['Ouvrier non qualifié (journée)','2 pa','Porteur, manœuvre, domestique'],['Artisan ou mercenaire qualifié (journée)','2 po','Maçon, scribe, garde, soldat'],
  ['Messager','2 pc par 1,5 km'],['Péage (route ou porte de ville)','1 pc'],
  ['Fiacre en ville','1 pc'],['Diligence entre deux villes','3 pc par 1,5 km'],
  ['Passage en bateau','1 pa par 1,5 km'],['Guide ou éclaireur (journée)','2 po','Qualifié'],
  ['Copie d’un document (page)','1 pa','Prix indicatif'],['Bain public','1 pc','Prix indicatif']]},
 {id:'sorts',t:'Sorts lancés contre paiement',k:'#7a4fc4',note:'Prix pour un lanceur de sorts dans une ville (temple, mage). Les composantes coûteuses s’ajoutent au prix. Au-delà du niveau 5, il faut trouver le bon lanceur et souvent lui rendre un service.',cols:['Niveau du sort','Prix'],rows:[
  ['Tour de magie','30 po'],['Niveau 1','50 po','Soins, Bénédiction, Identification…'],['Niveau 2','200 po','Restauration partielle…'],
  ['Niveau 3','300 po','Délivrance des malédictions, Retour à la vie (+ 300 po de diamant)'],['Niveaux 4 et 5','2 000 po','Rappel à la vie (+ 500 po de diamant)…'],
  ['Niveaux 6 à 8','20 000 po','Rare'],['Niveau 9','100 000 po','Exceptionnel']]},
 {id:'commerce',t:'Acheter et revendre',k:'#2f6fd0',cols:['Situation','Prix'],rows:[
  ['Revendre un objet ordinaire en bon état','moitié prix'],['Revendre un objet abîmé','au plus un quart'],
  ['Pierres précieuses, bijoux, œuvres d’art','plein prix','Se revendent comme de la monnaie'],
  ['Objet magique peu courant','400 po','Achat ; revente à un acheteur trouvé : environ moitié prix'],
  ['Objet magique rare','4 000 po'],['Objet magique très rare','40 000 po'],['Objet magique légendaire','200 000 po'],
  ['Potion ou parchemin (consommable)','moitié du prix de sa rareté'],
  ['Marchandises : blé (500 g)','1 pc'],['Farine (500 g)','2 pc'],['Poulet','2 pc'],['Sel (500 g)','5 pc'],['Fer (500 g)','1 pa'],
  ['Toile (1 m²)','1 pa'],['Cuivre (500 g)','5 pa'],['Coton (1 m²)','5 pa'],['Gingembre, cannelle (500 g)','1 po'],['Chèvre','1 po'],
  ['Mouton','2 po'],['Cochon','3 po'],['Vache','10 po'],['Bœuf','15 po'],['Argent (500 g)','5 po'],['Soie (1 m²)','10 po'],['Or (500 g)','50 po'],['Platine (500 g)','500 po']]},
 {id:'voyage',t:'Voyager',k:'#9c3d8f',note:'Une journée de voyage = 8 heures de marche. Au-delà, jet de sauvegarde de Constitution (DD 10 + 1 par heure en plus) ou un niveau d’épuisement.',cols:['Allure','Distance'],rows:[
  ['Rapide','6 km/h ; 48 km/jour','−5 en Perception passive'],['Normale','4,5 km/h ; 36 km/jour'],['Lente','3 km/h ; 24 km/jour','Permet la Discrétion'],
  ['Terrain difficile','moitié de la distance','Forêt dense, marais, montagne'],['Cheval au galop','jusqu’à 2 fois l’allure rapide pendant 1 h'],
  ['Bateau à voile','3 km/h ; 72 km/jour','Navigue jour et nuit'],['Barque à rames','2,5 km/h ; 20 km/jour']]},
 {id:'dd',t:'Degrés de difficulté',k:'#2a3170',note:'Pour fixer le DD d’un test de caractéristique.',cols:['Difficulté','DD'],rows:[
  ['Très facile','5'],['Facile','10'],['Moyenne','15'],['Difficile','20'],['Très difficile','25'],['Presque impossible','30']]},
 {id:'survie',t:'Nourriture, eau et repos',k:'#5c4a1e',cols:['Besoin','Règle'],rows:[
  ['Nourriture','500 g par jour','Sans nourriture : 3 + modificateur de Con jours, puis épuisement'],
  ['Eau','4 litres par jour','8 litres par temps chaud ; moitié : sauvegarde de Con DD 15 ou épuisement'],
  ['Repos court','1 heure','Dépenser des dés de vie'],['Repos long','8 heures','6 h de sommeil ; un seul par 24 h']]}
];
// Générateur de noms de tavernes
const NA=['Le Sanglier','La Chope','Le Griffon','La Licorne','Le Dragon','Le Corbeau','La Lanterne','Le Tonneau','La Sirène','Le Gobelin','Le Chevalier','La Truie','Le Hibou','La Couronne','Le Marteau','Le Chat'],
 NB=[['Ivre'],['Fêlé','Fêlée'],['Doré','Dorée'],['qui Rit'],['Endormi','Endormie'],['Borgne'],['Rouillé','Rouillée'],['d’Argent'],['Hurlant','Hurlante'],['Boiteux','Boiteuse'],['Joyeux','Joyeuse'],['Noir','Noire'],['Repu','Repue'],['Perdu','Perdue'],['des Brumes'],['du Pendu']],
 TT=['bondée et bruyante','calme, presque vide','enfumée, fréquentée par des marins','propre et chère','louche, pleine de regards en coin','familiale, odeur de soupe','tenue par une ancienne aventurière','où un barde chante faux'];
function taverne(){const a=un(NA),b=un(NB);return a+' '+(/^La /.test(a)&&b[1]||b[0])+' : '+un(TT)}

function render(){
  const mj=(()=>{const c=Persos.current();return !!c&&c.nom.trim().toLowerCase()==='mj'})();
  $('#lock').hidden=mj;$('#mj').hidden=!mj;$('#bPrint').hidden=!mj;
}
$('#toc').innerHTML=S.map(s=>`<a href="#${s.id}">${esc(s.t.split(' :')[0])}</a>`).join('');
$('#grid').innerHTML=S.map(s=>`<section class="panel box" id="${s.id}" style="--k:${s.k}"><h2>${esc(s.t)}</h2>${s.note?'<p>'+esc(s.note)+'</p>':''}
<table><thead><tr><th>${esc(s.cols[0])}</th><th style="text-align:right">${esc(s.cols[1])}</th></tr></thead><tbody>${s.rows.map(r=>`<tr><td>${esc(r[0])}${r[2]?'<small>'+esc(r[2])+'</small>':''}</td><td class="p">${esc(r[1])}</td></tr>`).join('')}</tbody></table>
${s.id==='taverne'?'<div class="gen"><button type="button" id="bTav">Nom de taverne au hasard</button><output id="tav" aria-live="polite"></output></div>':''}</section>`).join('')
 +'<section class="panel empty" id="none" hidden>Rien ne correspond à cette recherche.</section>';
$('#bTav').onclick=()=>{$('#tav').textContent=taverne()};
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
$('#q').oninput=e=>{
  const w=norm(e.target.value.trim());let n=0;
  $$('.box').forEach(b=>{
    const all=!w||norm(b.querySelector('h2').textContent).includes(w);let v=0;
    b.querySelectorAll('tbody tr').forEach(tr=>{const ok=all||norm(tr.textContent).includes(w);tr.classList.toggle('hide',!ok);v+=ok});
    b.hidden=!v;n+=v;
  });
  $('#none').hidden=!!n;
};
$('#bPrint').onclick=()=>window.print();
Persos.init({part:'aidemj',mount:$('#persos'),msg,collect:()=>null,apply:render,onName:render});
