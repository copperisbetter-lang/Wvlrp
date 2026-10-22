# Laura 2 — 3DDFA_V2 free CPU reconstruction failure register

Keep this alongside the workflow so future reruns do not repeat solved failures. Source: GitHub Actions run logs for `.github/workflows/test-laura-free-3ddfa.yml`. **Successful OBJ export confirmed in run #10.**

| Run | GitHub run | Actual failure | Applied remedy | Result |
|---|---|---|---|---|
| 1 | [#1](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39666378538) | Failed; exact traceback not reviewed | Added extra diagnostics and reran | Historical; do not infer root cause |
| 2 | [#2](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39666634346) | `ModuleNotFoundError: torchvision` | Install torch **and torchvision** from CPU PyTorch index | Passed this step in #3 |
| 3 | [#3](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39667656516) | `ModuleNotFoundError: matplotlib` | Install matplotlib | Passed this step in #4 |
| 4 | [#4](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39668386630) | `torch.onnx.OnnxExporterError: Module onnx is not installed` | Install onnx alongside onnxruntime | Passed this step in #5 |
| 5 | [#5](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39668758850) | `AttributeError: module numpy has no attribute long` in `bfm/bfm.py` | Patch `astype(np.long)` to `astype(np.int64)` after cloning | Passed this step in #6 |
| 6 | [#6](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39668992318) | `AttributeError: module numpy has no attribute int` in compiled `FaceBoxes/utils/nms/cpu_nms.pyx` | Patch `np.int` to `np.int32` and rebuild Cython extension | Pending verification in #7 |

| 7 | [#7](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39669377331) | Rebuild command attempted nonexistent `FaceBoxes/setup.py` | Read upstream `build.sh`; use `(cd FaceBoxes && sh ./build_cpu_nms.sh)` | Pending verification in #8 |

| 8 | [#8](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39669892867) | `ValueError: Buffer dtype mismatch, expected 'int_t' but got 'int'` in NMS after patching `np.int` to `np.int32` | Use `np.int64` to match Cython `int_t` buffer type; rebuild with upstream script | Fixed in #10; #9 was inadvertently identical to #8 |

| 10 | [#10 — SUCCESS](https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39670216797) | No error; 3DDFA reconstructed sample OBJ and uploaded artifact `free-3ddfa-sample-obj` (artifact ID `12379351616`, 2,302,375 bytes compressed) | Preserve this workflow as known-good baseline | **PASSED** |

## Reusable installation sequence

1. Clone upstream `cleardusk/3DDFA_V2` (record upstream SHA).
2. Python 3.9, `numpy<2`, `Cython<3`, `setuptools<70`, OpenCV headless, SciPy, PyYAML, Matplotlib, ONNX, ONNX Runtime.
3. CPU PyTorch **and torchvision** from official PyTorch CPU wheel index.
4. `sh build.sh`.
5. Apply the two NumPy source compatibility patches and rebuild `FaceBoxes` Cython NMS extension with upstream `FaceBoxes/build_cpu_nms.sh` (not `setup.py`).
6. Run `python demo.py -f examples/inputs/emma.jpg -o obj --onnx --show_flag false`.
7. Validate an OBJ exists and has geometry, then upload artifact. Do not declare success based on dependency install alone.

## Important constraints

- Use public sample image only in public workflow; never upload Laura's private images to public repository.
- An OBJ face is **not** MakeHuman-compatible topology or a rigged full body. Head-to-body fit and facial rigging are separate steps.
- No paid API or commercial reconstruction service is involved.
- Verified successful artifact: https://github.com/copperisbetter-lang/Wvlrp/actions/runs/39670216797/artifacts/12379351616
- Next: validate OBJ geometry counts and prepare private Laura photo input and head-to-body transfer. Do not overwrite the working workflow without a tested backup.

## 2026-10-21 confirmed THREE-head root cause and fix (after Build 10)

- **Direct evidence from run 10 job #119465809591:** log says `Detect 3 faces` while processing `examples/inputs/emma.jpg`, then serializes all detected faces into the same OBJ. The upstream 3DDFA_V2 `demo.py` passes all boxes to `tddfa(img, boxes)`, then all meshes to `ser_to_obj`. Therefore three spatially separate reconstructed faces are the expected result of this sample. This is NOT a MakeHuman problem.
- **New source control fix:** `world-creator/scripts/patch_3ddfa_single_face.py` patches upstream `demo.py` to sort detected bounding boxes by pixel area, select the largest ONE, assert exactly one fitted param and ROI box, and fail if the upstream patch anchor changes.
- **Workflow change:** `.github/workflows/test-laura-free-3ddfa.yml` now checks out the project, applies the one-face patch after dependency repairs, and reconstructs only the selected face.
- **Verification outstanding:** execute the patched workflow and inspect its logs for `WVLRP single-face gate: selected 1 of 3 detections`, artifact creation, mesh geometry, and a phone-visible single-head viewer before claiming visual success. Existing Build 10 artifact remains an uncorrected THREE-face sample; do NOT present it as repaired.
- For Laura's future images, avoid automatic largest-face selection if the subject is ambiguous; require face/subject confirmation. Photograph privacy and separate body-fit work still apply.
- This solves the `three faces exported` mechanism, but not yet photo likeness, deformation, mesh completeness, texture distortion, or rig/body fit. Those each require their own QA.
