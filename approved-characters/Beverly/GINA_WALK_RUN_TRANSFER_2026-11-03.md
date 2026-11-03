# Gina 6 walk/run -> Beverly: animation transfer audit
Date: 2026-11-03
Status: SOURCE LOCATED; NOT YET RETARGETED OR DEPLOYED.

Source: prototypes/gina6-20261102/Gina_6_FITTED_GOLD_BIKINI.glb
Metadata: prototypes/gina6-20261102/Gina_6_NATIVE_BIKINI_QA.json
Gina rig: 69 joints, 77 clips, including Walk, Run, Slouch walk, Model walk (catwalk), Walk backwards. Source QA explicitly says dynamic visual fit untested and not owner-approved.

Target: world-creator/base-camp/Beverly-approved-dressed.glb
Live integration: world-creator/base-camp/stacey-dive.html
Controller: world-creator/base-camp/beverly-shoreline-npc.js
Current clip: Beverly_Shoreline_Walk, a gentle 8-track walk; controller speed 1.2 m/s and continuously follows actual shoreline.

Implementation requirements:
1. Extract actual Gina Walk and Run animation channels and skeleton bind/rest pose; inspect target Beverly bone names, hierarchy, orientation, rest pose, and skinning.
2. Retarget rotations and root translation from Gina to Beverly, preserving Beverly bind/rest pose and approved mesh, skin, hair, and swimwear. Never swap in Gina's body, materials, or bikini.
3. Bake Beverly_Gina_Walk and Beverly_Gina_Run clips into a NEW game GLB; retain Beverly_Shoreline_Walk as a safe fallback and preserve the original approved source. Verify foot contact, knee direction, pelvis height, skirt/strap deformation, root motion, and smooth loops.
4. Update game loader to use retargeted Walk for continuous shoreline at 1.2 m/s; Run should be selectable for future NPC behavior, not automatically triggered by player sprint. Maintain no-stop loop and terrain placement.
5. Validate GLB load, animation channel paths, skin matrices and loop boundaries; test mobile FPS and visual motion. Publish only after checks, then verify live Pages URL and update Issue 29.

Do not claim Gina's walk/run is integrated until retargeted animation clips exist in the deployed Beverly GLB and are actually played by the game.
