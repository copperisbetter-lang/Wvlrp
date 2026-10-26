"""Create head/neck inspection snapshots and base64 evidence for Brooke V5.
These images are only for internal Gater QA; real Samsung viewer approval remains separate.
"""
import bpy, math, base64, pathlib, json
from mathutils import Vector
BASE=pathlib.Path("avatar-work/brooke/second-chance")
model=BASE/"brooke-3-1-v5-hair-surface-trial.glb"
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(model))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
print('BROOKE_V5_HAIR_QA_MESHES',json.dumps([(o.name,len(o.data.vertices)) for o in meshes]))
assert meshes
world=bpy.context.scene.world or bpy.data.worlds.new('QA World')
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.095,.13,.115,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.48
def area(name,loc,energy,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.location=loc
    obj.rotation_euler=(Vector((0,0,1.4))-obj.location).to_track_quat('-Z','Y').to_euler()
area('QA key',(-1.5,-2.2,3.0),120,2.7)
area('QA fill',(2,-1,1.6),45,2.2)
camera_data=bpy.data.cameras.new('QA Camera');camera=bpy.data.objects.new('QA Camera',camera_data)
bpy.context.collection.objects.link(camera);bpy.context.scene.camera=camera
camera_data.type='ORTHO';camera_data.ortho_scale=.75
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'
scene.view_settings.look='Medium High Contrast'
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=75
target=Vector((0,0,1.51))
for name,location in [('front',(0,-2.1,1.56)),('rear',(0,2.1,1.56)),('left',(2.1,0,1.56)),('threequarter',(1.65,-2.0,1.7))]:
    camera.location=location
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    outfile=BASE/('brooke-v5-hair-qa-'+name+'.jpg')
    scene.render.filepath=str(outfile)
    bpy.ops.render.render(write_still=True)
    data=outfile.read_bytes()
    (BASE/('brooke-v5-hair-qa-'+name+'.b64.txt')).write_text(base64.b64encode(data).decode())
    print('BROOKE_V5_HAIR_QA_IMAGE',json.dumps({'name':name,'bytes':len(data),'base64_bytes':len(data)*4//3}))
print('BROOKE_V5_HAIR_QA_FINISHED')
