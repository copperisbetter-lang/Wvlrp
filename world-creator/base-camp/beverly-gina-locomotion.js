// Gina 6 locomotion transfer for approved Beverly.
// Keeps Beverly geometry/materials/rig untouched; transfers only compatible
// joint rotation deltas from Gina's Walk and Run clips. Safe fallback on failure.
const aliases={hips:['hips','pelvis','root'],spine:['spine','spine1','spine2'],leftupleg:['leftupleg','leftthigh','thighl'],rightupleg:['rightupleg','rightthigh','thighr'],leftleg:['leftleg','leftshin','calfl'],rightleg:['rightleg','rightshin','calfr'],leftfoot:['leftfoot','footl'],rightfoot:['rightfoot','footr'],leftarm:['leftarm','leftupperarm','upperarml'],rightarm:['rightarm','rightupperarm','upperarmr'],leftforearm:['leftforearm','leftlowerarm','forearml'],rightforearm:['rightforearm','rightlowerarm','forearmr']};
const clean=n=>String(n).toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^(mixamorig|bip001|bip01|bip|bone)/,'');
function skeleton(root){const bones=[];root.traverse(o=>{if(o.isBone)bones.push(o)});return bones;}
function semantic(name){const n=clean(name);for(const [key,values] of Object.entries(aliases))if(values.includes(n))return key;return n;}
function makeClip(T,sourceRoot,targetRoot,sourceClip,newName){
 const src=skeleton(sourceRoot),dst=skeleton(targetRoot),target=new Map(dst.map(b=>[semantic(b.name),b]));
 const original=new Map(src.map(b=>[b.name,b.quaternion.clone()]));
 const tracks=[];
 for(const tr of sourceClip.tracks){
  if(!tr.name.endsWith('.quaternion'))continue;
  const boneName=tr.name.slice(0,-'.quaternion'.length).replace(/^.*\//,'');
  const from=src.find(b=>b.name===boneName||clean(b.name)===clean(boneName));
  if(!from)continue;
  const to=target.get(semantic(from.name));if(!to)continue;
  // Rotation deltas are transferred in bone-local coordinates; no translation
  // tracks are copied, so the shore controller remains authoritative.
  const base=original.get(from.name),inv=base.clone().invert(),q=new T.Quaternion();
  const values=new Float32Array(tr.values.length);
  for(let i=0;i<tr.values.length;i+=4){
   q.fromArray(tr.values,i).premultiply(inv).premultiply(to.quaternion);
   q.normalize().toArray(values,i);
  }
  tracks.push(new T.QuaternionKeyframeTrack(to.name+'.quaternion',tr.times.slice(),values));
 }
 if(tracks.length<4)throw Error('Too few compatible joints for '+newName+': '+tracks.length);
 return {clip:new T.AnimationClip(newName,sourceClip.duration,tracks),jointCount:tracks.length};
}
export async function installGinaLocomotion({THREE:T,loader,model,mixer,baseClip,onStatus,sourceAsset}){
 const asset=sourceAsset || await new Promise((resolve,reject)=>loader.load(new URL('../../prototypes/gina6-20261102/Gina_6_FITTED_GOLD_BIKINI.glb',import.meta.url).href,resolve,undefined,reject));
 const walk=asset.animations.find(c=>c.name==='Walk'),run=asset.animations.find(c=>c.name==='Run');
 if(!walk||!run)throw Error('Gina Walk/Run clips missing');
 const a=makeClip(T,asset.scene,model,walk,'Beverly_Gina_Walk');
 const b=makeClip(T,asset.scene,model,run,'Beverly_Gina_Run');
 const original=mixer.clipAction(baseClip),walking=mixer.clipAction(a.clip),running=mixer.clipAction(b.clip);
 walking.setLoop(T.LoopRepeat,Infinity);running.setLoop(T.LoopRepeat,Infinity);
 walking.play();original.crossFadeTo(walking,.5,false);
 const state={mode:'walk',walkJoints:a.jointCount,runJoints:b.jointCount};
 const setMode=(mode)=>{
  const next=mode==='run'?running:walking,old=state.mode==='run'?running:walking;
  if(next===old)return;next.reset().play();old.crossFadeTo(next,.3,false);state.mode=mode;
 };
 onStatus?.('Gina walk/run mapped ('+a.jointCount+'/'+b.jointCount+' joints)');
 return {state,setMode};
}
