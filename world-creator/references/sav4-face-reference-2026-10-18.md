# SAV 4 — face morph reference v1 (2026-10-18)

Source: user-supplied 1536x864 movie still in ChatGPT conversation (not committed as image).
Status: initial reference specification only; no mesh modification performed.

## Visual targets
- Adult SAV 4 face: softly oval silhouette, moderately broad upper cheek area, narrow rounded jaw and gently tapered chin.
- Eyes: softly almond-shaped, modest upper lid hooding, natural spacing and subtle upward outer-corner angle. Preserve SAV 4 requested pale blue iris color rather than copying lighting-dependent iris color from still.
- Brows: light, fine, softly arched.
- Nose: narrow bridge, rounded tip, natural alar width.
- Mouth: medium-width natural smile, subtly fuller lower lip, soft cupid's bow.
- Skin: natural light complexion with subtle warm pink cheeks, avoid artificial smoothing.
- Hair: straight fine ash/dusty blonde; wispy full forehead bangs slightly side-swept; longer straight hair framing both cheeks and extending past shoulders. No generic helmet hair.
- Keep SAV 4 existing adult body proportions and clothing settings unchanged.

## Measurement caveat
Single oblique screenshot cannot yield exact anatomical dimensions or calibrated 3D depths. Do not use unverified pixel estimates as absolute Blender measurements. For reproducible fitting, annotate 2D landmarks on original reference, normalize by interpupillary distance, then compare to neutral front camera render of SAV 4; tune morphs and inspect profile/three-quarter views. Avoid overwriting current face mesh until baseline and rollback exist.

## Implementation checklist
1. Locate SAV 4 MPFB/Blender source and viewer.
2. Save current morph settings and mesh backup.
3. Fit normalized landmarks from reference and map onto compatible face morph controls.
4. Correct hair silhouette and material.
5. Export GLB, verify eye meshes, run build and inspect viewer.
