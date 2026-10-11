"""QA orthographic front, right-side, and rear renders of exported Riley GLB.
These PNGs are build artifacts, not AI approximations of the character.
"""
import bpy, math
from mathutils import Vector
from pathlib import Path
root=Path(__file__).resolve().parents[1]
model=root/"assets"/"riley-rigged-v1.glb"
out=root/"assets"/"riley-qa"
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(model))
scene=bpy.context.scene
scene.render.engine="BLENDER_WORKBENCH"
scene.display.shading.light="STUDIO"
scene.display.shading.color_type="MATERIAL"
scene.display.shading.show_cavity=True
scene.display.shading.cavity_type="BOTH"
scene.display.shading.curvature_ridge_factor=1.1
scene.display.shading.curvature_valley_factor=1.05
scene.render.resolution_x=480
scene.render.resolution_y=680
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=False
scene.world.color=(.55,.57,.57)
scene.view_settings.view_transform="Standard"
scene.render.image_settings.color_mode="RGBA"
camdata=bpy.data.cameras.new("Turnaround orthographic camera")
camera=bpy.data.objects.new("Turnaround camera",camdata)
scene.collection.objects.link(camera)
scene.camera=camera
camdata.type="ORTHO";camdata.ortho_scale=2.05
target=Vector((0,0,.85))
views={"front":(0,-4,.85),"right":(4,0,.85),"back":(0,4,.85)}
for label,pos in views.items():
    camera.location=pos
    direction=target-camera.location
    camera.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
    scene.render.filepath=str(out/("riley-"+label+".png"))
    bpy.ops.render.render(write_still=True)
    assert Path(scene.render.filepath).stat().st_size>4000
    print("RILEY_QA_RENDER",label,scene.render.filepath)

# Render the untouched CC0 donor independently. This lets a reviewer tell an
# unhealthy anatomical source apart from damage caused by Riley's shape edits.
bpy.ops.object.select_all(action="DESELECT")
for ob in list(scene.objects):
    if ob.type in ("MESH","ARMATURE"): ob.select_set(True)
bpy.ops.object.delete(use_global=False)
donor=root/"assets"/"riley-sculpted-donor.glb"
if donor.is_file():
    bpy.ops.import_scene.gltf(filepath=str(donor))
    for label,pos in {"donor-front":(0,-4,.85),"donor-right":(4,0,.85)}.items():
        camera.location=pos
        camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
        scene.render.filepath=str(out/(label+".png"))
        bpy.ops.render.render(write_still=True)
        print("RILEY_DONOR_BASELINE_RENDER",label,scene.render.filepath)
