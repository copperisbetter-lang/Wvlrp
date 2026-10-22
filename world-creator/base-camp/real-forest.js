/**
 * The Wild / Base Camp only — photographic PBR forest, 2026-10-21.
 * Stand-alone from the original Wild forest and its world-streamer.
 * Licensed CC0 source meshes already installed in ../assets:
 * Poly Haven tree_small_02 (hardwood visual stand-in) and fir_tree_01
 * (conifer visual stand-in). Exact West Virginia species not yet verified.
 * Never silently replace missing photo-textured models with geometric proxies.
 */
import {GLTFLoader} from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js";

const SOURCES = [
  {id:"photo-hardwood",url:"../assets/village-photoreal-broadleaf.glb"},
  {id:"photo-evergreen",url:"../assets/village-pbr-fir_tree_01.glb"}
];
const SEED = 20261021;
function generator(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};}
function angularGap(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))}
function createPositions({radius,terrainY,lakeRadius,beachZone,pathDistance,paths,perimeterClearings,interiorClearings}){
  const rand=generator(SEED),placements=[];
  const spacing=11.4,cells=Math.ceil((radius-11)/spacing);
  for(let i=-cells;i<=cells;i++)for(let j=-cells;j<=cells;j++){
    if(rand()>.65)continue;
    const x=(i+(rand()-.5)*.8)*spacing,z=(j+(rand()-.5)*.8)*spacing;
    const r=Math.hypot(x,z);
    if(r<49||r>radius-11||lakeRadius(x,z)<1.34||beachZone(x,z))continue;
    if(paths.some(path=>pathDistance(x,z,path)<7.5))continue;
    if(perimeterClearings.some(p=>{
      const sx=p.x*.985,sz=p.z*.985;
      return Math.hypot(x-sx,z-sz)<16 ||
        (r>radius-53 && angularGap(Math.atan2(z,x),p.facingRadians)<.045);
    }))continue;
    if(interiorClearings.some(p=>Math.hypot(x-p.x,z-p.z)<15))continue;
    const localSlope=Math.hypot(terrainY(x+1,z)-terrainY(x-1,z),terrainY(x,z+1)-terrainY(x,z-1))*.5;
    if(localSlope>.72)continue;
    const isEvergreen=rand()<.27;
    placements.push({x,z,y:terrainY(x,z)-.07,
      source:isEvergreen?1:0,
      height:isEvergreen?18+rand()*14:21+rand()*17,
      angle:rand()*Math.PI*2,priority:rand()});
  }
  // Do not truncate by grid traversal order: that leaves the opposite
  // side of the circular world bare. Spread the mobile mesh budget evenly.
  placements.sort((a,b)=>a.priority-b.priority);
  return placements.slice(0,2050);
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
    parts.push({geometry,material:mesh.material,name:(mesh.name+" "+(mesh.material.name||"")).toLowerCase()});
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
  const maxVisible=lowPower?88:320;
  const drawRadius=lowPower?112:205;
  const positions=createPositions(options);
  const status={state:"loading",requested:positions.length,visible:0,planted:0,
    sources:[],failures:[],profile:lowPower?"mobile":"desktop"};
  options.report?.("Loading nearby PBR trees — distant trees stream as you walk…");
  const loader=new GLTFLoader();
  // Fir asset is over 30 MB, broadleaf is 10 MB. Avoid a 40 MB startup
  // download + simultaneous GLB decode on phones. ?forest=full opts in.
  const ids=lowPower&&!fullForest?[0]:[0,1];
  const results=await Promise.allSettled(ids.map(i=>loadParts(THREE,loader,SOURCES[i])));
  const group=new THREE.Group();
  group.name="Base Camp streamed photo-textured forest";
  const records=[];
  for(let n=0;n<ids.length;n++){
    const i=ids[n],source=SOURCES[i],result=results[n];
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
    if(!force && Math.hypot(x-lastX,z-lastZ)<14)return;
    lastX=x;lastZ=z;
    let visible=0;
    // The visible set moves with the player. This keeps high-resolution
    // source meshes at eye level without uploading distant campsite trees.
    const perSourceCap=Math.max(1,Math.floor(maxVisible/Math.max(1,records.length)));
    for(const rec of records){
      const near=[];
      for(const t of rec.pool){
        const d2=(t.x-x)**2+(t.z-z)**2;
        if(d2<=drawRadius*drawRadius)near.push({t,d2});
      }
      near.sort((a,b)=>a.d2-b.d2);
      const count=Math.min(perSourceCap,near.length);
      for(let k=0;k<count;k++){
        const t=near[k].t;
        dummy.position.set(t.x,t.y,t.z);
        dummy.rotation.set(0,t.angle,0);
        dummy.scale.setScalar(t.height/rec.height);
        dummy.updateMatrix();
        for(const mesh of rec.batches)mesh.setMatrixAt(k,dummy.matrix);
      }
      for(const mesh of rec.batches){
        mesh.count=count;
        mesh.instanceMatrix.needsUpdate=true;
      }
      visible+=count;
    }
    status.visible=visible;
    options.report?.(visible+" nearby photo-textured trees active · "+status.planted+
      " mapped across the world"+(lowPower&&!fullForest?" · phone-safe mode":"")+
      (status.failures.length?" · "+status.failures.length+" asset error(s)":""));
  };
  status.group=group;
  status.update=update;
  status.state=records.length?"ready":"error";
  if(records.length)update(options.startX??0,options.startZ??15,true);
  else options.report?.("Forest source files unavailable — no fake trees substituted");
  console.info("BASE_CAMP_REAL_FOREST",JSON.stringify({state:status.state,mapped:status.planted,
    requested:status.requested,active:status.visible,profile:status.profile,sources:status.sources,
    failures:status.failures}));
  return status;
}
