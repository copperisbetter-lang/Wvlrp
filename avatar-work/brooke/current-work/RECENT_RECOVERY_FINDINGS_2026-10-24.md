# Recent work — Laura/Brooke recovery, 2026-10-24 00:55 ET

## User correction — highest priority
- Laura had a nearly perfect face, wandering eyes, and **missing rear skull**. Only **two attempts** to complete back of head were made before Laura was set aside. Do not claim Laura's approved face was successfully joined to a complete skull.
- Brooke had **a near-good facial likeness AND a back of head already present**. Remaining issues were **small facial differences**, not missing overall head geometry. We were close; abandoning/rebuilding the head was a mistake.
- **Recover exact earlier near-success Brooke model first**, verify visually with user, preserve it unchanged, and make a clone for small corrections. Protect Sophie 1, Brooke 1.0 and approved assets. Do NOT start another photo-to-skull pipeline as the default.
- User has very limited time and requests no empty promises, no repeated analysis instead of results.

## Inspected repository evidence
- `avatar-work/brooke/scripts/build_complete_head.py`: 3DDFA face boundary extended into procedural rear-skull rings; not a reliably anatomical skull; explicitly neck NOT_FITTED, likeness NOT_VERIFIED.
- `avatar-work/brooke/scripts/validate_photo_head_candidate.py`: tests watertight, connected, original facial vertices retained. Does NOT certify likeness, ears, neck or rig.
- `avatar-work/brooke/scripts/build_mpfb_base.py`: loads `world-creator/assets/morph-head-clone.glb`, preserves anatomical base and original topology; labels photo fit pending. This is a **possible alternative**, NOT proof it will match Brooke, and not a reason to discard the near-good Brooke model.
- `avatar-work/brooke/COMPLETE_HEAD_NECK_REQUIREMENTS.md`: complete head-neck fit not implemented/verified.
- `avatar-work/brooke/current-work/PASS6_CORRECTIONS_2026-10-23.md`: corrections planned, not verified (sunken lips, upper-lip shadow, lower lip coloring, brow, eyes).
- GitHub Actions Brooke photo 3DDFA runs #38/#39 green produce candidate geometry only, NOT completed Brooke avatar.
- Laura files include `world-creator/scripts/build_laura_combined.py`, `build_laura_native_mpfb.py`, `laura-head-viewer.html`, `laura-head-clean-v3.html`; existence of scripts is NOT proof approved Laura face got its rear skull completed.

## Online references reviewed in conversation
- Blender Shrinkwrap modifier: https://docs.blender.org/manual/en/5.3/modeling/modifiers/deform/shrinkwrap.html — mesh fitting/projection with controlled influence; possible distortions and alignment issues.
- MakeHuman morph-target/topology: https://www.makehumancommunity.org/assets/creatingassets/maketarget/targets.html — morph targets require compatible original topology.
- Blender Base Camp Shrinkwrap/retopology guide: https://www.blenderbasecamp.com/how-to-use-the-shrinkwrap-modifier-for-retopology/ — practical cautions; not a validated Brooke fix.
These references suggest anatomical-base fitting *if* original near-good Brooke model is unusable; they do not supersede recovering the existing model.

## Next session
1. Locate earlier **visually near-approved Brooke face + rear head** artifact and exact viewer/build link in repository history / workflow artifacts; verify version, no invented links.
2. Preserve original and clone before editing.
3. Compare front/profile to user-approved images and fix only the small reported facial issues.
4. Report actual outputs with working links and truthful verification status. No deployment without #29 coordination.
