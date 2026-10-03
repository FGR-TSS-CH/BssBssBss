import * as THREE from "three";

export class MovementSystem {
  constructor(input, camera, collision, audio){ this.input=input; this.camera=camera; this.collision=collision; this.audio=audio; this.stepTimer=0; }
  update(cat, dt){
    const cfg=cat.config;
    if(this.input.consume("Space")) cat.jumpBuffer=.16;
    cat.jumpBuffer=Math.max(0,cat.jumpBuffer-dt);
    cat.coyote=cat.grounded ? .12 : Math.max(0,cat.coyote-dt);

    const forward=new THREE.Vector3(); this.camera.getWorldDirection(forward); forward.y=0; forward.normalize();
    const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
    const dir=new THREE.Vector3();
    if(this.input.down("KeyW")) dir.add(forward);
    if(this.input.down("KeyS")) dir.sub(forward);
    if(this.input.down("KeyD")) dir.add(right);
    if(this.input.down("KeyA")) dir.sub(right);
    if(dir.lengthSq()) dir.normalize();

    const sprint=this.input.down("ShiftLeft")||this.input.down("ShiftRight");
    const max=sprint?cfg.sprint:cfg.speed;
    const desired=dir.multiplyScalar(max);
    const accel=cat.grounded?11:4.5;
    cat.velocity.lerp(desired,1-Math.exp(-accel*dt));

    if(cat.jumpBuffer>0 && cat.coyote>0){
      cat.verticalVelocity=cfg.jumpVelocity;
      cat.grounded=false;
      cat.jumpBuffer=0;
      cat.coyote=0;
      cat.jumpState="air";
      cat.jumpPulse=.12;
      this.audio?.jump();
    }

    const wasGrounded=cat.grounded;
    cat.verticalVelocity -= 14.5*dt;
    const from=cat.group.position.clone();
    const horizontal=from.clone().addScaledVector(cat.velocity,dt);
    const height=Math.max(0,cat.group.position.y);
    const resolved=this.collision.resolveHorizontal(from,horizontal,cfg.radius,height);
    cat.group.position.x=resolved.x; cat.group.position.z=resolved.z;

    cat.group.position.y += cat.verticalVelocity*dt;
    const surface=this.collision.getTopSurfaceBelow(cat.group.position.x,cat.group.position.z,cat.group.position.y,.28);
    if(cat.group.position.y<=surface && cat.verticalVelocity<=0){
      cat.group.position.y=surface;
      cat.verticalVelocity=0;
      cat.grounded=true;
      cat.jumpState="ground";
      if(!wasGrounded){
        cat.landPulse=.16;
        this.audio?.land();
      }
    }else{
      cat.grounded=false;
    }

    this.stepTimer-=dt;
    if(cat.grounded && cat.velocity.length()>1.0 && this.stepTimer<=0){
      this.audio?.step();
      this.stepTimer=sprint ? .14 : .23;
    }

    if(cat.velocity.lengthSq()>.02){
      const target=Math.atan2(cat.velocity.x,cat.velocity.z)-Math.PI/2;
      let diff=target-cat.group.rotation.y;
      while(diff>Math.PI) diff-=Math.PI*2;
      while(diff<-Math.PI) diff+=Math.PI*2;
      cat.turnRate=diff;
      cat.group.rotation.y += diff*(1-Math.exp(-10*dt));
    } else cat.turnRate*=.7;
  }
}
