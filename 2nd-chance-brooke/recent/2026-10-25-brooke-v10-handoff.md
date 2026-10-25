# Brooke 3948 — recent work handoff (2026-10-25)

## State
PAUSED by user. Resume Brooke head work here, separate from Gater 3's Mona project. Preserve original 3948, Brooke 1, Brooke 3.1, Sophie 1 and all V6–V10 versions.

## Working files / viewer links
- `3948-calibrated-face-v6.html`: original baseline; jaw visibly moved but lips did not separate; eyelids malfunction.
- `3948-calibrated-face-v7.html`: attempted stronger mouth opening with dark interior insert; produced protruding dark “éclair” artifact.
- `3948-calibrated-face-v8.html`: interior recessed and hidden near neutral; not confirmed working.
- `3948-calibrated-face-v9.html`: added O Width and O Height sliders; user reports jaw reverted and lips did not open at all.
- `3948-calibrated-face-v10.html`: experimental stronger lower-lip vertex displacement; fake dark insert removed. **Not yet user-tested.**
- Viewer: https://copperisbetter-lang.github.io/Wvlrp/3948-calibrated-face-v10.html
- Source model: `3948-3d.glb` referenced by viewer.
- Screenshot tests from chat show closed/fused-looking lips and dark protrusion in V7.

## Critical diagnosis / next steps
The lips appear connected in the underlying scanned mesh. Screenshots alone cannot prove shared vertices. All current viewer approaches only deform existing mesh positions, without cutting geometry or making a real mouth cavity. The V10 change is an unverified experimental displacement, NOT a repaired lip separation. Inspect original mesh topology and create a separate copy for real upper/lower lip separation plus interior mouth geometry. Avoid adding cosmetic controls until the mouth actually opens. Validate independent upper/lower lips, jaw, O width/height, smile, blinks, neutral, and crown; ensure no eyeball movement or black insert artifact. User prefers action rather than repeated technical explanations and wants phone-friendly viewer links, not manual GitHub chores.

## Recent user request
“Save all info in recent, we will pick this back up later.”
