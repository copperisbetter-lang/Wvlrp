# Brooke — 3D Head Reconstruction

Status: initialized; reference image files not yet imported; no render completed.

Target: adult Brooklyn Decker, *Just Go With It* era, for The Wild. Use a single continuous watertight head mesh with integrated face geometry (not three overlapping face planes). Independent spherical eyeballs seated behind eyelids; correct tear ducts, eye corners and blink clearance. Separate hair geometry, neck seam compatible with body rig. Neutral expression first.

## Required inputs
- Licensed/authorized high-resolution frontal face photograph
- Left and right 3/4 or profile photographs, ideally matching lighting and age
- The search-preview images shown in ChatGPT are not local image assets and cannot be used as texture inputs until uploaded or acquired as usable files.

## Workflow
1. Import image files into `references/` (check usage rights). Record source and license.
2. Landmark face (pupils, canthi, brows, nose, lips, chin, jaw and ears) in consistent camera coordinates.
3. Fit one base head topology to frontal and profile silhouettes. Keep bilateral symmetry as starting point, then adjust natural asymmetry.
4. Generate UV texture from approved images, repair occlusions without baking hair into skin.
5. Fit independent eyes and eyelid rims; verify no gaps or floating surfaces from front, sides, above and below.
6. Export GLB for The Wild avatar viewer; include turn, zoom, blink, gaze and expression controls.
7. Validate model is ONE head mesh (excluding eyes, hair), correct scale, no duplicate facial shells, no transparent seams.

Do not replace or modify Laura's model or existing avatar viewer during this setup.
