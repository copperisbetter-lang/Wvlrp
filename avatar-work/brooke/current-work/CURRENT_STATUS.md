# Brooke 1.1 — CURRENT WORK
Updated 2026-10-23

## PRIMARY VIEWER — GEOMETRY PASS 7
https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-1-1-pass7-geometry/world-creator/brooke-1.1-pass7-geometry.html
Branch: brooke-1-1-pass7-geometry
Commit: 4b36fbb0838debef3bd358f1168fa578e5afed5c
Source GLB: world-creator/assets/brooke-1.1-detail-head-candidate.glb (unchanged)

## Status
New viewer makes reversible in-memory vertex deformations (lip projection, jaw narrowing, brow softening). NOT yet validated for head-coordinate correctness or baked to GLB. Original Pass 4/5 viewer preserved. Verify face and controls on phone before promoting.

## Original
https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-1.1/world-creator/brooke-1.1-head-detail.html

## Outstanding
Full lips forward, natural brow, softer jaw, narrower eye opening, eliminate upper-lip shadow, full lower-lip color. Use photo references; never touch Sophie 1. Issue #29 coordination.

---
# Brooke 1.1 — Current Work
Updated 2026-10-23

## Working viewer URLs
Pass 6 non-destructive review: https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-1.1-pass5-from-pass4/world-creator/brooke-1.1-pass6-review.html
Original Pass 4 viewer: https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-1.1/world-creator/brooke-1.1-head-detail.html

## Exact repository files
Branch: brooke-1.1-pass5-from-pass4
New viewer: world-creator/brooke-1.1-pass6-review.html
Preserved source viewer: world-creator/brooke-1.1-head-detail.html
Source model: world-creator/assets/brooke-1.1-detail-head-candidate.glb
Review commit: 55240b35c9fa3024f91bfd7c4fcf32e9eb0818ab

## User feedback / corrections
- Brooke still looks too masculine: soften heavy brow ridge and angular jaw.
- Eyes too wide; eyelids need anatomically natural opening.
- Lips too far inside face, need full, firm forward projection and complete lower-lip color.
- Remove dark shadow above upper lip; skin needs consistent color.
- Use user-supplied front and side reference photos; protect Sophie 1 and Brooke 1.0.

## What changed
Created separate Pass 6 review viewer with softened lighting and guarded morph adjustments when matching real morph targets exist. Source GLB is unchanged. This is NOT yet a rebuilt head mesh and must not be called finished.

## Next
Inspect Pass 6 viewer on phone; identify available morph target names; implement actual mesh-level lips, brow, jaw corrections with preserved backup and photo measurements. Before deployment, coordinate issue #29.
