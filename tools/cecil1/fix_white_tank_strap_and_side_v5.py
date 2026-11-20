#!/usr/bin/env python3
"""Localized clothing-only modifications: pull floating back tank straps onto Dad's shoulders, and clear side body breakthrough.
This script applies to the prior privately assembled combined GLB. It does NOT alter Dad mesh, scan, hat, body, boxer or rig.
"""
from pathlib import Path
import json,struct,hashlib,re,base64
import numpy as np, trimesh, vtk

S=Path('/mnt/data/CECIL1_DAD_REAL_FREE_WHITE_TANK_BOXERS.glb')
H=Path('/mnt/data/CECIL1_DAD_V9_HAT_WHITE_TANK_AND_BOXERS_VIEWER.html')
O=Path('/mnt/data/CECIL1_DAD_WHITE_UNDERCLOTHES_FIT_V5.glb')
OH=Path('/mnt/data/CECIL1_DAD_WHITE_UNDERCLOTHES_FIT_V5_VIEWER.html')

raw=S.read_bytes()
assert raw[:4]==b'glTF'
json_len,_=struct.unpack_from('<II',raw,12)
j=json.loads(raw[20:20+json_len].decode('utf-8'))
bin_off=20+json_len
blen,_=struct.unpack_from('<II',raw,bin_off)
bin_start=bin_off+8
bin_blob=bytearray(raw[bin_start:bin_start+blen])

comp={5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8}
npcomp={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def acc(i):
 a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]
 dt=np.dtype(comp[a['componentType']]); n=npcomp[a['type']]
 offset=bv.get('byteOffset',0)+a.get('byteOffset',0)
 stride=bv.get('byteStride',n*dt.itemsize)
 arr=np.ndarray((a['count'],n),dtype=dt,buffer=bin_blob,offset=offset,strides=(stride,dt.itemsize))
 return arr,a

pos,pa=acc(134); normals,na=acc(135)
oldpos=pos.copy();p=pos.copy();old_normal=normals.copy()
body=trimesh.load(S,force='scene').geometry['Yan_Genuine_DAZ_Genesis9_BaseFeminine_25182v_V1_5']
vp=vtk.vtkPoints();
for pt in body.vertices:vp.InsertNextPoint(*[float(v) for v in pt])
polys=vtk.vtkCellArray();
for face in body.faces:
 tri=vtk.vtkTriangle()
 for q,k in enumerate(face):tri.GetPointIds().SetId(q,int(k))
 polys.InsertNextCell(tri)
pd=vtk.vtkPolyData();pd.SetPoints(vp);pd.SetPolys(polys)
imp=vtk.vtkImplicitPolyDataDistance();imp.SetInput(pd)

def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t)

# Shoulder back strap fit: coherent smooth anatomical repositioning (not snapped
# to nearest body triangle, which can produce a sharp crest at shoulder seams).
y=p[:,1];x=p[:,0];z=p[:,2]
w_y=smooth(1.365,1.475,y)
w_x=smooth(.045,.11,np.abs(x))
w_back=1.-smooth(-.043,.012,z)
w=w_y*w_x*w_back
p[:,2]+=.018*w          # toward back of skin / forward of floating strap
p[:,1]-=.006*w          # settle higher rear loops down onto shoulder slope
p[:,0]-=np.sign(x)*.003*w  # follow the narrower shoulder shape
moved_strap=int(np.sum(w>.001))

# Final shoulder-edge protection: upper rear edge of the real G8 garment
# can intersect the G9 shoulder ridge even after lowering the floating loop.
# Ease those edge vertices laterally out of the skin with smooth Gaussian taper.
y=p[:,1];x=p[:,0];z=p[:,2]
seam_guard=np.exp(-.5*((np.abs(x)-.110)/.043)**2)*np.exp(-.5*((y-1.508)/.027)**2)*np.exp(-.5*((z+.090)/.047)**2)
p[:,0]+=np.sign(x)*.011*seam_guard

# Local clearance patch: a rip-looking skin breakthrough under the right arm
# appears at y ~1.13 m, positive-x flank / back-side, z near -0.065 m.
# Patch both sides to preserve symmetry; grow shirt away from skin only in this narrow zone.
# Smoothly feather into adjacent actual tank mesh; no patch/painted polygons added.
y=p[:,1];x=p[:,0];z=p[:,2]
sides=smooth(.085,.120,np.abs(x))
cy=np.exp(-.5*((y-1.132)/.057)**2)
cz=np.exp(-.5*((z+.066)/.045)**2)
side_weight=sides*cy*cz
p[:,0]+=np.sign(x)*.014*side_weight

# Recompute vertex normals using the actual original GLB triangle connectivity.
idx_id=j['meshes'][3]['primitives'][0]['indices']
idx_array,_=acc(idx_id)
faces=idx_array.ravel().astype(np.int32).reshape((-1,3))
mesh=trimesh.Trimesh(vertices=p,faces=faces,process=False)
computed=mesh.vertex_normals.astype(np.float32)
pos[:]=p.astype(np.float32)
normals[:]=computed
pa['min']=np.min(p,axis=0).astype(float).tolist();pa['max']=np.max(p,axis=0).astype(float).tolist()

# Piecewise QA: measure torso breakout at triangle midpoints and shoulder proximity.
mid=p[faces].mean(axis=1)
face_zone=(mid[:,1]>1.06)&(mid[:,1]<1.205)&(mid[:,0]>.10)&(mid[:,2]>-.11)&(mid[:,2]<-.015)
face_sdf=np.array([imp.EvaluateFunction(pt.astype(float).tolist()) for pt in mid[face_zone]])
print('breakout triangle midpoints',len(face_sdf),'neg',int(np.sum(face_sdf<0)),'min sdf',round(float(min(face_sdf)),6))
if np.sum(face_sdf<-.001):
    print('warning: sub-mm penetrations remain in monitored region')

origstrap=(oldpos[:,1]>1.47)&(oldpos[:,2]<-.045)&(np.abs(oldpos[:,0])>.10)
newdist=[];olddist=[]
for pt1,pt2 in zip(oldpos[origstrap],p[origstrap]):
 olddist.append(imp.EvaluateFunction(pt1.astype(float).tolist()));newdist.append(imp.EvaluateFunction(pt2.astype(float).tolist()))
print('shoulder strap old/new gap median m',np.median(olddist),np.median(newdist),'count',len(olddist))

# Preserve every byte outside the exact tank POSITION/NORMAL array buffer regions.
newj=json.dumps(j,separators=(',',':')).encode('utf-8')
newj+=b' '*((-len(newj))%4)
newbin=bytes(bin_blob)+b'\x00'*((-len(bin_blob))%4)
out=struct.pack('<4sII',b'glTF',2,12+8+len(newj)+8+len(newbin)) +struct.pack('<II',len(newj),0x4e4f534a)+newj+struct.pack('<II',len(newbin),0x004e4942)+newbin
O.write_bytes(out)

h=H.read_text(errors='ignore')
assert '<script id="glbData"' in h
m=re.search(r'(<script id="glbData"[^>]*>)(.*?)(</script>)',h,re.S)
h=h[:m.start(2)]+base64.b64encode(out).decode('ascii')+h[m.end(2):]
h=h.replace('Dad / Cecil 1 — FREE white undershirt + boxers (review)','Dad / Cecil 1 — white undershirt FIT V5 + boxers (review)')
h=h.replace('Real owner-supplied FREE DAZ garments: white sleeveless cotton undershirt and white boxer shorts. Hat V9 and Dad unchanged. Fit and movement approval pending.','White tank fit V5: shoulder straps reshaped closer to back, side skin-breakthrough area cleared; boxers and Dad + hat V9 unchanged. Animation review pending.')
OH.write_text(h)

# Byte-for-byte confirm entire old BIN region outside tank accessor byte arrays unchanged.
mask=bytearray(b'\x01')*len(bin_blob)
for ai in (134,135):
 a=j['accessors'][ai];b=j['bufferViews'][a['bufferView']];start=b.get('byteOffset',0)+a.get('byteOffset',0);length=a['count']*3*4
 mask[start:start+length]=b'\x00'*length
orig_bin=raw[bin_start:bin_start+blen]
assert all((x==y) for x,y,k in zip(orig_bin,bin_blob,mask) if k)
assert len(j['skins'][0]['joints'])==138
# Verify HTML exact GLB contents.
m2=re.search(r'<script id="glbData"[^>]*>(.*?)</script>',OH.read_text(errors='ignore'),re.S)
assert base64.b64decode(m2.group(1).strip())==out
summary={
 'source':S.name,'source_glb_sha256':hashlib.sha256(raw).hexdigest(),
 'glb':O.name,'glb_sha256':hashlib.sha256(out).hexdigest(),'glb_bytes':len(out),
 'viewer':OH.name,'viewer_sha256':hashlib.sha256(OH.read_bytes()).hexdigest(),'viewer_bytes':OH.stat().st_size,
 'changed_mesh':'Free_white_ribbed_G8_tank_top POSITION and NORMAL only',
 'affected_vertices':int(np.sum(np.linalg.norm(p-oldpos,axis=1)>.00001)),
 'max_vertex_offset_m':float(np.max(np.linalg.norm(p-oldpos,axis=1))),
 'shoulder_gap_median_before_m':float(np.median(olddist)),
 'shoulder_gap_median_after_m':float(np.median(newdist)),
 'side_breakout_face_centroids_below_surface':int(np.sum(face_sdf<0)),
 'side_breakout_min_sdf_m':float(np.min(face_sdf)),
 'hat_dad_body_boxers_source_bin_unchanged':True,'skeleton_joints':138,
 'status':'candidate; awaiting owner Android screenshot + animated cloth/collision checks'
}
Path('/mnt/data/CECIL1_DAD_WHITE_UNDERCLOTHES_FIT_V5_QA.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2))