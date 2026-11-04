#!/usr/bin/env python3
"""Build strictly separate Beverly surgery prep: no changes to certified source or game."""
import base64, hashlib, json, os, shutil, struct
from pathlib import Path

OUT=Path(os.environ.get("SURGERY_OUT","/tmp/beverly-surgery-room")).resolve()
SOURCE=Path(os.environ["BEVERLY_PARTS_DIR"])
DONOR=Path(os.environ["DONOR_FILE"])
OUT.mkdir(parents=True,exist_ok=True)
EXPECTED="fc55a17bb9c228ecc1a2a3f24ccd5e3a4ec26a987cb2ffe123ce00d12530a7fc"
parts=sorted(SOURCE.glob("Beverly.glb.b64.part*"))
assert len(parts)==26, f"Expected 26 original certified pieces, found {len(parts)}"
encoded="".join(p.read_text() for p in parts)
original=base64.b64decode(encoded, validate=True)
checksum=hashlib.sha256(original).hexdigest()
assert checksum==EXPECTED,(checksum,EXPECTED)
assert len(original)==18798120,(len(original),"wrong approved source length")
beverly=OUT/"Beverly_SURGERY_CLONE.glb"
beverly.write_bytes(original)
assert hashlib.sha256(beverly.read_bytes()).hexdigest()==EXPECTED
assert DONOR.is_file() and DONOR.stat().st_size>1000000
shutil.copy2(DONOR,OUT/"Test_Bone_1_SOURCE_DONOR.glb")

def gltf_metadata(binary):
    raw=Path(binary).read_bytes()
    assert raw[:4]==b'glTF' and struct.unpack_from("<I",raw,8)[0]==len(raw)
    length,marker=struct.unpack_from("<I4s",raw,12)
    assert marker==b'JSON'
    doc=json.loads(raw[20:20+length])
    skins=[len(s.get("joints",[])) for s in doc.get("skins",[])]
    animation_names=[a.get("name","") for a in doc.get("animations",[])]
    return {"sha256":hashlib.sha256(raw).hexdigest(),"bytes":len(raw),
            "meshes":len(doc.get("meshes",[])),"nodes":len(doc.get("nodes",[])),
            "skin_joint_counts":skins,"animation_count":len(animation_names),
            "animation_names":animation_names,
            "source_materials":[m.get("name","") for m in doc.get("materials",[])]}
bmeta=gltf_metadata(beverly)
dmeta=gltf_metadata(OUT/"Test_Bone_1_SOURCE_DONOR.glb")
assert 52 in bmeta["skin_joint_counts"],bmeta["skin_joint_counts"]
assert 69 in dmeta["skin_joint_counts"],dmeta["skin_joint_counts"]
assert dmeta["animation_count"]==77,dmeta["animation_count"]
report={
    "checkpoint":"PRE_SURGERY; NO RIG TRANSPLANT",
    "source":"Certified Beverly game GLB (identical bytes, separate filename)",
    "clone":"Beverly_SURGERY_CLONE.glb",
    "clone_is_byte_identical_to_approved_game_glb":True,
    "clone":bmeta,"donor":dmeta,
    "target_original_unchanged":True,
    "status":"Both complete assets staged separately; body geometry and original skeleton protected",
    "constraints":["No overwrites to approved Beverly or game","Do not publish private licensed mesh as public repository file",
                   "Do not claim donor rig has been fitted, weighted, or transferred",
                   "No shape/skeleton changes performed during preparation"]}
(OUT/"Surgery_Room_Manifest.json").write_text(json.dumps(report,indent=2)+"\n")
print("BEVERLY_SURGERY_SOURCE_VERIFIED",checksum,len(original),"donor joints",dmeta["skin_joint_counts"],
      "donor animations",dmeta["animation_count"])
