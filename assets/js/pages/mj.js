const $=s=>document.querySelector(s);
const msg=t=>{$('#msg').textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>$('#msg').textContent='',4000)};
// La page n'est visible que si le personnage actif s'appelle « mj »
function render(){
  const c=Persos.current(),mj=!!c&&c.nom.trim().toLowerCase()==='mj';
  $('#lock').hidden=mj;$('#mj').hidden=!mj;
}
Persos.init({part:'espacemj',mount:$('#persos'),msg,collect:()=>null,apply:render,onName:render});
