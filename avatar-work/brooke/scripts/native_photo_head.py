"""Transfer photo face depth and colors to a native Brooke head/neck candidate.
Only a cropped head asset is exported. The original clone is read-only.
Usage: blender -b --python native_photo_head.py -- base.glb photo.obj out.glb
"""
import bpy, bmesh, sys, json, hashlib, math
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
base, photo, output=sys.argv[sys.argv.index('--')+1:][:3]
out=Path(output); out.parent.mkdir(parents=True,exist_ok=True)
source_hash=hashlib.sha256(Path(base).read_bytes()).hexdigest()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=base); bpy.context.view_layer.update()
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
def head_weight_count(obj):
    ids={g.index for g in obj.vertex_groups if g.name.lower().split(':')[-1]=='head'}
    return sum(any(g.group in ids and g.weight>=.5 for g in v.groups) for v in obj.data.vertices)
skin=max(meshes,key=head_weight_count)
eyes=[o for o in meshes if 'eye' in o.name.lower()]
assert eyes,'Native eye geometry is missing'
# Keep head, native eyes and hair, with a collar-height crop below the neck.
cutoff=1.35
for obj in list(meshes):
    if obj!=skin and obj not in eyes and 'long01' not in obj.name.lower():
        bpy.data.objects.remove(obj,do_unlink=True); continue
    bm=bmesh.new(); bm.from_mesh(obj.data)
    low=[v for v in bm.verts if (obj.matrix_world@v.co).z<cutoff]
    bmesh.ops.delete(bm,geom=low,context='VERTS')
    bm.to_mesh(obj.data); bm.free(); obj.data.update()
# OBJ retains the reconstruction's original sampled RGB, unlike the old shell.
points=[]; colors=[]; faces=[]
for line in Path(photo).read_text().splitlines():
    p=line.split()
    if not p: continue
    if p[0]=='v':
        points.append(tuple(map(float,p[1:4])))
        colors.append(tuple(map(float,p[4:7])) if len(p)>=7 else (.65,.5,.4))
    elif p[0]=='f': faces.append(tuple(int(t.split('/')[0])-1 for t in p[1:]))
src=np.asarray(points); rgb=np.asarray(colors)
ids=json.loads(Path(__file__).with_name('brooke-photo-keypoints.json').read_text())['indices_68']
assert len(src)==38365 and len(ids)==68,'Unexpected source topology; refuse silent correspondence'
source_eyes=np.array([src[ids[36:42]].mean(0),src[ids[42:48]].mean(0)])
source_mid=source_eyes.mean(0)
native_eye_pts=[o.matrix_world@v.co for o in eyes for v in o.data.vertices]
native_eye_centers=[]
for sign in [-1,1]:
    pts=[p for p in native_eye_pts if p.x*sign>0]
    assert len(pts)>20
    native_eye_centers.append(Vector(tuple(sum(p[i] for p in pts)/len(pts) for i in range(3))))
native_mid=(native_eye_centers[0]+native_eye_centers[1])*.5
native_ipd=abs(native_eye_centers[1].x-native_eye_centers[0].x)
scale=native_ipd/abs(source_eyes[1,0]-source_eyes[0,0])
assert .00005<scale<.001,'Photo scale outside expected range'
# Source Y-up/+Z-forward -> Blender Z-up/-Y-forward. Use native eyeball
# anterior surface to anchor the photo's eyelid landmark depth.
eye_front=min(p.y for p in native_eye_pts)
aligned=[Vector(((p[0]-source_mid[0])*scale+native_mid.x,
                 -(p[2]-source_mid[2])*scale+eye_front,
                 (p[1]-source_mid[1])*scale+native_mid.z)) for p in src]
bvh=BVHTree.FromPolygons(aligned,faces,all_triangles=True)
# Texture samples use the same aligned projection as the geometry.
kd=KDTree(len(aligned))
for i,p in enumerate(aligned):kd.insert(Vector((p.x,p.z,0)),i)
kd.balance()
skin.shape_key_add(name='Basis')
morph=skin.shape_key_add(name='Brooke photo depth fit')
morph.value=1.0
vertex_colors=skin.data.vertex_colors.new(name='BrookePhotoRGB')
original=[v.co.copy() for v in skin.data.vertices]
mask=np.zeros(len(original)); mapped_rgb=np.zeros((len(original),3))
inverse=skin.matrix_world.inverted()
max_delta=0; changed=0
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a))); return t*t*(3-2*t)
chin=aligned[ids[8]].z
for i,v in enumerate(skin.data.vertices):
    p=skin.matrix_world@v.co
    # No changes to neck, rear skull, ears, or eye contact surfaces.
    neck_fade=smooth(chin-.006,chin+.022,p.z)
    front_fade=1-smooth(eye_front+.015,eye_front+.055,p.y)
    side_fade=1-smooth(.060,.085,abs(p.x-native_mid.x))
    eye_distance=min(math.hypot(p.x-e.x,p.z-e.z) for e in native_eye_centers)
    socket_fade=smooth(.015,.027,eye_distance)
    weight=neck_fade*front_fade*side_fade
    if weight<.001:continue
    hit,normal,face_index,dist=bvh.ray_cast(Vector((p.x,-1,p.z)),Vector((0,1,0)),2)
    if hit is None:continue
    # Bounded first pass: source depth drives the existing native surface.
    delta=max(-.008,min(.008,hit.y-p.y))*.65*weight*socket_fade
    if abs(delta)>.00001:
        morph.data[i].co=inverse@Vector((p.x,p.y+delta,p.z))
        max_delta=max(max_delta,abs(delta)); changed+=1
    neighbors=kd.find_n(Vector((p.x,p.z,0)),4)
    ws=np.array([1/max(d,.0005)**2 for _,_,d in neighbors])
    color=np.average(rgb[[idx for _,idx,_ in neighbors]],axis=0,weights=ws)
    # Reduce baked photographic shadow contrast before blending with native skin.
    color=np.clip(np.power(np.clip(color,.035,1),.75)*np.array([1.0,1.08,1.16]),0,1)
    # OBJ RGB samples are sRGB; Blender color attributes store linear values.
    mapped_rgb[i]=np.where(color<=.04045,color/12.92,((color+.055)/1.055)**2.4)
    mask[i]=weight*.50
for polygon in skin.data.polygons:
    for loop_index in polygon.loop_indices:
        i=skin.data.loops[loop_index].vertex_index
        vertex_colors.data[loop_index].color=(*mapped_rgb[i],float(mask[i]))
# Blend photo color over the existing native skin; UVs and body texture stay intact.
for slot in skin.material_slots:
    if not slot.material:continue
    mat=slot.material.copy(); slot.material=mat; mat.use_nodes=True
    nodes=mat.node_tree.nodes; links=mat.node_tree.links
    shader=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
    assert shader,'Native skin shader unavailable'
    base_socket=shader.inputs['Base Color']; old=list(base_socket.links)
    mix=nodes.new('ShaderNodeMixRGB'); mix.blend_type='MIX'
    mix.inputs[1].default_value=base_socket.default_value
    if old: links.new(old[0].from_socket,mix.inputs[1])
    attr=nodes.new('ShaderNodeVertexColor'); attr.layer_name='BrookePhotoRGB'
    links.new(attr.outputs['Alpha'],mix.inputs[0])
    links.new(attr.outputs['Color'],mix.inputs[2])
    links.new(mix.outputs['Color'],base_socket)
assert changed>100,'Too few facial vertices mapped'
assert all((original[i]-morph.data[i].co).length<1e-7 for i,v in enumerate(skin.data.vertices) if (skin.matrix_world@v.co).z<chin-.006),'Neck continuity changed'
assert hashlib.sha256(Path(base).read_bytes()).hexdigest()==source_hash
skin.name='Brooke 1.0 native photo head and neck'
# Bake the mixed photo/native color to the existing head UV map. This avoids
# relying on Blender-only node mixing in the GLTF viewer.
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=1
baked=bpy.data.images.new('Brooke native photo face color',width=4096,height=4096,alpha=True)
restore=[]
for slot in skin.material_slots:
    if not slot.material:continue
    mat=slot.material;nodes=mat.node_tree.nodes;links=mat.node_tree.links
    shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    output_node=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
    color_socket=shader.inputs['Base Color'].links[0].from_socket
    emission=nodes.new('ShaderNodeEmission')
    links.new(color_socket,emission.inputs['Color'])
    links.new(emission.outputs[0],output_node.inputs['Surface'])
    target=nodes.new('ShaderNodeTexImage');target.image=baked
    nodes.active=target
    restore.append((mat,shader,output_node,emission,target))
bpy.ops.object.select_all(action='DESELECT')
skin.select_set(True);bpy.context.view_layer.objects.active=skin
bpy.ops.object.bake(type='EMIT',margin=8)
for mat,shader,output_node,emission,target in restore:
    links=mat.node_tree.links
    links.new(shader.outputs[0],output_node.inputs['Surface'])
    links.new(target.outputs['Color'],shader.inputs['Base Color'])
    mat.node_tree.nodes.remove(emission)
baked.filepath_raw=str(out.parent/'brooke-native-face-color.png')
baked.file_format='PNG';baked.save();baked.pack()
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_animations=False)
# Head-focused neutral inspection, no disconnected shell.
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'
scene.eevee.taa_render_samples=32
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.world.color=(.22,.22,.22)
center=Vector((native_mid.x,0,native_mid.z-.012)); radius=.7
camdata=bpy.data.cameras.new('Native head camera');cam=bpy.data.objects.new('Native head camera',camdata)
scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO';camdata.ortho_scale=.34
for name,offset in [('key',(-1,-2,2)),('fill',(2,-1,1)),('rim',(0,2,2))]:
    data=bpy.data.lights.new(name,'AREA'); light=bpy.data.objects.new(name,data)
    scene.collection.objects.link(light);light.location=center+Vector(offset)*radius
    light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    data.energy=35;data.size=radius*2
review=out.parent/'native-head-review';review.mkdir(exist_ok=True)
for label,offset in [('front',(0,-1,0)),('left',(-1,0,0)),('right',(1,0,0)),('back',(0,1,0)),('three-quarter',(.7,-1,.15))]:
    cam.location=center+Vector(offset)*radius
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(review/(label+'.png'));bpy.ops.render.render(write_still=True)
morph.value=0
cam.location=center+Vector((0,-1,0))*radius
cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(review/'baseline-front.png');bpy.ops.render.render(write_still=True)
report={'source_clone_sha256':source_hash,'source_clone_unchanged':True,
'method':'native facial depth morph plus source OBJ vertex-color transfer',
'available_photo_landmarks':68,'alignment_landmarks_used':[8,36,37,38,39,40,41,42,43,44,45,46,47],'native_eye_spacing_m':native_ipd,'mapped_facial_vertices':changed,
'maximum_depth_change_m':max_delta,'neck_geometry_unchanged':True,
'eye_geometry_unchanged':True,'photo_color_baked_to_native_uv':True,'separate_photo_shell_used':False,
'output_scope':'head and neck only','likeness_approved':False,
'limitations':['First depth-only registration; lateral landmark fitting still needed','Hair retains native style']}
(review/'native-fit-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
