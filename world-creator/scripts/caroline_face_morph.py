"""Reversible adult Caroline Ingalls (Karen Grassle, season-three era) face study.

A hand-tuned Blender shape key, not photogrammetry or automatic photo matching.
Modify only existing FACE vertices: no detached facial shell, rig edits, or
replacement eyes. The underlying MPFB body and original skin UV stay intact.

Reference study: oval/tapered jawline, gently defined cheekbones, narrow
straight nose, soft natural chin and mid-face contours. Review against licensed
or browser-viewed period reference photographs before claiming resemblance.
"""
import bpy
import math
from mathutils import Vector

PRESET = {
    "name": "Carolyn S3 facial likeness study v1",
    "cheek_width": -0.0040,
    "cheek_forward": 0.0023,
    "jaw_taper": -0.0051,
    "chin_forward": 0.0026,
    "nose_width": -0.0020,
    "nose_projection": 0.0018,
    "mouth_width": 0.0011,
    "brow_softening": 0.0013,
}
# Preset numbers are fractions of actual MPFB adult body height.

def apply_caroline_face_morph(root, body):
    """Create editable facial shape key on Carolyn's inspected body only."""
    if body.type != "MESH" or len(body.data.vertices) < 10000:
        raise RuntimeError("Carolyn facial morph needs the original continuous MPFB basemesh")
    if body.data.shape_keys and "Carolyn Season 3 Facial Study" in body.data.shape_keys.key_blocks:
        raise RuntimeError("Carolyn facial study shape key already exists; will not overwrite it")
    members = [root] + list(root.children_recursive)
    eyes = [o for o in members if o.type == "MESH"
            and ("high-poly" in o.name.lower() or (
                "eye" in o.name.lower() and not any(s in o.name.lower()
                for s in ("eyebrow", "eyelash", "hair", "eyelid", "iris"))))]
    inv = body.matrix_world.inverted_safe()
    eye_points = [inv @ (o.matrix_world @ v.co)
                  for o in eyes for v in o.data.vertices]
    if len(eye_points) < 28:
        raise RuntimeError("Carolyn facial morph: eye reference geometry unavailable")

    vv = body.data.vertices
    lo = min(v.co.z for v in vv)
    hi = max(v.co.z for v in vv)
    h = hi-lo
    if not 1.0 < h < 3.0:
        raise RuntimeError("Carolyn facial morph: body scale invalid")
    eye_z = sum(p.z for p in eye_points)/len(eye_points)
    cx = sum(p.x for p in eye_points)/len(eye_points)
    if not .74 < (eye_z-lo)/h < .985:
        raise RuntimeError("Carolyn eye line outside adult face region")

    head_band = sorted(v.co.y for v in vv
                       if eye_z-.075*h < v.co.z < eye_z+.032*h
                       and abs(v.co.x-cx) < .102*h)
    if len(head_band) < 200:
        raise RuntimeError("Carolyn facial morph: cannot locate existing head surface")
    # MPFB looks toward -Y. A front-side weight keeps ears/scalp/neck untouched.
    front_mid = head_band[int(len(head_band)*.47)]
    if not body.data.shape_keys:
        body.shape_key_add(name="Basis", from_mix=False)
    key = body.shape_key_add(name="Carolyn Season 3 Facial Study", from_mix=False)
    key.value = 1.0

    def bell(x, center, radius):
        return math.exp(-((x-center)/radius)**2)
    modified = 0
    peak = 0.0
    for i,v in enumerate(vv):
        p = v.co
        dz = (p.z-eye_z)/h
        if dz < -.165 or dz > .055:
            continue
        # Only geometry facing front of the head, with a feathered transition.
        forward = max(0.0, min(1.0, (front_mid+.035*h-p.y)/(.085*h)))
        front_weight = forward*forward*(3-2*forward)
        if front_weight < .012:
            continue
        x = (p.x-cx)/h
        ax = abs(x)
        side = 1 if x >= 0 else -1
        cheek = bell(ax,.059,.037)*bell(dz,-.038,.038)
        jaw = bell(ax,.052,.050)*bell(dz,-.101,.037)
        chin = bell(ax,0,.040)*bell(dz,-.119,.025)
        nose = bell(ax,.016,.020)*bell(dz,-.050,.046)
        tip = bell(ax,0,.018)*bell(dz,-.072,.023)
        lip = bell(ax,.034,.027)*bell(dz,-.094,.019)
        brow = bell(ax,.045,.038)*bell(dz,.013,.016)
        # Keep the bone/eye sockets and mouth opening essentially unmoved.
        shift_x = side*h*front_weight*(
            PRESET["cheek_width"]*cheek +
            PRESET["jaw_taper"]*jaw +
            PRESET["nose_width"]*nose +
            PRESET["mouth_width"]*lip)
        shift_y = -h*front_weight*(
            PRESET["cheek_forward"]*cheek +
            PRESET["chin_forward"]*chin +
            PRESET["nose_projection"]*tip +
            PRESET["brow_softening"]*brow)
        old = Vector((p.x,p.y,p.z))
        new = old+Vector((shift_x,shift_y,0))
        distance = (new-old).length
        if distance > .014*h:
            raise RuntimeError("Carolyn facial sculpt exceeds safe deformation range")
        key.data[i].co = new
        if distance > .00001*h:
            modified += 1
            peak = max(peak,distance)
    if modified < 150:
        raise RuntimeError("Carolyn facial study affected too few face vertices")
    body.data.update()
    print("WVLRP_CAROLINE_FACE_MORPH_SUCCESS",
          key.name, "vertices", modified,
          "max_displacement_mm", round(peak*1000,2),
          "preset", PRESET["name"])
    return key
