# Lily 2–5 • immutable export checkpoint (2026-11-03)

## Approved source
- Original user-approved seven-year-old **Lily** must remain unchanged on `archive/lily-approved-20261103`.
- Character: dusty-blonde long hair, light green eyes, same seed/proportions, 1.22 m. Technical assets contain 69 rig joints and 77 animation clips.
- **No TinyFish; no manual or homemade wardrobe.** All clothing built with Ara 3D Gen's native garment routines on the model before GLB export.
- This is not permission to copy unapproved outfits onto the master or deploy models in the playable game.

## Exports (branch `feature/lily-2-to-5-site-dressed-20261103`)
| Variant | Asset | Source clothing / meaning | Status |
|---|---|---|---|
| **Lily 2** | `Lily_2.glb` | Site-native pink floral `ankara_gown`, single-piece ankle gown with flutter sleeves, sandals; **NOT a confirmed sundress** | Candidate CI queued, pending export and owner visual review |
| **Lily 3** | `Lily_3.glb` | Site-native oversized T-shirt, cargo shorts, sneakers | Verified structural pass; pending visual review |
| **Lily 4** | `Lily_4.glb` | Technical geometry/rig, no garment objects, untextured neutral skin | Verified structural pass; do not render an uncovered child |
| **Lily 5** | `Lily_5.glb` | Site-native fatigue shirt, fatigue pants, boots | Verified structural pass; pending visual review |

## Verified checksums
- Lily 3 SHA256: `e1b988e6509ebb91c2eb71621e363a3b684a25b62e93eb3f756bbfc15b18837e`, size 16,325,196.
- Lily 4 SHA256: `a50727c3900f3cd2410c997c3850199e2af3b1f54aeccb190af87c1254e5ad24`, size 15,620,844; body 80,268 indices; zero garment meshes.
- Lily 5 SHA256: `243074e4ad76ac80672c6f717b2eda435e1e19304758e4e4c9ebf81ec64d4147`, size 16,425,552.
- Lily 2 checksum to fill **only** after successful export and QA.
- Model creation/verification reports: `LILY_NATIVE_SITE_CLOTHING_QA.json`, `LILY_4_TECH_QA.json`. Gown candidate pipeline: [Actions run 41680416469](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/41680416469).
- Original Lily, archived recovery copies, and original older three outfits are **not** to be overwritten.

## Viewers and user acceptance
- Standalone model preview added to **main** at `world-creator/character-previews/lily-20261103/viewer.html` with Lily 3, Lily 5 and **technical skeleton-only** Lily 4 (never raw uncovered mesh).
- Intended phone URL: https://wvlrp.com/world-creator/character-previews/lily-20261103/viewer.html (not yet independently verified live).
- Older original 3-model viewer: https://wvlrp.com/world-creator/character-previews/ara7/viewer.html
- New models are **not in the game** until separately integrated and approved.
- Owner rejected original cartoon garments and expects realistic site-fitted clothing. **One-piece gown is a trial only**; do not represent it as the requested genuine sundress without owner acceptance.
- For any newly approved version, record material IDs, original source commit, SHA256, all movement/fit QA, GitHub Pages preview and a GitHub Issue #29 handoff entry.
