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
    dict(id="P1", name="Pubic mound",          x=0.000, z=0.022, relief=0.002),
    dict(id="H1", name="Upper central fold",   x=0.000, z=0.008, relief=0.003),
    dict(id="L1", name="Left inner fold",      x=-0.009, z=-0.009, relief=0.010),
    dict(id="R1", name="Right inner fold",     x= 0.009, z=-0.009, relief=0.010),
    dict(id="L2", name="Left outer fold",      x=-0.019, z=-0.006, relief=0.014),
    dict(id="R2", name="Right outer fold",     x= 0.019, z=-0.006, relief=0.014),
    dict(id="B1", name="Lower central blend", x=0.000, z=-0.020, relief=0.002),
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


    # A fixed, regularly sampled oval replaces the donor's irregular and
    # overlapping projected coordinates. Every row has increasing X and
    # every column increasing Z; conforming to 3D skin may change depth,
    # but must NEVER collapse X/Z into the same nearest-skin vertices.
    # Donor provenance is checked above; the contour is a new fitted mesh.
    rows, cols = 51, 43
    raw_verts, faces, texcoords = [], [], []
    for row in range(rows):
        t = row/(rows-1)
        half_width = .56*(.045+.955*math.sin(math.pi*t)**.9)  # narrow, tapered ends, not squared-off flaps
        for col in range(cols):
            u = col/(cols-1)
            px = (2*u-1)*half_width
            raw_verts.append((px,-.49,t))
            texcoords.append((.34485+.07010*u,.38134+.07932*t))
    for row in range(rows-1):
        for col in range(cols-1):
            a=row*cols+col
            faces.append((a,a+1,a+cols+1,a+cols))
    mesh = bpy.data.meshes.new("Carol C0 regular quad pelvic contour")
    mesh.from_pydata(raw_verts, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name="MakeHuman skin UV")
    for row in range(rows-1):
        for col in range(cols-1):
            p=mesh.polygons[row*(cols-1)+col]
            uvs=(texcoords[row*cols+col],texcoords[row*cols+col+1],
                 texcoords[(row+1)*cols+col+1],texcoords[(row+1)*cols+col])
            for loopidx,xy in zip(p.loop_indices,uvs):
                uv.data[loopidx].uv=xy
    if not body.data.materials or body.data.materials[0] is None:
        raise RuntimeError("C0: unable to match Carol's real skin material")
    mesh.materials.append(body.data.materials[0])
    if len(mesh.vertices)<1200:
        raise RuntimeError("C0: new continuous quad patch is too sparse")

    # Each regular grid coordinate is supported by a real pelvic skin point.
    # The 3D nearest point is used only for depth and joint weights, never for
    # X/Z coordinates, because snapping X/Z caused the screenshot's spikes.
    low=min(v[2] for v in raw_verts)
    # A compact skin inset. Separate horizontal/vertical scales prevent the
    # lower rim from dropping into empty space between the thighs.
    x_scale=.050
    z_scale=.042
    positions=[v.co.copy() for v in body.data.vertices]
    # The old weight filter excluded ALL polygons below z=.777m
    # even though C0 is z=.744m, so the nearest-point snap lifted
    # the entire lower patch about seven centimetres. Keep center
    # pelvic and adjacent upper-leg transition faces for SURFACE support.
    # Their rig weights are not copied wholesale: the overlay remains
    # predominantly Hips-skinned toward its contour center.
    pelvic_faces=[]
    for poly in body.data.polygons:
        if abs(poly.center.x-cx)>.075*h:
            continue
        if not zmin+.390*h < poly.center.z < zmin+.550*h:
            continue
        if poly.normal.y >= .18 and poly.normal.z >= .15:
            continue
        support=[body.data.vertices[j] for j in poly.vertices]
        hip_avg=sum(weight(p,hips) for p in support)/len(support)
        leg_avg=sum(weight(p,legs) for p in support)/len(support)
        if hip_avg>=.025 or leg_avg>=.08:
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
    edge_dist=[min(math.hypot((p.x-b.x)*x_scale,(p.z-b.z)*z_scale)
                   for b in boundary) for p in raw_positions]
    # Donor is small and irregular. A fixed 13 mm seam fade can erase the
    # ENTIRE profile if the mesh's inradius is smaller. Adapt the fade to
    # the actual licensed topology, leaving a guaranteed interior core.
    rim_span=max(edge_dist)
    if rim_span < .001:
        raise RuntimeError("C0: donor surface has no interior for a flush seam")
    rim_width=max(.0015,min(.009,rim_span*.42))

    def clamp01(t):
        return max(0.,min(1.,t))
    def smoothstep(t):
        t=clamp01(t)
        return t*t*(3.-2.*t)
    def gauss(a,center,r):
        return math.exp(-((a-center)/r)**2)

    # At the rim, copy nearby BODY deformation weights to prevent seams when
    # the legs bend. Toward the sculpt center blend smoothly to Hips; this is
    # still ONE pelvis-centered patch, never a left/right-thigh attachment.
    rig_bones={bone.name for bone in rig.data.bones}
    hipbone=next((bone.name for bone in rig.data.bones
                  if norm(bone.name) in ("hips","pelvis")),None)
    if not hipbone:
        raise RuntimeError("C0: Hips rig bone unavailable")
    transferred_skin=[]
    max_boundary_gap=0.
    worst_rim=None
    sampled_midline=[]
    max_support_distance=0.
    center_relief=0.
    max_depth_correction=0.
    planar_support_max=0.
    upper_count=0
    supported_upper=0
    total_hits=0
    direct_front_hits=0
    fallback_support_hits=0
    for i,v in enumerate(mesh.vertices):
        src_x,src_y,src_z=raw_positions[i]
        # A continuous, strictly monotone roll from anterior to inferior.
        # This is only a SEARCH position; actual vertices are snapped to the
        # original pelvic skin, including its underside, before adding detail.
        raw_offset=.006+(src_z-low)*z_scale-.021
        roll=smoothstep((.008-raw_offset)/.040)
        x=cx+src_x*x_scale*(1.-.10*smoothstep((raw_offset-.010)/.022))
        z=c0z+raw_offset+.002*roll
        # The original nearest-triangle BVH OMITTED the real central groin
        # surface at C0: old logs reported a 47.6 mm gap despite a valid
        # front-ray contact there. Prefer a physically intersected front skin
        # triangle; only use 3D nearest support when the front ray is absent.
        query=Vector((x,c0y,z))
        front_hit_y,front_face=cast_front(x,z)
        front_is_skin=(front_hit_y is not None and front_face is not None
                       and body.data.polygons[front_face].normal.y < -.15
                       and abs(front_hit_y-c0y)<.065)
        if front_is_skin:
            nearest=Vector((x,front_hit_y,z))
            normal=body.data.polygons[front_face].normal
            distance=(nearest-query).length
            poly_ids=tuple(body.data.polygons[front_face].vertices)
            direct_front_hits+=1
        else:
            nearest,normal,face,distance=skin_bvh.find_nearest(query)
            if nearest is None or normal.length < .1 or face is None:
                raise RuntimeError("C0: no real pelvis contact for donor vertex")
            if not 0<=face<len(pelvic_faces):
                raise RuntimeError("C0: BVH face mapping unavailable")
            poly_ids=pelvic_faces[face]
            fallback_support_hits+=1
        proximity=[1./max(1.e-8,(positions[j]-nearest).length_squared)
                   for j in poly_ids]
        proximity_total=sum(proximity)
        nearby={}
        for source_idx,proximity_weight in zip(poly_ids,proximity):
            for channel in body.data.vertices[source_idx].groups:
                group_name=body.vertex_groups[channel.group].name
                if group_name in rig_bones:
                    nearby[group_name]=nearby.get(group_name,0.) + channel.weight*proximity_weight/proximity_total
        weight_sum=sum(nearby.values())
        if weight_sum<.01:
            nearby={hipbone:1.}
        else:
            nearby={name:weight/weight_sum for name,weight in nearby.items()}
        pelvis_center_blend=smoothstep(edge_dist[i]/.016)
        fit_weights={name:weight*(1.-pelvis_center_blend)
                     for name,weight in nearby.items()}
        fit_weights[hipbone]=fit_weights.get(hipbone,0.)+pelvis_center_blend
        transferred_skin.append(fit_weights)
        # A vertex may travel a little along the body as the front rolls
        # underneath, but it must never be supported by an imaginary plane.
        planar_support=math.hypot(nearest.x-x,nearest.z-z)
        planar_support_max=max(planar_support_max,planar_support)
        # A big nearest-face distance at the rim creates a suspended
        # independent oval. Fail the build instead of publishing it.
        if distance>.052 or (edge_dist[i]<.004 and planar_support>.030):
            raise RuntimeError("C0: detached patch; skin support missing at "+str((i//cols,i%cols,round(distance,4))))
        max_support_distance=max(max_support_distance,distance)
        total_hits+=1
        if z>=c0z+.010:
            upper_count+=1
            front,frontface=cast_front(x,z)
            if front is not None and abs(nearest.y-front)<.030:
                supported_upper+=1
        # Symmetric outward relief follows the local BODY normal rather
        # than world -Y, which would peel the inferior edge off in kneeling.
        # The nearest 3D body point may lie beneath the pelvic rim. Its
        # coordinates are a SUPPORT contact, not a stable sculpt UV: using
        # them for the profile makes the entire detail disappear or spike.
        # Keep the continuous donor X/Z parametrization for the relief.
        dx=x-cx
        dz=raw_offset
        inner=sum(f["relief"]*gauss(dx,f["x"],.009)*gauss(dz,f["z"],.027)
                  for f in LANDMARKS if f["id"] in ("L1","R1"))
        outer=sum(f["relief"]*gauss(dx,f["x"],.014)*gauss(dz,f["z"],.029)
                  for f in LANDMARKS if f["id"] in ("L2","R2"))
        top=sum(f["relief"]*gauss(dx,f["x"],.012)*gauss(dz,f["z"],.018)
                for f in LANDMARKS if f["id"] in ("P1","H1","B1"))
        donor=max(-.005,min(.007,(-src_y-.49)*x_scale*.16))
        # Zero detail on ALL mesh perimeter edges. Pull the perimeter onto
        # Carol's existing surface, preventing visible folded-paper flaps.
        rim_fade=smoothstep(edge_dist[i]/rim_width)
        lower_fade=smoothstep((raw_offset+.017)/.010)
        upper_fade=smoothstep((.027-raw_offset)/.008)
        fade=rim_fade*lower_fade*upper_fade
        # Two independent nested folds on each side, separated by a soft
        # depression. Without these valley terms the Gaussian peaks blended
        # into the single blocky lobe reported in the viewer.
        valley=.0036*gauss(abs(dx),.015,.0042)*gauss(dz,-.008,.024)
        center_groove=.003*gauss(dx,0.,.004)*gauss(dz,-.009,.023)
        # Keep two softly separated outer/inner contours; never cap them
        # into the broad sphere-like mass seen in the inspection shots.
        relief=max(0.,min(.010,.0008+.62*inner+.70*outer+.65*top+.15*donor-.75*valley-.75*center_groove))*fade
        center_relief=max(center_relief,relief)
        # The earlier full conformal snap recessed the center into the groin
        # crease. Preserve the conformal BODY contact and all fitted rig
        # weights, but restore a shallow anterior projection inside the patch.
        # Forward is -Y; this is NOT a vertical move back onto the abdomen.
        # Both corrections decay completely at the donor's attachment rim,
        # which must stay flush during bent-leg animation.
        interior_fade=rim_fade*lower_fade*upper_fade
        # The old 14 mm blanket lift PLUS the old 34 mm ridge built a bulb.
        # Keep only a few millimetres of clearance and let the real skin
        # surface dictate the attachment silhouette.
        anterior_lift=(.0018-.0004*roll)*interior_fade
        normal_lift=.0005*interior_fade
        max_depth_correction=max(max_depth_correction,anterior_lift)
        # Preserve the *ordered* regular X/Z parameterization. Projecting
        # all three dimensions to unrelated closest vertices had folded
        # quads back over one another, creating the visible angular shards.
        # Offset anterior (-Y) with a smooth taper at the true mesh rim.
        v.co=Vector((x,nearest.y-(relief+normal_lift)*.82-anterior_lift-.0002,z))
        if i%cols==cols//2 and (i//cols)%5==0:
            sampled_midline.append((i//cols,round(x,4),round(z,4),tuple(round(t,4) for t in nearest),round(distance,4)))
        if edge_dist[i]<.0005:
            gap=(v.co-nearest).length
            if gap>max_boundary_gap:
                max_boundary_gap=gap
                worst_rim=(i//cols,i%cols,round(x,4),round(z,4),
                           tuple(round(t,4) for t in nearest),round(distance,4))
    # Raw nearest triangles may switch abruptly between groin and thigh,
    # making sawtooth folds. Smooth only the INTERIOR depth field; the real
    # skin-matched edge remains unchanged so its seam stays registered.
    smoothed_y=[v.co.y for v in mesh.vertices]
    for _ in range(8):
        updated_y=smoothed_y.copy()
        for row in range(1,rows-1):
            for col in range(1,cols-1):
                j=row*cols+col
                neighbor=(smoothed_y[j-1]+smoothed_y[j+1]
                          +smoothed_y[j-cols]+smoothed_y[j+cols])*.25
                blend=.48*smoothstep(edge_dist[j]/.009)
                updated_y[j]=smoothed_y[j]*(1.-blend)+neighbor*blend
        smoothed_y=updated_y
    for j,v in enumerate(mesh.vertices):
        v.co.y=smoothed_y[j]
    # Reject any paper-petal / depth jump before glTF export.
    max_y_step=0.
    for row in range(rows):
        for col in range(cols):
            j=row*cols+col
            if col+1<cols:
                max_y_step=max(max_y_step,abs(smoothed_y[j]-smoothed_y[j+1]))
            if row+1<rows:
                max_y_step=max(max_y_step,abs(smoothed_y[j]-smoothed_y[j+cols]))
    if max_y_step>.030:
        raise RuntimeError("C0: discontinuous depth / petal mesh: "+str(round(max_y_step,4)))
    mesh.update()
    offsets=[v.co.z-c0z for v in mesh.vertices]
    # Test that no regular-grid faces have folded in their X/Z mapping.
    # This catches the original severe self-intersection, which earlier
    # build checks missed even though the GLB exported successfully.
    inverted=0
    min_cell=1.e9
    for poly in mesh.polygons:
        q=[mesh.vertices[k].co for k in poly.vertices]
        area=sum(q[k].x*q[(k+1)%len(q)].z-q[(k+1)%len(q)].x*q[k].z
                 for k in range(len(q)))*.5
        if area<=0:
            inverted+=1
        min_cell=min(min_cell,abs(area))
    if inverted:
        raise RuntimeError("C0: projected patch has folded or inverted quads: "+str(inverted))
    print("WVLRP_CAROL_C0_RIM_DIAG",worst_rim,
          "midline",sampled_midline)
    if max_boundary_gap>.032:
        raise RuntimeError("C0: patch rim is unsupported by pelvis: "+str(round(max_boundary_gap,4)))
    print("WVLRP_CAROL_C0_GRID_QA","quads",len(mesh.polygons),
          "inverted",inverted,"min_projected_area",round(min_cell,8),
          "boundary_distance_mm",round(max_boundary_gap*1000,2))
    print("WVLRP_CAROL_C0_PROFILE_DIAGNOSTICS",
          "rim_span_mm",round(rim_span*1000,2),
          "rim_width_mm",round(rim_width*1000,2),
          "peak_relief_mm",round(center_relief*1000,2),
          "max_anterior_lift_mm",round(max_depth_correction*1000,2),
          "body_support_mm",round(max_support_distance*1000,2),
          "planar_support_mm",round(planar_support_max*1000,2),
          "max_neighbor_depth_jump_mm",round(max_y_step*1000,2),
          "direct_front_contacts",direct_front_hits,
          "nearest_fallback_contacts",fallback_support_hits,
          "upper_sample",upper_count,"upper_supported",supported_upper)
    if center_relief<.005:
        raise RuntimeError("C0: contour flattened during skin conformity")
    if max_depth_correction<.002:
        raise RuntimeError("C0: inward-depth correction missed central donor profile")
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
    # Seal the open surface with an extremely shallow skin-facing layer;
    # the previous 7.5 mm duplicate shell was exposed from behind and
    # looked like a separate puffy pouch with angular sidewalls.
    # This avoids a paper-thin edge without changing the established front
    # quad parameterization, armature or body skin material.
    front_count=len(mesh.vertices)
    front_positions=[v.co.copy() for v in mesh.vertices]
    front_faces=[tuple(p.vertices) for p in mesh.polygons]
    back_positions=[p+Vector((0.,.0015,0.)) for p in front_positions]
    outline=(list(range(cols))
            +[r*cols+cols-1 for r in range(1,rows)]
            +[(rows-1)*cols+c for c in range(cols-2,-1,-1)]
            +[r*cols for r in range(rows-2,0,-1)])
    reverse_faces=[tuple(front_count+k for k in reversed(f)) for f in front_faces]
    rim_faces=[]
    for i,k in enumerate(outline):
        nxt=outline[(i+1)%len(outline)]
        rim_faces.append((k,front_count+k,front_count+nxt,nxt))
    full_faces=front_faces+reverse_faces+rim_faces
    sealed=bpy.data.meshes.new("Carol C0 smooth sealed anatomy volume")
    sealed.from_pydata([tuple(p) for p in front_positions+back_positions],[],full_faces)
    sealed.update()
    sealed.materials.append(body.data.materials[0])
    skin_uv=sealed.uv_layers.new(name="MakeHuman skin UV")
    for poly in sealed.polygons:
        for li in poly.loop_indices:
            idx=sealed.loops[li].vertex_index%front_count
            skin_uv.data[li].uv=texcoords[idx]
        poly.use_smooth=True
    check=bmesh.new()
    check.from_mesh(sealed)
    open_edges=sum(1 for edge in check.edges if edge.is_boundary)
    check.free()
    if open_edges:
        raise RuntimeError("C0: unsealed boundary on anatomical volume: "+str(open_edges))
    mesh=sealed
    transferred_skin.extend([dict(weights) for weights in transferred_skin])
    print("WVLRP_CAROL_C0_VOLUME_QA","vertices",len(mesh.vertices),
          "faces",len(mesh.polygons),"unsealed_edges",open_edges,
          "inner_outer_valleys",True,"wall_depth_mm",1.5)
    obj=bpy.data.objects.new("WVLRP Carol C0 anatomy | inspection overlay",mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent=root
    obj.matrix_world=body.matrix_world.copy()
    # Match Carol's existing body's deformation at the PERIMETER in elbow/
    # knee poses. Hips becomes dominant inside; no independently leg-rigged
    # halves. This is what fixed rigid-Hips skinning couldn't guarantee.
    groups={}
    for vertex_index,row in enumerate(transferred_skin):
        for joint_name,joint_weight in row.items():
            if joint_weight<.0001:
                continue
            if joint_name not in groups:
                groups[joint_name]=obj.vertex_groups.new(name=joint_name)
            groups[joint_name].add([vertex_index],joint_weight,"REPLACE")
    obj.modifiers.new("Carol C0 follows hip rig","ARMATURE").object=rig
    obj["wvlrp_carol_c0_anatomy"]=True
    obj["wvlrp_carol_c0_local"]=list((cx,c0y-.010,c0z))
    # This metadata also powers the visible C0 viewer label and coordinate table.
    obj["wvlrp_carol_c0_table"]=json.dumps(LANDMARKS)
    body["wvlrp_carol_pelvic_contour_baked"]=True
    body["wvlrp_carol_pelvic_contour_vertices"]=len(mesh.vertices)
    print("WVLRP_CAROL_C0_ANATOMY_READY", "vertices",len(mesh.vertices),
          "surface_hits",total_hits,"landmarks",len(LANDMARKS),
          "rig_bone",hipbone,"perimeter_weights_follow_body",True,
          "rig_groups",len(groups))
    return obj
