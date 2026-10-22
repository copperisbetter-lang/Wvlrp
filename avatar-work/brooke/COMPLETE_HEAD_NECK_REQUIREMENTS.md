# Brooke — mandatory complete head and neck build gate

## Scope
The 3DDFA_V2 photograph-derived OBJ is an **intermediate face reconstruction**, never a completed Brooke head. It does not generate a full cranium, rear scalp, ears, or neck. Do not publish or label the OBJ as a completed avatar.

## Required subsequent construction stage
1. Fit the photograph-derived face onto a **single connected, watertight head and neck skin mesh**, with consistent topology and realistic proportions. Retain the photo-derived facial landmarks; do not substitute the old procedural Potato Head face.
2. Include forehead, temples, both ears, entire skull and occiput, back of head, cheeks, eyelids, nose, lips, chin, jaw, underside of chin, throat, back and sides of neck, and a neck base suitable for body rig attachment.
3. Ensure smooth surface continuity and normals at the face/skull/ear/neck junctions, with no missing surfaces, floating facial patches, duplicate heads, or visible seams.
4. Eyes are separate objects correctly seated behind integrated eyelids. Hair is separate geometry, with dry and wet variants; neither may conceal topology failures.
5. Inspect front, left, right, rear, three-quarter, top, underside and neck base in the phone viewer. No completion claim without verified actual exported GLB and screenshots.
6. Check round-trip exported GLB for one connected manifold **skin** mesh, zero open/nonmanifold edges except a deliberately capped or body-joined neck base, and a correct eye count. Preserve an unmodified known-good Brooke prototype as rollback, but do not reuse its face as likeness.
7. Keep reconstruction, completion, rigging, and visual likeness approval as separate gates. An OBJ export alone is not acceptance.

## Current implementation status
The photo reconstruction workflow `.github/workflows/brooke-photo-3ddfa.yml` only produces a single-face OBJ intermediate. **Complete-head fitting and neck integration are NOT implemented or validated yet.** This file records mandatory requirements and prevents a face-only artifact from being misrepresented as a complete head.
