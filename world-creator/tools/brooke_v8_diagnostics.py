"""Read-only Brooke v8 recovery diagnostics; preserves all source GLB bytes."""
import json
from pathlib import Path
import numpy as np
from pygltflib import GLTF2

SOURCE = Path("world-creator/assets/brooke-neutral-refinement7.glb")
OUT = Path("brooke-v8-diagnostics.json")
report = {"source": str(SOURCE), "source_exists": SOURCE.exists(), "meshes": [], "errors": []}
try:
    gltf = GLTF2().load_binary(str(SOURCE))
    binary = gltf.binary_blob()
    dtypes = {5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
    counts = {5126:4,5125:4,5123:2,5121:1,5122:2,5120:1}
    ncomp = {"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4}
    def values(i):
        a=gltf.accessors[i]; view=gltf.bufferViews[a.bufferView]
        dt=np.dtype(dtypes[a.componentType]).newbyteorder("<")
        comps=ncomp[a.type]; stride=view.byteStride or dt.itemsize*comps
        off=(view.byteOffset or 0)+(a.byteOffset or 0)
        return np.ndarray((a.count,comps),dtype=dt,buffer=binary,offset=off,strides=(stride,dt.itemsize)).copy()
    for mi,mesh in enumerate(gltf.meshes):
        for pi,prim in enumerate(mesh.primitives):
            row={"mesh":mi,"name":mesh.name,"primitive":pi,"targets":len(prim.targets or []),"skin_attributes":bool(getattr(prim.attributes,"JOINTS_0",None) is not None)}
            try:
                pos=values(prim.attributes.POSITION)
                row.update(vertices=len(pos),minimum=pos.min(axis=0).tolist(),maximum=pos.max(axis=0).tolist())
                if prim.indices is not None:
                    idx=values(prim.indices).reshape(-1)
                    row["triangles"]=len(idx)//3
                    row["indices_in_range"]=bool((idx<len(pos)).all())
                row["finite_positions"]=bool(np.isfinite(pos).all())
            except Exception as exc: row["error"]=str(exc);report["errors"].append(str(exc))
            report["meshes"].append(row)
    report["skins"]=len(gltf.skins);report["animations"]=len(gltf.animations)
except Exception as exc:
    report["errors"].append(repr(exc))
OUT.write_text(json.dumps(report,indent=2))
print(OUT.read_text()[:12000])
if report["errors"]: raise SystemExit(1)
