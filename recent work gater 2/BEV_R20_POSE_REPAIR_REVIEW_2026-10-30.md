# Bev pose deformation repair — 2026-10-30 (R20 visual QA, not approved)

## Status
Owner explicitly resumed Bev repair work. **NO game deployment or character-master promotion**. Preserve the immutable, approved-standing R15 private source (`Bev_Flat03_V16D_Right_Material_Transition_R15.glb`, SHA-256 `a3715e777f4e4614fe55ad16fb9b5b934b0844ad2b2180822cb10cbccc8cc0e6`). Private source and the Flat 03 licensed textures must **never** be copied to this public repo.

## Evidence
- Reproduced rejected R18 elbows-and-knees deformation by evaluating the full skinned 3D geometry. At end pose 1.4 s: 21.8% of attachment triangles collapsed to <25% original area; 9.5% of joining-surface triangles expanded >2x.
- R19 pelvis-only rigid reweight was previously rejected for worse visible join stretch.
- R20 is an **offline/private, unapproved** glTF test: four pose-sampled ARAP-based morph targets at 0.35, 0.7, 1.05, and 1.4 s; neutral geometry, original R15 materials and base rig remained unchanged; the linked pose animation drives the shape keys.
- R20 end-pose numerical metrics: attachment triangles <25% original area **0.4%**; joining-surface triangles stretched >2x **2.2%**.
- **Visual QA independently reveals R20 is STILL NOT ACCEPTABLE**: rear and rear-three-quarter clay renders show long distorted flaps in joining surface (primitive 1) and peeling/loose edges in body surface (primitive 0). A better triangle area number **does not prove** plausible appearance. Do not tell owner R20 is a successful fix.
- Diagnostic R21 hip-dominance experiment (not a deliverable) significantly shortened the joining-surface flaps, but caused visible gaps and peeled edges in body surface at hip junction. **REJECTED** without creating a promoted version.
- Headless Three.js browser render could not be validated in this environment due `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Python/Vtk offscreen geometry-only images were used for material-separated pose QA; mobile phototextured render remains unvalidated.

## Actual root issue and required next repair
The pelvis / upper-leg deformation **must be solved coherently across all three geometry primitives**. Flat 03 is a small part of the failure: the body and adapter seam surfaces themselves are splitting and stretching as hip and thigh joints rotate. Do NOT try further isolated material recoloring, R19-style rigid pelvic reweight of only the attachment, or ARAP confined to the attachment with seam boundary pinned. They cannot fix the body-side peeling.

Next meaningful direction: build a continuous pelvis-to-thigh blend / coherent skin-weight transition, ensure body primitive 0 and joining primitive 1 share a seam across *poses*, then use corrective morphs for elbows-and-knees based on actual multi-angle renders. Use non-destructive R15 clones. Check rear, rear-3/4, both sides, closeups, standing, and on-phone Three.js. Reject anything with flaps, detached edges, intersections or unnatural knee/hip silhouette.

### Private working artifacts
- `Bev_R20_Pose_Corrective_Experimental.glb` and `Bev_R20_Repair_Review.html`: generated in chat / private working container, **not** uploaded to public GitHub.
- `Bev_R20_Deformation_QA.json`: generated private numerical report.
- R20 and R21 VTK clay inspection PNGs in chat working container.
- Source of truth / backup in user private ChatGPT file library: `Bev_Save_Close_Checkpoint_2026-10-30.zip`.
- Text-only GitHub handoffs may be public; never publish private purchased meshes or textures.

## Branch/team
This is Gater 1/2 character repair. Gater 3 remains terrain. Preserve issue 29 handoff protocol. No deployed change.
