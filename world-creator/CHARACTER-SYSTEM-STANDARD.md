# WVLRP Character System Standard — 56 Joint Contract

Status: user-approved architecture, October 12, 2026.

## Scope
Riley Top Shelf, Sav, and other current experimental figures are **test models**, not NPCs or player characters for The Wild. Their purpose is to develop accurate reusable body geometry, materials, deformation, and animations. Production characters use appropriate game-ready, clothed/simplified meshes and omit unnecessary intimate anatomical detail.

## Mandatory joint count
All **new human rigs** use exactly **56 deform-capable skeleton joints**, with identical canonical joint names, hierarchy, orientation, rest pose, unit scale and animation conventions. Existing legacy test rigs may remain for comparison but are not compliant until explicitly migrated and verified. Never claim a model complies without inspecting its exported GLB skin.

## Canonical 56-joint hierarchy (provisional names, locked by implementation tests)
- Pelvis: 1
- Spine1–Spine4: 4
- Neck and Head: 2
- Jaw: 1
- Left/right clavicle: 2
- Left/right upper arm, forearm, wrist: 6
- Left/right palm: 2
- Left/right fingers, five digits × three phalanges × two hands: 30
- Left/right thigh, shin, ankle, foot: 8
**Total: 56.**

## Parts library
Version and store modular heads/faces, hair, torsos, arms, hands, pelvis, legs, feet, skin materials, clothing, and motion clips. Parts must use compatible attachment boundaries, rest pose, vertex-weight conventions, joint labels, scale and UV/material interfaces. Use stable metadata IDs, licenses, and compatibility checks. Build multiple characters by composition from a parts manifest, not by cloning whole meshes with arbitrary edits.

## Shared QA
Test joint count, hierarchy, GLB export, animation retargeting, smooth skinning, neck/hip/shoulder continuity, finger articulation, feet/floor contact, elbows-and-knees and hands-and-knees poses, materials and clothing fit. Reference-matching remains a separate visual approval gate. Rig consistency does not prove anatomical or aesthetic accuracy.

## Separate production output
- Research/test meshes may contain complete adult anatomy as requested for evaluating modeling accuracy.
- Public game meshes omit unnecessary intimate anatomy, are clothed and optimized for performance.
- Both tracks reuse rig, animation, face/hair/skin design tools, and compatible non-intimate modular geometry.

## Master clone architecture — approved October 12, 2026
Create and validate **one canonical master human asset** containing both the continuous, manifold body surface and the 56-joint armature, authored and skinned together in a single build pipeline. This master is the source of truth for subsequent human character clones. Do not independently regenerate a different skeleton for each character.

- Version master mesh, armature, bind/rest pose, naming, proportions metadata, and skin weights together.
- Clone the master before modifying character-specific appearance. Character variants can adjust body proportions using compatible morph targets or controlled mesh edits, while retaining skeleton hierarchy, bone naming, attachment conventions and animations.
- Keep face, hair, skin materials, garments and other optional parts in a compatible modular library. Ensure body geometry is continuous where anatomical continuity is required; modular accessories need not be fused into the body mesh.
- Test every master revision for exactly 56 exported skin joints, smooth deformation, attachment continuity, walking, hands-and-knees, elbows-and-knees and floor contact before promoting it as a reusable template.
- Keep research anatomy and public game geometry as distinct mesh variants, with the shared rig and animation contract.
- The current Sav prototype is **not yet the approved master**. Promote a candidate only after export, visual and motion QA.
