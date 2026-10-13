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
export function isCommunityClearing(x,z){
  if(Math.hypot((x-91)/20,(z-77)/16)<1)return true;
  return COMMUNITY_SITES.some(site=>siteDistance(x,z,site)<4.8);
}
export function isWalkableTrail(x,z){return pathDistance(x,z)<2.7;}
export function keepForestTree(x,z){
  return !isCommunityClearing(x,z)&&pathDistance(x,z)>3.35;
}
export function keepUnderstory(x,z){
  return !isCommunityClearing(x,z)&&pathDistance(x,z)>1.95;
}
export function gradeCommunityGround(x,z,naturalHeight,heightAtSite){
  let height=naturalHeight;
  for(const site of COMMUNITY_SITES){
    const dx=Math.abs(x-site.x)/((site.width+10)*.5);
    const dz=Math.abs(z-site.z)/((site.depth+10)*.5);
    const d=Math.max(dx,dz);
    if(d>=1.65)continue;
    const t=Math.max(0,Math.min(1,(d-1.02)/.63));
    const smooth=t*t*(3-2*t);
    height=heightAtSite(site)*(1-smooth)+height*smooth;
  }
  return height;
}
