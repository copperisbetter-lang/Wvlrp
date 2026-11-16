// Stage27: restore a SHORT fitting neck stump from ORIGINAL (still present) G9 neck vertex data.
// Stage24 removed neck triangle indices, not the original positional/UV/weight vertex buffers.
// Reconstruct a small skinned surface locally, not a photogrammetry/face seam repair.
// This new model is attached ONLY to the GENESIS 9 body and NEVER to Dad's separate scan.
export function makeShortNativeNeckStump(originalNeckMesh, shoulderY, THREE) {
  const src=originalNeckMesh.geometry;
  const p=src.getAttribute('position'), uv=src.getAttribute('uv');
  const ji=src.getAttribute('skinIndex'), sw=src.getAttribute('skinWeight');
  if(!p||!uv||!ji||!sw || p.count<100) throw Error('Native G9 neck vertex/UV/rig data missing — cannot restore stump.');
  const yTop=Math.min(1.55,Math.max(1.475,shoulderY+.013));
  const yBase=Math.max(1.38,yTop-.095);
  // Stage24 kept the complete source vertex arrays even when it removed the triangle indices.
  const srcV=[];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(y<yBase-.02||y>yTop+.065||Math.abs(x)>.20||Math.abs(z)>.20)continue;
    srcV.push({i,x,y,z});
  }
  if(srcV.length<35)throw Error('Too few original G9 neck vertices available to reconstruct the stump.');
  const candidates=srcV.filter(v=>Math.abs(v.y-yTop)<.035 && Math.hypot(v.x,v.z)<.14);
  // Position is taken from original G9 vertices, not the moving Dad scan.
  const mean=(arr,key,fallback)=>arr.length?arr.reduce((a,v)=>a+v[key],0)/arr.length:fallback;
  const centerX=mean(candidates,'x',-.008),centerZ=mean(candidates,'z',0);
  const sampleY=[yBase,yBase+.027,yBase+.050,yTop-.010,yTop];
  const ringCount=40;
  const pts=[],tex=[],indices=[],bone=[],weight=[],origDistances=[];
  const pick=(x,y,z)=>{
    let best=null,ds=Infinity;
    for(const s of srcV){
      const d=(s.x-x)**2+(s.y-y)**2*2+(s.z-z)**2;
      if(d<ds){ds=d;best=s;}
    }
    origDistances.push(Math.sqrt(ds));
    return best.i;
  };
  function nativeDims(y) {
    const near=srcV.filter(v=>Math.abs(v.y-y)<.030);
    if(near.length<16)return null;
    const px=near.map(v=>Math.abs(v.x-centerX)).filter(v=>v>.025&&v<.18).sort((a,b)=>a-b);
    const pz=near.map(v=>Math.abs(v.z-centerZ)).filter(v=>v>.025&&v<.18).sort((a,b)=>a-b);
    const q=(a,f)=>a.length?a[Math.min(a.length-1,Math.floor(.82*a.length))]:f;
    return {x:q(px,.068),z:q(pz,.064)};
  }
  let baseDims=nativeDims(yBase);
  let topDims=nativeDims(yTop);
  if(!baseDims)baseDims={x:.082,z:.072};
  if(!topDims)topDims={x:.063,z:.058};
  // The root must cover the older Stage24 ellipse socket; the TOP is narrow enough
  // to sit UNDER Dad's actual scan instead of leaving a hole wider than his head.
  const rxBottom=Math.max(.105,baseDims.x),rzBottom=Math.max(.098,baseDims.z);
  const rxTop=Math.min(.072,Math.max(.052,topDims.x));
  const rzTop=Math.min(.067,Math.max(.048,topDims.z));
  const add=(x,y,z)=>{
    const srcId=pick(x,y,z);
    pts.push(x,y,z);tex.push(uv.getX(srcId),uv.getY(srcId));
    for(let j=0;j<4;j++){bone.push(Math.round(ji.getComponent(srcId,j)));weight.push(sw.getComponent(srcId,j));}
  };
  for(let layer=0;layer<sampleY.length;layer++){
    const y=sampleY[layer],t=(y-yBase)/(yTop-yBase);
    const shaped=t*t*(3-2*t);
    const rx=rxBottom+(rxTop-rxBottom)*shaped;
    const rz=rzBottom+(rzTop-rzBottom)*shaped;
    for(let a=0;a<ringCount;a++){
      const angle=2*Math.PI*a/ringCount;
      add(centerX+rx*Math.cos(angle),y,centerZ+rz*Math.sin(angle));
    }
  }
  for(let layer=0;layer<sampleY.length-1;layer++){
    for(let a=0;a<ringCount;a++){
      const b=(a+1)%ringCount,lower=layer*ringCount+a,lower2=layer*ringCount+b;
      const upper=(layer+1)*ringCount+a,upper2=(layer+1)*ringCount+b;
      indices.push(lower,lower2,upper,lower2,upper2,upper);
    }
  }
  const capIndex=pts.length/3;
  add(centerX,yTop,centerZ);
  const capStart=(sampleY.length-1)*ringCount;
  for(let a=0;a<ringCount;a++){
    // Cap the fitting stump so there is no open hole at the TOP.
    indices.push(capIndex,capStart+a,capStart+(a+1)%ringCount);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(bone,4));
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weight,4));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=originalNeckMesh.material.clone();
  material.side=THREE.DoubleSide;
  material.transparent=false;
  const stump=new THREE.SkinnedMesh(geometry,material);
  stump.name='GENESIS_9_SHORT_NECK_STUMP_RESTORED';
  stump.frustumCulled=false;
  stump.bindMode='detached';
  stump.bind(originalNeckMesh.skeleton,originalNeckMesh.bindMatrix.clone());
  originalNeckMesh.parent.add(stump);
  // The new stump is not welded to the unchanged G9 torso, but it overlaps
  // the old cut opening to make the body usable for manual HEAD positioning.
  const sorted=origDistances.sort((a,b)=>a-b);
  return {mesh:stump,cutY:yTop,shoulderY,stumpAboveShoulderMM:(yTop-shoulderY)*1000,
    neckTopRadiusXMM:rxTop*1000,neckTopRadiusZMM:rzTop*1000,
    rootRadiusXMM:rxBottom*1000,rootRadiusZMM:rzBottom*1000,
    sourceNeckVerticesAvailable:p.count,closestSourceP95MM:sorted[Math.floor(sorted.length*.95)]*1000,
    originalScanChanged:false,topCapClosed:true,wasReconstructedFromOriginalNativeNeckVertices:true};
}
