// Stacey Lake bass school: requires uploaded GLB at ./assets/fish/model_67a_-_largemouth_bass.glb
// Isolated experiment; does not alter water, terrain or player collision.
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
export async function installBass({T,GLTFLoader,scene,CX,CZ,CY,outer,inner,diagnostics}) {
 const COUNT=300, fish=[],mixers=[], rng=(()=>{let s=728301;return ()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296)})();
 const groups=[[100,.025,.5],[120,.5,2],[60,2,5],[20,5,8]];
 const weights=groups.flatMap(([n,a,b])=>Array.from({length:n},()=>a+(b-a)*rng()));
 const loader=new GLTFLoader();
 // Lightweight surface rings, independent of approved water shader.
 const rings=[];const ringGeo=new T.RingGeometry(.89,1,28);let ringCursor=0;
 for(let k=0;k<12;k++){const mesh=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:0xb8d7d1,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;mesh.renderOrder=6;scene.add(mesh);rings.push({mesh,start:-100,duration:2,power:1});}
 function ripple(x,z,power){const q=rings[ringCursor++%rings.length];q.mesh.position.set(x,CY+.045,z);q.start=tick;q.power=power;q.duration=1.3+power*.55;q.mesh.visible=true;}

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
  fishRoot.userData={weight,heading,speed,phase:rng()*6.28,turn:(rng()-.5)*.12,jumpStart:-1,nextJump:20+rng()*160,jumpDuration:1.1,jumpHeight:.8};
  scene.add(fishRoot);fish.push(fishRoot);
 }
 diagnostics.assets.bass='300 loaded; '+clips.length+' animation clips';
 diagnostics.bass=fish.length;
 let tick=0;
 function update(dt,playerPosition){
  tick+=dt;
  for(const mixer of mixers)mixer.update(dt);
  for(const q of rings){const age=tick-q.start;if(age>=0&&age<q.duration){const p=age/q.duration;q.mesh.visible=true;q.mesh.scale.setScalar(.2+p*(1.5+q.power));q.mesh.material.opacity=(1-p)*.20*q.power;}else q.mesh.visible=false;}
  let airborne=fish.reduce((n,f)=>n+(f.userData.jumpStart>=0?1:0),0);
  for(let i=0;i<fish.length;i++){
   const f=fish[i],d=f.userData;
   const nearPlayer=!playerPosition||f.position.distanceToSquared(playerPosition)<55*55;
   if(d.jumpStart>=0&&tick-d.jumpStart>=d.jumpDuration){ripple(f.position.x,f.position.z,1.2);d.jumpStart=-1;airborne--;d.nextJump=tick+80+rng()*180;}
   if(d.jumpStart<0&&tick>d.nextJump&&nearPlayer&&airborne<2){d.jumpStart=tick;d.jumpDuration=1.0+rng()*.45;d.jumpHeight=.5+rng()*1.0;ripple(f.position.x,f.position.z,.7);airborne++;}

   // Reorient in small increments; keep every fish within lake annulus.
   const x=f.position.x-CX,z=f.position.z-CZ,r=Math.hypot(x,z),a=Math.atan2(z,x);
   const low=inner(a)+4, high=outer(a)-5;
   if(r<low||r>high){const target=Math.atan2(-z,-x);d.heading+=Math.atan2(Math.sin(target-d.heading),Math.cos(target-d.heading))*.045;}
   else d.heading+=Math.sin(tick*.27+d.phase)*dt*.025+d.turn*dt;
   if(playerPosition&&f.position.distanceToSquared(playerPosition)<9)d.heading+=dt*.8;
   f.rotation.y=d.heading;
   f.position.x+=Math.sin(d.heading)*d.speed*dt;
   f.position.z+=Math.cos(d.heading)*d.speed*dt;
   const leap=d.jumpStart>=0?Math.min(1,(tick-d.jumpStart)/d.jumpDuration):-1;
   f.position.y=leap>=0?CY-.10+Math.sin(Math.PI*leap)*d.jumpHeight:CY-(.65+Math.min(5.5,d.weight*.35+1.2))+.13*Math.sin(tick*.7+d.phase);
   f.rotation.z=leap>=0?Math.sin((leap-.5)*Math.PI)*.22:0;
   // Gentle body yaw; GLB embedded animation can be wired after its clip is verified.
   if(!clips.length)f.children[0].rotation.y=Math.sin(tick*(1.4+d.speed)+d.phase)*.045;
  }
 }
 return {count:fish.length,update,fish};
}
