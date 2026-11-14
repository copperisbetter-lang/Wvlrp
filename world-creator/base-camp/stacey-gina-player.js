// Stacey Lake: controllable cloned Gina 6. The beach NPC keeps its original Walk.
// The source GLB is fetched once; each clone has its own skinned bones and mixer.
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {createGinaInspectionRig} from './stacey-gina-inspection.js?v=20261105-v2';

export function installGinaPlayer({THREE:T,scene,diagnostics,onClips}){
 const carrier=new T.Group();
 carrier.name='Player · Gina 6 independent skinned clone';
 scene.add(carrier);
 const state={ready:false,avatar:'Gina 6 (player clone)',clips:[],mode:'AUTO',current:'',pose:'stand',frozen:false,error:null};
 const info=diagnostics?.assets||{};
 info['Playable Gina clone']='waiting for Gina source asset';
 let model=null,mixer=null,currentAction=null,manual=null,rig=null;
 const clips=new Map();
 // Chair-specific hip alignment: keep Gina's native animation and unmodified rig.
 // Avoid hard-coded root offsets, because 'Sit idle (chair)' translates the pelvis.
 const seatOffset=new T.Vector3(),hipWorld=new T.Vector3();

 function play(name){
  if(!state.ready||state.mode==='POSE'||name===state.current)return;
  const clip=clips.get(name)||clips.get('Idle');if(!clip)return;
  const next=mixer.clipAction(clip);
  if(currentAction&&next!==currentAction)currentAction.fadeOut(.16);
  next.reset().setLoop(T.LoopRepeat,Infinity).fadeIn(.16).play();
  // A real neutral hold: do not advance the native Idle clip while stationary.
  if(clip.name==='Idle'){
   next.time=Math.min(.12,clip.duration*.12);
   next.paused=true;
  }
  currentAction=next;
  state.current=clip.name;
 }
 function attach(asset){
  if(state.ready)return;
  try{
   if(!asset?.scene||!Array.isArray(asset.animations))throw Error('Gina source asset missing scene/animations');
   for(const clip of asset.animations)clips.set(clip.name,clip);
   for(const name of ['Idle','Walk','Run'])if(!clips.has(name))throw Error('Missing Gina animation: '+name);
   model=cloneSkinned(asset.scene);
   model.name='Gina 6 · controllable player clone';
   model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=false;}});
   carrier.add(model);
   mixer=new T.AnimationMixer(model);
   rig=createGinaInspectionRig({THREE:T,model,carrier,mixer,clips});
   state.clips=asset.animations.map(clip=>clip.name);
   state.ready=true;
   play('Idle');
   info['Playable Gina clone']='ready · '+state.clips.length+' source clips · native idle/walk/run';
   window.staceyGinaPlayer={state,carrier,model,get activeAnimation(){return state.current}};
   onClips?.(state.clips.slice());
  }catch(error){
   state.error=String(error?.message||error);
   info['Playable Gina clone']='FAILED '+state.error;
   diagnostics?.errors?.push('Gina player clone: '+state.error);
   if(model)model.visible=false;
  }
 }
 function setPose(which){
  if(!state.ready)return false;
  if(which==='stand'||which==='reset'){
   rig.pose('stand');manual=null;currentAction=null;
   state.pose='stand';state.mode='AUTO';state.current='';state.frozen=false;
   play('Idle');return true;
  }
  if(which!=='elbows-knees'&&which!=='sit-open')return false;
  try{
   state.frozen=false;
   rig.pose(which);
   manual=null;currentAction=null;
   state.pose=which;state.mode='POSE';
   state.current=which==='elbows-knees'?'Elbows & Knees':'Sit — Legs Open';
   return true;
  }catch(error){state.error=String(error?.message||error);diagnostics?.errors?.push('Gina pose: '+state.error);return false;}
 }
 function setAnimation(name){
  if(!state.ready)return false;
  if(state.mode==='POSE')setPose('stand');
  manual=name&&clips.has(name)?name:null;
  state.mode=manual?'MANUAL':'AUTO';
  state.current='';
  if(manual)play(manual);
  return !name||Boolean(manual);
 }
 function setFrozen(value){
  state.frozen=Boolean(value);
  return state.frozen;
 }
 function update({eye,yaw,dt,walking,running,sitting,flying,swimming,diving,visible=true,seatTarget=null}){
  if(!state.ready)return;
  const height=diving?1.4:swimming?1:sitting?1.05:1.7;
  const anchorChair=Boolean(sitting&&seatTarget&&rig?.bones?.Hips);
  if(!anchorChair)seatOffset.set(0,0,0);
  carrier.position.set(eye.x+seatOffset.x,eye.y-height+seatOffset.y,eye.z+seatOffset.z);
  // yaw is the independent BODY HEADING, no longer the camera look direction.
  carrier.rotation.set(0,Math.PI+yaw,0);
  carrier.visible=visible;
  if(state.mode==='POSE'||state.frozen)return;
  let target='Idle';
  if(sitting)target=clips.has('Sit idle (chair)')?'Sit idle (chair)':'Idle';
  else if(!flying&&!swimming&&!diving&&walking)target=running?'Run':'Walk';
  play(manual||target);
  mixer.update(Math.max(0,Math.min(.05,dt)));
  if(anchorChair){
   // Compute the ACTUAL animated Hips joint after mixer evaluation, rather than
   // pretending the model origin is at the character's seated backside.
   carrier.updateMatrixWorld(true);
   rig.bones.Hips.getWorldPosition(hipWorld);
   const k=Math.min(1,Math.max(0,dt)*13);
   seatOffset.x+=T.MathUtils.clamp(seatTarget.x-hipWorld.x,-1.25,1.25)*k;
   seatOffset.y+=T.MathUtils.clamp(seatTarget.y-hipWorld.y,-1.25,1.25)*k;
   seatOffset.z+=T.MathUtils.clamp(seatTarget.z-hipWorld.z,-1.25,1.25)*k;
   carrier.position.set(eye.x+seatOffset.x,eye.y-height+seatOffset.y,eye.z+seatOffset.z);
   carrier.updateMatrixWorld(true);
   if(diagnostics)diagnostics.chairSeatPose={
    target:[seatTarget.x,seatTarget.y,seatTarget.z],
    animatedHips:[hipWorld.x,hipWorld.y,hipWorld.z],
    appliedOffset:[seatOffset.x,seatOffset.y,seatOffset.z],
    clip:state.current
   };
  }
  // Repair only the player clone; beach Gina and native clip keyframes stay untouched.
  if((state.current==='Walk'||state.current==='Run')&&walking&&!swimming&&!diving)rig.narrowGait();
 }
 return {state,carrier,attach,setAnimation,setPose,setFrozen,update};
}
