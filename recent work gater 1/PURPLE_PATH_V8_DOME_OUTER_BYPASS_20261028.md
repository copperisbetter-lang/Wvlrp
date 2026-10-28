# Gater Current / Recent Work — Purple path bypasses Stacey V8 Massive Dome

Date: October 28, 2026. User requested **“Do it”** to reroute original west purple path OUTSIDE cavern V8.

**BRANCH:** `gater/purple-dome-outer-bypass-20261028` (isolated staging, no main/production merge).
**Authoritative V8 cave SOURCE:** `gater/stacey-massive-excavated-dome-v8-20261028` commit `e6c1c48f74e85d19a831119d180f49d7738885bf`; room center (−86.74425,−240), radius 42m, 84m diameter. Cave scene/GLB/water/fish/quest untouched.

**CODE PATHS:**
- `world-creator/base-camp/purple-dome-outer-bypass.js` actual 2.6m wide curved trail, cut-only graded earth + .11m swales, tapered ±12m earthwork shoulder near approved woods end; shared render and player collision
- `world-creator/base-camp/index.html` integrated new 526m route, old circle line REMOVED in angle 185°–263.67366°, coarse terrain beneath safe new corridor removed, direct `?spawn=domebypass`
- `world-creator/tests/purple-dome-bypass.test.mjs` new V8 3D-footprint / 65 campsite / 61m new lake shore / grade / render walk height audit.
- `.github/workflows/purple-dome-outer-bypass-audit.yml` new CI.
- `world-creator/base-camp/purple-path-stacey-lake-clearance-map.html` updated safe green path, failed orange previous route, red 84m cave circle.
- `world-creator/base-camp/PURPLE_DOME_OUTER_BYPASS_20261028.md` detailed provenance, measured clearances, rollback.

**NUMERICAL QA DONE:** Designed curved route length **525.85m**. 445.64m core (angle191° to257.67366°) max longitudinal **7.7526%** and cross **0.0035%**, targets 8%/3% PASS; deepest ground cut **0.9903m**. Centerline stays ≥19.1659m outside V8 chamber wall, and **all physically generated mesh triangles** ≥15.5488m outside chamber wall and ≥61.0189m outside Stacey shoreline. Peak arc radius 353.224m within 402.336m Base Camp game radius. Closest campsite path centerline ~33.2m (interior-17, seeded). New surface 20,143 safe ground triangles / 2,520 soil tread triangles; rendered elevation exactly equal player collision +.035m. Preserved 913m wooded graded section and both ends of 341m lake woods gap. NO changes inside dome excluded geometry or lake.

**CI:** Initial new bypass test **PASS**, old composed-terrain source string assertion in previously authored wooded-path regression test failed due now-correct extra bypass call. Updated test to assert both `woodlandGradeHeight` and `bypassGradedHeight` and triggered full rerun: https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40742562780 . Check this run's FINAL conclusion before claiming all-green. Inherited broad `World Creator Checks` still has unrelated preexisting failures.

**USER LINKS, source committed but external mobile rendering not verified:**
- https://raw.githack.com/copperisbetter-lang/Wvlrp/gater/purple-dome-outer-bypass-20261028/world-creator/base-camp/purple-path-stacey-lake-clearance-map.html
- https://raw.githack.com/copperisbetter-lang/Wvlrp/gater/purple-dome-outer-bypass-20261028/world-creator/base-camp/index.html?spawn=domebypass

**LIMITS / NEXT:** separate Stacey V8 terrain scene and Base Camp still have different natural elevation functions and old placeholder lake; horizontal safe clearance is NOT proof of vertical roof/bedrock stability. Need Android FPS and visual walk-through, 6° approach ramp QA, actual cross-scene final integration and approval, daylight exposed rock styling. Do not change protected V8 dome and lake or merge into main until coordinated via Issue #29.

**ROLLBACK:** original accepted 913m woodland section at `gater/purple-path-woodland-grading-20261028`; that previous branch contains UNSAFE provisional western circle, so do not deploy it together with V8.
