// Stacey Lake bass school: requires uploaded GLB at ./assets/fish/model_67a_-_largemouth_bass.glb
// Isolated experiment; does not alter water, terrain or player collision.
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
export async function installBass({T,GLTFLoader,scene,CX,CZ,CY,outer,inner,diagnostics}) {
 const COUNT=120, fish=[],mixers=[], rng=(()=>{let s=728301;return ()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296)})();
 const groups=[[20,.025,.09],[25,.1,.5],[25,.5,1],[25,1,3],[15,3,5],[10,5,8]];
 const weights=groups.flatMap(([n,a,b])=>Array.from({length:n},()=>a+(b-a)*rng()));
 const loader=new GLTFLoader();
 let source,clips=[];
 try {const gltf=await loader.loadAsync('./assets/fish/model_67a_-_largemouth_bass.glb');source=gltf.scene;clips=gltf.animations||[];}
 catch(e){diagnostics.assets.bass='MISSING GLB: '+String(e);return {count:0,reason:'asset missing'};}
 source.updateMatrixWorld(true);
 const bbox=new T.Box3().setFromObject(source), dims=bbox.getSize(new T.Vector3());
 const length=Math.max(dims.x,dims.y,dims.z);
 // Approximate allometric scaling; reference 2-lb bass length ~0.42 m.
 const baseScale=.42/Math.max(length,.001);
 for(let i=0;i<COUNT;i++){
  const weight=weights[i], size=baseScale*Math.cbrt(weight/2);
  const fishRoot=new T.Group(), model=cloneSkinned(source);
  model.position.sub(bbox.getCenter(new T.Vector3()));
  model.scale.setScalar(size);
  fishRoot.add(model);
  if(clips.length){const mixer=new T.AnimationMixer(model);const action=mixer.clipAction(clips[0]);action.setEffectiveTimeScale(.65+rng()*.65);action.play();mixer.setTime(rng()*Math.max(.1,clips[0].duration));mixers.push(mixer);}
  const a=rng()*Math.PI*2, radius=inner(a)+7+rng()*(outer(a)-inner(a)-14);
  const depth=.7+rng()*Math.min(5.5,1.5+weight);
  fishRoot.position.set(CX+Math.cos(a)*radius,CY-depth,CZ+Math.sin(a)*radius);
  const heading=rng()*Math.PI*2, speed=.13+.45/(1+weight*.35)+rng()*.14;
  fishRoot.rotation.y=heading;
  fishRoot.userData={weight,heading,speed,phase:rng()*6.28,turn:(rng()-.5)*.12};
  scene.add(fishRoot);fish.push(fishRoot);
 }
 diagnostics.assets.bass='120 loaded; '+clips.length+' animation clips';
 diagnostics.bass=120;
 let tick=0;
 function update(dt,playerPosition){
  tick+=dt;
  for(const mixer of mixers)mixer.update(dt);
  for(let i=0;i<fish.length;i++){
   const f=fish[i],d=f.userData;
   // Reorient in small increments; keep every fish within lake annulus.
   const x=f.position.x-CX,z=f.position.z-CZ,r=Math.hypot(x,z),a=Math.atan2(z,x);
   const low=inner(a)+4, high=outer(a)-5;
   if(r<low||r>high){const target=Math.atan2(-z,-x);d.heading+=Math.atan2(Math.sin(target-d.heading),Math.cos(target-d.heading))*.045;}
   else d.heading+=Math.sin(tick*.27+d.phase)*dt*.025+d.turn*dt;
   if(playerPosition&&f.position.distanceToSquared(playerPosition)<9)d.heading+=dt*.8;
   f.rotation.y=d.heading;
   f.position.x+=Math.sin(d.heading)*d.speed*dt;
   f.position.z+=Math.cos(d.heading)*d.speed*dt;
   f.position.y=CY-(.65+Math.min(5.5,d.weight*.35+1.2))+.13*Math.sin(tick*.7+d.phase);
   // Gentle body yaw; GLB embedded animation can be wired after its clip is verified.
   if(!clips.length)f.children[0].rotation.y=Math.sin(tick*(1.4+d.speed)+d.phase)*.045;
  }
 }
 return {count:fish.length,update,fish};
}
