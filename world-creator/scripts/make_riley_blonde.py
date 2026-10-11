"""Make a long-blonde-haired Riley prototype from the repository's CC0 textured models.
This modifies visible meshes for in-game Babylon previews without changing the world save.
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
    raise ValueError("Choose standing or kneeling")
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

# Remove the actual stock bob and old shoes, otherwise dark hair and footwear
# protrude through our long blonde hair and fresh sneakers.
for ob in original:
    name=ob.name.lower()
    if name.startswith("bob01") or name.startswith("shoes05"):
        bpy.data.objects.remove(ob, do_unlink=True)

# The stock outfit contains long trousers. Remove only its old lower section,
# retaining the original textured T-shirt and the anatomical face/body.
# Work in object-local mesh coordinates converted to world space.
import bmesh
for ob in [v for v in bpy.context.scene.objects if v.type=="MESH" and v.name.startswith("female_casualsuit")]:
    bm=bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    old_faces=[f for f in bm.faces if (ob.matrix_world @ f.calc_center_median()).z < zmin + (zmax-zmin)*(.565 if MODE!="kneeling" else .52)]
    if old_faces:
        bmesh.ops.delete(bm, geom=old_faces, context="FACES")
        bm.to_mesh(ob.data)
        ob.data.update()
        print("REMOVED_STOCK_TROUSER_POLYGONS",len(old_faces),ob.name)
    bm.free()

# Work in proportional coordinates so both source poses receive consistent wardrobe.
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
skin = mat("Riley | warm natural skin - legs", (.79,.56,.43))
shorts = mat("Riley | loose beige cotton shorts",(.55,.49,.34))
seam = mat("Riley | shorts stitching",(.75,.69,.50))
sneakers = mat("Riley | ivory sneakers",(.84,.82,.76),.59)
soles = mat("Riley | rubber sneaker sole",(.49,.47,.42))
laces = mat("Riley | sneaker laces",(.97,.96,.91))

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

# Cover the source jeans with anatomical skin-colored legs, then add short loose fabric shorts.
# Original meshes are retained intact, and no other NPC is changed.
hipz=.60 if MODE!="kneeling" else .59
hemz=.455 if MODE!="kneeling" else .47
loft("Riley shorts waistband",[(cx,cy,z(hipz+.025),H*.153,H*.105),
                               (cx,cy,z(hipz+.010),H*.153,H*.105)],
     seam,24)
loft("Riley shorts body",[(cx,cy,z(hipz+.01),H*.152,H*.108),
                         (cx,cy,z(.545),H*.169,H*.114)],
     shorts,32)
for side in (-1,1):
    legx = cx+side*H*.081
    loft("Riley loose short leg "+str(side),[
        (legx,cy,z(.565),H*.084,H*.103),
        (legx,cy,z(.520),H*.095,H*.110),
        (legx,cy,z(hemz),H*.093,H*.107)],
         shorts,22)
    loft("Riley short hem stitching "+str(side), [
        (legx,cy,z(hemz+.006),H*.0938,H*.108),
        (legx,cy,z(hemz-.002),H*.094,H*.108)], seam,24)
    # Full-length body-colored lower legs conceal denim below the short hem.
    loft("Riley exposed leg "+str(side),[
        (legx,cy,z(hemz+.026),H*.081,H*.080),
        (legx,cy,z(.405),H*.084,H*.081),
        (legx,cy,z(.350),H*.075,H*.072),
        (legx,cy,z(.29),H*.064,H*.063),
        (legx,cy,z(.23),H*.067,H*.065),
        (legx,cy,z(.15),H*.063,H*.061),
        (legx,cy,z(.080),H*.050,H*.050)],skin,24)
    # Low-top sneaker construction: body, toe, outsole, laces.
    sphere("Riley sneaker "+str(side), (legx,cy-H*.018,z(.061)),
           (H*.063,H*.106,H*.045),sneakers)
    sphere("Riley sneaker sole "+str(side),(legx,cy-H*.019,z(.029)),
           (H*.064,H*.107,H*.021),soles)
    for i in range(3):
        sphere("Riley lace "+str(side)+" "+str(i),
               (legx,cy-H*(.035+i*.020),z(.096)), (H*.021,H*.004,H*.003),laces,12)

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
        length=H*(.24+.085*random.random()+.038*(1-layer))
        width=H*(.012+.0038*random.random())
        phase=2*pi*random.random()
        verts=[]
        faces=[]
        sections=17
        for k in range(sections):
            t=k/(sections-1)
            # Gentle, broad waves and softly feathered, irregular ends.
            sway=H*(.0065*sin(2*pi*1.45*t+phase)+.011*sin(2*pi*.77*t+phase*.57))*t
            center=root+Vector((outward.x*H*(.004+.022*t)+tangent.x*sway,
                                outward.y*H*(.004+.028*t)+tangent.y*sway,
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
            center=root+Vector((side*H*(.012*t+.007*sin(pi*t)),
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

# The old build only dressed the stock broad torso, so shorts did not change
# her underlying silhouette. Sculpt ALL skin and clothes together into a
# proportionate, naturally slim/active adult figure. Leave her actual face,
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

# Hands-and-knees pose: deform real skinned, textured GLB geometry in place.
# Source is a baked static mesh without an armature; this is a posed prototype,
# not a full skeletal animation. Mapping places hips high, knees and palms down.
if MODE=="allfours":
    def clamp(x):return max(0.0,min(1.0,x))
    def smooth(x):x=clamp(x);return x*x*(3-2*x)
    def deform(p,name):
        px,py,pz=p.x,p.y,p.z
        h=(pz-zmin)/H
        if h>=.60:
            # Horizontal back, neck and forward-facing head.
            dz=pz-z(.60)
            n_y=cy-0.95*dz + (py-cy)*0.36
            n_z=zmin+H*.42+0.30*dz-(py-cy)*.92
        elif h>=.27:
            t=(h-.27)/.33
            n_y=cy+H*.19*(1-t)+(py-cy)*.85
            n_z=zmin+H*(.075+.345*t)
        else:
            t=h/.27
            n_y=cy+H*(.19+.28*(1-t))+(py-cy)*.8
            n_z=zmin+H*(.075+.020*(1-t))
        # Original arms hang vertically; bend their mesh into straight supports.
        # Blend at shoulders so the skin stays connected to the torso.
        if ("anatomical body" in name or "female_casualsuit" in name) and pz > z(.40):
            reach=smooth((abs(px-cx)/H-.077)/.055)*smooth((1.45-pz)/.16)
            if reach>0:
                t=clamp((z(.86)-pz)/(H*.47)+.45)
                arm_y=cy-H*(.23+.14*t)+(py-cy)*.22
                arm_z=zmin+H*(.51-.47*t)
                n_y=n_y*(1-reach)+arm_y*reach
                n_z=n_z*(1-reach)+arm_z*reach
        return Vector((px,n_y,max(zmin+.005,n_z)))
    for ob in [ob for ob in bpy.context.scene.objects if ob.type=="MESH"]:
        world=ob.matrix_world.copy()
        inv=world.inverted_safe()
        for v in ob.data.vertices:
            v.co=inv @ deform(world @ v.co,ob.name.lower())
        ob.data.update()
    print("RILEY_POSE allfours: palms and knees lowered; textured source geometry retained")

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
