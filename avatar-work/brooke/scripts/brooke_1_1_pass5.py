"""Brooke 1.1 Pass 5: non-destructive, adjustable facial corrective shape key.
Run in Blender after importing a COPY of Brooke 1.1 GLB:
  blender -b file.blend --python brooke_1_1_pass5.py
No original assets are overwritten. Geometry only; UV paint requires separate calibration.
Coordinates assume face points toward +Z, X horizontal, Y vertical. Inspect before applying.
"""
import bpy, math
from mathutils import Vector

NAME = "Brooke_1_1_Pass5_Corrective"
# Deliberately conservative defaults. All changes are reversible via shape key.
BROW_RECESS = 0.012
LIP_ADVANCE = 0.014
def bell(x, center, radius):
    return math.exp(-0.5*((x-center)/max(radius,1e-8))**2)

meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
candidates=[o for o in meshes if ("head" in o.name.lower() or "skin" in o.name.lower()) and
            "eye" not in o.name.lower() and "hair" not in o.name.lower()]
if len(candidates)!=1:
    raise RuntimeError("Expected exactly one head-skin mesh; found %d. Refusing ambiguous edits." % len(candidates))
obj=candidates[0]
if obj.data.shape_keys and NAME in obj.data.shape_keys.key_blocks:
    raise RuntimeError("Pass 5 corrective already exists; refusing duplicate.")
coords=[v.co.copy() for v in obj.data.vertices]
if len(coords)<1000: raise RuntimeError("Unexpected head geometry")
lo=Vector(tuple(min(v[i] for v in coords) for i in range(3)))
hi=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
span=hi-lo
if min(span)<1e-5: raise RuntimeError("Degenerate head bounds")
# Ratios are intentionally exposed: tune against Brooke front/profile photos.
# No claim of photo-calibrated placement until landmarks are supplied.
if not obj.data.shape_keys: obj.shape_key_add(name="Basis",from_mix=False)
key=obj.shape_key_add(name=NAME,from_mix=False)
for i,v in enumerate(coords):
    x=(v.x-(lo.x+hi.x)/2)/span.x
    y=(v.y-lo.y)/span.y
    z=(v.z-lo.z)/span.z
    # Only front-facing vertices: avoid deforming back of head.
    front=bell(z,.84,.20)
    # Broad smooth forehead correction, sparing eye sockets.
    brow=bell(x,0,.36)*bell(y,.76,.105)*front
    # Small smooth lip projection centered below nose.
    lips=bell(x,0,.19)*bell(y,.35,.065)*front
    key.data[i].co=v+Vector((0,0,-BROW_RECESS*brow+LIP_ADVANCE*lips))
key.value=1.0
obj["brooke_1_1_pass5_status"]="UNVERIFIED: front/profile visual QA and landmark fit required"
print("Created reversible Brooke 1.1 geometry corrective on",obj.name,
      "vertices",len(coords),"shape key",NAME)
