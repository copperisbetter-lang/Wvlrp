# Laura 2 - forehead texture cleanup, October 21, 2026

## Working clone
Viewer: https://wvlrp.com/laura-2-face-viewer.html
Updated assets: `world-creator/assets/laura-2-face/face.part00.b64` through `face.part09.b64`.
Preserved original and assets: https://wvlrp.com/laura-face-original-2026-10-21.html

Removed photograph-baked golden hair streaks from the forehead **on the actual GLB**, not just a generated preview. Colors are embedded as per-vertex RGBA, not PNG texture. Replaced hair-contaminated vertex RGB with smoothly sampled/feathered adjacent natural skin tones, preserving all mesh vertices and triangle indices. Protected eyebrows and kept all eye and lower-face vertex colors at y < 555 untouched. Neither movable eyes nor the back of the skull are implemented by this step.

Vertices: 38365; recolored: 9582; unchanged eye-region: verified.
Forehead mean RGB (y>=610): [183, 125, 45] before; [220, 175, 140] after.
Source GLB SHA-256: `889b17b8e5e69047806a4ffed7ccfd8121a5e58926d5c95e2a6ed22fefde044a`
Patched GLB SHA-256: `27931d29e5366c452af77e7d182dd4eea3f444eebcc8e660134f7aa961c6298e`
Viewer supports a true 3D model with genuinely different left/right views by orbit rotation.
