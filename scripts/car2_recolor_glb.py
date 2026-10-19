import io,json,struct,pathlib
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree
from scipy.ndimage import distance_transform_edt, gaussian_filter

path=pathlib.Path('world-creator/assets/car2-completed.glb')
raw=path.read_bytes()
magic,version,total=struct.unpack_from('<III',raw)
assert magic==0x46546c67 and total==len(raw)
jsize,jtype=struct.unpack_from('<II',raw,12)
assert jtype==0x4e4f534a
doc=json.loads(raw[20:20+jsize])
offset=20+jsize
bsize,btype=struct.unpack_from('<II',raw,offset)
assert btype==0x004e4942
blob=bytearray(raw[offset+8:offset+8+bsize])
meshes=doc['meshes']
body=next(m['primitives'][0] for m in meshes if m['name']=='base.001')
attach=next(m['primitives'][0] for m in meshes if 'Vulva2' in m['name'])
assert body['material']!=attach['material']
def accessor(idx):
    a=doc['accessors'][idx];v=doc['bufferViews'][a['bufferView']]
    types={'VEC2':2,'VEC3':3,'VEC4':4,'SCALAR':1}
    dtypes={5126:np.dtype('<f4'),5123:np.dtype('<u2'),5125:np.dtype('<u4')}
    dtype=dtypes[a['componentType']];n=types[a['type']]
    start=v.get('byteOffset',0)+a.get('byteOffset',0)
    stride=v.get('byteStride',dtype.itemsize*n)
    return np.ndarray((a['count'],n),dtype=dtype,buffer=blob,offset=start,strides=(stride,dtype.itemsize)).copy()
def get_image(prim):
    mat=doc['materials'][prim['material']]
    tex=doc['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]
    img=doc['images'][tex['source']]
    view=doc['bufferViews'][img['bufferView']]
    data=bytes(blob[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']])
    return Image.open(io.BytesIO(data)).convert('RGBA'),img
bp=accessor(body['attributes']['POSITION']);bu=accessor(body['attributes']['TEXCOORD_0'])
ap=accessor(attach['attributes']['POSITION'])
body_img,_=get_image(body)
attach_img,attach_ref=get_image(attach)
# Spatially project nearby body-skin samples onto the attachment's own UV map.
# Do NOT reuse the body's UVs directly; they refer to a different atlas.
tree=cKDTree(bp)
dist,nearest=tree.query(ap,k=1)
assert len(ap)>20 and np.isfinite(dist).all()
auv=accessor(attach['attributes']['TEXCOORD_0'])
body_pixels=np.asarray(body_img)
src=np.asarray(attach_img).copy()
height,width=src.shape[:2]
def texel(uv,img):
    h,w=img.shape[:2]
    x=np.clip((np.mod(uv[:,0],1)*(w-1)).astype(int),0,w-1)
    y=np.clip(((1-np.mod(uv[:,1],1))*(h-1)).astype(int),0,h-1)
    return img[y,x,:3].astype(np.float32)
reference=texel(bu[nearest],body_pixels)
current=texel(auv,src)
# Filter out any obviously non-skin samples from atlas seams.
good=(reference.min(axis=1)>35)&(reference.max(axis=1)<250)&(dist<np.quantile(dist,.85))
assert good.sum()>25, 'Not enough trustworthy skin samples'
# Correct color spatially, while retaining high-frequency attachment details.
correction=np.clip(reference-current,-85,85)
xx=np.clip((np.mod(auv[:,0],1)*(width-1)).astype(int),0,width-1)
yy=np.clip(((1-np.mod(auv[:,1],1))*(height-1)).astype(int),0,height-1)
seeds=np.zeros((height,width),dtype=bool)
delta=np.zeros((height,width,3),dtype=np.float32)
seeds[yy[good],xx[good]]=True
delta[yy[good],xx[good]]=correction[good]
assert seeds.sum()>20
_,indices=distance_transform_edt(~seeds,return_indices=True)
field=delta[indices[0],indices[1]]
# Smooth sparse nearest-neighbor projection to avoid vertex-shaped color bands.
for c in range(3):field[:,:,c]=gaussian_filter(field[:,:,c],sigma=16)
mask=src[:,:,3]>10
assert mask.sum()>100
src[:,:,:3]=np.clip(src[:,:,:3].astype(np.float32)+field,0,255).astype(np.uint8)
# Preserve UV layout and source alpha; never replace with a flat material.
target=np.median(reference[good],axis=0)
old=np.median(current[good],axis=0)
print('Projection samples',int(good.sum()),'target',target,'old',old,'correction',np.median(correction[good],axis=0))
out=io.BytesIO();Image.fromarray(src,'RGBA').save(out,format='PNG')
new=out.getvalue()
while len(blob)%4:blob.append(0)
viewidx=len(doc['bufferViews'])
doc['bufferViews'].append({'buffer':0,'byteOffset':len(blob),'byteLength':len(new)})
blob.extend(new)
while len(blob)%4:blob.append(0)
attach_ref['bufferView']=viewidx
attach_ref['mimeType']='image/png'
doc['buffers'][0]['byteLength']=len(blob)
jsonbytes=json.dumps(doc,separators=(',',':')).encode()
jsonbytes+=b' '*((-len(jsonbytes))%4)
output=struct.pack('<III',magic,version,12+8+len(jsonbytes)+8+len(blob))
output+=struct.pack('<II',len(jsonbytes),0x4e4f534a)+jsonbytes
output+=struct.pack('<II',len(blob),0x004e4942)+blob
path.write_bytes(output)
print('Projected texture saved',attach_img.size,'new bytes',len(output))
