# Caroline and Charles Ingalls — adult avatar rebuild (2026-10-14)

## Priority
Build **Caroline first**, then Charles. Use the existing GitHub Actions / Blender / MPFB pipeline. Do not reuse Jenny or #5 meshes, clothing, or rigs.

## Source and completeness
- Use MPFB2/MakeHuman complete adult female and male base meshes, with correct real-world scale, connected head/neck/torso/limbs, hands, feet, eyes and teeth. Check mesh normals, watertightness where appropriate, UVs, texture and deform weights.
- For **Caroline (adult only)**, source a compatible anatomically detailed female body/genital asset **only if its license, provenance, topology and MPFB compatibility can be verified**. Standard MPFB base meshes do **not** guarantee detailed genital geometry. Do not fabricate a claim that it is included; if unavailable, document that blocker and proceed with a non-explicit complete adult body for the clothed game avatar.
- Keep any anatomical fitting/QA work private, never on the public viewer; all public exports and previews must be fully clothed.
- Avoid missing or detached geometry and avoid accidental clipping through clothes.

## Face references
- Caroline: Karen Grassle as Caroline Ingalls, Little House on the Prairie season 3; adult facial proportions, natural hair and period styling.
- Charles: Michael Landon as Charles Ingalls, season 3; adult facial proportions, period hair and beard.
- Morph/sculpt on stable adult base; save editable source/presets and reference provenance.

## Rig and animation gates
- Apply one consistent game-compatible humanoid rig. Validate expected 56-joint export only if the current animation system requires that exact joint map; do not mislabel an incompatible rig as 56-joint.
- Verify joint orientation and positive knee/elbow bend, stand, walk, run, sit, bend/pick up, hands-and-knees, elbows-and-knees, crawl, lie down.
- Export rigged GLB and inspect all motions before dressing.

## Clothing — do not repeat old fit errors
- Caroline: period blouse, long skirt, apron, boots; Charles: period shirt, trousers, suspenders, boots.
- Fit each garment to its **own** base body in rest pose, transfer skin weights, verify shoulder/waist/hem clearances and deformation in every animation. Never fix a bad garment with global scale alone.
- Keep source clothing and fitted outputs separate. Test collisions/clipping, texture quality and render from front/side/back.

## Delivery gates
1. Commit source builders and locked base presets for both adults.
2. Run Blender CI and confirm asset generation, rig integrity, required animations and clothing tests.
3. Publish separate clothed preview viewers; never call a character complete before visual inspection on phone.
4. Start Caroline immediately; Charles follows after Caroline base and rig pass.

Reference: MPFB documentation https://static.makehumancommunity.org/mpfb/docs/getting_started.html
