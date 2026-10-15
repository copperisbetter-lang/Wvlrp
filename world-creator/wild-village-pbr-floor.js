/**
 * The Wild - authentic CC0 forest-floor models in the village's three-acre
 * perimeter. Never uses procedural stand-ins or legacy generic vegetation.
 * Model binaries are installed by the dedicated GitHub workflow.
 */
import {hash} from "./world-core.js";
import {VILLAGE_SECTION} from "./wild-acre-regions.js";
import {VILLAGE_CLEARING,COMMUNITY_SITES,pathDistance,siteDistance,gradeCommunityGround} from "./wild-reference-layout.js";
import {cabinGrade} from "./wild-nature.js";

const MANIFEST="./assets/village-floor-sources.json";
const FILES=Object.freeze({
  fern:"fern_02",
  rock:"rock_moss_set_01",
  stump:"tree_stump_01",
  log:"dead_tree_trunk"
});
const CAPS_MOBILE=Object.freeze({fern:65,rock:14,stump:7,log:7});
const CAPS_DESKTOP=Object.freeze({fern:110,rock:24,stump:12,log:12});

export function planVillageForestFloor(seed,mobile=false){
  const caps=mobile?CAPS_MOBILE:CAPS_DESKTOP;
  const counts={fern:0,rock:0,stump:0,log:0},items=[];
  const spacing=mobile?5.2:4.3;
  for(let x=VILLAGE_SECTION.minX+2;x<VILLAGE_SECTION.maxX-1;x+=spacing){
    for(let z=VILLAGE_SECTION.minZ+2;z<VILLAGE_SECTION.maxZ-1;z+=spacing){
      const px=x+(hash(x,z,seed+3401)-.5)*spacing*.7;
      const pz=z+(hash(x,z,seed+3402)-.5)*spacing*.7;
      if(px<VILLAGE_SECTION.minX+1||px>VILLAGE_SECTION.maxX-1||
         pz<VILLAGE_SECTION.minZ+1||pz>VILLAGE_SECTION.maxZ-1)continue;
      // The gathering plaza, fire ring, all three buildings and access
      // trails must remain unobstructed by fern clumps, stones and timber.
      if(Math.hypot(px-VILLAGE_CLEARING.centerX,pz-VILLAGE_CLEARING.centerZ)<41)continue;
      if(pz>120&&px>68&&px<118)continue; // mountain sightline
      const roll=hash(x,z,seed+3403);
      const kind=roll<.39?"fern":roll<.445?"rock":
        roll<.467?"log":roll<.485?"stump":null;
      if(!kind||counts[kind]>=caps[kind])continue;
      const distanceToPath=pathDistance(px,pz);
      const distanceToBuilding=Math.min(...COMMUNITY_SITES.map(site=>siteDistance(px,pz,site)));
      const clearance=kind==="fern"?3.3:kind==="rock"?4.8:7;
      if(distanceToPath<clearance||distanceToBuilding<clearance+1.4)continue;
      if(Math.hypot(px-VILLAGE_CLEARING.fireX,pz-VILLAGE_CLEARING.fireZ)<16)continue;
      const size=kind==="fern"?.7:kind==="rock"?1.7:kind==="log"?3.2:1.25;
      items.push(Object.freeze({
        kind,sourceId:FILES[kind],x:px,z:pz,
        spanMetres:size*(.8+hash(x,z,seed+3404)*.38),
        yawRadians:hash(x,z,seed+3405)*Math.PI*2
      }));
      counts[kind]++;
    }
  }
  return items;
}

function modelBounds(root){
  const meshes=root.getChildMeshes(false).filter(mesh=>mesh.getTotalVertices?.()>0);
  let minX=Infinity,minY=Infinity,minZ=Infinity;
  let maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(const mesh of meshes){
    mesh.computeWorldMatrix(true);
    const box=mesh.getBoundingInfo().boundingBox;
    minX=Math.min(minX,box.minimumWorld.x);
    minY=Math.min(minY,box.minimumWorld.y);
    minZ=Math.min(minZ,box.minimumWorld.z);
    maxX=Math.max(maxX,box.maximumWorld.x);
    maxY=Math.max(maxY,box.maximumWorld.y);
    maxZ=Math.max(maxZ,box.maximumWorld.z);
  }
  return {minX,minY,minZ,maxX,maxY,maxZ,count:meshes.length,
    span:Math.max(maxX-minX,maxY-minY,maxZ-minZ)};
}

export function installVillageForestFloor(B,scene,{seed,mobile=false,startAfter}={}){
  const plan=planVillageForestFloor(seed,mobile);
  const state={status:"waiting",requested:plan.length,planted:0,sourceIds:[],
    counts:{fern:0,rock:0,stump:0,log:0},error:"",roots:[]};
  const group=new B.TransformNode("VILLAGE THREE ACRES: licensed PBR native forest floor",scene);
  state.group=group;
  const start=async()=>{
    state.status="loading";
    let manifest;
    try{
      const response=await fetch(MANIFEST,{cache:"no-store"});
      if(!response.ok)throw Error("Forest-floor PBR assets not installed (HTTP "+response.status+")");
      manifest=await response.json();
      if(!Array.isArray(manifest))throw Error("Invalid forest-floor asset manifest");
      manifest=manifest.filter(item=>Object.values(FILES).includes(item.id)&&
        item.license==="CC0"&&item.url==="./assets/village-floor-"+item.id+".glb");
      if(!manifest.length)throw Error("No verified forest-floor models");
    }catch(err){
      state.status="awaiting-real-assets";state.error=String(err.message||err);return;
    }
    const sources=new Map();
    for(const asset of manifest){
      try{
        const container=await B.SceneLoader.LoadAssetContainerAsync("",asset.url,scene);
        if(!container.meshes.some(mesh=>mesh.getTotalVertices?.()>0))
          throw Error("No source geometry in "+asset.id);
        sources.set(asset.id,container);state.sourceIds.push(asset.id);
      }catch(err){console.warn("PBR forest-floor file unavailable",asset.id,err);}
    }
    for(const item of plan){
      const container=sources.get(item.sourceId);
      if(!container)continue;
      let records=null;
      try{
        records=container.instantiateModelsToScene(name=>"pbr-floor-"+item.kind+"-"+name,false,
          {doNotInstantiate:false});
        const root=new B.TransformNode("Authentic "+item.kind+" "+item.x.toFixed(1),scene);
        for(const node of records.rootNodes)node.parent=root;
        const raw=modelBounds(root);
        if(!raw.count||!Number.isFinite(raw.span)||raw.span<.01)
          throw Error("Invalid source size for "+item.sourceId);
        root.scaling.setAll(item.spanMetres/raw.span);
        root.rotation.y=item.yawRadians;
        const adjusted=modelBounds(root);
        const ground=gradeCommunityGround(item.x,item.z,cabinGrade(item.x,item.z,seed),
          p=>cabinGrade(p.x,p.z,seed));
        root.position.set(item.x-(adjusted.minX+adjusted.maxX)*.5,
          ground-adjusted.minY+.015,item.z-(adjusted.minZ+adjusted.maxZ)*.5);
        root.parent=group;
        for(const mesh of root.getChildMeshes(false)){
          mesh.isPickable=false;mesh.checkCollisions=false;
        }
        state.roots.push(root);state.planted++;state.counts[item.kind]++;
      }catch(err){
        console.warn("PBR forest-floor model could not be placed",item.sourceId,err);
        records?.rootNodes?.forEach(node=>node.dispose(false,true));
      }
      // Don't lock up a modest Android while Babylon creates lots of instances.
      if(state.planted%8===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    state.status=state.planted===plan.length?"ready":state.planted?"partial":"unplanted";
    if(!state.planted)state.error="No forest-floor GLB instances could be planted";
  };
  state.ready=Promise.resolve(startAfter).then(start).catch(err=>{
    state.status="error";state.error=String(err?.message||err);
  });
  state.setNear=near=>group.setEnabled(Boolean(near));
  return state;
}
