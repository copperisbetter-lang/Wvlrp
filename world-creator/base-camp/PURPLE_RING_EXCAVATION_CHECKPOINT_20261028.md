# Purple Ring: real Base Camp excavation — isolated integrated preview

**Date:** 2026-10-28
**Owner request:** “Move forward with the excavation.”
**Review branch:** `gater/purple-ring-excavation-integration-20261028`
**Source parent:** Gator 2's `gator2-campsite-markers-20261023`, preserving campsite 64 relocation and all 65 site IDs.
**Production:** NOT MERGED, NOT DEPLOYED.

## Scope actually implemented
- Replaced the failed 304°–312° `prototypeGradeY` in the Base Camp **game** with `excavatedHeight()` using the independently designed 353-station smoothed `300°–344°` target.
- 206-meter cut along radius 268.224m, 2.6-meter-wide level walking tread with gently blended shoulders out to ±9m.
- 25,545 vertices / 50,176 triangles in a locally high-resolution replacement terrain mesh; old coarse triangles are removed beneath the graded patch, avoiding invisible uncut hillside overlap.
- The real `terrainY` used to update player walking height calls the same `excavatedHeight()` function as the rendered surface. Geometry sits 3.5 cm above collision height to avoid flicker.
- 7,686 batched exposed-rock shoulder triangles, **actual 14 cm depressed** drainage swales at offsets ±2.8m (built into physics height), not merely decals or floating panels.
- Existing temporary black ungraded alignment ribbon is omitted through the excavation section to show the soil/rock trail; remaining ring stays marked.
- Direct test spawn: `?spawn=excavation` or `?spawn=purple` at 322°.
- Existing 5-acre lake, campsite markers, original 52+ other world locations unchanged.

## Numeric QA and status
Dedicated GitHub Actions `Purple ring excavation geometry and walking QA` **SUCCESS**, run [40733293358](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40733293358).

The same audit was independently exercised in an isolated JS runtime:
- Core max longitudinal grade at two tread edges & center: **7.8381%** (8% target PASS).
- Core cross slope: **<0.000001%** (3% target PASS).
- Max centerline cut depth: **3.5341m**.
- 25,545 generated mesh vertices all finite; numerical discrepancy between rendered y-0.035m and player `terrainY`: **<1e-12 m**.
- Verified campsite #64 center remains ~91.776m away from the 268.224m trail ring, and lake coordinates yield unchanged terrain response.
- Exact coarse-triangle deletion audit: 430 triangles removed; **0** deleted with vertices outside fine replacement patch; **0** remaining coarse triangles with vertices in excavation area.
- New dedicated audit passed; broad inherited `World Creator Checks` suite also has unrelated pre-existing failures in baseline tests. A whole-game green CI result is NOT claimed.

## Outstanding / unsafe to approve yet
**The 298.75°–300° and 344°–345.25° short joining caps are NOT slope-certified.** The engineered tread's 8%/3% grade constraints apply within 300°–344° only. Beyond these caps the natural ring can exceed 8% longitudinal or 3% cross; do not claim a continuous fully compliant 360° loop.
No gameplay Android visual FPS, trail-to-brown-route crossings, actual collision walking trial, rock texture realism, swale outfalls, wall stability, or drainage capacity has been verified. GitHub Actions geometry audit is not a substitute for owner phone test. Work limited to isolated branch due Issue 29 freeze.

## Review
[Isolated phone preview at excavation](https://raw.githack.com/copperisbetter-lang/Wvlrp/d43a83caa67741ddb0cb2eff7ffd8ae8fc3cf47f/world-creator/base-camp/index.html?spawn=excavation)
[Exact source on GitHub](https://github.com/copperisbetter-lang/Wvlrp/blob/d43a83caa67741ddb0cb2eff7ffd8ae8fc3cf47f/world-creator/base-camp/index.html)
Test link is constructed from committed source; actual external Android loading not verified.

## Rollback
Switch back to `gator2-campsite-markers-20261023`; do not merge this isolated branch. Only `world-creator/base-camp/index.html` existing runtime source is changed. All other code/QA/record files are new, and Gator 2's original prototype lab and data were not modified.
