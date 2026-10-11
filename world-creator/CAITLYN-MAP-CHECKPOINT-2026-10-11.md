# Caitlyn World Map Checkpoint — October 11, 2026

## Approved addition
Add new adult platinum-blonde test avatar **Caitlyn** to existing The Wild World Creator, without moving or changing Amy, Christy/Chrissy, Riley, deer, structures, or other saved objects.

## Implementation
- Caitlyn is a separate `modelKey: "caitlyn"`, ID `npc-caitlyn-wild`, at map coordinates (0, -76) near Woodland Trail, away from Amy (-70, 18) and Christy (70, 18).
- Existing Amy and Christy starter definitions and migration are not changed. New `addCaitlyn(world)` is idempotent and retains existing custom placements.
- Browser migration marker is `wvlrp-world-creator-caitlyn-added-2026-10-11`; this one-time addition is NOT Oracle-backed shared game persistence.
- Built-in model URL is `world-creator/assets/caitlyn-mpfb-trial.glb`, independent of Amy/Christy/Riley; proven built in GitHub Actions with a Mixamo 52-joint rig and 4 clips.
- Find Caitlyn, Caitlyn quick preset, map label and buttons for stand / bend / kneel / hands and knees.
- Existing character asset URLs stay untouched. Added JSON roundtrip tests for Caitlyn pose, map movement, idempotence and preservation of existing world objects.
- In-browser visual pose realism and the deployed website require user-side review.

World Creator: https://wvlrp.com/world-creator/
Caitlyn dedicated viewer: https://wvlrp.com/world-creator/caitlyn-mpfb-trial.html
