import * as THREE from "three";

const mat=(color,extra={})=>new THREE.MeshPhysicalMaterial({
  color,
  roughness:.92,
  metalness:0,
  sheen:.28,
  sheenColor:new THREE.Color(color),
  ...extra
});
const cast=(mesh)=>{mesh.castShadow=true;mesh.receiveShadow=true;return mesh;};
const smooth=(value,target,speed,dt)=>value+(target-value)*(1-Math.exp(-speed*dt));

function ellipsoid(parent,material,radius,scale,position,segments=16){
  const mesh=cast(new THREE.Mesh(
    new THREE.SphereGeometry(radius,segments,Math.max(10,segments-4)),
    material
  ));
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function taperedBone(parent,material,length,topRadius,bottomRadius){
  const mesh=cast(new THREE.Mesh(
    new THREE.CylinderGeometry(topRadius,bottomRadius,length,9),
    material
  ));
  mesh.position.y=-length/2;
  parent.add(mesh);
  return mesh;
}

export class Cat {
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

    const id=config.id;
    const fur=mat(config.colors.base);
    const dark=mat(config.colors.dark);
    const white=mat(config.colors.white,{sheen:.42});
    const pink=mat(0xe5a1a8,{roughness:.75});
    const eye=mat(config.colors.eye,{roughness:.16,clearcoat:1,clearcoatRoughness:.1});
    const black=mat(0x111214,{roughness:.38});
    const glintMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.1});

    const length=config.body.length;
    const width=config.body.width;
    const slim=id==="piet" ? .84 : id==="zelda" ? .93 : 1.10;
    const legScale=id==="piet" ? 1.16 : id==="yuki" ? .90 : 1.0;
    const headScale=id==="zelda" ? .92 : id==="yuki" ? 1.02 : .96;

    this.spine=new THREE.Group();
    this.spine.position.y=.60;
    this.model.add(this.spine);

    this.ribcage=cast(new THREE.Mesh(
      new THREE.CapsuleGeometry(width*.38,length*.48,10,18),
      fur
    ));
    this.ribcage.rotation.z=Math.PI/2;
    this.ribcage.scale.set(1,slim,.90);
    this.ribcage.position.x=.10;
    this.spine.add(this.ribcage);

    this.abdomen=cast(new THREE.Mesh(
      new THREE.CapsuleGeometry(width*.32,length*.30,9,16),
      fur
    ));
    this.abdomen.rotation.z=Math.PI/2;
    this.abdomen.scale.set(1,slim*.90,.86);
    this.abdomen.position.x=-length*.24;
    this.spine.add(this.abdomen);

    this.pelvis=ellipsoid(
      this.spine,fur,.18,
      [1.28,1.02*slim,1.05],
      [-length*.43,-.015,0],
      18
    );

    this.shoulders=ellipsoid(
      this.spine,fur,.17,
      [1.10,1.12*slim,1.03],
      [length*.39,.025,0],
      18
    );

    if(config.markings.whiteChest){
      const chestPatch=ellipsoid(
        this.spine,white,.15,
        [.90,.80,.72],
        [length*.47,-.08,0],
        16
      );
      chestPatch.rotation.z=-.20;
    }

    const neck=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.095,.11,7,10),fur));
    neck.rotation.z=Math.PI/2;
    neck.position.set(length*.55,.11,0);
    this.spine.add(neck);

    this.headPivot=new THREE.Group();
    this.headPivot.position.set(length*.69,.23,0);
    this.headPivot.scale.setScalar(headScale);
    this.spine.add(this.headPivot);

    this.skull=ellipsoid(this.headPivot,fur,.215,[1.03,.98,.92],[0,0,0],20);

    const muzzleMat=config.markings.whiteFace ? white : fur;
    for(const side of[-1,1]){
      ellipsoid(this.headPivot,muzzleMat,.082,[1.18,.72,.90],[.165,-.065,side*.055],14);
    }

    if(config.markings.whiteFace){
      const blaze=ellipsoid(this.headPivot,white,.070,[.58,1.52,.60],[.055,.07,0],14);
      blaze.rotation.z=-.06;
    }

    ellipsoid(this.headPivot,pink,.030,[1,.68,1.10],[.252,-.070,0],12);

    for(const side of[-1,1]){
      const ear=new THREE.Group();
      ear.position.set(-.025,.205,side*.125);
      this.headPivot.add(ear);

      const outer=cast(new THREE.Mesh(new THREE.ConeGeometry(.085,.185,3),fur));
      outer.rotation.y=side*Math.PI/2;
      ear.add(outer);

      const inner=cast(new THREE.Mesh(new THREE.ConeGeometry(.045,.115,3),pink));
      inner.position.set(.005,.008,side*.004);
      inner.rotation.y=side*Math.PI/2;
      ear.add(inner);

      ellipsoid(this.headPivot,eye,.036,[1.0,.88,.60],[.145,.040,side*.118],12);
      ellipsoid(this.headPivot,black,.014,[.62,1.30,.42],[.177,.040,side*.119],10);
      ellipsoid(this.headPivot,glintMat,.006,[1,1,.45],[.188,.053,side*.112],8);
    }

    const whiskerMat=new THREE.LineBasicMaterial({color:0xf4f0e8,transparent:true,opacity:.72});
    for(const side of[-1,1]){
      for(let row=-1;row<=1;row++){
        const points=[
          new THREE.Vector3(.20,-.068,side*.058),
          new THREE.Vector3(.36,-.065+row*.012,side*(.115+row*.008)),
          new THREE.Vector3(.54,-.045+row*.016,side*(.175+row*.012))
        ];
        this.headPivot.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          whiskerMat
        ));
      }
    }

    const stripeXs=[-.38,-.20,-.02,.16,.32].map(v=>v*length);
    for(let i=0;i<stripeXs.length;i++){
      const stripe=ellipsoid(
        this.spine,dark,.075,
        [.72,.18,1.70],
        [stripeXs[i],width*.47,0],
        12
      );
      stripe.rotation.x=Math.PI/2;
      stripe.rotation.z=(i-2)*.05;
    }

    for(const side of[-1,1]){
      for(let i=0;i<3;i++){
        const flank=ellipsoid(
          this.spine,dark,.060,
          [1.05,.20,.72],
          [-length*.18+i*length*.18,-.01,side*width*.40],
          12
        );
        flank.rotation.x=side*.35;
        flank.rotation.z=-.25+i*.10;
      }
    }

    this.legs=[];
    const frontX=length*.37;
    const hindX=-length*.38;
    const sideZ=width*.43;

    const addFrontLeg=(side,phaseWalk,phaseRun)=>{
      const shoulder=new THREE.Group();
      shoulder.position.set(frontX,-.05,side*sideZ);
      this.spine.add(shoulder);

      const upper=taperedBone(shoulder,fur,.20*legScale,.052,.045);
      upper.rotation.z=.10;

      const elbow=new THREE.Group();
      elbow.position.set(.02,-.19*legScale,0);
      shoulder.add(elbow);

      const lowerMat=config.markings.whitePaws ? white : fur;
      const lower=taperedBone(elbow,lowerMat,.22*legScale,.043,.036);
      lower.rotation.z=-.06;

      const wrist=new THREE.Group();
      wrist.position.set(-.015,-.215*legScale,0);
      elbow.add(wrist);

      const paw=ellipsoid(wrist,lowerMat,.055,[1.50,.58,1.05],[.050,-.025,0],10);
      this.legs.push({root:shoulder,joint:elbow,paw,phaseWalk,phaseRun,hind:false,side});
    };

    const addHindLeg=(side,phaseWalk,phaseRun)=>{
      const hip=new THREE.Group();
      hip.position.set(hindX,-.02,side*sideZ);
      this.spine.add(hip);

      const thigh=taperedBone(hip,fur,.22*legScale,.075,.055);
      thigh.rotation.z=.38;

      const knee=new THREE.Group();
      knee.position.set(.085,-.195*legScale,0);
      hip.add(knee);

      const shin=taperedBone(knee,fur,.19*legScale,.050,.040);
      shin.rotation.z=-.58;

      const hock=new THREE.Group();
      hock.position.set(-.075,-.155*legScale,0);
      knee.add(hock);

      const lowerMat=config.markings.whitePaws ? white : fur;
      const metatarsal=taperedBone(hock,lowerMat,.16*legScale,.038,.032);
      metatarsal.rotation.z=.18;

      const paw=ellipsoid(
        hock,lowerMat,.058,
        [1.58,.58,1.08],
        [.070,-.155*legScale,0],
        10
      );

      this.legs.push({root:hip,joint:knee,hock,paw,phaseWalk,phaseRun,hind:true,side});
    };

    addFrontLeg( 1,0,0);
    addFrontLeg(-1,Math.PI,Math.PI);
    addHindLeg( 1,Math.PI*1.5,Math.PI);
    addHindLeg(-1,Math.PI*.5,0);

    this.tail=[];
    this.tailRoot=new THREE.Group();
    this.tailRoot.position.set(-length*.57,.04,0);
    this.spine.add(this.tailRoot);

    const segCount=id==="yuki" ? 3 : config.tail.segments;
    const segLength=config.tail.length/segCount;
    const baseThickness=config.tail.thickness*(id==="zelda" ? 1.65 : id==="yuki" ? 1.22 : .92);

    let parent=this.tailRoot;
    for(let i=0;i<segCount;i++){
      const pivot=new THREE.Group();
      if(i) pivot.position.x=-segLength*.72;
      parent.add(pivot);

      const segment=cast(new THREE.Mesh(
        new THREE.CapsuleGeometry(
          baseThickness*(1-i/segCount*.30),
          segLength*.52,
          5,
          9
        ),
        i%3===2 ? dark : fur
      ));
      segment.rotation.z=Math.PI/2;
      segment.position.x=-segLength*.34;
      pivot.add(segment);

      this.tail.push(pivot);
      parent=pivot;
    }

    this.baseScale=new THREE.Vector3(
      id==="piet" ? 1.05 : id==="zelda" ? .93 : 1.07,
      id==="piet" ? 1.02 : id==="zelda" ? .95 : 1.00,
      id==="piet" ? .94 : id==="zelda" ? .93 : 1.10
    );
    this.model.scale.copy(this.baseScale);

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

    this.gait+=dt*(moving ? (running ? 11.8 : 7.0+amount*1.5) : .9);
    this.jumpPulse=Math.max(0,this.jumpPulse-dt);
    this.landPulse=Math.max(0,this.landPulse-dt);

    const idleBreath=Math.sin(time*1.8)*.006;
    const walkBob=airborne ? 0 : Math.sin(this.gait*2)*.010*amount;
    const landing=this.landPulse>0 ? Math.sin((this.landPulse/.16)*Math.PI)*.055 : 0;
    this.model.position.y=idleBreath+walkBob-landing;

    const airbornePitch=THREE.MathUtils.clamp(-this.verticalVelocity*.047,-.30,.24);
    const groundPitch=Math.sin(this.gait*2)*.022*amount;
    this.spine.rotation.z=smooth(
      this.spine.rotation.z,
      airborne ? airbornePitch : groundPitch,
      8,
      dt
    );

    const shoulderRoll=Math.sin(this.gait)*.022*amount;
    this.shoulders.rotation.x=smooth(this.shoulders.rotation.x,shoulderRoll,7,dt);
    this.pelvis.rotation.x=smooth(this.pelvis.rotation.x,-shoulderRoll*.8,7,dt);

    const headPitch=(airborne ? (this.verticalVelocity>0 ? .10 : -.04) : 0)-this.spine.rotation.z*.28;
    this.headPivot.rotation.z=smooth(this.headPivot.rotation.z,headPitch,8,dt);
    this.headPivot.rotation.y=smooth(
      this.headPivot.rotation.y,
      Math.sin(time*.62)*.045,
      4,
      dt
    );

    for(const leg of this.legs){
      if(airborne){
        const ascending=this.verticalVelocity>.3;
        let rootTarget;
        let jointTarget;

        if(ascending){
          rootTarget=leg.hind ? -.62 : -.42;
          jointTarget=leg.hind ? .85 : .58;
        }else{
          rootTarget=leg.hind ? -.25 : .30;
          jointTarget=leg.hind ? .55 : .18;
        }

        leg.root.rotation.z=smooth(leg.root.rotation.z,rootTarget,11,dt);
        leg.joint.rotation.z=smooth(leg.joint.rotation.z,jointTarget,11,dt);
        if(leg.hock){
          leg.hock.rotation.z=smooth(leg.hock.rotation.z,.22,10,dt);
        }
      }else{
        const phase=running ? leg.phaseRun : leg.phaseWalk;
        const s=Math.sin(this.gait+phase);
        const forward=s*(running ? .62 : .40)*amount;
        const lift=Math.max(0,s)*(running ? .16 : .10)*amount;

        leg.root.rotation.z=smooth(
          leg.root.rotation.z,
          forward-lift*.22,
          12,
          dt
        );

        if(leg.hind){
          const kneeBend=Math.max(0,-s)*(running ? .40 : .28)*amount-forward*.25;
          leg.joint.rotation.z=smooth(leg.joint.rotation.z,kneeBend,12,dt);
          leg.hock.rotation.z=smooth(leg.hock.rotation.z,-kneeBend*.45,12,dt);
        }else{
          const elbowBend=Math.max(0,-s)*(running ? .26 : .17)*amount-forward*.20;
          leg.joint.rotation.z=smooth(leg.joint.rotation.z,elbowBend,12,dt);
        }
      }
    }

    if(this.config.id==="yuki"){
      this.tailRoot.rotation.z=smooth(this.tailRoot.rotation.z,.52,5,dt);
      this.tailRoot.rotation.y=smooth(
        this.tailRoot.rotation.y,
        Math.sin(time*1.1)*.08,
        4,
        dt
      );
      this.tail.forEach((part,i)=>{
        part.rotation.z=.08+i*.025+Math.sin(time*1.4+i)*.018;
        part.rotation.y=Math.sin(time*1.0+i*.6)*.045;
      });
    }else if(this.config.id==="zelda"){
      this.tailRoot.rotation.z=smooth(this.tailRoot.rotation.z,.78,4,dt);
      this.tailRoot.rotation.y=smooth(
        this.tailRoot.rotation.y,
        Math.sin(time*.85)*.12,
        4,
        dt
      );
      this.tail.forEach((part,i)=>{
        const tip=i/Math.max(1,this.tail.length-1);
        part.rotation.z=.055+tip*.075+Math.sin(time*1.25+i*.38)*.018;
        part.rotation.y=Math.sin(time*1.2+i*.42)*(.16/(1+i*.09));
      });
    }else{
      this.tailRoot.rotation.z=smooth(this.tailRoot.rotation.z,.30,4,dt);
      this.tailRoot.rotation.y=smooth(
        this.tailRoot.rotation.y,
        Math.sin(time*.9)*.09,
        4,
        dt
      );
      this.tail.forEach((part,i)=>{
        part.rotation.z=.018+Math.sin(time*1.15+i*.35)*.014;
        part.rotation.y=Math.sin(time*1.35+i*.42)*(.13/(1+i*.10));
      });
    }
  }
}
