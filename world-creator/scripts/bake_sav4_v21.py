"""Bake the visually approved V21 SAV4 viewer corrections into a GLB.
Uses only mesh attributes: never modifies vertex positions, triangles or rig.
"""
import json,struct,sys,copy
from pathlib import Path
import numpy as np
from collections import Counter,defaultdict

path=Path(sys.argv[1])
data=path.read_bytes()
assert data[:4]==b'glTF'
json_size,json_tag=struct.unpack_from('<II',data,12)
assert json_tag==0x4e4f534a
doc=json.loads(data[20:20+json_size])
off=20+json_size
bin_size,bin_tag=struct.unpack_from('<II',data,off)
assert bin_tag==0x004e4942
blob=bytearray(data[off+8:off+8+bin_size])
assert len(doc['buffers'])==1
def accessor(i):
    a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']]
    dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
    n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    stride=v.get('byteStride')
    if stride:raise ValueError('Interleaved GLB accessor not supported')
    arr=np.frombuffer(blob,dtype=dt,count=a['count']*n,offset=v.get('byteOffset',0)+a.get('byteOffset',0))
    return arr.reshape(-1,n).copy()
def append(arr,typ):
    arr=np.asarray(arr,dtype='<f4')
    while len(blob)%4:blob.append(0)
    pos=len(blob);blob.extend(arr.tobytes())
    vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':pos,'byteLength':arr.nbytes,'target':34962})
    ai=len(doc['accessors']);doc['accessors'].append({'bufferView':vi,'componentType':5126,'count':len(arr),'type':typ})
    return ai
nodes=doc['nodes'];meshes=doc['meshes']
part_nodes=[n for n in nodes if 'mesh' in n and 'Vulva2 MHX2' in n.get('name','')]
assert len(part_nodes)==1
part=meshes[part_nodes[0]['mesh']]['primitives'][0]
body_nodes=[n for n in nodes if 'mesh' in n and n is not part_nodes[0] and
            any(k in meshes[n['mesh']].get('name','').lower() for k in ('base.','basemesh'))]
assert len(body_nodes)==1
body=meshes[body_nodes[0]['mesh']]['primitives'][0]
pa,pb=part['attributes'],body['attributes']
P=accessor(pa['POSITION']);B=accessor(pb['POSITION'])
U=accessor(pa['TEXCOORD_0']);BU=accessor(pb['TEXCOORD_0'])
N=accessor(pa['NORMAL']);BN=accessor(pb['NORMAL'])
assert len(P)==700,(len(P),'expected approved V21 geometry')
cell=.035;grid=defaultdict(list)
def key(p):return tuple(np.floor(p/cell).astype(int))
for j,p in enumerate(B):grid[key(p)].append(j)
def nearest(p,maxradius):
    gx,gy,gz=key(p)
    best=-1;dist=float('inf')
    for r in range(maxradius+1):
        for dx in range(-r,r+1):
            for dy in range(-r,r+1):
                for dz in range(-r,r+1):
                    if r and max(abs(dx),abs(dy),abs(dz))!=r:continue
                    for j in grid.get((gx+dx,gy+dy,gz+dz),()):
                        d=float(np.sum((p-B[j])**2))
                        if d<dist:best=j;dist=d
        if best>=0:break
    return best,dist
uvmatches=0
for i,p in enumerate(P):
    j,d=nearest(p,5)
    if j>=0 and d<.05**2 and np.linalg.norm(BU[j]-U[i])<.12:
        U[i]=U[i]*.25+BU[j]*.75
        uvmatches+=1
normatches=0
for i,p in enumerate(P):
    j,d=nearest(p,3)
    if j>=0 and d<.022**2 and np.dot(N[i],BN[j])>0:
        influence=.72*max(0,1-np.sqrt(d)/.022)
        v=N[i]*(1-influence)+BN[j]*influence
        v/=np.linalg.norm(v)
        N[i]=v;normatches+=1
tri=accessor(part['indices']).reshape(-1,3)
edges=Counter(tuple(sorted((int(a),int(b)))) for a,b,c in tri for a,b in ((a,b),(b,c),(c,a)))
boundary=set(j for edge,count in edges.items() if count==1 for j in edge)
colors=np.ones((len(P),3),dtype=np.float32)
for i,p in enumerate(P):
    distance=min((float(np.linalg.norm(p-P[j])) for j in boundary),default=float('inf'))
    t=max(0,1-distance/.045);smooth=t*t*(3-2*t)
    colors[i,:]=1.018+.065*smooth
pa['TEXCOORD_0']=append(U,'VEC2')
pa['NORMAL']=append(N,'VEC3')
pa['COLOR_0']=append(colors,'VEC3')
# Dedicated material: vertex color multiplies texture only for the attachment.
old=part.get('material')
assert old is not None
mat=copy.deepcopy(doc['materials'][old]);mat['name']='SAV4 V21 approved soft-edge skin'
mat['doubleSided']=True
part['material']=len(doc['materials']);doc['materials'].append(mat)
doc['buffers'][0]['byteLength']=len(blob)
encoded=json.dumps(doc,separators=(',',':')).encode()
encoded+=b' '*((-len(encoded))%4)
blob+=b'\0'*((-len(blob))%4)
output=b'glTF'+struct.pack('<II',2,12+8+len(encoded)+8+len(blob))
output+=struct.pack('<II',len(encoded),0x4e4f534a)+encoded
output+=struct.pack('<II',len(blob),0x004e4942)+blob
path.write_bytes(output)
print('SAV4_V21_BAKED',uvmatches,normatches,len(boundary),len(output))
assert uvmatches>=600 and normatches>=450, (uvmatches,normatches,'V21 skin bake coverage below verified baseline')
