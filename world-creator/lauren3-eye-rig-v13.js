// Lauren 3 v13: conformal eyes; correct full-face depth, iris and corner fit, keep original facial shell.
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
 const faceMeshes=[];root.traverse(o=>{if(o.isMesh&&o.geometry?.getAttribute('position'))faceMeshes.push(o);});
 if(faceMeshes.length!==1)throw Error('Expected one intact facial shell; got '+faceMeshes.length);
 const face=faceMeshes[0],source=face.geometry;
 const pos=source.getAttribute('position'),colors=source.getAttribute('color'),ids=source.index;
 if(pos.count!==38365||ids?.count!==228219)
  throw Error('Source topology mismatch. Do not alter archived model.');
 const unmodifiedPos=pos.array.slice(),unmodifiedColors=colors?.array.slice();
 // Keep every original vertex and triangle. No deletion or mesh sculpting.
 face.geometry=source.clone();
 const irisTexture=makeIrisTexture(),eyes=[];
 const scleraBase=new THREE.MeshBasicMaterial({color:0xe2d7cd,side:THREE.DoubleSide,toneMapped:false});
 const irisBase=new THREE.MeshBasicMaterial({map:irisTexture,transparent:true,alphaTest:.04,depthWrite:false,
  side:THREE.DoubleSide,toneMapped:false});
 const lidBase=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
 function clipped(base,s,shadeSclera=false){
  const mat=base.clone();
  mat.onBeforeCompile=sh=>{
   const vp='#include <begin_vertex>',fp='#include <clipping_planes_fragment>';
   if(!sh.vertexShader.includes(vp)||!sh.fragmentShader.includes(fp))throw Error('3D eye shader anchor unavailable');
   sh.vertexShader='varying vec2 vEyeXY;\n'+sh.vertexShader.replace(vp,vp+'\nvEyeXY=position.xy;');
   sh.fragmentShader='varying vec2 vEyeXY;\n'+sh.fragmentShader.replace(fp,fp+
    '\nfloat eu=(vEyeXY.x-'+s.x.toFixed(1)+')/'+s.cutRx.toFixed(1)+';'+
    '\nif(abs(eu)>=1.0)discard;'+
    '\nfloat en=max(0.0,eu*'+s.innerSide.toFixed(1)+');'+
    '\nfloat em='+ (s.y+s.offsetY).toFixed(1) +'-1.55*'+s.innerSide.toFixed(1)+'*eu-0.45*en*en;'+
    '\nfloat eh='+s.cutRy.toFixed(1)+'*pow(max(0.0,1.0-eu*eu),0.67);'+
    '\nif(vEyeXY.y>=em+eh*(0.94-0.025*en)||vEyeXY.y<=em-eh*(1.05+0.015*en))discard;');
   if(shadeSclera){
    const ca='#include <color_fragment>';
    if(!sh.fragmentShader.includes(ca))throw Error('Sclera shading anchor unavailable');
    sh.fragmentShader=sh.fragmentShader.replace(ca,ca+
     '\nfloat le=clamp(abs(vEyeXY.y-em)/(eh+0.01),0.0,1.0);'+
     '\ndiffuseColor.rgb*=1.0-0.17*le*le-0.055*eu*eu;');
   }
  };
  mat.customProgramCacheKey=()=> 'lauren-v13-conformal-'+s.id+'-'+(shadeSclera?'sclera':'iris');
  return mat;
 }
 function samplerFor(s){
  const pts=[],tris=[];
  const minX=s.x-s.cutRx-14,maxX=s.x+s.cutRx+14;
  const minY=s.y+s.offsetY-s.cutRy-14,maxY=s.y+s.offsetY+s.cutRy+14;
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i);
   if(x>=minX&&x<=maxX&&y>=minY&&y<=maxY)
    pts.push({x,y,z:pos.getZ(i),r:colors?.getX(i)??.78,g:colors?.getY(i)??.67,b:colors?.getZ(i)??.61});
  }
  for(let k=0;k<ids.count;k+=3){
   const ia=ids.getX(k),ib=ids.getX(k+1),ic=ids.getX(k+2);
   const ax=pos.getX(ia),ay=pos.getY(ia),bx=pos.getX(ib),by=pos.getY(ib),cx=pos.getX(ic),cy=pos.getY(ic);
   const minx=Math.min(ax,bx,cx),maxx=Math.max(ax,bx,cx),miny=Math.min(ay,by,cy),maxy=Math.max(ay,by,cy);
   if(maxx<minX||minx>maxX||maxy<minY||miny>maxY)continue;
   const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
   if(Math.abs(den)<.00001)continue;
   tris.push({ax,ay,bx,by,cx,cy,minx,maxx,miny,maxy,za:pos.getZ(ia),zb:pos.getZ(ib),zc:pos.getZ(ic),inv:1/den});
  }
  if(pts.length<25||tris.length<25)throw Error('Insufficient preserved surface samples for '+s.id);
  function zAt(x,y){
   let z=-Infinity;
   for(const t of tris){
    if(x<t.minx||x>t.maxx||y<t.miny||y>t.maxy)continue;
    const a=((t.by-t.cy)*(x-t.cx)+(t.cx-t.bx)*(y-t.cy))*t.inv;
    const b=((t.cy-t.ay)*(x-t.cx)+(t.ax-t.cx)*(y-t.cy))*t.inv;
    if(a<-.0001||b<-.0001||a+b>1.0001)continue;
    z=Math.max(z,a*t.za+b*t.zb+(1-a-b)*t.zc);
   }
   if(z!==-Infinity)return z;
   let total=0,weight=0;
   for(const p of pts){
    const d=(p.x-x)**2+(p.y-y)**2;
    if(d<180){const w=1/(d+.8);total+=p.z*w;weight+=w;}
   }
   if(weight)return total/weight;
   let closest=pts[0],best=Infinity;
   for(const p of pts){const d=(p.x-x)**2+(p.y-y)**2;if(d<best){best=d;closest=p;}}
   return closest.z;
  }
  function skinAt(x,y){
   let closest=pts[0],best=Infinity;
   for(const p of pts){const d=(p.x-x)**2+(p.y-y)**2;if(d<best){best=d;closest=p;}}
   return new THREE.Color(closest.r,closest.g,closest.b);
  }
  return {zAt,skinAt,nTriangles:tris.length};
 }
 function buildPatch(s,sampler){
  const P=[],I=[],NX=60,NY=24;
  for(let i=0;i<=NX;i++){
   const x=s.x+(2*i/NX-1)*(s.cutRx+2);
   for(let j=0;j<=NY;j++){
    const y=s.y+s.offsetY+(2*j/NY-1)*(s.cutRy+3);
    P.push(x,y,sampler.zAt(x,y)+.65);
    if(i<NX&&j<NY){
     const k=i*(NY+1)+j;I.push(k,k+NY+1,k+1,k+1,k+NY+1,k+NY+2);
    }
   }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setIndex(I);g.computeVertexNormals();return g;
 }
 function createIris(e){
  const s=e.s,radius=11.3,N=48,R=8;
  const cx=s.x+clamp(e.yaw+e.trimX,-24,24)*.38;
  const cy=s.y+s.offsetY+1.0+clamp(e.pitch+e.trimY,-18,18)*.29;
  const P=[],UV=[],I=[];
  for(let k=0;k<=R;k++){
   const radiusAt=radius*k/R;
   for(let j=0;j<=N;j++){
    const angle=j*2*Math.PI/N,dx=radiusAt*Math.cos(angle),dy=radiusAt*Math.sin(angle);
    const x=cx+dx,y=cy+dy;
    P.push(x,y,e.sampler.zAt(x,y)+2.1);
    UV.push(.5+dx/(radius*2),.5+dy/(radius*2));
    if(k<R&&j<N){
     const i=k*(N+1)+j;I.push(i,i+N+1,i+1,i+1,i+N+1,i+N+2);
    }
   }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));g.setIndex(I);
  g.computeVertexNormals();return g;
 }
 for(const s of eyespecs){
  const sampler=samplerFor(s);
  const sclera=new THREE.Mesh(buildPatch(s,sampler),clipped(scleraBase,s,true));
  sclera.name=s.id+'_CONFORMAL_SCLERA';root.add(sclera);
  const iris=new THREE.Mesh(new THREE.BufferGeometry(),clipped(irisBase,s));
  iris.name=s.id+'_MOVABLE_IRIS';root.add(iris);
  const lid=new THREE.Mesh(new THREE.BufferGeometry(),lidBase);
  lid.name=s.id+'_BLINK';lid.visible=false;root.add(lid);
  // Independent logical rotation remains available; only the visible
  // portion is rendered while the head is still an OPEN facial shell.
  eyes.push({s,sampler,sclera,iris,lid,yaw:0,pitch:0,trimX:0,trimY:0,blink:0,blinkStart:0,blinkDuration:0});
 }
 function refreshGaze(e){
  const next=createIris(e);
  e.iris.geometry.dispose();e.iris.geometry=next;
 }
 function refreshLid(e){
  e.lid.visible=e.blink>.02;
  if(!e.lid.visible)return;
  const P=[],C=[],I=[],N=48;
  for(let i=0;i<=N;i++){
   const u=-1+2*i/N,outline=contour(e.s,u),x=e.s.x+u*e.s.cutRx;
   const y=outline.upper,lower=y+(outline.lower-y)*e.blink;
   const col=e.sampler.skinAt(x,y+3);
   P.push(x,y,e.sampler.zAt(x,y)+3.0,x,lower,e.sampler.zAt(x,lower)+3.0);
   C.push(col.r,col.g,col.b,col.r,col.g,col.b);
   if(i<N){const k=2*i;I.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setIndex(I);g.computeVertexNormals();
  e.lid.geometry.dispose();e.lid.geometry=g;
 }
 eyes.forEach(refreshGaze);
 // Do not alter colors, geometry, or indices of the user's approved source.
 if(pos.array.some((v,i)=>v!==unmodifiedPos[i]))throw Error('Source face positions unexpectedly changed');
 if(unmodifiedColors&&colors.array.some((v,i)=>v!==unmodifiedColors[i]))
  throw Error('Source facial colors unexpectedly changed');
 return {eyes,removed:[0,0],sculpted:0,
  look(which='both',yaw=0,pitch=0){eyes.forEach(e=>{if(which==='both'||which===e.s.id){e.yaw=yaw;e.pitch=pitch;refreshGaze(e);}});},
  trim(which,axis,value){eyes.forEach(e=>{if(which==='both'||which===e.s.id){if(axis==='x')e.trimX=clamp(value,-12,12);if(axis==='y')e.trimY=clamp(value,-10,10);refreshGaze(e);}});},
  blink(which='both'){eyes.forEach(e=>{if(which==='both'||which===e.s.id){e.blinkStart=performance.now();e.blinkDuration=320;}});},
  tick(time){eyes.forEach(e=>{if(e.blinkDuration){const f=clamp((time-e.blinkStart)/e.blinkDuration,0,1);e.blink=f<1?Math.sin(Math.PI*f)**2:0;refreshLid(e);if(f>=1)e.blinkDuration=0;}});},
  reset(){eyes.forEach(e=>{e.yaw=e.pitch=e.trimX=e.trimY=e.blink=e.blinkDuration=0;refreshGaze(e);refreshLid(e);});}
 };
}
