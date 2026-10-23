"""Report whether Brooke candidate is actually a full-body character (never infer from mesh names)."""
import bpy, json, sys
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[3]
candidate=root/'avatar-work/brooke/build/brooke-mpfb-first-proportional-fit.glb'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(candidate))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
points=[o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
lo=[min(p[i] for p in points) for i in range(3)]
hi=[max(p[i] for p in points) for i in range(3)]
height=hi[2]-lo[2]
# A realistic adult full body should span >1m; a bust cannot pass.
full_body=height>=1.0
report={'source':str(candidate.relative_to(root)),'world_bounds_min':lo,'world_bounds_max':hi,'height_m':height,'full_body_extent_pass':full_body,'assessment':'full-body candidate' if full_body else 'FAIL: source is head/shoulders bust; cannot claim complete body, rig or game readiness'}
out=root/'avatar-work/brooke/build/review/body-audit.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(report,indent=2))
print('BROOKE_BODY_AUDIT',json.dumps(report))
