"""Read-only Flat 03 / Bev fit preflight. Run inside Blender:
blender -b scene.blend --python world-creator/scripts/audit_bev_flat03_fit.py -- --body Bev --insert "Flat 03" --output /tmp/bev-fit.json
This does NOT cut, deform, recolor, or weld either mesh.
Both named meshes must exist in the loaded .blend; paid Flat 03 is never downloaded or redistributed.
"""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
from collections import Counter

def arguments():
    import argparse
    p=argparse.ArgumentParser()
    p.add_argument("--body",default="Bev")
    p.add_argument("--insert",default="Flat 03")
    p.add_argument("--output",default="/tmp/bev-flat03-preflight.json")
    return p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])

def snapshot(obj, depsgraph):
    ev=obj.evaluated_get(depsgraph)
    mesh=ev.to_mesh()
    try:
        verts=[obj.matrix_world @ v.co for v in mesh.vertices]
        edges=[(e.vertices[0],e.vertices[1]) for e in mesh.edges]
        counts=Counter(tuple(sorted((mesh.loops[i].vertex_index,mesh.loops[mesh.polygons[p.index].loop_start].vertex_index))) for p in [] for i in [])
        incidence=Counter()
        for poly in mesh.polygons:
            ids=list(poly.vertices)
            for a,b in zip(ids,ids[1:]+ids[:1]):
                incidence[tuple(sorted((a,b)))]+=1
        borders=[(a,b) for (a,b),n in incidence.items() if n==1]
        nonmanifold=sum(n>2 for n in incidence.values())
        bounds=[ [min(v[k] for v in verts),max(v[k] for v in verts)] for k in range(3)]
        return {"verts":verts,"borders":borders,"nonmanifold":nonmanifold,"bounds":bounds,
                "vertex_count":len(verts),"face_count":len(mesh.polygons)}
    finally:
        ev.to_mesh_clear()

def main():
    a=arguments()
    objects=[]
    for name in (a.body,a.insert):
        ob=bpy.data.objects.get(name)
        if not ob or ob.type!="MESH":
            raise RuntimeError("Required mesh object missing: %r. No geometry was modified."%name)
        objects.append(ob)
    deps=bpy.context.evaluated_depsgraph_get()
    body,insert=[snapshot(o,deps) for o in objects]
    # No reliable rim-to-rim fit test exists if the body has not yet been cut.
    tree=KDTree(len(body["verts"]))
    for i,v in enumerate(body["verts"]):tree.insert(v,i)
    tree.balance()
    distances=[tree.find(v)[2] for v in insert["verts"]]
    distances.sort()
    def percentile(q):
        return distances[min(len(distances)-1,round(q*(len(distances)-1)))]
    report={
        "status":"MEASURED_ONLY_NOT_FIT_VERIFIED",
        "units":"meters_assuming_blender_scene_unit_scale_1",
        "scene_unit_scale":bpy.context.scene.unit_settings.scale_length,
        "body":a.body,"insert":a.insert,
        "body_vertex_count":body["vertex_count"],
        "insert_vertex_count":insert["vertex_count"],
        "body_open_boundary_edges":len(body["borders"]),
        "insert_open_boundary_edges":len(insert["borders"]),
        "body_nonmanifold_edges":body["nonmanifold"],
        "insert_nonmanifold_edges":insert["nonmanifold"],
        "body_bounds_xyz":body["bounds"],
        "insert_bounds_xyz":insert["bounds"],
        "insert_to_body_nearest_vertex_distance_m":{
            "min":distances[0],"median":percentile(.5),"p95":percentile(.95),"max":distances[-1]},
        "warning":"Nearest vertices are NOT seam correspondence. Do not weld based on these numbers. Identify intended attachment rim, cut Bev against that exact rim, then verify boundary pairing, normals, weights, and posed seams.",
        "source_preservation":"read_only"
    }
    path=Path(a.output);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(report,indent=2))
    print("WVLRP_BEV_FLAT03_PREFLIGHT",path,report["status"])

if __name__=="__main__":
    main()
