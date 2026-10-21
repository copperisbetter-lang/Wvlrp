"""Native MPFB Laura head build. Never edit protected original avatars."""
import bpy, sys, zipfile, shutil, re
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.locationservice import LocationService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties
import bmesh
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
pack=Path('/tmp/mh-system.zip');faces=Path('/tmp/mh-faceunits.zip')
if not pack.is_file() or not faces.is_file(): raise RuntimeError('Official MakeHuman assets missing')
dest=Path(LocationService.get_user_data())
with zipfile.ZipFile(pack) as z:
    for entry in z.infolist():
        parts=Path(entry.filename).parts
        idx=next((i for i,p in enumerate(parts) if p in ('skins','eyes','eyebrows','eyelashes','hair')),None)
        if idx is None or entry.is_dir():continue
        target=dest/Path(*parts[idx:]);target.parent.mkdir(parents=True,exist_ok=True)
        with z.open(entry) as src,open(target,'wb') as out:shutil.copyfileobj(src,out)
AssetService.invalidate_pack_metadata_cache()
human=HumanService.create_human();human.name='Laura native MPFB head'
for key,value in [('gender',0.0),('age',.38),('weight',.40),('muscle',.28),('height',.52),('proportions',.47)]:
    HumanObjectProperties.set_value(key,value,entity_reference=human)
TargetService.reapply_macro_details(human)
# Apply actual official .target data to MPFB base topology, not guessed vertex math.
# Faceunits are expression targets, not identity reconstruction from photos.
# Faceunits are expression morphs, not likeness sliders. Applying these as
# permanent geometry broke the nose/mouth in the previous export.
# Preserve neutral MakeHuman face until reviewed identity targets are available.
selected={}
print('LAURA_NEUTRAL_FACE_NO_EXPRESSION_DEFORMATION')
skin=AssetService.find_asset_absolute_path('young_caucasian_female.mhmat',asset_subdir='skins')
if skin:HumanService.set_character_skin(skin,human,skin_type='GAMEENGINE')
for sub,names,kind in []: # Disable unaligned facial accessories until socket-fitting is verified
    for name in names:
        path=AssetService.find_asset_absolute_path(name,asset_subdir=sub)
        if path:
            HumanService.add_mhclo_asset(path,human,asset_type=kind,material_type='GAMEENGINE');break
# Select a genuine MakeHuman hairstyle asset, never a procedural sphere/cap.
# Keep this explicit so a missing hair asset cannot masquerade as completion.
hair_assets=sorted((dest/'hair').rglob('*.mhclo')) if (dest/'hair').exists() else []
if not hair_assets:
    raise RuntimeError('No MakeHuman hair .mhclo available; cannot claim Laura has hair')
# Favor long hair, then medium hair, over short hair where filenames describe length.
def hair_priority(p):
    n=p.stem.lower()
    return (0 if any(t in n for t in ('long','shoulder','wave')) else 1 if 'medium' in n else 2, str(p))
hair_path=sorted(hair_assets,key=hair_priority)[0]
hair=HumanService.add_mhclo_asset(str(hair_path),human,asset_type='Hair',material_type='GAMEENGINE')
if hair is None:raise RuntimeError('MakeHuman hair failed to attach: '+str(hair_path))
# Blonde recolor only; preserve official MakeHuman hairstyle geometry.
for mat in hair.data.materials:
    if not mat:continue
    mat.use_nodes=True
    for node in mat.node_tree.nodes:
        if node.type=='BSDF_PRINCIPLED':
            for link in list(mat.node_tree.links):
                if link.to_node==node and link.to_socket.name=='Base Color':
                    mat.node_tree.links.remove(link)
            node.inputs['Base Color'].default_value=(.48,.33,.19,1)
            # Two-sided opaque hair prevents camera-angle disappearance.
            node.inputs['Alpha'].default_value=1.0
            for link in list(mat.node_tree.links):
                if link.to_node==node and link.to_socket.name=='Alpha':
                    mat.node_tree.links.remove(link)
    mat.use_backface_culling=False
    if hasattr(mat,'surface_render_method'):mat.surface_render_method='DITHERED'
print('LAURA_NATIVE_MAKEHUMAN_HAIR',hair_path.name)
# Keep the eye assets, but do not export the misregistered facial accessory meshes.
# Their transforms must be repaired against the MPFB eye sockets before reintroduction.
for ob in list(bpy.context.scene.objects):
    if ob.type=='MESH' and ob != human and ob != hair and any(k in ob.name.lower() for k in ('eyelash','eyebrow')):
        bpy.data.objects.remove(ob,do_unlink=True)
# Export native MPFB whole head geometry by cutting only after targets are evaluated.
bpy.context.view_layer.update()
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
# Hair must be an actual mesh in the export, not merely a successful add_asset call.
hair_meshes=[o for o in meshes if o == hair or 'hair' in o.name.lower()]
if not hair_meshes or not any(len(o.data.polygons)>100 for o in hair_meshes):
    raise RuntimeError('Laura hair was not present as exportable mesh; reject bald GLB')
base=human
if base not in meshes: raise RuntimeError('Native MPFB base mesh missing')
# Export only the native facial surface and fitted hair; accessory eye and
# mouth meshes have been visibly misregistered in the current GLB.
for obj in list(meshes):
    if obj != base and obj != hair:
        bpy.data.objects.remove(obj,do_unlink=True)
world=[base.matrix_world@Vector(c) for c in base.bound_box]
lo=min(v.z for v in world);hi=max(v.z for v in world);cut=lo+(hi-lo)*.78
for obj in list(meshes):
    # Keep the entire hair object, including strands that extend below the neck cut.
    if obj == hair or 'hair' in obj.name.lower():
        continue
    zs=[(obj.matrix_world@Vector(c)).z for c in obj.bound_box]
    if max(zs)<cut:
        bpy.data.objects.remove(obj,do_unlink=True);continue
    if min(zs)<cut:
        # Non-body assets (eyes, lashes, brows) are already fitted by MPFB.
        # Bisecting them can shred their triangles and create floating fragments.
        if obj != base:
            # Do not bisect accessory geometry; remove unfitted accessories
            # rather than exporting displaced eye/cheek/mouth fragments.
            if obj != hair:
                bpy.data.objects.remove(obj,do_unlink=True)
            continue
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
        # Bake MPFB shape keys before cutting the head.
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                if key.name!='Basis' and key.value:
                    pass
            deps=bpy.context.evaluated_depsgraph_get()
            evaluated=obj.evaluated_get(deps)
            baked=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps)
            old=obj.data;obj.data=baked
        bm=bmesh.new();bm.from_mesh(obj.data)
        local_cut=(obj.matrix_world.inverted()@Vector((0,0,cut))).z
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,local_cut),plane_no=(0,0,1),clear_inner=True,clear_outer=False)
        bm.to_mesh(obj.data);bm.free()
        # Close the neck boundary after bisecting the body.
        bm=bmesh.new();bm.from_mesh(obj.data)
        boundary=[e for e in bm.edges if e.is_boundary and all(abs((obj.matrix_world@v.co).z-cut)<.005 for v in e.verts)]
        if boundary:
            bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
        bm.to_mesh(obj.data);bm.free()
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
if not any(o.type=='MESH' and ('hair' in o.name.lower() or o == hair) for o in bpy.context.scene.objects):
    raise RuntimeError('Head extraction discarded Laura hair; refuse to export')
for obj in bpy.context.scene.objects:
    obj.parent=None
    for mod in list(obj.modifiers):
        if mod.type=='ARMATURE':obj.modifiers.remove(mod)
out=ROOT/'assets/laura-head-combined.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_animations=False,export_skins=False)
assert out.stat().st_size>10000
print('LAURA_NATIVE_MPFB_SUCCESS',out.stat().st_size,sorted(selected),hair_path.name)

