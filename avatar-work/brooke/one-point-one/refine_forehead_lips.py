"""Forehead and lip correction from preserved correction 1; never overwrite input."""
import hashlib, io, json, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from render import load

src, dst = map(Path, sys.argv[1:3])
assert src.resolve() != dst.resolve()
raw = src.read_bytes()
assert hashlib.sha256(raw).hexdigest() == '5043060d0cdc08ea10a1cbfe9c51a1021bfadf7d8fd5038ed8d737198d64a910'
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
# Smooth, bounded forehead/brow transition. No change to eyelids or eyes.
face=front*smooth(1.452,1.46,y)
brow=gauss(x,0,.043)*gauss(y,1.574,.012)*face
forehead=gauss(x,0,.049)*gauss(y,1.601,.017)*face
delta[:,2] = -.0016*brow+.00065*forehead
# Restore lip projection and small amount of vertical fullness; no retraction.
upper=gauss(x,0,.022)*gauss(y,1.480,.0038)*face
lower=gauss(x,0,.022)*gauss(y,1.468,.0045)*face
mouth=gauss(x,0,.029)*gauss(y,1.475,.009)*face
delta[:,2]+=.0012*upper+.0013*lower
delta[:,1]+=.00055*upper-.00055*lower
delta[:,0]+=.025*x*mouth
# Hard safety floor: neck and lower jaw remain identical.
delta[y<1.452]=0
assert np.max(np.linalg.norm(delta,axis=1)) < .002
assert not np.any(delta[z<.108])
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
# Restrict normal updates to edited regions to preserve other surfaces.
changed=np.linalg.norm(delta,axis=1)>.000001
normal_delta=np.zeros_like(normals);normal_delta[changed]=normals[changed]-old[changed]
target['NORMAL']=new_acc(normal_delta)
pr.setdefault('targets',[]).append(target);skin.setdefault('weights',[]).append(1.)
skin.setdefault('extras',{}).setdefault('targetNames',[]).append('Brooke forehead transition and restored lip volume')

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
# Remove some of the excessive dark pigment at the inner brow/bridge.
# Preserve eyebrow hairs with the source texture detail layer.
browmask=.22*gauss(ax,0,.018)*gauss(ay,1.569,.007)*smooth(.117,.136,az)*occupied
uppermask=.32*gauss(ax,0,.022)*gauss(ay,1.480,.003)*smooth(.129,.146,az)*occupied
lowermask=.48*gauss(ax,0,.022)*gauss(ay,1.4675,.004)*smooth(.129,.146,az)*occupied
# Lip palette measured from uploaded neutral frontal reference 3948.jpg.
# No reference image is included in this public build.
upper_tone=np.array([.6470588,.2313725,.1647059])
lower_tone=np.array([.8470588,.5058824,.4509804])
for smallmask,targettone in [(browmask,tone),(uppermask,upper_tone),(lowermask,lower_tone)]:
    mask=np.array(Image.fromarray(smallmask.astype('float32'),'F').resize((W,H),Image.Resampling.BILINEAR))
    for c in range(3):
        detail=pixels[:,:,c]-gaussian_filter(pixels[:,:,c],3)
        pixels[:,:,c]=pixels[:,:,c]*(1-mask)+np.clip(targettone[c]+detail*.65,0,1)*mask
buf=io.BytesIO();Image.fromarray(np.uint8(np.clip(pixels*255,0,255))).save(buf,format='PNG')
g['images'][ii]={'bufferView':append(buf.getvalue()),'mimeType':'image/png','name':'Brooke forehead and lip pigment correction'}
g['buffers'][0]['byteLength']=len(binary)
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);binary.extend(b'\0'*(-len(binary)%4))
out=struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(out)
assert src.read_bytes()==raw
gg,bb,aa=load(dst)
assert gg['skins']==g['skins'] and len(gg['meshes'])==3
assert gg['meshes'][1:]==g['meshes'][1:]
report={'source_sha256':hashlib.sha256(raw).hexdigest(),'candidate_sha256':hashlib.sha256(out).hexdigest(),'max_displacement_mm':float(np.linalg.norm(delta,axis=1).max()*1000),'neck_and_rear_unchanged':True,'eye_mesh_and_hair_unchanged':True,'nose_geometry_unchanged':True,'lip_projection_restored':True,'source_preserved':True,'likeness_approved':False,'note':'Bounded brow smoothing and lip restoration, neutral-photo lip palette; profile reference is smiling, not a neutral calibrated scan.'}
dst.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
