"""Read-only SAV4/Vulva2 source compatibility preflight.

This script deliberately does not alter SAV4 or export anatomy.
Run inside Blender after the SAV4 basemesh is constructed, passing its
Basemesh object to inspect_compatibility.
"""
import json
from pathlib import Path

SOURCE=Path(__file__).resolve().parents[1]/"assets"/"vulva2-mhx2-source.json"

def inspect_compatibility(body):
    data=json.loads(SOURCE.read_text())
    proxy=data["proxy"]
    fit=proxy["fitting"]
    vertices=body.data.vertices
    ids={int(i) for row in fit for i in row[0]}
    bounds={axis: {"indices": [int(v[0]),int(v[1])], "reference":float(v[2])}
            for axis,v in proxy["bounding_box"].items()}
    required=ids|{i for item in bounds.values() for i in item["indices"]}
    face_count=len(data["mesh"]["faces"])
    malformed_fits=sum(1 for row in fit if len(row)!=3 or len(row[0])!=3 or len(row[1])!=3 or len(row[2])!=3)
    weight_errors=sum(1 for row in fit if len(row)==3 and len(row[1])==3 and abs(sum(row[1])-1.0)>0.025)
    result={
        "fitting_rows_well_formed":malformed_fits==0,
        "fitting_weights_valid":weight_errors==0,
        "fitting_row_errors":malformed_fits,
        "fitting_weight_errors":weight_errors,
        "source_mesh_nonempty":face_count>0,
        "source":proxy["name"],
        "source_mesh":proxy["base_mesh"],
        "source_fitting_points":len(fit),
        "source_faces":len(data["mesh"]["faces"]),
        "sav4_vertex_count":len(vertices),
        "highest_required_index":max(required),
        "indices_in_range":max(required)<len(vertices),
        "bounding_box":bounds,
        "compatible":False,
        "warning":"Index-range alone does not establish identical hm08 vertex topology. Do not attach or export until topology and exterior fit are verified."
    }
    if result["indices_in_range"] and result["fitting_rows_well_formed"] and result["fitting_weights_valid"] and result["source_mesh_nonempty"]:
        import math
        from mathutils import Vector
        axis_map={"x":0,"y":2,"z":1}
        scales={}
        for axis,item in bounds.items():
            lo,hi=item["indices"]
            scales[axis]=abs((vertices[hi].co[axis_map[axis]]-vertices[lo].co[axis_map[axis]])/item["reference"])
        result["measured_scales"]=scales
        result["scale_plausible"]=all(math.isfinite(v) and .025<v<.25 for v in scales.values())
        result["ready_for_topology_review"]=result["scale_plausible"]
        result["next_step"]="Compare hm08 topology fingerprint and inspect exterior fit before attaching to SAV4"
    return result

if __name__=="__main__":
    import bpy
    from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
    bodies=[obj for obj in bpy.data.objects if obj.type=="MESH" and "base" in obj.name.lower()]
    if not bodies: raise RuntimeError("No SAV4 basemesh in scene; run after SAV4 creation")
    print("SAV4_VULVA2_PREFLIGHT",json.dumps(inspect_compatibility(bodies[0]),sort_keys=True))
