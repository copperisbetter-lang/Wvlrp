# Mason playable gait / foot grounding — October 28, 2026
## Owner-reported regression
On the third-person Stacey Lake Mason preview, his legs remained motionless while the avatar glided/hovered across terrain. The earlier installation had **only the original five static pose clips**: `Mason Stand`, `Mason Bend`, `Mason Kneel`, `Mason HandsAndKnees`, and `Mason ElbowsAndKnees`. It drove a standing AnimationMixer and applied a tiny carrier bob, but never rotated hips/knees for locomotion.

## Isolated fix staged
- **Base:** `0f3a6d0ca8cd55af880c1768c18ce9855eb81453` (dropdown and tap-to-walk minimap).
- **Branch:** `gater/mason-grounded-gait-20261028`.
- **Immutable new head:** `4020e6af8bfc1abca435e9cccac7d5cc371db005`.
- **Changes:** ONLY `world-creator/base-camp/stacey-mason-player.js` and a single `running:` argument in `stacey-dive.html`. No GLB, cliff, fish, water, vegetation, trails, minimap, source pose, or homepage changes.
- Identify hips and knees from the **original** Mixamo-compatible Mason 52-bone skeleton; derive signed joint bend axes from the exported `Mason Kneel` quaternion tracks (fallback to local X if pose-track unavailable). On each mixer update apply opposite-phase femur swings, forward-leg knee bend, and counter-swinging arms. Faster amplitude/cadence when running; blend back to standing when stopping; suppress terrestrial gait while sitting, swimming, diving or flying.
- Remove fake floating bob. Compute original GLB skinned lower-body bottom Y on load once and place soles at collision ground via existing eye-height position.
- Shift-key sprint and RUN toggle both now feed the same movement-state flag. Auto-walk minimap already passes through `walking`; manual joystick and WASD likewise.
- Expose `window.staceyMason.state.gaitReady` and `gaitBones` for device debugging.

## Tests / risk
- JS V8 syntax parse of both changed JS module and large game's inline module: PASS.
- GitHub compare from base: exactly two source files modified; no scene data touched.
- **NOT YET VERIFIED:** real GLB skeletal pose playback in Android WebGL, contact/stance on slopes, shorts deformation at knee flexion, FPS (goal A14/A16 smooth), and final appearance. GitHub binary contents endpoint did not return GLB bytes for offline skeletal validation; no reliable visual claim.
- **NO production/main merge** during Issue #29 freeze. Needs owner's Android preview, then G2 coordination with concurrent scene work.

## Owner preview
https://raw.githack.com/copperisbetter-lang/Wvlrp/4020e6af8bfc1abca435e9cccac7d5cc371db005/world-creator/base-camp/stacey-dive.html?spawn=lake

## Debug
Open third-person, walk forward then turn, hold RUN/Shift. Check visible alternating legs, no hover bob, feet follow bank. If gait doesn't appear, inspect browser `window.staceyMason.state.gaitReady` and `window.staceyMason.state.gaitBones`, and `window.staceyDiagnostics.assets['Mason gait']`.
