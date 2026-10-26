# Brooke realistic hair — Linux Blender / FollicleFX checkpoint
Date: 2026-10-26
Status: PROTOTYPE ONLY — do not deploy.

## Located uploaded software in ChatGPT Library
- Blender 5.2.3 LTS Linux x64, `blender-5.2.3-linux-x64.tar.xz` (385,331,224 bytes), stored in /Recent and Library root copies.
- FollicleFX-community-linux-x86_64.zip, 48,358,075 bytes, stored at Library root.
- Extracted Blender in model runtime and verified it starts as Blender 5.2.3 LTS.
- Installed FollicleFX 1.5.1 as a Blender addon, loaded `folliclefx_core` native library; addon enable succeeded.
- FollicleFX is a groom editor, not a pre-built hairstyle. Generated current trial geometry using Blender Python (`bpy`), **not** FollicleFX guides; the addon's interactive grooming/export has not yet been validated.

## Brooke 3.1 proof of concept
- Input: user-provided older `brooke-3-1-neck-corrected.zip` with `brooke-3-1-3948-rig-experimental.glb`.
- This is NOT the latest V5 owner-fit head/mesh; no claim of final V5 attachment.
- Generated two INDEPENDENT hair GLB files: `Brooke_Hair_MASTER_v4.glb` and `Brooke_Hair_CLONE_v4.glb`, ~1.7 MB each.
- Editable `Brooke_Hair_Groom_MASTER_AND_CLONE_v4.blend` (~30 MB) keeps both hair objects.
- `Brooke_3_1_Hair_Proof_v4.glb` (~39 MB) is an experimental 3.1 preview with the new master overlay, plus `Brooke_Hair_Groom_FRONT_v4.png` and `Brooke_Hair_Validation_v4.json`.
- Exports and Cycles test render passed in Blender 5.2.3; source input left unchanged.

## Quality blocker and next steps
The visual preview still looks fibrous/straw-like and does NOT meet the owner's high-realism goal. Scanned hair/crown geometry underneath also remains flat/poorly fitted. **Do not publish this trial as finished hair, and do not replace original Brooke, Sophie, or approved V5 assets.**
1. Acquire the latest V5 working head and measure its scalp/face/neck while keeping its original intact.
2. Remove or mask the low-quality source scan wig on an isolated clone.
3. Groom true coherent locks with FollicleFX guides or quality UV-textured alpha hair cards, matching part, hairline, and sandy-blonde reference.
4. Create cloned independent hair object, then test facial movement and head rotation bone-follow, scalp intersections, sunlight/wind, and FPS on A17/A16.
5. Rule 29: check #29 with Gater 1 before deployment. No website or GitHub Pages production deployment from this checkpoint.

Binary outputs and source .blend were exported locally to the ChatGPT conversation work area as downloadable artifacts; they are not committed as binaries on GitHub yet.
