/**
 * The Wild: deterministic, seamless Appalachian landscape.
 * Dimensions are game metres. This is a procedural prototype, NOT LiDAR or
 * a photogrammetric scan; biome placement follows WV habitat patterns.
 */
import { hash, noise } from "./world-core.js";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const NATIVE_TREES=Object.freeze([
  "tulip-poplar","white-oak","northern-red-oak","chestnut-oak",
  "sugar-maple","red-maple","american-beech","black-cherry",
  "shagbark-hickory","eastern-hemlock","eastern-white-pine",
  "virginia-pine","american-sycamore","river-birch","black-walnut"
]);
export function riverY(x,seed){
  return -260+64*Math.sin(x/730+seed*.000003)+21*Math.sin(x/227+seed*.000013);
}
export function riverLevel(x){return 112-x*.0045;}
export function riverWidth(x,seed){
  return 9+3*noise(x/410,3,seed+79);
}
export function creekPath(anchor,side,t,seed){
  const a=anchor*780+175*(hash(anchor,8,seed)-.5);
  // Mouth at t=0, upstream at t~1000; all branches meet the same river.
  const bend=(18*Math.sin(t/155+anchor*1.7+seed*.000001)-18*Math.sin(anchor*1.7+seed*.000001))*
    Math.min(1,t/140);
  return {x:a-.20*t+bend+side*15*Math.sin(t/300),y:riverY(a,seed)+side*t,anchorX:a};
}
export function nearestCreek(x,y,seed){
  let best=null;
  const k=Math.floor(x/780);
  for(let j=k-2;j<=k+3;j++)for(const side of [-1,1]){
    const mouthX=j*780+175*(hash(j,8,seed)-.5);
    const t=(y-riverY(mouthX,seed))*side;
    if(t<8||t>970)continue;
    const p=creekPath(j,side,t,seed);
    const d=Math.abs(x-p.x);
    if(!best||d<best.distance){
      const width=clamp(3.5-t*.0025,.65,3.5);
      best={distance:d,width,t,side,anchor:j,anchorX:mouthX,
        level:riverLevel(mouthX)+t*.028};
    }
  }
  return best;
}
export function terrainHeight(x,y,seed){
  // Folded, warped ridge axes, cove relief and lower foothill knobs.
  const warp=112*(noise(x/1100,y/1400,seed+31)-.5)+
    41*(noise(x/360,y/460,seed+37)-.5);
  const fold=(y+.24*x+warp)/275;
  const ridge=Math.pow(Math.abs(Math.sin(fold)),1.55);
  const hills=(noise(x/700,y/700,seed+5)-.5)*79;
  const knobs=(noise(x/210,y/210,seed+6)-.5)*29;
  const detail=(noise(x/52,y/52,seed+8)-.5)*7;
  const macro=183+ridge*111+hills+knobs+detail;
  const d=Math.abs(y-riverY(x,seed)),width=riverWidth(x,seed);
  const bank=Math.max(0,d-width);
  const valleyBed=riverLevel(x)-1.4+bank*.20+Math.pow(bank/130,1.55)*17;
  let height=mix(macro,valleyBed,Math.exp(-Math.pow(d/217,2)));
  const creek=nearestCreek(x,y,seed);
  if(creek&&creek.distance<100){
    const b=Math.max(0,creek.distance-creek.width);
    const creekBank=creek.level-.6+b*.42+Math.pow(b/26,1.7)*4.3;
    height=mix(height,creekBank,Math.exp(-Math.pow(creek.distance/43,2)));
  }
  return height;
}
export function cabinGrade(x,y,seed){
  const h=terrainHeight(0,0,seed);
  const distance=Math.max(Math.abs(x)/13,Math.abs(y)/11);
  const t=smooth((distance-1)/1.4);
  return mix(h,terrainHeight(x,y,seed),t);
}
export function waterAt(x,y,seed){
  const r=Math.abs(y-riverY(x,seed));
  if(r<=riverWidth(x,seed))return {kind:"river",level:riverLevel(x)};
  const c=nearestCreek(x,y,seed);
  if(c&&c.distance<=c.width)return {kind:c.t>630?"stream":"creek",level:c.level};
  return null;
}
export function biomeAt(x,y,seed){
  const height=terrainHeight(x,y,seed),d=Math.abs(y-riverY(x,seed));
  const c=nearestCreek(x,y,seed);
  if(Math.hypot(x,y)<30)return "cabin-clearing";
  if(d<90||c&&c.distance<25)return "riparian";
  if(height>255)return "dry-ridge";
  if(height<183||noise(x/270,y/270,seed+107)>.7)return "moist-cove";
  return "mixed-slope";
}
const MIX=Object.freeze({
  "riparian":["american-sycamore","river-birch","red-maple","eastern-hemlock","tulip-poplar"],
  "dry-ridge":["chestnut-oak","northern-red-oak","virginia-pine","eastern-white-pine","shagbark-hickory"],
  "moist-cove":["american-beech","sugar-maple","tulip-poplar","eastern-hemlock","black-cherry"],
  "mixed-slope":["tulip-poplar","white-oak","northern-red-oak","shagbark-hickory","black-walnut","red-maple"]
});
export function treeAtCell(i,j,seed,spacing=9){
  const x=(i+(hash(i,j,seed+111)-.5)*.78)*spacing;
  const y=(j+(hash(i,j,seed+112)-.5)*.78)*spacing;
  if(Math.hypot(x,y)<33)return null;
  const b=biomeAt(x,y,seed);
  if(b==="cabin-clearing")return null;
  // Natural gaps, sapling clusters and canopy veterans.
  const present=hash(i,j,seed+114);
  if(present<.14)return null;
  const species=MIX[b][Math.floor(hash(i,j,seed+113)*MIX[b].length)];
  const age=hash(i,j,seed+115);
  return {x,y,species,biome:b,height:cabinGrade(x,y,seed),
    scale:age<.16?.42+age*1.7:age>.91?1.26+(age-.91)*2.4:.72+age*.46,
    heading:hash(i,j,seed+117)*Math.PI*2,variation:hash(i,j,seed+118),elder:age>.91};
}
export function treesInArea(cx,cy,halfExtent,seed,spacing=9){
  const list=[];
  const minI=Math.floor((cx-halfExtent)/spacing)-2,maxI=Math.ceil((cx+halfExtent)/spacing)+2;
  const minJ=Math.floor((cy-halfExtent)/spacing)-2,maxJ=Math.ceil((cy+halfExtent)/spacing)+2;
  for(let i=minI;i<=maxI;i++)for(let j=minJ;j<=maxJ;j++){
    const tree=treeAtCell(i,j,seed,spacing);
    if(tree&&Math.abs(tree.x-cx)<=halfExtent&&Math.abs(tree.y-cy)<=halfExtent)list.push(tree);
  }
  return list;
}
// Additional stands are generated alongside (not instead of) existing trunks.
// Approximately half as many extra trees as the current forest, with 40% of
// additions native WV evergreens and roughly 30% more old-growth veterans.
export const NATIVE_EVERGREENS=Object.freeze([
  "eastern-hemlock","eastern-white-pine","virginia-pine"
]);
const EXTRA_CONIFERS=Object.freeze({
  "riparian":["eastern-hemlock","eastern-white-pine"],
  "moist-cove":["eastern-hemlock","eastern-white-pine"],
  "dry-ridge":["virginia-pine","eastern-white-pine"],
  "mixed-slope":["eastern-hemlock","eastern-white-pine","virginia-pine"]
});
export function supplementalTreesInArea(cx,cy,halfExtent,seed,spacing=9){
  const list=[];
  const minI=Math.floor((cx-halfExtent)/spacing)-3,maxI=Math.ceil((cx+halfExtent)/spacing)+3;
  const minJ=Math.floor((cy-halfExtent)/spacing)-3,maxJ=Math.ceil((cy+halfExtent)/spacing)+3;
  for(let i=minI;i<=maxI;i++)for(let j=minJ;j<=maxJ;j++){
    const first=treeAtCell(i,j,seed,spacing);
    // Fixed world-grid hash means all forest streaming tiles match seamlessly.
    if(!first||hash(i,j,seed+1207)>=.53)continue;
    const direction=hash(i,j,seed+1208)*Math.PI*2;
    const separation=spacing*(.32+.24*hash(i,j,seed+1209));
    const x=first.x+Math.cos(direction)*separation;
    const y=first.y+Math.sin(direction)*separation;
    if(Math.abs(x-cx)>halfExtent||Math.abs(y-cy)>halfExtent||
      Math.hypot(x,y)<33||waterAt(x,y,seed))continue;
    const biome=biomeAt(x,y,seed);
    if(biome==="cabin-clearing")continue;
    const evergreen=hash(i,j,seed+1210)<.36;
    const candidates=evergreen?EXTRA_CONIFERS[biome]:
      MIX[biome].filter(name=>!NATIVE_EVERGREENS.includes(name));
    const species=candidates[Math.floor(hash(i,j,seed+1211)*candidates.length)];
    // Existing veterans are ~9% of the canopy. Roughly 5% of half as many
    // supplemental trees provides an additional ~30% old-growth trees.
    const elder=hash(i,j,seed+1212)<.050,age=hash(i,j,seed+1213);
    const scale=elder?1.43+.36*age:
      age<.23?.46+age*1.38:.69+age*.47;
    list.push({x,y,species,biome,height:cabinGrade(x,y,seed),scale,
      heading:hash(i,j,seed+1214)*Math.PI*2,
      variation:hash(i,j,seed+1215),elder,evergreen,newGrowth:true});
  }
  return list;
}

export function earthColor(x,y,seed){
  const b=biomeAt(x,y,seed),wet=waterAt(x,y,seed);
  if(wet)return [.14,.24,.26,1];
  const patch=noise(x/15,y/15,seed+821);
  const rock=noise(x/85,y/85,seed+825)>.75;
  const base=b==="cabin-clearing"?[.29,.28,.21]:
    b==="riparian"?[.22,.26,.21]:
    b==="dry-ridge"?[.35,.31,.25]:rock?[.39,.39,.35]:[.31,.27,.20];
  const v=(patch-.5)*.12;
  return [clamp(base[0]+v,0,1),clamp(base[1]+v,0,1),clamp(base[2]+v,0,1),1];
}
