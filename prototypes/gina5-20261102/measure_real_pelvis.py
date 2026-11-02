#!/usr/bin/env python3
"""Measure Gina 5's REAL exported body; diagnostic only, no cutting or virtual fitting.
Output front silhouette and pelvic cross sections from the 'Skin' glTF primitive."""
import json,struct,math,pathlib,collections,statistics,sys
p=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2])
b=p.read_bytes();assert b[:4]==b'glTF'
n=struct.unpack_from('<I',b,12)[0]
g=json.loads(b[20:20+n]);off=20+n
n2,typ=struct.unpack_from('<I4s',b,off);assert typ==b'BIN\x00'
bin=b[off+8:off+8+n2]
mats=[x.get('name','') for x in g['materials']]
skin=[x for x in g['meshes'][0]['primitives'] if mats[x['material']]=='Skin']
assert len(skin)==1,(mats,len(skin))
a=g['accessors'][skin[0]['attributes']['POSITION']]
v=g['bufferViews'][a['bufferView']]
assert a['componentType']==5126 and a['type']=='VEC3'
stride=v.get('byteStride',12); start=v.get('byteOffset',0)+a.get('byteOffset',0)
verts=[struct.unpack_from('<fff',bin,start+i*stride) for i in range(a['count'])]
xs,ys,zs=zip(*verts)
def qs(v):
 v=sorted(v);return {'min':round(v[0],5),'q25':round(v[int(len(v)*.25)],5),'median':round(v[len(v)//2],5),'q75':round(v[int(len(v)*.75)],5),'q90':round(v[int(len(v)*.90)],5),'max':round(v[-1],5)}
slices=[]
for yy in [x/1000 for x in range(640,1061,20)]:
 bands=[(x,z) for x,y,z in verts if abs(y-yy)<0.0095]
 centered=[z for x,z in bands if abs(x)<.045]
 right=[z for x,z in bands if .045<=x<.09]
 left=[z for x,z in bands if -.09<x<=-.045]
 slices.append({'y_m':round(yy,3),'n':len(bands),'center_n':len(centered),'x_range_m':[round(min((x for x,z in bands),default=0),4),round(max((x for x,z in bands),default=0),4)],
 'center_z_m':qs(centered) if centered else None,
 'right_z_m':qs(right) if right else None,
 'left_z_m':qs(left) if left else None})
report={'model':'Gina5 true blonde, UNCHANGED BODY','skin_primitive_vertices':len(verts),'bounds_m':{'min':[min(xs),min(ys),min(zs)],'max':[max(xs),max(ys),max(zs)]},'cross_sections':slices,
 'warning':'real rest-pose body vertex samples only; NOT a fitted, cut or welded Round 01. Source Round licensed mesh remains private.'}
out.write_text(json.dumps(report,indent=2)+'\n')
print('Skin verts',len(verts),'range',report['bounds_m'])
for sl in slices:
 print(sl['y_m'],sl['center_n'],sl['center_z_m'])
