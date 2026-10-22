# Lauren 3 recovery after eye sculpt — 2026-10-21

User screenshot showed large horizontal strips across the 3D face after the eye-area sculpt. This is a **FAILED** experiment visually, even though the script's numerical validation passed.

Recovery: restored all ten chunk blobs in `world-creator/assets/lauren-3-face/` byte-for-byte from frozen **Laura 2.5**. Only parts 05–07 had actually diverged; no source model was lost.

- Browser viewer: https://wvlrp.com/lauren-3-face-viewer.html
- Baseline GLB SHA-256: `27931d29e5366c452af77e7d182dd4eea3f444eebcc8e660134f7aa961c6298e`
- Viewer now requires this exact GLB SHA-256 before rendering to catch stale mixed file chunks.
- Do not rerun `world-creator/scripts/sculpt_lauren3_eyes.py` on the recovered model: it caused visually unacceptable tearing.
- Frozen Laura 2.5 model and viewer remain intact.
- Eye position issue ("Wandering Wanda") is still unresolved. **Prioritize independent movable eye meshes**, calibrate fit in an isolated viewer and verify from front and side before replacing any GLB geometry.
- The eye-morph reference photo is still valid as a visual target, but the previous deformation method was unsuccessful and reverted.
