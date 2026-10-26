"""Brooke V3 non-destructive geometry diagnosis. Never write source assets."""
import os, json, bpy, bmesh
from mathutils import Vector
src='avatar-work/brooke/second-chance/build_3948_swap.py'
body=open(src).read().split('# Preserve source image texture and UV; build raised crown directly into working mesh.')[0]
exec(compile(body,src,'exec'),globals())
def box(ps):
 return [[round(min(v[i] for v in ps),4),round(max(v[i] for v in ps),4)] for i in range(3)]
def loops(bm, matrix):
 boundary={e for e in bm.edges if e.is_boundary}
 out=[]
 while boundary:
  start=boundary.pop(); stack=[start]; group=[start]
  while stack:
   for v in stack.pop().verts:
    for e in v.link_edges:
     if e in boundary:boundary.remove(e);stack.append(e);group.append(e)
  verts={v for e in group for v in e.verts};p=[matrix@v.co for v in verts]
  out.append({'edges':len(group),'nverts':len(verts),'bounds':box(p),
   'center':[round(sum(t[i] for t in p)/len(p),4) for i in range(3)]})
 return sorted(out,key=lambda a:-a['edges'])
bmb=bmesh.new();bmb.from_mesh(base.data)
print('V3_BODY_HOLES',json.dumps(loops(bmb,base.matrix_world)[:15]));bmb.free()
ps=[to_canonical@v.co for v in h.data.vertices]
print('V3_SCAN_BOUNDS',json.dumps({'n':len(ps),'bounds':box(ps),'scale_used_v2':.29,
   'material_names':[m.name for m in h.data.materials],'matrix':list(map(list,h.matrix_world))}))
for yy in [-.65,-.55,-.45,-.38,-.32,-.28,-.25,-.22,-.20,-.18,-.15,-.12,-.09,-.05,0,.05,.10,.15,.20,.25,.30,.35,.40,.45]:
 band=[p for p in ps if yy<=p.y<yy+.025]
 if band: print('V3_SCAN_SLICE',json.dumps({'y':yy,'n':len(band),'bounds':box(band)}))
for threshold in [-.18,-.22,-.26,-.30]:
 bm=bmesh.new();bm.from_mesh(h.data);bm.verts.ensure_lookup_table()
 doomed=[v for v in bm.verts if (to_canonical@v.co).y<threshold]
 bmesh.ops.delete(bm,geom=doomed,context='VERTS')
 print('V3_SCAN_CROPPED',json.dumps({'y':threshold,'remaining_vertices':len(bm.verts),
  'holes':loops(bm,to_canonical)[:8]}));bm.free()
print('V3_GEOMETRY_DIAGNOSTIC_COMPLETE')
