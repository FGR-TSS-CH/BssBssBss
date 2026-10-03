import * as THREE from "three";

const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.92});

export class Cat {
  constructor(scene, config, position){
    this.config=config;
    this.group=new THREE.Group();
    this.group.position.copy(position);
    this.velocity=new THREE.Vector3();
    this.verticalVelocity=0;
    this.grounded=true;
    this.gait=0;
    this.jumpState="ground";
    this.coyote=0;
    this.jumpBuffer=0;
    this.turnRate=0;

    const fur=mat(config.colors.base), dark=mat(config.colors.dark), white=mat(config.colors.white), pink=mat(0xe7a9ad);
    this.body=new THREE.Mesh(new THREE.CapsuleGeometry(config.body.height*.42, config.body.length*.78, 10, 18), fur);
    this.body.rotation.z=Math.PI/2;
    this.body.scale.z=.85;
    this.body.position.y=.58;
    this.group.add(this.body);

    const chest=new THREE.Mesh(new THREE.SphereGeometry(.24,18,14), config.markings.whiteChest?white:fur);
    chest.scale.set(1.25,1.35,.95); chest.position.set(.38,.61,0); this.group.add(chest);

    this.headPivot=new THREE.Group(); this.headPivot.position.set(.72,.82,0); this.group.add(this.headPivot);
    this.head=new THREE.Mesh(new THREE.SphereGeometry(.25,20,16), fur); this.head.scale.set(1.02,.94,.92); this.headPivot.add(this.head);
    if(config.markings.whiteFace){
      const muzzle=new THREE.Mesh(new THREE.SphereGeometry(.14,16,12),white); muzzle.scale.set(1.15,.65,1.3); muzzle.position.set(.19,-.07,0); this.headPivot.add(muzzle);
    }
    const nose=new THREE.Mesh(new THREE.SphereGeometry(.04,10,8),pink); nose.scale.set(1,.75,1.1); nose.position.set(.29,-.06,0); this.headPivot.add(nose);
    for(const s of [-1,1]){
      const ear=new THREE.Mesh(new THREE.ConeGeometry(.10,.22,4),fur); ear.position.set(-.03,.25,s*.14); ear.rotation.z=s*.04; this.headPivot.add(ear);
      const eye=new THREE.Mesh(new THREE.SphereGeometry(.045,12,10),mat(config.colors.eye)); eye.scale.z=.45; eye.position.set(.20,.04,s*.13); this.headPivot.add(eye);
    }
    this.legs=[];
    const legData=[[.43,.17,0],[.43,-.17,Math.PI],[-.42,.17,Math.PI],[-.42,-.17,0]];
    for(let i=0;i<legData.length;i++){
      const [x,z,phase]=legData[i];
      const pivot=new THREE.Group(); pivot.position.set(x,.45,z); this.group.add(pivot);
      const upper=new THREE.Mesh(new THREE.CapsuleGeometry(.05,.23,6,8),fur); upper.position.y=-.14; pivot.add(upper);
      const lower=new THREE.Mesh(new THREE.CapsuleGeometry(.043,.22,6,8),config.markings.whitePaws?white:fur); lower.position.y=-.37; pivot.add(lower);
      const paw=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),config.markings.whitePaws?white:fur); paw.scale.set(1.15,.6,1.5); paw.position.set(.04,-.53,0); pivot.add(paw);
      this.legs.push({pivot,lower,paw,phase,hind:i>=2});
    }
    this.tail=[];
    let parent=new THREE.Group(); parent.position.set(-.68,.67,0); this.group.add(parent);
    const len=config.tail.length/config.tail.segments;
    for(let i=0;i<config.tail.segments;i++){
      const pivot=new THREE.Group(); if(i) pivot.position.x=-len*.75; parent.add(pivot);
      const seg=new THREE.Mesh(new THREE.CapsuleGeometry(config.tail.thickness*(1-i/config.tail.segments*.3),len*.55,5,8),fur);
      seg.rotation.z=Math.PI/2; seg.position.x=-len*.38; pivot.add(seg);
      this.tail.push(pivot); parent=pivot;
    }
    scene.add(this.group);
  }
  setSelected(v){ this.selected=v; }
  animate(dt,time){
    const speed=this.velocity.length(), moving=speed>.08, running=speed>this.config.speed*1.08;
    this.gait += dt*(moving?(running?12:8):1);
    const a=moving?Math.min(speed/this.config.sprint,1):0;
    const airborne=!this.grounded;
    this.body.position.y=.58 + (airborne?0:Math.sin(this.gait*2)*.018*a);
    this.body.rotation.x = airborne ? THREE.MathUtils.clamp(-this.verticalVelocity*.04,-.3,.25) : Math.sin(this.gait*2)*.03*a;
    this.headPivot.rotation.x += (((airborne ? .15 : 0))-this.headPivot.rotation.x)*Math.min(1,dt*8);
    this.legs.forEach((l,i)=>{
      if(airborne){
        l.pivot.rotation.z += ((l.hind?-.85:-.55)-l.pivot.rotation.z)*Math.min(1,dt*10);
        l.lower.rotation.z += ((l.hind ? .8 : .55)-l.lower.rotation.z)*Math.min(1,dt*10);
      }else{
        const s=Math.sin(this.gait+l.phase);
        l.pivot.rotation.z=s*(running ? .72 : .50)*a;
        l.lower.rotation.z=Math.max(0,-s)*.14*a-l.pivot.rotation.z*.35;
      }
    });
    this.tail.forEach((p,i)=>{p.rotation.y=Math.sin(time*1.8+i*.45)*(.18/(1+i*.15)); p.rotation.z=.13+Math.sin(this.gait*.5+i*.18)*.03*a;});
  }
}
