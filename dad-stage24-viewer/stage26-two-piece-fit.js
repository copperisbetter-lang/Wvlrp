// Dad Stage26 — independent manual fitting, not a merge.
// Uses the preexisting encrypted original scan + native 138-bone G9 from the protected GLB.
// Only the G9 neck primitive is clipped; the photographed head/shoulder scan is untouched.
import {makeShortNativeNeckStump} from './stage27-restore-neck-stump.js';
export function prepareTwoPieceFit(gltf, THREE) {
  const found=[];
  gltf.scene.traverse(o=>{
    if(!o.isMesh || !o.geometry?.getAttribute('position')) return;
    const assoc=gltf.parser.associations?.get(o)||{};
    found.push({mesh:o,assoc,faceCount:(o.geometry.index?.count||o.geometry.getAttribute('position').count)/3});
  });
  let scanned=found.filter(r=>r.assoc.meshes===0);
  let body=found.filter(r=>r.assoc.meshes===1);
  if(!scanned.length || !body.length) {
    // Fail closed instead of manipulating a guessed face/neck mesh.
    throw new Error('Model identification failed: native Dad scan and G9 body are not both identifiable.');
  }
  const scanTriangles=scanned.reduce((s,v)=>s+v.faceCount,0);
  if(scanTriangles<5000 || body.length<3) throw Error('Original mesh layout does not match the protected Dad/G9 model.');
  const originalScanVerts=scanned.map(r=>r.mesh.geometry.getAttribute('position').count);
  gltf.scene.updateMatrixWorld(true);
  const boxOf=records=>{
    const box=new THREE.Box3();
    records.forEach(({mesh})=>box.expandByObject(mesh));
    return box;
  };
  const scanBox=boxOf(scanned);
  const bodyBox=boxOf(body);
  const centerScan=scanBox.getCenter(new THREE.Vector3());
  const centerBody=bodyBox.getCenter(new THREE.Vector3());
  // G9 torso is primitive 5 (actual source material 6), neck primitive 4 (material 5).
  const torso=body.filter(r=>r.assoc.primitives===5);
  const neck=body.filter(r=>r.assoc.primitives===4);
  if(!torso.length || !neck.length) throw Error('Native Genesis 9 torso/neck primitives were not found. Cut aborted.');
  const shoulderYs=[];
  torso.forEach(r=>{
    const p=r.mesh.geometry.getAttribute('position');
    for(let i=0;i<p.count;i++){
      const x=Math.abs(p.getX(i)),y=p.getY(i),z=p.getZ(i);
      if(x>.13 && x<.255 && y>1.3 && y<1.58 && z>-.15 && z<.15)shoulderYs.push(y);
    }
  });
  if(shoulderYs.length<15) throw Error('Too few actual G9 shoulder measurements; neck cut aborted.');
  shoulderYs.sort((a,b)=>a-b);
  const topShoulder=shoulderYs[Math.floor(.96*(shoulderYs.length-1))];
  const cutY=Math.min(1.54,Math.max(1.47,topShoulder+.012)); // ~12 mm above actual shoulder surface
  // Stage24 removed G9 neck triangles but retained their ORIGINAL vertex data.
  // Restore a short G9 neck fitting stump from original native vertex positions,
  // atlas UVs and skeletal weights; this stays on the BODY, not the Dad scan.
  const recoveredStump=makeShortNativeNeckStump(neck[0].mesh,topShoulder,THREE);
  const cutReport=[];
  // Original Stage24 index-cut fragment is jagged/overcut: hide those fragments
  // instead of cutting MORE of the native body. The reconstructed short neck
  // stump sits in the same shoulder opening and forms the fitting target.
  for(const {mesh} of neck) {
    mesh.visible=false;
    cutReport.push({mesh:mesh.name,action:'hide rejected Stage24 overcut fragments; no additional neck triangles deleted'});
  }
  body.push({mesh:recoveredStump.mesh,assoc:{meshes:1,primitives:-1},faceCount:recoveredStump.mesh.geometry.index.count/3});
  // Preserve source positions, UVs, photographic materials, rig and source skeleton.
  if(scanned.some((r,i)=>r.mesh.geometry.getAttribute('position').count!==originalScanVerts[i])) {
    throw Error('Original Dad scan changed unexpectedly.');
  }
  // Make independent pivots at genuine geometry anchors (world units: meters).
  const headPivot=new THREE.Group();
  headPivot.name='DAD_HEAD_MANUAL_FITTING_PIVOT';
  headPivot.rotation.order='YXZ';
  headPivot.position.set(centerScan.x,Math.max(scanBox.min.y+.06,scanBox.max.y-.34),centerScan.z);
  const bodyPivot=new THREE.Group();
  bodyPivot.name='G9_BODY_MANUAL_FITTING_PIVOT';
  bodyPivot.rotation.order='YXZ';
  bodyPivot.position.set(centerBody.x,bodyBox.min.y+(bodyBox.max.y-bodyBox.min.y)*.50,centerBody.z);
  gltf.scene.add(headPivot,bodyPivot);
  gltf.scene.updateMatrixWorld(true);
  // Keep skeleton in original rest-pose space, while user moves mesh-pivots separately.
  // Detached bind avoids skinning canceling parent movement.
  for(const r of scanned){if(r.mesh.isSkinnedMesh)r.mesh.bindMode='detached';headPivot.attach(r.mesh);}
  for(const r of body){if(r.mesh.isSkinnedMesh)r.mesh.bindMode='detached';bodyPivot.attach(r.mesh);}
  headPivot.updateMatrixWorld(true);bodyPivot.updateMatrixWorld(true);
  const defaults={
    head:{position:headPivot.position.toArray(),rotation:[0,0,0],scale:1},
    body:{position:bodyPivot.position.toArray(),rotation:[0,0,0],scale:1}
  };
  return {
    headPivot,bodyPivot,defaults,
    scanTriangles,bodyPrimitiveCount:body.length,actualShoulderY:topShoulder,
    cutoffY:cutY,cutHeightMM:(cutY-topShoulder)*1000,
    cutReport,
    restoredNeck:recoveredStump,
    originalDadScanUnchanged:true,
    bothPartsSeparate:true,
    noBridgeOrWeld:true,
    scanMeshCount:scanned.length,
    headBoneCount:gltf.scene.getObjectByName('DAZ_G9_neck1')?1:null
  };
}
function clipNeckToPlane(mesh,yMax,THREE){
  const geom=mesh.geometry, idx=geom.index, attrs=geom.attributes;
  const names=Object.keys(attrs),pos=attrs.position;
  if(!pos || !idx) throw Error('Cannot surgically clip unindexed G9 neck.');
  const read=i=>{
    const v={};
    for(const name of names) {
      const a=attrs[name], arr=[];
      for(let j=0;j<a.itemSize;j++) arr.push(a.getComponent(i,j));
      v[name]=arr;
    }
    return v;
  };
  const lerp=(a,b,t)=>{
    const out={};
    for(const name of names){
      if(name==='skinIndex'||name==='skinWeight')continue;
      out[name]=a[name].map((v,k)=>v*(1-t)+b[name][k]*t);
      if(name==='normal'){
        const len=Math.hypot(...out[name]);
        if(len>1e-9)out[name]=out[name].map(q=>q/len);
      }
    }
    if(a.skinIndex&&a.skinWeight&&b.skinIndex&&b.skinWeight){
      const influences=new Map();
      for(let i=0;i<4;i++){
        const j1=Math.round(a.skinIndex[i]),j2=Math.round(b.skinIndex[i]);
        influences.set(j1,(influences.get(j1)||0)+a.skinWeight[i]*(1-t));
        influences.set(j2,(influences.get(j2)||0)+b.skinWeight[i]*t);
      }
      const sorted=[...influences.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);
      const sum=sorted.reduce((v,j)=>v+j[1],0)||1;
      out.skinIndex=Array.from({length:4},(_,i)=>sorted[i]?.[0]||0);
      out.skinWeight=Array.from({length:4},(_,i)=>(sorted[i]?.[1]||0)/sum);
    }
    return out;
  };
  const out=Object.fromEntries(names.map(n=>[n,[]]));
  let removed=0,partly=0,kept=0,triOut=0;
  const emit=v=>{for(const n of names)out[n].push(...v[n]);};
  for(let t=0;t<idx.count;t+=3){
    const verts=[read(idx.getX(t)),read(idx.getX(t+1)),read(idx.getX(t+2))];
    if(verts.every(v=>v.position[1]>yMax)){removed++;continue;}
    if(verts.every(v=>v.position[1]<=yMax)){verts.forEach(emit);kept++;triOut++;continue;}
    partly++;
    const clipped=[];
    for(let i=0;i<3;i++){
      const a=verts[(i+2)%3],b=verts[i], ia=a.position[1]<=yMax,ib=b.position[1]<=yMax;
      if(ia!==ib){
        const den=b.position[1]-a.position[1];
        const ratio=Math.max(0,Math.min(1,(yMax-a.position[1])/den));
        clipped.push(lerp(a,b,ratio));
      }
      if(ib)clipped.push(b);
    }
    for(let i=1;i+1<clipped.length;i++){
      emit(clipped[0]);emit(clipped[i]);emit(clipped[i+1]);triOut++;
    }
  }
  if(triOut<5) throw Error('Neck cut removed all supporting neck geometry; refusing change.');
  const dest=new THREE.BufferGeometry();
  for(const n of names){
    const a=attrs[n],values=out[n],k=a.itemSize;
    if(n==='skinIndex')dest.setAttribute(n,new THREE.Uint16BufferAttribute(values,k));
    else if(n==='skinWeight')dest.setAttribute(n,new THREE.Float32BufferAttribute(values,k));
    else dest.setAttribute(n,new THREE.Float32BufferAttribute(values,k));
  }
  dest.computeBoundingBox();dest.computeBoundingSphere();
  mesh.geometry=dest;
  return {originalTriangles:idx.count/3,trianglesAfter:triOut,fullyRemoved:removed,partlyClipped:partly,kept,cutYMeters:yMax};
}
