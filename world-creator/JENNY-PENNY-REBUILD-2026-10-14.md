# Jenny rebuild / Penny archive — 2026-10-14

## Identity and preservation
- Existing Young Explorer asset `world-creator/assets/young-explorer-olive-plaid.glb` is the legacy character **Penny**. Do not overwrite or delete the legacy GLB or viewer until archive and routes are verified.
- New **Jenny** must be a separate GLB, rig and viewer entry; do not clone the defective mesh and re-label it.
- Child girl approximately age seven; natural child-scale proportions, coherent full head-to-toes topology, olive skin matching face/neck/limbs, brown hair, green eyes.

## New mesh and wardrobe acceptance
- Begin with a smooth continuous, realistic child-proportioned character mesh; no cylinders, sphere blocks, gaps, detached joints or inverted limbs.
- Model an opaque, comfortable tank top and child-appropriate mini skirt fitted in rest pose at shoulders, neckline, waist and skirt, with secure coverage during all movements; independently weighted garment topology. No protruding rigid wires, inverted faces, flying panels, body clipping or long stretched triangles.
- Check clothing in every animation, including extreme bends and ground poses. Add skirt deformation/collision or corrective blend shapes if needed.

## Rig and motion acceptance
- Anatomically correct joint axes and rotation limits; elbows and knees bend forward in correct direction; proper hip hinge and foot placement.
- Test stand, walk, wave, sit, bend over, pick up, hands-and-knees, elbows-and-knees; palms/forearms/knees contact ground in corresponding poses without floating, disappearing or clipping.
- Test front, side, back and 3/4 views on mobile and desktop. No published-ready claim until GLB is rebuilt, served and verified.

## Current status
- Specification recorded only. Existing live Young Explorer is NOT corrected by this document; separate Penny/Jenny assets and routing still require implementation and verification.

## Hair system — required for new Jenny
- Existing wardrobe code in `young-explorer-wardrobe.js` uses `MeshBuilder.CreateTube` for 18 locks per hairstyle and explicitly leaves all original hair enabled. This explains the tube-like "lobster" appearance and stacked hairstyles.
- Do not carry this code into Jenny. Use authored tapered hair cards/meshes with natural strand flow and scalp coverage, weighted or parented correctly to the head.
- Hair-down, ponytail, and two pigtails must be mutually exclusive COMPLETE hairstyle sets. Disable all previous hair meshes, including long loose sections, before enabling the selected hairstyle; retain only a compatible scalp cap where needed.
- Validate silhouette and absence of overlap from front, side, back and during every pose. Hair follows head without clipping the face or dress.

## Full animation contract — Jenny
Jenny must ship with individually callable animation clips: idle/stand, walk, **run**, wave, turn left/right, bend at hips, pick up from ground and return upright, sit down/get up, kneel, hands-and-knees, elbows-and-knees, and return to standing from either ground pose. Each clip must be tested on the same finalized child body and fitted tank top/mini skirt; no pose should substitute teleportation, disappearance, or rotation of disconnected body parts.

### Production order
1. Archive existing GLB as Penny, preserving its current appearance and viewer link.
2. Create new Jenny full-body mesh at child scale, matching face/neck/body skin and coherent hand/finger/foot topology.
3. Rig with proper joint orientation, rotation limits, grounded inverse-kinematics contacts and foot-locking; bake smooth transitions between clips.
4. Fit Jenny's opaque tank top and mini skirt to her final rest pose; author separate top/skirt weights and corrective deformation shapes for bend, crouch, kneel, ground poses, walk and run. No long triangles, spikes, clipping or hovering hem.
5. Implement three mutually exclusive hair styles: loose, ponytail, pigtails; no tube-generated locks and no stacked original hair.
6. Export GLB with named clips and integrate a **separate Jenny viewer**, including Walk and Run buttons. Validate mobile rendering, outfit deformation and each pose from all camera angles.
7. Publish only after model and browser test evidence; do not label any incomplete procedural placeholder a finished Jenny.


## End-of-day checkpoint — 2026-10-14 (unverified work; preserve this history)

User reports repeated failure to fit realistic loose clothing to Jenny, including a screenshot of a plaid sundress floating over her head like a mask. User specifically rejects replacing the original detailed character with a primitive procedural avatar ("Blobsquatch"). Preserve the existing detailed Jenny identity, child-appropriate proportions, face, hair, skin and rig. Do not alter the body to compensate for poor garment fit.

- Viewer: `world-creator/jenny.html`. Wardrobe: `world-creator/jenny-wardrobe.js`.
- Original shirt/shorts code cloned body geometry into near-skin shells; this caused a painted-on appearance and ragged clothing edges.
- Commit `589b6b3d73c993bad735836c8f914e6ee9d356ec` changed clothing construction to independent rigged garment geometry. **No browser visual verification**; shape and motion may still be defective.
- Commit `d096ec07ba317cb3ae145d7a8be16f882b137917` replaced the floating imported plaid dress with a generated torso-aligned garment. **Not verified**, and a follow-up change to propagate dress material to generated mesh sections was blocked. The current build may have broken plaid material.
- The clothing-removal control was restored in `jenny.html`; fitting mode should show a fully opaque neutral non-anatomical mannequin, not an unclothed child. User reported mode-switch behavior was not correct. **Not verified or fixed**.
- User wants independent garments with real drape, a loose shirt and shorts, smooth neckline, proper waist coverage, and animations without separation or clipping. Do not mistake code commits for successful visual outcomes.
- Jenny 1 and JennyB2 should both require a **server-side access check**, with one successful verification authorizing both viewers for the session. The user permits *clues* in recovery but **never disclose or echo the secret**. A prior access code was exposed in chat and must be considered compromised; do not include it in source code, documentation, URLs, or replies. Use a replacement secret configured only in secure server environment. Security **has not been deployed**. No verified JennyB2 link is known.
- The day ended without a confirmed functioning clothing fit or deployed viewer security. Next session: inspect actual viewer/model, repair generated garment geometry/materials and animations, then implement server-side protection and verify both paths and model asset access. Report only observed results.

