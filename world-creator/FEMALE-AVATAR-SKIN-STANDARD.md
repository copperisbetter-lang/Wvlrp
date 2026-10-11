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

## Expanded inclusive complexion palette — October 11, 2026
The user wants future women/girls in The Wild to include a wide variety of **medium, tan, golden, olive, brown and deep-brown complexions**, including characters who are Indigenous/Native American, Indian/South Asian and from East/Southeast Asian backgrounds. The full spectrum of complexions and undertones is applicable to characters of **any** background: do not reduce ancestry, culture or facial features to a single skin color or use ethnic labels as complexion presets.

The new `world-creator/skin-tone-presets.json` defines 14 selectable **preview swatches** from very light to very deep, including warm, neutral, cool, olive and golden undertones. It is a **design/preview palette**, not validated photoreal textures and not yet a working control in the 3D avatar creator.

For a production-ready avatar:
1. Choose a matching **properly licensed, UV-compatible photo diffuse skin** with real complexion detail (not simply multiplying Caitlyn's light skin image by a dark flat RGB).
2. Apply the same texture/material workflow to all exposed face, neck, ears, hands, legs and torso. Preserve realistic local pigmentation and detail.
3. Keep the existing PBR pipeline and verify actual glTF texture + UV; visually inspect in consistent lighting, including deep shades and different undertones, for gray/chalky washed-out faces or bright seams.
4. Make complexion, hairstyle, eye color, face shape, cultural identity, clothing and other traits **independent editable choices**; avoid stereotypes.
5. Do not change Caitlyn's approved body, or automatically restyle Amy/Chrissy/Riley/Mason to fit these new presets.

## Status
This document records the source material and shared helper already committed. Final live GLB/model QA is separate; don't claim an updated published model until the relevant build completes and the visual result is inspected.
