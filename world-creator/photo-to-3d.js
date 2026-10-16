/* The Wild Photo-to-3D Workshop v0.1
 * Real, meter-scaled, walkable mesh reconstruction guided by one or more photos.
 * This is NOT automatic volumetric reconstruction or a panorama viewer.
 */
(() => {
"use strict";
const B = window.BABYLON;
const $ = id => document.getElementById(id);
const status = message => { $("status").textContent = message; };
if (!B) { status("3D engine did not load. Check connection and reload."); return; }
const canvas = $("renderCanvas");
const engine = new B.Engine(canvas, true, { preserveDrawingBuffer:true, stencil:true, adaptToDeviceRatio:true });
const scene = new B.Scene(engine);
scene.clearColor = new B.Color4(0.63,0.77,0.84,1);
scene.collisionsEnabled = true;
scene.gravity = new B.Vector3(0,-0.06,0);
const sky = new B.HemisphericLight("Natural sky",new B.Vector3(0,1,0),scene);
sky.intensity = 0.85;
sky.diffuse = new B.Color3(0.93,0.98,1);
const sun = new B.DirectionalLight("Afternoon sun",new B.Vector3(-.4,-1,.6),scene);
sun.intensity = 1.0;
sun.diffuse = new B.Color3(1,.96,.84);
const groundMat = new B.StandardMaterial("Preview ground only",scene);
groundMat.diffuseColor = B.Color3.FromHexString("#567357");
const ground = B.MeshBuilder.CreateGround("Preview ground not exported",{width:160,height:160,subdivisions:1},scene);
ground.position.y=-.11;
ground.material=groundMat;
ground.checkCollisions=true;
ground.metadata={photoAsset:false};
const orbit = new B.ArcRotateCamera("Orbit preview camera",-Math.PI/2,1.2,29,new B.Vector3(0,2,0),scene);
orbit.lowerRadiusLimit=4;
orbit.upperRadiusLimit=95;
orbit.lowerBetaLimit=.14;
orbit.upperBetaLimit=Math.PI-.2;
orbit.wheelPrecision=35;
orbit.pinchPrecision=60;
orbit.attachControl(canvas,true);
const walker = new B.UniversalCamera("Walking preview camera",new B.Vector3(0,1.75,-13),scene);
walker.speed=.22;
walker.angularSensibility=4300;
walker.inertia=.58;
walker.ellipsoid=new B.Vector3(.32,.83,.32);
walker.ellipsoidOffset=new B.Vector3(0,-.82,0);
walker.checkCollisions=true;
walker.applyGravity=true;
walker.keysUp=[87,38]; walker.keysDown=[83,40];
walker.keysLeft=[65,37]; walker.keysRight=[68,39];
scene.activeCamera=orbit;
const photos={front:null,left:null,right:null,back:null,interior:null};
const photoNames={front:"Front",left:"Left",right:"Right",back:"Back",interior:"Inside"};
const assetMeshes=[], assetMaterials=[], assetTextures=[];
const saveMesh = m => {m.metadata={photoAsset:true};assetMeshes.push(m);return m;};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const n=(id,def,a,b)=>clamp(Number.isFinite(Number($(id).value))?Number($(id).value):def,a,b);
const dimensions=()=>({
 width:n("width",12,3,40),depth:n("depth",9,3,40),
 height:n("height",3.6,2.2,10),roofRise:n("roofRise",2,.2,7),
 doorWidth:n("doorWidth",1.6,.7,5),doorHeight:n("doorHeight",2.5,1.6,3.4),
 roofType:$("roofType").value,material:$("material").value
});
const sourcePath="./assets/building/";
const textureMat=(label,url,{repeatU=1,repeatV=1,roughness=.86}={})=>{
  const mat = new B.PBRMaterial(label,scene);
  mat.roughness=roughness;mat.metallic=0;mat.backFaceCulling=false;
  if(url){
    const tex = new B.Texture(url,scene,false,false,B.Texture.TRILINEAR_SAMPLINGMODE,
       ()=>{}, ()=>status("A texture couldn't load. Check the file and try again."));
    tex.uScale=repeatU;tex.vScale=repeatV;tex.wrapU=B.Texture.WRAP_ADDRESSMODE;tex.wrapV=B.Texture.WRAP_ADDRESSMODE;
    mat.albedoTexture=tex;assetTextures.push(tex);
  }else{mat.albedoColor=B.Color3.FromHexString("#987453");}
  assetMaterials.push(mat); return mat;
};
function readCropImage(image,side){
  const w=image.naturalWidth,h=image.naturalHeight;
  // Main photo can be cropped to wall region. Other views keep whole frame.
  const top=side==="front"?n("cropTop",0,0,75)/100:0;
  const bottom=side==="front"?n("cropBottom",0,0,75)/100:0;
  const left=side==="front"?n("cropLeft",0,0,75)/100:0;
  const right=side==="front"?n("cropRight",0,0,75)/100:0;
  const sx=w*left,sy=h*top,sw=Math.max(1,w*(1-left-right)),sh=Math.max(1,h*(1-top-bottom));
  const cap=1536, scale=Math.min(1,cap/Math.max(sw,sh));
  const out=document.createElement("canvas");
  out.width=Math.max(2,Math.round(sw*scale));
  out.height=Math.max(2,Math.round(sh*scale));
  out.getContext("2d",{willReadFrequently:false}).drawImage(image,sx,sy,sw,sh,0,0,out.width,out.height);
  return out.toDataURL("image/jpeg",.88);
}
const imageMat=(side,fallback)=>{
  const im=photos[side];return im?textureMat(photoNames[side]+" photo",readCropImage(im,side)):fallback;
};
function quad(name,pts,uvs,mat){
 const m=new B.Mesh(name,scene);
 const data=new B.VertexData();
 data.positions=pts.flatMap(p=>[p[0],p[1],p[2]]);
 data.uvs=uvs.flatMap(p=>[p[0],p[1]]);
 data.indices=pts.length===3?[0,1,2]:[0,1,2,0,2,3];
 const normals=[];
 B.VertexData.ComputeNormals(data.positions,data.indices,normals);
 data.normals=normals;
 data.applyToMesh(m);
 m.material=mat;m.checkCollisions=true;
 return saveMesh(m);
}
function frontWall(w,d,h,dw,dh,mat){
 const z=-d/2, a=-w/2,b=w/2,doorL=-dw/2,doorR=dw/2;
 const section=(name,l,r,low,high)=>{
   if(r-l<.01 || high-low<.01)return;
   quad(name,[[l,low,z],[r,low,z],[r,high,z],[l,high,z]],
   [[(l-a)/w,1-low/h],[(r-a)/w,1-low/h],[(r-a)/w,1-high/h],[(l-a)/w,1-high/h]],mat);
 };
 section("Front left physical wall",a,doorL,0,h);
 section("Front right physical wall",doorR,b,0,h);
 section("Open-door header",doorL,doorR,dh,h);
}
function plainWall(name,p0,p1,p2,p3,mat){
 quad(name,[p0,p1,p2,p3],[[0,1],[1,1],[1,0],[0,0]],mat);
}
function makeRoof(w,d,h,r,roofType,roof,wallMat){
 const a=-w/2,b=w/2,f=-d/2-.15,k=d/2+.15,overhang=.35;
 if(roofType==="flat"){
   const mesh=saveMesh(B.MeshBuilder.CreateBox("Flat solid roof",{width:w+overhang*2,height:.18,depth:d+overhang*2},scene));
   mesh.position.y=h+.09;mesh.material=roof;mesh.checkCollisions=true;return;
 }
 if(roofType==="shed"){
   const aa=a-overhang,bb=b+overhang;
   quad("Sloping shed roof",[[aa,h+r,f],[bb,h,f],[bb,h,k],[aa,h+r,k]],[[0,0],[1,0],[1,1],[0,1]],roof);
   quad("Front triangular shed fill",[[a,h,f+.15],[a,h+r,f+.15],[b,h,f+.15]],[[0,1],[0,0],[1,1]],wallMat);
   quad("Rear triangular shed fill",[[a,h,k-.15],[b,h,k-.15],[a,h+r,k-.15]],[[0,1],[1,1],[0,0]],wallMat);
   return;
 }
 quad("Left 3D roof slope",[[a-overhang,h-.05,f],[0,h+r,f],[0,h+r,k],[a-overhang,h-.05,k]],[[0,0],[1,0],[1,1],[0,1]],roof);
 quad("Right 3D roof slope",[[0,h+r,f],[b+overhang,h-.05,f],[b+overhang,h-.05,k],[0,h+r,k]],[[0,0],[1,0],[1,1],[0,1]],roof);
 quad("Front gable actual triangle",[[a,h,-d/2],[b,h,-d/2],[0,h+r,-d/2]],[[0,1],[1,1],[.5,0]],wallMat);
 quad("Back gable actual triangle",[[b,h,d/2],[a,h,d/2],[0,h+r,d/2]],[[0,1],[1,1],[.5,0]],wallMat);
}
function trim(name,options,position,mat){
 const m=saveMesh(B.MeshBuilder.CreateBox(name,options,scene));
 m.position.copyFromFloats(...position);m.material=mat;m.checkCollisions=true;return m;
}
function clearAsset(){
 for(const m of assetMeshes.splice(0)) m.dispose(false,false);
 for(const t of assetTextures.splice(0))t.dispose();
 for(const m of assetMaterials.splice(0))m.dispose(false,false);
}
function rebuild(){
 try{
  const {width:w,depth:d,height:h,roofRise:r,roofType,material,doorWidth:doorRaw,doorHeight:dhRaw}=dimensions();
  const dw=Math.min(doorRaw,w-.8),dh=Math.min(dhRaw,h-.2);
  clearAsset();
  const wall=textureMat("CC0 timber side wall",sourcePath+material+"_diffuse_2k.jpg",{repeatU:2});
  const floorMat=textureMat("Realistic CC0 floor",sourcePath+"wood_planks_diffuse_2k.jpg",{repeatU:3,repeatV:3});
  const metal=textureMat("Realistic CC0 roof",sourcePath+"corrugated_iron_diffuse_1k.jpg",{repeatU:2,repeatV:2,roughness:.72});
  const frame=textureMat("Doorframe hardwood",sourcePath+"rough_pine_door_diffuse_1k.jpg");
  const front=imageMat("front",wall),left=imageMat("left",wall),right=imageMat("right",wall),back=imageMat("back",wall),inside=imageMat("interior",wall);
  frontWall(w,d,h,dw,dh,front);
  // Front wall is intentionally an actual doorway, not a photograph of a closed door.
  plainWall("Left solid physical wall",[-w/2,0,-d/2],[-w/2,0,d/2],[-w/2,h,d/2],[-w/2,h,-d/2],left);
  plainWall("Right solid physical wall",[w/2,0,d/2],[w/2,0,-d/2],[w/2,h,-d/2],[w/2,h,d/2],right);
  plainWall("Back solid physical wall",[w/2,0,d/2],[-w/2,0,d/2],[-w/2,h,d/2],[w/2,h,d/2],back);
  // Additional optional inside reference is a thin textured rear panel just inside the wall.
  if(photos.interior){
   plainWall("Interior photographed rear view",[-w/2+.05,.03,d/2-.04],[w/2-.05,.03,d/2-.04],
      [w/2-.05,h-.03,d/2-.04],[-w/2+.05,h-.03,d/2-.04],inside);
  }
  const floor=saveMesh(B.MeshBuilder.CreateBox("Walkable floor",{width:w,height:.14,depth:d},scene));
  floor.position.y=-.07;floor.material=floorMat;floor.checkCollisions=true;
  makeRoof(w,d,h,r,roofType,metal,wall);
  // Measured, traversable opening: frame sides + actual overhead lintel.
  const postW=.12;
  trim("Left door jamb",{width:postW,height:dh,depth:.21},[-dw/2,dh/2,-d/2],frame);
  trim("Right door jamb",{width:postW,height:dh,depth:.21},[dw/2,dh/2,-d/2],frame);
  trim("Door top header",{width:dw+.2,height:.12,depth:.23},[0,dh,-d/2],frame);
  orbit.setTarget(new B.Vector3(0,(h+r)/2,0));
  orbit.radius=Math.max(20,Math.hypot(w,d)*1.6);
  if(scene.activeCamera===walker){
   // Preserve the user's current view unless outside new bounds.
   const p=walker.position;
   if(Math.abs(p.x)>w+20||Math.abs(p.z)>d+20)walker.position=new B.Vector3(0,1.75,-d/2-4);
  } else walker.position.copyFromFloats(0,1.75,-d/2-4);
  status("Built "+assetMeshes.length+" actual 3D mesh parts, "+w+"×"+d+" m. Switch to Walk to enter through the front opening.");
 }catch(err){console.error(err);status("Build failed: "+err.message);}
}
let scheduled=0;
const scheduleBuild=()=>{clearTimeout(scheduled);scheduled=setTimeout(rebuild,160);};
["width","depth","height","roofRise","doorWidth","doorHeight","cropTop","cropBottom","cropLeft","cropRight","roofType","material"].forEach(id=>{
 $(id).addEventListener("change",scheduleBuild);
});
$("rebuild").addEventListener("click",rebuild);
$("reset").addEventListener("click",()=>{
 Object.entries({width:12,depth:9,height:3.6,roofRise:2,doorWidth:1.6,doorHeight:2.5,
 cropTop:0,cropBottom:0,cropLeft:0,cropRight:0}).forEach(([key,value])=>$(key).value=value);
 $("roofType").value="gable";$("material").value="pine_bark";rebuild();
});
async function loadPhoto(input,side){
 const file=input.files&&input.files[0];if(!file)return;
 if(!file.type.startsWith("image/")){status("Select a JPG, PNG, WebP or other photograph.");return;}
 if(file.size>30*1024*1024){status("That photo is over 30 MB; resize it before loading.");return;}
 status("Reading "+side+" photograph…");
 const url=URL.createObjectURL(file),im=new Image();
 try{
  await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(new Error("Cannot read image"));im.src=url;});
  photos[side]=im;
  if(side==="front"){
    $("photoThumb").src=url;
    $("photoThumb").hidden=false;
    // Retain object URL while source image is loaded in the editor.
  }else{URL.revokeObjectURL(url);}
  rebuild();
 }catch(e){URL.revokeObjectURL(url);status("Photo error: "+e.message);}
}
Object.keys(photos).forEach(side=>$(side+"Photo").addEventListener("change",e=>loadPhoto(e.target,side)));
function setMode(mode){
 const walking=mode==="walk";
 if(walking){
   orbit.detachControl(canvas);
   scene.activeCamera=walker;
   walker.position.copyFromFloats(0,1.75,-dimensions().depth/2-3.5);
   walker.setTarget(new B.Vector3(0,1.75,0));
   walker.attachControl(canvas,true);
   walker.applyGravity=true;
 }else{
   walker.detachControl(canvas);
   scene.activeCamera=orbit;
   orbit.attachControl(canvas,true);
 }
 $("orbitMode").classList.toggle("active",!walking);
 $("walkMode").classList.toggle("active",walking);
 $("pad").style.display=walking?"block":"none";
 $("lookhint").style.display=walking?"block":"none";
 status(walking?"Walking in REAL 3D. Drag to look, WASD or joystick to move through the doorway.":"Orbit mode: drag to rotate, pinch or wheel to zoom.");
}
$("walkMode").addEventListener("click",()=>setMode("walk"));
$("orbitMode").addEventListener("click",()=>setMode("orbit"));
$("frontView").addEventListener("click",()=>{setMode("orbit");orbit.alpha=-Math.PI/2;orbit.beta=1.32;});
$("birdView").addEventListener("click",()=>{setMode("orbit");orbit.alpha=-Math.PI/2;orbit.beta=.16;});
const pad=$("pad"),knob=$("knob");
let stickX=0,stickY=0,pointerId=null;
const setStick=(x,y)=>{
 const rect=pad.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
 const dx=x-cx,dy=y-cy,len=Math.max(1,Math.hypot(dx,dy)),s=Math.min(1,len/(rect.width*.37));
 stickX=dx/len*s;stickY=dy/len*s;
 knob.style.transform="translate("+(stickX*40)+"px,"+(stickY*40)+"px)";
};
pad.addEventListener("pointerdown",e=>{e.preventDefault();pointerId=e.pointerId;pad.setPointerCapture(e.pointerId);setStick(e.clientX,e.clientY);});
pad.addEventListener("pointermove",e=>{if(e.pointerId===pointerId){e.preventDefault();setStick(e.clientX,e.clientY);}});
const stopStick=e=>{if(pointerId!==null&&(!e||e.pointerId===pointerId)){pointerId=null;stickX=stickY=0;knob.style.transform="";}};
pad.addEventListener("pointerup",stopStick);pad.addEventListener("pointercancel",stopStick);
scene.onBeforeRenderObservable.add(()=>{
 if(scene.activeCamera!==walker||(!stickX&&!stickY))return;
 const forward=walker.getDirection(B.Axis.Z);
 const right=walker.getDirection(B.Axis.X);
 forward.y=right.y=0;forward.normalize();right.normalize();
 const dist=clamp(engine.getDeltaTime(),0,50)*.0048;
 walker.moveWithCollisions(forward.scale(-stickY*dist).add(right.scale(stickX*dist)));
});
function downloadFile(name,contents,type){
 const a=document.createElement("a"),url=URL.createObjectURL(new Blob([contents],{type}));
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),20000);
}
$("exportRecipe").addEventListener("click",()=>{
 const fields=["width","depth","height","roofRise","doorWidth","doorHeight",
   "roofType","material","cropTop","cropBottom","cropLeft","cropRight"];
 const values={};for(const f of fields)values[f]=$(f).value;
 downloadFile("the-wild-photo-model-plan.json",JSON.stringify({
  generator:"WVLRP Photo to 3D Workshop v0.1",format:"photo-guided model recipe",
  notes:"Images are not included; keep original reference photographs separately.",
  referencePhotos:Object.fromEntries(Object.keys(photos).map(k=>[k,Boolean(photos[k])])),
  values
 },null,2),"application/json");
 status("Build plan downloaded. Keep the original photos too.");
});
$("exportGLB").addEventListener("click",async()=>{
 const btn=$("exportGLB");
 btn.disabled=true;status("Preparing textured, real 3D .glb asset…");
 try{
   if(!B.GLTF2Export || !B.GLTF2Export.GLBAsync)throw new Error("GLB exporter did not load.");
   // Export only the actual reconstructed building; never export preview ground,
   // sunlight, the editor's cameras or controls.
   const result=await B.GLTF2Export.GLBAsync(scene,"the-wild-photo-building",{
      shouldExportNode:node=>Boolean(node.metadata&&node.metadata.photoAsset===true)
   });
   result.downloadFiles();
   status("3D GLB export prepared. This mesh is suitable for Babylon/Blender inspection; game installation is a separate step.");
 }catch(err){console.error(err);status("GLB export failed: "+err.message);}
 finally{btn.disabled=false;}
});
engine.runRenderLoop(()=>scene.render());
window.addEventListener("resize",()=>engine.resize());
if("ResizeObserver" in window)new ResizeObserver(()=>engine.resize()).observe(canvas);
rebuild();
})();