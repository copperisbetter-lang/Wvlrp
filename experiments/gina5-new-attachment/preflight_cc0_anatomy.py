"""Inspect genuine CC0 We Are Beautiful external-anatomy STL before any Gina fitting.

Source: https://commons.wikimedia.org/wiki/File:We_Are_Beautiful_–_482357-VSNN-1_–_surface.stl
CC0 1.0; Wikimedia Commons SHA1 3c079f7e979bf5be1315610f9d93ddd220eb47cc.
This preflight DOES NOT attach, deform, weld or approve anything.
"""
import bpy, struct, numpy as np, hashlib, json, datetime, sys, os, math, bmesh
from mathutils import Vector
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=2: raise SystemExit('Usage: blender -b --python preflight_cc0_anatomy.py -- CC0_SOURCE.stl OUTPUT_DIR')
path,out=map(Path,args);out.mkdir(parents=True,exist_ok=True)
expected='3c079f7e979bf5be1315610f9d93ddd220eb47cc'
raw=path.read_bytes()
assert hashlib.sha1(raw).hexdigest()==expected,'CC0 source SHA1 mismatch'
assert len(raw)==9610034,'Unexpected CC0 source size'
assert len(raw)>=84 and (len(raw)-84)%50==0
num=struct.unpack_from('<I',raw,80)[0]
assert num==(len(raw)-84)//50
# Binary STL 3 floats normal, 9 floats vertex coordinates, uint16 attribute per triangle
record=np.frombuffer(raw,dtype=np.dtype([('normal','<f4',(3,)),('v','<f4',(3,3)),('attribute','<u2')]),offset=84,count=num)
source=record['v'].reshape(-1,3).copy()
assert np.isfinite(source).all()
mins=source.min(axis=0);maxs=source.max(axis=0);span=maxs-mins
center=np.mean(source,axis=0)
# Deduplicate across triangles without inventing any source geometry.
rounded=np.round(source,6)
unique,index,inverse=np.unique(rounded,axis=0,return_index=True,return_inverse=True)
faces=inverse.reshape(-1,3)
assert len(unique)>3000 and len(faces)>3000
# PCA describes orientation only. Don't assume scan axes equal Gina axes.
cov=np.cov(unique.T);eigval,eigvec=np.linalg.eigh(cov);order=np.argsort(eigval)[::-1]
eigval=eigval[order];eigvec=eigvec[:,order]
proj=(unique-unique.mean(axis=0))@eigvec
project_span=np.ptp(proj,axis=0)
area=np.linalg.norm(np.cross(source.reshape(-1,3,3)[:,1,:]-source.reshape(-1,3,3)[:,0,:],
                             source.reshape(-1,3,3)[:,2,:]-source.reshape(-1,3,3)[:,0,:]),axis=1)*.5
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new("WE_ARE_BEAUTIFUL_REAL_CC0_SCAN_MESH")
mesh.from_pydata(unique.tolist(),[],faces.tolist());mesh.update()
obj=bpy.data.objects.new("Real_CC0_Anatomical_Surface_UNFITTED",mesh)
bpy.context.scene.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
bm=bmesh.new();bm.from_mesh(mesh)
boundary=sum(1 for e in bm.edges if e.is_boundary)
nonmanifold=sum(1 for e in bm.edges if not e.is_manifold)
isolated=sum(1 for v in bm.verts if not v.link_faces)
components=[]
visited=set()
for v in bm.verts:
 if v.index in visited:continue
 stack=[v];visited.add(v.index);size=0
 while stack:
  cur=stack.pop();size+=1
  for edge in cur.link_edges:
   other=edge.other_vert(cur)
   if other.index not in visited:visited.add(other.index);stack.append(other)
 components.append(size)
bm.free()
material=bpy.data.materials.new('CC0_Scan_Grey_Untextured');material.diffuse_color=(.7,.68,.64,1)
mesh.materials.append(material)
# Work-copy scan checkpoint and untextured geometry-only GLB.
blend=out/'CC0_Anatomical_Scan_UNFITTED.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()),compress=True)
glb=out/'CC0_Anatomical_Scan_UNFITTED.glb'
bpy.ops.export_scene.gltf(filepath=str(glb.resolve()),export_format='GLB',use_selection=True,
                          export_animations=False,export_normals=True)
assert glb.exists() and glb.stat().st_size>10000
report={
 'source_page':'https://commons.wikimedia.org/wiki/File:We_Are_Beautiful_%E2%80%93_482357-VSNN-1_%E2%80%93_surface.stl',
 'source_author':'We Are Beautiful',
 'source_license':'CC0 1.0 Universal',
 'source_description':'Vulva of standing woman; real surface scan; Wikimedia Commons source',
 'license_verified':True,
 'stl_original_sha1':expected,
 'source_bytes':len(raw),
 'raw_triangles':num,
 'deduplicated_vertices':len(unique),
 'mesh_triangles':len(faces),
 'local_source_min':mins.tolist(),
 'local_source_max':maxs.tolist(),
 'local_source_span':span.tolist(),
 'local_source_mean':center.tolist(),
 'pca_variance':eigval.tolist(),
 'pca_axes_columns':eigvec.tolist(),
 'pca_projected_spans':project_span.tolist(),
 'triangle_area_sum_raw_units_squared':float(area.sum()),
 'triangle_area_median_raw_units_squared':float(np.median(area)),
 'degenerate_triangles':int((area<1e-12).sum()),
 'boundary_edges':boundary,
 'nonmanifold_edges':nonmanifold,
 'isolated_vertices':isolated,
 'connected_components':len(components),
 'largest_component_vertices':max(components),
 'component_vertex_counts_desc':sorted(components,reverse=True)[:20],
 'source_untextured':True,
 'source_rigged':False,
 'blender_file':str(blend),
 'preview_glb':str(glb),
 'original_gina_unmodified':True,
 'fitted_to_gina':False,
 'qa_approved':False,
 'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'blender_version':bpy.app.version_string,
 'next_steps':['Verify axis and real scale', 'Isolate usable anatomical scan region without stretching', 'Register to unmodified Gina body geometry', 'Transfer skin weights to Gina real skeleton', 'Visually inspect front/side/under before welding']
}
(out/'cc0_scan_preflight.json').write_text(json.dumps(report,indent=2))
print('SUCCESS: genuine CC0 anatomy scan imported and inspected:',json.dumps(report))
