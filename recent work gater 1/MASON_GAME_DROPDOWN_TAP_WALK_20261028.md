# Mason — Game options dropdown, third-person & tap-to-walk minimap (Oct 28, 2026)

## Owner instructions
- Mason remains the default playable MakeHuman/MPFB character at Stacey Lake, with third-person chase camera available.
- Move all in-game action buttons to a compact dropdown.
- Keep the joystick visibility toggle outside the dropdown.
- Always show a top-left minimap. A minimap tap should walk Mason to the selected world location automatically; manual joystick/keyboard input cancels walking.

## Staged implementation (NOT deployed)
Branch: `gater/mason-dropdown-tap-to-walk-20261028` derived from immutable third-person game checkpoint `b0e7799189b5ac9c2658123f294d7b3ac6c7df81`.
Source checkpoints: dropdown+navigation `eebbbaa10f6e00c50c220f7d3875db6a7cc58126`; map sampling optimization `d421862b9028a7aadd659c6d51802f67a6b303d7`; stop-walk control `222614ab88a7f901d45075bb207ca46d244b78ce`.

Changed:
- `world-creator/base-camp/stacey-dive.html`: dropdown holds Run, Fly, Swim, Dive, Sit/Stand, Third/First Person, Beach, Canyon, Dive Down, Surface, Aerial, Quality, Stop Walk. Joystick toggle stays separate; minimap navigation integrated with animation/camera frame.
- `world-creator/base-camp/stacey-tap-minimap.js`: fixed upper-left canvas map with zoom 45m/100m/340m, real terrain/water/woodland path display, tap-to-walk and route display, 2D A* rerouting on safe walkable terrain, steep-slope and cliff volume rejection; existing collision sweep is respected on each walking step. Automatic walk is canceled by joystick or WASD. Walking refuses water and unreachable targets, never teleports. Map sampling throttled for midrange phones.

## Verifications
- Both new JS module and extracted game inline JS parsed using V8 Function constructor (imports stripped only in test).
- Nav module simulated with fake DOM and terrain: direct walking arrived in 104 steps; explicit cancel passed; wet location refused; water-avoiding detour planned with 3 waypoint nodes.
- GitHub compare against base before Stop Walk confirmed ONLY 2 intended source files modified/added, no original Mason GLB, water, lake, fish, canyon, caves, trails, homepage, or production/main altered.
- Not tested in actual owner Android WebGL yet. Source-level and mock validation DO NOT equal mobile visual/FPS approval. This remains an isolated test branch under Issue #29 production freeze.

Owner test preview: https://raw.githack.com/copperisbetter-lang/Wvlrp/222614ab88a7f901d45075bb207ca46d244b78ce/world-creator/base-camp/stacey-dive.html?spawn=lake

## Release gate
Owner mobile screenshot/interaction QA; coordinate with Gator 2 and Issue #29 to integrate latest spring/canyon/lake work and lift production freeze before any public merge/deploy.
