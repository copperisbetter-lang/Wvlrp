# Brooke Head 3.0 — facial rig requirements

Status: requirements, not implemented or validated.

## Baseline
- Neutral, relaxed face must be the default pose. No permanent smile.
- Preserve source Brooke Head 3.0 and original 4105; work only on derived rigged copies.

## Independent controls
- Smile strength: neutral (0) to full smile (1), with intermediate subtle smile.
- Left and right mouth corner elevation separately adjustable.
- Jaw open/close independent of smile.
- Lip rounding/pucker to a smooth O independent of jaw opening.
- Lips closed/parted control, without clipping or pulling cheeks unnaturally.
- Smooth interpolation between neutral, smile, open jaw and rounded lips.

## Validation before calling complete
- Confirm mesh supports useful mouth deformation; single head-bone test is insufficient.
- Render and inspect neutral, subtle smile, full smile, jaw open, rounded O, and combined poses from front and profile.
- Confirm original head and source files unchanged.
- Blender workflow must install python3-numpy.
