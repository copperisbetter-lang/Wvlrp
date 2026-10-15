/**
 * The Wild — first greenfield rebuild. All coordinates are game metres.
 * THIS DATA is separate from permanent NPCs and the Hearthside cabin models.
 *
 * Broad playable lowland and small view hills; mountain foothills begin well
 * beyond the player hub. Every clearing joins a connected walking-trail graph.
 * The pads are RESERVED, not automatic cabin purchases or player constructions.
 */
export const REBUILD_CLEARINGS=Object.freeze([
  {id:"village",name:"Village reserve",kind:"village",x:93,z:85,radius:70,buildable:false},
  {id:"hearthside",name:"Hearthside / protected characters",kind:"protected-cabin",x:0,z:0,radius:24,buildable:false},
  {id:"cabin-a",name:"Cabin lot A",kind:"cabin-lot",x:200,z:5,radius:19,buildable:true},
  {id:"cabin-b",name:"Cabin lot B",kind:"cabin-lot",x:-135,z:100,radius:20,buildable:true},
  {id:"cabin-c",name:"Cabin lot C",kind:"cabin-lot",x:208,z:268,radius:23,buildable:true},
  {id:"cabin-d",name:"Cabin lot D",kind:"cabin-lot",x:-185,z:265,radius:22,buildable:true},
  {id:"cabin-e",name:"Cabin lot E",kind:"cabin-lot",x:365,z:105,radius:21,buildable:true},
  {id:"camp-a",name:"Creekside campsite reserve",kind:"campsite",x:12,z:238,radius:24,buildable:true},
  {id:"camp-b",name:"Southern campsite reserve",kind:"campsite",x:240,z:-156,radius:22,buildable:true},
  {id:"camp-c",name:"Northern campsite reserve",kind:"campsite",x:365,z:359,radius:25,buildable:true},
  {id:"camp-d",name:"Western campsite reserve",kind:"campsite",x:-198,z:-150,radius:24,buildable:true},
  {id:"lookout-a",name:"Sunset overlook",kind:"lookout",x:-284,z:380,radius:20,buildable:false},
  {id:"lookout-b",name:"Mountain-view overlook",kind:"lookout",x:294,z:435,radius:23,buildable:false}
].map(p=>Object.freeze(p)));

export const REBUILD_CONNECTIONS=Object.freeze([
  ["hearthside","village"],["village","cabin-a"],["village","cabin-b"],
  ["village","camp-a"],["village","camp-b"],["village","cabin-c"],
  ["cabin-a","cabin-e"],["cabin-a","camp-b"],["cabin-b","cabin-d"],
  ["cabin-b","camp-d"],["cabin-d","lookout-a"],["cabin-d","camp-a"],
  ["camp-a","cabin-c"],["cabin-c","camp-c"],["cabin-c","lookout-b"],
  ["camp-c","lookout-b"],["cabin-e","camp-c"],["hearthside","camp-d"]
].map(pair=>Object.freeze(pair)));

const byId=new Map(REBUILD_CLEARINGS.map(p=>[p.id,p]));
const cubic=t=>t*t*(3-2*t);
const clamp=t=>Math.max(0,Math.min(1,t));
export const clearingById=id=>byId.get(id)||null;
export const isProtectedCabin=(x,z)=>Math.hypot(x,z)<26;

// All generated paths are fixed between endpoints across tile boundaries,
// independent of viewport, mobile budget, camera position, and multiplayer.
export const REBUILD_PATHS=Object.freeze(REBUILD_CONNECTIONS.map(([a,b],i)=>{
  const p=byId.get(a),q=byId.get(b);
  if(!p||!q)throw Error("Missing trail intersection: "+a+" "+b);
  const dx=q.x-p.x,dz=q.z-p.z;
  const distance=Math.hypot(dx,dz),nx=-dz/distance,nz=dx/distance;
  const amplitude=Math.min(12,distance*.055)*(i%2?1:-1);
  const points=[];
  const n=Math.max(3,Math.ceil(distance/12));
  for(let j=0;j<=n;j++){
    const t=j/n,bend=amplitude*Math.sin(Math.PI*t);
    points.push(Object.freeze([
      p.x+dx*t+nx*bend,
      p.z+dz*t+nz*bend
    ]));
  }
  return Object.freeze({id:a+"--"+b,from:a,to:b,points:Object.freeze(points)});
}));
export function distanceToPaths(x,z){
  let nearest=Infinity;
  for(const route of REBUILD_PATHS)for(let i=1;i<route.points.length;i++){
    const [ax,az]=route.points[i-1],[bx,bz]=route.points[i];
    const dx=bx-ax,dz=bz-az;
    const t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1));
    const d=Math.hypot(x-(ax+dx*t),z-(az+dz*t));
    if(d<nearest)nearest=d;
  }
  return nearest;
}
export function clearingAt(x,z){
  for(const clearing of REBUILD_CLEARINGS){
    if(Math.hypot(x-clearing.x,z-clearing.z)<clearing.radius)return clearing;
  }
  return null;
}
// Only broad distant ranges become steep. View hills are short 3-6 metre
// lookout rises on gently rolling 0-3 metre fields.
export function flatlandHeight(x,z,seed,base){
  const d=Math.hypot(x-90,z-85);
  const gentle=1.2*Math.sin(x/105+seed*.000017)*Math.cos(z/91)+
    .85*Math.sin((x+z)/58);
  let near=0;
  for(const c of REBUILD_CLEARINGS.filter(c=>c.kind==="lookout")){
    const r=Math.hypot(x-c.x,z-c.z);
    near+=5*Math.exp(-Math.pow(r/85,2));
  }
  // Limit mountains to the distant horizon: no steep ridges around camp,
  // village, or cabin lots. Relief ramps after ~850m from the hub.
  const t=cubic((d-780)/870);
  const foothills=t*(14+20*Math.pow(Math.sin(z/230+x/315),2));
  const mountains=Math.pow(clamp((d-1470)/1400),1.4)*
    (90+45*Math.abs(Math.sin(x/225-z/280)));
  let h=base+gentle+near+foothills+mountains;
  // Each buildable pad gently levels the existing ground, without changing
  // any stored character position or deleting the standing cabin.
  for(const c of REBUILD_CLEARINGS){
    const r=Math.hypot(x-c.x,z-c.z);
    const inside=c.radius*.74;
    if(r>c.radius+15)continue;
    const center=base+1.2*Math.sin(c.x/105+seed*.000017)*Math.cos(c.z/91)+
      .85*Math.sin((c.x+c.z)/58)+
      (c.kind==="lookout"?5:0);
    const blend=1-cubic((r-inside)/(c.radius+15-inside));
    h=h*(1-blend)+center*blend;
  }
  return h;
}
export function isTrailConnected(){
  const adj=new Map(REBUILD_CLEARINGS.map(c=>[c.id,[]]));
  for(const [a,b] of REBUILD_CONNECTIONS){adj.get(a).push(b);adj.get(b).push(a);}
  const seen=new Set(["village"]),pending=["village"];
  while(pending.length)for(const n of adj.get(pending.shift())){
    if(!seen.has(n)){seen.add(n);pending.push(n);}
  }
  return seen.size===REBUILD_CLEARINGS.length;
}
export const REBUILD_LAYOUT_VERSION="appalachian-flatland-with-interconnected-clearings-v1";
