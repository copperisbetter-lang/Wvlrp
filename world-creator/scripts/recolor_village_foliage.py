"""Recolor broadleaf foliage albedo only, preserving bark and geometry."""
import json
import re
from pathlib import Path
from PIL import Image

PALETTES = {
    "island_tree_01": (49, 118, 49),  # dark summer green
    "island_tree_02": (66, 135, 52),  # medium summer green
    "island_tree_03": (85, 142, 59),  # sunlit yellow-green
}

def recolor(root: Path):
    changed = 0
    for tree_name, green in PALETTES.items():
        path = root / tree_name / (tree_name + "_1k.gltf")
        if not path.exists():
            print("Broadleaf source unavailable:", tree_name, flush=True)
            continue
        doc = json.loads(path.read_text())
        found = 0
        seen = {}
        for material in doc.get("materials", []):
            info = material.get("pbrMetallicRoughness", {}).get("baseColorTexture")
            if not info:
                continue
            texture = doc["textures"][info["index"]]
            image_index = texture.get("source")
            if image_index is None:
                continue
            uri = doc["images"][image_index].get("uri", "")
            label = (material.get("name", "") + " " + uri).lower()
            is_foliage = bool(re.search(r"leaf|leaves|foliage|canopy", label))
            is_cutout = material.get("alphaMode") in ("MASK", "BLEND")
            if not (is_foliage or is_cutout):
                continue
            if any(word in label for word in ("bark_diff", "trunk_diff")):
                continue
            if image_index in seen:
                info["index"] = seen[image_index]
                found += 1
                continue
            if not uri or uri.startswith("data:"):
                print("Cannot recolor embedded leaf image:", label, flush=True)
                continue
            source = path.parent / uri
            if not source.is_file():
                print("Missing leaf image:", source, flush=True)
                continue
            photo = Image.open(source).convert("RGBA")
            result = []
            for r, g, b, alpha in photo.getdata():
                if alpha == 0:
                    result.append((r, g, b, alpha))
                    continue
                luminance = (0.25 * r + 0.66 * g + 0.09 * b) / 255
                factor = 0.43 + 1.18 * luminance
                variation = (r - g) / 255
                result.append((
                    round(max(0, min(255, green[0] * factor * (1 + .08 * variation)))),
                    round(max(0, min(255, green[1] * factor))),
                    round(max(0, min(255, green[2] * factor * (1 - .08 * variation)))),
                    alpha,
                ))
            new_image = source.with_name(f"wvlrp-green-{tree_name}-{image_index}.png")
            photo.putdata(result)
            photo.save(new_image, optimize=True)
            img_id = len(doc["images"])
            doc["images"].append({"uri": str(new_image.relative_to(path.parent)), "mimeType": "image/png"})
            tex_id = len(doc["textures"])
            doc["textures"].append({**texture, "source": img_id})
            info["index"] = tex_id
            seen[image_index] = tex_id
            found += 1
            print("Corrected broadleaf foliage:", tree_name, material.get("name", "(unnamed)"), flush=True)
        if found == 0:
            raise RuntimeError(f"No leaf materials identified for {tree_name}; refused to recolor bark")
        path.write_text(json.dumps(doc, separators=(",", ":")))
        changed += 1
    if not changed:
        raise RuntimeError("No broadleaf assets found for recoloring")
    print(f"Prepared summer green foliage for {changed} independent models", flush=True)

if __name__ == "__main__":
    recolor(Path("/tmp/wvlrp-pbr-grove"))
