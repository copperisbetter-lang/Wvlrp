#!/usr/bin/env python3
"""Export REAL Gina5 Skin pelvis subset, including faces, joints and weights, to a compact
zlib/base85 line for offline private Round 01 fitting. No private Round assets in public repo.
No geometry changes to source. Do not claim fit from this data alone."""
import pathlib,sys,struct,json,zlib,base64
src,out=map(pathlib.Path,sys.argv[1:3])
blob=src.read_bytes();assert blob[:4]==b'glTF'
jn=struct.unpack_from('<I',blob,12)[0];g=json.loads(blob[20:20+jn]);bp=20+jn
bn,typ=struct.unpack_from('<I4s',blob,bp);assert typ==b'BIN\x00'
data=memoryview(blob)[bp+8:bp+8+bn]
materials=[m.get('name','') for m in g['materials']]
pp=[p for m in g['meshes'] for p in m['primitives'] if materials[p['material']]=='Skin']
assert len(pp)==1,len(pp)
p=pp[0]
def get(aidx):
 a=g['accessors'][aidx];v=g['bufferViews'][a['bufferView']]
 n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
 fmt={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']]
 step=struct.calcsize('<'+fmt*n)
 stride=v.get('byteStride',step);base=v.get('byteOffset',0)+a.get('byteOffset',0)
 values=[struct.unpack_from('<'+fmt*n,data,base+i*stride) for i in range(a['count'])]
 if a.get('normalized'):
  divisor={5121:255,5123:65535}[a['componentType']]
  values=[tuple(x/divisor for x in row) for row in values]
 return values
pos=get(p['attributes']['POSITION'])
ind=[x[0] for x in get(p['indices'])]
joint=get(p['attributes']['JOINTS_0'])
weight=get(p['attributes']['WEIGHTS_0'])
uv=get(p['attributes']['TEXCOORD_0'])
# Include actual skin triangles in pelvic + groin/butt region.
def inside(v):
 x,y,z=v
 return -.195 <= x <= .195 and .46 <= y <= .94 and -.11 <= z <= .19
valid=[inside(v) for v in pos]
faces=[ind[k:k+3] for k in range(0,len(ind),3) if any(valid[t] for t in ind[k:k+3])]
used=sorted(set(t for f in faces for t in f))
lookup={v:i for i,v in enumerate(used)}
obj={'name':'Gina5_V3_Real_Pelvis_SourcePatch','version':1,'units':'meters',
 'vertex_indices':used,
 'pos':[[round(z,6) for z in pos[i]] for i in used],
 'uv':[[round(z,6) for z in uv[i]] for i in used],
 'joint':[list(joint[i]) for i in used],
 'weight':[[round(z,5) for z in weight[i]] for i in used],
 'faces':[[lookup[t] for t in f] for f in faces],
 'bounds':{'min':[min(v[j] for v in pos) for j in range(3)],'max':[max(v[j] for v in pos) for j in range(3)]}}
plain=json.dumps(obj,separators=(',',':')).encode()
packed=base64.b85encode(zlib.compress(plain,9)).decode()
out.write_text(packed)
print('real pelvis geometry vertices',len(used),'triangles',len(faces),'plain_bytes',len(plain),'compact_bytes',len(packed))
assert len(used)>1000 and len(faces)>1000
