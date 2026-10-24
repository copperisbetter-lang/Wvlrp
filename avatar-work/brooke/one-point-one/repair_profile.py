"""Conservative candidate from preserved Brooke 1.0; never overwrite input."""
import hashlib, io, json, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from render import load

src, dst = map(Path, sys.argv[1:3])
assert src.resolve() != dst.resolve()
raw = src.read_bytes()
assert hashlib.sha256(raw).hexdigest() == '6a3988eb9dbff273695d444a1db57f8ebe38a730daa37918a4a39b2e1a11ca6f'
g, original, acc = load(src)
binary = bytearray(original)
skin = g['meshes'][0]; pr = skin['primitives'][0]; attrs = pr['attributes']
pos = acc(attrs['POSITION'])
for w, t in zip(skin.get('weights', []), pr.get('targets', [])):
    pos += w * acc(t['POSITION'])
x, y, z = pos.T
def gauss(v, c, s): return np.exp(-.5*((v-c)/s)**2)
def smooth(a,b,v):
    q=np.clip((v-a)/(b-a),0,1); return q*q*(3-2*q)
front = smooth(.108,.127,z)
delta=np.zeros_like(pos)
# Remove accumulated depth distortions locally from the mouth and forehead.
# Feather boundaries while leaving the nose, eyes, jaw, neck and skull rear intact.
base=acc(attrs['POSITION'])
x,y,z=pos.T
mouth=(1-smooth(.026,.043,np.abs(x)))*smooth(1.447,1.459,y)*(1-smooth(1.496,1.505,y))*smooth(.103,.12,z)
forehead=(1-smooth(.055,.075,np.abs(x)))*smooth(1.565,1.586,y)*(1-smooth(1.63,1.65,y))*smooth(.10,.13,z)
# Full mouth rollback, partial forehead rollback. Native basis is retained in the GLB.
mask=np.maximum(mouth,forehead*.8)
delta=(base-pos)*mask[:,None]
# Centreline control vertices measured in the native basis (meters).
# Keep the lip seam at 1.481; remove the unsupported shelf and rounded
# philtrum mound with one continuous profile instead of additive bulges.
from scipy.interpolate import PchipInterpolator
control_y=np.array([1.46244,1.46720,1.47133,1.47432,1.47691,1.48013,1.48114,1.48407,1.48605,1.48839,1.49066,1.49278,1.49501,1.49746,1.49967,1.50200,1.50430,1.50650])
native_z=np.array([.14445,.14743,.15308,.15353,.15322,.15209,.14923,.15437,.15648,.15754,.15803,.15773,.15649,.15480,.15419,.15431,.15519,.15843])
# Reference-guided shape, not a calibrated scan: upper/lower vermilion
# are separate from the skin above the lip, with a recessed mouth seam.
profile_z=np.array([.14445,.14743,.1525,.1535,.1530,.1505,.1492,.1520,.1530,.1515,.1498,.1485,.1478,.1475,.1480,.1500,.1540,.15843])
restored=pos+delta
rx,ry,rz=restored.T
profile_delta=PchipInterpolator(control_y,profile_z-native_z,extrapolate=False)(np.clip(ry,control_y[0],control_y[-1]))
profile_mask=(1-smooth(.008,.029,np.abs(rx)))*smooth(1.462,1.467,ry)*(1-smooth(1.503,1.507,ry))*smooth(.140,.150,rz)
delta[:,2]+=profile_delta*profile_mask
delta[y<1.447]=0
delta[z<.10]=0
assert np.max(np.linalg.norm(delta,axis=1))<.012
assert not np.any(delta[y<1.447])
assert not np.any(delta[z<.10])
def append(data):
    binary.extend(b'\0'*(-len(binary)%4)); idx=len(g['bufferViews'])
    g['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(data)})
    binary.extend(data); return idx
def new_acc(values):
    idx=len(g['accessors'])
    g['accessors'].append({'bufferView':append(values.astype('<f4').tobytes()),'componentType':5126,'count':len(values),'type':'VEC3','min':values.min(0).tolist(),'max':values.max(0).tolist()})
    return idx
target={'POSITION':new_acc(delta)}
tri=acc(pr['indices']).ravel().reshape(-1,3)
# Recalculate normals and average coincident UV seams to avoid new shading seams.
p=pos+delta; normals=np.zeros_like(p)
fn=np.cross(p[tri[:,1]]-p[tri[:,0]],p[tri[:,2]]-p[tri[:,0]])
for k in range(3): np.add.at(normals,tri[:,k],fn)
_,groups=np.unique(np.round(p,6),axis=0,return_inverse=True)
sums=np.zeros((groups.max()+1,3)); np.add.at(sums,groups,normals); normals=sums[groups]
normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-10)
old=acc(attrs['NORMAL'])
for w,t in zip(skin.get('weights',[]),pr.get('targets',[])):
    if 'NORMAL' in t: old+=w*acc(t['NORMAL'])
# Restrict normal updates to the eyelid region to preserve all other surfaces.
changed=np.linalg.norm(delta,axis=1)>.000001
normal_delta=np.zeros_like(normals);normal_delta[changed]=normals[changed]-old[changed]
target['NORMAL']=new_acc(normal_delta)
pr.setdefault('targets',[]).append(target);skin.setdefault('weights',[]).append(1.)
skin.setdefault('extras',{}).setdefault('targetNames',[]).append('Brooke local mouth and forehead deformation rollback')

# Sample model coordinates in its existing texture atlas. No new photograph projection.
uv=acc(attrs['TEXCOORD_0']); N=768
atlas=np.zeros((N,N,3),np.float32); occupied=np.zeros((N,N),bool)
for face in tri:
    pts=uv[face]*(N-1);lo=np.maximum(np.floor(pts.min(0)).astype(int),0);hi=np.minimum(np.ceil(pts.max(0)).astype(int),N-1)
    if np.any(hi<lo):continue
    matrix=np.vstack([pts.T,np.ones(3)])
    if abs(np.linalg.det(matrix))<1e-8:continue
    xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1))
    bary=np.linalg.inv(matrix)@np.vstack([xx.ravel(),yy.ravel(),np.ones(xx.size)])
    valid=bary.min(0)>=-1e-5;px=xx.ravel()[valid];py=yy.ravel()[valid]
    atlas[py,px]=bary[:,valid].T@pos[face];occupied[py,px]=True
mat=g['materials'][pr['material']]
ii=g['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
v=g['bufferViews'][g['images'][ii]['bufferView']]
im=Image.open(io.BytesIO(original[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGBA')
pixels=np.array(im,dtype=np.float32)/255; W,H=im.size
ax,ay,az=atlas.transpose(2,0,1)
small=np.array(im.resize((N,N)),dtype=np.float32)/255
ref=occupied&(np.abs(ax)>.018)&(np.abs(ax)<.032)&(ay>1.488)&(ay<1.499)&(az>.125)
assert ref.sum()>15
tone=np.median(small[ref,:3],axis=0)
# The old projection puts upper-lip pigment below the actual upper-lip surface.
# Repaint the anatomical vermilion bands after local shape restoration.
# Colors are sampled from the supplied near-neutral frontal reference.
side=(1-smooth(.019,.030,np.abs(ax)))*smooth(.128,.148,az)*occupied
uppermask=.95*smooth(1.4805,1.482,ay)*(1-smooth(1.4865,1.489,ay))*side
lowermask=.80*smooth(1.465,1.468,ay)*(1-smooth(1.478,1.4805,ay))*side
for smallmask,targettone in [(uppermask,np.array([.67,.31,.27])),(lowermask,np.array([.847,.506,.451]))]:
    mask=np.array(Image.fromarray(smallmask.astype('float32'),'F').resize((W,H),Image.Resampling.BILINEAR))
    for c in range(3):
        detail=pixels[:,:,c]-gaussian_filter(pixels[:,:,c],3)
        pixels[:,:,c]=pixels[:,:,c]*(1-mask)+np.clip(targettone[c]+detail*.45,0,1)*mask
buf=io.BytesIO();Image.fromarray(np.uint8(np.clip(pixels*255,0,255))).save(buf,format='PNG')
g['images'][ii]={'bufferView':append(buf.getvalue()),'mimeType':'image/png','name':'Brooke lip pigment aligned to restored native surface'}
g['buffers'][0]['byteLength']=len(binary)
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);binary.extend(b'\0'*(-len(binary)%4))
out=struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(out)
assert src.read_bytes()==raw
gg,bb,aa=load(dst)
assert gg['skins']==g['skins'] and len(gg['meshes'])==3
assert gg['meshes'][1:]==g['meshes'][1:]
report={'source_sha256':hashlib.sha256(raw).hexdigest(),'candidate_sha256':hashlib.sha256(out).hexdigest(),'max_displacement_mm':float(np.linalg.norm(delta,axis=1).max()*1000),'neck_and_rear_unchanged':True,'eye_mesh_and_hair_unchanged':True,'mouth_deformation_rollback':True,'continuous_lip_profile':True,'source_preserved':True,'likeness_approved':False,'note':'Local rollback of accumulated mouth morph distortions; candidate for close profile review.'}
dst.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
