# The Wild — 3-acre Village Grove: build-ready planting blueprint
Date: 14 October 2026 | Status: **PLANNED — NOT YET PLANTED IN LIVE 3D WORLD**

## Single-section village frame
- Game-coordinate bounding box: **X 27–159; Z 39–131 metres**, approximately **3.004 acres** (132 × 92 metres).
- Exact mapped scene landmarks: Ranger Station (93,110), Laurel's Kitchen (55,110), Mercantile & Gift Shop (131,110), fire ring (93,65).
- The existing **75-m-diameter** central circle is a protected community square: center (93,85), radius 37.5 m.
- World X/Z are game metres from Hearthside, **not GPS, deeds or real-world survey acres**.
- The existing landscape's wider northward grading and mountain corridor extend **beyond this 3-acre section**. Keep them, but do not confuse the full grading area with the planter bounds.

## Signature landmark
**One weeping willow** is planned at **X112, Z68**: approximately 22 metres high with an 11-metre crown radius. It occupies a quiet **eastern side of the central village square**, not the fire ring or the entrance path. The crown can droop toward a future bench/photo spot, but its lowest hanging branches must be safely above player routes, and the fire stays clear.

This is a cultivated, ornamental **village landmark**, not a claim that weeping willow is a native Appalachian hardwood.

**Important:** the currently working Poly Haven PBR test broadleaf stands at (109,72). It must NOT remain directly under a new willow. Keep the proven test tree until a **licensed, authentic multi-mesh, drooping-leaf willow model** has been sourced, performance tested and approved in the viewer; then replace the test tree cleanly. Do not substitute a spherical or low-poly generic tree.

## Eight planted areas — exact game-coordinate centers are exported in JS

| Build zone | Trees | Art direction |
|---|---:|---|
| West woodland edge | 18 | Oak, maple, beech, tulip poplar, hemlock, hickory; deep irregular forest |
| Laurel-side rear/outer buffer | 5 | White pine, hemlock and mixed broadleaf; keep approach clear |
| East woodland edge | 16 | Different oak/maple silhouettes, walnut, sycamore, Virginia pine |
| Mercantile-side rear/outer buffer | 6 | Mixed age classes; gently frame, not conceal, the store |
| Southwest entry gateway | 6 | Tall trunks and young understory flank the approach |
| Southeast entry gateway | 6 | Asymmetric companion woodland to the southwest |
| Northwest building transition | 1 | Young beech in a suitable open gap |
| Northeast building transition | 1 | Young chestnut oak without blocking the mountain opening |
| **Total peripheral trees** | **59** | **15 realistic West Virginia forest species; varied ages** |
| **Village-square centerpiece** | **1** | **Special giant weeping willow — separate asset** |

This is **60 total showcase trees**, before native fern, moss, leaf-litter, fallen wood, boulders, ground cover, and existing wilderness trees outside the 3 acres. The ring is not evenly gridded: larger clusters and small natural gaps keep it from reading as a tree farm. The outer section includes fewer trees immediately behind the rooflines because the north boundary leaves little ground; the visible distant forest should continue past this 3-acre section with lower LOD, never a tree wall covering the sky.

## Mandatory environment quality
1. **15 actually distinct 3D species**, not one GLB duplicated and renamed. All models must come with suitable usage licences recorded with asset provenance. At minimum acquire multiple independently shaped mature and young silhouettes for high-visibility species; preserve real variation in branching, bark, growth habit and canopy shape.
2. Preserve the current PBR reference quality (realistic bark and foliage), with proper normals, transparent leaf cards and believable grounded roots; do not re-enable the old generic prototype trees inside the show village.
3. Randomize only modest rotation and size **after** genuine mesh/species variation. No giant repeated clones next to one another.
4. Low native Appalachian understory around tree roots: ferns, laurel, rhododendron, leaf litter, moss, decayed logs, and weathered sandstone. Keep knee-height foliage along guest viewpoints; don't reintroduce head-high weeds.
5. Preserve all building frontages, porches, stairs, paths, fire safety zone and the northward mountain sightline. Peripheral tree centers are outside the 75-m-diameter square.
6. Use GLB geometry/material reuse, GPU instancing where possible, occlusion, tiered LOD and **asynchronous loading**. Keep close trees high quality; distant crowns much cheaper. The existing tree screenshot (~19–22 FPS) is a warning: a dense 60-tree collection must be benchmarked on actual phones before public launch.

## Sponsorship inspection viewpoints
- **Arrive:** (93,45) facing toward Ranger Station. Clear walkway, dramatic edge trees, recognizably different silhouettes.
- **Gather:** (93,65) near the fire ring. Willow is the immediate signature visual on the right, with fire-safe clearance.
- **Shops:** (93,88) facing north. Ranger façade stays legible with trees framing Laurel's Kitchen and Mercantile.
- **Walk around:** west edge near (50,75) and east near (136,76). Different species and age structure, close PBR bark detail, forest depth and natural underbrush.
- **Skyline:** near center south of Ranger Station looking north. Mountain backdrop stays visible behind the village.

## Build sequence and objective acceptance
1. **Asset acquisition** — 15 species with PBR assets, documented licenses; special willow asset; reject generic/low-poly impostors.
2. **Geometry pass** — fit each model in a test viewer at age-appropriate dimensions, check foliage/normal transparency, shadows and model variation.
3. **Planting pass** — install only the coordinates in `wild-village-planting-blueprint.js` using proper world height sampling; ground each trunk. Keep center circular square clear except future willow; retire conflicting pilot oak only when willow is approved.
4. **Performance pass** — compare FPS, draw calls, memory and load stalls to today's phone baseline; switch scene quality automatically when required.
5. **Sponsor walk-through** — walk all five review camera routes without a missing section, repeated obvious clones, floating trees, blocked entrances, or blocked mountain sightline.

## Integration status
The companion JS exports **planned coordinates and QA guards only**. It intentionally does **not** change the existing `walk.js` / Babylon scene or claim the trees have appeared on live phones. It can be wired to the village streaming renderer once tree assets exist and the three-acre loading manager actually owns the village meshes.

Full coordinate source: `world-creator/wild-village-planting-blueprint.js`.
