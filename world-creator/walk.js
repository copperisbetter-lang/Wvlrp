/**
 * Walk The Wild: stand outside Hearthside Cabin and explore a seeded WV world.
 * Lower-left virtual joystick, touch-look on right, and WASD/mouse controls.
 * The real cabin and real bundled GLB avatars are preserved; no blob NPCs.
 */
import { STORAGE_KEY,newWorld,sanitizedWorld,seedNumber,resetToWildCabin,HEARTHSIDE_CABIN } from "./world-core.js?v=woodland-village-20261013-v1";
import { cabinGrade, waterAt } from "./wild-nature.js?v=preserved-forest-20261013-v7";
import { renderWildLandscape } from "./wild-landscape-renderer.js?v=full-village-75m-20261014-v1";
import {installVillageOak,VILLAGE_OAK} from "./wild-village-hero-oak.js?v=cc0-oak-20261014-v1";
import { buildHearthsideCabin } from "./cabin-builder.js?v=hearthside-cabin-v5";
import {COMMUNITY_SITES,VILLAGE_CLEARING} from "./wild-reference-layout.js?v=actual-distant-mountain-valley-20261013-v9";
import {installWildMountainBackdrop} from "./wild-mountain-backdrop.js?v=sky-beyond-visible-rocky-ridge-20261013-v5";
import {installVisibleVillageMountains} from "./wild-visible-mountain-stage.js?v=nonstriped-sandstone-20261014-v1";
import {createWildPlayerMap} from "./wild-player-map.js?v=live-peer-map-20261013-v1";

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
const BETA_MODE=betaParams.get("mode")==="beta";
const START_AT_RANGER=betaParams.get("spawn")==="ranger";
const RANGER_SPAWN=Object.freeze({x:93,z:45,tileX:96,tileZ:96});
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
resetToWildCabin(world);
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
engine.setHardwareScalingLevel(mobile?1.4:1);
const scene=new B.Scene(engine);
// Clear, sunny afternoon: enough diffuse skylight reaches forest-floor plants
// beneath the dense native canopy, without making all foliage fluorescent.
scene.clearColor=new B.Color4(.67,.82,.95,1);
scene.fogMode=B.Scene.FOGMODE_EXP2;
scene.fogDensity=.00125;
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
  new B.Vector3(START_AT_RANGER?RANGER_SPAWN.x:0,
    START_AT_RANGER?cabinGrade(RANGER_SPAWN.x,RANGER_SPAWN.z,seed)+EYE_HEIGHT:cabinY+EYE_HEIGHT,
    START_AT_RANGER?RANGER_SPAWN.z:16),scene);
camera.minZ=.07;camera.maxZ=900;camera.fov=1.13;
camera.rotation.set(0,START_AT_RANGER?0:Math.PI,0);
scene.activeCamera=camera;
// October-approved distant sunlit Appalachian ridge: real 360-degree skyline,
// behind the actual navigable buildings and forest. No panorama cabin cutouts.
const horizon=installWildMountainBackdrop(B,scene,camera,{
  mobile,
  villageX:VILLAGE_CLEARING.centerX,
  villageBackZ:VILLAGE_CLEARING.centerZ+VILLAGE_CLEARING.halfDepth+
    VILLAGE_CLEARING.backExtension+4,
  villageGroundY:cabinGrade(VILLAGE_CLEARING.centerX,VILLAGE_CLEARING.centerZ,seed)
});
// The earlier mountain-only panorama and mesh sat BEHIND the 1.1 km terrain
// and painted an oversized, generic green wall. Keep the continuous sky dome,
// but replace those two obsolete distant layers with nearer parallax mountains.
horizon.vistaWall.setEnabled(false);
horizon.solidCliff.setEnabled(false);
const villageMountains=installVisibleVillageMountains(B,scene,camera,{
  mobile,
  villageX:VILLAGE_CLEARING.centerX,
  villageY:cabinGrade(VILLAGE_CLEARING.centerX,VILLAGE_CLEARING.centerZ,seed)
});
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
  const result=renderWildLandscape(B,scene,tracked,{cx:x,cy:z,seed,mobile});
  tileCx=x;tileCy=z;loadedTiles++;
  status(loadedTiles===1?"Explore Hearthside Cabin and the West Virginia mountains.":"The Wild continues beyond the cabin clearing.");
  return result;
}
let habitat;
try{habitat=addLandscape(START_AT_RANGER?RANGER_SPAWN.tileX:0,
    START_AT_RANGER?RANGER_SPAWN.tileZ:0);}
catch(err){status("Forest render problem: "+err.message);console.error(err);}
// This is ONE imported GLB, not the procedural tree prototypes in the forest.
// It stays at village world coordinates as terrain tiles stream in and out.
const villageOak=installVillageOak(B,scene,{
  groundY:cabinGrade(VILLAGE_CLEARING.centerX,VILLAGE_CLEARING.centerZ,seed)
});
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
for(const o of initial)loadAvatar(o);
crewButton.addEventListener("click",()=>{
  crewButton.disabled=true;crewButton.textContent="Crew requested";
  status("Loading every genuine 3D cabin avatar; this may strain phone memory.");
  // Load sequentially to reduce simultaneous peak memory on Android.
  (async()=>{for(const o of cabinCrew)await loadAvatar(o);status("Cabin crew load attempted: "+avatarRoots.size+" of "+cabinCrew.length+" actual models visible.");})();
});
const resetToCabin=()=>{
  camera.position.set(0,cameraGround(0,16)+EYE_HEIGHT,16);
  camera.rotation.set(0,Math.PI,0);
  document.querySelector(".brand small").textContent="Hearthside Cabin · first-person walk";
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
  camera.position.set(startX,cameraGround(startX,startZ)+EYE_HEIGHT,startZ);
  camera.rotation.set(0,0,0);
  info.textContent="Ranger Station · Laurel's Kitchen left · Mercantile right";
  status("You're standing in front of Ranger Station. Walk forward to its porch, or turn to explore both shops.");
};
document.getElementById("village")?.addEventListener("click",goToRanger);
let joyX=0,joyY=0,joyPointer=null;
// Capture the facing direction at the start of a joystick gesture, so a
// held LEFT/RIGHT command turns toward a stable heading instead of spinning.
let moveReferenceHeading=null;
let runMode=false,lastCenterTap=-Infinity,tapStartAt=0,tapStartRadius=Infinity,tapMaxRadius=0;
const DOUBLE_TAP_MS=360,CENTER_TAP_RADIUS=27;
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
  const centerTap=e.type==="pointerup"&&now-tapStartAt<260&&
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
  // Keep walkers out of the permanent village flames.
  if(Math.hypot(x-VILLAGE_CLEARING.fireX,z-VILLAGE_CLEARING.fireZ)<2.30)return true;
  // One real village oak: its substantial root flare and trunk are solid.
  if(Math.hypot(x-VILLAGE_OAK.x,z-VILLAGE_OAK.z)<VILLAGE_OAK.collisionRadius)return true;
  const water=waterAt(x,z,seed);
  if(water&&cabinGrade(x,z,seed)<water.level+.75)return true;
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
const cameraGround=(x,z)=>{
  if(Math.abs(x)<8.5&&Math.abs(z)<6.4)return cabinY+.38;
  if(Math.abs(x)<9.4&&z>=6.4&&z<=10.05)return cabinY+.36;
  // The altitude is sampled from the VISIBLE mesh triangles, not Babylon's
  // obsolete GroundMesh height cache or the unsmoothed mathematical slope.
  const rendered=habitat?.surfaceHeight?.(x,z);
  const ground=Number.isFinite(rendered)?rendered:cabinGrade(x,z,seed);
  // The porch floor and four grounded steps become physically walkable.
  for(const site of COMMUNITY_SITES){
    const front=site.z-site.depth/2;
    const porchFront=front-(site.id==="wild-ranger-station"?4.45:4.65);
    if(Math.abs(x-site.x)<site.width/2+.15&&z>=porchFront&&z<=front)
      return ground+.78;
    if(Math.abs(x-site.x)<2.48&&z>=porchFront-3.58&&z<porchFront){
      const index=Math.max(0,Math.min(3,Math.floor((z-(porchFront-3.58))/.80)));
      return ground+.15+index*.19;
    }
  }
  return ground;
};
// Peer mode is enabled only by the public Game Beta Test entrance.
// The local visitor stays first person and resident GLB characters are untouched.
let multiplayer=null;
// Use the existing encrypted peer-to-peer positions for a player map.
// It opens only when the visitor presses "Players Map", not over gameplay.
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
let positionSync=0,seconds=0,walkTime=0,walkDistance=0;
engine.runRenderLoop(()=>{
  const dt=Math.min(engine.getDeltaTime()/1000,.05);
  const f=(-joyY)+(keys.has("w")||keys.has("arrowup")?1:0)-(keys.has("s")||keys.has("arrowdown")?1:0);
  const side=joyX+(keys.has("d")||keys.has("arrowright")?1:0)-(keys.has("a")||keys.has("arrowleft")?1:0);
  if(keys.has("q"))camera.rotation.y-=dt*1.7;
  if(keys.has("e"))camera.rotation.y+=dt*1.7;
  // Walk pace raised from its former 20%-feeling speed to roughly 38%.
  // Maintain the same faster sprint-to-walk ratio for desktop users.
  const len=Math.hypot(f,side),speed=runMode||keys.has("shift")?9.5:5.7;
  if(len>.04){
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
    if(!collision(nx,camera.position.z))camera.position.x=nx;
    if(!collision(camera.position.x,nz))camera.position.z=nz;
    const traveled=Math.hypot(camera.position.x-oldX,camera.position.z-oldZ);
    walkDistance+=traveled;
    if(traveled>.0001)walkTime+=dt*8;
  }else moveReferenceHeading=null;
  // Subtle, non-nauseating head movement. Ground-following keeps eye level
  // consistent while approaching ridges, ravines or the cabin porch.
  const walking=len>.04?1:0;
  const sway=Math.sin(walkTime*1.45)*.012*walking;
  const targetY=cameraGround(camera.position.x,camera.position.z)+EYE_HEIGHT+sway;
  // Stay at EYE_HEIGHT above the surface on EVERY frame. Slow Y interpolation let
  // steep terrain overtake the camera, making the adult walker appear short.
  // Following the ground directly also avoids a dive on chunk transitions.
  camera.position.y=targetY;
  // Rebuild at coarse distance intervals, never on every footstep. The source
  // procedural seed gives continuous landforms even across forest chunks.
  if(Math.max(Math.abs(camera.position.x-tileCx),Math.abs(camera.position.z-tileCy))>84){
    try{habitat=addLandscape(Math.round(camera.position.x/12)*12,Math.round(camera.position.z/12)*12);}
    catch(err){console.error(err);status("Terrain streaming failed: "+err.message);}
  }
  seconds+=dt;
  if(seconds>1.5){
    seconds=0;positionSync++;
    info.textContent=`${runMode?"RUNNING":"WALKING"} · ${Math.round(walkDistance)}m traveled · ${Math.round(Math.hypot(camera.position.x,camera.position.z))}m from cabin · ${Math.round(engine.getFps())} fps`;
  }
  // Keep the sun fixed against the distant sky without clipping at the edge
  // of the streamed terrain or drifting as the walker leaves the cabin.
  sunDisc.position.set(camera.position.x+sunLook.x*420,
    camera.position.y+sunLook.y*420,camera.position.z+sunLook.z*420);
  multiplayer?.update(dt);
  playerMap?.update(performance.now());
  scene.render();
});
if(START_AT_RANGER)goToRanger();
else{
  resetToCabin();
  status("You're at Hearthside Cabin. Push the joystick to walk, double-tap its center to run, and drag right to look.");
}
if(START_AT_RANGER){
  document.querySelector(".brand small").textContent="Ranger Station · first-person walk";
}

// Non-interactive read-only telemetry for repeatable browser smoke tests.
window.__wildDiagnostics=()=>({
  position:[camera.position.x,camera.position.y,camera.position.z],
  meshes:scene.meshes.length,
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
   importedVillageOakStatus:villageOak.status,
   importedVillageOakMeshes:villageOak.meshCount,
   importedVillageOakPosition:[VILLAGE_OAK.x,VILLAGE_OAK.z],
   importedVillageOakError:villageOak.error,
  heroGraphics:habitat?.heroGraphics??false,
   communityBuildings:habitat?.communityBuildings??0,
    communityFirePits:habitat?.communityFirePits??0,
   communityPaths:habitat?.communityPaths??0,
   spawnLocation:START_AT_RANGER?"ranger":"hearthside",
    betaMode:BETA_MODE,
    multiplayerPeers:multiplayer?.getPeerCount()??0,
    multiplayerStatus:multiplayer?.getStatus()??(BETA_MODE?"connecting":"disabled"),
    connectedPeerPositions:multiplayer?.getPeerPositions?.()??[],
    playerMapOpen:playerMap?.isOpen()??false,
  cabin:scene.meshes.some(m=>m.name.includes("Hearthside")),
  crewModels:avatarRoots.size,
  combinedCabinMeshes,
  walkedMetres:walkDistance,
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
  villageMountainLayers:villageMountains.meshes.length,
  mountainTopVisible:villageMountains.meshes.some(m=>m.isEnabled()&&m.visibility>.01),
  webgl:engine.webGLVersion
});
