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

## Follow-up corrections, 2026-10-22
- Run 39844686848: still failed at validation with exactly 508 nonmanifold edges after the source-geometry weld (commit 2095b254). **Confirmed ineffective:** welding source vertices alone did not change the imported result.
- Commit 9fdb747: triangulates source head before morph creation/export. **Unverified hypothesis:** exporter triangulation might be splitting topology.
- Commit 68acf982: welds coincident vertices in the *imported inspection BMesh* before manifold checking, to account for glTF vertex splits at UV/material seams. This does **not** change the GLB or excuse true holes; validation must still fail if edges remain open. **Pending verification.**
- Reusable lesson: distinguish true open geometry from serialization-induced duplicate vertex seams; validate both the original mesh and round-tripped GLB; log numeric edge counts and test outcomes, not just workflow pass/fail.
- Next: inspect the first completed run containing commit 68acf982; if it fails, capture exact traceback and investigate face/edge incidence before modifying more code.
