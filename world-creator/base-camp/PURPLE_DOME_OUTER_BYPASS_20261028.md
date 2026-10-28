# Purple path: NEW curved outer bypass for Stacey Massive Dome V8 — Oct 28, 2026

**Owner request:** "Do it" after confirmed severe overlap of unfinished purple circle with underground V8 84m domed cavern.

## Exact source and provenance
- This work is on isolated branch `gater/purple-dome-outer-bypass-20261028`, fork of `gater/purple-path-woodland-grading-20261028`. Main, live production, Stacey V8 assets, Gater 2 branches are untouched.
- V8 **authoritative** cave source: `gater/stacey-massive-excavated-dome-v8-20261028`, commit `e6c1c48f74e85d19a831119d180f49d7738885bf`, `world-creator/base-camp/stacey-dive.html`, room centered X −86.744253843548, Z −240, R=42m, 84m diameter; entrance tunnel roughly X −54.744..+4.756 at Z −240. Changes to V8 require re-auditing this route.
- Original circular west purple line was **inside** the new dome for approx 82m, plus 108m conflict with construction shoulders. This line has been disabled in the test scene within 185°–263.67366°, replaced with the BYPASS; ring remains unmodified elsewhere.
- Approved Stacey woods ending remains **X −29.555934, Z −266.590624** at 263.6736605° and shore clearance ≥61m.

## New actually implemented bypass
- File `world-creator/base-camp/purple-dome-outer-bypass.js`: procedural offset from original radius 268.224m: ramp outward from 185° to 230°, hold max +85m radius (353.224m) through 258°, then smoothly return to same approved forest end angle 263.6736605°.
- **Actual centerline length ~525.85m**, 2.6m walking tread, cut-only computed terrain profile and grade using actual curved centerline distances, ±9m shoulders and a ±12m working strip that tapers to ±3m near the woodland endpoint (protects both V8 dome and approved lake tree clearing).
- Side/normal projection uses the true tangent to curved path; unlike old circle, tread widths/grade are evaluated perpendicular to new curving alignment. Physical terrainHeight with cut and .11m shallow side swales is shared with rendered fine triangle mesh and player walk collision.
- New fine surface **20,143** safe terrain triangles and 2,520 trail surface triangles, all lake and dome protected triangles culled. Live Base Camp preview uses `?spawn=domebypass` / `?spawn=bypass` to start on the curve around 250°.
- `world-creator/base-camp/index.html` imports module, applies `bypassGradedHeight` after existing safe ring+913m woodland grading, cuts old low-resolution triangles only beneath safe new mesh, installs actual bypass and excludes dangerous old 185°–263.67366° circular alignment.
- New safety test `world-creator/tests/purple-dome-bypass.test.mjs` plus `.github/workflows/purple-dome-outer-bypass-audit.yml`.
- Updated simple mobile coordinate map `world-creator/base-camp/purple-path-stacey-lake-clearance-map.html` shows safe green bypass around red dome and ghosts former dangerous line orange. The approved lake geometry remains at (140,-240), and 341m lake clearing ring gap remains open.

## Independent numerical and mesh QA
- Safe core: 191°–257.67366°; length ~445.64m. **Max uphill/downhill ~7.7526%** and **max cross grade 0.0035%**, passing 8%/3% central limits. Beyond core, end transitions still require separate walking QA.
- Max cut ~0.9903m (no unnecessary deep earthwork). New path centerline stays ≥19.1659m outside V8 dome **wall**; generated **excavation surface** ≥15.5488m outside dome wall and ≥61.0189m beyond actual irregular Stacey Lake shoreline. The theoretical model's taper audit has minimum side margin 15.5506m. Guard exclusion holds 13m beyond chamber wall and 61m beyond lake shore.
- Drawn surface matches player collision to floating error ≤ 4.5e−16m in isolated JS geometry test. Full curved work strip max radial distance 353.224m inside 402.336m Base Camp radius; lower-width complete player tread unaffected.
- Deterministic interior campsite minimum path **centerline** distance ~33.2m, nearest campsite interior-17 (numerical seed ID 58); earlier 913m tested wooded section remains unmodified. Campsite 64 preserved.
- **Critical limitation:** Stacey dome and Base Camp are separate terrain scenes with non-identical terrain height functions. This is horizontal no-overlap clearance, **NOT** a geotechnical roof thickness/vertical stability survey. Actual V8 cave material/shader, water and tunnel untouched.

## QA / review
- Dedicated Actions: https://github.com/copperisbetter-lang/Wvlrp/actions/workflows/purple-dome-outer-bypass-audit.yml — reference current run ID 40742101888 (status must be checked before claiming pass).
- Working code / map in branch. RawGitHack links below are constructed from committed sources and **external Android/WebGL rendering NOT verified**:
  - Map: https://raw.githack.com/copperisbetter-lang/Wvlrp/gater/purple-dome-outer-bypass-20261028/world-creator/base-camp/purple-path-stacey-lake-clearance-map.html
  - Direct walking test: https://raw.githack.com/copperisbetter-lang/Wvlrp/gater/purple-dome-outer-bypass-20261028/world-creator/base-camp/index.html?spawn=domebypass

**Do not merge into live main until:** current CI green for new audit, actual Android gameplay visual and FPS check, approach ramp grades, cross-scene old placeholder lake/new Stacey lake migration, and confirmed cave roof bedrock cover / cave Gater handoff.

**Rollback:** switch to `gater/purple-path-woodland-grading-20261028` (older branch still has prohibited original west line; never deploy it with V8 dome).
