/**
 * Beverly post-op NON-DESTRUCTIVE motion corrections.
 * No bind matrices, skin weights, mesh vertices, clip keyframes, materials,
 * certified original or live Stacey Lake game are modified.
 * A fresh native donor pose is evaluated by the viewer every frame first.
 * Walk and Run are explicitly excluded; owner's slider versions are approved.
 */
export function createBeverlyMotionRepairs({
  THREE,model,bones,steerBoneTo,steerChildX,footRoll
}){
  const v=()=>new THREE.Vector3();
  const clamp=THREE.MathUtils.clamp;
  const world=(name)=>{
    const bone=bones?.[name];
    return bone?bone.getWorldPosition(v()):null;
  };
  const update=()=>model.updateMatrixWorld(true);
  const metric=()=> {
    update();
    const hip=world('Hips'),lk=world('LeftLeg'),rk=world('RightLeg'),
      lf=world('LeftFoot'),rf=world('RightFoot'),
      le=world('LeftForeArm'),re=world('RightForeArm');
    const n=n=>Number.isFinite(n)?+n.toFixed(5):null;
    return {
      pelvisY:hip?n(hip.y):null,
      kneeMinY:lk&&rk?n(Math.min(lk.y,rk.y)):null,
      ankleMinY:lf&&rf?n(Math.min(lf.y,rf.y)):null,
      kneeWidthM:lk&&rk?n(Math.abs(lk.x-rk.x)):null,
      ankleWidthM:lf&&rf?n(Math.abs(lf.x-rf.x)):null,
      elbowMinY:le&&re?n(Math.min(le.y,re.y)):null
    };
  };
  function aimToe(side){
    const a=world(side+'Foot');if(!a)return;
    const sign=side==='Left'?1:-1;
    // A nearly level forefoot: preserve source foot bone and toe/skin binding.
    steerBoneTo(side+'Foot',side+'ToeBase',
      new THREE.Vector3(a.x+sign*.015,.072,a.z+.12),.84);
  }
  function elbowsAndKnees(){
    const hip=bones?.Hips;if(!hip)return;
    update();
    const old=world('Hips');
    // Lower trunk so the FOREARMS actually approach the floor.
    // Limb targets below are solved after moving the trunk.
    hip.position.y+=clamp(.47-old.y,-.42,.42);
    update();
    const h=world('Hips'),sp=world('Spine');
    // Point chest forward without touching the skin/attachment weights.
    if(sp)steerBoneTo('Spine','Spine2',
       new THREE.Vector3(sp.x,sp.y-.07,sp.z+.245),.96);
    for(const side of ['Left','Right']){
      const sign=side==='Left'?1:-1;
      steerBoneTo(side+'UpLeg',side+'Leg',
        new THREE.Vector3(h.x+sign*.14,.11,h.z+.29),1);
      const knee=world(side+'Leg');
      if(knee){
        // Fold shin BACK along the ground; previous native get-up pose
        // pointed shins down through the floor (-0.27 m).
        steerBoneTo(side+'Leg',side+'Foot',
          new THREE.Vector3(knee.x+sign*.012,.115,knee.z-.35),1);
        aimToe(side);
      }
    }
    // Keep knees near ground, correcting any residual native height offset.
    update();
    const lk=world('LeftLeg'),rk=world('RightLeg');
    if(lk&&rk){
      const delta=clamp(.092-Math.min(lk.y,rk.y),-.10,.11);
      hip.position.y+=delta;
      update();
    }
    for(const side of ['Left','Right']){
      const shoulder=world(side+'Arm'),sign=side==='Left'?1:-1;
      if(!shoulder)continue;
      steerBoneTo(side+'Arm',side+'ForeArm',
        new THREE.Vector3(shoulder.x+sign*.045,.16,shoulder.z+.16),1);
      const elbow=world(side+'ForeArm');
      if(elbow)steerBoneTo(side+'ForeArm',side+'Hand',
        new THREE.Vector3(elbow.x+sign*.02,.085,elbow.z+.17),1);
    }
  }
  function sitLegsOpen(){
    const hip=bones?.Hips;if(!hip)return;
    update();
    const old=world('Hips');
    // Reset to seated pelvis height independently of prior selected pose.
    hip.position.y+=clamp(.575-old.y,-.65,.55);
    update();
    const h=world('Hips'),sp=world('Spine');
    if(sp)steerBoneTo('Spine','Spine2',
      new THREE.Vector3(sp.x,sp.y+.24,sp.z+.018),1);
    for(const side of ['Left','Right']){
      const sign=side==='Left'?1:-1;
      // Sitting thighs project forward with symmetric, naturally open knees.
      steerBoneTo(side+'UpLeg',side+'Leg',
        new THREE.Vector3(h.x+sign*.235,.50,h.z+.33),1);
      const knee=world(side+'Leg');
      if(!knee)continue;
      steerBoneTo(side+'Leg',side+'Foot',
        new THREE.Vector3(knee.x+sign*.025,.115,knee.z+.02),1);
      aimToe(side);
    }
  }
  function chairFootContact(){
    const hip=bones?.Hips,l=world('LeftFoot'),r=world('RightFoot');
    if(!hip||!l||!r)return;
    // Sitting donor has ankle centers up to +0.40m in the air.
    // Drop only the current evaluated chair pose, preserving the native
    // timing, sitting bend, arm animation, and all clothing deformation.
    const minimum=Math.min(l.y,r.y);
    const adjust=clamp(minimum-.115,0,.48);
    if(adjust>.002){hip.position.y-=adjust;update();}
  }
  function carryWalk(time,duration){
    const hip=world('Hips');if(!hip)return;
    for(const side of ['Left','Right']){
      const sign=side==='Left'?1:-1;
      steerChildX(side+'UpLeg',side+'Leg',hip.x+sign*.075,.82);
      steerChildX(side+'Leg',side+'Foot',hip.x+sign*.065,.92);
    }
    const phase=(time/Math.max(duration,.001))*Math.PI*2;
    footRoll('LeftFoot',.11*Math.sin(phase));
    footRoll('RightFoot',.11*Math.sin(phase+Math.PI));
    // Arms deliberately stay in their carrying pose.
  }
  return {
    inspect(pose){
      if(pose==='elbows-knees')elbowsAndKnees();
      else if(pose==='sit-open')sitLegsOpen();
      return {pose,...metric()};
    },
    clip(label,time,duration){
      const name=String(label||'').toLowerCase();
      if(name==='walk'||name==='run')return; // LOCKED owner-approved.
      if(name==='sit down (chair)')chairFootContact();
      else if(name==='carry walk')carryWalk(time,duration);
    },
    metrics:metric
  };
}
