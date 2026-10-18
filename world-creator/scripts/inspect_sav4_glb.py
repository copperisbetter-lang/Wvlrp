"""Inspect SAV4 GLB geometry and materials without Blender or MPFB."""
import json,struct,pathlib
p=pathlib.Path(__file__).resolve().parents[1]/"assets/sav4-realistic.glb"
b=p.read_bytes()
assert b[:4]==b'glTF', "Invalid GLB"
n=struct.unpack_from("<I",b,12)[0]
d=json.loads(b[20:20+n])
print("SAV4 GLB",len(b),"bytes")
for i,node in enumerate(d.get("nodes",[])):
 if "mesh" in node:
  mesh=d["meshes"][node["mesh"]]
  print("NODE",i,node.get("name"),"MESH",mesh.get("name"))
  for prim in mesh.get("primitives",[]):
   idx=prim.get("material")
   print("  MATERIAL",d["materials"][idx].get("name") if idx is not None else None,"UV", "TEXCOORD_0" in prim.get("attributes",{}))
print("IMAGES",[x.get("name") for x in d.get("images",[])])
