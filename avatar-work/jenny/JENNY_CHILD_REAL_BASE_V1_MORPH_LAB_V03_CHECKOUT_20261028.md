# CHECK-OUT — Jenny genuine child MakeHuman rig + 4675 reference morph lab v0.3 (Oct 28 2026)

Owner said **Do it**: build reusable face morphing system for Jenny, using uploaded `4675-3d.glb` as reference, and a true child MakeHuman body. Accomplished staging base and tested reusable add-on, **NOT a completed Jenny likeness**.

## Staging build / workflow
- Staging branch: `gater/jenny-child-mpfb-4675-stage-20261028`; workflow GitHub Actions run https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40634486605 **completed SUCCESS**. Official MPFB 2.0.18 / MakeHuman CC0 source used. New code `world-creator/scripts/build_jenny_child_native_STAGE.py`, workflow `.github/workflows/jenny-child-native-staging.yml`. Outputs saved to run artifacts, NOT main, and no deployment.
- Real native MakeHuman **age macro 0.125 (~7 years)**, child proportions, ~1.22m scaled overall after child phenotype, with original continuous head/neck/body, 52-bone armature, 5 preliminary animation clips. Verified GLB structural integrity. Its automated original scene preview had duplicate visible models (staging clone + source) and dress floating; **original artifacts NOT accepted visually** despite structural action success.
- From GH Action artifact, fixed dress placement and scale in a LOCAL, isolated Blender working copy; removed stray export Icosphere. Produced `Jenny_Child_V1_DressCorrected.glb` (14,017,968B; SHA256 `55266ee887f7eba2218fb8f0ed55b62118e1a93bac42d553e18aea9e9a137a4a`) and `Jenny_Child_V1_DressCorrected.blend`; still rough dress neckline and not production ready. Created standalone `Jenny_Native_Child_Base_V1_Viewer.html` (18.7MB) with complete embedded GLB and cameras/clip controls, plus fully clothed rendered QA PNG. No Android WebGL manual validation.
- Head bone +13 degree rig test passed: sampled face moved ~19.5 mm average, lower neck sample remained anchored.

## Face morphing source software v0.3
- New revised Blender 5.2 add-on `wvlrp_face_morph.py` v0.3, remains LOCAL in ChatGPT exported assets. v0.3 supports actual MakeHuman native child **active phenotype shape keys**, does not falsely reject them, maintains existing native rig and vertex positions through separate facial shape-key deformation. Paired landmark protocol 16 guide pairs with face ROI/neck mask.
- Tested on **actual 52-bone child MakeHuman rig**: 14,517 vertices, 3,489 changed max 3.6mm, 11,014 guarded/frozen, **original child body and armature unchanged**, 15 pre-existing active native MakeHuman phenotype keys retained. All smoke tests passed. Landmarks were UNCALIBRATED/APPROXIMATE, so this is technical compatibility proof, **NOT** matching Jenny's face. No scan geometry grafted/welded onto native head.
- Created working editable scene `Jenny_4675_Child_Morph_Workbench_V03.blend`, with native rigged MakeHuman age-seven child and user's 4675 scan in a separate side-by-side reference object, 16 marker guides and embedded morph tool. This is the next workbench for carefully moving reference/target landmarks and then likeness validation.
- Supplied 4675 source was preserved and NEVER uploaded to public GitHub, since scan may be licensed. Input SHA256 `1ae71cc93ed3fd579c4675e9688744df00c6f7bec102b6a84851c59fdcbd25d5`, 138609 verts and 198854 tris, many open boundaries, no rig or animation.

## Status / acceptance boundary
**Complete:** isolated native age-seven child MakeHuman structural build, corrected demo clothed export, mobile-usable standalone viewer HTML generated, reusable Blender face morph addon v0.3 tested on real child rig, editable joint workbench. **Not complete:** authentic Jenny-4675 face morph/likeness, professional hair/skin match, dress deformation and child-safe full animations/pose checks, owner phone visual approval, production deploy. Existing Penny, Sophie 1, SAV4 V21, Flat03 and source 4675 intact.

## User delivery links (ChatGPT local artifacts, not GitHub stored binaries)
- `/mnt/data/Jenny_Native_STAGING_20261028/Jenny_Child_V1_DressCorrected.glb`
- `/mnt/data/Jenny_Native_STAGING_20261028/Jenny_4675_Child_Morph_Workbench_V03.blend`
- `/mnt/data/Jenny_FaceMorph_Kit_20261028/wvlrp_face_morph.py`
- `/mnt/data/Jenny_Native_Child_Base_V1_Viewer.html`
- `/mnt/data/Jenny_Native_STAGING_20261028/Jenny_Child_V1_Clothed_QA.png`

Main/production frozen under GitHub Issue #29; no public deployment.
