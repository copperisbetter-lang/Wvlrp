# Gater 2 — Brooke 3.1 V5 native neck and full 3D blonde hair handoff
Date: 2026-10-26 (US Eastern).
Working branch: `g2/brooke-v5-replace-scan-hair-20261026`. Head after successful build `babe9515e5c559c10b02028108d405a09de89332`.
Not merged, not deployed to wvlrp.com, Rule 29 / Gater 1 review required before live release.

## Owner's latest visual direction
Owner rejected V3 / V4 narrow-head + long white neck. Specifically set **head 1–3% larger** and **neck a little shorter**. User approved target of **head +2%** and **neck 10 mm shorter**. Owner also wants finished character today rather than more notes.

## Verified completed work on isolated clone
- Native neck kept from Brooke 3.1 body's own skin geometry. The free-standing pink V3/V4 neck cylinder was removed. The native-neck audit counted 216 preserved donor neck vertices.
- Head scale `.35` → `.357` = **2% larger** than V4; head lowered 10 mm.
- New photo face imported from source `3948-3d.glb` (approved facial scan). The face remains on the existing Brooke body clone with **52 body bones + 12 facial bones and 10 facial shape keys**. Evidence is structural; does not prove high-quality animated motion.
- Original `long01` 3D hair from the existing donor body is imported and tied to the original body rig, adjusted 1.12× in horizontal width, recolored sandy blonde with a 256 × 512 strand texture.
- Original incomplete 3948 hair shell made transparent; **26,036** facial polygons kept and **107,092** photo-hair polygons hidden. Original approved model files unchanged by SHA guards.
- Exported model `avatar-work/brooke/second-chance/brooke-3-1-v5-full-blonde-hair-trial.glb`, **28,640,488 bytes**; model and inspector both confirmed committed.
- Build, GLB structural checks, rendered front/side/rear/three-quarter QA pass: GitHub Actions run `40388467471`.
- Mobile browser viewer HTML `brooke-3-1-v5-full-blonde-inspector.html` includes front/side/back/close-up, head turn test, 10 face sliders and bone selector.
- Pinned viewer: https://raw.githack.com/copperisbetter-lang/Wvlrp/babe9515e5c559c10b02028108d405a09de89332/brooke-3-1-v5-full-blonde-inspector.html

## Rendered QA visual observations (2026-10-26)
- Full donor hair is genuinely volumetric and extends down the back, unlike the original photo scan's black/flat triangular rear surface. The hairstyle is medium/golden blonde; somewhat stylized and helmet-like at the crown.
- Recognizable Brooke face front, skin face vs shoulder not exactly matched. Remaining small green scan-hair pieces near cheek and jagged dark scalp fringe at forehead. These are **still defects**.
- The neck no longer has the giant separate pale pink cylinder; nevertheless the photo head-to-native neck seam is **not topology-welded** and may show boundary artifacts.
- Normalized shape key and 64-bone counts pass but no facial cavity/topology quality or full set of poses were proven on mobile.
- No promise of photorealistic final or production-ready release.

## Next safe corrections / acceptance gates
1. On a fresh clone only: refine the face-only masking to hide remaining green hair at temple/neck while retaining real facial skin/forehead, and soften donor hairline and part without obscuring face. Do not delete approved 3948 original.
2. Check exact facial skin color match against body. Genuine welded neck ring still requires UV/normal/topology work.
3. User phone visual inspection from all angles; test smile/jaw/blink/head turn, sit, bend, elbows/knees and other poses. A model with morph targets is not proof that an open mouth or all body animations work.
4. Preserve original Brooke 1, Sophie 1, Mona, 3948, 4105 and previous V2/V3/V4/V5 artifacts. No direct production promotion without Gater 1 / Rule 29.

## Versions retained
- `g2/brooke-3-1-rig-20261026`: V4 and V5 artificial-neck prototypes.
- `g2/brooke-v5-owner-fit-20261026`: verified native-neck V5 with 2% head increase and 10 mm shorter neck, using old scan hair.
- `g2/brooke-v5-crown-finish-20261026`: *rejected* overly tall helmet crown.
- `g2/brooke-v5-hair-surface-20261026`: rear hair recoloring trial, still planar.
- `g2/brooke-v5-donor-hair-20261026`: donor brown hair overlay diagnostic.
- Current working clone: `g2/brooke-v5-replace-scan-hair-20261026`: full sandy blonde 3D donor hair + photo face/native neck.
