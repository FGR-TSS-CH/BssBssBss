export class UI {
  constructor(app){
    this.app=app;
    this.root=document.createElement("div");
    this.root.innerHTML=`
      <div class="menu" id="menu"><div class="menu-panel">
        <div class="tag">THREE CATS. ONE HOME.</div><div class="brand">BssBssBss</div>
        <button id="play">SPIEL STARTEN</button><button id="edit">RAUM-EDITOR</button>
        <div class="cat-select"><button data-cat="0">Piet</button><button data-cat="1">Zelda</button><button data-cat="2">Yuki</button></div>
      </div></div>
      <div class="hud hidden" id="hud"><b id="catName"></b><small id="catDesc"></small><small>WASD bewegen · Shift rennen · Leertaste springen · Maus Kamera · 1/2/3 oder Tab Katze wechseln · Esc Menü</small></div>
      <div class="editor hidden" id="editor"><h2>Raum-Editor</h2><div class="hint">Möbel wählen und auf Boden klicken. Vorhandenes Möbel anklicken und ziehen.</div>
      <div class="catalog">${["sofa","table","chair","rug","catbed","tree","plant","lamp"].map(x=>`<button data-item="${x}">${x}</button>`).join("")}</div>
      <div class="selected-label" id="sel">Kein Möbel ausgewählt</div><div class="row"><button id="left">↺ drehen</button><button id="right">↻ drehen</button></div><button id="del">Löschen</button><button id="back">Zurück zum Spiel</button></div>
      <div class="toast hidden" id="toast"></div>`;
    document.body.appendChild(this.root);
    this.menu=this.root.querySelector("#menu");this.hud=this.root.querySelector("#hud");this.editor=this.root.querySelector("#editor");
    this.root.querySelector("#play").onclick=()=>app.setMode("play");
    this.root.querySelector("#edit").onclick=()=>app.setMode("editor");
    this.root.querySelector("#back").onclick=()=>app.setMode("play");
    this.root.querySelector("#left").onclick=()=>app.editor.rotate(-1);
    this.root.querySelector("#right").onclick=()=>app.editor.rotate(1);
    this.root.querySelector("#del").onclick=()=>app.editor.delete();
    this.root.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>app.selectCat(+b.dataset.cat));
    this.root.querySelectorAll("[data-item]").forEach(b=>b.onclick=()=>app.editor.placeType=b.dataset.item);
  }
  setMode(mode){this.menu.classList.toggle("hidden",mode!=="menu");this.hud.classList.toggle("hidden",mode!=="play");this.editor.classList.toggle("hidden",mode!=="editor");}
  setCat(cat,index){this.root.querySelector("#catName").textContent=cat.config.name;this.root.querySelector("#catDesc").textContent=cat.config.description;this.root.querySelectorAll("[data-cat]").forEach((b,i)=>b.classList.toggle("active",i===index));}
  updateSelection(editor){this.root.querySelector("#sel").textContent=editor.selected?editor.selected.userData.type+" ausgewählt":"Kein Möbel ausgewählt";}
}
