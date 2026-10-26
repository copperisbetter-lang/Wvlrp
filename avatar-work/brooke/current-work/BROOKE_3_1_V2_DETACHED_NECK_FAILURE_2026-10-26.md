# Brooke 3.1 — Corrected Fit V2 screenshot FAILURE (2026-10-26 13:11 ET)

## User-observed evidence
Screenshot of `brooke-3-1-inspector.html` on Android (header "Brooke 3.1 · Corrected Fit V2") shows:
- Large vertical gap: replacement 3948 scan/portrait bust floats above open body neck, not physically joined.
- Flat rectangular lower edge is baked into imported head/bust scan; resembles a cut-off photograph bust rather than a complete head/neck.
- Shoulder/torso appear visible in V2, but neck ring is exposed with jagged cutoff and skin mismatch.
- UI says 64 bones and 10 facial sliders; these counts do **not** validate fit, rig hierarchy, facial shape quality, mouth interior, or posed continuity.

## Verified source inspection
- Inspector root `brooke-3-1-inspector.html` loads `avatar-work/brooke/second-chance/brooke-3-1-3948-rig-experimental.glb` (36,847,604 bytes). It is an *experimental* model.
- Build script `avatar-work/brooke/second-chance/build_3948_swap.py` removes original head with vertex-group threshold and places the new scan using a hardcoded 0.29 scale and hardcoded translation `(.0118137358, 1.708908886, .0253151481)`, without geometric neck-boundary registration or mesh connection.
- The script raises the scan crown but does **not** remove the photogrammetry bust pedestal / rectangular bottom edge.
- Export report records original body base 14,483 verts, removed 4,342, remaining 10,141. Its own `not_verified` list includes neck seam, skin color match, pose quality and phone viewer.
- A working bone and morph count does not certify a working merged avatar.

## Repair required before release
1. Preserve Brooke 1, Sophie 1, Mona, 3948 source, and this V2 artifact; work in a new version only.
2. Diagnose scan geometry in canonical head coordinates, and surgically separate *actual head and desired hair* from the baked rectangular shoulders/pedestal. Do not conceal the pedestal with camera framing.
3. Locate actual surviving body neck boundary from boundary edges, transform both assets into a single coordinate frame, and fit scale, pivot and neck positioning to that physical boundary, never a guessed absolute y offset.
4. Construct a proper watertight or topology-preserving neck/shoulder transition with matched skin material/UV and normals; ensure head follows existing neck bones during body poses and facial bones follow head transform. Do not rely on a detached independent rig.
5. Verify front/profile/back/head close-up screenshots **and** jaw open, smiles, blinks, sit, bend over, and elbows/knees poses without tears or head drift.
6. Change release UI so it cannot describe this V2 as "Corrected Fit" without passing a visual neck-fit gate.
7. Publish a new V3 viewer only after build, GLB validation, real phone-oriented screenshot and motion tests pass.

**Status:** Broken and confirmed by screenshot; no repair yet verified. Do not resend V2 as corrected.