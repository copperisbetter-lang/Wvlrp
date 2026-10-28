# Stacey Spring V15 — Visible source of water
Date: 2026-10-28, owner Android QA approximately 4:09 PM EDT.

## Owner feedback
After V14 embedded-bank cleanup, owner confirmed “Looks much better, but we need to see where the water is coming from.” Screenshot shows an essentially solid-looking mountain wall behind blue-gray upstream water; no discernible live water emergence.

## Safe branch
- Derived from V14 immutable spring scene commit: `985dcd12608a9545bae3addd93175a2754c7fd56`
- Branch: `gater/stacey-spring-visible-source-v15-20261028`
- Immutable reviewed stage: `c53999b9d00fa043555a7428f49c56ac3d565f93`
- Changed files: `world-creator/base-camp/stacey-spring-bedrock-v12.js` and `world-creator/base-camp/stacey-dive.html` (HUD label only)
- QA preview: https://raw.githack.com/copperisbetter-lang/Wvlrp/c53999b9d00fa043555a7428f49c56ac3d565f93/world-creator/base-camp/stacey-dive.html?spawn=spring

## Geometry/rendering change
- Terrain fragment mask clips only a small jagged 3-D-visible aperture near the existing real headwater source (approx x=-38 to -34; z=-240 ±4.5; y=20.35 to about 24.25); maintains the mountain, dome, upper terrain, and bank heights.
- The photographed dark limestone recess remains BEHIND the clipped face at x=-38.15. Darkened stone on the inner wall only; no billboard panorama, boulder arch, or artificial roof sheet.
- A short 1.95m live-water source extension uses the SAME THREE MeshStandardMaterial water shader as the real V11 single mountain stream, at same terminal width and surface level. Upstream water now visually begins within the rock.
- All V14 embedded stone banks and tapered bedrock preserved.
- Mobile HUD now identifies version as `Visible Source V15` so owner can distinguish from V14.

## QA/status
- All seven direct source assertions passed, standalone ESM function syntax parsed in JavaScript.
- Not yet visually verified in Android WebGL. Shader/material may still need refinement if opening is obscured or overexposed. Owner screenshot is acceptance gate.
- No merge/deployment. Production, original main, approved lake, V6 canyon GLB, waterfalls, dome, woodland trail, purple grading, original water flow geometry and established split widths unchanged.
- Existing white photo panel/canyon geometry problem remains separate and unresolved.
