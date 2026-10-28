# Mason natural gait v2 — October 28, 2026

## Owner feedback
The first procedural gait got Mason's legs moving but looked like he was **jumping hurdles** in both walk and run.

## Verified problem
- The first version used thigh swing up to 0.41 rad (walk) / 0.68 rad (run) and knee flex up to 0.55 / 0.94 rad.
- It bent the leading knee hardest at the forward-most thigh position, producing a high-stepping/hurdle motion.
- Static five-pose source GLB has no authentic locomotion clips. This remains a test-time procedural rig animation, not a new model clip.

## Isolated source fix
- Branch: `gater/mason-natural-gait-v2-20261028`
- Code commit: `0cecff21336164b4ae853b540a1495877e6fdd79`
- Changed **only** `world-creator/base-camp/stacey-mason-player.js`.
- Walk thigh swing lowered from ~23.5° to ~14°; run from ~39° to ~24°.
- Walk knee peak lowered ~31.5° to ~17°; run from ~54° to ~31°.
- Knee now bends mid-recovery while leg passes through neutral, then extends near landing; planted knee stays softly bent.
- Running transition and arm movement are eased; no cosmetic root bounce.
- Existing V8 shorts, original 52-bone Mason GLB, third-person camera, game-options dropdown, joystick, click-to-walk minimap, lake/stream/fish/terrain/cave/photos remain unchanged.

## QA
- Readback of saved file SHA `2b822a1d48686447de1d3aba94bac11aa905617d`.
- JavaScript syntax checked in V8.
- Motion simulation at 30 FPS through walking/running/stopping PASS: max walk hip 0.245 rad, knee 0.288; run hip 0.425, knee 0.540; stopped both back to zero.
- GitHub compare to previous gait commit confirms only one source file modified, 27 lines added/15 removed.
- **Not yet tested visually on owner's Android or in a full WebGL game scene**; this change needs front/side third-person inspection and running FPS QA. Doesn't claim reliable planted footsteps on steep terrain.

## Phone QA
https://raw.githack.com/copperisbetter-lang/Wvlrp/0cecff21336164b4ae853b540a1495877e6fdd79/world-creator/base-camp/stacey-dive.html?spawn=lake

No main/production deployment under Issue #29 freeze. Ask Gater 2 to coordinate promotion only after owner approves the gait.