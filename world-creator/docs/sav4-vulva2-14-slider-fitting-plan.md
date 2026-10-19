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

## Approved extension — articulated fitting and per-control locks (2026-10-19)
Implementation status: SPECIFICATION ONLY until viewer code, deformation tests, and published preview are verified.

- Add four independently adjustable pitch hinges distributed front-to-rear: H1 below anterior feature, H2 front-middle, H3 rear-middle, H4 at posterior end. Default range -45 to +45 degrees; each hinge uses a local pivot and smooth falloff, not rigid whole-mesh rotation.
- Add Rear Depth (-40 to +10 mm initial range) and Rear Taper controls. Hold the anterior anchor in world coordinates while posterior geometry is conformed inward; initial reported posterior clearance is approximately 25.4 mm.
- Each of the original 14 controls plus all new controls gets an individual lock toggle. Locked values are immutable under direct UI input, resets, presets, and automatic fitting unless the user explicitly unlocks or confirms override. Locking a region also preserves its anchored vertices when adjacent hinge deformation is applied.
- Add Lock All and Unlock All. Display lock state, precise values and units alongside each slider near the sticky live viewer. Preserve original mesh and use non-destructive deformation.
- Save and reload each control's numeric value and lock state, hinge pivot coordinates, deformation falloff, coordinate system and units, mesh source identifier, and schema version. Export/import JSON with backward compatibility for 14-control presets.
- Validate side and underside views, surface intersections, standing and bent poses, and a reload round trip. A passing build alone is not proof of visual fit.
