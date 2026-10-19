// Native SAV4 movement solver. No vertex edits or eye/garment refitting.
export const MOVEMENTS=['Stand','Walk','Run','Wave','Sit','Sit — legs apart','Bend and pick up','Hands and knees','Elbows and knees'];
export function createMovementController(avatar,T){
 const v3=(...args)=>new T.Vector3(...args),rig=new Map(),rest=new Map();
 avatar.updateMatrixWorld(true);
 let faceMesh=null;
 avatar.traverse(o=>{if(o.isBone){const name=o.name.replace(/^mixamorig[:_]?/i,'');rig.set(name,o);rest.set(name,{q:o.quaternion.clone(),p:o.position.clone(),world:o.getWorldQuaternion(new T.Quaternion()),point:o.getWorldPosition(v3())});}if(o.isSkinnedMesh&&(!faceMesh||o.geometry.attributes.position.count>faceMesh.geometry.attributes.position.count))faceMesh=o;});
 const required=['Hips','Spine','Spine1','Spine2','Neck','Head','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand'];
 if(required.some(name=>!rig.has(name)))throw Error('Movement rig is incomplete');
 const motionScale=rest.get('Head').point.distanceTo(rest.get('Hips').point)/.60;
 const bounds=new T.Box3().setFromObject(faceMesh,true),groundY=bounds.min.y;
 let rigReady=true,activeMotion='Rest pose',elapsed=0,motionStart=0;
 const motionClock={getElapsedTime:()=>elapsed},poseSeat={visible:false};
 function resetRig(){for(const [name,b]of rig){b.quaternion.copy(rest.get(name).q);b.position.copy(rest.get(name).p);}avatar.updateMatrixWorld(true);}
function rotateWorld(name,axis,angle){const b=rig.get(name);if(!b)return;const q=new T.Quaternion().setFromAxisAngle(axis,angle).multiply(rest.get(name).world);const parent=b.parent.getWorldQuaternion(new T.Quaternion()).invert();b.quaternion.copy(parent.multiply(q));b.updateWorldMatrix(false,true);}
function aim(name,child,direction){
 const b=rig.get(name),end=rig.get(child);if(!b||!end)return;
 // Swing from the current parent orientation, preserving the joint's inherited twist.
 const current=end.getWorldPosition(v3()).sub(b.getWorldPosition(v3())).normalize();
 const q=new T.Quaternion().setFromUnitVectors(current,direction.clone().normalize()).multiply(b.getWorldQuaternion(new T.Quaternion()));
 b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateWorldMatrix(false,true);
}
function setHipY(y){const hip=rig.get('Hips'),p=hip.getWorldPosition(v3());p.y=y;hip.position.copy(hip.parent.worldToLocal(p));hip.updateWorldMatrix(false,true);}
function lowerHips(meters){setHipY(rest.get('Hips').point.y-meters*motionScale);}
function limbLength(a,b){return rest.get(a).point.distanceTo(rest.get(b).point);}
function solveLimb(rootName,jointName,endName,target,pole){
 const root=rig.get(rootName).getWorldPosition(v3()),l1=limbLength(rootName,jointName),l2=limbLength(jointName,endName);
 const to=target.clone().sub(root),distance=Math.max(.001,Math.min(to.length(),l1+l2-.0001));to.normalize();
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const bend=pole.clone().sub(root);bend.addScaledVector(to,-bend.dot(to));if(bend.lengthSq()<1e-8)bend.set(0,0,1);bend.normalize();
 const joint=root.clone().addScaledVector(to,along).addScaledVector(bend,height);
 aim(rootName,jointName,joint.sub(root));
 aim(jointName,endName,target.clone().sub(rig.get(jointName).getWorldPosition(v3())));
}
function applyWorldTurn(b,axis,angle){const q=new T.Quaternion().setFromAxisAngle(axis,angle).multiply(b.getWorldQuaternion(new T.Quaternion()));b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateWorldMatrix(false,true);}
function flattenPalm(side){
 const hand=rig.get(side+'Hand'),across=rig.get(side+'HandIndex1').getWorldPosition(v3()).sub(rig.get(side+'HandPinky1').getWorldPosition(v3()));across.z=0;across.normalize();
 const target=v3(side==='Left'?-1:1,0,0),angle=Math.atan2(v3().crossVectors(across,target).z,across.dot(target));
 applyWorldTurn(hand,v3(0,0,1),angle);
}
function curlFingers(side,amount){
 const hand=rig.get(side+'Hand').getWorldPosition(v3());
 const direction=rig.get(side+'HandMiddle1').getWorldPosition(v3()).sub(hand).normalize();
 const across=rig.get(side+'HandIndex1').getWorldPosition(v3()).sub(rig.get(side+'HandPinky1').getWorldPosition(v3())).normalize();
 const sign=side==='Left'?1:-1,normal=v3().crossVectors(across,direction).normalize().multiplyScalar(sign);
 for(const finger of ['Index','Middle','Ring','Pinky']){
  for(const [joint,angle]of [[1,.80],[2,1.75]]){
   const bend=angle*amount,target=direction.clone().multiplyScalar(Math.cos(bend)).addScaledVector(normal,Math.sin(bend));
   aim(side+'Hand'+finger+joint,side+'Hand'+finger+(joint+1),target);
  }
  applyWorldTurn(rig.get(side+'Hand'+finger+'3'),across,sign*.65*amount);
 }
}
function animatePerformance(){
 if(!rigReady)return;resetRig();const t=motionClock.getElapsedTime()-motionStart;
 const gait=activeMotion==='Walk'||activeMotion==='Run',run=activeMotion==='Run',seated=activeMotion==='Sit'||activeMotion==='Sit — legs apart';
 const crawl=activeMotion==='Hands and knees'||activeMotion==='Elbows and knees',onElbows=activeMotion==='Elbows and knees';
 if(poseSeat)poseSeat.visible=seated;
 const phase=t*(run?8.8:5.2),s=Math.sin(phase),step=run?.72:.25;
 const reach=activeMotion==='Bend and pick up'?.5-.5*Math.cos(Math.min(t/2.5,1)*Math.PI*2):0;
 let lean=gait?(run?.12:.025):reach*.95;
 if(crawl)lean=onElbows?1.94:Math.PI/2;
 // Lean the pelvis and torso together instead of twisting only the spine.
 rotateWorld('Hips',v3(1,0,0),lean);
 if(gait)lowerHips((run?.075:.025)+(run?.012:.004)*Math.cos(phase*2));
 if(seated)lowerHips(.39);
 if(crawl){
  const legLength=limbLength('LeftUpLeg','LeftLeg'),pad=.066*motionScale;
  const hip=rig.get('Hips').getWorldPosition(v3()),upper=rig.get('LeftUpLeg').getWorldPosition(v3());
  setHipY(hip.y+groundY+legLength+pad-upper.y);
 }
 for(const side of ['Left','Right']){
  const sign=side==='Left'?1:-1,legSwing=gait?s*step*sign:0;
  if(crawl){
   const root=rig.get(side+'UpLeg').getWorldPosition(v3()),pad=.066*motionScale;
   const ankle=v3(root.x,groundY+.106*motionScale,root.z-limbLength(side+'Leg',side+'Foot'));
   solveLimb(side+'UpLeg',side+'Leg',side+'Foot',ankle,root.clone().add(v3(0,-3,-.1)));
   aim(side+'Foot',side+'ToeBase',v3(0,-.05,-1));
  }else if(gait){
   // Each ankle follows one forward/back lane; knees bend forward toward a pole.
   const cycle=((phase/(Math.PI*2)+(side==='Left'?0:.5))%1+1)%1,stance=run?.42:.64;
   const stride=(run?.57:.24)*motionScale,lift=(run?.16:.045)*motionScale;
   let z,y=rest.get(side+'Foot').point.y,pitch=0;
   if(cycle<stance){const q=cycle/stance;z=stride*(1-2*q);pitch=-.10+.24*q;}
   else{const q=(cycle-stance)/(1-stance),ease=q*q*(3-2*q);z=stride*(2*ease-1);y+=lift*Math.sin(Math.PI*q);pitch=.12*Math.sin(Math.PI*q);}
   const root=rig.get(side+'UpLeg').getWorldPosition(v3());
   const target=v3(rest.get(side+'UpLeg').point.x*.98,y,rest.get('Hips').point.z+z);
   solveLimb(side+'UpLeg',side+'Leg',side+'Foot',target,root.clone().add(v3(0,-.3,2.5)));
   // Fix the ankle's complete orientation, including roll; direction alone allowed twisting.
   rotateWorld(side+'Foot',v3(1,0,0),pitch);
  }else{
   let thigh=v3(sign*.025,-1,0),shin=v3(0,-1,0);
   if(seated){const spread=activeMotion==='Sit — legs apart'?.90:.10;thigh=v3(sign*spread,-.06,1);shin=v3(0,-1,.04);}
   aim(side+'UpLeg',side+'Leg',thigh);aim(side+'Leg',side+'Foot',shin);
   rotateWorld(side+'Foot',v3(1,0,0),0);
  }
  if(crawl){
   const shoulder=rig.get(side+'Arm').getWorldPosition(v3()),pad=.066*motionScale;
   const target=v3(shoulder.x,groundY+pad,shoulder.z+(onElbows?limbLength(side+'ForeArm',side+'Hand'):.10*motionScale));
   solveLimb(side+'Arm',side+'ForeArm',side+'Hand',target,shoulder.clone().add(v3(onElbows?0:sign*.25,-.7,onElbows?-.6:-.25)));
   // Palms and fingers rest forward instead of hanging beneath the wrists.
   aim(side+'Hand',side+'HandMiddle1',v3(0,-.03,1));flattenPalm(side);
  }else{
   const swing=gait?-s*sign*(run?.75:.36):0,flex=gait?(run?.85:.38):.10;
   let upper=v3(sign*(gait?.13:.065),-Math.cos(swing),Math.sin(swing));
   let fore=v3(sign*(gait?.10:.025),-Math.cos(swing+flex),Math.sin(swing+flex));
   if(activeMotion==='Wave'&&side==='Right'){upper=v3(-.4,.75,.12);fore=v3(Math.sin(t*5)*.18,1,.10);}
   if(reach){upper=v3(sign*.10,-1,.65*reach);fore=v3(sign*.04,-1,.55*reach);}
   if(seated){upper=v3(sign*.1,-1,.20);fore=v3(sign*.05,-.65,.8);}
   aim(side+'Arm',side+'ForeArm',upper);aim(side+'ForeArm',side+'Hand',fore);
   if(gait)curlFingers(side,run?1:.25);
  }
 }
 if(crawl){rotateWorld('Neck',v3(1,0,0),.55);rotateWorld('Head',v3(1,0,0),.28);}
 avatar.updateMatrixWorld(true);

}

 return {bones:rig,rest,groundY,
  setMotion(name){if(name!=='Rest pose'&&!MOVEMENTS.includes(name))throw Error('Unknown motion '+name);activeMotion=name;},
  update(seconds){elapsed=Math.max(0,seconds);if(activeMotion==='Rest pose')resetRig();else animatePerformance();avatar.updateMatrixWorld(true);avatar.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});},
  restore(){resetRig();},
 };
}
