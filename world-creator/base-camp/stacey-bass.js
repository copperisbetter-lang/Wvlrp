// Stacey Lake bass school: requires uploaded GLB at ./assets/fish/model_67a_-_largemouth_bass.glb
// Isolated experiment; does not alter water, terrain or player collision.
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
export async function installBass({T,GLTFLoader,scene,CX,CZ,CY,outer,inner,diagnostics}) {
 const COUNT=250, fish=[],mixers=[], rng=(()=>{let s=728301;return ()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296)})();
 const groups=[[175,2,5],[75,5,8]];
 const weights=groups.flatMap(([n,a,b])=>Array.from({length:n},()=>a+(b-a)*rng()));
 const loader=new GLTFLoader();
 // Lightweight surface rings, independent of approved water shader.
 const rings=[];const ringGeo=new T.RingGeometry(.89,1,28);let ringCursor=0;
 for(let k=0;k<80;k++){const mesh=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:0xb8d7d1,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;mesh.renderOrder=6;scene.add(mesh);rings.push({mesh,start:-100,duration:2,power:1});}
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
  // GLB faces toward local -Z; swim/jump motion uses local +Z.
  model.rotation.y=Math.PI;
  if(clips.length){const mixer=new T.AnimationMixer(model);const action=mixer.clipAction(clips[0]);action.setEffectiveTimeScale(.65+rng()*.65);action.play();mixer.setTime(rng()*Math.max(.1,clips[0].duration));mixers.push(mixer);}
  const a=rng()*Math.PI*2, radius=inner(a)+7+rng()*(outer(a)-inner(a)-14);
  const depth=.7+rng()*Math.min(5.5,1.5+weight);
  fishRoot.position.set(CX+Math.cos(a)*radius,CY-depth,CZ+Math.sin(a)*radius);
  const heading=rng()*Math.PI*2, speed=.13+.45/(1+weight*.35)+rng()*.14;
  fishRoot.rotation.y=heading;
  fishRoot.userData={weight,heading,speed,phase:rng()*6.28,turn:(rng()-.5)*.12,jumpStart:-1,nextJump:20+rng()*160,jumpDuration:1.1,jumpHeight:.8,jumpTravel:0,jumpYaw:0,jumpRoll:0,jumpStyle:0};
  scene.add(fishRoot);fish.push(fishRoot);
 }
 diagnostics.assets.bass='250 large/trophy loaded; '+clips.length+' animation clips';
 diagnostics.bass=fish.length;
 let tick=0, nextWave=5;
 function update(dt,playerPosition){
  tick+=dt;
  for(const mixer of mixers)mixer.update(dt);
  for(const q of rings){const age=tick-q.start;if(age>=0&&age<q.duration){const p=age/q.duration;q.mesh.visible=true;q.mesh.scale.setScalar(.2+p*(1.5+q.power));q.mesh.material.opacity=(1-p)*.42*q.power;}else q.mesh.visible=false;}
  // Owner's temporary visibility test: 40 jumps together every five seconds.
  // Select fish in a visible band near the player's lake-facing position.
  if(tick>=nextWave){
   nextWave+=5;
   const px=playerPosition?.x??CX, pz=playerPosition?.z??(CZ+outer(Math.PI/2));
   const available=fish.filter(f=>f.userData.jumpStart<0).sort((a,b)=>a.position.distanceToSquared(new T.Vector3(px,CY,pz))-b.position.distanceToSquared(new T.Vector3(px,CY,pz)));
   for(const f of available.slice(0,40)){
    const d=f.userData;d.jumpStart=tick;d.jumpDuration=1.45;d.jumpHeight=1.3+rng()*.9;d.jumpTravel=1.8+rng()*2.8;d.jumpYaw=(rng()-.5)*1.1;d.jumpRoll=(rng()-.5)*.65;d.jumpStyle=Math.floor(rng()*4);
    ripple(f.position.x,f.position.z,1.1);
   }
  }
  let airborne=fish.reduce((n,f)=>n+(f.userData.jumpStart>=0?1:0),0);
  for(let i=0;i<fish.length;i++){
   const f=fish[i],d=f.userData;
   const nearPlayer=!playerPosition||f.position.distanceToSquared(playerPosition)<55*55;
   if(d.jumpStart>=0&&tick-d.jumpStart>=d.jumpDuration){ripple(f.position.x,f.position.z,1.2);d.jumpStart=-1;airborne--;d.nextJump=tick+80+rng()*180;}
   if(false && d.jumpStart<0&&tick>d.nextJump&&nearPlayer&&airborne<2){d.jumpStart=tick;d.jumpDuration=1.0+rng()*.45;d.jumpHeight=.5+rng()*1.0;ripple(f.position.x,f.position.z,.7);airborne++;}

   // Reorient in small increments; keep every fish within lake annulus.
   const x=f.position.x-CX,z=f.position.z-CZ,r=Math.hypot(x,z),a=Math.atan2(z,x);
   const low=inner(a)+4, high=outer(a)-5;
   if(r<low||r>high){const target=Math.atan2(-z,-x);d.heading+=Math.atan2(Math.sin(target-d.heading),Math.cos(target-d.heading))*.045;}
   else d.heading+=Math.sin(tick*.27+d.phase)*dt*.025+d.turn*dt;
   if(playerPosition&&f.position.distanceToSquared(playerPosition)<9)d.heading+=dt*.8;
   const leap=d.jumpStart>=0?Math.min(1,(tick-d.jumpStart)/d.jumpDuration):-1;
   const airborneNow=leap>=0;
   const forwardSpeed=airborneNow?d.jumpTravel/d.jumpDuration:d.speed;
   f.rotation.y=d.heading+(airborneNow?d.jumpYaw*leap:0);
   f.position.x+=Math.sin(f.rotation.y)*forwardSpeed*dt;
   f.position.z+=Math.cos(f.rotation.y)*forwardSpeed*dt;
   f.position.y=leap>=0?CY-.10+Math.sin(Math.PI*leap)*d.jumpHeight:CY-(.65+Math.min(5.5,d.weight*.35+1.2))+.13*Math.sin(tick*.7+d.phase);
   // Tangent-aligned pitch: mouth rises first, levels at apex, tips down on entry.
   // Different splashdown styles add roll or a slight belly-flop.
   const verticalVelocity=leap>=0?Math.PI*d.jumpHeight*Math.cos(Math.PI*leap)/d.jumpDuration:0;
   f.rotation.x=leap>=0?-Math.atan2(verticalVelocity,d.jumpTravel/d.jumpDuration):0;
   f.rotation.z=leap>=0?d.jumpRoll*Math.sin(Math.PI*leap)*(d.jumpStyle===0?.25:1):0;
   if(leap>=0&&d.jumpStyle===2)f.rotation.x+=.22*Math.sin(Math.PI*leap);
   if(leap>=0&&d.jumpStyle===3)f.rotation.z+=.55*Math.pow(leap,3);
   // Gentle body yaw; GLB embedded animation can be wired after its clip is verified.
   if(!clips.length)f.children[0].rotation.y=Math.sin(tick*(1.4+d.speed)+d.phase)*.045;
  }
 }
 return {count:fish.length,update,fish};
}
