# Character build failure log — Brooke

## 2026-10-22: GLB validation — nonmanifold head
- Workflow: Brooke Head Prototype, run 39843367186.
- Stage: Validate exported head (after successful GLB export).
- Evidence: Blender import reported 508 nonmanifold edges, 6303 vertices, 12096 faces.
- Suspected mechanism: UV sphere coincident/seam vertices exported as split geometry. Exact source of all nonmanifold edges still requires confirmation from next run.
- Correction attempt: commit 2095b254 welds coincident vertices and recalculates face normals before creating morph targets and exporting.
- Prevention: keep strict imported-GLB topology validation; never skip the check to make a build pass.
- Status: correction submitted, pending result.

## Earlier failures
- Run 39835147983: Verify generated GLB and PNG files failed. Exact error not yet transcribed.
- Run 39839833570: Validate exported head failed; later diagnostic run identified nonmanifold edges.
- Do not classify a failure as resolved without a passing workflow and downloadable GLB + preview PNG.
