# New Explorer — five-year-old character build

GitHub-only implementation; no Oracle dependency.

## Identity
- Separate from Jenny and Penny.
- Five-year-old girl; East Asian facial features, blonde hair.
- Realistic child proportions, solid continuous body mesh, no primitive blob geometry or hollow zoom artifacts.
- Fully clothed, age-appropriate design.

## Rig and animation
- 56-bone humanoid armature; verify exact bone count in exported GLB.
- Weighted skin and child-sized joint placement.
- Correct elbow/knee hinge directions, anatomical constraints.
- Test walk, run, sit, bend, crouch, wave, pick up; verify no reversed joints or mesh tearing.

## Clothing
- Jenny-inspired plaid sundress fitted to this avatar's own measurements, not resized from an adult.
- Straps on shoulders, bodice aligned, natural loose skirt; cloth follows movement without clipping or painted-on fit.
- Validate front, side, rear and zoom views.

## Deliverables
- New Blender generator in world-creator/scripts.
- Separate GLB in world-creator/assets.
- Separate browser viewer and loading route.
- GitHub Actions workflow to generate GLB with Blender and publish as a committed asset or downloadable artifact.
- Automated bone-count and GLB integrity tests plus screenshots of animations.
- Preserve existing Jenny/Penny assets and routes.

Status: specification only; not a completed character.
