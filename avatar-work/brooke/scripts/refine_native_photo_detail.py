"""Bounded native-head refinement and full-resolution reference projection.

Usage: python refine_native_photo_detail.py candidate.glb front.jpg output.glb
Does not publish the input photograph. Keeps the native UVs, skin topology,
rig, neck and eyelid contact; changes are provisional until visual review.
"""
import io, json, struct, sys, hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

source, photograph, output = map(Path, sys.argv[1:4])
raw = source.read_bytes()
jsize = struct.unpack_from('<I', raw, 12)[0]
g = json.loads(raw[20:20+jsize])
binary = bytearray(raw[28+jsize:])
DTYPES = {5126:'<f4', 5123:'<u2', 5125:'<u4', 5121:'u1'}
WIDTH = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4, 'MAT4':16}
def accessor(index):
    a = g['accessors'][index]; v = g['bufferViews'][a['bufferView']]
    assert not v.get('byteStride') and not a.get('sparse')
    return np.frombuffer(binary, dtype=DTYPES[a['componentType']],
        count=a['count']*WIDTH[a['type']],
        offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],-1).copy()
def append(data):
    binary.extend(b'\0' * (-len(binary)%4))
    view = len(g['bufferViews'])
    g['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(data)})
    binary.extend(data)
    return view

def image_pixels(index):
    v = g['bufferViews'][g['images'][index]['bufferView']]
    return np.array(Image.open(io.BytesIO(binary[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGBA'))

skin_index = next(n['mesh'] for n in g['nodes'] if 'native photo' in n.get('name','').lower())
skin = g['meshes'][skin_index]; primitive = skin['primitives'][0]
a = primitive['attributes']; baseline = accessor(a['POSITION'])
positions = baseline.copy()
for weight, target in zip(skin.get('weights',[1.]), primitive.get('targets',[])):
    positions += weight*accessor(target['POSITION'])
original_positions = positions.copy()
eye_mesh = next(m for m in g['meshes'] if 'high-poly' in m.get('name',''))
eye = accessor(eye_mesh['primitives'][0]['attributes']['POSITION'])
centers = np.array([eye[eye[:,0]<0].mean(0),eye[eye[:,0]>0].mean(0)])
mid = centers.mean(0); ipd = centers[1,0]-centers[0,0]
x,y,z = positions.T
# The screenshot comparison supports a modest mouth widening and alar narrowing.
# These are smooth, bounded candidate edits, not verified anatomical measurements.
front = np.clip((z-.105)/.025,0,1)*np.clip((y-1.45)/.012,0,1)
mouth_band = np.exp(-.5*((y-1.4769)/.009)**2)*np.exp(-.5*(x/.030)**4)*front
nose_band = np.exp(-.5*((y-1.510)/.010)**2)*np.exp(-.5*(x/.019)**4)*front
positions[:,0] += np.clip(.12*x*mouth_band-.08*x*nose_band,-.003,.003)
# Soften the rolled lower lip seen in the submitted profile; preserve mouth seam.
lower_lip = np.exp(-.5*((y-1.471)/.0035)**2)*np.exp(-.5*(x/.019)**4)*front
positions[:,2] -= .0018*lower_lip
assert np.max(np.linalg.norm(positions-original_positions,axis=1)) < .004
assert np.max(np.abs((positions-original_positions)[y<1.45])) < 1e-6

# Retain the earlier depth key and add a separately inspectable detail key.
delta = (positions-original_positions).astype('<f4')
view = append(delta.tobytes()); idx=len(g['accessors'])
g['accessors'].append({'bufferView':view,'componentType':5126,'count':len(delta),'type':'VEC3',
    'min':delta.min(0).tolist(),'max':delta.max(0).tolist()})
primitive.setdefault('targets',[]).append({'POSITION':idx})
skin.setdefault('weights',[1.]).append(1.)
skin.setdefault('extras',{}).setdefault('targetNames',['Brooke photo depth fit']).append('Brooke bounded mouth and nose refinement')

# Recompute the candidate surface normals including both active morphs.
triangles=accessor(primitive['indices']).ravel().reshape(-1,3)
normals=np.zeros_like(positions)
fn=np.cross(positions[triangles[:,1]]-positions[triangles[:,0]],positions[triangles[:,2]]-positions[triangles[:,0]])
for k in range(3): np.add.at(normals,triangles[:,k],fn)
normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-10)
# Include normal changes in the new morph rather than rewriting the basis normals.
old_normals=accessor(a['NORMAL'])
for weight,target in zip(skin['weights'][:-1],primitive['targets'][:-1]):
    if 'NORMAL' in target: old_normals+=weight*accessor(target['NORMAL'])
nd=(normals-old_normals).astype('<f4');nv=append(nd.tobytes());ni=len(g['accessors'])
g['accessors'].append({'bufferView':nv,'componentType':5126,'count':len(nd),'type':'VEC3'})
primitive['targets'][-1]['NORMAL']=ni

photo=np.array(Image.open(photograph).convert('RGB'),dtype=np.float32)/255.
height,width=photo.shape[:2]
texture_index=g['materials'][primitive['material']]['pbrMetallicRoughness']['baseColorTexture']['index']
image_index=g['textures'][texture_index]['source']
texture=image_pixels(image_index); th,tw=texture.shape[:2]
# Warm the surrounding native skin too, avoiding a pale jaw/neck ring.
texture[:,:,:3]=(texture[:,:,:3].astype(float)*np.array([.90,.74,.60])).clip(0,255).astype(np.uint8)
uv=accessor(a['TEXCOORD_0']); texpos=uv*np.array([tw-1,th-1])
# Manual image-plane registration from supplied 1536px front reference.
# Eye centres anchor scale. The photograph is not a calibrated 3D scan.
photo_mid=np.array([.495,.3115]); photo_ipd=.226
scale=photo_ipd/ipd
covered=0
for tri in triangles:
    pts=texpos[tri]; lo=np.maximum(np.floor(pts.min(0)).astype(int),0); hi=np.minimum(np.ceil(pts.max(0)).astype(int),[tw-1,th-1])
    if np.any(hi<lo):continue
    m=np.vstack([pts.T,np.ones(3)])
    if abs(np.linalg.det(m))<1e-8:continue
    xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1))
    weights=np.linalg.solve(m,np.vstack([xx.ravel(),yy.ravel(),np.ones(xx.size)]))
    inside=(weights.min(0)>=-1e-5)
    if not inside.any():continue
    px=xx.ravel()[inside];py=yy.ravel()[inside]
    p=weights[:,inside].T@positions[tri]
    u=photo_mid[0]+(p[:,0]-mid[0])*scale
    v=photo_mid[1]-(p[:,1]-mid[1])*scale
    # Restrict transfer to front-facing facial skin and feather its boundaries.
    side=np.clip((.071-np.abs(p[:,0]))/.015,0,1)
    forward=np.clip((p[:,2]-.105)/.025,0,1)
    upper=np.clip((v-.115)/.045,0,1)
    lower=np.clip((.710-v)/.045,0,1)
    blend=.90*side*forward*upper*lower
    # Exclude eyeball projection: keep the native eyelid contact and eye surface.
    for e in centers:
        d=((p[:,0]-e[0])/.0145)**2+((p[:,1]-e[1])/.0065)**2
        blend*=np.clip((d-.80)/.65,0,1)
    blend*=((u>=0)&(u<=1)&(v>=0)&(v<=1))
    if blend.max()<.001:continue
    sampled=np.stack([map_coordinates(photo[:,:,c],[v*(height-1),u*(width-1)],order=1,mode='nearest') for c in range(3)],axis=1)
    native=texture[py,px,:3]/255.
    texture[py,px,:3]=np.clip((native*(1-blend[:,None])+sampled*blend[:,None])*255,0,255).astype(np.uint8)
    covered+=int((blend>.1).sum())
assert covered>10000,'Insufficient reference coverage'
buf=io.BytesIO();Image.fromarray(texture).save(buf,format='PNG')
g['images'][image_index]={'bufferView':append(buf.getvalue()),'mimeType':'image/png','name':'Brooke full-resolution front reference on native UV'}
# Reduce neon iris saturation while retaining the existing eye mesh and UVs.
eye_primitive=eye_mesh['primitives'][0]
em=g['materials'][eye_primitive['material']]
ei=g['textures'][em['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
et=image_pixels(ei); ergb=et[:,:,:3].astype(float)/255
blue=(ergb[:,:,2]>ergb[:,:,0]*1.12)&(ergb[:,:,1]>ergb[:,:,0]*1.08)&(ergb[:,:,0]<.75)
luma=ergb@np.array([.2126,.7152,.0722])
muted=ergb*.45+luma[:,:,None]*.55
et[:,:,:3]=np.where(blue[:,:,None],muted*.83,ergb).clip(0,1)*255
buf=io.BytesIO();Image.fromarray(et).save(buf,format='PNG')
g['images'][ei]={'bufferView':append(buf.getvalue()),'mimeType':'image/png','name':'Brooke muted blue grey iris'}
# Recolor the existing hair texture to golden blonde; hairstyle remains pending.
hair=next(m for m in g['meshes'] if 'long01' in m.get('name',''))
hm=g['materials'][hair['primitives'][0]['material']]['pbrMetallicRoughness']
hi=g['textures'][hm['baseColorTexture']['index']]['source']
ht=image_pixels(hi); hc=ht[:,:,:3].astype(float)/255
hl=hc@np.array([.2126,.7152,.0722])
gold=np.power(np.maximum(hl,0),.48)[:,:,None]*np.array([1.,.82,.52])
ht[:,:,:3]=(gold.clip(0,1)*255).astype(np.uint8)
buf=io.BytesIO();Image.fromarray(ht).save(buf,format='PNG')
g['images'][hi]={'bufferView':append(buf.getvalue()),'mimeType':'image/png','name':'Brooke golden blonde native hair'}
hm['baseColorFactor']=[1,1,1,1]
# Head and neck remain the only scope; native hairstyle is still pending.
g['buffers'][0]['byteLength']=len(binary)
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4)
binary.extend(b'\0'*(-len(binary)%4))
result=struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(result)
report={'source_sha256':hashlib.sha256(raw).hexdigest(),'front_reference_sha256':hashlib.sha256(photograph.read_bytes()).hexdigest(),
    'reference_dimensions':[width,height],'reference_registration':'manual eye-centre projection, uncalibrated',
    'maximum_added_displacement_m':float(np.linalg.norm(delta,axis=1).max()),'neck_unchanged':True,'eye_geometry_unchanged':True,
    'skin_uvs_unchanged':True,'reference_texture_pixels':covered,'likeness_approved':False,
    'limitations':['Hair retains native style','Photo projection needs front and profile review','Not a full landmark or calibrated profile fit']}
output.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
