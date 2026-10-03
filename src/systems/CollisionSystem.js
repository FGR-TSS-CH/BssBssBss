import * as THREE from "three";

export class CollisionSystem {
  constructor(room){ this.room=room; this.obstacles=[]; }
  setObstacles(obstacles){ this.obstacles = obstacles; }
  obstacleBounds(obj){
    const meta=obj.userData.collider;
    if(!meta) return null;
    return { x:obj.position.x, z:obj.position.z, w:meta.w, d:meta.d, h:meta.h ?? 1, r:obj.rotation.y };
  }
  pointInsideRotatedBox(x,z,b,pad=0){
    const dx=x-b.x,dz=z-b.z,c=Math.cos(-b.r),s=Math.sin(-b.r);
    const lx=dx*c-dz*s,lz=dx*s+dz*c;
    return Math.abs(lx)<b.w/2+pad && Math.abs(lz)<b.d/2+pad;
  }
  canOccupy(x,z,radius,height=0){
    const mx=this.room.width/2-radius-.15, mz=this.room.depth/2-radius-.15;
    if(x < -mx || x > mx || z < -mz || z > mz) return false;
    for(const obj of this.obstacles){
      const b=this.obstacleBounds(obj);
      if(!b || height > b.h + 0.08) continue;
      if(this.pointInsideRotatedBox(x,z,b,radius)) return false;
    }
    return true;
  }
  resolveHorizontal(from, proposed, radius, height=0){
    const out=proposed.clone();
    if(!this.canOccupy(out.x, from.z, radius, height)) out.x=from.x;
    if(!this.canOccupy(out.x, out.z, radius, height)) out.z=from.z;
    if(!this.canOccupy(out.x, out.z, radius, height)) out.copy(from);
    return out;
  }
  getTopSurfaceBelow(x,z,feetY,maxStep=0.22){
    let best=0;
    for(const obj of this.obstacles){
      const b=this.obstacleBounds(obj);
      if(!b) continue;
      if(this.pointInsideRotatedBox(x,z,b,0.15) && b.h <= feetY + maxStep && b.h > best) best=b.h;
    }
    return best;
  }
}
