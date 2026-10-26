# Gater 2 — Sandy Blonde full continuity handoff (2026-10-26)

**This is the authoritative GitHub quick recovery index.** The much more detailed 15 KB handoff was also saved in ChatGPT Library `/Recent/SandyBlonde_G2_Full_Recent_Handoff_2026-10-26.md`; accompanying reference image and both physics ZIPs are preserved in `/Recent`.

## User's authoritative request
Finish fixing the realistic adult original Sandy Blonde 3D character **before sending a viewer**. Use an *independent exact Sophie 1 GLB clone* as source geometry/materials, never alter approved Sophie 1. Sculpt the cloned body to the user's attached pink-bikini front/back/3/4 body reference, but make a **unique original face** (not Sophie's and not the reference woman's). Green eyes, warm skin, **long straight sandy-blonde hair behind both ears**. No primitive Atari-like placeholders. User will separately download good clothes; **defer wardrobe work** until the body, face and hair are visually right.

## Working source / view
- Repository: `copperisbetter-lang/Wvlrp`
- Feature branch: `g2/sandy-blonde-sophie1-clone-20261025`
- Source original: `world-creator/assets/sophie-1-native-fit.glb` (never change)
- Initial clone: `avatar-work/sandy-blonde/sophie-1-working-clone.glb`, identical Git blob SHA `b4e70180ac44c4e3626fcc1fcf7390cf46342b45`.
- Blender builder: `avatar-work/sandy-blonde/build_sandy_blonde.py`; offline viewer bundler `build_viewer.py`; browser `viewer/main.js`; smoke test `viewer/smoke.mjs`; dedicated Actions workflow `.github/workflows/build-sandy-blonde-sophie-clone.yml`.
- Generated WIP files in `avatar-work/sandy-blonde/build/`: `Sandy_Blonde_Working.blend` (editable), `Sandy_Blonde_Sculpt_WIP.glb`, `Sandy_Blonde_Offline_Viewer.html` (single-file GLB/JS embedded), PNGs `Sandy_Original_Face_Front.png`, `Sandy_Hair_ThreeQuarter.png`, `Sandy_Hair_Back.png`, `Sandy_Blonde_Android_Smoke.png`, and `build-report.json`.
- Source/Viewer index: https://github.com/copperisbetter-lang/Wvlrp/tree/g2/sandy-blonde-sophie1-clone-20261025/avatar-work/sandy-blonde
- Coordination/Rule 29: https://github.com/copperisbetter-lang/Wvlrp/issues/29

## Verified current state
- Latest confirmed successful GitHub Actions run: **40273264658**; Blender import/render/GLB export, offline viewer bundling, and headless Chromium 412x915 smoke test all passed.
- Original Sophie clone continuous body: **14,483 vertices**, current height **1.6764m** vs target 5ft 7in. Latest body has **3 editable sculpt morphs**: reference body, unique facial sculpt, chest contour.
- Native textured long01 hair recolored sandy blonde (not tube rods), green iris texture, warmed skin, attached brow mesh. Latest Blender front/3/4/back previews exist but appearance **not user-approved**.
- Viewer smoke: **5 meshes, 52 bones, 3 morph controls, 0 animation clips**. Thus NOT 156 bones, NOT animation/game-ready, and NOT verified on physical Samsung Android yet.
- **Known remaining defect:** a pale triangular/open pelvis region visible in viewer. Blender diagnostics saw 2,278 source mesh boundary edges (224 near pelvis). A selective bmesh hole-fill was added on branch but latest report shows **`pelvis_patch_faces:0`**; do not claim repaired. Must diagnose proper topology/UV/material without modifying Sophie 1 original.
- Camera full-body fit expanded to avoid cropped feet; last real Android smoke screenshot must be inspected before claiming fixed.
- User's separate motion code zip files in ChatGPT Library Recent: `SandyBlonde_SecondaryMotion_Tested.zip` (walk/run/swim bounce); `SandyBlonde_Gravity_Supine_Motion_v3.zip` (lying on back flattens and shifts outward; side-lying gravity). Algorithms tested but **not bound to this 52-bone model**.
- Additional eventual game specs: target 156-bone rig, play as character in Base Camp/Stacey Lake, walk/run/jump, sit legs apart, bend/kneel/elbows-and-knees, freestyle/breaststroke/tread/back float/dive, water joystick control, wet hair dries in **120 seconds** after exiting water. No completion claim.

## Immediate next steps
1. Inspect latest renders and phone-sized viewer screenshot, and fix unresolved pelvis seam/opening. Keep viewer real, offline self-contained and never 404 or missing GLB.
2. Verify body/photo match, custom face, sandy-blonde textured hair behind ears, green eyes, feet framing. Ensure no crude mockup and show actual model.
3. Deliver viewer to user via verified accessible path when visual fixes pass. GitHub raw HTML might download as plaintext, so hosting/offline link needs testing. User is on a Samsung A17.
4. Await user's new clothing files; do not work on bikini/clothes now.
5. Rig/motion/game integration later, after appearance approval, with G1 review in issue #29.

**All originals, other avatars and production WVLRP/pond must remain untouched.**
