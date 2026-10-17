#!/usr/bin/env python3
"""Inspect original maple GLB without modifying it. Print scene hierarchy and mesh bounds."""
import json,struct,pathlib,collections
p=pathlib.Path("world-creator/assets/maple_trees_optimized_single_upload.glb")
with p.open("rb") as f:
    header=f.read(12)
    magic,version,length=struct.unpack("<4sII",header)
    if magic!=b"glTF": raise ValueError("Not a GLB")
    n,kind=struct.unpack("<I4s",f.read(8))
    if kind!=b"JSON": raise ValueError("Missing GLB JSON")
    doc=json.loads(f.read(n))
nodes=doc.get("nodes",[]);meshes=doc.get("meshes",[]);accessors=doc.get("accessors",[])
parents={}
for i,node in enumerate(nodes):
    for child in node.get("children",[]):parents[child]=i
print("GLB_BYTES",length,"NODES",len(nodes),"MESHES",len(meshes),"SCENES",len(doc.get("scenes",[])))
for i,node in enumerate(nodes):
    if "mesh" not in node:continue
    m=meshes[node["mesh"]]; bounds=[]
    for prim in m.get("primitives",[]):
        idx=prim.get("attributes",{}).get("POSITION")
        if idx is None:continue
        a=accessors[idx]
        bounds.append({"min":a.get("min"),"max":a.get("max")})
    ancestry=[];cur=i
    while cur in parents:
        cur=parents[cur];ancestry.append(nodes[cur].get("name",str(cur)))
    print(json.dumps({"node":i,"name":node.get("name"),"mesh":m.get("name"),"parent_chain":ancestry,"translation":node.get("translation"),"rotation":node.get("rotation"),"scale":node.get("scale"),"bounds_local":bounds},separators=(",",":")))
