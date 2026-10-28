# Purple Path — Stacey Lake woodland-edge stop + restart (2026-10-28)

**Decision:** Owner explicitly said stop the purple path where woods open onto Stacey Lake and resume after the lake at the woods on the opposite side. **No path on water or beach; do not move approved lake.**

## Authoritative source and coordinates
- New Stacey Lake is defined by `world-creator/base-camp/stacey-dive.html` on protected isolated Stacey branch `gater/stacey-hidden-cave-v62-glslfix-20261028`:
  - Center (world): `x=140,z=-240` meters
  - Shore from its actual code: `outer(a)=113.797805566*(1+0.038*sin(5*a)+0.022*cos(9*a))`
  - Trees planted at least 60m from that shore (`TREE_SHORE_CLEARANCE_M=60`)
- Purple ring radius `268.224m`, 2.6m trail tread.
- Full shoreline/open-woods buffer: protect first **60m** beyond irregular lake shoreline, plus **1m safety margin** for tread.
- The 61m safety endpoints calculated from minimum shoreline distance of center and BOTH 1.3m tread edges:
  - Near-shore wooded END `angle=263.6736605°`, world `x=-29.555934,z=-266.590624`.
  - Across-lake wooded RESTART `angle=336.5114860°`, world `x=245.998957,z=-106.904757`.
  - Purple ring route is BROKEN from 263.67366° to 336.51149° (approx **341 meters** or **1,119 feet** of would-be ring). No trail/earthworks/rock mesh within 61m lake shoreline.
- Campsite 64 relocated by G2 at `(317.861,-169.010)`, remains ~**76m** beyond the new lake shore; minimum 16m past woods boundary. Campsite IDs unchanged.

## Implementation (isolated safe branch ONLY)
Branch `gater/purple-ring-lake-buffer-20261028` forked from Gater isolated excavation integration. This branch changes:
1. `world-creator/base-camp/purple-ring-excavation.js`: shoreline-aware `staceyLakeShoreClearance()`, two-entry numerical `lakeWoodlandEndpoints()`, physical excavation/swale height hard-clipped and feathered outside 61m, ground triangles clipped by all three vertices + centroid to 61m, rock geometry safety-clipped. `cutMetrics` only audits remaining dry 300°–344° portion, with lake cancellation stations explicitly excluded.
2. `world-creator/base-camp/index.html`: 2,880-step/0.125° purple route marker loop becomes packed-earth toned and stops at both woods entrances. Two small purple/stone path-end posts. Lower-res ground cutouts also protected by lake clearances. Direct `?spawn=purple` / `?spawn=excavation` now lands safely at 340° (was in water at 322°).
3. `world-creator/tests/purple-ring-excavation-integration.test.mjs`: verifies accurate new-lake geometry, exact endpoints/gap, no terrain changes inside woodland edge, no wet path, drawn triangle clearances, dry-side 8%/3% grade, campsite64 and old lake protected, and path gaps.
4. `.github/workflows/purple-ring-stacey-lake-safety.yml`: dedicated CI, **PASSED** [run 40736884525](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40736884525).
5. `world-creator/base-camp/purple-path-stacey-lake-clearance-map.html`: responsive standalone geometry-based 2D clearance overview, no external modules.
All previous G2 profile and Stacey Lake game branches preserved unchanged; main / live production NOT touched.

## Numeric results & important qualification
- New woodland endpoints: (263.67366°, 336.51149°), map gap ~341m.
- Remaining **dry portion** of former 300°–344° hillside audit: max longitudinal grade **4.873%**, cross slope **2.957%**, PASS for that limited stretch. Entire rest of dry 360° route NOT grade-certified.
- Original 206m deep-cut concept was mostly in lake/open shore. Protection removes **nearly all** of it: max remaining centerline excavation depth only **0.00345m** (3.4 millimeters). Do NOT claim the old 3.53m-deep earthwork or exposed rock cliff still exists in the protected safe design.
- Safety diagnostics: only ~10k fine terrain triangles still rendered on safely dry land; **zero exposed rock cliff faces** because deep excavation is canceled. All drawn triangles have shoreline clearance >=61m; drawn ground heights match player collision.
- The current Base Camp orientation index still contains the **old 5-acre placeholder lake at (0,-108)**. New Stacey Lake is a SEPARATE dedicated scene (`stacey-dive.html`), and its actual water has NOT been transplanted or modified. The branch protects its real source coordinates ahead of eventual scene integration. Never claim the two lake scenes have been merged.
- This is PROVISIONAL path visualization / collision, not a completed graded, visually accepted forest trail or full 360° grading; mobile graphics / FPS test outstanding. Broader inherited world CI has unrelated failures; the **dedicated lake-safety audit passes**.

## Review URLs (GitHub source verified; external Android preview rendering not verified)
[Dry trail with two woodland gaps, Base Camp review](https://raw.githack.com/copperisbetter-lang/Wvlrp/gater/purple-ring-lake-buffer-20261028/world-creator/base-camp/index.html?spawn=purple)
[Phone-readable coordinate clearance map](https://raw.githack.com/copperisbetter-lang/Wvlrp/gater/purple-ring-lake-buffer-20261028/world-creator/base-camp/purple-path-stacey-lake-clearance-map.html)

**Rollback:** Do not merge branch; previous `gater/purple-ring-excavation-integration-20261028` preserved, but **unsafe for new lake**. Future merge requires official shared scene coordinate reconciliation, reviewed brown-path connections, actual lake geometry ingestion, protected features, continuous dry route grade and Android proof.
