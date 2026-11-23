# Terry 1 — Male Ara/Gina Body Base (Work handoff)

## Status
**BUILT, SAVED, AND VERIFIED** on isolated branch `feature/terry1-ara-male-20261122`. This is the **male version of the Gina 5 Ara 3D Gen character pipeline**. It is not the unrelated MPFB/Blender builder. No changes were made to Gina 5, Cecil 1, or any other approved model.

## Real output
- GLB: `avatar-work/terry-1/ara/Terry1_Ara_Male_Base.glb`
- Params: `avatar-work/terry-1/ara/Terry1_Ara_Male_Base.params.json`
- QA: `avatar-work/terry-1/ara/Terry1_Ara_Male_Base_QA.json`
- Model byte length: **36,210,608**
- Model SHA-256: `26d3ad4707a0a38da19ac1ec0b4adc9bca834fb36abe14a5e9257747292f9200`
- Real validated rig: **69 joints**, **248 animation clips**, glTF skin present, morph targets present (9 mesh primitives with targets), 71 nodes, 1 mesh
- Build: [successful GitHub Actions run](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/45098698886)

## Owner's intended next Work session
1. Work with **Park Ranger Terry Clark**. Owner supplied front view and both profiles in the preceding ChatGPT conversation, and will upload Terry's face again in Work.
2. Use this exact already-generated Ara male character as the BASE; do **not** start over with a default MakeHuman or Genesis body.
3. Revisit the photo-guided facial-fitting workflow used for the blonde Faculty character. Its past issue was hair painted into the facial texture. Inspect and identify the real tool and best working method before reshaping.
4. Fit facial proportions and profile against the supplied original photographs, preserving the neutral baseline and exporting working-copy versions with full rig and morphs intact. No claim of verified Terry likeness yet.
5. Keep scalp hair, eyebrow strands, moustache, and beard as **separate geometry/material layers**. Don't texture-bake hair onto skin. The initial `facialHair:none` in the generic base is intentional, not approval for a clean-shaven final ranger.
6. Terry's eventual in-game uniform: West Virginia park-ranger-inspired outfit, boots, officer-style duty belt, clearly empty holster. Uniform and final appearance need later approval.
7. Preserve untouched base, verify every saved file, and log build checkpoint to Issue 29 or a Terry-specific issue with links.

## Important scope
The generated body is a **generic mature adult male** with Gina's same Ara generator workflow; it **does not yet resemble Terry's face** and is not game-ready. Body proportions are provisional, not measured to Terry. The first generic MPFB build was separately attempted on `feature/terry1-makehuman-base-20261122`; this Ara body is the owner-specified target. Do not substitute that other branch accidentally. The project repository is currently **public**; obtain owner's permission before committing Terry's real likeness photos or photo-fitted 3D model there. Keep personal reference photos and likeness WIP private unless expressly authorized.

## Private Terry photos — Work mode retrieval
The original uploaded face reference photographs are stored in the owner's **private ChatGPT Library**, **not this public GitHub repository**, under `/WVLRP/The Wild/Terry 1/Reference Photos/`: `Terry_01_Front.jpg`, `Terry_02_Profile.jpg`, `Terry_03_Profile.jpg`. The accompanying private Library handoff index is `/WVLRP/The Wild/Terry 1/Terry1_WORK_HANDOFF_REFERENCE_INDEX.md`. Search/read that index and those photos in Work; preserve their privacy, and do not substitute AI-generated lookalike renders.
