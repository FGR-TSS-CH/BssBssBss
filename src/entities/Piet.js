import * as THREE from "three";

const smooth=(value,target,speed,dt)=>value+(target-value)*(1-Math.exp(-speed*dt));
const cast=(mesh)=>{mesh.castShadow=true;mesh.receiveShadow=true;return mesh;};

function furMaterial(color,extra={}){
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness:.94,
    metalness:0,
    sheen:.25,
    sheenColor:new THREE.Color(color),
    ...extra
  });
}

function sphere(parent,material,radius,scale,position,segments=18){
  const mesh=cast(new THREE.Mesh(
    new THREE.SphereGeometry(radius,segments,Math.max(10,segments-4)),
    material
  ));
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function bone(parent,material,length,top,bottom){
  const mesh=cast(new THREE.Mesh(
    new THREE.CylinderGeometry(top,bottom,length,10),
    material
  ));
  mesh.position.y=-length/2;
  parent.add(mesh);
  return mesh;
}

function line(parent,points,color=0xf7f4ee,opacity=.72){
  const material=new THREE.LineBasicMaterial({color,transparent:true,opacity});
  parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material));
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

    const tabby=furMaterial(0x6f6257);
    const tabbyDark=furMaterial(0x2d2926);
    const white=furMaterial(0xf4f1e8,{sheen:.42});
    const pink=furMaterial(0xe5a2a7,{roughness:.76});
    const green=furMaterial(0x9fc58f,{roughness:.15,clearcoat:1,clearcoatRoughness:.08});
    const black=furMaterial(0x101112,{roughness:.4});
    const glint=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.1});

    this.spine=new THREE.Group();
    this.spine.position.y=.61;
    this.model.add(this.spine);

    // Long, slim torso. No raised "stripe spikes".
    this.torso=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.145,.70,12,24),tabby));
    this.torso.rotation.z=Math.PI/2;
    this.torso.scale.set(1.06,.92,.83);
    this.torso.position.set(-.02,0,0);
    this.spine.add(this.torso);

    this.waist=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.115,.28,10,18),tabby));
    this.waist.rotation.z=Math.PI/2;
    this.waist.scale.set(1,.88,.78);
    this.waist.position.set(-.39,-.005,0);
    this.spine.add(this.waist);

    this.shoulderMass=sphere(this.spine,tabby,.155,[1.15,1.04,.98],[.40,.015,0],20);
    this.hipMass=sphere(this.spine,tabby,.16,[1.24,1.00,1.02],[-.48,-.01,0],20);

    // White bib and underside, matching the Piet reference.
    this.bib=sphere(this.spine,white,.135,[1.05,.92,.74],[.48,-.09,0],18);
    this.underside=sphere(this.spine,white,.11,[2.25,.34,.72],[.08,-.135,0],16);

    const neck=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.085,.12,8,12),tabby));
    neck.rotation.z=Math.PI/2;
    neck.position.set(.56,.10,0);
    this.spine.add(neck);

    this.headPivot=new THREE.Group();
    this.headPivot.position.set(.73,.22,0);
    this.spine.add(this.headPivot);

    this.skull=sphere(this.headPivot,tabby,.205,[1.02,.98,.91],[0,0,0],22);
    // Slightly narrower mature-cat face, not kitten-round.
    this.skull.scale.x=.95;

    const faceWhite=sphere(this.headPivot,white,.13,[1.18,.78,.92],[.105,-.045,0],18);
    faceWhite.scale.y*=.94;
    sphere(this.headPivot,white,.085,[.60,1.45,.65],[.035,.075,0],15);

    sphere(this.headPivot,pink,.029,[1,.70,1.08],[.236,-.075,0],12);

    for(const side of[-1,1]){
      const ear=new THREE.Group();
      ear.position.set(-.035,.205,side*.125);
      this.headPivot.add(ear);

      const outer=cast(new THREE.Mesh(new THREE.ConeGeometry(.082,.19,3),tabby));
      outer.rotation.y=side*Math.PI/2;
      ear.add(outer);

      const inner=cast(new THREE.Mesh(new THREE.ConeGeometry(.045,.12,3),pink));
      inner.position.set(.006,.006,side*.004);
      inner.rotation.y=side*Math.PI/2;
      ear.add(inner);

      sphere(this.headPivot,green,.035,[1,.90,.60],[.135,.035,side*.116],12);
      sphere(this.headPivot,black,.013,[.62,1.38,.42],[.166,.035,side*.117],10);
      sphere(this.headPivot,glint,.006,[1,1,.45],[.178,.048,side*.111],8);
    }

    // Subtle forehead tabby marks.
    for(const z of[-.065,0,.065]){
      const mark=cast(new THREE.Mesh(
        new THREE.CapsuleGeometry(.012,.085,5,8),
        tabbyDark
      ));
      mark.rotation.z=.22;
      mark.position.set(.02,.145,z);
      this.headPivot.add(mark);
    }

    for(const side of[-1,1]){
      for(let row=-1;row<=1;row++){
        line(this.headPivot,[
          new THREE.Vector3(.19,-.065,side*.055),
          new THREE.Vector3(.35,-.06+row*.012,side*(.11+row*.009)),
          new THREE.Vector3(.54,-.045+row*.016,side*(.17+row*.013))
        ]);
      }
    }

    // Side tabby stripes: thin recessed-ish bands along the flanks.
    for(const side of[-1,1]){
      for(let i=0;i<5;i++){
        const band=cast(new THREE.Mesh(
          new THREE.CapsuleGeometry(.018,.15,5,8),
          tabbyDark
        ));
        band.rotation.z=Math.PI/2.8;
        band.rotation.x=side*.08;
        band.scale.set(1,.34,.40);
        band.position.set(-.32+i*.15,.055,side*.137);
        this.spine.add(band);
      }
    }

    this.legs=[];
    const addFrontLeg=(side,walkPhase,runPhase)=>{
      const shoulder=new THREE.Group();
      shoulder.position.set(.38,-.045,side*.145);
      this.spine.add(shoulder);

      const upper=bone(shoulder,tabby,.205,.047,.041);
      upper.rotation.z=.10;

      const elbow=new THREE.Group();
      elbow.position.set(.018,-.19,0);
      shoulder.add(elbow);

      const forearm=bone(elbow,white,.22,.040,.032);
      forearm.rotation.z=-.055;

      const wrist=new THREE.Group();
      wrist.position.set(-.014,-.214,0);
      elbow.add(wrist);

      const paw=sphere(wrist,white,.054,[1.45,.56,1.05],[.048,-.028,0],10);
      this.legs.push({root:shoulder,joint:elbow,paw,hind:false,side,walkPhase,runPhase});
    };

    const addHindLeg=(side,walkPhase,runPhase)=>{
      const hip=new THREE.Group();
      hip.position.set(-.42,-.01,side*.148);
      this.spine.add(hip);

      const thigh=bone(hip,tabby,.235,.068,.052);
      thigh.rotation.z=.36;

      const knee=new THREE.Group();
      knee.position.set(.082,-.205,0);
      hip.add(knee);

      const shin=bone(knee,tabby,.19,.047,.038);
      shin.rotation.z=-.56;

      const hock=new THREE.Group();
      hock.position.set(-.073,-.157,0);
      knee.add(hock);

      const metatarsal=bone(hock,white,.17,.036,.030);
      metatarsal.rotation.z=.17;

      const paw=sphere(hock,white,.056,[1.55,.56,1.06],[.066,-.162,0],10);
      this.legs.push({root:hip,joint:knee,hock,paw,hind:true,side,walkPhase,runPhase});
    };

    // Natural four-beat walk; diagonal pairing at speed.
    addFrontLeg( 1,0,0);
    addHindLeg(-1,Math.PI*.5,0);
    addFrontLeg(-1,Math.PI,Math.PI);
    addHindLeg( 1,Math.PI*1.5,Math.PI);

    // Piet's long, slim tail, usually carried high/curved in the reference.
    this.tail=[];
    this.tailRoot=new THREE.Group();
    this.tailRoot.position.set(-.56,.05,0);
    this.spine.add(this.tailRoot);

    const segments=12;
    const segLength=.115;
    let parent=this.tailRoot;
    for(let i=0;i<segments;i++){
      const pivot=new THREE.Group();
      if(i) pivot.position.x=-segLength*.70;
      parent.add(pivot);

      const seg=cast(new THREE.Mesh(
        new THREE.CapsuleGeometry(.043-i*.0017,.068,5,9),
        i%3===2 ? tabbyDark : tabby
      ));
      seg.rotation.z=Math.PI/2;
      seg.position.x=-segLength*.34;
      pivot.add(seg);
      this.tail.push(pivot);
      parent=pivot;
    }

    this.model.scale.set(1.04,1.03,.95);
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

    this.gait+=dt*(moving ? (running ? 11.8 : 7.1+amount*1.4) : .8);
    this.jumpPulse=Math.max(0,this.jumpPulse-dt);
    this.landPulse=Math.max(0,this.landPulse-dt);

    const breathe=Math.sin(time*1.65)*.005;
    const groundBob=airborne?0:Math.sin(this.gait*2)*.009*amount;
    const landing=this.landPulse>0?Math.sin((this.landPulse/.16)*Math.PI)*.050:0;
    this.model.position.y=breathe+groundBob-landing;

    const jumpArch=airborne
      ? THREE.MathUtils.clamp(-this.verticalVelocity*.045,-.27,.23)
      : Math.sin(this.gait*2)*.018*amount;
    this.spine.rotation.z=smooth(this.spine.rotation.z,jumpArch,8,dt);

    // Small shoulder/pelvis counter motion gives a feline spine feel.
    const roll=Math.sin(this.gait)*.018*amount;
    this.shoulderMass.rotation.x=smooth(this.shoulderMass.rotation.x,roll,7,dt);
    this.hipMass.rotation.x=smooth(this.hipMass.rotation.x,-roll*.85,7,dt);

    const headTarget=(airborne ? (this.verticalVelocity>0?.08:-.035) : 0)-this.spine.rotation.z*.30;
    this.headPivot.rotation.z=smooth(this.headPivot.rotation.z,headTarget,8,dt);
    this.headPivot.rotation.y=smooth(this.headPivot.rotation.y,Math.sin(time*.58)*.04,4,dt);

    for(const leg of this.legs){
      if(airborne){
        const ascending=this.verticalVelocity>.25;
        const rootTarget=ascending
          ? (leg.hind?-.62:-.38)
          : (leg.hind?-.20:.28);
        const jointTarget=ascending
          ? (leg.hind?.84:.52)
          : (leg.hind?.50:.14);

        leg.root.rotation.z=smooth(leg.root.rotation.z,rootTarget,11,dt);
        leg.joint.rotation.z=smooth(leg.joint.rotation.z,jointTarget,11,dt);
        if(leg.hock) leg.hock.rotation.z=smooth(leg.hock.rotation.z,.20,10,dt);
      }else{
        const phase=running?leg.runPhase:leg.walkPhase;
        const s=Math.sin(this.gait+phase);
        const stride=s*(running?.60:.38)*amount;
        leg.root.rotation.z=smooth(leg.root.rotation.z,stride,12,dt);

        if(leg.hind){
          const bend=Math.max(0,-s)*(running?.38:.26)*amount-stride*.24;
          leg.joint.rotation.z=smooth(leg.joint.rotation.z,bend,12,dt);
          leg.hock.rotation.z=smooth(leg.hock.rotation.z,-bend*.42,12,dt);
        }else{
          const bend=Math.max(0,-s)*(running?.24:.16)*amount-stride*.18;
          leg.joint.rotation.z=smooth(leg.joint.rotation.z,bend,12,dt);
        }
      }
    }

    this.tailRoot.rotation.z=smooth(this.tailRoot.rotation.z,.82,5,dt);
    this.tailRoot.rotation.y=smooth(this.tailRoot.rotation.y,Math.sin(time*.75)*.10,4,dt);
    this.tail.forEach((part,i)=>{
      const tip=i/Math.max(1,this.tail.length-1);
      part.rotation.z=.020+tip*.022+Math.sin(time*1.0+i*.38)*.012;
      part.rotation.y=Math.sin(time*1.1+i*.38)*(.11/(1+i*.08));
    });
  }
}
