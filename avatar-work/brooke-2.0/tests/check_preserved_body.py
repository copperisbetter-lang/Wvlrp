"""Roundtrip the preserved body and render HEAD ONLY. No facial deformation."""
import hashlib
import json
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Vector

source, destination = map(Path, sys.argv[sys.argv.index('--') + 1:][:2])
original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
destination.mkdir(parents=True, exist_ok=True)


def reset_load(path):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(path.resolve()))


def snapshot():
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    rigs = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    points = np.concatenate([
        np.array([o.matrix_world @ v.co for v in o.data.vertices]) for o in meshes
    ])
    return {
        'meshes': len(meshes), 'armatures': len(rigs),
        'bones': sorted(b.name for r in rigs for b in r.data.bones),
        'bounds_min': points.min(axis=0).tolist(),
        'bounds_max': points.max(axis=0).tolist(),
        'shape_keys': sorted(k.name for o in meshes if o.data.shape_keys
                             for k in o.data.shape_keys.key_blocks),
        'actions': sorted(a.name for a in bpy.data.actions),
    }


reset_load(source)
before = snapshot()
assert before['meshes'] >= 3 and before['armatures'] == 1
assert len(before['bones']) >= 50, before
assert before['bounds_max'][2] - before['bounds_min'][2] > 1.0, before
roundtrip = destination / 'preserved-body-roundtrip.glb'
bpy.ops.export_scene.gltf(filepath=str(roundtrip.resolve()), export_format='GLB',
                          export_animations=True, export_morph=True)
reset_load(roundtrip)
after = snapshot()
for field in ['meshes', 'armatures', 'bones', 'shape_keys']:
    assert before[field] == after[field], (field, before[field], after[field])
for field in ['bounds_min', 'bounds_max']:
    assert np.allclose(before[field], after[field], atol=1e-5), field
assert hashlib.sha256(source.read_bytes()).hexdigest() == original_hash

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.world.color = (0.04, 0.04, 0.04)
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
# Inspect the actual stored texture without introducing lighting overexposure.
# Render-only copies: the preserved GLB was already exported and is not changed.
for obj in scene.objects:
    if obj.type != 'MESH':
        continue
    for slot in obj.material_slots:
        if not slot.material or not slot.material.use_nodes:
            continue
        mat = slot.material.copy()
        slot.material = mat
        nodes = mat.node_tree.nodes
        bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
        output = next((n for n in nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if bsdf is None or output is None:
            continue
        emission = nodes.new('ShaderNodeEmission')
        color = bsdf.inputs['Base Color']
        if color.is_linked:
            mat.node_tree.links.new(color.links[0].from_socket, emission.inputs['Color'])
        else:
            emission.inputs['Color'].default_value = color.default_value
        transparent = nodes.new('ShaderNodeBsdfTransparent')
        mix = nodes.new('ShaderNodeMixShader')
        alpha = bsdf.inputs['Alpha']
        if alpha.is_linked:
            mat.node_tree.links.new(alpha.links[0].from_socket, mix.inputs[0])
        else:
            mix.inputs[0].default_value = alpha.default_value
        mat.node_tree.links.new(transparent.outputs[0], mix.inputs[1])
        mat.node_tree.links.new(emission.outputs[0], mix.inputs[2])
        mat.node_tree.links.new(mix.outputs[0], output.inputs['Surface'])
head_bones = [(r, b) for r in scene.objects if r.type == 'ARMATURE'
              for b in r.data.bones if b.name.lower().split(':')[-1] == 'head']
assert len(head_bones) == 1, 'Head bone must be explicit'
rig, bone = head_bones[0]
target = rig.matrix_world @ ((bone.head_local + bone.tail_local) * 0.5)
target.z += 0.025
camera_data = bpy.data.cameras.new('Head inspection camera')
camera = bpy.data.objects.new('Head inspection camera', camera_data)
scene.collection.objects.link(camera)
camera.location = target + Vector((0, -1.2, 0.015))
camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 0.44
scene.camera = camera
for name, offset, energy, radius in [
    ('Key', (-0.7, -0.7, 0.7), 65, 0.8),
    ('Fill', (0.6, -0.4, 0.3), 35, 1.0),
]:
    light_data = bpy.data.lights.new(name, 'AREA')
    light_data.energy = energy
    light_data.size = radius
    light = bpy.data.objects.new(name, light_data)
    scene.collection.objects.link(light)
    light.location = target + Vector(offset)
    light.rotation_euler = (target - light.location).to_track_quat('-Z', 'Y').to_euler()
scene.render.filepath = str((destination / 'baseline-head-smoke.png').resolve())
bpy.ops.render.render(write_still=True)
report = {
    'status': 'PASS', 'scope': 'Preserved baseline smoke test only, no Brooke likeness edit',
    'source_sha256': original_hash, 'before': before, 'after': after,
    'source_unchanged': True, 'render': 'baseline-head-smoke.png',
    'render_mode': 'Texture-only inspection using render-only material copies; no model edit',
    'animation_note': 'Reports existing actions; no animation clips invented',
}
(destination / 'body-smoke-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
