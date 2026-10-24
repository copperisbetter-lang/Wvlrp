"""Brooke rim, cavity, lip contour and brow repair from preserved repair 3."""
import hashlib, io, json, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from render import load

src, dst = map(Path, sys.argv[1:3])
assert src.resolve() != dst.resolve()
raw = src.read_bytes()
assert hashlib.sha256(raw).hexdigest() == '5d604f52d9b84b6f85f354605803dfb6e0d83e3399e2c40fc39d9c7680ebeffc'
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
# Identify lower-lip inner rim and nasal cavity faces from measured geometry.
tri=acc(pr['indices']).ravel().reshape(-1,3)
centers=pos[tri].mean(1)
fn=np.cross(pos[tri[:,1]]-pos[tri[:,0]],pos[tri[:,2]]-pos[tri[:,0]])
fn/=np.maximum(np.linalg.norm(fn,axis=1,keepdims=True),1e-10)
cx,cy,cz=centers.T
# Exact visible defect faces recovered from triangle-ID close render of the
# hash-locked repair3 source. Broad normal-based selections touched outer skin.
mouth_ids=[5128,5141,673,658,662,663,870,948,949,960,961,978,2479,3507,3508,3509,3510,3513,3514,3515,3516,5006,5095,5106,5110,5131,5132,5149,5150,5407,5408,5419,5420,5438,6794,6795,6910,6911,6935,7950,7951,7952,7953,7956,7957,7958,7959]
nose_ids=[802,3485,3486,5270,7928,7929]
mouth_faces=np.zeros(len(tri),bool);mouth_faces[mouth_ids]=True
nose_faces=np.zeros(len(tri),bool);nose_faces[nose_ids]=True
assert mouth_faces.sum()>5 and nose_faces.sum()>3
rim_ids=np.unique(tri[mouth_faces])
rim=np.zeros(len(pos),bool);rim[rim_ids]=True
# Slightly close the physical rim gap; keep lip profile support beneath it.
delta[:,1]+=.00010*rim*(1-smooth(1.481,1.484,y))*smooth(.12,.14,z)
face=smooth(.125,.145,z)
low=gauss(x,0,.023)*gauss(y,1.4725,.004)*face*(1-smooth(1.477,1.480,y))
delta[:,1]+=.00085*low
delta[:,2]-=.00070*low
# Cupid's bow: small raised lobes either side of a shallow central dip.
upper=gauss(y,1.486,.004)*face*smooth(1.482,1.485,y)
peaks=gauss(np.abs(x),.006,.0035)
delta[:,1]+=upper*(.00085*peaks-.0002*gauss(x,0,.003))
# Brow projection correction, smoothly blended into the lower forehead.
brow=gauss(x,0,.041)*gauss(y,1.576,.013)*face
forehead=gauss(x,0,.047)*gauss(y,1.603,.022)*face
delta[:,2]-=.0035*brow+.0007*forehead
delta[y<1.455]=0;delta[z<.105]=0
assert np.max(np.linalg.norm(delta,axis=1))<.0045
assert not np.any(delta[y<1.455])
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
skin.setdefault('extras',{}).setdefault('targetNames',[]).append('Brooke lip rim, Cupid bow and softened brow')

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
    atlas[py,px]=bary[:,valid].T@(pos+delta)[face];occupied[py,px]=True
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
# Restore skin outside the shaped vermilion boundary, retaining local detail.
peak=gauss(np.abs(ax),.006,.0035)
edge=1.4875+.0009*peak-.00025*gauss(ax,0,.003)
side=(1-smooth(.020,.031,np.abs(ax)))*smooth(.128,.146,az)*occupied
cleanup=.72*smooth(edge,edge+.002,ay)*(1-smooth(1.494,1.499,ay))*side
# Inner brow pigment softened independently of the geometry correction.
brow_cleanup=.20*gauss(ax,0,.017)*gauss(ay,1.569,.006)*smooth(.122,.139,az)*occupied
mask=np.array(Image.fromarray(np.maximum(cleanup,brow_cleanup).astype('float32'),'F').resize((W,H),Image.Resampling.BILINEAR))
for c in range(3):
    detail=pixels[:,:,c]-gaussian_filter(pixels[:,:,c],3)
    pixels[:,:,c]=pixels[:,:,c]*(1-mask)+np.clip(tone[c]+detail*.8,0,1)*mask
buf=io.BytesIO();Image.fromarray(np.uint8(np.clip(pixels*255,0,255))).save(buf,format='PNG')
g['images'][ii]={'bufferView':append(buf.getvalue()),'mimeType':'image/png','name':'Brooke inner rim and cavity shading with vermilion edge cleanup'}
# Inner UV islands overlap other skin areas: use separate cavity materials,
# never paint their triangles into the shared skin texture.
import copy
def cavity_material(name,rgb):
    image=Image.new('RGB',(1,1),tuple(int(v*255) for v in rgb));buf=io.BytesIO();image.save(buf,format='PNG')
    ii=len(g['images']);g['images'].append({'bufferView':append(buf.getvalue()),'mimeType':'image/png','name':name})
    ti=len(g['textures']);g['textures'].append({'source':ii})
    mi=len(g['materials']);g['materials'].append({'name':name,'doubleSided':True,'extensions':{'KHR_materials_unlit':{}},'pbrMetallicRoughness':{'baseColorTexture':{'index':ti},'metallicFactor':0,'roughnessFactor':1}})
    return mi
def index_acc(faces):
    v=faces.astype('<u4').ravel();idx=len(g['accessors'])
    g['accessors'].append({'bufferView':append(v.tobytes()),'componentType':5125,'count':len(v),'type':'SCALAR','min':[int(v.min())],'max':[int(v.max())]})
    return idx
primlist=[]
for selected,mat_index in [(~(mouth_faces|nose_faces),pr['material']),(mouth_faces,cavity_material('Brooke inner lip rim',[.28,.075,.055])),(nose_faces,cavity_material('Brooke inner nostril',[.35,.16,.10]))]:
    if not selected.any():continue
    piece=copy.deepcopy(pr);piece['indices']=index_acc(tri[selected]);piece['material']=mat_index;primlist.append(piece)
skin['primitives']=primlist
if 'KHR_materials_unlit' not in g.setdefault('extensionsUsed',[]):g['extensionsUsed'].append('KHR_materials_unlit')
# Compact unused embedded image data from older corrections.
used=set()
def collect(value):
    if isinstance(value,dict):
        for key,item in value.items():
            if key=='bufferView':used.add(item)
            else:collect(item)
    elif isinstance(value,list):
        for item in value:collect(item)
collect(g)
oldbinary=bytes(binary);newbinary=bytearray();newviews=[];mapping={}
for oldid in sorted(used):
    view=dict(g['bufferViews'][oldid]);offset=view.get('byteOffset',0);data=oldbinary[offset:offset+view['byteLength']]
    newbinary.extend(b'\0'*(-len(newbinary)%4));view['byteOffset']=len(newbinary);view['buffer']=0
    mapping[oldid]=len(newviews);newviews.append(view);newbinary.extend(data)
def remap(value):
    if isinstance(value,dict):
        for key,item in value.items():
            if key=='bufferView':value[key]=mapping[item]
            else:remap(item)
    elif isinstance(value,list):
        for item in value:remap(item)
remap(g);g['bufferViews']=newviews;binary=newbinary
g['buffers'][0]['byteLength']=len(binary)
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);binary.extend(b'\0'*(-len(binary)%4))
out=struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(out)
assert src.read_bytes()==raw
gg,bb,aa=load(dst)
assert gg['skins']==g['skins'] and len(gg['meshes'])==3
assert gg['meshes'][1:]==g['meshes'][1:]
report={'source_sha256':hashlib.sha256(raw).hexdigest(),'candidate_sha256':hashlib.sha256(out).hexdigest(),'max_displacement_mm':float(np.linalg.norm(delta,axis=1).max()*1000),'neck_and_rear_unchanged':True,'eye_mesh_and_hair_unchanged':True,'mouth_rim_faces':int(mouth_faces.sum()),'nasal_cavity_faces':int(nose_faces.sum()),'mouth_face_ids':mouth_ids,'nostril_face_ids':nose_ids,'lower_rim_vertex_ids':rim_ids.tolist(),'source_preserved':True,'likeness_approved':False,'note':'Anatomical rim/cavity triangles identified from repair 3; lip contour and brow correction pending user review.'}
dst.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if not k.endswith('_ids')},indent=2))
