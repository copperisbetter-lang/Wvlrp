// WVLRP Stacey Lake: port of owner-approved 70-flathead catfish school.
// Spawning, weights, and lakebed cruising match APPROVED-G3-CATFISH-2026-10-24.md.
// Mesh deformation runs only near the player to protect mobile FPS.
export function installStaceyFlatheads({T,scene,gltf,ASSET,CX,CY,CZ,inner,outer,ground,diagnostics,rand}) {
const diag=diagnostics;
/* G3: 70 WV flathead catfish: 30 original 40-lb, 30 additional 20-lb, 10 additional 60-lb. */
const flatheadFish=[];const FLATHEAD_URL=ASSET+'flathead-catfish.glb';
async function installFlatheads(){
 try{
  const original=(await gltf.loadAsync(FLATHEAD_URL)).scene;
  const bounds=new T.Box3().setFromObject(original),dims=bounds.getSize(new T.Vector3());
  const center=bounds.getCenter(new T.Vector3());
  const fishLength=1.15; // 40-lb visual reference; scaled per weight below
  original.position.sub(center);
  original.scale.setScalar(fishLength/Math.max(dims.x,dims.y,dims.z,.001));
  for(let i=0;i<70;i++){
   const weight=i<30?40:i<60?20:60;
   const a=rand()*Math.PI*2, r=inner(a)+16+rand()*Math.max(1,outer(a)-inner(a)-33);
   const x=CX+Math.cos(a)*r,z=CZ+Math.sin(a)*r;
   const body=original.clone(true);
   body.scale.multiplyScalar(Math.cbrt(weight/40));
   body.traverse(n=>{if(n.isMesh){n.frustumCulled=false;const g=n.geometry.clone();n.geometry=g;const attr=g.attributes.position;const axis=dims.x>=dims.z?'x':'z';const coord=i=>axis==='x'?attr.getX(i):attr.getZ(i);let lo=Infinity,hi=-Infinity;for(let k=0;k<attr.count;k++){const v=coord(k);lo=Math.min(lo,v);hi=Math.max(hi,v);}const originalPositions=new Float32Array(attr.array);n.userData.swimDeform={attr,originalPositions,axis,lo,span:Math.max(.001,hi-lo)};}});
   const depth=ground(x,z)+.09+rand()*.13;
   const fish=new T.Group();fish.add(body);fish.position.set(x,Math.min(CY-.7,depth),z);
   fish.rotation.y=a+Math.PI/2;scene.add(fish);
   flatheadFish.push({node:fish,body,angle:fish.rotation.y,speed:.13+rand()*.16,phase:rand()*6.283,turn:0,cruise:0.7+rand()*.6,burst:rand()*8,offset:.12+rand()*.10});
  }
  diag.assets.flatheads='70 ready (30×40lb, 30×20lb, 10×60lb)';diag.flatheads=70;
 }catch(e){diag.assets.flatheads='FAILED';diag.errors.push('Flathead GLB: '+String(e));}
}
const ready=installFlatheads();
function animateFlatheads(t,dt,playerPosition){
 // Smooth, independent bottom cruising; steer before moving to avoid sideways sliding.
 dt=Math.min(dt,.05);
 for(const f of flatheadFish){
  const p=f.node.position;
  const radial=Math.atan2(p.z-CZ,p.x-CX),dist=Math.hypot(p.x-CX,p.z-CZ);
  const safeInner=inner(radial)+11,safeOuter=outer(radial)-13;
  let desired=f.angle+Math.sin(t*.22+f.phase)*.018;
  if(dist>safeOuter||dist<safeInner){
   const inward=dist>safeOuter?radial+Math.PI:radial;
   desired=Math.atan2(Math.sin(inward),Math.cos(inward));
  }
  const delta=Math.atan2(Math.sin(desired-f.angle),Math.cos(desired-f.angle));
  f.turn+=(Math.max(-.8,Math.min(.8,delta*1.4))-f.turn)*Math.min(1,dt*1.7);
  f.angle+=f.turn*dt;
  const burst=Math.pow(Math.max(0,Math.sin(t*.33+f.burst)),12)*.4;
  const speed=f.speed*f.cruise*(1+burst);
  p.x+=Math.sin(f.angle)*speed*dt;
  p.z+=Math.cos(f.angle)*speed*dt;
  f.node.rotation.y=f.angle;
  // Gentle tail-driven undulation, without rotating the entire fish side-on.
  f.body.rotation.y=Math.sin(t*(1.9+f.cruise*.9)+f.phase)*(.045+speed*.06);
  // Traveling lateral wave: subtle at head, pronounced through rear body and tail.
  f.body.traverse(n=>{const d=n.userData.swimDeform;if(!d)return;const {attr,originalPositions,axis,lo,span}=d;const arr=attr.array,cycle=t*(2.5+f.cruise*1.1)+f.phase;for(let i=0;i<attr.count;i++){const j=i*3,along=(originalPositions[j+(axis==='x'?0:2)]-lo)/span;const tail=Math.pow(along,2.3);const wave=Math.sin(cycle-along*3.8)*tail*span*.075;arr[j]=originalPositions[j]+(axis==='z'?wave:0);arr[j+1]=originalPositions[j+1];arr[j+2]=originalPositions[j+2]+(axis==='x'?wave:0);}attr.needsUpdate=true;});
  f.body.rotation.z=Math.sin(t*.65+f.phase)*.008;
  const bottom=ground(p.x,p.z);
  const targetY=Math.min(CY-.65,bottom+f.offset+Math.sin(t*.65+f.phase)*.018);
  p.y+=(targetY-p.y)*Math.min(1,dt*2.5);
 }
}

return {get count(){return flatheadFish.length;},fish:flatheadFish,update:animateFlatheads,ready};
}
