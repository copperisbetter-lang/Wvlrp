// Gina-clone-only joint steering and inspection poses.
// Adapted from the existing Gina two-pose lab: original meshes, weights, GLB and beach NPC unchanged.
import {createBeverlyMotionRepairs} from '../character-previews/beverly-postop/motion-repairs.js';

export function createGinaInspectionRig({THREE:T,model,carrier,mixer,clips}){
 const bones={},rest=new Map(),vec=()=>new T.Vector3();
 model.traverse(o=>{if(o.isBone){
   bones[o.name]=o;
   rest.set(o.uuid,{position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()});
 }});
 const update=()=>carrier.updateMatrixWorld(true); // apply latest player heading before bone-world targets
 const point=name=>bones[name]?.getWorldPosition(vec());
 function steerBoneTo(parentName,childName,target,strength=1){
  const bone=bones[parentName],child=bones[childName];
  if(!bone||!child)return false;
  update();
  const from=point(parentName),direction=point(childName).sub(from),wanted=target.clone().sub(from);
  if(direction.length()<.02||wanted.length()<.02)return false;
  const wq=new T.Quaternion().setFromUnitVectors(direction.normalize(),wanted.normalize());
  const pq=bone.parent.getWorldQuaternion(new T.Quaternion());
  const lq=pq.clone().invert().multiply(wq).multiply(pq);
  bone.quaternion.slerp(lq.multiply(bone.quaternion.clone()).normalize(),T.MathUtils.clamp(strength,0,1));
  bone.updateWorldMatrix(true,true);
  return true;
 }
 function steerChildX(parentName,childName,targetX,strength=1){
  const p=point(parentName),c=point(childName);
  if(!p||!c)return false;
  const d=c.clone().sub(p),len=d.length(),dx=T.MathUtils.clamp(targetX-p.x,-len*.85,len*.85);
  const dz=T.MathUtils.clamp(d.z,-len*.7,len*.7);
  return steerBoneTo(parentName,childName,new T.Vector3(p.x+dx,p.y-Math.sqrt(Math.max(.0001,len*len-dx*dx-dz*dz)),p.z+dz),strength);
 }
 function footRoll(name,radians){
  const b=bones[name];if(!b)return;
  const q=b.parent.getWorldQuaternion(new T.Quaternion()).invert();
  b.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0).applyQuaternion(q),radians)).normalize();
  b.updateWorldMatrix(true,true);
 }
 const repairs=createBeverlyMotionRepairs({THREE:T,model,bones,steerBoneTo,steerChildX,footRoll});
 function restore(){
  for(const o of Object.values(bones)){
   const r=rest.get(o.uuid);if(r){o.position.copy(r.position);o.quaternion.copy(r.quaternion);o.scale.copy(r.scale);}
  }
  update();
 }
 function narrowGait(){
  // Every native walk frame is evaluated first; only lateral tracking is narrowed.
  // Keep the original forward/back toe-to-heel progression and arm swing.
  update();
  const hip=point('Hips');if(!hip)return;
  const right=new T.Vector3(1,0,0).applyQuaternion(carrier.getWorldQuaternion(new T.Quaternion())).normalize();
  for(const side of ['Left','Right']){
   const knee=point(side+'Leg');
   if(knee){
    const old=knee.clone().sub(hip).dot(right);
    const sign=old>=0?1:-1;
    const want=sign*.063;
    steerBoneTo(side+'UpLeg',side+'Leg',knee.clone().addScaledVector(right,want-old),.88);
   }
   const ankle=point(side+'Foot');
   if(ankle){
    const old=ankle.clone().sub(hip).dot(right);
    const sign=old>=0?1:-1;
    const want=sign*.051;
    steerBoneTo(side+'Leg',side+'Foot',ankle.clone().addScaledVector(right,want-old),.88);
   }
  }
  update();
 }
 function ginaElbowsAndKnees(){
  // Reuse Gina's existing slumped forearm-supported crawl targets.
  const hips=bones.Hips;
  if(!hips)throw Error('Gina Hips joint missing for elbows-and-knees');
  for(const name of ['Spine','Spine1','Spine2','Neck','Head']){
   const b=bones[name],r=b&&rest.get(b.uuid);if(r)b.quaternion.copy(r.quaternion);
  }
  update();
  let h=point('Hips');
  hips.position.y+=T.MathUtils.clamp(.445-h.y,-1.2,1.2);
  update();h=point('Hips');
  steerBoneTo('Hips','Spine',new T.Vector3(h.x,h.y+.10,h.z+.24),1);
  update();h=point('Hips');
  for(const side of ['Left','Right']){
   const sign=side==='Left'?1:-1;
   steerBoneTo(side+'UpLeg',side+'Leg',new T.Vector3(h.x+sign*.155,.09,h.z-.12),1);
   const knee=point(side+'Leg');
   if(knee){
    steerBoneTo(side+'Leg',side+'Foot',new T.Vector3(knee.x+sign*.018,.075,knee.z-.29),1);
    const foot=point(side+'Foot');
    if(foot)steerBoneTo(side+'Foot',side+'ToeBase',new T.Vector3(foot.x+sign*.014,.075,foot.z-.11),.75);
   }
  }
  update();
  for(const side of ['Left','Right']){
   const sign=side==='Left'?1:-1,shoulder=point(side+'Arm');
   if(!shoulder)continue;
   steerBoneTo(side+'Arm',side+'ForeArm',new T.Vector3(shoulder.x+sign*.06,.045,shoulder.z+.10),1);
   const elbow=point(side+'ForeArm');
   if(elbow)steerBoneTo(side+'ForeArm',side+'Hand',new T.Vector3(elbow.x+sign*.025,.075,elbow.z+.24),1);
  }
  update();
  const neck=point('Neck'),head=point('Head');
  if(neck&&head&&head.y<.22)steerBoneTo('Neck','Head',new T.Vector3(neck.x,neck.y+.035,neck.z+.105),.48);
  update();
 }
 function pose(which){
  if(which==='stand'){mixer.stopAllAction();restore();return {pose:'stand'};}
  if(which!=='elbows-knees'&&which!=='sit-open')return {pose:'unknown'};
  // Inspect the native frame at a fixed time, then edit only CLONED joint transforms.
  mixer.stopAllAction();restore();
  const name=which==='elbows-knees'?'Idle':'Sit idle (chair)';
  const clip=clips.get(name);if(!clip)throw Error('Gina native pose clip missing: '+name);
  const action=mixer.clipAction(clip);action.reset().setEffectiveWeight(1).play();
  mixer.setTime(Math.max(.001,clip.duration*(which==='elbows-knees'?.35:.5)));
  action.paused=true;
  // Pose lab operates at an origin-local stand; temporarily discard player world transform.
  const p=carrier.position.clone(),q=carrier.quaternion.clone();
  carrier.position.set(0,0,0);carrier.quaternion.identity();carrier.updateMatrixWorld(true);
  try{
   if(which==='elbows-knees')ginaElbowsAndKnees();
   else repairs.inspect('sit-open');
  }finally{
   carrier.position.copy(p);carrier.quaternion.copy(q);carrier.updateMatrixWorld(true);
  }
  return {pose:which};
 }
 return {bones,restore,narrowGait,pose,metrics:()=>repairs.metrics()};
}
