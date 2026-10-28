# Amanda 1.0 — Flat 03 between-thigh V6 checkpoint (2026-10-28)

Scope: private working asset and local Android HTML viewer, **not production-approved**. Original Amanda and V5 unchanged. Do not upload paid Flat 03 assets or integrated model to this public repository.

## Owner feedback
V5 phone screenshots show Flat 03 placed on protruding, light-colored skin backing in front of the pelvis rather than between upper thighs. Owner explicitly clarified intended location: **between the legs**.

## V6 geometry correction
Used original owner private V5 GLB (SHA256 `5e24907e6f2b29ab7f016fc9b3d90fa22d487c91d154b302cb08839f1ed5ae13`) to make isolated Blender 5.2.3 WIP. Removed object `Amanda 1.0 | skinmatched attached pelvic support` entirely; retained Amanda's 14,483 original-body vertices, original 52-bone armature, and existing crotch opening. Moved Flat 03 lower and inward into that opening. Mesh world-space transformation in Blender Z-up:

```python
new_z = 0.752 + (old_z - 0.81295) * 1.48
new_y = old_y + 0.038 + (0.81 - new_z) * 0.26
new_x = old_x * 1.36
```

This follows original body cut edge's front-to-back slope and positions Flat 03 between the upper thighs rather than perched on top/front. Working GLB has 11,348 imported vertices and 22,350 triangles (normal/UV splits from V5 trim). World bounding (x,y,z) [-0.02949,0.02942], [-0.09781,-0.01970], [0.67973,0.82437] meters; GLB 22,357,552 bytes. GLB SHA256 `5af7b3b628e001f43ccea915d19553df2ecafa7e23560706ac3f604d302c4047`. Local Blender working file SHA256 `d121ae6dcb3b2ab73b3e0f2316e4dcd704fe7df575441ffd22b8b0815f150ee6`. Android self-contained HTML viewer SHA256 `032f5f2cfe0b0a500956f1d0219ba068eb99ae609a18c468fb339af2b1cbe9c0`; now defaults to pelvis close-up with optional underside and neutral/upper-leg poses.

### Verification
Blender 5.2.3 LTS export/reimport passes, skinning remains on original armature; old backing and Flat V1 absent. Pose checks of exported mesh: LeftUpLeg max displacement 0.04441 m, RightUpLeg 0.04406 m, Hips 0.02595 m; 14,483-body vertices and 52 bones unchanged.

### Remaining limitations and rejected trial
V6 is NOT welded seamlessly at its perimeter to original body topology. Visual/manual QA required (gap edge, materials, several leg poses). A V7 experiment connecting the two cut-edge side boundaries with narrow skin-colored ribbons generated new horizontal straight edges in render, **was rejected**, and must NOT replace V6 or be shown as an improvement. Next iteration should address true welded topology/UV/normal blending without restoring a bulky backing plate. No main/production deployment.
