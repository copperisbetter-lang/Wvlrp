"""Back out excessive forehead fit and relax neutral lip projection on clone 6."""
import hashlib,json,struct,sys
from pathlib import Path
import numpy as np
from render import load
src,dst=map(Path,sys.argv[1:3]);assert src.resolve()!=dst.resolve();raw=src.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='68ec0c2ba513f6b2705d1331ace8abe1804c15f9aa1866be6c5c82a0beb8c506'
g,b,acc=load(src);binary=bytearray(b);mesh=g['meshes'][0]
fit_index=mesh['extras']['targetNames'].index('Brooke continuous forehead nose and neutral mouth fit')
def smooth(a,b,v):
 t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
def gauss(v,c,s):return np.exp(-.5*((v-c)/s)**2)
def add(values):
 values=np.asarray(values,dtype='<f4');binary.extend(b'\0'*(-len(binary)%4));vi=len(g['bufferViews'])
 data=values.tobytes();g['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(data)});binary.extend(data)
 ai=len(g['accessors']);g['accessors'].append({'bufferView':vi,'componentType':5126,'count':len(values),'type':'VEC3','min':values.min(0).tolist(),'max':values.max(0).tolist()});return ai
summaries=[]
for pi,p in enumerate(mesh['primitives']):
 attrs=p['attributes'];pos=acc(attrs['POSITION'])
 for w,t in zip(mesh['weights'],p['targets']):pos+=w*acc(t['POSITION'])
 x,y,z=pos.T;delta=np.zeros_like(pos)
 # Exact partial reversal of the last forehead fit, not another volume addition.
 prior=acc(p['targets'][fit_index]['POSITION'])
 fore=(y>1.548)&(z>.105)
 delta[fore,2]-=.75*prior[fore,2]
 # Retain present width and seam. Relax protrusion, with no added lip volume.
 mouth=smooth(1.460,1.467,y)*(1-smooth(1.490,1.498,y))*(1-smooth(.023,.034,abs(x)))*smooth(.126,.145,z)
 retract=(.0011*gauss(y,1.485,.004)+.0008*gauss(y,1.4735,.0045))*mouth
 delta[:,2]-=retract
 # Slight vertical reduction of the lower vermilion, fading out before seam.
 delta[:,1]+=.00075*gauss(y,1.470,.004)*(1-smooth(1.476,1.480,y))*mouth
 delta[y<1.455]=0;delta[z<.105]=0
 assert np.max(np.linalg.norm(delta,axis=1))<.005
 newpos=pos+delta;tri=acc(p['indices']).ravel().reshape(-1,3)
 nn=np.zeros_like(newpos);fn=np.cross(newpos[tri[:,1]]-newpos[tri[:,0]],newpos[tri[:,2]]-newpos[tri[:,0]])
 for k in range(3):np.add.at(nn,tri[:,k],fn)
 _,groups=np.unique(np.round(newpos,6),axis=0,return_inverse=True);sums=np.zeros((groups.max()+1,3));np.add.at(sums,groups,nn);nn=sums[groups]
 nn/=np.maximum(np.linalg.norm(nn,axis=1,keepdims=True),1e-10)
 old=acc(attrs['NORMAL'])
 for w,t in zip(mesh['weights'],p['targets']):
  if 'NORMAL' in t:old+=w*acc(t['NORMAL'])
 nd=np.zeros_like(nn);changed=np.linalg.norm(delta,axis=1)>1e-7;nd[changed]=nn[changed]-old[changed]
 p['targets'].append({'POSITION':add(delta),'NORMAL':add(nd)})
 summaries.append({'primitive':pi,'vertices':len(pos),'max_displacement_mm':float(np.linalg.norm(delta,axis=1).max()*1000),'forehead_rollback_fraction':.75})
mesh['weights'].append(1.);mesh['extras']['targetNames'].append('Brooke reduced forehead bulge and relaxed lips')
g['buffers'][0]['byteLength']=len(binary);js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);binary.extend(b'\0'*(-len(binary)%4))
out=struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(out);assert src.read_bytes()==raw
report={'source_sha256':hashlib.sha256(raw).hexdigest(),'candidate_sha256':hashlib.sha256(out).hexdigest(),'primitives':summaries,'topology_uv_rig_materials_preserved':True,'cavity_repairs_retained':True,'mouth_width_unchanged':True,'no_added_lip_volume':True,'likeness_approved':False}
dst.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
