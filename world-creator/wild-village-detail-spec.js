/**
 * The Wild — 75 m DIAMETER woodland-detail installation around the village.
 * The radius is 37.5 m, never 75 m. Keeps the three buildings, fire circle,
 * mountain sightline and footpaths clear while allowing natural low ground
 * cover across previously barren plaza soil.
 */
import {VILLAGE_CLEARING,COMMUNITY_SITES,pathDistance,siteDistance} from "./wild-reference-layout.js";

// Graphics A/B pilot: procedural/generated trees remain REMOVED in the full
// 75 m diameter square. Only the separate, imported detailed-leaf CC0 oak
// may appear while the user evaluates whether it looks lifelike.
export const VILLAGE_SQUARE_TREES_ENABLED=false;
export const VILLAGE_HD_OAK_ENABLED=true;

export const VILLAGE_DETAIL_ZONE=Object.freeze({
  centerX:VILLAGE_CLEARING.centerX,
  centerZ:VILLAGE_CLEARING.centerZ,
  diameterMetres:75,
  radiusMetres:37.5
});

export function insideVillageDetail(x,z){
  return Math.hypot(x-VILLAGE_DETAIL_ZONE.centerX,z-VILLAGE_DETAIL_ZONE.centerZ)
    <=VILLAGE_DETAIL_ZONE.radiusMetres;
}

function nearestBuilding(x,z){
  return Math.min(...COMMUNITY_SITES.map(site=>siteDistance(x,z,site)));
}
export function allowVillageEdgeTree(x,z){
  if(!insideVillageDetail(x,z))return false;
  const centerDistance=Math.hypot(x-VILLAGE_DETAIL_ZONE.centerX,z-VILLAGE_DETAIL_ZONE.centerZ);
  // A ring of shade trees, not trees grown out of the middle of the plaza.
  if(centerDistance<23.5||centerDistance>VILLAGE_DETAIL_ZONE.radiusMetres-1.4)return false;
  if(nearestBuilding(x,z)<7.5||pathDistance(x,z)<5.8)return false;
  if(Math.hypot(x-VILLAGE_CLEARING.fireX,z-VILLAGE_CLEARING.fireZ)<10)return false;
  // Preserve the center view of the ranger door and the mountain beyond.
  if(Math.abs(x-VILLAGE_DETAIL_ZONE.centerX)<16)return false;
  return true;
}

export function allowVillageGroundDetail(x,z,kind){
  if(!insideVillageDetail(x,z))return false;
  const building=nearestBuilding(x,z),trail=pathDistance(x,z);
  const fire=Math.hypot(x-VILLAGE_CLEARING.fireX,z-VILLAGE_CLEARING.fireZ);
  if(building<2.8||fire<5.5)return false;
  // Tiny leaf scatter can reach the edges of walking trails; upright plants,
  // logs, and stones stay outside routes and the busy fire gathering space.
  if(kind==="leaflitter"||kind==="moss")return trail>1.35;
  if(kind==="rock"||kind==="rock-cluster")return trail>5.2&&building>5.2&&fire>9;
  if(kind==="fallen-log")return trail>7.4&&building>8&&fire>13;
  return trail>3.2&&building>4&&fire>7;
}
