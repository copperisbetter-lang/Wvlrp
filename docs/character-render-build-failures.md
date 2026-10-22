# Character Render Build Failure Register

Purpose: prevent recurring failures across **every** WVLRP character (Brooke, Laura, Sophie, and future avatars). Before creating or editing any character rendering workflow, review this file and apply the preflight checklist. Append an entry for each failed workflow run, with a link to the actual GitHub Actions log. Never guess a cause; distinguish root causes from cascading symptoms. A proposed fix is not verified until a later run passes.

## Brooke failures investigated on 2026-10-22

| Run | Failed step | Evidence / reason | Prevention |
| --- | --- | --- | --- |
| [39831973028](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39831973028) | Single-head prototype structure | Structural assertion failed (exact assertion not yet extracted) | Check test fixtures and assertion output before changes |
| [39832111814](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39832111814) | Single-head prototype structure | `AssertionError [ERR_ASSERTION]: Expected three reference-photo inputs` | Supply a valid three-photo fixture or explicitly separate generic-prototype tests from reference-dependent tests; do not weaken likeness acceptance tests |
| [39834484336](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39834484336) | Upload GLB artifact | Blender glTF exporter could not import `numpy`; also logged missing Draco compression library. No GLB existed for upload. | Install/check NumPy in Blender's own Python; avoid optional Draco compression unless installed; fail on Blender Python exceptions |
| [39834684758](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39834684758) | Upload model and preview | Same missing NumPy; preview script was not yet present in that revision; GLB upload failed because output absent | Confirm scripts exist at the checked-out commit; check all outputs before upload |
| [39834808848](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39834808848) | Verify GLB/PNG | Missing NumPy caused export failure and missing GLB; later verification failed | Dependency preflight and immediate Python error exit |
| [39834904973](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39834904973) | Verify GLB/PNG | Same failure step; logs not separately inspected; suspected shared missing-NumPy cause, not independently confirmed | Inspect exact logs if it persists |
| [39834994512](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39834994512) | Verify GLB/PNG | Log confirms missing NumPy, absent GLB, and cascading preview failure | Dependency preflight and immediate Python error exit |
| [39835080912](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39835080912) | Verify GLB/PNG | Same failure step; logs not separately inspected | Inspect exact logs if it persists |
| [39835147983](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39835147983) | Verify GLB/PNG | Log confirms `ModuleNotFoundError: No module named 'numpy'`, missing GLB, and failed preview/verification. Blender reported success at workflow step level despite Python traceback. | Install NumPy and use `--python-exit-code 1` |

| [39839833570](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39839833570) | Validate exported head | **NumPy preflight passed (1.26.4)** and GLB build proceeded, but validator raised `AssertionError: Head has nonmanifold edges`. This is a separate geometry problem, not the former NumPy failure. | Inspect head mesh construction and boundary/loose edges; fix geometry without weakening the manifold check. |

Additional runs [39834709031](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39834709031), [39839482940](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39839482940), were still in progress when checked; their results must be recorded when complete.

## Corrective change

[Commit 3f071aa](https://github.com/copperisbetter-lang/Wvlrp/commit/3f071aa00981f9704b901a8f0a96aafb4cf91e4d) adds `python3-numpy`, an explicit Blender NumPy import check, and `--python-exit-code 1` on Blender script invocations. **Partially verified:** run 39839833570 confirms NumPy loads and the build reaches topology validation, but the overall run failed on nonmanifold head edges. Check compatibility of Ubuntu's NumPy package with Blender's embedded Python; if the import still fails, install NumPy into the actual Blender Python environment rather than assuming the system package is visible.

## Mandatory preflight for every character render

1. Confirm GitHub Actions checkout has every referenced script, photo/fixture, configuration and dependency.
2. Check `blender --version` and `blender -b --python-exit-code 1 --python-expr "import numpy; print(numpy.__version__)"`.
3. Disable optional GLB/Draco compression unless its native library is available.
4. Run Blender with `--python-exit-code 1` so exceptions stop the workflow immediately.
5. Validate actual GLB existence, magic bytes, length, mesh connectivity, expected morphs and eye components.
6. Validate actual PNG existence, signature, size and visual content; never count a missing artifact as a successful render.
7. Upload artifacts only after all checks pass; open the generated preview before calling the character model ready.
8. On any failure, record run URL, failing step, exact error, root cause, fix commit and verification run in this register.

## New entry template

### YYYY-MM-DD — Character — Run ID
- Workflow/run link:
- Commit SHA:
- Failed step:
- Exact log error:
- Root cause (confirmed / suspected):
- Cascading symptoms:
- Fix and commit:
- Verification run and result:
- Reusable prevention:
