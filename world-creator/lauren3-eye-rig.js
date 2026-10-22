// Lauren 3 — actual eye rig + smooth 3D orbital morph.
// Intact source GLB is NEVER rewritten. Laura 2.5 remains a separate frozen copy.
import * as THREE from 'three';
const RAD = Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const eyespecs=[{id:'left',x:697,y:541,rx:53,ry:19,r:49},{id:'right',x:955,y:541,rx:58,ry:19,r:49}];
const gauss=(x,y,cx,cy,sx,sy,amp)=>amp*Math.exp(-.5*((x-cx)/sx)**2-.5*((y-cy)/sy)**2);
function curvedDisc(rad,depth,mat){
 const pts=[0,0,0], inds=[];
 for(let i=0;i<=64;i++){let a=2*Math.PI*i/64;pts.push(rad*Math.cos(a),rad*Math.sin(a),-rad*rad/(2*49)+depth);}
 for(let i=1;i<=64;i++)inds.push(0,i,i+1);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));geo.setIndex(inds);geo.computeVertexNormals();
 return new THREE.Mesh(geo,mat);
}
export function installLauren3Eyes(root){
 const meshes=[];root.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.position)meshes.push(o);});
 if(meshes.length!==1)throw Error('Safety: expected one original facial mesh, got '+meshes.length);
 const face=meshes[0], original=face.geometry, originalPos=original.attributes.position;
 if(originalPos.count!==38365||!original.index||original.index.count!==228219)throw Error('Safety: unexpected original face topology');
 const geo=original.clone(),pos=geo.attributes.position,idx=geo.index,colors=geo.attributes.color;
 const unchangedColors=colors?.array?.slice();
 // Displacements are fully continuous Gaussians: no hard Y bands or seams.
 let sculpted=0,maxDelta=0;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  let dz=0;
  for(const s of eyespecs){
    dz+=gauss(x,y,s.x,500,34,13,2.0); // small under-eye pad
    dz+=gauss(x,y,s.x,483,50,24,.65); // soften into upper cheeks
    dz+=gauss(x,y,s.x,576,38,13,1.45); // small upper-lid puff
    dz+=gauss(x,y,s.x,593,52,21,.45); // fade into orbital ridge
  }
  if(dz>.0005){pos.setZ(i,z+dz);sculpted++;maxDelta=Math.max(maxDelta,dz);}
 }
 if(maxDelta>3.2||sculpted<1500)throw Error('Safety: orbital sculpt outside intended range');
 pos.needsUpdate=true;
 // Holes remove the baked photo-eye colors only on this runtime clone,
 // never change base vertex positions/X/Y or the archived source.
 const kept=[],removed=[0,0];
 for(let i=0;i<idx.count;i+=3){
  const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
  const mx=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3;
  const my=(pos.getY(a)+pos.getY(b)+pos.getY(c))/3;
  let eye=-1;
  for(let k=0;k<2;k++){
    const s=eyespecs[k];
    if(((mx-s.x)/s.rx)**2+((my-s.y)/s.ry)**2<.96){eye=k;break;}
  }
  if(eye===-1)kept.push(a,b,c);else removed[eye]++;
 }
 if(removed.some(x=>x<90||x>4200))throw Error('Safety: eye aperture invalid: '+removed);
 if(colors&&unchangedColors&&colors.array.length===unchangedColors.length){
   for(let k=0;k<colors.array.length;k++)if(colors.array[k]!==unchangedColors[k])throw Error('Skin color modified unexpectedly');
 }
 geo.setIndex(kept);geo.computeVertexNormals();geo.computeBoundingSphere();face.geometry=geo;
 const eyeObjects=[];
 const scleraMat=new THREE.MeshPhysicalMaterial({color:0xf0e8dc,roughness:.31,clearcoat:.45});
 const irisOuter=new THREE.MeshStandardMaterial({color:0x414d39,roughness:.55,side:THREE.DoubleSide});
 const irisInner=new THREE.MeshStandardMaterial({color:0x708065,roughness:.52,side:THREE.DoubleSide});
 const irisGold=new THREE.MeshStandardMaterial({color:0xa58752,roughness:.57,side:THREE.DoubleSide});
 const pupilMat=new THREE.MeshBasicMaterial({color:0x080a0b,side:THREE.DoubleSide});
 const highlightMat=new THREE.MeshBasicMaterial({color:0xffffff,depthWrite:false});
 const lidMat=new THREE.MeshStandardMaterial({color:0xd3a783,side:THREE.DoubleSide,roughness:1});
 const edgeMat=new THREE.MeshStandardMaterial({color:0x9b6954,roughness:.88});
 for(const s of eyespecs){
  const depths=[];
  for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i)-s.x)<10&&Math.abs(pos.getY(i)-s.y)<7)depths.push(pos.getZ(i));
  if(depths.length<12)throw Error('Cannot estimate eye depth for '+s.id);
  depths.sort((a,b)=>a-b);
  const frontZ=depths[Math.floor(depths.length*.67)]+5;
  const centerZ=frontZ-s.r;
  const socket=new THREE.Group();socket.name=s.id+'_EYE_SOCKET';socket.position.set(s.x,s.y,centerZ);root.add(socket);
  const globe=new THREE.Group();globe.name=s.id+'_MOVABLE_EYE';socket.add(globe);
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(s.r,40,30),scleraMat));
  const iris=new THREE.Group();iris.position.z=s.r+.15;globe.add(iris);
  const circles=[[17,irisOuter,.1],[15.2,irisInner,.4],[9.2,irisGold,.65],[6.9,pupilMat,1.2]];
  for(const [radius,mat,z] of circles){const disc=curvedDisc(radius,z,mat);disc.name=s.id+'_iris_or_pupil';iris.add(disc);}
  const glint=new THREE.Mesh(new THREE.SphereGeometry(1.85,10,8),highlightMat);
  glint.position.set(-5,6,1.95);iris.add(glint);
  const rims=[];
  for(const upper of [true,false]){
   const points=[];
   for(let i=0;i<=40;i++){
     const u=-1+2*i/40;
     points.push(new THREE.Vector3(s.x+u*s.rx,s.y+(upper?1:-1)*s.ry*Math.sqrt(Math.max(0,1-u*u)),frontZ+1.4-9*u*u));
   }
   const rim=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,upper?2.5:2.15,7),edgeMat);
   rim.name=s.id+(upper?'_UPPER_LID':'_LOWER_LID');root.add(rim);rims.push(rim);
  }
  const lid=new THREE.Mesh(new THREE.BufferGeometry(),lidMat);root.add(lid);lid.visible=false;
  eyeObjects.push({s,socket,globe,frontZ,lid,yaw:0,pitch:0,trimX:0,trimY:0,blink:0,blinkStart:0,blinkDuration:0});
 }
 function refresh(e){
  e.globe.rotation.y=clamp(e.yaw+e.trimX,-28,28)*RAD;
  e.globe.rotation.x=-clamp(e.pitch+e.trimY,-20,20)*RAD;
  const t=e.blink;
  e.lid.visible=t>.025;
  if(!e.lid.visible)return;
  // A real curved 3D skin flap covers the aperture when blinking.
  const s=e.s,pts=[],indices=[],N=36;
  for(let i=0;i<=N;i++){
   const u=-1+2*i/N,arc=Math.sqrt(Math.max(0,1-u*u));
   const top=s.y+s.ry*arc,lower=s.y+s.ry*arc*(1-1.9*t);
   const x=s.x+u*s.rx,z=e.frontZ+5-7*u*u;
   pts.push(x,top,z,x,lower,z+.7);
  }
  for(let i=0;i<N;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(indices);g.computeVertexNormals();
  e.lid.geometry.dispose();e.lid.geometry=g;
 }
 eyeObjects.forEach(refresh);
 return {
  eyes:eyeObjects,removed,sculpted,maxDelta,
  look(which='both',yaw=0,pitch=0){eyeObjects.forEach(e=>{if(which==='both'||which===e.s.id){e.yaw=yaw;e.pitch=pitch;refresh(e);}});},
  trim(which,axis,amount){eyeObjects.forEach(e=>{if(which==='both'||which===e.s.id){if(axis==='x')e.trimX=clamp(amount,-12,12);if(axis==='y')e.trimY=clamp(amount,-10,10);refresh(e);}});},
  blink(which='both'){eyeObjects.forEach(e=>{if(which==='both'||which===e.s.id){e.blinkStart=performance.now();e.blinkDuration=300;}});},
  tick(time){eyeObjects.forEach(e=>{if(e.blinkDuration){const t=clamp((time-e.blinkStart)/e.blinkDuration,0,1);e.blink=t<1?Math.sin(Math.PI*t)**2:0;refresh(e);if(t>=1)e.blinkDuration=0;}});},
  reset(){eyeObjects.forEach(e=>{e.yaw=e.pitch=e.trimX=e.trimY=e.blink=e.blinkDuration=0;refresh(e);});}
 };
}
