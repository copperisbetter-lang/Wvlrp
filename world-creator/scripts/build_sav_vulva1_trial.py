"""Isolated Sav adult MakeHuman Vulva1 mesh-fitting QA. Never changes the original Sav GLB.
Uses Thomas Larsson's original MakeHuman Vulva1 vertices/faces/UVs already
retained under world-creator/assets/riley-vulva1-source.json (AGPL-3).
Unlike the Riley trial, fits to the *actual* imported Sav body and pelvis.
Not an automatically approved cosmetic/anatomical final model.
"""
import bpy
import json
import math
import struct
from pathlib import Path
from collections import Counter
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "sav-realistic-shell.glb"
DONOR = ROOT / "assets" / "riley-vulva1-source.json"
OUT = ROOT / "assets" / "sav-vulva1-trial.glb"
if not SOURCE.is_file() or SOURCE.stat().st_size < 500_000:
    raise RuntimeError("Published Sav human-shell GLB missing; refuse placeholder mesh")
data = json.loads(DONOR.read_text())
geo = data["mesh"]
if "Vulva 1" not in data["name"] or len(geo["vertices"]) != 181 or len(geo["faces"]) != 168:
    raise RuntimeError("Original MakeHuman Vulva1 source failed provenance/topology gate")
if len(geo["uv_faces"]) != len(geo["faces"]):
    raise RuntimeError("Vulva1 UV topology mismatch")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE.resolve()))
rigs = [o for o in bpy.data.objects if o.type == "ARMATURE" and
        len(o.data.bones) == 56 and "Pelvis" in o.data.bones]
if len(rigs) != 1:
    raise RuntimeError("Sav 56-bone armature missing or ambiguous")
rig = rigs[0]
all_meshes = [o for o in bpy.data.objects if o.type == "MESH"]
if any("vulva2" in o.name.lower() for o in bpy.data.objects):
    raise RuntimeError("Vulva2 contamination in base Sav GLB")
# Prefer source basemesh; a GLB import can prefix object names.
bodies = sorted([o for o in all_meshes if len(o.data.vertices) > 10_000],
                key=lambda o: ("basemesh" in o.name.lower(), len(o.data.vertices)),
                reverse=True)
if not bodies:
    raise RuntimeError("Continuous high-resolution Sav body missing")
body = bodies[0]
if not body.data.materials or body.data.materials[0] is None:
    raise RuntimeError("Sav source skin material missing")
if any("vulva1" in o.name.lower() for o in bpy.data.objects):
    raise RuntimeError("Sav already contains a Vulva1 overlay; refusing duplicate")

# Prevent the *old sculpt controls* from superimposing a second labial relief.
# Keep all unrelated Sav body/face morphs and skeletal clips intact.
if body.data.shape_keys:
    for block in list(body.data.shape_keys.key_blocks):
        if block.name in ("Labia_Left_Open", "Labia_Right_Open"):
            body.shape_key_remove(block)
    for block in body.data.shape_keys.key_blocks:
        block.value = 0.0

bpy.context.scene.frame_set(0)
bpy.context.view_layer.update()
pelvis_z = (rig.matrix_world @ rig.data.bones["Pelvis"].head_local).z
body_world = body.matrix_world.copy()
inv = body_world.inverted_safe()

def front_surface_y(x, z):
    # Front faces negative Y for the current Sav skeleton.
    origin = Vector((x, -2.0, z))
    direction = Vector((0, 1, 0))
    hit, point, normal, face = body.ray_cast(inv @ origin, inv.to_3x3() @ direction)
    if not hit:
        return None
    result = body_world @ point
    if abs(result.x - x) > .004 or abs(result.z - z) > .004:
        return None
    return float(result.y)

# Sav v3: donor Vulva1 includes a folded torso patch. Directly reusing
# its faces and shrinking the source caused overlapping, hanging flaps.
# Derive central proportions from the verified source, but replace its
# folded patch topology with a continuous, smooth quad surface.
# Fit that surface to Sav's real body, using her own UVs and Pelvis bone.
original=[tuple(map(float,row)) for row in geo["vertices"]]
reference=[p for p in original if .44 <= p[2] <= .82 and abs(p[0]) <= .19]
if len(reference)<45:
    raise RuntimeError("MakeHuman Vulva1 reference landmarks missing")
xmin=min(p[0] for p in reference);xmax=max(p[0] for p in reference)
zmin=min(p[2] for p in reference);zmax=max(p[2] for p in reference)
if xmax-xmin < .30 or zmax-zmin < .30:
    raise RuntimeError("MakeHuman Vulva1 reference dimensions invalid")
target_width=.080
target_height=.080
center_z=pelvis_z-.205
hip_band=sorted(abs((body_world@v.co).x) for v in body.data.vertices
    if abs((body_world@v.co).z-(pelvis_z+.015))<.035
    and abs((body_world@v.co).x)<.32)
if len(hip_band)<40 or not (.6<center_z<.95):
    raise RuntimeError("Sav pelvic proportions outside fit bounds")
hip_half=hip_band[int(.85*(len(hip_band)-1))]
if body.data.uv_layers.active is None:
    raise RuntimeError("Sav basemesh missing skin UV layer")
skin_uv=body.data.uv_layers.active
body.data.calc_loop_triangles()
triangle_map={}
for tri in body.data.loop_triangles:
    triangle_map.setdefault(tri.polygon_index,[]).append(tri)

def skin_surface(x,z):
    origin=Vector((x,-2,z))
    hit,point,normal,poly_index=body.ray_cast(inv@origin,inv.to_3x3()@Vector((0,1,0)))
    if not hit:
        return None
    world=body_world@point
    if abs(world.x-x)>.004 or abs(world.z-z)>.004:
        return None
    for tri in triangle_map.get(poly_index,[]):
        a,b,c=[body.data.vertices[i].co for i in tri.vertices]
        e1=b-a;e2=c-a;p=point-a
        d11=e1.dot(e1);d12=e1.dot(e2);d22=e2.dot(e2)
        d1=p.dot(e1);d2=p.dot(e2);det=d11*d22-d12*d12
        if abs(det)<1e-15:continue
        v=(d22*d1-d12*d2)/det
        w=(d11*d2-d12*d1)/det
        if v>=-.02 and w>=-.02 and v+w<=1.02:
            uv0,uv1,uv2=[skin_uv.data[i].uv for i in tri.loops]
            uv=uv0*(1-v-w)+uv1*v+uv2*w
            return (float(world.y),(float(uv.x),float(uv.y)))
    return None

nx,nz=25,35
samples=[]
for j in range(nz):
    t=j/(nz-1)
    taper=max(0.,math.sin(math.pi*t))**.65
    half_width=.0015+(.5*target_width-.0015)*taper
    z=center_z+(t-.5)*target_height
    for i in range(nx):
        s=2*i/(nx-1)-1
        x=s*half_width
        samples.append((x,z,skin_surface(x,z),s,t))
hits=[(x,z,m[0],m[1]) for x,z,m,s,t in samples if m is not None]
upper=[r for r in samples if r[4]>.78]
if len(hits)<len(samples)*.25 or sum(r[2] is not None for r in upper)<len(upper)*.60:
    raise RuntimeError("Sav pubic skin coverage insufficient for reliable fit")
positions=[];uv_by_vertex=[];max_gap=0;unsupported=0
for x,z,m,s,t in samples:
    if m is None:
        unsupported+=1
        near=sorted(hits,key=lambda h:(h[0]-x)**2+(h[1]-z)**2)[:6]
        gap=math.hypot(near[0][0]-x,near[0][1]-z)
        max_gap=max(max_gap,gap)
        weights=[1/max(.003,math.hypot(h[0]-x,h[1]-z)) for h in near]
        y=sum(h[2]*w for h,w in zip(near,weights))/sum(weights)
        uv=near[0][3]
    else:
        y,uv=m;gap=0
    feather=max(0.,math.sin(math.pi*t))**.7 * max(0.,1-abs(s)**8)
    outer=math.exp(-((abs(x)-.018)/.011)**2)
    inner=math.exp(-((abs(x)-.007)/.0055)**2)
    relief=feather*(.0025*outer+.0014*inner)
    positions.append((x,y-relief+min(.009,gap*.28)+.0006,z))
    uv_by_vertex.append(uv)
if max_gap>.080:
    raise RuntimeError("Unsupported Sav underside bridge %.4f m" % max_gap)
faces=[]
for j in range(nz-1):
    for i in range(nx-1):
        a=j*nx+i
        faces.append((a,a+1,a+nx+1,a+nx))
mesh=bpy.data.meshes.new("Sav Vulva1 continuous quad retopology")
mesh.from_pydata(positions,[],faces)
mesh.update()
skin=body.data.materials[0].copy()
skin.name="Sav original skin mapped Vulva1"
mesh.materials.append(skin)
uv=mesh.uv_layers.new(name="Sav projected source-skin UV")
for face in mesh.polygons:
    for li in face.loop_indices:
        uv.data[li].uv=uv_by_vertex[mesh.loops[li].vertex_index]
    face.use_smooth=True

edge_uses=Counter(tuple(sorted((a,b))) for p in mesh.polygons
                  for a,b in zip(list(p.vertices),list(p.vertices)[1:]+list(p.vertices)[:1]))
boundary={i for (i,j),n in edge_uses.items() if n==1}|{
         j for (i,j),n in edge_uses.items() if n==1}
if len(boundary)!=2*nx+2*nz-4:
    raise RuntimeError("Fitted Vulva1 surface is not a single connected patch")

addon=bpy.data.objects.new("Sav Vulva1 MakeHuman fitted",mesh)
bpy.context.collection.objects.link(addon)
addon["makehuman_source_uuid"]=data["source_uuid"]
addon["makehuman_original_vertex_count"]=181
addon["sav_trial_only"]=True
addon["fit_version"]="v3 smooth connected mesh"
addon.shape_key_add(name="Basis",from_mix=False)
for morph_name,x_at,amplitude in (
    ("Vulva1_Outer_Fullness",.018,.013),
    ("Vulva1_Inner_Fullness",.007,.008)):
    key=addon.shape_key_add(name=morph_name,from_mix=False)
    count=0
    for i,v in enumerate(mesh.vertices):
        if i in boundary:continue
        p=v.co
        influence=(math.exp(-((abs(p.x)-x_at)/.013)**2)
                   * math.exp(-((p.z-center_z)/.035)**4))
        if influence>.025:
            key.data[i].co.y-=amplitude*influence
            count+=1
    if count<20:raise RuntimeError("Morph missing from Sav fit: "+morph_name)
print("SAV_VULVA1_V3_SMOOTH_FIT","body_skin_hits",len(hits),
      "unsupported",unsupported,"max_gap",round(max_gap,4),
      "quad_faces",len(faces),"mesh_verts",len(mesh.vertices))
# Fix geometry to one bone: pelvis *only*, never left/right thigh weights.
# Match transform convention of earlier licensed Riley skinning trial.
inverse_rig=rig.matrix_world.inverted_safe()
# Convert Basis AND fullness morphs into rig space together. Converting
# only mesh.vertices can leave morph targets in donor/world coordinates,
# producing enormous spikes as soon as a fullness slider is moved.
if addon.data.shape_keys:
    for block in addon.data.shape_keys.key_blocks:
        for point in block.data:
            point.co=inverse_rig @ point.co
else:
    for v in addon.data.vertices:
        v.co=inverse_rig @ v.co
addon.parent=rig
addon.matrix_world=rig.matrix_world.copy()
group=addon.vertex_groups.new(name="Pelvis")
group.add(list(range(len(mesh.vertices))),1.0,"REPLACE")
mod=addon.modifiers.new("Sav Pelvis only; no thigh split","ARMATURE")
mod.object=rig
if len([g for g in addon.vertex_groups if g.name in ("Pelvis","LThigh","RThigh")])!=1:
    raise RuntimeError("Donor weights must be pelvis-only")

bpy.context.view_layer.update()
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
# All source character meshes and armature, including donor; no stale proxy.
for o in bpy.data.objects:
    if o.type in {"MESH","ARMATURE","EMPTY"}:
        o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT.resolve()),export_format="GLB",
                          export_animations=True,export_skins=True,
                          export_nla_strips=True,export_apply=False,
                          use_selection=True)
if not OUT.is_file() or OUT.stat().st_size < 500_000:
    raise RuntimeError("Sav Vulva1 3D export missing or incomplete")
raw=OUT.read_bytes()
if raw[:4]!=b"glTF":
    raise RuntimeError("Invalid Sav GLB magic")
size,kind=struct.unpack_from("<II",raw,12)
if kind!=0x4e4f534a:
    raise RuntimeError("Sav GLB JSON chunk invalid")
gltf=json.loads(raw[20:20+size])
nodes=[node.get("name","") for node in gltf.get("nodes",[])]
if sum("Sav Vulva1 MakeHuman fitted" in n for n in nodes)!=1:
    raise RuntimeError("Exactly one real Vulva1 addon must exist in exported GLB")
if any("vulva2" in n.lower() for n in nodes):
    raise RuntimeError("Unexpected Vulva2 node in Sav isolated output")
if not any(len(s.get("joints",[]))==56 for s in gltf.get("skins",[])):
    raise RuntimeError("Lost Sav 56-joint skeleton")
if not gltf.get("animations"):
    raise RuntimeError("Lost Sav pose actions")
print("SAV_VULVA1_MEASUREMENTS",{
    "pelvis_bone_z":round(pelvis_z,4),
    "center_z":round(center_z,4),
    "hip_half_width":round(hip_half,4),
    "original_source_span_x":round(xmax-xmin,4),
    "original_source_span_z":round(zmax-zmin,4),
    "final_width_m":round(target_width,4),
    "final_height_m":round(target_height,4),
    "actual_body_raycast_hits":len(hits),
    "interpolated_vertices":unsupported,
    "max_open_gap":round(max_gap,4),
    "body_vertices":len(body.data.vertices)})
print("SAV_VULVA1_FITTING_SUCCESS",OUT,OUT.stat().st_size,
      "original_vertices",len(original),"original_faces",len(geo["faces"]),
      "connected_faces",len(faces),"fitted_vertices",len(mesh.vertices),
      "rig_bones",len(rig.data.bones),
      "animations",len(gltf.get("animations",[])),
      "no_vulva2",True)
