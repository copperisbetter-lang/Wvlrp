"""Brooke 1.1 pass 2: reversible eyelid/lip corrections and skin cleanup.
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
 # Continuous across the eye line, including the tiny inner-corner triangles.
 shift=-.32*dy-.00065*np.tanh(dy/.003)
 delta[:,1]+=support*shift
# Retract the rolled lip rim visible in profile. Move surrounding mouth tissue
# smoothly with it; do not flatten the entire face or change the mouth width.
x,y,z=pos.T
lip=np.exp(-.5*((y-1.477)/.0055)**2)*np.exp(-.5*(x/.022)**4)*smooth(.125,.145,z)*smooth(1.455,1.463,y)
delta[:,2]-=.0032*lip
newpos=pos+delta
assert np.max(np.linalg.norm(delta,axis=1))<.0045
assert np.max(np.abs(delta[pos[:,1]<1.45]))==0
ai=len(g['accessors']);g['accessors'].append({'bufferView':append(delta.astype('<f4').tobytes()),'componentType':5126,'count':len(delta),'type':'VEC3','min':delta.min(0).tolist(),'max':delta.max(0).tolist()})
target={'POSITION':ai};tri=acc(pr['indices']).ravel().reshape(-1,3)
norm=np.zeros_like(pos);face=np.cross(newpos[tri[:,1]]-newpos[tri[:,0]],newpos[tri[:,2]]-newpos[tri[:,0]])
for k in range(3):np.add.at(norm,tri[:,k],face)
norm/=np.maximum(np.linalg.norm(norm,axis=1,keepdims=True),1e-10)
old=acc(attrs['NORMAL'])
for w,t in zip(skin['weights'],pr['targets']):
 if 'NORMAL'in t:old+=w*acc(t['NORMAL'])
ni=len(g['accessors']);g['accessors'].append({'bufferView':append((norm-old).astype('<f4').tobytes()),'componentType':5126,'count':len(norm),'type':'VEC3'});target['NORMAL']=ni
pr['targets'].append(target);skin['weights'].append(1.);skin['extras']['targetNames'].append('Brooke 1.1 relaxed eyelids and lip contour')
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
side=smooth(.025,.055,np.abs(x))*(1-smooth(1.520,1.550,y))
jaw=(1-smooth(1.470,1.495,y))*smooth(1.425,1.450,y)
strength=.92*np.maximum(side,jaw)*smooth(.025,.090,z)*smooth(1.415,1.445,y)*mask
edge=distance_transform_edt(mask);strength*=smooth(0,6,edge)
low=np.stack([gaussian_filter(small[:,:,c],10) for c in range(3)],-1)
corr=np.clip(tone-low,-.22,.22)*strength[:,:,None]
# The front-photo projection baked sharp dark highlights/shadows across the
# nose wings. Suppress those on exposed alar skin, retaining the underside
# nostril cavities. This is a provisional texture repair, not a profile fit.
alar=np.exp(-.5*((np.abs(x)-.013)/.006)**2)*np.exp(-.5*((y-1.506)/.007)**2)
alar*=smooth(.132,.149,z)*smooth(1.498,1.506,y)*mask
nose_ref=mask&(abs(x)>.014)&(abs(x)<.025)&(y>1.513)&(y<1.526)&(z>.125)
nose_tone=np.median(small[nose_ref,:3],axis=0);assert nose_ref.sum()>10
shadow=np.clip((nose_tone-low),0,.20)
corr+=shadow*alar[:,:,None]*.85
# Recover exposed nose-wing skin from the earlier native-UV bake instead of
# leaving the high-contrast edges from planar front-photo projection.
native_path=src.with_name('brooke-1.0-native-head-candidate.glb')
ng,nb,na=load(native_path);np0=ng['meshes'][0]['primitives'][0]
assert np.array_equal(na(np0['attributes']['TEXCOORD_0']),acc(attrs['TEXCOORD_0']))
nimg=ng['images'][ng['textures'][ng['materials'][np0['material']]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
nv=ng['bufferViews'][nimg['bufferView']]
native_im=Image.open(io.BytesIO(nb[nv['byteOffset']:nv['byteOffset']+nv['byteLength']])).convert('RGBA').resize(im.size,Image.Resampling.LANCZOS)
native_small=np.array(native_im.resize((N,N),Image.Resampling.LANCZOS)).astype(float)/255
gain=np.clip(nose_tone/np.maximum(np.median(native_small[nose_ref,:3],axis=0),.05),.5,2)
repair=np.exp(-.5*((np.abs(x)-.011)/.009)**4)*np.exp(-.5*((y-1.508)/.009)**4)
repair*=smooth(.126,.145,z)*smooth(1.497,1.503,y)*mask*.85
repair_full=np.asarray(Image.fromarray(repair.astype('float32'),'F').resize(im.size,Image.Resampling.BILINEAR))
native_rgb=np.clip(np.array(native_im)[:,:,:3]/255*gain,0,1)
for c in range(3):
 full=np.asarray(Image.fromarray(corr[:,:,c].astype('float32'),'F').resize(im.size,Image.Resampling.BILINEAR));tex[:,:,c]=np.clip(tex[:,:,c]+full,0,1)
tex[:,:,:3]=tex[:,:,:3]*(1-repair_full[:,:,None])+native_rgb*repair_full[:,:,None]
buf=io.BytesIO();Image.fromarray(np.round(tex*255).astype('uint8')).save(buf,format='PNG')
g['images'][ii]={'bufferView':append(buf.getvalue()),'mimeType':'image/png','name':'Brooke 1.1 pass 2 cheek jaw nose skin'}
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
before_faces=np.cross(pos[tri[:,1]]-pos[tri[:,0]],pos[tri[:,2]]-pos[tri[:,0]])
valid=np.linalg.norm(before_faces,axis=1)>1e-10
inverted=int(np.count_nonzero(np.sum(before_faces[valid]*face[valid],axis=1)<=0))
assert inverted==0, 'Correction inverted a surface triangle'
report={'version':'Brooke 1.1 pass 2','source_sha256':hashlib.sha256(raw).hexdigest(),'candidate_sha256':hashlib.sha256(out).hexdigest(),'source_unchanged':True,'original_accessors_unchanged':True,'topology_and_rig_unchanged':True,'eyeballs_and_hair_unchanged':True,'neck_geometry_unchanged':True,'new_morph':'Brooke 1.1 relaxed eyelids and lip contour','max_displacement_m':float(np.linalg.norm(delta,axis=1).max()),'max_lip_retraction_m':float(-delta[:,2].min()),'inverted_triangles':inverted,'changed_skin_vertices':int(np.count_nonzero(np.linalg.norm(delta,axis=1))),'jaw_texture_blend':'Wider anatomy-masked low-frequency cheek/jaw transition toward native neck color','nose_texture_repair':'Exposed alar skin shadow reduction; underside nostril cavities retained','neck_reference_rgb':tone.tolist(),'visual_approval_pending':True}
dest.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
