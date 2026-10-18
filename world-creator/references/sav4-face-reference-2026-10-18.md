# SAV 4 — Laura reference, two-view measurement sheet (2026-10-18)

Images supplied in conversation: 5458.jpg (1536×864, three-quarter frontal), 5459.jpg (1536×831, left-facing profile). Images not yet uploaded to repository.

## Constraints
These are perspective image measurements in pixels, NOT anatomical dimensions. Different camera distances, focal lengths, expressions, and head rotations make direct scale matching invalid. The profile has closed eyes and partly occluded nose/forehead by another actor. Only compare *ratios within the same view* and verify in 3D. No mesh edits claimed.

## Three-quarter frontal view (5458.jpg)
Approximate manually inspected landmarks in full-image pixel coordinates (x right, y down):
- left visible eye center (687,359); right eye center (816,333); projected eye-center separation ~132 px.
- nose tip (758,427); mouth center (771,488); chin (776,577).
- mouth corners ~ (726,488), (824,475), projected mouth width ~99 px.
- eye line tilted ~-11° due to head rotation/pose; do not bake tilt into mesh.
- Visible forehead hairline obscured by bangs. Cheek width and jaw symmetry cannot be calibrated reliably.
- Eyecenter-to-nose-tip vertical ~81 px; nose-tip-to-mouth ~61 px; mouth-to-chin ~89 px (rough projected estimates, head tilted).

## Profile view (5459.jpg)
Subject on right, facing image left; useful for silhouette only:
- approximate forehead/bangs leading edge (889,287)
- nasal tip ~ (831,387)
- lip forward contour ~ (837,455)
- chin forward contour ~ (841,521)
- lower jaw sweeps back toward ~ (1028,537)
- Ear centered approximately (1086,388), partly hidden by hair.
- These are approximate image-space contour landmarks, not precise 3D coordinates. Another person's face overlaps forehead and nose; do not extrapolate occluded surfaces as facts.

## Morph priorities
1. Oval face with full upper cheeks, gently tapered lower face, rounded modestly projecting chin.
2. Nose with slim bridge, modest projection, soft rounded tip, avoid exaggerated point.
3. Mildly almond eyes and natural upper lids; keep pale-blue SAV4 eye material.
4. Medium mouth width, relaxed lip projection and natural smile shape; inspect neutral expression separately.
5. Fine straight dusty/ash blonde hair, forehead fringe and long smooth face-framing lengths.
6. Preserve SAV4 adult body proportions, rig and clothing.

## Calibration workflow
- Render SAV4 orthographic front, profile, three-quarter with neutral expression and consistent camera height.
- Normalize projected measurements by a stable internal reference (eye-center distance for front; ear-to-nose or head height for profile).
- Adjust MPFB face morphs in small increments, save reversible parameter preset and screenshots, then export/test GLB.
- The stills cannot establish exact physical measurements, hidden geometry, or camera-corrected 3D topology.
