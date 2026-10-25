# Gater 3 — Mona full rig and deformation viewer assignment (2026-10-25)

Requested by user for work AFTER the Linux Blender files and ORIGINAL Mona.blend have been uploaded and are accessible. Do not claim assets uploaded before verification. Preserve Mona.blend unchanged; work on copies. Coordinate per WVLRP Rule 29 before deployment.

Build a dedicated Mona inspection viewer, using the original Blender rig as the authoritative source (reported 505 bones; verify actual bone count and classify deform, control, helper and facial bones). Include all current WVLRP character actions: walk, run, sit, bend forward, squat, hands-and-knees, elbows-and-knees, plus joint-level arm/leg/hip/spine/head/hand/finger motion and any additional movements supported by Mona. Include full-body rotation and close-up camera, front/side/rear views, reset pose, pose presets, and individual joint controls where rig permits. Do not fake motion by rotating the entire mesh.

Specifically test flexibility, skin stretch, skin compression, joint deformation and whether tissues follow movement automatically without manual morph sliders. Examine elbows, knees, shoulders, spine, hips, hands, face and other anatomical regions supported by the original model. Add wireframe and deformation/weight inspection views, animation playback, side-by-side neutral vs posed inspection, and record failures (clipping, collapse, overstretch, detached skin, joint inversion). Expose discovered shape keys, rig controls and animation clips with meaningful labels. Distinguish verified controls from proposed ones; don't claim unimplemented controls work.

Run tests on mobile (Samsung A17) and record performance. Compare with 56-bone baseline and evaluate whether a full 505-bone rig or a selectively reduced rig best suits WVLRP real-time avatars. Keep Gater 3 on Mona; Brooke work and protected originals remain separate. Provide a direct working phone viewer link when implemented, with no 404s, and update this recent folder with each verified milestone.

## Additional required pose and animation tests — user update, 2026-10-25
- **Squat with knees apart**: controlled hip abduction and knee flexion; test neutral-to-deep squat, balance, skin stretching/compression at hips, inner thighs and knees.
- **Sitting with legs open**: adjustable seated hip abduction and knee position; verify pelvis and thigh deformation, clothing/mesh clipping, and stable seating.
- **Swimming**: test available swimming clips if present; if absent, label as a requested animation to create, not an existing Mona capability. Include stroke motion and leg kicks, and assess shoulder, spine, hip and knee deformation.
All three are mandatory viewer test cases, even if the source rig lacks ready-made clips. Report implemented versus missing distinctly.

## Complete animation coverage and viewer menus — user directive, 2026-10-25
**Do not omit any animation:** Include EVERY existing WVLRP character animation and pose, plus EVERY animation clip, pose, rig control, and relevant shape key discovered in the original Mona.blend. Inventory by exact source name and report missing or unsupported items; never silently drop controls. If a motion is requested but not present, mark it clearly as 'to create' rather than pretending it exists.

Organize the viewer's controls into separate dropdown menus (with searchable names and reset per section):
1. **Face/head:** all facial expressions, eye, eyelid, eyebrow, mouth, jaw, tongue, head/neck controls where available.
2. **Bust through shoulders / upper body:** chest, bust, spine, shoulders, arms, elbows, wrists, hands, fingers, and related deformation controls.
3. **Groin/pelvis/hips:** pelvis, hips, groin-area rig controls, hip abduction/adduction and related anatomical deformation; only controls actually present or separately implemented.
4. **Legs/lower body:** thighs, knees, calves, ankles, feet, toes, squatting, open-knee squatting, sitting legs apart, kneeling, crawling and leg kicks.
5. **Full-body and locomotion** (additional practical menu): walk, run, sit, bend, hands-and-knees, elbows-and-knees, swim and any other multi-region animations.

Each menu should expose all applicable actions with sliders for adjustable motion where technically possible, clear labels, pose reset, and visible current values. Allow combined controls across regions to evaluate skin stretching and deformation. Ensure the menus are usable on the user's phone; verify completeness against both the WVLRP animation list and Mona's source inventory.
