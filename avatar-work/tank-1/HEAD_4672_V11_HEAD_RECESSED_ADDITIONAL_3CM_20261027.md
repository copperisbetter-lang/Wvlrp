# Tank 1 V11 — head placed further back (2026-10-27, 11:45 PM screenshot follow-up)

Owner reviewed Tank 1 V10 side screenshots and explicitly said: **"The head is still too forward, needs to come back more."** This takes priority over additional speculative neck reshaping. Latest work checked with actual Blender and separate viewer.

- V10 input: `Tank1_4672_V10_RecessedHead_Neck.blend` (owner chat local file).
- V11 new **physical** head position: move head object **another +0.030 m in Blender Y toward back**; prior V10 was +0.032 m, therefore total +0.062 m relative to V9. Z stays -0.002 m. No modification to the 4672 geometry, body or dress meshes.
- New exported, separate files: `Tank1_4672_V11_HeadFurtherBack.blend`; `Tank1_4672_V11_HeadFurtherBack.glb` 16,948,656 bytes, SHA-256 `1b1c104bd9180ed3c9df1144ebe6b5a2e06d608bfe1b3aa2cfd635723503f78f`; `Tank1_4672_V11_HeadFurtherBack_Viewer.html`, 22,605,812 bytes, standalone HTML embeds exact verified GLB binary.
- Blender export/reimport checked: one 52-bone armature, head remains part of rig; body skin original unchanged SHA-256 `b2a6ac8cd4f9febdb447368e29c76cd68410bb66e46d9dcfa2d5f75126eea8fc`.
- Rendered front, side, three-quarter images. HTML embedded hash check and `node --check` passed.
- **Important remaining defect:** imported 4672 head scan has a visible ragged lower cut that is not topologically welded to body-neck extension; the body-neck patch and dress neckline also still need corrections. V11 is a **position correction only**, not a seamless head fix or approved production asset.
- Source SAV4, Sophie 1, V9/V10 versions remain unchanged. No Flat 03 installation until head/neck approved, per owner's plan.
- V11 binary, editable .blend, viewer, screenshots delivered in ChatGPT attachments; **not uploaded to GitHub**, and no website/main deploy due issue #29 freeze. GitHub carries handoff record only.
