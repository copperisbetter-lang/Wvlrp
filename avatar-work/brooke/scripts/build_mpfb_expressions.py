"""Add nondestructive facial-expression shape keys to the MPFB head preview.

This is a FUNCTIONAL TEST, not a photo-matched likeness. Operates on a copy
of the approved GLB; leaves the source unchanged.
Run in Blender: blender -b --python scripts/build_mpfb_expressions.py
"""
import bpy
from pathlib import Path

root = Path(__file__).resolve().parents[3]
source = root / "world-creator/assets/morph-head-clone.glb"
output = root / "avatar-work/brooke/build/brooke-mpfb-expressions-test.glb"
assert source.exists(), "Approved MPFB source missing"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
assert meshes, "No MPFB meshes imported"
# Do not guess which imported object represents the lips: some approved clones
# have separate eyes/teeth/skin, and blindly deforming the largest object could
# distort the entire skull. Inventory first, fail if ambiguous.
candidates = [o for o in meshes if any(k in o.name.lower() for k in ("head", "face"))]
if len(candidates) != 1:
    raise RuntimeError("Cannot identify unique head/face mesh; candidates=" +
                       repr([(o.name, len(o.data.vertices)) for o in meshes]))
head = candidates[0]
if not head.data.shape_keys:
    head.shape_key_add(name="Basis", from_mix=False)
# Add safe neutral expression controls. Actual deformation must be fitted to
# landmark positions; zero-delta keys are explicitly placeholders, not animation.
for name in ("JawOpen_NEEDS_FIT", "Smile_NEEDS_FIT", "BlinkLeft_NEEDS_FIT",
             "BlinkRight_NEEDS_FIT", "LipsPucker_NEEDS_FIT"):
    if name not in head.data.shape_keys.key_blocks:
        head.shape_key_add(name=name, from_mix=False)
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB",
                          export_animations=False, export_morph=True)
print("EXPRESSION_CONTROL_SCAFFOLD_ONLY", output)
print("NO MOTION VERIFIED; keys require topology-specific landmark fitting")
