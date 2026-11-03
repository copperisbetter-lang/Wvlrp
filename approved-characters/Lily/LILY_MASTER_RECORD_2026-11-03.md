# LILY — saved/approved-for-now character record (2026-11-03)

**Owner designation:** Lily, Jenny's friend. **Age exactly seven**, visually approved as "good enough for now." Keep exact originals intact; clone before refinements. **Do not confuse with the earlier rejected older-looking brunette prototype.**

Full production-quality 3D character is **NOT** in The Wild game yet; this record identifies saved rigged master models and their working standalone viewer. Character has a neutral child-safe body and age-appropriate clothes.

## Canonical 3D model storage
- Canonical source: [corrected Lily character folder](https://github.com/copperisbetter-lang/Wvlrp/tree/feature/ara-young-explorer-correct-seven-20261103/prototypes/ara-young-explorer-three)
- Secondary preserved branch reference: [archive/lily-approved-20261103](https://github.com/copperisbetter-lang/Wvlrp/tree/archive/lily-approved-20261103/prototypes/ara-young-explorer-three)
- Exact source commit at backup creation: `c9f18b11a61fbdd227d7b5d9cd2813f9c259b6c3`.
- Detailed metadata on both branches: `prototypes/ara-young-explorer-three/LILY_APPROVED_CHARACTER_RECORD.md`.
- QA results: `AGE7_REMAKE_QA.json` + `AGE7_FINISH_REPORT.json`.
- Rebuild source: adjacent `*.params.json`, `age7_glb_finish.py`, `age7_repair_existing.py`, `.github/workflows/ara7-correct-seven.yml`.

| Approved 3D asset | SHA256 | Bytes |
| --- | --- | ---: |
| `Ara7_Swim_Colors.glb` — one-piece swimsuit | `46bd11d4bd40fc6932f67b7394e5c86e518a9a8ac44b9c7b10fc70e9c64c1d5d` | 15,753,768 |
| `Ara7_Pink_Sundress.glb` — sundress | `a73201b180aa7bc48e73213d57b4b5bf6ee2da9b5afb8da16476bcb12b599f9a` | 16,611,240 |
| `Ara7_Neutral_Mesh_Reference.glb` — opaque shirt and shorts | `c37f5fb423c23c6b13a5b5f35b67b117835ab9396149d45a5d0bfc133f5db5c6` | 15,755,856 |

All three preserve 80,268 skin triangle indices, 69 joints, and 77 animations. Same character/face. Age parameter `0.1125` maps to seven years; full skeleton/height target 1.22m; dusty blonde hair and light green eyes.

Viewer: https://wvlrp.com/world-creator/character-previews/ara7/viewer.html?v=age-seven-corrected-20261103

Saved for continuity in [Issue #29](https://github.com/copperisbetter-lang/Wvlrp/issues/29). **If changing Lily, start from the archive and keep originals intact.** No promise of extra physical off-GitHub storage; second branch is an independent Git ref to same saved Git objects.
