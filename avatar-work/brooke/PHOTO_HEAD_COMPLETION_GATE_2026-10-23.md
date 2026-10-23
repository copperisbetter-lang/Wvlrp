# Brooke photo-derived head — completion gate (2026-10-23)

## Verified blocker
`avatar-work/brooke/scripts/build_complete_head.py` exports the 3DDFA photo-derived facial patch only. Its output is **not** a full head despite the workflow's `brooke-complete-head-neck.glb` filename. Do not confuse this with the separately green generic prototype.

## Required implementation
- Retain and fit the photo-derived face, not the procedural placeholder.
- Build a correctly proportioned rear cranium, temples, ears, jaw underside, throat and neck with continuous watertight skin topology; avoid overlapping shells and voxel remeshing that destroys likeness.
- Stitch facial boundary loops to anatomically fitted shell; ensure normals and UV continuity.
- Preserve independent eyeballs and functional eyelids and morph targets.
- Verify one connected manifold skin component after GLB round trip, zero open edges, two eyes, neck junction, and render front/left/right/rear/top/underside.
- Compare photographs/landmarks before calling likeness complete.

## Current state
**NOT COMPLETE**. Current workflow may upload face-only geometry with misleading complete-head filename. A green workflow does not establish anatomical completeness or likeness. Do not publish it as the finished Brooke avatar. Preserve known-good generic prototype as rollback.
