/** Permanent, deterministic forest exclusions for The Wild.
 * All distances are metres. Shared by future HD species scatterers.
 * Does not instantiate geometry or interfere with terrain streaming.
 */
import {REBUILD_CLEARINGS,REBUILD_PATHS} from "./wild-rebuild-layout.js";
export const CAMP_COUNT=100;
export const CAMP_SIDE=15.24; // 50 ft
export const CAMP_BUFFER=3.048; // 10 ft on each side
export const TRAIL_WIDTHS=Object.freeze({main:3.048,woodland:1.829,exploration:.9144});
const clearance=CAMP_SIDE/2+CAMP_BUFFER;
const reserved=REBUILD_CLEARINGS;
const sq=(x,z)=>x*x+z*z;
const distanceToSegment=(x,z,a,b)=>{
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(sq(dx,dz)||1)));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
};
function distanceToRoute(x,z,route){
  let d=Infinity;
  for(let i=1;i<route.points.length;i++)d=Math.min(d,distanceToSegment(x,z,route.points[i-1],route.points[i]));
  return d;
}
function routeClear(x,z,padding=0){
  return REBUILD_PATHS.every(r=>distanceToRoute(x,z,r)>clearance+TRAIL_WIDTHS.main/2+padding);
}
// Deterministic broad distribution. Camps are kept away from existing structures
// and paths, and from each other. Positions never depend on loaded tiles.
const camps=[];
for(let ring=0;ring<12&&camps.length<CAMP_COUNT;ring++){
  const radius=1000+ring*340;
  for(let j=0;j<64&&camps.length<CAMP_COUNT;j++){
    const angle=(j+.61803398875*ring)*Math.PI*2/64;
    const x=Math.round(Math.cos(angle)*radius*100)/100;
    const z=Math.round(Math.sin(angle)*radius*100)/100;
    if(reserved.some(c=>Math.hypot(x-c.x,z-c.z)<c.radius+clearance+15))continue;
    if(camps.some(c=>Math.hypot(x-c.x,z-c.z)<140))continue;
    if(!routeClear(x,z,12))continue;
    camps.push(Object.freeze({id:"forest-camp-"+String(camps.length+1).padStart(3,"0"),x,z,side:CAMP_SIDE,buffer:CAMP_BUFFER}));
  }
}
if(camps.length!==CAMP_COUNT)throw Error("Could not reserve 100 forest campsites");
export const FOREST_CAMPS=Object.freeze(camps);
export function forestExclusion(x,z,trunkRadius=0){
  for(const c of reserved)if(Math.hypot(x-c.x,z-c.z)<c.radius+trunkRadius+2)return "existing-clearing";
  for(const c of FOREST_CAMPS){
    if(Math.abs(x-c.x)<=clearance+trunkRadius&&Math.abs(z-c.z)<=clearance+trunkRadius)return "campsite";
  }
  for(const route of REBUILD_PATHS){
    if(distanceToRoute(x,z,route)<TRAIL_WIDTHS.main/2+trunkRadius+1.5)return "main-trail";
  }
  return null;
}
export function mayPlantTree(x,z,trunkRadius=0){return forestExclusion(x,z,trunkRadius)===null;}
