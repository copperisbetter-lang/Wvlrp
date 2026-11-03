#!/usr/bin/env python3
"""WVLRP Ara age-seven finishing pass. ONLY neutral, age-appropriate dressed GLBs."""
from pathlib import Path
from io import BytesIO
import json, struct, hashlib, math, sys
from PIL import Image, ImageOps

NAMES = ("Ara7_Swim_Colors", "Ara7_Pink_Sundress", "Ara7_Neutral_Mesh_Reference")
BASE = Path("prototypes/ara-young-explorer-three")
EXPECTED_AGE = 0.1125  # MakeHuman/Ara yearsToAge(7), NOT a teen age
TARGET_METERS = 1.22

def chunk4(data, pad):
    return data + (pad * ((-len(data)) % 4))

def accessor(doc, data, ix):
    a=doc["accessors"][ix]
    v=doc["bufferViews"][a["bufferView"]]
    assert a["componentType"]==5126 and a["type"]=="VEC3"
    at=v.get("byteOffset",0)+a.get("byteOffset",0)
    stride=v.get("byteStride",12)
    return [struct.unpack_from("<fff",data,at+i*stride) for i in range(a["count"])]

def decorate_image(img, mode):
    rgba=img.convert("RGBA")
    if mode=="hair":
        # Source hair's PNG is DARK BROWN; multiplying it by blonde 'hairTint'
        # cannot brighten its texture. Replace image pigment, preserve strand
        # shading and per-pixel alpha instead.
        grey=ImageOps.grayscale(rgba)
        grey=grey.point([min(255,round((n/255.0)**0.63*255)) for n in range(256)])
        colored=ImageOps.colorize(grey,black="#493f2b",mid="#c6b58b",white="#f7eccf",midpoint=125)
        colored.putalpha(rgba.getchannel("A"))
        return colored
    if mode=="eyes":
        # Lift *green iris pixels only* toward light sage green; don't modify
        # eyelid whites, cornea transparency, or dark pupils.
        p=list(rgba.getdata()); q=[]
        for r,g,b,a in p:
            if g>42 and g>r*1.07 and g>b*1.07 and r<165 and b<165:
                q.append((min(255,round(r*1.20+53)),
                          min(255,round(g*1.08+47)),
                          min(255,round(b*1.18+35)),a))
            else:q.append((r,g,b,a))
        out=Image.new("RGBA",rgba.size);out.putdata(q)
        return out
    raise ValueError(mode)

def finish(path):
    raw=path.read_bytes()
    assert raw[:4]==b"glTF" and struct.unpack_from("<I",raw,8)[0]==len(raw)
    json_len,json_kind=struct.unpack_from("<I4s",raw,12); assert json_kind==b"JSON"
    doc=json.loads(raw[20:20+json_len])
    off=20+json_len
    binary_len,binary_kind=struct.unpack_from("<I4s",raw,off)
    assert binary_kind==b"BIN\x00"
    dat=bytearray(raw[off+8:off+8+binary_len])
    assert len(dat)==binary_len
    materials={mat.get("name"):mat for mat in doc["materials"]}
    assert "Hair" in materials and "Eyes" in materials and "Skin" in materials

    color_hash={}
    for material_name,mode in (("Hair","hair"),("Eyes","eyes")):
        mat=materials[material_name]
        tex_id=mat["pbrMetallicRoughness"]["baseColorTexture"]["index"]
        tex=doc["textures"][tex_id]
        assert "source" in tex
        im=doc["images"][tex["source"]]
        bv=doc["bufferViews"][im["bufferView"]]
        payload=bytes(dat[bv.get("byteOffset",0):bv.get("byteOffset",0)+bv["byteLength"]])
        pic=decorate_image(Image.open(BytesIO(payload)), mode)
        output=BytesIO();pic.save(output,format="PNG",compress_level=5)
        blob=output.getvalue()
        while len(dat)%4:dat.append(0)
        newview=len(doc["bufferViews"])
        doc["bufferViews"].append({"buffer":0,"byteOffset":len(dat),"byteLength":len(blob)})
        dat.extend(blob)
        im["bufferView"]=newview
        im["mimeType"]="image/png"
        color_hash[mode]=hashlib.sha256(blob).hexdigest()
        if mode=="hair":
            mat["pbrMetallicRoughness"]["baseColorFactor"]=[1,1,1,1]
    # All geometry and joints under ONE extra scene-root node, so scale
    # never distorts skinning. No base faces or mesh vertices are cut.
    skin_primitive=next(pr for mesh in doc["meshes"]
        for pr in mesh.get("primitives",[])
        if doc["materials"][pr["material"]]["name"]=="Skin")
    pp=accessor(doc,dat,skin_primitive["attributes"]["POSITION"])
    height=max(v[1] for v in pp)-min(v[1] for v in pp)
    assert 1.0<height<1.6,("Unexpected unscaled height",height)
    k=TARGET_METERS/height
    scene=doc["scenes"][doc.get("scene",0)]
    roots=list(scene["nodes"])
    assert len(roots)==2 and not any("WVLRP" in doc["nodes"][i].get("name","") for i in roots)
    new_root=len(doc["nodes"])
    doc["nodes"].append({"name":"WVLRP Age Seven 1.22m root", "scale":[k,k,k],"children":roots})
    scene["nodes"]=[new_root]
    doc["buffers"][0]["byteLength"]=len(dat)
    doc.setdefault("extras",{})["wvlrpAgeYears"]=7
    doc["extras"]["wvlrpScaledBodyHeightMeters"]=TARGET_METERS
    doc["extras"]["wvlrpDesign"]="age-appropriate full-base-mesh child, no nudity"
    dat=bytearray(chunk4(bytes(dat),b"\x00"))
    doc["buffers"][0]["byteLength"]=len(dat)
    j=chunk4(json.dumps(doc,separators=(",",":")).encode(),b" ")
    assert len(j)%4==0 and len(dat)%4==0
    packed=(b"glTF"+struct.pack("<II",2,12+8+len(j)+8+len(dat))+
            struct.pack("<I4s",len(j),b"JSON")+j+
            struct.pack("<I4s",len(dat),b"BIN\x00")+dat)
    path.write_bytes(packed)
    return {"raw_body_height_m":round(height,5),"root_scale":round(k,7),
            "final_body_height_m":round(k*height,5),"hair_png_sha256":color_hash["hair"],
            "iris_png_sha256":color_hash["eyes"],"bytes":len(packed)}

def main():
    report={}
    for name in NAMES:
        conf=json.loads((BASE/(name+".params.json")).read_text())
        assert conf["age"]==EXPECTED_AGE and conf["gender"]==0
        assert conf["top"]!="none" and conf["underwear"]
        report[name]=finish(BASE/"out"/(name+".glb"))
    (BASE/"AGE7_FINISH_REPORT.json").write_text(json.dumps(report,indent=2)+"\n")
    print("WVLRP_AGE_SEVEN_TEXTURE_AND_HEIGHT_FINISH_SUCCESS")
    print(json.dumps(report,indent=2))
if __name__=="__main__":main()
