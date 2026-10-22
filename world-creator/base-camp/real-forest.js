/**
 * The Wild / Base Camp only — mobile-safe photo-textured PBR forest.
 * The first mobile fallback stretched little synthetic oaks into oversized
 * trees, exaggerating plastic-looking branches and leaves. Prefer separately
 * authored PBR geometry in believable size bands; never enlarge a 3m sapling
 * into a 25m tree. The original models remain explicit diagnostics only.
 * Distinct from the original Wild world; preserve all lake/campsite placement.
 */
import {GLTFLoader} from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js";

const STABLE_SOURCES = [
  {id:"detailed-oak",url:"../assets/village-oak-detailed.glb"},
  {id:"photo-understory-broadleaf",url:"../assets/village-pbr-tree_small_02.glb"},
  {id:"natural-fir-sapling",url:"../assets/village-pbr-fir_sapling.glb"}
];
// Opt in explicitly with ?forest=legacy to isolate the old green-strip model.
const LEGACY_SOURCES = [
  {id:"legacy-broadleaf",url:"../assets/village-photoreal-broadleaf.glb"},
  {id:"legacy-fir",url:"../assets/village-pbr-fir_tree_01.glb"}
];
const SEED = 20261021;
function generator(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};}
function angularGap(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))}
function createPositions({radius,terrainY,lakeRadius,beachZone,pathDistance,paths,perimeterClearings,interiorClearings,legacyForest=false,fullForest=false}){
  const rand=generator(SEED),placements=[];
    const spacing=9.2,cells=Math.ceil((radius-11)/spacing);
  for(let i=-cells;i<=cells;i++)for(let j=-cells;j<=cells;j++){
    if(rand()>.84)continue;
    const x=(i+(rand()-.5)*.8)*spacing,z=(j+(rand()-.5)*.8)*spacing;
    const r=Math.hypot(x,z);
    if(r<35||r>radius-11||lakeRadius(x,z)<1.34||beachZone(x,z))continue;
    if(paths.some(path=>pathDistance(x,z,path)<7.5))continue;
    if(perimeterClearings.some(p=>{
      const sx=p.x*.985,sz=p.z*.985;
      return Math.hypot(x-sx,z-sz)<16 ||
        (r>radius-53 && angularGap(Math.atan2(z,x),p.facingRadians)<.045);
    }))continue;
    if(interiorClearings.some(p=>Math.hypot(x-p.x,z-p.z)<15))continue;
    const localSlope=Math.hypot(terrainY(x+1,z)-terrainY(x-1,z),terrainY(x,z+1)-terrainY(x,z-1))*.5;
    if(localSlope>.72)continue;
    const speciesRoll=rand(),source=legacyForest?(speciesRoll<.27?1:0):
      (!fullForest?(speciesRoll<.79?1:2):
      (speciesRoll<.66?0:speciesRoll<.88?1:2));
    // Do not multiply a small tree's leaf/branch geometry 5x; source models
    // are naturally 4-9m high. Use 3 age bands rather than identical giants.
    const height=legacyForest?(source===1?19+rand()*10:16+rand()*8):
      source===0?13+rand()*5:source===1?6+rand()*4:5+rand()*3.5;
    placements.push({x,z,y:terrainY(x,z)-.07,
      source,height,
      angle:rand()*Math.PI*2,priority:rand()});
  }
  // Do not truncate by grid traversal order: that leaves the opposite
  // side of the circular world bare. Spread the mobile mesh budget evenly.
  placements.sort((a,b)=>a.priority-b.priority);
  return placements.slice(0,5700);
}
async function loadParts(THREE,loader,source){
  const gltf=await loader.loadAsync(source.url);
  gltf.scene.updateMatrixWorld(true);
  const parts=[],box=new THREE.Box3();
  gltf.scene.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.geometry||!mesh.material)return;
    // Bake source hierarchy into each part before instancing, preserving its PBR materials.
    const geometry=mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    // These CC0 GLBs arrived on inconsistent source axes: broadleaf is Z-up,
    // fir sapling is X-up. Without correction the crowns lie flat on the soil.
    // Rotate baked geometry BEFORE measuring/grounding its union bounds.
    if(source.id==="photo-understory-broadleaf")geometry.rotateX(-Math.PI/2);
    else if(source.id==="natural-fir-sapling")geometry.rotateZ(Math.PI/2);
    geometry.computeBoundingBox();
    if(!geometry.boundingBox||geometry.boundingBox.isEmpty())return;
    box.union(geometry.boundingBox);
    const name=(mesh.name+" "+(mesh.material.name||"")).toLowerCase();
    let material=mesh.material;
    // Leaf cutout textures must discard their transparent pixels. Otherwise
    // phone GPUs render their quad cards as rectangular green walls.
    if(material.map && (/leaf|leaves|twig|needle|foliage|fern|branch|card/.test(name) || material.alphaTest>0 || material.transparent)){
      material=material.clone();
      material.alphaTest=Math.max(.42,material.alphaTest||0);
      material.transparent=false;
      material.depthWrite=true;
      material.side=THREE.DoubleSide;
      material.needsUpdate=true;
    }
    parts.push({geometry,material,name});
  });
  if(!parts.length||box.isEmpty())throw Error("Model has no drawable PBR geometry: "+source.id);
  const sz=new THREE.Vector3();box.getSize(sz);
  if(!Number.isFinite(sz.y)||sz.y<.03||sz.x>sz.y*3.5||sz.z>sz.y*3.5)
    throw Error("Source appears to be a multi-tree bundle or has invalid size: "+source.id);
  const c=new THREE.Vector3();box.getCenter(c);
  for(const p of parts){p.geometry.translate(-c.x,-box.min.y,-c.z)}
  return {parts,height:sz.y};
}
export async function installBaseCampRealForest(THREE,scene,options){
  // Keep candidate forest positions as WORLD DATA, not an always-rendered GPU forest.
  // An Android GPU cannot draw an entire 0.25-mile forest at full PBR resolution.
  const lowPower=!!options.lowPower,fullForest=!!options.fullForest;
  const legacyForest=!!options.legacyForest;
  const sources=legacyForest?LEGACY_SOURCES:STABLE_SOURCES;
  // A small source tree stretched into a 38m giant made its crown into a
  // continuous leaf-card wall. Display properly scaled PBR trees, spaced as
  // individual woodland crowns. Keep the full forest placement data untouched.
  // Keep CPU/GPU draw budgets bounded, but show the whole visible landscape:
  // the previous 40-tree nearest-only cap made 80% of each vista look empty.
  // Keep the dense world map, but draw only camera-facing trees on phones.
  const maxVisible=lowPower?(fullForest?128:64):320;
  const drawRadius=lowPower?155:390;
  let densityBudget=Math.min(maxVisible,Math.max(36,options.visibleTreeBudget??(lowPower?96:260)));
  const positions=createPositions({...options,legacyForest});
  // Partition the fixed world map once. Updating the view must not rescan all
  // thousands of trees every time an Android user turns their camera.
  const CELL=48,positionCells=new Map();
  for(const t of positions){
    const key=Math.floor(t.x/CELL)+":"+Math.floor(t.z/CELL);
    if(!positionCells.has(key))positionCells.set(key,[]);
    positionCells.get(key).push(t);
  }
  const status={state:"loading",requested:positions.length,visible:0,planted:0,
    sources:[],failures:[],profile:lowPower?"mobile":"desktop"};
  options.report?.(legacyForest?"Experimental forest test — loading older models…":"Loading upright PBR broadleaf trees and fir saplings…");
  const loader=new GLTFLoader();
  // A large full-size fir and oak have excessive polygon cost. Avoid a heavy startup
  // download + simultaneous GLB decode on phones. ?forest=full opts in.
  // The synthetic 'detailed oak' is 625 mesh parts, 213k triangles and NO image textures.
   // On mobile it caused hundreds of draw calls with no photorealism benefit.
   // Default to the real photographed PBR broadleaf and fir; heavy oak is opt-in
   // only with ?forest=full for explicit debugging, never default phone scenery.
   const ids=legacyForest?(lowPower&&!fullForest?[0]:[0,1]):
     (fullForest?[0,1,2]:[1,2]);
  // Serial decoding on phones avoids a single simultaneous multi-GLB stall.
  // Desktop can load all models concurrently.
  const results=lowPower?[]:await Promise.allSettled(ids.map(i=>loadParts(THREE,loader,sources[i])));
  if(lowPower)for(const i of ids){
    await new Promise(resolve=>setTimeout(resolve,25));
    try{results.push({status:"fulfilled",value:await loadParts(THREE,loader,sources[i])});}
    catch(reason){results.push({status:"rejected",reason});}
  }
  const group=new THREE.Group();
  group.name="Base Camp streamed photo-textured forest";
  const records=[];
  for(let n=0;n<ids.length;n++){
    const i=ids[n],source=sources[i],result=results[n];
    if(result.status!=="fulfilled"){
      const message=source.id+": "+String(result.reason?.message||result.reason);
      status.failures.push(message);
      console.warn("BASE_CAMP_TREE_ASSET_ERROR",message);
      continue;
    }
    const loaded=result.value;
    const pool=positions.filter(p=>p.source===i);
    // Each genuine source mesh part is drawn as an instance batch with a
    // bounded capacity; batching prevents a huge number of draw calls.
    const batches=loaded.parts.map(part=>{
      const mesh=new THREE.InstancedMesh(part.geometry,part.material,maxVisible);
      mesh.name=source.id+" / "+part.name;
      mesh.count=0;
      mesh.castShadow=!lowPower;
      mesh.receiveShadow=false;
      // Matrices are repopulated after player movement: stale frustum bounds
      // must never hide a nearby stand when the player crosses chunk limits.
      // Recompute bounds only when instance positions change below. Otherwise
      // off-screen tree batches still submit all of their triangles to the GPU.
      mesh.frustumCulled=true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(mesh);
      return mesh;
    });
    records.push({source,pool,batches,height:loaded.height});
    status.planted+=pool.length;
    status.sources.push({name:source.id,available:pool.length,parts:loaded.parts.length,heightMetres:+loaded.height.toFixed(2)});
  }
  scene.add(group);
  const bySource=new Map(records.map((rec)=>[sources.indexOf(rec.source),rec]));
  const dummy=new THREE.Object3D();
  let lastX=NaN,lastZ=NaN,lastYaw=NaN,lastBuild=-Infinity;
  const update=(x,z,yaw=0,force=false)=>{
    const now=performance.now();
    const yawDelta=Math.abs(Math.atan2(Math.sin(yaw-lastYaw),Math.cos(yaw-lastYaw)));
    if(!force && (now-lastBuild<280 ||
       (Math.hypot(x-lastX,z-lastZ)<6 && yawDelta<.23)))return;
    lastX=x;lastZ=z;lastYaw=yaw;lastBuild=now;
    const viewX=-Math.sin(yaw),viewZ=-Math.cos(yaw);
    // 72-degree VERTICAL camera FOV is only ~35-degree HORIZONTAL on a portrait phone.
   // Previous .26 cutoff rendered a 150-degree fan, wasting most GPU work offscreen.
   const halfHorizontalFov=Math.atan(Math.tan(72*Math.PI/360)*(options.cameraAspect||.48));
   const cosHalfCone=lowPower?Math.cos(halfHorizontalFov+.16):-.2;
    // The visible set moves with the player; ring-balanced draw selection
    // avoids an empty horizon while retaining natural open spaces.
    // Ring-balanced draw selection is essential: using the nearest N
    // positions leaves an obvious vacant horizon, even with thousands planted.
    const selectedLimit=densityBudget;
    const rings=[[],[],[]];
    const minIx=Math.floor((x-drawRadius)/CELL),maxIx=Math.floor((x+drawRadius)/CELL);
    const minIz=Math.floor((z-drawRadius)/CELL),maxIz=Math.floor((z+drawRadius)/CELL);
    for(let ix=minIx;ix<=maxIx;ix++)for(let iz=minIz;iz<=maxIz;iz++){
      const cell=positionCells.get(ix+":"+iz);
      if(!cell)continue;
      for(const t of cell){
        const rec=bySource.get(t.source);
        if(!rec)continue;
        const dx=t.x-x,dz=t.z-z,d2=dx*dx+dz*dz;
        if(d2>drawRadius*drawRadius)continue;
        if(lowPower&&d2>17*17&&dx*viewX+dz*viewZ<cosHalfCone*Math.sqrt(d2))continue;
        rings[d2<85*85?0:d2<152*152?1:2].push({rec,t,d2});
      }
    }
    rings[0].sort((a,b)=>a.d2-b.d2);
    rings[1].sort((a,b)=>a.d2-b.d2);
    // Far trees are dispersed around the full view, not clustered at one
    // edge of the middle ring. All use the same real PBR GLB geometry.
    rings[2].sort((a,b)=>a.t.priority-b.t.priority);
    const quotas=[Math.round(selectedLimit*.69),Math.round(selectedLimit*.24),0];
    quotas[2]=selectedLimit-quotas[0]-quotas[1];
    const occupied=[],selectedByRecord=new Map(records.map(rec=>[rec,[]]));
    let visible=0;
    function take(items,target,spacing){
      let n=0;
      const gap2=spacing*spacing;
      for(const item of items){
        if(n>=target||visible>=selectedLimit)break;
        if(occupied.some(t=>(t.x-item.t.x)**2+(t.z-item.t.z)**2<gap2))continue;
        occupied.push(item.t);
        selectedByRecord.get(item.rec).push(item.t);
        visible++;n++;
      }
    }
    take(rings[0],quotas[0],lowPower?9.6:9.1);
    take(rings[1],quotas[1],lowPower?14.0:13);
    take(rings[2],quotas[2],lowPower?21:19);
    // Fill any spare slots after ensuring distant treeline coverage.
    if(visible<selectedLimit)take(rings[0].concat(rings[1]),selectedLimit-visible,lowPower?9.5:8.6);
    if(visible<selectedLimit)take(rings[2],selectedLimit-visible,lowPower?18:16);
    for(const rec of records){
      const trees=selectedByRecord.get(rec);
      for(let k=0;k<trees.length;k++){
        const t=trees[k];
        dummy.position.set(t.x,t.y,t.z);
        dummy.rotation.set(0,t.angle,0);
        // Cap scale. Never create giant plastic leaves by enlarging tiny source trees.
        const heightScale=Math.min(2, t.height/rec.height);
        const crownWidth=0.91+0.15*((Math.sin(t.angle*7.7)+1)*.5);
        dummy.scale.set(heightScale*crownWidth,heightScale,heightScale*crownWidth);
        dummy.updateMatrix();
        for(const mesh of rec.batches)mesh.setMatrixAt(k,dummy.matrix);
      }
      for(const mesh of rec.batches){
        mesh.count=trees.length;
        mesh.instanceMatrix.needsUpdate=true;
        // Critical: the instance cloud moves as the player moves. Fresh bounds
        // permit Three.js to reject off-camera batches safely.
        mesh.computeBoundingSphere();
      }
    }
    status.visible=visible;
    options.report?.(visible+" near/middle/distant PBR trees active · "+status.planted+
      " mapped across the world"+(lowPower&&!legacyForest?" · mixed realistic-size trees":"")+
      (status.failures.length?" · "+status.failures.length+" asset error(s)":""));
  };
  status.group=group;
  status.update=update;
  status.setDensity=(count,x,z,yaw=lastYaw||0)=>{
    densityBudget=Math.max(12,Math.min(maxVisible,Math.round(count)));
    update(x,z,yaw,true);
  };
  status.state=records.length?"ready":"error";
  if(records.length)update(options.startX??0,options.startZ??15,options.startYaw??0,true);
  else options.report?.("Forest source files unavailable — no fake trees substituted");
  console.info("BASE_CAMP_REAL_FOREST",JSON.stringify({state:status.state,mapped:status.planted,
    requested:status.requested,active:status.visible,profile:status.profile,sources:status.sources,
    failures:status.failures}));
  return status;
}
