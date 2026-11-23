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

## OWNER'S MANDATORY SINGLE-PASS TERRY LIKENESS ORDER — 2026-11-22

**Priority 1 / not optional: Complete Terry's recognizable facial likeness in ONE substantive Work session, with ONE full end-to-end build pass.** Doug explicitly requested that the likeness be done in a single pass. Do not spend the session only setting up software, producing a generic stock head, testing several disposable previews, or repeatedly asking for materials that have already been preserved. This is the FIRST production likeness-fitting attempt, not an exploratory research-only task. A single pass means run a complete purposeful fit and comprehensive verification; internal corrections during that pass are permitted, but do not fracture the deliverable into serial empty prototypes.

**Real inputs available now:**
- The exact saved full-body male base is `feature/terry1-ara-male-20261122:avatar-work/terry-1/ara/Terry1_Ara_Male_Base.glb`, 36,210,608 bytes, SHA256 `26d3ad4707a0a38da19ac1ec0b4adc9bca834fb36abe14a5e9257747292f9200`, 69 rig joints, 248 animations, facial morphs. Check actual bytes and do not substitute another body.
- The THREE authentic user-provided Terry Clark reference photos (front and both profiles) are SAVED to PRIVATE ChatGPT Library folder `/WVLRP/The Wild/Terry 1/Reference Photos/`: `Terry_01_Front.jpg`, `Terry_02_Profile.jpg`, `Terry_03_Profile.jpg`. A private index is at `/WVLRP/The Wild/Terry 1/Terry1_WORK_HANDOFF_REFERENCE_INDEX.md`. Recover via Library tools, don't use the AI-generated illustrative head renders as reference and don't re-request photos already accessible there.
- Locate and inspect actual software/pipeline previously used for the successful blonde character from *The Faculty*: photo-based face morph onto an Ara/MakeHuman-compatible human mesh. Preserve what worked. The prior facial hair mistake was **hair painted into face skin**; avoid repeating that.

**Execution checklist for the single end-to-end pass:**
1. Open and SHA-check the REAL Terry 1 male Ara GLB; duplicate it as a reversible private working copy immediately. Keep Gina, Dad and base unchanged. Inspect available morph keys, head/neck topology, bone and weight layout.
2. Study all three actual photos together. Fit recognizable overall head silhouette, forehead/hairline, ears, brows, eyes and eye color, nose bridge/tip/nostrils, cheeks, mouth/lips, jaw/chin, mustache/beard silhouette, and front/left/right profile correspondence to Terry, rather than replacing the head with a generic generated portrait.
3. Use the same successful facial fitting/morph workflow from the Faculty blonde *as far as the real geometry supports*. Fit the ACTUAL body head mesh; avoid an overlapping flat photo decal. Preserve rig/joint and face-expression compatibility. Do not flatten scalp hair, eyebrows, mustache, or beard into the skin texture: create or retain **separate geometry/materials**, with a believable natural skin surface underneath.
4. In the same pass, validate neutral and smiling facial expressions, jaw/mouth motion, eyes/blink, and neck/head movement, and check ALL three photo angles in neutral lighting. Preserve working animation clips wherever possible.
5. Deliver a **real, privately saved, re-opened GLB** (and editable source when possible) plus a phone-friendly owner-inspection viewer and QA record showing byte size, hash, face/rig/animation status and links. Save to private authorized storage; no Terry likeness binaries or photos in PUBLIC GitHub.
6. End that session with a single honest COMPLETE candidate for Doug's visual review, or a documented technical blocker with source evidence if the real single-pass operation cannot be completed. Never claim a generic face is Terry or label it approved without Doug's inspection. Do not silently switch to Forge, Genesis, generic MPFB, or new character generation.
7. Preserve the original model and the three photos; checkpoint early and periodically in recoverable PRIVATE storage. Record links/status/QA in Issue 29. Real verified saved files and viewer links, not just text descriptions, are required.

**Time priority:** spend Work time on the facial likeness itself, not regenerating body, avoid unnecessary exploration. The `Terry1_Ara_Male_Base.glb` is already generated and verified. Later ranger clothing, duty belt and holster are NOT prerequisites to facial likeness review; handle them after likeness is accepted.

**Approval boundary:** 'single-pass' is an execution priority, NOT an excuse to assert perfection. Doug judges whether it actually resembles Terry; if not, report clearly.
