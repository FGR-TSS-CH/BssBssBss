import * as THREE from "three";

const cast=(m)=>{m.castShadow=m.receiveShadow=true;return m;};

export class Human {
  constructor(scene){
    this.group=new THREE.Group();
    scene.add(this.group);

    const skin=new THREE.MeshStandardMaterial({color:0xd1a182,roughness:.82});
    const shirt=new THREE.MeshStandardMaterial({color:0x31465c,roughness:.9});
    const jeans=new THREE.MeshStandardMaterial({color:0x40536b,roughness:.92});
    const dark=new THREE.MeshStandardMaterial({color:0x24272b,roughness:.8});
    const hair=new THREE.MeshStandardMaterial({color:0x4a342a,roughness:.95});

    this.torso=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.22,.68,8,14),shirt));
    this.torso.position.y=1.56;
    this.torso.scale.set(.78,1.17,1.08);
    this.group.add(this.torso);

    const pelvis=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.16,.18,6,10),jeans));
    pelvis.rotation.x=Math.PI/2;
    pelvis.position.y=1.05;
    pelvis.scale.x=.90;
    this.group.add(pelvis);

    this.headPivot=new THREE.Group();
    this.headPivot.position.y=2.30;
    this.group.add(this.headPivot);

    const head=cast(new THREE.Mesh(new THREE.SphereGeometry(.23,20,16),skin));
    head.scale.set(.94,1.08,.95);
    this.headPivot.add(head);

    const nose=cast(new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),skin));
    nose.scale.set(1.2,.8,.8);
    nose.position.set(.20,-.01,0);
    this.headPivot.add(nose);

    const hairCap=cast(new THREE.Mesh(new THREE.SphereGeometry(.235,18,12),hair));
    hairCap.scale.set(1,.50,1);
    hairCap.position.y=.15;
    this.headPivot.add(hairCap);

    this.arms=[];
    for(const side of[-1,1]){
      const shoulder=new THREE.Group();
      shoulder.position.set(0,1.91,side*.35);
      this.group.add(shoulder);

      const upper=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.07,.30,6,8),shirt));
      upper.position.y=-.18;
      shoulder.add(upper);

      const elbow=new THREE.Group();
      elbow.position.y=-.37;
      shoulder.add(elbow);

      const forearm=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.065,.28,6,8),skin));
      forearm.position.y=-.16;
      elbow.add(forearm);

      const hand=cast(new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),skin));
      hand.scale.set(.85,1.2,.8);
      hand.position.y=-.34;
      elbow.add(hand);

      this.arms.push({shoulder,elbow});
    }

    this.legs=[];
    for(const side of[-1,1]){
      const hip=new THREE.Group();
      hip.position.set(0,1.0,side*.16);
      this.group.add(hip);

      const thigh=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.10,.36,6,8),jeans));
      thigh.position.y=-.22;
      hip.add(thigh);

      const knee=new THREE.Group();
      knee.position.y=-.44;
      hip.add(knee);

      const shin=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.085,.34,6,8),jeans));
      shin.position.y=-.20;
      knee.add(shin);

      const foot=cast(new THREE.Mesh(new THREE.BoxGeometry(.20,.10,.34),dark));
      foot.position.set(.10,-.43,0);
      knee.add(foot);

      this.legs.push({hip,knee});
    }

    this.group.position.set(7,0,-4);
    this.path=[
      new THREE.Vector3(7,0,-4),
      new THREE.Vector3(11,0,-2),
      new THREE.Vector3(11,0,5),
      new THREE.Vector3(5,0,6),
      new THREE.Vector3(3,0,2),
      new THREE.Vector3(6,0,-1)
    ];
    this.pathIndex=1;
    this.walk=0;
    this.pause=0;
  }

  update(dt,collision){
    if(this.pause>0){
      this.pause-=dt;
      this.idle(dt);
      return;
    }

    const target=this.path[this.pathIndex];
    const delta=target.clone().sub(this.group.position);
    delta.y=0;

    if(delta.length()<.25){
      this.pathIndex=(this.pathIndex+1)%this.path.length;
      this.pause=.7+Math.random()*.7;
      return;
    }

    delta.normalize();
    const from=this.group.position.clone();
    const forward=from.clone().addScaledVector(delta,1.05*dt);
    let resolved=collision.resolveHorizontal(from,forward,.42,0);

    if(resolved.distanceToSquared(from)<1e-6){
      const left=delta.clone().applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);
      const right=delta.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2);
      const a=collision.resolveHorizontal(from,from.clone().addScaledVector(left,.75*dt),.42,0);
      const b=collision.resolveHorizontal(from,from.clone().addScaledVector(right,.75*dt),.42,0);
      resolved=a.distanceToSquared(from)>b.distanceToSquared(from)?a:b;
    }

    this.group.position.x=resolved.x;
    this.group.position.z=resolved.z;

    const yaw=Math.atan2(delta.x,delta.z)-Math.PI/2;
    let diff=yaw-this.group.rotation.y;
    while(diff>Math.PI)diff-=Math.PI*2;
    while(diff<-Math.PI)diff+=Math.PI*2;
    this.group.rotation.y+=diff*(1-Math.exp(-5*dt));

    this.walk+=dt*4.8;
    const swing=Math.sin(this.walk)*.52;
    this.legs[0].hip.rotation.z=swing;
    this.legs[1].hip.rotation.z=-swing;
    this.legs[0].knee.rotation.z=Math.max(0,-swing)*.58;
    this.legs[1].knee.rotation.z=Math.max(0,swing)*.58;
    this.arms[0].shoulder.rotation.z=-swing*.58;
    this.arms[1].shoulder.rotation.z=swing*.58;
    this.arms[0].elbow.rotation.z=.10+Math.max(0,swing)*.18;
    this.arms[1].elbow.rotation.z=.10+Math.max(0,-swing)*.18;
    this.headPivot.rotation.y=Math.sin(this.walk*.18)*.06;
    this.torso.rotation.z=Math.sin(this.walk)*.018;
  }

  idle(dt){
    const k=Math.min(1,dt*6);
    for(const l of this.legs){
      l.hip.rotation.z+=(0-l.hip.rotation.z)*k;
      l.knee.rotation.z+=(0-l.knee.rotation.z)*k;
    }
    for(const a of this.arms) a.shoulder.rotation.z+=(0-a.shoulder.rotation.z)*k;
  }
}
