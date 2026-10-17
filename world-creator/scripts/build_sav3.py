"""Build Sav 3 adult with four additional functional distal skeletal joints.

The base Mixamo rig exports 52 joints. Add weighted hand/foot end joints
before GLB export, rather than weakening the 56-joint validation.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
base = root / "scripts" / "build_vulva2_female18.py"
source = base.read_text(encoding="utf-8")
# SAV 3 uses the existing authentic Vulva2 pipeline. Do not mix Vulva1 and Vulva2 assets.
if source.count('addon=fit_vulva2(root,body,rigs[0])') != 1:
    raise RuntimeError('SAV3_SOURCE_MISMATCH: expected exactly one Vulva2 attachment call')
if 'fit_vulva1(' in source:
    raise RuntimeError('SAV3_DUPLICATE_ANATOMY: Vulva1 and Vulva2 must not be mixed')
old = 'OUT=ROOT/"assets"/"vulva2-female18-inspection.glb"'
if source.count(old) != 1:
    raise RuntimeError("Upstream adult builder output definition changed")
source = source.replace(old, 'OUT=ROOT/"assets"/"sav3-adult-inspection.glb"')
source = source.replace('h.name="Vulva2 Test Adult Female 18"', 'h.name="Sav 3 Adult Female 18"')
source = source.replace('print("VULVA2_FEMALE18_BUILD_SUCCESS"', 'print("SAV3_ADULT_BUILD_SUCCESS"')

insertion_point = 'bpy.context.view_layer.update()\nbpy.ops.object.select_all(action="DESELECT")'
if source.count(insertion_point) != 1:
    raise RuntimeError("Could not locate Sav 3 pre-export rig insertion point")
addition = '''
# Add four real, deforming distal control joints to the 52-joint Mixamo rig.
# Their skin weights are drawn from the respective existing hand/foot groups;
# the remaining original weights are preserved and normalized on export.
arm = rigs[0]
specs = [
    ("LeftIndexEnd", ("LeftHand",), 0.20),
    ("RightIndexEnd", ("RightHand",), 0.20),
    ("LeftToeEnd", ("LeftToeBase", "LeftFoot"), 0.15),
    ("RightToeEnd", ("RightToeBase", "RightFoot"), 0.15),
]
def find_bone(suffixes):
    for suffix in suffixes:
        for bone in arm.data.bones:
            if bone.name.split(":")[-1] == suffix:
                return bone.name
    raise RuntimeError("Missing required parent joint: " + repr(suffixes))
parents = [(name, find_bone(candidates), fraction)
           for name, candidates, fraction in specs]
bpy.ops.object.select_all(action="DESELECT")
arm.hide_set(False)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
for name, parent_name, fraction in parents:
    parent = arm.data.edit_bones[parent_name]
    bone = arm.data.edit_bones.new("Sav3_" + name)
    bone.parent = parent
    bone.use_connect = False
    bone.use_deform = True
    bone.head = parent.tail.copy()
    direction = parent.tail - parent.head
    if direction.length < 0.0001:
        direction = Vector((0, 0, 0.05))
    bone.tail = bone.head + direction.normalized() * max(0.012, parent.length * fraction)
bpy.ops.object.mode_set(mode="OBJECT")
# Use actual existing distal vertices, so each new bone is a skin joint,
# not an unweighted placeholder omitted by the glTF skin exporter.
for name, parent_name, _ in parents:
    new_name = "Sav3_" + name
    parent_group = body.vertex_groups.get(parent_name)
    if parent_group is None:
        raise RuntimeError("Missing parent skin group: " + parent_name)
    new_group = body.vertex_groups.new(name=new_name)
    candidates = []
    for vertex in body.data.vertices:
        for group in vertex.groups:
            if group.group == parent_group.index and group.weight > 0.05:
                candidates.append((group.weight, vertex.index))
    if not candidates:
        raise RuntimeError("No deformable vertices for " + new_name)
    candidates.sort(reverse=True)
    # Split parent weights on a small, strongly associated patch of geometry.
    for _, vertex_id in candidates[:min(12, len(candidates))]:
        vertex = body.data.vertices[vertex_id]
        weight = next(g.weight for g in vertex.groups if g.group == parent_group.index)
        transfer = weight * 0.20
        parent_group.add([vertex_id], weight - transfer, "REPLACE")
        new_group.add([vertex_id], transfer, "REPLACE")
print("SAV3_DISTAL_JOINTS_WEIGHTED", [name for name, _, _ in parents])
'''
source = source.replace(insertion_point, addition + '\n' + insertion_point)
source = source.replace('"LieDown","Wave")}', '"LieDown","Wave","Fetal","SupineKneesUp")}' )
anchor = 'if not glb.get("skins"):raise RuntimeError("Model lost rig skinning")'
if source.count(anchor) != 1:
    raise RuntimeError("Exported skin validation anchor missing")
source = source.replace(anchor, anchor + '''
joint_ids = set()
for skin in glb["skins"]:
    joint_ids.update(skin.get("joints", []))
if len(joint_ids) != 56:
    raise RuntimeError(f"Sav 3 requires 56 exported skeletal joints; found {len(joint_ids)}")
joint_names = {glb["nodes"][i].get("name", "") for i in joint_ids}
required = {"Sav3_" + name for name, _, _ in [
    ("LeftIndexEnd", (), 0), ("RightIndexEnd", (), 0),
    ("LeftToeEnd", (), 0), ("RightToeEnd", (), 0)]}
if not required.issubset(joint_names):
    raise RuntimeError("New weighted distal joints absent from exported skin: " + str(required-joint_names))
print("SAV3_56_JOINTS_VERIFIED", len(joint_ids))
''')
# Prevent publishing an obviously exploded face. All facial assets must occupy
# a tight envelope around the head and must not project wildly beyond skin.
face_anchor = 'validate_visible_meshes()\n\nadd_vulva2_preview_animations'
if source.count(face_anchor) != 1:
    raise RuntimeError("SAV3_FACE_QA_ANCHOR_CHANGED")
face_qa = '''
def validate_face_alignment():
    from mathutils import Vector
    points=[body.matrix_world @ v.co for v in body.data.vertices]
    low=min(p.z for p in points); high=max(p.z for p in points)
    height=high-low
    head_points=[p for p in points if p.z>low+.83*height]
    if not head_points: raise RuntimeError("SAV3_FACE_NO_HEAD_SURFACE")
    left=min(p.x for p in head_points); right=max(p.x for p in head_points)
    front=min(p.y for p in head_points); back=max(p.y for p in head_points)
    bad=[]
    counts={"eyes":0,"teeth":0}
    for obj in [root]+list(root.children_recursive):
        if obj.type!="MESH" or obj in (body,addon,hair): continue
        name=obj.name.lower()
        is_eye=("high-poly" in name or "low-poly" in name or "eye" in name) and not any(x in name for x in ("brow","lash"))
        is_teeth=any(x in name for x in ("teeth","tooth"))
        if not (is_eye or is_teeth):continue
        category="eyes" if is_eye else "teeth"
        counts[category]+=1
        coords=[obj.matrix_world @ v.co for v in obj.data.vertices]
        if not coords:bad.append((obj.name,"empty"));continue
        # Allow minor protrusion, but reject eyeballs or jaws sitting
        # visibly outside the facial silhouette (as in Oct 17 screenshots).
        if (min(p.x for p in coords)<left-.025*height or
            max(p.x for p in coords)>right+.025*height or
            min(p.y for p in coords)<front-.035*height or
            max(p.y for p in coords)>back+.025*height or
            min(p.z for p in coords)<low+.76*height or
            max(p.z for p in coords)>high+.015*height):
            bad.append((obj.name,"outside head envelope"))
    if counts["eyes"]<1 or counts["teeth"]<1:
        bad.append(("face","missing eyes or teeth"))
    if bad:raise RuntimeError("SAV3_FACE_ALIGNMENT_FAILED: "+repr(bad))
    print("SAV3_FACE_ENVELOPE_VERIFIED",counts,flush=True)
validate_face_alignment()
'''
source=source.replace(face_anchor,'validate_visible_meshes()\n'+face_qa+'\nadd_vulva2_preview_animations')

# Reject a second pelvic proxy, including copies without the expected tag.
anatomy_anchor = 'hair=add_clean_long_blonde_hair(root,body,rigs[0])'
if source.count(anatomy_anchor) != 1:
    raise RuntimeError("SAV3_ANATOMY_QA_ANCHOR_CHANGED")
anatomy_qa = '''
def validate_single_pelvic_attachment():
    meshes=[o for o in [root]+list(root.children_recursive) if o.type=="MESH"]
    candidates=[o for o in meshes if any(term in o.name.lower()
                for term in ("vulva","labia","genital","pelvic attachment"))]
    if len(candidates)!=1 or candidates[0]!=addon:
        raise RuntimeError("SAV3_DUPLICATE_PELVIC_MESHES: "+repr([o.name for o in candidates]))
    if addon.hide_render or addon.hide_viewport:
        raise RuntimeError("SAV3_PELVIC_ATTACHMENT_HIDDEN")
    if len([m for m in addon.modifiers if m.type=="ARMATURE" and m.object==rigs[0]])!=1:
        raise RuntimeError("SAV3_PELVIC_RIG_MISMATCH")
    print("SAV3_SINGLE_PELVIC_ATTACHMENT_VERIFIED",flush=True)
validate_single_pelvic_attachment()
'''
source=source.replace(anatomy_anchor,anatomy_qa+'\\n'+anatomy_anchor)

# Facial accessories must be bound to the same rig as the body. A valid
# position in the bind pose is not enough if their parent/armature differs.
rig_anchor = 'validate_face_alignment()\n'
if source.count(rig_anchor) != 1:
    raise RuntimeError("SAV3_FACE_RIG_ANCHOR_CHANGED")
rig_qa = '''
def validate_face_rigging():
    for obj in [root]+list(root.children_recursive):
        if obj.type!="MESH" or obj in (body,addon,hair): continue
        name=obj.name.lower()
        if not any(term in name for term in ("eye","brow","lash","teeth","tooth","high-poly","low-poly")):
            continue
        modifiers=[m for m in obj.modifiers if m.type=="ARMATURE"]
        if len(modifiers)!=1 or modifiers[0].object!=rigs[0]:
            raise RuntimeError("SAV3_FACE_RIG_MISMATCH: "+obj.name)
        if not obj.vertex_groups:
            raise RuntimeError("SAV3_FACE_UNWEIGHTED: "+obj.name)
        if any(not vertex.groups for vertex in obj.data.vertices):
            raise RuntimeError("SAV3_FACE_PARTIALLY_UNWEIGHTED: "+obj.name)
    print("SAV3_FACE_RIG_BINDINGS_VERIFIED",flush=True)
validate_face_rigging()
'''
source=source.replace(rig_anchor,rig_anchor+rig_qa)

exec(compile(source, str(base), "exec"), {"__name__": "__main__", "__file__": str(base)})
