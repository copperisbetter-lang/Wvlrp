// Beverly arm-swing correction for shoreline locomotion.
// Applies after AnimationMixer.update(), so it works even if Gina's imported
// tracks omit or fail to match shoulder bones. Does not alter any meshes.
const normalize=n=>String(n).toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^(mixamorig|bip001|bip01|bip|bone)/,'');
const patterns={
 leftArm:['leftarm','leftupperarm','upperarml','lupperarm','leftshoulderarm'],
 rightArm:['rightarm','rightupperarm','upperarmr','rupperarm','rightshoulderarm'],
 leftForearm:['leftforearm','leftlowerarm','forearml','lforearm'],
 rightForearm:['rightforearm','rightlowerarm','forearmr','rforearm']
};
export function installBeverlyArmSwing({THREE:T,model,speed=1.2}){
 const bones=[];model.traverse(o=>{if(o.isBone)bones.push(o)});
 const pick=key=>bones.find(b=>patterns[key].includes(normalize(b.name)));
 const joints={leftArm:pick('leftArm'),rightArm:pick('rightArm'),leftForearm:pick('leftForearm'),rightForearm:pick('rightForearm')};
 const detected=Object.entries(joints).filter(([,b])=>b).map(([k,b])=>k+':'+b.name);
 let phase=0;
 // Walk-cycle phase follows actual shore speed, not render frame rate.
 const update=dt=>{
  phase+=Math.max(0,Math.min(.1,dt))*Math.max(.2,speed)*Math.PI*1.55;
  for(const [side,sign] of [['left',1],['right',-1]]){
   const upper=joints[side+'Arm'],lower=joints[side+'Forearm'];
   const stride=Math.sin(phase)*sign;
   if(upper){
    // Rotation about local X swings arms forward/back. A modest Z correction
    // lowers the upper arms from the stiff T-pose toward the hips.
    const drop=(side==='left'?-1:1)*.64;
    const swing=new T.Quaternion().setFromEuler(new T.Euler(stride*.30,0,drop,'XYZ'));
    upper.quaternion.multiply(swing);
   }
   if(lower){
    const elbow=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-.10-.12*Math.max(0,-stride));
    lower.quaternion.multiply(elbow);
   }
  }
 };
 return {update,detected};
}
