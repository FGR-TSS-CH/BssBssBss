import * as THREE from "three";

const smooth=(value,target,speed,dt)=>value+(target-value)*(1-Math.exp(-speed*dt));
const cast=(mesh)=>{mesh.castShadow=true;mesh.receiveShadow=true;return mesh;};

function furMaterial(color,extra={}){
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness:.95,
    metalness:0,
    sheen:.22,
    sheenColor:new THREE.Color(color),
    ...extra
  });
}

function makePietBodyTexture(){
  const canvas=document.createElement("canvas");
  canvas.width=512;
  canvas.height=256;
  const ctx=canvas.getContext("2d");

  ctx.fillStyle="#74685e";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const stripe=(x,w,lean=0)=>{
    ctx.save();
    ctx.translate(x,0);
    ctx.rotate(lean);
    ctx.fillStyle="#302b28";
    ctx.beginPath();
    ctx.moveTo(-w*.55,0);
    ctx.bezierCurveTo(-w*.85,48,-w*.25,80,-w*.62,118);
    ctx.bezierCurveTo(-w*.88,145,-w*.22,170,-w*.40,196);
    ctx.lineTo(w*.34,196);
    ctx.bezierCurveTo(w*.12,166,w*.72,138,w*.38,110);
    ctx.bezierCurveTo(w*.06,78,w*.62,44,w*.52,0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  [45,110,178,248,320,395,462].forEach((x,i)=>stripe(x,24+(i%2)*5,(i-3)*.018));

  // Dark dorsal line
  const grd=ctx.createLinearGradient(0,0,0,80);
  grd.addColorStop(0,"rgba(38,33,30,.95)");
  grd.addColorStop(1,"rgba(38,33,30,0)");
  ctx.fillStyle=grd;
  ctx.fillRect(0,0,512,82);

  // Light underside transition
  const white=ctx.createLinearGradient(0,168,0,256);
  white.addColorStop(0,"rgba(244,241,232,0)");
  white.addColorStop(.48,"rgba(244,241,232,.35)");
  white.addColorStop(1,"rgba(244,241,232,.92)");
  ctx.fillStyle=white;
  ctx.fillRect(0,160,512,96);

  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=THREE.RepeatWrapping;
  texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.repeat.set(1.15,1);
  return texture;
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
    opacity:.72
  });
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

    const bodyTexture=makePietBodyTexture();
    const tabby=furMaterial(0x776b61);
    const bodyFur=furMaterial(0xffffff,{map:bodyTexture});
    const dark=furMaterial(0x302b28);
    const white=furMaterial(0xf4f1e8,{sheen:.35});
    const pink=furMaterial(0xe8a7ac,{roughness:.76});
    const green=furMaterial(0x9ec48d,{roughness:.12,clearcoat:1,clearcoatRoughness:.08});
    const black=furMaterial(0x101112,{roughness:.4});
    const glint=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.08});

    this.spine=new THREE.Group();
    this.spine.position.y=.58;
    this.model.add(this.spine);

    // Feline silhouette: deeper rib cage, narrow waist, compact pelvis.
    this.ribcage=ellipsoid(this.spine,bodyFur,.22,[1.75,.80,.78],[.16,.005,0],28);
    this.waist=ellipsoid(this.spine,bodyFur,.18,[1.55,.63,.68],[-.26,-.010,0],24);
    this.hipMass=ellipsoid(this.spine,bodyFur,.19,[1.18,.83,.86],[-.50,-.005,0],24);
    this.shoulderMass=ellipsoid(this.spine,bodyFur,.18,[1.10,.88,.86],[.43,.020,0],24);

    // White chest and belly from reference.
    this.bib=ellipsoid(this.spine,white,.13,[1.00,.92,.70],[.49,-.10,0],18);
    this.belly=ellipsoid(this.spine,white,.11,[2.05,.30,.62],[.05,-.145,0],18);

    const neck=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.072,.105,8,12),tabby));
    neck.rotation.z=Math.PI/2;
    neck.position.set(.59,.105,0);
    this.spine.add(neck);

    this.headPivot=new THREE.Group();
    this.headPivot.position.set(.735,.205,0);
    this.spine.add(this.headPivot);

    // Mature, narrower head — substantially smaller than before.
    this.skull=ellipsoid(this.headPivot,tabby,.165,[.98,.93,.86],[0,0,0],24);

    // Two cheek lobes instead of one large white ball.
    for(const side of[-1,1]){
      ellipsoid(this.headPivot,white,.070,[1.12,.72,.88],[.132,-.060,side*.042],16);
    }
    ellipsoid(this.headPivot,white,.061,[.58,1.28,.58],[.035,.052,0],16);

    ellipsoid(this.headPivot,pink,.022,[1,.72,1.08],[.205,-.071,0],12);

    for(const side of[-1,1]){
      const ear=new THREE.Group();
      ear.position.set(-.035,.155,side*.102);
      this.headPivot.add(ear);

      const outer=cast(new THREE.Mesh(new THREE.ConeGeometry(.060,.145,3),tabby));
      outer.rotation.y=side*Math.PI/2;
      outer.rotation.z=-.05;
      ear.add(outer);

      const inner=cast(new THREE.Mesh(new THREE.ConeGeometry(.032,.086,3),pink));
      inner.position.set(.005,.003,side*.003);
      inner.rotation.y=side*Math.PI/2;
      inner.rotation.z=-.05;
      ear.add(inner);

      ellipsoid(this.headPivot,green,.028,[1,.88,.56],[.112,.024,side*.093],12);
      ellipsoid(this.headPivot,black,.010,[.62,1.45,.40],[.137,.024,side*.094],10);
      ellipsoid(this.headPivot,glint,.0048,[1,1,.45],[.147,.036,side*.089],8);
    }

    // Soft forehead tabby marks embedded into the face.
    for(const z of[-.046,0,.046]){
      const mark=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.008,.055,5,8),dark));
      mark.rotation.z=.20;
      mark.position.set(.006,.112,z);
      this.headPivot.add(mark);
    }

    for(const side of[-1,1]){
      for(let row=-1;row<=1;row++){
        whisker(this.headPivot,[
          new THREE.Vector3(.155,-.060,side*.046),
          new THREE.Vector3(.29,-.057+row*.010,side*(.090+row*.007)),
          new THREE.Vector3(.45,-.043+row*.014,side*(.140+row*.010))
        ]);
      }
    }

    this.legs=[];

    const addFrontLeg=(side,walkPhase,runPhase)=>{
      const shoulder=new THREE.Group();
      shoulder.position.set(.40,-.045,side*.135);
      this.spine.add(shoulder);

      const upper=taperedBone(shoulder,tabby,.190,.042,.036);
      upper.rotation.z=.08;

      const elbow=new THREE.Group();
      elbow.position.set(.015,-.178,0);
      shoulder.add(elbow);

      const forearm=taperedBone(elbow,white,.210,.035,.029);
      forearm.rotation.z=-.045;

      const wrist=new THREE.Group();
      wrist.position.set(-.012,-.203,0);
      elbow.add(wrist);

      const paw=ellipsoid(wrist,white,.047,[1.55,.50,1.00],[.046,-.022,0],10);
      this.legs.push({root:shoulder,joint:elbow,paw,hind:false,side,walkPhase,runPhase});
    };

    const addHindLeg=(side,walkPhase,runPhase)=>{
      const hip=new THREE.Group();
      hip.position.set(-.43,-.010,side*.138);
      this.spine.add(hip);

      const thigh=taperedBone(hip,tabby,.210,.057,.046);
      thigh.rotation.z=.43;

      const knee=new THREE.Group();
      knee.position.set(.083,-.175,0);
      hip.add(knee);

      const shin=taperedBone(knee,tabby,.170,.042,.034);
      shin.rotation.z=-.62;

      const hock=new THREE.Group();
      hock.position.set(-.077,-.135,0);
      knee.add(hock);

      const metatarsal=taperedBone(hock,white,.155,.032,.026);
      metatarsal.rotation.z=.16;

      const paw=ellipsoid(hock,white,.049,[1.60,.50,1.02],[.064,-.148,0],10);
      this.legs.push({root:hip,joint:knee,hock,paw,hind:true,side,walkPhase,runPhase});
    };

    addFrontLeg( 1,0,0);
    addHindLeg(-1,Math.PI*.5,0);
    addFrontLeg(-1,Math.PI,Math.PI);
    addHindLeg( 1,Math.PI*1.5,Math.PI);

    // Long tail with raised base and natural curve.
    this.tail=[];
    this.tailRoot=new THREE.Group();
    this.tailRoot.position.set(-.57,.035,0);
    this.spine.add(this.tailRoot);

    const segments=13;
    const segLength=.102;
    let parent=this.tailRoot;
    for(let i=0;i<segments;i++){
      const pivot=new THREE.Group();
      if(i) pivot.position.x=-segLength*.72;
      parent.add(pivot);

      const segment=cast(new THREE.Mesh(
        new THREE.CapsuleGeometry(.036-i*.00125,.060,5,9),
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

    this.gait+=dt*(moving ? (running ? 11.5 : 7.0+amount*1.4) : .75);
    this.jumpPulse=Math.max(0,this.jumpPulse-dt);
    this.landPulse=Math.max(0,this.landPulse-dt);

    const breathe=Math.sin(time*1.6)*.0045;
    const bob=airborne?0:Math.sin(this.gait*2)*.0075*amount;
    const landing=this.landPulse>0 ? Math.sin((this.landPulse/.16)*Math.PI)*.045 : 0;
    this.model.position.y=breathe+bob-landing;

    const jumpArch=airborne
      ? THREE.MathUtils.clamp(-this.verticalVelocity*.042,-.24,.21)
      : Math.sin(this.gait*2)*.014*amount;
    this.spine.rotation.z=smooth(this.spine.rotation.z,jumpArch,8,dt);

    const counter=Math.sin(this.gait)*.014*amount;
    this.shoulderMass.rotation.x=smooth(this.shoulderMass.rotation.x,counter,7,dt);
    this.hipMass.rotation.x=smooth(this.hipMass.rotation.x,-counter*.85,7,dt);

    const headTarget=(airborne ? (this.verticalVelocity>0 ? .065 : -.030) : 0)-this.spine.rotation.z*.28;
    this.headPivot.rotation.z=smooth(this.headPivot.rotation.z,headTarget,8,dt);
    this.headPivot.rotation.y=smooth(
      this.headPivot.rotation.y,
      Math.sin(time*.55)*.035,
      4,
      dt
    );

    for(const leg of this.legs){
      if(airborne){
        const rising=this.verticalVelocity>.25;
        const rootTarget=rising
          ? (leg.hind ? -.58 : -.34)
          : (leg.hind ? -.16 : .26);
        const jointTarget=rising
          ? (leg.hind ? .78 : .48)
          : (leg.hind ? .46 : .12);

        leg.root.rotation.z=smooth(leg.root.rotation.z,rootTarget,11,dt);
        leg.joint.rotation.z=smooth(leg.joint.rotation.z,jointTarget,11,dt);
        if(leg.hock){
          leg.hock.rotation.z=smooth(leg.hock.rotation.z,.17,10,dt);
        }
      }else{
        const phase=running ? leg.runPhase : leg.walkPhase;
        const s=Math.sin(this.gait+phase);
        const stride=s*(running ? .53 : .33)*amount;

        leg.root.rotation.z=smooth(leg.root.rotation.z,stride,12,dt);

        if(leg.hind){
          const bend=Math.max(0,-s)*(running ? .32 : .22)*amount-stride*.22;
          leg.joint.rotation.z=smooth(leg.joint.rotation.z,bend,12,dt);
          leg.hock.rotation.z=smooth(leg.hock.rotation.z,-bend*.40,12,dt);
        }else{
          const bend=Math.max(0,-s)*(running ? .20 : .13)*amount-stride*.16;
          leg.joint.rotation.z=smooth(leg.joint.rotation.z,bend,12,dt);
        }
      }
    }

    // Raise tail upward: negative Z rotation because the tail initially points along -X.
    this.tailRoot.rotation.z=smooth(this.tailRoot.rotation.z,-1.02,5,dt);
    this.tailRoot.rotation.y=smooth(
      this.tailRoot.rotation.y,
      Math.sin(time*.75)*.08,
      4,
      dt
    );

    this.tail.forEach((part,i)=>{
      const tip=i/Math.max(1,this.tail.length-1);
      const curve=-.028+tip*.070;
      part.rotation.z=curve+Math.sin(time*.95+i*.34)*.010;
      part.rotation.y=Math.sin(time*1.05+i*.35)*(.085/(1+i*.07));
    });
  }
}
