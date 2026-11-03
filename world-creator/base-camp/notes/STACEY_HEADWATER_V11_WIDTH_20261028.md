# Stacey V11 — Wide incoming mountain stream, two smaller outgoing feeds
Date: October 28, 2026
Status: **ISOLATED STAGING ONLY — Android aerial/canyon QA needed**
Branch: `gater/stacey-wide-headwater-v11-20261028`
Parent: `gater/stacey-mountain-headwater-v10-20261028`
Scene: `world-creator/base-camp/stacey-dive.html`

## Owner's V10 screenshot defect
The single stream emerging from the mountain looked too thin relative to the two streams leaving the boulder. Preserve **one mountain source → one central boulder → two narrower waterfall feeds**.

## V11 correction
- Source-water strip widens from V10 **4.4→4.1m** to **8.8→8.2m** before the split boulder.
- Downstream two water-strip widths finish at **2.5m and 2.6m**; V10 was **2.5m and 3.0m**. Total pair at lip = 5.1m, less than the 8.2m upstream trunk. Each downstream strip is smaller than upstream.
- Natural source opening radius increased **2.5→4.6m** and rock ring scaled to its lip, to avoid a huge river emerging from a tiny hole.
- Actual `mountainGround` eroded bed widened to 4.5m half-width for trunk; channel/bank half-width tapers to 1.45m bed for each split stream. Bed/channel follows same geometry as water to limit floating/buried stream edges. Boulder's existing location and size unchanged.
- Preserve unchanged V10 mountain roof cover, V9 cavern, hidden door/locked quest, approved V6 rock GLB, two waterfall sheets, shared pond, creek, Stacey Lake, spawning, shoreline, and UI.
- Source diagnostic `window.staceyHeadwaters` now exposes trunk and waterfall-feed widths; status identifies V11.

## QA and integration constraints
- GitHub diff vs parent after first scene commit: **only Stacey HTML (15 additions, 8 deletions)**.
- Static source checks pass: one trunk, two branch strip generator, spring mouth, real bed taper, boulder, cavern, V11 status.
- Width invariant: 8.2m > 2.5m + 2.6m = 5.1m.
- **NOT VERIFIED:** actual Android aerial image / water animation, walking on crest, interplay with G1 pending purple main trail and lake spur, final render FPS.
- No main/production deploy. Coordinate source integration with G1 Gater workstream on Issue #29. The G1 through-trail branch and this V11 mountain branch are sibling staged changes from V9 and must be consciously composed, not overwritten.
