import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MovementSystem } from "../src/systems/MovementSystem.js";

class MockInput {
  constructor(){
    this.keys=new Set();
    this.pressed=new Set(["Space"]);
  }
  down(code){ return this.keys.has(code); }
  consume(code){
    const value=this.pressed.has(code);
    this.pressed.delete(code);
    return value;
  }
}

test("Space launches the cat and the cat lands again", () => {
  const input=new MockInput();
  const camera={
    getWorldDirection(v){ return v.set(0,0,-1); }
  };
  const collision={
    resolveHorizontal(from, proposed){ return proposed.clone(); },
    getTopSurfaceBelow(){ return 0; }
  };
  const audio={jump(){},land(){},step(){}};
  const system=new MovementSystem(input,camera,collision,audio);
  const cat={
    config:{speed:4,sprint:5.5,jumpVelocity:6.5,radius:.42},
    group:{position:new THREE.Vector3(0,0,0),rotation:{y:0}},
    velocity:new THREE.Vector3(),
    verticalVelocity:0,
    grounded:true,
    jumpBuffer:0,
    coyote:0,
    jumpState:"ground",
    turnRate:0
  };

  const dt=1/60;
  system.update(cat,dt);

  assert.equal(cat.grounded,false,"cat should leave the ground after Space");
  assert.ok(cat.verticalVelocity>0,"jump should create upward velocity");
  assert.ok(cat.group.position.y>0,"cat should visibly gain height");

  let maxY=cat.group.position.y;
  for(let i=0;i<240;i++){
    system.update(cat,dt);
    maxY=Math.max(maxY,cat.group.position.y);
  }

  assert.ok(maxY>1.0,`jump should be clearly visible, got maxY=${maxY}`);
  assert.equal(cat.grounded,true,"cat should land again");
  assert.equal(cat.group.position.y,0,"cat should land on the floor");
});
