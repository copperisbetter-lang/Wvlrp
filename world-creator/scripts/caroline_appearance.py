"""Adult Caroline Ingalls reference-body proportions and Season 3 updo.
Applied to her own MPFB copy, never Jenny's or another actor's model.
The preview hairstyle is procedural trial art, NOT a certified likeness.
"""
import bpy, math
from mathutils import Vector

def reshape_adult_body(body):
    """Reduce Carol's prominent posterior *in the actual exported mesh*.

    Use a soft bilateral deformation that leaves hip joints and upper thighs
    alone. MPFB export copies can retain source shape keys, so the same delta
    must be written into Basis and existing targets or the viewer can restore
    the old oversized silhouette.
    """
    if not body or body.type != "MESH" or len(body.data.vertices) < 10000:
        raise RuntimeError("Carol posterior: continuous basemesh not available")
    verts = body.data.vertices
    xmin = min(v.co.x for v in verts); xmax = max(v.co.x for v in verts)
    ymin = min(v.co.y for v in verts); ymax = max(v.co.y for v in verts)
    zmin = min(v.co.z for v in verts); zmax = max(v.co.z for v in verts)
    h = zmax - zmin
    if not 1.0 < h < 3.0:
        raise RuntimeError("Carol posterior: invalid human stature")
    cx, cy = (xmin+xmax)*.5, (ymin+ymax)*.5
    old_keys = list(body.data.shape_keys.key_blocks) if body.data.shape_keys else []
    changed, peak = 0, 0.0
    for i,v in enumerate(verts):
        p = v.co
        nx = abs((p.x-cx)/h)
        nz = (p.z-zmin)/h
        # Rear half only (MakeHuman faces Blender -Y).
        rear = max(0.0,min(1.0,(p.y-cy)/(.070*h)))
        rear = rear*rear*(3-2*rear)
        cheek = math.exp(-((nx-.069)/.064)**2)
        glute = math.exp(-((nz-.523)/.079)**2)
        upper = math.exp(-((nz-.568)/.057)**2)
        # Negative is inward: approximately 2-4 cm less rear projection.
        # Prior "reduced" pass instead ADDED volume here.
        inward = h*(.0195*glute*cheek+.0045*upper*cheek)*rear
        narrow = (p.x-cx)*(-.0095*glute*rear)
        displacement = Vector((narrow,-inward,0.0))
        if displacement.length < .00005*h:
            continue
        if old_keys:
            for kb in old_keys:
                kb.data[i].co += displacement
        else:
            v.co += displacement
        changed += 1
        peak = max(peak, displacement.length)
    if changed < 250:
        raise RuntimeError("Carol posterior: reduction missed target surface")
    body.data.update()
    body["wvlrp_carol_posterior_reduction_baked"] = True
    print("WVLRP_CAROLINE_GLUTE_SCULPT",changed,"height",round(h,3),
          "max_reduction_mm",round(peak*1000,2),
          "profile","toned-natural-v4-INWARD")

def add_caroline_adult_pelvic_morph(body):
    """Reversible, covered external anatomy contour on Carol's OWN adult body.

    No donor mesh, no detached overlay, no rig edits. The neutral contour
    must be PRESENT IN THE BASE MESH: a GLB renderer must not have to turn on
    a shape key to display it. An optional rollback key keeps it reversible.
    Preserve UVs, rig weights, and the garment attachment coordinates.
    Inspect clothing penetration and deformation before approving.
    """
    if body.type != "MESH" or len(body.data.vertices) < 10000:
        raise RuntimeError("Carol adult anatomy: original body basemesh is missing")
    verts = body.data.vertices
    lo = min(v.co.z for v in verts)
    hi = max(v.co.z for v in verts)
    h = hi - lo
    if not 1.0 < h < 3.0:
        raise RuntimeError("Carol adult anatomy: invalid adult body scale")
    cx = (min(v.co.x for v in verts) + max(v.co.x for v in verts)) * .5

    # The MakeHuman model faces -Y. Identify its existing anterior pelvis,
    # rather than selecting the posterior surface or changing the thighs.
    anterior = sorted(v.co.y for v in verts
        if lo + .445*h < v.co.z < lo + .545*h
        and abs(v.co.x - cx) < .065*h)
    if len(anterior) < 35:
        raise RuntimeError("Carol adult anatomy: pelvic surface insufficient")
    front_ref = anterior[max(0, int(len(anterior)*.31))]
    # Store original coordinates so the Blender source remains reversible.
    # First sculpt the actual base mesh, rather than relying on a GLB viewer
    # to honor nonzero default morph weights (the previous preview did not).
    original = [v.co.copy() for v in verts]
    # MPFB's source body can already contain MakeHuman shape keys. Apply the
    # same additive displacement to Basis AND EVERY existing target so each
    # expression keeps its original delta and no shape key cancels the sculpt.
    existing_keys = list(body.data.shape_keys.key_blocks) if body.data.shape_keys else []
    original_basis = ([kb.co.copy() for kb in existing_keys[0].data]
                      if existing_keys else original)

    def gaussian(value, center, radius):
        return math.exp(-((value-center)/radius)**2)

    def smoothstep(value):
        value = max(0.0, min(1.0, value))
        return value*value*(3.0-2.0*value)

    # Carol central adult pelvic contour v7. The previous bilateral peaks
    # were centered 0.020 * body height from the axis (about 34 mm each
    # way on a 1.7 m body), landing on the inner thigh surfaces. Keep
    # the visible volume closer to the center, give it a longer rounded
    # vertical profile, and fade before the upper thigh geometry begins.
    # Geometry stays integral to the original continuous body mesh.
    PELVIC_VISIBILITY_TEST_SCALE = 1.75
    target_y = [0.0] * len(verts)
    for i, vertex in enumerate(verts):
        p = vertex.co
        nz = (p.z-lo)/h
        ax = abs((p.x-cx)/h)
        # The old 0.405-0.562 height range sculpted far down both legs.
        # The narrower, raised region includes central lower pelvis only.
        if not (.445 < nz < .538) or ax >= .043:
            continue

        height_fade = smoothstep((nz-.445)/.017) * smoothstep((.538-nz)/.020)
        side_fade = smoothstep((.043-ax)/.015)
        ahead = (front_ref + .035*h - p.y)/(.067*h)
        front_weight = smoothstep(ahead)
        if front_weight < .015:
            continue

        # Paired peaks about 14.5 mm from the axis at 1.7 m, not 34 mm.
        # Distinct rounded contours, softened central depression and
        # an upper transition over the pubis, all on the existing skin.
        pubis = gaussian(ax, .0, .031)*gaussian(nz, .511, .032)
        outer = gaussian(ax, .0085, .011)*gaussian(nz, .487, .033)
        central_cleft = gaussian(ax, .0, .0045)*gaussian(nz, .477, .032)
        low_fold = gaussian(ax, .009, .011)*gaussian(nz, .471, .028)

        projection = PELVIC_VISIBILITY_TEST_SCALE * (
            .0054*pubis + .0150*outer + .0090*low_fold
            - .0035*central_cleft)
        projection *= front_weight*side_fade*height_fade
        # Larger yet smoothly bounded volume; no downward Z pulling.
        projection = min(.041, max(0.0, projection))
        target_y[i] = -h*projection

    # Smooth the actual displacement over the existing quad topology.
    # Unlike scaling selected vertices downward, this creates no isolated
    # sharp tips; it also preserves the mesh's skinning and UV coordinates.
    neighbors = [[] for _ in verts]
    for edge in body.data.edges:
        a, b = edge.vertices
        neighbors[a].append(b)
        neighbors[b].append(a)
    for _ in range(2):
        target_y = [
            .68*value + .32*(sum(target_y[j] for j in neighbors[i]) /
                                 len(neighbors[i]) if neighbors[i] else value)
            for i, value in enumerate(target_y)
        ]

    moved = 0
    max_shift = 0.0
    for i, dy in enumerate(target_y):
        shift = abs(dy)
        if shift < .00015*h:
            continue
        # Y-only projection: prohibit the long Z-down spikes from the ×40
        # diagnostic while leaving the legs, skeleton and posture untouched.
        displacement = Vector((0.0, dy, 0.0))
        if existing_keys:
            for key_block in existing_keys:
                key_block.data[i].co += displacement
        else:
            verts[i].co += displacement
        moved += 1
        max_shift = max(max_shift, shift)
    if moved < 75:
        raise RuntimeError("Carol adult anatomy: inadequate sculpt vertices")
    body.data.update()
    if not body.data.shape_keys:
        body.shape_key_add(name="Basis", from_mix=False)
    key = body.shape_key_add(name="Carol pelvic contour OFF - inspection rollback", from_mix=False)
    for i, old in enumerate(original_basis):
        key.data[i].co = old
    key.value = 0.0  # Render the actual sculpted base by default.
    body["wvlrp_carol_pelvic_contour_baked"] = True
    body["wvlrp_carol_pelvic_contour_vertices"] = moved
    print("WVLRP_CAROLINE_ANATOMY_MORPH_SUCCESS",
          "baked_into_base", True, "rollback_key", key.name,
          "vertices", moved, "max_displacement_mm", round(max_shift*1000,2),
          "visibility_test_scale", PELVIC_VISIBILITY_TEST_SCALE,
          "external_under_clothing", True,
          "curve", "smoothed-y-only-no-downward-spikes")
    return key

def add_period_updo(export_root, body, rig):
    """Build a fitted, rounded swept-back period hairdo with low nape chignon.

    Avoid a flat disc/helmet scalp (shown in Carolyn's mobile screenshot).
    The actual eye line anchors forehead clearance. This is a trial hairstyle,
    not a screen-accurate hand-sculpted likeness of Karen Grassle.
    """
    members = [export_root] + list(export_root.children_recursive)
    eyes = [o for o in members if o.type == "MESH" and
            ("high-poly" in o.name.lower() or
             ("eye" in o.name.lower() and not any(w in o.name.lower() for w in
              ("eyebrow", "eyelash", "hair", "eyelid", "iris"))))]
    eye_pts = [o.matrix_world @ v.co for o in eyes for v in o.data.vertices]
    if len(eye_pts) < 28:
        raise RuntimeError("Caroline hair: missing eyes; cannot fit to head")

    eye_z = sum(p.z for p in eye_pts) / len(eye_pts)
    cx = sum(p.x for p in eye_pts) / len(eye_pts)
    ey = sum(p.y for p in eye_pts) / len(eye_pts)
    body_pts = [body.matrix_world @ v.co for v in body.data.vertices]
    h = max(p.z for p in body_pts) - min(p.z for p in body_pts)
    if not (1 < h < 3):
        raise RuntimeError("Caroline hair: invalid human stature")

    # The eyes are in front of the skull. Body front is local -Y.
    # The previous cap used rx=.071*h, ry=.069*h with an extremely
    # shallow .036*h rise. That created the hovering parasol in the photo.
    cy = ey + .039*h
    rx, ry = .054*h, .055*h
    crown_z = eye_z + .081*h
    sides = 64
    rows = 24
    head_bone = next((b.name for b in rig.data.bones
                      if b.name.lower().split(":")[-1] == "head"), None)
    if not head_bone:
        raise RuntimeError("Caroline period hair requires head rig bone")

    def surface(az, theta, shell=0):
        # Higher forehead hairline; sides cover the temples, rear reaches
        # nape. No curtain crosses the eyes or mouth.
        towards_front = (1-math.sin(az))/2
        towards_back = 1-towards_front
        edge = eye_z + h*(.010 + .025*towards_front-.019*towards_back)
        curve = math.sin(theta)
        soft_volume = 1 + .009*math.cos(7*az+3*theta)
        r = curve*soft_volume + shell
        return (cx+rx*r*math.cos(az),
                cy+ry*r*math.sin(az),
                edge+(crown_z-edge)*max(0,math.cos(theta))**.9+
                shell*.018*h)

    front_edge = surface(-math.pi/2, math.pi/2)[2]
    back_edge = surface(math.pi/2, math.pi/2)[2]
    if crown_z-front_edge < .035*h or crown_z-back_edge < .055*h:
        raise RuntimeError("Caroline hair became a flat plate again")
    if front_edge <= eye_z+.027*h:
        raise RuntimeError("Caroline hairline crosses eye level")

    verts,faces,material_ids = [],[],[]
    def point(p):
        verts.append(tuple(p))
        return len(verts)-1
    def polygon(indices, mat=0):
        faces.append(tuple(indices))
        material_ids.append(mat)

    # Sculpted volumetric scalp dome, not a flattened ring/saucer.
    rings = []
    for j in range(rows):
        theta = .002 + (math.pi/2-.002)*j/(rows-1)
        ring = [point(surface(2*math.pi*i/sides,theta))
                for i in range(sides)]
        if rings:
            prev = rings[-1]
            for k in range(sides):
                nxt = (k+1)%sides
                polygon((prev[k], ring[k], ring[nxt], prev[nxt]), (k//4)%3)
        rings.append(ring)

    # Hair fibers swept from the center/front part over both temples to the
    # rear of the head. Every lock follows the dome; there is no floating cap
    # or free-standing noodle/pendant at the forehead.
    for side in (-1,1):
        for strand in range(24):
            previous = None
            root_az = -math.pi/2 + side*(.10+.040*strand)
            travel = side*(1.12+.026*strand)
            for step in range(19):
                t = step/18
                az = root_az + travel*t
                theta = .36 + 1.11*t
                width = .050*(1-.50*t)
                p1 = point(surface(az-width,theta,.020))
                p2 = point(surface(az+width,theta,.020))
                if previous:
                    polygon((previous[0],p1,p2,previous[1]), strand%3)
                previous = (p1,p2)

    # Compact low chignon overlapping the back/nape instead of the old
    # detached five-ring coil. Low bun belongs on the rear surface of head.
    bun_c = Vector((cx, cy+ry*.88, eye_z-.010*h))
    bun_rx,bun_ry,bun_rz = .022*h,.014*h,.023*h
    bun_rows,bun_sides = 16,40
    previous = None
    for i in range(bun_rows+1):
        theta = .002 + (math.pi-.004)*i/bun_rows
        ring = []
        for j in range(bun_sides):
            az = 2*math.pi*j/bun_sides
            ring.append(point((
                bun_c.x + bun_rx*math.sin(theta)*math.cos(az),
                bun_c.y + bun_ry*math.sin(theta)*math.sin(az),
                bun_c.z + bun_rz*math.cos(theta))))
        if previous:
            for j in range(bun_sides):
                k = (j+1)%bun_sides
                polygon((previous[j],ring[j],ring[k],previous[k]), j//8%3)
        previous = ring

    hair_mesh = bpy.data.meshes.new("Caroline curved period hair, swept updo")
    hair_mesh.from_pydata(verts,[],faces)
    hair_mesh.update()
    colors = [(0.40,0.29,0.18),(0.47,0.34,0.22),(0.36,0.26,0.16)]
    for i,rgb in enumerate(colors):
        mat = bpy.data.materials.new("Caroline warm light blonde hair shade "+str(i))
        mat.use_nodes = True
        mat.diffuse_color = (*rgb,1)
        mat.use_backface_culling = False
        bs = next((n for n in mat.node_tree.nodes if n.type=="BSDF_PRINCIPLED"),None)
        bs.inputs["Base Color"].default_value = (*rgb,1)
        bs.inputs["Roughness"].default_value = .84
        bs.inputs["Metallic"].default_value = 0
        hair_mesh.materials.append(mat)
    for face, mat_index in zip(hair_mesh.polygons,material_ids):
        face.material_index = mat_index
        face.use_smooth = True

    hair = bpy.data.objects.new("Caroline period swept back hair (face clear)",hair_mesh)
    bpy.context.collection.objects.link(hair)
    hair.parent = export_root
    # The geometry was authored in world coordinates. Convert to
    # armature-local before assigning the Head vertex group.
    hair.matrix_world = rig.matrix_world.copy()
    to_local = hair.matrix_world.inverted_safe()
    for v in hair_mesh.vertices:
        v.co = to_local @ v.co
    group = hair.vertex_groups.new(name=head_bone)
    group.add(list(range(len(verts))),1.0,"REPLACE")
    hair.modifiers.new("Caroline hairstyle follows head","ARMATURE").object = rig

    print("WVLRP_CAROLINE_HAIR_FIT",
          "dome_rise_front_m",round(crown_z-front_edge,4),
          "dome_rise_back_m",round(crown_z-back_edge,4),
          "eye_clearance_m",round(front_edge-eye_z,4),
          "bun_center_z",round(bun_c.z,4),
          "vertices",len(verts),"faces",len(faces),
          "head_bone",head_bone)
    return hair
