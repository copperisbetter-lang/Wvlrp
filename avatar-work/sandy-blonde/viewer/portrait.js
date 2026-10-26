import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// Offline, embedded-model WVLRP inspection: only actual exported GLB geometry is displayed.
const $=id=>document.getElementById(id),status=$('status'),stage=$('stage');
let renderer,scene,camera,controls,model,group,box,span,mixer,animations=[];
let turn=false,clock=new THREE.Clock();
try {
renderer=new THREE.WebGLRenderer({canvas:$('canvas'),antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.10;
scene=new THREE.Scene();
scene.background=new THREE.Color(0x283431);
camera=new THREE.PerspectiveCamera(35,1,.02,120);
controls=new OrbitControls(camera,$('canvas'));
controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=.25;controls.maxDistance=14;
scene.add(new THREE.HemisphereLight(0xfff1df,0x637782,1.6));
const key=new THREE.DirectionalLight(0xffe3c8,2);key.position.set(2,5,4);scene.add(key);
const fill=new THREE.DirectionalLight(0xd4e7ff,.75);fill.position.set(-3,2,2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffe1be,.85);rim.position.set(1,3,-4);scene.add(rim);
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();
function view(mode='full'){
 if(!model)return;
 const center=box.getCenter(new THREE.Vector3()),height=span.y;
 const isFace=mode==='face';const aim=center.clone().setY(box.min.y+height*.64);
 controls.target.copy(aim);
 const narrow=stage.clientWidth/stage.clientHeight<.78;
 const radius=isFace?Math.max(.95,height*1.9):Math.max(height*2,1.0);
 const offset=mode==='back'?new THREE.Vector3(0,0,-radius):mode==='side'?new THREE.Vector3(radius,0,0):
             mode==='three'?new THREE.Vector3(radius*.54,0,radius*.84):new THREE.Vector3(0,0,radius);
 camera.position.copy(aim).add(offset);camera.lookAt(aim);controls.update();
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
$('spin').onclick=()=>{turn=!turn;$('spin').textContent=turn?'Stop rotation':'Auto rotate';};
$('reset').onclick=()=>{
  for(const input of document.querySelectorAll('.morph-input')){input.value=input.dataset.initial;input.dispatchEvent(new Event('input'));}
  turn=false;group.rotation.y=0;$('spin').textContent='Auto rotate';view();
};
$('pose').onchange=()=>{
 if(!mixer)return;mixer.stopAllAction();
 const n=Number($('pose').value);
 if(n>=0)mixer.clipAction(animations[n]).reset().fadeIn(.2).play();
};
const raw=$('glb').textContent.replace(/\s/g,'');
if(raw.length<1000)throw new Error('Missing embedded GLB model');
status.textContent='Unpacking embedded 3D model…';
const arr=new Uint8Array(Math.floor(raw.length*3/4));
let pos=0;for(let n=0;n<raw.length;n+=32768){const bin=atob(raw.slice(n,n+32768));for(let j=0;j<bin.length;j++)arr[pos++]=bin.charCodeAt(j);}
const buffer=arr.buffer.slice(0,pos);
new GLTFLoader().parse(buffer,'',gltf=>{
 group=new THREE.Group();model=gltf.scene;group.add(model);scene.add(group);model.updateMatrixWorld(true);
 box=new THREE.Box3().setFromObject(model);span=box.getSize(new THREE.Vector3());
 if(span.y<.1)throw new Error('Imported body has invalid dimensions');
 let meshes=0,bones=0,count=0;const targets=new Map();
 model.traverse(o=>{
  if(o.isBone)bones++;
  if(!o.isMesh)return;
  o.frustumCulled=false;meshes++;
  if(o.morphTargetDictionary)for(const [name,index] of Object.entries(o.morphTargetDictionary)){
   if(!/sandy|body|face/i.test(name))continue;
   const entries=targets.get(name)||[];entries.push({o,index});targets.set(name,entries);
  }
 });
 for(const [name,entries] of targets){
  const label=document.createElement('label');label.className='morph-row';
  const head=document.createElement('span');head.textContent=name.replace(/^Sandy\s*[-–]\s*/i,'');
  const output=document.createElement('output');
  const input=document.createElement('input');input.type='range';input.className='morph-input';
  input.min='0';input.max='1';input.step='.01';
  input.value=String(entries[0].o.morphTargetInfluences[entries[0].index]||0);input.dataset.initial=input.value;
  input.oninput=()=>{const v=Number(input.value);for(const e of entries)e.o.morphTargetInfluences[e.index]=v;output.textContent=Math.round(v*100)+'%';};
  input.oninput();label.append(head,output,input);$('morphs').append(label);count++;
 }
 if(!count)$('morphs').textContent='No sculpt morph targets exported.';
 animations=gltf.animations||[];if(animations.length){
  mixer=new THREE.AnimationMixer(model);$('pose').disabled=false;
  for(const [i,clip] of animations.entries()){const item=document.createElement('option');item.textContent=clip.name||'Clip '+i;item.value=String(i);$('pose').append(item);}
 }else $('pose').disabled=true;
 $('stats').textContent=meshes+' meshes · '+bones+' bones · '+count+' sculpt controls · '+animations.length+' animation clips';
 stage.dataset.ready='true';status.textContent='3D model loaded · drag to rotate · pinch to zoom';view('face');
},e=>{status.textContent='Model loading error: '+e.message;console.error(e);});
function animate(){requestAnimationFrame(animate);const dt=Math.min(.05,clock.getDelta());if(mixer)mixer.update(dt);if(turn&&group)group.rotation.y+=dt*.32;controls.update();renderer.render(scene,camera);}
animate();
}catch(e){status.textContent='Viewer error: '+e.message;console.error(e);}

