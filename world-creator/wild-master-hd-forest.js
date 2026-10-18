// Deterministic, player-centered HD forest. Keep only one active batch of
// verified tree instances, and rebuild it when the explorer changes region.
import {installAutumnMaples} from "./wild-autumn-maple-scatter.js?v=20261017-centered-v1";
import {installNativeConiferScatter} from "./wild-native-conifer-scatter.js?v=20261017-centered-v1";
import {FOREST_SPECIES_TARGETS,validateForestTargets} from "./wild-master-forest-registry.js";
import {FOREST_CAMPS} from "./wild-master-forest-reservations.js";

export function installMasterHDForest(B,scene,{seed,terrainHeight,excluded=()=>false,getPosition=()=>({x:0,z:0})}={}){
 validateForestTargets();
 if(FOREST_CAMPS.length!==100)throw Error("Forest campsite reservations incomplete");
 // Keep the high-detail population near the player; terrain's independent 30 m tiles remain unchanged.
 // Smaller forest batches improve nearby density without loading hundreds of distant meshes.
 const radius=220,step=140;
 let active=null,pending=null,disposed=false,lastX=NaN,lastZ=NaN;
 const state={
   campsites:FOREST_CAMPS.length,plantingRadiusMetres:radius,streaming:true,
   pendingSpecies:FOREST_SPECIES_TARGETS.filter(s=>s.status.startsWith("pending")).map(s=>s.species),
   get maple(){return active?.maple||pending?.maple||{status:"loading",placements:[],planted:0};},
   get conifer(){return active?.conifer||pending?.conifer||{status:"loading",placements:[],planted:0};},
   get planted(){return (active?.maple.planted||0)+(active?.conifer.planted||0);},
   get status(){return pending?"loading":active?"ready":"loading";},
   get region(){return {x:lastX,z:lastZ};},
   dispose(){disposed=true;scene.onBeforeRenderObservable.remove(observer);active?.maple.dispose();active?.conifer.dispose();pending?.maple.dispose();pending?.conifer.dispose();}
 };
 const start=(x,z)=>{
   if(disposed||pending)return;
   const cx=Math.round(x/step)*step,cz=Math.round(z/step)*step;
   if(cx===lastX&&cz===lastZ)return;
   const batch={
     maple:installAutumnMaples(B,scene,{seed,terrainHeight,centerX:cx,centerZ:cz,
       radius,cellSize:20,density:.72,maxVisible:180,excluded}),
     conifer:installNativeConiferScatter(B,scene,{seed,terrainHeight,centerX:cx,centerZ:cz,
       radius,cellSize:28,maxVisible:70,excluded})
   };
   pending=batch;
   Promise.all([batch.maple.ready,batch.conifer.ready]).then(()=>{
     if(disposed){batch.maple.dispose();batch.conifer.dispose();return;}
     const old=active;active=batch;pending=null;lastX=cx;lastZ=cz;
     old?.maple.dispose();old?.conifer.dispose();
     console.info("HD_FOREST_REGION",{x:cx,z:cz,planted:state.planted});
   }).catch(err=>{
     console.warn("HD forest region failed",err);
     batch.maple.dispose();batch.conifer.dispose();pending=null;
   });
 };
 const p=getPosition();start(p.x,p.z);
 let frames=0;
 const observer=scene.onBeforeRenderObservable.add(()=>{
   if(++frames%120!==0||pending||disposed)return;
   const p=getPosition();
   if(Math.hypot(p.x-lastX,p.z-lastZ)>step*.8)start(p.x,p.z);
 });
 return state;
}
