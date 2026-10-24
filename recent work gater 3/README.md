# RECENT WORK — GATER 3

Owner: Gater 3 (Stacey Lake). Last updated: 2026-10-23 20:06–20:30 EDT (approximate; exact commit timestamps in GitHub history).

## VERIFIED LINKS — DO NOT GUESS
- GitHub repository: https://github.com/copperisbetter-lang/Wvlrp
- Base Camp source: https://github.com/copperisbetter-lang/Wvlrp/blob/main/world-creator/base-camp/index.html
- Base Camp URL: https://wvlrp.com/world-creator/base-camp/ (known project route; NOT verified as the current independent water lab)
- Stacey water shader: https://github.com/copperisbetter-lang/Wvlrp/blob/main/world-creator/base-camp/stacey-water.js
- Water shader change commit: https://github.com/copperisbetter-lang/Wvlrp/commit/d7bb663999fe3316b548ab79513646bca6006c3b
- Coordination / handoff: https://github.com/copperisbetter-lang/Wvlrp/issues/29
- Screenshot browser host: https://raw.githack.com/ — **not a full lake viewer link**. Never present this host alone as a viewer URL.

## CRITICAL LINK GAP
The screenshot dated Oct 23, 2026 ~20:06 EDT shows title **STACEY LAKE · INDEPENDENT WATER LAB**, overlaid on THE WILD · BASE CAMP; the address bar shows only raw.githack.com, not the full URL. The current independent-water-lab HTML path has NOT been verified. Find it from repo history/commits before offering a viewer link. Do NOT conflate with legacy stacey-lake.html or the Base Camp route.

## OWNER FEEDBACK / COMPLAINTS
- Oct 23 ~19:18–20:06 EDT: Existing new lake with island must be retained; older lake must not be used.
- Water movement improved and became smoother; earlier movement was too fast.
- Ripples remain too small; user wants higher-definition water, sun glare, realistic wavelets and subtle half-inch shoreline breaks.
- Breaks previously looked artificial; latest current build has **NO breaks visible**.
- Latest screenshot: visibly straight-edged/rectangular water-to-shore transition and weak shallow-water blending.
- Oct 23 ~20:xx EDT: User frustrated by repeated loss of correct viewer URLs. **Gater 3 must maintain this file with exact verified links, dates, times, user complaints, updates and commit hashes for every change.**

## CHANGES / VERIFICATION
- Oct 23 ~20:xx EDT: Inspected main branch world-creator/base-camp/index.html; it currently does not import installStaceyWater and says legacy water meshes were removed. This does NOT prove the independent water lab uses the same entrypoint.
- Oct 23 ~20:xx EDT: Changed world-creator/base-camp/stacey-water.js with foam crest shader logic; commit d7bb663999fe3316b548ab79513646bca6006c3b. **NOT verified live; shader may not be connected to active lake.**
- Pending: identify precise independent water lab entrypoint and full raw.githack.com URL; inspect actual water mesh, shader, UVs, and shoreline distance; implement and test real breaks. Avoid touching Gater 2 trails, Gater 1 avatars, island, lake terrain or old lake.

## OPERATING RULE
Before each future lake modification: append timestamp, exact URL, current complaint, planned correction. After: record actual changed paths, commit SHA, build status, verified test URL, observed result, remaining defects. If no live verification, explicitly mark UNVERIFIED. Coordinate conflicting work through issue #29 before deployment.

## LINK RECOVERED — 2026-10-23 ~20:xx EDT
**Correct island lake:** isolated independent water lab, NOT main Base Camp.
- Last verified published viewer in issue #29: https://raw.githack.com/copperisbetter-lang/Wvlrp/ca17fb95f5994bea6d2f4e301133befa41860cef/world-creator/base-camp/water-lab.html?spawn=lake
- Latest known shoreline-breaks commit in issue #29: af6b9bc13fcc629ed9ae77b39dafd14356646840; viewer candidate (not phone verified): https://raw.githack.com/copperisbetter-lang/Wvlrp/af6b9bc13fcc629ed9ae77b39dafd14356646840/world-creator/base-camp/water-lab.html?spawn=lake
- Isolated branch: gator3-stacey-calm-water-20261023
- Actual renderer: world-creator/base-camp/stacey-water-lab.js; viewer: world-creator/base-camp/water-lab.html; lake geometry: world-creator/base-camp/stacey-lake-v3.js.
- Earlier main-branch stacey-water.js edit d7bb663 is NOT the active independent lab renderer. Do not mistake it for the current island build.

## OWNER DIRECTIVE — 2026-10-23 (time not independently verified)
Owner explicitly requires: **BEFORE any additional tweak, consult this log. AFTER EVERY SINGLE TWEAK, immediately update this log with the exact working/test URL, source paths, commit SHA, complaint, correction, status, and date/time.** No batching changes and no relying on chat memory. This logging is higher priority than additional water improvements.

### Current pinned island-lake links
- **Primary / most recent recorded island-water build** (commit af6b9bc13fcc629ed9ae77b39dafd14356646840; phone display still needs confirmation): https://raw.githack.com/copperisbetter-lang/Wvlrp/af6b9bc13fcc629ed9ae77b39dafd14356646840/world-creator/base-camp/water-lab.html?spawn=lake
- **Prior known water-lab build** (commit ca17fb95f5994bea6d2f4e301133befa41860cef): https://raw.githack.com/copperisbetter-lang/Wvlrp/ca17fb95f5994bea6d2f4e301133befa41860cef/world-creator/base-camp/water-lab.html?spawn=lake
- **Active isolated branch**: gator3-stacey-calm-water-20261023
- **Correct viewer**: world-creator/base-camp/water-lab.html
- **Correct shader**: world-creator/base-camp/stacey-water-lab.js
- **Island/lake geometry**: world-creator/base-camp/stacey-lake-v3.js
- **Coordination**: https://github.com/copperisbetter-lang/Wvlrp/issues/29

### Status
This entry is a documentation-only update. No water code changed in this step. Latest shore-breaks code remains unverified on owner's phone. Do not treat main-branch stacey-water.js as the independent island lab.

## PRE-TWEAK RECORD — 2026-10-23, exact local time unavailable
Owner authorized further Stacey Lake improvements. Active issue: no visible shoreline breaks, tiny ripples, weak sun reflection. Target isolated `gator3-stacey-calm-water-20261023`, `world-creator/base-camp/stacey-water-lab.js`. Planned: make intermittent shore crests more visible by varying foam patches across world space and tapering at both island and outer bank; do not touch geometry. Baseline viewer: https://raw.githack.com/copperisbetter-lang/Wvlrp/af6b9bc13fcc629ed9ae77b39dafd14356646840/world-creator/base-camp/water-lab.html?spawn=lake . Status: pending isolated shader change and phone test.

## TWEAK COMPLETED — 2026-10-23 (exact time unavailable)
- Owner instruction: improve Stacey Lake, and **log every tweak immediately**.
- Complaint: no visible shore breaks; previous foam weak/artificial.
- Changed: isolated branch `gator3-stacey-calm-water-20261023`, `world-creator/base-camp/stacey-water-lab.js` ONLY.
- Commit: `2e1c0d8473bbb6fbeba46768bc1b89f9a899cd12`.
- Change: broadened nearshore fade, added two slower staggered small wave crests, world-space patch modulation, brighter but translucent foam. Both island and outer bank addressed through aLakeT. Island/lake geometry, trails and production untouched.
- **New exact preview link (NOT yet verified on phone):** https://raw.githack.com/copperisbetter-lang/Wvlrp/2e1c0d8473bbb6fbeba46768bc1b89f9a899cd12/world-creator/base-camp/water-lab.html?spawn=lake
- Status: committed; owner phone visual check and performance check PENDING. No production merge.
- Issue #29 bell check-in comment ID 6377583309. Await Gater 1 review for any production integration.
