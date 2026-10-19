"""SAV4 MPFB face calibration: export mesh coordinates for vertex mapping.

Run inside the existing SAV4 Blender build after the source basemesh exists,
or import this helper and call export_face_candidates(face_body, destination).
The CSV is an inspection aid; it does NOT infer eye/nose/lip identities from
unreliable image pixels. Use Blender vertex selection to assign exact IDs.
"""
import csv
from pathlib import Path

REGIONS=("nose_bridge","nose_tip","mouth_corners","upper_lip","lower_lip")

def export_face_candidates(body, destination):
    vertices=body.data.vertices
    zmin=min(v.co.z for v in vertices)
    zmax=max(v.co.z for v in vertices)
    span=zmax-zmin
    if span<=0:
        raise ValueError("Invalid SAV4 mesh vertical span")
    destination=Path(destination)
    destination.parent.mkdir(parents=True,exist_ok=True)
    with destination.open("w",newline="") as out:
        writer=csv.writer(out)
        writer.writerow(("vertex_id","x","y","z","normalized_height","distance_from_centerline"))
        for vertex in vertices:
            h=(vertex.co.z-zmin)/span
            if 0.865<=h<=0.995:
                writer.writerow((vertex.index,*[round(v,7) for v in vertex.co],round(h,7),round(abs(vertex.co.x),7)))
    return destination

def create_region_template(body,destination):
    import json
    destination=Path(destination)
    destination.parent.mkdir(parents=True,exist_ok=True)
    template={"mesh_vertex_count":len(body.data.vertices),
              "regions":{name:[] for name in REGIONS},
              "status":"unmapped; fill verified basemesh vertex IDs in Blender"}
    destination.write_text(json.dumps(template,indent=2)+"\n")
    return destination

def propose_region_candidates(body, destination, per_region=24):
    """Generate review-only spatial candidate IDs; never mark as verified."""
    import json
    verts=list(body.data.vertices)
    zmin=min(v.co.z for v in verts); zmax=max(v.co.z for v in verts)
    span=zmax-zmin
    if span<=0: raise ValueError("Invalid SAV4 mesh span")
    # Anatomical positions are approximate, not proof of identity.
    targets={"nose_bridge":(.953,.012),"nose_tip":(.936,.010),
             "mouth_corners":(.912,.028),"upper_lip":(.916,.013),
             "lower_lip":(.906,.013)}
    result={"mesh_vertex_count":len(verts),"status":"CANDIDATES_ONLY_NOT_VERIFIED",
            "regions":{},"note":"Review each ID against the actual mesh in Blender; do not use as face-region-map.json automatically."}
    for name,(height,lateral) in targets.items():
        scored=[]
        for v in verts:
            h=(v.co.z-zmin)/span
            if not .865<=h<=.995: continue
            score=((h-height)/.012)**2+((abs(v.co.x)-lateral)/.022)**2
            scored.append((score,v.index))
        result["regions"][name]=[i for _,i in sorted(scored)[:per_region]]
    destination=Path(destination);destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(result,indent=2)+"\\n")
    return destination
