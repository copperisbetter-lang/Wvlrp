"""Sav 3 adult avatar mesh validation before game export.
Run in Blender Python after importing the MakeHuman body and genital proxy.
No universal anatomical coordinates: use matching MakeHuman proxy and body topology.
"""
import bpy

BODY = "Sav3_Body"
PROXY = "Sav3_FemaleProxy"
PELVIS = "pelvis"

def validate():
    body = bpy.data.objects.get(BODY)
    proxy = bpy.data.objects.get(PROXY)
    errors = []
    if not body or body.type != "MESH":
        errors.append("Missing Sav3_Body mesh")
    if not proxy or proxy.type != "MESH":
        errors.append("Missing Sav3_FemaleProxy mesh")
    if errors:
        raise ValueError("; ".join(errors))
    for obj in (body, proxy):
        if any(abs(s - 1.0) > 0.001 for s in obj.scale):
            errors.append(f"{obj.name}: unapplied scale")
        if len(obj.data.vertices) == 0:
            errors.append(f"{obj.name}: empty geometry")
    armature = next((m.object for m in body.modifiers if m.type == "ARMATURE"), None)
    if armature is None:
        errors.append("Body missing armature modifier")
    else:
        if PELVIS not in armature.data.bones:
            errors.append("Missing pelvis bone")
        if not any(m.type == "ARMATURE" and m.object == armature for m in proxy.modifiers):
            errors.append("Proxy must share body armature")
    groups = {g.name for g in proxy.vertex_groups}
    if PELVIS not in groups:
        errors.append("Proxy missing pelvis vertex group")
    # Reject old cross-rig errors: all proxy vertices must have usable weights.
    for v in proxy.data.vertices:
        if not v.groups:
            errors.append(f"Proxy vertex {v.index} has no skin weights")
            break
    if errors:
        raise ValueError("\\n".join(errors))
    print("PASS: basic mesh/armature/weight checks. Still visually inspect deformation, seams, and clipping.")
    return True

if __name__ == "__main__":
    validate()
