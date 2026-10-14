"""Adult Caroline Ingalls reference-body proportions and Season 3 updo.
Applied to her own MPFB copy, never Jenny's or another actor's model.
The preview hairstyle is procedural trial art, NOT a certified likeness.
"""
import bpy, math
from mathutils import Vector

def reshape_adult_body(body):
    """Subtle lifted rounded posterior shaping on continuous existing vertices."""
    if not body or body.type!="MESH" or len(body.data.vertices)<10000:
        raise RuntimeError("Caroline shape: continuous basemesh not available")
    verts=body.data.vertices
    xmin=min(v.co.x for v in verts);xmax=max(v.co.x for v in verts)
    zmin=min(v.co.z for v in verts);zmax=max(v.co.z for v in verts)
    ymin=min(v.co.y for v in verts);ymax=max(v.co.y for v in verts)
    height=zmax-zmin
    cx=(xmin+xmax)/2;cy=(ymin+ymax)/2
    if height<.8 or height>3:
        raise RuntimeError("Caroline proportions: invalid human scale")
    changed=0
    for v in verts:
        p=v.co
        z=(p.z-zmin)/height;x=(p.x-cx)/height
        # MPFB adults face Blender -Y; only the posterior half is affected.
        rear=max(0.,min(1.,(p.y-cy)/(.08*height)))
        rear=rear*rear*(3-2*rear)
        if rear<.001:continue
        # Lift and round both glute lobes while preserving the continuous
        # source pelvis and thigh topology.  No separate mesh attachments.
        lobes=math.exp(-((abs(x)-.068)/.057)**2)
        butt=math.exp(-((z-.53)/.074)**2)
        lift=math.exp(-((z-.575)/.055)**2)
        delta=height*(.022*butt*lobes+.006*lift*lobes)*rear
        p.y+=delta
        # Hip contour kept narrow/toned; garment must be tailored afterward.
        p.x=cx+(p.x-cx)*(1+.012*butt*rear)
        changed+=1
    body.data.update()
    print("WVLRP_CAROLINE_GLUTE_SCULPT",changed,"height",round(height,3))

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
    colors = [(0.56,0.40,0.25),(0.64,0.48,0.31),(0.50,0.36,0.23)]
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
