#!/usr/bin/env python3
"""Real independent quad-grid shrinkwrap over WVLRP public Scan 04.

Uses original STL only as a raycast target. Does NOT alter source data or guess
missing anatomy. Exports editable OBJ quads + triangulated GLB.
"""
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import trimesh
import vtk
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from vtk.util.numpy_support import numpy_to_vtk, numpy_to_vtkIdTypeArray

EXPECTED_SOURCE_SHA = "e24963547d58dcb48495aa77e19ec26f494d4a10099fe2f4ebd629aacf7930e1"
STEP = 1.0
MAX_GRID_JUMP = 9.0


def build(src, out):
    t0 = time.monotonic()
    src, out = Path(src), Path(out)
    out.mkdir(parents=True, exist_ok=True)
    sha = hashlib.sha256(src.read_bytes()).hexdigest()
    if sha != EXPECTED_SOURCE_SHA:
        raise RuntimeError("Incorrect Scan 04 source STL SHA256: " + sha)

    original = trimesh.load_mesh(src, process=False)
    xyz = np.asarray(original.vertices, dtype=np.float64)
    face = np.asarray(original.faces, dtype=np.int64)
    if len(face) != 51893:
        raise RuntimeError("Wrong original triangle count")
    sample = xyz[::7]
    center = sample.mean(axis=0)
    _, eig = np.linalg.eigh(np.cov((sample-center).T))
    normal, up, right = eig[:, 0], eig[:, 1], eig[:, 2]
    source_n = np.cross(xyz[face[:, 1]]-xyz[face[:, 0]],
                        xyz[face[:, 2]]-xyz[face[:, 0]])
    source_n /= np.maximum(np.linalg.norm(source_n, axis=1)[:, None], 1e-12)
    if np.mean(source_n @ normal) < 0:
        normal = -normal
    if np.dot(np.cross(right, up), normal) < 0:
        right = -right

    projected = (xyz-center) @ np.column_stack((right, up, normal))
    lo, hi = projected.min(axis=0), projected.max(axis=0)
    us = np.arange(lo[0]-STEP/2, hi[0]+STEP, STEP)
    vs = np.arange(lo[1]-STEP/2, hi[1]+STEP, STEP)
    w, h = len(us), len(vs)

    points = vtk.vtkPoints()
    points.SetData(numpy_to_vtk(xyz, deep=True))
    surface = vtk.vtkPolyData()
    surface.SetPoints(points)
    original_indices = np.column_stack(
        (np.full(len(face), 3), face)).astype(np.int64).ravel()
    cells = vtk.vtkCellArray()
    cells.SetCells(len(face), numpy_to_vtkIdTypeArray(original_indices, deep=True))
    surface.SetPolys(cells)
    locator = vtk.vtkStaticCellLocator()
    locator.SetDataSet(surface)
    locator.BuildLocator()

    fitted = np.full((h, w, 3), np.nan, dtype=np.float64)
    height = np.full((h, w), np.nan, dtype=np.float64)
    crossing_t = vtk.mutable(0.)
    x = [0., 0., 0.]
    pcoords = [0., 0., 0.]
    subid = vtk.mutable(0)
    cellid = vtk.mutable(0)
    distance = max(160., (hi[2]-lo[2])*3)
    for iy, v in enumerate(vs):
        for ix, u in enumerate(us):
            base = center + u*right + v*up
            start = base + normal*(hi[2]+distance)
            finish = base + normal*(lo[2]-distance)
            ok = locator.IntersectWithLine(
                start.tolist(), finish.tolist(), 1e-8,
                crossing_t, x, pcoords, subid, cellid)
            if ok:
                fitted[iy, ix] = x
                height[iy, ix] = (np.asarray(x)-center) @ normal

    valid = np.isfinite(height)
    lookup = -np.ones((h, w), dtype=np.int64)
    lookup[valid] = np.arange(int(valid.sum()))
    v_all = fitted[valid]
    quads = []
    for iy in range(h-1):
        for ix in range(w-1):
            if not np.all(valid[iy:iy+2, ix:ix+2]):
                continue
            corners = [height[iy, ix], height[iy, ix+1],
                       height[iy+1, ix+1], height[iy+1, ix]]
            if max(corners)-min(corners) > MAX_GRID_JUMP:
                continue
            quads.append([lookup[iy, ix], lookup[iy, ix+1],
                          lookup[iy+1, ix+1], lookup[iy+1, ix]])
    quads = np.asarray(quads, dtype=np.int64)
    if len(quads) < 1000:
        raise RuntimeError("Insufficient original surface intersections")

    triangles = np.vstack(
        (quads[:, [0,1,2]], quads[:, [0,2,3]])).reshape(-1, 3)
    # Drop isolated pieces; preserve the largest connected sheet.
    rows = np.concatenate([triangles[:,0],triangles[:,1],triangles[:,1],
                           triangles[:,2],triangles[:,2],triangles[:,0]])
    cols = np.concatenate([triangles[:,1],triangles[:,0],triangles[:,2],
                           triangles[:,1],triangles[:,0],triangles[:,2]])
    adjacency = coo_matrix((np.ones(len(rows), dtype=np.uint8),
                            (rows,cols)), shape=(len(v_all),len(v_all))).tocsr()
    count,labels = connected_components(adjacency, directed=False)
    components = labels[triangles[:,0]]
    selected = np.argmax(np.bincount(components))
    quads = quads[np.all(labels[quads] == selected, axis=1)]
    used = np.unique(quads)
    index = -np.ones(len(v_all), dtype=np.int64)
    index[used] = np.arange(len(used))
    verts = v_all[used]
    quads = index[quads]
    triangles = np.vstack((quads[:,[0,1,2]], quads[:,[0,2,3]]))
    mesh = trimesh.Trimesh(vertices=verts, faces=triangles, process=False)
    if np.mean(mesh.face_normals @ normal) < 0:
        quads = quads[:,::-1]
        triangles = triangles[:,[0,2,1]]
        mesh = trimesh.Trimesh(vertices=verts, faces=triangles, process=False)
    mesh.visual.vertex_colors = np.tile(
        np.array([206,167,150,255],dtype=np.uint8), (len(verts),1))

    # Verify new vertices lie on original triangles. Also check interpolation.
    closest = vtk.vtkStaticCellLocator()
    closest.SetDataSet(surface)
    closest.BuildLocator()
    rng = np.random.default_rng(777)
    vi = rng.choice(len(verts), min(400, len(verts)), replace=False)
    ci = rng.choice(len(triangles), min(1200, len(triangles)), replace=False)
    test_points = np.concatenate((verts[vi],mesh.triangles_center[ci]))
    distances=[]
    cpoint=[0.,0.,0.]
    cid=vtk.mutable(0);sid=vtk.mutable(0);d2=vtk.mutable(0.)
    for pos in test_points:
        closest.FindClosestPoint(pos.tolist(),cpoint,cid,sid,d2)
        distances.append(float(np.sqrt(float(d2))))
    vertex_error=max(distances[:len(vi)])
    face_error=np.percentile(distances[len(vi):],[50,95,100]).tolist()
    if vertex_error > 0.005 or face_error[1] > 0.2 or face_error[2] > 1.0:
        raise RuntimeError("Surface conformity QA failed: " + str((vertex_error,face_error)))

    glb=out/"Scan04_Independent_Shrinkwrap_R01.glb"
    obj=out/"Scan04_Independent_Shrinkwrap_R01_QuadMesh.obj"
    glb.write_bytes(mesh.export(file_type="glb"))
    with obj.open("w") as f:
        f.write("# Independent Scan 04 shrinkwrap, source SHA256 " + sha + "\n")
        for v in verts:
            f.write("v %.7f %.7f %.7f\n" % tuple(v))
        for q in quads:
            f.write("f %d %d %d %d\n" % tuple(q+1))

    reopened=trimesh.load_mesh(glb,process=False)
    if len(reopened.faces)!=len(triangles) or len(reopened.vertices)!=len(verts):
        raise RuntimeError("GLB reimport validation failed")
    report={
      "source_scan":4,"source_file":src.name,"original_sha256":sha,
      "source_triangles":len(face),"independent_vertices":len(verts),
      "independent_quads":len(quads),"independent_triangles":len(triangles),
      "grid_spacing_source_units":STEP,"projected_vertices":int(valid.sum()),
      "vertex_max_distance_to_original":vertex_error,
      "face_centroid_distance_p50_p95_max":face_error,
      "new_mesh_open_surface":not mesh.is_watertight,
      "geometry_method":"independent quad grid ray-shrinkwrapped to actual source triangles",
      "limitation":"visible-side surface, undercuts and hidden reverse geometry not fabricated",
      "face_direction":normal.tolist(),"up":up.tolist(),"right":right.tolist(),
      "center":center.tolist(),"output_glb":glb.name,
      "output_glb_sha256":hashlib.sha256(glb.read_bytes()).hexdigest(),
      "output_quad_obj":obj.name,"duration_seconds":round(time.monotonic()-t0,2)
    }
    (out/"Scan04_Shrinkwrap_R01_QA.json").write_text(json.dumps(report,indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    build(sys.argv[1],sys.argv[2])
