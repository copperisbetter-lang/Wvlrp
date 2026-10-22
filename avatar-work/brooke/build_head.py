"""Brooke neutral head prototype. Run with Blender 4.x:
blender -b --python avatar-work/brooke/build_head.py
Produces avatar-work/brooke/brooke-head-prototype.glb.
Geometry is a placeholder pending authorized reference images and landmarks.
No Laura files are touched.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*color, 1)
    return m

skin = material('Brooke skin placeholder', (.72,.49,.37))
white = material('Eye sclera', (.91,.88,.83))
iris = material('Blue iris placeholder', (.27,.45,.59))
pupil = material('Pupil', (.035,.03,.03))

# One closed, connected ellipsoid surface. Facial proportions are preliminary;
# morph targets deform this SAME topology, never spawn another face.
bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=64)
head = bpy.context.object
head.name = 'Brooke_Head_Skin'
for v in head.data.vertices:
    x,y,z = v.co
    # Z up, Y negative toward face/front.
    v.co = (x*.72, y*.54, z*1.08)
    x,y,z = v.co
    # Slight chin taper and cheek fullness, no detached facial pieces.
    if z < -.32:
        v.co.x *= 1 - .18 * min(1,(-z-.32)/.65)
    if -.15 < z < .35:
        v.co.x *= 1.045
    # Soft integrated nose prominence along central front surface.
    nose = math.exp(-((x/.135)**2 + ((z-.015)/.24)**2))
    if y < 0:
        v.co.y -= .10*nose
# Weld coincident UV sphere vertices before export to avoid split seams.
import bmesh
bm = bmesh.new()
bm.from_mesh(head.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.00001)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
bm.to_mesh(head.data)
bm.free()
head.data.update()
# Explicitly triangulate before glTF export; avoid implicit exporter triangulation
# creating unmatched UV seam vertices in the imported mesh.
bm = bmesh.new()
bm.from_mesh(head.data)
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bm.to_mesh(head.data)
bm.free()
head.data.update()
head.data.materials.append(skin)
for p in head.data.polygons: p.use_smooth = True
head.shape_key_add(name='Basis')
for name,axis,weight in [('FaceWidth','x',.10),('JawWidth','jaw',.12),('NoseProjection','nose',.06)]:
    key = head.shape_key_add(name=name)
    for v in key.data:
        x,y,z = v.co
        if axis == 'x': v.co.x = x*(1+weight)
        elif axis == 'jaw' and z < -.30: v.co.x = x*(1+weight)
        elif axis == 'nose' and y < 0:
            v.co.y -= weight*math.exp(-((x/.14)**2+((z-.015)/.24)**2))
    key.value = 0

# Eyes are independent spherical objects, not extra facial skin shells.
def ball(name, pos, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=pos)
    o = bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth=True
    return o
for side,label in [(-1,'Left'),(1,'Right')]:
    x=side*.28
    ball(label+'_Eyeball',(x,-.455,.24),(.145,.145,.14),white)
    ball(label+'_Iris',(x,-.586,.24),(.073,.018,.073),iris)
    ball(label+'_Pupil',(x,-.604,.24),(.030,.009,.030),pupil)

out=Path('avatar-work/brooke/brooke-head-prototype.glb').resolve()
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_morph=True, export_cameras=False, export_lights=False)
print('BROOKE_PROTOTYPE_EXPORTED',out)
