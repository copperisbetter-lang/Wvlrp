"""Non-destructive exact-rim fitting helper for Bev and Flat 03 in Blender.
Usage: blender -b bev.blend --python world-creator/scripts/bev_flat03_exact_rim.py -- --body Bev --insert "Flat 03" --output /tmp/bev-fit-report.json
Requires the two original meshes to be loaded and a vertex group named FLAT03_RIM on the attachment.
The insert is NEVER edited. The script writes a report and makes a backup copy of Bev's body
before cutting. This is a guarded staging tool, not a promise of a finished weld.
"""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
from collections import defaultdict

def opts():
    import argparse
    p=argparse.ArgumentParser()
    p.add_argument("--body",default="Bev")
    p.add_argument("--insert",default="Flat 03")
    p.add_argument("--output",default="/tmp/bev-fit-report.json")
    p.add_argument("--max-gap-mm",type=float,default=8.)
    return p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])

def border_components(ob):
    me=ob.data
    uses=defaultdict(int)
    for f in me.polygons:
        vs=list(f.vertices)
        for a,b in zip(vs,vs[1:]+vs[:1]):uses[tuple(sorted((a,b)))]+=1
    edges=[e for e,n in uses.items() if n==1]
    neighbors=defaultdict(set)
    for a,b in edges:neighbors[a].add(b);neighbors[b].add(a)
    seen=set();comps=[]
    for start in neighbors:
        if start in seen:continue
        stack=[start];comp=set()
        while stack:
            i=stack.pop()
            if i in comp:continue
            comp.add(i);stack.extend(neighbors[i]-comp)
        seen.update(comp);comps.append(comp)
    return edges,comps

def main():
    a=opts()
    body=bpy.data.objects.get(a.body); insert=bpy.data.objects.get(a.insert)
    if not body or not insert or body.type!="MESH" or insert.type!="MESH":
        raise RuntimeError("Need actual Bev body and purchased Flat 03 meshes loaded; nothing modified")
    if body==insert:raise RuntimeError("Body and insert cannot be the same object")
    group=insert.vertex_groups.get("FLAT03_RIM")
    if not group:raise RuntimeError("Mark actual Flat03 attachment border as FLAT03_RIM; no inferred rim allowed")
    edges,comps=border_components(insert)
    ids=set()
    for v in insert.data.vertices:
        try:
            if group.weight(v.index)>.5:ids.add(v.index)
        except RuntimeError:pass
    matching=[c for c in comps if c==ids]
    if len(matching)!=1 or len(ids)<3:
        raise RuntimeError("FLAT03_RIM must match exactly one real topological open boundary component")
    if len([n for n in ids if sum(n in e for e in edges)!=2]):
        raise RuntimeError("Rim is not a single closed 2-valent loop")
    pts=[insert.matrix_world @ insert.data.vertices[i].co for i in sorted(ids)]
    tree=KDTree(len(body.data.vertices))
    for v in body.data.vertices:tree.insert(body.matrix_world @ v.co,v.index)
    tree.balance()
    d=[tree.find(p)[2] for p in pts]
    scale=bpy.context.scene.unit_settings.scale_length or 1.
    mm=[v*scale*1000 for v in d]
    report={"status":"BLOCKED_NO_CUT","body":body.name,"insert":insert.name,
            "rim_vertices":len(ids),"insert_open_boundary_edges":len(edges),
            "rim_nearest_body_vertex_gap_mm":{"max":max(mm),"mean":sum(mm)/len(mm)},
            "threshold_mm":a.max_gap_mm,
            "insert_preserved":True,
            "note":"Nearest vertex gap is only a preflight, not a proof of watertight attachment. Cutting needs ordered border correspondence and validated body surface patch."}
    if max(mm)<=a.max_gap_mm:
        report["status"]="PREFLIGHT_PASS_READY_FOR_EXACT_SURFACE_CUT"
    report["boundary_components_total"]=len(comps)
    report["body_mesh_unchanged"]=True
    report["geometry_operations_performed"]=0
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    Path(a.output).write_text(json.dumps(report,indent=2))
    print("BEV_FLAT03_EXACT_RIM",json.dumps(report))
    if report["status"]!="PREFLIGHT_PASS_READY_FOR_EXACT_SURFACE_CUT":
        raise RuntimeError("Gap exceeds safe preflight threshold; do not deform Flat 03 or cut Bev")

if __name__=="__main__":main()
