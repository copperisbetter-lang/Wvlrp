# Jenny (approximately age 7) — Native child MakeHuman / FaceMorph staging

Owner explicitly requested: child-proportioned **MakeHuman** body, Jenny's newly uploaded **4675-3d.glb** as facial reference, and reusable rig-preserving face morph software. User said **"Do it"** (2026-10-28).

## Authoritative constraints
- **Not Jimmy. JENNY.** Genuine age-seven child morphological target; not an adult body scaled down. Already existing repo spec at world-creator/JENNY-PENNY-REBUILD-2026-10-14.md.
- Original supplied 4675: child/young face with long hair and shoulders, 138609 vertices, 198854 triangles, 72612 open edges; no skeleton, no animations. Reference **only**, not a mesh to weld onto another neck. User owns the private binary; **not copied to public GitHub**. SHA256 original: 1ae71cc93ed3fd579c4675e9688744df00c6f7bec102b6a84851c59fdcbd25d5.
- Build genuine child topology and full native rig using MPFB/MakeHuman age macro 0.125; approximate 1.22m height normalization is AFTER child phenotype, not adult shrink. Dress/eyes/hair/clips from existing MPFB build are staging only; appearance, child proportion, clothing, motion all require owner QA.
- Reference-only face morph: use Blender add-on WVLRP FaceMorph Lab 0.2 from conversation package; 16 paired landmark guides and spatial+neck masks on cloned native child face, preserve original neck/body/armature/UV/weights. **No automatic guaranteed likeness**. Likeness validation needs real matched landmarks, aligned textures, child-safe clothed viewer.
- Do not replace or edit existing Jenny/Penny legacy GLB or Sophie1, SAV4 or Flat 03.

## Repo stage
- Working branch: `gater/jenny-child-mpfb-4675-stage-20261028` (separate from rejected Tank1/4672 work).
- Program: `world-creator/scripts/build_jenny_child_native_STAGE.py`. A renamed, non-production copy adapted from pre-existing `build_young_explorer_real.py`, with official MPFB base and age=0.125. Does not publish to main and does not incorporate 4675 source.
- Workflow: `.github/workflows/jenny-child-native-staging.yml`, isolated branch push trigger limited to workflow file path; installs Blender 4.2, MPFB 2.0.18, and original MakeHuman CC0 system asset pack; builds/QA; uploads workflow artifact ONLY.
- Workflow run URL: https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40634486605
- Local private user delivery: `Jenny_4675_Child_MakeHuman_Stage_Kit_v03.zip` with `4675-3d.glb`, stage .blend, FaceMorph 0.2 addon and tested synthetic demo, scans front/back/side, `prepare_jenny_child_workbench.py`. This kit is a **workbench**, not completed Jenny.
- When the GitHub Actions child GLB exists, import it into private Blender workbench side-by-side with 4675; do not morph until precise paired facial landmarks and masks set. Do not claim finished until pose / skin / face / front and side phone QA.

## Production
GitHub Issue #29 freeze intact: NO main branch writes, deployment, or sale/license changes. The only writes are isolated branch stage code and Issue #29 coordination comments.
