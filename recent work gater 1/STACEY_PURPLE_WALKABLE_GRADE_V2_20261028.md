# Stacey Lake — Purple through-path + graded lake-woods switchbacks (V2)
Date: 2026-10-28 EDT
Status: ISOLATED STAGING ONLY. Not merged into main or deployed. Owner Android visual / FPS QA pending.
Branch: `gater/stacey-purple-walkable-grade-v2-20261028`
Source: `world-creator/base-camp/stacey-purple-main-lake-spur.js`
Test: `world-creator/tests/stacey-purple-fork.test.mjs`
Workflow: `.github/workflows/stacey-purple-fork-safety.yml`

## Approved owner route, preserved
The continuous main purple trail enters from upper-left woodland, crosses *behind/above* the waterfall cliff, passes the right-hand junction, and continues out upper right. A separate, approximately 2.6 m wide packed-earth right fork descends through trees to a nearly level wooded entry close to Stacey Lake. No loop around the waterfall/cliff, no track on the beach or water, no path through the cavern. The right fork is the only downhill route to the clearing.

## New V2 work
- Kept the original 276.0 m main ridge alignment (new engineered height profile).
- Replaced the old approximately 200.6 m steep downhill spur with approximately 429.5 m contoured woodland switchback approach. The original fork and lake-side end coordinates remain fixed.
- The trail profile is computed against real V9 Stacey ground elevations with a bounded longitudinal grade of **7.8% max**, and end-of-spur limit **1.9%** on the last 10 m. Tree exclusions continue to use the same geometry and near-path mask.
- Soil tread and walking/collision heights are computed from the **same graded ground function**, with tapering earth shoulders. Underlying cave, photographic cliff, waterfall, pool, creek, beach, quests and approved lake features are not changed.
- Engineered height bounded to **3.0 m cut and 2.0 m fill** in the centerline model; cross shoulders naturally taper into existing ground. The solver throws if a route is infeasible instead of silently building a dangerous slope.
- Expanded bounds for the new wooded switchbacks only; original cave and shoreline exclusion guards still apply.

## Independent numeric check against actual unchanged V9 terrain
- Ridge main: 276.0 m; max grade 7.8%; maximum center cut 2.20 m; fill 2.00 m.
- Lake spur: 429.5 m; max grade 7.8%; maximum center cut 3.00 m; fill 0.35 m.
- Main-fork and spur-start heights match exactly (about 36.24 m in scene coordinates).
- Final 9 m of lake approach: **1.9%** max grade.
- Horizontal spur centerline min distance outside V9 dome wall approx **63.2 m**; outside shoreline approx **72.8 m**. Cross-corridor ±5.5 m numerical audit reports min dome-wall **59.4 m** and lake shore **68.3 m**, above protected bands. Main cross-corridor minimum V9 dome wall **37.2 m** and shoreline **190.7 m**.
- Numerically verified both route meshes use same walk/collision `ground()` function, and the wooded path stays inside generated terrain radius.
- Automated route/check CI configured on this new branch, pending completion. No claim yet for Android 3D rendering, forest shader/rock aesthetics, FPS, in-game walk QA, V10/V11 spring/mountain integration or future Base Camp trail connection.

## Test viewer
[Show temporary purple guide and spawn at trail](https://raw.githack.com/copperisbetter-lang/Wvlrp/729d6aefe56c332a5bb99c1f73709563ae74dd30/world-creator/base-camp/stacey-dive.html?spawn=trail&trail=guide)

[See actual packed-earth trail, no purple guide](https://raw.githack.com/copperisbetter-lang/Wvlrp/729d6aefe56c332a5bb99c1f73709563ae74dd30/world-creator/base-camp/stacey-dive.html?spawn=trail)

Both links show the **V9 cave staging base plus purple trail**, not the separate V10/V11 blue mountain/headwater branch. Integration requires Issue #29 coordination and owner confirmation. Avoid deploying or merging until visual and mobile QA.
