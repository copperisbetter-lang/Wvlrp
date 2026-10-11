"""Preserve MakeHuman's real CC0 UV skin diffuse map in exported WVLRP avatars.

The previous standalone color materials covered the face's lips, eyelids,
brows, nose shading and other photographic features. This utility restores
the original image texture on the existing rigged body -- it does not alter
geometry, proportions, skeletons, animations, or hairstyle.
"""
import bpy

_NON_DIFFUSE = ("normal", "rough", "specular", "metal", "bump", "alpha",
                "opacity", "displace", "height", "mask", "gloss")


def preserve_photo_skin(body, character):
    if not body or body.type != "MESH":
        raise RuntimeError(character + ": missing body mesh")
    if not body.data.uv_layers:
        raise RuntimeError(character + ": model has no UV coordinates for real skin texture")

    uv_layer = body.data.uv_layers.active
    if uv_layer is None or len(uv_layer.data) < 3:
        raise RuntimeError(character + ": body UV coordinates are missing")
    uv0 = uv_layer.data[0].uv
    if all((datum.uv - uv0).length < 0.00001 for datum in
           list(uv_layer.data)[1:min(len(uv_layer.data), 250)]):
        raise RuntimeError(character + ": collapsed UV coordinates; refusing broken skin export")

    kept = 0
    for index, original in enumerate(list(body.data.materials)):
        if not original or not original.use_nodes:
            continue
        shader = original.copy()
        shader.name = character + " real CC0 face and body skin UV " + str(index)
        nodes = shader.node_tree.nodes
        links = shader.node_tree.links
        principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
        if principled is None:
            continue

        choices = []
        for node in nodes:
            if node.type != "TEX_IMAGE" or node.image is None:
                continue
            img = node.image
            label = (img.name + " " + (img.filepath or "") + " " + node.label).lower()
            if any(bad in label for bad in _NON_DIFFUSE):
                continue
            if min(img.size) < 256:
                continue
            # Most reliable choice is the image the stock GameEngine material
            # had already wired into its Base Color shader socket.
            direct = any(link.from_node == node and
                         link.to_node == principled and
                         link.to_socket.name == "Base Color" for link in links)
            score = (100 if direct else 0) + (15 if "diffuse" in label else 0) + (8 if "skin" in label else 0) + min(img.size) / 4096
            choices.append((score, node, img))

        if not choices:
            # Keep specialized non-skin slots intact (if any).
            bpy.data.materials.remove(shader)
            continue

        _, diffuse_node, image = max(choices, key=lambda item: item[0])
        if not image.has_data:
            try:
                image.reload()
            except RuntimeError:
                pass
        if not image.has_data:
            raise RuntimeError(character + ": CC0 diffuse image unavailable: " + image.name)
        image.colorspace_settings.name = "sRGB"
        diffuse_node.interpolation = "Linear"

        # Direct texture -> Principled link survives Blender's glTF export.
        # A solid color or a vertex-color-only shader does not restore facial
        # details, and generated makeup geometry would not fix that problem.
        for link in list(principled.inputs["Base Color"].links):
            links.remove(link)
        links.new(diffuse_node.outputs["Color"], principled.inputs["Base Color"])
        principled.inputs["Base Color"].default_value = (1., 1., 1., 1.)
        principled.inputs["Roughness"].default_value = 0.67
        principled.inputs["Metallic"].default_value = 0.
        if "Subsurface Weight" in principled.inputs:
            principled.inputs["Subsurface Weight"].default_value = 0.075
        if "Alpha" in principled.inputs:
            for link in list(principled.inputs["Alpha"].links):
                links.remove(link)
            principled.inputs["Alpha"].default_value = 1.
        shader.diffuse_color = (1., 1., 1., 1.)
        body.data.materials[index] = shader
        kept += 1
        print("WVLRP_REAL_FACE_TEXTURE", character, "slot", index,
              "image", image.name, "dimensions", tuple(image.size),
              "uv", uv_layer.name)

    if not kept:
        raise RuntimeError(character + ": genuine diffuse texture not found; flat face materials forbidden")
    for poly in body.data.polygons:
        poly.use_smooth = True
    return kept


def verify_photo_skin_glb(meta, character):
    """Reject a GLB whose body skin lost its embedded diffuse map or UV."""
    mats = meta.get("materials", [])
    photo = [(i, mat) for i, mat in enumerate(mats)
             if character + " real CC0 face and body skin UV" in mat.get("name", "")]
    textured_ids = {i for i, m in photo if
                    m.get("pbrMetallicRoughness", {}).get("baseColorTexture", {}).get("index") is not None}
    if not textured_ids or not meta.get("textures") or not meta.get("images"):
        raise RuntimeError(character + ": export lost photographic face/body image")
    if not any(prim.get("material") in textured_ids and
               "TEXCOORD_0" in prim.get("attributes", {})
               for mesh in meta.get("meshes", []) for prim in mesh.get("primitives", [])):
        raise RuntimeError(character + ": textured skin does not have UV data")
    print("WVLRP_REAL_FACE_GLB_VERIFIED", character,
          "textured_skin_materials", len(textured_ids),
          "images", len(meta["images"]))
