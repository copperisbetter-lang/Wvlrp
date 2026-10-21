"""List official bundled MPFB face targets without guessing filenames or altering a mesh.
Reference: makehumancommunity/mpfb2/script_samples/09_listing_bundled_targets.py
"""
import json
from pathlib import Path
from bl_ext.wvlrp_local.mpfb.services.locationservice import LocationService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService

root=Path(__file__).resolve().parents[1]
catalog=Path(LocationService.get_mpfb_data("targets"))/"target.json"
if not catalog.is_file():
    raise RuntimeError("MPFB official target catalog missing: "+str(catalog))
data=json.loads(catalog.read_text())
out=root/"characters"/"laura"/"available-official-face-targets.txt"
out.parent.mkdir(parents=True,exist_ok=True)
# Preserve catalog metadata for review, rather than invent target names.
def walk(node, ancestry=()):
    if isinstance(node,dict):
        for k,v in node.items():
            yield from walk(v, ancestry+(str(k),))
    elif isinstance(node,list):
        for i,v in enumerate(node):
            yield from walk(v, ancestry+(str(i),))
    elif isinstance(node,str):
        if any(word in " ".join(ancestry+(node,)).lower() for word in ("face","nose","mouth","lip","eye","cheek","chin","jaw","brow","head")):
            yield " / ".join(ancestry+(node,))
lines=sorted(set(walk(data)))
if not lines: raise RuntimeError("No facial entries found in official MPFB catalog; inspect schema")
out.write_text("\n".join(lines)+"\n")
print("LAURA_OFFICIAL_TARGET_DISCOVERY",len(lines),out)
