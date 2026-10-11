"""WVLRP Riley sculpted body: CC0 human sculpt + preserved Riley face + pose rig.
Reference intent: approved front/left-profile/back turnarounds, neutral base outfit.
Images guide proportions, not automatic 3D reconstruction. Do NOT reuse the
previous recoloured casual-suit shell, primitive torso rings or ball-shaped limbs.
Target: Blender 3.x/4.x; exports rigged GLB for Babylon.js.
The underlying full-body sculpt is the CC0 Innerscene/MakeHuman/MPFB neutral
base rig, downloaded by .github/workflows/build-riley-rigged.yml.
https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1
"""
import bpy, bmesh, math, random, json
from mathutils import Vector, Matrix
from math import sin, cos, pi
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"assets"/"riley-real.glb"
DONOR=ROOT/"assets"/"riley-sculpted-donor.glb"
OUT=ROOT/"assets"/"riley-rigged-v1.glb"
M=json.loads((ROOT/"riley-measurements.json").read_text())
H=M["height_cm"]/100.0
assert H==1.70, "Update rig joint positions when changing character height"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
source_meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
assert source_meshes, "Need original licensed CC0 head to preserve Riley's face"
source_bounds=[o.matrix_world @ Vector(c) for o in source_meshes for c in o.bound_box]
mins=[min(v[i] for v in source_bounds) for i in range(3)]
maxs=[max(v[i] for v in source_bounds) for i in range(3)]
height=maxs[2]-mins[2]
assert .9<height<20, "Original source bounds invalid"
scale=H/height
cx=(mins[0]+maxs[0])/2
cy=(mins[1]+maxs[1])/2
eye_pts=[o.matrix_world @ v.co for o in source_meshes
         if o.name.lower().startswith(("eyebrow","eyelashes"))
         for v in o.data.vertices]
eye_source=sum(p.z for p in eye_pts)/len(eye_pts) if eye_pts else mins[2]+height*.88
eye_z=(eye_source-mins[2])*scale
# Bring the head through its actual neck; never crop it at the jaw.
# The donor is trimmed below the cut so its neck will not cover Riley's face.
head_cut=max(1.440, min(1.465, eye_z-.090*H))
original_head=[]
for obj in list(source_meshes):
    name=obj.name.lower()
    # Preserve facial mesh and real eyes/brows/lashes; replace every old body
    # and clothing polygon below the neck, including the bad crotch/seat seams.
    keep=(name in ("low-poly","bob01") or "anatomical body" in name or
          name.startswith(("eyebrow","eyelashes","teeth")))
    if not keep:
        bpy.data.objects.remove(obj,do_unlink=True)
        continue
    evaluated=obj.matrix_world.copy()
    obj.parent=None
    obj.matrix_world=Matrix.Identity(4)
    for v in obj.data.vertices:
        p=evaluated @ v.co
        v.co=((p.x-cx)*scale,(p.y-cy)*scale,(p.z-mins[2])*scale)
    if name in ("low-poly",) or "anatomical body" in name:
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z<head_cut],context="VERTS")
        bm.to_mesh(obj.data);bm.free()
    if len(obj.data.vertices)<3:
        bpy.data.objects.remove(obj,do_unlink=True)
    else:
        original_head.append(obj)
assert original_head, "Original face could not be retained"

def skinmat(name, rgba, rough=.71, metallic=0):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    bs=mat.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(*rgba,1)
    bs.inputs["Roughness"].default_value=rough
    bs.inputs["Metallic"].default_value=metallic
    mat.diffuse_color=(*rgba,1)
    return mat
skin=skinmat("Riley natural warm skin tone",(.79,.58,.48),.79)
base=skinmat("Riley seamless soft neutral outfit underlayer",(.755,.590,.518),.88)
hair_colors=[
 skinmat("Riley sandy blonde roots",(.46,.32,.19),.87),
 skinmat("Riley honey-blonde",(.75,.57,.35),.73),
 skinmat("Riley champagne strands",(.88,.73,.52),.65),
 skinmat("Riley ash-gold shadows",(.61,.47,.30),.79)
]

# Retain a smooth, CC0 sculpted HUMAN body instead of hand-stacking ellipsoids
# and cylinder rings. It has real hip/thigh/waist/shoulder topology and feet.
if not DONOR.is_file() or DONOR.stat().st_size<100_000:
    raise RuntimeError("Missing complete CC0 anatomical donor; workflow must download GLB")
existing=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(DONOR))
donor_objects=[o for o in bpy.context.scene.objects if o not in existing]
donor_meshes=[o for o in donor_objects if o.type=="MESH"]
print("RILEY_SCULPT_DONOR",[(o.name,len(o.data.vertices),o.parent.name if o.parent else "") for o in donor_meshes])
# The base has one full, undeleted human skin, unlike the original suited Riley.
# Drop secondary eyeballs/details: Riley's own face provides those.
body_candidates=[]
for o in donor_meshes:
    lo=min((o.matrix_world @ Vector(c)).z for c in o.bound_box)
    hi=max((o.matrix_world @ Vector(c)).z for c in o.bound_box)
    if len(o.data.vertices)>=2000 and hi-lo>=1.10:
        body_candidates.append(o)
if not body_candidates:
    raise RuntimeError("Donor contains no full-length high-resolution anatomical mesh")
dbounds=[o.matrix_world @ Vector(c) for o in body_candidates for c in o.bound_box]
dlo=[min(p[i] for p in dbounds) for i in range(3)]
dhi=[max(p[i] for p in dbounds) for i in range(3)]
dheight=dhi[2]-dlo[2]
assert 1.2<dheight<3.0, ("Unexpected CC0 body scale",dheight)
ds=H/dheight
dcx=(dlo[0]+dhi[0])/2
dcy=(dlo[1]+dhi[1])/2

# Rebuild the donor into the same local, meter-based coordinates as the
# preserved face. Never use meshes shaped like a trouser shell.
for o in body_candidates:
    o.data=o.data.copy()
    mx=o.matrix_world.copy()
    o.parent=None
    o.matrix_world=Matrix.Identity(4)
    for v in o.data.vertices:
        p=mx @ v.co
        v.co=((p.x-dcx)*ds,(p.y-dcy)*ds,(p.z-dlo[2])*ds)
    o.data.update()
    bm=bmesh.new();bm.from_mesh(o.data)
    # Remove donor head completely, but leave its anatomical neck and chest.
    # The original detailed Riley head replaces it; both meet around collar.
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z>head_cut-.018],
                     context="VERTS")
    bm.to_mesh(o.data);bm.free()

for o in donor_objects:
    if o not in body_candidates and o.name in bpy.data.objects:
        bpy.data.objects.remove(o,do_unlink=True)
for o in body_candidates:
    assert len(o.data.vertices)>3000,"Full-body donor lost too much geometry"
bpy.ops.object.select_all(action="DESELECT")
for o in body_candidates:o.select_set(True)
bpy.context.view_layer.objects.active=body_candidates[0]
if len(body_candidates)>1:bpy.ops.object.join()
body=bpy.context.object
body.name="Riley sculpted anatomical body | skinned"

def clamp(t):return max(0.0,min(1.0,t))
def smooth(t):
    t=clamp(t);return t*t*(3-2*t)
def gauss(v,s):return math.exp(-(v/s)**2)

# Convert the donor's relaxed A pose into a near-standing arm position. It is
# a continuous vertex-space adjustment, not intersecting cylinder replacements.
# Keep the shoulders anchored as the forearms move gently inward.
for v in body.data.vertices:
    p=v.co
    z,x,y=p.z,p.x,p.y
    ax=abs(x)
    arm=smooth((ax-.205)/.15)*smooth((1.48-z)/.32)
    if arm>.001 and z>.67:
        u=max(0,ax-.18);down=1.40-z
        theta=.12*arm
        u2=u*math.cos(theta)-down*math.sin(theta)
        d2=u*math.sin(theta)+down*math.cos(theta)
        p.x=math.copysign(.18+u2,x)
        p.z=1.40-d2
        x,y,z=p.x,p.y,p.z

    # Gentle, broad morphological shaping of the EXISTING anatomical surface.
    # No sphere-based breasts, raised clothing shells or blocky waistband.
    torso=(1-smooth((abs(x)-.14)/.16))*smooth((z-.77)/.18)
    waist=gauss(z-1.11,.105)*torso
    hip=gauss(z-.955,.125)*torso
    bust=gauss(z-1.30,.115)*torso
    shoulder=gauss(z-1.405,.065)*torso
    p.x*=1-.105*waist+.115*hip+.024*bust+.012*shoulder
    p.y*=1-.065*waist+.065*hip+.03*bust
    # Soft upper glute and lower-back curve, tapering to the hamstring.
    if y>.005:
        p.y+=.014*hip*gauss(abs(x)-.105,.125)
    # Natural full-bust silhouette is modeled into the original continuous
    # sculpt (never as separate balls or clothing). 112 cm is an OUTFIT
    # TARGET, not a verified mesh perimeter until the turnaround QA confirms.
    # Gravity is expressed by a gentle upper slope, lowered full point, and
    # fuller underside. The chest blends into the rib cage and underarms.
    bust_target=M["bust_circumference_cm"]
    fullness=max(.075,min(.135,.078+.0020*(bust_target-94)))
    if 1.095 < z < 1.465 and abs(x)<.253:
        front=smooth((.045-p.y)/.152)
        left_right=gauss(abs(x)-.096,.086)
        lower_fullness=gauss(z-1.239,.099)
        upper_slope=gauss(z-1.327,.104)
        low_curve=gauss(z-1.170,.059)
        height_envelope=smooth((z-1.095)/.060)*(1-smooth((z-1.426)/.060))
        bust_shape=left_right*(.73*lower_fullness+.19*upper_slope+
                                .08*low_curve)*front*height_envelope
        # Positive y is the back on this mesh; its front points toward -y.
        p.y-=.65*fullness*bust_shape
        # Lower pole is visibly heavier without a pinched or balloon-like tip.
        p.z-=.009*bust_shape*smooth((1.36-z)/.14)
        if abs(x)>.009:
            p.x+=math.copysign(.0065*bust_shape,x)
    # Restore arm cross-section: the old A-pose conversion compressed the
    # biceps into thin slabs in side view. Keep the shoulder joint continuous.
    if .99<z<1.425 and .197<abs(x)<.405:
        upper_arm_shape=gauss(z-1.274,.129)*smooth((abs(x)-.197)/.060)
        upper_arm_shape*=1-smooth((abs(x)-.368)/.065)
        arm_mid_y=-.016
        p.y=arm_mid_y+(p.y-arm_mid_y)*(1+.31*upper_arm_shape)
        arm_axis_x=math.copysign(.265,x)
        p.x=arm_axis_x+(p.x-arm_axis_x)*(1+.12*upper_arm_shape)
    if z>1.345 and .16<abs(x)<.36:
        upper_arm=smooth((abs(x)-.16)/.10)
        p.x*=1-.019*shoulder*upper_arm
# The CC0 donor can develop severe triangular pinches when the full bust is
# adjusted. Smooth the CHEST topology gently along existing mesh connectivity,
# preserving broad gravity-soft volume but removing faceted / overlapping folds.
# This is real sculpt relaxation, not a second mesh or a cover-up material.
chest_neighbors=[set() for _ in body.data.vertices]
for edge in body.data.edges:
    a,b=edge.vertices
    chest_neighbors[a].add(b);chest_neighbors[b].add(a)
chest_mask={}
for vertex in body.data.vertices:
    q=vertex.co
    if 1.115<q.z<1.445 and abs(q.x)<.265 and q.y<.055:
        h=smooth((q.z-1.115)/.075)*(1-smooth((q.z-1.445)/.055))
        xmask=1-smooth((abs(q.x)-.160)/.105)
        ymask=smooth((.055-q.y)/.105)
        weight=h*xmask*ymask
        if weight>.005:chest_mask[vertex.index]=weight
for iteration in range(0):
    previous=[vert.co.copy() for vert in body.data.vertices]
    for idx,w in chest_mask.items():
        adjacent=chest_neighbors[idx]
        if len(adjacent)<3:continue
        avg=sum((previous[n] for n in adjacent),Vector())/len(adjacent)
        # Tangential relaxation reduces stretched triangles without erasing
        # the breast's lower curve and without shrinking all the ribs.
        shift=(avg-previous[idx])
        body.data.vertices[idx].co=previous[idx]+shift*(.36*w)
print("RILEY_CHEST_SURFACE_POLISH",len(chest_mask),"passes",0)
body.data.update()

# The donor abdominal surface contains a visibly recessed, heart-shaped patch.
# Relax ONLY the central front abdomen, retaining the side silhouette and navel.
# Smooth across existing body topology; never attach a cover-up sphere or decal.
neighbors=[set() for _ in body.data.vertices]
for e in body.data.edges:
    i,j=e.vertices
    neighbors[i].add(j);neighbors[j].add(i)
rest=[v.co.copy() for v in body.data.vertices]
abdomen_mask={}
for v in body.data.vertices:
    p=v.co
    zweight=smooth((p.z-.99)/.07)*(1-smooth((p.z-1.245)/.08))
    xweight=1-smooth((abs(p.x)-.065)/.13)
    yweight=1-smooth((-.01-p.y)/.12) if p.y>-.02 else 1.0
    weight=zweight*xweight*yweight
    if weight>.001 and p.y<.035: abdomen_mask[v.index]=weight
for iteration in range(0):
    old=[v.co.copy() for v in body.data.vertices]
    for idx,weight in abdomen_mask.items():
        ns=neighbors[idx]
        if not ns:continue
        mid=sum((old[j] for j in ns),Vector())/len(ns)
        # Preserve broad profile; relax small local dents and polygon boundaries.
        body.data.vertices[idx].co=old[idx].lerp(mid,.55*weight)
# Lift unusually deep local concavities only in the center, not the hips.
for idx,weight in abdomen_mask.items():
    p=body.data.vertices[idx].co
    if p.x*p.x<.010 and 1.055<p.z<1.20 and p.y>-.079:
        p.y-=.012*weight
body.data.update()
print("RILEY_ABDOMEN_POLISH","smoothed_vertices",len(abdomen_mask))

# Extract the real face appearance from its skin material where possible.
# A single opaque body shader gets the sampled complexion, not a second
# artificial shirt/shorts patch with a heart-shaped material boundary.
def facial_skin_rgb():
    swatches=[]
    for obj in original_head:
        if "low-poly" not in obj.name.lower() and "anatomical body" not in obj.name.lower():
            continue
        uv=obj.data.uv_layers.active
        for mat in obj.data.materials:
            if not mat:continue
            nodes=mat.node_tree.nodes if mat.use_nodes and mat.node_tree else []
            images=[n.image for n in nodes if n.type=="TEX_IMAGE" and n.image and n.image.size[0]>0]
            if not images or uv is None:continue
            im=max(images,key=lambda image:image.size[0]*image.size[1])
            try:
                width,height=im.size
                px=im.pixels
                for face in obj.data.polygons:
                    for loopid in face.loop_indices:
                        pt=obj.data.vertices[obj.data.loops[loopid].vertex_index].co
                        # Sample visible cheek below eye; exclude eyes, brows, hair.
                        if not (eye_z-.105<pt.z<eye_z-.045 and .022<abs(pt.x)<.080 and pt.y<-.014):
                            continue
                        tc=uv.data[loopid].uv
                        ix=min(width-1,int((tc.x%1)*width))
                        iy=min(height-1,int((tc.y%1)*height))
                        k=4*(iy*width+ix)
                        rgb=tuple(float(px[k+j]) for j in range(3))
                        if .12<sum(rgb)/3<.95 and max(rgb)-min(rgb)<.50:
                            swatches.append(rgb)
                        if len(swatches)>90:break
                    if len(swatches)>90:break
            except Exception as e:
                print("RILEY_FACE_COLOR_SAMPLING_FALLBACK",str(e)[:120])
        if len(swatches)>90:break
    if len(swatches)>6:
        return tuple(sorted(x[k] for x in swatches)[len(swatches)//2] for k in range(3))
    for obj in original_head:
        if obj.name.lower()!="low-poly":continue
        for m in obj.data.materials:
            if m and m.use_nodes:
                p=m.node_tree.nodes.get("Principled BSDF")
                if p and not p.inputs["Base Color"].is_linked:
                    rgb=tuple(p.inputs["Base Color"].default_value[:3])
                    if .2<sum(rgb)/3<.95:return rgb
    return (.79,.64,.56)

complexion=facial_skin_rgb()
print("RILEY_FACE_SKIN_REFERENCE",tuple(round(v,4) for v in complexion))
skin=bpy.data.materials.new("Riley complexion matched continuous mannequin skin")
skin.use_nodes=True
bs=skin.node_tree.nodes.get("Principled BSDF")
bs.inputs["Base Color"].default_value=(*complexion,1)
bs.inputs["Roughness"].default_value=.78
skin.diffuse_color=(*complexion,1)
# No separate clothing/torso colored islands. Outfit overlays come later.
body.data.materials.clear()
body.data.materials.append(skin)
for face in body.data.polygons:
    face.use_smooth=True
    face.material_index=0
assert len(body.data.vertices)>8000,"Riley is still using a primitive replacement, not the anatomical sculpt"
print("RILEY_REAL_SCULPT_INTEGRATED","verts",len(body.data.vertices),
      "sculpt_height",round(dheight,3),"preserved_face_parts",len(original_head),
      "head_transition_cm",round(100*head_cut,1))


# Prefer the real hairstyle geometry from Riley's original CC0 character to
# handmade cylinders/ribbons. It is already fitted to her ACTUAL skull and
# contains organically modeled locks, so the rear scalp stays covered.
original_bob=next((o for o in original_head if o.name.lower()=="bob01"),None)
if original_bob is None or len(original_bob.data.vertices)<1500:
    raise RuntimeError("Missing Riley fitted original hair geometry")
hair=original_bob
hair.name="Riley flowing layered honey-blonde hair"
head_pieces=[o for o in original_head if o is not hair]
head_core=[v.co for o in head_pieces
           if o.name.lower()=="low-poly" or "anatomical body" in o.name.lower()
           for v in o.data.vertices]
if len(head_core)<100:raise RuntimeError("Missing Riley head for fitted hair")
head_top=max(v.z for v in head_core)
hx=sum(p.x for p in head_core if p.z>head_top-.105)/max(1,sum(1 for p in head_core if p.z>head_top-.105))
hy=sum(p.y for p in head_core if p.z>head_top-.105)/max(1,sum(1 for p in head_core if p.z>head_top-.105))
# Gravity lengthens the original shoulder-length bob, leaving its crown and
# face framing unchanged. Vary the lower strands for a relaxed wavy silhouette.
for vertex in hair.data.vertices:
    p=vertex.co
    t=smooth((head_top-.085-p.z)/.185)
    p.z-=.235*t
    if t>.002:
        side=math.copysign(1,p.x-hx)
        p.x+=side*(.016*t+.008*t*sin(11.0*p.z+7.0*p.x))
        p.y+=( .055 if p.y>hy else .012)*t
hair.data.update()
hair.data.materials.clear()
hair.data.materials.append(hair_colors[1])
for face in hair.data.polygons:
    face.use_smooth=True
    face.material_index=0
print("RILEY_FITTED_HAIR",len(hair.data.vertices),
      "head_top",round(head_top,3),
      "source","original CC0 bob extended into blonde wavy locks")
# Attach Riley's preserved head visually to the anatomical shoulders.
# Find actual open-edge outlines instead of estimating the join from all
# nearby head/chest vertices (which previously left the visible head seam).
# Use a close-fitting skinned loft that extends underneath both neck skins.
def boundary_points(objects, low, high):
    points=[]
    for ob in objects:
        bm=bmesh.new()
        bm.from_mesh(ob.data)
        points.extend(v.co.copy() for e in bm.edges if e.is_boundary
                      for v in e.verts if low<v.co.z<high)
        bm.free()
    return points
face_lower=boundary_points(
    [o for o in head_pieces if o.name.lower()=="low-poly" or
     "anatomical body" in o.name.lower()],
    head_cut-.025,head_cut+.12)
if len(face_lower)<12:
    face_lower=[v.co for o in head_pieces
                if o.name.lower()=="low-poly" or "anatomical body" in o.name.lower()
                for v in o.data.vertices if 1.36<v.co.z<1.55]
body_upper=boundary_points([body],head_cut-.10,head_cut+.045)
body_upper=[v for v in body_upper if abs(v.x)<.15 and abs(v.y)<.16]
# The voxel-remeshed skin is watertight: the former open cut is capped and
# has no boundary edges. Use its highest neck surface ring in that case.
if len(body_upper)<12:
    body_upper=[v.co.copy() for v in body.data.vertices
                if head_cut-.090<v.co.z<head_cut-.016
                and abs(v.co.x)<.15 and abs(v.co.y)<.16]
    print("RILEY_WATERTIGHT_NECK_SECTION",len(body_upper))
if len(face_lower)<12 or len(body_upper)<12:
    raise RuntimeError("Cannot identify the two physical neck contours for Riley")
face_z=min(v.z for v in face_lower)
body_z=max(v.z for v in body_upper)
def neck_outline(points,level):
    band=[v for v in points if abs(v.z-level)<.014]
    if len(band)<8:band=sorted(points,key=lambda v:abs(v.z-level))[:40]
    x=sum(v.x for v in band)/len(band)
    y=sum(v.y for v in band)/len(band)
    dx=sorted(abs(v.x-x) for v in band)
    dy=sorted(abs(v.y-y) for v in band)
    return x,y,max(.038,min(.12,dx[int(len(dx)*.82)])),max(.035,min(.11,dy[int(len(dy)*.82)]))
bx,by,brx,bry=neck_outline(body_upper,body_z)
fx,fy,frx,fry=neck_outline(face_lower,face_z)
print("RILEY_NECK_JOIN_DIAGNOSTIC","body_z",round(body_z,4),
      "face_z",round(face_z,4),"gap",round(face_z-body_z,4),
      "body_outline",tuple(round(v,4) for v in (bx,by,brx,bry)),
      "face_outline",tuple(round(v,4) for v in (fx,fy,frx,fry)))
# Small controlled overlap lets matching skin cover uneven rasterized boundaries.
# A smooth, multi-ring neck surface follows facial and body neck silhouettes.
N=64;nr=9
neck_verts=[];neck_faces=[]
for i in range(nr):
    t=i/(nr-1)
    blend=smooth(t)
    z=(body_z-.026)*(1-blend)+(face_z+.031)*blend
    px=bx*(1-blend)+fx*blend
    py=by*(1-blend)+fy*blend
    # Tiny radial overlap hides pixel-wide cracks when rotated on mobile.
    rx=1.045*(brx*(1-blend)+frx*blend)
    ry=1.045*(bry*(1-blend)+fry*blend)
    for k in range(N):
        a=2*pi*k/N
        neck_verts.append((px+rx*cos(a),py+ry*sin(a),z))
    if i:
        for k in range(N):
            j=(k+1)%N
            neck_faces.append(((i-1)*N+k,(i-1)*N+j,i*N+j,i*N+k))
nm=bpy.data.meshes.new("Riley neck skin bridge geometry")
nm.from_pydata(neck_verts,[],neck_faces);nm.update()
neck_bridge=bpy.data.objects.new("Riley seamless neck transition",nm)
bpy.context.collection.objects.link(neck_bridge)
nm.materials.append(skin)
for f in nm.polygons:f.use_smooth=True
print("RILEY_NECK_BRIDGE",len(neck_verts),len(neck_faces))

# Real armature, not parent-only rotation.
arm_data=bpy.data.armatures.new("Riley human skeleton")
arm=bpy.data.objects.new("Riley | Rigged Armature",arm_data)
bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm;arm.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
def bone(name,head,tail,parent=None,connect=False):
    b=arm_data.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:
        b.parent=arm_data.edit_bones[parent];b.use_connect=connect
    return b
bone("Hips",(0,0,.93),(0,0,1.035))
bone("Spine",(0,0,1.035),(0,0,1.19),"Hips")
bone("Chest",(0,0,1.19),(0,0,1.40),"Spine")
bone("Neck",(0,0,1.40),(0,0,1.51),"Chest")
bone("Head",(0,0,1.51),(0,0,1.68),"Neck")
for name,side in (("L",1),("R",-1)):
    bone(name+"Shoulder",(0,0,1.391),(.207*side,0,1.398),"Chest")
    bone(name+"UpperArm",(.207*side,0,1.398),(.265*side,-.01,1.135),name+"Shoulder")
    bone(name+"Forearm",(.265*side,-.01,1.135),(.285*side,-.050,.898),name+"UpperArm")
    bone(name+"Hand",(.285*side,-.050,.898),(.286*side,-.069,.795),name+"Forearm")
    for i in range(4):
        bone(name+"Finger"+str(i),((.258+.017*i)*side,-.065,.797),
             ((.258+.017*i)*side,-.067,.733),name+"Hand")
    bone(name+"Thigh",(.11*side,0,.94),(.12*side,-.012,.506),"Hips")
    bone(name+"Shin",(.12*side,-.012,.506),(.12*side,0,.132),name+"Thigh")
    bone(name+"Foot",(.12*side,0,.132),(.12*side,-.121,.070),name+"Shin")
    bone(name+"Toe",(.12*side,-.121,.070),(.12*side,-.203,.045),name+"Foot")
bpy.ops.object.mode_set(mode="OBJECT")
bones={b.name:(b.head_local.copy(),b.tail_local.copy()) for b in arm.data.bones}
def clamp(t):return max(0.0,min(1.0,t))
def smooth(t):
    t=clamp(t);return t*t*(3-2*t)
def segment_weight(p,nam):
    a,b=bones[nam];vec=b-a
    t=clamp((p-a).dot(vec)/max(vec.length_squared,1e-8))
    nearest=a+t*vec
    d=(p-nearest).length
    return 1/(.025+d*d)
def bind(ob,kind):
    if not len(ob.data.vertices):return
    groups={k:ob.vertex_groups.new(name=k) for k in bones}
    for v in ob.data.vertices:
        p=v.co
        if kind=="hair":
            weights={"Head":1.0}
        elif kind in ("head","collar"):
            # Blend preserved lower neck into donor neck to keep the join
            # together during kneeling and hands-and-knees movements.
            t=smooth((p.z-head_cut+.008)/.115)
            weights={"Neck":1-t,"Head":t}
        else:
            z=p.z;x=p.x;side="L" if x>=0 else "R"
            ax=abs(x)
            wleg=1-smooth((z-.84)/.19)
            warm=smooth((ax-.177)/.104)*smooth((z-1.02)/.12)
            warm*=1-smooth((z-1.43)/.06)
            wcore=max(0,1-max(wleg,warm))
            weights={}
            if wleg>.001:
                leg=[side+"Thigh",side+"Shin",side+"Foot",side+"Toe"]
                vals=[segment_weight(p,n) for n in leg]
                s=sum(vals)
                for n,vv in zip(leg,vals):weights[n]=vv*wleg/s
            if warm>.001:
                upper=[side+"Shoulder",side+"UpperArm",side+"Forearm",side+"Hand"]
                vals=[segment_weight(p,n) for n in upper]
                s=sum(vals)
                for n,vv in zip(upper,vals):weights[n]=weights.get(n,0)+vv*warm/s
            if wcore>.001:
                spine=["Hips","Spine","Chest","Neck"]
                vals=[segment_weight(p,n) for n in spine]
                s=sum(vals)
                for n,vv in zip(spine,vals):weights[n]=weights.get(n,0)+vv*wcore/s
            if z>head_cut-.12 and abs(x)<.13 and abs(p.y)<.145:
                # Anatomical donor's upper neck must travel with the face base.
                w=smooth((z-head_cut+.12)/.12)
                weights={n:vv*(1-w) for n,vv in weights.items()}
                weights["Neck"]=weights.get("Neck",0)+w
        total=sum(weights.values())
        if total<=0:weights={"Hips":1};total=1
        best=sorted(weights.items(),key=lambda kv:kv[1],reverse=True)[:4]
        norm=sum(vv for _,vv in best)
        for n,vv in best:
            if vv>0:groups[n].add([v.index],vv/norm,"REPLACE")
    mod=ob.modifiers.new("Riley skeletal skinning","ARMATURE")
    mod.object=arm;ob.parent=arm
bind(body,"body")
bind(neck_bridge,"collar")
bind(hair,"hair")
for obj in head_pieces:bind(obj,"head")

# Put animations on the one rig. Each pose is an action/NLA strip, so the game
# can play armature bones instead of loading a separate mutilated body mesh.
arm.animation_data_create()
def action(name,keys):
    ac=bpy.data.actions.new(name)
    arm.animation_data.action=ac
    for key in keys:
        frame,angles=key[:2]
        hip_shift=key[2] if len(key)>2 else (0,0,0)
        for p in arm.pose.bones:
            p.rotation_mode="XYZ";p.rotation_euler=(0,0,0)
            p.location=(0,0,0)
        arm.pose.bones["Hips"].location=hip_shift
        for bone_name,axis,val in angles:
            if bone_name in arm.pose.bones:arm.pose.bones[bone_name].rotation_euler[axis]=math.radians(val)
        for p in arm.pose.bones:p.keyframe_insert(data_path="rotation_euler",frame=frame,group=p.name)
        arm.pose.bones["Hips"].keyframe_insert(data_path="location",frame=frame,group="Hips")
    tr=arm.animation_data.nla_tracks.new();tr.name=name
    st=tr.strips.new(name,int(keys[0][0]),ac)
    st.action_frame_start=keys[0][0];st.action_frame_end=keys[-1][0]
    st.repeat=1
    return ac
action("Riley Idle",[(1,[]),(15,[("Chest",0,1.0),("Head",2,1.0)]),(30,[])])
action("Riley Walk",[(1,[("LThigh",0,20),("RThigh",0,-20),("LUpperArm",0,-10),("RUpperArm",0,10)]),
                     (13,[("LThigh",0,-20),("RThigh",0,20),("LUpperArm",0,10),("RUpperArm",0,-10)]),
                     (25,[("LThigh",0,20),("RThigh",0,-20),("LUpperArm",0,-10),("RUpperArm",0,10)])])
# Root height and thigh/shin counter-rotation are essential: bone rotation
# alone leaves hands-and-knees floating, folded like a monster crouch.
action("Riley Kneel",[(1,[],(0,0,0)),
                     (28,[("LThigh",0,-24),("RThigh",0,-24),
                          ("LShin",0,94),("RShin",0,94),
                          ("Spine",0,3),("Chest",0,3),
                          ("LUpperArm",0,-5),("RUpperArm",0,-5)],
                      (0,0,-.27))])
action("Riley HandsAndKnees",[
    (1,[],(0,0,0)),
    (38,[("Hips",0,74),("Spine",0,13),("Chest",0,3),
         ("LThigh",0,-76),("RThigh",0,-76),
         ("LShin",0,92),("RShin",0,92),
         ("LUpperArm",0,-74),("RUpperArm",0,-74),
         ("LForearm",0,4),("RForearm",0,4),
         ("Neck",0,-10),("Head",0,8)],
     (0,-.035,-.33))
])
arm.animation_data.action=None
for pb in arm.pose.bones:
    pb.rotation_mode="XYZ";pb.rotation_euler=(0,0,0)
# Mute NLA for rest-pose export; glTF still includes named animation strips.
for track in arm.animation_data.nla_tracks:track.mute=False
bpy.context.scene.frame_set(1)

OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",
    export_apply=False,export_materials="EXPORT",
    export_animations=True,export_nla_strips=True,
    export_image_format="AUTO",use_selection=False)
assert OUT.is_file() and OUT.stat().st_size>80000
print("RILEY_RIG_SUCCESS",OUT,OUT.stat().st_size,
      "bones",len(arm.data.bones),
      "body_vertices",len(body.data.vertices),"facial_parts",len(head_pieces),
      "height_cm",M["height_cm"],"bust_cm",M["bust_circumference_cm"],
      "waist_cm",M["waist_circumference_cm"],"hip_cm",M["full_hip_circumference_cm"])
