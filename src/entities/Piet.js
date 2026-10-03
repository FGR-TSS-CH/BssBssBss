import * as THREE from "three";

const smooth=(value,target,speed,dt)=>value+(target-value)*(1-Math.exp(-speed*dt));
const cast=(mesh)=>{mesh.castShadow=true;mesh.receiveShadow=true;return mesh;};

function furMaterial(color,extra={}){
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness:.95,
    metalness:0,
    sheen:.20,
    sheenColor:new THREE.Color(color),
    ...extra
  });
}

function ellipsoid(parent,material,radius,scale,position,segments=20){
  const mesh=cast(new THREE.Mesh(
    new THREE.SphereGeometry(radius,segments,Math.max(12,segments-4)),
    material
  ));
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function taperedBone(parent,material,length,top,bottom){
  const mesh=cast(new THREE.Mesh(
    new THREE.CylinderGeometry(top,bottom,length,10),
    material
  ));
  mesh.position.y=-length/2;
  parent.add(mesh);
  return mesh;
}

function whisker(parent,points){
  const material=new THREE.LineBasicMaterial({
    color:0xf4f1ea,
    transparent:true,
    opacity:.70
  });
  parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material));
}

function createTorso(material){
  // One continuous torso mesh avoids the "beads on a string" look.
  const profile=[
    [-.58,.115],
    [-.50,.155],
    [-.38,.176],
    [-.22,.145],
    [-.04,.150],
    [.16,.175],
    [.34,.185],
    [.48,.160],
    [.58,.110]
  ];
  const points=profile.map(([y,r])=>new THREE.Vector2(r,y));
  const geo=new THREE.LatheGeometry(points,32);
  const mesh=cast(new THREE.Mesh(geo,material));
  mesh.rotation.z=Math.PI/2;
  mesh.scale.z=.80;
  return mesh;
}

function addSideStripe(parent,material,x,y,side,height,width,angle){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
  mesh.position.set(x,y,side*.151);
  mesh.rotation.z=angle;
  mesh.rotation.y=side>0 ? 0 : Math.PI;
  mesh.renderOrder=2;
  parent.add(mesh);
  return mesh;
}

export class Piet {
  constructor(scene,config,position){
    this.config=config;
    this.group=new THREE.Group();
    this.group.position.copy(position);

    this.model=new THREE.Group();
    this.group.add(this.model);

    this.velocity=new THREE.Vector3();
    this.verticalVelocity=0;
    this.grounded=true;
    this.gait=0;
    this.jumpState="ground";
    this.coyote=0;
    this.jumpBuffer=0;
    this.turnRate=0;
    this.jumpPulse=0;
    this.landPulse=0;
    this.selected=false;

    const tabby=furMaterial(0x776b61);
    const dark=furMaterial(0x302b28);
    const white=furMaterial(0xf4f1e8,{sheen:.34});
    const pink=furMaterial(0xe8a7ac,{roughness:.76});
    const green=furMaterial(0x9ec48d,{roughness:.12,clearcoat:1,clearcoatRoughness:.08});
    const black=furMaterial(0x101112,{roughness:.4});
    const glint=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.08});
    const stripeMat=new THREE.MeshStandardMaterial({
      color:0x302b28,
      roughness:.96,
      polygonOffset:true,
      polygonOffsetFactor:-2,
      polygonOffsetUnits:-2,
      side:THREE.DoubleSide
    });

    this.spine=new THREE.Group();
    this.spine.position.y=.63;
    this.model.add(this.spine);

    this.torso=createTorso(tabby);
    this.spine.add(this.torso);

    // Subtle shoulder and hip masses blend into the single torso instead of forming visible balls.
    this.shoulderMass=ellipsoid(this.spine,tabby,.135,[1.18,.90,.86],[.40,.015,0],22);
    this.hipMass=ellipsoid(this.spine,tabby,.145,[1.18,.94,.90],[-.44,-.01,0],22);

    // White bib and underside from the real Piet reference.
    this.bib=ellipsoid(this.spine,white,.115,[1.02,.92,.74],[.49,-.095,0],18);
    this.belly=ellipsoid(this.spine,white,.095,[2.05,.25,.56],[.04,-.145,0],18);

    const neck=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.066,.10,8,12),tabby));
    neck.rotation.z=Math.PI/2;
    neck.position.set(.58,.10,0);
    this.spine.add(neck);

    this.headPivot=new THREE.Group();
    this.headPivot.position.set(.715,.20,0);
    this.spine.add(this.headPivot);

    // Adult-cat head: smaller, wider across the cheeks, less spherical.
    this.skull=ellipsoid(this.headPivot,tabby,.154,[.96,.98,1.02],[0,0,0],24);

    for(const side of[-1,1]){
      ellipsoid(this.headPivot,white,.061,[1.10,.68,.86],[.120,-.058,side*.041],16);
    }
    ellipsoid(this.headPivot,white,.053,[.58,1.22,.58],[.030,.048,0],16);
    ellipsoid(this.headPivot,pink,.020,[1,.70,1.08],[.184,-.069,0],12);

    for(const side of[-1,1]){
      const ear=new THREE.Group();
      ear.position.set(-.032,.143,side*.103);
      this.headPivot.add(ear);

      const outer=cast(new THREE.Mesh(new THREE.ConeGeometry(.056,.135,3),tabby));
      outer.rotation.y=side*Math.PI/2;
      outer.rotation.z=-.04;
      ear.add(outer);

      const inner=cast(new THREE.Mesh(new THREE.ConeGeometry(.030,.079,3),pink));
      inner.position.set(.004,.002,side*.003);
      inner.rotation.y=side*Math.PI/2;
      inner.rotation.z=-.04;
      ear.add(inner);

      ellipsoid(this.headPivot,green,.026,[1,.88,.56],[.103,.021,side*.092],12);
      ellipsoid(this.headPivot,black,.009,[.60,1.45,.40],[.126,.021,side*.093],10);
      ellipsoid(this.headPivot,glint,.0044,[1,1,.45],[.136,.032,side*.088],8);
    }

    for(const z of[-.044,0,.044]){
      const mark=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.007,.048,5,8),dark));
      mark.rotation.z=.20;
      mark.position.set(.004,.103,z);
      this.headPivot.add(mark);
    }

    for(const side of[-1,1]){
      for(let row=-1;row<=1;row++){
        whisker(this.headPivot,[
          new THREE.Vector3(.142,-.057,side*.044),
          new THREE.Vector3(.27,-.054+row*.009,side*(.086+row*.007)),
          new THREE.Vector3(.42,-.041+row*.013,side*(.132+row*.010))
        ]);
      }
    }

    // Flat side decals instead of raised dark pieces or distorted spherical UVs.
    for(const side of[-1,1]){
      const specs=[
        [-.36,.04,.19,.045,-.20],
        [-.22,.045,.18,.042,-.12],
        [-.06,.050,.17,.040,-.05],
        [.10,.052,.16,.038,.04],
        [.25,.050,.15,.036,.12]
      ];
      for(const [x,y,h,w,a] of specs){
        addSideStripe(this.spine,stripeMat,x,y,side,h,w,a*(side>0?1:-1));
      }
    }

    this.legs=[];

    const addFrontLeg=(side,walkPhase,runPhase)=>{
      const shoulder=new THREE.Group();
      shoulder.position.set(.39,-.045,side*.135);
      this.spine.add(shoulder);

      const upper=taperedBone(shoulder,tabby,.205,.039,.033);
      upper.rotation.z=.07;

      const elbow=new THREE.Group();
      elbow.position.set(.015,-.192,0);
      shoulder.add(elbow);

      const forearm=taperedBone(elbow,white,.225,.032,.027);
      forearm.rotation.z=-.04;

      const wrist=new THREE.Group();
      wrist.position.set(-.010,-.218,0);
      elbow.add(wrist);

      const paw=ellipsoid(wrist,white,.044,[1.58,.48,1.00],[.045,-.020,0],10);
      this.legs.push({root:shoulder,joint:elbow,paw,hind:false,side,walkPhase,runPhase});
    };

    const addHindLeg=(side,walkPhase,runPhase)=>{
      const hip=new THREE.Group();
      hip.position.set(-.42,-.010,side*.138);
      this.spine.add(hip);

      const thigh=taperedBone(hip,tabby,.220,.052,.042);
      thigh.rotation.z=.38;

      const knee=new THREE.Group();
      knee.position.set(.078,-.188,0);
      hip.add(knee);

      const shin=taperedBone(knee,tabby,.178,.038,.031);
      shin.rotation.z=-.56;

      const hock=new THREE.Group();
      hock.position.set(-.070,-.145,0);
      knee.add(hock);

      const metatarsal=taperedBone(hock,white,.165,.029,.024);
      metatarsal.rotation.z=.15;

      const paw=ellipsoid(hock,white,.046,[1.62,.48,1.02],[.062,-.158,0],10);
      this.legs.push({root:hip,joint:knee,hock,paw,hind:true,side,walkPhase,runPhase});
    };

    addFrontLeg( 1,0,0);
    addHindLeg(-1,Math.PI*.5,0);
    addFrontLeg(-1,Math.PI,Math.PI);
    addHindLeg( 1,Math.PI*1.5,Math.PI);

    this.tail=[];
    this.tailRoot=new THREE.Group();
    this.tailRoot.position.set(-.555,.025,0);
    this.spine.add(this.tailRoot);

    const segments=14;
    const segLength=.096;
    let parent=this.tailRoot;
    for(let i=0;i<segments;i++){
      const pivot=new THREE.Group();
      if(i) pivot.position.x=-segLength*.72;
      parent.add(pivot);

      const segment=cast(new THREE.Mesh(
        new THREE.CapsuleGeometry(.034-i*.00115,.056,5,9),
        i%3===2 ? dark : tabby
      ));
      segment.rotation.z=Math.PI/2;
      segment.position.x=-segLength*.34;
      pivot.add(segment);

      this.tail.push(pivot);
      parent=pivot;
    }

    this.model.scale.set(1.03,1.03,.96);
    scene.add(this.group);
  }

  setSelected(value){
    this.selected=value;
  }

  animate(dt,time){
    const speed=this.velocity.length();
    const amount=Math.min(speed/this.config.sprint,1);
    const moving=speed>.08;
    const running=speed>this.config.speed*1.06;
    const airborne=!this.grounded;

    this.gait+=dt*(moving ? (running ? 11.2 : 6.8+amount*1.3) : .72);
    this.jumpPulse=Math.max(0,this.jumpPulse-dt);
    this.landPulse=Math.max(0,this.landPulse-dt);

    const breathe=Math.sin(time*1.55)*.004;
    const bob=airborne ? 0 : Math.sin(this.gait*2)*.006*amount;
    const landing=this.landPulse>0 ? Math.sin((this.landPulse/.16)*Math.PI)*.042 : 0;
    this.model.position.y=breathe+bob-landing;

    const jumpArch=airborne
      ? THREE.MathUtils.clamp(-this.verticalVelocity*.040,-.22,.19)
      : Math.sin(this.gait*2)*.012*amount;
    this.spine.rotation.z=smooth(this.spine.rotation.z,jumpArch,8,dt);

    const counter=Math.sin(this.gait)*.012*amount;
    this.shoulderMass.rotation.x=smooth(this.shoulderMass.rotation.x,counter,7,dt);
    this.hipMass.rotation.x=smooth(this.hipMass.rotation.x,-counter*.8,7,dt);

    const headTarget=(airborne ? (this.verticalVelocity>0 ? .055 : -.026) : 0)-this.spine.rotation.z*.26;
    this.headPivot.rotation.z=smooth(this.headPivot.rotation.z,headTarget,8,dt);
    this.headPivot.rotation.y=smooth(this.headPivot.rotation.y,Math.sin(time*.52)*.032,4,dt);

    for(const leg of this.legs){
      if(airborne){
        const rising=this.verticalVelocity>.25;
        const rootTarget=rising
          ? (leg.hind ? -.52 : -.30)
          : (leg.hind ? -.12 : .22);
        const jointTarget=rising
          ? (leg.hind ? .72 : .42)
          : (leg.hind ? .40 : .10);

        leg.root.rotation.z=smooth(leg.root.rotation.z,rootTarget,11,dt);
        leg.joint.rotation.z=smooth(leg.joint.rotation.z,jointTarget,11,dt);
        if(leg.hock){
          leg.hock.rotation.z=smooth(leg.hock.rotation.z,.15,10,dt);
        }
      }else{
        const phase=running ? leg.runPhase : leg.walkPhase;
        const s=Math.sin(this.gait+phase);
        const stride=s*(running ? .46 : .29)*amount;

        leg.root.rotation.z=smooth(leg.root.rotation.z,stride,12,dt);

        if(leg.hind){
          const bend=Math.max(0,-s)*(running ? .28 : .18)*amount-stride*.18;
          leg.joint.rotation.z=smooth(leg.joint.rotation.z,bend,12,dt);
          leg.hock.rotation.z=smooth(leg.hock.rotation.z,-bend*.36,12,dt);
        }else{
          const bend=Math.max(0,-s)*(running ? .17 : .11)*amount-stride*.13;
          leg.joint.rotation.z=smooth(leg.joint.rotation.z,bend,12,dt);
        }
      }
    }

    // Upright base with a gentle S-curve instead of a rigid pole.
    this.tailRoot.rotation.z=smooth(this.tailRoot.rotation.z,-.78,5,dt);
    this.tailRoot.rotation.y=smooth(this.tailRoot.rotation.y,Math.sin(time*.70)*.07,4,dt);

    this.tail.forEach((part,i)=>{
      const tip=i/Math.max(1,this.tail.length-1);
      const sCurve=(tip<.45 ? -.012 : .018+(tip-.45)*.12);
      part.rotation.z=sCurve+Math.sin(time*.90+i*.32)*.009;
      part.rotation.y=Math.sin(time*.95+i*.34)*(.070/(1+i*.06));
    });
  }
}
