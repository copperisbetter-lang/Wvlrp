// Gater 3 — 300 largemouth bass, isolated Stacey Lake test.
// Asset: owner-supplied model_67a_-_largemouth_bass.glb (18 MB, Swim Cycle animation).
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
export async function installBass300(THREE,scene,{STACEY,terrainY,onStatus=()=>{}}){
 const COUNT=300,fish=[],loader=new GLTFLoader();
 const url='./assets/model_67a_-_largemouth_bass.glb';
 let gltf;try{gltf=await loader.loadAsync(url)}catch(e){onStatus('Bass model unavailable: '+url);console.error('Bass load failed',e);return {count:0,update(){}}}
 const source=gltf.scene;source.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(source),size=box.getSize(new THREE.Vector3());
 const longest=Math.max(size.x,size.y,size.z,.001);
 // Clone skinned bones separately so each fish can animate independently.
 const {clone}=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/utils/SkeletonUtils.js');
 let seed=67120;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const sizes=[...Array(100).fill(.20),...Array(120).fill(.42),...Array(60).fill(.68),...Array(20).fill(.90)];
 const clip=gltf.animations.find(a=>/swim/i.test(a.name))||gltf.animations[0];
 const mixers=[];
 // Pooled surface rings: local translucent disturbance, never alter approved water shader.
 const rings=[];const ringGeo=new THREE.RingGeometry(.88,1,32);
 for(let i=0;i<12;i++){const m=new THREE.MeshBasicMaterial({color:0xc7e5db,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});const mesh=new THREE.Mesh(ringGeo,m);mesh.rotation.x=-Math.PI/2;mesh.visible=false;mesh.renderOrder=5;scene.add(mesh);rings.push({mesh,start:-100,duration:2});}
 let ringCursor=0;function ripple(x,z,t,power=1){const q=rings[ringCursor++%rings.length];q.start=t;q.duration=1.5+power*.7;q.mesh.position.set(x,STACEY.waterY+.035,z);q.mesh.userData.power=power;q.mesh.visible=true;}

 for(let i=0;i<COUNT;i++){
  let x,z,bed,depth,tries=0;
  do{const angle=rand()*Math.PI*2,r=Math.sqrt(rand())*.90*STACEY.radius;x=STACEY.x+Math.cos(angle)*r;z=STACEY.z+Math.sin(angle)*r;bed=terrainY(x,z);depth=STACEY.waterY-bed;}while(depth<1.3&&++tries<80);
  if(depth<1.3)continue;
  const fishRoot=clone(source);const targetLength=sizes[i]*(.85+rand()*.3);
  fishRoot.scale.setScalar(targetLength/longest);
  const y=bed+.35+rand()*Math.max(.1,depth-.85);
  const heading=rand()*Math.PI*2,speed=.13+rand()*.28;
  fishRoot.position.set(x,y,z);fishRoot.rotation.y=heading;scene.add(fishRoot);
  let mixer=null;if(clip){mixer=new THREE.AnimationMixer(fishRoot);const action=mixer.clipAction(clip);action.timeScale=.65+rand()*.65;action.play();mixer.update(rand()*clip.duration);}
  fish.push({root:fishRoot,x,z,y,heading,speed,mixer,phase:rand()*Math.PI*2,bed,depth,jumpStart:-1,nextJump:12+rand()*110,jumpDuration:1.05+rand()*.4,jumpHeight:.45+rand()*.9});
 }
 onStatus('Bass loaded: '+fish.length+'/300');let last=0;
 return {count:fish.length,update(t,camera){const dt=Math.min(.05,Math.max(0,t-last));last=t;
  for(const q of rings){const age=t-q.start;if(age>=0&&age<q.duration){const progress=age/q.duration,power=q.mesh.userData.power;q.mesh.visible=true;q.mesh.scale.setScalar(.22+progress*(1.7+power));q.mesh.material.opacity=(1-progress)*.24*power;}else q.mesh.visible=false;}
  for(let i=0;i<fish.length;i++){const f=fish[i];const dist=camera.position.distanceTo(f.root.position);
   f.root.visible=dist<70;if(!f.root.visible)continue;
   // Rare, staggered leaps: at most two bass airborne at once, preferentially near the observer.
   const jumping=f.jumpStart>=0&&t-f.jumpStart<f.jumpDuration;
   if(!jumping&&f.jumpStart>=0){ripple(f.x,f.z,t,1.3);f.jumpStart=-1;f.nextJump=t+55+rand()*160;}
   const airborne=fish.reduce((n,g)=>n+(g.jumpStart>=0&&t-g.jumpStart<g.jumpDuration?1:0),0);
   if(f.jumpStart<0&&t>=f.nextJump&&dist<48&&airborne<2&&f.depth>1.3){ripple(f.x,f.z,t,.65);f.jumpStart=t;f.jumpDuration=1.0+rand()*.5;f.jumpHeight=.4+rand()*1.1;f.nextJump=t+90+rand()*160;}
   const leap=f.jumpStart>=0?Math.min(1,(t-f.jumpStart)/f.jumpDuration):-1;
   const leapLift=leap>=0?Math.max(0,Math.sin(leap*Math.PI))*f.jumpHeight:0;
   f.heading+=Math.sin(t*.21+f.phase)*dt*.13;
   const nx=f.x+Math.sin(f.heading)*f.speed*dt,nz=f.z+Math.cos(f.heading)*f.speed*dt;
   const newBed=terrainY(nx,nz),newDepth=STACEY.waterY-newBed;
   if(Math.hypot(nx-STACEY.x,nz-STACEY.z)>STACEY.radius*.91||newDepth<1.2){f.heading+=Math.PI*.65;}
   else {f.x=nx;f.z=nz;f.bed=newBed;f.depth=newDepth;}
   f.y=Math.min(STACEY.waterY-.3,Math.max(f.bed+.3,f.y+Math.sin(t*.42+f.phase)*dt*.025));
   // A leap rises from just below the water surface and arcs back into the lake.
   const leapY=leap>=0?STACEY.waterY-.12+Math.sin(leap*Math.PI)*f.jumpHeight:f.y;
   f.root.position.set(f.x,leapY,f.z);f.root.rotation.y=f.heading;
   f.root.rotation.z=leap>=0?Math.sin((leap-.5)*Math.PI)*.25:0;
   if(f.mixer&&dist<28)f.mixer.update(dt);
  }
 }};
}
