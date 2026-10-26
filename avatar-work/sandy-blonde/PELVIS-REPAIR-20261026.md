# Sandy Blonde pelvis repair — 2026-10-26

Scope: independent Sandy Blonde branch only. Approved Sophie 1, its byte-identical source clone, other characters, worlds and production are unchanged.

## Exact cause

`build_sandy_blonde.py` deleted the source's `Vulva2 MHX2 true auto-fit | adult inspection` mesh by anatomical-name matching. The base body has an intentional opening occupied by this fitted component. Its 28 rim vertices coincide with the body's 28 physical rim vertices (maximum source world-space mismatch 1.202e-7 m).

The prior fill algorithm examined GLB vertices split along UV seams. It counted 2,278 boundary edges and traversed large artificial components, rejecting every candidate. On a temporary welded audit copy, only the real 28-edge pelvis opening remains. Thus `pelvis_patch_faces:0` correctly meant no repair occurred. No evidence supports a missing texture as the cause of the opening.

## Smallest source-preserving correction

- Retain the original 608-face fitted component; do not invent fill faces or weld the actual character mesh.
- Mirror all three Sandy morph keys onto it using the same world-coordinate sculpt formulas, including the tiny chest-key contribution at its rim.
- Bind it to the body's recolored skin material. Both original parts use the identical skin atlas, so this preserves their UVs and prevents leaving the retained part with the old skin tint.
- Audit topology on temporary copies only. Keep `pelvis_patch_faces:0`: zero new faces is expected for this retention repair. New report fields identify the retained faces and repair method explicitly.

## Local verification on Blender 4.2 / Chromium

- Blender source import, three portrait renders, GLB export and editable Blend save passed.
- Existing asset validation passed: 14,483 body vertices; GLB 10,091,620 bytes; skin, eye and hair textures and all three renders present.
- `verify_pelvis.py` reimports the actual exported GLB. All eight corners of the three sliders, the default (1,1,0.76), and an intermediate setting (0.4,0.7,0.5) passed. Maximum rim mismatch 1.804e-7 m. Combined body/attachment audit surface: zero boundary edges and zero nonmanifold edges in all ten settings. Exported parts share the same material index. Neutral white vertex colors on the retained component do not change the texture tint.
- Existing offline viewer bundling and 412×915 headless smoke passed: **6 meshes, 52 bones, 3 controls, 0 animation clips**. The extra mesh is the retained source component.
- Full-body smoke screenshot inspected: the pale open triangle is absent in the neutral front view. Subtle anatomical shading is not a hole. No claim that every angle or animation has been visually approved.
- Original/source-clone SHA-256 before edits: `621c27b7e63ef7799a3be44c31a076f21ce3b22634d3bded41159bb1a2584026`; both remain untouched.

The dedicated workflow now runs the exported topology test and treats a browser smoke failure as a workflow failure instead of ignoring it.

Remaining: physical Samsung A17 testing, independent appearance approval, and animation/rig validation. No wardrobe work, game integration, production deployment, or game-ready claim. Generated CI outputs and its run result must be checked separately from these local results.

Rollback: revert the repair commit on this isolated branch and rerun its dedicated build workflow; do not touch approved Sophie 1.
