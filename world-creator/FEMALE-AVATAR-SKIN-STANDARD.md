# The Wild — Reusable female-avatar skin standard

Saved 2026-10-11. This document captures the **working source configuration** used for Caitlyn's improved skin and the shared reusable MPFB texture workflow. It is for **future avatar creators**, not a request to change the appearance of existing characters.

## Caitlyn skin-source reference (specific; reproducible)
- CC0 MakeHuman system assets pack: `https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip`
- MakeHuman / MPFB skin definition: `young_caucasian_female.mhmat` from the pack's `skins` directory; material applied with `HumanService.set_character_skin(skin, human, skin_type="GAMEENGINE")`.
- Source builder example: `world-creator/scripts/build_caitlyn_mpfb.py`.
- Shared skin helper for **Caitlyn, Amy, Chrissy, and new MPFB models**: `world-creator/scripts/face_materials.py` → `preserve_photo_skin(export_body, character_name)`.
- This saves the exact **skin source ID and reconstruction pipeline**. The skin image is not independently checked into the repo as a new PNG; the builder downloads the official CC0 asset pack when building.

## PBR / texture appearance settings in the shared helper
- Preserve the **genuine original UV diffuse/photo skin texture** mapped directly to the Principled BSDF **Base Color** input, in sRGB; do not replace with a flat RGB swatch or a vertex-color-only shader.
- Keep the same base skin shader/UV source on the **face, neck, and body**, so they share believable skin color and have properly detailed lips, cheeks, nose, eyelids and shading.
- Principled baseColor default = `(1.0, 1.0, 1.0, 1.0)` **with the source diffuse image connected** (white is a neutral multiplier, not the complexion itself).
- Metallic `0.0`; Roughness `0.67`; Subsurface Weight `0.075` where supported.
- Alpha `1.0`; no accidental transparent skin; texture interpolation `Linear`.
- Smooth shaded polygons; do not change the body mesh, rig, anatomical proportions, skin UV map, or animation clips just to fix appearance.

## Export quality gate
- Require valid noncollapsed body `uv_layers` before preserving the skin material.
- Exported GLB must include a body skin material named like `<Name> real CC0 face and body skin UV ...` with glTF `pbrMetallicRoughness.baseColorTexture`.
- Require `images`, `textures` and mesh attribute `TEXCOORD_0` linked to that textured skin material.
- Use `verify_photo_skin_glb(glb_json, character_name)` after export. Reject silent fallback to uniform face paint.
- Visually inspect front/side/back; particularly **face-neck seam**, lighting, eye/lip color, photo UV alignment and full-body consistency. A passing binary structure test is **not proof of a correct appearance**.
- Preserve user-approved character body shape and distinguishing features; skin standard must never overwrite appearance-specific settings.

## Future girls / variation
This is **Caitlyn's exact reproducible complexion starting point**, not the only skin tone permitted for future women. Future avatars may use different MakeHuman licensed skin definitions and complexions, but must follow the **same UV photo texture/PBR/continuity checks**. The approved Caitlyn body, specific character likeness, platinum hair and eye color are separate character presets; do **not** impose those on every new female avatar.

## Status
This document records the source material and shared helper already committed. Final live GLB/model QA is separate; don't claim an updated published model until the relevant build completes and the visual result is inspected.
