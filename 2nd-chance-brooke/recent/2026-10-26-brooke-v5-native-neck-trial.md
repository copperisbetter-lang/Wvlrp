# Brooke 3.1 V5 native neck trial — 2026-10-26

## Owner's V4 Samsung screenshot
V4 face scale is closer to expected but the neck has a long pale/pink standpipe with jagged incomplete pieces beneath the chin. The crown still looks flat. **V4 REJECTED as visually unacceptable.**

## Root cause verified by Blender geometry probe
- Diagnostic run: https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40381107032 (PASS).
- Native body armature world **head joint z=1.45913m**, neck joint z=1.39751m.
- Previous builders calculated the body mesh cut by dividing world head height by the **body object scale and armature scale**, effectively removing head-influenced skin far below the actual neck joint (V4 local cut 0.942 rather than ~1.172).
- V3/V4 then tried to hide this hole with an independent pale neck tube. The V4 screenshot exposes how badly that failed.

## Isolated V5 reconstruction
- Branch `g2/brooke-v5-native-neck-20261026`, original sources/old previews untouched; **no main / live website deployment**.
- Builder `avatar-work/brooke/second-chance/build_v5_native_neck.py`, using protected source SHA checks.
- Correct cut calculated with native base world inverse, world z=1.43913m.
- **216 tracked original neck vertices preserved** in z1.38–1.434m, in addition to 2,438 original shoulder/arm/spine protected verts.
- No V3/V4 independent pink neck mesh; keeps original body neck UV/skin texture.
- Retains V4 .350 source head scale, trims source scan pedestal at canonical y=-.18, rounds cloned hair crown more (no changes to source 3948).
- The head mesh and neck are still overlapping rather than mathematically welded, so **seam quality NOT verified**.
- Output `avatar-work/brooke/second-chance/brooke-3-1-v5-native-neck-trial.glb` (28,437,388 bytes) and JSON report; hosted viewer `brooke-3-1-v5-inspector.html`.
- GitHub Actions run https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40381999133 **PASS**, GLB parse; 52 existing body joints + 12 new facial joints and ten facial morphs, original SHA checks passed.
- No screenshot/browser QA of V5 yet. User must inspect front, profile, neck/head rotation, hair crown. Mouth, facial expression quality, material blending and body poses remain unverified.
- Gater 2 handoff to #29; protect Brooke 1, Sophie 1, Mona, 3948, 4105, V2/V3/V4. Rule 29 review before any public promotion.

## Inspected viewer version
Commit `ab9a5f7a3555364565d5a036f02f4d38df36eac1` contains both the V5 GLB and the V5 HTML.
