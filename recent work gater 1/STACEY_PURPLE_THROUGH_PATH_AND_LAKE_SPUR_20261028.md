# Stacey Lake — Owner drawn continuous Purple Path + separate lake spur (Oct 28, 2026)

## Authority / owner correction
Owner posted purple markup of Stacey Lake aerial image (uploaded as 5849.png in ChatGPT conversation). The earlier “purple path turns down to the lake” sketch is superseded. The MAIN trail runs LEFT TO RIGHT across the higher hillside BEHIND the twin waterfall cliff, passes straight through a right-hand junction, and CONTINUES into forest at upper right. A distinct Y/T branch bends downhill to the RIGHT of the falls, ending at the wooded opening near Stacey Lake. Owner clarified ground near the lake entrance is almost level: make terminal approach near-level, not a ramp. Do not lay trail on beach, water, canyon rock, or cavern roof.

## Implemented isolated V9 Stacey 3D scene
- **Branch:** `gater/stacey-purple-through-path-lake-spur-20261028`, from `gater/stacey-dome-v9-seams-trees-20261028`. Production/main untouched.
- **New:** `world-creator/base-camp/stacey-purple-main-lake-spur.js` with independent ridge through-trail and forked lake spur; 2.6m soil tread following native walkable terrain and safely faded grading (max 2.7m excavation; no fill), transparent optional magenta test guide.
- **Integrated:** `world-creator/base-camp/stacey-dive.html`: original ground function retained as `naturalGround()`; working `ground()` wraps local grade so visible soil and player collision have the SAME height. Clear tree placement only under trail without reducing woods elsewhere; original V9 dome/rock GLB, cave tunnel, waterfall, creek, lake and underwater quests untouched.
- **Guide:** open `?spawn=trail&trail=guide` for aerial magenta route, or `?spawn=trail` for natural packed-earth trail. Normal beach/canyon/aerial buttons work unchanged.
- **Tests:** `world-creator/tests/stacey-purple-fork.test.mjs` plus isolated CI `.github/workflows/stacey-purple-fork-safety.yml`. GitHub workflow run status not independently confirmed here.

## Direct links
- [Aerial route approval / magenta test guide](https://raw.githack.com/copperisbetter-lang/Wvlrp/7f5383239e436bcf66a925ff8acaa176afb1c1b0/world-creator/base-camp/stacey-dive.html?spawn=trail&trail=guide)
- [Actual soil route without guide](https://raw.githack.com/copperisbetter-lang/Wvlrp/7f5383239e436bcf66a925ff8acaa176afb1c1b0/world-creator/base-camp/stacey-dive.html?spawn=trail)

## Independent code-ground numerical audit
Actual V9 elevation function evaluated against staged route points:
- Main continues **~75m past fork**, full main route **~276m**; spur **~200.6m** and is separate from main.
- At *all* 2-sided 5.5m soil shoulder samples, closest horizontal distance from V9 underground dome wall **≥37.1m**, from actual Stacey Lake shoreline **≥69.2m**. Shore must remain ≥61m; dome shell + 13m buffer must remain protected. NO sampled protected footprint conflicts.
- Terminal lake approach **last 8m ~1.8% grade**; tail cut ≤2.23m, gradual feathering.
- **IMPORTANT NOT DONE:** The middle lake spur is still steep: up to **39.8%** in point-by-point terrain grade; this is an **alignment/limited grading STAGING viewer**, NOT an approved accessible road-grade trail and NOT a safe 8% slope. Continuous ridge route max ~14.7%. Need larger contour-following switchbacks or fuller earthworks in later design and player QA before merge. Do NOT claim 8%/3% grading compliance, visual screenshot approval or Android FPS.
- Note old Base Camp ring/bypass staging is a different scene and remains unmerged; this new V9 Stacey layout is the owner's *latest* path intent but source alignment is visually estimated from a perspective screenshot, not surveyed XYZ coordinates.

## Coordination
Post all work to GitHub Issue #29. Keep production/main freeze and separate G1 Base Camp ring work intact. Next: owner Android aerial inspection, lake-spur slope engineering, collision walk-test, clearance plus full scenery render before integrating with shared Base Camp route. No automatic merge.
