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
