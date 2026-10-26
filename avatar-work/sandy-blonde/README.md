# Sandy Blonde — independent adult character build

## Source and isolation

- Working copy: `sophie-1-working-clone.glb`, an **exact byte-for-byte Git blob clone** of `world-creator/assets/sophie-1-native-fit.glb` at initial checkpoint (SHA `b4e70180ac44c4e3626fcc1fcf7390cf46342b45`). This base has not yet been reshaped.
- This new character **must not retain Sophie 1's face as its final face**. Sophie 1 supplies only a high-detail editable mesh/material starting point; use its existing face geometry only as an initial sculpt surface.
- Leave original Sophie 1, other approved characters, Base Camp and live production untouched.

## Original identity to sculpt

- New adult female with **unique original face** designed for this character, not Sophie 1 likeness and not the identity of any supplied reference-photo subject.
- Expressive green eyes; soft realistic facial features, coherent face/head/neck skin and shading.
- Long straight sandy-blonde hair tucked **behind both ears**, clear of the face; separate controllable hair geometry, later wet/dry variation.
- Realistic 5'7\" body proportions to be **visually fitted to the supplied front/back/three-quarter reference photographs**, which serve only as *body proportion* targets; avoid claiming precision measurements from photo alone.
- Fitted pink bikini on separate mesh, with covered public render previews.
- Shape controls for body, face, fitting and garment; preserve skinning, usable animation behavior.

## Build/acceptance gates

1. Verify actual Sophie 1 GLB model contents and license; inspect full body and materials.
2. Preserve this byte-identical working clone as an untouched source, and produce a **new** sculpt/export from it, not an in-place overwrite.
3. Sculpt and inspect genuinely original face and hair; quality gate requires close face render plus full front, side and back renders of actual 3D model. No AI-generated portrait substituted for model evidence.
4. Verify fitted bikini and coherent body deformations in stand/walk/run/sit legs open/elbows-and-knees/swim/dive/float; performance on Samsung A17.
5. Secondary-motion and back-lying gravity controls remain proposals until bound to actual deformation bones and sculpted morphs, outfit fitted and render/pose verified.
6. Gate any WVLRP game integration on code review and approval via GitHub issue #29. **Do not claim completed/fully playable without running and inspecting.**

**Status:** exact source clone exists on isolated feature branch; new face, hair, body sculpt, rig tests and gameplay integration are *not yet complete*.
