import struct,json, math
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation as R
p=Path('/mnt/data/CECIL1_DAD_STARTER_ANIMATIONS_V1.glb')
raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n]);off=20+n;bl=struct.unpack_from('<I',raw,off)[0];blob=raw[off+8:off+8+bl]
parent={}
for i,node in enumerate(j['nodes']):
 for c in node.get('children',[]):parent[c]=i
names={node.get('name'):i for i,node in enumerate(j['nodes'])}
def arr(i):
 acc=j['accessors'][i];v=j['bufferViews'][acc['bufferView']];n=acc['count']; dim={'SCALAR':1,'VEC3':3,'VEC4':4,'MAT4':16}[acc['type']];
 return np.frombuffer(blob,dtype='<f4',count=n*dim,offset=v.get('byteOffset',0)+acc.get('byteOffset',0)).reshape(n,dim)
def pose_at(animidx,t):
 anim=j['animations'][animidx]; override={}
 for ch in anim['channels']:
  sm=anim['samplers'][ch['sampler']];times=arr(sm['input'])[:,0];v=arr(sm['output']);
  hi=max(1,min(len(times)-1,int(np.searchsorted(times,t,side='right'))));lo=hi-1;
  f=max(0,min(1,(t-times[lo])/(times[hi]-times[lo])))
  a=v[lo].copy();b=v[hi].copy();
  if ch['target']['path']=='rotation' and np.dot(a,b)<0:b=-b
  q=a*(1-f)+b*f
  if ch['target']['path']=='rotation':q/=np.linalg.norm(q)
  override[(ch['target']['node'],ch['target']['path'])]=q
 glob={}
 def G(i):
  if i in glob:return glob[i]
  node=j['nodes'][i];r=override.get((i,'rotation'),node.get('rotation',[0,0,0,1]));tr=override.get((i,'translation'),node.get('translation',[0,0,0]));
  m=np.eye(4);m[:3,:3]=R.from_quat(r).as_matrix();m[:3,3]=tr
  if i in parent:m=G(parent[i])@m
  glob[i]=m;return m
 return G
checks=['DAZ_G9_l_hand','DAZ_G9_l_forearm','DAZ_G9_l_upperarm','DAZ_G9_r_hand','DAZ_G9_l_foot','DAZ_G9_r_foot','DAZ_G9_head']
rest=pose_at(0,0)
for ai,tt in [(0,1),(1,0.45),(1,1.0),(2,1.4),(2,2.0),(3,1.1)]:
 posed=pose_at(ai,tt)
 print(j['animations'][ai]['name'],tt)
 for name in checks:
  i=names[name];a=rest(i)[:3,3];b=posed(i)[:3,3]
  if np.linalg.norm(a-b)>.003:print(' ',name, 'displacement_cm',round(float(np.linalg.norm(a-b)*100),1), 'XYZ_cm',np.round(100*(b-a),1))