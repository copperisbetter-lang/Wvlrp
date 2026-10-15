/**
 * The Wild: six licensed textured 3D buildings (four CC0, two CC BY).
 * Models are served from our own WVLRP assets/cabins after CI verifies GLB
 * geometry. Never render empty building placeholders; preserved cabins and NPCs
 * are not modified. All displayed geometry comes from licensed source GLBs.
 */
export const CABIN_CANDIDATES=Object.freeze([
  {id:"historic-log-cabin",name:"Historic timber cabin (3D scan)",
   source:"https://www.innerscene.com/tools/library/3d-parts/point-of-pines-slave-cabin-71703bdd",
   author:"Smithsonian Institution (NMAAHC)",license:"CC0",asset:"historic-log-cabin.glb"},
  {id:"a-frame-cabin",name:"A-frame woodland cabin",
   source:"https://www.innerscene.com/tools/library/3d-parts/a-frame-cabin-73442f48",
   author:"Innerscene",license:"CC0",asset:"a-frame-cabin.glb"},
  {id:"pitched-roof-cottage",name:"Pitched-roof cottage",
   source:"https://www.innerscene.com/tools/library/3d-parts/cottage-with-pitched-roof-bc88ab4f",
   author:"Innerscene",license:"CC0",asset:"pitched-roof-cottage.glb"},
  {id:"bungalow-cabin",name:"Woodland bungalow",
   source:"https://www.innerscene.com/tools/library/3d-parts/bungalow-house-85d40048",
   author:"Innerscene",license:"CC0",asset:"bungalow-cabin.glb"},
  // Doug-approved photorealistic comparison candidates (Sketchfab CC BY).
  // A Sketchfab login is required for the official glTF ZIP download.
  // Import the original licensed ZIP/GLB; never substitute a sign as the model.
  {id:"sketchfab-weathered-log-cabin",name:"Weathered Log Cabin",
   source:"https://sketchfab.com/3d-models/wooden-log-cabin-21bf3df011b147598cdb43fea839cef7",
   author:"donnichols",license:"CC BY 4.0",asset:"sketchfab-weathered-log-cabin.glb",requiresLogin:true},
  {id:"sketchfab-forest-cabin",name:"Forest Cabin",
   source:"https://sketchfab.com/3d-models/forest-cabin-game-ready-3d-environment-asset-6549da49369145cf852b2d4e7554b176",
   author:"Sampreeth Yadav",license:"CC BY 4.0",asset:"sketchfab-forest-cabin.glb",requiresLogin:true}
].map(o=>Object.freeze(o)));
export const CABIN_TEST_SLOTS=Object.freeze(CABIN_CANDIDATES.map((o,i)=>
  Object.freeze({...o,x:(i-1.5)*27,z:314})));
const storeName="wvlrp-four-cabins";
function openDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(storeName,1);
    request.onupgradeneeded=()=>request.result.createObjectStore("models");
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>resolve(request.result);
  });
}
async function storedModel(id){
  const db=await openDb();
  try{return await new Promise((resolve,reject)=>{
    const request=db.transaction("models","readonly").objectStore("models").get(id);
    request.onsuccess=()=>resolve(request.result||null);
    request.onerror=()=>reject(request.error);
  });}finally{db.close();}
}
async function rememberModel(id,file){
  const db=await openDb();
  try{return await new Promise((resolve,reject)=>{
    const request=db.transaction("models","readwrite").objectStore("models").put(file,id);
    request.onsuccess=()=>resolve(true);request.onerror=()=>reject(request.error);
  });}finally{db.close();}
}
function textureLabel(B,scene,index,name){
  const tex=new B.DynamicTexture("cabin comparison label "+index,{width:768,height:192},scene,false);
  const ctx=tex.getContext();
  ctx.fillStyle="#183528";ctx.fillRect(0,0,768,192);
  ctx.strokeStyle="#dfd2a5";ctx.lineWidth=8;ctx.strokeRect(5,5,758,182);
  ctx.textAlign="center";ctx.fillStyle="#f4eccf";
  ctx.font="bold 64px Arial";ctx.fillText("CABIN "+(index+1),384,80);
  ctx.font="32px Arial";ctx.fillText(name.slice(0,35),384,135);tex.update();
  const m=new B.StandardMaterial("cabin comparison lettering "+index,scene);
  m.diffuseTexture=tex;m.emissiveColor=new B.Color3(.23,.24,.19);m.backFaceCulling=false;
  return m;
}
function zipEntry(zip,path){
  const normalized=path.replace(/^\.\//,"").replace(/\\/g,"/");
  return zip.file(normalized)||zip.file(decodeURIComponent(normalized))||
    zip.file(Object.keys(zip.files).find(k=>k.toLowerCase()===normalized.toLowerCase()));
}
async function fileAsScene(file){
  const urls=[];
  if(/\.glb$/i.test(file.name)){
    const url=URL.createObjectURL(file);urls.push(url);return {url,ext:".glb",urls};
  }
  if(!/\.zip$/i.test(file.name))throw Error("Select a .glb or Sketchfab glTF .zip file.");
  if(!window.JSZip)throw Error("ZIP importer unavailable; reload the game while online.");
  const zip=await window.JSZip.loadAsync(file);
  const filenames=Object.keys(zip.files);
  const gltfName=filenames.find(n=>/\.gltf$/i.test(n)&&!/\b__MACOSX\b/i.test(n));
  if(!gltfName)throw Error("This ZIP has no scene.gltf. Download Sketchfab's glTF format.");
  const base=gltfName.slice(0,gltfName.lastIndexOf("/")+1);
  const json=JSON.parse(await zip.file(gltfName).async("string"));
  const assetUri=async(asset,defaultType)=>{
    if(!asset?.uri||/^(data:|blob:|https?:)/i.test(asset.uri))return;
    const entry=zipEntry(zip,base+asset.uri);
    if(!entry)throw Error("Missing ZIP asset: "+asset.uri);
    const bytes=await entry.async("uint8array");
    const mime=defaultType==="image"?
      (/\.png$/i.test(asset.uri)?"image/png":/\.webp$/i.test(asset.uri)?"image/webp":"image/jpeg"):
      "application/octet-stream";
    const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
    urls.push(url);asset.uri=url;
  };
  for(const asset of json.buffers||[])await assetUri(asset,"buffer");
  for(const asset of json.images||[])await assetUri(asset,"image");
  const url=URL.createObjectURL(new Blob([JSON.stringify(json)],{type:"model/gltf+json"}));
  urls.push(url);
  return {url,ext:".gltf",urls};
}
function meshLimits(meshes){
  const min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
  let counted=0;
  for(const mesh of meshes){
    if(!mesh.getTotalVertices?.())continue;
    mesh.computeWorldMatrix(true);
    const bounds=mesh.getBoundingInfo()?.boundingBox;
    if(!bounds)continue;counted++;
    for(const key of ["x","y","z"]){
      min[key]=Math.min(min[key],bounds.minimumWorld[key]);
      max[key]=Math.max(max[key],bounds.maximumWorld[key]);
    }
  }
  if(!counted)throw Error("No visible geometry in this file.");
  return {min,max};
}
export function createFourCabinTest({B,scene,groundAt,camera,onStatus,onJump}){
  const root=new B.TransformNode("six real cabin tests - only loaded source files",scene);
  const assigned=new Map(),labels=[],rows=[];
  let visible=false,solo=-1;
  root.setEnabled(false);
  const panel=document.createElement("section");
  panel.id="fourCabinPanel";panel.hidden=true;panel.setAttribute("aria-label","Six cabin comparisons");
  panel.style.cssText="position:fixed;z-index:22;top:100px;right:8px;width:min(330px,calc(100vw - 16px));max-height:calc(100dvh - 126px);overflow:auto;background:#122e24f5;border:1px solid #bdbe9b;border-radius:12px;color:#fff8df;font:12px/1.4 system-ui;padding:12px;box-shadow:0 8px 30px #0009;touch-action:pan-y";
  const header=document.createElement("div");
  header.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:6px";
  header.innerHTML='<strong style="font-size:16px">Compare six cabins</strong>';
  const close=document.createElement("button");close.type="button";close.textContent="✕";close.onclick=()=>panel.hidden=true;
  header.append(close);panel.append(header);
  const intro=document.createElement("p");
  intro.textContent="The original four CC0 cabins load from WVLRP. Your two selected Sketchfab cabins are CC BY models. To see their actual 3D geometry here, sign in at Sketchfab, download each in glTF ZIP format, then choose its ZIP below. Imported models are saved on this device; no fake cabin placeholders are shown.";
  panel.append(intro);
  const allButton=document.createElement("button");allButton.type="button";allButton.textContent="Show all loaded cabins";
  allButton.onclick=()=>{solo=-1;syncVisibility();onStatus("Showing all imported cabin models.");};
  panel.append(allButton);
  const foot=document.createElement("p");
  foot.style.cssText="font-size:11px;opacity:.78";
  foot.textContent="Original model sources and creators are linked above. Four CC0 cabins and two Sketchfab CC BY cabins (attribution required if published). Missing 3D geometry leaves a slot empty; never fake a building with a sign or picture.";
  function syncVisibility(){
    for(let i=0;i<CABIN_TEST_SLOTS.length;i++){
      const m=assigned.get(i);
      const showMesh=!!m&&visible&&(solo<0||solo===i);
      m?.node.setEnabled(showMesh);
      // Show an attribution sign only if its real 3D model exists.
      for(const marker of labels[i]||[])marker.setEnabled(showMesh);
    }
  }
  for(let i=0;i<CABIN_TEST_SLOTS.length;i++){
    const c=CABIN_TEST_SLOTS[i];
    const ground=groundAt(c.x,c.z);
    const sign=B.MeshBuilder.CreatePlane("Cabin "+(i+1)+" attribution label",{width:6.2,height:1.55},scene);
    sign.position.set(c.x,ground+2.75,c.z-8.8);
    sign.rotation.y=Math.PI; // Face south toward players arriving from the test entrance.
    sign.material=textureLabel(B,scene,i,c.name);
    sign.isPickable=false;sign.parent=root;sign.setEnabled(false);
    const marker=B.MeshBuilder.CreateCylinder("Cabin "+(i+1)+" signpost",{diameter:.16,height:2.1,tessellation:8},scene);
    marker.position.set(c.x,ground+1.06,c.z-8.8);
    const material=new B.StandardMaterial("signpost wood "+i,scene);
    material.diffuseColor=B.Color3.FromHexString("#65452f");
    marker.material=material;marker.parent=root;marker.setEnabled(false);
    labels.push([sign,marker]);
    const row=document.createElement("div");
    row.style.cssText="padding:9px 0;border-bottom:1px solid #a3a98c55";
    const heading=document.createElement("div");
    heading.innerHTML='<strong>'+String(i+1)+'. '+c.name+'</strong> · '+c.author;
    row.append(heading);
    const status=document.createElement("div");status.textContent=c.requiresLogin?"Needs Sketchfab glTF ZIP import":"Awaiting verified server-hosted 3D model";status.style.cssText="color:#eddda5;margin:5px 0";
    row.append(status);
    const open=document.createElement("a");
    open.href=c.source;open.target="_blank";open.rel="noopener noreferrer";
    open.textContent=c.requiresLogin?"Get glTF ZIP on Sketchfab ↗":"View model provenance ↗";open.style.cssText="color:#cde9d4;margin-right:8px";
    row.append(open);
    if(c.requiresLogin){
      const steps=document.createElement("p");
      steps.textContent="Sign in on Sketchfab → Download 3D Model → glTF → select the ZIP below. Real 3D model only, no placeholder.";
      steps.style.cssText="margin:5px 0;color:#f0e4b9;font-size:11px";
      row.append(steps);
    }
    const pick=document.createElement("input");pick.type="file";pick.accept=".glb,.zip,model/gltf-binary,application/zip";
    pick.setAttribute("aria-label","Import downloaded model "+(i+1));
    pick.style.cssText="display:block;max-width:100%;font-size:11px;margin:6px 0";
    row.append(pick);
    const soloButton=document.createElement("button");soloButton.type="button";soloButton.textContent="Solo cabin "+(i+1);
    soloButton.onclick=()=>{
      if(!assigned.has(i)){onStatus("Cabin "+(i+1)+" is still loading, or its file was not published.");return;}
      solo=i;syncVisibility();panel.hidden=true;onJump(c.x,c.z-24);
    };
    row.append(soloButton);
    rows.push({status,pick});
    panel.append(row);
    pick.onchange=async()=>{
      const file=pick.files?.[0];if(file)await load(i,file);
      pick.value="";
    };
  }
  panel.append(foot);document.body.append(panel);
  async function load(i,file,persist=true,remoteUrl=null){
    const slot=CABIN_TEST_SLOTS[i],line=rows[i];
    const label=file?.name||slot.asset;
    line.status.textContent="Loading actual 3D mesh: "+label+"…";
    onStatus("Loading licensed cabin "+(i+1)+" of 6…");
    let sceneFile=null,node=null;
    try{
      sceneFile=remoteUrl?{url:remoteUrl,ext:".glb",urls:[]}:await fileAsScene(file);
      const imported=await B.SceneLoader.ImportMeshAsync(null,"",sceneFile.url,scene,undefined,sceneFile.ext);
      const nodes=[...new Set([...(imported.meshes||[]),...(imported.transformNodes||[])])];
      if(!nodes.length)throw Error("No nodes in imported 3D file.");
      const limits=meshLimits(imported.meshes||[]);
      const sizeX=limits.max.x-limits.min.x,sizeZ=limits.max.z-limits.min.z;
      const sizeY=limits.max.y-limits.min.y;
      const unitScale=Math.min(13/Math.max(sizeX,sizeZ,.01),8.8/Math.max(sizeY,.01),100);
      if(!Number.isFinite(unitScale)||unitScale<=0)throw Error("Invalid geometry size.");
      node=new B.TransformNode("Imported licensed cabin "+(i+1),scene);
      const normalize=new B.TransformNode("Centered cabin geometry "+(i+1),scene);
      normalize.parent=node;
      const nodeSet=new Set(nodes);
      for(const entry of nodes)if(!entry.parent||!nodeSet.has(entry.parent))entry.parent=normalize;
      normalize.position.set(-(limits.min.x+limits.max.x)/2,-limits.min.y,-(limits.min.z+limits.max.z)/2);
      node.scaling.setAll(unitScale);
      node.position.set(slot.x,groundAt(slot.x,slot.z)+.05,slot.z);
      const previous=assigned.get(i);
      if(previous){previous.node.dispose(false,true);previous.urls.forEach(URL.revokeObjectURL);}
      assigned.set(i,{node,urls:sceneFile.urls,halfWidth:sizeX*unitScale/2,halfDepth:sizeZ*unitScale/2});
      syncVisibility();
      line.status.textContent="✓ Actual 3D building visible: "+label+" · "+Math.round(unitScale*100)/100+"× scale";
      onStatus(assigned.size+" of 6 real cabin models loaded at the test field.");
      if(persist&&file)try{await rememberModel(slot.id,file);}catch(err){
        line.status.textContent+=" (not saved on device: storage full)";
      }
    }catch(err){
      if(node)node.dispose(false,true);
      if(sceneFile)sceneFile.urls.forEach(URL.revokeObjectURL);
      line.status.textContent="Import failed: "+String(err.message||err).slice(0,150);
      onStatus("Cabin "+(i+1)+" not loaded: "+String(err.message||err).slice(0,100));
      console.error("Cabin comparison import",i,err);
    }
  }
  let autoLoadStarted=false;
  async function loadPublishedBuildings(){
    if(autoLoadStarted)return;
    autoLoadStarted=true;
    for(let i=0;i<CABIN_TEST_SLOTS.length;i++){
      if(assigned.has(i))continue;
      const slot=CABIN_TEST_SLOTS[i];
      const url="./assets/cabins/"+slot.asset+"?v=20261015-real-buildings-v1";
      try{
        const check=await fetch(url,{method:"HEAD"});
        if(!check.ok)throw Error("not published (HTTP "+check.status+")");
        await load(i,null,false,url);
      }catch(err){
        rows[i].status.textContent=slot.requiresLogin?"Download the original glTF ZIP on Sketchfab and import it here.":"3D building missing: "+String(err.message||err).slice(0,85);
        console.warn("Actual cabin asset unavailable",slot.id,err);
      }
      // Sequential downloading prevents four 10MB GLBs from decoding in parallel on phones.
    }
  }
  async function restore(){
    for(let i=0;i<CABIN_TEST_SLOTS.length;i++){
      if(assigned.has(i))continue;
      try{const file=await storedModel(CABIN_TEST_SLOTS[i].id);
        if(file)await load(i,file,false);
      }catch(err){console.info("Cabin "+(i+1)+" not cached",err);}
    }
  }
  return {
    show(){
      visible=true;root.setEnabled(true);syncVisibility();panel.hidden=false;
      loadPublishedBuildings().catch(console.error);
    },
    update(){
      const near=Math.abs(camera.position.x)<125&&Math.abs(camera.position.z-314)<130;
      if(near&&!visible){
        visible=true;root.setEnabled(true);syncVisibility();
      }
      if(near)loadPublishedBuildings().catch(console.error);
    },
    collides(x,z){
      for(const [i,m] of assigned){
        const slot=CABIN_TEST_SLOTS[i];
        if(Math.abs(x-slot.x)<m.halfWidth+.35&&Math.abs(z-slot.z)<m.halfDepth+.35)return true;
      }
      return false;
    },
    hidePanel(){panel.hidden=true;},
    jump(){
      // The test field is at Z=314: always jump to its approach at Z=274.
      // Previous gating left visitors at Hearthside when no GLBs were imported.
      onJump(0,274);
      if(!assigned.size){
        panel.hidden=false;
        onStatus("At the test field. Real 3D buildings are loading from WVLRP; empty positions stay empty until installed.");
        return false;
      }
      return true;
    },
    stats(){return CABIN_TEST_SLOTS.map((s,i)=>({id:s.id,loaded:assigned.has(i),solo:solo===i,x:s.x,z:s.z}));}
  };
}
