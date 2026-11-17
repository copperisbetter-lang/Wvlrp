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
 return {mesh,sourceIndex:index,attrs:result,position:result.position};
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
// Stage38: the actual source G9 has TWO legitimate partial neck-cut arcs
// (front and back), NOT one closed neck ring. Both are real G9 surfaces.
// At either shoulder the real G9 torso primitive #5 completes the donor
// surface. Anchor the small bridge to the nearest ACTUAL triangles in either
// cut neck or original UNCHANGED torso; never fabricate a missing closed neck
// loop or trim Dad's original head/shoulder photograph.
const m3=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const madd3=(a,b,t)=>a.map((x,i)=>x+b[i]*t);
function nearestOnRealTriangle(p,a,b,c) {
 const ab=m3(b,a),ac=m3(c,a),ap=m3(p,a),d1=dot3(ab,ap),d2=dot3(ac,ap);
 if(d1<=0&&d2<=0)return {point:a,weights:[1,0,0]};
 const bp=m3(p,b),d3=dot3(ab,bp),d4=dot3(ac,bp);
 if(d3>=0&&d4<=d3)return {point:b,weights:[0,1,0]};
 const vc=d1*d4-d3*d2;
 if(vc<=0&&d1>=0&&d3<=0){const t=d1/(d1-d3);return {point:madd3(a,ab,t),weights:[1-t,t,0]};}
 const cp=m3(p,c),d5=dot3(ab,cp),d6=dot3(ac,cp);
 if(d6>=0&&d5<=d6)return {point:c,weights:[0,0,1]};
 const vb=d5*d2-d1*d6;
 if(vb<=0&&d2>=0&&d6<=0){const t=d2/(d2-d6);return {point:madd3(a,ac,t),weights:[1-t,0,t]};}
 const va=d3*d6-d5*d4;
 if(va<=0&&d4-d3>=0&&d5-d6>=0){
  const t=(d4-d3)/(d4-d3+d5-d6),bc=m3(c,b);
  return {point:madd3(b,bc,t),weights:[0,1-t,t]};
 }
 const sum=va+vb+vc;
 if(Math.abs(sum)<1e-12)return {point:a,weights:[1,0,0]}; // Conservative degenerate donor-face fallback
 const v=vb/sum,w=vc/sum;
 return {point:madd3(madd3(a,ab,v),ac,w),weights:[1-v-w,v,w]};
}
function barycentricSource(v0,v1,v2,weight,point){
 const fields=Object.keys(v0.attrs),attrs={};
 for(const field of fields){
  if(field==='skinIndex'||field==='skinWeight')continue;
  const n=v0.attrs[field].length;
  attrs[field]=Array.from({length:n},(_,i)=>v0.attrs[field][i]*weight[0]+
    v1.attrs[field][i]*weight[1]+v2.attrs[field][i]*weight[2]);
 }
 if(v0.attrs.skinIndex&&v0.attrs.skinWeight){
  const contributions=new Map();
  for(const [j,v] of [v0,v1,v2].entries())for(let k=0;k<4;k++){
   const idx=Math.round(v.attrs.skinIndex[k]),val=v.attrs.skinWeight[k]*weight[j];
   contributions.set(idx,(contributions.get(idx)||0)+val);
  }
  const best=[...contributions.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);
  const sum=best.reduce((s,v)=>s+v[1],0)||1;
  attrs.skinIndex=Array.from({length:4},(_,i)=>best[i]?.[0]||0);
  attrs.skinWeight=Array.from({length:4},(_,i)=>(best[i]?.[1]||0)/sum);
 }
 return {mesh:v0.mesh,position:point,attrs};
}
function buildRealDonorContactTriangles(meshes,THREE){
 const source=[];
 for(const mesh of meshes){
  mesh.updateMatrixWorld(true);
  const geometry=mesh.geometry,pos=geometry.getAttribute('position'),indices=geometry.index,count=indices?.count??pos?.count;
  if(!pos||!count||count%3)throw Error('Native G9 neck/torso mesh inaccessible');
  const cache=new Map(),point=i=>{
   if(!cache.has(i))cache.set(i,mesh.localToWorld(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i))).toArray());
   return cache.get(i);
  };
  for(let i=0;i<count;i+=3){
   const ids=[0,1,2].map(j=>indices?indices.getX(i+j):i+j);
   const a=point(ids[0]),b=point(ids[1]),c=point(ids[2]);
   const min=[0,1,2].map(j=>Math.min(a[j],b[j],c[j])),max=[0,1,2].map(j=>Math.max(a[j],b[j],c[j]));
   if(max[1]<1.40||min[1]>1.57||max[0]<-.30||min[0]>.30||max[2]<-.26||min[2]>.25)continue;
   source.push({mesh,ids,a,b,c,min,max});
  }
 }
 if(source.length<75)throw Error('Native G9 curved neck and original shoulder surfaces were not found');
 return source;
}
export function measureNativeSurfaceContact(scanLoop,donorNeck,torsoMeshes,THREE){
 const candidates=buildRealDonorContactTriangles([donorNeck,...torsoMeshes],THREE);
 const contacts=[],distances=[],origin=new THREE.Vector3();
 for(let i=0;i<scanLoop.sequence.length;i++){
  const scanVertex=scanLoop.sequence[i],p=scanLoop.points[i].toArray();
  let best=null,best2=Infinity;
  for(const tri of candidates){
   if(p[0]<tri.min[0]-.065||p[0]>tri.max[0]+.065||
      p[1]<tri.min[1]-.065||p[1]>tri.max[1]+.065||
      p[2]<tri.min[2]-.065||p[2]>tri.max[2]+.065)continue;
   const result=nearestOnRealTriangle(p,tri.a,tri.b,tri.c);
   const d=dot3(m3(result.point,p),m3(result.point,p));
   if(d<best2){best2=d;best={tri,result};}
  }
  if(!best)throw Error('No real G9 surface within 65mm of Dad scan border #'+i);
  const point=best.result.point;
  const attr=best.tri.ids.map(id=>vertex(best.tri.mesh,id));
  const contact=barycentricSource(attr[0],attr[1],attr[2],best.result.weights,
   best.tri.mesh.worldToLocal(new THREE.Vector3(...point)).toArray());
  const mm=Math.sqrt(best2)*1000;
  contacts.push({scan:scanVertex,scanWorld:p,donor:contact,donorWorld:point,mm,
    part:best.tri.mesh===donorNeck?'native-neck':'native-torso'});
  distances.push(mm);
 }
 distances.sort((a,b)=>a-b);
 const metrics={medianMM:distances[Math.floor((distances.length-1)*.5)],
  p95MM:distances[Math.floor((distances.length-1)*.95)],maxMM:distances.at(-1),
  scans:contacts.length,donorTrianglesScreened:candidates.length,
  neckAnchors:contacts.filter(x=>x.part==='native-neck').length,
  untouchedTorsoAnchors:contacts.filter(x=>x.part==='native-torso').length};
 // Strict real 3D distance safeguard; cannot bridge wide missing regions.
 if(metrics.p95MM>25||metrics.maxMM>38)
  throw Error('Genuine G9 donor too far from scan edge: p95='+metrics.p95MM.toFixed(1)+
   'mm max='+metrics.maxMM.toFixed(1)+'mm; original source and body protected.');
 return {contacts,metrics};
}
export function buildTrueSourceContactBridge(scanLoop,contactResult,donorNeck,THREE){
 const {contacts}=contactResult,colorAt=colorSampler(THREE),positions=[],colors=[],skins=[],weights=[],uvs=[];
 const posAttr=donorNeck.geometry.getAttribute('position');
 if(!posAttr)throw Error('Native donor geometry not ready for source-derived seam');
 const emitContact=(world,v)=>{
  const p=donorNeck.worldToLocal(new THREE.Vector3(...world)),c=colorAt(v),
    idx=v.attrs.skinIndex||[0,0,0,0],wt=v.attrs.skinWeight||[1,0,0,0];
  positions.push(p.x,p.y,p.z);colors.push(c.r,c.g,c.b);
  skins.push(...Array.from({length:4},(_,i)=>Math.round(idx[i]||0)));
  const sum=wt.reduce((a,b)=>a+b,0)||1;
  weights.push(...Array.from({length:4},(_,i)=>(wt[i]||0)/sum));
  uvs.push(...(v.attrs.uv||[0,0]));
 };
 for(let i=0;i<contacts.length;i++){
  const a=contacts[i],b=contacts[(i+1)%contacts.length];
  // Each of these corners is a genuine point on either the original Dad
  // scanned lower edge or an original surviving G9 neck/torso triangle.
  emitContact(a.scanWorld,a.scan);
  emitContact(a.donorWorld,a.donor);
  emitContact(b.scanWorld,b.scan);
  emitContact(b.scanWorld,b.scan);
  emitContact(a.donorWorld,a.donor);
  emitContact(b.donorWorld,b.donor);
 }
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geom.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skins,4));
 geom.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 geom.computeVertexNormals();geom.computeBoundingSphere();
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,
  roughness:.95,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const patch=new THREE.SkinnedMesh(geom,mat);
 patch.name='DAD_STAGE38_REAL_136_SCAN_EDGE_TO_EXISTING_G9_CONTACT_SURFACES';
 patch.bindMode='detached';patch.bind(donorNeck.skeleton,donorNeck.bindMatrix.clone());
 patch.position.copy(donorNeck.position);patch.quaternion.copy(donorNeck.quaternion);patch.scale.copy(donorNeck.scale);
 patch.frustumCulled=false;donorNeck.parent.add(patch);
 return {patch,triangles:geom.getAttribute('position').count/3};
}


class RimQueue {
 constructor(){this.q=[];}
 push(x){const q=this.q;let i=q.length;q.push(x);while(i>0){const p=(i-1)>>1;if(q[p].d<=x.d)break;q[i]=q[p];i=p;}q[i]=x;}
 pop(){const q=this.q,r=q[0],tail=q.pop();if(!q.length)return r;let i=0;while(2*i+1<q.length){let c=i*2+1;if(c+1<q.length&&q[c+1].d<q[c].d)c++;if(tail.d<=q[c].d)break;q[i]=q[c];i=c;}q[i]=tail;return r;}
 get length(){return this.q.length;}
}
function rimNeighbors(g){
 const p=g.getAttribute('position'),adj=Array.from({length:p.count},()=>new Map()),same=new Map();
 const coord=i=>[p.getX(i),p.getY(i),p.getZ(i)];
 for(let i=0;i<p.count;i++){const k=coord(i).map(x=>Math.round(x*Q)).join(':');if(!same.has(k))same.set(k,[]);same.get(k).push(i);}
 for(const ids of same.values()){for(let j=1;j<ids.length;j++){adj[ids[0]].set(ids[j],0);adj[ids[j]].set(ids[0],0);}}
 const idx=g.index,c=idx?.count??p.count;
 for(let i=0;i<c;i+=3){const tri=[0,1,2].map(j=>idx?idx.getX(i+j):i+j);
  for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3];if(a===b)continue;
   const d=Math.hypot(p.getX(a)-p.getX(b),p.getY(a)-p.getY(b),p.getZ(a)-p.getZ(b));
   if(!adj[a].has(b)||adj[a].get(b)>d){adj[a].set(b,d);adj[b].set(a,d);}
  }}
 return adj;
}
export function featherRealScanBorderIntoG9(scanLoop,contactResult,THREE,options={}){
 const width=options.width??.042,inset=options.inset??.00125;
 if(width<.015||width>.065||inset<0||inset>.003)throw Error('Unsafe lower-edge feather width or inset');
 const {contacts}=contactResult,groups=new Map(),undos=[];
 if(contacts.length!==scanLoop.sequence.length)throw Error('Dad lower-edge contact count mismatch');
 for(const c of contacts){if(!Number.isInteger(c.scan.sourceIndex))throw Error('Original scan rim index missing');
  const a=groups.get(c.scan.mesh)||[];a.push(c);groups.set(c.scan.mesh,a);}
 const report={originalSourceScanFileUntouched:true,scannedFaceBeardUpperNeckUnchanged:true,
  originalG9TorsoGeometryUntouched:true,scanRimVerticesAdjusted:0,scanFeatherVertices:0,maxDisplacementMM:0,
  fakeBridgeTriangles:0,featherWidthMM:width*1000};
 const colorAt=colorSampler(THREE);
 try{
  for(const [mesh,edges] of groups){
   const original=mesh.geometry,pos=original.getAttribute('position');
   if(!pos||!original.index)throw Error('Approved Dad scan missing indexed topology');
   const adj=rimNeighbors(original),n=pos.count,dist=new Float64Array(n).fill(Infinity),
       root=new Int32Array(n).fill(-1),queue=new RimQueue(),offsets=[],colors=[];
   for(let i=0;i<edges.length;i++){
    const c=edges[i],world=new THREE.Vector3(...c.scanWorld);
    const normal=new THREE.Vector3(...(c.donor.attrs.normal||[0,1,0]))
        .transformDirection(c.donor.mesh.matrixWorld).normalize();
    const radial=world.clone().sub(new THREE.Vector3(scanLoop.cx,world.y,scanLoop.cz));radial.y=0;
    if(normal.dot(radial)<0)normal.negate();
    const target=new THREE.Vector3(...c.donorWorld).addScaledVector(normal,-inset);
    const atLocal=mesh.worldToLocal(target),delta=atLocal.sub(new THREE.Vector3(...c.scan.position));
    if(delta.length()>.036)throw Error('Dad scanned lower-edge movement beyond 36mm; no changes made');
    offsets.push(delta);
    let col=colorAt(c.donor);
    const mat=Array.isArray(c.donor.mesh.material)?c.donor.mesh.material[0]:c.donor.mesh.material;
    if(mat?.map&&col.r>.94&&col.g>.94&&col.b>.94)col=new THREE.Color('#c5a797');
    colors.push(col);
    const id=c.scan.sourceIndex;
    if(id>=n)throw Error('Photogrammetry rim index invalid');
    dist[id]=0;root[id]=i;queue.push({id,d:0});
   }
   let pops=0;
   while(queue.length){
    const x=queue.pop(),v=x.id;if(x.d>dist[v]+1e-9)continue;if(x.d>width)break;
    for(const [to,length] of adj[v]){const step=x.d+length;
      if(step>width||step>=dist[to]-1e-9)continue;
      dist[to]=step;root[to]=root[v];queue.push({id:to,d:step});
    }
    if(++pops>n*25)throw Error('Scan lower-edge geodesic search exceeded safe limit');
   }
   const modified=original.clone(),out=modified.getAttribute('position'),
       wts=new Float32Array(n),colAttr=new Float32Array(n*3);let changed=0;
   for(let i=0;i<n;i++){
    const origin=root[i],d=dist[i];if(origin<0||d>=width)continue;
    const t=clamp(1-d/width,0,1),smooth=t*t*(3-2*t),offset=offsets[origin].clone().multiplyScalar(smooth);
    out.setXYZ(i,pos.getX(i)+offset.x,pos.getY(i)+offset.y,pos.getZ(i)+offset.z);
    wts[i]=smooth;const col=colors[origin];colAttr[i*3]=col.r;colAttr[i*3+1]=col.g;colAttr[i*3+2]=col.b;
    changed++;report.maxDisplacementMM=Math.max(report.maxDisplacementMM,offset.length()*1000);
   }
   modified.setAttribute('rimBlend',new THREE.Float32BufferAttribute(wts,1));
   modified.setAttribute('rimG9Color',new THREE.Float32BufferAttribute(colAttr,3));
   if(original.getAttribute('normal')){
    const preserved=original.getAttribute('normal');modified.computeVertexNormals();
    const surface=modified.getAttribute('normal');
    for(let i=0;i<n;i++){
     const t=wts[i];
     if(t<.000001){surface.setXYZ(i,preserved.getX(i),preserved.getY(i),preserved.getZ(i));continue;}
     const a=new THREE.Vector3(surface.getX(i),surface.getY(i),surface.getZ(i)),
       b=new THREE.Vector3(preserved.getX(i),preserved.getY(i),preserved.getZ(i));
     a.multiplyScalar(t).addScaledVector(b,1-t).normalize();surface.setXYZ(i,a.x,a.y,a.z);
    }
   }
   out.needsUpdate=true;modified.computeBoundingSphere();modified.computeBoundingBox();
   const oldMaterial=mesh.material,materials=(Array.isArray(oldMaterial)?oldMaterial:[oldMaterial]).map(base=>{
    const m=base.clone(),compile=m.onBeforeCompile;
    m.onBeforeCompile=(shader,renderer)=>{
     if(compile)compile.call(m,shader,renderer);
     shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute float rimBlend;\nattribute vec3 rimG9Color;\nvarying float vRimBlend;\nvarying vec3 vRimG9Color;');
     shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvRimBlend=rimBlend;\nvRimG9Color=rimG9Color;');
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying float vRimBlend;\nvarying vec3 vRimG9Color;');
     shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vRimG9Color,clamp(vRimBlend,0.0,1.0));');
    };
    m.customProgramCacheKey=()=>String(base.customProgramCacheKey?.()||'base')+':dad-stage39-rim-feather-v1';
    m.needsUpdate=true;return m;
   });
   undos.push({mesh,original,oldMaterial,modified,materials});
   mesh.geometry=modified;mesh.material=Array.isArray(oldMaterial)?materials:materials[0];
   report.scanRimVerticesAdjusted+=edges.length;report.scanFeatherVertices+=changed;
  }
  return {stats:report,restore(){
   for(const u of undos){u.mesh.geometry=u.original;u.mesh.material=u.oldMaterial;
    u.modified.dispose();u.materials.forEach(m=>m.dispose());}
  }};
 }catch(err){for(const u of undos){u.mesh.geometry=u.original;u.mesh.material=u.oldMaterial;
   u.modified.dispose();u.materials.forEach(m=>m.dispose());}throw err;}
}
export function attemptTrueScanEdgeDonorOnlyFit(fit,gltf,THREE){
 if(!fit?.restoredNeck?.mesh||!gltf?.parser)throw Error('Original protected Dad/G9 source missing');
 gltf.scene.updateMatrixWorld(true);
 const donor=fit.restoredNeck.mesh,scanned=[],torsos=[];
 gltf.scene.traverse(o=>{
  if(!o.isSkinnedMesh||o===donor)return;
  const assoc=gltf.parser.associations?.get(o)||{};
  if(assoc.meshes===0)scanned.push(o);
  if(assoc.meshes===1&&assoc.primitives===5)torsos.push(o);
 });
 if(!scanned.length||!torsos.length)throw Error('Original Dad scan and G9 shoulders must both be loaded');
 const originalDonor=donor.geometry,originalScan=scanned.map(o=>o.geometry),
       originalMaterials=scanned.map(o=>o.material),originalTorso=torsos.map(o=>o.geometry);
 const target=donor.localToWorld(new THREE.Vector3(0,fit.cutoffY,0)),
       actual=realOriginalScanEdge(scanned,THREE,target);
 let trial=null,softened=null;
 try{
  trial=clipNativeG9ToActualDadScanEdge(donor,actual.loop,THREE);
  donor.geometry=trial.geometry;donor.updateMatrixWorld(true);
  const measured=measureNativeSurfaceContact(actual.loop,donor,torsos,THREE);
  softened=featherRealScanBorderIntoG9(actual.loop,measured,THREE);
  if(torsos.some((o,i)=>o.geometry!==originalTorso[i]))
   throw Error('Original native G9 torso geometry was unexpectedly modified');
  const stats={source:'Original Dad lower edge feathered to genuine native G9 neck/torso',
   faceBeardAndUpperNeckUnchanged:true,originalScannedHeadSourcePreserved:true,
   originalG9TorsoUntouched:true,headMovedOrResized:false,
   scannedHeadBoundary:actual.stats,g9NeckCut:trial.stats,
   donorSurfaceContactMM:Object.fromEntries(Object.entries(measured.metrics).map(([k,v])=>[k,Number(v.toFixed(2))])),
   geometryAdjustments:softened.stats,
   realScannedLowerEdgeFeatheredInViewer:true,addedBridgeTriangles:0,
   originalSourceGLBUnchanged:true,watertightWeldCertified:false,ownerVisuallyApproved:false};
  return {stats,restore(){
    softened.restore();donor.geometry=originalDonor;trial.geometry.dispose();
    if(scanned.some((o,i)=>o.geometry!==originalScan[i]||o.material!==originalMaterials[i]))
      throw Error('Undo failed to restore original photographed Dad scan');
  }};
 }catch(err){if(softened)softened.restore();
  donor.geometry=originalDonor;if(trial?.geometry)trial.geometry.dispose();throw err;}
}


// STAGE40: actual lower SCAN SHELL RESECTION, not surface recoloring.
// All edits are to disposable runtime geometry; originals remain recoverable.
// A new boundary is cut *inside* the genuine photogrammetry shell by measured
// distance along real source triangle edges, never a synthetic tube or ellipse.
// The new boundary is connected to original G9 triangle surface contacts with
// a multi-row skinned transition. THIS IS NOT YET a watertight welded GLB.
function stage40CutLowerShell(mesh, originalRim, THREE, trimWidth) {
 const source=mesh.geometry,positions=source.getAttribute('position'),indices=source.index;
 if(!indices||!positions)throw Error('Stage40 requires the genuine indexed photographed head mesh');
 if(Array.isArray(mesh.material))throw Error('Stage40 refuses multi-material photographed meshes');
 if(Object.values(source.morphAttributes||{}).some(v=>v?.length))
  throw Error('Stage40 will not discard original face morph targets');
 if(trimWidth<.012||trimWidth>.033)throw Error('Stage40 scan resection depth is unsafe');
 const n=positions.count,neighbors=rimNeighbors(source),dist=new Float64Array(n).fill(Infinity);
 const queue=new RimQueue(),rimVerts=originalRim.sequence.filter(v=>v.mesh===mesh);
 if(rimVerts.length!==originalRim.sequence.length)
  throw Error('Stage40 requires one complete original Dad lower edge on one genuine scan mesh');
 for(const v of rimVerts){
  if(v.sourceIndex<0||v.sourceIndex>=n)throw Error('Stage40 original lower-rim vertex invalid');
  dist[v.sourceIndex]=0;queue.push({id:v.sourceIndex,d:0});
 }
 while(queue.length){
  const a=queue.pop();
  if(a.d>dist[a.id]+1e-9)continue;
  if(a.d>trimWidth+.06)break;
  for(const [v,len] of neighbors[a.id]){
   const d=a.d+len;
   if(d<dist[v]-1e-9&&d<trimWidth+.06){dist[v]=d;queue.push({id:v,d});}
  }
 }
 const fields=Object.keys(source.attributes),out=Object.fromEntries(fields.map(f=>[f,[]]));
 const readCache=new Map(),read=id=>{
  if(!readCache.has(id))readCache.set(id,vertex(mesh,id));
  return readCache.get(id);
 };
 const signed=i=>Math.min(1000000,dist[i])-trimWidth;
 const intersections=[],segments=[],count=indices.count;
 let removed=0,cut=0,retained=0,triangles=0;
 for(let t=0;t<count;t+=3){
  const ids=[indices.getX(t),indices.getX(t+1),indices.getX(t+2)];
  const verts=ids.map(read),signs=ids.map(signed),inside=signs.map(s=>s>=0);
  if(!inside.some(Boolean)){removed++;continue;}
  if(inside.every(Boolean)){verts.forEach(v=>emit(out,v));retained++;triangles++;continue;}
  const poly=[],hits=[];cut++;
  for(let j=0;j<3;j++){
   const k=(j+2)%3,a=verts[k],b=verts[j],sa=signs[k],sb=signs[j],ia=inside[k],ib=inside[j];
   if(ia!==ib){
    const alpha=clamp(sa/(sa-sb),0,1);
    const x=lerp(a,b,alpha);
    poly.push(x);hits.push(x);
   }
   if(ib)poly.push(b);
  }
  if(hits.length!==2||Math.hypot(...hits[0].position.map((v,i)=>v-hits[1].position[i]))<.000001)
   throw Error('Stage40 scanned lower-shell cut encounters invalid edge intersection');
  segments.push(hits);
  for(let j=1;j+1<poly.length;j++){
   emit(out,poly[0]);emit(out,poly[j]);emit(out,poly[j+1]);triangles++;
  }
 }
 if(cut<20||segments.length<20||removed<10||triangles<1000)
  throw Error('Stage40 authentic scan resection did not produce enough safe polygons');
 const loops=getLoops(segments,{THREE,x:originalRim.cx,z:originalRim.cz});
 if(loops.length!==1)throw Error('Stage40 new photographed scan cut has '+loops.length+' closed boundaries, expected exactly one');
 const boundary=loops[0];
 if(boundary.sequence.length<40||boundary.sequence.length>600)
  throw Error('Stage40 photographed cut contour not within safe complexity range');
 const heights=boundary.points.map(v=>v.y);
 if(Math.min(...heights)<1.44||Math.max(...heights)>1.58)
  throw Error('Stage40 new cut would reach above the protected lower-neck area');
 const built=new THREE.BufferGeometry();
 for(const name of fields){
  const a=source.getAttribute(name),size=a.itemSize;
  const Type=name==='skinIndex'?THREE.Uint16BufferAttribute:THREE.Float32BufferAttribute;
  built.setAttribute(name,new Type(out[name],size));
 }
 built.computeBoundingSphere();built.computeBoundingBox();
 return {geometry:built,loop:boundary,metrics:{
  originalTriangles:count/3,removedWholeTriangles:removed,
  cutTriangles:cut,keptWholeTriangles:retained,newTriangles:triangles,
  originalRimVertices:rimVerts.length,newRimVertices:boundary.sequence.length,
  resectionDepthMM:trimWidth*1000,newRimMinY:Math.min(...heights),
  newRimMaxY:Math.max(...heights),sourcePhotogrammetryImmutable:true
 }};
}

// Stitch the *new*, interior cut rim to actual G9 donor triangles.
// World-space vertex #0 is identical to the retained scan cut contour;
// the last row is inset into genuine G9 body surface to eliminate open gaps.
// No broad photographed shoulder flaps or new fake cylindrical neck geometry.
function stage40BuildMatchedSeam(scanLoop,contact,donor,THREE) {
 const cs=contact.contacts,n=cs.length;
 if(n!==scanLoop.sequence.length||n<40)throw Error('Stage40 new scan/donor seam count mismatch');
 const p=[],colors=[],skinIds=[],skinWeights=[],uvs=[];
 const sample=colorSampler(THREE),rows=4;
 const points=cs.map((c,i)=>{
  const s=new THREE.Vector3(...c.scanWorld),d=new THREE.Vector3(...c.donorWorld);
  const normal=new THREE.Vector3(...(c.donor.attrs.normal||[0,1,0]))
     .transformDirection(c.donor.mesh.matrixWorld).normalize();
  if(!Number.isFinite(normal.x)||normal.lengthSq()<.01)throw Error('Stage40 invalid donor surface normal');
  d.addScaledVector(normal,-.0015); // narrow, intentional buried contact
  if(s.distanceTo(d)>.050)throw Error('Stage40 patch would span >50mm at point '+i);
  const sc=sample(c.scan),dc=sample(c.donor);
  const si=c.donor.attrs.skinIndex||[0,0,0,0],
       sw=c.donor.attrs.skinWeight||[1,0,0,0],sum=sw.reduce((a,b)=>a+b,0)||1;
  return {s,d,sc,dc,si,sw:sw.map(x=>x/sum),uv:c.donor.attrs.uv||[0,0]};
 });
 // Every ring reuses the original points and exact outer-ring orientation.
 const rowsOf=points.map(o=>Array.from({length:rows},(_,j)=>{
   const t=j/(rows-1);
   // Convex blend remains inside the original measured source->donor corridor.
   const loc=o.s.clone().lerp(o.d,t);
   const col=o.sc.clone().lerp(o.dc,t);
   return {loc,col,si:o.si,sw:o.sw,uv:o.uv};
 }));
 const put=(x)=>{
  const q=donor.worldToLocal(x.loc.clone());
  p.push(q.x,q.y,q.z);colors.push(x.col.r,x.col.g,x.col.b);
  skinIds.push(...Array.from({length:4},(_,i)=>Math.round(x.si[i]||0)));
  skinWeights.push(...Array.from({length:4},(_,i)=>x.sw[i]||0));
  uvs.push(...x.uv);
 };
 for(let i=0;i<n;i++){
  const next=(i+1)%n;
  for(let j=0;j<rows-1;j++){
   put(rowsOf[i][j]);put(rowsOf[i][j+1]);put(rowsOf[next][j]);
   put(rowsOf[i][j+1]);put(rowsOf[next][j+1]);put(rowsOf[next][j]);
  }
 }
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
 geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geom.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIds,4));
 geom.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4));
 geom.computeVertexNormals();geom.computeBoundingSphere();
 const material=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,
  roughness:.96,metalness:0});
 const patch=new THREE.SkinnedMesh(geom,material);
 patch.name='DAD_STAGE40_RESECTED_REAL_SCAN_TO_NATIVE_G9_MULTIRING_CONTACT';
 patch.bindMode='detached';
 patch.bind(donor.skeleton,donor.bindMatrix.clone());
 patch.position.copy(donor.position);patch.quaternion.copy(donor.quaternion);patch.scale.copy(donor.scale);
 patch.frustumCulled=false;
 donor.parent.add(patch);
 return {patch,triangles:geom.getAttribute('position').count/3,
  sealRows:rows,originalDonorBodyMeshModified:false,
  watertightWeldCertified:false};
}

export function attemptStage40ScanRimResection(fit,gltf,THREE) {
 if(!fit?.restoredNeck?.mesh||!gltf?.parser)throw Error('Stage40 requires genuine protected Dad + Genesis 9 model');
 gltf.scene.updateMatrixWorld(true);
 const donor=fit.restoredNeck.mesh,scans=[],torso=[];
 gltf.scene.traverse(o=>{
  if(!o.isSkinnedMesh||o===donor)return;
  const a=gltf.parser.associations?.get(o)||{};
  if(a.meshes===0)scans.push(o);
  if(a.meshes===1&&a.primitives===5)torso.push(o);
 });
 if(!scans.length||!torso.length)throw Error('Stage40 protected scanned head/G9 torso missing');
 const originalNeck=donor.geometry,originalScan=scans.map(m=>m.geometry);
 const originalMaterials=scans.map(m=>m.material),originalTorso=torso.map(m=>m.geometry);
 const target=donor.localToWorld(new THREE.Vector3(0,fit.cutoffY,0));
 const rim=realOriginalScanEdge(scans,THREE,target).loop;
 const sourceMesh=rim.sequence[0]?.mesh;
 let clippedNeck=null,clippedScan=null,patch=null,chosenContact=null,chosenWidth=0;
 try{
  if(!sourceMesh||rim.sequence.some(v=>v.mesh!==sourceMesh))
   throw Error('Stage40 scanned shoulder rim is not a single measurable original mesh');
  clippedNeck=clipNativeG9ToActualDadScanEdge(donor,rim,THREE);
  donor.geometry=clippedNeck.geometry;donor.updateMatrixWorld(true);
  let failure='';
  for(const width of [.030,.026,.022,.018,.014]){
   let candidate=null;
   try{
    candidate=stage40CutLowerShell(sourceMesh,rim,THREE,width);
    const measured=measureNativeSurfaceContact(candidate.loop,donor,torso,THREE);
    clippedScan=candidate;chosenContact=measured;chosenWidth=width;break;
   }catch(e){failure=String(e.message||e);if(candidate)candidate.geometry.dispose();}
  }
  if(!clippedScan)throw Error('No safe matched Stage40 scan border (14-30mm): '+failure);
  sourceMesh.geometry=clippedScan.geometry;
  patch=stage40BuildMatchedSeam(clippedScan.loop,chosenContact,donor,THREE);
  if(scans.some((o,i)=>o!==sourceMesh&&o.geometry!==originalScan[i]))
   throw Error('Stage40 unexpected scan mesh change');
  if(torso.some((o,i)=>o.geometry!==originalTorso[i]))
   throw Error('Stage40 attempted to alter original Genesis 9 torso');
  const gap=chosenContact.metrics;
  const stats={
   stage:40,method:'Authentic scanned shoulder edge resection and multiring native G9 donor contact',
   originalDadFaceBeardAndUpperNeckRetained:true,storedOriginalScanBytesPreserved:true,
   originalGen9TorsoGeometryUnchanged:true,originalGen9NeckSourcePreserved:true,
   scannedHeadBoundary:{scannedLowerEdgeVertices:rim.sequence.length},
   newCut:clippedScan.metrics,g9NeckCut:clippedNeck.stats,
   donorSurfaceContactMM:gap,
   seam:{trimDepthMM:chosenWidth*1000,newScanRimVertices:clippedScan.loop.sequence.length,
     patchTriangles:patch.triangles,stitchRows:patch.sealRows,
     donorContactInsetMM:1.5,scanCutSharedPositionWithPatch:true,
     finalDonorContactProjectedToRealNativeGeometry:true,
     watertightWeldCertified:false},
   originalSourceGLBUnchanged:true,ownerVisuallyApproved:false,
   originalG9TorsoOrShoulderSurgery:false
  };
  return {stats,restore(){
    if(patch){patch.patch.parent?.remove(patch.patch);patch.patch.geometry.dispose();patch.patch.material.dispose();patch=null;}
    sourceMesh.geometry=originalScan[scans.indexOf(sourceMesh)];
    if(clippedScan?.geometry){clippedScan.geometry.dispose();clippedScan=null;}
    donor.geometry=originalNeck;
    if(clippedNeck?.geometry){clippedNeck.geometry.dispose();clippedNeck=null;}
    if(scans.some((m,i)=>m.geometry!==originalScan[i]||m.material!==originalMaterials[i]))
     throw Error('Stage40 Undo failed original photographed scan restore');
  }};
 }catch(err){
  if(patch){patch.patch.parent?.remove(patch.patch);patch.patch.geometry.dispose();patch.patch.material.dispose();}
  if(clippedScan?.geometry)clippedScan.geometry.dispose();
  if(clippedNeck?.geometry)clippedNeck.geometry.dispose();
  donor.geometry=originalNeck;
  scans.forEach((m,i)=>{m.geometry=originalScan[i];m.material=originalMaterials[i];});
  throw err;
 }
}
