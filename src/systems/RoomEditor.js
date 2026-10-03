import * as THREE from "three";

export class RoomEditor {
  constructor({camera,renderer,room,onChange}){
    this.camera=camera;this.renderer=renderer;this.room=room;this.onChange=onChange;
    this.ray=new THREE.Raycaster();this.mouse=new THREE.Vector2();this.selected=null;this.dragged=false;this.placeType=null;this.helper=null;
    this.yaw=-.7;this.pitch=.75;this.distance=25;this.dragCamera=false;this.last=[0,0];
    renderer.domElement.addEventListener("mousedown",e=>this.onDown(e));
    addEventListener("mousemove",e=>this.onMove(e));addEventListener("mouseup",()=>{this.dragged=false;this.dragCamera=false});
  }
  setEnabled(v){this.enabled=v;if(!v)this.select(null);}
  pointer(e){const r=this.renderer.domElement.getBoundingClientRect();this.mouse.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));this.ray.setFromCamera(this.mouse,this.camera);}
  floorPoint(e){this.pointer(e);return this.ray.intersectObject(this.room.floor)[0]?.point;}
  select(o){this.selected=o;if(this.helper){this.room.scene.remove(this.helper);this.helper=null}if(o){this.helper=new THREE.BoxHelper(o,0xf0a85b);this.room.scene.add(this.helper)}this.onChange?.();}
  onDown(e){if(!this.enabled)return;if(e.button===2){this.dragCamera=true;this.last=[e.clientX,e.clientY];return;}const p=this.floorPoint(e);if(!p)return;if(this.placeType){this.room.addFurniture(this.placeType,p.x,p.z,0);this.onChange?.();return;}this.pointer(e);const hit=this.ray.intersectObjects(this.room.furnitureGroup.children,true)[0];if(hit){let o=hit.object;while(o.parent!==this.room.furnitureGroup&&o.parent)o=o.parent;this.select(o);this.dragged=true}else this.select(null);}
  onMove(e){if(!this.enabled)return;if(this.dragCamera){const dx=e.clientX-this.last[0],dy=e.clientY-this.last[1];this.last=[e.clientX,e.clientY];this.yaw-=dx*.006;this.pitch=THREE.MathUtils.clamp(this.pitch-dy*.004,.25,1.2);return;}if(this.dragged&&this.selected){const p=this.floorPoint(e);if(p)this.selected.position.set(p.x,0,p.z);this.helper?.update();this.onChange?.();}}
  rotate(dir){if(!this.selected)return;this.selected.rotation.y+=dir*Math.PI/12;this.helper?.update();this.onChange?.();}
  delete(){if(!this.selected)return;const i=this.room.furniture.indexOf(this.selected);if(i>=0)this.room.furniture.splice(i,1);this.room.furnitureGroup.remove(this.selected);this.select(null);this.onChange?.();}
  update(dt){
    if(!this.enabled)return;
    const p=new THREE.Vector3(Math.sin(this.yaw)*Math.cos(this.pitch)*this.distance,Math.sin(this.pitch)*this.distance,-Math.cos(this.yaw)*Math.cos(this.pitch)*this.distance);
    this.camera.position.lerp(p,1-Math.exp(-7*dt));this.camera.lookAt(0,0,0);
  }
}
