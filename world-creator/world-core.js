/**
 * WVLRP World Creator — reproducible terrain, connected trail network, and editor data.
 * Prototype world units are metres. No network requests or user data uploads.
 * The path network is an infinite connected lattice with closed cycles; handcrafted
 * anchors remain fixed. A proper route planner and server persistence come later.
 */
export const CELL = 420;
export const STORAGE_KEY = "wvlrp-world-creator-v1";
export const STARTER_ANCHORS = Object.freeze([
  { id:"anchor-base",type:"anchor",name:"Base Camp",x:-420,y:0,locked:true },
  { id:"anchor-trail",type:"anchor",name:"Woodland Trail",x:0,y:0,locked:true },
  { id:"anchor-ranger",type:"anchor",name:"Ranger Station",x:420,y:0,locked:true },
  { id:"anchor-lake",type:"anchor",name:"Safety Lake (planned)",x:0,y:420,locked:true }
]);
export function seedNumber(s) {
  let h=2166136261;
  for(const c of String(s)) { h^=c.charCodeAt(0); h=Math.imul(h,16777619); }
  return h>>>0;
}
export function hash(x,y,seed=1) {
  let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^(seed|0);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}
const smooth=t=>t*t*(3-2*t);
export function noise(x,y,seed=1) {
  const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
  const a=hash(ix,iy,seed)*(1-fx)+hash(ix+1,iy,seed)*fx;
  const b=hash(ix,iy+1,seed)*(1-fx)+hash(ix+1,iy+1,seed)*fx;
  return a*(1-fy)+b*fy;
}
export function creekY(x,seed=1) {
  return -155+85*Math.sin(x/880+seed%9)+35*(noise(x/390,19,seed)-.5);
}
export function heightAt(x,y,seed=1) {
  // Large Appalachian ridges and small breaks. Carve a valley under the stream.
  const ridges=.21*Math.cos((x*.0012+y*.0024)+1.6*Math.sin(x*.00075));
  const hills=.23*(noise(x/380,y/380,seed)-.5);
  const detail=.12*(noise(x/90,y/90,seed+7)-.5);
  const distance=Math.abs(y-creekY(x,seed));
  const valley=.32*Math.exp(-Math.pow(distance/100,2));
  return Math.max(.03,Math.min(.98,.56+ridges+hills+detail-valley));
}
export function landType(x,y,seed=1) {
  const z=heightAt(x,y,seed);
  if(Math.abs(y-creekY(x,seed))<9) return "creek";
  if(z<.32) return "valley";
  if(z>.74) return "ridge";
  return "woodland";
}
export function trailHorizontal(x,row,seed=1) {
  // Meets every vertical path exactly at intersections, including on chunk borders.
  const half=x/CELL, f=half-Math.floor(half);
  return row*CELL+Math.pow(Math.sin(Math.PI*f),2)*55*
    (noise(Math.floor(half)*.7,row*.7,seed+44)-.5)*2;
}
export function trailVertical(y,col,seed=1) {
  const half=y/CELL,f=half-Math.floor(half);
  return col*CELL+Math.pow(Math.sin(Math.PI*f),2)*55*
    (noise(col*.7,Math.floor(half)*.7,seed+71)-.5)*2;
}
export function newWorld() {
  return {version:1,seed:"WVLRP-Appalachia-01",objects:[],updatedAt:null};
}
export function sanitizedWorld(value) {
  if(!value||typeof value!=="object"||!Array.isArray(value.objects)) throw Error("Invalid world JSON");
  const seed=String(value.seed||"WVLRP-Appalachia-01").slice(0,100);
  const validTypes=new Set(["anchor","deer","npc","animal","cabin","marker"]);
  const objects=value.objects.slice(0,5000).filter(o=>o&&validTypes.has(o.type)&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&Math.abs(o.x)<1e8&&Math.abs(o.y)<1e8).map(o=>({
    id:String(o.id||"item-"+Math.random().toString(36).slice(2)).slice(0,100),
    type:o.type,name:String(o.name||o.type).slice(0,100),x:o.x,y:o.y,
    locked:!!o.locked,behavior:["home-range","wide-roamer","stationary"].includes(o.behavior)?o.behavior:"home-range",
    radius:Math.min(5000,Math.max(0,Number(o.radius)||150)),
    herd:String(o.herd||"").slice(0,100),
    hair:String(o.hair||"brown").slice(0,40),outfit:String(o.outfit||"ranger").slice(0,40),
    gender:["woman","man"].includes(o.gender)?o.gender:"woman",
    skin:["fair","light","tan","brown","deep"].includes(o.skin)?o.skin:"light",
    hairStyle:["long","wavy","ponytail","bob","short"].includes(o.hairStyle)?o.hairStyle:"wavy",
    body:String(o.body||"average").slice(0,40),face:String(o.face||"oval").slice(0,40),
    modelKey:["riley","amy","chrissy","caitlyn","mason"].includes(o.modelKey)?o.modelKey:"",
    pose:["standing","bend","crouch","allfours","elbows"].includes(o.pose)?o.pose:"standing",
    animal:String(o.animal||"fox").slice(0,40)
  }));
  // A clean world has no automatically placed landmarks; the user can add them later.
  return {version:1,seed,objects,updatedAt:typeof value.updatedAt==="string"?value.updatedAt:null};
}
/**
 * Add the two approved experiment figures to this device's current world.
 * Run exactly once per browser using a separate migration marker in studio.js.
 * Never reset the existing map, and never duplicate a model already present.
 * Assets and identity remain separate from Riley / permanent game NPCs.
 */
export const TEST_CHARACTER_STARTERS = Object.freeze([
  Object.freeze({id:"npc-amy-wild",type:"npc",name:"Amy (test)",modelKey:"amy",
    x:-70,y:18,behavior:"stationary",radius:0,locked:false,gender:"woman",
    skin:"light",body:"slim",face:"oval",hair:"red",hairStyle:"long",
    outfit:"mannequin",pose:"standing"}),
  Object.freeze({id:"npc-christy-wild",type:"npc",name:"Christy (test)",modelKey:"chrissy",
    x:70,y:18,behavior:"stationary",radius:0,locked:false,gender:"woman",
    skin:"light",body:"slim",face:"oval",hair:"blonde",hairStyle:"long",
    outfit:"mannequin",pose:"standing"})
]);
export function addTestCharacters(world) {
  if(!world||!Array.isArray(world.objects))throw Error("A valid world is required");
  const added=[];
  for(const original of TEST_CHARACTER_STARTERS){
    if(world.objects.some(o=>o.id===original.id||
        (o.type==="npc"&&o.modelKey===original.modelKey)))continue;
    if(world.objects.length>=5000)break;
    const copy={...original};
    world.objects.push(copy);added.push(copy);
  }
  return added;
}

// Caitlyn is an independent test character; do not alter older map migrations.
export const CAITLYN_STARTER=Object.freeze({
  id:"npc-caitlyn-wild",type:"npc",name:"Caitlyn (test)",modelKey:"caitlyn",
  x:0,y:-76,behavior:"stationary",radius:0,locked:false,gender:"woman",
  skin:"fair",body:"slim",face:"oval",hair:"blonde",hairStyle:"wavy",
  outfit:"mannequin",pose:"standing"
});
export function addCaitlyn(world){
  if(!world||!Array.isArray(world.objects))throw Error("A valid world is required");
  if(world.objects.length>=5000||world.objects.some(o=>
    o.id===CAITLYN_STARTER.id||(o.type==="npc"&&o.modelKey==="caitlyn")))return [];
  const person={...CAITLYN_STARTER};
  world.objects.push(person);
  return [person];
}
// Independent adult male rig, separate from every existing character.
export const MASON_STARTER=Object.freeze({
  id:"npc-mason-wild",type:"npc",name:"Mason (male test)",modelKey:"mason",
  x:-105,y:-108,behavior:"stationary",radius:0,locked:false,gender:"man",
  skin:"tan",body:"athletic",face:"square",hair:"brown",hairStyle:"short",
  outfit:"mannequin",pose:"standing"
});
export function addMason(world){
  if(!world||!Array.isArray(world.objects))throw Error("A valid world is required");
  if(world.objects.length>=5000||world.objects.some(o=>
    o.id===MASON_STARTER.id||(o.type==="npc"&&o.modelKey==="mason")))return [];
  const person={...MASON_STARTER};
  world.objects.push(person);
  return [person];
}
export function makeRng(seed) {
  let a=seedNumber(seed)||1;
  return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function spawnDeer(world,count,atX,atY,groupSize=4) {
  const rng=makeRng(world.seed+":"+world.objects.length+":"+count);
  const created=[],group=Math.max(2,Math.min(8,Math.round(groupSize))),total=Math.max(1,Math.min(500,Math.round(count)));
  for(let i=0;i<total;i++){
    const herdIndex=Math.floor(i/group),a=(herdIndex/Math.max(1,Math.ceil(total/group)))*Math.PI*2;
    const distance=90+80*Math.sqrt(herdIndex),cx=atX+Math.cos(a)*distance,cy=atY+Math.sin(a)*distance;
    const o={id:"deer-"+Date.now().toString(36)+"-"+i+"-"+Math.floor(rng()*1e5),
      type:"deer",name:"White-tailed deer "+(world.objects.filter(v=>v.type==="deer").length+i+1),
      x:Math.round(cx+(rng()-.5)*60),y:Math.round(cy+(rng()-.5)*60),
      behavior:rng()<.2?"wide-roamer":"home-range",radius:150+Math.round(rng()*150),
      herd:"Herd "+(herdIndex+1),locked:false};
    created.push(o);
  }
  world.objects.push(...created);
  return created;
}
export function connectionRule() {
  return "Every generated path segment joins a connected network of loops: no procedural dead-end paths.";
}
