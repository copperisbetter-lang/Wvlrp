# SAV4 / Vulva 2 — Manual Fitting Viewer Specification (2026-10-19)

Status: APPROVED PLAN, NOT IMPLEMENTED. Dedicated Vulva 2 work is separate from SAV4 face morph workflow. Implement next session.

## 14 independent numeric sliders
1. X Position — left/right
2. Y Position — up/down
3. Z Position — forward/backward
4. Pitch — forward/backward tilt
5. Yaw — left/right rotation
6. Roll — side tilt
7. Width — overall mesh width
8. Height — overall mesh length/height
9. Front Bend — front end up/down, localized smooth deformation
10. Rear Bend — back end up/down, localized smooth deformation
11. Inner Lip Length — shorter/longer
12. Inner Lip Fullness — thinner/fuller
13. Outer Lip Length — shorter/longer
14. Outer Lip Fullness — thinner/fuller

Preserve original mesh and allow reversible edits; use shape keys or non-destructive deformations as appropriate. Ensure bends and localized lip adjustments do not accidentally move the entire mesh.

## Viewer UX
- Mobile: sticky/pinned live 3D viewer while slider panel scrolls below; avoid multi-page scroll between adjustments and result.
- Desktop: side-by-side controls and live viewer.
- Show exact numeric values, editable for precision, and update 3D preview immediately.
- Controls: Save Placement, Load Placement, Reset, Copy/Export Coordinates, Undo, Redo.

## Persistent placement and reuse
- Export a JSON preset with coordinate-system convention, units, translation, rotation, scale, front/rear bending and four localized shape parameters; include preset/schema version and source mesh identifier.
- Save master placement and per-character overrides. Target reuse on 25–30 explicitly adult NPCs, adapting to body proportions with landmarks instead of copying raw coordinates blindly.
- Keep all original geometry backed up. Do not overwrite existing SAV4 face morph or old viewers. New inspection viewer must load the *new* fitted export, not an abandoned Vulva 2 viewer.
- Fit and validate first, then publish; do not claim success based only on workflow pass.
