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
