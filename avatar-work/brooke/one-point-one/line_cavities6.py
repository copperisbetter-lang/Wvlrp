"""Replace defective internal cap faces with smooth rigged cavity liners.
Keeps outer facial surface, rig, controls and earlier candidates intact.
"""
import copy,hashlib,json,struct,sys
from pathlib import Path
import numpy as np
from render import load
src,dst=map(Path,sys.argv[1:3]);raw=src.read_bytes();assert src.resolve()!=dst.resolve()
assert hashlib.sha256(raw).hexdigest()=='53648767fa59b3595ec77849dc7b037445523d080a81f59a1f4c5abb66a55acd'
g,b,acc=load(src);binary=bytearray(b);m=g['meshes'][0];old=copy.deepcopy(m['primitives']);assert len(old)==3
p=old[0];attrs=p['attributes'];posed=acc(attrs['POSITION'])
for w,t in zip(m['weights'],p['targets']):posed+=w*acc(t['POSITION'])
def append(data):
 binary.extend(b'\0'*(-len(binary)%4));i=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(data)});binary.extend(data);return i
def accessor(v,type,component=5126):
 dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[component];v=np.asarray(v,dtype=dtype);i=len(g['accessors']);a={'bufferView':append(v.tobytes()),'componentType':component,'count':len(v),'type':type}
 if type=='VEC3':a.update({'min':v.min(0).tolist(),'max':v.max(0).tolist()})
 g['accessors'].append(a);return i
# Existing cavity materials are uniform, unlit textures; outer skin unchanged.
mouth_mat=old[1]['material'];nose_mat=old[2]['material']
def lining(points,faces,material):
 points=np.array(points,np.float32);faces=np.array(faces,np.uint32);n=np.zeros_like(points)
 fn=np.cross(points[faces[:,1]]-points[faces[:,0]],points[faces[:,2]]-points[faces[:,0]])
 for k in range(3):np.add.at(n,faces[:,k],fn)
 n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-10)
 # Weight each lining vertex to the nearby existing facial rig, using the
 # posed coordinates as its basis. Bone rest transforms are unchanged.
 nearest=np.argmin(((points[:,None,:]-posed[None,:,:])**2).sum(2),axis=1)
 basis=points.copy();morphed=[]
 for w,t in zip(m['weights'],p['targets']):
  movement=acc(t['POSITION'])[nearest] if 'POSITION' in t else np.zeros_like(points)
  morphed.append(movement);basis-=w*movement
 attributes={'POSITION':accessor(basis,'VEC3'),'NORMAL':accessor(n,'VEC3'),'TEXCOORD_0':accessor(np.zeros((len(points),2)),'VEC2')}
 for key in ['JOINTS_0','WEIGHTS_0']:
  source=g['accessors'][attrs[key]];v=acc(attrs[key])[nearest]
  attributes[key]=accessor(v,'VEC4',5123 if key=='JOINTS_0' else 5126)
 zi=accessor(np.zeros_like(points),'VEC3')
 return {'attributes':attributes,'indices':accessor(faces.ravel()[:,None],'SCALAR',5125),'material':material,'targets':[{'POSITION':accessor(movement,'VEC3'),'NORMAL':zi} for movement in morphed]}
N=64
angles=np.arange(N)*2*np.pi/N
# Recessed oral lining follows the mouth's horizontal taper. It replaces
# the irregular bright cap faces rather than hiding them with paint.
points=[[0,1.4809,.140]]
for a in angles:
 x=.0275*np.cos(a);y=1.4809+.0017*np.sin(a)
 z=.145-.0200*(abs(x)/.0275)**1.8
 points.append([x,y,z])
faces=[[0,i+1,(i+1)%N+1] for i in range(N)]
new_mouth=lining(points,faces,mouth_mat)
# Curved inner nostril liners sit behind the external nose rim.
points=[];faces=[]
for sign in [-1,1]:
 start=len(points);points.append([sign*.0136,1.5019,.1360])
 for a in angles:
  points.append([sign*.0136+.0036*np.cos(a),1.5019+.0042*np.sin(a),.1380+.0015*np.sin(a)])
 faces.extend([[start,start+i+1,start+(i+1)%N+1] for i in range(N)])
new_nose=lining(points,faces,nose_mat)
m['primitives']=[old[0],new_mouth,new_nose]
g['buffers'][0]['byteLength']=len(binary);js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);binary.extend(b'\0'*(-len(binary)%4))
out=struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(out);assert src.read_bytes()==raw
report={'source_sha256':hashlib.sha256(raw).hexdigest(),'candidate_sha256':hashlib.sha256(out).hexdigest(),'removed_inner_cap_faces':sum(acc(p['indices']).size//3 for p in old[1:]),'new_mouth_lining_faces':64,'new_nostril_lining_faces':128,'outer_face_geometry_unchanged':True,'rig_preserved':True,'likeness_approved':False}
dst.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
