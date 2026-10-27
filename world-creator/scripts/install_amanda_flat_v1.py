import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree

root=Path.cwd()
asset_dir=root/'world-creator'/'assets'
base_path=asset_dir/'amanda-1-0-base.glb'
flat_path=asset_dir/'flat-v1-anatomical-component.glb'
temp_out_path=asset_dir/'amanda-1-0-base.replacement.glb'
report_path=asset_dir/'amanda-1-0-flat-install-report.json'
OLD_TOKEN='Vulva2 MHX2 true auto-fit'
BODY_TOKEN='SAV 4 adult petite character_sav4'
FRONT_SURFACE_OFFSET=0.018  # target outward offset in meters
VERTICAL_SURFACE_OFFSET=0.020  # raise Flat V1 into the attachment opening
previous_report={}
if report_path.exists():
    try: previous_report=json.loads(report_path.read_text())
    except Exception: previous_report={}
previous_surface_offset=float(previous_report.get('surface_offset_gltf_z_m',0.0))
offset_delta_gltf=FRONT_SURFACE_OFFSET-previous_surface_offset
previous_vertical_offset=float(previous_report.get('surface_offset_vertical_gltf_y_m',0.0))
vertical_delta_gltf=VERTICAL_SURFACE_OFFSET-previous_vertical_offset

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(base_path))
scene=bpy.context.scene
# The Amanda branch already has Flat V1 installed. Move that mesh in place so
# repeat runs remain safe and do not require the removed original attachment.
existing_flat=next((o for o in scene.objects if o.type=='MESH' and (
    'Flat V1 fitted static preview mesh' in o.name or
    'Flat V1 replacement attachment' in o.name
)),None)
if existing_flat:
    old_supports=[o for o in scene.objects if o.type=='MESH' and ('backfill' in o.name.lower() or 'aperture' in o.name.lower())]
    for support in old_supports: bpy.data.objects.remove(support,do_unlink=True)
    inv=existing_flat.matrix_world.inverted()
    for v in existing_flat.data.vertices:
        p=existing_flat.matrix_world @ v.co
        p.y-=offset_delta_gltf
        p.z+=vertical_delta_gltf
        v.co=inv @ p
    existing_flat.data.update()
    mat=bpy.data.materials.new('Flat V1 | matte skin fit')
    mat.diffuse_color=(0.73,0.51,0.42,1.0)
    mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value=(0.73,0.51,0.42,1.0)
        bsdf.inputs['Metallic'].default_value=0.0
        bsdf.inputs['Roughness'].default_value=0.88
    existing_flat.data.materials.clear()
    existing_flat.data.materials.append(mat)
    rig=next((o for o in scene.objects if o.type=='ARMATURE'),None)
    candidates=[o for o in scene.objects if o.type=='MESH' and len(o.vertex_groups)>=20]
    body=max(candidates,key=lambda o:len(o.data.vertices)) if candidates else None
    if not rig or not body:
        raise RuntimeError('Amanda armature/body skin weights unavailable for Flat V1 binding')
    body_points=[body.matrix_world @ v.co for v in body.data.vertices]
    kdt=KDTree(len(body_points))
    for i,p in enumerate(body_points): kdt.insert(p,i)
    kdt.balance()
    group_names={g.index:g.name for g in body.vertex_groups}
    rows=[]
    for v in existing_flat.data.vertices:
        p=existing_flat.matrix_world @ v.co
        _co,idx,_dist=kdt.find(p)
        weights={group_names[g.group]:float(g.weight) for g in body.data.vertices[idx].groups if g.group in group_names and g.weight>1e-8}
        total=sum(weights.values())
        if total<=0: raise RuntimeError('No nearby Amanda skin weights found for Flat V1')
        rows.append({name:value/total for name,value in weights.items()})
    for group in list(existing_flat.vertex_groups): existing_flat.vertex_groups.remove(group)
    groups={name:existing_flat.vertex_groups.new(name=name) for name in group_names.values()}
    for i,row in enumerate(rows):
        for name,weight in row.items(): groups[name].add([i],weight,'REPLACE')
    world_matrix=existing_flat.matrix_world.copy()
    existing_flat.parent=rig
    existing_flat.matrix_parent_inverse=rig.matrix_world.inverted()
    existing_flat.matrix_world=world_matrix
    for modifier in list(existing_flat.modifiers):
        if modifier.type=='ARMATURE': existing_flat.modifiers.remove(modifier)
    arm=existing_flat.modifiers.new('Amanda 1.0 Flat V1 armature binding','ARMATURE')
    arm.object=rig
    arm.use_vertex_groups=True
    for o in scene.objects: o.select_set(False)
    for o in scene.objects: o.select_set(True)
    bpy.context.view_layer.objects.active=existing_flat
    bpy.ops.export_scene.gltf(filepath=str(temp_out_path),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_skins=True,export_morph=False,export_yup=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(temp_out_path))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    new=next((o for o in meshes if 'Flat V1' in o.name),None)
    if not new: raise RuntimeError('Exported Amanda GLB lost Flat V1')
    if any(OLD_TOKEN in o.name for o in meshes): raise RuntimeError('Old visible attachment remains')
    report={
        'character':'Amanda 1.0',
        'replacement':'Flat V1',
        'updated_existing_attachment_in_place':True,
        'surface_offset_blender_y_m':-FRONT_SURFACE_OFFSET,
        'surface_offset_gltf_z_m':FRONT_SURFACE_OFFSET,
        'surface_offset_delta_blender_y_m':-offset_delta_gltf,
        'surface_offset_delta_gltf_z_m':offset_delta_gltf,
        'surface_offset_vertical_gltf_y_m':VERTICAL_SURFACE_OFFSET,
        'surface_offset_delta_vertical_gltf_y_m':vertical_delta_gltf,
        'old_support_geometry_removed':True,
        'replacement_vertex_count':len(new.data.vertices),
        'replacement_face_count':len(new.data.polygons),
        'replacement_vertex_group_count':len(new.vertex_groups),
        'replacement_has_armature_binding':any(m.type=='ARMATURE' and m.object for m in new.modifiers),
        'export_bytes':temp_out_path.stat().st_size,
        'status':'surface fit corrected; reimport verified'
    }
    temp_out_path.replace(base_path)
    report_path.write_text(json.dumps(report,indent=2))
    print('AMANDA_FLAT_INSTALL_REPORT',json.dumps(report))
    sys.exit(0)
old=next((o for o in scene.objects if o.type=='MESH' and OLD_TOKEN in o.name),None)
body=next((o for o in scene.objects if o.type=='MESH' and o.name==BODY_TOKEN),None)
rig=next((o for o in scene.objects if o.type=='ARMATURE'),None)
if not old or not body or not rig: raise RuntimeError('Amanda base attachment, body, or rig not found')

# Capture Laura 2/Amanda's existing fitted attachment bounds before removing it.
old_points=[old.matrix_world @ v.co for v in old.data.vertices]
old_min=Vector(tuple(min(p[i] for p in old_points) for i in range(3)))
old_max=Vector(tuple(max(p[i] for p in old_points) for i in range(3)))
old_center=(old_min+old_max)*.5
old_size=old_max-old_min
if min(old_size)<=0: raise RuntimeError('Existing attachment has invalid bounds')

bpy.ops.import_scene.gltf(filepath=str(flat_path))
flat=next((o for o in scene.objects if o.type=='MESH' and o.name=='Pubis and Perinium'),None)
if not flat: raise RuntimeError('Flat V1 mesh did not import')
flat_rigs=[o for o in scene.objects if o.type=='ARMATURE' and o is not rig]
flat_helpers=[o for o in scene.objects if o.type=='MESH' and o is not flat and o not in (body,old) and ('Icosphere' in o.name)]
# Use the exported mesh geometry only; discard its source rig and helper sphere.
for mod in list(flat.modifiers):
    if mod.type=='ARMATURE': flat.modifiers.remove(mod)
flat_world=[flat.matrix_world @ v.co for v in flat.data.vertices]
flat_min=Vector(tuple(min(p[i] for p in flat_world) for i in range(3)))
flat_max=Vector(tuple(max(p[i] for p in flat_world) for i in range(3)))
flat_center=(flat_min+flat_max)*.5
flat_size=flat_max-flat_min
scale=Vector(tuple(old_size[i]/flat_size[i] for i in range(3)))
if max(scale)>3 or min(scale)<.25: raise RuntimeError('Flat V1 fit scale outside safe range: '+str(tuple(scale)))

# Map Flat V1's local coordinates to the existing attachment footprint.
fit_points=[]
for p in flat_world:
    fit_points.append(Vector(tuple(old_center[i]+(p[i]-flat_center[i])*scale[i] for i in range(3))))
# Blender's front-facing direction is negative Y. Bring Flat V1 out to Amanda's skin surface.
fit_points=[Vector((p.x,p.y-offset_delta_gltf,p.z+vertical_delta_gltf)) for p in fit_points]
flat.name='Amanda 1.0 | Flat V1 replacement attachment'
flat.data.name='Flat V1 fitted anatomical mesh'
flat.parent=None
flat.matrix_world.identity()
for v,p in zip(flat.data.vertices,fit_points): v.co=rig.matrix_world.inverted() @ p
flat.data.update()
# Give the replacement a matte skin tone instead of Blender's neutral metallic-looking default.
mat=bpy.data.materials.new('Flat V1 | matte skin fit')
mat.diffuse_color=(0.73,0.51,0.42,1.0)
mat.use_nodes=True
bsdf=mat.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value=(0.73,0.51,0.42,1.0)
    bsdf.inputs['Metallic'].default_value=0.0
    bsdf.inputs['Roughness'].default_value=0.88
flat.data.materials.clear(); flat.data.materials.append(mat)

# Transfer deform weights from Amanda's body at the nearest body vertex.
body_points=[body.matrix_world @ v.co for v in body.data.vertices]
kdt=KDTree(len(body_points))
for i,p in enumerate(body_points): kdt.insert(p,i)
kdt.balance()
groups_by_index={g.index:g.name for g in body.vertex_groups}
weight_rows=[]
for p in fit_points:
    _co,idx,_dist=kdt.find(p)
    weights={groups_by_index[g.group]:float(g.weight) for g in body.data.vertices[idx].groups if g.group in groups_by_index and g.weight>1e-8}
    total=sum(weights.values())
    if total<=0: raise RuntimeError('Could not transfer Amanda rig weights')
    weight_rows.append({k:v/total for k,v in weights.items()})
for vg in list(flat.vertex_groups): flat.vertex_groups.remove(vg)
groups={name:flat.vertex_groups.new(name=name) for name in groups_by_index.values()}
for i,row in enumerate(weight_rows):
    for name,w in row.items(): groups[name].add([i],w,'REPLACE')
flat.parent=rig
flat.matrix_parent_inverse.identity()
flat.location=(0,0,0); flat.rotation_euler=(0,0,0); flat.scale=(1,1,1)
mod=flat.modifiers.new('Amanda 1.0 Flat V1 armature binding','ARMATURE')
mod.object=rig
mod.use_vertex_groups=True

# Convert the old aperture-cover mesh into a skin-textured seam backfill. The body
# itself has a baked opening, so this preserves a continuous skin base beneath Flat V1.
old.name='Amanda 1.0 | skin backfill at attachment opening'
old.data.name='Amanda 1.0 aperture backfill geometry'
old['wvlrp_role']='skin backfill beneath Flat V1; former visible attachment removed'
if body.data.materials:
    for i in range(len(old.data.materials)):
        old.data.materials[i]=body.data.materials[0]
# Remove Flat's separate source rig/helper.
for o in flat_rigs+flat_helpers:
    if o.name in bpy.data.objects: bpy.data.objects.remove(o,do_unlink=True)
# Keep Amanda's original unmodified rig/body/hair/eyes and clone only.
for o in scene.objects: o.select_set(False)
for o in list(scene.objects): o.select_set(True)
bpy.context.view_layer.objects.active=flat

bpy.ops.export_scene.gltf(filepath=str(temp_out_path),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_skins=True,export_morph=False,export_yup=True)
# Reimport exported artifact and verify it has the replacement, no old attachment, and skinned mesh.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(temp_out_path))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
new=next((o for o in meshes if 'Flat V1 replacement attachment' in o.name),None)
if not new: raise RuntimeError('Exported Amanda GLB is missing Flat V1 attachment')
if any(OLD_TOKEN in o.name for o in meshes): raise RuntimeError('Old attachment remains in exported Amanda GLB')
if not any(m.type=='ARMATURE' and m.object for m in new.modifiers): raise RuntimeError('Flat V1 replacement is not rig-bound after export')
report={
 'character':'Amanda 1.0',
 'source_base':'Laura 2 exact clone, branch-only',
 'old_visible_attachment_removed':True,
 'skin_backfill_added_for_baked_body_opening':True,
 'replacement':'Flat V1',
 'target_attachment_bounds_min':list(old_min),
 'target_attachment_bounds_max':list(old_max),
 'target_attachment_bounds_size':list(old_size),
 'source_flat_bounds_min':list(flat_min),
 'source_flat_bounds_max':list(flat_max),
 'fit_scale_xyz':list(scale),
 'surface_offset_blender_y_m':-FRONT_SURFACE_OFFSET,
 'surface_offset_gltf_z_m':FRONT_SURFACE_OFFSET,
 'surface_offset_delta_blender_y_m':-offset_delta_gltf,
 'surface_offset_delta_gltf_z_m':offset_delta_gltf,
 'replacement_vertex_count':len(new.data.vertices),
 'replacement_face_count':len(new.data.polygons),
 'replacement_vertex_group_count':len(new.vertex_groups),
 'replacement_has_armature_binding':True,
 'body_mesh_vertices':next((len(o.data.vertices) for o in meshes if BODY_TOKEN in o.name),None),
 'export_bytes':temp_out_path.stat().st_size,
 'status':'replacement exported and reimport checked'
}
temp_out_path.replace(base_path)
report_path.write_text(json.dumps(report,indent=2))
print('AMANDA_FLAT_INSTALL_REPORT',json.dumps(report))
