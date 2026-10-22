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

## 2026-10-22: Head topology resolved; preview renderer failed
- Run 39845680242: **PASS** imported GLB: one connected manifold head, three morphs, two eyes. Imported names and morphs matched expected values.
- Same run failed at Render preview PNG: Blender reported "Build without OpenImageDenoiser" when using Cycles.
- Correction commit 85fb2c4: select Eevee renderer compatible with the installed Blender instead of Cycles; no dependency on OpenImageDenoiser.
- Status: geometry issue confirmed resolved by round-trip validation; preview correction submitted, awaiting build confirmation.
- Reusable lesson: use a render engine supported by the actual CI Blender package; test image generation independently of geometry validation.

## 2026-10-22: Eevee preview missing EGL runtime
- Run 39845949509 (commit 7544eea): failed at Render preview PNG; log reports "Couldn't open libEGL.so.1" and Blender exit code 134. GLB build and validation completed before render.
- Root cause: GitHub Ubuntu runner's Blender/Eevee path requires EGL/OpenGL shared libraries not installed by the initial CI package step.
- Correction commit 29b136a: install libegl1, libgl1, libgles2, libopengl0, libx11-6, libxext6, libxrender1, libxi6, libxkbcommon0, libsm6, libice6 before invoking Blender.
- Status: fix committed; do not mark resolved until PNG and GLB both pass verification and upload as artifacts.
- Prevention for all character pipelines: document runtime renderer dependencies in CI; geometry validation passing does not imply headless preview rendering works.

## Verified green baseline — 2026-10-22
- Run 39846399597 (commit 29b136a): Brooke Head Prototype completed **successfully**.
- Run 39846490326 (commit 7964274): Brooke Head Prototype completed **successfully**.
- Verified uploaded artifact: `brooke-head-prototype`, artifact ID 12454544004, 766183 bytes, from run 39846490326. Bundle contains GLB and PNG as required by workflow upload step; individual file contents not visually reviewed yet.
- **Confirmed resolution:** imported mesh topology checks, morph/eye checks, preview renderer, file verification, and artifact upload all passed.
- Baseline for future changes: commit 79642740af6d1bea4fc3ef95988d8de8111a6be8, run 39846490326.
- Important: this is a valid **placeholder** head prototype, not yet a reference-photo-matched likeness. Keep this known-good baseline and change likeness parameters incrementally.
- Separate `Publish WVLRP` workflow remains failing on the same commit; Brooke's standalone workflow is green, not the entire site deployment.
