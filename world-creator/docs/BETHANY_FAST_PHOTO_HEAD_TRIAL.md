# Bethany — faster photo-to-3D head trial (isolated; NOT APPROVED)

Updated: 2026-10-31. Working branch: `feature/bethany-stage8-landmark-morph-20261031`.
This is a **test protocol**, not proof of any photo-to-MPFB conversion. Do **not** modify production, Sophie 1, or the existing Bethany Stage 2 viewer.

## Verified baseline
- Stage 7 GitHub Actions run `41232686709` completed successfully. Artifact `13054558531`. Original native source preserved.
- Stage 8 GitHub Actions run `41234881624` completed successfully. Artifact `13055098751`: `Bethany_EDITABLE_MPFB_STAGE8.blend`, `Bethany_STAGE8.glb`, front/left/right/threequarter PNGs and JSON report. Model was built with MPFB2 2.0.18 on Blender 4.2.
- 56 native MakeHuman shape controls and 52 rig joints retained. 34 controls changed, maximum Stage7-to-Stage8 evaluated vertex delta **3.268207 mm**, mean **0.316898 mm**, 3,241 vertices >0.1 mm.
- **NOT owner-approved**: eyes, lower-face, and nose still do not match protected reference closely enough. Side-by-side renders show skin-coloured gaps/patches in hair/scalp; worse in Stage8. This is a visual issue despite successful file/rig verification.
- Protected original reference: ChatGPT Library `/The Wild/Character References/Birthday Girl 18/Blonde Character Study Montage.png`, Library ID `libfile_051fca84c7388191b702a1f86c18407b`. **Never upload to public GitHub**. Do not treat orthographic photo views as exact real-world millimetres without lens calibration.

## Trial A: KeenTools FaceBuilder for Blender — recommended first
Official product & Linux compatibility: https://keentools.io/products/facebuilder-for-blender
Official download: https://keentools.io/download/facebuilder-for-blender

- FaceBuilder supports multi-photo head construction, AI-assisted alignment and one-click texturing. An unrestricted **15-day trial** is advertised. Official version of 64-bit Blender on Linux is supported. It is a licensed add-on and requires GUI/graphics and licensing checks. No purchase or activation has been performed in this workstream.
- **Important limitation:** FaceBuilder does **not** morph custom native MakeHuman topology directly. Its exported head is a separate mesh. Wrapping / geometry-transfer to MPFB2 is a **distinct unverified step**. The one-shot *head creation* does not imply one-shot **game-ready Bethany**.
- Use the **approved front and both profile photos**, same identity and neutral pose; keep images local/private. Fit and export a head with geometry and textured UV. Time the operation.
- On a disposable copy of the Stage8 MakeHuman model, use non-destructive topology-preserving conform/wrap from FaceBuilder to **existing MPFB head vertices** only, with boundary feathering across neck and scalp. No automatic nearest-surface projection across disparate facial areas, no replacement of native body and rig, and no irreversible merge to master. Store source head and vertex mapping separately.
- Retest native morphs, 52 joints, eye blink, mouth open, neck yaw, expression poses, and skin/hair intersections. Check detached neck seam and double mesh surfaces; explicitly review both side profiles and scalp at the temples.
- Preserve skin, hair and eye textures from original unless a deliberately approved texture replacement is generated. Verify raw image alpha and hair cap in renders; passing file-size/image-name checks does not prove a correct visual render.
- Save .blend + .glb + front/left/right/threequarter renders + measured reports. Keep all experiments isolated; no production upload.

### Measurable pass criteria
1. End-to-end hands-on time **under 90 minutes** from two/three photo inputs to valid MPFB-rigged textured result, with a stretch target under 30 minutes after template setup. Times are *goals*, not performance promises.
2. All existing native MPFB facial morphs and at least 52 skin joints preserved, with face morphs still functional. Same original body vertex count and valid surface manifold boundaries or explicit intentional separated eyes/hair.
3. No visible neck seam, double face, temple gap, pink scalp hole, or hair intersection in four orthographic renders and a rotating viewer.
4. Objective correspondence: record a consistent set of manually verified landmarks in front/profile (outer/inner eye corners, pupil positions, nose root/tip/alar wings, lip corners, philtrum, cheek apex, jaw angles, chin) and normalized ratios relative to interpupillary span. Record all absolute errors and owner visual review; don't invent likeness percentages.
5. Artifacts saved on a reproducible branch and reviewable, **owner approval required**. If steps 2–3 fail or take longer than native approach, reject this pipeline rather than hiding defects.

## Trial B: Reallusion Headshot 3 with Character Creator 5
Official: https://www.reallusion.com/character-creator/headshot/
- Image-to-3D into **Character Creator's own character and rig**; not a native MakeHuman head fitting system.
- Windows 10/11 required; paid license after trial and a dedicated computer with suitable GPU. Not suitable for our current Linux/MPFB pipeline unless we deliberately approve a full character/rig migration.
- Defer until a specific compatibility and cost test justifies abandoning MakeHuman; **do not purchase** without owner approval.

## Current next action
Do not start Stage 9 by randomly raising MPFB sliders. First test photo fitting on disposable content using a compatible GUI environment and the available trial, then measure the transfer cost. If no licensed GUI/GPU desktop is available, keep Stage8 unchanged and document the blocker rather than claiming a completed one-click integration.

## Preservation and coordination
Read GitHub Issue #29 (GATOR bell protocol) before shared changes. Gator 1/2 have character responsibilities, Gator 3 terrain. Do not touch production. Avoid publishing user-private character references, proprietary/licensed geometry, or access tokens. Stage8 report includes owner_approval=false.