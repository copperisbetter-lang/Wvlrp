# Gater 3 — Stacey Lake bass stocking

Status: PREPARATION; no fish installed or deployed.

Repository: copperisbetter-lang/Wvlrp
Isolated branch: gator3-bass-stocking-20261024
Reference branch: gator3-stacey-complete-reference
Reference source commit: 3bacd850fcbf9008b97aa3c19e38c9a550edfbaa
Reference source: world-creator/base-camp/stacey-complete.html
Viewer (historical; not newly mobile verified): https://raw.githack.com/copperisbetter-lang/Wvlrp/3bacd850fcbf9008b97aa3c19e38c9a550edfbaa/world-creator/base-camp/stacey-complete.html
Separately reported owner-approved lake checkpoint: 44c47eb (exact correspondence to reference viewer NOT confirmed).

User instruction: stock exactly 120 largemouth bass from tiny fry to 8 lb. Proposed distribution 20 fry, 25 fingerlings, 25 juvenile, 25 young adult, 15 mature, 10 trophy. Use uploaded model model_67a_-_largemouth_bass.glb (conversation attachment, NOT yet in GitHub). Need optimize shared geometry, independent motion, underwater bounds, collision avoidance, mobile performance.

Mandatory: protect approved water/island/beach; no production merge without Gater 1 conflict review under Issue #29. Next: inspect model and lake source; prepare isolated fish module and asset delivery; verify browser/mobile FPS and fish visibility; record every attempt and link here.

## Implementation checkpoint
- Fish module added: `world-creator/base-camp/stacey-bass.js`, commit `93aef920`.
- Reference viewer wired to fish module: `world-creator/base-camp/stacey-complete.html`, commit `94748308`.
- Experimental viewer (UNVERIFIED, GLB currently missing): https://raw.githack.com/copperisbetter-lang/Wvlrp/gator3-bass-stocking-20261024/world-creator/base-camp/stacey-complete.html
- **BLOCKER**: uploaded GLB remains a conversation attachment; GitHub fish asset path `world-creator/base-camp/assets/fish/largemouth-bass.glb` is not populated. The module fails safely and displays `MISSING GLB` until uploaded. No claim that 120 fish render yet.
- Mesh bounds inspected locally: 0.0664 × 0.1438 × 0.3560 model units, 2 geometries. Need verify model forward axis and embedded animation before visual acceptance.
- No production merge; no approved water, terrain or beach changes. Mobile FPS not verified.

## Animation inspection and code update
- Original GLB inspected: 18,644,040 bytes, 2 meshes, 4 embedded images, 1 skin, 1 animation named `Swim Cycle` with 74 channels.
- Commit `06b0f400` changes fish cloning to SkeletonUtils.clone for skinned rigs, plays actual embedded clip using AnimationMixer with staggered phases/speeds.
- Still blocked: model binary is not hosted in GitHub, and GitHub connector text-only file action cannot transfer this 18MB GLB. Asset path needed: `world-creator/base-camp/assets/fish/largemouth-bass.glb`. This build remains unverified and cannot display bass until asset is uploaded. Avoid declaring installation complete.

## 2026-10-24 — uploaded GLB wired
- Owner uploaded `world-creator/base-camp/assets/fish/model_67a_-_largemouth_bass.glb` (18,644,040 bytes), confirmed in branch tree.
- Updated `stacey-bass.js` loader path to actual uploaded filename, commit `28fa826eaa4b6e628e1e213cd66bffab00614818`.
- Existing reference viewer already imports and runs `installBass` with 120 fish and swim animation.
- Isolated test link: https://raw.githack.com/copperisbetter-lang/Wvlrp/gator3-bass-stocking-20261024/world-creator/base-camp/stacey-complete.html
- Runtime/mobile FPS and visibility NOT verified. Production/main untouched; pending Issue #29 review.


## 2026-10-24 UNDERWATER WALK — CORRECT STACEY COMPLETE VIEWER
- Owner screenshot confirms `stacey-complete.html` lake scene with 883 trees, 277 rocks and ~23 FPS; foliage has white gaps. Earlier underwater change to `water-lab.html` was WRONG VIEWER; do not use it for this lake.
- Actual root cause in `stacey-complete.html`: `if(!aerial)pos.y=swim?CY+.65:bed+1.7` forces camera to float above surface.
- Updated ONLY `world-creator/base-camp/stacey-complete.html` on `gator3-bass-stocking-20261024`, commit `0d83e119e36e7b3ef920d8a55859998e75a2ff75`.
- Added Dive / Surface button while swimming, lakebed walk camera height follows ground and remains below water where deep enough; shore resets dive. Status shows Lakebed. Water shader, terrain, island, bass module untouched.
- Exact preview (UNVERIFIED ON OWNER PHONE): https://raw.githack.com/copperisbetter-lang/Wvlrp/0d83e119e36e7b3ef920d8a55859998e75a2ff75/world-creator/base-camp/stacey-complete.html
- Follow-up: phone-test dive, fish visibility and FPS. No production merge.
