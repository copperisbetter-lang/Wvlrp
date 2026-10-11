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
hair = [mat("Riley | honey blonde", (.65,.42,.15),.76),
        mat("Riley | warm blonde highlights", (.91,.72,.35),.75),
        mat("Riley | sandy blonde", (.77,.56,.23),.79),
        mat("Riley | golden lowlights", (.49,.31,.13),.83)]
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

# A modeled cap covers the short dark original hair (not a pasted-on photograph).
# The flowing locks supply actual 3D volume, visible from any orbit direction.
head_center_z=z(.927)
cap_rz=H*.072
cap_rx=H*.079
cap_ry=H*.067
verts=[(cx,cy,head_center_z+cap_rz)]
faces=[]
STEPS=44
RINGS=10
for j in range(1,RINGS+1):
    theta=(pi/2)*j/RINGS
    rx=cap_rx*sin(theta)
    ry=cap_ry*sin(theta)
    zz=head_center_z+cap_rz*cos(theta)
    for k in range(STEPS):
        a=k*2*pi/STEPS
        verts.append((cx+rx*cos(a),cy+ry*sin(a),zz))
for k in range(STEPS):
    faces.append((0,1+k,1+(k+1)%STEPS))
for j in range(RINGS-1):
    start=1+j*STEPS
    for k in range(STEPS):
        n=(k+1)%STEPS
        faces.append((start+k,start+n,start+STEPS+n,start+STEPS+k))
mesh("Riley sculpted blonde crown",verts,faces,hair[1],)
random.seed(57012 if MODE=="standing" else 57013)
for i in range(110):
    # Wrap from ear to ear across the back half of the head; stagger shoulder-length waves.
    angle = (-.08 + (i/109)*1.16)*pi  # rear arc
    sx=cx+H*.074*cos(angle)
    sy=cy+H*.062*sin(angle)
    ht=head_center_z+H*(.045 + .013*random.random())
    length=H*(.25 + .08*random.random())
    sway=H*(.017 + .012*random.random())
    radi=H*(.0038+.0025*random.random())
    rings=[]
    for k in range(9):
        t=k/8
        xx=sx + H*.014*cos(angle)*t + sway*sin(t*pi*2.4+i*.31)*t
        yy=sy + H*.023*sin(angle)*t + sway*.55*sin(t*pi*2+i*.43)*t
        zz=ht-length*t
        r=radi*(.94-.63*t)
        rings.append((xx,yy,zz,r,r*.85))
    loft("Riley long blonde wave "+str(i),rings,hair[i%len(hair)],7)
for side in (-1,1):
    # Face-framing strands hang beside, rather than over, the eyes.
    for j in range(13):
        sx=cx+side*H*(.065+.006*j/13)
        sy=cy-H*(.012+j*.001)
        rings=[]
        for k in range(9):
            t=k/8
            rings.append((sx+side*H*(.012*t+.008*sin(pi*t)),
                          sy-H*.011*sin(pi*t),head_center_z+H*.025-H*(.33+(.02*j/13))*t,
                          H*.005*(1-.72*t),H*.005*(1-.72*t)))
        loft(f"Riley face-frame blonde {side} {j}",rings,hair[(j+1)%4],7)

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
