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
    result={
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
    if result["indices_in_range"]:
        import math
        from mathutils import Vector
        axis_map={"x":0,"y":2,"z":1}
        scales={}
        for axis,item in bounds.items():
            lo,hi=item["indices"]
            scales[axis]=abs((vertices[hi].co[axis_map[axis]]-vertices[lo].co[axis_map[axis]])/item["reference"])
        result["measured_scales"]=scales
        result["scale_plausible"]=all(math.isfinite(v) and .025<v<.25 for v in scales.values())
    return result

if __name__=="__main__":
    import bpy
    from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
    bodies=[obj for obj in bpy.data.objects if obj.type=="MESH" and "base" in obj.name.lower()]
    if not bodies: raise RuntimeError("No SAV4 basemesh in scene; run after SAV4 creation")
    print("SAV4_VULVA2_PREFLIGHT",json.dumps(inspect_compatibility(bodies[0]),sort_keys=True))
