// Stage34 trial: actual boundary-driven scan-to-native-G9 surgical fitting.
// Runs only AFTER the owner's existing AES-GCM-protected original GLB is
// decrypted locally by the browser. NEVER uploads or publishes raw mesh.
// The originals remain in the protected GLB. Changes affect runtime clones.
// This is a diagnostic fit candidate, not a certified watertight replacement.
const Q=1e4, TOL=1e-5, TWOPI=Math.PI*2;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const key=p=>p.position.map(v=>Math.round(v*Q)).join(':');
function xyz(p){return p.position;}
function vec(v){return {x:v[0],y:v[1],z:v[2]};}
function vertex(mesh,index){
 const result={};
 for(const [name,a] of Object.entries(mesh.geometry.attributes)){
  result[name]=Array.from({length:a.itemSize},(_,i)=>a.getComponent(index,i));
 }
 if(!result.position)throw Error('Mesh POSITION accessor missing');
 return {mesh,attrs:result,position:result.position};
}
function mergeWeights(a,b,t){
 const weights=new Map();
 for(const [v,mul] of [[a,1-t],[b,t]])for(let i=0;i<4;i++){
  const j=Math.round(v.attrs.skinIndex?.[i]||0),w=v.attrs.skinWeight?.[i]||0;
  weights.set(j,(weights.get(j)||0)+w*mul);
 }
 const best=[...weights.entries()].sort((x,y)=>y[1]-x[1]).slice(0,4);
 const total=best.reduce((sum,x)=>sum+x[1],0)||1;
 return {skinIndex:Array.from({length:4},(_,i)=>best[i]?.[0]||0),
  skinWeight:Array.from({length:4},(_,i)=>(best[i]?.[1]||0)/total)};
}
function lerp(a,b,t){
 const attrs={};
 for(const name of Object.keys(a.attrs)){
  if(name==='skinIndex'||name==='skinWeight')continue;
  attrs[name]=a.attrs[name].map((v,i)=>v*(1-t)+(b.attrs[name]?.[i]??v)*t);
  if(name==='normal'){const d=Math.hypot(...attrs[name]);if(d>0)attrs[name]=attrs[name].map(v=>v/d);}
 }
 if(a.attrs.skinIndex&&b.attrs.skinIndex){
  Object.assign(attrs,mergeWeights(a,b,t));
 }
 return {mesh:a.mesh,attrs,position:attrs.position};
}
function emit(data,v){
 for(const name of Object.keys(data)){
  const arr=v.attrs[name]||[];
  if(!arr.length)throw Error('Missing vertex attribute '+name);
  data[name].push(...arr);
 }
}
function clipScanGeometry(mesh,plane,THREE){
 const src=mesh.geometry,p=src.getAttribute('position'),idx=src.index;
 if(!p||p.count<100)throw Error('Invalid original photographed-scan mesh');
 const attrs=Object.keys(src.attributes),out=Object.fromEntries(attrs.map(n=>[n,[]]));
 const segments=[],cached=new Map(),read=i=>{let v=cached.get(i);if(!v){v=vertex(mesh,i);cached.set(i,v);}return v;};
 let before=0,removed=0,crossed=0,kept=0;
 const cnt=idx?.count??p.count;
 if(cnt%3)throw Error('Scanned-mesh triangles not aligned');
 for(let i=0;i<cnt;i+=3){
  const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);
  const tri=ids.map(read);
  const inside=tri.map(v=>v.position[1]>=plane-TOL);
  before++;
  if(inside.every(Boolean)){tri.forEach(v=>emit(out,v));kept++;continue;}
  if(inside.every(v=>!v)){removed++;continue;}
  crossed++;
  const poly=[],seam=[];
  for(let j=0;j<3;j++){
   const a=tri[(j+2)%3],b=tri[j],ia=inside[(j+2)%3],ib=inside[j];
   if(ia!==ib){
    const t=clamp((plane-a.position[1])/(b.position[1]-a.position[1]),0,1);
    const v=lerp(a,b,t);v.position[1]=plane;v.attrs.position[1]=plane;
    poly.push(v);seam.push(v);
   }
   if(ib)poly.push(b);
  }
  if(seam.length===2){
   const mid=seam[0].position.map((v,k)=>(v+seam[1].position[k])/2);
   // Keep the real neck contour; discard distant hair/scan fragments.
   if(Math.abs(mid[0])<.25&&Math.abs(mid[2])<.26)segments.push([seam[0],seam[1]]);
  }
  for(let j=1;j+1<poly.length;j++){emit(out,poly[0]);emit(out,poly[j]);emit(out,poly[j+1]);}
 }
 if(crossed<8||segments.length<12)throw Error('No safe original Dad lower-neck intersection found');
 const dst=new THREE.BufferGeometry();
 for(const name of attrs){
  const a=src.attributes[name];
  const Type=name==='skinIndex'?THREE.Uint16BufferAttribute:THREE.Float32BufferAttribute;
  dst.setAttribute(name,new Type(out[name],a.itemSize));
 }
 dst.computeBoundingSphere();dst.computeBoundingBox();
 return {geometry:dst,segments,stats:{before,removed,crossed,kept,after:out.position.length/9}};
}
function topNativeNeckSegments(mesh,plane){
 const g=mesh.geometry,p=g.getAttribute('position'),idx=g.index;
 const cnt=idx?.count??p.count,res=[];
 if(!p||cnt%3)throw Error('Restored G9 neck has no triangle positions');
 const cache=new Map(),read=i=>{if(!cache.has(i))cache.set(i,vertex(mesh,i));return cache.get(i);};
 for(let t=0;t<cnt;t+=3){
  const tri=[0,1,2].map(i=>read(idx?idx.getX(t+i):t+i));
  for(let j=0;j<3;j++){
   const a=tri[j],b=tri[(j+1)%3];
   if(Math.abs(a.position[1]-plane)<TOL&&Math.abs(b.position[1]-plane)<TOL
     &&Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2])>.00002)
     res.push([a,b]);
  }
 }
 if(res.length<12)throw Error('Original G9 stump has no measurable top edge');
 return res;
}
function getLoops(segments,referenceCenter){
 const nodes=new Map(),edges=new Map();
 for(const [a,b] of segments){
  const ka=key(a),kb=key(b);if(ka===kb)continue;
  for(const [k,p] of [[ka,a],[kb,b]]){
   if(!nodes.has(k))nodes.set(k,{p,connected:new Set()});
  }
  const ek=[ka,kb].sort().join('|');if(edges.has(ek))continue;
  edges.set(ek,true);nodes.get(ka).connected.add(kb);nodes.get(kb).connected.add(ka);
 }
 const consumed=new Set(),loops=[];
 for(const [start,node] of nodes){
  if(consumed.has(start)||node.connected.size!==2)continue;
  let last=null,current=start,sequence=[],closed=false;
  for(let tries=0;tries<nodes.size+1;tries++){
   if(consumed.has(current)&&current!==start)break;
   sequence.push(nodes.get(current).p);consumed.add(current);
   const choices=[...nodes.get(current).connected];
   if(choices.length!==2)break;
   const next=choices.find(x=>x!==last);
   if(!next)break;
   if(next===start){closed=true;break;}
   last=current;current=next;
  }
  if(!closed||sequence.length<12)continue;
  const points=sequence.map(p=>p.mesh.localToWorld(new (referenceCenter.THREE.Vector3)(...p.position)));
  const cx=points.reduce((s,p)=>s+p.x,0)/points.length;
  const cz=points.reduce((s,p)=>s+p.z,0)/points.length;
  const radius=Math.max(...points.map(p=>Math.hypot(p.x-cx,p.z-cz)));
  if(radius<.025||radius>.24||Math.abs(cx-referenceCenter.x)>.16||Math.abs(cz-referenceCenter.z)>.16)continue;
  loops.push({sequence,points,cx,cz,radius});
 }
 loops.sort((a,b)=>b.sequence.length-a.sequence.length);
 return loops;
}
function angular(loop,origin){
 const arr=loop.sequence.map((v,i)=>({
  angle:(Math.atan2(loop.points[i].z-origin.z,loop.points[i].x-origin.x)+TWOPI)%TWOPI,
  pos:loop.points[i],v
 })).sort((a,b)=>a.angle-b.angle);
 const filtered=[];
 for(const x of arr){if(!filtered.length||x.angle-filtered.at(-1).angle>.0005)filtered.push(x);}
 if(filtered.length<12)throw Error('Measured contour cannot be sorted into a valid ring');
 return filtered;
}
function interpolateRing(ring,angle){
 const target=(angle+TWOPI)%TWOPI;
 let i=ring.findIndex(p=>p.angle>target);
 if(i<0)i=ring.length;
 const a=ring[(i-1+ring.length)%ring.length],b=ring[i%ring.length];
 const lo=a.angle,hi=(i===ring.length?ring[0].angle+TWOPI:b.angle);
 const at=target<lo?target+TWOPI:target;
 const t=clamp((at-lo)/Math.max(hi-lo,1e-7),0,1);
 const p=a.pos.clone().lerp(b.pos,t);
 const v=lerp(a.v,b.v,t);
 return {pos:p,v};
}
function skinOf(v){
 const index=v.attrs.skinIndex||[0,0,0,0],weight=v.attrs.skinWeight||[1,0,0,0];
 const sum=weight.reduce((a,b)=>a+b,0)||1;
 return {index:Array.from({length:4},(_,i)=>Math.round(index[i]||0)),weight:Array.from({length:4},(_,i)=>(weight[i]||0)/sum)};
}
function colorSampler(THREE){
 const caches=new WeakMap();
 return (v)=>{
  const mat=Array.isArray(v.mesh.material)?v.mesh.material[0]:v.mesh.material;
  const col=mat?.color?.clone()||new THREE.Color('#b98e73');
  const tex=mat?.map,uv=v.attrs.uv,img=tex?.image;
  if(!uv||!img||!img.width||!img.height)return col;
  let ctx=caches.get(tex);
  if(ctx===undefined){
   ctx=null;
   try{const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    if(canvas.width*canvas.height<24000000){ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);}
   }catch{}
   caches.set(tex,ctx);
  }
  if(!ctx)return col;
  try{
   const u=((uv[0]%1)+1)%1,w=((uv[1]%1)+1)%1;
   const pix=ctx.getImageData(clamp(Math.round(u*(img.width-1)),0,img.width-1),
      clamp(Math.round((1-w)*(img.height-1)),0,img.height-1),1,1).data;
   col.setRGB(pix[0]/255,pix[1]/255,pix[2]/255,THREE.SRGBColorSpace);
  }catch{}
  return col;
 };
}
function makeRealEdgeStrip(scanRing,bodyRing,donorMesh,THREE){
 const origin={x:(scanRing.cx+bodyRing.cx)/2,z:(scanRing.cz+bodyRing.cz)/2};
 const s=angular(scanRing,origin),b=angular(bodyRing,origin);
 const angles=[...s.map(x=>x.angle),...b.map(x=>x.angle)].sort((a,b)=>a-b);
 const unique=angles.filter((x,i)=>!i||x-angles[i-1]>.0005);
 if(unique.length<20||unique.length>1500)throw Error('Measured neck loop contour complexity unsafe');
 const profiles=[],gaps=[];
 for(const angle of unique){
  const top=interpolateRing(s,angle),bottom=interpolateRing(b,angle);
  const dist=Math.hypot(top.pos.x-bottom.pos.x,top.pos.z-bottom.pos.z);
  gaps.push(dist);profiles.push({top,bottom});
 }
 gaps.sort((a,b)=>a-b);
 const p95=gaps[Math.floor((gaps.length-1)*.95)],max=gaps.at(-1);
 if(p95>.055||max>.085)throw Error('Source neck boundary disagreement too large: p95 '+(p95*1000).toFixed(1)+' mm');
 const pos=[],colors=[],skinIndex=[],skinWeight=[],uvs=[];
 const getColor=colorSampler(THREE);
 function push(pt){
  const loc=donorMesh.worldToLocal(pt.pos.clone()),skin=skinOf(pt.v),c=getColor(pt.v);
  pos.push(loc.x,loc.y,loc.z);colors.push(c.r,c.g,c.b);
  skinIndex.push(...skin.index);skinWeight.push(...skin.weight);
  uvs.push(...(pt.v.attrs.uv||[0,0]));
 }
 for(let i=0;i<profiles.length;i++){
  const here=profiles[i],next=profiles[(i+1)%profiles.length];
  // Measured boundary-to-boundary surface; never a fabricated neck cylinder.
  push(here.bottom);push(here.top);push(next.bottom);
  push(here.top);push(next.top);push(next.bottom);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));
 g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
 g.computeVertexNormals();g.computeBoundingSphere();
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.96,metalness:0});
 const strip=new THREE.SkinnedMesh(g,mat);
 strip.name='DAD_STAGE34_REAL_SCAN_TO_G9_BOUNDARY_TRIAL';
 strip.position.copy(donorMesh.position);
 strip.quaternion.copy(donorMesh.quaternion);
 strip.scale.copy(donorMesh.scale);
 strip.bindMode='detached';
 strip.bind(donorMesh.skeleton,donorMesh.bindMatrix.clone());
 strip.frustumCulled=false;
 donorMesh.parent.add(strip);
 return {strip,profileCount:unique.length,p95_mm:p95*1000,max_mm:max*1000};
}
export function attemptMeasuredSurgery(fit,gltf,THREE){
 if(!fit?.restoredNeck?.mesh||!gltf?.parser)throw Error('Protected real G9 body not loaded');
 gltf.scene.updateMatrixWorld(true);
 const donor=fit.restoredNeck.mesh,cutY=fit.cutoffY;
 const original= [];
 gltf.scene.traverse(obj=>{
  if(!obj.isSkinnedMesh||obj===donor)return;
  const assoc=gltf.parser.associations?.get(obj)||{};
  if(assoc.meshes===0)original.push(obj);
 });
 if(!original.length)throw Error('Original photographed Dad scan not found');
 // Find actual non-destructive intersection of photo scan with a horizontal
 // plane 12mm ABOVE the existing 1-inch genuine G9 cut. The scan face, beard
 // and upper neck are never rescaled, retouched or triangulated by guessing.
 const donorPoint=donor.localToWorld(new THREE.Vector3(0,cutY+.012,0));
 const candidates=[];
 for(const mesh of original){
  const plane=mesh.worldToLocal(donorPoint.clone()).y;
  const bounds=mesh.geometry.boundingBox||(mesh.geometry.computeBoundingBox(),mesh.geometry.boundingBox);
  if(plane<bounds.min.y+.004||plane>bounds.max.y-.08)continue;
  const res=clipScanGeometry(mesh,plane,THREE);
  candidates.push({mesh,res,plane});
 }
 if(!candidates.length)throw Error('Dad scan has no safe lower-neck cut plane');
 const center=donor.localToWorld(new THREE.Vector3(0,cutY,0));
 const scanLoops=getLoops(candidates.flatMap(x=>x.res.segments),{THREE,x:center.x,z:center.z});
 const g9Loops=getLoops(topNativeNeckSegments(donor,cutY),{THREE,x:center.x,z:center.z});
 if(scanLoops.length!==1||g9Loops.length!==1)
  throw Error('Unsafe seam topology: scan loops '+scanLoops.length+', G9 loops '+g9Loops.length+'. No cut performed.');
 // Build the connector FIRST, using measured actual edge loops. Only commit
 // the temporary scan clipping when all fit tolerances pass.
 let stripInfo;
 try{
  stripInfo=makeRealEdgeStrip(scanLoops[0],g9Loops[0],donor,THREE);
 }catch(e){throw e;}
 const originals=candidates.map(c=>({mesh:c.mesh,old:c.mesh.geometry}));
 for(const {mesh,res} of candidates)mesh.geometry=res.geometry;
 const stats={
  scanPiecesClipped:candidates.length,scanSourceTriangles:candidates.reduce((x,c)=>x+c.res.stats.before,0),
  scanClippedTriangles:candidates.reduce((x,c)=>x+c.res.stats.crossed,0),
  scanTrianglesRemoved:candidates.reduce((x,c)=>x+c.res.stats.removed,0),
  sourceScanRingVertices:scanLoops[0].sequence.length,
  sourceG9RingVertices:g9Loops[0].sequence.length,
  bridgeTriangles:stripInfo.strip.geometry.getAttribute('position').count/3,
  boundaryMeanP95GapMM:Number(stripInfo.p95_mm.toFixed(2)),
  boundaryMaximumGapMM:Number(stripInfo.max_mm.toFixed(2)),
  preservedG9Torso:true,faceBeardAndUpperNeckUnscaled:true,
  actualOriginalSourceGLBUnchanged:true,actualG9NeckPreserved:true,
  watertightIndexWeldCertified:false,ownerVisuallyApproved:false
 };
 return {
  stats,bridge:stripInfo.strip,
  restore(){for(const {mesh,old} of originals){mesh.geometry.dispose();mesh.geometry=old;}
   stripInfo.strip.removeFromParent();stripInfo.strip.geometry.dispose();stripInfo.strip.material.dispose();}
 };
}
