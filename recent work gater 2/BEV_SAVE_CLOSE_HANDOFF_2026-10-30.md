# Bev — saved checkpoint / work closed

**Date:** 2026-10-30  
**Project:** WVLRP / The Wild — character building  
**Owner instruction:** Save and close Bev work. No further changes until explicitly resumed.  
**Status:** PAUSED / NOT GAME-READY. No changes deployed to The Wild.

## Locked standing baseline (do not overwrite)
- **Bev R15**: `Bev_Flat03_V16D_Right_Material_Transition_R15.glb`
- **SHA-256**: `a3715e777f4e4614fe55ad16fb9b5b934b0844ad2b2180822cb10cbccc8cc0e6`
- Best accepted standing view so far; preserve the established Flat 03 fit, right-side material blend, and especially the good left seam. User directed: **leave the attachment as it is**.
- Body and attachment must NOT be recolored, re-fitted, or altered as part of future pose development.

## Animation/deformation status
- R16/R17 viewers: repeated failures including hidden lower body, inert controls, inconsistent camera labels; rejected as approved character QA.
- **R18**: separate elbows-and-knees animation test based on existing Caroline source movement. Skeleton moves, but on-phone rear-pose screenshots show major body/attachment distortion. **FAIL / DO NOT DEPLOY**.
- R18 SHA-256: `55cff18e1c13855b445ac35c3d32c5e7469c377d748939e8a0f5f602dc07d9e5`.
- **R19** isolated reweight experiment: **REJECTED**; body-join surface stretching got worse even though one part's collapse improved. **DO NOT DEPLOY / DO NOT PROMOTE**.
- R19 experiment SHA-256: `a8b4263652295dfb54b9b7835dda891bed55bf0b4d654959827c95ce557a0f2d`.

### Quantitative evidence (do not mistake for final visual QA)
| Test | Result |
| --- | --- |
| R18 attachment triangles reduced below 25% original surface area | 21.6% |
| R18 attachment triangles reduced below 10% original area | 534 |
| R18 neighboring join triangles stretched over 2× original area | 8.5% |
| R19 source collapse after rigid weight experiment | 0% |
| R19 neighboring join triangles stretched over 2× original area | 14.5% — worse |

**Root problem:** Skin weights and pose-dependent volume deformation around the pelvis/upper legs and join. Rest-pose closed edges and matching normals are not evidence of healthy deformations. Do not repeat blanket color/roughness fixes or rigid pelvis-only weight assignment.

## Resume criteria
1. Begin only from **R15 as an immutable source clone**, not R18 or R19.
2. Keep the licensed source attachment and original material backup private. **Never commit private model binaries or source textures to this public repository.**
3. Build and test skin-weight transitions with pose-specific corrective morphs (shape keys) for the existing elbows-and-knees movement, in Blender; use existing Caroline animation source as a *reference*, not a blind Euler copy.
4. Verify actual posed geometry from rear, side, rear 3/4, front, and close-up; check joint contact, surface stretching/collapse, intersecting faces, and the previously accepted left seam. Then test real on-device Three.js playback.
5. Only after visual approval may Bev be considered for master cloning, wardrobe, NPC integration, or deployment.

## Private handoff package
Chat-held private checkpoint: `Bev_Save_Close_Checkpoint_2026-10-30.zip` (~54.4 MB), saved separately from GitHub. Contains R15 approved standing source, R18/R19 failed tests clearly marked DO_NOT_USE, `HANDOFF.json`, and deformation QA log. **Not uploaded here** because it includes private licensed model assets. The user may need to attach this ZIP again if the chat session cannot access the prior attachment.

## Team boundary
Character work belongs to Gater 1/2; Gater 3 is on terrain. Preserve issue 29 bell protocol and work-closed status. No work should continue until user gives explicit go-ahead.
