"""Independent adult inspection motion tests. Skeletal poses require visual QA.
Every advertised motion is an actual exported glTF clip, never a simulated UI action.
The rig remains centered; avoid the known Mixamo root-translation scale problem.
"""
import bpy
import math

def add_vulva2_preview_animations(rig):
    if rig is None or rig.type != "ARMATURE":
        raise RuntimeError("Vulva2 motions require an actual humanoid armature")
    def norm(name):
        return ''.join(c for c in name.lower() if c.isalnum()).replace("mixamorig", "")
    joints = {norm(b.name): b for b in rig.pose.bones}
    def get(*names):
        return next((joints[n] for n in names if n in joints), None)
    names = {
        "hips": get("hips","pelvis"),
        "spine": get("spine","spine1"),
        "chest": get("spine2","chest","upperchest"),
        "head": get("head"),
        "neck": get("neck"),
        "lt": get("leftupleg","leftthigh"), "rt": get("rightupleg","rightthigh"),
        "lk": get("leftleg","leftshin"), "rk": get("rightleg","rightshin"),
        "la": get("leftarm","leftupperarm"), "ra": get("rightarm","rightupperarm"),
        "le": get("leftforearm"), "re": get("rightforearm"),
        "lh": get("lefthand"), "rh": get("righthand")
    }
    required = ("hips","spine","lt","rt","lk","rk","la","ra")
    missing = [k for k in required if names[k] is None]
    if missing: raise RuntimeError("Vulva2 rig lacks joints required for motion: "+str(missing))
    print("WVLRP_VULVA2_MOTION_BONES", {k:v.name if v else "-" for k,v in names.items()})
    if not rig.animation_data: rig.animation_data_create()
    def motion(label, frames):
        act=bpy.data.actions.new("Vulva2 "+label)
        rig.animation_data.action=act
        for frame, values in frames:
            for p in rig.pose.bones:
                p.rotation_mode="XYZ"
                p.rotation_euler=(0.,0.,0.)
                p.location=(0.,0.,0.)
            for key, angles in values.items():
                joint=names.get(key)
                if joint is not None:
                    joint.rotation_euler=tuple(math.radians(n) for n in angles)
            for p in rig.pose.bones:
                p.keyframe_insert(data_path="rotation_euler",frame=frame,group=p.name)
        track=rig.animation_data.nla_tracks.new()
        track.name="Vulva2 "+label
        strip=track.strips.new(track.name,frames[0][0],act)
        strip.action_frame_start=frames[0][0]
        strip.action_frame_end=frames[-1][0]
        strip.repeat=1
        rig.animation_data.action=None
    R={}
    def angles(**kwargs):
        return {k: (v,0,0) if isinstance(v,(float,int)) else v for k,v in kwargs.items()}
    motion("Stand",[(1,R),(15,angles(spine=1,head=(0,0,2))),(30,R)])
    walk1=angles(lt=22,rt=-22,lk=-24,rk=-5,la=-16,ra=16)
    walk2=angles(lt=-22,rt=22,lk=-5,rk=-24,la=16,ra=-16)
    motion("Walk",[(1,walk1),(9,walk2),(17,walk1)])
    run1=angles(lt=44,rt=-39,lk=-55,rk=-25,la=-36,ra=36,chest=6)
    run2=angles(lt=-39,rt=44,lk=-25,rk=-55,la=36,ra=-36,chest=6)
    motion("Run",[(1,run1),(7,run2),(13,run1)])
    motion("Bend",[(1,R),(28,angles(hips=32,spine=27,chest=13,la=-13,ra=-13,neck=-9))])
    motion("TouchToes",[(1,R),(32,angles(hips=57,spine=39,chest=19,la=15,ra=15,neck=-12))])
    motion("Sit",[(1,R),(34,angles(lt=75,rt=75,lk=-80,rk=-80,spine=-8,la=-10,ra=-10))])
    motion("PickUp",[(1,R),(20,angles(hips=29,spine=20,lt=22,rt=22,lk=-30,rk=-30,la=-31,ra=-31)),
                     (41,angles(hips=29,spine=20,lt=22,rt=22,lk=-30,rk=-30,la=-31,ra=-31)),(68,R)])
    hands=angles(hips=60,spine=22,chest=8,lt=-78,rt=-78,lk=-105,rk=-105,la=-78,ra=-78,le=14,re=14)
    elbows=angles(hips=64,spine=24,chest=9,lt=-78,rt=-78,lk=-108,rk=-108,la=-92,ra=-92,le=82,re=82)
    motion("HandsAndKnees",[(1,R),(40,hands)])
    motion("ElbowsAndKnees",[(1,R),(42,elbows)])
    crawl1=dict(hands);crawl1.update(angles(la=-69,ra=-87,lt=-85,rt=-69))
    crawl2=dict(hands);crawl2.update(angles(la=-87,ra=-69,lt=-69,rt=-85))
    motion("Crawl",[(1,hands),(10,crawl1),(19,crawl2),(28,crawl1),(37,hands)])
    motion("LieDown",[(1,R),(38,angles(hips=83,spine=20,lt=-38,rt=-38,lk=-50,rk=-50,la=-77,ra=-77))])
    motion("Wave",[(1,R),(10,angles(ra=(0,-45,65),re=-65)),(19,angles(ra=(0,-45,65),re=-65,rh=(0,0,30))),
                   (28,angles(ra=(0,-45,65),re=-65,rh=(0,0,-30))),(38,R)])
    for p in rig.pose.bones:
        p.rotation_mode="XYZ";p.rotation_euler=(0,0,0);p.location=(0,0,0)
    bpy.context.view_layer.update()
    print("WVLRP_VULVA2_PREVIEW_MOTIONS",len(rig.animation_data.nla_tracks),
          [t.name for t in rig.animation_data.nla_tracks])
