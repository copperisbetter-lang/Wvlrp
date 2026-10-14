# Senior Explorer — 65-year-old woman

Status: specification committed; model, rig, animations and viewer NOT YET built or verified.

## Identity and appearance
- Independent adult female avatar, age approximately 65; realistic, continuous solid human mesh, age-appropriate face, hands and body proportions.
- Hair: natural mixed gray and white strands (salt-and-pepper silver), not a solid uniform gray or white cap; age-appropriate realistic hair geometry and movement.
- Fully clothed; independently fitted clothing with proper drape and skinning, not painted-on textures or resized child outfits.
- Do not modify Jenny, Penny, or the five-year-old explorer.

## Skeleton
- Exactly 56 exported, weighted deform joints in the GLB; automated count check must fail otherwise.
- Joint placement must be adult-proportioned; full hand, shoulder, elbow, hip, spine, ankle and knee articulation.
- Determine each knee's local anatomical flexion axis from the exported bind pose; do NOT assume positive X or negative X for both legs.
- Both knees flex toward the posterior and never hyperextend. Clamp knee extension at neutral (0 degrees) and flexion within the tested natural range; check left and right separately.

## Motion and QA
- Save and test idle/stand, walk, run, sit/stand transition, wave, bend, pick up, crouch, hands-and-knees, elbows-and-knees, and getting back up.
- Test knee motion frame by frame from front, side and rear, including both swing and stance phases of walk and run.
- Confirm feet remain oriented and knees do not snap, flip or bend backward; verify smooth transitions and clothing deformation.
- Provide a standalone browser viewer with all pose controls and a clothes rack; save settings per character.
- CI must verify exported GLB structure, exactly 56 joints, required animation names, weighted body and clothes, and artifact publication; visual pose review required before marking complete.

## Implementation
- GitHub-only Blender/MakeHuman pipeline, separate generator and GLB asset, separate viewer route and dedicated GitHub Actions workflow.
- Do not report the character finished until the build workflow passes and movement is visually verified.
