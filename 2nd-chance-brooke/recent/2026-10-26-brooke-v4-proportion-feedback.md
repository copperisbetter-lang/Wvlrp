# Brooke 3.1 V4 — Owner phone screenshot / proportion correction
Date: 2026-10-26, approximately 14:23 ET. Gater 2 working branch: `g2/brooke-3-1-rig-20261026`.

## Owner visual evidence
V3 phone screenshot shows front upper body, female photo face, hair top clipped flat, and extremely long / pale / oversize detached-looking neck tube. Owner explicitly: **"The neck on the body is to big and her head is to small."**
Do not treat V3's 64-bone/10-slider readout as satisfactory visual QA.

## Confirmed source diagnosis
V3 file: `avatar-work/brooke/second-chance/build_v3_neck_fit.py`.
* Working imported scan was scaled to 0.29. The earlier 0.436 trial had been reported too large, so use intermediate size not 0.436.
* Visible neck is a separate tube `Brooke_V3_Neck_Underlay` with 48 radial samples, max radius 0.077 m; this is not a welded texture-matched neck.
* V3 crops portrait scan at source y=-0.20 and fits to `mixamorig:Head` bone. Owner photo proves fit quality not yet acceptable.
* Preserve Brooke 1, Sophie 1, Mona, 3948/4105 originals and previous V2/V3 experiments. Do not deploy to WVLRP production without Rule 29 / G1 review.

## V4 isolated build changes
* Builder: `avatar-work/brooke/second-chance/build_v4_proportions.py` (derived safely from V3).
* CI: `.github/workflows/brooke-3-1-v4-build.yml` (GitHub Actions branch-only, no production deployment).
* Viewer source: `brooke-3-1-v4-inspector.html`.
* Head scale 0.29 → 0.35 (**20.7% increase**).
* Underlay max radius 0.077 → 0.053 m (**31.2% reduction**); taper radii 0.053/0.051/0.047/0.044/0.041 m and neck bottom to top z[-0.078,+0.032].
* Crop bottom lowered from -0.012m to -0.030m relative to actual head joint (18mm lower), reduces long-neck appearance. Warmer neck underlay material candidate 0.86/0.65/0.55; not verified color match.
* Output artifact `avatar-work/brooke/second-chance/brooke-3-1-v4-proportion-trial.glb`, JSON `.../brooke-3-1-v4-proportion-check.json`.
* Initial V4 workflow `40378042081` failed early because textual report patch anchor matched twice; fixed unique anchor on commit `355c84c6c53b6378aca6c610ca4480efa08f982c`. Rebuild workflow `40378335692` scheduled.

## Acceptance gates (still pending)
1. V4 CI success, source hashes stable, 52 body joints + 12 facial joints and 10 shapes retained.
2. Real phone V4 front, side, back and close-up preview; no visible long pink stalk or floating head.
3. Natural skinned neck join / proper skin material UV and color (underlay remains UNWELDED). Fix flat hair crown.
4. Actual mouth topology, facial movement, body pose continuity including elbows/knees and head turn.
5. Rule 29 handoff / G1 clearance before production promotion. Do not claim V4 production-ready.

This file is a handoff with work-in-progress status, not a verification report.

## Verified after handoff creation
- Run 40378335692, retry attempt 2, **SUCCESS** on 2026-10-26.
- Blender built `brooke-3-1-v4-proportion-trial.glb`, 29,520,920 bytes; GLB structural QA passed (52 body joints, 12 facial joints, 10 facial morphs).
- Preserved all 2,438 recorded protected shoulder/arm/spine vertices. Input SHA guards passed.
- GitHub branch committed trial model and V4 JSON. Viewer `brooke-3-1-v4-inspector.html` exists on branch. Stable inspection commit with both files: `2fd9bfa0fc439079ca2efc039a6128ebb4652114`.
- Actual phone rendering, color and watertightness still **NOT verified**. No production promotion.
