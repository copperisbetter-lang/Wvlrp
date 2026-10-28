# Tank 1 4672 real head transplant — local built file and QA (2026-10-27)
Owner instructed to finish replacement of Tank 1's SAV4 V21 head with uploaded 4672-3d.glb, preserving dress.

## Completed locally in this ChatGPT session
- Blender 5.2.3 successfully restored and executed.
- Recovered working 52-bone SAV4-family body and rig from owner's **private Amanda 1.0 embedded model**. This is a recovery surrogate because the exact earlier Tank 1 V21 binary could not be copied out of GitHub into the isolated local container. **Do not claim bit-identical original Tank 1 source; this is a SAV4-family rebuilt body.**
- All previous skull polygons removed from the body mesh (8,522 original head-region triangles). Removed original hair/eyes and prior Flat03 completely from the new Tank 1 file; no paid Flat03 in exported result. Preserved underlying body and 52-bone armature.
- Integrated true user-supplied **4672 head** geometry (96,510 working vertices), scaled/positioned onto neck, skin-weighted to Head/Neck bones; head actually follows armature movement. No facial expression rig exists in the 4672 original.
- Created and skin-bound a removable 3D teal cotton sundress and shoulder straps as exportable meshes. Corrected breast clipping after rendered visual inspection.
- Exported single combined **Tank1_4672_HeadInstalled_Rigged_Dress.glb** 13,163,096 bytes SHA-256 `4e5908dd318d9c73bfa37abd5f93d37e54664597ab498d3e1f8f0c884416c7d0`; editable **Tank1_4672_HeadInstalled_Project.blend**.
- Built standalone inline-model HTML viewer **Tank1_4672_INSTALLED_3D_Viewer.html** (17,558,024 bytes) with orbit, zoom, front/side/back/face, dress toggle, bone head turn/tilt.
- Ran Blender GLB round-trip: exact one 52-bone skeleton, 96,756 imported replacement-head verts, real armature modifiers for the new head and dress, remaining body 10,053 verts, head bounds Z 1.415 to 1.676m, dress Z 0.590 to 1.368m.
- Actual bone pose check: 0.20 rad rotation of mixamorig:Head displaced sample head vertex 14.57 mm; did **not** just display floating head. Final standalone viewer JavaScript passed `node --check`; embedded binary was decoded and hash matched the exported GLB.
- Blender front render inspected and dress clipping fixed. No Android/WebGL browser end-to-end session completed; neck seam has visible small artifacts in static close-up, requires cosmetic finishing for production quality. Dress is lightweight rigged cloth, **not cloth physics**.
- Original SAV4 V21, Sophie 1, Amanda, and old Tank 1 assets remain unchanged.

## Scope / deployment
All GLB/.blend/.html artifacts above are downloadable **conversation attachments, not yet present in GitHub or wvlrp.com**. The GitHub connector cannot upload 13 MB binary artifacts from the local container in this chat. This MD checkpoint on isolated branch records exact checksums and work. Do not claim deployed/live game asset. Issue #29 production freeze remains in force.

## Next steps when asset transfer available
Transfer the completed GLB and viewer assets to a designated new path on an isolated branch, test Android visual skin/neck during pose motions and inspect the neck seam, then coordinate production release with Gater 1 before merge.
