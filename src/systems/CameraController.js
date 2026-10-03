import * as THREE from "three";

export class CameraController {
  constructor(camera,input){
    this.camera=camera; this.input=input;
    this.yaw=-1.1; this.pitch=.28; this.distance=4.8;
    this.target=new THREE.Vector3();
  }
  update(target,dt){
    if(this.input.dragging){
      this.yaw-=this.input.pointerDelta.x*.006;
      this.pitch=THREE.MathUtils.clamp(this.pitch-this.input.pointerDelta.y*.004,-.05,.86);
    }
    this.distance=THREE.MathUtils.clamp(this.distance+this.input.wheel*.006,2.2,9);
    this.target.copy(target).add(new THREE.Vector3(0,.62,0));
    const desired=new THREE.Vector3(Math.sin(this.yaw)*this.distance,1.25+this.pitch*2.7,-Math.cos(this.yaw)*this.distance).add(this.target);
    this.camera.position.lerp(desired,1-Math.exp(-9*dt));
    this.camera.lookAt(this.target);
  }
}
