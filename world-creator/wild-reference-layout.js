/**
 * The Wild — approved 13 October 2026 woodland and community reference layout.
 * World X / Z are metres from Hearthside Cabin (0,0). These markers are the
 * user's original placements, NOT geographic GPS points. Rendered façades are
 * arranged around one walkable clearing because the supplied markers overlap.
 */
export const COMMUNITY_SITES=Object.freeze([
  Object.freeze({id:"wild-ranger-station",name:"Ranger Station",markerX:93,markerZ:77,
    x:93,z:110,width:26,depth:18,roofHeight:10,front:"south"}),
  Object.freeze({id:"wild-laurels-kitchen",name:"Laurel's Kitchen",markerX:90,markerZ:78,
    x:55,z:110,width:25,depth:17,roofHeight:9,front:"south"}),
  Object.freeze({id:"wild-mercantile",name:"Mercantile & Gift Shop",markerX:90,markerZ:75,
    x:131,z:110,width:26,depth:18,roofHeight:10,front:"south"})
]);
export const WILD_TRAIL_SEGMENTS=Object.freeze([
  Object.freeze([[0,17],[9,24],[19,25],[29,30],[41,42],[53,44],[65,56],[79,61],[90,77]]),
  Object.freeze([[90,77],[91,85],[93,93],[93,96]]),
  Object.freeze([[90,77],[79,82],[67,84],[55,96]]),
  Object.freeze([[90,77],[105,81],[119,87],[131,96]]),
  // A second winding path extends out of the village toward the hills.
  Object.freeze([[93,96],[95,131],[110,154],[104,190],[121,229]]),
  Object.freeze([[131,96],[149,81],[178,86],[209,76]])
]);
function distSeg(x,z,a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}
export function pathDistance(x,z){
  let best=Infinity;
  // Exact, approved woodland entrance and individual community walks.
  if(x>-25&&x<247&&z>-20&&z<260){
    for(const path of WILD_TRAIL_SEGMENTS)for(let i=1;i<path.length;i++)
      best=Math.min(best,distSeg(x,z,path[i-1],path[i]));
  }
  // Endless connecting backcountry trails. Their bends have no cut seams at
  // world tile boundaries and avoid a straight road/grid appearance.
  const fx=x/420,fz=z/420;
  const wx=x-420*Math.round(fx),wz=z-420*Math.round(fz);
  const alongEast=Math.abs(wz-18*Math.sin(x/92+Math.floor(fz+.5)*.61));
  const alongNorth=Math.abs(wx-16*Math.sin(z/116+Math.floor(fx+.5)*.63));
  // Smaller, secondary walking paths are sparse, not asphalt-like highways.
  return Math.min(best,alongEast,alongNorth);
}
export function siteDistance(x,z,site){
  const dx=Math.max(0,Math.abs(x-site.x)-site.width*.48);
  const dz=Math.max(0,Math.abs(z-site.z)-site.depth*.56);
  return Math.hypot(dx,dz);
}
// Keep the original cabin-marker positions above unchanged. The rendered
// village, however, shares ONE buildable bench cut into the hillside.
// Buildings occupy the north edge, facing the broad south-facing fire circle.
// All coordinates here are world metres relative to Hearthside (0,0).
export const VILLAGE_CLEARING=Object.freeze({
  centerX:93,centerZ:85,halfWidth:66,halfDepth:43,transition:15,
  fireX:93,fireZ:65
});
function plateauDistance(x,z){
  const c=VILLAGE_CLEARING;
  return Math.hypot(Math.max(0,Math.abs(x-c.centerX)-c.halfWidth),
                    Math.max(0,Math.abs(z-c.centerZ)-c.halfDepth));
}
export function isCommunityClearing(x,z){
  // Trunks cannot grow through the shared plaza, cabin walls or their stairs.
  // Keep the native forest wall close behind the cabins and along both sides.
  return plateauDistance(x,z)<3.7 ||
    COMMUNITY_SITES.some(site=>siteDistance(x,z,site)<4.2);
}
export function isWalkableTrail(x,z){return pathDistance(x,z)<2.7;}
export function keepForestTree(x,z){
  return !isCommunityClearing(x,z)&&pathDistance(x,z)>3.35;
}
export function keepUnderstory(x,z){
  // Leave the meeting space open. Its perimeter gets natural fern/laurel
  // masses, while tubs and planters decorate the building foundations.
  return !isCommunityClearing(x,z)&&pathDistance(x,z)>1.95;
}
export function gradeCommunityGround(x,z,naturalHeight,heightAtSite){
  const d=plateauDistance(x,z),c=VILLAGE_CLEARING;
  if(d>=c.transition)return naturalHeight;
  const t=Math.max(0,Math.min(1,d/c.transition));
  const smooth=t*t*(3-2*t);
  // Exactly one elevation for all three foundations AND the campfire.
  // The transition outside the clearing blends into the untouched ridge.
  const flat=heightAtSite({x:c.centerX,z:c.centerZ});
  return flat*(1-smooth)+naturalHeight*smooth;
}
