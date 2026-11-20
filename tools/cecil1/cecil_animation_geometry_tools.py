import json,struct,numpy as np
from pathlib import Path
from scipy.spatial.transform import Rotation as Rot, Slerp
from collections import defaultdict

NCOMP={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
TYPES={5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8,5120:np.int8,5122:np.int16}
class GLB:
 def __init__(self,path):
  self.path=Path(path);self.raw=self.path.read_bytes()
  assert self.raw[:4]==b'glTF'
  k,typ=struct.unpack_from('<II',self.raw,12);assert typ==0x4e4f534a
  self.j=json.loads(self.raw[20:20+k].decode())
  o=20+k;blen,typ=struct.unpack_from('<II',self.raw,o);assert typ==0x004e4942
  self.data=bytearray(self.raw[o+8:o+8+blen]);self.old_data=bytes(self.data)
  self.nodes=self.j['nodes'];self.byname={n.get('name'):i for i,n in enumerate(self.nodes)}
  self.joints=self.j['skins'][0]['joints']
  self.parents={}
  for i,n in enumerate(self.nodes):
   for c in n.get('children',[]):self.parents[c]=i
 def arr(self,i):
  a=self.j['accessors'][i];v=self.j['bufferViews'][a['bufferView']]
  dt=np.dtype(TYPES[a['componentType']]);nn=NCOMP[a['type']]
  ofs=v.get('byteOffset',0)+a.get('byteOffset',0)
  stride=v.get('byteStride',nn*dt.itemsize)
  return np.ndarray((a['count'],nn),dtype=dt,buffer=self.data,offset=ofs,strides=(stride,dt.itemsize)),a
 def matrix(self,node,quat=None,trans=None):
  q=np.asarray(quat if quat is not None else node.get('rotation',[0,0,0,1]));t=np.asarray(trans if trans is not None else node.get('translation',[0,0,0]),float)
  m=np.eye(4);m[:3,:3]=Rot.from_quat(q).as_matrix()*np.array(node.get('scale',[1,1,1]));m[:3,3]=t
  return m
 def skin_mats(self,pose=None):
  pose=pose or {}
  global_cache={}
  def glo(i):
   if i not in global_cache:
    name=self.nodes[i].get('name')
    override=pose.get(name,{})
    m=self.matrix(self.nodes[i],override.get('rotation'),override.get('translation'))
    if i in self.parents:m=glo(self.parents[i])@m
    global_cache[i]=m
   return global_cache[i]
  invbind,_=self.arr(self.j['skins'][0]['inverseBindMatrices'])
  invbind=invbind.reshape((-1,4,4)).transpose((0,2,1)).copy()
  return np.stack([glo(ji)@invbind[k] for k,ji in enumerate(self.joints)])
 def skinned(self,prim,pose=None,mats=None):
  a=prim['attributes']; P,_=self.arr(a['POSITION']);J,_=self.arr(a['JOINTS_0']);W,_=self.arr(a['WEIGHTS_0']);
  J=J.astype(np.int32);W=W.astype(float)
  mats=self.skin_mats(pose) if mats is None else mats
  Q=np.column_stack([P.astype(float),np.ones(len(P))]); v=np.zeros((len(P),4))
  for i in range(4):
   v+=(np.einsum('nij,nj->ni',mats[J[:,i]],Q))*W[:,i,None]
  return v[:,:3]
 def get_pose_at(self,clip_idx,t):
  anim=self.j['animations'][clip_idx];pose=defaultdict(dict)
  for ch in anim['channels']:
   sp=anim['samplers'][ch['sampler']];ts,_=self.arr(sp['input']);v,_=self.arr(sp['output']);ts=ts[:,0]
   hi=np.clip(np.searchsorted(ts,t,side='left'),1,len(ts)-1);lo=hi-1
   k=np.clip((t-ts[lo])/(ts[hi]-ts[lo]),0,1)
   if sp.get('interpolation')=='STEP':k=0
   if ch['target']['path']=='rotation':
    q0=v[lo].astype(float);q1=v[hi].astype(float)
    if np.dot(q0,q1)<0:q1=-q1
    qq=q0+(q1-q0)*k;qq/=np.linalg.norm(qq)
    pose[self.nodes[ch['target']['node']]['name']]['rotation']=qq.tolist()
   elif ch['target']['path']=='translation':
    vv=v[lo]+(v[hi]-v[lo])*k
    pose[self.nodes[ch['target']['node']]['name']]['translation']=vv.tolist()
  return pose
 def write(self,path):
  self.j['buffers'][0]['byteLength']=len(self.data)
  jb=json.dumps(self.j,separators=(',',':'),ensure_ascii=False).encode('utf8');jb+=b' '*((-len(jb))%4)
  b=bytes(self.data);b+=b'\x00'*((-len(b))%4)
  p=struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(b))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(b),0x004e4942)+b
  Path(path).write_bytes(p)