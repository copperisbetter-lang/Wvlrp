# Independent proof / failed likeness acceptance — Jenny 4675 V3

Owner challenged the prior result: **"Prove it"**. Reopened original complete V3 `.blend` and both binary GLBs in Blender/Python. Did NOT rely on earlier V3 build claims.

## Independently measured (Blender 5.2.3, Oct 28 2026)
- Native MakeHuman child original and V3 edited clone: each **14,517 vertices**, **26,756 polygons**, identical original base vertex positions (max difference **0.0 mm**), topology identical.
- Original has **15 active MakeHuman child phenotype shape keys**, final V3 has those exact 15 unchanged plus one additional live shape key named `Jenny_4675_EyesMouthGuarded_FaceFit_V3` with influence=**1.0**. Morph target is embedded **physically in the V3 GLB**; not a fake viewer offset.
- Added V3 morph moved **1,230 vertices more than 0.01 mm**, **1,112 more than 0.1 mm**, **758 more than 1.0 mm**. Max **2.8721 mm**, mean across changed >0.01mm **1.617 mm**; remaining **13,287** under 0.01mm.
- Same exact **52-bone armature object**, identical full vertex-group names and vertex skin weights; original child body untouched. Both exported GLBs have one GLTF skin with 52 joints and matching **5 starter animation clips**. Before SHA `55266ee887f7eba2218fb8f0ed55b62118e1a93bac42d553e18aea9e9a137a4a`; V3 SHA `85d3c8539545dec96356822ed3ea302e70eba32656dee288e89d87a13dd6a606`.
- Original scan `4675-3d.glb` kept as separate reference, NOT welded to native head.

## Provided concrete user proof as private ChatGPT artifacts
- `Jenny_FaceMorph_V3_Independent_Proof.json` — full machine-readable report remeasured from actual Blender.
- `Jenny_4675_Before_After_Mesh_Proof.png` — side-by-side original reference, original child, V3, and **6.5× enhanced pixel difference** (explicitly labeled enhanced pixel delta, not true exaggerated 3D shape).
- `Jenny_4675_Verifiable_Morph_BeforeAfter_Viewer.html` — the exact existing V3 GLB embedded and SHA-verified; toggle real GLTF named morph target from 0% to 100% via viewer slider; JS module passed `node --check` and correct embedded V3 SHA verified. Chromium automated runtime screenshot was not verified (headless timed out), therefore **Android viewer UX not claimed tested**. Files currently chat artifacts; not public GitHub binaries.

## Verdict and resource decision
**MORPH PIPELINE IS PROVEN TECHNICALLY. THE 4675 LIKENESS IS NOT PROVEN**: Max 2.87mm change is visually subtle; original child and V3 renders look nearly identical and neither closely matches the supplied 4675 photo/scanned hair/face. Do not claim that Jenny NPC's appearance is finished, nor that this particular morph passes acceptance. Better face landmark calibration or proper parametric fit + eye/hair and material changes are prerequisites. No V4 built in this proof pass; preserve V3 and all originals. GitHub Issue #29 production freeze unchanged.
