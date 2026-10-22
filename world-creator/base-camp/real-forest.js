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
      angle:rand()*Math.PI*2});
    if(placements.length>=2050)return placements;
  }
  return placements;
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
  const status={state:"loading",planted:0,sources:[],failures:[],requested:0};
  const positions=createPositions(options);
  status.requested=positions.length;
  options.report?.("Loading photo-textured trees…");
  const loader=new GLTFLoader();
  const settled=await Promise.allSettled(SOURCES.map(s=>loadParts(THREE,loader,s)));
  const chunkSize=118,dummy=new THREE.Object3D(),group=new THREE.Group();
  group.name="Base Camp licensed photo-textured forest (no geometry proxies)";
  for(let sourceIndex=0;sourceIndex<SOURCES.length;sourceIndex++){
    if(settled[sourceIndex].status!=="fulfilled"){
      const message=SOURCES[sourceIndex].id+": "+String(settled[sourceIndex].reason?.message||settled[sourceIndex].reason);
      status.failures.push(message);console.warn("BASE_CAMP_TREE_ASSET_ERROR",message);
      continue;
    }
    const source=SOURCES[sourceIndex],loaded=settled[sourceIndex].value;
    const selected=positions.filter(p=>p.source===sourceIndex);
    const chunks=new Map();
    for(const tree of selected){
      const k=Math.floor((tree.x+options.radius)/chunkSize)+":"+Math.floor((tree.z+options.radius)/chunkSize);
      if(!chunks.has(k))chunks.set(k,[]);
      chunks.get(k).push(tree);
    }
    for(const [key,trees] of chunks){
      const chunk=new THREE.Group();chunk.name=source.id+"-"+key;
      // Instancing preserves the real imported geometry and textures, while
      // each 118 m forest chunk has its own view-frustum bounds.
      for(const part of loaded.parts){
        const batch=new THREE.InstancedMesh(part.geometry,part.material,trees.length);
        batch.name=source.id+" / "+part.name;
        batch.castShadow=true;batch.receiveShadow=false;
        for(let i=0;i<trees.length;i++){
          const t=trees[i];
          dummy.position.set(t.x,t.y,t.z);
          dummy.rotation.set(0,t.angle,0);
          dummy.scale.setScalar(t.height/loaded.height);
          dummy.updateMatrix();
          batch.setMatrixAt(i,dummy.matrix);
        }
        batch.instanceMatrix.needsUpdate=true;
        batch.computeBoundingSphere();
        chunk.add(batch);
      }
      group.add(chunk);
    }
    status.planted+=selected.length;
    status.sources.push({name:source.id,trees:selected.length,parts:loaded.parts.length});
  }
  scene.add(group);
  status.state=status.planted?"ready": "error";
  status.group=group;
  options.report?.(status.planted
    ?status.planted+" real PBR trees loaded ("+status.sources.map(s=>s.name).join(" + ")+")"+(status.failures.length?" · some assets failed":"")
    :"Forest photo assets unavailable — no generic substitute");
  console.info("BASE_CAMP_REAL_FOREST",JSON.stringify({planted:status.planted,requested:status.requested,sources:status.sources,failures:status.failures}));
  return status;
}
