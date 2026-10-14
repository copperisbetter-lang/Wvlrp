#!/usr/bin/env python3
"""Validate Season 3 character identities, wardrobes, and publishing gates."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
characters = json.loads((HERE / "season3-characters.json").read_text())
wardrobe = json.loads((HERE / "season3-wardrobe.json").read_text())
entries = characters["characters"]
assert len(entries) == 7, "Expected six people and Jack"
ids = [entry["id"] for entry in entries]
assert len(set(ids)) == len(ids), "Duplicate character identity"
assert set(ids) == set(wardrobe["characters"]), "Wardrobe roster mismatch"
for entry in entries:
    outfits = wardrobe["characters"][entry["id"]]
    assert outfits.get("everyday") and outfits.get("sunday"), entry["id"]
    assert all(isinstance(item, str) and item.strip()
               for garments in outfits.values() for item in garments)
    if entry["id"] == "jack-ingalls-dog-s3":
        assert entry["rig"] == "canine-quadruped"
    else:
        assert entry["role"] in ("adult", "child", "young child")
        assert entry.get("qa") == "pending", "Do not mark unverified mesh ready"
assert characters["status"].startswith("character definitions only")
assert wardrobe["status"].startswith("wardrobe definitions")
print("PASS: 7 unique Season 3 characters, 14 outfit sets; no unverified publication")
