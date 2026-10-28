"""Detach Amanda 1.0's prior Flat V1 component, preserving body and 52-bone rig.

This script runs ONLY on the isolated Amanda branch. The old installed GLB is
backed up byte-for-byte before editing; three purchased Flat masters are never
accessed or changed. The body aperture intentionally remains untouched for the
owner's pending numbered selection.
"""
import bpy, json, shutil, sys
from pathlib import Path

root = Path.cwd()
assets = root / "world-creator" / "assets"
src = assets / "amanda-1-0-base.glb"
backup = assets / "amanda-1-0-with-flat-v1-backup.glb"
tmp = assets / "amanda-1-0-clean.tmp.glb"
report_path = assets / "amanda-1-0-detach-report.json"

if not src.is_file():
    raise RuntimeError(f"Amanda GLB not found: {src}")
if not backup.exists():
    shutil.copy2(src, backup)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src))
sc = bpy.context.scene
meshes_before = [o for o in sc.objects if o.type == "MESH"]
rigs_before = [o for o in sc.objects if o.type == "ARMATURE"]
if not rigs_before:
    raise RuntimeError("Stop: original Amanda armature not found")
body = next((o for o in meshes_before if "SAV 4 adult petite" in o.name), None)
if body is None:
    body = max((o for o in meshes_before if len(o.vertex_groups) >= 20), key=lambda o: len(o.data.vertices))
if len(body.data.vertices) < 5000:
    raise RuntimeError("Stop: full character body appears missing")
body_name = body.name
body_vertices = len(body.data.vertices)
rig_count = len(rigs_before)
def is_prior_flat(o):
    if o.type != "MESH" or o.name == body_name:
        return False
    label = (o.name + " " + o.data.name).lower()
    return ("flat v1" in label or "pubis and perinium" in label
            or "vulva2 mhx2 true auto-fit" in label)
remove = [o for o in meshes_before if is_prior_flat(o)]
if not remove:
    raise RuntimeError("Stop: prior fitted Flat V1 mesh not identified; refusing blind changes")
removed = [{"object":o.name,"vertices":len(o.data.vertices)} for o in remove]
for o in remove:
    bpy.data.objects.remove(o, do_unlink=True)
remaining = [o for o in sc.objects if o.type == "MESH"]
if len(remaining) < 2 or not any(o.name == body_name for o in remaining):
    raise RuntimeError("Stop: character body lost during detach")
for o in sc.objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = next(o for o in sc.objects if o.type == "MESH")
bpy.ops.export_scene.gltf(
    filepath=str(tmp), export_format="GLB", use_selection=True,
    export_apply=True, export_animations=False, export_skins=True,
    export_yup=True)
if tmp.stat().st_size < 1_000_000:
    raise RuntimeError("Stop: cleaned GLB unexpectedly small")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(tmp))
after_meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
after_rigs = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
if len(after_rigs) < rig_count:
    raise RuntimeError("Stop: armature lost on export")
if not any(len(o.data.vertices) >= body_vertices*.95 for o in after_meshes):
    raise RuntimeError("Stop: body lost on export")
if any(is_prior_flat(o) for o in after_meshes):
    raise RuntimeError("Stop: prior Flat object still present on export")
report = {
    "character":"Amanda 1.0",
    "operation":"detach previous Flat V1 for Flat 01/02/03 selection",
    "old_source_backup":backup.name,
    "detached_meshes":removed,
    "original_armature_count":rig_count,
    "export_armature_count":len(after_rigs),
    "body_vertex_count_before":body_vertices,
    "body_vertex_count_after_max":max(len(o.data.vertices) for o in after_meshes),
    "body_aperture":"unaltered; existing opening retained for future fit",
    "new_flat_installed":False,
    "new_export_bytes":tmp.stat().st_size,
    "status":"reimport verified, Flat V1 detached, rig/body preserved"
}
tmp.replace(src)
report_path.write_text(json.dumps(report,indent=2)+"\n")
print("AMANDA_DETACH_REPORT", json.dumps(report))
