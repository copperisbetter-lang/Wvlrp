#!/usr/bin/env python3
"""Repair ONLY the root scale on already-safe finished Ara age-seven exports."""
from pathlib import Path
import hashlib,json,struct
BASE=Path("prototypes/ara-young-explorer-three")
NAMES=("Ara7_Swim_Colors","Ara7_Pink_Sundress","Ara7_Neutral_Mesh_Reference")
def pack4(b,pad):return b+pad*((-len(b))%4)
def fix(path):
    b=path.read_bytes()
    assert b[:4]==b"glTF" and struct.unpack_from("<I",b,8)[0]==len(b)
    jlen=struct.unpack_from("<I",b,12)[0]
    d=json.loads(b[20:20+jlen]); off=20+jlen
    blen,btag=struct.unpack_from("<I4s",b,off);assert btag==b"BIN\x00"
    data=b[off+8:off+8+blen]
    mats=[m["name"] for m in d["materials"]]
    skin=next(pr for me in d["meshes"] for pr in me["primitives"] if mats[pr["material"]]=="Skin")
    ia=d["accessors"][skin["indices"]]; iv=d["bufferViews"][ia["bufferView"]]
    k={5121:"B",5123:"H",5125:"I"}[ia["componentType"]]
    at=iv.get("byteOffset",0)+ia.get("byteOffset",0)
    stride=iv.get("byteStride",struct.calcsize("<"+k))
    ids={struct.unpack_from("<"+k,data,at+i*stride)[0] for i in range(ia["count"])}
    assert len(ids)==14517 and ia["count"]==80268
    pa=d["accessors"][skin["attributes"]["POSITION"]];pv=d["bufferViews"][pa["bufferView"]]
    pos_at=pv.get("byteOffset",0)+pa.get("byteOffset",0)
    pos_stride=pv.get("byteStride",12)
    ys=[struct.unpack_from("<f",data,pos_at+v*pos_stride+4)[0] for v in ids]
    raw_height=max(ys)-min(ys);assert 1.0<raw_height<1.5
    new_scale=1.22/raw_height
    roots=d["scenes"][d.get("scene",0)]["nodes"];assert len(roots)==1
    node=d["nodes"][roots[0]]
    assert node["name"]=="WVLRP Age Seven 1.22m root" and len(node["children"])==2
    node["scale"]=[new_scale,new_scale,new_scale]
    d["extras"]["wvlrpScaledBodyHeightMeters"]=1.22
    js=pack4(json.dumps(d,separators=(",",":")).encode(),b" ")
    raw=(b"glTF"+struct.pack("<II",2,12+8+len(js)+8+len(data))
          +struct.pack("<I4s",len(js),b"JSON")+js
          +struct.pack("<I4s",len(data),b"BIN\x00")+data)
    path.write_bytes(raw)
    return {'raw_body_height_m':round(raw_height,5),'root_scale':round(new_scale,7),
            'final_body_height_m':round(raw_height*new_scale,5),'bytes':len(raw)}
if __name__=="__main__":
    report=json.loads((BASE/"AGE7_FINISH_REPORT.json").read_text())
    for n in NAMES:
        updated=fix(BASE/"out"/(n+".glb"))
        report[n].update(updated)
    (BASE/"AGE7_FINISH_REPORT.json").write_text(json.dumps(report,indent=2)+"\n")
    assert len({r['root_scale'] for r in report.values()})==1
    print("REPAIRED_ORIGINAL_BODY_ONLY_HEIGHT_NO_REBUILD")
    print(json.dumps(report,indent=2))
