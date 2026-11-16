// Dad Stage28 — recover the ORIGINAL Genesis 9 neck triangles lost from Stage24.
// Stage24 script replaced its original accessor with a new index accessor, but DID NOT
// delete the original accessor, bufferView, underlying index bytes, vertex positions,
// UVs, weights or bones. This is a REAL native neck recovery, not an invented tube.
// Runs only in the owner's decrypted browser. No private scan/key is published here.
function readGLB(raw) {
  const view=new DataView(raw);
  if(view.byteLength<32 || view.getUint32(0,true)!==0x46546c67 || view.getUint32(4,true)!==2)
    throw Error('Protected model is not the expected GLB 2.0.');
  const jsonLen=view.getUint32(12,true);
  const jsonType=view.getUint32(16,true);
  if(jsonType!==0x4e4f534a || jsonLen<500 || jsonLen>view.byteLength-28)throw Error('Unexpected GLB JSON chunk.');
  const jsonText=new TextDecoder('utf-8').decode(new Uint8Array(raw,20,jsonLen));
  const gltf=JSON.parse(jsonText);
  const binHeader=20+jsonLen;
  if(view.getUint32(binHeader+4,true)!==0x004e4942)throw Error('GLB binary chunk missing.');
  return {view,gltf,binOffset:binHeader+8};
}
function getScalarIndices(accessorIndex,source){
  const {view,gltf,binOffset}=source;
  const acc=gltf.accessors[accessorIndex];
  if(!acc || acc.type!=='SCALAR' || (acc.componentType!==5123&&acc.componentType!==5125) || acc.sparse)
    throw Error('Old native neck index accessor is unsupported.');
  const bv=gltf.bufferViews[acc.bufferView];
  if(!bv || bv.buffer!==0 || !Number.isSafeInteger(acc.count))throw Error('Invalid neck source buffer view.');
  const componentBytes=acc.componentType===5125?4:2;
  const stride=bv.byteStride||componentBytes;
  const start=binOffset+(bv.byteOffset||0)+(acc.byteOffset||0);
  if(start<binOffset || start+stride*(acc.count-1)+componentBytes>view.byteLength)
    throw Error('Original neck indices extend beyond GLB buffer.');
  const out=new Uint32Array(acc.count);
  for(let i=0;i<acc.count;i++)
    out[i]=componentBytes===4?view.getUint32(start+i*stride,true):view.getUint16(start+i*stride,true);
  return out;
}
function locateOriginalNeckIndices(raw,sourceGeometry) {
  const source=readGLB(raw),{gltf}=source;
  if(gltf.meshes?.length!==2 || gltf.skins?.[0]?.joints?.length!==138)
    throw Error('Original 2-mesh, 138-bone Genesis 9 source not found.');
  if(gltf.meshes[1]?.primitives?.[4]?.material!==5)
    throw Error('Native G9 neck material or primitive identity changed.');
  const currentAcc=gltf.meshes[1].primitives[4].indices;
  const cur=gltf.accessors[currentAcc];
  const protectedVertices=sourceGeometry.getAttribute('position').count;
  if(cur.count!==609*3)throw Error('This is not the expected 609-face Stage24 neck cut.');
  // Native source neck primitive4 had 972 triangles before Stage24 destroyed face indexes.
  const used=new Set();
  for(const m of gltf.meshes)for(const pr of m.primitives){
    if(Number.isInteger(pr.indices))used.add(pr.indices);
    for(const j of Object.values(pr.attributes||{}))used.add(j);
    for(const target of pr.targets||[])for(const j of Object.values(target))used.add(j);
  }
  const possibles=[];
  gltf.accessors.forEach((a,i)=>{
    if(used.has(i)||a.type!=='SCALAR'||a.count!==972*3||![5123,5125].includes(a.componentType))return;
    try{
      const indices=getScalarIndices(i,source);
      let max=0;
      for(const n of indices)max=Math.max(max,n);
      if(max>=protectedVertices || max<30) return;
      possibles.push({index:i,indices,max});
    }catch(e) {}
  });
  if(possibles.length!==1)throw Error('Expected exactly one preserved native G9 972-triangle neck index buffer; found '+possibles.length+'. No artificial replacement will be generated.');
  return possibles[0];
}
function clipToShortNeck(originalGeom,originalIndices,yMax,THREE) {
  const attrs=originalGeom.attributes,keys=Object.keys(attrs);
  const pos=attrs.position;
  const data=Object.fromEntries(keys.map(k=>[k,[]]));
  const get=(i)=>{
    const o={};
    for(const key of keys){
      const a=attrs[key],q=[];
      for(let j=0;j<a.itemSize;j++)q.push(a.getComponent(i,j));
      o[key]=q;
    }
    return o;
  };
  const blend=(a,b,t)=>{
    const v={};
    for(const key of keys){
      if(key==='skinIndex'||key==='skinWeight')continue;
      v[key]=a[key].map((x,k)=>x*(1-t)+b[key][k]*t);
      if(key==='normal'){const n=Math.hypot(...v[key]);if(n>0)v[key]=v[key].map(x=>x/n);}
    }
    if(a.skinIndex&&a.skinWeight&&b.skinIndex&&b.skinWeight){
      const inf=new Map();
      for(let j=0;j<4;j++){
        const k1=Math.round(a.skinIndex[j]),k2=Math.round(b.skinIndex[j]);
        inf.set(k1,(inf.get(k1)||0)+a.skinWeight[j]*(1-t));
        inf.set(k2,(inf.get(k2)||0)+b.skinWeight[j]*t);
      }
      const best=[...inf.entries()].sort((p,q)=>q[1]-p[1]).slice(0,4);
      const total=best.reduce((sum,e)=>sum+e[1],0)||1;
      v.skinIndex=Array.from({length:4},(_,i)=>best[i]?.[0]||0);
      v.skinWeight=Array.from({length:4},(_,i)=>(best[i]?.[1]||0)/total);
    }
    return v;
  };
  const emit=v=>{for(const key of keys)data[key].push(...v[key])};
  let whollyRemoved=0,clipped=0,kept=0,faces=0,cutMinX=Infinity,cutMaxX=-Infinity;
  const eps=1e-6;
  for(let k=0;k<originalIndices.length;k+=3){
    const tri=[get(originalIndices[k]),get(originalIndices[k+1]),get(originalIndices[k+2])];
    if(tri.every(v=>v.position[1]>yMax+eps)){whollyRemoved++;continue;}
    if(tri.every(v=>v.position[1]<=yMax+eps)){tri.forEach(emit);kept++;faces++;continue;}
    clipped++;
    const polygon=[];
    for(let i=0;i<3;i++){
      const a=tri[(i+2)%3],b=tri[i];
      const ia=a.position[1]<=yMax,ib=b.position[1]<=yMax;
      if(ia!==ib){
        const t=(yMax-a.position[1])/(b.position[1]-a.position[1]);
        const n=blend(a,b,t);
        cutMinX=Math.min(cutMinX,n.position[0]);cutMaxX=Math.max(cutMaxX,n.position[0]);
        polygon.push(n);
      }
      if(ib)polygon.push(b);
    }
    for(let i=1;i+1<polygon.length;i++){emit(polygon[0]);emit(polygon[i]);emit(polygon[i+1]);faces++;}
  }
  if(faces<25||faces>=972)throw Error('Original G9 neck could not be cut to a short stump safely: '+faces+' faces remain.');
  const result=new THREE.BufferGeometry();
  for(const name of keys){
    const itemSize=attrs[name].itemSize,arr=data[name];
    const componentType=name==='skinIndex'?THREE.Uint16BufferAttribute:THREE.Float32BufferAttribute;
    result.setAttribute(name,new componentType(arr,itemSize));
  }
  result.computeVertexNormals();
  result.computeBoundingBox();result.computeBoundingSphere();
  return {geometry:result,stats:{originalNativeNeckFaces:972,remainingNativeFaces:faces,cutNativeFaces:whollyRemoved,partiallyClippedNativeFaces:clipped,originalFacesStillIntact:kept,topBoundaryWidthMM:Number.isFinite(cutMinX)?(cutMaxX-cutMinX)*1000:null}};
}
export function recoverActualOriginalG9ShortNeck(raw,oldNeckMesh,measuredShoulderY,THREE) {
  if(!(raw instanceof ArrayBuffer))throw Error('Provide the decrypted original GLB buffer privately in the browser.');
  const pos=oldNeckMesh.geometry.getAttribute('position');
  if(!pos || !oldNeckMesh.isSkinnedMesh)throw Error('Native skinned neck geometry is unavailable.');
  const {index:oldAccessor,indices}=locateOriginalNeckIndices(raw,oldNeckMesh.geometry);
  const cutY=Math.min(1.54,Math.max(1.455,measuredShoulderY+.015));
  const {geometry,stats}=clipToShortNeck(oldNeckMesh.geometry,indices,cutY,THREE);
  const restored=new THREE.SkinnedMesh(geometry,oldNeckMesh.material);
  restored.name='GENESIS9_ORIGINAL_972_FACE_NECK_SHORT_STUMP';
  restored.bindMode='detached';
  restored.bind(oldNeckMesh.skeleton,oldNeckMesh.bindMatrix.clone());
  restored.frustumCulled=false;
  restored.position.copy(oldNeckMesh.position);
  restored.quaternion.copy(oldNeckMesh.quaternion);
  restored.scale.copy(oldNeckMesh.scale);
  oldNeckMesh.parent.add(restored);
  oldNeckMesh.visible=false;
  return {
    mesh:restored,sourceOldAccessor:oldAccessor,sourceNeckVerticesAvailable:pos.count,
    cutoffY:cutY,cutYMM:cutY*1000,
    stumpAboveShoulderMM:(cutY-measuredShoulderY)*1000,
    ...stats,originalScanChanged:false, originalNativeNeckIndicesRecovered:true,
    nativeMeshMaterialsPreserved:true,
    noFabricatedTube:true
  };
}
