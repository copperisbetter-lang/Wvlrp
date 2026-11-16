// Dad Stage25: conservative, source-measured edge-to-edge trial.
// All original GLB meshes, rig, UVs and existing skins remain immutable.
// This constructs a skinned bridge only where actual exposed G9 and scan boundary edges agree.
// It does NOT replace a final watertight retopology or claim owner approval.
export function buildMeasuredEdgeBridge(gltf, THREE) {
  const meshes = [];
  gltf.scene.traverse(o => {
    if (!o.isSkinnedMesh || !o.geometry?.getAttribute('position')) return;
    const assoc = gltf.parser?.associations?.get(o) || {};
    const count = o.geometry.index ? o.geometry.index.count / 3 : o.geometry.getAttribute('position').count / 3;
    meshes.push({ mesh: o, assoc, faces: count });
  });
  const sort = meshes.slice().sort((a,b)=>b.faces-a.faces);
  const scanRec = meshes.find(m=>m.assoc.meshes===0 && (m.assoc.primitives===0 || m.assoc.primitives===undefined))
    || meshes.find(m=>m.mesh.name.toLowerCase().includes('dad') && m.faces>3000)
    || sort.find(m=>m.faces>8000 && m.mesh.geometry.getAttribute('position').count>10000);
  const scan = scanRec?.mesh;
  if(!scan) throw Error('Cannot identify original photographed Dad scan.');
  const donors = meshes.filter(m => m.mesh !== scan && (
    m.assoc.meshes===1 || (m.mesh.material?.name||'').toLowerCase().includes('genesis')
  ));
  if(!donors.length) {
    for(const m of meshes) if(m.mesh!==scan) donors.push(m);
  }
  // Native G9 exposed neck material is primitive #4 (source material 5).
  // Adjacent upper torso material #6 may also have an actual open boundary.
  const targets = donors.filter(m=>m.assoc.primitives===4 || m.assoc.primitives===5)
    .concat(donors.filter(m=>m.assoc.primitives!==4 && m.assoc.primitives!==5))
    .filter((v,i,a)=>a.indexOf(v)===i);
  function edgeBoundary(mesh) {
    const g=mesh.geometry, p=g.getAttribute('position'), idx=g.index;
    if(!idx) return [];
    const seen=new Map();
    for(let i=0;i<idx.count;i+=3) {
      const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];
      for(let k=0;k<3;k++){
        const a=ids[k],b=ids[(k+1)%3], lo=Math.min(a,b),hi=Math.max(a,b);
        const key=lo+':'+hi, prev=seen.get(key);
        if(prev) prev.count++;
        else seen.set(key,{a,b,count:1});
      }
    }
    const res=[];
    for(const e of seen.values()){
      if(e.count!==1) continue;
      const a=[p.getX(e.a),p.getY(e.a),p.getZ(e.a)];
      const b=[p.getX(e.b),p.getY(e.b),p.getZ(e.b)];
      res.push({...e,p:a,q:b});
    }
    return res;
  }
  const scanEdges=edgeBoundary(scan).filter(e=>{
    const x=(e.p[0]+e.q[0])/2,y=(e.p[1]+e.q[1])/2,z=(e.p[2]+e.q[2])/2;
    return y>1.38 && y<1.68 && Math.abs(x)<.28 && Math.abs(z)<.23;
  });
  if(scanEdges.length<20) throw Error('No measured scanned neck/shoulder boundary.');
  function near(pt) {
    let best=null, best2=Infinity;
    for(const e of scanEdges) {
      const d=[e.q[0]-e.p[0],e.q[1]-e.p[1],e.q[2]-e.p[2]];
      const denom=d[0]*d[0]+d[1]*d[1]+d[2]*d[2];
      if(denom<1e-11) continue;
      const t=Math.max(0,Math.min(1,((pt[0]-e.p[0])*d[0]+(pt[1]-e.p[1])*d[1]+(pt[2]-e.p[2])*d[2])/denom));
      const xyz=e.p.map((v,i)=>v+d[i]*t);
      const sq=xyz.reduce((s,v,i)=>s+(v-pt[i])**2,0);
      if(sq<best2) {best2=sq;best={edge:e,t,xyz,dist:Math.sqrt(sq)};}
    }
    return best;
  }
  // Sampling uses the same actual embedded photo atlases already in the GLB.
  const samplers=new WeakMap();
  function colorAt(mesh, index, t=0, otherIndex=null) {
    const mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
    const uv=mesh.geometry.getAttribute('uv'), map=mat?.map;
    const fall=mat?.color?.clone() || new THREE.Color('#bf957a');
    if(!uv||!map?.image) return fall;
    let ctx=samplers.get(map);
    if(ctx===undefined){
      try {
        const cvs=document.createElement('canvas');
        const img=map.image;
        cvs.width=img.width;cvs.height=img.height;
        if(cvs.width*cvs.height>24000000) throw Error('texture too large');
        ctx=cvs.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(img,0,0);
      } catch {ctx=null;}
      samplers.set(map,ctx);
    }
    if(!ctx) return fall;
    let u=uv.getX(index),v=uv.getY(index);
    if(otherIndex!==null){u=u*(1-t)+uv.getX(otherIndex)*t;v=v*(1-t)+uv.getY(otherIndex)*t;}
    const x=Math.min(ctx.canvas.width-1,Math.max(0,Math.round(((u%1)+1)%1*(ctx.canvas.width-1))));
    const y=Math.min(ctx.canvas.height-1,Math.max(0,Math.round((1-((v%1)+1)%1)*(ctx.canvas.height-1))));
    try {
      const rgb=ctx.getImageData(x,y,1,1).data;
      return new THREE.Color().setRGB(rgb[0]/255,rgb[1]/255,rgb[2]/255,THREE.SRGBColorSpace);
    } catch {return fall;}
  }
  const vert=[],colors=[],skins=[],weights=[],uvs=[];
  const gapStats=[], perDonor=[];
  function emit(mesh,id,pos,col) {
    const ji=mesh.geometry.getAttribute('skinIndex'),sw=mesh.geometry.getAttribute('skinWeight'),uv=mesh.geometry.getAttribute('uv');
    vert.push(...pos);colors.push(col.r,col.g,col.b);
    if(ji&&sw){for(let k=0;k<4;k++){skins.push(ji.getComponent(id,k));weights.push(sw.getComponent(id,k));}}
    else {skins.push(0,0,0,0);weights.push(1,0,0,0);}
    uvs.push(uv?uv.getX(id):0,uv?uv.getY(id):0);
  }
  function emitScan(contact, mesh=scan){
    const {edge,t,xyz}=contact, a=edge.a,b=edge.b;
    const ji=mesh.geometry.getAttribute('skinIndex'),sw=mesh.geometry.getAttribute('skinWeight'),uv=mesh.geometry.getAttribute('uv');
    vert.push(...xyz);const col=colorAt(mesh,a,t,b);colors.push(col.r,col.g,col.b);
    if(ji&&sw){
      // Interpolate bone influences from actual photographed scan edge to native G9 skeleton.
      const wmap=new Map();
      for(let k=0;k<4;k++){
        const ia=ji.getComponent(a,k),ib=ji.getComponent(b,k);
        wmap.set(ia,(wmap.get(ia)||0)+sw.getComponent(a,k)*(1-t));
        wmap.set(ib,(wmap.get(ib)||0)+sw.getComponent(b,k)*t);
      }
      const top=[...wmap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);
      const sum=top.reduce((s,r)=>s+r[1],0)||1;
      for(let k=0;k<4;k++){skins.push(top[k]?.[0]||0);weights.push((top[k]?.[1]||0)/sum);}
    } else {skins.push(0,0,0,0);weights.push(1,0,0,0);}
    uvs.push(uv?uv.getX(a)*(1-t)+uv.getX(b)*t:0,uv?uv.getY(a)*(1-t)+uv.getY(b)*t:0);
  }
  let accepted=0,rejected=0, scanBound=scanEdges.length, donorBounds=0;
  for(const {mesh} of targets) {
    const edges=edgeBoundary(mesh);
    let count=0;
    for(const e of edges) {
      const mid=e.p.map((v,i)=>(v+e.q[i])/2);
      if(mid[1]<1.425||mid[1]>1.65||Math.abs(mid[0])>.27||Math.abs(mid[2])>.22) continue;
      donorBounds++;
      const left=near(e.p), right=near(e.q);
      const l=Math.hypot(...e.p.map((v,i)=>v-e.q[i]));
      const cross=Math.hypot(...left.xyz.map((v,i)=>v-right.xyz[i]));
      // Reject non-local pairing, bridges across scan islands, and already closed edges.
      if(!left||!right||left.dist>.077||right.dist>.077||l>.040||cross>.065||
         (left.dist<.002&&right.dist<.002)){rejected++;continue;}
      // Only contact the physical scanned boundary; do not cover Dad's photographed mesh.
      const dcA=colorAt(mesh,e.a),dcB=colorAt(mesh,e.b);
      emit(mesh,e.a,e.p,dcA);emit(mesh,e.b,e.q,dcB);emitScan(left);
      emit(mesh,e.b,e.q,dcB);emitScan(right);emitScan(left);
      accepted++;count++;gapStats.push((left.dist+right.dist)/2);
    }
    if(count) perDonor.push({name:mesh.name,bridged_edges:count});
  }
  if(!accepted) throw Error('Measured edges identified but no safe boundary spans could be connected.');
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vert,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(vert.length),3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skins,4));
  g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  g.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.93,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const bridge=new THREE.SkinnedMesh(g,material);
  bridge.name='Dad_Stage25_Measured_Boundary_Connector_Trial';
  const parent=targets[0].mesh.parent;
  bridge.position.copy(targets[0].mesh.position);
  bridge.quaternion.copy(targets[0].mesh.quaternion);
  bridge.scale.copy(targets[0].mesh.scale);
  bridge.bind(targets[0].mesh.skeleton,targets[0].mesh.bindMatrix);
  parent.add(bridge);
  const sorted=gapStats.slice().sort((a,b)=>a-b);
  return {
    bridge,
    stats:{
      stage:'25 boundary measurement / bridge trial (not approved)',
      scan_edges_measured:scanBound,
      genesis9_edges_screened:donorBounds,
      actual_contact_edges_connected:accepted,
      refused_unsafe_connections:rejected,
      contact_mean_mm:Math.round(gapStats.reduce((a,b)=>a+b,0)/gapStats.length*10000)/10,
      contact_p95_mm:Math.round(sorted[Math.floor(sorted.length*.95)]*10000)/10,
      original_dad_scan_modified:false,
      original_genesis9_geometry_modified:false,
      watertight_weld_verified:false,
      owner_approved:false,
      perDonor
    }
  };
}
