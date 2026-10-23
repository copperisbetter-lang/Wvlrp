"""Brooke 1.1 pass 1: reversible eyelid morph and feathered jaw color correction.
Usage: python refine_1_1.py source.glb output.glb
"""
import io,json,struct,sys,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, distance_transform_edt
from render import load
src,dest=map(Path,sys.argv[1:3]);raw=src.read_bytes();g,original,acc=load(src);binary=bytearray(original)
def append(data):
 binary.extend(b'\0'*(-len(binary)%4));idx=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(data)});binary.extend(data);return idx
def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
skin=g['meshes'][0];pr=skin['primitives'][0];attrs=pr['attributes'];pos=acc(attrs['POSITION'])
for w,t in zip(skin['weights'],pr['targets']):pos+=w*acc(t['POSITION'])
delta=np.zeros_like(pos)
# Tight eye-local support keeps the brow, nose, cheeks and all neck vertices fixed.
# This is an artistic correction based on review, not a biometric measurement.
for cx in [-.03275,.03275]:
 dx=(pos[:,0]-cx);dy=pos[:,1]-1.550
 support=(1-smooth(.012,.022,np.abs(dx)))*(1-smooth(.008,.018,np.abs(dy)))*smooth(.113,.129,pos[:,2])
 shift=np.where(dy>=0,-.26*dy-.00025,-.10*dy-.00005)
 delta[:,1]+=support*shift
newpos=pos+delta
assert np.max(np.linalg.norm(delta,axis=1))<.003
assert np.max(np.abs(delta[pos[:,1]<1.52]))==0
ai=len(g['accessors']);g['accessors'].append({'bufferView':append(delta.astype('<f4').tobytes()),'componentType':5126,'count':len(delta),'type':'VEC3','min':delta.min(0).tolist(),'max':delta.max(0).tolist()})
target={'POSITION':ai};tri=acc(pr['indices']).ravel().reshape(-1,3)
norm=np.zeros_like(pos);face=np.cross(newpos[tri[:,1]]-newpos[tri[:,0]],newpos[tri[:,2]]-newpos[tri[:,0]])
for k in range(3):np.add.at(norm,tri[:,k],face)
norm/=np.maximum(np.linalg.norm(norm,axis=1,keepdims=True),1e-10)
old=acc(attrs['NORMAL'])
for w,t in zip(skin['weights'],pr['targets']):
 if 'NORMAL'in t:old+=w*acc(t['NORMAL'])
ni=len(g['accessors']);g['accessors'].append({'bufferView':append((norm-old).astype('<f4').tobytes()),'componentType':5126,'count':len(norm),'type':'VEC3'});target['NORMAL']=ni
pr['targets'].append(target);skin['weights'].append(1.);skin['extras']['targetNames'].append('Brooke 1.1 relaxed eyelids')
# Build a UV position atlas. Corrections follow anatomy instead of a rectangular paint patch.
N=1024;uv=acc(attrs['TEXCOORD_0'])*(N-1);atlas=np.zeros((N,N,3),np.float32);mask=np.zeros((N,N),bool)
for tr in tri:
 pts=uv[tr];lo=np.maximum(np.floor(pts.min(0)).astype(int),0);hi=np.minimum(np.ceil(pts.max(0)).astype(int),N-1)
 if np.any(hi<lo):continue
 mat=np.vstack([pts.T,np.ones(3)])
 if abs(np.linalg.det(mat))<1e-9:continue
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));w=np.linalg.inv(mat)@np.vstack([xx.ravel(),yy.ravel(),np.ones(xx.size)]);inside=w.min(0)>=-1e-5
 px=xx.ravel()[inside];py=yy.ravel()[inside];atlas[py,px]=w[:,inside].T@pos[tr];mask[py,px]=True
ii=g['textures'][g['materials'][pr['material']]['pbrMetallicRoughness']['baseColorTexture']['index']]['source'];v=g['bufferViews'][g['images'][ii]['bufferView']]
im=Image.open(io.BytesIO(original[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGBA');tex=np.array(im).astype(float)/255
small=np.array(im.resize((N,N),Image.Resampling.LANCZOS)).astype(float)/255
x,y,z=atlas.transpose(2,0,1)
neck=mask&(y>1.405)&(y<1.435)&(z>.05)&(abs(x)<.04)
tone=np.median(small[neck,:3],axis=0);assert neck.sum()>100
# Preserve photographic brows, nose and mouth; feather toward native neck tone.
side=smooth(.028,.065,np.abs(x))*(1-smooth(1.515,1.545,y))
jaw=(1-smooth(1.465,1.490,y))*smooth(1.425,1.453,y)
strength=.80*np.maximum(side,jaw)*smooth(.05,.105,z)*smooth(1.425,1.45,y)*mask
edge=distance_transform_edt(mask);strength*=smooth(0,6,edge)
low=np.stack([gaussian_filter(small[:,:,c],10) for c in range(3)],-1)
corr=np.clip(tone-low,-.14,.14)*strength[:,:,None]
for c in range(3):
 full=np.asarray(Image.fromarray(corr[:,:,c].astype('float32'),'F').resize(im.size,Image.Resampling.BILINEAR));tex[:,:,c]=np.clip(tex[:,:,c]+full,0,1)
buf=io.BytesIO();Image.fromarray(np.round(tex*255).astype('uint8')).save(buf,format='PNG')
g['images'][ii]={'bufferView':append(buf.getvalue()),'mimeType':'image/png','name':'Brooke 1.1 feathered cheek jaw neck skin'}
for node in g['nodes']:
 if node.get('mesh')==0:node['name']='Brooke 1.1 native photo head and neck'
g['buffers'][0]['byteLength']=len(binary);js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);binary.extend(b'\0'*(-len(binary)%4))
out=struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
dest.write_bytes(out)
# Check source integrity, old accessor bytes, rig, topology and unrelated meshes.
gg,bb,aa=load(dest)
assert src.read_bytes()==raw
assert all(np.array_equal(acc(i),aa(i)) for i in range(len(g['accessors'])-2))
assert gg['skins']==g['skins'] and gg.get('animations')==g.get('animations')
report={'version':'Brooke 1.1 pass 1','source_sha256':hashlib.sha256(raw).hexdigest(),'candidate_sha256':hashlib.sha256(out).hexdigest(),'source_unchanged':True,'original_accessors_unchanged':True,'topology_and_rig_unchanged':True,'eyeballs_and_hair_unchanged':True,'neck_geometry_unchanged':True,'new_morph':'Brooke 1.1 relaxed eyelids','max_eyelid_displacement_m':float(np.linalg.norm(delta,axis=1).max()),'changed_skin_vertices':int(np.count_nonzero(np.linalg.norm(delta,axis=1))),'jaw_texture_blend':'Anatomy-masked low-frequency correction toward native neck color; central features protected','neck_reference_rgb':tone.tolist(),'visual_approval_pending':True}
dest.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
