#!/usr/bin/env python3
"""Split verified Acer trees from Ground_Checker_0, retaining GLB binary materials."""
import json,struct,pathlib,copy,sys
src=pathlib.Path("world-creator/assets/maple_trees_optimized_single_upload.glb")
dest=pathlib.Path("world-creator/assets/maple_trees_planting_clean.glb")
data=src.read_bytes()
magic,version,length=struct.unpack_from("<4sII",data,0)
assert magic==b"glTF" and version==2 and length==len(data)
off=12;chunks=[]
while off<len(data):
    size,kind=struct.unpack_from("<I4s",data,off);off+=8
    chunks.append((kind,data[off:off+size]));off+=size
doc=json.loads(next(b for k,b in chunks if k==b"JSON"))
nodes=doc["nodes"];names=[n.get("name","") for n in nodes]
tree_ids=[i for i,n in enumerate(nodes) if n.get("name","").startswith("Acer_") and
    not any(q in n.get("name","") for q in ("LOD","Billboard")) and
    "mesh" not in n and any("LOD0" in nodes[c].get("name","") for c in n.get("children",[]))]
assert len(tree_ids)==12,(len(tree_ids),[names[i] for i in tree_ids])
def subtree(i):
    result={i}
    for c in nodes[i].get("children",[]):result.update(subtree(c))
    return result
def export(roots,path):
    keep=set()
    for root in roots:
        keep.add(root)
        for child in nodes[root].get("children",[]):
            if "LOD0" in names[child]:keep.update(subtree(child))
    # Keep only selected trees. Preserve all original material, accessor,
    # texture and binary indices, so foliage textures remain intact.
    nd=copy.deepcopy(doc)
    index={old:new for new,old in enumerate(sorted(keep))}
    nd["nodes"]=[]
    for old in sorted(keep):
        n=copy.deepcopy(nodes[old])
        if "children" in n:n["children"]=[index[c] for c in n["children"] if c in keep]
        nd["nodes"].append(n)
    nd["scenes"]=[{"nodes":[index[r] for r in roots]}]
    nd["scene"]=0
    nd["animations"]=[]
    j=json.dumps(nd,separators=(",",":")).encode()
    j+=b" "*((-len(j))%4)
    payload=[(b"JSON",j)]+[(k,b) for k,b in chunks if k!=b"JSON"]
    total=12+sum(8+len(b) for _,b in payload)
    with path.open("wb") as f:
        f.write(struct.pack("<4sII",b"glTF",2,total))
        for kind,blob in payload:f.write(struct.pack("<I4s",len(blob),kind));f.write(blob)
    return total
dest.parent.mkdir(parents=True,exist_ok=True)
print("TREES",len(tree_ids),[names[i] for i in tree_ids])
print("REMOVED",[(i,n) for i,n in enumerate(names) if "Ground" in n])
print("CLEAN_COMBINED_BYTES",export(tree_ids,dest))
out=pathlib.Path("maple-individual-assets");out.mkdir(exist_ok=True)
for root in tree_ids:
    print("EXPORTED",names[root],export([root],out/(names[root]+".glb")))
