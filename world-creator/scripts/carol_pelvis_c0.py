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
from mathutils.bvhtree import BVHTree

DATA = Path(__file__).resolve().parents[1] / "assets" / "riley-vulva1-source.json"
# From C0: X = left/right; Z = upward; forward is negative body-local Y.
# The named offsets are used BOTH for geometry and for the viewer's table.
LANDMARKS = [
    dict(id="C0", name="Central pelvic origin", x=0.000, z=0.000, relief=0.000),
    dict(id="P1", name="Pubic mound",          x=0.000, z=0.024, relief=0.003),
    dict(id="H1", name="Upper central fold",   x=0.000, z=0.008, relief=0.006),
    dict(id="L1", name="Left inner fold",      x=-0.010, z=-0.009, relief=0.017),
    dict(id="R1", name="Right inner fold",     x= 0.010, z=-0.009, relief=0.017),
    dict(id="L2", name="Left outer fold",      x=-0.022, z=-0.006, relief=0.025),
    dict(id="R2", name="Right outer fold",     x= 0.022, z=-0.006, relief=0.025),
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

    # Fit the real source topology to Carol's OWN pelvic skin. The previous
    # method used a fixed +Y hinge and a guessed below-fork surface when no
    # raycast hit; this left a suspended paper-like flap in front and on the
    # elbows-and-knees pose. Never extend skin into unoccupied space.
    low=min(v[2] for v in raw_verts)
    scale=.076
    positions=[v.co.copy() for v in body.data.vertices]
    # Exclude leg-only faces. An inferior pelvic face often points DOWN, not
    # forward; keep these for the wrap underneath the crotch.
    pelvic_faces=[]
    for poly in body.data.polygons:
        if abs(poly.center.x-cx)>.100*h:
            continue
        if not zmin+.390*h < poly.center.z < zmin+.550*h:
            continue
        if poly.normal.y >= -.06 and poly.normal.z >= -.18:
            continue
        support=[body.data.vertices[j] for j in poly.vertices]
        hip_avg=sum(weight(p,hips) for p in support)/len(support)
        leg_avg=sum(weight(p,legs) for p in support)/len(support)
        if hip_avg>=.075 and hip_avg>=.40*leg_avg:
            pelvic_faces.append(tuple(poly.vertices))
    if len(pelvic_faces)<12:
        raise RuntimeError("C0: insufficient hip-attached pelvic surface for conformal fit")
    skin_bvh=BVHTree.FromPolygons(positions,pelvic_faces,all_triangles=False)

    # Fade on the ACTUAL donor mesh boundary, not on an arbitrary X/Z box.
    # The older rectangular taper left diagonal / folded donor edges exposed.
    bm=bmesh.new()
    bm.from_mesh(mesh)
    boundary=[vert.co.copy() for vert in bm.verts
              if any(edge.is_boundary for edge in vert.link_edges)]
    bm.free()
    if len(boundary)<4:
        raise RuntimeError("C0: licensed donor needs an open attachment rim")
    raw_positions=[v.co.copy() for v in mesh.vertices]
    edge_dist=[min((p-b).length for b in boundary)*scale
               for p in raw_positions]

    def clamp01(t):
        return max(0.,min(1.,t))
    def smoothstep(t):
        t=clamp01(t)
        return t*t*(3.-2.*t)
    def gauss(a,center,r):
        return math.exp(-((a-center)/r)**2)

    max_boundary_gap=0.
    max_support_distance=0.
    center_relief=0.
    upper_count=0
    supported_upper=0
    total_hits=0
    for i,v in enumerate(mesh.vertices):
        src_x,src_y,src_z=raw_positions[i]
        # A continuous, strictly monotone roll from anterior to inferior.
        # This is only a SEARCH position; actual vertices are snapped to the
        # original pelvic skin, including its underside, before adding detail.
        raw_offset=.003+(src_z-low)*scale-.045
        roll=smoothstep((.010-raw_offset)/.055)
        x=cx+src_x*scale*(1.-.12*smoothstep((raw_offset-.013)/.024))
        z=c0z+raw_offset+.023*roll
        nearest,normal,face,distance=skin_bvh.find_nearest(Vector((x,c0y,z)))
        if nearest is None or normal.length < .1:
            raise RuntimeError("C0: no real pelvis contact for donor vertex")
        # A vertex may travel a little along the body as the front rolls
        # underneath, but it must never be supported by an imaginary plane.
        if distance>.082*h:
            raise RuntimeError("C0: donor too far from genuine pelvic skin")
        max_support_distance=max(max_support_distance,distance)
        total_hits+=1
        if z>=c0z+.010:
            upper_count+=1
            front,frontface=cast_front(x,z)
            if front is not None and abs(nearest.y-front)<.030:
                supported_upper+=1
        # Symmetric outward relief follows the local BODY normal rather
        # than world -Y, which would peel the inferior edge off in kneeling.
        dx=nearest.x-cx
        dz=nearest.z-c0z
        inner=sum(f["relief"]*gauss(dx,f["x"],.009)*gauss(dz,f["z"],.027)
                  for f in LANDMARKS if f["id"] in ("L1","R1"))
        outer=sum(f["relief"]*gauss(dx,f["x"],.014)*gauss(dz,f["z"],.029)
                  for f in LANDMARKS if f["id"] in ("L2","R2"))
        top=sum(f["relief"]*gauss(dx,f["x"],.012)*gauss(dz,f["z"],.018)
                for f in LANDMARKS if f["id"] in ("P1","H1","B1"))
        donor=max(-.005,min(.007,(-src_y-.49)*scale*.24))
        # Zero detail on ALL mesh perimeter edges. Pull the perimeter onto
        # Carol's existing surface, preventing visible folded-paper flaps.
        rim_fade=smoothstep(edge_dist[i]/.013)
        lower_fade=smoothstep((raw_offset+.042)/.014)
        upper_fade=smoothstep((.036-raw_offset)/.012)
        fade=rim_fade*lower_fade*upper_fade
        relief=max(0.,min(.034,.002+inner+outer+top+donor))*fade
        center_relief=max(center_relief,relief)
        # 0.4 mm stand-off avoids texture z-fighting. At the rim this is
        # sub-millimetre, effectively flush with the native body.
        v.co=nearest+normal.normalized()*(relief+.0004)
        if edge_dist[i]<.0005:
            max_boundary_gap=max(max_boundary_gap,(v.co-nearest).length)
    mesh.update()
    offsets=[v.co.z-c0z for v in mesh.vertices]
    if max_boundary_gap>.002:
        raise RuntimeError("C0: attachment boundary not flush with pelvis")
    if center_relief<.012:
        raise RuntimeError("C0: contour flattened during skin conformity")
    if upper_count<50 or supported_upper<upper_count*.40:
        raise RuntimeError("C0: upper attachment cannot be verified on torso")
    if not -.055<min(offsets)<.020 or not -.010<max(offsets)<.085:
        raise RuntimeError("C0: abnormal vertical position after conformal fit")
    if any(f["z"]>=0 for f in LANDMARKS if f["id"] in ("L1","R1","L2","R2")):
        raise RuntimeError("C0: lower contour landmarks above pelvic origin")
    print("WVLRP_CAROL_LOWER_FIT",
          "surface_following",True,
          "edge_gap_mm",round(max_boundary_gap*1000,2),
          "relief_mm",round(center_relief*1000,1),
          "max_support_distance_mm",round(max_support_distance*1000,1),
          "vertical_min_mm",round(min(offsets)*1000,1),
          "vertical_max_mm",round(max(offsets)*1000,1),
          "supported_upper",supported_upper,"upper_total",upper_count,
          "pelvic_surface_faces",len(pelvic_faces))
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
