"""Gina5: fit genuine, verified CC0 anatomical 3D scan to real public Gina body.
Source: We Are Beautiful 482357-VSNN-1 standing surface STL, CC0 1.0.
Non-destructive candidate: no weld or original edits. Real skin UVs + weights
are interpolated barycentrically from the original Gina skin triangles.
"""
import bpy, numpy as np, math, json, hashlib, struct, datetime, sys, os, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
from collections import defaultdict
a=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(a)!=3:raise SystemExit('Usage: blender -b --python fit_cc0_scan_to_gina.py -- PUBLIC_GINA.glb PUBLIC_CC0.stl OUT')
gina,scan,out=map(Path,a);out.mkdir(parents=True,exist_ok=True)
def digest(p,k='sha256'):
 h=hashlib.new(k)
 with p.open('rb') as f:
  for buf in iter(lambda:f.read(1<<20),b''):h.update(buf)
 return h.hexdigest()
assert digest(gina)=='1f30b81b2e59484251ba71ecef6c0987ca4ea9172534340c6c156dddead976a4'
assert digest(scan,'sha1')=='3c079f7e979bf5be1315610f9d93ddd220eb47cc'
raw=scan.read_bytes();nt=struct.unpack_from('<I',raw,80)[0]
rec=np.frombuffer(raw,dtype=np.dtype([('normal','<f4',(3,)),('v','<f4',(3,3)),('attribute','<u2')]),offset=84,count=nt)
source=rec['v'].reshape(-1,3).astype(np.float64)
unique,rev=np.unique(np.round(source,6),axis=0,return_inverse=True)
faces=rev.reshape(-1,3)
assert len(unique)==97115 and len(faces)==192199
# Source PCA; DO NOT confuse raw scanner axes with Gina's anatomical axes.
center=np.mean(unique,axis=0)
cov=np.cov(unique.T)
eig,axes=np.linalg.eigh(cov);order=np.argsort(eig)[::-1]
axes=axes[:,order]
pcs=(unique-center)@axes
def norm_axis(v):
 low,high=np.percentile(v,[1.5,98.5]);mid=(low+high)*.5
 return (v-mid)/((high-low)*.5),[float(low),float(high)]
vert,vrange=norm_axis(pcs[:,0])
horiz,hrange=norm_axis(pcs[:,2])
depth=pcs[:,1]
# Shape a border from ORIGINAL scan triangles; no fabricated oval/leaf geometry.
inside=(np.abs(horiz)<=.98)&(np.abs(vert)<=.98)
picked=np.all(inside[faces],axis=1)
keep_faces=faces[picked]
used,converted=np.unique(keep_faces.reshape(-1),return_inverse=True)
keep_faces=converted.reshape(-1,3)
assert len(used)>4000 and len(keep_faces)>7000
uv=np.array(horiz[used]);vv=np.array(vert[used]);dd=np.array(depth[used])
# Remove scanner macro curvature with polynomial detrending while retaining
# actual measured high-frequency anatomical relief from genuine scanned mesh.
X=np.column_stack([np.ones(len(unique)),horiz,vert,horiz**2,horiz*vert,vert**2,
                   horiz**3,(horiz**2)*vert,horiz*(vert**2),vert**3])
X=np.asarray(X,dtype=np.float64)
coeff=np.linalg.lstsq(X,depth,rcond=None)[0]
residual=(depth-X@coeff)[used]
med=np.median(residual)
mad=np.median(np.abs(residual-med))
# Constrain measured relief to small realistic amplitudes, never giant blobs.
normal_detail=np.tanh((residual-med)/max(3.0,2.0*mad))
# Target region is BELOW pubic mound, between thighs, centered near lower pelvis.
# Y-up coordinates: vertical ~0.585..0.686 m, horizontal +/- 0.039m.
target_x=.039*uv
target_y=.636+.052*vv
assert min(target_y)>.58 and max(target_y)<.69
def y_up(p):return Vector((p.x,p.z,-p.y))
def from_y(x,y,z):return Vector((x,-z,y))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(gina.resolve()))
body=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
arm=next((m.object for m in body.modifiers if m.type=='ARMATURE' and m.object),None)
assert arm and len(arm.data.bones)==69
assert len(body.data.vertices)==67121
assert len(body.data.shape_keys.key_blocks)==35
assert len(bpy.data.actions)>=70
orig_face_count=len(body.data.polygons);orig_group_names=set(g.name for g in body.vertex_groups)
skin_slots={i for i,m in enumerate(body.data.materials) if m and m.name=='Skin'}
assert skin_slots,('Missing Gina skin material',list(m.name if m else '' for m in body.data.materials))
skin_material=body.data.materials[min(skin_slots)]
assert body.data.uv_layers.active is not None
bpy.context.view_layer.update()
local_inv=body.matrix_world.inverted_safe()
# BVH ray cast on real body faces at each attachment XY; use skin triangle UV/weights.
coords=[v.co.copy() for v in body.data.vertices]
polys=[list(p.vertices) for p in body.data.polygons]
bvh=BVHTree.FromPolygons(coords,polys,all_triangles=False)
layer=body.data.uv_layers.active
def bary(p,a,b,c):
 v0=b-a;v1=c-a;v2=p-a
 d00=v0.dot(v0);d01=v0.dot(v1);d11=v1.dot(v1);d20=v2.dot(v0);d21=v2.dot(v1)
 den=d00*d11-d01*d01
 if abs(den)<1e-20:return (1,0,0)
 w1=(d11*d20-d01*d21)/den;w2=(d00*d21-d01*d20)/den
 return (1-w1-w2,w1,w2)
body_groups={g.index:g.name for g in body.vertex_groups}
def evaluate_host(x,y):
 start=local_inv@from_y(x,y,.35)
 ray=(local_inv.to_3x3()@from_y(0,0,-1)).normalized()
 # Search forward to back for actual skin face, never nearest disconnected vertex UV.
 for attempt in range(6):
  hit,n,fi,d=bvh.ray_cast(start,ray,1.0)
  if hit is None:break
  poly=body.data.polygons[fi]
  if poly.material_index in skin_slots:
   points=list(poly.vertices);loops=list(poly.loop_indices)
   # Support triangle/quad fan, use triangle inside-hit test.
   best=None
   for j in range(1,len(points)-1):
    tri=(0,j,j+1)
    q=bary(hit,coords[points[tri[0]]],coords[points[tri[1]]],coords[points[tri[2]]])
    score=min(q)
    if best is None or score>best[0]:best=(score,tri,q)
   _,tri,weights=best
   sumu=np.zeros(2);gweights=defaultdict(float)
   for idx,w in zip(tri,weights):
    vi=points[idx];li=loops[idx]
    sumu+=np.array(layer.data[li].uv)*w
    for vg in body.data.vertices[vi].groups:
     if vg.weight>0:gweights[vg.group]+=w*vg.weight
   if not gweights:return None
   top=sorted(gweights.items(),key=lambda x:x[1],reverse=True)[:4]
   total=sum(max(0,w) for _,w in top)
   if total<=.01:return None
   return y_up(body.matrix_world@hit).z,tuple(sumu),[(body_groups[i],max(0,w)/total) for i,w in top],poly.index
  start=hit+ray*.0001
 return None
# Query real body using a regular smooth cached grid; interpolate UV/weights
# from nearest cast samples only where direct hits fail due small mesh gaps.
sample_cache={};failures=[]
def sample(x,y):
 key=(int(round(x*100000)),int(round(y*100000)))
 if key not in sample_cache:sample_cache[key]=evaluate_host(x,y)
 return sample_cache[key]
samples=[sample(float(x),float(y)) for x,y in zip(target_x,target_y)]
bad=[i for i,s in enumerate(samples) if s is None]
if len(bad)>.015*len(samples):
 raise RuntimeError(f'Actual Gina skin ray coverage insufficient: {len(bad)}/{len(samples)}. No fake mapping permitted.')
# Repair sparse body scan misses using nearest known projected point (under 4 mm).
if bad:
 valid=np.array([i for i,s in enumerate(samples) if s is not None])
 xy=np.stack((target_x,target_y),axis=1)
 for i in bad:
  d2=np.sum((xy[valid]-xy[i])**2,axis=1)
  j=valid[np.argmin(d2)]
  if d2.min()>.004**2:raise RuntimeError('Missing actual body sample beyond 4 mm')
  samples[i]=samples[j]
z0=np.array([s[0] for s in samples])
# Feather only scan relief near ORIGINAL scan boundary to avoid squared rims.
perimeter=np.maximum(np.abs(uv),np.abs(vv))
t=np.clip((.98-perimeter)/.16,0,1)
fade=t*t*(3-2*t)
relief=.00036+fade*np.clip(normal_detail*.008,-.008,.008)
world_pts=[from_y(float(x),float(y),float(z+d)) for x,y,z,d in zip(target_x,target_y,z0,relief)]
local_pts=[tuple(local_inv@p) for p in world_pts]
mesh=bpy.data.meshes.new('WeAreBeautiful_CC0_RealScan_Fitted_Mesh')
# Scan normal parity may require reverse face winding to front-face Gina.
faces_view=[tuple(int(v) for v in f) for f in keep_faces]
mesh.from_pydata(local_pts,[],faces_view);mesh.update()
patch=bpy.data.objects.new('Gina5_REAL_CC0_Anatomical_Attachment_V2_UNAPPROVED',mesh)
body.users_collection[0].objects.link(patch)
patch.matrix_world=body.matrix_world.copy()
mesh.materials.append(skin_material)
uvlayer=mesh.uv_layers.new(name='UVMap')
for poly in mesh.polygons:
 for li in poly.loop_indices:
  i=mesh.loops[li].vertex_index
  uvlayer.data[li].uv=samples[i][1]
# Skinned by actual original Gina weights (barycentric blend).
for g in body.vertex_groups:patch.vertex_groups.new(name=g.name)
for i,s in enumerate(samples):
 for name,w in s[2]:
  if w>0:patch.vertex_groups[name].add([i],w,'REPLACE')
armmod=patch.modifiers.new('Actual_Existing_Gina_Armature',type='ARMATURE')
armmod.object=arm
old_transform=patch.matrix_world.copy()
patch.parent=body.parent;patch.matrix_world=old_transform
bpy.context.view_layer.update()
# Preserve true source data independently of fit in an imported reference collection?
# Document raw STL path/license instead; no need to duplicate heavy unaltered scan in scene.
# Shape keys for modest independent movements on actual captured source geometry.
patch.shape_key_add(name='Basis',from_mix=False)
part=patch.shape_key_add(name='CC0_Subtle_Parting',from_mix=False)
full=patch.shape_key_add(name='CC0_Subtle_Fullness',from_mix=False)
center_y=.63
for i,(x,y) in enumerate(zip(target_x,target_y)):
 amt=math.exp(-.5*((x/.014)**2+((y-center_y)/.031)**2))
 dx=.0015*amt*(1 if x>0 else -1)
 part.data[i].co=mesh.vertices[i].co+(local_inv.to_3x3()@from_y(dx,0,0))
 full.data[i].co=mesh.vertices[i].co+(local_inv.to_3x3()@from_y(0,0,.0018*amt))
bpy.context.view_layer.update()
# Verify bone motion on this real skinned source rather than just checking bones exist.
legnames=['LeftUpLeg','RightUpLeg']
legs=[arm.pose.bones.get(n) for n in legnames]
assert all(legs)
def sampled_positions():
 deps=bpy.context.evaluated_depsgraph_get();deps.update()
 ev=patch.evaluated_get(deps);m=ev.to_mesh()
 ids=np.linspace(0,len(m.vertices)-1,25,dtype=int)
 try:return [ev.matrix_world@m.vertices[int(i)].co for i in ids]
 finally:ev.to_mesh_clear()
rest=sampled_positions()
old={b.name:(b.rotation_mode,b.rotation_euler.copy(),b.rotation_quaternion.copy()) for b in legs}
pose_data=[]
for label,angs in [('left_thigh_20',(20,0)),('right_thigh_20',(0,20)),('both_thighs_40',(40,40))]:
 for b,deg in zip(legs,angs):
  b.rotation_mode='XYZ';b.rotation_euler=(math.radians(deg),0,0)
 bpy.context.view_layer.update()
 posed=sampled_positions()
 motion=max((q-p).length for p,q in zip(rest,posed))
 pose_data.append(dict(test=label,max_sample_motion_m=motion,finite=all(math.isfinite(v) for p in posed for v in p)))
for b in legs:
 mode,e,q=old[b.name];b.rotation_mode=mode;b.rotation_euler=e;b.rotation_quaternion=q
bpy.context.view_layer.update()
assert all(x['finite'] for x in pose_data) and pose_data[-1]['max_sample_motion_m']>.003
assert len(body.data.vertices)==67121 and len(body.data.polygons)==orig_face_count
assert len(body.data.shape_keys.key_blocks)==35 and len(arm.data.bones)==69
assert set(g.name for g in body.vertex_groups)==orig_group_names
rim=list(v.index for v in mesh.vertices)
bm=bmesh.new();bm.from_mesh(mesh)
boundary=list(e for e in bm.edges if e.is_boundary)
rim=list(set(v.index for edge in boundary for v in edge.verts))
bm.free()
rim_gaps=np.abs(relief[np.asarray(rim,dtype=int)])
assert len(rim)>20 and float(np.max(rim_gaps))<.0015,'Scan rim not correctly feathered to Gina skin'
assert np.isfinite(relief).all()
report={
 'status':'ACTUAL verified Wikimedia CC0 scan fitted to ORIGINAL Gina skin, separate skinned working copy; NOT WELDED / NOT OWNER-APPROVED',
 'source_sha1':digest(scan,'sha1'),
 'source_glb_sha256':digest(gina),
 'source_license':'CC0 1.0 Universal (We Are Beautiful)',
 'source_page':'https://commons.wikimedia.org/wiki/File:We_Are_Beautiful_%E2%80%93_482357-VSNN-1_%E2%80%93_surface.stl',
 'blender_version':bpy.app.version_string,
 'preserved_original_gina':True,
 'old_rejected_round01_used':False,
 'old_rejected_V1_used':False,
 'gina_body_vertices_before_after':[67121,len(body.data.vertices)],
 'gina_body_faces_before_after':[orig_face_count,len(body.data.polygons)],
 'gina_body_shape_keys':len(body.data.shape_keys.key_blocks),
 'gina_armature_bones':len(arm.data.bones),
 'gina_actions':len(bpy.data.actions),
 'real_attachment_vertices':len(mesh.vertices),
 'real_attachment_faces':len(mesh.polygons),
 'real_attachment_border_edges':len(boundary),
 'sampled_skin_ray_misses_repaired':len(bad),
 'source_pca_axes':axes.tolist(),
 'source_vertical_normalized_quantiles':vrange,
 'source_horizontal_normalized_quantiles':hrange,
 'target_x_range_m':[float(target_x.min()),float(target_x.max())],
 'target_vertical_y_range_m':[float(target_y.min()),float(target_y.max())],
 'target_front_z_range_m':[float((z0+relief).min()),float((z0+relief).max())],
 'max_relief_m':float(np.max(relief)),
 'min_relief_m':float(np.min(relief)),
 'max_boundary_offset_m':float(np.max(rim_gaps)),
 'mean_boundary_offset_m':float(np.mean(rim_gaps)),
 'source_normal_detail_mad_raw':float(mad),
 'attached_to_real_armature':True,
 'attachment_shape_keys':list(mesh.shape_keys.key_blocks.keys()),
 'skin_material':skin_material.name,
 'uv_from_actual_Gina_skin_surface_raycast':True,
 'bone_weights_from_actual_Gina_skin_surface_raycast':True,
 'pose_tests':pose_data,
 'verified_true_seam_weld':False,
 'owner_approved':False,
 'production_ready':False,
 'needs':['Front/side/underside actual owner viewer acceptance','Texture seam and body clearance test','Full animation pose tests and corrective morphs','Welding or controlled surface join only after acceptance'],
 'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()
}
scene=out/'Gina5_CC0_Real_Scan_Attachment_UNAPPROVED.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(scene.resolve()),compress=True)
report['blender_checkpoint']=str(scene)
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.data.objects:
 if ob.type in ('MESH','ARMATURE','EMPTY'):ob.select_set(True)
bpy.context.view_layer.objects.active=body
glb=out/'Gina5_CC0_Real_Scan_Attachment_UNAPPROVED.glb'
bpy.ops.export_scene.gltf(filepath=str(glb.resolve()),export_format='GLB',use_selection=True,
                          export_animations=False,export_skins=True,export_morph=True)
assert glb.exists() and glb.stat().st_size>1000000
report['preview_glb']=str(glb);report['preview_glb_size_bytes']=glb.stat().st_size
(out/'gina5_cc0_fit_report.json').write_text(json.dumps(report,indent=2))
print('PASS genuine CC0 scan on real Gina 5 body; no old attachment; NOT WELDED OR APPROVED',json.dumps(report))
