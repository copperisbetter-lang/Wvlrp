#!/usr/bin/env python3
"""Create a separate 0.9144 m Gina clone using only a parent glTF transform.
Preserves original source GLB unchanged; geometry, skin, materials, animations and
binary chunk untouched. Fails closed if scale/structure cannot be verified.
"""
import hashlib, itertools, json, math, pathlib, struct

HOME=pathlib.Path(__file__).resolve().parent
SRC=HOME/"Gina_3FT_FITTED_GOLD_BIKINI_original_copy.glb"
DST=HOME/"Gina_3FT_FITTED_GOLD_BIKINI.glb"
TARGET=0.9144
EXPECTED_SHA256="7c3738d2ccd7cab26a610e53a02a3e0b727039214ecc21ffc80ad4ca5fe53505"

def multiply(a,b):
    return [sum(a[k*4+r]*b[c*4+k] for k in range(4)) for c in range(4) for r in range(4)]
I=[1.,0,0,0, 0,1.,0,0, 0,0,1.,0, 0,0,0,1.]
def mat(node):
    if "matrix" in node:
        return [float(v) for v in node["matrix"]]
    x,y,z,w=node.get("rotation",[0,0,0,1])
    sx,sy,sz=node.get("scale",[1,1,1])
    tx,ty,tz=node.get("translation",[0,0,0])
    return [
      (1-2*(y*y+z*z))*sx,(2*(x*y+z*w))*sx,(2*(x*z-y*w))*sx,0,
      (2*(x*y-z*w))*sy,(1-2*(x*x+z*z))*sy,(2*(y*z+x*w))*sy,0,
      (2*(x*z+y*w))*sz,(2*(y*z-x*w))*sz,(1-2*(x*x+y*y))*sz,0,
      tx,ty,tz,1]
def transform(m,point):
    p=[*point,1.0]
    return [sum(m[c*4+r]*p[c] for c in range(4)) for r in range(3)]
def read_glb(path):
    blob=path.read_bytes()
    if hashlib.sha256(blob).hexdigest()!=EXPECTED_SHA256:
        raise ValueError("Original source SHA256 mismatch")
    magic,version,size=struct.unpack_from("<4sII",blob,0)
    if magic!=b"glTF" or version!=2 or size!=len(blob):
        raise ValueError("Invalid glTF 2 GLB container")
    chunks=[]; offset=12
    while offset<len(blob):
        ln,kind=struct.unpack_from("<II",blob,offset);offset+=8
        chunks.append((kind,blob[offset:offset+ln]));offset+=ln
    if offset!=len(blob) or not chunks or chunks[0][0]!=0x4e4f534a:
        raise ValueError("Missing/invalid GLB JSON chunk")
    return json.loads(chunks[0][1]),chunks

g,chunks=read_glb(SRC)
if len(g.get("animations",[]))!=77 or not any(len(s.get("joints",[]))==69 for s in g.get("skins",[])):
    raise ValueError("Unexpected source rig/animation count")
default=g.get("scene",0)
roots=list(g["scenes"][default]["nodes"])
minima=[float("inf")]*3;maxima=[float("-inf")]*3
seen=0
def visit(index,parent,depth=0):
    global seen
    if depth>200: raise ValueError("Excessive scene hierarchy depth")
    node=g["nodes"][index]
    m=multiply(parent,mat(node))
    if "mesh" in node:
        for prim in g["meshes"][node["mesh"]]["primitives"]:
            idx=prim.get("attributes",{}).get("POSITION")
            if idx is None: continue
            acc=g["accessors"][idx]
            if "min" not in acc or "max" not in acc:
                raise ValueError("POSITION min/max not available: cannot verify height")
            lo,hi=acc["min"],acc["max"]
            for pt in itertools.product(*[(lo[i],hi[i]) for i in range(3)]):
                v=transform(m,pt)
                for axis in range(3):
                    minima[axis]=min(minima[axis],v[axis])
                    maxima[axis]=max(maxima[axis],v[axis])
            seen+=1
    for child in node.get("children",[]):
        visit(child,m,depth+1)
for r in roots:
    visit(r,I)
height=maxima[1]-minima[1]
if seen==0 or not 0.3<height<4.0:
    raise ValueError("Source physical height cannot be confidently measured: "+str(height))
factor=TARGET/height
root=len(g["nodes"])
g["nodes"].append({"name":"GINA_3FT_BIKINI_UNIFORM_SCALE","children":roots,
                   "scale":[factor]*3,"translation":[0,-minima[1]*factor,0],
                   "extras":{"source_height_m":height,"target_height_m":TARGET,
                             "source_sha256":EXPECTED_SHA256}})
g["scenes"][default]["nodes"]=[root]
g["asset"].setdefault("extras",{})["gina_clone"]={
    "target_height_m":TARGET,"source_height_m":height,
    "uniform_scale":factor,"original_glb_sha256":EXPECTED_SHA256,
    "source_rig_joints":69,"source_animation_count":77,
    "notes":"Scale above mesh and 69-joint skeleton; original BIN chunk unmodified"}
json_chunk=json.dumps(g,separators=(",",":"),ensure_ascii=False).encode("utf8")
json_chunk+=b" "*((-len(json_chunk))%4)
parts=[(0x4e4f534a,json_chunk)]+chunks[1:]
total=12+sum(8+len(chunk) for _,chunk in parts)
out=bytearray(struct.pack("<4sII",b"glTF",2,total))
for kind,chunk in parts:
    out+=struct.pack("<II",len(chunk),kind)+chunk
DST.write_bytes(out)
check=DST.read_bytes()
assert struct.unpack_from("<I",check,8)[0]==len(check)
assert TARGET-1e-8 < height*factor < TARGET+1e-8
assert g["nodes"][root]["children"]==roots
print(json.dumps({"original_height_m":height,"target_height_m":TARGET,"scale":factor,
 "output_bytes":len(check),"output_sha256":hashlib.sha256(check).hexdigest(),
 "original_bin_preserved":chunks[1:]==parts[1:],"animations":len(g["animations"]),
 "rig_joints":max(len(s["joints"]) for s in g["skins"])}))
