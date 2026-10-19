import io,json,struct,pathlib
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree

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
# Select only skin vertices in proximity to attachment; never use global atlas average.
tree=cKDTree(bp)
dist,nearest=tree.query(ap,k=1)
radius=np.quantile(dist,0.35)
ids=nearest[dist<=max(radius,0.03)]
assert len(ids)>10, 'Insufficient nearby body samples'
uv=bu[ids]
arr=np.asarray(body_img)
xs=np.clip((uv[:,0]%1*(arr.shape[1]-1)).astype(int),0,arr.shape[1]-1)
ys=np.clip(((1-uv[:,1]%1)*(arr.shape[0]-1)).astype(int),0,arr.shape[0]-1)
pixels=arr[ys,xs,:3]
pixels=pixels[np.all(pixels>15,axis=1)]
assert len(pixels)>10
target=np.median(pixels,axis=0)
src=np.asarray(attach_img).copy()
mask=src[:,:,3]>10
assert mask.sum()>100
old=np.median(src[:,:,:3][mask],axis=0)
# Retain fine details: scale channels gently to match the local skin baseline.
ratio=np.clip(target/np.maximum(old,1),0.45,2.2)
src[:,:,:3]=np.clip(src[:,:,:3].astype(float)*ratio,0,255).astype(np.uint8)
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
print('Body-near-attachment median RGB:',target,'attachment previous RGB:',old,'ratio:',ratio,'image:',attach_img.size,'vertices:',len(ids),'new bytes:',len(output))
