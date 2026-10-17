import {flatlandHeight} from "./wild-rebuild-layout.js";
import {installMasterHDForest} from "./wild-master-hd-forest.js?v=20261017-master-v1";

import {installDoorTree} from "./wild-girls-cabin-door-tree.js?v=door-tree-20261016-v1";
import {installTreeInspectionLine} from "./wild-tree-inspection-line.js?v=20261016-world-anchor-v10";
import {installWildMinimap} from "./wild-minimap.js?v=20261016-v1";
/**
 * Walk The Wild: stand outside Hearthside Cabin and explore a seeded WV world.
 * Lower-left virtual joystick, touch-look on right, and WASD/mouse controls.
 * The real cabin and real bundled GLB avatars are preserved; no blob NPCs.
 */
import { STORAGE_KEY,newWorld,sanitizedWorld,seedNumber,gatherCabinCrew,HEARTHSIDE_CABIN } from "./world-core.js?v=woodland-village-20261013-v1";
import { cabinGrade, waterAt } from "./wild-nature.js?v=preserved-forest-20261013-v7";
import {renderRebuiltLandscape as renderWildLandscape} from "./wild-flatland-rebuild.js?v=both-ranger-timber-repair-20261016-v3";
import {NORTH_RANGER_STATION,rangerWallCollision} from "./wild-ranger-station.js?v=ranger-360-playable-20261015-v10-original-ranger-android-pbr-20261016-v4";
import {PHOTO_RANGER_STATION,photoRangerCollision,photoRangerDeckBlend} from "./wild-ranger-photo-build.js?v=photo-ranger-texture-rake-20261016-v2";
import {installVillageGrove,isNearVillageGrove} from "./wild-village-pbr-grove.js?v=actual-model-diversity-20261014-v5";
import {installVillageForestFloor} from "./wild-village-pbr-floor.js?v=authentic-forest-floor-20261014-v1";
import {installVillageOak,VILLAGE_OAK} from "./wild-village-hero-oak.js?v=polyhaven-pbr-20261014-v1";
import {VILLAGE_SQUARE_TREES_ENABLED,VILLAGE_HD_OAK_ENABLED} from "./wild-village-detail-spec.js?v=one-hd-oak-20261014-v2";
import { buildHearthsideCabin } from "./cabin-builder.js?v=hearthside-cabin-v5";
import {COMMUNITY_SITES,VILLAGE_CLEARING} from "./wild-reference-layout.js?v=village-10acre-prototype-clear-20261014-v1";
import {createWildPlayerMap} from "./wild-player-map.js?v=flatland-connected-camps-20261015-v1";
import {clearingAt} from "./wild-rebuild-layout.js?v=flatland-status-20261015-v1";
import {createFourCabinTest} from "./wild-cabin-lineup.js?v=cgtrader-two-private-tests-20261015-v8";
import {createBuildingMaterialYard,MATERIAL_YARD} from "./wild-material-yard.js?v=walkable-real-pbr-samples-20261015-v1";

import {installGirlsCabinWillow} from "./wild-girls-cabin-willow.js?v=willow-20261016-v1";
import {installGirlsCabinLiveGrove} from "./girls-cabin-live-grove.js?v=20261017-terrain-match-v5";
const B=window.BABYLON;
const canvas=document.getElementById("world");
const message=document.getElementById("message");
const info=document.getElementById("info");
const joystick=document.getElementById("joystick");
const stick=document.getElementById("stick");
const crewButton=document.getElementById("crew");
// Jenny is the first quest guide, but cannot spawn publicly before model QA.
const jennyQuestButton=document.getElementById("jennyQuest");
const jennyQuestPanel=document.getElementById("jennyQuestPanel");
if(jennyQuestButton&&jennyQuestPanel){
  jennyQuestButton.addEventListener("click",()=>{
    jennyQuestPanel.hidden=!jennyQuestPanel.hidden;
    jennyQuestButton.setAttribute("aria-expanded",String(!jennyQuestPanel.hidden));
  });
  document.getElementById("jennyQuestClose")?.addEventListener("click",()=>{
    jennyQuestPanel.hidden=true;
    jennyQuestButton.setAttribute("aria-expanded","false");
  });
}

const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
// Direct link ?spawn=ranger places the walking player outside the ranger porch.
// Hearthside remains the default on ordinary walk links; resident NPCs stay put.
const betaParams=new URLSearchParams(window.location.search);
// Manual ?lite=1 fallback plus automatic support for 1-2 GB phones.
// Keep full landscape quality on modern Android phones and desktop.
const LITE_MODE=mobile&&(betaParams.get("lite")==="1"||
  (Number(navigator.deviceMemory)>0&&Number(navigator.deviceMemory)<=4));
const BETA_MODE=betaParams.get("mode")==="beta";
const START_AT_RANGER=betaParams.get("spawn")==="ranger";
const START_AT_PHOTO_RANGER=betaParams.get("spawn")==="ranger-photo";
const CAITLYN_PATROL=betaParams.get("caitlyn")==="patrol";
const START_AT_COMPARE=betaParams.get("compare")==="1"||CAITLYN_PATROL;
const START_AT_MATERIALS=betaParams.get("materials")==="1";
const RANGER_SPAWN=Object.freeze({x:NORTH_RANGER_STATION.x,z:NORTH_RANGER_STATION.z-13,
  tileX:NORTH_RANGER_STATION.x,tileZ:NORTH_RANGER_STATION.z});
const PHOTO_RANGER_SPAWN=Object.freeze({x:PHOTO_RANGER_STATION.x,z:PHOTO_RANGER_STATION.z-17,
  tileX:PHOTO_RANGER_STATION.x,tileZ:PHOTO_RANGER_STATION.z});
// Disperse visitors in the open village approach to prevent overlapping
// first-person spawns (which would conceal another visitor's body).
const betaSpawnAngle=BETA_MODE?Math.random()*Math.PI*2:0;
const betaSpawnRadius=BETA_MODE?3.2+Math.random()*2.3:0;
const betaSpawnX=Math.sin(betaSpawnAngle)*betaSpawnRadius;
const betaSpawnZ=Math.cos(betaSpawnAngle)*betaSpawnRadius;
if(BETA_MODE){
  document.body.classList.add("beta-game");
  const back=document.querySelector(".actions a.link");
  if(back){back.href="../adventure-portal.html";back.textContent="← Adventures";}
}
const status=s=>{message.textContent=s;};
let world;
try{world=sanitizedWorld(JSON.parse(localStorage.getItem(STORAGE_KEY)));}
catch{world=newWorld();}
// Preserve ALL saved NPCs, individual appearances and character GLB keys.
// Old landscape and buildings are disabled at render time, never deleted
// from storage; the current pre-reset world is backed up in GitHub.
gatherCabinCrew(world);
const seed=seedNumber(world.seed);
const cabin=world.objects.find(o=>o.id===HEARTHSIDE_CABIN.id);
const cabinY=cabinGrade(0,0,seed);
const cabinCrew=world.objects.filter(o=>o.type==="npc"&&o.modelKey);
const GLBS={
  riley:"./assets/riley-rigged-v1.glb?v=approved-112-70-88-continuous-hair-v6",
  amy:"./assets/amy-mpfb-trial.glb?v=cc0-face-texture-published-20261011-v2",
  chrissy:"./assets/chrissy-mpfb-trial.glb?v=cc0-face-texture-published-20261011-v2",
  caitlyn:"./assets/caitlyn-mpfb-trial.glb?v=caitlyn-fit-blue-dress-waves-v12",
  mason:"./assets/mason-mpfb-trial.glb?v=mason-20261011-v2",
  sha:"./assets/sha-mpfb-trial.glb?v=sha-20261012-v1",
  sav:"./assets/sav-realistic-shell.glb?v=sav-prototype-cabin-v1"
};
if(!B){status("3D engine unavailable. Reload while connected to the internet.");throw Error("Babylon.js unavailable");}
const engine=new B.Engine(canvas,true,{antialias:!mobile,stencil:true,preserveDrawingBuffer:false});
engine.setHardwareScalingLevel(LITE_MODE?1.9:mobile?1.4:1);
const scene=new B.Scene(engine);
if(new URLSearchParams(location.search).get("carolTest")==="1"){
 import("./carol-cabin-test.js?v=20261016-porchfix2").then(m=>new Promise(resolve=>setTimeout(resolve,1200)).then(()=>m.startCarolTest(B,scene,camera,cabinGrade,seed))).catch(e=>console.error("Carol test:",e));
}

// Clear, sunny afternoon: enough diffuse skylight reaches forest-floor plants
// beneath the dense native canopy, without making all foliage fluorescent.
scene.clearColor=new B.Color4(.67,.82,.95,1);
scene.fogMode=B.Scene.FOGMODE_EXP2;
// Let players see real ridgelines roughly 1–2 km beyond the flat valley.
scene.fogDensity=.00038;
scene.fogColor=new B.Color3(.67,.79,.87);
scene.skipPointerMovePicking=true;
scene.imageProcessingConfiguration.exposure=1.14;
scene.imageProcessingConfiguration.contrast=1.05;
const sky=new B.HemisphericLight("blue-sky bounce",new B.Vector3(.35,1,.21),scene);
sky.intensity=1.2;
sky.diffuse=new B.Color3(.94,.97,1);
sky.groundColor=new B.Color3(.39,.43,.34);
const sunLook=new B.Vector3(.25,.77,-.58).normalize();
const sun=new B.DirectionalLight("bright Appalachian afternoon sun",sunLook.scale(-1),scene);
sun.diffuse=new B.Color3(1,.96,.85);
sun.intensity=1.55;
const EYE_HEIGHT=1.98; // taller adult walking viewpoint, measured from visible terrain
const camera=new B.FreeCamera("first-person explorer",
  new B.Vector3(START_AT_PHOTO_RANGER?PHOTO_RANGER_SPAWN.x:START_AT_RANGER?RANGER_SPAWN.x:START_AT_MATERIALS?MATERIAL_YARD.spawnX:0,
    START_AT_PHOTO_RANGER?cabinGrade(PHOTO_RANGER_SPAWN.x,PHOTO_RANGER_SPAWN.z,seed)+EYE_HEIGHT:
    START_AT_RANGER?cabinGrade(RANGER_SPAWN.x,RANGER_SPAWN.z,seed)+EYE_HEIGHT:
      START_AT_MATERIALS?cabinGrade(MATERIAL_YARD.spawnX,MATERIAL_YARD.spawnZ,seed)+EYE_HEIGHT:START_AT_COMPARE?cabinGrade(0,274,seed)+EYE_HEIGHT:cabinY+EYE_HEIGHT,
    START_AT_PHOTO_RANGER?PHOTO_RANGER_SPAWN.z:START_AT_RANGER?RANGER_SPAWN.z:START_AT_MATERIALS?MATERIAL_YARD.spawnZ:START_AT_COMPARE?274:16),scene);
/* Autumn maples are loaded independently; missing assets never break walking.
 * Campsite/structure exclusion is conservative until exact plot polygons exist.
 */
const masterForest=installMasterHDForest(B,scene,{
 seed,terrainHeight:(x,z)=>flatlandHeight(x,z,seed,cabinGrade(0,0,seed)),
 excluded:(x,z,clearance)=>[[0,0,42],[93,77,55],[90,78,40],[90,75,40],[0,274,40],[30,333,50]]
   .some(([cx,cz,r])=>Math.hypot(x-cx,z-cz)<r+clearance)
});
const autumnMaples=masterForest.maple;
const nativeConifers=masterForest.conifer;
window.__wildMasterForest=masterForest;
window.__wildAutumnMaples=autumnMaples;
window.__wildNativeConifers=nativeConifers;

// On-phone grounding telemetry: no developer console or screenshots required.
// Report numerical offsets from the actual running Android game.
const mapleDebug=document.createElement("div");
mapleDebug.id="maple-ground-debug";
mapleDebug.style.cssText="position:fixed;right:8px;top:50%;z-index:1000;background:#102820e8;color:#fff;padding:8px;border:1px solid #e4bd55;border-radius:8px;font:12px monospace;max-width:220px;pointer-events:none;white-space:pre-wrap";
mapleDebug.textContent="MAPLE v8: loading";
document.body.appendChild(mapleDebug);
let mapleDebugFrames=0;
scene.onBeforeRenderObservable.add(()=>{
  if(++mapleDebugFrames%90!==0)return;
  const p=autumnMaples.placements||[];
  const errors=p.map(t=>{
    const ground=flatlandHeight(t.x,t.z,seed,cabinGrade(0,0,seed));
    const bottom=Math.min(...t.trunkMeshes.map(m=>{m.computeWorldMatrix(true);return m.getBoundingInfo().boundingBox.minimumWorld.y;}));
    return bottom-ground;
  }).filter(Number.isFinite);
  const max=errors.length?Math.max(...errors.map(Math.abs)):0;
  mapleDebug.textContent="MAPLE v10 "+autumnMaples.status+" ("+p.length+") "+(autumnMaples.error||"")+"\\n"+
    "max offset "+max.toFixed(2)+"m\\n"+
    "first 6: "+errors.slice(0,6).map(v=>v.toFixed(1)).join(", ");
});


camera.minZ=.07;camera.maxZ=2900;camera.fov=1.13;
camera.rotation.set(0,START_AT_PHOTO_RANGER||START_AT_RANGER||START_AT_COMPARE||START_AT_MATERIALS?0:Math.PI,0);
scene.activeCamera=camera;
// Clean photographic landscape test: retire every blocky distant ridge,
// rock wall and skyline mesh. Keep only the real sky, photographic ground,
// Hearthside Cabin and its protected GLB residents. No scenery imports.
const villageMountains={meshes:[]};
// A small, softly glowing visible sun follows the camera's *position*, not
// its rotation, so its direction stays fixed in the real 3D sky while walking.
// The quad is behind nearby trees, has no fog, and costs only one draw call.
const sunlightTexture=new B.DynamicTexture("sun disc and soft haze",{width:128,height:128},scene,false);
const sunlightCtx=sunlightTexture.getContext();
const sunlightGradient=sunlightCtx.createRadialGradient(64,64,0,64,64,64);
sunlightGradient.addColorStop(0,"rgba(255,255,247,1)");
sunlightGradient.addColorStop(.07,"rgba(255,251,218,.98)");
sunlightGradient.addColorStop(.15,"rgba(255,249,205,.68)");
sunlightGradient.addColorStop(.34,"rgba(255,242,204,.24)");
sunlightGradient.addColorStop(.7,"rgba(255,242,207,.055)");
sunlightGradient.addColorStop(1,"rgba(255,244,214,0)");
sunlightCtx.fillStyle=sunlightGradient;
sunlightCtx.fillRect(0,0,128,128);
sunlightTexture.hasAlpha=true;
sunlightTexture.update();
const sunDiscMat=new B.StandardMaterial("sun glow material",scene);
sunDiscMat.diffuseTexture=sunlightTexture;
sunDiscMat.useAlphaFromDiffuseTexture=true;
sunDiscMat.disableLighting=true;
sunDiscMat.emissiveColor=new B.Color3(1,1,1);
sunDiscMat.backFaceCulling=false;
const sunDisc=B.MeshBuilder.CreatePlane("visible afternoon sunlight",{size:66},scene);
sunDisc.material=sunDiscMat;
sunDisc.isPickable=false;
sunDisc.applyFog=false;
sunDisc.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
// Do not attach Babylon's default touch look: one finger operates our custom
// joystick and the other drags to look without firing accidental movement.
const permanent=[];
const keep=o=>{permanent.push(o);return o;};
// The furnished cabin is built from many individually placed beams, logs and
// floor boards. In walking mode these are static: merge identical materials
// into fewer draw calls while retaining their true shape and surface colors.
buildHearthsideCabin(B,scene,keep,0,cabinY,0,true);
const girlsWillow=installGirlsCabinWillow(B,scene,cabinGrade(0,-30,seed));
girlsWillow.setEnabled(false); // Remove failed willow prototype from visible world.
const girlsLiveGrove=installGirlsCabinLiveGrove(B,scene,{seed,cabinGrade});
girlsLiveGrove.ready.then(()=>console.info("GIRLS_CABIN_500_SQM_LIVE_TREES",girlsLiveGrove.status,girlsLiveGrove.planted,girlsLiveGrove.error||""));
// Retire the cabin-door procedural ico-sphere canopy; imported oak specimens remain world-anchored.
const doorTree=installDoorTree(B,scene,cabinGrade(0,-13,seed));
doorTree.setEnabled(false);
const treeTestMode=new URLSearchParams(location.search).has("treeTest");
// Old inspection trees are NOT part of the girls cabin grove. They must not
// load while players walk around the cabin; use explicit ?treeLine=1 only.
const treeInspection=new URLSearchParams(location.search).has("treeLine")
 ? installTreeInspectionLine(B,scene,{seed,cabinGrade,camera})
 : {spots:[],tick(){},loadSelected(){}};
// Removed the bright-green sphere/cylinder test sentinel. It was a cartoon
// placeholder, not a photographic tree. Use world-anchored imported GLBs below.

if(treeTestMode&&treeInspection.spots.length){
 camera.position.set(0,cabinGrade(0,-18,seed)+EYE_HEIGHT,-18);
 camera.rotation.set(0,Math.PI,0);
 document.getElementById("tree-build-proof")?.replaceChildren(document.createTextNode("TREE INSPECTION BUILD 9 • taller visible trees"));
 const panel=document.createElement("div");panel.id="tree-test-status";
 panel.style.cssText="position:fixed;z-index:99998;top:65px;left:8px;max-width:85vw;background:#10281eed;color:#fff;padding:10px;border:2px solid #e6c76d;border-radius:8px;font:12px system-ui;pointer-events:none";
 document.body.appendChild(panel);
 const show=()=>{const p=treeInspection.spots;panel.textContent="TREE TEST • "+p.filter(x=>x.status==="ready").length+"/"+p.length+" loaded • "+p.filter(x=>x.status==="error").length+" errors • first: "+p[0].status+(p[0].error?" ("+(p[0].stack||p[0].error).slice(0,220)+")":"")+" • facing first sample 12m ahead";};
 show();setInterval(show,1500);
 // Mobile inspection controls: jump directly to each planted specimen.
 let selectedTree=0;
 const controls=document.createElement("div");controls.id="tree-inspection-controls";
 controls.style.cssText="position:fixed;z-index:99999;top:145px;right:8px;display:flex;gap:6px;align-items:center;background:#10281ef0;padding:8px;border:2px solid #e6c76d;border-radius:10px";
 const previous=document.createElement("button");previous.textContent="◀";
 const next=document.createElement("button");next.textContent="NEXT TREE ▶";
 const counter=document.createElement("span");counter.style.cssText="color:white;font:bold 12px system-ui";
 controls.append(previous,counter,next);document.body.appendChild(controls);
 const jump=delta=>{
   selectedTree=(selectedTree+delta+treeInspection.spots.length)%treeInspection.spots.length;
   const spot=treeInspection.spots[selectedTree];
   camera.position.set(spot.x,cabinGrade(spot.x,spot.z+12,seed)+EYE_HEIGHT,spot.z+12);
   camera.setTarget(new B.Vector3(spot.x,cabinGrade(spot.x,spot.z,seed)+5,spot.z));
   treeInspection.loadSelected(selectedTree);
   counter.textContent=(selectedTree+1)+"/"+treeInspection.spots.length+" "+spot.id;
   treeInspection.tick();
  updateCaitlynPatrol(Math.min(engine.getDeltaTime()/1000,.05));
 };
 previous.onclick=()=>jump(-1);next.onclick=()=>jump(1);jump(0);
}
window.__treeInspection=()=>treeInspection.spots.map(({id,x,z,status,error,stack})=>({id,x,z,status,error,stack}));
window.__girlsWillowDiagnostics=()=>({position:girlsWillow.position.asArray(),meshCount:girlsWillow.getChildMeshes().length,enabled:girlsWillow.isEnabled(),camera:camera.position.asArray()});
const woodGroups=new Map();
for(const mesh of permanent){
  if(!(mesh instanceof B.Mesh)||!mesh.material||!mesh.getTotalVertices?.())continue;
  if(!woodGroups.has(mesh.material))woodGroups.set(mesh.material,[]);
  woodGroups.get(mesh.material).push(mesh);
}
let combinedCabinMeshes=0;
for(const [mat,meshes] of woodGroups){
  if(meshes.length<2)continue;
  try{
    const joined=B.Mesh.MergeMeshes(meshes,true,true,undefined,false,false);
    if(joined){
      joined.name="Hearthside combined "+mat.name;
      joined.material=mat;
      keep(joined);combinedCabinMeshes++;
    }
  }catch(err){
    console.warn("Cabin static batching was skipped for",mat.name,err.message);
  }
}
const tiles=[];
let tileCx=0,tileCy=0,loadedTiles=0;
function addLandscape(x,z){
  for(const item of tiles.reverse())try{item.dispose();}catch(_){}
  tiles.length=0;
  const root=new B.TransformNode("native wilderness streamed tile",scene);
  root.position.set(x,0,z);
  tiles.push(root);
  function tracked(item){
    if(item instanceof B.AbstractMesh)item.parent=root;
    tiles.push(item);
    return item;
  }
  const result=renderWildLandscape(B,scene,tracked,{cx:x,cy:z,seed,mobile,lite:LITE_MODE});
  tileCx=x;tileCy=z;loadedTiles++;
  status(loadedTiles===1?"Loading genuine photographic terrain. Hearthside Cabin and crew are protected.":"Streaming the next photographic terrain section.");
  return result;
}
let habitat;
try{habitat=addLandscape(START_AT_PHOTO_RANGER?PHOTO_RANGER_SPAWN.tileX:START_AT_RANGER?RANGER_SPAWN.tileX:START_AT_MATERIALS?MATERIAL_YARD.x:0,
    START_AT_PHOTO_RANGER?PHOTO_RANGER_SPAWN.tileZ:START_AT_RANGER?RANGER_SPAWN.tileZ:START_AT_MATERIALS?MATERIAL_YARD.z:START_AT_COMPARE?314:0);}
catch(err){status("Forest render problem: "+err.message);console.error(err);}
// Greenfield rebuild: retire every old forest/village tree and forest-floor
// prop from the LIVE scene, not from the source library. They can be reused
// later after real-species and collision QA, with no lost downloaded GLBs.
const villageOak={status:"rebuild-cleared",meshCount:0,error:"",root:null};
const villageGrove={status:"rebuild-cleared",planted:0,requested:0,
  loadedModels:0,sourceIds:[],broadleafModelsLoaded:0,evergreenModelsLoaded:0,
  plantedBySource:{},certifiedNativeSpeciesModels:0,collidableTrees:[],
  skippedNoModel:0,error:"",setNear(){}};
const villageFloor={status:"rebuild-cleared",sourceIds:[],planted:0,
  requested:0,counts:{fern:0,rock:0,stump:0,log:0},error:"",setNear(){}};
const names=[];
function addNamePlate(o){
  const ground=cabinY+.38;
  const label=keep(new B.DynamicTexture("resident "+o.modelKey,{width:512,height:110},scene,false));
  label.hasAlpha=true;
  label.drawText(o.name.replace(" (test)","").replace(" (male test)",""),
    18,78,"bold 44px Arial","#fff1d2","rgba(11,25,17,.75)",true,true);
  const mat=keep(new B.StandardMaterial("resident label "+o.modelKey,scene));
  mat.diffuseTexture=label;mat.useAlphaFromDiffuseTexture=true;
  mat.emissiveColor=new B.Color3(.65,.61,.52);
  mat.backFaceCulling=false;
  const plane=keep(B.MeshBuilder.CreatePlane("resident name "+o.modelKey,{width:2.15,height:.42},scene));
  plane.position.set(o.x,ground+2.25,o.y);
  plane.billboardMode=B.Mesh.BILLBOARDMODE_ALL;plane.material=mat;
  names.push(plane);
}
const avatarRoots=new Map(),avatarPending=new Map();
async function loadAvatar(o){
  if(!o||avatarRoots.has(o.id)||avatarPending.has(o.id)||!GLBS[o.modelKey])return;
  const task=(async()=>{
    const data=await B.SceneLoader.ImportMeshAsync(null,"",GLBS[o.modelKey],scene,undefined,".glb");
    const meshes=data.meshes||[];
    const roots=meshes.filter(m=>!m.parent||!meshes.includes(m.parent));
    for(const a of data.animationGroups||[])a.stop();
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(const m of meshes){
      if(!m.getBoundingInfo||!m.getTotalVertices||!m.getTotalVertices())continue;
      m.computeWorldMatrix(true);
      const box=m.getBoundingInfo().boundingBox;
      minX=Math.min(minX,box.minimumWorld.x);
      maxX=Math.max(maxX,box.maximumWorld.x);
      minY=Math.min(minY,box.minimumWorld.y);
      maxY=Math.max(maxY,box.maximumWorld.y);
      minZ=Math.min(minZ,box.minimumWorld.z);
      maxZ=Math.max(maxZ,box.maximumWorld.z);
    }
    if(!Number.isFinite(minY)||maxY-minY<.05)throw Error("3D body geometry missing");
    const root=new B.TransformNode("real model "+o.modelKey,scene);
    for(const m of roots)m.parent=root;
    root.scaling.setAll(Math.min(80,(o.modelKey==="mason"?1.82:1.70)/(maxY-minY)));
    root.computeWorldMatrix(true);
    let aX=Infinity,bX=-Infinity,aY=Infinity,aZ=Infinity,bZ=-Infinity;
    for(const m of meshes){
      if(!m.getBoundingInfo||!m.getTotalVertices||!m.getTotalVertices())continue;
      m.computeWorldMatrix(true);
      const box=m.getBoundingInfo().boundingBox;
      aX=Math.min(aX,box.minimumWorld.x);bX=Math.max(bX,box.maximumWorld.x);
      aY=Math.min(aY,box.minimumWorld.y);
      aZ=Math.min(aZ,box.minimumWorld.z);bZ=Math.max(bZ,box.maximumWorld.z);
    }
    root.position.set(o.x-(aX+bX)/2,cabinY+.38+.035-aY,o.y-(aZ+bZ)/2);
    avatarRoots.set(o.id,root);
    // No procedural fallback: these are the real saved GLB bodies only.
    const idle=(data.animationGroups||[]).find(v=>/idle|stand/i.test(v.name));
    if(idle)idle.start(true,1,idle.from,idle.to,false);
    return root;
  })();
  avatarPending.set(o.id,task);
  try{await task;}catch(err){console.warn("Avatar failed",o.name,err);
    status("Could not load "+o.name+" detailed model; no blob will replace it.");}
  finally{avatarPending.delete(o.id);}
}
for(const o of cabinCrew)addNamePlate(o);
const initial=[...cabinCrew.filter(o=>["riley","caitlyn"].includes(o.modelKey))].slice(0,2);
if(initial.length<2)initial.push(...cabinCrew.filter(o=>!initial.includes(o)).slice(0,2-initial.length));
// On constrained phones, do not decode two 16MB cabin avatars while the
// forest and village PBR trees are loading. Visitors can request the crew.
if(!LITE_MODE)for(const o of initial)loadAvatar(o);
crewButton.addEventListener("click",()=>{
  crewButton.disabled=true;crewButton.textContent="Crew requested";
  status("Loading every genuine 3D cabin avatar; this may strain phone memory.");
  // Load sequentially to reduce simultaneous peak memory on Android.
  (async()=>{for(const o of cabinCrew)await loadAvatar(o);status("Cabin crew load attempted: "+avatarRoots.size+" of "+cabinCrew.length+" actual models visible.");})();
});
const willowButton=document.getElementById("willow");
willowButton.addEventListener("click",()=>{
  camera.position.set(0,cameraGround(0,-43)+EYE_HEIGHT,-43);
  camera.rotation.set(0,0,0);
  status("Willow test: looking south toward the tree at Z -30. "+girlsWillow.getChildMeshes().length+" tree meshes loaded.");
});
const resetToCabin=()=>{
  camera.position.set(0,cameraGround(0,16)+EYE_HEIGHT,16);
  camera.rotation.set(0,Math.PI,0);
  document.querySelector(".brand small").textContent="Hearthside Cabin · photographic terrain test";
  info.textContent="Hearthside Cabin · arriving at front porch";
};
document.getElementById("home").addEventListener("click",resetToCabin);
const goToRanger=()=>{
  // The entrance faces south (-Z). Player faces north (+Z), standing on the
  // central woodland footpath, far enough from the steps for a full façade view.
  if(Math.max(Math.abs(tileCx-RANGER_SPAWN.x),Math.abs(tileCy-RANGER_SPAWN.z))>48){
    try{habitat=addLandscape(RANGER_SPAWN.tileX,RANGER_SPAWN.tileZ);}
    catch(err){console.error(err);status("Could not load village scenery: "+err.message);}
  }
  const startX=RANGER_SPAWN.x+betaSpawnX,startZ=RANGER_SPAWN.z+betaSpawnZ;
  camera.position.set(startX,cameraGround(startX,startZ)+cameraEyeHeight(startX,startZ),startZ);
  camera.rotation.set(0,0,0);
  info.textContent="North Ranger Station · 350m north of Hearthside";
  status("North Ranger Station · real CC0 log walls, pine door, and tin roof.");
};
document.getElementById("village")?.addEventListener("click",goToRanger);
const goToPhotoRanger=()=>{
  if(Math.max(Math.abs(tileCx-PHOTO_RANGER_SPAWN.x),
      Math.abs(tileCy-PHOTO_RANGER_SPAWN.z))>48){
    try{habitat=addLandscape(PHOTO_RANGER_SPAWN.tileX,PHOTO_RANGER_SPAWN.tileZ);}
    catch(err){console.error(err);status("Could not load new photo Ranger Station: "+err.message);}
  }
  const x=PHOTO_RANGER_SPAWN.x,z=PHOTO_RANGER_SPAWN.z;
  camera.position.set(x,cameraGround(x,z)+cameraEyeHeight(x,z),z);
  camera.rotation.set(0,0,0);
  info.textContent="Ranger Station · photo-built test · 30m east of original";
  document.querySelector(".brand small").textContent="Photo Ranger Station · separate 3D test";
  status("Photo Ranger Station at (+30,350). Walk forward to inspect porch, roof, door and furnished office.");
};
document.getElementById("photoRanger")?.addEventListener("click",goToPhotoRanger);
let joyX=0,joyY=0,joyPointer=null;
// Capture the facing direction at the start of a joystick gesture, so a
// held LEFT/RIGHT command turns toward a stable heading instead of spinning.
let moveReferenceHeading=null;
let runMode=false,lastCenterTap=-Infinity,tapStartAt=0,tapStartRadius=Infinity,tapMaxRadius=0;
// Allow realistic taps when decoding GLBs briefly stalls a slower phone.
const DOUBLE_TAP_MS=800,CENTER_TAP_RADIUS=27,CENTER_TAP_MAX_MS=500;
function joystickCenterRadius(e){
 const r=joystick.getBoundingClientRect();
 return Math.hypot(e.clientX-(r.left+r.width/2),e.clientY-(r.top+r.height/2));
}
function setRunMode(enabled){
 runMode=enabled;
 joystick.classList.toggle("running",runMode);
 joystick.setAttribute("aria-label",runMode?
   "Movement joystick. Running on. Double tap center to walk.":
   "Movement joystick. Walking. Double tap center to run.");
 status(runMode?"RUN MODE ON · double-tap joystick center to walk.":
   "WALK MODE ON · double-tap joystick center to run.");
}
function joyPosition(e){
  const r=joystick.getBoundingClientRect();
  const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
  const cap=40,length=Math.hypot(dx,dy),mul=length>cap?cap/length:1;
  tapMaxRadius=Math.max(tapMaxRadius,length);
  const sx=dx*mul,sy=dy*mul;
  joyX=Math.abs(sx)<3?0:sx/cap;
  joyY=Math.abs(sy)<3?0:sy/cap;
  stick.style.transform=`translate(${sx}px,${sy}px)`;
}
joystick.addEventListener("pointerdown",e=>{
  if(joyPointer!==null)return;
  e.preventDefault();e.stopPropagation();joyPointer=e.pointerId;
  moveReferenceHeading=camera.rotation.y;
  tapStartAt=performance.now();tapStartRadius=joystickCenterRadius(e);
  tapMaxRadius=tapStartRadius;
  joystick.setPointerCapture(e.pointerId);joyPosition(e);
});
joystick.addEventListener("pointermove",e=>{
  if(e.pointerId!==joyPointer)return;e.preventDefault();joyPosition(e);
});
const resetStick=e=>{
  if(e.pointerId!==joyPointer)return;
  const now=performance.now();
  const centerTap=e.type==="pointerup"&&now-tapStartAt<CENTER_TAP_MAX_MS&&
    tapStartRadius<CENTER_TAP_RADIUS&&tapMaxRadius<CENTER_TAP_RADIUS&&
    joystickCenterRadius(e)<CENTER_TAP_RADIUS;
  joyPointer=null;joyX=joyY=0;moveReferenceHeading=null;
  stick.style.transform="translate(0,0)";
  if(centerTap){
    if(now-lastCenterTap<=DOUBLE_TAP_MS){
      lastCenterTap=-Infinity;
      setRunMode(!runMode);
    }else lastCenterTap=now;
  }else lastCenterTap=-Infinity;
};
joystick.addEventListener("pointerup",resetStick);
joystick.addEventListener("pointercancel",resetStick);
let lookPointer=null,lastX=0,lastY=0;
canvas.addEventListener("pointerdown",e=>{
  if(lookPointer!==null||e.pointerType==="mouse"&&e.button!==0)return;
  e.preventDefault();lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{
  if(lookPointer!==e.pointerId)return;
  const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
  camera.rotation.y+=dx*(e.pointerType==="mouse"?.0035:.0045);
  camera.rotation.x=Math.max(-1.35,Math.min(1.35,camera.rotation.x+dy*.0035));
});
const stopLook=e=>{if(e.pointerId===lookPointer)lookPointer=null;};
canvas.addEventListener("pointerup",stopLook);
canvas.addEventListener("pointercancel",stopLook);
const keys=new Set();
document.addEventListener("keydown",e=>{
  if(["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Shift","q","e"].includes(e.key)){
    keys.add(e.key.toLowerCase());e.preventDefault();
  }
});
document.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
window.addEventListener("blur",()=>{keys.clear();joyX=joyY=0;stick.style.transform="translate(0,0)";joyPointer=null;lookPointer=null;moveReferenceHeading=null;});
window.addEventListener("resize",()=>engine.resize());
// First-person solid collision: wall sections, real tree-trunk placements,
 // and water edges. Small native shrubs and fallen branches remain walkable.
const collision=(x,z)=>{
  const closeX=Math.abs(x),closeZ=Math.abs(z);
  if(closeX>8.36&&closeX<9.35&&closeZ<7.15)return true;
  if(z>6.36&&z<7.30&&closeX<9.1&&closeX>1.24)return true;
  if(z< -6.36&&z> -7.30&&closeX<9.15)return true;
  // The rebuilt northern Ranger Station has an actual solid wall perimeter.
  // Hearthside Cabin, its people and remaining photographic landscape stay intact.
  if(rangerWallCollision(x,z))return true;
  if(photoRangerCollision(x,z))return true;
  // Real 3D building bounds, only after its actual mesh is loaded.
  if(cabinComparison?.collides?.(x,z))return true;
  if(materialYard?.collides?.(x,z))return true;
  // Installed PBR grove trunks remain solid even when the distant landscape
  // tile has been replaced for a roaming player.
  for(const t of villageGrove.collidableTrees){
    if(Math.hypot(x-t.x,z-t.y)<t.radius+.25)return true;
  }
  // Test actual rendered trunks, including the new evergreen and old-growth
  // additions. The former separate 11m collision grid blocked invisible trees.
  for(const tree of habitat?.collidableTrees||[]){
    const dx=Math.abs(x-tree.x),dz=Math.abs(z-tree.y);
    if(dx>2.3||dz>2.3)continue;
    const radius=.32+tree.scale*.30+.24; // roots + shoulder width
    if(dx*dx+dz*dz<radius*radius)return true;
  }
  return false;
};
// Walk on the RAISED timber surface at the Ranger Station, not through its
// foundation on the lower terrain. Blend elevation on the central front
// steps; do not jump vertically at the porch threshold.
const rangerDeckBlend=(x,z)=>{
  const dx=Math.abs(x-NORTH_RANGER_STATION.x);
  const dz=z-NORTH_RANGER_STATION.z;
  if(dx>8.65||dz>5.60||dz< -13.40)return 0;
  if(dz>=-10.60)return 1; // full-width porch and indoor timber floor
  if(dx>2.80)return 0;   // three broad entrance steps
  const t=Math.max(0,Math.min(1,(dz+13.40)/2.80));
  return t*t*(3-2*t);
};
// Original outside eye height is untouched; inside the building it is a
// realistic 1.68m above the actual finished floor (not the foundation).
const cameraEyeHeight=(x,z)=>EYE_HEIGHT-.30*Math.max(rangerDeckBlend(x,z),photoRangerDeckBlend(x,z));
const cameraGround=(x,z)=>{
  if(Math.abs(x)<8.5&&Math.abs(z)<6.4)return cabinY+.38;
  if(Math.abs(x)<9.4&&z>=6.4&&z<=10.05)return cabinY+.36;
  // The altitude is sampled from the VISIBLE mesh triangles, not Babylon's
  // obsolete GroundMesh height cache or the unsmoothed mathematical slope.
  const rendered=habitat?.surfaceHeight?.(x,z);
  const ground=Number.isFinite(rendered)?rendered:cabinGrade(x,z,seed);
  const photoStep=photoRangerDeckBlend(x,z);
  if(photoStep>0){
    const ax=PHOTO_RANGER_STATION.x,az=PHOTO_RANGER_STATION.z;
    const centerGrade=habitat?.surfaceHeight?.(ax,az);
    const actualFloor=(Number.isFinite(centerGrade)?centerGrade:cabinGrade(ax,az,seed))+
      PHOTO_RANGER_STATION.floorRise;
    return ground+(actualFloor-ground)*photoStep;
  }
  const stationStep=rangerDeckBlend(x,z);
  if(stationStep>0){
    const ax=NORTH_RANGER_STATION.x,az=NORTH_RANGER_STATION.z;
    const centerGrade=habitat?.surfaceHeight?.(ax,az);
    const actualFloor=(Number.isFinite(centerGrade)?centerGrade:cabinGrade(ax,az,seed))+.76;
    return ground+(actualFloor-ground)*stationStep;
  }
  // The former village porches and steps were cleared; no invisible stairs.
  return ground;
};
// Eight licensed cabin candidates can be compared in the walking world.
// CGTrader Royalty Free (No AI) geometry is LOCAL PRIVATE IMPORT ONLY:
// never host its stand-alone source GLB on a public site.
// Real user-authorized GLB/glTF imports only; no mockups or fake placeholders.
// Hearthside and Ranger remain intact.
const cabinComparison=createFourCabinTest({
  B,scene,camera,groundAt:(x,z)=>cameraGround(x,z),onStatus:status,
  onJump:(x,z)=>{
    if(Math.max(Math.abs(tileCx-x),Math.abs(tileCy-z))>70){
      try{habitat=addLandscape(0,314);}catch(err){console.error(err);}
    }
    camera.position.set(x,cameraGround(x,z)+cameraEyeHeight(x,z),z);
    camera.rotation.set(0,0,0);
    document.querySelector(".brand small").textContent="Eight-cabin walking comparison";
    info.textContent="CABIN TEST · six first-row models plus two private CGTrader tests behind";
  }
});
document.getElementById("cabinCompare")?.addEventListener("click",()=>{
  cabinComparison.show();
  if(cabinComparison.jump())status("Showing imported real cabin meshes; empty comparison positions are hidden.");
});
if(START_AT_COMPARE){
  cabinComparison.show();cabinComparison.jump();
}
// Caitlyn inspection runs IN the real Wild scene, never in a fake green test world.
let caitlynPatrol=null;
if(CAITLYN_PATROL){
 const center={x:-40.5,z:314}; // First cabin in the current eight-cabin lineup
 const controls=document.createElement("div");
 controls.style.cssText="position:fixed;right:12px;bottom:24px;z-index:100;display:flex;flex-direction:column;gap:9px";
 controls.innerHTML='<button id="patrolRun" style="font-size:17px;padding:15px">RUN: OFF</button><button id="patrolPause" style="font-size:17px;padding:15px">PAUSE CAITLYN</button><button id="patrolFollow" style="font-size:17px;padding:15px">GO TO CAITLYN</button>';
 document.body.appendChild(controls);
 document.getElementById("patrolRun").onclick=()=>{runMode=!runMode;document.getElementById("patrolRun").textContent="RUN: "+(runMode?"ON":"OFF");};
 let paused=false;
 document.getElementById("patrolPause").onclick=()=>{paused=!paused;document.getElementById("patrolPause").textContent=paused?"RESUME CAITLYN":"PAUSE CAITLYN";};
 document.getElementById("patrolFollow").onclick=()=>{const p=caitlynPatrol?.root?.position||center;camera.position.set(p.x,cameraGround(p.x,p.z+8)+EYE_HEIGHT,p.z+8);camera.rotation.y=Math.PI;};
 B.SceneLoader.ImportMeshAsync(null,"",GLBS.caitlyn,scene,undefined,".glb").then(data=>{
  const root=new B.TransformNode("Caitlyn Wild cabin patrol",scene);
  const imported=new Set([...data.meshes,...data.transformNodes]);
  for(const node of imported)if(!node.parent||!imported.has(node.parent))node.parent=root;
  const body=data.meshes.filter(m=>m.getTotalVertices?.()>1000);
  let low=Infinity,high=-Infinity;
  for(const m of body){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;low=Math.min(low,b.minimumWorld.y);high=Math.max(high,b.maximumWorld.y);}
  const scale=Number.isFinite(high-low)&&high-low>.1?1.7/(high-low):1;
  const holder=new B.TransformNode("Caitlyn rig calibration",scene);
  for(const node of [...root.getChildren()])node.parent=holder;
  holder.parent=root;holder.scaling.setAll(scale);holder.position.y=-low*scale;
  const groups=data.animationGroups||[];
  groups.forEach(g=>g.stop());
  caitlynPatrol={root,groups,phase:-1,time:0,angle:0,paused:()=>paused};
  root.position.set(center.x,cameraGround(center.x,center.z+15),center.z+15);
  status("Caitlyn loaded in the actual Wild cabin landscape");
 }).catch(e=>status("Caitlyn model error: "+e.message));
}
function updateCaitlynPatrol(dt){
 const p=caitlynPatrol;if(!p||p.paused())return;
 const steps=[["Walk",8],["Stand",2],["HandsAndKnees",4],["ElbowsAndKnees",4],["Stand",2]];
 p.time+=dt;
 let phase=p.phase;
 if(phase<0||p.time>=steps[phase][1]){
  p.time=0;phase=(phase+1)%steps.length;p.phase=phase;
  p.groups.forEach(g=>g.stop());
  const clip=p.groups.find(g=>g.name==="Caitlyn "+(steps[phase][0]==="Walk"?"Stand":steps[phase][0]));
  if(clip){clip.start(false,1,clip.from,clip.to,false);if(steps[phase][0]==="Walk"){clip.goToFrame(clip.from);clip.pause();}}
 }
 if(steps[phase][0]==="Walk"){
  p.angle+=dt*.09;const x=center.x+Math.sin(p.angle)*15,z=center.z+Math.cos(p.angle)*15;
  p.root.position.set(x,cameraGround(x,z),z);p.root.rotation.y=p.angle+Math.PI/2;
 }
}
// Real HD building-material stockyard: independent of static cabin imports and
// streamed terrain. Textures become active only near the display.
// Performance test: preserve all lumber-yard assets but do not instantiate them.
const materialYard={spawn:{x:MATERIAL_YARD.spawnX,z:MATERIAL_YARD.spawnZ},update(){},collides(){return false;},stats(){return {enabled:false,count:0,reason:"Material yard temporarily removed for Ranger Station performance test"};}};
const jumpToMaterials=()=>{
  if(Math.max(Math.abs(tileCx-MATERIAL_YARD.x),Math.abs(tileCy-MATERIAL_YARD.z))>55){
    try{habitat=addLandscape(MATERIAL_YARD.x,MATERIAL_YARD.z);}
    catch(err){console.warn("Material yard ground reload",err);status("Material-yard terrain load problem: "+err.message);}
  }
  camera.position.set(materialYard.spawn.x,cameraGround(materialYard.spawn.x,materialYard.spawn.z)+cameraEyeHeight(materialYard.spawn.x,materialYard.spawn.z),
    materialYard.spawn.z);
  camera.rotation.set(0,0,0);
  materialYard.update(true);
  document.querySelector(".brand small").textContent="Real HD Building Materials · CC0 2K";
  info.textContent="MATERIAL YARD · ten real 3D lumber, stone, roof and log samples";
  status("Material yard: walk north to inspect ten stacked photorealistic building materials.");
};
document.getElementById("materialYard")?.remove();
// Peer mode is enabled only by the public Game Beta Test entrance.
// The local visitor stays first person and resident GLB characters are untouched.
let multiplayer=null;
// Use the existing encrypted peer-to-peer positions for a player map.
// It opens only when the visitor presses "Players Map", not over gameplay.
const wildMinimap=installWildMinimap(camera);
const playerMap=BETA_MODE?createWildPlayerMap({
  getSelf:()=>({x:camera.position.x,z:camera.position.z,yaw:camera.rotation.y}),
  getPeers:()=>multiplayer?.getPeerPositions?.()??[],
  getStatus:()=>multiplayer?.getStatus?.()??"connecting"
}):null;
if(BETA_MODE){
  const playersBadge=document.getElementById("players");
  import("./wild-multiplayer.js?v=20261013-beta-players-map-v2").then(({connectWildMultiplayer})=>{
    multiplayer=connectWildMultiplayer({B,scene,
      getCamera:()=>camera,groundAt:(x,z)=>cameraGround(x,z),
      statusElement:playersBadge});
  }).catch(err=>{
    console.warn("Optional game beta multiplayer unavailable:",err);
    if(playersBadge)playersBadge.textContent="Multiplayer unavailable · exploring solo";
  });
}

// Bird scouting mode: lightweight free-flight camera using the existing streamed world.
const birdMode=new URLSearchParams(location.search).get("bird")==="1";
let birdFlying=birdMode,birdClimb=0;
if(birdMode){
 document.querySelector(".brand small").textContent="🦅 Bird scout · tree search";
 const panel=document.createElement("div");
 panel.style.cssText="position:fixed;right:12px;bottom:105px;z-index:30;display:flex;flex-direction:column;gap:9px";
 panel.innerHTML='<button id="birdUp" style="font-size:17px;padding:13px">▲ Climb</button><button id="birdDown" style="font-size:17px;padding:13px">▼ Descend</button><button id="birdLand" style="font-size:16px;padding:13px">Land</button>';
 document.body.appendChild(panel);
 const hold=(id,value)=>{const el=document.getElementById(id);el.addEventListener("pointerdown",e=>{e.preventDefault();el.setPointerCapture(e.pointerId);birdClimb=value;});for(const type of ["pointerup","pointercancel","lostpointercapture"])el.addEventListener(type,()=>{if(birdClimb===value)birdClimb=0;});};
 hold("birdUp",1);hold("birdDown",-1);
 document.getElementById("birdLand").addEventListener("click",()=>{birdFlying=!birdFlying;birdClimb=0;document.getElementById("birdLand").textContent=birdFlying?"Land":"Take off";if(birdFlying)camera.position.y=Math.max(camera.position.y,cameraGround(camera.position.x,camera.position.z)+8);});
 document.getElementById("help").textContent="🦅 Joystick: fly · drag right: look · ▲▼ altitude";
 camera.position.y+=35;
}

let positionSync=0,seconds=0,walkTime=0,walkDistance=0;
engine.runRenderLoop(()=>{
  treeInspection.tick();
  const dt=Math.min(engine.getDeltaTime()/1000,.05);
  const f=(-joyY)+(keys.has("w")||keys.has("arrowup")?1:0)-(keys.has("s")||keys.has("arrowdown")?1:0);
  const side=joyX+(keys.has("d")||keys.has("arrowright")?1:0)-(keys.has("a")||keys.has("arrowleft")?1:0);
  if(keys.has("q"))camera.rotation.y-=dt*1.7;
  if(keys.has("e"))camera.rotation.y+=dt*1.7;
  // Walk pace raised from its former 20%-feeling speed to roughly 38%.
  // Maintain the same faster sprint-to-walk ratio for desktop users.
  const len=Math.hypot(f,side),speed=birdMode?30:(runMode||keys.has("shift")?9.5:5.7);
  if(len>.04 && (!birdMode || birdFlying)){
    // Free-look when still; when moving, the joystick steers the player's
    // entire facing direction. Base the target on the heading when movement
    // began, not the continually updating camera heading: otherwise holding
    // the stick to the left causes an endless spin.
    if(moveReferenceHeading===null)moveReferenceHeading=camera.rotation.y;
    const target=moveReferenceHeading+Math.atan2(side,f);
    const delta=Math.atan2(Math.sin(target-camera.rotation.y),
                           Math.cos(target-camera.rotation.y));
    const maxTurn=dt*9.0; // smooth, responsive <= ~0.18s for a 90-degree turn
    camera.rotation.y+=Math.max(-maxTurn,Math.min(maxTurn,delta));
    const yaw=camera.rotation.y;
    const pace=Math.min(1,len)*speed*dt;
    const dx=Math.sin(yaw)*pace,dz=Math.cos(yaw)*pace;
    let nx=camera.position.x+dx,nz=camera.position.z+dz;
    const oldX=camera.position.x,oldZ=camera.position.z;
    if(birdMode||!collision(nx,camera.position.z))camera.position.x=nx;
    if(birdMode||!collision(camera.position.x,nz))camera.position.z=nz;
    const traveled=Math.hypot(camera.position.x-oldX,camera.position.z-oldZ);
    walkDistance+=traveled;
    if(traveled>.0001)walkTime+=dt*8;
  }else moveReferenceHeading=null;
  // Subtle, non-nauseating head movement. Ground-following keeps eye level
  // consistent while approaching ridges, ravines or the cabin porch.
  const walking=len>.04?1:0;
  const sway=Math.sin(walkTime*1.45)*.012*walking;
  const targetY=cameraGround(camera.position.x,camera.position.z)+
    cameraEyeHeight(camera.position.x,camera.position.z)+sway;
  // Stay at EYE_HEIGHT above the surface on EVERY frame. Slow Y interpolation let
  // steep terrain overtake the camera, making the adult walker appear short.
  // Following the ground directly also avoids a dive on chunk transitions.
  if(birdMode){const ground=cameraGround(camera.position.x,camera.position.z);camera.position.y=birdFlying?Math.max(ground+3,camera.position.y+birdClimb*24*dt):ground+2.5;}else camera.position.y=targetY;
  // Rebuild at coarse distance intervals, never on every footstep. The source
  // procedural seed gives continuous landforms even across forest chunks.
  if(Math.max(Math.abs(camera.position.x-tileCx),Math.abs(camera.position.z-tileCy))>84){
    try{habitat=addLandscape(Math.round(camera.position.x/12)*12,Math.round(camera.position.z/12)*12);}
    catch(err){console.error(err);status("Terrain streaming failed: "+err.message);}
  }
  seconds+=dt;
  if(seconds>1.5){
    seconds=0;positionSync++;
    cabinComparison.update();
    materialYard.update();
    if(autumnMaples.status==="ready")autumnMaples.reground();
    const nearby=clearingAt(camera.position.x,camera.position.z);
    info.textContent=`${birdMode?(birdFlying?"FLYING":"PERCHED"):(runMode?"RUNNING":"WALKING")} · X:${Math.round(camera.position.x)} Z:${Math.round(camera.position.z)} ALT:${Math.round(camera.position.y-cameraGround(camera.position.x,camera.position.z))}m · ${Math.round(walkDistance)}m traveled · ${Math.round(engine.getFps())} fps`+
      (habitat?.villageRealTerrain?.status==="ready"?" · PHOTO GROUND LOADED":
       habitat?.villageRealTerrain?.status==="awaiting-real-assets"?" · PHOTO LOAD FAILED":
       " · loading photographic ground");
  }
  // Keep the sun fixed against the distant sky without clipping at the edge
  // of the streamed terrain or drifting as the walker leaves the cabin.
  sunDisc.position.set(camera.position.x+sunLook.x*420,
    camera.position.y+sunLook.y*420,camera.position.z+sunLook.z*420);
  // Hide complete imported PBR grove batches only when well outside village.
  // Never unload/recreate the full 3D village while guests cross the square.
  // Existing character models and multiplayer keep running; old scenery loaders disabled.
  multiplayer?.update(dt);
  playerMap?.update(performance.now());
  wildMinimap.update(performance.now());
  scene.render();
});
if(START_AT_MATERIALS){
  jumpToMaterials();
}else if(START_AT_COMPARE){
  // The comparison entry already teleported the player to its field.
  // Do NOT reset to Hearthside Cabin after the first render.
  document.querySelector(".brand small").textContent="Eight-cabin test field · north of Hearthside";
}else if(START_AT_PHOTO_RANGER){
  // Direct URL ?spawn=ranger-photo must NEVER reset to Hearthside Cabin.
  goToPhotoRanger();
}else if(START_AT_RANGER)goToRanger();
else{
  resetToCabin();
  status("You're at Hearthside Cabin. Push the joystick to walk, double-tap its center to run, and drag right to look.");
}
if(START_AT_RANGER){
  document.querySelector(".brand small").textContent="Ranger Station · entry-facing desk v6";
}

// Non-interactive read-only telemetry for repeatable browser smoke tests.
window.__wildCabinLineupDiagnostics=()=>cabinComparison.stats();
window.__wildMaterialsDiagnostics=()=>materialYard.stats();
window.__wildDiagnostics=()=>({
  position:[camera.position.x,camera.position.y,camera.position.z],
  photoRangerPosition:[PHOTO_RANGER_STATION.x,PHOTO_RANGER_STATION.z],
  photoRangerBuiltInHabitat:true,
  photoRangerMeshCount:scene.meshes.filter(m=>m.name.startsWith("PHOTO RANGER")).length,
  meshes:scene.meshes.length,
  rebuildLayoutVersion:habitat?.layoutVersion??"not-loaded",
  reservedClearings:habitat?.clearingsRendered??0,
  nativeTrees:habitat?.nearTrees??0,
  distantTrees:habitat?.distantTrees??0,
  species:habitat?.species??0,
  understory:habitat?.understory??0,
  addedTrees:habitat?.addedTrees??0,
  addedEvergreens:habitat?.addedEvergreens??0,
  elderTrees:habitat?.elderTrees??0,
  heroPlants:habitat?.heroPlants??0,
  villageDetailDiameterMetres:habitat?.villageDetailDiameterMetres??0,
  villageGroundDetails:habitat?.villageGroundDetails??0,
  villageEdgeTrees:habitat?.villageEdgeTrees??0,
   villageTreesEnabled:VILLAGE_SQUARE_TREES_ENABLED,
  villageHDOakEnabled:VILLAGE_HD_OAK_ENABLED,
  importedVillageOakStatus:villageOak.status,
  importedVillageOakSource:VILLAGE_OAK.model,
   importedVillageOakMeshes:villageOak.meshCount,
   importedVillageOakPosition:[VILLAGE_OAK.x,VILLAGE_OAK.z],
   importedVillageOakError:villageOak.error,
   liteMode:LITE_MODE,
  villageGroveStatus:villageGrove.status,
   villageGroveModelSources:villageGrove.sourceIds,
   villageGroveModelsLoaded:villageGrove.loadedModels,
  villageGroveBroadleafModels:villageGrove.broadleafModelsLoaded,
  villageGroveEvergreenModels:villageGrove.evergreenModelsLoaded,
  villageGroveByModel:{...villageGrove.plantedBySource},
  villageGroveCertifiedNativeSpeciesModels:villageGrove.certifiedNativeSpeciesModels,
   villageGroveTreesPlanted:villageGrove.planted,
   villageGroveTreesRequested:villageGrove.requested,
   villageFloorStatus:villageFloor.status,
   villageFloorPBRModels:villageFloor.sourceIds,
   villageFloorDetailsPlanted:villageFloor.planted,
   villageFloorDetailsRequested:villageFloor.requested,
   villageFloorByType:villageFloor.counts,
   villageFloorError:villageFloor.error,
   villageGroveTreesSkipped:villageGrove.skippedNoModel,
   villageGroveError:villageGrove.error,
  heroGraphics:habitat?.heroGraphics??false,
   communityBuildings:habitat?.communityBuildings??0,
    communityFirePits:habitat?.communityFirePits??0,
   communityPaths:habitat?.communityPaths??0,
   spawnLocation:START_AT_PHOTO_RANGER?"ranger-photo":START_AT_RANGER?"ranger":"hearthside",
    betaMode:BETA_MODE,
    multiplayerPeers:multiplayer?.getPeerCount()??0,
    multiplayerStatus:multiplayer?.getStatus()??(BETA_MODE?"connecting":"disabled"),
    connectedPeerPositions:multiplayer?.getPeerPositions?.()??[],
    playerMapOpen:playerMap?.isOpen()??false,
  cabin:scene.meshes.some(m=>m.name.includes("Hearthside")),
  crewModels:avatarRoots.size,
  combinedCabinMeshes,
  walkedMetres:walkDistance,
  materialYard:materialYard.stats(),
  groundAltitude:cameraGround(camera.position.x,camera.position.z),
  runMode,
  moveSpeed:runMode?9.5:5.7,
  configuredEyeHeight:EYE_HEIGHT,
  sunlightIntensity:sun.intensity,
  skylightIntensity:sky.intensity,
  daylightExposure:scene.imageProcessingConfiguration.exposure,
  sunDiscVisible:sunDisc.isEnabled(),
  eyeHeight:camera.position.y-cameraGround(camera.position.x,camera.position.z),
  facingYaw:camera.rotation.y,
  movementHeadingLocked:moveReferenceHeading!==null,
  // This reference is independent of GroundMesh.getHeightAtCoordinates.
  renderedSurfaceHeight:habitat?.surfaceHeight?.(camera.position.x,camera.position.z)??null,
  renderedEyeHeight:(()=>{const y=habitat?.surfaceHeight?.(camera.position.x,camera.position.z);return Number.isFinite(y)?camera.position.y-y:null;})(),
  framesPerSecond:Math.round(engine.getFps()),
  photographicTerrainStatus:habitat?.villageRealTerrain?.status??"not-loaded",
  photographicTerrainError:habitat?.villageRealTerrain?.error??"",
  photographicTerrainSource:habitat?.villageRealTerrain?.sourceIds??[],
  photographicNearDetailMetres:habitat?.villageRealTerrain?.nearDetailMetres??0,
  photographicFarDetailDisabled:habitat?.villageRealTerrain?.farDetailDisabled??false,
  villageMountainLayers:villageMountains.meshes.length,
  mountainTopVisible:villageMountains.meshes.some(m=>m.isEnabled()&&m.visibility>.01),
  webgl:engine.webGLVersion
});
