import {
  CELL, STORAGE_KEY, newWorld, sanitizedWorld, seedNumber, hash, heightAt,
  creekY, trailHorizontal, trailVertical, spawnDeer, addTestCharacters, TEST_CHARACTER_STARTERS, addCaitlyn, CAITLYN_STARTER, addMason, MASON_STARTER, addSha, SHA_STARTER, gatherCabinCrew, resetToWildCabin, HEARTHSIDE_CABIN
} from "./world-core.js?v=wild-full-landscape-20261013-v1";
import { buildHearthsideCabin } from "./cabin-builder.js?v=hearthside-cabin-v5";
import { makeFigureBuilder } from "./character-models.js?v=no-human-blobs-20261013-v1";
import { terrainHeight, cabinGrade, riverY, riverWidth, riverLevel, creekPath, earthColor } from "./wild-nature.js?v=wild-full-landscape-20261013-v1";
import { renderWildLandscape } from "./wild-landscape-renderer.js?v=wild-full-landscape-20261013-v1";

const $=id=>document.getElementById(id);
const canvas=$("worldMap"),ctx=canvas.getContext("2d");
let world;
try { world=sanitizedWorld(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
catch { world=newWorld(); }
// One-time, user-requested fresh start: retire all previously placed people
// (including former Riley), animals, cabins, quest props, and default markers.
// Preserve the world builder code and terrain; do not touch other website pages.
// This stamp prevents wiping any new work after the first clean reload.
const FRESH_START_MARKER="wvlrp-world-creator-fresh-start-2026-10-10";
let freshWorldStarted=false;
try {
  const requestedReset=new URLSearchParams(window.location.search).has("freshStart");
  if(requestedReset || !localStorage.getItem(FRESH_START_MARKER)) {
    world=newWorld();
    world.updatedAt=new Date().toISOString();
    localStorage.setItem(STORAGE_KEY,JSON.stringify(world));
    localStorage.setItem(FRESH_START_MARKER,"complete");
    freshWorldStarted=true;
  }
  if(requestedReset) {
    const url=new URL(window.location.href);
    url.searchParams.delete("freshStart");
    window.history.replaceState(null,"",url.pathname+url.search+url.hash);
  }
} catch(err){console.warn("Could not persist fresh world reset",err);world=newWorld();freshWorldStarted=true;}
// Install Amy and Christy once on this browser without touching existing placements.
const AMY_CHRISTY_INSTALL="wvlrp-world-creator-amy-christy-added-2026-10-11";
let installedTestCharacters=0;
try {
  if(!localStorage.getItem(AMY_CHRISTY_INSTALL)){
    installedTestCharacters=addTestCharacters(world).length;
    if(installedTestCharacters){
      world.updatedAt=new Date().toISOString();
      localStorage.setItem(STORAGE_KEY,JSON.stringify(world));
    }
    localStorage.setItem(AMY_CHRISTY_INSTALL,"complete");
  }
} catch(err){console.warn("Amy/Christy local installation could not be persisted",err);}
// One-time device-local installation; retain the entire existing saved world.
const CAITLYN_INSTALL="wvlrp-world-creator-caitlyn-added-2026-10-11";
let installedCaitlyn=0;
try {
  if(!localStorage.getItem(CAITLYN_INSTALL)){
    installedCaitlyn=addCaitlyn(world).length;
    if(installedCaitlyn){
      world.updatedAt=new Date().toISOString();
      localStorage.setItem(STORAGE_KEY,JSON.stringify(world));
    }
    localStorage.setItem(CAITLYN_INSTALL,"complete");
  }
}catch(err){console.warn("Caitlyn map addition could not be saved",err);}
// Ensure Mason is present even if an earlier install stamp was saved before
// his character arrived. This does not reset any other world objects.
const MASON_INSTALL="wvlrp-world-creator-mason-added-2026-10-11";
let installedMason=0;
try{
  // Only move the original off-screen starter, never a user-repositioned Mason.
  const oldMason=world.objects.find(o=>o.id===MASON_STARTER.id &&
    o.modelKey==="mason" && o.x===-105 && o.y===-108);
  if(oldMason){oldMason.x=MASON_STARTER.x;oldMason.y=MASON_STARTER.y;}
  installedMason=addMason(world).length;
  if(installedMason||oldMason){
    world.updatedAt=new Date().toISOString();
    localStorage.setItem(STORAGE_KEY,JSON.stringify(world));
  }
  localStorage.setItem(MASON_INSTALL,"complete");
}catch(err){console.warn("Mason map installation was not saved",err);}
let seed=seedNumber(world.seed);
const view={x:0,y:0,scale:.40};
let tool="select",selectedId=null,dirty3d=true,renderQueued=false,serial=0;
const pointers=new Map();
let gesture=null,photoUrl=null;
const localCharacterFiles = new Map();
// Riley uses one GLB with real armature skinning and named animation clips.
// Movements are skeletal prototypes, not yet polished motion capture.
try {if(addSha(world).length){world.updatedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(world));}}catch(err){console.warn("Sha installation",err);}
// User-approved first Wild home: install the cabin and gather everyone ONCE.
 // Keeps deer, other cabins, marker quests, and map seed exactly as saved.
const CABIN_CREW_INSTALL="wvlrp-hearthside-crew-home-20261012-v1";
let cabinJustBuilt=false;
try{
  if(!localStorage.getItem(CABIN_CREW_INSTALL)){
    const report=gatherCabinCrew(world);
    world.updatedAt=new Date().toISOString();
    localStorage.setItem(STORAGE_KEY,JSON.stringify(world));
    localStorage.setItem(CABIN_CREW_INSTALL,"complete");
    cabinJustBuilt=true;
    console.info("Hearthside scene installed",report);
  }
}catch(err){console.warn("Hearthside installation could not be saved",err);}
// One-time clean landscape conversion. World-wide trees, valleys and waterways
// are generated scenery; they do not become thousands of editable map objects.
// Do this AFTER old character install markers, so legacy deer/anchors/props and
// old extra buildings cannot be silently reintroduced by old migrations.
const WILD_LANDSCAPE_RESET="wvlrp-wild-native-forest-cabin-only-20261013-v1";
let wildReset=false;
try {
  if(!localStorage.getItem(WILD_LANDSCAPE_RESET)){
    const change=resetToWildCabin(world);
    world.updatedAt=new Date().toISOString();
    localStorage.setItem(STORAGE_KEY,JSON.stringify(world));
    localStorage.setItem(WILD_LANDSCAPE_RESET,"complete");
    wildReset=true;
    console.info("Wild cabin-only reset saved",change);
  }
}catch(err){console.warn("Wild landscape reset could not persist",err);}
const RILEY_RIGGED_GLB = "./assets/riley-rigged-v1.glb?v=approved-112-70-88-continuous-hair-v6";
const BUILTIN_CHARACTER_GLB=Object.freeze({
  riley:RILEY_RIGGED_GLB,
  amy:"./assets/amy-mpfb-trial.glb?v=cc0-face-texture-published-20261011-v2",
  // Christy in the world uses the previously saved Chrissy source model.
  chrissy:"./assets/chrissy-mpfb-trial.glb?v=cc0-face-texture-published-20261011-v2",
  caitlyn:"./assets/caitlyn-mpfb-trial.glb?v=caitlyn-fit-blue-dress-waves-v12",
  mason:"./assets/mason-mpfb-trial.glb?v=mason-20261011-v2",
  sha:"./assets/sha-mpfb-trial.glb?v=sha-20261012-v1",
  sav:"./assets/sav-realistic-shell.glb?v=sav-prototype-cabin-v1"
});
const RILEY_POSES=["standing","crouch","allfours"];
const rileyMotion=new Map();  // Runtime orientation and auto-turn only; never alters other NPCs.
const liveRileyModels=new Map();
function rileyMotionFor(id){if(!rileyMotion.has(id))rileyMotion.set(id,{heading:0,autoTurn:false});return rileyMotion.get(id);}
const characterAssetFiles=new Map();
function builtInCharacterFile(key){
  const url=BUILTIN_CHARACTER_GLB[key];
  if(!url)return Promise.reject(Error("Unknown character "+key));
  // Load bundled GLBs straight from their published URL. Previously we first
  // downloaded the entire large GLB into an ArrayBuffer, wrapped it into a
  // second File and then gave that copy to Babylon. On mobile devices this
  // unnecessarily duplicates memory and could leave Mason invisible.
  // User-uploaded GLBs still arrive here as File objects independently.
  if(!characterAssetFiles.has(url))characterAssetFiles.set(url,Promise.resolve(url));
  return characterAssetFiles.get(url);
}
let cabinRoofVisible=false;
let cabinFullCrew=false; // Phone-safe mode: max 2 detailed avatars; other residents display nameplates ONLY.
let previewBuildId = 0;
let herdFocusCursor = -1;
const colors={anchor:"#fbd182",deer:"#efc08c",npc:"#e7abd0",animal:"#dbceb4",cabin:"#f3d16b",marker:"#ff9e6f"};

function save() {
  world.updatedAt=new Date().toISOString();
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(world)); status("Saved locally on this device"); }
  catch(e) { status("Storage full or unavailable. Export JSON instead."); }
}
function status(s){$("status").textContent=s;}
function selected(){return world.objects.find(o=>o.id===selectedId)||null;}
function setTool(next){
  tool=next;
  document.querySelectorAll("[data-tool]").forEach(b=>{b.classList.toggle("active",b.dataset.tool===tool);b.setAttribute("aria-pressed",String(b.dataset.tool===tool));});
  canvas.style.cursor=tool==="pan"?"grab":tool==="select"?"default":"crosshair";
  status(tool==="select"?"Tap an object to edit, or drag to move the map":("Tap the map to add "+tool));
}
function setSelection(o) {
  selectedId=o?o.id:null;
  $("objectForm").hidden=!o;
  $("selectionInfo").textContent=o?("Selected "+o.type+" — "+o.id):"Choose an object on the map to edit it, or place something new.";
  if(!o){updateSpinButton();invalidate();return;}
  $("objectName").value=o.name||"";
  $("objectX").value=Number(o.x).toFixed(1);
  $("objectY").value=Number(o.y).toFixed(1);
  $("behavior").value=o.behavior||"home-range";
  $("radius").value=o.radius??160;
  $("gender").value=o.gender||"woman";
  $("skin").value=o.skin||"light";
  $("hairStyle").value=o.hairStyle||"wavy";
  $("body").value=o.body||"average";
  $("face").value=o.face||"oval";
  $("hair").value=o.hair||"brown";
  $("outfit").value=o.outfit||"ranger";
  $("pose").value=o.pose||"standing";
  $("characterPreset").value=["riley","amy","chrissy","caitlyn","mason","sha"].includes(o.modelKey)?o.modelKey:"";
  $("wildlifeFields").hidden=!(o.type==="deer"||o.type==="animal");
  $("npcFields").hidden=o.type!=="npc";
  for(const el of $("objectForm").querySelectorAll("input:not(#photo),select"))el.disabled=!!o.locked;
  $("deleteObject").disabled=!!o.locked;
  $("commitObject").disabled=!!o.locked;
  if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;}
  $("photoPreview").hidden=true;$("photo").value="";
  $("modelFile").value="";
  $("clearModel").disabled=!localCharacterFiles.has(o.id);
  updateSpinButton();invalidate();
}
function rect(){return canvas.getBoundingClientRect();}
function screen(x,y){const r=rect();return {x:r.width/2+(x-view.x)*view.scale,y:r.height/2-(y-view.y)*view.scale};}
function worldPoint(sx,sy){const r=rect();return {x:view.x+(sx-r.width/2)/view.scale,y:view.y-(sy-r.height/2)/view.scale};}
function objectAt(sx,sy){
  for(let i=world.objects.length-1;i>=0;i--){
    const o=world.objects[i],p=screen(o.x,o.y);
    if(Math.hypot(sx-p.x,sy-p.y)<Math.max(13,Math.min(20,11+view.scale*5)))return o;
  }
  return null;
}
function zoomAt(sx,sy,factor){
  const before=worldPoint(sx,sy);
  view.scale=Math.max(.065,Math.min(3.5,view.scale*factor));
  const after=worldPoint(sx,sy);
  view.x+=before.x-after.x;view.y+=before.y-after.y;
  $("zoomLabel").textContent=Math.round(view.scale/.40*100)+"%";
  dirty3d=true;invalidate();
}
function createAt(type,p){
  const typeNames={deer:"White-tailed deer",npc:"New person",animal:"Wild animal",cabin:"Cabin",marker:"Quest marker"};
  const o={id:type+"-"+Date.now().toString(36)+"-"+(++serial),type,
    name:(typeNames[type]||"Object"),x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,
    behavior:type==="deer"?"home-range":"stationary",radius:type==="deer"?180:100,
    body:"average",face:"oval",hair:"red",hairStyle:"wavy",gender:"woman",skin:"light",outfit:"ranger",animal:"fox",pose:"standing",modelKey:""};
  world.objects.push(o);setSelection(o);setTool("select");save();dirty3d=true;invalidate();return o;
}
function invalidate(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;drawMap();});}
function resize(){
  const r=rect(),d=Math.min(2,devicePixelRatio||1),w=Math.round(r.width*d),h=Math.round(r.height*d);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.setTransform(d,0,0,d,0,0);return r;
}
function drawMap() {
  const r=resize(),w=r.width,h=r.height;
  ctx.clearRect(0,0,w,h);
  // Topography and riparian colors come from the SAME elevation/biome model
  // as the 3D forest. No legacy grid paths or fake straight creek overlay.
  const step=12,left=view.x-w/(2*view.scale),top=view.y+h/(2*view.scale);
  for(let py=0;py<h+step;py+=step)for(let px=0;px<w+step;px+=step){
    const wx=left+(px+step*.5)/view.scale,wy=top-(py+step*.5)/view.scale;
    const clr=earthColor(wx,wy,seed),e=terrainHeight(wx,wy,seed);
    const shade=Math.max(.58,Math.min(1.22,.78+(e-150)/520));
    ctx.fillStyle="rgb("+[0,1,2].map(i=>Math.round(Math.min(255,255*clr[i]*shade))).join(",")+")";
    ctx.fillRect(px,py,step+1,step+1);
  }
  const bounds={minX:view.x-w/(2*view.scale),maxX:view.x+w/(2*view.scale),minY:view.y-h/(2*view.scale),maxY:view.y+h/(2*view.scale)};
  const drawWater=(points,lineWidth,color)=>{
    if(points.length<2)return;
    ctx.beginPath();
    points.forEach((p,i)=>{const q=screen(p.x,p.y);if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});
    ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();
  };
  const riverPts=[];
  const waterStep=Math.max(6,Math.min(85,7/view.scale));
  for(let x=bounds.minX-20;x<=bounds.maxX+20;x+=waterStep)
    riverPts.push({x,y:riverY(x,seed)});
  drawWater(riverPts,Math.max(2,riverWidth(view.x,seed)*2*view.scale),"#527f8c");
  for(let j=Math.floor((bounds.minX-220)/780)-1;j<=Math.ceil((bounds.maxX+220)/780)+1;j++)
    for(const side of [-1,1]){
      let pts=[];
      for(let t=0;t<=970;t+=18){
        const p=creekPath(j,side,t,seed);
        if(p.x<bounds.minX-10||p.x>bounds.maxX+10||p.y<bounds.minY-10||p.y>bounds.maxY+10){
          drawWater(pts,Math.max(1,2*view.scale),"#557b7a");pts=[];continue;
        }
        pts.push(p);
      }
      drawWater(pts,Math.max(1,2.5*view.scale),"#557b7a");
    }
  const picked=selected();
  if(picked&&["deer","animal"].includes(picked.type)&&picked.behavior==="home-range"){
    const p=screen(picked.x,picked.y);
    ctx.beginPath();ctx.arc(p.x,p.y,Math.max(2,(picked.radius||150)*view.scale),0,Math.PI*2);
    ctx.fillStyle="#ecd88b18";ctx.fill();ctx.strokeStyle="#eddaa0b0";ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);
  }
  for(const o of world.objects){
    const p=screen(o.x,o.y);if(p.x< -100||p.x>w+100||p.y< -100||p.y>h+100)continue;
    const radius=o.type==="anchor"?9:o.id===HEARTHSIDE_CABIN.id?11:6;
    ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
    ctx.fillStyle=o.id===HEARTHSIDE_CABIN.id?"#d6a460":(colors[o.type]||"#fff");ctx.fill();
    if(o.id===HEARTHSIDE_CABIN.id){ctx.strokeStyle="#ffdb9d";ctx.lineWidth=2;ctx.strokeRect(p.x-7,p.y-7,14,14);}
    ctx.lineWidth=selectedId===o.id?3:1.5;ctx.strokeStyle=selectedId===o.id?"#fff":"#18251b";ctx.stroke();
    if(o.type==="anchor"||o.id===HEARTHSIDE_CABIN.id||["amy","chrissy","caitlyn","mason","sha","sav","riley"].includes(o.modelKey)||selectedId===o.id||view.scale>.95){
      ctx.font=(o.type==="anchor"?"bold 12px":"11px")+" system-ui";
      const text=o.name||o.type,tw=ctx.measureText(text).width;
      ctx.fillStyle="#071711da";ctx.fillRect(p.x+11,p.y-10,tw+10,20);
      ctx.fillStyle="#fff";ctx.fillText(text,p.x+16,p.y+4);
    }
  }
  ctx.fillStyle="#ffffffbb";ctx.font="11px system-ui";ctx.fillText("World coordinates in metres · procedural preview",10,18);
  $("coords").textContent="Map center: "+Math.round(view.x)+" m E / "+Math.round(view.y)+" m N";
  $("count").textContent=world.objects.filter(o=>o.type!=="anchor").length+" placed items · "+world.objects.filter(o=>o.type==="deer").length+" deer";
}
function commitSelection(){
  const o=selected();if(!o||o.locked)return;
  const x=Number($("objectX").value),y=Number($("objectY").value);
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1e8||Math.abs(y)>1e8){status("Enter valid map coordinates");return;}
  o.name=$("objectName").value.trim().slice(0,100)||o.type;
  o.x=x;o.y=y;
  if(o.type==="deer"||o.type==="animal"){o.behavior=$("behavior").value;o.radius=Math.max(0,Math.min(5000,Number($("radius").value)||0));}
  if(o.type==="npc"){for(const field of ["gender","skin","body","face","hair","hairStyle","outfit"])o[field]=$(field).value;o.pose=$("pose").value;}
  save();setSelection(o);dirty3d=true;refresh3d();invalidate();
}
function pointerXY(e){const r=rect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
canvas.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  const p=pointerXY(e);pointers.set(e.pointerId,p);
  if(pointers.size===1)gesture={last:p,start:p,moved:false,kind:tool==="pan"?"pan":tool==="select"?"select":"place",hit:objectAt(p.x,p.y)};
  if(pointers.size===2){const v=[...pointers.values()];gesture={kind:"pinch",distance:Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y),moved:true};}
});
canvas.addEventListener("pointermove",e=>{
  if(!pointers.has(e.pointerId))return;
  const p=pointerXY(e),old=pointers.get(e.pointerId);pointers.set(e.pointerId,p);
  if(pointers.size===2&&gesture?.kind==="pinch"){
    const v=[...pointers.values()],distance=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);
    if(gesture.distance>0)zoomAt((v[0].x+v[1].x)/2,(v[0].y+v[1].y)/2,distance/gesture.distance);
    gesture.distance=distance;return;
  }
  if(!gesture||pointers.size!==1)return;
  if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>5)gesture.moved=true;
  if(gesture.moved){
    if(gesture.kind==="pan"||gesture.kind==="select"&&(!gesture.hit||gesture.hit.locked)){
      view.x-=(p.x-old.x)/view.scale;view.y+=(p.y-old.y)/view.scale;dirty3d=true;
    } else if(gesture.kind==="select"&&gesture.hit&&!gesture.hit.locked){
      const pt=worldPoint(p.x,p.y);gesture.hit.x=Math.round(pt.x*10)/10;gesture.hit.y=Math.round(pt.y*10)/10;
      selectedId=gesture.hit.id;
    }
    invalidate();
  }
});
function endPointer(e){
  if(!pointers.has(e.pointerId))return;
  const p=pointerXY(e),g=gesture;
  pointers.delete(e.pointerId);
  if(pointers.size){gesture=null;return;}
  gesture=null;
  if(!g||g.kind==="pinch")return;
  if(g.kind==="place"&&!g.moved){createAt(tool,worldPoint(p.x,p.y));refresh3d();}
  else if(g.kind==="select"&&!g.moved){setSelection(objectAt(p.x,p.y));}
  else if(g.kind==="select"&&g.moved&&g.hit&&!g.hit.locked){setSelection(g.hit);save();dirty3d=true;refresh3d();}
}
canvas.addEventListener("pointerup",endPointer);
canvas.addEventListener("pointercancel",endPointer);
canvas.addEventListener("wheel",e=>{e.preventDefault();const p=pointerXY(e);zoomAt(p.x,p.y,Math.exp(-e.deltaY*.001));},{passive:false});
canvas.addEventListener("keydown",e=>{
  if(e.key==="+"||e.key==="="){zoomAt(rect().width/2,rect().height/2,1.25);e.preventDefault();}
  if(e.key==="-"){zoomAt(rect().width/2,rect().height/2,.8);e.preventDefault();}
  const moves={ArrowLeft:[-80,0],ArrowRight:[80,0],ArrowUp:[0,80],ArrowDown:[0,-80]};
  if(moves[e.key]){view.x+=moves[e.key][0]/view.scale;view.y+=moves[e.key][1]/view.scale;dirty3d=true;invalidate();e.preventDefault();}
});
document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>setTool(b.dataset.tool)));
$("save").onclick=save;
$("commitObject").onclick=commitSelection;
$("applyPreset").onclick=()=>{
  const o=selected();
  if(!o||o.type!=="npc"||o.locked){status("Select a person first");return;}
  const looks={
    "ranger-redhead":{gender:"woman",skin:"light",body:"average",face:"heart",hair:"red",hairStyle:"wavy",outfit:"ranger"},
    mercantile:{gender:"woman",skin:"tan",body:"average",face:"oval",hair:"brown",hairStyle:"long",outfit:"mercantile"},
    lifeguard:{gender:"man",skin:"tan",body:"athletic",face:"square",hair:"brown",hairStyle:"short",outfit:"lifeguard"},
    riley:{gender:"woman",skin:"fair",body:"athletic",face:"heart",hair:"blonde",hairStyle:"wavy",outfit:"mannequin",pose:"standing"},
    amy:{gender:"woman",skin:"light",body:"slim",face:"oval",hair:"red",hairStyle:"long",outfit:"mannequin",pose:"standing"},
    chrissy:{gender:"woman",skin:"light",body:"slim",face:"oval",hair:"blonde",hairStyle:"long",outfit:"mannequin",pose:"standing"},
    caitlyn:{gender:"woman",skin:"fair",body:"slim",face:"oval",hair:"blonde",hairStyle:"wavy",outfit:"mannequin",pose:"standing"},
    mason:{gender:"man",skin:"tan",body:"athletic",face:"square",hair:"brown",hairStyle:"short",outfit:"mannequin",pose:"standing"}
  };
  const look=looks[$("characterPreset").value];
  if(!look){status("Choose a character style first");return;}
  for(const [key,value] of Object.entries(look))if($(key))$(key).value=value;
  o.modelKey=["riley","amy","chrissy","caitlyn","mason"].includes($("characterPreset").value)?$("characterPreset").value:"";
  if(o.modelKey)localCharacterFiles.delete(o.id);
  commitSelection();
  status("Applied "+$("characterPreset").selectedOptions[0].text+" style");
};
$("deleteObject").onclick=()=>{const o=selected();if(!o||o.locked)return;world.objects=world.objects.filter(x=>x.id!==o.id);setSelection(null);save();dirty3d=true;refresh3d();};
$("applySeed").onclick=()=>{world.seed=$("seed").value.trim().slice(0,100)||"WVLRP-Appalachia-01";seed=seedNumber(world.seed);save();dirty3d=true;invalidate();refresh3d();};
$("scatter").onclick=()=>{
  const count=Math.max(1,Math.min(500,parseInt($("deerCount").value,10)||100));
  if(world.objects.length+count>5000){status("World limit is 5,000 placed objects");return;}
  const items=spawnDeer(world,count,view.x,view.y,parseInt($("herdSize").value,10)||4);
  setSelection(items[0]);save();dirty3d=true;invalidate();refresh3d();
  status("Scattered "+items.length+" deer near the map center");
};
$("export").onclick=()=>{
  const blob=new Blob([JSON.stringify(world,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="WVLRP-world-"+new Date().toISOString().slice(0,10)+".json";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);status("World blueprint downloaded as JSON");
};
$("import").onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.size>4_000_000)throw Error("World file exceeds 4 MB");
    world=sanitizedWorld(JSON.parse(await file.text()));seed=seedNumber(world.seed);$("seed").value=world.seed;
    setSelection(null);save();dirty3d=true;invalidate();refresh3d();status("Imported "+world.objects.length+" placed items");
  }catch(err){status("Import failed: "+err.message);}
  e.target.value="";
};
function focusCabin(){
  const cabin=world.objects.find(o=>o.id===HEARTHSIDE_CABIN.id);
  if(!cabin){status("Build Hearthside Cabin first.");return;}
  view.x=cabin.x;view.y=cabin.y;
  setTool("select");setSelection(cabin);
  dirty3d=true;invalidate();refresh3d();
  if(camera){
    camera.setTarget(new BABYLON.Vector3(0,cabinGrade(view.x,view.y,seed)+2.8,0));
    camera.alpha=-Math.PI/2.55;camera.beta=1.0;camera.radius=29;
  }
  status("Hearthside Cabin · roof "+(cabinRoofVisible?"on":"hidden for interior inspection")+".");
}
$("buildCabin").onclick=()=>{
  let result;
  try{result=gatherCabinCrew(world);}catch(err){status("Cabin setup failed: "+err.message);return;}
  cabinRoofVisible=false;$("cabinRoof").textContent="Put roof back";
  save();focusCabin();
  status("Hearthside Cabin ready · "+result.totalPeople+" people inside. "+
    (result.addedPeople?result.addedPeople+" missing trial avatars added. ":"")+"Roof hidden to show the one-room interior.");
};
$("visitCabin").onclick=focusCabin;
$("cabinInspect").onclick=()=>{
  const choice=$("cabinPerson").value;
  const person=world.objects.find(o=>o.type==="npc"&&o.modelKey===choice);
  if(!person){status("That person is not in the world yet. Gather everyone first.");return;}
  setTool("select");setSelection(person);focusObjectIn3D(person,3.8);
  status(person.name+" inside Hearthside Cabin. Drag the 3D camera to look around.");
};
$("cabinRoof").onclick=()=>{
  cabinRoofVisible=!cabinRoofVisible;
  $("cabinRoof").textContent=cabinRoofVisible?"Remove roof (show interior)":"Put roof back";
  dirty3d=true;refresh3d();
  status("Cabin roof "+(cabinRoofVisible?"visible":"hidden for interior inspection")+".");
};
$("cabinFullCrew").onclick=()=>{
  cabinFullCrew=!cabinFullCrew;
  $("cabinFullCrew").textContent=cabinFullCrew?"Mobile mode: two detailed avatars":"Load every detailed avatar (heavy)";
  dirty3d=true;refresh3d();
  status(cabinFullCrew?"Loading all real 3D character assets; may use significant phone memory.":
    "Mobile view: two real 3D characters; others have name labels only. Blob figures permanently disabled.");
};
$("home").onclick=focusCabin;
$("ranger").onclick=()=>{view.x=280;view.y=-175;dirty3d=true;invalidate();refresh3d();status("Exploring the mountain slopes, hollows and watercourses.");};
$("zoomIn").onclick=()=>zoomAt(rect().width/2,rect().height/2,1.25);
$("zoomOut").onclick=()=>zoomAt(rect().width/2,rect().height/2,.8);
$("resetDemo").onclick=()=>{
  if(!confirm("Reset all local changes? Export your JSON first if you want a backup."))return;
  world=newWorld();resetToWildCabin(world);seed=seedNumber(world.seed);$("seed").value=world.seed;
  view.x=0;view.y=0;setSelection(null);save();dirty3d=true;invalidate();refresh3d();
};
$("photo").onchange=e=>{
  if(photoUrl)URL.revokeObjectURL(photoUrl);
  const file=e.target.files?.[0];
  if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10_000_000){$("photoPreview").hidden=true;status("Choose a JPG, PNG or WebP under 10 MB");return;}
  photoUrl=URL.createObjectURL(file);$("photoPreview").src=photoUrl;$("photoPreview").hidden=false;
  status("Photo shown as local reference only; no character conversion yet");
};
$("modelFile").addEventListener("change",e=>{
  const o=selected(),file=e.target.files?.[0];
  if(!o||o.type!=="npc"||!file){status("Select a person and a GLB character model");return;}
  if(!file.name.toLowerCase().endsWith(".glb")||file.size>45_000_000){
    status("Choose a .glb file under 45 MB");e.target.value="";return;
  }
  localCharacterFiles.set(o.id,file);
  $("clearModel").disabled=false;
  focusObjectIn3D(o,4.4);
  status("Loading detailed 3D character close-up. This model stays in this browser session only.");
});
$("clearModel").onclick=()=>{
  const o=selected();if(!o)return;
  localCharacterFiles.delete(o.id);$("modelFile").value="";
  $("clearModel").disabled=true;dirty3d=true;refresh3d();
  status("Using the real built-in 3D model for "+o.name+" (no blob fallback).");
};
window.addEventListener("resize",()=>{invalidate();engine?.resize();});

// Babylon.js draws terrain and wildlife; HUMAN CHARACTERS MUST LOAD REAL GLBs.
let engine=null,scene=null,camera=null,ground=null;
const generated=[];
function clear3d(){liveRileyModels.clear();for(const item of generated){try{item.dispose();}catch{}}generated.length=0;}
function show3DMessage(s){$("threeStatus").textContent=s;$("threeStatus").hidden=false;}
function track(mesh){generated.push(mesh);return mesh;}
function material(name,color){
  const mat=track(new BABYLON.StandardMaterial(name,scene));
  mat.diffuseColor=BABYLON.Color3.FromHexString(color);
  mat.specularColor=new BABYLON.Color3(.05,.05,.05);return mat;
}
// Riley's game GLB samples the actual face-skin material on export.
// Respect that material to prevent a separate flat/pink body from fighting
// her natural warm textured face. Only older fallback assets need an override.
// Do not recolor a body independently of its preserved face.
function applyRileyFleshTone(result, complexion="fair") {
  const sampledSkin=(result.materials||[]).find(mat=>
    (mat.name||"").toLowerCase().includes("riley complexion matched continuous mannequin skin"));
  if(sampledSkin){
    if("metallic" in sampledSkin)sampledSkin.metallic=0;
    if("roughness" in sampledSkin)sampledSkin.roughness=.78;
    return; // Keep exported body and neck hue matched to original face texture.
  }
  const skinColors={
    fair:"#D3A188", light:"#C6977D", tan:"#B97E62",
    brown:"#8D5B43", deep:"#593D31"
  };
  const tone=BABYLON.Color3.FromHexString(skinColors[complexion]||skinColors.fair);
  function tint(mat) {
    if(!mat)return;
    if("albedoColor" in mat)mat.albedoColor=tone.clone();
    if("diffuseColor" in mat)mat.diffuseColor=tone.clone();
    if("metallic" in mat)mat.metallic=0;
    if("roughness" in mat)mat.roughness=.9;
    if("specularColor" in mat)mat.specularColor=new BABYLON.Color3(.045,.035,.03);
    if("emissiveColor" in mat)mat.emissiveColor=tone.scale(.025);
    mat.markAsDirty?.(BABYLON.Material.AllDirtyFlag);
  }
  let skinMaterialFound=false;
  for(const mat of result.materials||[]) {
    const name=(mat.name||"").toLowerCase();
    if(name.includes("riley complexion matched continuous mannequin skin")||
       name.includes("riley natural warm skin tone")) {
      tint(mat);skinMaterialFound=true;
    }
  }
  // Compatibility with previous GLBs where the skin shader had a generic name.
  // Clone first so an unexpectedly shared source material cannot recolor her face.
  if(!skinMaterialFound)for(const mesh of result.meshes||[]) {
    const name=(mesh.name||"").toLowerCase();
    if(name.includes("riley sculpted anatomical body")||
       name.includes("riley seamless neck transition")) {
      if(!mesh.material)continue;
      const own=mesh.material.clone("Riley body flesh override");
      mesh.material=own;track(own);tint(own);
    }
  }
}
function importCharacterGlb(file,o,x,h,z,buildId) {
  // A complete GLB can contain textured meshes, hair, clothes and skeletons.
  // Import is browser-local; no server uploads, no file bytes in world JSON.
  if(!BABYLON.SceneLoader?.ImportMeshAsync) {
    status("Real 3D character loader unavailable. No blob replacement will appear.");
    return;
  }
  const assetName=typeof file==="string"?file.split("?")[0].split("/").at(-1):file.name;
  BABYLON.SceneLoader.ImportMeshAsync(null,"",file,scene,undefined,".glb").then(result=>{
    const meshes=result.meshes||[];
    if(buildId!==previewBuildId) {
      for(const root of meshes.filter(m=>!m.parent||!meshes.includes(m.parent)))root.dispose(false,true);
      (result.animationGroups||[]).forEach(v=>v.dispose());
      (result.skeletons||[]).forEach(v=>v.dispose());
      return;
    }
    for(const group of (result.animationGroups||[])){group.stop();track(group);}
    (result.skeletons||[]).forEach(track);
    (result.materials||[]).forEach(track);
    // World-space AABB gives a stable standing scale for differently authored GLBs.
    let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
    for(const m of meshes){
      if(!m.getBoundingInfo||!m.getTotalVertices||!m.getTotalVertices())continue;
      m.computeWorldMatrix(true);
      const bounds=m.getBoundingInfo().boundingBox;
      const lo=bounds.minimumWorld,hi=bounds.maximumWorld;
      minX=Math.min(minX,lo.x);minY=Math.min(minY,lo.y);minZ=Math.min(minZ,lo.z);
      maxX=Math.max(maxX,hi.x);maxY=Math.max(maxY,hi.y);maxZ=Math.max(maxZ,hi.z);
    }
    if(!Number.isFinite(maxY)||maxY-minY<.01)throw Error("GLB has no usable 3D mesh");
    const node=track(new BABYLON.TransformNode("custom model "+o.id,scene));
    const roots=meshes.filter(m=>!m.parent || !meshes.includes(m.parent));
    roots.forEach(m=>m.parent=node);
    // A kneeling person should stay shorter than her standing height.
    const isRiley=o.modelKey==="riley";
    const isMPFB=["amy","chrissy","caitlyn","mason","sha"].includes(o.modelKey);
    // Bone animation changes the pose, not the base mesh or measured height.
    const naturalHeight=o.modelKey==="mason"?1.82:1.70;
    const scale=Math.min(100,naturalHeight/(maxY-minY));
    node.scaling.setAll(scale);
    // Imported GLB parent transforms can shift the mesh after parenting.
    // Anchor its actual lowest vertex just above the local terrain.
    node.position.set(0,0,0);
    node.computeWorldMatrix(true);
    let fMinX=Infinity,fMaxX=-Infinity,fMinY=Infinity,fMinZ=Infinity,fMaxZ=-Infinity;
    for(const mesh of meshes){
      if(!mesh.getBoundingInfo||!mesh.getTotalVertices||!mesh.getTotalVertices())continue;
      mesh.computeWorldMatrix(true);
      const bounds=mesh.getBoundingInfo().boundingBox;
      fMinX=Math.min(fMinX,bounds.minimumWorld.x);
      fMaxX=Math.max(fMaxX,bounds.maximumWorld.x);
      fMinY=Math.min(fMinY,bounds.minimumWorld.y);
      fMinZ=Math.min(fMinZ,bounds.minimumWorld.z);
      fMaxZ=Math.max(fMaxZ,bounds.maximumWorld.z);
    }
    if(!Number.isFinite(fMinY))throw Error("Imported 3D body has no valid ground bounds");
    node.position.set(x-(fMinX+fMaxX)/2,h+.035-fMinY,z-(fMinZ+fMaxZ)/2);
    if(isRiley){
      if(assetName==="riley-rigged-v1.glb")applyRileyFleshTone(result,o.skin);
      const state=rileyMotionFor(o.id);
      node.rotation.y=state.heading;
      const skeletons=result.skeletons||[];
      if(assetName==="riley-rigged-v1.glb" && (!skeletons.length ||
          !skeletons.some(sk=>(sk.bones?.length||0)>=25))) {
        throw Error("Riley character has no verified articulated skeleton");
      }
      const anims=result.animationGroups||[];
      const actionForPose=pose=>pose==="crouch"?"Riley Kneel":
        pose==="allfours"?"Riley HandsAndKnees":"Riley Idle";
      const action=anims.find(g=>g.name===actionForPose(o.pose)) ||
        anims.find(g=>g.name?.toLowerCase().includes(actionForPose(o.pose).toLowerCase().replace("riley ","")));
      if(action)action.start(o.pose==="standing",1.0,action.from,action.to,false);
      liveRileyModels.set(o.id,{node,baseY:node.position.y,pose:o.pose,
        skeletons,animations:anims,lastHeading:state.heading});
      if(assetName==="riley-rigged-v1.glb") {
        status("Riley rigged character loaded: "+skeletons[0].bones.length+
          " bones; "+anims.length+" skeletal animations");
      }
    }
    if(isMPFB){
      const rigs=result.skeletons||[];
      if(!rigs.some(sk=>(sk.bones?.length||0)>=25))throw Error(o.name+" GLB rig is incomplete");
      const animations=result.animationGroups||[];
      if(o.modelKey==="caitlyn"||o.modelKey==="mason"){
        const characterName=o.modelKey==="mason"?"Mason":"Caitlyn";
        // Apply the actual imported mouth-corner shape keys in the 3D world
        // instead of relying on a static smile painted onto the texture.
        let smileShapes=0;
        for(const mesh of meshes){
          const manager=mesh.morphTargetManager;
          if(!manager)continue;
          for(let i=0;i<manager.numTargets;i++){
            const morph=manager.getTarget(i);
            if(new RegExp(characterName+" Natural Smile (Left|Right)","i").test(morph.name)){
              morph.influence=o.modelKey==="caitlyn"?.12:.78;smileShapes++;
            }
          }
        }
        if(smileShapes!==2)status(characterName+" loaded without both working smile morphs ("+smileShapes+"/2)");
        const clipName=characterName+" "+({
          standing:"Stand",bend:"Bend",
          crouch:"Kneel",allfours:"HandsAndKnees",
          elbows:"ElbowsAndKnees"
        })[o.pose];
        const clip=animations.find(a=>a.name===clipName);
        if(!clip)throw Error(characterName+" missing pose "+clipName);
        const standing=o.pose==="standing";
        clip.start(standing,1,clip.from,clip.to,false);
        // Hold articulated end pose for inspection instead of returning to idle.
        if(!standing){
           clip.goToFrame(clip.to);clip.pause();
           // Force the real last bone transforms as a fallback for Android
           // WebGL sessions that lose a one-shot Babylon animation's hold.
           for(const track of clip.targetedAnimations||[]){
             const anim=track.animation,target=track.target,keys=anim?.getKeys?.();
             if(!target||!keys?.length)continue;
             const value=keys[keys.length-1].value;
             const parts=(anim.targetProperty||"").split(".");
             let holder=target;
             for(const key of parts.slice(0,-1))holder=holder?.[key];
             const field=parts[parts.length-1];
             if(!holder||!field||value==null)continue;
             try{
               const v=value?.clone?value.clone():value;
               if(holder[field]?.copyFrom&&typeof v==="object")holder[field].copyFrom(v);
               else holder[field]=v;
             }catch(_){/* unsupported imported bone property */}
           }
         }
      }else{
        const idle=animations.find(a=>/idle/i.test(a.name))||animations[0];
        if(idle)idle.start(true,1,idle.from,idle.to,false);
      }
    }
    for(const mesh of meshes)track(mesh);
    if(!isRiley)status("Real 3D character loaded: "+o.name);
  }).catch(err=>{
    if(buildId!==previewBuildId)return;
    // Keep the nameplate; never recreate or substitute a procedural person.
    status("Could not load real 3D "+o.name+": "+String(err.message||err).slice(0,160)+
      ". No blob character will be displayed.");
  });
}
function refresh3d() {
  if(!scene||!dirty3d)return;
  dirty3d=false;
  const thisBuild=++previewBuildId;
  clear3d();
  // Rebuild native forest as batched branch/leaf meshes over two terrain
  // resolutions. Far ridges and connected winding waterways are visible too.
  const habitat=renderWildLandscape(BABYLON,scene,track,{cx:view.x,cy:view.y,seed});
  const cabin=world.objects.find(o=>o.id===HEARTHSIDE_CABIN.id&&
    Math.abs(o.x-view.x)<70&&Math.abs(o.y-view.y)<70);
  const cabinGround=cabin?cabinGrade(cabin.x,cabin.y,seed):null;
  const otherMat=material("editable object","#d8ba72");
  const figures=makeFigureBuilder(BABYLON,scene,track);
  if(cabin)buildHearthsideCabin(BABYLON,scene,track,
    cabin.x-view.x,cabinGround,cabin.y-view.y,cabinRoofVisible);
  let detailedPeople=0;
  let deerInPreview=0;
  for(const o of world.objects){
    const x=o.x-view.x,z=o.y-view.y;if(Math.abs(x)>86||Math.abs(z)>86)continue;
    if(o.type==="deer")deerInPreview++;
    const isInsideCabin=!!cabin&&o.type==="npc"&&
      Math.abs(o.x-cabin.x)<9&&Math.abs(o.y-cabin.y)<7;
    const h=isInsideCabin?cabinGround+.38:cabinGrade(o.x,o.y,seed);
    if(o.type==="deer"||o.type==="animal"){
      figures.deer(o,x,h,z);
    }else if(o.type==="npc"){
      if(isInsideCabin){
        // Nameplate marks a saved resident even if their GLB is not currently
        // loaded in phone-safe mode or cannot load. No placeholder body exists.
        const label=track(new BABYLON.DynamicTexture("name "+o.id,{width:384,height:86},scene,false));
        label.hasAlpha=true;
        label.drawText((o.name||"Visitor").slice(0,27),14,60,
          "bold 31px Arial","#ffe9bd","rgba(21,30,24,.84)",true,true);
        const signMat=material("crew badge "+o.id,"#ffffff");
        signMat.diffuseTexture=label;
        signMat.emissiveColor=new BABYLON.Color3(.56,.50,.38);
        signMat.useAlphaFromDiffuseTexture=true;
        signMat.backFaceCulling=false;
        const plate=track(BABYLON.MeshBuilder.CreatePlane("crew name "+o.id,
          {width:2.55,height:.55},scene));
        plate.material=signMat;
        plate.position.set(x,h+2.2,z);
        plate.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
      }
      const characterFile=localCharacterFiles.get(o.id);
      const hasBuiltIn=Object.hasOwn(BUILTIN_CHARACTER_GLB,o.modelKey);
      const loadDetailed=!isInsideCabin||cabinFullCrew||o.id===selectedId||detailedPeople<2;
      if(isInsideCabin&&loadDetailed)detailedPeople++;
      // NEVER render generated blob people. In phone-safe mode, render up to
      // two detailed GLBs (including the selected resident). Everyone else
      // remains a saved cabin occupant, identified by a nameplate.
      if(characterFile&&loadDetailed){
        importCharacterGlb(characterFile,o,x,h,z,thisBuild);
      } else if(hasBuiltIn&&loadDetailed){
        builtInCharacterFile(o.modelKey).then(file=>{
          if(thisBuild===previewBuildId)importCharacterGlb(file,o,x,h,z,thisBuild);
        }).catch(err=>{
          if(thisBuild!==previewBuildId)return;
          status(o.name+" real 3D file unavailable: "+err.message+
            ". No placeholder will be substituted.");
        });
      }
    }else if(o.id===HEARTHSIDE_CABIN.id){
      // Hearthside is the modeled cabin, not a placeholder cube.
    }else{
      const m=track(BABYLON.MeshBuilder.CreateBox(o.name,{size:o.type==="cabin"?6:2},scene));
      m.position.set(x,h+(o.type==="cabin"?3:1.5),z);m.material=otherMat;
    }
  }
  // NO automatic trail grid, cable-like fake creek lines or old props.
  // Wilderness has actual river/creek ribbons and a biome-grown forest.
  $("threeStatus").hidden=true;
  $("previewCoverage").textContent=cabin
    ? "Hearthside Cabin · one furnished room · "+world.objects.filter(o=>o.type==="npc"&&Math.abs(o.x-cabin.x)<9&&Math.abs(o.y-cabin.y)<7).length+
      " people inside · roof "+(cabinRoofVisible?"on":"hidden")+
      ". "+habitat.nearTrees+" native trees nearby · "+habitat.distantTrees+" on outer slopes · "+habitat.understory+" undergrowth/rock/deadfall patches. "+
      (cabinFullCrew?"All real 3D models requested.":"Two real avatars loaded in mobile mode; others named.")
    : "Wild terrain: "+habitat.nearTrees+" native trees nearby · "+habitat.understory+" ground-cover patches · "+habitat.distantTrees+
      " distant trees · "+habitat.species+" species · mountain relief, streams and river.";
}
function init3D(){
  if(!window.BABYLON){show3DMessage("Babylon.js could not load. The 2D map and world data editor still work.");return;}
  try{
    engine=new BABYLON.Engine($("scene"),true,{antialias:true,preserveDrawingBuffer:false});
    scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(.64,.76,.79,1);
    scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor=new BABYLON.Color3(.63,.73,.75);
    scene.fogDensity=.00115;
    camera=new BABYLON.ArcRotateCamera("orbit",-Math.PI/2.5,1.02,165,new BABYLON.Vector3(0,8,0),scene);
    const firstCabin=world.objects.find(o=>o.id===HEARTHSIDE_CABIN.id&&
      Math.abs(o.x-view.x)<70&&Math.abs(o.y-view.y)<70);
    if(firstCabin) {
      camera.target=new BABYLON.Vector3(firstCabin.x-view.x,
        cabinGrade(firstCabin.x,firstCabin.y,seed)+2.8,firstCabin.y-view.y);
      camera.radius=29;
    }
    camera.attachControl($("scene"),true);
    // Phone-friendly inspection: allow moving in close enough to see clothing and facial detail.
    camera.lowerRadiusLimit=.65;camera.upperRadiusLimit=350;
    camera.minZ=.025;
    camera.wheelPrecision=14;
    camera.pinchPrecision=55;
    camera.useNaturalPinchZoom=true;
    const skyLight=new BABYLON.HemisphericLight("soft forest daylight",
      new BABYLON.Vector3(.35,1,.24),scene);
    skyLight.intensity=.85;
    skyLight.groundColor=new BABYLON.Color3(.24,.22,.18);
    const sun=new BABYLON.DirectionalLight("mountain sun",
      new BABYLON.Vector3(-.45,-.9,-.32),scene);
    sun.diffuse=new BABYLON.Color3(1,.92,.79);
    sun.intensity=.64;
    refresh3d();engine.runRenderLoop(()=>{animateRiley(Date.now());scene.render();});
  }catch(e){show3DMessage("3D initialization error: "+e.message);}
}
$("refresh3d").onclick=()=>{characterAssetFiles.clear();dirty3d=true;refresh3d();status("3D preview refreshed with updated model files");};
function zoom3d(factor){
  if(!camera){status("3D preview is not ready yet");return;}
  camera.inertialRadiusOffset=0;
  camera.radius=Math.max(camera.lowerRadiusLimit,Math.min(camera.upperRadiusLimit,camera.radius*factor));
}
$("zoom3dIn").onclick=()=>zoom3d(.60);
$("zoom3dOut").onclick=()=>zoom3d(1.55);
function focusObjectIn3D(o,radius=4.4){
  // Babylon renders only one small terrain tile, not the entire zoomed-out 2D map.
  // Align the local 3D tile with the selected object's world coordinates.
  view.x=o.x;view.y=o.y;dirty3d=true;invalidate();refresh3d();
  if(camera){
    const h=cabinGrade(o.x,o.y,seed);
    // Centre on the entire mannequin instead of its face.
    camera.setTarget(new BABYLON.Vector3(0,h+(["allfours","elbows"].includes(o.pose) ? .46 : o.pose==="crouch" ? .66 : o.pose==="bend" ? .74 : .88),0));
    camera.radius=Math.max(radius,o.pose==="standing"?3.3:2.9);
    camera.alpha=o.modelKey==="riley"?Math.PI/2.25:-Math.PI/2.7;
    camera.beta=1.2;
  }
}
$("inspect3d").onclick=()=>{
  const o=selected();
  if(!o){status("Choose a deer or person on the map first");return;}
  focusObjectIn3D(o,BUILTIN_CHARACTER_GLB[o.modelKey]?2.9:4.4);
  status("Close-up 3D view: "+o.name+" (use 3D +/− or pinch to zoom closer; drag to orbit)");
};
// Find Amy and Christy without duplicating either on repeated taps.
function findOrAddBuiltInCharacter(modelKey){
  let person=world.objects.find(o=>o.type==="npc"&&o.modelKey===modelKey);
  if(!person){
    const base=TEST_CHARACTER_STARTERS.find(o=>o.modelKey===modelKey)||
      (modelKey==="caitlyn"?CAITLYN_STARTER:modelKey==="mason"?MASON_STARTER:modelKey==="sha"?SHA_STARTER:null);
    if(!base||world.objects.length>=5000){status("No room for character");return;}
    person={...base};world.objects.push(person);
  }
  localCharacterFiles.delete(person.id);
  setTool("select");setSelection(person);save();focusObjectIn3D(person,2.9);
  status(person.name+" selected in world map. Drag to orbit and pinch to zoom.");
}
$("findAmy").onclick=()=>findOrAddBuiltInCharacter("amy");
$("findChristy").onclick=()=>findOrAddBuiltInCharacter("chrissy");
$("findCaitlyn").onclick=()=>findOrAddBuiltInCharacter("caitlyn");
$("findMason").onclick=()=>findOrAddBuiltInCharacter("mason");
$("findSha").onclick=()=>findOrAddBuiltInCharacter("sha");
if(new URLSearchParams(location.search).get("focus")==="sha")window.addEventListener("load",()=>setTimeout(()=>findOrAddBuiltInCharacter("sha"),500));
function setCaitlynPose(pose){
  const o=selected();
  if(!o||o.type!=="npc"||o.modelKey!=="caitlyn"){
    status("Select Caitlyn first with Find Caitlyn");return;
  }
  if(!["standing","bend","crouch","allfours","elbows"].includes(pose))return;
  o.pose=pose;
  $("pose").value=pose;
  save();dirty3d=true;focusObjectIn3D(o,3.0);
  status("Caitlyn: "+({standing:"standing",bend:"bending",crouch:"kneeling",
    allfours:"hands and knees",elbows:"elbows and knees"})[pose]+". Drag to orbit, pinch to zoom.");
}
document.querySelectorAll("[data-caitlyn-pose]").forEach(button=>{
  button.onclick=()=>setCaitlynPose(button.dataset.caitlynPose);
});
function setMasonPose(pose){
  const o=selected();
  if(!o||o.type!=="npc"||o.modelKey!=="mason"){
    status("Select Mason first with Find Mason");return;
  }
  if(!["standing","bend","crouch","allfours","elbows"].includes(pose))return;
  o.pose=pose;$("pose").value=pose;
  save();dirty3d=true;focusObjectIn3D(o,3.0);
  status("Mason: "+({standing:"standing",bend:"bending",crouch:"kneeling",
    allfours:"hands and knees",elbows:"elbows and knees"})[pose]+". Drag to orbit and pinch to zoom.");
}
document.querySelectorAll("[data-mason-pose]").forEach(button=>{
  button.onclick=()=>setMasonPose(button.dataset.masonPose);
});

// Pressing Add again selects the original Riley instead of duplicating her.
$("addRiley").onclick=()=>{
  const previous=world.objects.find(item=>item.type==="npc"&&item.modelKey==="riley");
  if(previous){
    previous.outfit="mannequin";
    // Replace any old session-only uploaded GLB with current built-in Riley.
    localCharacterFiles.delete(previous.id);
    setSelection(previous);save();updateSpinButton();focusObjectIn3D(previous,2.9);
    status("Existing Riley selected. Drag to orbit or change her pose.");
    return;
  }
  const o=createAt("npc",{x:view.x+3,y:view.y+3});
  Object.assign(o,{name:"Riley (test)",modelKey:"riley",pose:"standing",gender:"woman",skin:"fair",hair:"blonde",hairStyle:"wavy",face:"heart",body:"athletic",outfit:"mannequin"});
  setSelection(o);save();updateSpinButton();dirty3d=true;focusObjectIn3D(o,2.9);
  status("Riley test figure created. Tap Add Riley again to find her.");
};
function selectedRiley(){
  const o=selected();
  if(!o||o.type!=="npc"||o.modelKey!=="riley"){status("Tap Add / find Riley first");return null;}
  return o;
}
function setRileyPose(pose){
  const o=selectedRiley();if(!o||!RILEY_POSES.includes(pose))return;
  o.pose=pose;
  $("pose").value=pose;
  save();dirty3d=true;focusObjectIn3D(o,pose==="allfours"?3.5:3.0);
  status("Riley: "+(pose==="allfours"?"hands and knees":pose==="crouch"?"kneeling":"standing")+". Drag 3D to orbit.");
}
$("toggleRileyPose").onclick=()=>{
  const o=selectedRiley();if(!o)return;
  setRileyPose(RILEY_POSES[(RILEY_POSES.indexOf(o.pose)+1)%RILEY_POSES.length]);
};
document.querySelectorAll("[data-riley-pose]").forEach(button=>{
  button.onclick=()=>setRileyPose(button.dataset.rileyPose);
});
document.querySelectorAll("[data-riley-turn]").forEach(button=>{
  button.onclick=()=>{
    const o=selectedRiley();if(!o)return;
    const state=rileyMotionFor(o.id);
    state.autoTurn=false;
    state.heading+=Number(button.dataset.rileyTurn)*Math.PI/180;
    updateSpinButton();
    status("Riley turned "+(Number(button.dataset.rileyTurn)<0?"left":"right")+".");
  };
});
function updateSpinButton(){
  const o=selected(),state=o?.modelKey==="riley"?rileyMotionFor(o.id):null;
  const b=$("rileyAutoTurn");
  b.textContent=state?.autoTurn?"Stop turning":"Auto turn 360°";
  b.setAttribute("aria-pressed",String(!!state?.autoTurn));
}
$("rileyAutoTurn").onclick=()=>{
  const o=selectedRiley();if(!o)return;
  const state=rileyMotionFor(o.id);
  state.autoTurn=!state.autoTurn;
  updateSpinButton();
  status(state.autoTurn?"Riley is turning continuously. Tap Stop turning to pause.":"Riley stopped turning.");
};
function animateRiley(now){
  const t=now/1000;
  if(!animateRiley.lastTime)animateRiley.lastTime=now;
  const delta=Math.min(.08,(now-animateRiley.lastTime)/1000);
  animateRiley.lastTime=now;
  for(const [id,rig] of liveRileyModels){
    if(!rig.node||rig.node.isDisposed())continue;
    const motion=rileyMotionFor(id);
    if(motion.autoTurn)motion.heading+=delta*.68;
    let diff=(motion.heading-rig.node.rotation.y+Math.PI)%(2*Math.PI);
    if(diff<0)diff+=2*Math.PI;
    diff-=Math.PI;
    rig.node.rotation.y+=diff*Math.min(1,delta*10);
    // Small natural-looking idle weight shift: no false claim of skeletal animation.
    if(rig.pose==="standing"){
      rig.node.position.y=rig.baseY+Math.sin(t*2.1+id.length)*.004;
      rig.node.rotation.z=Math.sin(t*1.15+id.length)*.003;
    }
    // Scalp and real hair are attached to the Head bone in the GLB.
    // No free-floating wig oscillation or per-strand transform hacks.
  }
}
$("expand3d").onclick=()=>{
  const frame=document.querySelector(".preview-frame");
  const expanded=frame.classList.toggle("expanded");
  $("expand3d").textContent=expanded?"Shrink 3D":"Expand 3D";
  $("expand3d").setAttribute("aria-pressed",String(expanded));
  requestAnimationFrame(()=>engine?.resize());
};
$("removeAllDeer").onclick=()=>{
  const removed=world.objects.filter(o=>o.type==="deer").length;
  if(!removed){status("No deer left. You can place or scatter them again later.");return;}
  world.objects=world.objects.filter(o=>o.type!=="deer");
  herdFocusCursor=-1;
  if(selectedId&&!world.objects.some(o=>o.id===selectedId))setSelection(null);
  save();dirty3d=true;refresh3d();invalidate();
  status(removed+" deer removed. All people, landmarks and other objects preserved.");
};
$("findDeer3d").onclick=()=>{
  const deer=world.objects.filter(o=>o.type==="deer");
  if(!deer.length){status("No deer placed yet. Place or scatter deer first.");return;}
  // One representative per adjacent herd, plus individually placed deer.
  // Preserve every object and its exact coordinates; this only moves the preview.
  const leaders=deer.filter((o,i)=>i===0||!o.herd||deer[i-1].herd!==o.herd);
  herdFocusCursor=(herdFocusCursor+1)%leaders.length;
  const o=leaders[herdFocusCursor];
  setTool("select");
  setSelection(o);
  focusObjectIn3D(o,36);
  status("Showing "+(o.herd||o.name)+" in 3D ("+(herdFocusCursor+1)+"/"+leaders.length+"). Drag to orbit; pinch to zoom.");
};
$("seed").value=world.seed;
setTool("select");setSelection(null);invalidate();
init3D();
// Direct inspection link for a specific existing test avatar. This navigates
// to the character's map tile and frames the camera without resetting the map.
const focusCharacter=new URLSearchParams(window.location.search).get("focus");
if(focusCharacter==="cabin")focusCabin();
else if(["mason","caitlyn","amy","chrissy"].includes(focusCharacter)) {
  findOrAddBuiltInCharacter(focusCharacter);
}
else if(installedMason)status("Mason added to your saved world map near Woodland Trail.");
else if(installedCaitlyn)status("Caitlyn added to your saved world map near Woodland Trail.");
else if(installedTestCharacters)status("Amy and Christy added to your saved world map.");
else if(wildReset)status("The Wild refreshed: cabin and seven people kept; old outside objects cleared; native WV landscape planted.");
else if(cabinJustBuilt)status("Hearthside Cabin is built · all seven test people gathered indoors.");
else if(freshWorldStarted)status("Fresh world ready.");
