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
# Select genuine MPFB/MakeHuman identity targets from the installed extension.
# Never substitute ARKit expression faceunits for anatomical identity changes.
from collections import defaultdict
import os
roots=[Path('/tmp/mpfb2/src/mpfb'),Path('/tmp/mh-targets'),dest]
candidates=[]
for root in roots:
    if root.exists():
        candidates.extend(p for p in root.rglob('*.target') if 'faceunit' not in str(p).lower() and 'expression' not in str(p).lower())
print('LAURA_IDENTITY_TARGET_CANDIDATES',len(candidates),flush=True)
print('LAURA_IDENTITY_TARGET_SAMPLE',[str(p) for p in candidates[:60]],flush=True)
# Anatomical categories are deliberately constrained to the face; never load
# an unreviewed body or expression target based on a loose filename match.
features={
 'eyes': ('eyes', 'eye'),
 'nose': ('nose',),
 'mouth': ('mouth', 'lip'),
 'chin': ('chin',),
 'jaw': ('jaw',),
 'cheeks': ('cheek',),
}
found=defaultdict(list)
for p in candidates:
    name=p.stem.lower()
    if not any(t in str(p).lower() for t in ('face','head','nose','eye','mouth','lip','chin','jaw','cheek')):continue
    for feature,terms in features.items():
        if any(term in name for term in terms):found[feature].append(p)
print('LAURA_IDENTITY_TARGET_DISCOVERY', {k:[str(p) for p in v[:8]] for k,v in found.items()},flush=True)
# Stop rather than claiming a likeness when the official identity targets
# are missing or cannot be mapped unambiguously to the requested features.
if len(found)<len(features):
    raise RuntimeError('LAURA_MORPH_PREFLIGHT: Found only '+str(len(found))+' official face target categories. Available targets: '+str([p.name for p in candidates[:40]]))
# Conservative first-pass MPFB identity morph. Each displacement comes from an
# official .target file, never a synthetic face sphere or ARKit expression.
# Filename polarity is explicit; uncertain targets are excluded.
# Reference-led first-pass identity morph; preserve native topology.
# Source: Laura 2 reference images and face-measurement-spec.json.
# These are provisional weights, not a completed calibrated 3D fit.
# Read the reference measurements instead of claiming the weights below are photo-derived.
import json
measurement_file=ROOT/'laura2-photo-measurements.json'
if not measurement_file.is_file():
    raise RuntimeError('Laura 2 photo measurement file missing')
photo_spec=json.loads(measurement_file.read_text())
if photo_spec.get('status')!='provisional' or not photo_spec.get('landmarks',{}).get('approximate_pixel_coordinates'):
    raise RuntimeError('Laura 2 photo landmarks unavailable or invalid')
print('LAURA_REFERENCE_LANDMARKS_LOADED',photo_spec['landmarks'],flush=True)
# Convert photo pixel coordinates to scale-invariant 2D proportions.
# This is an observable fitting target, NOT a guessed MakeHuman slider mapping.
pts=photo_spec['landmarks']['approximate_pixel_coordinates']
required=('left_eye','right_eye','nose_tip','mouth_center','chin')
if any(k not in pts or len(pts[k])!=2 for k in required):
    raise RuntimeError('Incomplete Laura reference landmarks')
from math import hypot
interocular=hypot(pts['right_eye'][0]-pts['left_eye'][0],pts['right_eye'][1]-pts['left_eye'][1])
if interocular<=0: raise RuntimeError('Invalid reference eye spacing')
eye_mid=((pts['left_eye'][0]+pts['right_eye'][0])/2,(pts['left_eye'][1]+pts['right_eye'][1])/2)
ratios={
 'nose_to_eye_spacing':hypot(pts['nose_tip'][0]-eye_mid[0],pts['nose_tip'][1]-eye_mid[1])/interocular,
 'mouth_to_eye_spacing':hypot(pts['mouth_center'][0]-eye_mid[0],pts['mouth_center'][1]-eye_mid[1])/interocular,
 'chin_to_eye_spacing':hypot(pts['chin'][0]-eye_mid[0],pts['chin'][1]-eye_mid[1])/interocular,
 'mouth_nose_vertical_ratio':(pts['mouth_center'][1]-pts['nose_tip'][1])/interocular,
}
if not all(0<v<5 for v in ratios.values()): raise RuntimeError('Implausible Laura landmark ratios')
print('LAURA_PHOTO_NORMALIZED_RATIOS',json.dumps(ratios,sort_keys=True),flush=True)

print('LAURA_MORPH_STATUS','UNFITTED: weights below are provisional and not optimized to photographs',flush=True)
recipe={
 'eyes': (('eye','large'),.27),
 'nose': (('nose','narrow'),.32),
 'mouth': (('mouth','wide'),.04),
 'chin': (('chin','round'),.28),
 'jaw': (('jaw','narrow'),.27),
 'cheeks': (('cheek','full'),.30),
}

selected={}
for feature,(terms,weight) in recipe.items():
    matches=[p for p in found.get(feature,[]) if all(t in p.stem.lower() for t in terms)]
    # Do not guess a polarity if MakeHuman names its modifier differently.
    if not matches:
        print('LAURA_TARGET_NOT_FOUND',feature,terms)
        continue
    matches.sort(key=lambda p:(len(p.stem),str(p)))
    p=matches[0]
    # Native MakeHuman targets are vertex-indexed: reject out-of-range indices before loading.
    with p.open('rt', encoding='utf-8', errors='replace') as target_file:
        indices=[]
        for line in target_file:
            line=line.strip()
            if not line or line.startswith('#'): continue
            try: indices.append(int(line.split()[0]))
            except (ValueError, IndexError): raise RuntimeError('Malformed native target: '+str(p))
    if not indices or min(indices)<0 or max(indices)>=len(human.data.vertices):
        raise RuntimeError('Target incompatible with Laura base mesh: '+str(p)+' vertex count '+str(len(human.data.vertices)))
    key=TargetService.load_target(human,str(p),weight=weight,name='Laura2 '+feature)
    if key is None:raise RuntimeError('Failed to load MPFB identity target '+str(p))
    key.value=weight
    selected[feature]=(str(p),weight)
    print('LAURA_TARGET_APPLIED',feature,p.name,weight)
if len(selected)<len(recipe):
    raise RuntimeError('LAURA_MORPH_PREFLIGHT: Need all 6 applied official facial identity targets; selected='+str(selected)+'; discovered='+str({k:[p.name for p in v[:12]] for k,v in found.items()}))
print('LAURA_IDENTITY_TARGETS_APPLIED',selected,flush=True)
# PHOTO-DRIVEN FITTER: optimize real native shape-key weights against landmark ratios.
# Vertex correspondences must be calibrated on this exact MakeHuman topology;
# never infer eye/nose/chin vertex IDs from an unrelated model.
landmark_indices=photo_spec.get('mesh_landmark_vertex_indices')
if not landmark_indices:
    print('LAURA_FIT_BLOCKED','No calibrated mesh_landmark_vertex_indices in photo spec; refusing fabricated photo-fit',flush=True)
    raise RuntimeError('LAURA_PHOTO_FIT_NEEDS_MESH_LANDMARKS: annotate eye centers, nose tip, mouth center, chin on native MakeHuman base mesh')
if any(k not in landmark_indices for k in required):
    raise RuntimeError('LAURA_PHOTO_FIT_INCOMPLETE_MESH_LANDMARKS')
if any(not isinstance(landmark_indices[k],int) or not 0<=landmark_indices[k]<len(human.data.vertices) for k in required):
    raise RuntimeError('LAURA_PHOTO_FIT_INVALID_VERTEX_INDEX')
# Pure-Python coordinate descent, no extra Blender dependencies. Projection is
# orthographic XY for a frontal model aligned with Blender's X/Z head axes.
# A camera-calibrated projection is required before reporting verified likeness.
def mesh_ratios():
    coords={k:human.data.vertices[landmark_indices[k]].co for k in required}
    def distance(a,b):
        return hypot(coords[a].x-coords[b].x,coords[a].z-coords[b].z)
    eye_distance=distance('left_eye','right_eye')
    if eye_distance<=1e-8:raise RuntimeError('Degenerate mesh eye landmark spacing')
    mid=((coords['left_eye'].x+coords['right_eye'].x)/2,(coords['left_eye'].z+coords['right_eye'].z)/2)
    def dist_mid(k):return hypot(coords[k].x-mid[0],coords[k].z-mid[1])/eye_distance
    return {'nose_to_eye_spacing':dist_mid('nose_tip'),'mouth_to_eye_spacing':dist_mid('mouth_center'),'chin_to_eye_spacing':dist_mid('chin'),'mouth_nose_vertical_ratio':abs(coords['mouth_center'].z-coords['nose_tip'].z)/eye_distance}
def fit_loss():
    values=mesh_ratios()
    return sum((values[k]-ratios[k])**2 for k in ratios)
keys={k:human.data.shape_keys.key_blocks.get('Laura2 '+k) for k in selected}
if any(v is None for v in keys.values()):raise RuntimeError('LAURA_FIT_SHAPEKEY_MISSING')
# Shape key coordinates must be evaluated through the dependency graph.
def evaluated_ratios():
    bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get()
    obj=human.evaluated_get(dg)
    mesh=obj.to_mesh()
    try:
        coords={k:mesh.vertices[landmark_indices[k]].co.copy() for k in required}
    finally:obj.to_mesh_clear()
    spacing=hypot(coords['right_eye'].x-coords['left_eye'].x,coords['right_eye'].z-coords['left_eye'].z)
    if spacing<=1e-8:raise RuntimeError('Invalid evaluated eye spacing')
    midx=(coords['left_eye'].x+coords['right_eye'].x)/2
    midz=(coords['left_eye'].z+coords['right_eye'].z)/2
    def ratio(k):return hypot(coords[k].x-midx,coords[k].z-midz)/spacing
    return {'nose_to_eye_spacing':ratio('nose_tip'),'mouth_to_eye_spacing':ratio('mouth_center'),'chin_to_eye_spacing':ratio('chin'),'mouth_nose_vertical_ratio':abs(coords['mouth_center'].z-coords['nose_tip'].z)/spacing}
def objective():
    got=evaluated_ratios()
    return sum((got[k]-ratios[k])**2 for k in ratios)
loss=objective()
for step in (.2,.1,.05,.025):
    for _ in range(3):
        improved=False
        for feature,key in keys.items():
            original=key.value; best=original; best_loss=loss
            for trial in (max(0.,original-step),min(1.,original+step)):
                key.value=trial
                score=objective()
                if score<best_loss:best_loss=score;best=trial
            key.value=best
            if best_loss<loss:loss=best_loss;improved=True
        if not improved:break
print('LAURA_PHOTO_FIT_RESULT',json.dumps({'loss':loss,'weights':{k:v.value for k,v in keys.items()},'reference_ratios':ratios,'mesh_ratios':evaluated_ratios()}),flush=True)

# This is a provisional native-target deformation, not a verified photo likeness.
# Never label a successful export as a calibrated facial match.
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
    # Keep genuine eye geometry, but exclude misplaced eyebrow/lash accessories.
    if obj != base and obj != hair and not ('eye' in obj.name.lower() and not any(t in obj.name.lower() for t in ('brow','lash'))):
        bpy.data.objects.remove(obj,do_unlink=True)
# Preserve the complete MakeHuman body, with MPFB identity morphs applied.
# Never bisect Laura 2 at the neck.
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
if not any(o.type=='MESH' and ('hair' in o.name.lower() or o == hair) for o in bpy.context.scene.objects):
    raise RuntimeError('Head extraction discarded Laura hair; refuse to export')
for obj in bpy.context.scene.objects:
    if obj.type=='MESH':
        # Face surfaces must be opaque and render from both sides.
        for mat in obj.data.materials:
            if not mat: continue
            mat.use_backface_culling=False
            if hasattr(mat,'surface_render_method'): mat.surface_render_method='DITHERED'
            if mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type=='BSDF_PRINCIPLED':
                        alpha=node.inputs.get('Alpha')
                        if alpha:
                            for link in list(mat.node_tree.links):
                                if link.to_socket==alpha: mat.node_tree.links.remove(link)
                            alpha.default_value=1.0
    obj.parent=None
    for mod in list(obj.modifiers):
        if mod.type=='ARMATURE':obj.modifiers.remove(mod)
out=ROOT/'assets/laura-2-native-morphed-fullbody.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_animations=False,export_skins=False)
assert out.stat().st_size>10000
print('LAURA_NATIVE_FULLBODY_MORPH_SUCCESS',out.stat().st_size,sorted(selected),hair_path.name)

