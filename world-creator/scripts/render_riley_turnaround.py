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
views={"front":(0,-4,.85),"right":(4,0,.85),"back":(0,4,.85),
       "upper-back-overhead":(0,3.2,3.1)}
for label,pos in views.items():
    camera.location=pos
    aim=Vector((0,0,1.36)) if label=="upper-back-overhead" else target
    direction=aim-camera.location
    camera.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
    scene.render.filepath=str(out/("riley-"+label+".png"))
    bpy.ops.render.render(write_still=True)
    assert Path(scene.render.filepath).stat().st_size>4000
    print("RILEY_QA_RENDER",label,scene.render.filepath)

# Tight chest material/surface QA: see contour seams that a whole-body view hides.
camera.location=(0,-3.5,1.29)
close_target=Vector((0,0,1.275))
camera.rotation_euler=(close_target-camera.location).to_track_quat("-Z","Y").to_euler()
camdata.ortho_scale=.78
scene.render.filepath=str(out/"riley-chest-detail.png")
bpy.ops.render.render(write_still=True)
print("RILEY_QA_RENDER","chest-detail",scene.render.filepath)
camdata.ortho_scale=2.05

# Render the untouched CC0 donor independently. This lets a reviewer tell an
# unhealthy anatomical source apart from damage caused by Riley's shape edits.
bpy.ops.object.select_all(action="DESELECT")
for ob in list(scene.objects):
    if ob.type in ("MESH","ARMATURE"): ob.select_set(True)
bpy.ops.object.delete(use_global=False)
donor=root/"assets"/"riley-sculpted-donor.glb"
if donor.is_file():
    bpy.ops.import_scene.gltf(filepath=str(donor))
    for donor_part in scene.objects:
        if donor_part.type!="MESH":continue
        mat=bpy.data.materials.new("Donor neutral anatomy diagnostic")
        mat.diffuse_color=(.75,.73,.70,1)
        donor_part.data.materials.clear()
        donor_part.data.materials.append(mat)
    for label,pos in {"donor-front":(0,-4,.85),"donor-right":(4,0,.85)}.items():
        camera.location=pos
        camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
        scene.render.filepath=str(out/(label+".png"))
        bpy.ops.render.render(write_still=True)
        print("RILEY_DONOR_BASELINE_RENDER",label,scene.render.filepath)

# Inspect the original textured Riley skin by itself, without the casual suit.
# A continuous source body would eliminate the need to stitch incompatible necks.
bpy.ops.object.select_all(action="DESELECT")
for ob in list(scene.objects):
    if ob.type in ("MESH","ARMATURE"): ob.select_set(True)
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/"assets"/"riley-real.glb"))
for ob in scene.objects:
    if ob.type!="MESH":continue
    coords=[ob.matrix_world @ v.co for v in ob.data.vertices]
    print("RILEY_ORIGINAL_SOURCE_MESH",ob.name,
          "vertices",len(coords),
          "height",round(max(c.z for c in coords)-min(c.z for c in coords),3))
    ob.hide_render=("anatomical body" not in ob.name.lower())
    if not ob.hide_render:
        mat=bpy.data.materials.new("Original Riley cropped skin diagnostic")
        mat.diffuse_color=(.78,.74,.70,1)
        ob.data.materials.clear()
        ob.data.materials.append(mat)
for label,pos in {"source-skin-front":(0,-4,.85),"source-skin-right":(4,0,.85)}.items():
    camera.location=pos
    camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
    scene.render.filepath=str(out/(label+".png"))
    bpy.ops.render.render(write_still=True)
    print("RILEY_SOURCE_SKIN_QA",label,scene.render.filepath)
