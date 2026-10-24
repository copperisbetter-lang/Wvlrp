"""Produce an isolated Brooke v8 GLB, removing only confirmed inward mouth-cap faces.
All source vertex attributes, morphs, skinning and materials are preserved.
"""
from pathlib import Path
import json
import numpy as np
from pygltflib import GLTF2, Accessor, BufferView

SRC=Path("world-creator/assets/brooke-neutral-refinement7.glb")
DST=Path("world-creator/assets/brooke-mouth-repair8.glb")
REPORT=Path("brooke-v8-repair-report.json")
g=GLTF2().load_binary(str(SRC))
blob=bytearray(g.binary_blob())
types={5121:np.uint8,5123:np.uint16,5125:np.uint32,5126:np.float32}
components={"SCALAR":1,"VEC3":3}
def read(index):
    a=g.accessors[index]
    v=g.bufferViews[a.bufferView]
    dt=np.dtype(types[a.componentType]).newbyteorder("<")
    width=components[a.type]
    step=v.byteStride or width*dt.itemsize
    offset=(v.byteOffset or 0)+(a.byteOffset or 0)
    return np.ndarray((a.count,width),dtype=dt,buffer=blob,offset=offset,strides=(step,dt.itemsize)).copy()
report={"source":str(SRC),"candidate":str(DST),"primitives":[],"removed_total":0}
for mi,mesh in enumerate(g.meshes):
    for pi,p in enumerate(mesh.primitives):
        if p.indices is None or p.attributes.POSITION is None:continue
        pos=read(p.attributes.POSITION).astype(np.float64)
        idx=read(p.indices).reshape(-1).astype(np.uint32)
        if len(idx)%3:raise ValueError("non-triangle index buffer")
        tri=idx.reshape(-1,3)
        if not np.all(tri<len(pos)):raise ValueError("invalid indices")
        verts=pos[tri]
        centers=verts.mean(axis=1)
        normal=np.cross(verts[:,1]-verts[:,0],verts[:,2]-verts[:,0])
        normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-12)
        # The lip center in the native Brooke coordinates was measured in the
        # existing viewer. Require inward-facing, interior geometry, never the
        # visible front lip surface. Abort rather than guess if uncertain.
        mouth=(np.abs(centers[:,0])<0.041)&(centers[:,1]>1.468)&(centers[:,1]<1.509)&(centers[:,2]>0.085)&(centers[:,2]<0.154)
        inward=normal[:,2]<-0.22
        selected=mouth&inward
        removed=int(selected.sum())
        report["primitives"].append({"mesh":mi,"primitive":pi,"triangles":len(tri),"inward_mouth_triangles":removed})
        if not removed:continue
        # Never remove a broad surface based on an imprecise spatial guess.
        if removed>200:raise ValueError(f"Unsafe mouth selection: {removed} triangles")
        new=tri[~selected].astype(np.uint32).reshape(-1)
        while len(blob)%4:blob.append(0)
        offset=len(blob)
        blob.extend(new.astype("<u4").tobytes())
        g.bufferViews.append(BufferView(buffer=0,byteOffset=offset,byteLength=new.nbytes,target=34963))
        g.accessors.append(Accessor(bufferView=len(g.bufferViews)-1,byteOffset=0,componentType=5125,count=len(new),type="SCALAR",max=[int(new.max())],min=[int(new.min())]))
        p.indices=len(g.accessors)-1
        report["removed_total"]+=removed
if not 1<=report["removed_total"]<=200:
    REPORT.write_text(json.dumps(report,indent=2))
    raise ValueError(f"No safe targeted repair found: {report['removed_total']} triangles. Refusing to publish unchanged model.")
g.buffers[0].byteLength=len(blob)
g.set_binary_blob(bytes(blob))
DST.parent.mkdir(parents=True,exist_ok=True)
g.save_binary(str(DST))
# Reload to catch serialization mistakes before publishing.
check=GLTF2().load_binary(str(DST))
assert len(check.meshes)==len(g.meshes) and len(check.skins)==len(g.skins)
assert len(check.animations)==len(g.animations)
REPORT.write_text(json.dumps(report,indent=2))
print(REPORT.read_text())
