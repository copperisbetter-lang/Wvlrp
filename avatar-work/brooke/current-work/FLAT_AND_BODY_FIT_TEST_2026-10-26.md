# Brooke — Flat and Body Fit Test (2026-10-26)

Status: isolated planning / source identification; not built or deployed.
Working branch: gater-flat-brooke-isolated-20261026.
Target: adult character Brooke only. Preserve all Brooke originals, Sophie 1, Mona, and other characters.

## Confirmed source caveat
The current `world-creator/brooke-3-1.html` viewer loads `./assets/sophie-1-native-fit.glb`, not a verified Brooke-specific body. The 2026-10-24 Brooke 3.1 handoff says the Brooke 1.0 body asset path has not been identified. Do not substitute Sophie for Brooke silently; confirm the exact original Brooke GLB and clone it first.

## Flat (adult anatomical detail) candidate test
- Source candidates saved in ChatGPT Library at `/Recent/Test Vulva.md`: free Sketchfab full rigged model and CC0 Innerscene rigged female base. Neither candidate has yet been proven suitable as a standalone fitted anatomical mesh.
- Keep the lightweight intact base skin; load a higher-detail candidate only when clothing, pose, camera, and proximity justify it. Bikini/beach should not trigger loading.
- Validate mesh rights, extraction, surface continuity, neutral pose, correct skinning, shape keys if present, GLB export, mobile triangle budget and close-up inspection.
- No asset download, purchase, extraction, or integration claimed here.

## Breast-size adjustment — approved direction
- Make a non-destructive, moderate enlargement test on the VERIFIED Brooke body clone only; leave the original and other characters unchanged.
- Prefer existing MPFB breast-size target/shape keys if present; check whether they have been baked before relying on sliders.
- If the GLB has no usable morphs, create a Blender shape key for a proportionally adjusted bust instead of globally scaling the torso.
- Keep bilateral symmetry, natural torso transition, and existing skin weights. Check movement and collision; clothing/bikini/tops must be refitted to avoid clipping.
- Preserve a 0% original baseline and adjustable test intensity. Do not treat an unreviewed adjustment as an approved final body shape.

## Next engineering gate
1. Locate exact approved Brooke body mesh in repository / Library and verify rig, shape keys, materials and topology.
2. Clone it to a new uniquely named working asset.
3. Apply and test bust-size morph on clone; refit garments.
4. Independently inspect candidate Flat mesh before attempting integration.
5. Test mobile rendering and poses; publish preview only after actual build and validation.
