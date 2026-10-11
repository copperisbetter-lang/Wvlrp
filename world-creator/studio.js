import {
  CELL, STORAGE_KEY, newWorld, sanitizedWorld, seedNumber, hash, heightAt,
  creekY, trailHorizontal, trailVertical, spawnDeer
} from "./world-core.js";
import { makeFigureBuilder } from "./character-models.js";

const $=id=>document.getElementById(id);
const canvas=$("worldMap"),ctx=canvas.getContext("2d");
let world;
try { world=sanitizedWorld(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
catch { world=newWorld(); }
let seed=seedNumber(world.seed);
const view={x:0,y:0,scale:.40};
let tool="select",selectedId=null,dirty3d=true,renderQueued=false,serial=0;
const pointers=new Map();
let gesture=null,photoUrl=null;
const localCharacterFiles = new Map();
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
  if(!o){invalidate();return;}
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
  $("wildlifeFields").hidden=!(o.type==="deer"||o.type==="animal");
  $("npcFields").hidden=o.type!=="npc";
  for(const el of $("objectForm").querySelectorAll("input:not(#photo),select"))el.disabled=!!o.locked;
  $("deleteObject").disabled=!!o.locked;
  $("commitObject").disabled=!!o.locked;
  if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;}
  $("photoPreview").hidden=true;$("photo").value="";
  $("modelFile").value="";
  $("clearModel").disabled=!localCharacterFiles.has(o.id);
  invalidate();
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
    body:"average",face:"oval",hair:"red",hairStyle:"wavy",gender:"woman",skin:"light",outfit:"ranger",animal:"fox"};
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
  // Render a low-cost topographic grid, sampling the same deterministic height function used by Babylon.
  const step=22, left=view.x-w/(2*view.scale),top=view.y+h/(2*view.scale);
  for(let py=0;py<h+step;py+=step) for(let px=0;px<w+step;px+=step){
    const wx=left+(px+step*.5)/view.scale,wy=top-(py+step*.5)/view.scale;
    const z=heightAt(wx,wy,seed),c=Math.round(z*70);
    const nearCreek=Math.abs(wy-creekY(wx,seed))<20;
    ctx.fillStyle=nearCreek?"#3a5b46":"rgb("+(33+c/3)+","+(69+c)+","+(45+c/3)+")";
    ctx.fillRect(px,py,step+1,step+1);
  }
  const bounds={minX:view.x-w/(2*view.scale),maxX:view.x+w/(2*view.scale),minY:view.y-h/(2*view.scale),maxY:view.y+h/(2*view.scale)};
  function drawLine(points,outer,inner){
    if(points.length<2)return;
    ctx.beginPath();points.forEach((p,i)=>{const s=screen(p.x,p.y);if(i===0)ctx.moveTo(s.x,s.y);else ctx.lineTo(s.x,s.y);});
    ctx.lineWidth=outer;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#27392f";ctx.stroke();
    ctx.lineWidth=inner;ctx.strokeStyle="#d8bd7b";ctx.stroke();
  }
  // Every vertical/horizontal corridor crosses at its exact world-grid node.
  // Thus a newly generated trail always offers a loop and rejoins the network.
  for(let row=Math.floor(bounds.minY/CELL)-1;row<=Math.ceil(bounds.maxY/CELL)+1;row++){
    const pts=[];for(let x=bounds.minX-40;x<=bounds.maxX+40;x+=25)pts.push({x,y:trailHorizontal(x,row,seed)});
    drawLine(pts,8,3.2);
  }
  for(let col=Math.floor(bounds.minX/CELL)-1;col<=Math.ceil(bounds.maxX/CELL)+1;col++){
    const pts=[];for(let y=bounds.minY-40;y<=bounds.maxY+40;y+=25)pts.push({x:trailVertical(y,col,seed),y});
    drawLine(pts,8,3.2);
  }
  ctx.beginPath();
  for(let x=bounds.minX-20,i=0;x<=bounds.maxX+20;x+=15,i++){
    const p=screen(x,creekY(x,seed));if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
  }
  ctx.strokeStyle="#2d596c";ctx.lineWidth=9;ctx.stroke();
  ctx.strokeStyle="#81c7e6";ctx.lineWidth=3;ctx.stroke();
  const picked=selected();
  if(picked&&["deer","animal"].includes(picked.type)&&picked.behavior==="home-range"){
    const p=screen(picked.x,picked.y);
    ctx.beginPath();ctx.arc(p.x,p.y,Math.max(2,(picked.radius||150)*view.scale),0,Math.PI*2);
    ctx.fillStyle="#ecd88b18";ctx.fill();ctx.strokeStyle="#eddaa0b0";ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);
  }
  for(const o of world.objects){
    const p=screen(o.x,o.y);if(p.x< -100||p.x>w+100||p.y< -100||p.y>h+100)continue;
    const radius=o.type==="anchor"?9:6;
    ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
    ctx.fillStyle=colors[o.type]||"#fff";ctx.fill();
    ctx.lineWidth=selectedId===o.id?3:1.5;ctx.strokeStyle=selectedId===o.id?"#fff":"#18251b";ctx.stroke();
    if(o.type==="anchor"||selectedId===o.id||view.scale>.95){
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
  if(o.type==="npc"){for(const field of ["gender","skin","body","face","hair","hairStyle","outfit"])o[field]=$(field).value;}
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
    lifeguard:{gender:"man",skin:"tan",body:"athletic",face:"square",hair:"brown",hairStyle:"short",outfit:"lifeguard"}
  };
  const look=looks[$("characterPreset").value];
  if(!look){status("Choose a character style first");return;}
  for(const [key,value] of Object.entries(look))$(key).value=value;
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
$("home").onclick=()=>{view.x=-420;view.y=0;dirty3d=true;invalidate();refresh3d();};
$("ranger").onclick=()=>{view.x=420;view.y=0;dirty3d=true;invalidate();refresh3d();};
$("zoomIn").onclick=()=>zoomAt(rect().width/2,rect().height/2,1.25);
$("zoomOut").onclick=()=>zoomAt(rect().width/2,rect().height/2,.8);
$("resetDemo").onclick=()=>{
  if(!confirm("Reset all local changes? Export your JSON first if you want a backup."))return;
  world=newWorld();seed=seedNumber(world.seed);$("seed").value=world.seed;
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
  dirty3d=true;refresh3d();
  status("Loading detailed 3D character. This model stays in this browser session only.");
});
$("clearModel").onclick=()=>{
  const o=selected();if(!o)return;
  localCharacterFiles.delete(o.id);$("modelFile").value="";
  $("clearModel").disabled=true;dirty3d=true;refresh3d();
  status("Using built-in preview for "+o.name);
};
window.addEventListener("resize",()=>{invalidate();engine?.resize();});

// Babylon.js renders a lightweight editable-scene preview, not final player graphics.
let engine=null,scene=null,camera=null,ground=null;
const generated=[];
function clear3d(){for(const item of generated){try{item.dispose();}catch{}}generated.length=0;}
function show3DMessage(s){$("threeStatus").textContent=s;$("threeStatus").hidden=false;}
function track(mesh){generated.push(mesh);return mesh;}
function material(name,color){
  const mat=track(new BABYLON.StandardMaterial(name,scene));
  mat.diffuseColor=BABYLON.Color3.FromHexString(color);
  mat.specularColor=new BABYLON.Color3(.05,.05,.05);return mat;
}
function importCharacterGlb(file,o,x,h,z,fallback,buildId) {
  // A complete GLB can contain textured meshes, hair, clothes and skeletons.
  // Import is browser-local; no server uploads, no file bytes in world JSON.
  if(!BABYLON.SceneLoader?.ImportMeshAsync) {
    status("Babylon GLB loader is unavailable; using built-in preview.");
    return;
  }
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
    const scale=Math.min(100,2.35/(maxY-minY));
    node.scaling.setAll(scale);
    node.position.set(x-(minX+maxX)*scale/2,h-minY*scale,z-(minZ+maxZ)*scale/2);
    for(const mesh of meshes)track(mesh);
    fallback.dispose(false,true);
    status("Detailed GLB preview loaded for "+o.name);
  }).catch(err=>{
    status("Unable to load this GLB; showing built-in figure. "+String(err.message||err).slice(0,130));
  });
}
function refresh3d() {
  if(!scene||!dirty3d)return;
  dirty3d=false;
  const thisBuild=++previewBuildId;
  clear3d();
  const forest=material("forest","#52784b"),trunk=material("trunk","#6f5239"),leaves=material("leaves","#315f35");
  const otherMat=material("object","#d8ba72");
  const figures=makeFigureBuilder(BABYLON,scene,track);
  const blue=material("creek","#519db9");
  ground=track(BABYLON.MeshBuilder.CreateGround("procedural terrain",{width:180,height:180,subdivisions:38,updatable:true},scene));
  const positions=ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  for(let i=0;i<positions.length;i+=3)positions[i+1]=heightAt(view.x+positions[i],view.y+positions[i+2],seed)*26;
  const normals=[];BABYLON.VertexData.ComputeNormals(positions,ground.getIndices(),normals);
  ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind,positions);
  ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind,normals);
  ground.material=forest;
  // Preview trees have stable locations in the current world tile.
  const treeSeed=seedNumber(world.seed);
  // Generate trees from absolute world-grid coordinates so returning to a spot
  // gives the same vegetation rather than repositioning trees with the camera.
  const treeStep=25;
  const minCol=Math.floor((view.x-86)/treeStep),maxCol=Math.ceil((view.x+86)/treeStep);
  const minRow=Math.floor((view.y-86)/treeStep),maxRow=Math.ceil((view.y+86)/treeStep);
  for(let col=minCol;col<=maxCol;col++)for(let row=minRow;row<=maxRow;row++){
    if(hash(col,row,treeSeed)<.28)continue;
    const wx=col*treeStep+(hash(col,row,treeSeed+17)-.5)*12;
    const wy=row*treeStep+(hash(col,row,treeSeed+18)-.5)*12;
    const px=wx-view.x,pz=wy-view.y;
    if(Math.abs(px)>86||Math.abs(pz)>86||Math.abs(wy-creekY(wx,seed))<13)continue;
    const h=heightAt(wx,wy,seed)*26;
    const stem=track(BABYLON.MeshBuilder.CreateCylinder("tree",{height:5,diameter:.75,tessellation:5},scene));
    stem.position.set(px,h+2.5,pz);stem.material=trunk;
    const crown=track(BABYLON.MeshBuilder.CreateSphere("crown",{diameter:5,segments:5},scene));
    crown.scaling.y=1.3;crown.position.set(px,h+7,pz);crown.material=leaves;
  }
  let deerInPreview=0;
  for(const o of world.objects){
    const x=o.x-view.x,z=o.y-view.y;if(Math.abs(x)>86||Math.abs(z)>86)continue;
    if(o.type==="deer")deerInPreview++;
    const h=heightAt(o.x,o.y,seed)*26;
    if(o.type==="deer"||o.type==="animal"){
      figures.deer(o,x,h,z);
    }else if(o.type==="npc"){
      const fallback=figures.person(o,x,h,z);
      const characterFile=localCharacterFiles.get(o.id);
      if(characterFile) importCharacterGlb(characterFile,o,x,h,z,fallback,thisBuild);
    }else{
      const m=track(BABYLON.MeshBuilder.CreateBox(o.name,{size:o.type==="cabin"?6:2},scene));
      m.position.set(x,h+(o.type==="cabin"?3:1.5),z);m.material=otherMat;
    }
  }
  function drawTrail(points){
    if(points.length<2)return;
    const line=track(BABYLON.MeshBuilder.CreateLines("trail",{points},scene));
    line.color=new BABYLON.Color3(.91,.74,.45);
  }
  for(let row=Math.floor((view.y-90)/CELL);row<=Math.ceil((view.y+90)/CELL);row++){
    const pts=[];for(let x=-90;x<=90;x+=3){const wx=view.x+x,wy=trailHorizontal(wx,row,seed);
      if(Math.abs(wy-view.y)<=90)pts.push(new BABYLON.Vector3(x,heightAt(wx,wy,seed)*26+.6,wy-view.y));}
    drawTrail(pts);
  }
  for(let col=Math.floor((view.x-90)/CELL);col<=Math.ceil((view.x+90)/CELL);col++){
    const pts=[];for(let z=-90;z<=90;z+=3){const wy=view.y+z,wx=trailVertical(wy,col,seed);
      if(Math.abs(wx-view.x)<=90)pts.push(new BABYLON.Vector3(wx-view.x,heightAt(wx,wy,seed)*26+.6,z));}
    drawTrail(pts);
  }
  const stream=[];for(let x=-90;x<=90;x+=3){const wx=view.x+x,wy=creekY(wx,seed);
    if(Math.abs(wy-view.y)<=90)stream.push(new BABYLON.Vector3(x,heightAt(wx,wy,seed)*26+.7,wy-view.y));}
  if(stream.length>1){const line=track(BABYLON.MeshBuilder.CreateLines("valley creek",{points:stream},scene));line.color=new BABYLON.Color3(.39,.8,.99);}
  $("threeStatus").hidden=true;
  $("previewCoverage").textContent="3D shows a 180 × 180 m area near the map center · "+deerInPreview+" of "+world.objects.filter(o=>o.type==="deer").length+" deer are inside this area";
}
function init3D(){
  if(!window.BABYLON){show3DMessage("Babylon.js could not load. The 2D map and world data editor still work.");return;}
  try{
    engine=new BABYLON.Engine($("scene"),true,{antialias:true,preserveDrawingBuffer:false});
    scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(.65,.79,.86,1);
    camera=new BABYLON.ArcRotateCamera("orbit",-Math.PI/2.5,1.02,165,new BABYLON.Vector3(0,8,0),scene);
    camera.attachControl($("scene"),true);camera.lowerRadiusLimit=6;camera.upperRadiusLimit=290;
    new BABYLON.HemisphericLight("daylight",new BABYLON.Vector3(.5,1,.2),scene);
    refresh3d();engine.runRenderLoop(()=>scene.render());
  }catch(e){show3DMessage("3D initialization error: "+e.message);}
}
$("refresh3d").onclick=()=>{dirty3d=true;refresh3d();status("3D preview refreshed near map center");};
function focusObjectIn3D(o,radius=14){
  // Babylon renders only one small terrain tile, not the entire zoomed-out 2D map.
  // Align the local 3D tile with the selected object's world coordinates.
  view.x=o.x;view.y=o.y;dirty3d=true;invalidate();refresh3d();
  if(camera){
    const h=heightAt(o.x,o.y,seed)*26;
    camera.setTarget(new BABYLON.Vector3(0,h+1.6,0));
    camera.radius=radius;
    camera.alpha=-Math.PI/2.7;
    camera.beta=1.2;
  }
}
$("inspect3d").onclick=()=>{
  const o=selected();
  if(!o){status("Choose a deer or person on the map first");return;}
  focusObjectIn3D(o,14);
  status("Close-up 3D view: "+o.name+" (drag to orbit, pinch to zoom)");
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
