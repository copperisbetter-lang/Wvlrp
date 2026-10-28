# Jenny 4675 facial morph — real native child MakeHuman V3 test, 2026-10-28

Owner: "Do it" following Jenny's genuine child MakeHuman body + first FaceMorph software prototype.

## Completed locally in Blender 5.2.3
- Input: `Jenny_4675_Child_Morph_Workbench_V03.blend`; native MPFB **child age .125 (~age 7)**, 52-bone rig, 15 active child phenotype shape keys and 14,517-vertex continuous full body. Independent owner-provided `4675-3d.glb` is **reference only**, not transplanted.
- Calibrated actual **12 pairs** of front-photo-selected reference/base landmarks to ray hits on the meshes (chin, nose, cheeks, inner/outer eyes, corners of lips and neck), replacing bounding-box placeholder landmarks. Used proper similarity alignment and constrained RBF facial shape key.
- V1 moved 3,058 verts max 14.4mm, and V2 moved 2,975 max 6mm, but QA **FAILED**: eyes and lips distorted relative to separately rigged eyeballs / mouth. V1 and V2 **REJECTED**, keep for tech diagnostics only. No user-facing "finished" claim.
- V3 preserved original eye/lip attachment positions with smooth guards, reduced max face displacement to **2.87mm**; shape morph on rig-compatible head only, with **12,135 vertices frozen** and **2,357 inside active mask** (nonzero differs from this), original child source body untouched. No disconnected scan/head replacement or new neck seam.
- New V3 local GLB `Jenny_4675_FaceFit_V3_RigSafe_Clothed.glb`, 14,213,216 bytes SHA256 **85d3c8539545dec96356822ed3ea302e70eba32656dee288e89d87a13dd6a606**. One glTF skin with **52 joints**, five original starter animation clips: Idle, Walk, Wave, Hands and Knees, Elbows and Knees. Read/verified exact exported GLB JSON. Not full animation QA.
- Editable project `Jenny_4675_FaceFit_V3_RigSafe_WORKING.blend` retains hidden untouched MakeHuman child body and private reference scan. Profile/front/fullbody Blender CYCLES QA rendered, checked manually. V3 retains eye symmetry, closed natural mouth, and connected neck; **likeness to 4675 remains loose/subtle**, not approved.
- Standalone phone HTML viewer `Jenny_4675_FaceFit_V3_Viewer.html` with exact verified embedded V3 GLB bytes and JavaScript syntax check; face front/side, body and clips controls, clothed only. Actual Android load not yet independently confirmed.
- Reusable Blender addon local file `Jenny_FaceMorph_Kit_20261028/wvlrp_face_morph.py` updated to **v0.4** with automated smooth eye/lip safety guard based on guide pairs, preserved native child morph/rig and non-destructive clone; real rig Blender regression **PASS**: 3,004 changed verts, max 3.6mm, original unchanged, 52 bones, 15 native active child shape keys.
- This v0.4 add-on and V3 binary/.blend remain **ChatGPT private conversation artifacts**, not pushed to GitHub; only this checkpoint document committed on isolated staging branch.

## Work still missing / honesty checkpoint
- 4675 real face likeness **NOT** fully matched: reference head has asymmetry and swept light hair; native child hair is straight, with basic texture and limited style. Face morph conservative to avoid eye failures. Requires manual expressive facial feature refinement and visual signoff.
- Dress shoulder/neckline remain wide and floating in QA; keep child clothed and continue wardrobe refinement without exposing anatomy. Only five starter animation clips and no full pose QA.
- No main/production or unrelated assets changed; #29 production freeze respected.
- Rejected 4672/Sascrotch head and Tank1 branch remain separate, never reuse it as Jenny.
