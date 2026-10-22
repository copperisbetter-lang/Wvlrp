# Brooke — realistic hair pipeline

Status: design specification, not a completed asset.

## Visual target
Use licensed/approved Brooke reference photos to match hairline, part, blonde color variation, layered silhouette, volume, and face-framing locks. Do not assume an exact hairstyle until a chosen reference is approved.

## Build pipeline
1. Complete and inspect the single-head geometry before attaching hair. Preserve Laura files.
2. Build scalp cap aligned to head mesh; no visible bald gaps at part, temples, or nape.
3. Author layered, tapered hair cards with alpha textures (root-to-tip variation, flyaways, fine breakup); avoid opaque solid helmet mesh.
4. Create physically plausible blonde shading: mixed warm/cool strands, roughness and anisotropic highlights, avoid metallic or glossy plastic look.
5. Bind card groups to head with limited secondary motion; constrain roots, damp tips, test turns, walk and wind; prevent clipping through cheeks and shoulders.
6. Optimize for browser/mobile: LODs, alpha overdraw limits, compressed textures; preserve silhouette.

## Acceptance checks
- Front, side, rear, three-quarter views; realistic hairline and volume.
- No card rectangles, visible scalp holes, plastic specular streaks, or clipping.
- Motion stable at rest, walking and turning; mobile frame-rate verified.
- Hair can be hidden to inspect underlying head geometry.

## Asset rights
Use reference photos only under appropriate licenses; do not embed third-party photos into public repo without permission.
