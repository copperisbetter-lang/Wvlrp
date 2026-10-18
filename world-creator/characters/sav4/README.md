# SAV 4 — clean adult character build

Status: foundation not yet built.

SAV4 is a new, independent adult avatar project. Do not import SAV3 geometry, fitting configuration, exported GLB, or its builder.

## Verification gates

1. Build and export a complete, closed, solid-appearing adult body mesh; inspect from every angle and verify topology before attachments.
2. Verify one skeleton and correct deformation in stand, walk, sit, and bend poses.
3. Add any optional attachment only after body and rig pass, and verify there are no duplicate or embedded surfaces.
4. Verify garment fitting and motion.
5. Publish a separate `sav4-viewer.html` only after the exported GLB is built and inspected.

Never report a code commit as a successful model build or deployment. Keep this project separate from The Wild game deployment.
