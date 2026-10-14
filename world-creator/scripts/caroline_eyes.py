"""Restore Carolyn's natural blue irises on the ORIGINAL MPFB eyeballs.

Do NOT attach separate blue iris discs. Those overlays left a second visible
brown pupil/iris underneath in the live mobile close-up. MakeHuman's CC0
lightblue_eye.png uses the stock eye's UV coordinates.
"""
from pathlib import Path
import bpy


def add_light_blue_eyes(export_root, body, rig):
    from bl_ext.wvlrp_local.mpfb.services.locationservice import LocationService

    assets = Path(LocationService.get_user_data()) / "eyes"
    textures = list(assets.rglob("lightblue_eye.png"))
    if not textures:
        raise RuntimeError(
            "Carolyn: CC0 lightblue_eye.png unavailable; refusing artificial overlay eyes")
    image = bpy.data.images.load(str(textures[0]), check_existing=True)
    if min(image.size) < 512:
        raise RuntimeError("Carolyn: original blue-eye texture resolution too low")
    image.colorspace_settings.name = "sRGB"
    image.pack()

    members = [export_root] + list(export_root.children_recursive)
    # Do not recolor lashes, eyebrows, eyelids, hair or the body.
    eyeballs = [o for o in members if o.type == "MESH" and o != body
                and ("high-poly" in o.name.lower() or
                     ("eye" in o.name.lower() and not any(
                          w in o.name.lower() for w in (
                              "eyebrow", "eyelash", "eyelid", "iris", "hair"))))]
    if not eyeballs:
        raise RuntimeError("Carolyn: original MakeHuman eyeballs missing")
    material_count = 0
    for obj in eyeballs:
        if not obj.data.uv_layers:
            raise RuntimeError("Carolyn: original eyes lack UV: " + obj.name)
        # ExportService makes an inspection copy; preserve the editable source.
        obj.data = obj.data.copy()
        if not obj.data.materials:
            raise RuntimeError("Carolyn: original eyeball mesh has no material")
        for idx, original in enumerate(list(obj.data.materials)):
            if original is None:
                continue
            # Preserve transparent cornea/highlight materials if separate.
            if any(part in original.name.lower() for part in
                   ("cornea", "tear", "glass", "highlight")):
                continue
            mat = original.copy()
            mat.name = "Caroline light blue iris original UV " + str(material_count)
            mat.use_nodes = True
            nodes = mat.node_tree.nodes
            links = mat.node_tree.links
            shader = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
            if shader is None:
                raise RuntimeError("Carolyn: eye shader is not Principled BSDF")
            # Reuse existing eye UV texture coordinates; use a diffuse image,
            # not a new object or a solid blue patch over her brown iris.
            existing = next((l.from_node for l in
                             shader.inputs["Base Color"].links
                             if l.from_node.type == "TEX_IMAGE"), None)
            tex = existing or nodes.new("ShaderNodeTexImage")
            tex.image = image
            tex.interpolation = "Linear"
            for l in list(shader.inputs["Base Color"].links):
                links.remove(l)
            links.new(tex.outputs["Color"], shader.inputs["Base Color"])
            shader.inputs["Base Color"].default_value = (1., 1., 1., 1.)
            mat.diffuse_color = (1., 1., 1., 1.)
            obj.data.materials[idx] = mat
            material_count += 1
        obj.name = "Caroline light blue eyes original MPFB UV " + obj.name
    if material_count < 1:
        raise RuntimeError("Carolyn: no original eyeball diffuse material recolored")
    print("WVLRP_CAROLINE_LIGHT_BLUE_IRISES",
          "real_eyeballs", len(eyeballs),
          "original_uv_materials", material_count,
          "overlay_iris_geometry", 0,
          "texture", textures[0].name)
