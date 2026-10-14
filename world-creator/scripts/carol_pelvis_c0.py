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
    dict(id="P1", name="Pubic mound",          x=0.000, z=0.069, relief=0.006),
    dict(id="H1", name="Upper central fold",   x=0.000, z=0.053, relief=0.008),
    dict(id="L1", name="Left inner fold",      x=-0.010, z=0.036, relief=0.011),
    dict(id="R1", name="Right inner fold",     x= 0.010, z=0.036, relief=0.011),
    dict(id="L2", name="Left outer fold",      x=-0.022, z=0.039, relief=0.017),
    dict(id="R2", name="Right outer fold",     x= 0.022, z=0.039, relief=0.017),
    dict(id="B1", name="Lower central blend", x=0.000, z=0.012, relief=0.003),
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
    scale=.076  # ~8.7 cm wide, 7.8 cm tall around C0
    # Avoid extrapolating a skin projection onto the thigh. Every point
    # follows the nearest front BODY surface, tapering into existing skin.
    def gauss(a,center,r):
        return math.exp(-((a-center)/r)**2)
    total_hits=0
    skin_cache={}
    for v in mesh.vertices:
        src_x,src_y,src_z = v.co.x,v.co.y,v.co.z
        x = cx+src_x*scale
        z = c0z + .003 + (src_z-low)*scale
        surface,face=cast_front(x,z)
        if surface is not None:
            total_hits+=1
        else:
            key=round(z,4)
            if key not in skin_cache:
                skin_cache[key]=cast_front(cx,z)[0]
            surface=skin_cache[key]
        if surface is None:
            raise RuntimeError("C0: front-surface fit failed at z="+str(z))
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
        bottom = max(0.,min(1.,(dz-.002)/.012))
        upper = max(0.,min(1.,(.081-dz)/.013))
        fade=lateral*lateral*(3-2*lateral) * bottom*bottom*(3-2*bottom) * upper*upper*(3-2*upper)
        donor=max(-.004,min(.004,(src_y+.52)*.010))
        projection=min(.034,max(0., .003+inner+outer+top+donor))
        v.co=(x, surface+.001 - projection*fade, z)
    if total_hits < len(mesh.vertices)*.65:
        raise RuntimeError("C0: excessive unsupported surface; refusing detached anatomy patch")
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
