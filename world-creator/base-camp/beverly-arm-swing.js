// Correct Beverly's T-pose arms using her actual Mixamo skeleton geometry.
// Model geometry, skin weights, clothes, and rest pose are not modified.
// Call AFTER AnimationMixer.update, on every shoreline frame.
const clean=n=>String(n).toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^(mixamorig|bip001|bip01|bip|bone)/,'');
export function installBeverlyArmSwing({THREE:T,model,speed=1.2}){
 const bones=[];model.traverse(o=>{if(o.isBone)bones.push(o)});
 const find=n=>bones.find(b=>clean(b.name)===n);
 const sides=[['left',find('leftarm'),find('leftforearm')],['right',find('rightarm'),find('rightforearm')]];
 const active=sides.filter(([,arm,forearm])=>arm&&forearm&&forearm.position.lengthSq()>.000001);
 const down=new T.Vector3(0,-1,0),forward=new T.Vector3(0,0,1);
 const qParent=new T.Quaternion(),qDelta=new T.Quaternion(),qSwing=new T.Quaternion();
 const current=new T.Vector3(),desired=new T.Vector3(),axis=new T.Vector3();
 let phase=0;
 const update=dt=>{
  phase+=Math.max(0,Math.min(.1,dt))*Math.max(.2,speed)*Math.PI*1.55;
  // Recompute from mixer-applied pose every frame, NEVER reset bones to T-pose.
  model.updateWorldMatrix(true,true);
  for(const [side,arm,forearm] of active){
   // Forearm offset is the anatomical shoulder-to-elbow direction in arm space.
   // Convert it into the shoulder-parent space using the animated arm rotation.
   current.copy(forearm.position).normalize().applyQuaternion(arm.quaternion);
   arm.parent.getWorldQuaternion(qParent);
   desired.copy(down).applyQuaternion(qParent.invert()).normalize();
   // Keep the elbow slightly away from the torso; avoid forced shoulder stretch.
   const outward=side==='left'?-1:1;
   desired.add(new T.Vector3(outward*.13,0,0).applyQuaternion(qParent)).normalize();
   qDelta.setFromUnitVectors(current,desired);
   arm.quaternion.premultiply(qDelta);
   // Swing forward/back about a world lateral axis, expressed in parent space.
   axis.set(1,0,0).applyQuaternion(qParent).normalize();
   qSwing.setFromAxisAngle(axis,Math.sin(phase)*(side==='left'?1:-1)*.24);
   arm.quaternion.premultiply(qSwing).normalize();
  }
 };
 return {update,detected:active.map(([side,arm,forearm])=>side+':'+arm.name+'>'+forearm.name)};
}
