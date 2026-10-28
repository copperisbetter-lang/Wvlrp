# Amanda 1.0 — Flat 03 selected (private fit staging)

Owner selection on October 27, 2026: install **approved purchased Flat 03** (vendor Shape 03) into **Amanda 1.0** only, after removing Flat V1. **Do not install Flat 01/02**.

Clean source: `world-creator/assets/amanda-1-0-base.glb` on `g1/amanda-1-0-clone-20261027`; report: `amanda-1-0-detach-report.json`. Verified detached mesh (4,702 verts), intact MakeHuman body (14,483 verts), armature (1). Old version preserved at `amanda-1-0-with-flat-v1-backup.glb` for bounding-box alignment only. These assets are not to be modified in place. Keep Laura 2, Sophie 1, and production untouched.

Approved Flat 03 master OBJ checksum SHA-256: `d29c670c22c8dd0c5868f1f3592fb3838bbe4b165bff31186c24d77b663c1298`. Original ZIP in owner's private ChatGPT Library archive `Flat_Asset_Library_Approved_Flats.zip`. It has 14,993 OBJ vertices / 28,458 faces, and no preexisting usable rig/shape keys. **Do not upload paid files (or potentially redistributable fitted GLBs) into this public repository pending license verification.**

A separate private fitting kit `Amanda_1_0_Flat03_PRIVATE_Fitting_Kit.zip` was authored in owner chat: vendor Flat03 working mesh, skin/normal textures, `install_amanda_flat03_PRIVATE.py` (Blender import/scale, four-nearest-vertex skin weight transfer, private GLB export, readback rig/body verification), README. **It has not yet been executed against the cleaned Amanda GLB**; do not claim installation complete.

Next actual build: stage this *private* fitting kit alongside a checkout of the clean Amanda branch in a private Blender environment. Run the provided script, verify GLB roundtrip, then inspect neutral and seated/walking/bending leg poses. Make a private mobile review viewer before any production approval. The old Flat V1 must remain absent. No source vendor files are to be modified. Production main remains frozen under Issue #29.
