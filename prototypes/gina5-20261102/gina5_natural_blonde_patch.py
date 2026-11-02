#!/usr/bin/env python3
"""Recolor ONLY the actual Hair texture of existing Gina 5 GLB to natural honey-blonde.
Keep face/body geometry, UVs, skin weights, skin details, materials (except Hair), rig and animation untouched."""
import hashlib, json, struct, io, pathlib, sys
from PIL import Image, ImageOps
from PIL import ImageStat
src,dst,report=map(pathlib.Path,sys.argv[1:4])
b=src.read_bytes()
assert b[:4]==b'glTF' and struct.unpack_from('<I',b,8)[0]==len(b)
chunks={}
p=12
while p<len(b):
 n,typ=struct.unpack_from('<I4s',b,p)
 chunks[typ]=b[p+8:p+8+n]
 p+=8+n
g=json.loads(chunks[b'JSON'])
payload=bytearray(chunks[b'BIN\x00'])
hair_ids=[i for i,x in enumerate(g['materials']) if x.get('name','').lower()=='hair']
assert len(hair_ids)==1,hair_ids
idx=hair_ids[0]
mat=g['materials'][idx]
pbr=mat['pbrMetallicRoughness']
old_factor=pbr.get('baseColorFactor',[1,1,1,1])
old_tex=pbr.get('baseColorTexture')
assert old_tex is not None,'Require real hair texture instead of a color-only preview'
tex=g['textures'][old_tex['index']]
img=g['images'][tex['source']]
v=g['bufferViews'][img['bufferView']]
start=v.get('byteOffset',0)
raw=payload[start:start+v['byteLength']]
im=Image.open(io.BytesIO(raw)).convert('RGBA')
gray=ImageOps.grayscale(im)
alpha=im.getchannel('A')
# Normalize strand lighting on the visible texture pixels, eliminating dark brunette base.
hist=gray.histogram()
lo,hi,total=0,255,sum(hist)
run=0
for i,n in enumerate(hist):
 run+=n
 if run >= total*.06:
  lo=i;break
run=0
for i,n in enumerate(hist):
 run+=n
 if run>=total*.96:
  hi=i;break
hi=max(lo+12,hi)
# Ash-gold neutral light blonde, deliberately high green and blue to avoid orange/auburn.
shadow=(138,105,48)
highlight=(205,170,91)
def channel(a,b):
 return gray.point([max(0,min(255,round(a+(b-a)*max(0,min(1,(v-lo)/(hi-lo)))))) for v in range(256)])
outim=Image.merge('RGBA',(channel(shadow[0],highlight[0]),channel(shadow[1],highlight[1]),channel(shadow[2],highlight[2]),alpha))
data=io.BytesIO()
outim.save(data,format='PNG',optimize=True)
new_png=data.getvalue()
while len(payload)%4:payload.append(0)
at=len(payload)
payload.extend(new_png)
new_view=len(g['bufferViews'])
g['bufferViews'].append({'buffer':0,'byteOffset':at,'byteLength':len(new_png),'name':'Gina5_ACTUAL_Blonde_Hair_Pixels'})
new_img=len(g['images'])
g['images'].append({'name':'Gina5_NeutralBlonde_Strand_Texture','mimeType':'image/png','bufferView':new_view})
new_tex=len(g['textures'])
entry={'name':'Gina5_Actual_Blonde','source':new_img}
if 'sampler' in tex: entry['sampler']=tex['sampler']
g['textures'].append(entry)
pbr['baseColorTexture']={'index':new_tex}
pbr['baseColorFactor']=[1,1,1,1]
mat.setdefault('extras',{})['gina5_color_revision']='BLONDE texture, natural golden blonde #cdaa5b, not white or auburn'
while len(payload)%4:payload.append(0)
g['buffers'][0]['byteLength']=len(payload)
js=json.dumps(g,ensure_ascii=False,separators=(',',':')).encode('utf-8')
js+=b' '*((-len(js))%4)
new_blob=struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(payload))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(payload),b'BIN\x00')+payload
dst.write_bytes(new_blob)
qa={
 'source_sha256':hashlib.sha256(b).hexdigest(),
 'result_sha256':hashlib.sha256(new_blob).hexdigest(),
 'source_size':len(b),'result_size':len(new_blob),
 'status':'TECHNICALLY RECOLORED, NOT YET OWNER-APPROVED',
 'material_changed':'Hair only','other_materials_unchanged':True,
 'hair_texture_replaced':True,
 'hair_color_dark_rgb':shadow,'hair_color_light_rgb':highlight,
 'source_hair_factor':old_factor,
 'animation_count_original':len(g.get('animations',[])),
 'skin_count_original':len(g.get('skins',[])),
 'mesh_count_original':len(g.get('meshes',[])),
 'unchanged_original_geometry':True,
 'unchanged_face_material_and_transparency':True,
 'source_hair_image':img.get('name'),
 'modified_hair_material':mat
}
assert qa['animation_count_original']==77 and qa['skin_count_original']>=1 and qa['mesh_count_original']>=1
report.write_text(json.dumps(qa,indent=2)+'\n')
print(json.dumps({k:v for k,v in qa.items() if k!='modified_hair_material'},indent=2))
