// Lauren 3 — actual eye rig + smooth 3D orbital morph.
// Intact source GLB is NEVER rewritten. Laura 2.5 remains a separate frozen copy.
import * as THREE from 'three';
const RAD = Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Relax the wide, circular default eyes into a human almond-shaped resting gaze.
// Offset the visible opening slightly downward to let upper lids overlap the irises.
const eyespecs=[{id:'left',x:697,y:541,rx:42,ry:13.2,offsetY:-2.2,r:45},{id:'right',x:955,y:541,rx:43,ry:13.2,offsetY:-2.2,r:45}];
const gauss=(x,y,cx,cy,sx,sy,amp)=>amp*Math.exp(-.5*((x-cx)/sx)**2-.5*((y-cy)/sy)**2);
function curvedDisc(rad,depth,mat,globeRadius){
 const pts=[0,0,0], inds=[];
 for(let i=0;i<=64;i++){let a=2*Math.PI*i/64;pts.push(rad*Math.cos(a),rad*Math.sin(a),-rad*rad/(2*globeRadius)+depth);}
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
    // Real orbital volume immediately outside the eyelids, smoothly feathered
    // into the preserved face; no sharp band boundaries or independent head.
    dz+=gauss(x,y,s.x,512,39,11,4.6); // lower-lid pad
    dz+=gauss(x,y,s.x,492,53,25,.85); // feather into cheek
    dz+=gauss(x,y,s.x,566,40,10.5,4.0); // subtle upper eyelid cushion
    dz+=gauss(x,y,s.x,590,56,22,.85); // fade toward the brow
  }
  if(dz>.0005){pos.setZ(i,z+dz);sculpted++;maxDelta=Math.max(maxDelta,dz);}
 }
 if(maxDelta>6.2||sculpted<1500)throw Error('Safety: orbital sculpt outside intended range');
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
    if(((mx-s.x)/s.rx)**2+((my-(s.y+s.offsetY))/s.ry)**2<.96){eye=k;break;}
  }
  if(eye===-1)kept.push(a,b,c);else removed[eye]++;
 }
 if(removed.some(x=>x<90||x>4200))throw Error('Safety: eye aperture invalid: '+removed);
 if(colors&&unchangedColors&&colors.array.length===unchangedColors.length){
   for(let k=0;k<colors.array.length;k++)if(colors.array[k]!==unchangedColors[k])throw Error('Skin color modified unexpectedly');
 }
 geo.setIndex(kept);geo.computeVertexNormals();geo.computeBoundingSphere();face.geometry=geo;
 const eyeObjects=[];
 const scleraMat=new THREE.MeshPhysicalMaterial({color:0xece7df,roughness:.48,clearcoat:.22});
 const irisOuter=new THREE.MeshStandardMaterial({color:0x414d39,roughness:.55,side:THREE.DoubleSide});
 const irisInner=new THREE.MeshStandardMaterial({color:0x708065,roughness:.52,side:THREE.DoubleSide});
 const irisGold=new THREE.MeshStandardMaterial({color:0xa58752,roughness:.57,side:THREE.DoubleSide});
 const pupilMat=new THREE.MeshBasicMaterial({color:0x080a0b,side:THREE.DoubleSide});
 const highlightMat=new THREE.MeshBasicMaterial({color:0xffffff,depthWrite:false});
 const lidMat=new THREE.MeshStandardMaterial({color:0xd3a783,side:THREE.DoubleSide,roughness:1});
 const edgeMat=new THREE.MeshStandardMaterial({color:0x987c6e,roughness:1});
// Each eye remains a genuine independently rotatable 3D globe. Mask ALL
// visible eye materials in HEAD-LOCAL coordinates, not sphere coordinates,
// to stop whites/iris bleeding through cheeks during rotation.
const inverseHeadWorld=new THREE.Matrix4();
function apertureMaterial(base,s){
 const material=base.clone();
 const clipUniforms={
  eyeMaskInverse:{value:inverseHeadWorld},
  eyeMaskOrigin:{value:new THREE.Vector2(s.x,s.y+s.offsetY)},
  eyeMaskRadii:{value:new THREE.Vector2(s.rx-2,s.ry-1.1)}
 };
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,clipUniforms);
  const vp='#include <project_vertex>';
  const fp='#include <clipping_planes_fragment>';
  if(!shader.vertexShader.includes(vp)||!shader.fragmentShader.includes(fp))
   throw Error('Three.js eye shader anchors changed');
  shader.vertexShader='uniform mat4 eyeMaskInverse;\nvarying vec3 vEyeHeadPosition;\n'+
   shader.vertexShader.replace(vp,vp+'\nvEyeHeadPosition=(eyeMaskInverse * modelMatrix * vec4(transformed,1.0)).xyz;');
  shader.fragmentShader='uniform vec2 eyeMaskOrigin;\nuniform vec2 eyeMaskRadii;\nvarying vec3 vEyeHeadPosition;\n'+
   shader.fragmentShader.replace(fp,fp+'\nvec2 aperture=(vEyeHeadPosition.xy-eyeMaskOrigin)/eyeMaskRadii;\nif(dot(aperture,aperture)>1.0) discard;');
 };
 material.customProgramCacheKey=()=>('lauren3-aperture-v7-recessed-'+s.id);
 return material;
}

 for(const s of eyespecs){
  const depths=[];
  for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i)-s.x)<10&&Math.abs(pos.getY(i)-s.y)<7)depths.push(pos.getZ(i));
  if(depths.length<12)throw Error('Cannot estimate eye depth for '+s.id);
  depths.sort((a,b)=>a-b);
  // Old +5 placement left the spherical globe pushing through face skin.
  // Fit the globe and rim independently to measured original mesh depths.
  const rimZ=depths[Math.floor(depths.length*.67)]+3;
  const frontZ=depths[Math.floor(depths.length*.5)]-7;
  const centerZ=frontZ-s.r;
  // A real shaded backing beneath the smaller globes seals any uncovered
  // corner triangles in the image-derived facial shell. It belongs to the
  // disposable runtime rig, NEVER the approved source mesh.
  const cavity=new THREE.Mesh(
    new THREE.CircleGeometry(1,72),
    new THREE.MeshBasicMaterial({color:0xad7f76,side:THREE.DoubleSide,depthWrite:true,toneMapped:false})
  );
  cavity.name=s.id+'_SEALED_EYE_CAVITY';
  cavity.position.set(s.x,s.y+s.offsetY,frontZ-16);
  cavity.scale.set(s.rx+8,s.ry+7,1);
  root.add(cavity);
  const socket=new THREE.Group();socket.name=s.id+'_EYE_SOCKET';socket.position.set(s.x,s.y,centerZ);root.add(socket);
  const globe=new THREE.Group();globe.name=s.id+'_MOVABLE_EYE';socket.add(globe);
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(s.r,40,30),apertureMaterial(scleraMat,s)));
  const iris=new THREE.Group();iris.position.z=s.r+.15;globe.add(iris);
  const circles=[[15.6,irisOuter,.1],[13.9,irisInner,.4],[8.4,irisGold,.65],[6.2,pupilMat,1.2]];
  for(const [radius,mat,z] of circles){const disc=curvedDisc(radius,z,apertureMaterial(mat,s),s.r);disc.name=s.id+'_iris_or_pupil';iris.add(disc);}
  const glint=new THREE.Mesh(new THREE.SphereGeometry(1.85,10,8),apertureMaterial(highlightMat,s));
  glint.position.set(-4.5,5.4,1.8);iris.add(glint);
  const rims=[];
  for(const upper of [true,false]){
   const points=[];
   for(let i=0;i<=40;i++){
     const u=-1+2*i/40;
     points.push(new THREE.Vector3(s.x+u*s.rx,s.y+s.offsetY+(upper?1:-1)*s.ry*Math.sqrt(Math.max(0,1-u*u)),rimZ+1.1-9*u*u));
   }
   const rim=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,upper?1.55:1.25,7),edgeMat);
   rim.name=s.id+(upper?'_UPPER_LID':'_LOWER_LID');root.add(rim);rims.push(rim);
  }
  const lid=new THREE.Mesh(new THREE.BufferGeometry(),lidMat);root.add(lid);lid.visible=false;
  eyeObjects.push({s,socket,globe,frontZ,rimZ,lid,yaw:0,pitch:0,trimX:0,trimY:0,blink:0,blinkStart:0,blinkDuration:0});
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
   const top=s.y+s.offsetY+s.ry*arc,lower=s.y+s.offsetY+s.ry*arc*(1-1.9*t);
   const x=s.x+u*s.rx,z=e.rimZ+1.8-7*u*u;
   pts.push(x,top,z,x,lower,z+.7);
  }
  for(let i=0;i<N;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(indices);g.computeVertexNormals();
  e.lid.geometry.dispose();e.lid.geometry=g;
 }
 root.updateMatrixWorld(true);
 inverseHeadWorld.copy(root.matrixWorld).invert();
 eyeObjects.forEach(refresh);
 return {
  eyes:eyeObjects,removed,sculpted,maxDelta,
  look(which='both',yaw=0,pitch=0){eyeObjects.forEach(e=>{if(which==='both'||which===e.s.id){e.yaw=yaw;e.pitch=pitch;refresh(e);}});},
  trim(which,axis,amount){eyeObjects.forEach(e=>{if(which==='both'||which===e.s.id){if(axis==='x')e.trimX=clamp(amount,-12,12);if(axis==='y')e.trimY=clamp(amount,-10,10);refresh(e);}});},
  blink(which='both'){eyeObjects.forEach(e=>{if(which==='both'||which===e.s.id){e.blinkStart=performance.now();e.blinkDuration=300;}});},
  tick(time){root.updateMatrixWorld(true);inverseHeadWorld.copy(root.matrixWorld).invert();eyeObjects.forEach(e=>{if(e.blinkDuration){const t=clamp((time-e.blinkStart)/e.blinkDuration,0,1);e.blink=t<1?Math.sin(Math.PI*t)**2:0;refresh(e);if(t>=1)e.blinkDuration=0;}});},
  reset(){eyeObjects.forEach(e=>{e.yaw=e.pitch=e.trimX=e.trimY=e.blink=e.blinkDuration=0;refresh(e);});}
 };
}
