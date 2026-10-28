# Purple path × Stacey Lake Massive Dome V8 — engineering conflict checkpoint

**2026-10-28. Scope: check only, no terrain/model changes to dome and no production deployment.**

## Authoritative versions
- Dome: `gater/stacey-massive-excavated-dome-v8-20261028`, commit `e6c1c48f74e85d19a831119d180f49d7738885bf`, `world-creator/base-camp/stacey-dive.html`.
- Purple route: `gater/purple-path-woodland-grading-20261028`, `world-creator/base-camp/index.html`, `purple-woodland-excavation.js`, `purple-ring-excavation.js`.
- New Stacey Lake is centered `(140,-240)` with approved 61m shoreline/woodland split. No plans to move it.

## Exact V8 cavern measurements from executable source
- Compute `fallShore = CX - outer(PI) = 28.70574615645` meters; tunnel mouth center `hiddenCave.x=fallShore-51+19.55=−2.74425384`.
- V8 dome center `chamberX=hiddenCave.x-84=−86.74425384`, `z=−240`, **radius 42m** (84m diameter / 276ft). Stone floor `y=−3.85m` in Stacey's own world; 8m sidewalls + 24m roof canopy ≈32m interior roof height (roof apex world y≈28.15m).
- Hidden entrance corridor extends x approximately **−54.744..+4.756** at z≈−240 with 2.64m width. Centerline of route does not directly intersect this tunnel, but protect its roof/entrance too.

## Conflict proved in X–Z horizontal coordinates
- Purple route is circular radius **268.224m** (2.6m tread); wooded end nearest lake at angle 263.6736605°.
- Closest purple route centerline to V8 chamber center: **13.02885m** at ring angle **250.1284°**, i.e. **28.97115m INSIDE** 42m dome radius.
- Centerline overlaps chamber footprint from **241.380° to 258.885°**, **81.95m / 269ft** of route.
- Including existing **±12m planned earthwork geometry corridor**, potential interference spans approximately **238.635° to 261.625°**, **107.63m / 353ft**.
- **This does NOT overlap the newly graded 913m/3,000ft woodland section, whose arc is 350°–545° (wrapped to 185°)**. It overlaps the STILL UNGRADED 185°–263.67° western approach. Do not characterize completed graded section as interfering.

## Decision / constraints
- **RED HOLD: No excavation in the 238°–262° western purple path approach, no path approval through the dome.** The ring line is still only a provisional ground marker there.
- Earlier 61m new lake shoreline buffer protects the lake but **does not protect the new inland V8 cavern**; belowground protection is separate.
- Need a separately engineered OUTER-HILLSIDE reroute around the dome, preserving its 42m chamber + suitable bedrock/roof-cover margin and construction corridor. Check other cave/tunnel coordinates, campsites, lake buffer, max 8% longitudinal grade and max 3% cross-slope. Do not choose final buffer or route based on 2D proximity alone; vertical terrain elevations in the Stacey and Base Camp viewers are NOT yet the same physical heightfield.
- No approved game change required to protect already-built 913m section. Keep live game, new lake, dome V8, quest gate, all character assets untouched.
- Visual map on this branch: `world-creator/base-camp/purple-path-stacey-lake-clearance-map.html`, now shows dome circle and orange danger band.

## Next action
Coordinate Gater 1/Gater 2 with Stacey dome lead on Issue 29 before any excavation near the west lake woods. Survey an outer-side bypass with actual vertical bedrock cover/cave collision and campsite avoidance; owner visual approval required. This checkpoint supersedes older V7 14m dome measurements.
