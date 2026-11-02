#!/usr/bin/env python3
"""Force actual golden-blonde hair image/material in Ara GLB, preserving skin, rig, animations."""
import hashlib, io, json, pathlib, struct, sys
from PIL import Image, ImageOps, ImageStat

source, target, report = map(pathlib.Path, sys.argv[1:4])
blob = source.read_bytes()
assert blob[:4] == b"glTF" and struct.unpack_from("<I", blob, 4)[0] == 2, "Invalid GLB"
total = struct.unpack_from("<I", blob, 8)[0]
assert total == len(blob)
ptr, js, binary = 12, None, None
while ptr < total:
    size, typ = struct.unpack_from("<I4s", blob, ptr)
    payload = blob[ptr+8:ptr+8+size]
    if typ == b"JSON":
        js = json.loads(payload)
    elif typ == b"BIN\x00":
        binary = bytearray(payload)
    ptr += 8 + size
assert js is not None and binary is not None
hair_ids = [i for i,m in enumerate(js.get("materials",[])) if m.get("name","").strip().lower()=="hair"]
assert len(hair_ids)==1, "Need exactly one actual Hair material: "+str(hair_ids)
index=hair_ids[0]
hair=js["materials"][index]
pbr=hair.setdefault("pbrMetallicRoughness",{})
old_factor=pbr.get("baseColorFactor",[1,1,1,1])
old_texture=pbr.get("baseColorTexture",{}).get("index")
hair["doubleSided"]=True
pbr["metallicFactor"]=0.0
pbr["roughnessFactor"]=0.83
hair.setdefault("extras",{})["hairColorQA"]="ACTUAL TEXTURE warm golden blonde; #F6D876 base; no auburn"
recolor_size=0
old_image_info=None
if old_texture is not None:
    tex=js["textures"][old_texture]
    img=js["images"][tex["source"]]
    old_image_info={"name":img.get("name",""),"mime":img.get("mimeType","")}
    if "bufferView" in img:
        view=js["bufferViews"][img["bufferView"]]
        offset=view.get("byteOffset",0)
        raw=bytes(binary[offset:offset+view["byteLength"]])
    elif "uri" in img and img["uri"].startswith("data:"):
        import base64
        raw=base64.b64decode(img["uri"].split(",",1)[1])
    else:
        raise ValueError("Hair texture image not embedded; cannot guarantee blonde color")
    im=Image.open(io.BytesIO(raw)).convert("RGBA")
    alpha=im.getchannel("A")
    gray=ImageOps.grayscale(im)
    avg=ImageStat.Stat(gray,mask=alpha).mean[0] if alpha.getextrema()[1] else ImageStat.Stat(gray).mean[0]
    # Re-pigment every hair-strand pixel while retaining original light/dark relief and alpha.
    # Shadow: ochre blonde, highlight: light golden blonde; never copper or auburn.
    def lut(base):
        return [round(min(255,max(0,base*max(.63,min(1.20, .97+(v-avg)/255.0*1.25))))) for v in range(256)]
    blonde=Image.merge("RGBA",(
        gray.point(lut(246)),
        gray.point(lut(217)),
        gray.point(lut(119)),
        alpha
    ))
    out=io.BytesIO()
    blonde.save(out,format="PNG",optimize=True)
    encoded=out.getvalue()
    while len(binary)%4: binary.append(0)
    start=len(binary)
    binary.extend(encoded)
    new_view=len(js["bufferViews"])
    js["bufferViews"].append({"buffer":0,"byteOffset":start,"byteLength":len(encoded),"name":"Gina4_Blonde_HairPixels"})
    new_img=len(js["images"])
    js["images"].append({"name":"Gina4_TRUE_GoldenBlonde_Texture","mimeType":"image/png","bufferView":new_view})
    new_tex=len(js["textures"])
    nt={"name":"Gina4_GoldenBlonde_Texture","source":new_img}
    if "sampler" in tex:nt["sampler"]=tex["sampler"]
    js["textures"].append(nt)
    pbr["baseColorTexture"]={"index":new_tex}
    pbr["baseColorFactor"]=[1.0,1.0,1.0,1.0]
    recolor_size=len(encoded)
else:
    # No hair-image: neutralize any prior red factor and paint the real material.
    pbr["baseColorFactor"]=[.97,.85,.47,1.0]
    hair["extras"]["noHairColorImage"]=True

# Vertex colors can silently multiply blonde PBR by the old reddish strand color.
vertex_attrs_removed=0
for mesh in js.get("meshes",[]):
    for primitive in mesh.get("primitives",[]):
        if primitive.get("material")==index and "COLOR_0" in primitive.get("attributes",{}):
            primitive["attributes"].pop("COLOR_0")
            vertex_attrs_removed+=1

while len(binary)%4:binary.append(0)
js["buffers"][0]["byteLength"]=len(binary)
js_bytes=json.dumps(js,separators=(",",":"),ensure_ascii=False).encode("utf-8")
js_bytes+=b" "*((-len(js_bytes))%4)
parts=[struct.pack("<I4s",len(js_bytes),b"JSON")+js_bytes,
       struct.pack("<I4s",len(binary),b"BIN\x00")+binary]
result=struct.pack("<4sII",b"glTF",2,12+sum(map(len,parts)))+b"".join(parts)
target.write_bytes(result)
doc=js
qa={
 "name":"Gina 4 Golden Blonde — review build",
 "status":"UNAPPROVED model; actual hair material repigmented after Ara export",
 "model_bytes":len(result),
 "sha256":hashlib.sha256(result).hexdigest(),
 "skins":len(doc.get("skins",[])),
 "animations":len(doc.get("animations",[])),
 "meshes":len(doc.get("meshes",[])),
 "morph_primitives":sum(bool(p.get("targets")) for m in doc.get("meshes",[]) for p in m.get("primitives",[])),
 "hair_material_index":index,
 "old_hair_baseColorFactor":old_factor,
 "old_hair_texture_index":old_texture,
 "old_hair_image":old_image_info,
 "forced_blonde_base_rgb":[246,217,119],
 "hair_image_recolored":recolor_size>0,
 "new_hair_texture_png_bytes":recolor_size,
 "vertex_reddish_tints_removed":vertex_attrs_removed,
 "hair_material":hair,
 "all_material_names":[m.get("name") for m in doc.get("materials",[])],
 "production_unchanged":True
}
assert qa["skins"]>=1 and qa["animations"]>=70 and qa["morph_primitives"]>0
assert qa["hair_image_recolored"] or qa["hair_material"]["pbrMetallicRoughness"]["baseColorFactor"][0]>.9
report.write_text(json.dumps(qa,indent=2)+"\n")
print(json.dumps({k:v for k,v in qa.items() if k not in ("hair_material","all_material_names")},indent=2))
