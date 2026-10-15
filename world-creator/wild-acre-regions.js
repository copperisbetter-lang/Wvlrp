/**
 * The Wild — three-acre spatial stream planning (game metres, never GPS).
 *
 * This module describes which independently disposable scene section SHOULD
 * be loaded. A renderer must implement the actual geometry/asset creation
 * and disposal before the legacy large terrain loader can be replaced.
 */
import {WILD_TRAIL_SEGMENTS,COMMUNITY_SITES} from "./wild-reference-layout.js";

export const METRES_PER_FOOT=0.3048;
export const ACRE_SQUARE_METRES=4046.8564224;
export const SECTION_ACRES=3;
export const SECTION_AREA=SECTION_ACRES*ACRE_SQUARE_METRES;
export const PATH_SIDE_METRES=30*METRES_PER_FOOT;
export const PATH_CORRIDOR_WIDTH=2*PATH_SIDE_METRES;
export const PATH_SECTION_LENGTH=SECTION_AREA/PATH_CORRIDOR_WIDTH;
export const WILDERNESS_SIDE=Math.sqrt(SECTION_AREA);

// 132m x 92m = ~3.00 acres, preserving the existing village buildings,
// fire circle, and social clearing in one resident chunk.
export const VILLAGE_SECTION=Object.freeze({
  id:"village:main",kind:"village",acres:132*92/ACRE_SQUARE_METRES,
  minX:27,maxX:159,minZ:39,maxZ:131,
  centerX:93,centerZ:85
});

const dist=(a,b,c,d)=>Math.hypot(a-c,b-d);
function nearestPolyline(x,z,points){
  let best={distance:Infinity,progress:0,totalLength:0,pointX:0,pointZ:0};
  let length=0;
  for(let i=1;i<points.length;i++){
    const [ax,az]=points[i-1],[bx,bz]=points[i];
    const dx=bx-ax,dz=bz-az,segmentLength=Math.hypot(dx,dz);
    if(segmentLength<1e-5)continue;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(segmentLength*segmentLength)));
    const px=ax+dx*t,pz=az+dz*t,distance=dist(x,z,px,pz);
    if(distance<best.distance)best={distance,progress:length+t*segmentLength,
      pointX:px,pointZ:pz,totalLength:0};
    length+=segmentLength;
  }
  best.totalLength=length;
  return best;
}
function natureRoutes(x,z){
  // These equations match the permanent backcountry trails in
  // wild-reference-layout.js. The player can explore indefinitely.
  const row=Math.floor(z/420+0.5);
  const zOnPath=v=>row*420+18*Math.sin(v/92+row*.61);
  const col=Math.floor(x/420+0.5);
  const xOnPath=v=>col*420+16*Math.sin(v/116+col*.63);
  return [
    {routeId:`ew:${row}`,kind:"ew",progress:x,
      distance:Math.abs(z-zOnPath(x)),pointX:x,pointZ:zOnPath(x)},
    {routeId:`ns:${col}`,kind:"ns",progress:z,
      distance:Math.abs(x-xOnPath(z)),pointX:xOnPath(z),pointZ:z}
  ];
}
export function nearestWildPath(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))throw Error("World coordinates must be finite");
  let best=null;
  // Authored paths connect village, cabin, valley branches and later quests.
  for(let i=0;i<WILD_TRAIL_SEGMENTS.length;i++){
    const projection=nearestPolyline(x,z,WILD_TRAIL_SEGMENTS[i]);
    const candidate={...projection,routeId:`authored:${i}`,kind:"authored"};
    if(!best||candidate.distance<best.distance)best=candidate;
  }
  for(const route of natureRoutes(x,z)){
    if(!best||route.distance<best.distance)best=route;
  }
  return best;
}
export function wildSectionAt(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))throw Error("World coordinates must be finite");
  const v=VILLAGE_SECTION;
  if(x>=v.minX&&x<=v.maxX&&z>=v.minZ&&z<=v.maxZ)return v;
  const path=nearestWildPath(x,z);
  if(path.distance<=PATH_SIDE_METRES){
    const index=Math.floor(path.progress/PATH_SECTION_LENGTH);
    return {
      id:`trail:${path.routeId}:${index}`,kind:"trail",
      routeId:path.routeId,routeKind:path.kind,index,
      progress:path.progress,segmentStart:index*PATH_SECTION_LENGTH,
      segmentEnd:(index+1)*PATH_SECTION_LENGTH,
      pathDistance:path.distance,
      corridorHalfWidth:PATH_SIDE_METRES,acres:SECTION_ACRES
    };
  }
  const col=Math.floor(x/WILDERNESS_SIDE),row=Math.floor(z/WILDERNESS_SIDE);
  return {
    id:`woods:${col}:${row}`,kind:"woods",col,row,
    minX:col*WILDERNESS_SIDE,maxX:(col+1)*WILDERNESS_SIDE,
    minZ:row*WILDERNESS_SIDE,maxZ:(row+1)*WILDERNESS_SIDE,
    acres:SECTION_ACRES
  };
}
export function wildSectionPreloads(x,z,section=wildSectionAt(x,z)){
  const picks=new Map();
  const add=(px,pz)=>{const next=wildSectionAt(px,pz);if(next.id!==section.id)picks.set(next.id,next);};
  const edge=18; // metres: stage next section before reaching an edge
  if(section.kind==="village"){
    if(x>section.maxX-edge)add(section.maxX+1,z);
    if(x<section.minX+edge)add(section.minX-1,z);
    if(z>section.maxZ-edge)add(x,section.maxZ+1);
    if(z<section.minZ+edge)add(x,section.minZ-1);
  }else if(section.kind==="woods"){
    if(x>section.maxX-edge)add(section.maxX+1,z);
    if(x<section.minX+edge)add(section.minX-1,z);
    if(z>section.maxZ-edge)add(x,section.maxZ+1);
    if(z<section.minZ+edge)add(x,section.minZ-1);
    const path=nearestWildPath(x,z);
    // When approaching the 30-foot trail corridor, warm its section.
    if(path.distance<=PATH_SIDE_METRES+edge){
      const n=wildSectionAt(path.pointX,path.pointZ);
      if(n.id!==section.id)picks.set(n.id,n);
    }
  }else if(section.kind==="trail"){
    // Following a winding trail must never cause a full-screen reload.
    if(section.progress-section.segmentStart<edge){
      const k=section.index-1;
      picks.set(`trail:${section.routeId}:${k}`,{
        ...section,id:`trail:${section.routeId}:${k}`,index:k,
        segmentStart:k*PATH_SECTION_LENGTH,segmentEnd:(k+1)*PATH_SECTION_LENGTH
      });
    }
    if(section.segmentEnd-section.progress<edge){
      const k=section.index+1;
      picks.set(`trail:${section.routeId}:${k}`,{
        ...section,id:`trail:${section.routeId}:${k}`,index:k,
        segmentStart:k*PATH_SECTION_LENGTH,segmentEnd:(k+1)*PATH_SECTION_LENGTH
      });
    }
    if(section.pathDistance>PATH_SIDE_METRES-2){
      // Prefetch off-trail wilderness before the walker leaves the corridor.
      const far=PATH_SIDE_METRES+1;
      const path=nearestWildPath(x,z);
      const dx=x-path.pointX,dz=z-path.pointZ,r=Math.hypot(dx,dz)||1;
      const next=wildSectionAt(path.pointX+dx/r*far,path.pointZ+dz/r*far);
      if(next.id!==section.id)picks.set(next.id,next);
    }
  }
  return [...picks.values()].slice(0,5);
}
export function makeWildSectionTracker(){
  let active=null;
  return {
    update(x,z){
      const section=wildSectionAt(x,z);
      const changed=section.id!==active?.id;
      const previous=active;
      active=section;
      return {section,changed,previous:changed?previous:null,
        preload:wildSectionPreloads(x,z,section)};
    },
    current(){return active;}
  };
}
export const VILLAGE_BUILDINGS_FIT=COMMUNITY_SITES.every(site=>
  site.x-site.width/2>=VILLAGE_SECTION.minX&&
  site.x+site.width/2<=VILLAGE_SECTION.maxX&&
  site.z-site.depth/2>=VILLAGE_SECTION.minZ&&
  site.z+site.depth/2<=VILLAGE_SECTION.maxZ
);
