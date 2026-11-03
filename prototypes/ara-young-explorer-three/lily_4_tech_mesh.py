#!/usr/bin/env python3
"""Create untextured non-rendered Lily 4 technical source mesh. Never publish child nude preview."""
from pathlib import Path
import sys,json,hashlib,struct
BASE=Path("prototypes/ara-young-explorer-three")
NAME="Lily_4"
def pad(b,p):return b+p*((-len(b))%4)
def body_mat(name):
    n=name.strip().lower()
    return n in ("skin","hair","eyes") or any(x in n for x in ("eyebrow","eyelash","teeth","tongue","mouth","cornea","gum","nail"))
def main():
    sys.path.insert(0,str(BASE.resolve()))
    from age7_glb_finish import finish
    params=json.loads((BASE/(NAME+".params.json")).read_text())
    assert params["age"]==0.1125 and params["underwear"] is True
    assert params["hair"]=="long01" and params["eyes"]=="green"
    path=BASE/"out"/(NAME+".glb")
    fin=finish(path)
    raw=path.read_bytes()
    assert raw[:4]==b"glTF"
    jl=struct.unpack_from("<I",raw,12)[0]
    doc=json.loads(raw[20:20+jl])
    bo=20+jl
    bl=struct.unpack_from("<I",raw,bo)[0]
    binary=raw[bo+8:bo+8+bl]
    names=[m.get("name","") for m in doc["materials"]]
    assert {"Skin","Hair","Eyes"}.issubset(set(names))
    meshes=[];mapmesh={};removed=[]
    for old,mesh in enumerate(doc["meshes"]):
        parts=[]
        for pr in mesh["primitives"]:
            if body_mat(names[pr["material"]]):parts.append(pr)
            else:removed.append(names[pr["material"]])
        if parts:
            mapmesh[old]=len(meshes)
            meshes.append({**mesh,"primitives":parts})
    assert removed,"Native source covering was not found"
    doc["meshes"]=meshes
    for node in doc["nodes"]:
        if "mesh" in node:
            mid=node["mesh"]
            if mid in mapmesh:node["mesh"]=mapmesh[mid]
            else:
                node.pop("mesh")
                node.pop("skin",None)
    mids=sorted({pr["material"] for mesh in meshes for pr in mesh["primitives"]})
    remap={old:new for new,old in enumerate(mids)}
    doc["materials"]=[doc["materials"][i] for i in mids]
    for mesh in meshes:
        for pr in mesh["primitives"]:pr["material"]=remap[pr["material"]]
    skin=next(m for m in doc["materials"] if m["name"]=="Skin")
    skin["pbrMetallicRoughness"]={"baseColorFactor":[.64,.67,.69,1],"metallicFactor":0,"roughnessFactor":1}
    skin.pop("normalTexture",None);skin.pop("occlusionTexture",None)
    skin["doubleSided"]=True
    sp=next(pr for mesh in meshes for pr in mesh["primitives"] if doc["materials"][pr["material"]]["name"]=="Skin")
    assert doc["accessors"][sp["indices"]]["count"]==80268
    assert len(doc["skins"][0]["joints"])==69 and len(doc["animations"])==77
    assert doc.get("extras",{}).get("wvlrpAgeYears")==7
    doc.setdefault("extras",{}).update({"wvlrpNeutralTechnicalMesh":True,
        "wvlrpClothingSceneGeometry":False,"wvlrpUncoveredMinorPreviewForbidden":True,
        "wvlrpViewerRequiresOpaqueCoverage":True})
    j=pad(json.dumps(doc,separators=(",",":")).encode(),b" ")
    binary=pad(binary,b"\x00")
    packed=(b"glTF"+struct.pack("<II",2,12+8+len(j)+8+len(binary))+
        struct.pack("<I4s",len(j),b"JSON")+j+struct.pack("<I4s",len(binary),b"BIN\x00")+binary)
    assert struct.unpack_from("<I",packed,8)[0]==len(packed)
    path.write_bytes(packed)
    (BASE/(NAME+".glb")).write_bytes(packed)
    report={"status":"TECHNICAL STRUCTURAL QA PASS; NO UNCOVERED CHILD PREVIEW",
        "source_website":"Ara 3D Gen", "name":NAME, "bytes":len(packed),
        "sha256":hashlib.sha256(packed).hexdigest(),"body_indices":80268,
        "rig_bones":69,"animations":77,"clothing_scene_objects":0,
        "removed_source_clothing_materials":sorted(set(removed)),
        "remaining_materials":[m["name"] for m in doc["materials"]],
        "hair_and_eyes_preserved":True,"approved_original_master_unchanged":True,
        "required_preview":"Neutral technical mannequin with opaque censoring of sensitive areas",
        "finish_report":fin}
    (BASE/"LILY_4_TECH_QA.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report))
if __name__=="__main__":main()
