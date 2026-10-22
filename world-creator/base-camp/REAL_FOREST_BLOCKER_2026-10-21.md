# The Wild 2 / Base Camp — REAL FOREST NOT COMPLETE
Date: 2026-10-21
Status: BLOCKED ON VERIFIED REAL TREE ASSETS AND PHONE VISUAL QA. Do NOT mark forest approved or photorealistic.

## What the user actually sees
User confirms the trees still look generic and Base Camp navigation remains slow. Treat this as an unpassed visual + performance acceptance test, not as a finished forest.

## Repository inspection
- `base-camp/real-forest.js` currently repeats 3 GLB sources: `village-oak-detailed.glb`, `village-pbr-tree_small_02.glb`, `village-pbr-fir_sapling.glb`. PBR texturing is not proof of realistic WV tree anatomy or visual variety.
- `world-creator/WILD-FREE-REALISTIC-TREES-2026-10-14.md` records realistic tree packs only **selected**, with Sketchfab downloads **not installed**. Do not falsely claim these sources are live.
- `world-creator/wild-master-forest-registry.js` references 12-maple test pack in original Wild, NOT installed as Base Camp trees. It is low-poly and cannot automatically be treated as photorealistic.
- `real-understory.js` is disabled by default on phones because the green-fence/opaque-card appearance and mesh density were unacceptable. Do not restore it as a shortcut.
- The lake, island, beach, paths, ~41 outer clearings at 200-ft arc spacing, interior clearings, and dynamic sun are separate approved design constraints. Preserve them.

## Visual acceptance — no generics
Use the user's approved WVLRP forest/village references: a believable sunlit West Virginia hardwood landscape with mature oaks/maples, beech, hickory, tulip poplar, hemlock, varying crown heights and spacing, gnarly detailed bark, branches from trunk to crown, true leaf silhouette, mossy rocks, fallen trunks, realistic undergrowth below camera height and irregular forest floor. No fake conical trees, green flat rectangles, procedural polygon balls, trees whose small crowns are enlarged into massive leaf walls, synthetic monoculture grid or copied low-poly showpieces.

The definitive acceptance test is a **real mobile screenshot** at walking height showing near, midrange and distant trees from multiple angles. Record true installed source model IDs, not desired species labels. Verify rights/licensing, source files and materials before marking a species installed.

## Performance acceptance — fix the renderer, not by erasing the forest
- Keep a deterministically placed full circular-world tree map, but instance only visible nearby trees and progressively lower-detail trees with distance; implement actual LOD (geometry/texture), not just fewer copies of the same heavy GLB.
- Current commits: spatial cell index avoids scanning the full 5,700-tree map on turns; mobile GLB decoding staggered; off-screen instance batches frustum-culled and bounds refreshed; adaptive mobile render resolution degrades before thinning trees; elapsed movement dt no longer hard caps at 50 ms.
- Next: profile real phone **FPS, draw calls, triangle count, GLB download size, texture memory, and shader/fill rate** during walking *and* looking around. Watch for 1%-low frame time spikes when changing sector.
- Validate geometry scales and material alpha; never accept square opaque foliage cards or invalid GLB bundle origins.
- Use distance-based native canopy LODs and natural overlap; preserve some broad forest coverage at every view direction. Avoid costly repeated updates on every turn.
- Target responsive walking and camera panning with no visible stalls on user's Android device, then improve quality without breaking that baseline.

## Release gates
1. Show verified licensed actual WV-representative tree assets as separate mobile preview specimens; get visual approval before bulk planting.
2. Create optimized near/mid/far model variants and test them individually on the Android viewer.
3. Replace placeholders in Base Camp incrementally, preserving campsite/lake/tree-exclusion geometry.
4. Confirm FPS and screenshots before promoting to main viewer. A clean code commit is NOT proof of successful deployment or mobile QA.
5. Do not call this `photorealistic completed` until the user approves the visible result.

Existing original The Wild game and all avatar work remain untouched.
