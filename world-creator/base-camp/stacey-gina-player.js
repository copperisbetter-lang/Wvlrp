// Stacey Lake playable Gina 6 clone. The beach NPC remains the original asset.
// SkeletonUtils.clone preserves independent skin bones/animation transforms while
// sharing immutable geometry and textures. No second GLB download is required.
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';

export function installGinaPlayer({THREE:T,scene,diagnostics,onClips}){
 const carrier=new T.Group();
 carrier.name='Player · Gina 6 independent skinned clone';
 scene.add(carrier);
 const state={ready:false,avatar:'Gina 6 (player clone)',clips:[],mode:'AUTO',current:'',error:null};
 const info=diagnostics?.assets||{};
 info['Playable Gina clone']='waiting for Gina source asset';
 let model=null,mixer=null,currentAction=null,manual=null;
 const clips=new Map();

 function play(name){
  if(!state.ready || name===state.current)return;
  const clip=clips.get(name)||clips.get('Idle');
  if(!clip)return;
  const next=mixer.clipAction(clip);
  if(currentAction && next!==currentAction)currentAction.fadeOut(.16);
  next.reset().setLoop(T.LoopRepeat,Infinity).fadeIn(.16).play();
  currentAction=next;
  state.current=clip.name;
 }

 function attach(asset){
  if(state.ready)return;
  try{
   if(!asset?.scene || !Array.isArray(asset.animations))throw Error('Gina source asset missing scene/animations');
   for(const clip of asset.animations)clips.set(clip.name,clip);
   for(const required of ['Idle','Walk','Run']){
    if(!clips.has(required))throw Error('Missing Gina native animation: '+required);
   }
   // Clone BEFORE moving/reusing any transforms from Gina's beach NPC.
   // SkeletonUtils rebuilds bone bindings; scene.clone(true) alone does not.
   model=cloneSkinned(asset.scene);
   model.name='Gina 6 · controllable player clone';
   model.traverse(object=>{if(object.isMesh){object.frustumCulled=false;object.castShadow=false;}});
   carrier.add(model);
   mixer=new T.AnimationMixer(model);
   state.clips=asset.animations.map(clip=>clip.name);
   state.ready=true;
   play('Idle');
   info['Playable Gina clone']='ready · '+state.clips.length+' source animations · native Idle/Walk/Run';
   window.staceyGinaPlayer={state,carrier,model,get activeAnimation(){return state.current}};
   onClips?.(state.clips.slice());
  }catch(error){
   state.error=String(error?.message||error);
   info['Playable Gina clone']='FAILED '+state.error;
   diagnostics?.errors?.push('Gina player clone: '+state.error);
   if(model)model.visible=false;
  }
 }

 function setAnimation(name){
  manual=name && clips.has(name)?name:null;
  state.mode=manual?'MANUAL':'AUTO';
  state.current='';
  if(state.ready && manual)play(manual);
  return Boolean(!name||manual);
 }

 function update({eye,yaw,dt,walking,running,sitting,flying,swimming,diving,sideways=0,backwards=false,visible=true}){
  if(!state.ready)return;
  // Source Gina has no swimming-specific clip. Do not pretend paddling is swimming.
  let target='Idle';
  if(sitting)target=clips.has('Sit idle (chair)')?'Sit idle (chair)':'Idle';
  else if(!flying&&!swimming&&!diving&&walking){
   if(running)target='Run';
   else if(backwards&&clips.has('Walk backwards'))target='Walk backwards';
   else if(sideways>0.65&&clips.has('Strafe right'))target='Strafe right';
   else if(sideways<-.65&&clips.has('Strafe left'))target='Strafe left';
   else target='Walk';
  }
  play(manual||target);
  mixer.update(Math.max(0,Math.min(.05,dt)));
  // Game pos is the camera/eye reference. Fit Gina at the corresponding foot plane.
  const height=diving?1.4:swimming?1:sitting?1.05:1.7;
  carrier.position.set(eye.x,eye.y-height,eye.z);
  // The native Gina asset faces +Z; a forward game move at yaw 0 is toward -Z.
  carrier.rotation.set(0,Math.PI+yaw,0);
  carrier.visible=visible;
 }
 return {state,carrier,attach,setAnimation,update};
}
