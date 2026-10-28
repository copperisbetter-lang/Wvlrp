# STACEY V10 — OWNER DRAWN BLUE MOUNTAIN AND ONE SPLIT HEADWATER
Date: October 28, 2026 (2:33–2:50 PM EDT)
Status: **ISOLATED STAGING ONLY / NOT DEPLOYED / PHONE QA PENDING**
Branch: `gater/stacey-mountain-headwater-v10-20261028`
Commit: `778cfe481f14b70155ee8ebd6b8bf336cd818476`
Scene: `world-creator/base-camp/stacey-dive.html`

## Owner's drawing (authoritative)
- **PURPLE:** One wooded through-path crossing behind the waterfall canyon from upper-left to upper-right; a separate right-hand spur forks downhill to near-flat lake entrance. Not a loop around the waterfalls. Purple-path workstream owns trail geometry.
- **BLUE:** Build a **natural forested mountain** surrounding and covering the existing huge underground domed cavern and its approach tunnel, so it is NOT an exposed architectural dome or aerially visible tunnel.
- ONE slightly wide stream must emerge from rock in the mountain, flow downhill and meet ONE large boulder, fork into TWO channels, and feed the two established waterfall lips.
- Preserve V6 photographic canyon cliff, tiny hidden between-falls entrance, 84m V9 walkable cavern and quest locks, waterfall basin and creek to Stacey Lake.

## Changes staged in V10
- From V9 source `bffe44862f75a66aa53a936ab32f2fc4e6bbc38b`; single changed scene file (+95/-6 lines).
- Restored native hillside where old ground excavation was erroneously shaving off roof cover over the cavern and tunnel. Smooth exterior raised heightfield directly over the 42m radius chamber, roof-following minimum overburden = 7.3m (24ft) in samples at 2m radial / 4 degree spacing; physical walking and placed foliage call the same `ground`.
- New earthen/bedrock headwater channel support carved/fill-graded from x≈−36 to waterfall crest x≈−7.34, z centered near −240, y≈21.3 down to 12m. Two end channels align ±3.81m from the center line and existing waterfall tops. Single large natural rock splits them.
- Introduced 3 tiny stream meshes using the existing V10/V12 moving rapid-water material, a rock spring and a split boulder. Excludes tree instances from open feeder channel.
- No modifications to V6 photo chunks, original waterfall faces, V9 actual cavern shell, pond, lake/beach, creek, quests, or other Gaters' staged trail files.

## Checks
- JavaScript module body (imports removed for parse) **PASS**.
- Git compare: ONLY `world-creator/base-camp/stacey-dive.html`.
- Numerical exterior chamber ceiling clearance: **7.3m MIN** on sampled grid.
- Main stream centerline: measured water generally **0.18m above bed**, intentionally briefly buried where it emerges at x≈−36.
- Key sampled shoreline / lake terrain x≥0 unchanged from V9.
- **NOT TESTED:** Android rendering, actual V6 rock/feeder overlap, forest appearance from sky, stream animation, tunnel QA, GPU FPS, effect on planned purple trail grading.
- The hidden entry mouth is intentionally NOT capped at the last meters of tunnel.

## Coordination constraints
- Main/production freeze applies; no deployment or merge without owner seeing Android viewer.
- Gater 1 trail workstream must check exact surface geometry before merging or cutting the purple trail. Preserve cavern roof from grading and route behind spring, avoid headwater and the right lake spur.
- Avoid altering V10 on purple-path staging branch without Issue #29 reconciliation.
