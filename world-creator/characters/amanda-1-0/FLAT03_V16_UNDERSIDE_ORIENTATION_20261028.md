# Amanda 1.0 / Flat 03 — V16 underside orientation correction (2026-10-28)

**Scope:** Isolated experimental private character model. NOT production-approved. No original master changed or purchased binary uploaded to this public repository.

Owner phone screenshots of V15 show Flat 03 facing front and a long hanging strip. **Correct direction confirmed by owner:** along the underside between upper thighs, front-to-back toward the posterior/perineal area, not vertically applied on anterior pelvis.

## Diagnosis
Body's **actual crotch hole border** has a forward-to-back U-shaped curve, rather than a straight vertical front slot. Measured body border in Blender Z-up: anterior pelvis near (y,z)=(-.122,.836), center underside near (-.017,.762), posterior edge near (+.055,.798), meters. V15 stitched instead to vertices descending down thighs near y=-.02, causing incorrect long faces.

## V16 implementation
- Started from untouched private working Flat03 central scan preserved in V12 ellipse crop; source original and all prior builds remain unchanged.
- Reprojected Flat03 along body cut's U-shaped centerline, moving length direction from old front-facing z axis to **front-to-back y** axis using measured anatomical surface points. Preserved x dimensions and original local relief; no old nonuniform 36% x / 48% z V6 stretching.
- Connected scan border to manually verified **actual posterior-reaching left and right crotch boundary chains** and short anterior/rear end fans; created 537 seam triangles sharing native body and scan vertices.
- Original 14,483 body vertices, source 13,516 trimmed-scan vertices and **52-bone armature** preserved; source materials kept; transferred local weights after rearward projection; exported V16 GLB (22,527,872 bytes), SHA-256 `be6fcf74cf694bd3ff257b1dafcdc8e639d88f2258943a47ddb1bc9f80703084`.
- Blender 5.2.3 glTF export/re-import passed. Hip and both upper-leg joint deformation test passed.
- Created self-contained Android HTML viewer `Amanda_1_0_Flat03_V16_Underside_Review_Viewer.html` (30,047,028 bytes), SHA-256 `554365d5cc5fabd12f9b73df717935aaf87389ffd031e25c931765bc2fbe0d4d`, with **Underside** (default), Rear underside, Pelvis, whole-body views and pose checks. JS module syntax validated.
- Current work exists in local conversation artifacts: V16 .glb, .blend, QA front/rear/under PNGs, installation script, report, viewer HTML; **not** uploaded to public GitHub.

## Honest visual limits
Front view now only sees the forward tip; underside shows actual front-to-rear source placement. Rear-under render shows a visible **triangular/folded seam near posterior join**, plus skin/material mismatch around edges. V16 is ONLY an orientation correction candidate. It does not have a finished welded natural-skin transition, perfect ankle/thigh pose range or owner phone QA, and must not be promoted to approved character or gameplay. Next goal: fix rear fold by retopology/UV blending and test on owner phone; do not revert to anterior-facing V15 or oversized backing.

Main/production untouched.