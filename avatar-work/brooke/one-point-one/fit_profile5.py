"""Bounded profile/neutral-mouth refinement from preserved repair4.
No photograph bytes, original-model overwrites, topology or rig changes.
"""
import hashlib,json,struct,sys
from pathlib import Path
import numpy as np
from scipy.interpolate import PchipInterpolator
from render import load
src,dst=map(Path,sys.argv[1:3]);assert src.resolve()!=dst.resolve()
raw=src.read_bytes();assert hashlib.sha256(raw).hexdigest()=='2e0239c322be3beee5aef151661903fee67e7ea34edb66d1f24b207409d36cc6'
g,original,acc=load(src);binary=bytearray(original)
mesh=g['meshes'][0];pr=mesh['primitives'][0];attrs=pr['attributes']
pos=acc(attrs['POSITION'])
for w,t in zip(mesh['weights'],pr['targets']):pos+=w*acc(t['POSITION'])
x,y,z=pos.T
def smooth(a,b,v):
 t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
def gauss(v,c,s):return np.exp(-.5*((v-c)/s)**2)
# Inspect actual native centreline vertices, avoiding inner mouth/cavity surfaces.
center=pos[(abs(x)<.0035)&(y>1.495)&(y<1.65)&(z>.115)]
keys=np.unique(np.round(center[:,1],5));outer=np.array([[yy,center[abs(center[:,1]-yy)<.000011,2].max()] for yy in keys])
# Deduplicate samples closer than 0.8 mm; use outermost surface in each bin.
bins=np.round(outer[:,0]/.0008).astype(int);sample=np.array([[np.mean(outer[bins==k,0]),np.max(outer[bins==k,1])] for k in np.unique(bins)])
current=PchipInterpolator(sample[:,0],sample[:,1],extrapolate=True)
# Continuous forehead curve shaped against the supplied references, allowing
# for pitch in the smiling profile photograph. These are bounded fitting
# controls, not claims of calibrated anatomical measurements.
fy=np.array([1.548,1.555,1.562,1.570,1.580,1.590,1.600,1.610,1.620,1.630,1.640,1.650])
fz=np.array([.1500,.1498,.1503,.1508,.1515,.1500,.1475,.1408,.1370,.1340,.1260,.1150])
forecurve=PchipInterpolator(fy,fz)
fore_delta=np.clip(forecurve(np.clip(y,fy[0],fy[-1]))-current(y),-.004,.006)
foremask=smooth(1.548,1.559,y)*(1-smooth(1.600,1.617,y))*(1-smooth(.027,.065,abs(x)))*smooth(.112,.132,z)
# Keep the existing eyelid contact surfaces out of the forehead fit.
for cx in [-.0329,.0326]:
 foremask*=1-.98*gauss(x,cx,.018)*gauss(y,1.550,.009)
delta=np.zeros_like(pos);delta[:,2]+=fore_delta*foremask
# Round the lower half of the nasal profile instead of retaining a flat shelf.
ny=np.array([1.498,1.501,1.504,1.507,1.510,1.514,1.518,1.523,1.530])
nz=np.array([.1500,.1530,.1580,.1620,.1650,.1668,.1665,.1640,.1590])
nose_delta=np.clip(PchipInterpolator(ny,nz)(np.clip(y,ny[0],ny[-1]))-current(y),-.004,.002)
nosemask=smooth(1.498,1.502,y)*(1-smooth(1.521,1.530,y))*(1-smooth(.009,.022,abs(x)))*smooth(.139,.153,z)
delta[:,2]+=.45*nose_delta*nosemask
# Neutral front photograph indicates a wider, less protruding mouth.
mouth=smooth(1.459,1.466,y)*(1-smooth(1.489,1.498,y))*(1-smooth(.023,.035,abs(x)))*smooth(.128,.146,z)
delta[:,0]+=.06*x*mouth
projection=(.0009*gauss(y,1.485,.0045)+.0007*gauss(y,1.473,.0045))*mouth
delta[:,2]-=projection
# Reduce lower vermilion height without moving the mouth seam.
delta[:,1]+=.0012*gauss(y,1.470,.004)*(1-smooth(1.476,1.480,y))*mouth
# Explicit protected boundaries.
delta[y<1.455]=0;delta[z<.105]=0
assert np.max(np.linalg.norm(delta,axis=1))<.007
assert not np.any(delta[y<1.455]);assert not np.any(delta[z<.105])
tri=np.vstack([acc(p['indices']).ravel().reshape(-1,3) for p in mesh['primitives']])
newpos=pos+delta
fn=np.cross(newpos[tri[:,1]]-newpos[tri[:,0]],newpos[tri[:,2]]-newpos[tri[:,0]])
normals=np.zeros_like(newpos)
for k in range(3):np.add.at(normals,tri[:,k],fn)
_,groups=np.unique(np.round(newpos,6),axis=0,return_inverse=True)
sums=np.zeros((groups.max()+1,3));np.add.at(sums,groups,normals);normals=sums[groups]
normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-10)
old=acc(attrs['NORMAL'])
for w,t in zip(mesh['weights'],pr['targets']):
 if 'NORMAL' in t:old+=w*acc(t['NORMAL'])
nd=np.zeros_like(normals);changed=np.linalg.norm(delta,axis=1)>1e-7;nd[changed]=normals[changed]-old[changed]
def add(values):
 binary.extend(b'\0'*(-len(binary)%4));vi=len(g['bufferViews']);data=values.astype('<f4').tobytes()
 g['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(data)});binary.extend(data)
 ai=len(g['accessors']);g['accessors'].append({'bufferView':vi,'componentType':5126,'count':len(values),'type':'VEC3','min':values.min(0).tolist(),'max':values.max(0).tolist()});return ai
target={'POSITION':add(delta),'NORMAL':add(nd)}
for p in mesh['primitives']:p['targets'].append(dict(target))
mesh['weights'].append(1.);mesh['extras']['targetNames'].append('Brooke continuous forehead nose and neutral mouth fit')
g['buffers'][0]['byteLength']=len(binary);js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);binary.extend(b'\0'*(-len(binary)%4))
out=struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(out);assert src.read_bytes()==raw
report={'source_sha256':hashlib.sha256(raw).hexdigest(),'candidate_sha256':hashlib.sha256(out).hexdigest(),'max_displacement_mm':float(np.linalg.norm(delta,axis=1).max()*1000),'forehead_centerline_samples_m':sample.tolist(),'forehead_controls_m':np.column_stack([fy,fz]).tolist(),'nose_controls_m':np.column_stack([ny,nz]).tolist(),'rig_uv_topology_preserved':True,'eye_hair_neck_rear_preserved':True,'reference_fit':'qualitative front/profile controls with pitch/expression caution; not calibrated scan','likeness_approved':False}
dst.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if not k.endswith('_m')},indent=2))
