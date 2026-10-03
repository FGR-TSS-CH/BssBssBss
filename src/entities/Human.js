import * as THREE from "three";

export class Human {
  constructor(scene){
    this.group=new THREE.Group(); scene.add(this.group);
    const skin=new THREE.MeshStandardMaterial({color:0xd1a182,roughness:.8}), shirt=new THREE.MeshStandardMaterial({color:0x31465c}), jeans=new THREE.MeshStandardMaterial({color:0x40536b}), dark=new THREE.MeshStandardMaterial({color:0x25272a});
    const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.72,8,12),shirt); torso.position.y=1.55; torso.scale.set(1.05,1.15,.72); this.group.add(torso);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.23,18,14),skin); head.position.y=2.38; this.group.add(head);
    this.arms=[]; this.legs=[];
    for(const side of[-1,1]){
      const arm=new THREE.Group(); arm.position.set(side*.34,1.9,0); this.group.add(arm);
      const a=new THREE.Mesh(new THREE.CapsuleGeometry(.07,.55,6,8),skin); a.position.y=-.3; arm.add(a); this.arms.push(arm);
      const leg=new THREE.Group(); leg.position.set(side*.16,1.02,0); this.group.add(leg);
      const l=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.78,6,8),jeans); l.position.y=-.44; leg.add(l);
      const foot=new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.36),dark); foot.position.set(.06,-.9,.08); leg.add(foot); this.legs.push(leg);
    }
    this.group.position.set(7,0,-4);
    this.path=[new THREE.Vector3(7,0,-4),new THREE.Vector3(11,0,-2),new THREE.Vector3(11,0,5),new THREE.Vector3(5,0,6),new THREE.Vector3(3,0,2)];
    this.pathIndex=1; this.walk=0; this.pause=0;
  }
  update(dt, collision){
    if(this.pause>0){this.pause-=dt; return;}
    const target=this.path[this.pathIndex], delta=target.clone().sub(this.group.position); delta.y=0;
    if(delta.length()<.2){this.pathIndex=(this.pathIndex+1)%this.path.length;this.pause=.8;return;}
    delta.normalize(); const from=this.group.position.clone(); const proposed=from.clone().addScaledVector(delta,1.05*dt);
    const resolved=collision.resolveHorizontal(from,proposed,.42,0); this.group.position.x=resolved.x; this.group.position.z=resolved.z;
    const yaw=Math.atan2(delta.x,delta.z)-Math.PI/2; let diff=yaw-this.group.rotation.y; while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;this.group.rotation.y+=diff*(1-Math.exp(-5*dt));
    this.walk+=dt*4.2; const swing=Math.sin(this.walk)*.48;
    this.legs[0].rotation.z=swing; this.legs[1].rotation.z=-swing; this.arms[0].rotation.z=-swing*.7; this.arms[1].rotation.z=swing*.7;
  }
}
