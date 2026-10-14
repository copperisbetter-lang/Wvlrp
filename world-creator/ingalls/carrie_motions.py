"""Carrie-specific, anatomically calibrated animations.

Use Carrie's *actual* MPFB rig rather than copying canned rotations from Jenny.
Front is -Y in the original MakeHuman/MPFB body coordinates.
"""
import math
import bpy
from mathutils import Vector, Euler

EXPECTED = [
    "Idle", "Walk", "Run", "Wave", "Sit", "Crouch",
    "Bend Over", "Touch Toes", "Pick Up", "Hands and Knees",
    "Elbows and Knees", "Crawl", "Lie Down", "Kneel",
]

def norm(name):
    return ''.join(c for c in name.lower() if c.isalnum()).replace("mixamorig", "")

def build_carrie_motions(rig):
    bones = {norm(b.name): b for b in rig.pose.bones}
    def find(name):
        bone = bones.get(name)
        if bone is None:
            raise RuntimeError("Carrie animation requires bone " + name)
        return bone
    for side in ("left", "right"):
        for suffix in ("upleg", "leg", "foot", "arm", "forearm", "hand"):
            find(side + suffix)
    for name in ("spine", "head", "hips"):
        find(name)
    upper_arm_base = {}
    for side in ("left", "right"):
        bone = find(side + "arm")
        rest = bone.bone.tail_local - bone.bone.head_local
        if rest.length < 0.01:
            raise RuntimeError("Carrie upper arm has zero rest length")
        outward = 1 if bone.bone.tail_local.x > bone.bone.head_local.x else -1
        lower = Vector((outward * .12, 0, -.993)).normalized()
        raised = Vector((outward * .80, -.05, .60)).normalized()
        upper_arm_base[side] = (
            rest.normalized().rotation_difference(lower),
            rest.normalized().rotation_difference(raised),
        )
    all_bones = list(rig.pose.bones)

    def neutral():
        for b in all_bones:
            b.location = (0, 0, 0)
            if norm(b.name) in ("leftarm", "rightarm"):
                side = "left" if norm(b.name).startswith("left") else "right"
                b.rotation_mode = "QUATERNION"
                b.rotation_quaternion = upper_arm_base[side][0]
            else:
                b.rotation_mode = "XYZ"
                b.rotation_euler = (0, 0, 0)
        bpy.context.view_layer.update()

    def probe(pivot, tracker, axis, prefer, magnitude=.65, raise_arm=False):
        # Sample actual forward kinematics for BOTH signs on THIS rig.
        # Avoid the backward-knee problem caused by assuming local Euler axes
        # have the same orientation on every imported humanoid skeleton.
        result = []
        for sign in (-1, 1):
            neutral()
            b = find(pivot)
            if pivot.endswith("arm") and not pivot.endswith("forearm"):
                side = "left" if pivot.startswith("left") else "right"
                b.rotation_quaternion = upper_arm_base[side][1 if raise_arm else 0] @ Euler((sign * magnitude, 0, 0), "XYZ").to_quaternion()
            else:
                b.rotation_euler.x = sign * magnitude
            bpy.context.view_layer.update()
            pos = find(tracker).matrix.translation.copy()
            result.append((sign, pos[axis]))
        neutral()
        winner = min(result, key=lambda v: v[1]) if prefer == "min" else max(result, key=lambda v: v[1])
        separation = abs(result[0][1] - result[1][1])
        if separation < .005:
            raise RuntimeError("Cannot calibrate Carrie " + pivot + " using " + tracker + " motion")
        return winner[0]

    signs = {}
    for side in ("left", "right"):
        # A flexed knee carries the ankle POSTERIOR (+Y) to the knee.
        signs[side+"leg"] = probe(side+"leg", side+"foot", 1, "max", .75)
        # A positive swing brings the knee ANTERIOR (-Y) for a walking step.
        signs[side+"upleg"] = probe(side+"upleg", side+"leg", 1, "min", .45)
        # Positive shoulder swing takes hands forward, not behind the body.
        signs[side+"arm"] = probe(side+"arm", side+"forearm", 1, "min", .65)
        # An elbow bend lifts the wrist toward the face.
        signs[side+"forearm"] = probe(side+"forearm", side+"hand", 2, "max", .85)
    signs["spine"] = probe("spine", "head", 1, "min", .5)
    print("WVLRP_CARRIE_ANATOMICAL_HINGE_SIGNS", signs, flush=True)

    def motion_pose(raw, wave=False):
        for b in all_bones:
            key = norm(b.name)
            values = raw.get(key, (0, 0, 0))
            if key in ("leftarm", "rightarm"):
                side = "left" if key.startswith("left") else "right"
                b.rotation_mode = "QUATERNION"
                base = upper_arm_base[side][1 if wave and side == "right" else 0]
                b.rotation_quaternion = base @ Euler(values, "XYZ").to_quaternion()
            else:
                b.rotation_mode = "XYZ"
                b.rotation_euler = values
        bpy.context.view_layer.update()

    def make_values(**kw):
        return {key: (float(val) * signs.get(key, 1), 0., 0.) for key,val in kw.items()}

    def pose(hips=0, lhip=0, rhip=0, lknee=0, rknee=0, spine=0,
             larm=0, rarm=0, lelbow=0, relbow=0, rhand=0, head=0):
        d = make_values(leftupleg=lhip, rightupleg=rhip,
                        leftleg=lknee, rightleg=rknee, spine=spine,
                        leftarm=larm, rightarm=rarm,
                        leftforearm=lelbow, rightforearm=relbow)
        if rhand:
            d["righthand"] = (0., float(rhand), 0.)
        if head:
            d["head"] = (float(head), 0., 0.)
        return d

    z = {}
    sequence = {
        "Idle": [(1,z),(18,pose(spine=.025)),(36,z)],
        "Walk": [(1,pose(lhip=.32,rhip=-.32,lknee=.24,rarm=.18,larm=-.18)),
                 (10,pose(lhip=-.32,rhip=.32,rknee=.24,rarm=-.18,larm=.18)),
                 (19,pose(lhip=.32,rhip=-.32,lknee=.24,rarm=.18,larm=-.18))],
        "Run": [(1,pose(lhip=.50,rhip=-.46,lknee=.58,rarm=.28,larm=-.28)),
                (7,pose(lhip=-.46,rhip=.50,rknee=.58,rarm=-.28,larm=.28)),
                (13,pose(lhip=.50,rhip=-.46,lknee=.58,rarm=.28,larm=-.28))],
        "Wave": [(1,z),(12,pose(relbow=1.18,rhand=.10)),
                 (20,pose(relbow=1.18,rhand=-.50)),
                 (28,pose(relbow=1.18,rhand=.45)),
                 (36,pose(relbow=1.18,rhand=-.38)),
                 (44,z)],
        "Sit": [(1,z),(16,pose(lhip=1.05,rhip=1.05,lknee=1.20,rknee=1.20)),
                (44,pose(lhip=1.35,rhip=1.35,lknee=1.44,rknee=1.44))],
        "Crouch": [(1,z),(22,pose(lhip=.90,rhip=.90,lknee=1.32,rknee=1.32,spine=.26,larm=.3,rarm=.3)),
                   (44,pose(lhip=.90,rhip=.90,lknee=1.32,rknee=1.32,spine=.26,larm=.3,rarm=.3))],
        "Bend Over": [(1,z),(22,pose(spine=1.05,lhip=.2,rhip=.2,larm=.45,rarm=.45)),
                      (45,pose(spine=1.05,lhip=.2,rhip=.2,larm=.45,rarm=.45))],
        "Touch Toes": [(1,z),(22,pose(spine=1.24,lhip=.28,rhip=.28,larm=.95,rarm=.95)),
                       (45,pose(spine=1.24,lhip=.28,rhip=.28,larm=.95,rarm=.95))],
        "Pick Up": [(1,z),(15,pose(spine=.66,lhip=.48,rhip=.48,lknee=.32,rknee=.32,larm=.82,rarm=.82)),
                    (27,pose(spine=.98,lhip=.6,rhip=.6,lknee=.48,rknee=.48,larm=1.08,rarm=1.08)),
                    (50,z)],
        "Hands and Knees": [(1,z),(18,pose(spine=.62,lhip=.75,rhip=.75,lknee=1.27,rknee=1.27,larm=.76,rarm=.76)),
                            (40,pose(spine=1.0,lhip=1.05,rhip=1.05,lknee=1.5,rknee=1.5,larm=1.20,rarm=1.20))],
        "Elbows and Knees": [(1,z),(18,pose(spine=.72,lhip=.85,rhip=.85,lknee=1.3,rknee=1.3,larm=.82,rarm=.82,lelbow=.7,relbow=.7)),
                             (40,pose(spine=1.14,lhip=1.05,rhip=1.05,lknee=1.5,rknee=1.5,larm=1.14,rarm=1.14,lelbow=1.18,relbow=1.18))],
        "Crawl": [(1,pose(spine=1.05,lhip=1.05,rhip=.78,lknee=1.35,rknee=1.52,larm=1.2,rarm=.8,lelbow=.22)),
                  (13,pose(spine=1.05,lhip=.78,rhip=1.05,lknee=1.52,rknee=1.35,larm=.8,rarm=1.2,relbow=.22)),
                  (25,pose(spine=1.05,lhip=1.05,rhip=.78,lknee=1.35,rknee=1.52,larm=1.2,rarm=.8,lelbow=.22))],
        "Lie Down": [(1,z),(18,pose(spine=1.1,lhip=.92,rhip=.92,lknee=.80,rknee=.80,larm=.8,rarm=.8)),
                     (40,pose(spine=1.53,lhip=1.35,rhip=1.35,lknee=.30,rknee=.30,larm=1.2,rarm=1.2))],
        "Kneel": [(1,z),(18,pose(lhip=.55,rhip=.55,lknee=1.45,rknee=1.45,spine=.12)),
                  (40,pose(lhip=.55,rhip=.55,lknee=1.45,rknee=1.45,spine=.12))],
    }
    if list(sequence) != EXPECTED:
        raise RuntimeError("Carrie motion list differs from requirement")

    if not rig.animation_data:
        rig.animation_data_create()
    if rig.animation_data.action:
        rig.animation_data.action = None
    for name, frames in sequence.items():
        act = bpy.data.actions.new("Carrie " + name)
        rig.animation_data.action = act
        for frame, raw in frames:
            motion_pose(raw, wave=name == "Wave" and frame != frames[0][0] and frame != frames[-1][0])
            for bone in all_bones:
                if bone.rotation_mode == "QUATERNION":
                    bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone.name)
                else:
                    bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
        rig.animation_data.action = None
        track = rig.animation_data.nla_tracks.new()
        track.name = "Carrie " + name
        strip = track.strips.new(track.name, frames[0][0], act)
        strip.action_frame_start = frames[0][0]
        strip.action_frame_end = frames[-1][0]
        if name in ("Walk", "Run", "Crawl", "Idle"):
            strip.repeat = 1.0
    neutral()
    bpy.context.scene.frame_set(1)
    # Calibrated joint signs guarantee that the ankle folds toward the rear
    # of the knee, with symmetrical left/right behavior.
    for side in ("left", "right"):
        neutral()
        knee = find(side+"leg")
        knee.rotation_euler.x = signs[side+"leg"]*.85
        bpy.context.view_layer.update()
        if find(side+"foot").matrix.translation.y <= knee.matrix.translation.y - .02:
            raise RuntimeError("Carrie " + side + " knee bends forward: export blocked")
    neutral()
    print("WVLRP_CARRIE_MOTIONS_VERIFIED", ",".join("Carrie "+x for x in EXPECTED), flush=True)
    return ["Carrie "+x for x in EXPECTED]
