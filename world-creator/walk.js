/**
 * Walk The Wild: stand outside Hearthside Cabin and explore a seeded WV world.
 * Lower-left virtual joystick, touch-look on right, and WASD/mouse controls.
 * The real cabin and real bundled GLB avatars are preserved; no blob NPCs.
 */
import { STORAGE_KEY,newWorld,sanitizedWorld,seedNumber,resetToWildCabin,HEARTHSIDE_CABIN } from "./world-core.js?v=wild-full-landscape-20261013-v1";
import { cabinGrade, treeAtCell, waterAt } from "./wild-nature.js?v=wild-full-landscape-20261013-v1";
import { renderWildLandscape } from "./wild-landscape-renderer.js?v=walking-height-surface-20261013-v4";
import { buildHearthsideCabin } from "./cabin-builder.js?v=hearthside-cabin-v5";

const B=window.BABYLON;
const canvas=document.getElementById("world");
const message=document.getElementById("message");
const info=document.getElementById("info");
const joystick=document.getElementById("joystick");
const stick=document.getElementById("stick");
const crewButton=document.getElementById("crew");
const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
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
scene.clearColor=new B.Color4(.62,.74,.78,1);
scene.fogMode=B.Scene.FOGMODE_EXP2;
scene.fogDensity=.00115;
scene.fogColor=new B.Color3(.62,.72,.75);
scene.skipPointerMovePicking=true;
const sky=new B.HemisphericLight("daylight",new B.Vector3(.35,1,.21),scene);
sky.intensity=.9;sky.groundColor=new B.Color3(.23,.22,.18);
const sun=new B.DirectionalLight("Appalachian afternoon",new B.Vector3(-.45,-.9,-.27),scene);
sun.diffuse=new B.Color3(1,.92,.78);sun.intensity=.65;
const camera=new B.FreeCamera("first person at Hearthside",
  new B.Vector3(0,cabinY+1.72,16),scene);
camera.minZ=.07;camera.maxZ=900;camera.fov=1.13;
camera.rotation.set(0,Math.PI,0);
scene.activeCamera=camera;
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
  const result=renderWildLandscape(B,scene,tracked,{cx:x,cy:z,seed});
  tileCx=x;tileCy=z;loadedTiles++;
  status(loadedTiles===1?"Explore Hearthside Cabin and the West Virginia mountains.":"The Wild continues beyond the cabin clearing.");
  return result;
}
let habitat;
try{habitat=addLandscape(0,0);}
catch(err){status("Forest render problem: "+err.message);console.error(err);}
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
  camera.position.set(0,cabinY+1.7,16);
  camera.rotation.set(0,Math.PI,0);
  info.textContent="Hearthside Cabin · arriving at front porch";
};
document.getElementById("home").addEventListener("click",resetToCabin);
let joyX=0,joyY=0,joyPointer=null;
function joyPosition(e){
  const r=joystick.getBoundingClientRect();
  const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
  const cap=40,length=Math.hypot(dx,dy),mul=length>cap?cap/length:1;
  const sx=dx*mul,sy=dy*mul;
  joyX=Math.abs(sx)<3?0:sx/cap;
  joyY=Math.abs(sy)<3?0:sy/cap;
  stick.style.transform=`translate(${sx}px,${sy}px)`;
}
joystick.addEventListener("pointerdown",e=>{
  if(joyPointer!==null)return;
  e.preventDefault();e.stopPropagation();joyPointer=e.pointerId;
  joystick.setPointerCapture(e.pointerId);joyPosition(e);
});
joystick.addEventListener("pointermove",e=>{
  if(e.pointerId!==joyPointer)return;e.preventDefault();joyPosition(e);
});
const resetStick=e=>{
  if(e.pointerId!==joyPointer)return;joyPointer=null;joyX=joyY=0;
  stick.style.transform="translate(0,0)";
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
window.addEventListener("blur",()=>{keys.clear();joyX=joyY=0;stick.style.transform="translate(0,0)";joyPointer=null;lookPointer=null;});
window.addEventListener("resize",()=>engine.resize());
// First-person solid collision: wall sections, real tree-trunk placements,
 // and water edges. Small native shrubs and fallen branches remain walkable.
const collision=(x,z)=>{
  const closeX=Math.abs(x),closeZ=Math.abs(z);
  if(closeX>8.36&&closeX<9.35&&closeZ<7.15)return true;
  if(z>6.36&&z<7.30&&closeX<9.1&&closeX>1.24)return true;
  if(z< -6.36&&z> -7.30&&closeX<9.15)return true;
  const water=waterAt(x,z,seed);
  if(water&&cabinGrade(x,z,seed)<water.level+.75)return true;
  const spacing=11,i=Math.round(x/spacing),j=Math.round(z/spacing);
  for(let di=-2;di<=2;di++)for(let dj=-2;dj<=2;dj++){
    const t=treeAtCell(i+di,j+dj,seed,spacing);
    if(!t)continue;
    const radius=.32+t.scale*.30+.24; // trunk, roots and walker shoulder
    if(Math.hypot(x-t.x,z-t.y)<radius)return true;
  }
  return false;
};
const cameraGround=(x,z)=>{
  if(Math.abs(x)<8.5&&Math.abs(z)<6.4)return cabinY+.38;
  if(Math.abs(x)<9.4&&z>=6.4&&z<=10.05)return cabinY+.36;
  const estimated=cabinGrade(x,z,seed);
  // Use the actual visible triangulated ground, not just the mathematical
  // height field: sharp Appalachian slopes can diverge between vertices.
  const rendered=habitat?.surfaceHeight?.(x,z);
  return Number.isFinite(rendered)&&Math.abs(rendered-estimated)<10?rendered:estimated;
};
let positionSync=0,seconds=0,walkTime=0,walkDistance=0;
engine.runRenderLoop(()=>{
  const dt=Math.min(engine.getDeltaTime()/1000,.05);
  const f=(-joyY)+(keys.has("w")||keys.has("arrowup")?1:0)-(keys.has("s")||keys.has("arrowdown")?1:0);
  const side=joyX+(keys.has("d")||keys.has("arrowright")?1:0)-(keys.has("a")||keys.has("arrowleft")?1:0);
  if(keys.has("q"))camera.rotation.y-=dt*1.7;
  if(keys.has("e"))camera.rotation.y+=dt*1.7;
  const len=Math.hypot(f,side),speed=keys.has("shift")?5.1:3.0;
  if(len>.04){
    const yaw=camera.rotation.y,forwardX=Math.sin(yaw),forwardZ=Math.cos(yaw);
    const dx=(forwardX*f+Math.cos(yaw)*side)/Math.max(1,len)*speed*dt;
    const dz=(forwardZ*f-Math.sin(yaw)*side)/Math.max(1,len)*speed*dt;
    let nx=camera.position.x+dx,nz=camera.position.z+dz;
    const oldX=camera.position.x,oldZ=camera.position.z;
    if(!collision(nx,camera.position.z))camera.position.x=nx;
    if(!collision(camera.position.x,nz))camera.position.z=nz;
    const traveled=Math.hypot(camera.position.x-oldX,camera.position.z-oldZ);
    walkDistance+=traveled;
    if(traveled>.0001)walkTime+=dt*8;
  }
  // Subtle, non-nauseating head movement. Ground-following keeps eye level
  // consistent while approaching ridges, ravines or the cabin porch.
  const walking=len>.04?1:0;
  const sway=Math.sin(walkTime*1.45)*.012*walking;
  const targetY=cameraGround(camera.position.x,camera.position.z)+1.68+sway;
  // Stay 1.68 m above the surface on EVERY frame. Slow Y interpolation let
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
    info.textContent=`${Math.round(walkDistance)}m walked · ${Math.round(Math.hypot(camera.position.x,camera.position.z))}m from cabin · ${Math.round(engine.getFps())} fps`;
  }
  scene.render();
});
resetToCabin();
status("You're at Hearthside Cabin. Push the left joystick forward and drag the right side to look around.");

// Non-interactive read-only telemetry for repeatable browser smoke tests.
window.__wildDiagnostics=()=>({
  position:[camera.position.x,camera.position.y,camera.position.z],
  meshes:scene.meshes.length,
  nativeTrees:habitat?.nearTrees??0,
  distantTrees:habitat?.distantTrees??0,
  species:habitat?.species??0,
  understory:habitat?.understory??0,
  cabin:scene.meshes.some(m=>m.name.includes("Hearthside")),
  crewModels:avatarRoots.size,
  combinedCabinMeshes,
  walkedMetres:walkDistance,
  groundAltitude:cameraGround(camera.position.x,camera.position.z),
  eyeHeight:camera.position.y-cameraGround(camera.position.x,camera.position.z),
  framesPerSecond:Math.round(engine.getFps()),
  webgl:engine.webGLVersion
});
