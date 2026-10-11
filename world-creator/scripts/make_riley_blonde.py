"""Build an articulated, featureless adult Riley mannequin from CC0 source meshes.
This changes the standalone test figure only, not the deer or saved game world.
All new geometry is original, generated here; the underlying model remains licensed CC0.
Run: blender -b --factory-startup --python make_riley_blonde.py -- standing
"""
import bpy, sys, os, math, random
from mathutils import Vector
from math import sin, cos, pi
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets"
MODE = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "standing"
if MODE not in ("standing", "kneeling", "allfours"):
    raise ValueError("Choose standing, kneeling or allfours")
INPUT = SOURCE / ("riley-kneeling.glb" if MODE == "kneeling" else "riley-real.glb")
OUTPUT = SOURCE / ("riley-blonde-kneeling.glb" if MODE == "kneeling" else "riley-blonde-allfours.glb" if MODE == "allfours" else "riley-blonde-standing.glb")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(INPUT))
print("RILEY_SCENE_OBJECTS", [(ob.name,ob.type, len(ob.data.bones) if ob.type=="ARMATURE" else "") for ob in bpy.context.scene.objects])
for rig in [ob for ob in bpy.context.scene.objects if ob.type=="ARMATURE"]:
    print("RILEY_RIG_BONES", [(b.name, list(map(lambda v:round(v,2), b.head_local)), list(map(lambda v:round(v,2), b.tail_local))) for b in rig.data.bones][:150])
original = [ob for ob in bpy.context.scene.objects if ob.type == "MESH"]
if not original:
    raise RuntimeError("Original Riley GLB did not import any mesh")

coords = [ob.matrix_world @ Vector(corner) for ob in original for corner in ob.bound_box]
xmin, ymin, zmin = [min(getattr(v, a) for v in coords) for a in "xyz"]
xmax, ymax, zmax = [max(getattr(v, a) for v in coords) for a in "xyz"]
H = zmax - zmin
if not 0.9 < H < 20:
    raise RuntimeError(f"Unexpected original character height {H:.3f}")
cx = (xmin+xmax)/2
cy = (ymin+ymax)/2
print(f"RILEY_INPUT mode={MODE} mesh_count={len(original)} height={H:.3f} "
      f"bounds={[round(i,3) for i in (xmin,ymin,zmin,xmax,ymax,zmax)]}")
for ob in original:
    print("MODEL_MESH", ob.name, "MATERIALS", [slot.material.name for slot in ob.material_slots if slot.material])

# Remove the stock bob and shoes, leaving Riley with soft blonde hair and bare mannequin feet.
for ob in original:
    name=ob.name.lower()
    if name.startswith("bob01") or name.startswith("shoes05"):
        bpy.data.objects.remove(ob, do_unlink=True)

# Remove the entire legacy shirt/trouser outfit.
# The original base figure is converted to a featureless doll mannequin.
old_outfits=[o for o in bpy.context.scene.objects if o.type=="MESH"
             and o.name.startswith("female_casualsuit")]
for ob in old_outfits:
    bpy.data.objects.remove(ob,do_unlink=True)
print("RILEY_REMOVED_OLD_CLOTHING",len(old_outfits))

# Work in proportional coordinates so all three static poses match.
def z(frac):
    return zmin + frac * H
def mat(name, rgb, rough=0.82):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    if p:
        p.inputs["Base Color"].default_value = (*rgb, 1)
        p.inputs["Roughness"].default_value = rough
    return m
hair = [mat("Riley | honey blonde", (.73,.54,.31),.72),
        mat("Riley | soft champagne highlights", (.90,.74,.49),.67),
        mat("Riley | sandy blonde", (.78,.61,.39),.73),
        mat("Riley | soft ash-gold lowlights", (.58,.43,.27),.76)]

def mesh(name, vertices, faces, material):
    me=bpy.data.meshes.new(name)
    me.from_pydata(vertices, [], faces)
    me.update()
    obj=bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for polygon in me.polygons:
        polygon.use_smooth=True
    return obj

def loft(name, rings, material, steps=16, caps=True):
    # A ring is (x_center, y_center, world_z, x_radius, y_radius).
    verts=[]
    for x,y,h,rx,ry in rings:
        for k in range(steps):
            a=k*2*pi/steps
            verts.append((x+rx*cos(a),y+ry*sin(a),h))
    faces=[]
    for r in range(len(rings)-1):
        for j in range(steps):
            n=(j+1)%steps
            faces.append((r*steps+j,r*steps+n,(r+1)*steps+n,(r+1)*steps+j))
    if caps:
        faces.extend((tuple(reversed(tuple(range(steps)))),
                      tuple((len(rings)-1)*steps + i for i in range(steps))))
    return mesh(name,verts,faces,material)

def sphere(name, pos, scale, material, segments=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=10, location=pos)
    ob=bpy.context.object
    ob.name=name
    ob.scale=scale
    ob.data.materials.append(material)
    for face in ob.data.polygons:face.use_smooth=True
    return ob

# Keep the continuous base legs and bare feet without layering tube limbs or shoes.

# Find the actual head on each source pose from its visible face and scalp.
# Overall character bounds cannot position hair reliably: kneeling / stock asset
# hierarchies give different heights. Use real eye and head vertices instead.
face_marks=[]
for ob in [o for o in bpy.context.scene.objects if o.type=='MESH']:
    if ob.name.lower().startswith(("eyebrow","eyelashes")):
        face_marks.extend(ob.matrix_world @ v.co for v in ob.data.vertices)
if face_marks:
    eye_z=sum(p.z for p in face_marks)/len(face_marks)
else:
    eye_z=z(.87)
head_vertices=[]
for ob in [o for o in bpy.context.scene.objects if o.type=='MESH']:
    if ("anatomical body" in ob.name.lower() or ob.name.lower()=="low-poly"):
        head_vertices.extend(pt for v in ob.data.vertices
                             if eye_z-H*.09 <= (pt:=ob.matrix_world @ v.co).z <= eye_z+H*.11)
if len(head_vertices)<15:
    head_vertices=face_marks
if not head_vertices:
    raise RuntimeError("Cannot locate Riley's physical head to attach her hair")
head_x=(min(p.x for p in head_vertices)+max(p.x for p in head_vertices))*.5
head_y=(min(p.y for p in head_vertices)+max(p.y for p in head_vertices))*.5
head_top=max(p.z for p in head_vertices)
head_center_z=head_top-H*.047
print("RILEY_HEAD_ANCHOR",MODE,"eye_z",round(eye_z,3),
      "scalp_top",round(head_top,3),"cap_center",round(head_center_z,3))

# A close-fitting crown and wavy shoulder-length locks are genuine 3D,
# attached to the found head, rather than a separate helmet hovering above.
cap_rz=H*.054
cap_rx=H*.065
cap_ry=H*.060
verts=[(head_x,head_y,head_center_z+cap_rz)]
faces=[]
STEPS=52
RINGS=12
for j in range(1,RINGS+1):
    theta=(pi/2)*j/RINGS
    rx=cap_rx*sin(theta)
    ry=cap_ry*sin(theta)
    zz=head_center_z+cap_rz*cos(theta)
    for k in range(STEPS):
        a=k*2*pi/STEPS
        verts.append((head_x+rx*cos(a),head_y+ry*sin(a),zz))
for k in range(STEPS):
    faces.append((0,1+k,1+(k+1)%STEPS))
for j in range(RINGS-1):
    start=1+j*STEPS
    for k in range(STEPS):
        n=(k+1)%STEPS
        faces.append((start+k,start+n,start+STEPS+n,start+STEPS+k))
mesh("Riley fitted blonde hair crown",verts,faces,hair[1])
# Soft overlapping locks instead of 100+ spaghetti-shaped cylindrical strands.
# Each tapered 3D ribbon has a scalp-root pivot so the browser can gently sway it.
# Spread the layered curtain behind the face; leave the eyes and smile unobstructed.
random.seed(57012 if MODE=="standing" else 57013)
for layer in range(2):
    strands=50 if layer==0 else 38
    for i in range(strands):
        angle=(-.055+(i+.38*layer)/(strands-1)*1.11)*pi
        outward=Vector((cos(angle),sin(angle),0))
        tangent=Vector((-sin(angle),cos(angle),0))
        root=Vector((head_x+cap_rx*(.91+layer*.065)*outward.x,
                     head_y+cap_ry*(.90+layer*.06)*outward.y,
                     head_center_z+H*(.017+.014*random.random()-layer*.025)))
        length=H*(.26+.10*random.random()+.048*(1-layer))
        width=H*(.014+.0044*random.random())
        phase=2*pi*random.random()
        verts=[]
        faces=[]
        sections=17
        for k in range(sections):
            t=k/(sections-1)
            # Gentle, broad waves and softly feathered, irregular ends.
            sway=H*(.014*sin(2*pi*1.75*t+phase)+.020*sin(2*pi*.81*t+phase*.57))*t
            center=root+Vector((outward.x*H*(.004+.022*t)+tangent.x*sway,
                                outward.y*H*(.004+.047*t)+tangent.y*sway,
                                -length*t))
            width_t=width*(.82+.17*sin(pi*t))*max(.035,(1-t)**.62)
            for lane in (-1,0,1):
                v=center+tangent*(lane*width_t)
                v+=outward*(H*.0025*(1-lane*lane)*sin(pi*t))
                verts.append(tuple(v-root))
        for k in range(sections-1):
            for lane in range(2):
                a=k*3+lane
                faces.extend(((a,a+1,a+4),(a,a+4,a+3)))
        lock=mesh("Riley soft blonde layer %d strand %d"%(layer,i),verts,faces,
                  hair[(i+2*layer)%len(hair)])
        lock.location=root
# Face-framing waves blend from the sides of the crown, not from a floating halo.
for side in (-1,1):
    for i in range(13):
        frac=i/12
        root=Vector((head_x+side*H*(.045+.008*frac),
                     head_y-H*(.020+.013*frac),
                     head_center_z+H*(.021-.015*frac)))
        length=H*(.185+.105*frac)
        verts=[];faces=[]
        for k in range(14):
            t=k/13
            center=root+Vector((side*H*(.019*t+.013*sin(pi*t)),
                                -H*.007*sin(pi*t),
                                -length*t))
            halfwidth=H*(.0075+.003*frac)*max(.04,(1-t)**.7)
            for lane in (-1,0,1):
                verts.append(tuple(center-root+Vector((lane*halfwidth,0,
                            H*.0015*(1-lane*lane)*sin(pi*t)))))
        for k in range(13):
            for lane in range(2):
                a=k*3+lane
                faces.extend(((a,a+1,a+4),(a,a+4,a+3)))
        lock=mesh("Riley soft blonde face wave %d %d"%(side,i),
                  verts,faces,hair[(i+1)%len(hair)])
        lock.location=root

# A restrained, asymmetric mouth-corner lift suggests a cheeky half-smile.
# Only the existing textured facial geometry is adjusted; no pasted-on mouth.
face_sculpted=0
mouth_z=eye_z-H*.044
front_candidates=[p.y for p in head_vertices if abs(p.z-mouth_z)<H*.025
                  and abs(p.x-head_x)<H*.065]
if front_candidates:
    front_y=min(front_candidates)
    for ob in [o for o in bpy.context.scene.objects if o.type=="MESH"
               and ("anatomical body" in o.name.lower() or o.name.lower()=="low-poly")]:
        mx=ob.matrix_world.copy()
        inv=mx.inverted_safe()
        for v in ob.data.vertices:
            p=mx @ v.co
            dx=(p.x-head_x)/H
            dz=(p.z-mouth_z)/H
            wing=math.exp(-((abs(dx)-.028)/.017)**2)
            vertical=math.exp(-(dz/.018)**2)
            near_front=math.exp(-((p.y-front_y)/(H*.040))**2)
            amount=wing*vertical*near_front
            if amount<.025:continue
            # The right corner rises slightly higher: playful, not a big grin.
            p.z+=H*.0039*amount*(1.16 if dx>0 else .84)
            p.x+=H*.0012*amount*(1 if dx>0 else -1)
            p.y-=H*.0007*amount
            v.co=inv @ p
            face_sculpted+=1
        ob.data.update()
print("RILEY_SOFT_HAIR_AND_SMIRK",MODE,
      "layers",88,"fringe",26,"face_vertices",face_sculpted)

# Barbie-style adult display mannequin: no clothes and no anatomical
# detailing. The face/hair stay recognizable, while the body gets a smooth,
# uniform non-photographic doll finish. This is deliberately NON-anatomical.
doll_skin=mat("Riley | smooth matte featureless doll skin",(.79,.61,.50),.83)
body_parts=[ob for ob in bpy.context.scene.objects if ob.type=="MESH" and
            ("anatomical body" in ob.name.lower() or ob.name.lower()=="low-poly")]
if not body_parts:
    raise RuntimeError("Cannot find Riley's base mannequin body")
# Strip any separate anatomically detailed add-ons if they exist.
detail_terms=("genital","vulva","vagina","labia","nipple","areola","pubic")
removed_details=[]
for obj in list(bpy.context.scene.objects):
    if obj.type=="MESH" and any(word in obj.name.lower() for word in detail_terms):
        if obj not in body_parts:
            removed_details.append(obj.name)
            bpy.data.objects.remove(obj,do_unlink=True)

# The existing base figure is a continuous, non-rigged surface. Smooth local
# high-frequency details around the central pelvis; retain natural hips,
# thighs and leg separation. Do not flatten the entire lower body into a box.
smoothed_verts=0
pelvis_center=eye_z-H*.44
for ob in body_parts:
    world=ob.matrix_world.copy()
    inv=world.inverted_safe()
    for _ in range(4):
        positions=[world @ v.co for v in ob.data.vertices]
        adjacency=[set() for _ in positions]
        for edge in ob.data.edges:
            a,b=edge.vertices
            adjacency[a].add(b);adjacency[b].add(a)
        next_positions=list(positions)
        for index,p in enumerate(positions):
            if not adjacency[index]:continue
            xdist=abs((p.x-head_x)/H)
            zdist=abs((p.z-pelvis_center)/H)
            if xdist>=.082 or zdist>=.075:continue
            weight=(1-(xdist/.082)**2)**2*(1-(zdist/.075)**2)**2
            avg=sum((positions[n] for n in adjacency[index]),Vector((0,0,0)))/len(adjacency[index])
            next_positions[index]=p.lerp(avg,.48*weight)
            smoothed_verts+=1
        for v,p in zip(ob.data.vertices,next_positions):
            v.co=inv @ p
    # Replace body decals/skin-texture details by a single flat satin skin.
    # Preserve all meshes above the neck, including eyes, lips and smile.
    skin_slot=len(ob.data.materials)
    ob.data.materials.append(doll_skin)
    for poly in ob.data.polygons:
        center=world @ poly.center
        if center.z<eye_z-H*.115:
            poly.material_index=skin_slot
        poly.use_smooth=True
    ob.data.update()
print("RILEY_FEATURELESS_MANNEQUIN",MODE,
      "smoothed",smoothed_verts,"removed_details",removed_details,
      "body_meshes",len(body_parts))
# Safety guard: the exported prototype must not reintroduce swimwear or
# separate explicit-anatomy meshes from the original assets.
for obj in bpy.context.scene.objects:
    if obj.type=="MESH" and any(w in obj.name.lower() for w in
        ("bikini","shorts","sneaker","female_casualsuit","genital","nipple","vulva")):
        raise AssertionError("Non-mannequin geometry remains: "+obj.name)


# Slim the source broad torso without changing facial features. Sculpt the
# smooth, matte mannequin into a naturally active adult silhouette. Leave her actual face,
# scalp, and feet unchanged, preserving expression and grounded posture.
def clamp01(x):return max(0.,min(1.,x))
def smooth01(x):
    x=clamp01(x)
    return x*x*(3-2*x)
shoulder_line=eye_z-H*.125
adjusted=0
for ob in [obj for obj in bpy.context.scene.objects if obj.type=="MESH"]:
    if ob.name.startswith(("Riley soft blonde", "Riley fitted blonde hair")):
        continue # Do not squash the hair layers while slimming the source figure.
    mx=ob.matrix_world.copy()
    inv=mx.inverted_safe()
    for vertex in ob.data.vertices:
        pt=mx @ vertex.co
        lower=smooth01((pt.z-z(.17))/(H*.14))
        upper=smooth01((shoulder_line-pt.z)/(H*.12))
        band=lower*upper
        if band<.001:continue
        # Nudge broad stock ribs/waist inward, with gentler hip/upper curves.
        taper=(.17+.045*math.exp(-((pt.z-z(.57))/(H*.16))**2))*band
        pt.x=cx+(pt.x-cx)*(1-taper)
        pt.y=cy+(pt.y-cy)*(1-.105*band)
        vertex.co=inv @ pt
        adjusted+=1
    ob.data.update()
print("RILEY_SLIM_ATHLETIC_BODY",MODE,"adjusted_vertices",adjusted)

# True articulated *static* mannequin test.  Do NOT bend the entire figure
# by altitude: that projects unrelated legs, arms, face and torso onto the same
# plane (the flattened "Silent Hill" model).  The source GLB has no skeleton,
# so use anatomically separated, connected limb chains to pose its existing
# sculpted surface, preserving the recognizable adult face and flowing hair.
if MODE=="allfours":
    from mathutils import Quaternion

    def V(x, y, h):
        return Vector((x, y, zmin + H*h))

    def clamped(t):
        return max(0.0,min(1.0,t))

    def eased(t):
        t=clamped(t)
        return t*t*(3.0-2.0*t)

    # Rest joints are recovered in source-relative coordinates. In the final
    # pose the back remains elongated, the knees rest behind the pelvis and
    # the palms are forward and grounded. The face remains upright.
    torso=[
        (V(cx,cy,.90), V(cx,cy-H*.28,.435)),
        (V(cx,cy,.78), V(cx,cy-H*.145,.445)),
        (V(cx,cy,.52), V(cx,cy+H*.20,.435)),
    ]
    arms={}
    legs={}
    for side in (-1,1):
        arms[side]=[
            (V(cx+side*H*.115,cy,.815), V(cx+side*H*.124,cy-H*.183,.435)),
            (V(cx+side*H*.145,cy,.605), V(cx+side*H*.136,cy-H*.285,.235)),
            (V(cx+side*H*.145,cy,.355), V(cx+side*H*.137,cy-H*.322,.042)),
        ]
        legs[side]=[
            (V(cx+side*H*.060,cy,.515),V(cx+side*H*.064,cy+H*.19,.435)),
            (V(cx+side*H*.062,cy,.272),V(cx+side*H*.074,cy+H*.392,.054)),
            (V(cx+side*H*.068,cy,.048),V(cx+side*H*.075,cy+H*.585,.052)),
        ]

    def chain_point(p, chain):
        # Rotate the cross-section for the relevant articulated limb segment
        # while interpolating its new centreline. No global height-projection.
        for i in range(len(chain)-1):
            olda,newa=chain[i]
            oldb,newb=chain[i+1]
            if p.z>=oldb.z or i==len(chain)-2:
                denom=oldb.z-olda.z
                t=(p.z-olda.z)/denom if abs(denom)>1e-7 else 0
                old_center=olda.lerp(oldb,t)
                new_center=newa.lerp(newb,t)
                old_axis=oldb-olda
                new_axis=newb-newa
                rotation=old_axis.rotation_difference(new_axis)
                return new_center+rotation @ (p-old_center)
        return p.copy()

    head_rest=Vector((head_x,head_y,eye_z))
    head_target=V(head_x,cy-H*.37,.405)
    head_rot=Quaternion(Vector((1,0,0)),math.radians(9))

    def head_point(p):
        return head_target+head_rot @ (p-head_rest)

    def articulated_point(p, obj_name):
        name=obj_name.lower()
        # The hair locks, cap, lashes, teeth and brows are separate objects.
        # Apply exactly the same rigid head transform to every vertex, keeping
        # the crown anchored to the real scalp and the face undistorted.
        if name.startswith("riley soft blonde") or name.startswith("riley fitted blonde") or name.startswith(("eyelashes","eyebrow","teeth")):
            return head_point(p)
        height=(p.z-zmin)/H
        side=1 if p.x>=cx else -1
        width=abs(p.x-cx)/H
        pelvis_to_neck=chain_point(p,torso)
        limb_arm=chain_point(p,arms[side])
        limb_leg=chain_point(p,legs[side])

        # Region weights transition across shoulder, groin, and neck.
        # Keeping them soft avoids severed arms and disconnected hips.
        arm_width=eased((width-.085)/.052)
        arm_height=eased((height-.31)/.09)*(1-eased((height-.825)/.055))
        arm_weight=arm_width*arm_height
        leg_weight=(1-eased((height-.43)/.145))*eased((width-.012)/.038)
        head_weight=eased((height-.852)/.065)

        posed=pelvis_to_neck.lerp(limb_leg,leg_weight)
        posed=posed.lerp(limb_arm,arm_weight*(1-head_weight))
        posed=posed.lerp(head_point(p),head_weight)
        return posed

    moved=0
    for ob in [o for o in bpy.context.scene.objects if o.type=="MESH"]:
        original_world=ob.matrix_world.copy()
        inv=original_world.inverted_safe()
        for vertex in ob.data.vertices:
            original_pt=original_world @ vertex.co
            posed=articulated_point(original_pt,ob.name)
            # Only prevent ground penetration, never squash the torso/head.
            posed.z=max(zmin+H*.010,posed.z)
            vertex.co=inv @ posed
            moved+=1
        ob.data.update()
    # Height should decrease, but the 3D character must stay full-bodied.
    points=[o.matrix_world @ Vector(corner)
            for o in bpy.context.scene.objects if o.type=="MESH"
            for corner in o.bound_box]
    pose_height=max(p.z for p in points)-min(p.z for p in points)
    print("RILEY_ARTICULATED_ALLFOURS", "vertices",moved,
          "height_fraction",round(pose_height/H,3),
          "ground",round(min(p.z for p in points),3))
    assert .23*H < pose_height < .95*H, "The posed mannequin bounds are invalid"

# Do not replace the head with a flat image or a primitive doll; retain the
# realistic original face, body proportions, and existing textured materials.
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format="GLB",
                           export_apply=True, export_materials="EXPORT",
                           export_image_format="AUTO", use_selection=False)
size=OUTPUT.stat().st_size
with open(OUTPUT,"rb") as fd:
    assert fd.read(4)==b"glTF"
assert size > 1000000, f"Suspiciously small output {size}"
print(f"RILEY_EXPORTED {OUTPUT} {size} bytes")
