# Bev R25 — pose deformation repair handoff (October 30, 2026)

**Status:** Experimental repair built and reviewed using VTK offscreen geometry renders; requires user phone review, NOT deployed, NOT master-approved. Preserve R15 standing source.

## Immutable baseline
- `Bev_Flat03_V16D_Right_Material_Transition_R15.glb`
- SHA-256: `a3715e777f4e4614fe55ad16fb9b5b934b0844ad2b2180822cb10cbccc8cc0e6`
- R25 local source model has exactly the same rest mesh positions, normals, UVs, bone weights and material configuration as R15. No original source mesh or purchased texture was altered or uploaded to the public repository.

## Root fix
R18/R19 warped in the elbows-and-knees pose; independent R20 ARAP made numerical improvements but left visible body-side skin flaps.

R25 builds a temporary welded computational mesh from body, adapter, and attachment (32,013 vertex instances, 30,436 unique positional nodes, 91,299 ARAP edges). It optimizes all three surfaces jointly in posed space, rather than moving a single part independently. It then writes four separate glTF pose-corrective morph targets at 0.35, 0.70, 1.05, and 1.40 seconds, each mapped into local coordinates via inverse four-bone LBS. Original Caroline-derived bone animation is preserved.

## Quantitative end-pose QA (1.4 seconds)
| Measurement | R18 failed | R25 test |
| --- | ---: | ---: |
| Attachment triangles collapsed under 25% of original area | 21.794% | 0.228% |
| Joining-surface triangles stretched over twice original area | 9.453% | 0.236% |
| Body surface triangles stretched over twice original area | 0.782% | 0.593% |

Seam replicas agree at keyed times to floating-point precision. In 15 intermediate samples, the worst seam mismatch was below 0.000365 mm. Rear, rear-3/4 and side VTK geometry inspection at end pose no longer shows the long body-side flaps from R20; several intermediate pose frames were also inspected. These diagnostics are NOT equivalent to phototextured phone playback or human visual approval.

## Private artifacts (ChatGPT session only, not GitHub)
- `Bev_R25_Fused_Seam_Pose_Repair_TEST.glb`
- `Bev_R25_Pose_Repair_Inspection.html` — self-contained viewer with Stand, Elbows & Knees, Rear, Rear 3/4, Rear Close, Side, Front, and pose slider
- `Bev_R25_QA_Report.json` and R25 angle diagnostic PNGs
- `build_bev_r25.py`, `bev_fused_arap.py`; handoff `BEV_R25_REPAIR_HANDOFF_2026-10-30.md`

## Next
Require real on-device Three.js viewer approval before promoting any changes to The Wild, especially skin materials and joint appearance. Never publish private licensed model assets to this public repository. Gater 1/2 character work, Gater 3 terrain. Preserve issue 29 bell protocol.