"""Strict structural checks for Brooke photo-derived cranium candidate.
Run: blender -b --python validate_photo_head_candidate.py -- face.obj candidate.glb
This does NOT certify likeness, ears, or neck.
"""
import bpy, bmesh, sys
from mathutils import Vector
source, candidate = sys.argv[sys.argv.index('--')+1:][:2]
photo_vertices = []
photo_faces = 0
with open(source, encoding="utf-8", errors="replace") as stream:
    for line in stream:
        if line.startswith("v "):
            photo_vertices.append(Vector(tuple(map(float, line.split()[1:4]))))
        elif line.startswith("f "):
            photo_faces += 1
assert len(photo_vertices) > 1000 and photo_faces > 1000, "Invalid source face"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=candidate)
skins = [o for o in bpy.context.scene.objects if o.type == "MESH"]
assert len(skins) == 1, f"Expected one skin mesh, found {len(skins)}"
obj = skins[0]
bm = bmesh.new()
bm.from_mesh(obj.data)
assert len(bm.verts) >= len(photo_vertices), "Candidate lost source vertices"
assert len(bm.faces) >= photo_faces, "Candidate lost source faces"
bad = [e for e in bm.edges if not e.is_manifold]
assert not bad, f"Open/nonmanifold edges: {len(bad)}"
remaining = set(bm.verts)
components = 0
while remaining:
    components += 1
    stack = [remaining.pop()]
    while stack:
        vertex = stack.pop()
        for edge in vertex.link_edges:
            neighbor = edge.other_vert(vertex)
            if neighbor in remaining:
                remaining.remove(neighbor)
                stack.append(neighbor)
assert components == 1, f"Disconnected skin components: {components}"
# The build normalizes source coordinates by width, then translates by
# (-cx,-cy,-rear) before scaling. Verify the original face survives GLB.
xs = [v.x for v in photo_vertices]
ys = [v.y for v in photo_vertices]
zs = [v.z for v in photo_vertices]
width = max(xs) - min(xs)
cx = (max(xs) + min(xs)) / 2
cy = (max(ys) + min(ys)) / 2
rear = min(zs)
expected = [Vector(((v.x-cx)/width, (v.y-cy)/width, (v.z-rear)/width))
            for v in photo_vertices]
# Compare world-space GLB vertices: importer can retain object transforms.
actual = [obj.matrix_world @ v.co for v in bm.verts]
# Compare rounded coordinates, tolerating normal GLB float quantization.
keys = {tuple(round(float(c), 4) for c in v) for v in actual}
missing = sum(tuple(round(float(c), 4) for c in v) not in keys for v in expected)
assert missing == 0, f"Photo-derived vertices missing/altered: {missing}"
bm.free()
print("PASS: watertight connected candidate; original photo face vertices retained")
print("NOT CERTIFIED: photographic likeness, anatomical ears, neck, rigging")
