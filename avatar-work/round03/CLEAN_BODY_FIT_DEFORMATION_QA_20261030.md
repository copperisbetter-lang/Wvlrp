# Round 03 — deformation-safe fitting acceptance gate (2026-10-30)

Status: **specification only**. No completed clean-body build or attachment fit verified.

## Non-negotiable source preservation
- Keep Brooke 1.0, Sophie 1, Round 03 private master, and existing character masters untouched.
- Work on independent MakeHuman body clone. Do not commit private Round 03 geometry to public GitHub.
- Do not run production-publishing workflows.

## Pre-fit measurements
- Record body/attachment world-to-local matrices, unit scales, bounding boxes, pelvic landmarks, thigh clearances, body opening perimeter and attachment rim point coordinates.
- Check topology: manifold boundaries, winding, normal direction, UV continuity, and skin-weight influence sets.
- Generate fitted opening based on measured contour, not a global planar cut or uncontrolled Boolean.
- Preserve source attachment's own rig and all morph targets; do not bake away controls.

## Deformation safety — PAV failure prevention
- Bind body rim/bridge to the same pelvis/hip/upper-leg skeleton as neighboring MakeHuman body, with normalized weights and no unintended root transforms.
- Attachment bones must be parented or constrained correctly relative to pelvis; avoid double transforms and inverse-bind mismatch.
- No single bridge vertex should receive incompatible pelvis vs thigh weights that cause body-wide pulls.
- Test neutral, walk, sit, wide-leg, hip flexion, forward bend 30/60/90 degrees, deep bend, squat, and return-to-neutral.
- Compare baseline body landmarks and silhouette before/after attachment under **identical poses**; forbid deformation outside a narrowly measured pelvic influence region.
- Validate finite vertex positions, nonzero face areas, normals, zero unintended body-wide displacement, seam separation/penetration, self-intersection and upper-thigh clearance in each pose.
- Round-trip exported GLB and retest skeleton joint count, morph target count, transforms and poses in browser.

## Pass/fail
Fail closed on any torso/limb deformation, pelvis distortion, seam tearing, fold-over, or missing movement control. No 'exact fit' or visual approval claim until measured geometry, pose checks and owner phone review pass.
