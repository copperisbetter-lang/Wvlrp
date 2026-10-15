"""Carol's adult pelvic detail: C0-anchored, reversible licensed topology.

C0 is the low, front-facing central pelvic landmark, NEVER an inner-thigh
vertex. All feature offsets are measured from C0 in metres. This is a
technical inspection attachment, not a validated anatomical final sculpt.
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector

DATA = Path(__file__).resolve().parents[1] / "assets" / "riley-vulva1-source.json"
# From C0: X = left/right; Z = upward; forward is negative body-local Y.
# The named offsets are used BOTH for geometry and for the viewer's table.
LANDMARKS = [
    dict(id="C0", name="Central pelvic origin", x=0.000, z=0.000, relief=0.000),
    dict(id="P1", name="Pubic mound",          x=0.000, z=0.024, relief=0.003),
    dict(id="H1", name="Upper central fold",   x=0.000, z=0.008, relief=0.006),
    dict(id="L1", name="Left inner fold",      x=-0.010, z=-0.009, relief=0.011),
    dict(id="R1", name="Right inner fold",     x= 0.010, z=-0.009, relief=0.011),
    dict(id="L2", name="Left outer fold",      x=-0.022, z=-0.006, relief=0.017),
    dict(id="R2", name="Right outer fold",     x= 0.022, z=-0.006, relief=0.017),
    dict(id="B1", name="Lower central blend", x=0.000, z=-0.020, relief=0.003),
]

def make_c0_anatomy(root, body, rig):
    if body.type != "MESH" or len(body.data.vertices) < 10000:
        raise RuntimeError("C0: intact adult source body required")
    if not DATA.is_file():
        raise RuntimeError("C0: licensed MakeHuman anatomy source unavailable")
    source = json.loads(DATA.read_text())["mesh"]
    if len(source["vertices"]) != 181 or len(source["faces"]) != 168:
        raise RuntimeError("C0: anatomy donor topology changed; refit required")

    points = [v.co for v in body.data.vertices]
    h = max(p.z for p in points) - min(p.z for p in points)
    zmin = min(p.z for p in points)
    cx = (max(p.x for p in points) + min(p.x for p in points)) * 0.5
    front_y = min(p.y for p in points)
    if not 1.0 < h < 3.0:
        raise RuntimeError("C0: unrecognized body units")

    def norm(name):
        return name.lower().split(":")[-1].replace("_","").replace("-","").replace(" ","")
    hips = {g.index for g in body.vertex_groups if norm(g.name) in ("hips","pelvis")}
    legs = {g.index for g in body.vertex_groups
            if any(n in norm(g.name) for n in ("upleg","upperleg","thigh"))}
    if not hips or not legs:
        raise RuntimeError("C0: hips/upper legs unavailable; refusing blind fit")
    def weight(vertex, indices):
        return max((g.weight for g in vertex.groups if g.group in indices), default=0.)
    candidates = [v for v in body.data.vertices
                  if .485 < (v.co.z-zmin)/h < .540
                  and abs(v.co.x-cx) < .018*h
                  and weight(v,hips) >= .17
                  and weight(v,hips) >= 1.15*weight(v,legs)]
    if len(candidates) < 12:
        raise RuntimeError("C0: unable to locate a central pelvis away from thighs")

    def cast_front(x,z):
        # Ray-cast the ORIGINAL body, not its posed skeleton or a thigh offset.
        # Front is -Y in this Blender/MPFB scene.
        ok, hit, normal, face = body.ray_cast(
            Vector((x, front_y-.3*h, z)), Vector((0,1,0)), distance=2*h)
        return (hit.y,face) if ok else (None,None)

    # IMPORTANT: The old C0 search started inside the .485-.540 body-height
    # band and moved UP until it found a hip-weighted face. That put the
    # entire anatomical patch on the LOWER ABDOMEN (reported in viewer).
    #
    # Instead find the low, FRONT, CENTRAL skin surface immediately above
    # the leg fork. Raycasts must be on x=center, never on an inner thigh.
    # We probe upward from below the fork, accepting only outward-facing
    # pelvic/between-leg faces; the first verified contact is the junction.
    zs = sorted(v.co.z for v in candidates)
    old_high_anchor = zs[max(0, int(len(zs)*.14))]
    step = .0025*h
    probe_low = zmin + .405*h
    probe_high = old_high_anchor + .012*h
    center_hits = []
    for i in range(int((probe_high-probe_low)/step)+1):
        trial_z = probe_low+i*step
        hit_y, face = cast_front(cx,trial_z)
        if hit_y is None: continue
        polygon = body.data.polygons[face]
        if polygon.normal.y > -.20: continue  # not a front-facing body surface
        face_verts = [body.data.vertices[j] for j in polygon.vertices]
        hip_avg = sum(weight(v, hips) for v in face_verts)/len(face_verts)
        leg_avg = sum(weight(v, legs) for v in face_verts)/len(face_verts)
        if hip_avg >= .08 and hip_avg >= .40*leg_avg:
            center_hits.append((trial_z,hit_y,hip_avg,leg_avg))
    if not center_hits:
        raise RuntimeError("C0: cannot find front centerline at leg junction; refusing abdominal attachment")

    # A one-centimetre skin margin above the lowest verified central
    # contact keeps the base of the donor attached without lifting it
    # onto the pubic mound. Both the mesh AND the viewer marker use C0.
    first_contact = center_hits[0][0]
    c0z = first_contact + .010
    c0y, center_face = cast_front(cx,c0z)
    if c0y is None:
        c0z,c0y=center_hits[0][:2]
    if c0z >= old_high_anchor-.025:
        raise RuntimeError("C0: low-pelvis anchor still near abdomen; refusing misplaced model")
    if c0z < zmin+.40*h or c0z > zmin+.49*h:
        raise RuntimeError("C0: low-pelvis anchor outside expected leg-junction band")
    print("CAROL_C0_FOUND", "x",round(cx,4), "y",round(c0y,4),
          "z",round(c0z,4),"previous_high_z",round(old_high_anchor,4),
          "lowered_m",round(old_high_anchor-c0z,4),
          "low_centerline_hits",len(center_hits),"hip_candidates",len(candidates))

    raw_verts = [tuple(v) for v in source["vertices"]]
    faces = [tuple(f) for f in source["faces"]]
    mesh = bpy.data.meshes.new("Carol licensed C0-centered anatomy")
    mesh.from_pydata(raw_verts, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name="MakeHuman anatomy UV")
    for polygon, indices in zip(mesh.polygons, source["uv_faces"]):
        for loopidx, uvidx in zip(polygon.loop_indices, indices):
            uv.data[loopidx].uv = source["uv_coordinates"][uvidx]
    if not body.data.materials or body.data.materials[0] is None:
        raise RuntimeError("C0: unable to match Carol's real skin material")
    mesh.materials.append(body.data.materials[0])
    bm=bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=2,use_grid_fill=True)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    if len(mesh.vertices) < 1200:
        raise RuntimeError("C0: subdivision insufficient for two distinct folds")

    low=min(v[2] for v in raw_verts)
    scale=.076  # ~8.7 cm wide, 7.8 cm tall total
    # Previous build placed the ENTIRE donor from +3 mm to +81 mm ABOVE
    # the lower-pelvis C0 junction, producing the visible upper-abdomen wedge.
    # Keep C0 on the actual pelvis, but shift the donor 45 mm DOWN: its
    # lower half now extends below C0, between the upper thighs.
    down_from_high_fit_m=.045
    # The last trial moved the whole feature down but left its inferior edge
    # hanging in FRONT of the leg fork. Hinge only that lower ~3.6 cm back
    # toward the body (+Y), while bringing the tip UP (+Z). Keeping the
    # displacement monotone avoids folding mesh rows back through themselves.
    hinge_start_z=-.006      # start bending 6 mm below the C0 landmark
    hinge_end_z=-.042        # former low edge of the donor patch
    hinge_lift_m=.020        # 20 mm upward at its low edge
    hinge_tuck_m=.027        # 27 mm inward, behind the frontal surface
    def clamp01(t):
        return max(0.,min(1.,t))
    def smoothstep(t):
        t=clamp01(t)
        return t*t*(3.-2.*t)
    if 1.5*hinge_lift_m >= hinge_start_z-hinge_end_z:
        raise RuntimeError("C0: hinge would invert inferior mesh rows")
    # Avoid extrapolating a skin projection onto the thigh. Every point
    # follows the nearest front BODY surface, tapering into existing skin.
    def gauss(a,center,r):
        return math.exp(-((a-center)/r)**2)
    total_hits=0
    supported_upper=0
    upper_count=0
    for v in mesh.vertices:
        src_x,src_y,src_z = v.co.x,v.co.y,v.co.z
        # Taper broad upper attachment so its silhouette no longer forms a
        # triangular wedge above the groin; preserve natural lower fullness.
        raw_offset=.003+(src_z-low)*scale-down_from_high_fit_m
        top_narrow=clamp01((raw_offset-.013)/.024)
        hinge=smoothstep((hinge_start_z-raw_offset)/(hinge_start_z-hinge_end_z))
        x = cx+src_x*scale*(1.0-.22*top_narrow)
        # Sculpted upward/inward bend below C0; upper attachment unchanged.
        z = c0z + raw_offset + hinge_lift_m*hinge
        if z >= c0z+.010: upper_count+=1
        surface,face=cast_front(x,z)
        # Never follow the inner thigh. Below the fork a ray may hit a leg
        # behind the intended pelvic contour; use the centered pelvis surface
        # instead of skinning this attachment to that leg.
        if surface is not None and z < c0z+.010:
            polygon=body.data.polygons[face]
            face_verts=[body.data.vertices[j] for j in polygon.vertices]
            hip_avg=sum(weight(p,hips) for p in face_verts)/len(face_verts)
            leg_avg=sum(weight(p,legs) for p in face_verts)/len(face_verts)
            if polygon.normal.y > -.15 or hip_avg < .10 or hip_avg < .80*leg_avg:
                surface=None
        if surface is not None:
            total_hits+=1
            if z >= c0z+.010: supported_upper+=1
        else:
            # A below-fork CENTERLINE has no body face to raycast into.
            # Project that lower section from the nearest genuine pelvic skin
            # row, not from the front of the left/right inner thighs.
            sample_x=cx+max(-.014,min(.014,x-cx))
            surface,_=cast_front(sample_x,max(z,c0z+.004))
            if surface is None: surface=c0y
        dx,dz=x-cx,z-c0z
        # The source licensed mesh provides natural surface topology.
        # Landmark table provides symmetric, measured displacement targets.
        inner=sum(f["relief"]*gauss(dx,f["x"],.007)*gauss(dz,f["z"],.025)
                  for f in LANDMARKS if f["id"] in ("L1","R1"))
        outer=sum(f["relief"]*gauss(dx,f["x"],.012)*gauss(dz,f["z"],.027)
                  for f in LANDMARKS if f["id"] in ("L2","R2"))
        top=sum(f["relief"]*gauss(dx,f["x"],.012)*gauss(dz,f["z"],.018)
                for f in LANDMARKS if f["id"] in ("P1","H1","B1"))
        # Smoothly hide the attachment edges inside Carol's existing skin.
        lateral = max(0.,min(1.,(.045-abs(dx))/.011))
        # Fade by the ORIGINAL edge distance, not raised Z: otherwise the
        # folded tip wrongly gains full relief and becomes a dangling spike.
        bottom = clamp01((raw_offset-hinge_end_z)/.012)
        upper = max(0.,min(1.,(.037-dz)/.013))
        fade=lateral*lateral*(3-2*lateral) * bottom*bottom*(3-2*bottom) * upper*upper*(3-2*upper)
        donor=max(-.004,min(.004,(src_y+.52)*.010))
        projection=min(.034,max(0., .003+inner+outer+top+donor))
        # +Y is backward/inward for the front-facing (-Y) MPFB body.
        # This pulls the inferior end between the legs; don't create a new
        # outward hump while lifting the bottom. Rig remains 100% Hips.
        y = surface+.001 - projection*fade + hinge_tuck_m*hinge
        v.co=(x, y, z)
    # Require a real pelvic-skin attachment in the UPPER portion; the lower
    # portion is intentionally suspended at the leg junction, not on thighs.
    offsets=[v.co.z-c0z for v in mesh.vertices]
    # A 20 mm hinge lift should shorten the old 42 mm hanging edge to
    # ~22 mm below C0, without shifting C0 itself or the anchored top.
    if not -.030 < min(offsets) < -.012 or max(offsets)>.042:
        raise RuntimeError("C0: failed inferior hinge placement check")
    if not .015 <= hinge_lift_m <= .024 or hinge_tuck_m < .020:
        raise RuntimeError("C0: inferior hinge displacement out of range")
    if upper_count < 50 or supported_upper < upper_count*.60:
        raise RuntimeError("C0: insufficient upper pelvic-skin support; refusing detached patch")
    if any(f["z"]>=0 for f in LANDMARKS if f["id"] in ("L1","R1","L2","R2")):
        raise RuntimeError("C0: folds must sit BELOW the central pelvic reference")
    print("WVLRP_CAROL_LOWER_FIT", "vertical_min_mm",round(min(offsets)*1000,1),
          "vertical_max_mm",round(max(offsets)*1000,1),
          "hinge_lift_mm",round(hinge_lift_m*1000,1),
          "hinge_tuck_mm",round(hinge_tuck_m*1000,1),
          "supported_upper",supported_upper,"upper_total",upper_count)
    for poly in mesh.polygons:
        poly.use_smooth=True
    obj=bpy.data.objects.new("WVLRP Carol C0 anatomy | inspection overlay",mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent=root
    obj.matrix_world=body.matrix_world.copy()
    # Same hips bone used by the adult's actual pelvis; no weight on thighs.
    hipbone=next((bone.name for bone in rig.data.bones if norm(bone.name) in ("hips","pelvis")),None)
    if not hipbone:
        raise RuntimeError("C0: Hips rig bone unavailable")
    grp=obj.vertex_groups.new(name=hipbone)
    grp.add(list(range(len(mesh.vertices))),1.0,"REPLACE")
    obj.modifiers.new("Carol C0 follows hip rig","ARMATURE").object=rig
    obj["wvlrp_carol_c0_anatomy"]=True
    obj["wvlrp_carol_c0_local"]=list((cx,c0y-.010,c0z))
    # This metadata also powers the visible C0 viewer label and coordinate table.
    obj["wvlrp_carol_c0_table"]=json.dumps(LANDMARKS)
    body["wvlrp_carol_pelvic_contour_baked"]=True
    body["wvlrp_carol_pelvic_contour_vertices"]=len(mesh.vertices)
    print("WVLRP_CAROL_C0_ANATOMY_READY", "vertices",len(mesh.vertices),
          "surface_hits",total_hits,"landmarks",len(LANDMARKS),
          "rig_bone",hipbone,"no_thigh_weight",True)
    return obj
