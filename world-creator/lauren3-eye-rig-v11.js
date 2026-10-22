// Lauren 3 v11: continuous eye backing, restrained photographic materials.
// Non-destructive browser rig. Approved Laura 2.5 and original GLB remain untouched.
import * as THREE from 'three';
const RAD=Math.PI/180,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const eyespecs=[
 {id:'left',x:697,y:541,offsetY:-2.2,cutRx:39.7,cutRy:11,innerSide:1,r:64},
 {id:'right',x:955,y:541,offsetY:-2.2,cutRx:40.7,cutRy:11,innerSide:-1,r:64}
];
function contour(s,u){
 const n=Math.max(0,u*s.innerSide);
 const middle=s.y+s.offsetY-1.55*s.innerSide*u-.45*n*n;
 const h=s.cutRy*Math.pow(Math.max(0,1-u*u),.67);
 return {upper:middle+h*(.94-.025*n),lower:middle-h*(1.05+.015*n)};
}
function irisCap(radius,eyeRadius){
 const P=[],UV=[],I=[],rings=12,sectors=64;
 for(let ring=0;ring<=rings;ring++){
  const r=radius*ring/rings;
  for(let j=0;j<=sectors;j++){
   const theta=j*2*Math.PI/sectors,x=r*Math.cos(theta),y=r*Math.sin(theta);
   P.push(x,y,Math.sqrt(eyeRadius*eyeRadius-r*r)+.55);
   UV.push(.5+x/(2*radius),.5+y/(2*radius));
   if(ring<rings&&j<sectors){
    const k=ring*(sectors+1)+j;
    I.push(k,k+sectors+1,k+1,k+1,k+sectors+1,k+sectors+2);
   }
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));g.setIndex(I);
 g.computeVertexNormals();return g;
}
function makeIrisTexture(){
 // Textured, feathered iris drawn once, rather than unnaturally sharp concentric discs.
 const c=document.createElement('canvas');c.width=c.height=256;
 const context=c.getContext('2d'),data=context.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const dx=(x-127.5)/119,dy=(y-127.5)/119,r=Math.hypot(dx,dy),theta=Math.atan2(dy,dx);
  const i=(y*256+x)*4;
  let alpha=clamp((1.012-r)*17,0,1),R=74,G=56,B=42;
  const streak=Math.sin(theta*77+r*13)*.5+Math.sin(theta*117-r*37)*.25+
   Math.sin(theta*149+r*6)*.16;
  const golden=clamp((.55-r)*2.3,0,1);
  const outer=clamp((r-.79)*4,0,1);
  R+=streak*13+golden*28-outer*28;
  G+=streak*10+golden*19-outer*21;
  B+=streak*8+golden*9-outer*17;
  const pupil=1-clamp((r-.32)*23,0,1);
  R=R*(1-pupil)+16*pupil;G=G*(1-pupil)+14*pupil;B=B*(1-pupil)+13*pupil;
  // Almost imperceptible catch-light and ambient sheen; no bright plastic dot.
  const glint=Math.exp(-(((dx+.28)/.065)**2+((dy-.29)/.075)**2)*1.3)*25;
  data.data[i]=clamp(R+glint,0,255);
  data.data[i+1]=clamp(G+glint,0,255);
  data.data[i+2]=clamp(B+glint,0,255);
  data.data[i+3]=Math.round(255*alpha);
 }
 context.putImageData(data,0,0);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
 return tex;
}
export function installLauren3Eyes(root){
 const meshes=[];root.traverse(o=>{if(o.isMesh&&o.geometry?.getAttribute('position'))meshes.push(o);});
 if(meshes.length!==1)throw Error('Expected exactly one intact original face');
 const face=meshes[0],source=face.geometry;
 if(source.getAttribute('position').count!==38365||source.index?.count!==228219)
  throw Error('Original face topology changed; refusing to edit');
 const originalPosition=source.getAttribute('position').array.slice();
 const originalColors=source.getAttribute('color')?.array.slice();
 const geometry=source.clone();face.geometry=geometry;
 const pos=geometry.getAttribute('position'),colors=geometry.getAttribute('color');
 const inverseHeadWorld=new THREE.Matrix4(),eyes=[];
 const irisTex=makeIrisTexture();
 const scleraMat=new THREE.MeshBasicMaterial({color:0xd8c7ba,toneMapped:false});
 const irisMat=new THREE.MeshBasicMaterial({map:irisTex,transparent:true,depthWrite:false,
  side:THREE.DoubleSide,toneMapped:false});
 const skinMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
 // Every 3D iris/globe fragment uses the SAME opening as the face shader.
 // Off-by-2px mismatches previously made wedges and disconnected masks.
 function clipped(base,s){
  const m=base.clone();
  const uniforms={eyeMaskInverse:{value:inverseHeadWorld},
   eyeMaskOrigin:{value:new THREE.Vector2(s.x,s.y+s.offsetY)},
   eyeMaskRadii:{value:new THREE.Vector2(s.cutRx-.12,s.cutRy-.04)},
   eyeMaskInnerSide:{value:s.innerSide}};
  const isSclera=base===scleraMat;
  m.onBeforeCompile=sh=>{
   Object.assign(sh.uniforms,uniforms);
   const vp='#include <project_vertex>',fp='#include <clipping_planes_fragment>';
   if(!sh.vertexShader.includes(vp)||!sh.fragmentShader.includes(fp))
    throw Error('Eye aperture shader anchor missing');
   sh.vertexShader='uniform mat4 eyeMaskInverse;\nvarying vec3 vHeadEyePosition;\n'+
    sh.vertexShader.replace(vp,vp+'\nvHeadEyePosition=(eyeMaskInverse*modelMatrix*vec4(transformed,1.0)).xyz;');
   sh.fragmentShader='uniform vec2 eyeMaskOrigin;\nuniform vec2 eyeMaskRadii;\nuniform float eyeMaskInnerSide;\nvarying vec3 vHeadEyePosition;\n'+
    sh.fragmentShader.replace(fp,fp+
     '\nfloat u=(vHeadEyePosition.x-eyeMaskOrigin.x)/eyeMaskRadii.x;'+
     '\nif(abs(u)>=1.0)discard;'+
     '\nfloat n=max(0.0,u*eyeMaskInnerSide);'+
     '\nfloat mid=eyeMaskOrigin.y-1.55*eyeMaskInnerSide*u-0.45*n*n;'+
     '\nfloat halfH=eyeMaskRadii.y*pow(max(0.0,1.0-u*u),0.67);'+
     '\nif(vHeadEyePosition.y>=mid+halfH*(.94-.025*n)||vHeadEyePosition.y<=mid-halfH*(1.05+.015*n))discard;');
   // diffuseColor is declared AFTER clipping_planes_fragment in Three.js.
   // Apply the subtle shading only after color_fragment to avoid a GLSL compile failure.
   if(isSclera){
    const colorAnchor='#include <color_fragment>';
    if(!sh.fragmentShader.includes(colorAnchor))throw Error('Sclera shader color anchor missing');
    sh.fragmentShader=sh.fragmentShader.replace(colorAnchor,colorAnchor+
     '\nfloat lidFade=clamp(abs(vHeadEyePosition.y-mid)/(halfH+.01),0.0,1.0);diffuseColor.rgb*=1.0-.19*lidFade*lidFade-.045*u*u;');
   }
  };
  m.customProgramCacheKey=()=>('lauren-v11-mask-'+s.id+'-'+(base.map?'iris':'sclera'));
  return m;
 }
 for(const s of eyespecs){
  // Restrict samples to eye region to avoid repeated full 38k-vertex scans.
  const region=[];
  for(let j=0;j<pos.count;j++){
   if(Math.abs(pos.getX(j)-s.x)<s.cutRx+35&&Math.abs(pos.getY(j)-s.y)<55)
    region.push({x:pos.getX(j),y:pos.getY(j),z:pos.getZ(j),
     c:colors?new THREE.Color().setRGB(colors.getX(j),colors.getY(j),colors.getZ(j)):null});
  }
  if(region.length<12)throw Error('Cannot locate source eye mesh: '+s.id);
  function skinAt(x,y){
   let best=[null,null,null],ds=[Infinity,Infinity,Infinity];
   for(const p of region){
    const d=(p.x-x)**2+(p.y-y)**2;
    const slot=d<ds[0]?0:d<ds[1]?1:d<ds[2]?2:-1;
    if(slot<0)continue;
    for(let j=2;j>slot;j--){ds[j]=ds[j-1];best[j]=best[j-1];}
    ds[slot]=d;best[slot]=p;
   }
   let z=0,t=0;const skinColor=new THREE.Color(0,0,0);
   for(let i=0;i<3;i++)if(best[i]){
    const w=1/(Math.sqrt(ds[i])+1);z+=best[i].z*w;t+=w;
    if(best[i].c){skinColor.r+=best[i].c.r*w;skinColor.g+=best[i].c.g*w;skinColor.b+=best[i].c.b*w;}
   }
   if(t===0)throw Error('No surface sample');
   if(colors)skinColor.multiplyScalar(1/t);
   return {z:z/t,color:skinColor};
  }
  const depth=region.filter(p=>Math.abs(p.x-s.x)<9&&Math.abs(p.y-(s.y+s.offsetY))<7)
   .map(p=>p.z).sort((a,b)=>a-b);
  if(depth.length<9)throw Error('Insufficient eye depth samples: '+s.id);
  const frontZ=depth[Math.floor(depth.length/2)]-3.0;
  const centerZ=frontZ-s.r;
  // A continuous curved sclera contact surface under every eye fragment,
  // matched to the actual facial depth, seals the outer corners. The v9
  // dark block/cavity backing is intentionally removed altogether.
  const vertices=[],indices=[],vertexColors=[],NX=48,NY=10;
  const core=new THREE.Color(0xcab7a9),edge=new THREE.Color(0xa08b7a);
  for(let ix=0;ix<=NX;ix++){
   const u=-.999+1.998*ix/NX,c=contour(s,u),x=s.x+u*s.cutRx;
   for(let iy=0;iy<=NY;iy++){
    const v=iy/NY,y=c.lower+(c.upper-c.lower)*v;
    // The v10 contact seal occluded much of the eye; move it fully behind.
    vertices.push(x,y,frontZ-34);
    const eyelid=clamp(Math.abs(2*v-1),0,1);
    const corner=clamp((Math.abs(u)-.72)/.28,0,1);
    const mix=clamp(.09+.48*Math.pow(eyelid,2)+.28*corner,0,.92);
    const col=core.clone().lerp(edge,mix);
    vertexColors.push(col.r,col.g,col.b);
    if(ix<NX&&iy<NY){
     const j=ix*(NY+1)+iy;
     indices.push(j,j+NY+1,j+1,j+1,j+NY+1,j+NY+2);
    }
   }
  }
  const sealGeo=new THREE.BufferGeometry();
  sealGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  sealGeo.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
  sealGeo.setIndex(indices);sealGeo.computeVertexNormals();
  const seal=new THREE.Mesh(sealGeo,skinMat);seal.name=s.id+'_CONTINUOUS_SCLERA_SEAL';
  root.add(seal);
  const socket=new THREE.Group();socket.position.set(s.x,s.y,centerZ);root.add(socket);
  const globe=new THREE.Group();globe.name=s.id+'_MOVABLE_EYE';socket.add(globe);
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(s.r,48,32),clipped(scleraMat,s));
  globe.add(sphere);
  const iris=new THREE.Mesh(irisCap(15.1,s.r),clipped(irisMat,s));
  iris.name=s.id+'_CURVED_HAZEL_IRIS';globe.add(iris);
  // Only while blinking: skin-colored curved shutter, no mechanical eyelid rim.
  const blinkSamples=[];
  for(let i=0;i<=36;i++){
   const u=-1+2*i/36,c=contour(s,u),k=skinAt(s.x+u*s.cutRx,c.upper+4);
   blinkSamples.push({z:k.z,color:k.color});
  }
  const lid=new THREE.Mesh(new THREE.BufferGeometry(),skinMat);
  lid.name=s.id+'_BLINK';lid.visible=false;root.add(lid);
  eyes.push({s,socket,globe,lid,blinkSamples,yaw:0,pitch:0,trimX:0,trimY:0,blink:0,blinkStart:0,blinkDuration:0});
 }
 function refresh(e){
  e.globe.rotation.y=clamp((e.yaw+e.trimX)*.66,-18,18)*RAD;
  e.globe.rotation.x=-clamp((e.pitch+e.trimY)*.72,-16,16)*RAD;
  e.lid.visible=e.blink>.02;if(!e.lid.visible)return;
  const p=[],c=[],ind=[],N=36;
  for(let i=0;i<=N;i++){
   const u=-1+2*i/N,shape=contour(e.s,u),s=e.blinkSamples[i];
   const x=e.s.x+u*e.s.cutRx,top=shape.upper,lower=top+(shape.lower-top)*e.blink;
   p.push(x,top,s.z+1,x,lower,s.z+1);
   const natural=s.color.r+s.color.g+s.color.b>.1?s.color:new THREE.Color(0xbca091);
   c.push(natural.r,natural.g,natural.b,natural.r,natural.g,natural.b);
   if(i<N){let j=2*i;ind.push(j,j+1,j+2,j+1,j+3,j+2);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
  g.setIndex(ind);g.computeVertexNormals();e.lid.geometry.dispose();e.lid.geometry=g;
 }
 root.updateMatrixWorld(true);inverseHeadWorld.copy(root.matrixWorld).invert();
 eyes.forEach(refresh);
 // Regression guard: cannot accidentally alter frozen face vertices/skin.
 const now=face.geometry.getAttribute('position').array;
 if(now.length!==originalPosition.length||now.some((v,i)=>v!==originalPosition[i]))
  throw Error('Unexpected facial geometry change');
 const cc=face.geometry.getAttribute('color')?.array;
 if(originalColors&&(!cc||cc.length!==originalColors.length||cc.some((v,i)=>v!==originalColors[i])))
  throw Error('Unexpected facial color change');
 return {eyes,sculpted:0,removed:[0,0],
  look(which='both',yaw=0,pitch=0){eyes.forEach(e=>{if(which==='both'||which===e.s.id){e.yaw=yaw;e.pitch=pitch;refresh(e);}});},
  trim(which,axis,amount){eyes.forEach(e=>{if(which==='both'||which===e.s.id){if(axis==='x')e.trimX=clamp(amount,-12,12);if(axis==='y')e.trimY=clamp(amount,-10,10);refresh(e);}});},
  blink(which='both'){eyes.forEach(e=>{if(which==='both'||which===e.s.id){e.blinkStart=performance.now();e.blinkDuration=300;}});},
  tick(time){root.updateMatrixWorld(true);inverseHeadWorld.copy(root.matrixWorld).invert();
   eyes.forEach(e=>{if(e.blinkDuration){const t=clamp((time-e.blinkStart)/e.blinkDuration,0,1);
    e.blink=t<1?Math.sin(Math.PI*t)**2:0;refresh(e);if(t>=1)e.blinkDuration=0;}});},
  reset(){eyes.forEach(e=>{e.yaw=e.pitch=e.trimX=e.trimY=e.blink=e.blinkDuration=0;refresh(e);});}
 };
}