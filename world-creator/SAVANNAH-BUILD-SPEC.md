# Savannah — independent adult character build contract

Status: NEW CHARACTER / NOT YET BUILT OR APPROVED. Preserve Riley Top Shelf and all other characters unchanged.

## Definitive reference
User-supplied ranger-station photograph (October 12, 2026): **blonde adult woman at left wearing green**, not the redheaded woman at right. Reference is for internal 3D modeling and comparison only; do not substitute AI-generated promotional images for the playable GLB.

## Visual targets
- Face: match visible facial proportions, eyes, cheeks, nose, relaxed natural smile.
- Hair: sandy/golden blonde, loosely swept-up bun with flyaways and face-framing wisps; NOT Riley's long straight hair.
- Skin: consistent warm, sun-kissed, naturally varied tone across face, neck, torso, arms, pelvis, thighs, shins, hands and feet; no chalky white legs, metallic shine, hard material seams.
- Anatomy: gentle lower-rib relief, subtle obliques/rectus contours, physically sculpted recessed navel, natural soft lower abdomen, realistic shoulder/neck and hip/inner-thigh transitions.
- Proportions: reference-based, **do not copy Riley's old 112/70/88 measurements** without independent fitting.
- Hair and clothing must not obscure or deform underlying body skin geometry.

## Skeletal target: 56 articulated joints
Root/pelvis 1; spine 4; neck/head 2; shoulders/clavicles 2; arms (upper, forearm, wrist) 6; hands (palm + 3 articulated bones per each of 5 digits) 32; legs (thigh, shin, ankle, foot) 8; total **55**. Add jaw 1 = **56**.
Each mesh vertex must have normalized, anatomically localized weights (max 4 influences). Never assign fingers to thighs or hip skin to arms. No disconnected pelvis, open neck, stretched fingertips or skin spikes.

## Required animation tests
1. Neutral standing, idle breathing, full walking cycle with counterrotating pelvis and spine and alternating knee flexion.
2. Bend at hips, independent knee bend, kneel.
3. Hands-and-knees: both palms and both knees visibly contacting ground.
4. Elbows-and-knees: both elbows/forearms and both knees visibly contacting ground, with naturally arched downward back, free neck and head, no floating.
5. All four views and close-ups of neck, ribcage, navel, fingers, inner thighs, hips, knees and shins in rest AND extreme poses.

## Hard approval gates
- Exactly 56 actual joints in exported glTF skin (not merely named constants).
- Animations exported and played in browser; no deformations, clipping, joint separation, floating or self-intersections at key poses.
- Face/body color consistency and proper non-metallic PBR roughness under neutral daylight.
- Anatomical torso sculpt must be actual mesh geometry, not shader-only illusion.
- Visual reference comparison is required. A successful workflow alone is NOT approval.
- Separate `savannah` GLB, build script, viewer and QA outputs; do not overwrite Riley's files.
