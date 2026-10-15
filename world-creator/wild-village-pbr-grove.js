/**
 * The Wild — optional licensed 3D village grove.
 *
 * Loads authentic authored PBR mesh assets, never procedural generic trees.
 * Installers publish /assets/village-grove-sources.json only after validating
 * several genuinely independent textures + GLB assets. Missing assets are
 * explicit; the old scene remains walkable and its hero PBR test tree stays.
 */
import {VILLAGE_PROPOSED_TREES} from "./wild-village-planting-blueprint.js";
import {VILLAGE_SECTION} from "./wild-acre-regions.js";
import {cabinGrade} from "./wild-nature.js";
import {gradeCommunityGround} from "./wild-reference-layout.js";

const MANIFEST_URL="./assets/village-grove-sources.json";
const VALID_ASSETS=Object.freeze(new Set([
  "fir_tree_01","pine_tree_01","fir_sapling_medium",
  "pine_sapling_medium","pine_sapling_small","fir_sapling",
  "island_tree_01","island_tree_02","island_tree_03",
  "tree_small_02","jacaranda_tree"
]));
const CONIFERS=new Set(["eastern-hemlock","eastern-white-pine","virginia-pine"]);
const MAX_PER_ASSET_MOBILE=14;
const MIN_MODELS=7;

// Visually plausible but not botanically exact substitutions are *not*
// documented as a matched species. The native species list is an art target.
// Nearby placements are considered so the same authored tree is not repeated
// down an entire woodland edge. All selection is deterministic for multiplayer.
export function chooseGroveAsset(tree,available,placed=[]){
  const find=id=>available.find(a=>a.id===id);
  const young=tree.age==="young";
  let preference;
  if(CONIFERS.has(tree.species)){
    preference=young?["fir_sapling_medium","pine_sapling_medium","fir_sapling","pine_sapling_small","fir_tree_01","pine_tree_01"]:
      ["fir_tree_01","pine_tree_01","fir_sapling_medium","pine_sapling_medium","fir_sapling","pine_sapling_small"];
  }else{
    // DISTINCT, genuinely photo-textured author-built crown silhouettes.
    // Imported broadleaf models are visual stand-ins; they are NOT certified
    // examples of West Virginia oaks, maples, beeches or other named species.
    const edge=tree.x<46||tree.x>141;
    const broadleaf=young?
      ["tree_small_02","island_tree_02","island_tree_03","island_tree_01"]:
      ["tree_small_02","island_tree_01","island_tree_03","island_tree_02"];
    // Jacaranda is visibly different but nonnative: use rarely, outside only.
    if(edge&&!young)broadleaf.splice(2,0,"jacaranda_tree");
    preference=broadleaf;
  }
  const offset=(Math.floor(tree.x*37+tree.z*17)>>>0)%Math.max(1,preference.length);
  const candidates=preference.map((id,i)=>({asset:find(id),rank:i}))
    .filter(candidate=>candidate.asset);
  if(!candidates.length)return null; // Missing broadleaf? Do not use a fir.
  // Keep the original seeded selection when checking an isolated tree.
  if(!placed.length){
    for(let i=0;i<preference.length;i++){
      const found=find(preference[(i+offset)%preference.length]);
      if(found)return found;
    }
  }
  const count=new Map();
  for(const p of placed)count.set(p.sourceId,(count.get(p.sourceId)||0)+1);
  let best=null,bestScore=Infinity;
  for(const {asset,rank} of candidates){
    let score=(count.get(asset.id)||0)*3.5;
    // Prefer appropriate age/proportions after spatial diversity.
    score+=rank*.6;
    // Force variation between immediately neighboring trunks where possible.
    // 22m is a visual-repeat zone, not a tree-collision distance.
    for(const p of placed){
      if(p.sourceId!==asset.id)continue;
      const distance=Math.hypot(tree.x-p.x,tree.z-p.z);
      if(distance<12)score+=110;
      else if(distance<22)score+=43;
      else if(distance<38)score+=11;
    }
    // Stable rotation of tie-breaking priority: no network randomness.
    score+=((rank-offset+preference.length)%preference.length)*.13;
    if(score<bestScore){best=asset;bestScore=score;}
  }
  return best;
}

function worldBounds(nodes){
  let minX=Infinity,minY=Infinity,minZ=Infinity;
  let maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  const meshes=nodes.flatMap(node=>
    [node,...(node.getChildMeshes?.(false)||[])])
    .filter(m=>m?.getTotalVertices?.()>0);
  for(const mesh of meshes){
    mesh.computeWorldMatrix(true);
    const box=mesh.getBoundingInfo().boundingBox;
    minX=Math.min(minX,box.minimumWorld.x);minY=Math.min(minY,box.minimumWorld.y);
    minZ=Math.min(minZ,box.minimumWorld.z);maxX=Math.max(maxX,box.maximumWorld.x);
    maxY=Math.max(maxY,box.maximumWorld.y);maxZ=Math.max(maxZ,box.maximumWorld.z);
  }
  return {minX,minY,minZ,maxX,maxY,maxZ,meshes:meshes.length};
}

function showError(state,err){
  state.status="error";
  state.error=String(err?.message||err);
  console.warn("Realistic village grove unavailable:",err);
}

export function installVillageGrove(B,scene,{seed,mobile=false}={}){
  const state={
    status:"loading-manifest",error:"",requested:VILLAGE_PROPOSED_TREES.length,
    planted:0,loadedModels:0,skippedNoModel:0,collidableTrees:[],sourceIds:[],
    roots:[],group:null
  };
  const group=new B.TransformNode("VILLAGE THREE ACRES: authentic PBR tree collection",scene);
  state.group=group;
  const start=async()=>{
    let manifest;
    try{
      const reply=await fetch(MANIFEST_URL,{cache:"no-store"});
      if(!reply.ok)throw Error("PBR grove asset list not installed (HTTP "+reply.status+")");
      manifest=await reply.json();
      if(!Array.isArray(manifest))throw Error("Invalid licensed-model manifest");
      manifest=manifest.filter(m=>VALID_ASSETS.has(m.id)&&m.license==="CC0"&&
        m.url===`./assets/village-pbr-${m.id}.glb`);
      if(manifest.length<MIN_MODELS)throw Error("Not enough independent real models: "+manifest.length);
    }catch(err){
      state.status="awaiting-real-assets";
      state.error=String(err?.message||err);
      return;
    }
    // Each real model is fetched/decoded ONE time. All its subsequent uses
    // are Babylon instances sharing actual source geometry and materials.
    const sources=new Map();
    for(const m of manifest){
      try{
        const container=await B.SceneLoader.LoadAssetContainerAsync("",m.url,scene);
        const hasGeometry=container.meshes.some(mesh=>mesh.getTotalVertices?.()>0);
        if(!hasGeometry)throw Error("No authored geometry in "+m.id);
        sources.set(m.id,container);state.loadedModels++;
        state.sourceIds.push(m.id);
      }catch(err){console.warn("Grove GLB not loaded:",m.id,err);}
    }
    if(sources.size<MIN_MODELS){
      state.status="insufficient-models";
      state.error="Only "+sources.size+" independently modeled source trees available";
      return;
    }
    const available=manifest.filter(m=>sources.has(m.id));
    const usage=new Map();
    const placed=[];
    for(const tree of VILLAGE_PROPOSED_TREES){
      // Cap duplicates: genuine model variety rather than one tree pasted 30x.
      const choices=available.filter(m=>(usage.get(m.id)||0)<
        (m.id==="jacaranda_tree"?4:mobile?MAX_PER_ASSET_MOBILE:15));
      const asset=chooseGroveAsset(tree,choices,placed);
      if(!asset){state.skippedNoModel++;continue;}
      const container=sources.get(asset.id);
      let records;
      try{
        records=container.instantiateModelsToScene(
          name=>`village-grove-${tree.id}-${name}`,false,
          {doNotInstantiate:false});
        const root=new B.TransformNode(`GROVE real ${asset.id} tree at ${tree.x},${tree.z}`,scene);
        for(const node of records.rootNodes)node.parent=root;
        // A separate individual TransformNode preserves authored source
        // hierarchy. Measure world geometry rather than assuming source units.
        const raw=worldBounds([root]);
        const height=raw.maxY-raw.minY;
        if(!Number.isFinite(height)||height<.08||!raw.meshes)
          throw Error("Unexpected source bounds for "+asset.id);
        const scale=tree.targetHeightMetres/height;
        root.scaling.setAll(scale);
        root.rotation.y=tree.yawRadians;
        const adjusted=worldBounds([root]);
        const terrainY=gradeCommunityGround(tree.x,tree.z,cabinGrade(tree.x,tree.z,seed),
          p=>cabinGrade(p.x,p.z,seed));
        root.position.set(tree.x-(adjusted.minX+adjusted.maxX)/2,
          terrainY-adjusted.minY+.025,
          tree.z-(adjusted.minZ+adjusted.maxZ)/2);
        root.parent=group;
        root.computeWorldMatrix(true);
        for(const mesh of root.getChildMeshes(false)){
          mesh.isPickable=false;
          mesh.checkCollisions=false;
        }
        state.roots.push(root);
        state.collidableTrees.push({x:tree.x,y:tree.z,
          radius:tree.age==="young"?.60:1.15,id:tree.id});
        state.planted++;
        usage.set(asset.id,(usage.get(asset.id)||0)+1);
        placed.push({x:tree.x,z:tree.z,sourceId:asset.id});
      }catch(err){
        console.warn("Cannot install real tree",tree.id,err);
        records?.rootNodes?.forEach(n=>n.dispose(false,true));
      }
      // Yield between groups of meshes to keep mobile screen responsive.
      if(state.planted%5===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    state.status=state.planted?"ready":"unplanted";
    if(state.planted===0)state.error="No suitable models for planned village positions";
  };
  state.ready=start().catch(e=>showError(state,e));
  state.setNear=near=>{
    group.setEnabled(Boolean(near));
  };
  return state;
}

export function isNearVillageGrove(x,z,marginMetres=165){
  return x>=VILLAGE_SECTION.minX-marginMetres&&x<=VILLAGE_SECTION.maxX+marginMetres&&
    z>=VILLAGE_SECTION.minZ-marginMetres&&z<=VILLAGE_SECTION.maxZ+marginMetres;
}
