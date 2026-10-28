# Jenny proposed head 4675 + FaceMorph Lab v0.2 — 2026-10-28

Owner clarified previously "Not Jimmy, Jenny", "Toy don't have Jenny's head yet", and "Jenny needs a child make human body", then uploaded new `4675-3d.glb` as the proposed Jenny likeness reference.

## Inspected true supplied source, not a guessed URL
- File: `4675-3d.glb`, 7,659,132 bytes, SHA256 `1ae71cc93ed3fd579c4675e9688744df00c6f7bec102b6a84851c59fdcbd25d5`.
- Source glTF `img-to-3d.com`; 1 combined photogrammetry-style **female child face, long hair, neck, shoulders and cropped top** mesh; 138,609 vertices and 198,854 triangles, 2 embedded image textures.
- Triangles have **72,612 unmatched boundary edges** out of 334,587 unique edges. No armature/skin, no morph targets, no animations. This is NOT a ready-to-rig MakeHuman head and **must not be grafted** on the child body.
- Rendered FRONT, BACK and SIDE QA in Blender 5.2.3, with original user source untouched. It is a reference likeness rather than a completed character.

## Actual prototype delivered in user's ChatGPT download
- `Jenny_4675_FaceMorph_Lab_v02.zip` (15,991,205 bytes), ZIP integrity verified and exact source SHA copied, includes owner's original source privately; not committed publicly.
- `wvlrp_face_morph.py` — usable Blender 4.2–5.2 add-on, version 0.2. Imports GLB as **reference only**; operator for 16 editable paired face markers; similarity/RBF guided face-deformation shape key applied to **an independent already rigged continuous child base mesh**, with preserved armature modifier, skin weights, topology, body/neck, original source and UVs.
- v0.2 adds automatic spatial face ROI to suppress unintended neck/shoulder changes in addition to z-based neck guard, plus reference GLB import operator.
- `test_wvlrp_face_morph.py` regression smoke test passed Blender 5.2.3 on **synthetic rig only**: original untouched, 574 of 1298 demo vertices moved, 724 frozen, max displacement 8.87mm, shape key/armature still attached.
- `Jenny_4675_Reference_Stage.blend` has actual imported reference and embedded add-on script; source/reference stage is NOT a child MakeHuman body.
- Three front/back/side PNGs + JSON reference preflight + README included.
- No scanned geometry copied into native rig; no Jenny model/animations produced and no user approval claimed.

## Hard remaining dependency
Need an **actual full MakeHuman/MPFB child-proportioned mesh and rig** for approximately age-seven Jenny. Verified `world-creator/assets` listing showed `jenny-real-full-body-preview.png` but no corresponding verified complete Jenny GLB. Do not substitute adult-scaled SAV4, old flawed Penny/Young Explorer GLB, or a procedural blob. The addon is guided/manual correspondence, not automatic perfect face transfer; real portrait match, textures, rig motion, separate hair, clothing all require fitting and validation.

## Project rules
Preserve original 4675 GLB, original approved character assets, and raw paid Flat 03 files; no changes to production, Issue #29 freeze. No child naked previews or anatomically explicit output. Do not claim Jenny NPC completed.
