"""Create an independent Laura-inspired head-and-hair *inspection proxy*.

Run: blender -b --python world-creator/scripts/build_laura_head_proxy.py
This is NOT a photogrammetric likeness. It uses the recorded two-view landmarks
for proportional guidance; perspective stills cannot recover full 3D geometry.
Never writes the approved SAV4 GLB or changes the production character.
"""
import bpy, json, math
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
landmarks = json.loads((root / "characters/sav4/laura-two-view-landmarks.json").read_text())
front = landmarks["front_three_quarter"]
eye_a, eye_b = front["eye_centers"]
eye_span = math.dist(eye_a, eye_b)
mouth_span = math.dist(*front["mouth_corners"])
if eye_span <= 0 or mouth_span <= 0:
    raise RuntimeError("Invalid reference measurements")
mouth_ratio = max(.58, min(.90, mouth_span / eye_span))
out = root / "assets" / "laura-head-inspection-proxy.glb"
out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=0.85):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color, 1)
    node.inputs["Roughness"].default_value = roughness
    return mat

skin = material("Inspection neutral skin - match SAV4 on attachment", (.68,.48,.38))
hairmat = material("Laura dusty ash blonde", (.52,.43,.32))
iris = material("Pale blue iris", (.37,.57,.71), .3)
dark = material("Natural dark details", (.18,.12,.10))
lip = material("Soft natural lips", (.55,.29,.28))
white = material("Eye whites", (.89,.86,.80), .22)

def ellipsoid(name, center, radii, mat, segments=48, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=center)
    ob=bpy.context.object
    ob.name=name
    ob.scale=radii
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth=True
    return ob

# Standalone head is centered at origin. Neck seam remains exposed for later
# *calibrated* attachment to SAV4's source head/neck mesh.
ellipsoid("Laura inspection head oval", (0,0,.18), (.79,.62,1.04), skin)
ellipsoid("Neck fitting placeholder", (0,0,-.88), (.34,.34,.43), skin)
for sign in (-1,1):
    ellipsoid("Upper cheek "+str(sign), (sign*.47,-.48,.05), (.29,.17,.22), skin)
    ellipsoid("Eye white "+str(sign), (sign*.34,-.575,.39), (.235,.10,.115), white)
    ellipsoid("Iris "+str(sign), (sign*.34,-.67,.39), (.083,.025,.085), iris)
    ellipsoid("Pupil "+str(sign), (sign*.34,-.694,.39), (.037,.015,.047), dark)
    ellipsoid("Upper eyelid "+str(sign), (sign*.34,-.58,.505), (.235,.082,.042), skin)
    ellipsoid("Eyebrow "+str(sign), (sign*.34,-.585,.60), (.235,.052,.035), hairmat)
ellipsoid("Nose bridge", (0,-.64,.16), (.135,.15,.38), skin)
ellipsoid("Nose rounded tip", (0,-.79,-.035), (.17,.16,.12), skin)
ellipsoid("Upper lip", (0,-.619,-.28), (.34*mouth_ratio/.75,.12,.052), lip)
ellipsoid("Lower lip", (0,-.62,-.35), (.32*mouth_ratio/.75,.12,.069), lip)
ellipsoid("Hair cap", (0,.045,.69), (.80,.65,.60), hairmat)
# Long ash-blonde hair and fringe as separate, replaceable inspection meshes.
for sign in (-1,1):
    for i in range(8):
        x=sign*(.53+i*.033)
        ellipsoid("Long hair strand %s-%s"%(sign,i), (x,.075,-.26), (.08,.24,.95), hairmat, 24, 16)
for i in range(11):
    x=(i-5)*.125
    ellipsoid("Soft fringe %02d"%i, (x,-.49,.78-abs(x)*.12), (.092,.10,.33), hairmat, 24, 16)

# Independent facial expression controls. These are inspection-grade movable
# objects; production topology and skinning are still required for realism.
# Named Blender animation clips export to GLB and can be previewed independently.
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 30
def action_clip(label, transforms):
    # Exporter collects active actions as independent GLB animation clips.
    for ob in bpy.data.objects:
        if ob.type != 'MESH': continue
        ob.animation_data_clear()
    for ob_name, frames in transforms.items():
        ob = bpy.data.objects.get(ob_name)
        if ob is None: continue
        origin = ob.location.copy()
        for frame, delta, scale in frames:
            ob.location = origin + Vector(delta)
            ob.scale = scale
            ob.keyframe_insert(data_path='location',frame=frame)
            ob.keyframe_insert(data_path='scale',frame=frame)
        ob.location=origin
        ob.scale=(1,1,1)
    for ob in bpy.data.objects:
        if ob.animation_data and ob.animation_data.action:
            ob.animation_data.action.name=label
# GLB viewer drives explicit named facial objects so both eyes can wink separately.
# Inspection collection is explicitly NOT the approved SAV4 mesh.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=str(out), export_format="GLB", use_selection=False)
print("LAURA_HEAD_INSPECTION_PROXY_EXPORTED",out)
print("NOT_PHOTOGRAMMETRIC; NOT_FITTED_TO_SAV4; NOT_PRODUCTION_READY")
