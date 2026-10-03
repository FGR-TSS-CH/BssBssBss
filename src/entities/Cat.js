import * as THREE from "three";

const material=(color,extra={})=>new THREE.MeshPhysicalMaterial({
  color,roughness:.93,metalness:0,sheen:.35,sheenColor:new THREE.Color(color),...extra
});
const cast=(m)=>{m.castShadow=m.receiveShadow=true;return m;};

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

    const fur=material(config.colors.base);
    const dark=material(config.colors.dark);
    const white=material(config.colors.white,{sheen:.55});
    const pink=material(0xe7a9ad,{roughness:.78});
    const black=material(0x171719,{roughness:.5});
    const eyeMat=material(config.colors.eye,{roughness:.18,clearcoat:1,clearcoatRoughness:.12});

    const id=config.id;
    const slender=id==="piet" ? 0.78 : id==="yuki" ? 1.18 : 0.90;
    const legScale=id==="piet" ? 1.22 : id==="yuki" ? 0.86 : 1.0;
    const headScale=id==="zelda" ? 0.90 : id==="yuki" ? 1.06 : .96;

    this.body=cast(new THREE.Mesh(new THREE.CapsuleGeometry(config.body.width*.40,config.body.length*.62,10,18),fur));
    this.body.rotation.z=Math.PI/2;
    this.body.scale.set(1,slender,.90);
    this.body.position.set(-.02,.60,0);
    this.model.add(this.body);

    const hips=cast(new THREE.Mesh(new THREE.SphereGeometry(.22,18,14),fur));
    hips.scale.set(1.25,1.02*slender,1.02);
    hips.position.set(-config.body.length*.35,.58,0);
    this.model.add(hips);

    const chestMat=config.markings.whiteChest?white:fur;
    const chest=cast(new THREE.Mesh(new THREE.SphereGeometry(.22,18,14),chestMat));
    chest.scale.set(1.18,1.25*slender,1.0);
    chest.position.set(config.body.length*.33,.62,0);
    this.model.add(chest);

    const neck=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.12,.12,7,10),fur));
    neck.rotation.z=Math.PI/2;
    neck.position.set(config.body.length*.55,.72,0);
    this.model.add(neck);

    this.headPivot=new THREE.Group();
    this.headPivot.position.set(config.body.length*.70,.83,0);
    this.headPivot.scale.setScalar(headScale);
    this.model.add(this.headPivot);

    const skull=cast(new THREE.Mesh(new THREE.SphereGeometry(.24,20,16),fur));
    skull.scale.set(1.0,.95,.90);
    this.headPivot.add(skull);

    const muzzleMat=config.markings.whiteFace?white:fur;
    for(const s of[-1,1]){
      const cheek=cast(new THREE.Mesh(new THREE.SphereGeometry(.105,14,12),muzzleMat));
      cheek.scale.set(1.15,.78,1.0);
      cheek.position.set(.19,-.07,s*.065);
      this.headPivot.add(cheek);
    }
    if(config.markings.whiteFace){
      const blaze=cast(new THREE.Mesh(new THREE.SphereGeometry(.095,12,10),white));
      blaze.scale.set(.72,1.65,.75);
      blaze.position.set(.08,.08,0);
      this.headPivot.add(blaze);
    }

    const nose=cast(new THREE.Mesh(new THREE.SphereGeometry(.038,12,10),pink));
    nose.scale.set(1,.75,1.15);
    nose.position.set(.285,-.075,0);
    this.headPivot.add(nose);

    for(const s of[-1,1]){
      const ear=cast(new THREE.Mesh(new THREE.ConeGeometry(.105,.23,4),fur));
      ear.position.set(-.035,.25,s*.145);
      ear.rotation.z=s*.08;
      this.headPivot.add(ear);

      const inner=new THREE.Mesh(new THREE.ConeGeometry(.060,.14,4),pink);
      inner.position.set(-.02,.255,s*.146);
      inner.rotation.z=s*.08;
      this.headPivot.add(inner);

      const eyeWhite=cast(new THREE.Mesh(new THREE.SphereGeometry(.052,12,10),white));
      eyeWhite.scale.set(1,.82,.52);
      eyeWhite.position.set(.16,.045,s*.145);
      this.headPivot.add(eyeWhite);

      const iris=cast(new THREE.Mesh(new THREE.SphereGeometry(.035,12,10),eyeMat));
      iris.scale.z=.45;
      iris.position.set(.195,.045,s*.145);
      this.headPivot.add(iris);

      const pupil=cast(new THREE.Mesh(new THREE.SphereGeometry(.012,10,8),black));
      pupil.scale.set(.7,1.5,.35);
      pupil.position.set(.225,.045,s*.145);
      this.headPivot.add(pupil);
    }

    const whiskerMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.9});
    for(const side of[-1,1]) for(let i=-1;i<=1;i++){
      const points=[
        new THREE.Vector3(.22,-.065,side*.07),
        new THREE.Vector3(.48,-.06+i*.015,side*(.16+i*.015)),
        new THREE.Vector3(.72,-.04+i*.02,side*(.24+i*.02))
      ];
      const geo=new THREE.BufferGeometry().setFromPoints(points);
      this.headPivot.add(new THREE.Line(geo,whiskerMat));
    }

    this.legs=[];
    const legX=config.body.length*.34;
    const legZ=config.body.width*.36;
    const specs=[[legX,legZ,0,false],[legX,-legZ,Math.PI,false],[-legX,legZ,Math.PI,true],[-legX,-legZ,0,true]];
    for(const [x,z,phase,hind] of specs){
      const hip=new THREE.Group();
      hip.position.set(x,.48,z);
      this.model.add(hip);

      if(hind){
        const thigh=cast(new THREE.Mesh(new THREE.SphereGeometry(.12,12,10),fur));
        thigh.scale.set(1.0,1.30,1.0);
        thigh.position.set(-.03,-.08,0);
        hip.add(thigh);
      }

      const upper=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.05,.19*legScale,6,8),fur));
      upper.position.y=-.15*legScale;
      hip.add(upper);

      const knee=new THREE.Group();
      knee.position.y=-.29*legScale;
      hip.add(knee);

      const lowerMat=config.markings.whitePaws?white:fur;
      const lower=cast(new THREE.Mesh(new THREE.CapsuleGeometry(.043,.18*legScale,6,8),lowerMat));
      lower.position.y=-.13*legScale;
      knee.add(lower);

      const paw=cast(new THREE.Mesh(new THREE.SphereGeometry(.066,10,8),lowerMat));
      paw.scale.set(1.35,.58,1.55);
      paw.position.set(.035,-.255*legScale,.01);
      knee.add(paw);

      this.legs.push({hip,knee,paw,phase,hind});
    }

    this.tail=[];
    let parent=new THREE.Group();
    parent.position.set(-config.body.length*.58,.67,0);
    this.model.add(parent);
    const segmentLength=config.tail.length/config.tail.segments;
    const tailThickness=config.tail.thickness*(id==="zelda" ? 1.75 : id==="yuki" ? 1.15 : 1);
    for(let i=0;i<config.tail.segments;i++){
      const pivot=new THREE.Group();
      if(i) pivot.position.x=-segmentLength*.72;
      parent.add(pivot);

      const seg=cast(new THREE.Mesh(
        new THREE.CapsuleGeometry(tailThickness*(1-i/config.tail.segments*.28),segmentLength*.55,5,8),
        i%3===2?dark:fur
      ));
      seg.rotation.z=Math.PI/2;
      seg.position.x=-segmentLength*.36;
      pivot.add(seg);

      this.tail.push(pivot);
      parent=pivot;
    }

    if(id==="piet") this.model.scale.set(1.05,1.04,.94);
    if(id==="zelda") this.model.scale.set(.92,.94,.92);
    if(id==="yuki") this.model.scale.set(1.08,1.00,1.13);

    scene.add(this.group);
  }

  setSelected(v){this.selected=v;}

  animate(dt,time){
    const speed=this.velocity.length();
    const moving=speed>.08;
    const running=speed>this.config.speed*1.08;
    this.gait+=dt*(moving?(running?11.5:7.3):1);
    const amount=moving?Math.min(speed/this.config.sprint,1):0;
    const airborne=!this.grounded;

    const breathe=Math.sin(time*1.9)*.007;
    this.model.position.y=breathe+(airborne?0:Math.sin(this.gait*2)*.014*amount);
    const pitch=airborne?THREE.MathUtils.clamp(-this.verticalVelocity*.05,-.34,.26):Math.sin(this.gait*2)*.035*amount;
    this.model.rotation.x+=(pitch-this.model.rotation.x)*Math.min(1,dt*9);
    this.model.rotation.z+=(Math.sin(this.gait)*.02*amount-this.model.rotation.z)*Math.min(1,dt*7);

    const headTargetX=(airborne ? .14 : 0)-this.model.rotation.x*.35+Math.sin(time*.9)*.018;
    this.headPivot.rotation.x+=(headTargetX-this.headPivot.rotation.x)*Math.min(1,dt*7);
    this.headPivot.rotation.y+=(Math.sin(time*.65)*.055-this.headPivot.rotation.y)*Math.min(1,dt*4);

    this.legs.forEach((leg)=>{
      if(airborne){
        const hipTarget=leg.hind ? -.85 : -.50;
        const kneeTarget=leg.hind ? .75 : .52;
        leg.hip.rotation.z+=(hipTarget-leg.hip.rotation.z)*Math.min(1,dt*10);
        leg.knee.rotation.z+=(kneeTarget-leg.knee.rotation.z)*Math.min(1,dt*10);
      }else{
        const s=Math.sin(this.gait+leg.phase);
        const stride=s*(running ? .68 : .46)*amount;
        leg.hip.rotation.z+=(stride-leg.hip.rotation.z)*Math.min(1,dt*10);
        const bend=Math.max(0,-s)*(running ? .22 : .14)*amount-stride*.32;
        leg.knee.rotation.z+=(bend-leg.knee.rotation.z)*Math.min(1,dt*10);
      }
    });

    this.tail.forEach((p,i)=>{
      const sway=Math.sin(time*1.6+i*.45)*(.18/(1+i*.14))+(moving?Math.sin(this.gait*.5+i*.2)*.05*amount:0);
      p.rotation.y=sway;
      const base=this.config.id==="yuki" ? .18 : .27;
      p.rotation.z=base/(1+i*.12)+Math.sin(time*.7+i*.2)*.018;
      if(this.config.id==="zelda"){
        p.rotation.z += .055 + i*.014;
        p.rotation.y += Math.sin(time*.55+i*.18)*.035;
      }
    });
  }
}
