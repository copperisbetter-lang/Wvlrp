# Tank 1 4672 skin tone correction V2 — 2026-10-27 local build

Owner supplied three Android screenshots of Tank 1 showing a cool/gray 4672 head contrasted with warmer SAV4-family torso, plus jagged neck cut and blocky dress shoulder edges. Owner explicitly requested matching **HEAD skin color only**, preserving body color.

## Completed
- Loaded isolated editable Tank1_4672_HeadInstalled_Project.blend; generated warm-toned skin correction from 4672 original image atlas using luminance and saturation masks. Kept dark hair, eyelashes and red lip areas largely unchanged.
- Replaced **one** Image_0 head base-color image node with packed `Tank1_4672_Head_ToneMatched_Texture_v2.png`; no body node or body texture modified.
- Exported new `Tank1_4672_Head_SkinMatched_v2_Rigged_Dress.glb`, 17,234,384 bytes, SHA-256 `3ddc7cb165a3eb547898d10f678cf3ba44feb729f477b7394a7125ae658edef2`.
- Saved `Tank1_4672_Head_SkinMatched_v2_Project.blend`, `Tank1_4672_SkinMatched_v2_3D_Viewer.html` (embeds new GLB, 22,986,464 bytes) and QA closeup `Tank1_4672_Head_SkinMatched_v2_Closeup.png` to ChatGPT working container /mnt/data. They are linked from owner response but NOT uploaded as binaries to GitHub.
- Blender re-import confirmed same 52-bone rig; head attached and dress intact.
- Compared raw GLB image buffer SHA-256 prefixes: body image **before and after** = `b2a6ac8cd4f9febdb447` (identical 4,391,156 bytes), other head secondary texture also unchanged `bbe2ff8d1b229ee77f67`; only head color map changed `8a6b5431eea358fed7dc` → `1ca699726580abebfeb1`.
- Full HTML module JavaScript checked with `node --check` pass; complete 3D browser on Android not independently visually inspected.
- Main/production and approved SAV4 V21/Sophie 1 not touched.

## Not done
- Jagged neck base visible in screenshot and in V2 QA close-up **remains**; requires topology/stitching and careful skin seam correction, separate from this color-only pass.
- Dress angular straps are a separate cloth geometry issue, not resolved by texture changes.
- This remains a local SAV4-family reconstruction, not a proven byte-identical original Tank 1 body from main.
- No GitHub deployment/binary upload. Issue #29 freeze remains active.
