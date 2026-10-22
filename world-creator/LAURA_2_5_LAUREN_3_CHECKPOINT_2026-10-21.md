# Laura 2.5 saved; Lauren 3 working clone (2026-10-21)

The current cleaned 3D facial mesh from `laura-2-face-viewer.html` was approved as the version to preserve. Two **independent** sets of model assets and viewers were created.

## Saved, frozen snapshot — Laura 2.5
- Mobile viewer: https://wvlrp.com/laura-2-5-face-viewer.html
- Viewer source: `laura-2-5-face-viewer.html`
- Models: `world-creator/assets/laura-2-5-face/face.part00.b64` to `face.part09.b64`.
- **Never edit this model during further work**; it is the rollback checkpoint for Lauren 3.
- Forehead hair-color cleanup was done. Existing wandering eye and eyebrow remnants remain. Skin brightness may be too high, but intentionally untouched until a matching body exists.

## Working clone — Lauren 3 (name exactly as user specified)
- Mobile viewer: https://wvlrp.com/lauren-3-face-viewer.html
- Viewer source: `lauren-3-face-viewer.html`
- Models: `world-creator/assets/lauren-3-face/face.part00.b64` to `face.part09.b64`.
- **All movable-eye development must target Lauren 3 only.** Laura Original, Laura 2, and Laura 2.5 are not to be overwritten.
- Current mesh: 38,365 vertices, one connected reconstructed **facial shell**, not yet a complete skull. The GLB contains baked image-derived eye coloration, NOT separately modeled/rigged eyeballs.

## Eye work checklist — next implementation, not yet completed
1. Locate left/right socket centers in actual mesh local coordinates and establish correct camera/model orientation.
2. Create two independent real 3D globe meshes with proper iris, pupil, sclera, cornea, and socket depth. Hide/cover the photo-textured eye surfaces so eyes are not doubled or "wandering."
3. Add independently pivoting eyeballs, coordinated look-at, neutral forward alignment, lids/blinks, and mobile controls (left/right/up/down, blink, reset).
4. Keep controls and assets browser-loadable from an Android phone. Verify front, left and right, and blinking visually.
5. **Do not darken skin yet**: first compare with an attached body under the same lighting and perform a single coherent face/neck/body match.
6. Never replace/reconstruct mesh in a way that produces three separate heads again.

## Source / versioning
Input was `world-creator/assets/laura-2-face/`; each version gets its own independent repository paths. Git blob SHA reuse at the moment of cloning is intentional; files can be modified independently by path.
