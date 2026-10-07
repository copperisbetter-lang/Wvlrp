# WVLRP Ranger Station — implementation checkpoint (2026-10-07)

## Live page
- https://wvlrp.com/ranger-station.html
- Branch: main; GitHub Pages workflow: Publish WVLRP.
- Station 360 backdrop: assets/ranger-station-v1.webp; approach: woodland-fork.html.
- Case engine: ranger-cases.js (v4 on station, Woodland Trail, Woodland Fork, Squirrel, East Bank, Roost).
- Clicking the desk note stacks now opens seven distinct piles. Lower notes in the first pile remain locked until earlier reports are filed.

## Playable cases and field markers
- First desk pile: Where Have the Nuts Gone? (nut shells in squirrel wood), Honey, I Miss You (wax near woodland fork), Missing Pocketknife (whittled branch on woodland trail), A Worried Ranger (maintenance tag outside station). Must finish in order, with stored evidence.
- Visitor-requests pile: Missing Companion: toy is on woodland-trail.html, nighttime owl sound-direction marker only after toy, then a subsequent daylight return with an initial failed look and a careful second look. Crucial: no missing-animal clues are near the station.
- Archive pile: Bigfoot-style caller report ultimately supports bear-print explanation; fictional in-game telephone note refers to Kentucky Live Research Project.
- Maintenance pile: report the fallen trail marker.
- Remaining piles hold multiple preview papers for *future* quests. They are not yet playable.
- Field markers are subtle in-pano DOM overlays whose positions follow 360 yaw/pitch and disappear after discovery. Their visual styling can be polished further after browser QA.

## More station features
- East Bank and Roost desk monitor HLS streams wired, live status not externally verified; stream outages are separate from station code.
- Two bulletin boards: official board has local per-player assignment display; visitor board saves drafts locally only, NOT shared.
- Passport records device-local visit, filed case rewards, and foreground video playback watch time. This does NOT confer drawing entries; shared account watch-time / drawing rules not implemented.
- Lost & found has campground bell Easter egg, but campground restoration game awaits campsite implementation.
- Tiny Gator on shelf and small striped visitor are now clickable Easter eggs (no menu hints).
- Coffee cup links to coffee-room.html; exit leads to woodland fork; site menu retains camera and map links.
- Radio lamp / speech replies work; automated wildlife audio reporting not connected.

## Verification / honest limitations
- GitHub file commits and link integration checked. ranger-cases.js, ranger-station.js, ranger-scene.js passed JS parse.
- A mocked-browser test confirmed evidence-gating and correct sequential completion of all four first-pile cases.
- Live website page and script were fetched from wvlrp.com and are accessible. Full mobile and desktop click-through visual test is outstanding. Browser automation tool could not start due insufficient TinyFish wallet balance; do not claim click-through QA done.
- Backend shared visitor posting/moderation, server-synced passport/drawing entries, audio owl recording, complete future quest stacks, and camera-relay health must be separate future work.
