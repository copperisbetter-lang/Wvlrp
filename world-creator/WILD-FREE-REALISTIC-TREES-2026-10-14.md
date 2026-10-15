# The Wild — chosen FREE realistic tree models
Date: 2026-10-14
Status: **SOURCES SELECTED — SKETCHFAB DOWNLOADS / GAME INSTALL NOT COMPLETED**

## Selection rule
Choose actual author-created, photo-/PBR-textured, green-summer tree geometry with distinct branching and crown silhouettes, usable in a browser game. Reject generic procedural models, tropical substitutes masquerading as West Virginia natives, brown autumn textures, and high-poly cinema models without viable LODs. Preserve existing successful green foliage, interesting irregular bark, and the already tested village scene while building a separate import QA path.

## Selected free CC BY 4.0 source models (attribution mandatory)
| Priority | Actual source | Artist | Trees/forms | Source |
| --- | --- | --- | --- | --- |
| 1 | Maple trees pack (lowpoly, game ready, LODs) | LOLIPOP | 12 models, distinct sizes, bark/branch PBR textures, several LODs | https://sketchfab.com/3d-models/maple-trees-pack-lowpoly-game-ready-lods-b5d2833c258f4054a01ee2b4ef85adf0 |
| 1 | Pine trees pack (lowpoly, game ready, LODs) | LOLIPOP | 15 actual models, pine branching and needle silhouettes, multiple LODs | https://sketchfab.com/3d-models/pine-trees-pack-lowpoly-game-ready-lods-e1e9c07b8e2e445c943fec660beefba2 |
| 1 | Realistic Fir Trees Pack (LODs, gameready) | LOLIPOP | 3 size models, detailed bark/branches, LODs | https://sketchfab.com/3d-models/realistic-fir-trees-pack-lods-gameready-f58e8b6d733e4b0586e5b7db847b89e7 |
| 1 | Five Birch trees pack (lowpoly, LODs) | LOLIPOP | 5 silver-birch forms; visually different but **not the WV river-birch species** | https://sketchfab.com/3d-models/five-birch-trees-pack-lowpoly-lods-08fe5117138e4fdaa7ca440ef1201e07 |
| 1 | Oak tree | massive-graphisme | An independent textured oak form with ~7,100 triangles | https://sketchfab.com/3d-models/oak-tree-3dc59560f2d24345bdbe65c44636453b |

**Download caveat:** Sketchfab's official download requires an authenticated Sketchfab account/token, even for free downloadable CC-BY models. Do not bypass account authentication or claim that providing a URL means the file exists in our repo. The selected original zip/glTF files are NOT installed; do not mark the village as diverse or publish a scene using imaginary GLBs.

## Licensing / attributions for future live use
- "Maple, pine, fir and birch 3D tree models by LOLIPOP (https://sketchfab.com/lolipop_1707), licensed under Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/)."
- "Oak tree 3D model by massive-graphisme (https://sketchfab.com/3d-models/oak-tree-3dc59560f2d24345bdbe65c44636453b), licensed under Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/)."
These source attributions must appear in visible project credits **when the assets are installed/published**. Include any modifications attribution as the license requires.

## Integration checklist once authentic files are available
1. Obtain original downloadable glTF archives via account-authorized Sketchfab download. Verify each archive's model files, actual mesh counts and material textures; save sources and author/license manifests.
2. Isolate each tree model from collection scene; exclude scene backgrounds, duplicative LOD layers and billboard cards. Do not treat each LOD of one tree as a different species.
3. Build optimized local GLB per individual tree, preserving transparency, PBR bark, healthy summer greens and geometry; generate mobile-distance LOD tiers as needed.
4. Verify unique asset hashes, different crown silhouettes and no unsupported model/texture dependencies.
5. Extend `wild-village-pbr-grove.js` to use validated GLBs in the existing 59 tree placements; don't replace the working tree scene before imports pass tests. Prefer correctly shaped oaks/maples for the most visible village-edge trees, conifers on outer slopes, birches on wetter edges. Silver birch = visual surrogate only, not certified WV river birch.
6. Check actual browser HUD/`window.__wildDiagnostics()` and screenshot from mobile. Record the number of **real distinct loaded assets**, not the planned 15 species names.
7. Continue sourcing *genuine* West Virginia tulip-poplar, American beech, shagbark hickory, river birch, eastern hemlock, and drooping weeping willow; the five chosen packs do NOT cover those exact botanical species.

### Current asset integrity
The already installed Poly Haven PBR sources (existing `assets/village-grove-sources.json`) remain unchanged. This document is a selected purchase-free import set, NOT proof of download, installation, successful CI, or visible new trees.
