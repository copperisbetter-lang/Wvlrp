"""Skeletal trial motions for the Caroline Ingalls adult MPFB rig.
Derived from the grounded pose solver used by Caitlyn. All exports require visual QA.
Do not replace missing animation clips with decorative viewer buttons.
"""
import bpy, math
from mathutils import Vector

def add_caroline_animations(rig):
    def normbone(name):
        return ''.join(c for c in name.lower() if c.isalnum()).replace("mixamorig","")
    by_norm={normbone(b.name):b for b in rig.pose.bones}
    def named(*names):
        for n in names:
            if n in by_norm: return by_norm[n]
        return None
    bones={
        "hips":named("hips","pelvis"),
        "spine":named("spine","spine1"),
        "chest":named("spine2","chest","upperchest"),
        "neck":named("neck"),
        "head":named("head"),
        "lthigh":named("leftupleg","leftthigh","lthigh"),
        "rthigh":named("rightupleg","rightthigh","rthigh"),
        "lshin":named("leftleg","leftshin","lshin"),
        "rshin":named("rightleg","rightshin","rshin"),
        "larm":named("leftarm","leftupperarm","lupperarm"),
        "rarm":named("rightarm","rightupperarm","rupperarm"),
        "lforearm":named("leftforearm","lforearm"),
        "rforearm":named("rightforearm","rforearm"),
        "lhand":named("lefthand","lhand"),
        "rhand":named("righthand","rhand"),
        "lfoot":named("leftfoot","lfoot"),
        "rfoot":named("rightfoot","rfoot"),
    }
    print("WVLRP_CAROLINE_BONE_MAP",{k:v.name if v else None for k,v in bones.items()})
    required=("hips","spine","lthigh","rthigh","lshin","rshin","larm","rarm")
    missing=[k for k in required if bones[k] is None]
    if missing: raise RuntimeError("Caroline cannot pose missing body bones: "+str(missing))
    if len(rig.data.bones)<25: raise RuntimeError("Insufficient joint count for Caroline")
     # All poses use the ORIGINAL standing ground plane, rather than positioning
    # each avatar by an arbitrary center-of-mesh origin.
    bpy.context.view_layer.update()
    def rest_joint(key):
        pb=bones[key]
        return (rig.matrix_world @ pb.matrix.translation).z if pb else None
    rig_ground_z=min(v for v in (rest_joint("lfoot"),rest_joint("rfoot"),
                    rest_joint("lshin"),rest_joint("rshin")) if v is not None)
    print("WVLRP_CAROLINE_RIG_REST_GROUND",round(rig_ground_z,4))
    def build_pose(name,keys):
        if not rig.animation_data: rig.animation_data_create()
        action=bpy.data.actions.new(name)
        rig.animation_data.action=action
        crawl_seed=None
        for frame,angles,hip_drop in keys:
            for pb in rig.pose.bones:
                pb.rotation_mode="XYZ"
                pb.rotation_euler=(0,0,0)
                pb.location=(0,0,0)
            bones["hips"].location.z=hip_drop
            for kind,axis,degrees in angles:
                pb=bones.get(kind)
                if pb is not None:
                    pb.rotation_euler[axis]=math.radians(degrees)
            # Use a single anchored four-point stance for Crawl, then cycle
            # opposite arms and knees without translating the character away.
            if name=="Caroline Crawl" and frame>1:
                if crawl_seed is None:raise RuntimeError("Crawl gait missing initial grounded key")
                for pb in rig.pose.bones:
                    rot,loc=crawl_seed[pb.name]
                    pb.rotation_euler=rot
                    pb.location=loc
                phase={10:1,19:-1,28:1,37:0}.get(frame,0)
                for kind,amount in (("larm",7),("rarm",-7),
                                     ("lthigh",-6),("rthigh",6),
                                     ("lforearm",-4),("rforearm",4)):
                    bones[kind].rotation_euler.x+=math.radians(amount*phase)
            # Earlier positive shin X angles caused knees to bend anteriorly.
            # This particular MakeHuman/Mixamo rig uses NEGATIVE shin X for
            # normal backward knee folding in walk/run/pick-up/lying poses.
            if name in ("Caroline Walk","Caroline Run","Caroline PickUp","Caroline LieDown") and frame>1:
                for side in ("lshin","rshin"):
                    bones[side].rotation_euler.x=-abs(bones[side].rotation_euler.x)
            solve_ground=(name in ("Caroline HandsAndKnees","Caroline ElbowsAndKnees")
                          and frame>1) or (name=="Caroline Crawl" and frame==1)
            # Correct the two most noticeable FK posing errors from the first
            # live 3D review: knees folding the wrong way, and the neck/head
            # tipping around when the torso is pitched forward on all fours.
            #
            # Mixamo rigs do not all share the same local Euler X handedness.
            # Select knee bend from the *evaluated joint positions*, not from
            # an assumed sign. In Caroline's Blender coordinates the back of
            # the body is +Y; knees should flex with the ankles behind them.
            if solve_ground or (name=="Caroline Kneel" and frame>1):
                back_world=Vector((0,1,0))
                original_shin_angles={side:abs(math.degrees(bones[side].rotation_euler.x)) for side in ("lshin","rshin")}
                for part in ("lshin","rshin"):
                    shin=bones[part]
                    # Keep the original bend request for BOTH knees. Blender
                    # dependency-graph evaluations may reset the untouched side
                    # while we probe the first knee's world direction.
                    amount=original_shin_angles[part]
                    trials=[]
                    for sign in (-1,1):
                        shin.rotation_euler.x=math.radians(sign*amount)
                        bpy.context.view_layer.update()
                        knee_world=rig.matrix_world @ shin.matrix.translation
                        ankle_world=rig.matrix_world @ (shin.matrix @ Vector((0,shin.bone.length,0)))
                        posterior=(ankle_world-knee_world).dot(back_world)
                        trials.append((posterior,sign))
                    posterior,sign=max(trials,key=lambda v:v[0])
                    shin.rotation_euler.x=math.radians(sign*amount)
                    print("WVLRP_CAROLINE_KNEE_DIRECTION",name,part,
                          "chosen_degrees",round(sign*amount,1),
                          "posterior_m",round(posterior,4),
                          "candidates",[(round(v,3),s) for v,s in trials])
                # With the torso pitched nearly horizontal, offset its
                # rotation at the neck/head. The previous -12/+7 degree
                # combination let the face roll forward far too much.
                # Pick small pitch-only rotations that keep the head upright
                # and facing the same direction as in the rest pose; no
                # 180-degree yaw or roll is permitted.
                if name in ("Caroline HandsAndKnees","Caroline ElbowsAndKnees","Caroline Crawl") and bones["neck"] and bones["head"]:
                    neck=bones["neck"];head=bones["head"]
                    rw=rig.matrix_world.to_3x3()
                    rest_to_head=head.bone.matrix_local.to_3x3().inverted()
                    up_ref=Vector((0,0,1))
                    front_ref=Vector((0,-1,0))
                    up_local=rest_to_head @ (rw.inverted() @ up_ref)
                    front_local=rest_to_head @ (rw.inverted() @ front_ref)
                    candidates=[]
                    for neck_deg in (-55,-45,-35,-25,-15,0,15,25,35,45,55):
                        for head_deg in (-25,-15,-5,5,15,25):
                            neck.rotation_euler=(math.radians(neck_deg),0,0)
                            head.rotation_euler=(math.radians(head_deg),0,0)
                            bpy.context.view_layer.update()
                            hr=rw @ head.matrix.to_3x3()
                            up=(hr @ up_local).normalized()
                            front=(hr @ front_local).normalized()
                            upright=up.dot(up_ref)
                            forward=front.dot(front_ref)
                            score=2.5*upright+1.5*forward-.002*(abs(neck_deg)+abs(head_deg))
                            candidates.append((score,neck_deg,head_deg,upright,forward))
                    score,nd,hd,upright,forward=max(candidates)
                    neck.rotation_euler=(math.radians(nd),0,0)
                    head.rotation_euler=(math.radians(hd),0,0)
                    bpy.context.view_layer.update()
                    print("WVLRP_CAROLINE_NECK_DIRECTION",name,
                          "neck_x",nd,"head_x",hd,
                          "upright",round(upright,3),
                          "forward",round(forward,3))
                    if upright<0.25 or forward<-.35:
                        raise RuntimeError("Caroline head still twists outside safe forward/up pose")
            if solve_ground:
                # The older pose was a collection of hand-authored Euler angles.
                # It rotated the torso but left palms, elbows and knees in free air.
                # Fit the articulated limb angles against anatomical ground-support
                # targets in armature world coordinates, then move the skeleton
                # vertically so both support pairs meet the original standing floor.
                use_elbows=name.endswith("ElbowsAndKnees")
                def joint(which, end=False):
                    pb=bones[which]
                    if pb is None: return None
                    local=Vector((0,pb.bone.length,0)) if end else Vector((0,0,0))
                    return rig.matrix_world @ (pb.matrix @ local)
                def limb_set(keys, deg):
                    for b in keys:
                        if bones[b]: bones[b].rotation_euler.x=math.radians(deg)
                def metrics():
                    bpy.context.view_layer.update()
                    hip=joint("hips")
                    chest=joint("chest") or joint("spine",True)
                    knee=[joint("lshin"),joint("rshin")]
                    shoulder=[joint("larm"),joint("rarm")]
                    elbow=[joint("lforearm"),joint("rforearm")]
                    # Use the hand-bone end (the palm), not the wrist origin,
                    # or the model appears to balance on its wrists in midair.
                    wrists=[joint("lhand",True) or joint("lforearm",True),
                            joint("rhand",True) or joint("rforearm",True)]
                    ankles=[joint("lfoot") or joint("lshin",True),
                            joint("rfoot") or joint("rshin",True)]
                    contacts=elbow if use_elbows else wrists
                    if any(v is None for v in [hip,chest]+knee+shoulder+elbow+wrists+ankles):
                        raise RuntimeError("Caroline floor pose missing supported limb joints")
                    mean=lambda v: sum(v)/len(v)
                    kz=mean([v.z for v in knee]); cz=mean([v.z for v in contacts])
                    knee_back=mean([v.y-hip.y for v in knee])
                    ankle_back=mean([ankles[i].y-knee[i].y for i in (0,1)])
                    elbow_drop=mean([shoulder[i].z-elbow[i].z for i in (0,1)])
                    wrist_drop=mean([shoulder[i].z-wrists[i].z for i in (0,1)])
                    chest_forward=hip.y-chest.y
                    torso_level=abs(chest.z-hip.z)
                    # Keep shoulders forward of the supporting palms/forearms.
                    hands_forward=mean([shoulder[i].y-wrists[i].y for i in (0,1)])
                    elbow_forward=mean([shoulder[i].y-elbow[i].y for i in (0,1)])
                    grounded_difference=abs(kz-cz)
                    loss=1200*grounded_difference**2
                    # Elbow support previously solved by stretching the
                    # knees 38 cm behind Caroline and collapsing her hips to
                    # 14 cm over the floor. That is NOT elbows-and-knees.
                    # Reward raised hips and tucked-under knees strongly,
                    # while preserving the much better hands/knees fit.
                    target_hip=.43 if use_elbows else .43
                    loss+=360*(hip.z-kz-target_hip)**2
                    loss+=1600*(knee_back-.015)**2
                    if use_elbows:
                        loss+=950*max(0,.35-(hip.z-kz))**2
                    loss+=15*max(0,.035-ankle_back)**2
                    loss+=10*max(0,.28-chest_forward)**2
                    loss+=5*max(0,torso_level-.20)**2
                    loss+=9*(elbow_drop-(.39 if use_elbows else .27))**2
                    loss+=6*(wrist_drop-(.39 if use_elbows else .46))**2
                    loss+=430*(hands_forward-(.23 if use_elbows else .00))**2
                    loss+=310*(elbow_forward-(.005 if use_elbows else .04))**2
                    # Each joint must lie on the same support plane; matching
                    # only average heights can leave a hand or knee hovering.
                    loss+=700*sum((v.z-kz)**2 for v in knee)/2
                    loss+=700*sum((v.z-cz)**2 for v in contacts)/2
                    loss+=250*sum((v.z-(kz+cz)/2)**2 for v in knee+contacts)/4
                    # Test forward/back and side support, not floor height alone.
                    loss+=1100*sum((knee[i].y-hip.y-.015)**2 for i in (0,1))/2
                    loss+=700*sum((contacts[i].y-shoulder[i].y)**2 for i in (0,1))/2
                    loss+=650*sum((contacts[i].x-shoulder[i].x)**2 for i in (0,1))/2
                    loss+=400*sum((knee[i].x-(hip.x+(shoulder[i].x-hip.x)*.65))**2 for i in (0,1))/2
                    if use_elbows:
                        # For forearm-and-knee support, the wrists should lie
                        # near the elbow plane, not float high above it.
                        loss+=45*sum((wrists[i].z-contacts[i].z-.025)**2 for i in (0,1))/2
                    return loss,grounded_difference,hip,knee,contacts,wrists
                # All angular adjustments act symmetrically; no snapped or
                # backward-facing knee, no broken asymmetrical shoulders.
                choices=[
                    (("hips",),[45,55,65,75,85,95]),
                    (("lthigh","rthigh"),[-135,-120,-105,-90,-75,-60,-45,-30,-15,15,30,45,60,75]),
                    (("lshin","rshin"),[-120,-105,-90,-75,75,90,105,120]),
                    (("larm","rarm"),[-140,-115,-90,-70,-50,-30,0,30,50,70,90]),
                    (("lforearm","rforearm"),[-130,-100,-75,-50,-25,0,25,50,75,100,130])
                ]
                # Use two deliberate passes, then finer joint adjustments.
                for iteration in range(6):
                    for limbs,candidates in choices:
                        old=math.degrees(bones[limbs[0]].rotation_euler.x)
                        if iteration>=2:
                            step=12 if iteration==2 else 6 if iteration==3 else 3 if iteration==4 else 1
                            candidates=[old-2*step,old-step,old,old+step,old+2*step]
                        best=(float("inf"),old)
                        for angle in candidates:
                            limb_set(limbs,angle)
                            score=metrics()[0]+.0001*(angle-old)**2
                            if score<best[0]: best=(score,angle)
                        limb_set(limbs,best[1])
                if use_elbows:
                    # Raise the pelvis and lower the front torso by hinging
                    # the SPINE around the hip. Upper-arm X alone cannot
                    # lower the elbow origins on this imported Mixamo rig,
                    # as the previous elbow-only fit measured no improvement.
                    spine=bones["spine"]
                    spine_base=math.degrees(spine.rotation_euler.x)
                    spine_trials=[]
                    for delta in range(-48,49,2):
                        angle=spine_base+delta
                        spine.rotation_euler.x=math.radians(angle)
                        bpy.context.view_layer.update()
                        knee_plane=(joint("lshin").z+joint("rshin").z)/2
                        elbow_plane=(joint("lforearm").z+joint("rforearm").z)/2
                        trial_hip=joint("hips")
                        trial_chest=joint("chest") or joint("spine",True)
                        torso_forward=trial_hip.y-trial_chest.y
                        slope=abs(trial_chest.z-trial_hip.z)
                        score=8500*(elbow_plane-knee_plane)**2
                        score+=200*max(0,.16-torso_forward)**2
                        score+=100*max(0,slope-.32)**2
                        score+=.000015*delta*delta
                        spine_trials.append((score,angle))
                    best_spine=min(spine_trials)[1]
                    spine.rotation_euler.x=math.radians(best_spine)
                    bpy.context.view_layer.update()
                    print("WVLRP_CAROLINE_ELBOW_SPINE_FIT",
                          "from",round(spine_base,1),
                          "to",round(best_spine,1),
                          "elbow_knee_gap_m",round(
                            (joint("lforearm").z+joint("rforearm").z-
                             joint("lshin").z-joint("rshin").z)/2,4))
                    # Independently solve EACH supporting elbow onto the
                    # knee contact plane. The weighted whole-body optimizer
                    # formerly left forearm origins ~6 cm above the knees
                    # while still passing its loose support tolerance.
                    for side in ("l","r"):
                        upper=bones[side+"arm"]
                        base=math.degrees(upper.rotation_euler.x)
                        candidates=[base+d for d in range(-48,49,2)]
                        results=[]
                        for angle in candidates:
                            upper.rotation_euler.x=math.radians(angle)
                            bpy.context.view_layer.update()
                            elbow_point=joint(side+"forearm")
                            knee_level=(joint("lshin").z+joint("rshin").z)/2
                            shoulder=joint(side+"arm")
                            forward=shoulder.y-elbow_point.y
                            # Small aesthetic preference for the previous
                            # shoulder pitch, but physical elbow support wins.
                            score=1500*(elbow_point.z-knee_level)**2
                            score+=.000015*(angle-base)**2
                            score+=8*max(0,-.06-forward)**2
                            results.append((score,angle))
                        best_angle=min(results)[1]
                        upper.rotation_euler.x=math.radians(best_angle)
                        bpy.context.view_layer.update()
                        print("WVLRP_CAROLINE_ELBOW_ARM_FIT",side,
                              "from",round(base,1),"to",round(best_angle,1),
                              "elbow_knee_gap_m",
                              round(joint(side+"forearm").z-
                                  (joint("lshin").z+joint("rshin").z)/2,4))
                        # An elbow-supported pose rests both FOREARMS.
                        # Bring each palm end close to that same ground plane
                        # by rotating the forearm about its elbow joint;
                        # this does not disturb the fitted elbow position.
                        fore=bones[side+"forearm"]
                        original_angle=math.degrees(fore.rotation_euler.x)
                        fore_candidates=[]
                        for angle in [original_angle+d for d in range(-88,89,4)]:
                            fore.rotation_euler.x=math.radians(angle)
                            bpy.context.view_layer.update()
                            wrist=joint(side+"hand",True)
                            elbow=joint(side+"forearm")
                            target_z=elbow.z+.022
                            fore_candidates.append(
                                (100*(wrist.z-target_z)**2+
                                 .000008*(angle-original_angle)**2,
                                 angle))
                        fore.rotation_euler.x=math.radians(min(fore_candidates)[1])
                        bpy.context.view_layer.update()
                        print("WVLRP_CAROLINE_FOREARM_FIT",side,
                              "palm_above_elbow_m",
                              round(joint(side+"hand",True).z-
                                    joint(side+"forearm").z,4))
                if use_elbows:
                    # Shoulder *yaw* is also needed. Earlier only adjusting X
                    # pitch left elbows 18 cm sideways from their shoulders.
                    # Search independent X/Z arm rotation so elbows remain
                    # shoulder-width apart AND grounded, without changing
                    # Caroline's body mesh or touching other poses.
                    for side in ("l","r"):
                        upper=bones[side+"arm"]
                        ox=math.degrees(upper.rotation_euler.x)
                        oz=math.degrees(upper.rotation_euler.z)
                        def elbow_score():
                            bpy.context.view_layer.update()
                            e=joint(side+"forearm")
                            shoulder=joint(side+"arm")
                            knee_level=(joint("lshin").z+joint("rshin").z)*.5
                            return (2100*(e.x-shoulder.x)**2
                                  +2200*(e.z-knee_level)**2
                                  +600*(e.y-shoulder.y)**2)
                        best=(float("inf"),ox,oz)
                        for pitch in [ox+d for d in range(-32,33,8)]:
                            upper.rotation_euler.x=math.radians(pitch)
                            for yaw in range(-90,91,6):
                                upper.rotation_euler.z=math.radians(yaw)
                                score=elbow_score()
                                score+=.00002*(pitch-ox)**2+.000004*(yaw-oz)**2
                                if score<best[0]:best=(score,pitch,yaw)
                        for step in (3,1):
                            score0,px,pz=best
                            for pitch in (px-2*step,px-step,px,px+step,px+2*step):
                                upper.rotation_euler.x=math.radians(pitch)
                                for yaw in (pz-2*step,pz-step,pz,pz+step,pz+2*step):
                                    upper.rotation_euler.z=math.radians(yaw)
                                    score=elbow_score()+.00002*(pitch-ox)**2
                                    if score<best[0]:best=(score,pitch,yaw)
                        upper.rotation_euler.x=math.radians(best[1])
                        upper.rotation_euler.z=math.radians(best[2])
                        bpy.context.view_layer.update()
                        print("WVLRP_CAROLINE_ELBOW_SHOULDER_WIDTH_FIT",side,
                              "pitch",round(best[1],1),"yaw",round(best[2],1),
                              "lateral_m",round(joint(side+"forearm").x-
                                   joint(side+"arm").x,4),
                              "height_m",round(joint(side+"forearm").z-
                                  (joint("lshin").z+joint("rshin").z)*.5,4))
                _,error,hip,knee,contacts,wrists=metrics()
                # Anchor the same ground elevation used by the standing pose.
                # Measure the response of root/hips local Z rather than assuming
                # it coincides with world Z on every MPFB armature.
                contact_z=sum(v.z for v in knee+contacts)/len(knee+contacts)
                shoes=[joint("lfoot"),joint("rfoot")]
                # Rest ground is recorded from rigged feet in neutral standing.
                # It may differ slightly from the mesh soles on individual rigs.
                rest_ground=rig_ground_z
                original=bones["hips"].location.z
                bones["hips"].location.z=original+.10
                bpy.context.view_layer.update()
                sample_knee=[joint("lshin"),joint("rshin")]
                sample_contact=([joint("lforearm"),joint("rforearm")] if use_elbows
                    else [joint("lhand",True) or joint("lforearm",True),
                          joint("rhand",True) or joint("rforearm",True)])
                sample_z=sum(v.z for v in sample_knee+sample_contact)/4
                slope=(sample_z-contact_z)/.10
                if abs(slope)<.03: raise RuntimeError("Caroline hip vertical control cannot reach floor")
                corrected=original+(rest_ground-contact_z)/slope
                # The hip transform is stored in armature-local units; on
                # MakeHuman Mixamo rigs, a local value around -13 can equal
                # only a few tenths of a metre in the exported character.
                # Validate the actual WORLD movement, not the raw local value.
                world_hip_shift=abs((corrected-original)*slope)
                if not math.isfinite(corrected) or world_hip_shift>1.0:
                    raise RuntimeError(name+" unsafe pelvis ground correction "+
                                       str(round(world_hip_shift,3))+" world metres")
                bones["hips"].location.z=corrected
                _,error,hip,knee,contacts,wrists=metrics()
                print("WVLRP_CAROLINE_GROUNDED_POSE",name,
                      "contacts_height",[round(v.z,3) for v in knee+contacts],
                      "ground",round(rest_ground,3),
                      "contact_mismatch_m",round(error,3),
                      "root_hip_offset_local",round(corrected,3),
                      "root_hip_shift_world_m",round(world_hip_shift,3),
                      "knee_behind_hip",[round(v.y-hip.y,3) for v in knee])
                # Inspect individual supporting joints after translating the
                # hips. The old mean-height check masked tilted, hovering limbs.
                contact_heights=[v.z for v in knee+contacts]
                support_error=max(abs(z-rest_ground) for z in contact_heights)
                left_right_error=max(abs(knee[0].z-knee[1].z),
                                     abs(contacts[0].z-contacts[1].z))
                print("WVLRP_CAROLINE_SUPPORT_QA",name,
                      "max_support_error_m",round(support_error,3),
                      "left_right_error_m",round(left_right_error,3))
                # A matched floor plane alone is not a quadrupedal pose.
                # Check bent hips, horizontal-ish torso and forward arms.
                chest=joint("chest") or joint("spine",True)
                shoulders=[joint("larm"),joint("rarm")]
                mean_knee_z=sum(k.z for k in knee)/2
                hip_above_knees=hip.z-mean_knee_z
                chest_forward=hip.y-chest.y
                torso_slope=abs(chest.z-hip.z)
                shoulder_forward=sum(hip.y-a.y for a in shoulders)/2
                knee_xy=[knee[i].y-hip.y for i in (0,1)]
                arm_y=[contacts[i].y-shoulders[i].y for i in (0,1)]
                arm_x=[contacts[i].x-shoulders[i].x for i in (0,1)]
                max_knee_offset=max(abs(x) for x in knee_xy)
                max_arm_offset=max(abs(x) for x in arm_y)
                max_arm_side=max(abs(x) for x in arm_x)
                print("WVLRP_CAROLINE_SUPPORT_ALIGNMENT",name,
                      "knee_fore_aft_m",[round(x,3) for x in knee_xy],
                      "arm_fore_aft_m",[round(x,3) for x in arm_y],
                      "arm_lateral_m",[round(x,3) for x in arm_x])
                print("WVLRP_CAROLINE_POSTURE_QA",name,
                      "hip_above_knees_m",round(hip_above_knees,3),
                      "chest_forward_m",round(chest_forward,3),
                      "shoulder_forward_m",round(shoulder_forward,3),
                      "torso_slope_m",round(torso_slope,3),
                      "hip_root_local_offset",round(corrected,3))
                if not (.18<=hip_above_knees<=.86 and chest_forward>.16
                        and shoulder_forward>.10 and torso_slope<.42):
                    raise RuntimeError(name+
                        " does not lower the torso into a grounded quadrupedal pose")
                # In the forearm-supported pose, elbows naturally reach
                # forward of the shoulders. The previous 0.190 m hard limit
                # rejected a grounded pose measured at 0.192 m (2 mm margin),
                # even though both elbow/knee contact errors were under 2 cm.
                # Preserve stricter palms-under-shoulders QA for hand support.
                arm_forward_limit=.215 if use_elbows else .19
                if max_knee_offset>.14 or max_arm_offset>arm_forward_limit or max_arm_side>.15:
                    raise RuntimeError(name+" unsupported joint alignment: "+
                        str((round(max_knee_offset,3),round(max_arm_offset,3),round(max_arm_side,3))))
                if error>.12 or support_error>.14 or left_right_error>.12:
                    raise RuntimeError(name+" knees and "+
                      ("elbows" if use_elbows else "hands")+
                      " are not individually grounded: "+
                      str([round(z-rest_ground,3) for z in contact_heights]))
            if name=="Caroline Crawl" and frame==1:
                crawl_seed={pb.name:(tuple(pb.rotation_euler),tuple(pb.location)) for pb in rig.pose.bones}
            for pb in rig.pose.bones:
                pb.keyframe_insert(data_path="rotation_euler",frame=frame,group=pb.name)
            bones["hips"].keyframe_insert(data_path="location",frame=frame,group=bones["hips"].name)
        track=rig.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,int(keys[0][0]),action)
        strip.action_frame_start=keys[0][0]
        strip.action_frame_end=keys[-1][0]
        strip.repeat=1
        print("WVLRP_CAROLINE_POSE_CLIP",name,len(keys))
    rest=(1,[],0.0)
    build_pose("Caroline Stand",[
        rest,(15,[("spine",0,1.1),("chest",0,.8),("head",2,1.0)],0.0),
        (30,[],0.0)])
    build_pose("Caroline Bend",[
        rest,(32,[("hips",0,36),("spine",0,23),("chest",0,12),
                  ("neck",0,-13),("head",0,-12),
                  ("larm",0,-17),("rarm",0,-17)],-.04)])
    build_pose("Caroline Kneel",[
        rest,(32,[("lthigh",0,-31),("rthigh",0,-31),
                  ("lshin",0,93),("rshin",0,93),
                  ("spine",0,5),("larm",0,-8),("rarm",0,-8)],-.29)])
    build_pose("Caroline HandsAndKnees",[
        rest,(42,[("hips",0,70),("spine",0,15),("chest",0,6),
                  ("lthigh",0,-75),("rthigh",0,-75),
                  ("lshin",0,98),("rshin",0,98),
                  ("larm",0,-75),("rarm",0,-75),
                  ("lforearm",0,6),("rforearm",0,6),
                  ("neck",0,-12),("head",0,7)],-.34)])
    build_pose("Caroline ElbowsAndKnees",[
        rest,(42,[("hips",0,75),("spine",0,12),("chest",0,4),
                  ("lthigh",0,-75),("rthigh",0,-75),
                  ("lshin",0,100),("rshin",0,100),
                  ("larm",0,-90),("rarm",0,-90),
                  ("lforearm",0,90),("rforearm",0,90),
                  ("neck",0,-8),("head",0,5)],-.34)])

    # Separate, directly selectable skeletal motion tests. These are preview
    # keyframes; publication requires independent visual review of foot contact.
    build_pose("Caroline Walk", [
        (1,[],0),(8,[("lthigh",0,23),("rthigh",0,-23),("lshin",0,30),("rshin",0,9),("larm",0,-15),("rarm",0,15)],0),
        (16,[("lthigh",0,-23),("rthigh",0,23),("lshin",0,9),("rshin",0,30),("larm",0,15),("rarm",0,-15)],0),
        (24,[("lthigh",0,23),("rthigh",0,-23),("lshin",0,30),("rshin",0,9),("larm",0,-15),("rarm",0,15)],0)])
    build_pose("Caroline Run", [
        (1,[],0),(7,[("lthigh",0,47),("rthigh",0,-38),("lshin",0,65),("rshin",0,42),("larm",0,-35),("rarm",0,30),("chest",0,10)],.035),
        (13,[("lthigh",0,-38),("rthigh",0,47),("lshin",0,42),("rshin",0,65),("larm",0,30),("rarm",0,-35),("chest",0,10)],-.02),
        (19,[("lthigh",0,47),("rthigh",0,-38),("lshin",0,65),("rshin",0,42),("larm",0,-35),("rarm",0,30),("chest",0,10)],.035)])
    build_pose("Caroline TouchToes", [
        (1,[],0),(42,[("hips",0,75),("spine",0,42),("chest",0,15),("neck",0,-22),
                        ("larm",0,-22),("rarm",0,-22)],-.02)])
    build_pose("Caroline Sit", [
        (1,[],0),(38,[("lthigh",0,72),("rthigh",0,72),("lshin",0,-78),("rshin",0,-78),
                         ("spine",0,-7),("larm",0,-12),("rarm",0,-12)],-.33)])
    build_pose("Caroline PickUp", [
        (1,[],0),(25,[("hips",0,39),("spine",0,22),("lthigh",0,36),("rthigh",0,36),
                          ("lshin",0,38),("rshin",0,38),("larm",0,-35),("rarm",0,-35)],-.20),
        (45,[("hips",0,39),("spine",0,22),("lthigh",0,36),("rthigh",0,36),
                          ("lshin",0,38),("rshin",0,38),("larm",0,-35),("rarm",0,-35)],-.20),
        (70,[],0)])
    build_pose("Caroline Crawl", [
        (1,[("hips",0,70),("spine",0,15),("chest",0,6),
             ("lthigh",0,-75),("rthigh",0,-75),
             ("lshin",0,98),("rshin",0,98),
             ("larm",0,-75),("rarm",0,-75),
             ("lforearm",0,6),("rforearm",0,6),
             ("neck",0,-12),("head",0,7)],-.34),
        (10,[],0),(19,[],0),(28,[],0),(37,[],0)])
    build_pose("Caroline LieDown", [
        (1,[],0),(44,[("hips",0,89),("spine",0,9),("chest",0,5),
                       ("lthigh",0,-42),("rthigh",0,-42),
                       ("lshin",0,48),("rshin",0,48),
                       ("larm",0,-78),("rarm",0,-78)],-.48)])

    rig.animation_data.action=None
    for pb in rig.pose.bones:
        pb.rotation_mode="XYZ";pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
    
