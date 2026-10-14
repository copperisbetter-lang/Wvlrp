# Jenny rebuild / Penny archive — 2026-10-14

## Identity and preservation
- Existing Young Explorer asset `world-creator/assets/young-explorer-olive-plaid.glb` is the legacy character **Penny**. Do not overwrite or delete the legacy GLB or viewer until archive and routes are verified.
- New **Jenny** must be a separate GLB, rig and viewer entry; do not clone the defective mesh and re-label it.
- Child girl approximately age seven; natural child-scale proportions, coherent full head-to-toes topology, olive skin matching face/neck/limbs, brown hair, green eyes.

## New mesh and wardrobe acceptance
- Begin with a smooth continuous, realistic child-proportioned character mesh; no cylinders, sphere blocks, gaps, detached joints or inverted limbs.
- Model cranberry plaid sundress fitted in rest pose at shoulders, neckline, chest, waist and skirt, with child-appropriate coverage; independently weighted garment topology. No protruding rigid wires, inverted faces, flying panels, body clipping or long stretched triangles.
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
