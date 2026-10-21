/** Streamed photographic forest floor; no fallen logs. */
import {hash} from "./world-core.js";
import {FOREST_CAMPS,forestExclusion} from "./wild-master-forest-reservations.js";
const SOURCES=[["fern","./assets/village-floor-fern_02.glb"],["rock","./assets/village-floor-rock_moss_set_01.glb"],["stump","./assets/village-floor-tree_stump_01.glb"]];
const LAKES=[[-165,-180,72,52],[410,-340,95,72]];
function shore(x,z){
 let d=Infinity;
 for(const [cx,cz,rx,rz] of LAKES){
  const r=Math.hypot((x-cx)/rx,(z-cz)/rz);
  d=Math.min(d,Math.abs(r-1)*Math.min(rx,rz));
 }
 // Match the actual water ribbon, including its cabin-clearance bend.
 for(let stream=0;stream<3;stream++){
  const [ox,oz,rx]=LAKES[stream%2];
  const t=(z-oz)/700+.5;
  if(t<0||t>1)continue;
  let sx=ox+rx*.7+30*Math.sin(t*10+stream*2)+stream*75;
  const influence=Math.max(0,Math.min(1,(150-Math.abs(z))/95));
  const eased=influence*influence*(3-2*influence);
  if(Math.abs(sx)<58&&eased>0)sx+=(sx<0?-1:1)*(58-Math.abs(sx))*eased;
  d=Math.min(d,Math.abs(x-sx));
 }
 return d;
}
export function installWildUnderstoryExpansion(B,scene,{seed=1,terrainHeight,getPosition,excluded=()=>false,mobile=false}={}){
 const root=new B.TransformNode("The Wild photographic understory - no logs",scene);
 const state={status:"loading",planted:0,counts:{fern:0,rock:0,stump:0,shrub:0},error:"",dispose(){
  scene.onBeforeRenderObservable.remove(observer);root.dispose(false,true);
 }};
 const assets=new Map();
 const ready=Promise.all(SOURCES.map(async ([kind,url])=>{
  try{const c=await B.SceneLoader.LoadAssetContainerAsync("",url,scene);
   if(c.meshes.some(m=>m.getTotalVertices?.()>0))assets.set(kind,c);
  }catch(e){console.warn("Understory source missing",kind,e);}
 })).then(()=>{state.status=assets.size?"ready":"awaiting-real-assets";rebuild();});
 let region="",generation=0,frame=0;
 function prohibited(x,z,margin){
  if(excluded(x,z,margin)&&Math.hypot(x,z)>22)return true;
  if(forestExclusion(x,z,margin))return true;
  if(FOREST_CAMPS.some(c=>Math.hypot(x-(c.x??c.centerX??1e8),z-(c.z??c.centerZ??1e8))<22+margin))return true;
  if([[0,0,11],[93,77,55],[0,274,36],[30,333,40]].some(([a,b,r])=>Math.hypot(x-a,z-b)<r+margin))return true;
  // Preserve paths: trails near village and the girls' cabin remain unobstructed.
  if(Math.abs(x-93)<5&&z>30&&z<150)return true;
  return false;
 }
 function rebuild(){
  if(!assets.size)return;
  const p=getPosition(),cx=Math.round(p.x/90)*90,cz=Math.round(p.z/90)*90,key=cx+","+cz;
  if(key===region)return;region=key;
  const token=++generation;
  for(const child of root.getChildren())child.dispose(false,true);
  state.planted=0;for(const k of Object.keys(state.counts))state.counts[k]=0;
  const step=mobile?5:4,limit=mobile?420:760;
  for(let x=cx-150;x<=cx+150&&state.planted<limit;x+=step)
   for(let z=cz-150;z<=cz+150&&state.planted<limit;z+=step){
    if(token!==generation)return;
    const px=x+(hash(x,z,seed+991)-.5)*step*.75,pz=z+(hash(x,z,seed+992)-.5)*step*.75;
    const edge=shore(px,pz),wet=edge<13;
    const roll=hash(x,z,seed+993);
    const kind=wet?(roll<.82?"rock":roll<.88?"fern":null):
      (roll<.17?"rock":roll<.25?"fern":roll<.32?"stump":null);
    if(!kind||prohibited(px,pz,wet?1.5:3))continue;
    const c=assets.get(kind);if(!c)continue;
    try{
     const inst=c.instantiateModelsToScene(n=>"wild-understory-"+kind+"-"+n,false,{doNotInstantiate:false});
     const holder=new B.TransformNode("wild "+kind,scene);
     for(const node of inst.rootNodes)node.parent=holder;
     const meshes=holder.getChildMeshes(false).filter(m=>m.getTotalVertices?.()>0);
     if(!meshes.length){holder.dispose(false,true);continue;}
     let lo=Infinity,hi=-Infinity,minY=Infinity;
     for(const m of meshes){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;
      lo=Math.min(lo,b.minimumWorld.x,b.minimumWorld.z);hi=Math.max(hi,b.maximumWorld.x,b.maximumWorld.z);
      minY=Math.min(minY,b.minimumWorld.y);
      m.isPickable=false;m.checkCollisions=false;
     }
     const variant=hash(x,z,seed+995);
     const size=kind==="fern"?1.35:kind==="rock"?(wet?.38+variant*1.95:.3+variant*1.6):.95;
     holder.scaling.setAll(size/Math.max(.01,hi-lo));
     holder.rotation.y=hash(x,z,seed+994)*Math.PI*2;
     holder.position.set(px,terrainHeight(px,pz)-minY*holder.scaling.x-(kind==="rock"?.08+variant*.2:.04),pz);
     holder.parent=root;state.planted++;state.counts[kind]++;
    }catch(e){console.warn("Understory instance failed",kind,e);}
   }
 }
 // Permanent PBR inspection specimens, five metres beyond the +Z front steps.
 const inspection=new B.TransformNode("Girls cabin inspection planting",scene);
 const specimens=[["rock",-7,21],["fern",-4,21],["stump",-1,21],["rock",2,21],["fern",5,21],["stump",8,21]];
 ready.then(()=>{for(const [kind,x,z] of specimens){const asset=assets.get(kind);if(!asset)continue;
  try{const inst=asset.instantiateModelsToScene(n=>"inspection-"+kind+"-"+n,false,{doNotInstantiate:false});
   const holder=new B.TransformNode("inspection "+kind,scene);
   for(const node of inst.rootNodes)node.parent=holder;
   const meshes=holder.getChildMeshes(false).filter(m=>m.getTotalVertices?.()>0);
   if(!meshes.length){holder.dispose(false,true);continue;}
   let minY=Infinity,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
   for(const m of meshes){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;
    minY=Math.min(minY,b.minimumWorld.y);minX=Math.min(minX,b.minimumWorld.x);
    maxX=Math.max(maxX,b.maximumWorld.x);minZ=Math.min(minZ,b.minimumWorld.z);maxZ=Math.max(maxZ,b.maximumWorld.z);
    m.isPickable=false;m.checkCollisions=false;}
   const scale=(kind==="rock"?1.3:kind==="fern"?1.35:.85)/Math.max(.01,maxX-minX,maxZ-minZ);
   holder.scaling.setAll(scale);
   holder.position.set(x-(minX+maxX)*.5*scale,terrainHeight(x,z)-minY*scale-.03,z-(minZ+maxZ)*.5*scale);
   holder.parent=inspection;state.inspectionPlanted=(state.inspectionPlanted||0)+1;
  }catch(e){console.warn("Inspection planting failed",kind,e);}
 }});
 const observer=scene.onBeforeRenderObservable.add(()=>{if(++frame%180===0&&assets.size)rebuild();});
 ready.catch(e=>{state.status="error";state.error=String(e);});
 state.ready=ready;return state;
}
