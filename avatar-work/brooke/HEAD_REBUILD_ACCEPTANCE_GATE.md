# Brooke — full rebuild / no-shortcuts head gate (2026-10-23)

## Status
Current MPFB export is **REJECTED** as a likeness deliverable. Screenshot shows floating rectangular hair strips, red/hollow-looking eyes, harsh lighting, generic face and bust-only geometry. A green CI check only proves pipeline execution, NOT character quality.

## Mandatory sequence (head first)
1. **Source validation**: inspect mesh hierarchy, head/neck/skull topology, eye meshes, hair mesh, material bindings, UVs and transform units. Do not mistake a 0.28m bust for a full-body avatar. Keep all changes isolated to Brooke branch and PR #31.
2. **Head foundation**: create a continuous front/back skull and neck with no holes, floating parts or abrupt cuts; validate normals and geometry from front, sides, rear, top and 3/4.
3. **Eyes**: proper sclera, irises, pupils and corneal surfaces; correct left/right alignment, depth and eyelid contact. Never ship red placeholders or empty sockets.
4. **Likeness**: compare user-provided authorized front/profile Brooke references with landmarks and 3D orthographic projections. Measure and document face width, eye spacing, nose bridge/tip, jaw/chin, lip proportions, ears and side silhouette. Generic proportions are not approval.
5. **Hair**: replace or refit rectangular hair-card geometry so scalp is covered and strands have correct origin, orientation and depth. Wet/dry hair variants are separate follow-up passes after skull is correct.
6. **Inspection**: neutral even illumination and matte backdrop; save front/back/left/right/top and both 3/4 renders, plus geometry/material validation JSON. Ask owner to review real renders before approving head.
7. **Only then**: full-body base, clothing and adult anatomical customization, rig, animation, and game integration. No deployment or merge without owner review.

## Acceptance blockers
- Any floating hair planes, hollow/red eyes, detached skull/neck, missing rear head, image-billboard face, misleading bust-as-body labeling or unverified likeness = **FAIL**.
- Report actual completed artifacts, not inferred progress. Preserve failed build logs.

## Current work order
Audit the existing exported GLB for geometry/material root causes before altering proportions. A render pipeline passing is necessary but insufficient.
