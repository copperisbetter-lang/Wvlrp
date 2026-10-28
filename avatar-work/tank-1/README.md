# Tank 1 — SAV4 V21 clone / dress viewer

Created 2026-10-27 at owner's request.

- `world-creator/assets/tank-1-v21.glb` is a separately named, byte-identical Git blob copy of `world-creator/assets/sav4-vulva2-native-fit.glb`.
- Source and clone SHA-1 blob: `b4e70180ac44c4e3626fcc1fcf7390cf46342b45`, 9,480,468 bytes on the source main branch.
- `world-creator/tank-1.html` is a standalone viewer cloned from the SAV4 V21 soft-edge inspection viewer. It retains V21's visual UV, normal, and edge color display corrections, without changing the underlying GLB.
- On first load Tank 1 wears a blue-green knee-length sleeveless 3D sundress with a fitted bodice, flared folded skirt, separate hem trim and shoulder straps. The clothing is removable using **Dress: on/off**.
- The garment is independently generated inside the Three.js viewer and is **a visible preview, not a rigged or saved GLB export**. Corrective pose deformations and baked cloth export are not verified.
- Full-body, front, rear, side, orbit and zoom options are present. Dress preview is for the static inspection pose.
- SAV4 V21, Sophie 1, and production assets are not modified. Separate branch only under GitHub Issue #29 freeze.

Preview: `https://raw.githack.com/copperisbetter-lang/Wvlrp/<PINNED_COMMIT>/world-creator/tank-1.html`

Testing caveat: Source and static parse can be verified, but Android/WebGL device rendering has not yet been visually confirmed.
