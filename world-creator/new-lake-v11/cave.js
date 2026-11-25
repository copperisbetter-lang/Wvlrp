// Copyright © 2026 WVLRP / The Wild.
export function createCave(L){
 const r=Math.hypot(...L.shore[192]);
 // [distance inland from north shore, half width, floor, central roof] in metres.
 const sections=[[-9,1.35,-6.0,-2.0],[-6,1.42,-5.8,-1.8],[-3,1.55,-4.9,-1.4],[0,1.65,-3.8,-.85],[2,1.9,-2.25,2.5],[4,2.45,-.85,4.0],[6,2.6,.5,4.3],[8,2.25,.65,4.3]];
 const start=sections[0][0],end=sections.at(-1)[0];
 const mix=(a,b,f)=>a+(b-a)*f,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 function section(t){
  if(t<start-1e-8||t>end+1e-8)return null;
  t=clamp(t,start,end);let i=0;while(i<sections.length-2&&t>sections[i+1][0])i++;
  const a=sections[i],b=sections[i+1],f=(t-a[0])/(b[0]-a[0]);return {w:mix(a[1],b[1],f),floor:mix(a[2],b[2],f),top:mix(a[3],b[3],f)};
 }
 function roof(q,x){const u=Math.abs(x)/q.w;return q.top-.72*(u<=.5?u*.5:1.5*u-.5)}
 function point(x,z){const t=-z-r,q=section(t);return q?{...q,t,roof:roof(q,x)}:null}
 function advance(p,x,z,dt,down,up){
  const t=-z-r,oldT=-p.z-r;
  if(!p.cave){
   if(p.mode!=='dive'||oldT>start+.02||t<start||t>start+.25)return null;
   const q=point(x,z);
   if(!q||Math.abs(x)>q.w-.34||p.y<q.floor+.28||p.y>q.roof-.45)return null;
  }
  if(t<start){
   const q=section(start);
   if(p.cave&&Math.abs(x)<q.w-.34&&p.y>q.floor+.22&&p.y<roof(q,x)-.4)return {exit:true,x,z,y:p.y,mode:'dive',cave:false};
  }
  let q=point(x,z);
  if(!q||t>end-.36||Math.abs(x)>q.w-.34){x=p.x;z=p.z;q=point(x,z)}
  if(!q)return {...p};
  const depth=-q.floor;
  let y,mode;
  if(depth<=.12){mode='walk';y=q.floor}
  else if(depth<1.18){mode='wade';y=q.floor}
  else if(q.roof<.2||down||p.mode==='dive'&&!up){
   mode='dive';y=clamp(p.y+(up?1.8:down?-1.5:0)*dt,q.floor+.28,Math.min(-.62,q.roof-.48));
  }else if(up&&p.mode==='dive'&&p.y<-.75){mode='dive';y=clamp(p.y+1.8*dt,q.floor+.28,-.65)}
  else{mode='swim';y=-.73}
  // Walking eye height must fit beneath roof; reject forward movement if not.
  if((mode==='walk'||mode==='wade')&&y+1.8>q.roof)return {...p};
  return {x,z,y,mode,cave:true,transitionReady:mode==='walk'&&q.t>=6.7&&Math.abs(x)<1};
 }
 function meshData(){
  const vertices=[],indices=[],K=9;
  // Floor + vertical sides + segmented arch. Closed back, open submerged front.
  for(const [t,w,f,h] of sections){
   for(const [x,y] of [[-w,f],[w,f],[w,h-.72],[w*.5,h-.18],[0,h],[-w*.5,h-.18],[-w,h-.72],[-w,f],[-w,f]])vertices.push(x,y,-r-t);
  }
  // Seven distinct cross-section points; duplicate endpoints omitted in indices.
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<7;j++){
   const a=i*K+j,b=i*K+(j+1)%7,c=(i+1)*K+j,d=(i+1)*K+(j+1)%7;indices.push(a,b,c,b,d,c);
  }
  const last=(sections.length-1)*K;for(let j=1;j<6;j++)indices.push(last,last+j,last+j+1);
  return {vertices,indices};
 }
 // GLSL uses identical segment interpolation and roof definition to remove only terrain inside cave.
 function clipGLSL(){
  const n=v=>Number(v).toFixed(6);
  let code=`float caveT=-vCavePos.z-${n(r)}; float cw=0.0; float cf=0.0; float ch=0.0;`;
  for(let i=0;i<sections.length-1;i++){
   const a=sections[i],b=sections[i+1];code+=`if(caveT>=${n(a[0])} && caveT<=${n(b[0])}){float u=(caveT-(${n(a[0])}))/${n(b[0]-a[0])};cw=mix(${n(a[1])},${n(b[1])},u);cf=mix(${n(a[2])},${n(b[2])},u);ch=mix(${n(a[3])},${n(b[3])},u);}`;
  }
  return code+"if(cw>0.0){float u=abs(vCavePos.x)/cw;float cr=ch-.72*(u<=.5?u*.5:1.5*u-.5);if(u<1.0 && vCavePos.y>cf+.001 && vCavePos.y<cr-.001)discard;}";
 }
 // Water surface inside tunnel: where roof is above and floor below waterline.
 function waterData(){
  const vertices=[],indices=[];let count=0;
  for(let t=0;t<=end;t+=.05){
   const q=section(t);if(q.floor>=-.012||q.top<=.012)continue;
   const maxU=clamp(((q.top-.012)/.72+.5)/1.5,0,1);
   const u=q.top-.012<.18?clamp((q.top-.012)/.36,0,1):maxU;
   const w=q.w*u*.997;if(w<.01)continue;
   vertices.push(-w,.012,-r-t,w,.012,-r-t);if(count){const a=(count-1)*2,b=count*2;indices.push(a,b,a+1,a+1,b,b+1)}count++;
  }
  return {vertices,indices};
 }
 return {r,start,end,sections,section,point,advance,meshData,clipGLSL,waterData,entrance:[0,-3.5,-r-start],chamber:[0,.65,-r-7]};
}
