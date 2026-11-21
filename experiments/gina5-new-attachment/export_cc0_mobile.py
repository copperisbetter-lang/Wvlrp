"""Publish a lightweight mobile inspection GLB of the ACTUAL saved Gina5 CC0 fit.
The high-detail .blend and morphs remain unchanged on disk in public QA branch.
This preview strips shape-key data and decimates ONLY the scan attachment.
"""
import bpy,sys,json,datetime,struct
from pathlib import Path
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(a)!=2:raise SystemExit('Usage: blender -b --python export_cc0_mobile.py -- ACTUAL_SOURCE.blend OUT_DIR')
source,out=map(Path,a);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
body=max((x for x in bpy.data.objects if x.type=='MESH' and len(x.data.vertices)>60000 and 'Gina5_REAL_CC0_Anatomical' not in x.name),key=lambda x:len(x.data.vertices))
attachment=bpy.data.objects.get('Gina5_REAL_CC0_Anatomical_Attachment_V2_UNAPPROVED')
assert attachment and attachment.type=='MESH'
assert len(body.data.shape_keys.key_blocks)==35 and len(attachment.data.shape_keys.key_blocks)==3
original_patch_verts=len(attachment.data.vertices)
original_patch_faces=len(attachment.data.polygons)
bones=[x for x in bpy.data.objects if x.type=='ARMATURE']
assert any(len(a.data.bones)==69 for a in bones)
bpy.ops.object.select_all(action='DESELECT')
attachment.select_set(True);bpy.context.view_layer.objects.active=attachment
# Preview only; leave the full source file untouched, including all shape keys.
attachment.shape_key_clear()
dec=attachment.modifiers.new(name='Mobile_preview_lod',type='DECIMATE')
dec.ratio=.18
# Decimate before armature evaluation; preserve real bone weights.
while attachment.modifiers.find(dec.name)>0:
 bpy.ops.object.modifier_move_up(modifier=dec.name)
bpy.ops.object.modifier_apply(modifier=dec.name)
assert len(attachment.data.polygons)<original_patch_faces*.24
assert len(attachment.data.polygons)>10000
out_faces=len(attachment.data.polygons)
out_verts=len(attachment.data.vertices)
# Reuse original materials; no external placeholder or synthetic geometry.
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.data.objects:
 if ob.type in ('MESH','ARMATURE','EMPTY'):ob.select_set(True)
bpy.context.view_layer.objects.active=body
target=out/'Gina5_CC0_Real_Scan_Attachment_MOBILE.glb'
bpy.ops.export_scene.gltf(filepath=str(target.resolve()),export_format='GLB',use_selection=True,
                          export_animations=False,export_skins=True,export_morph=False)
assert target.is_file() and target.stat().st_size>1000000
raw=target.read_bytes()
assert raw[:4]==b'glTF'
jlen,jtype=struct.unpack_from('<II',raw,12)
assert jtype==0x4e4f534a
data=json.loads(raw[20:20+jlen])
names=[n.get('name','') for n in data.get('nodes',[])]
assert any('Gina5_REAL_CC0_Anatomical_Attachment_V2' in n for n in names),names[:10]
assert len(data['skins'])>=1
report={
 'status':'Mobile GLB produced from genuine fitted saved Blender working file; not welded or approved',
 'source_blend':str(source),
 'full_blender_preserved':True,
 'original_attachment_faces':original_patch_faces,
 'original_attachment_vertices':original_patch_verts,
 'mobile_attachment_faces':out_faces,
 'mobile_attachment_vertices':out_verts,
 'skinning_retained':True,
 'skin_count':len(data['skins']),
 'mobile_morphs_included':False,
 'full_editable_blender_morphs_preserved':True,
 'real_source_scan_used':True,
 'old_rejected_donor_used':False,
 'candidate_glb_file':str(target),
 'candidate_glb_bytes':target.stat().st_size,
 'source_public_repo':'copperisbetter-lang/Wvlrp',
 'owner_approved':False,
 'production_ready':False,
 'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()
}
(out/'gina5_cc0_mobile_report.json').write_text(json.dumps(report,indent=2))
print('MOBILE PREVIEW SUCCESS:',json.dumps(report))
