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
function createPositions({radius,terrainY,lakeRadius,beachZone,pathDistance,paths,perimeterClearings,interiorClearings,legacyForest=false}){
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
      (speciesRoll<.66?0:speciesRoll<.88?1:2);
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
    geometry.computeBoundingBox();
    if(!geometry.boundingBox||geometry.boundingBox.isEmpty())return;
    box.union(geometry.boundingBox);
    const name=(mesh.name+" "+(mesh.material.name||"")).toLowerCase();
    let material=mesh.material;
    // Leaf cutout textures must discard their transparent pixels. Otherwise
    // phone GPUs render their quad cards as rectangular green walls.
    if(material.map && (/leaf|foliage|fern|branch|card/.test(name) || material.alphaTest>0 || material.transparent)){
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
  // Keep all 2,050 candidate positions as WORLD DATA, not 2,050 live GPU trees.
  // An Android GPU cannot draw an entire 0.25-mile forest at full PBR resolution.
  const lowPower=!!options.lowPower,fullForest=!!options.fullForest;
  const legacyForest=!!options.legacyForest;
  const sources=legacyForest?LEGACY_SOURCES:STABLE_SOURCES;
  // A small source tree stretched into a 38m giant made its crown into a
  // continuous leaf-card wall. Display properly scaled PBR trees, spaced as
  // individual woodland crowns. Keep the full forest placement data untouched.
  // Keep CPU/GPU draw budgets bounded, but show the whole visible landscape:
  // the previous 40-tree nearest-only cap made 80% of each vista look empty.
  const maxVisible=lowPower?208:320;
  const drawRadius=lowPower?315:390;
  let densityBudget=Math.min(maxVisible,Math.max(48,options.visibleTreeBudget??(lowPower?176:260)));
  const positions=createPositions({...options,legacyForest});
  const status={state:"loading",requested:positions.length,visible:0,planted:0,
    sources:[],failures:[],profile:lowPower?"mobile":"desktop"};
  options.report?.(legacyForest?"Experimental forest test — loading older models…":"Loading detailed oaks, real PBR understory trees and young firs…");
  const loader=new GLTFLoader();
  // Fir asset is over 30 MB, broadleaf is 10 MB. Avoid a 40 MB startup
  // download + simultaneous GLB decode on phones. ?forest=full opts in.
  const ids=legacyForest?(lowPower&&!fullForest?[0]:[0,1]):[0,1,2];
  const results=await Promise.allSettled(ids.map(i=>loadParts(THREE,loader,sources[i])));
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
      mesh.frustumCulled=false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(mesh);
      return mesh;
    });
    records.push({source,pool,batches,height:loaded.height});
    status.planted+=pool.length;
    status.sources.push({name:source.id,available:pool.length,parts:loaded.parts.length});
  }
  scene.add(group);
  const dummy=new THREE.Object3D();
  let lastX=NaN,lastZ=NaN;
  const update=(x,z,force=false)=>{
    if(!force && Math.hypot(x-lastX,z-lastZ)<8)return;
    lastX=x;lastZ=z;
    // The visible set moves with the player; ring-balanced draw selection
    // avoids an empty horizon while retaining natural open spaces.
    // Ring-balanced draw selection is essential: using the nearest N
    // positions leaves an obvious vacant horizon, even with thousands planted.
    const selectedLimit=densityBudget;
    const rings=[[],[],[]];
    for(const rec of records){
      for(const t of rec.pool){
        const d2=(t.x-x)**2+(t.z-z)**2;
        if(d2>drawRadius*drawRadius)continue;
        rings[d2<108*108?0:d2<215*215?1:2].push({rec,t,d2});
      }
    }
    rings[0].sort((a,b)=>a.d2-b.d2);
    rings[1].sort((a,b)=>a.d2-b.d2);
    // Far trees are dispersed around the full view, not clustered at one
    // edge of the middle ring. All use the same real PBR GLB geometry.
    rings[2].sort((a,b)=>a.t.priority-b.t.priority);
    const quotas=[Math.round(selectedLimit*.61),Math.round(selectedLimit*.26),0];
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
    take(rings[0],quotas[0],lowPower?9.8:9.1);
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
      }
    }
    status.visible=visible;
    options.report?.(visible+" near/middle/distant PBR trees active · "+status.planted+
      " mapped across the world"+(lowPower&&!legacyForest?" · mixed realistic-size trees":"")+
      (status.failures.length?" · "+status.failures.length+" asset error(s)":""));
  };
  status.group=group;
  status.update=update;
  status.setDensity=(count,x,z)=>{densityBudget=Math.max(8,Math.min(maxVisible,Math.round(count)));update(x,z,true);};
  status.state=records.length?"ready":"error";
  if(records.length)update(options.startX??0,options.startZ??15,true);
  else options.report?.("Forest source files unavailable — no fake trees substituted");
  console.info("BASE_CAMP_REAL_FOREST",JSON.stringify({state:status.state,mapped:status.planted,
    requested:status.requested,active:status.visible,profile:status.profile,sources:status.sources,
    failures:status.failures}));
  return status;
}
