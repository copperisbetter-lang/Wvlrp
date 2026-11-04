/**
 * Beverly post-op NON-DESTRUCTIVE motion corrections.
 * No bind matrices, skin weights, mesh vertices, clip keyframes, materials,
 * certified original or live Stacey Lake game are modified.
 * A fresh native donor pose is evaluated by the viewer every frame first.
 * Walk is excluded. Run only applies a LEFT hand/chest clearance guard
 * requested by the owner; the right arm and approved gait sliders stay intact.
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
      pelvisZ:hip?n(hip.z):null,
      kneeMeanZ:lk&&rk?n((lk.z+rk.z)/2):null,
      kneeMinY:lk&&rk?n(Math.min(lk.y,rk.y)):null,
      ankleMinY:lf&&rf?n(Math.min(lf.y,rf.y)):null,
      kneeWidthM:lk&&rk?n(Math.abs(lk.x-rk.x)):null,
      ankleWidthM:lf&&rf?n(Math.abs(lf.x-rf.x)):null,
      elbowMinY:le&&re?n(Math.min(le.y,re.y)):null,
      pelvisAboveKneeM:hip&&lk&&rk?n(hip.y-Math.min(lk.y,rk.y)):null,
      spineRestDeviationDeg:neutralSpine&&neutralSpine.get('Spine2')&&bones?.Spine2?
        n(THREE.MathUtils.radToDeg(bones.Spine2.quaternion.angleTo(neutralSpine.get('Spine2')))):null,
      neckRestDeviationDeg:neutralSpine&&neutralSpine.get('Neck')&&bones?.Neck?
        n(THREE.MathUtils.radToDeg(bones.Neck.quaternion.angleTo(neutralSpine.get('Neck')))):null
    };
  };
  function aimToe(side){
    const a=world(side+'Foot');if(!a)return;
    const sign=side==='Left'?1:-1;
    // A nearly level forefoot: preserve source foot bone and toe/skin binding.
    steerBoneTo(side+'Foot',side+'ToeBase',
      new THREE.Vector3(a.x+sign*.015,.072,a.z+.12),.84);
  }
  // Neutral anatomical spinal chain from the clone's ORIGINAL imported rest.
  // Save and restore local rotations rather than bending vertebrae individually.
  const neutralSpine=new Map();
  for(const name of ['Spine','Spine1','Spine2','Neck','Head']){
    if(bones?.[name])neutralSpine.set(name,bones[name].quaternion.clone());
  }
  function straightenSpine(){
    for(const [name,q] of neutralSpine){
      bones[name].quaternion.copy(q);
    }
    update();
  }
  function elbowsAndKnees(){
    const hip=bones?.Hips;if(!hip)return;
    update();
    // HINGE THROUGH THE PELVIS, rather than folding the upper spine:
    // a slightly higher bottom and a sloping but STRAIGHT trunk.
    const old=world('Hips');
    hip.position.y+=clamp(.565-old.y,-.7,.7);
    straightenSpine();
    let h=world('Hips');
    steerBoneTo('Hips','Spine',
      new THREE.Vector3(h.x,h.y-.125,h.z+.205),1);
    update();
    h=world('Hips');
    for(const side of ['Left','Right']){
      const sign=side==='Left'?1:-1;
      // Replant each knee after the pelvis rotates, keeping each thigh
      // attached to the EXISTING hip. No mesh/weights rebind.
      steerBoneTo(side+'UpLeg',side+'Leg',
        new THREE.Vector3(h.x+sign*.125,.135,h.z+.23),1);
      const knee=world(side+'Leg');
      if(knee){
        steerBoneTo(side+'Leg',side+'Foot',
          new THREE.Vector3(knee.x+sign*.012,.105,knee.z-.35),1);
        aimToe(side);
      }
    }
    // Keep the bottom raised relative to the grounded knees, without
    // applying large pelvis shifts that would reintroduce clipping.
    update();
    const lk=world('LeftLeg'),rk=world('RightLeg');
    if(lk&&rk){
      const delta=clamp(.115-Math.min(lk.y,rk.y),-.06,.07);
      hip.position.y+=delta;
      update();
    }
    // On forearms and knees, the ELBOWS (not just the hands) carry
    // weight. Extend upper arms down from the shoulders, palms forward.
    for(const side of ['Left','Right']){
      const sign=side==='Left'?1:-1;
      const shoulder=world(side+'Arm');
      if(!shoulder)continue;
      steerBoneTo(side+'Arm',side+'ForeArm',
        new THREE.Vector3(shoulder.x+sign*.025,.105,shoulder.z+.09),1);
      const elbow=world(side+'ForeArm');
      if(elbow)steerBoneTo(side+'ForeArm',side+'Hand',
        new THREE.Vector3(elbow.x+sign*.015,.077,elbow.z+.22),1);
    }
    update();
  }
  function sitLegsOpen(){
    const hip=bones?.Hips;if(!hip)return;
    update();
    const old=world('Hips');
    // Gentle anatomical sitting position, without forcing hips far
    // apart and stretching the fitted pelvic attachment at the seams.
    hip.position.y+=clamp(.535-old.y,-.7,.7);
    straightenSpine();
    const h=world('Hips');
    // Upright trunk at the HIP hinge; no lumbar or cervical distortion.
    steerBoneTo('Hips','Spine',
      new THREE.Vector3(h.x,h.y+.18,h.z+.022),.92);
    update();
    const pelvis=world('Hips');
    for(const side of ['Left','Right']){
      const sign=side==='Left'?1:-1;
      // Mildly open seated knees; previous 0.53m force created
      // unwanted deformation around hip/pelvic accessory joins.
      steerBoneTo(side+'UpLeg',side+'Leg',
        new THREE.Vector3(pelvis.x+sign*.185,.445,pelvis.z+.31),1);
      const knee=world(side+'Leg');
      if(!knee)continue;
      steerBoneTo(side+'Leg',side+'Foot',
        new THREE.Vector3(knee.x+sign*.023,.11,knee.z+.018),1);
    }
    // Native donor seated clip lifts both arms above the head. Bring the
    // upper arms to a comfortable, relaxed resting direction instead.
    for(const side of ['Left','Right']){
      const sign=side==='Left'?1:-1;
      const shoulder=world(side+'Arm');
      if(!shoulder)continue;
      steerBoneTo(side+'Arm',side+'ForeArm',
        new THREE.Vector3(shoulder.x+sign*.075,shoulder.y-.23,shoulder.z+.03),1);
      const elbow=world(side+'ForeArm');
      if(elbow)steerBoneTo(side+'ForeArm',side+'Hand',
        new THREE.Vector3(elbow.x+sign*.015,elbow.y-.19,elbow.z+.055),1);
    }
    update();
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
  // Run ONLY: donor's left wrist crosses the centerline on forward swing.
  // This is world-X clearance against the chest, NOT an anatomy/mesh change.
  // The right upper arm, forearm and wrist are never targets of this routine.
  function runLeftHandClearance(){
    update();
    const chest=world('Spine2'),shoulder=world('LeftArm'),
      elbow=world('LeftForeArm'),hand=world('LeftHand');
    if(!chest||!shoulder||!elbow||!hand)return null;
    const rightBefore=['RightArm','RightForeArm','RightHand'].map(world);
    // Preserve the right-hand side, and keep the left wrist outside the
    // torso/breast envelope throughout its forward and backward swing.
    // Approx 17.5 cm from spine center, plus shoulder and elbow clearance.
    const safeX=Math.max(chest.x+.175,shoulder.x+.055,elbow.x-.008);
    const handBeforeX=hand.x;
    if(handBeforeX<safeX){
      // Rotate only LeftForeArm at its existing elbow.  Preserve the
      // native swing's world-space Y/Z direction as far as possible.
      for(let step=0;step<3;step++){
        const current=world('LeftHand');
        if(!current||current.x>=safeX-.003)break;
        const target=current.clone();target.x+=safeX-current.x;
        steerBoneTo('LeftForeArm','LeftHand',target,1);
      }
    }
    update();
    const after=world('LeftHand');
    const rightAfter=['RightArm','RightForeArm','RightHand'].map(world);
    const rightDelta=Math.max(0,...rightBefore.map((p,i)=>
      p&&rightAfter[i]?p.distanceTo(rightAfter[i]):0));
    return {
      safeWristX:+safeX.toFixed(5),
      leftWristBeforeX:+handBeforeX.toFixed(5),
      leftWristAfterX:after?+after.x.toFixed(5):null,
      chestCenterX:+chest.x.toFixed(5),
      corrected:handBeforeX<safeX,
      rightArmDeltaMeters:+rightDelta.toFixed(8)
    };
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
    metrics:metric,
    runLeftHandClearance
  };
}
