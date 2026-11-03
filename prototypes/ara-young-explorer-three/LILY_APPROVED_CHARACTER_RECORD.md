# Lily — approved-for-now character master

**Identity:** Lily, Jenny's friend in *The Wild* (not Gina, Jenny, or Beverly).
**Owner decision:** "Good enough for now" (2026-11-03); preserve this exact model and do not replace or overwrite without owner direction.
**Age:** Seven years old; MakeHuman/Ara `age=0.1125`, target body height 1.22 meters.
**Appearance:** Dusty blonde hair, light green eyes, younger childlike facial proportions.
**Character source:** Ara 3D Gen (same generator family used for Gina), MakeHuman CC0 base, isolated age-seven correction.
**Saved state:** 3 interchangeable, matching **rigged GLBs**, not static screenshots:
- `Ara7_Swim_Colors.glb` — actual age-appropriate bright one-piece swimsuit (no cargo pockets), 15,753,768 bytes, SHA256 `46bd11d4bd40fc6932f67b7394e5c86e518a9a8ac44b9c7b10fc70e9c64c1d5d`.
- `Ara7_Pink_Sundress.glb` — pink sundress and sandals, 16,611,240 bytes, SHA256 `a73201b180aa7bc48e73213d57b4b5bf6ee2da9b5afb8da16476bcb12b599f9a`.
- `Ara7_Neutral_Mesh_Reference.glb` — opaque child-safe tank top and play shorts, 15,755,856 bytes, SHA256 `c37f5fb423c23c6b13a5b5f35b67b117835ab9396149d45a5d0bfc133f5db5c6`.

**Source path (all files and scripts):** `prototypes/ara-young-explorer-three/`
**Original approved branch:** `feature/ara-young-explorer-correct-seven-20261103`
**Regeneration inputs:** paired `*.params.json` files, `age7_glb_finish.py`, `age7_repair_existing.py`, workflow `.github/workflows/ara7-correct-seven.yml`.
**Verification:** `AGE7_REMAKE_QA.json`, `AGE7_FINISH_REPORT.json`, GitHub Actions success run [41666204561](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/41666204561): all 3 have same full body mesh (80,268 indices), 69 bones, 77 animations. Clothing remains age-appropriate.
**One-tap phone viewer:** https://wvlrp.com/world-creator/character-previews/ara7/viewer.html?v=age-seven-corrected-20261103
**Published viewer file:** `world-creator/character-previews/ara7/viewer.html` on main; references model GLBs from corrected branch.
**Story relationship:** Jenny's friend. No assertion that Lily has already been added to a playable quest or Stacey Lake. Do not change gameplay without explicit request.

## Recovery instructions
1. Search GitHub Issue #29 for **Lily** and this file.
2. Retrieve the GLBs by the exact paths above from `feature/ara-young-explorer-correct-seven-20261103` or its backup branch `archive/lily-approved-20261103`.
3. Compare SHA256 values to the approved versions above; never regenerate without checking whether the originals still exist.
4. Keep these 3 saved variants together. Do not substitute the **older rejected brown-haired ~13-looking** `feature/ara-young-explorer-three-20261103` prototype.
5. If modifying Lily, clone first and keep these originals unchanged.

**Acceptance level:** User-approved **good enough for now**, not a claim of polished final gameplay or phone performance certification.
