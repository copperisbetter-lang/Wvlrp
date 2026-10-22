# Brooke — 3D Head Reconstruction

## Current status (2026-10-22)
A **generic first-pass prototype**, not a photo-matched Brooklyn Decker likeness. The Blender builder, GLB export, preview renderer, GLB inspection viewer, and GitHub Actions build/validation workflow are committed. A successful GitHub Actions run and its actual rendered artifact have **not yet been verified** here. Reference photographs have not been imported as usable files, and no likeness fit is complete.

## Scope
Target: adult Brooklyn Decker, *Just Go With It* era, for The Wild. Use exactly one connected manifold head-skin mesh, not three overlapping faces. Eyes are independent spheres behind eyelids; hair separate; neck compatible with body rig. Start neutral.

## Build and validation
Workflow: `.github/workflows/brooke-head.yml` (push on Brooke files, or manual dispatch). It installs Blender, builds `brooke-head-prototype.glb`, validates head topology/morph keys/eye components, renders `brooke-preview.png`, checks GLB/PNG signatures, and uploads both as the `brooke-head-prototype` artifact.

To inspect results, open GitHub Actions > **Brooke Head Prototype**, select the latest run, confirm every step passed, download `brooke-head-prototype`, and visually inspect the PNG and GLB. **A committed workflow does not mean its run passed.**

## Next tasks
1. Diagnose any failing Actions step using its job log, patch the cause, and rerun.
2. Verify actual GLB and PNG artifacts; inspect front, side, 3/4, top/bottom and eyelid/eye intersections.
3. Import authorized frontal and two side/three-quarter reference photos into `references/`, recording source and usage rights. Chat preview images are not imported source assets.
4. Landmark pupils, canthi, brows, nose, lips, chin, jaw and ears with consistent camera calibration.
5. Fit the single head topology to all views; UV texture and remove hair contamination from skin.
6. Test gaze, blink, morphs, neck join and export in The Wild viewer. Keep Laura untouched.

## Acceptance criteria
Exactly one connected manifold head-skin mesh, no duplicate facial shells, two correctly seated eyes, correct face proportions against references, no visible seams, usable GLB and preview, passing Actions build. The current prototype **does not yet meet the photo-likeness requirement**.
