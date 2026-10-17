"""Build Sav 3 adult with four additional functional distal skeletal joints.

The base Mixamo rig exports 52 joints. Add weighted hand/foot end joints
before GLB export, rather than weakening the 56-joint validation.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
base = root / "scripts" / "build_vulva2_female18.py"
source = base.read_text(encoding="utf-8")
# Do not silently certify Vulva2 as the requested Vulva1 asset.
# The current upstream builder is Vulva2-only. Refuse a mislabeled release
# until a real Vulva1-based body/export pipeline is wired in and validated.
if "fit_vulva2(" in source and "fit_vulva1(" not in source:
    raise RuntimeError(
        "SAV3_ASSET_MISMATCH: upstream builds Vulva2, not requested Vulva1. "
        "Do not deploy or label this export as a corrected Sav3."
    )
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
exec(compile(source, str(base), "exec"), {"__name__": "__main__", "__file__": str(base)})
