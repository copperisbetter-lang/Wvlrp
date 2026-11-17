// STAGE37 — real original scanned Dad LOWER OPEN EDGE, G9 NECK ONLY TRIM.
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
export function getLoops(segments,referenceCenter){
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
export function interpolateRing(ring,angle){
 const target=(angle+TWOPI)%TWOPI;
 let i=ring.findIndex(p=>p.angle>target);
 if(i<0)i=ring.length;
 const a=ring[(i-1+ring.length)%ring.length],b=ring[i%ring.length];
 const lo=a.angle,hi=(i===0||i===ring.length?ring[0].angle+TWOPI:b.angle);
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
// Survey-only slicing: reads the REAL protected scan's original mesh triangles
// and interpolates only plane crossings; no triangles are removed or modified.
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
 strip.name='DAD_STAGE37_ORIGINAL_SCAN_EDGE_G9_ONLY_SEAM_TRIAL';
 strip.position.copy(donorMesh.position);
 strip.quaternion.copy(donorMesh.quaternion);
 strip.scale.copy(donorMesh.scale);
 strip.bindMode='detached';
 strip.bind(donorMesh.skeleton,donorMesh.bindMatrix.clone());
 strip.frustumCulled=false;
 donorMesh.parent.add(strip);
 return {strip,profileCount:unique.length,p95_mm:p95*1000,max_mm:max*1000};
}

// A) Extract the REAL 3D open boundary of the fully preserved Dad scan.
// The protected scan includes a single 136-vertex lower cut contour plus
// two negligible 3-vertex upper artifacts. Never slice or repaint the scan.
export function realOriginalScanEdge(meshes,THREE,target){
 const segments=[],info=[];
 for(const mesh of meshes){
  const geom=mesh.geometry,pos=geom.getAttribute('position'),idx=geom.index;
  if(!pos||!idx)throw Error('Original Dad scan must retain true indexed source faces');
  const edges=new Map(),pointKey=i=>[
   Math.round(pos.getX(i)*Q),Math.round(pos.getY(i)*Q),Math.round(pos.getZ(i)*Q)
  ].join(':');
  for(let t=0;t<idx.count;t+=3){
   const tri=[idx.getX(t),idx.getX(t+1),idx.getX(t+2)];
   for(let j=0;j<3;j++){
    const ia=tri[j],ib=tri[(j+1)%3],ka=pointKey(ia),kb=pointKey(ib);
    if(ka===kb)continue;
    const code=[ka,kb].sort().join('|'),item=edges.get(code);
    if(item)item.count++;
    else edges.set(code,{ia,ib,count:1});
   }
  }
  let low=0;
  for(const item of edges.values()){
   if(item.count!==1)continue;
   if(pos.getY(item.ia)>1.56||pos.getY(item.ib)>1.56)continue;
   const p=vertex(mesh,item.ia),q=vertex(mesh,item.ib);
   segments.push([p,q]);low++;
  }
  info.push({name:mesh.name,sourceIndexCount:idx.count,sourceVertexCount:pos.count,lowerOpenEdges:low});
 }
 if(segments.length<40)throw Error('True lower Dad scanned head edge not found; G9 cut forbidden');
 const loops=getLoops(segments,{THREE,x:target.x,z:target.z});
 if(loops.length!==1)throw Error('Original Dad scanned lower border is not one closed loop: '+loops.length);
 const loop=loops[0];
 const ys=loop.points.map(p=>p.y),minY=Math.min(...ys),maxY=Math.max(...ys);
 if(loop.sequence.length<70||loop.sequence.length>400||minY<1.43||maxY>1.56)
  throw Error('Original scanned shoulder boundary topology outside protected expected lower-neck region');
 return {loop,stats:{scannedLowerEdgeVertices:loop.sequence.length,
    lowerEdgeMinY:minY,lowerEdgeMaxY:maxY,sourceMeshes:info,
    realSourceScanGeometryEdited:false}};
}
// B) Surgically clip ONLY genuine G9 neck triangles to the curved Y(angle)
// specified by each original scanned lower-edge vertex. No arbitrary ellipse,
// no horizontal scan cut, and no modification of the G9 torso/shoulders.
export function clipNativeG9ToActualDadScanEdge(nativeNeck,scanLoop,THREE){
 const source=nativeNeck.geometry,pos=source.getAttribute('position'),idx=source.index;
 const attrNames=Object.keys(source.attributes),out=Object.fromEntries(attrNames.map(n=>[n,[]]));
 const scanOrigin={x:scanLoop.cx,z:scanLoop.cz},angularScan=angular(scanLoop,scanOrigin);
 if(!pos||pos.count<90)throw Error('Genuine G9 original neck triangles not found');
 const count=idx?.count??pos.count;
 if(count%3)throw Error('G9 original neck index/vertex count is invalid');
 let removed=0,partly=0,kept=0,outputTriangles=0;
 const edges=[],cache=new Map(),read=i=>{let v=cache.get(i);if(!v){v=vertex(nativeNeck,i);cache.set(i,v);}return v;};
 const signed=(v)=>{
  const point=nativeNeck.localToWorld(new THREE.Vector3(...v.position));
  const theta=(Math.atan2(point.z-scanOrigin.z,point.x-scanOrigin.x)+TWOPI)%TWOPI;
  const border=interpolateRing(angularScan,theta).pos;
  return point.y-border.y;
 };
 const intersection=(a,b,sa,sb)=>{
  let low=0,high=1;
  for(let i=0;i<19;i++){
   const middle=(low+high)*.5,probe=lerp(a,b,middle),sign=signed(probe);
   if((sign<=0)===(sa<=0))low=middle;else high=middle;
  }
  return lerp(a,b,(low+high)*.5);
 };
 for(let t=0;t<count;t+=3){
  const ids=[0,1,2].map(j=>idx?idx.getX(t+j):t+j);
  const tri=ids.map(read),dist=tri.map(signed),inside=dist.map(s=>s<=0);
  if(inside.every(Boolean)){tri.forEach(v=>emit(out,v));kept++;outputTriangles++;continue;}
  if(inside.every(v=>!v)){removed++;continue;}
  partly++;
  const poly=[],hits=[];
  for(let j=0;j<3;j++){
   const i=(j+2)%3,a=tri[i],b=tri[j],ia=inside[i],ib=inside[j];
   if(ia!==ib){const v=intersection(a,b,dist[i],dist[j]);poly.push(v);hits.push(v);}
   if(ib)poly.push(b);
  }
  if(hits.length===2)edges.push(hits);
  for(let j=1;j+1<poly.length;j++){
   emit(out,poly[0]);emit(out,poly[j]);emit(out,poly[j+1]);outputTriangles++;
  }
 }
 if(partly<14||outputTriangles<50||edges.length<14||removed+partly===0)
  throw Error('Authentic G9 neck cannot be trimmed at scanned boundary safely; source remains unchanged.');
 const dest=new THREE.BufferGeometry();
 for(const name of attrNames){
  const src=source.getAttribute(name);
  const Type=name==='skinIndex'?THREE.Uint16BufferAttribute:THREE.Float32BufferAttribute;
  dest.setAttribute(name,new Type(out[name],src.itemSize));
 }
 dest.computeBoundingBox();dest.computeBoundingSphere();
 return {geometry:dest,segments:edges,stats:{G9sourceFaces:count/3,
   G9fullyRemovedFaces:removed,G9partiallyCutFaces:partly,G9keptFaces:kept,
   G9outputFaces:outputTriangles,nativeG9CutEdges:edges.length,
   G9originalTorsoPrimitivesEdited:false,originalPhotoScanEdited:false}};
}
function emit(data,v){for(const key of Object.keys(data)){const a=v.attrs[key];if(!a)throw Error('Native attribute disappeared: '+key);data[key].push(...a);}}
export function measureActual3DEdgeGap(scanLoop,bodyLoop,samples=192){
 const center={x:(scanLoop.cx+bodyLoop.cx)/2,z:(scanLoop.cz+bodyLoop.cz)/2};
 const sa=angular(scanLoop,center),ba=angular(bodyLoop,center);
 const distances=[];
 for(let i=0;i<samples;i++){
  const angle=TWOPI*i/samples;
  const a=interpolateRing(sa,angle).pos,b=interpolateRing(ba,angle).pos;
  const d=a.distanceTo(b);if(!Number.isFinite(d))throw Error('Non-finite G9/scan seam distance');
  distances.push(d);
 }
 distances.sort((a,b)=>a-b);
 return {medianMM:distances[Math.floor((samples-1)*.5)]*1000,
  p95MM:distances[Math.floor((samples-1)*.95)]*1000,
  maxMM:distances.at(-1)*1000,
  originalScanRingVertices:scanLoop.sequence.length,
  g9NeckRingVertices:bodyLoop.sequence.length,
  sampleCount:samples};
}
export function attemptTrueScanEdgeDonorOnlyFit(fit,gltf,THREE){
 if(!fit?.restoredNeck?.mesh||!gltf?.parser)throw Error('Original protected Dad/G9 GLB not loaded');
 gltf.scene.updateMatrixWorld(true);
 const donor=fit.restoredNeck.mesh;
 const scanned=[];
 gltf.scene.traverse(o=>{
  if(!o.isSkinnedMesh||o===donor)return;
  const assoc=gltf.parser.associations?.get(o)||{};
  if(assoc.meshes===0)scanned.push(o);
 });
 if(!scanned.length)throw Error('Original approved photographed Dad head is absent');
 const originalScanGeometries=scanned.map(o=>o.geometry);
 const target=donor.localToWorld(new THREE.Vector3(0,fit.cutoffY,0));
 const actual=realOriginalScanEdge(scanned,THREE,target);
 const trial=clipNativeG9ToActualDadScanEdge(donor,actual.loop,THREE);
 const cutEdgeRings=getLoops(trial.segments,{THREE,x:target.x,z:target.z});
 if(cutEdgeRings.length!==1)
  throw Error('G9 trimmed genuine neck cut does not form one closed contour: '+cutEdgeRings.length+'. Original meshes preserved.');
 const gap=measureActual3DEdgeGap(actual.loop,cutEdgeRings[0]);
 // This compares the ACTUAL 3D scan open edge to the actual surgically clipped
 // native G9 donor edge. Avoid the bogus 90mm upper-slice mismatch of Stage34.
 if(gap.p95MM>35||gap.maxMM>50)
  throw Error('Native G9/scan boundary mismatch still unsafe: '+gap.p95MM.toFixed(1)+'mm p95 and '+
     gap.maxMM.toFixed(1)+'mm worst. No cut committed.');
 const patch=makeRealEdgeStrip(actual.loop,cutEdgeRings[0],donor,THREE);
 const originalNativeGeometry=donor.geometry;
 try{
  donor.geometry=trial.geometry;
  donor.geometry.computeBoundingSphere();
  for(let i=0;i<scanned.length;i++){
   if(scanned[i].geometry!==originalScanGeometries[i])
    throw Error('Original Dad photographed mesh changed unexpectedly');
  }
 }catch(err){
  donor.geometry=originalNativeGeometry;
  patch.strip.removeFromParent();patch.strip.geometry.dispose();patch.strip.material.dispose();
  throw err;
 }
 const stats={
  source:'Genuine 136-point original Dad scan bottom boundary / native G9 neck',
  originalScannedHeadUntouched:true,originalG9TorsoUntouched:true,
  originalG9HeadRemoved:true,headMovedOrResized:false,
  scannedHeadBoundary:actual.stats,g9NeckCut:trial.stats,
  measured3DGapMM:{median:Number(gap.medianMM.toFixed(2)),p95:Number(gap.p95MM.toFixed(2)),max:Number(gap.maxMM.toFixed(2))},
  bridgeTriangles:patch.strip.geometry.getAttribute('position').count/3,
  sourceGLBUnchanged:true,watertightWeldCertified:false,ownerVisuallyApproved:false
 };
 return {stats,bridge:patch.strip,
  restore(){donor.geometry=originalNativeGeometry;trial.geometry.dispose();
   patch.strip.removeFromParent();patch.strip.geometry.dispose();patch.strip.material.dispose();}};
}
