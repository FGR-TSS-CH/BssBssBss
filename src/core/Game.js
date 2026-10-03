import * as THREE from "three";
import { ROOM, CATS } from "../config.js";
import { Input } from "./Input.js";
import { Cat } from "../entities/Cat.js";
import { Human } from "../entities/Human.js";
import { Room } from "../systems/Room.js";
import { CollisionSystem } from "../systems/CollisionSystem.js";
import { MovementSystem } from "../systems/MovementSystem.js";
import { CameraController } from "../systems/CameraController.js";
import { RoomEditor } from "../systems/RoomEditor.js";
import { AudioSystem } from "../systems/AudioSystem.js";
import { UI } from "../ui/UI.js";

export class Game {
  constructor(){
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xa8c4d6);
    this.camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.08,160);
    this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=true;const mount=document.querySelector("#app")||document.body;mount.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x665544,1.7));const sun=new THREE.DirectionalLight(0xfff4df,2.2);sun.position.set(10,18,7);sun.castShadow=true;this.scene.add(sun);
    this.input=new Input(this.renderer.domElement);
    this.audio=new AudioSystem();
    this.room=new Room(this.scene,ROOM);
    this.collision=new CollisionSystem(this.room);this.collision.setObstacles(this.room.furniture);
    const catSpawns=[
      new THREE.Vector3(-6,0,5),
      new THREE.Vector3(0,0,6),
      new THREE.Vector3(6,0,4)
    ];
    this.cats=CATS.map((c,i)=>new Cat(this.scene,c,catSpawns[i]));
    this.playTransforms=this.cats.map(c=>({position:c.group.position.clone(),rotationY:c.group.rotation.y}));
    this.active=0;
    this.human=new Human(this.scene);
    this.movement=new MovementSystem(this.input,this.camera,this.collision,this.audio);
    this.cameraCtrl=new CameraController(this.camera,this.input);
    this.editor=new RoomEditor({camera:this.camera,renderer:this.renderer,room:this.room,onChange:()=>{this.collision.setObstacles(this.room.furniture);this.ui?.updateSelection(this.editor)}});
    this.ui=new UI(this);this.mode="menu";this.setMode("menu");this.selectCat(0);
    this.last=performance.now();this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
    addEventListener("resize",()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight)});
    addEventListener("keydown",e=>{if(e.code==="Escape")this.setMode("menu");if(e.code==="Digit1")this.selectCat(0);if(e.code==="Digit2")this.selectCat(1);if(e.code==="Digit3")this.selectCat(2);if(e.code==="Tab")this.selectCat((this.active+1)%3);if(this.mode==="editor"&&e.code==="KeyR")this.editor.rotate(1);if(this.mode==="editor"&&(e.code==="Delete"||e.code==="Backspace"))this.editor.delete();});
    this.renderer.domElement.addEventListener("pointerdown",()=>this.audio.ensure(),{once:true});
    this.renderer.domElement.oncontextmenu=e=>e.preventDefault();
  }
  setMode(mode){
    const previous=this.mode;
    if(mode==="menu"){
      if(previous && previous!=="menu") this.savePlayCats();
      this.arrangeMenuCats();
    }else if(previous==="menu"){
      this.restorePlayCats();
    }
    this.mode=mode;
    this.ui.setMode(mode);
    this.editor.setEnabled(mode==="editor");
    if(mode!=="menu") this.audio.ensure();
  }
  selectCat(i){this.active=i;this.cats.forEach((c,n)=>c.setSelected(n===i));this.ui.setCat(this.cats[i],i);this.audio.switchCat();}
  savePlayCats(){
    this.playTransforms=this.cats.map(c=>({position:c.group.position.clone(),rotationY:c.group.rotation.y}));
  }
  restorePlayCats(){
    this.cats.forEach((c,i)=>{
      const t=this.playTransforms[i];
      c.group.position.copy(t.position);
      c.group.rotation.y=t.rotationY;
      c.velocity.set(0,0,0);
      c.verticalVelocity=0;
      c.grounded=true;
    });
  }
  arrangeMenuCats(){
    this.cats.forEach((c,i)=>{
      c.group.position.set((i-1)*1.55,0,0);
      c.group.rotation.y=-Math.PI/2;
      c.velocity.set(0,0,0);
      c.verticalVelocity=0;
      c.grounded=true;
    });
  }
  updateMenu(dt,t){
    const focusX=(this.active-1)*.45;
    const desired=new THREE.Vector3(.2,2.0,5.7);
    this.camera.position.lerp(desired,1-Math.exp(-3*dt));
    this.camera.lookAt(focusX,.75,0);
    this.cats.forEach((c,i)=>{
      const target=(i-1)*1.55;
      c.group.position.x+=(target-c.group.position.x)*(1-Math.exp(-5*dt));
      c.group.position.z+=(0-c.group.position.z)*(1-Math.exp(-5*dt));
      c.animate(dt,t);
    });
  }
  resolveCharacters(activeCat){
    const minHuman=activeCat.config.radius+.48;
    let dx=activeCat.group.position.x-this.human.group.position.x;
    let dz=activeCat.group.position.z-this.human.group.position.z;
    let dist=Math.hypot(dx,dz);
    if(dist<minHuman){
      if(dist<.001){dx=1;dz=0;dist=1;}
      activeCat.group.position.x=this.human.group.position.x+dx/dist*minHuman;
      activeCat.group.position.z=this.human.group.position.z+dz/dist*minHuman;
    }

    for(const other of this.cats){
      if(other===activeCat) continue;
      const minDist=activeCat.config.radius+other.config.radius+.18;
      let ox=activeCat.group.position.x-other.group.position.x;
      let oz=activeCat.group.position.z-other.group.position.z;
      let d=Math.hypot(ox,oz);
      if(d<minDist){
        if(d<.001){ox=1;oz=0;d=1;}
        activeCat.group.position.x=other.group.position.x+ox/d*minDist;
        activeCat.group.position.z=other.group.position.z+oz/d*minDist;
      }
    }
  }
  loop(now){
    const dt=Math.min(.033,(now-this.last)/1000);this.last=now;const t=now*.001;
    if(this.mode==="play"){
      const activeCat=this.cats[this.active];
      this.movement.update(activeCat,dt);
      this.resolveCharacters(activeCat);
      this.cameraCtrl.update(activeCat.group.position,dt);
      this.human.update(dt,this.collision);
    }
    else if(this.mode==="editor")this.editor.update(dt);
    else this.updateMenu(dt,t);
    this.cats.forEach(c=>{if(this.mode!=="menu")c.animate(dt,t)});
    this.renderer.render(this.scene,this.camera);this.input.frameEnd();requestAnimationFrame(this.loop);
  }
}
