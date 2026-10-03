import * as THREE from "three";

export class Room {
  constructor(scene, config){
    this.scene=scene; this.width=config.width; this.depth=config.depth; this.group=new THREE.Group(); scene.add(this.group);
    this.furnitureGroup=new THREE.Group(); scene.add(this.furnitureGroup); this.furniture=[];
    this.build();
    this.defaultFurniture();
  }
  meshBox(w,h,d,color,x,y,z){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.9}));
    m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; this.group.add(m); return m;
  }
  build(){
    this.group.clear();
    this.floor=this.meshBox(this.width,.2,this.depth,0xb47f50,0,-.1,0);
    this.meshBox(this.width,5,.2,0xf0ede6,0,2.5,-this.depth/2);
    this.meshBox(.2,5,this.depth,0xf0ede6,-this.width/2,2.5,0);
    this.meshBox(.2,5,this.depth,0xf0ede6,this.width/2,2.5,0);
  }
  addFurniture(type,x,z,r=0){
    const g=new THREE.Group(); g.userData.type=type;
    const box=(w,h,d,c,y=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.88}));m.position.y=y;m.castShadow=m.receiveShadow=true;g.add(m);};
    if(type==="sofa"){box(4,.65,1.8,0xaaa39e,.38);box(4,.7,.35,0x8f8984,1.05);g.userData.collider={w:4.25,d:2,h:1.3};}
    if(type==="table"){box(3.2,.18,2,0x8f633f,1.2);for(const sx of[-1.35,1.35])for(const sz of[-.72,.72]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.14,1.2,.14),new THREE.MeshStandardMaterial({color:0x33363a}));leg.position.set(sx,.6,sz);g.add(leg)}g.userData.collider={w:3.35,d:2.1,h:1.3};}
    if(type==="chair"){box(1.1,.14,1,0x95603d,.9);box(1.1,1,.15,0x95603d,1.42);g.userData.collider={w:1.15,d:1.05,h:1.9};}
    if(type==="rug"){box(4,.04,3,0x565b61,.03);g.userData.collider=null;}
    if(type==="catbed"){box(1.5,.18,1.05,0xb69d8f,.1);g.userData.collider={w:1.6,d:1.15,h:.35};}
    if(type==="tree"){box(1.2,.12,1.2,0x8b6d55,.06);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,2.6,12),new THREE.MeshStandardMaterial({color:0xc7aa7f}));pole.position.y=1.3;g.add(pole);box(1.6,.16,1,0x88705f,2.4);g.userData.collider={w:1.7,d:1.25,h:2.5};}
    if(type==="plant"){box(.8,.55,.8,0x8a6243,.27);const plant=new THREE.Mesh(new THREE.SphereGeometry(.6,12,10),new THREE.MeshStandardMaterial({color:0x4f8251}));plant.scale.set(.6,1.2,.6);plant.position.y=1.15;g.add(plant);g.userData.collider={w:1,d:1,h:1.8};}
    if(type==="lamp"){box(.5,.08,.5,0x33363a,.04);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2.2,10),new THREE.MeshStandardMaterial({color:0x4b4e52}));stem.position.y=1.1;g.add(stem);g.userData.collider={w:.65,d:.65,h:2.3};}
    g.position.set(x,0,z); g.rotation.y=r; this.furnitureGroup.add(g); this.furniture.push(g); return g;
  }
  defaultFurniture(){
    [["sofa",-9,5,0],["rug",3,1,0],["table",-1,0,0],["chair",-3,-2.2,0],["chair",-3,2.2,Math.PI],["catbed",-8,2.5,0],["tree",8,-4,0],["plant",9,4,0],["lamp",-10,-4,0]].forEach(v=>this.addFurniture(...v));
  }
}
