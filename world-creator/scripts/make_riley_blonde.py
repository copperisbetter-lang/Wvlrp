"""Make an adult beach-test Riley prototype from the repository's CC0 textured models.
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

# Remove the entire legacy shirt/trouser outfit, not just the trouser faces.
# The anatomical body underneath is used as the skin-colored swimsuit mannequin.
old_outfits=[o for o in bpy.context.scene.objects if o.type=="MESH"
             and o.name.startswith("female_casualsuit")]
for ob in old_outfits:
    bpy.data.objects.remove(ob,do_unlink=True)
print("RILEY_REMOVED_OLD_CLOTHING",len(old_outfits))

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

# Keep the anatomical legs and feet rather than layering tube legs or shoes over
# the source mesh. The bikini is fitted to that body after head and face discovery.

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

# Beach test outfit: a non-nude, adult triangle-string bikini.
# Fit fabric and straps directly over the anatomical torso. No stock shirt,
# blocky shorts or separate artificial legs should remain in the final GLBs.
fabric=mat("Riley | deep ocean teal bikini fabric",(.055,.31,.34),.54)
trim=mat("Riley | cream bikini piping",(.89,.86,.73),.60)
cordmat=mat("Riley | teal string ties",(.035,.20,.22),.58)
for m in (fabric,trim,cordmat):
    m.use_backface_culling=False

body_cloud=[ob.matrix_world @ v.co
            for ob in bpy.context.scene.objects if ob.type=="MESH"
            and ("anatomical body" in ob.name.lower() or ob.name.lower()=="low-poly")
            for v in ob.data.vertices]
if not body_cloud:
    raise RuntimeError("Body mesh missing: cannot safely dress Riley in a bikini")

def skin_surface_y(xv,zv,front=True):
    close=[p.y for p in body_cloud if abs(p.x-xv)<H*.030 and abs(p.z-zv)<H*.025]
    if not close:
        close=[p.y for p in body_cloud if abs(p.x-xv)<H*.065 and abs(p.z-zv)<H*.055]
    if not close:
        # Conservative placement on the near/far torso, not a pasted-on plane.
        return cy+(-1 if front else 1)*H*.105
    return (min(close)-H*.0035) if front else (max(close)+H*.0035)

def swim_panel(name, points, material):
    # Double-sided 3D fabric patch: front and reverse triangles.
    center=sum((Vector(p) for p in points),Vector((0,0,0)))/len(points)
    pts=[tuple(p) for p in points]+[tuple(center)]
    mid=len(points)
    faces=[]
    for i in range(mid):
        n=(i+1)%mid
        faces.extend(((i,n,mid),(mid,n,i)))
    return mesh(name,pts,faces,material)

def swimsuit_cord(name,points,material=cordmat,radius=None):
    radius=H*.0024 if radius is None else radius
    poly=[Vector(p) for p in points]
    if len(poly)<2:return
    verts=[];faces=[]
    for k,p in enumerate(poly):
        tangent=(poly[min(k+1,len(poly)-1)]-poly[max(0,k-1)]).normalized()
        ref=Vector((0,0,1)) if abs(tangent.z)<.88 else Vector((0,1,0))
        a=tangent.cross(ref).normalized()
        b=tangent.cross(a).normalized()
        for j in range(7):
            theta=2*pi*j/7
            v=p+radius*(cos(theta)*a+sin(theta)*b)
            verts.append(tuple(v))
        if k:
            for j in range(7):
                n=(j+1)%7
                faces.extend((((k-1)*7+j,(k-1)*7+n,k*7+n,k*7+j),))
    return mesh(name,verts,faces,material)

bust_z=eye_z-H*.197
bust_bottom=bust_z-H*.051
bust_top=bust_z+H*.080
shoulder_z=eye_z-H*.102
waist_z=eye_z-H*.362
bottom_z=waist_z-H*.108

for side in (-1,1):
    center_x=head_x+side*H*.073
    cup_inner=center_x-side*H*.059
    cup_outer=center_x+side*H*.060
    top_front=skin_surface_y(center_x,bust_top)
    bottom_front=skin_surface_y(center_x,bust_bottom)
    toppt=(center_x,top_front-H*.007,bust_top)
    innerpt=(cup_inner,bottom_front-H*.008,bust_bottom)
    outerpt=(cup_outer,bottom_front-H*.008,bust_bottom)
    lower_mid=((cup_inner+cup_outer)/2,
               bottom_front-H*.014,bust_bottom+H*.018)
    swim_panel("Riley | bikini triangle top "+str(side),
               [innerpt,outerpt,toppt,lower_mid],fabric)
    swimsuit_cord("Riley | triangle top hem "+str(side),
                 [innerpt,lower_mid,outerpt],trim,H*.0030)
    strap_up=(head_x+side*H*.073,
              skin_surface_y(center_x,shoulder_z)-H*.010,
              shoulder_z)
    strap_back=(head_x+side*H*.066,
                skin_surface_y(center_x,shoulder_z,False)+H*.010,
                shoulder_z-H*.028)
    swimsuit_cord("Riley | neck strap "+str(side),
                 [toppt,strap_up,strap_back],cordmat,H*.0030)
    tie_x=head_x+side*H*.17
    tie_front=(tie_x,skin_surface_y(tie_x,bust_bottom)-H*.009,bust_bottom)
    tie_back=(tie_x,skin_surface_y(tie_x,bust_bottom,False)+H*.009,bust_bottom)
    swimsuit_cord("Riley | back band "+str(side),
                 [outerpt,tie_front,tie_back],cordmat)
    # Bikini bottom curves across the hip; two slim side ties and a tiny bow.
    hipx=head_x+side*H*.142
    front_hip=(hipx,skin_surface_y(hipx,waist_z)-H*.012,waist_z)
    back_hip=(hipx,skin_surface_y(hipx,waist_z,False)+H*.012,waist_z)
    swimsuit_cord("Riley | bikini side string "+str(side),
                 [front_hip,(hipx+side*H*.015,cy,waist_z+H*.003),back_hip])
    knot=Vector((hipx+side*H*.018,cy,waist_z+H*.006))
    swimsuit_cord("Riley | bikini bow loop upper "+str(side),
                 [tuple(knot),tuple(knot+Vector((side*H*.017,0,H*.016))),
                  tuple(knot+Vector((side*H*.021,0,H*.001))),tuple(knot)])
    swimsuit_cord("Riley | bikini bow tail "+str(side),
                 [tuple(knot),tuple(knot+Vector((side*H*.006,0,-H*.026)))])

front_belt_y=skin_surface_y(head_x,waist_z)-H*.010
front_low_y=skin_surface_y(head_x,bottom_z)-H*.012
front_points=[(head_x-H*.114,front_belt_y,waist_z),
              (head_x+H*.114,front_belt_y,waist_z),
              (head_x+H*.042,front_low_y,bottom_z),
              (head_x-H*.042,front_low_y,bottom_z)]
swim_panel("Riley | bikini bottom front",front_points,fabric)
swimsuit_cord("Riley | bikini front waistband",
              front_points[:2],trim,H*.0028)
back_belt_y=skin_surface_y(head_x,waist_z,False)+H*.010
back_low_y=skin_surface_y(head_x,bottom_z,False)+H*.010
swim_panel("Riley | bikini bottom back",
           [(head_x-H*.12,back_belt_y,waist_z),
            (head_x+H*.12,back_belt_y,waist_z),
            (head_x+H*.054,back_low_y,bottom_z),
            (head_x-H*.054,back_low_y,bottom_z)],fabric)
swimsuit_cord("Riley | bikini back waistband",
              [(head_x-H*.12,back_belt_y,waist_z),
               (head_x+H*.12,back_belt_y,waist_z)],trim,H*.0028)
print("RILEY_SWIMSUIT_FITTED",MODE,"bust",round(bust_z,3),
      "waist",round(waist_z,3),"body_points",len(body_cloud))


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
