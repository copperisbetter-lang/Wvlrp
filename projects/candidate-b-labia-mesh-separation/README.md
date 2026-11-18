# Candidate B — inner / outer labia mesh separation

**Project status: SAVED; no separation work has been started.**  
Dedicated task: https://github.com/copperisbetter-lang/Wvlrp/issues/56  
Master work log/protocol: https://github.com/copperisbetter-lang/Wvlrp/issues/29

## Source backups — ChatGPT Library (exact canonical path)
`/WVLRP/Projects/Candidate_B_Labia_Mesh_Separation/`

Project folder contents:
- `README.md` — project scope, recovery steps, source/license warnings
- `FILE_MANIFEST.json` — SHA-256 hashes and sizes of preserved binaries and scripts
- `Anatomy_Study_Candidate_B_Original.glb` — 28,992,988 bytes, SHA256 `aa1ed637e0d220535c346dd9dd115bfbb1997252667064091bbe61ec1e0fc0ef`
- `Anatomy_Study_Candidate_B_Uncensored_Overlay_Removed.glb` — verified baseline with black CENSORED slip removed; 28,975,928 bytes, SHA256 `98c8de1b60290e26613bf2db76d599502afa0a8a6fcc93de2ba4c066f70dcb69`
- `Anatomy_Study_Candidate_B_Overlay_Removed_3D_Viewer.html` — full self-contained rotatable viewer; SHA256 `ba9d2f6a4311a7ebb7a26e984f85c87604b52a0164efb8c69516ad01e9178995`
- `Anatomy_Study_Candidate_B_Overlay_Removed_NOTES.txt`
- `scripts/inspect_labia_connectivity.py` plus censor-removal and viewer-builder scripts

**Library backup IDs:** Original `libfile_7c63025eb4248191a0328573b7b93abb`; baseline `libfile_4667c5c8d4588191a2d9c4176e6467f8`; viewer `libfile_cdc6fe6060c8819187f7cf771bfbd393`; README `libfile_c23c27552d608191ab9bcc19a16a969b`.

## Verified baseline
The black slip was a separate 16-triangle censored overlay (removed). Actual anatomy is one **connected** geometry component, spread over 9 GLB primitives with ~1,396,935 triangles and ~397,019 uniquely positioned vertices at 6-decimal stitching. **Inner and outer labia are not independent mesh objects**. No anatomical segmentation, disconnection or rigging has yet been performed.

## Next steps
1. Reopen project baseline GLB and inspect face topology for labia minora/majora.
2. Visually select inner vs outer polygons and confirm boundary with owner.
3. Plan non-destructive separation with seam cleanup and independent controls.
4. After owner approval only, create a numbered revision, verify deformation and mobile viewer.
5. Record each attempt, hash, result and viewer link in both GitHub issues; preserve originals.

## Limitations / license
Source likely RigModels listing https://rigmodels.com/model.php?manualsearch=1&view=Realistic-Anatomy-of-a-Vagina-for-Study-3d-model__4f54e3236b954b5385169df9caa40442 ; **commercial rights not verified**. The GLBs / HTML viewer are **in ChatGPT Library**, **NOT in this public repository** and not hosted on wvlrp.com.
