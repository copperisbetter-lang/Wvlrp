/**
 * Beverly post-operative Pose Diagnostics v1.
 * Captures every joint's local/world position and orientation, frame-by-frame
 * DURING the transition into each selected animation/inspection pose.
 * Saves each session to browser IndexedDB, one-click compressed Copy All
 * and uncompressed Save All JSON. Never changes original Blender or game files.
 */
const r6=v=>Math.round(v*1e6)/1e6;
const degrees=n=>Math.round(n*180/Math.PI*1e3)/1e3;
const V3=v=>v?[r6(v.x),r6(v.y),r6(v.z)]:null;
const Q4=v=>v?[r6(v.x),r6(v.y),r6(v.z),r6(v.w)]:null;
const nowISOString=()=>new Date().toISOString();
const waitRequest=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});

export class BeverlyPoseDiagnostics{
 constructor({THREE,getModel,getInfo,getGaitQA}){
  this.THREE=THREE;this.getModel=getModel;this.getInfo=getInfo;this.getGaitQA=getGaitQA;
  this.db=null;this.dbReady=false;this.sessions=[];this.active=null;
  this.elapsed=0;this.lastCaptureTime=-Infinity;this.lastStoreTime=-Infinity;
  this.transitionFrom=null;this.transitionSeconds=.8;this.bones=[];this.previewTime=-1;
  this.currentStatus='Initializing diagnostic storage…';this.latest=null;
  this.readyPromise=this.openDatabase();
  this.setupButtons();
 }
 async openDatabase(){
  try{
   const request=indexedDB.open('WVLRP_Beverly_Postop_Diagnostics',1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('sessions'))request.result.createObjectStore('sessions',{keyPath:'id'})};
   this.db=await waitRequest(request);
   this.dbReady=true;
   const all=await this.readStored();
   this.sessions=all;
   this.currentStatus='Ready • '+all.length+' saved pose recordings';
  }catch(e){
   this.dbReady=false;
   this.currentStatus='Local storage not available; use Save All JSON to protect reports';
   console.warn('Beverly diagnostics: IndexedDB unavailable',e);
  }
  this.updateUI();
 }
 async readStored(){
  if(!this.db)return [];
  const tx=this.db.transaction('sessions','readonly');
  const list=await waitRequest(tx.objectStore('sessions').getAll());
  return list.sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
 }
 async persist(session){
  if(!this.dbReady||!this.db)return;
  try{
   const tx=this.db.transaction('sessions','readwrite');
   await waitRequest(tx.objectStore('sessions').put(session));
  }catch(e){console.warn('Beverly diagnostic session save failed',e);this.currentStatus='Storage warning: use Save All JSON';this.updateUI()}
 }
 setupButtons(){
  const $=id=>document.getElementById(id);
  $('diagOpen').onclick=()=>this.openPanel();
  $('diagClose').onclick=()=>this.closePanel();
  $('diagCopy').onclick=()=>this.copyAll();
  $('diagSave').onclick=()=>this.saveJSON();
  $('diagClear').onclick=async()=>{
   if(!confirm('Delete ALL saved Beverly pose recordings from this browser? Export JSON first if you need a backup.'))return;
   this.active=null;this.sessions=[];this.latest=null;
   if(this.db){const tx=this.db.transaction('sessions','readwrite');await waitRequest(tx.objectStore('sessions').clear())}
   this.currentStatus='Recordings cleared';this.updateUI();
  };
  this.updateUI();
 }
 openPanel(){
  const p=document.getElementById('diagPanel');
  p.hidden=false;
  p.setAttribute('aria-hidden','false');
  this.updateUI();
 }
 closePanel(){
  const p=document.getElementById('diagPanel');
  p.hidden=true;p.setAttribute('aria-hidden','true');
 }
 collectBones(){
  const model=this.getModel();
  if(!model)return [];
  const list=[];model.traverse(o=>{if(o.isBone)list.push(o)});
  return list;
 }
 localTransforms(){
  const map=new Map();
  for(const b of this.bones){
   map.set(b.name,{
    pos:b.position.clone(),quat:b.quaternion.clone(),scale:b.scale.clone()
   });
  }
  return map;
 }
 isReady(){return this.bones.length>=69}
 ensureBones(){
  if(this.bones.length)return true;
  this.bones=this.collectBones();return this.isReady();
 }
 begin(label,extra={}){
  if(!this.ensureBones())return;
  if(this.active)this.finish('interrupted by new selection');
  const poseBefore=this.captureSnapshot('before-selection',0);
  const start=nowISOString();
  const id='beverly-'+start.replace(/[:.]/g,'-')+'-'+Math.random().toString(36).slice(2,7);
  const info=this.getInfo()||{};
  const dur=Number.isFinite(extra.durationSeconds)?extra.durationSeconds:Math.max(2,Math.min(5,info.actionDuration||2));
  const source={sha:'8ca86d77b60de615de5af2177313846bdbd2edd8387a7dddb8d9b7933e1fda66',
      character:'Beverly certified game appearance / isolated 69-joint surgery clone',
      units:{position:'meters',rotation:'quaternion_xyzw_and_euler_degrees',time:'seconds'},
      coordinateSystem:'Three.js world XYZ; +Y up'};
  const session={schema:'WVLRP_BEVERLY_POSE_DIAGNOSTICS_V1',id,label,startedAt:start,
     source,entry:{from:info.label||'unknown',to:label,selectionMetadata:extra,
       transitionSeconds:this.transitionSeconds,durationToCaptureSeconds:dur},
     jointHierarchy:this.bones.map((b,i)=>({index:i,name:b.name,
        parent:b.parent?.isBone?b.parent.name:null})),
     frames:[poseBefore],complete:false,finishedAt:null,finishReason:null};
  this.active=session;this.transitionFrom=this.localTransforms();
  this.elapsed=0;this.lastCaptureTime=-Infinity;this.lastStoreTime=-Infinity;
  this.expectedDuration=dur;
  this.sessions.push(session);
  this.latest=session;
  this.currentStatus='Recording '+label+' · 69-joint transition…';
  this.persist(session);
  this.updateUI();
 }
 captureSnapshot(stage='motion',seconds=this.elapsed){
  if(!this.ensureBones())return null;
  const model=this.getModel();
  model.updateMatrixWorld(true);
  const info=this.getInfo()||{},gait=this.getGaitQA?.()||null;
  const j={};const e=new this.THREE.Euler(),q=new this.THREE.Quaternion();
  const p=new this.THREE.Vector3(),w=new this.THREE.Vector3();
  for(const b of this.bones){
   const wp=b.getWorldPosition(p),wq=b.getWorldQuaternion(q);
   e.setFromQuaternion(wq,'XYZ');
   const worldEuler=[degrees(e.x),degrees(e.y),degrees(e.z)];
   e.setFromQuaternion(b.quaternion,'XYZ');
   j[b.name]={
      parent:b.parent?.isBone?b.parent.name:null,
      worldPositionM:V3(wp),worldQuaternionXYZW:Q4(wq),worldEulerDeg:worldEuler,
      localPositionM:V3(b.position),localQuaternionXYZW:Q4(b.quaternion),
      localEulerDeg:[degrees(e.x),degrees(e.y),degrees(e.z)]
   };
  }
  function angle(a,b,c){
   if(!a||!b||!c)return null;
   const u=a.clone().sub(b),v=c.clone().sub(b);
   return +degrees(u.angleTo(v)).toFixed(3);
  }
  const wp=n=>{const b=this.bones.find(x=>x.name===n);return b?b.getWorldPosition(new this.THREE.Vector3()):null};
  const hip=wp('Hips'),lf=wp('LeftFoot'),rf=wp('RightFoot');
  const la=wp('LeftArm'),ra=wp('RightArm');
  const le=wp('LeftForeArm'),re=wp('RightForeArm');
  const lhand=wp('LeftHand'),rhand=wp('RightHand');
  const lk=wp('LeftLeg'),rk=wp('RightLeg');
  const ul=wp('LeftUpLeg'),ur=wp('RightUpLeg');
  const dx=(a,b)=>a&&b?+Math.abs(a.x-b.x).toFixed(6):null;
  const pelvis=hip?{x:r6(hip.x),y:r6(hip.y),z:r6(hip.z)}:null;
  return {
   stage,elapsedSeconds:r6(seconds),utc:nowISOString(),
   animation:{selected:info.label,clipTimeSeconds:info.clipTimeSeconds??null,
     clipDurationSeconds:info.actionDuration??null,normalizedPhase:info.normalizedPhase??null,
     paused:info.paused,poseMode:info.poseMode??null},
   controls:{armCloserPercent:info.armPercent,feetCloserPercent:info.footPercent,
     playbackSpeed:info.playbackSpeed,clothesHidden:info.clothesHidden},
   bodyMetrics:{
      pelvisWorldM:pelvis,ankleCenterWidthM:dx(lf,rf),kneeWidthM:dx(lk,rk),
      elbowWidthM:dx(le,re),shoulderWidthM:dx(la,ra),
      leftKneeAngleDeg:angle(ul,lk,lf),rightKneeAngleDeg:angle(ur,rk,rf),
      leftElbowAngleDeg:angle(la,le,lhand),rightElbowAngleDeg:angle(ra,re,rhand),
      leftShoulderToHipAngleDeg:angle(la,ul,hip),
      rightShoulderToHipAngleDeg:angle(ra,ur,hip),
      leftFootHeightM:lf?r6(lf.y):null,rightFootHeightM:rf?r6(rf.y):null,
      heelToeRollRadians:gait?.heelToePitchRadians||null
   },
   joints:j
  };
 }
 applyTransitionPose(){
  if(!this.transitionFrom||this.elapsed>=this.transitionSeconds)return;
  const t=Math.max(0,Math.min(1,this.elapsed/this.transitionSeconds));
  const ease=t*t*(3-2*t);
  for(const b of this.bones){
   const from=this.transitionFrom.get(b.name);
   if(!from)continue;
   b.position.lerpVectors(from.pos,b.position,ease);
   b.quaternion.slerpQuaternions(from.quat,b.quaternion,ease);
   b.scale.lerpVectors(from.scale,b.scale,ease);
  }
  this.getModel().updateMatrixWorld(true);
 }
 tick(deltaSeconds){
  if(!this.active||!this.getModel())return;
  // Pose moves from the previous visible skeleton to the new selected action
  // over 0.8s; record what was actually displayed after interpolation.
  this.elapsed+=Math.max(0,Math.min(.08,deltaSeconds));
  this.applyTransitionPose();
  if(this.elapsed-this.lastCaptureTime>=.1 || this.lastCaptureTime<0){
   const f=this.captureSnapshot(this.elapsed<this.transitionSeconds?'entering-pose':'in-pose');
   if(f)this.active.frames.push(f);
   this.lastCaptureTime=this.elapsed;
  }
  if(this.elapsed-this.lastStoreTime>=.5){
   this.persist(this.active);
   this.lastStoreTime=this.elapsed;
   this.updateUI();
  }
  if(this.elapsed>=this.expectedDuration)this.finish('capture complete');
 }
 finish(reason='complete'){
  if(!this.active)return;
  const f=this.captureSnapshot('final-pose');
  if(f)this.active.frames.push(f);
  this.active.complete=true;
  this.active.finishedAt=nowISOString();
  this.active.finishReason=reason;
  this.persist(this.active);
  this.latest=this.active;this.active=null;this.transitionFrom=null;
  this.currentStatus='Saved '+this.latest.label+' · '+this.latest.frames.length+' full-body frames · '+this.sessions.length+' pose recordings';
  this.updateUI();
 }
 getReport(){
  return {
   schema:'WVLRP_BEVERLY_ALL_POSE_DIAGNOSTICS_V1',
   exportedAt:nowISOString(),
   note:'Full body skeleton per frame, all 69 joint local+world coordinates/rotations, measured joint angles and transition history. Paste complete compressed text into ChatGPT to decode.',
   sessions:this.sessions
  };
 }
 async copyAll(){
  const $=id=>document.getElementById(id);
  $('diagCopy').disabled=true;
  this.currentStatus='Preparing one-paste report for clipboard…';this.updateUI();
  try{
   await this.readyPromise;
   if(this.active)await this.persist(this.active);
   const report=this.getReport();
   const str=JSON.stringify(report);
   let out;
   if(typeof CompressionStream==='function'){
    const stream=new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    out='BEVERLY_POSE_DIAGNOSTICS_GZIP_BASE64_V1:'+btoa(binary);
   }else out='BEVERLY_POSE_DIAGNOSTICS_JSON_V1:'+str;
   let copied=false;
   if(navigator.clipboard?.writeText){
    try{await navigator.clipboard.writeText(out);copied=true}catch(e){console.warn('Clipboard permission denied, trying fallback',e)}
   }
   if(!copied){
    const tmp=document.createElement('textarea');
    tmp.value=out;tmp.style.position='fixed';tmp.style.left='-9999px';
    document.body.appendChild(tmp);tmp.focus();tmp.select();
    copied=document.execCommand('copy');tmp.remove();
   }
   if(!copied)throw Error('Clipboard permission unavailable. Use Save All JSON instead.');
   this.currentStatus='COPIED '+this.sessions.length+' pose recordings ('+out.length+' characters). Paste ONCE into this chat.';
  }catch(e){this.currentStatus='Copy failed: '+e.message+' — use Save All JSON';console.error(e)}
  $('diagCopy').disabled=false;this.updateUI();
 }
 async saveJSON(){
  await this.readyPromise;
  if(this.active)await this.persist(this.active);
  const str=JSON.stringify(this.getReport(),null,1);
  const blob=new Blob([str],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='Beverly_Pose_Diagnostics_ALL_'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  this.currentStatus='Saved '+this.sessions.length+' pose recordings as JSON on your device';
  this.updateUI();
 }
 updateUI(){
  const $=id=>document.getElementById(id);
  if(!$('diagStatus'))return;
  $('diagStatus').textContent=this.currentStatus;
  $('diagBadge').textContent=this.sessions.length?String(this.sessions.length):'';
  const session=this.active||this.latest;
  $('diagSelected').textContent=session?session.label+' · '+session.frames.length+' frames':'No pose selected yet';
  if(session?.frames?.length){
   const f=session.frames[session.frames.length-1],m=f.bodyMetrics;
   $('diagLive').textContent=[
    'Stage: '+f.stage+'  |  '+f.elapsedSeconds.toFixed(2)+' s',
    '69-joint skeleton: '+Object.keys(f.joints).length+' joints tracked',
    'Ankle center width: '+m.ankleCenterWidthM+' m',
    'Knee width: '+m.kneeWidthM+' m  |  Elbow width: '+m.elbowWidthM+' m',
    'Left knee: '+m.leftKneeAngleDeg+'°  Right knee: '+m.rightKneeAngleDeg+'°',
    'Left elbow: '+m.leftElbowAngleDeg+'°  Right elbow: '+m.rightElbowAngleDeg+'°',
    'Pelvis world XYZ: '+JSON.stringify(m.pelvisWorldM),
    'Full local/world XYZ + rotations per joint included in Copy All / Save All.'
   ].join('\n');
  }else $('diagLive').textContent='Select a movement or pose to capture the full skeleton automatically.';
 }
 getQA(){
  return {ready:this.isReady(),boneCount:this.bones.length,sessionCount:this.sessions.length,
    active:this.active?.label||null,latest:this.latest?.label||null,
    latestFrameCount:(this.active||this.latest)?.frames?.length||0,
    copiedStatus:this.currentStatus,storageReady:this.dbReady,exportSchema:'WVLRP_BEVERLY_ALL_POSE_DIAGNOSTICS_V1'};
 }
}
