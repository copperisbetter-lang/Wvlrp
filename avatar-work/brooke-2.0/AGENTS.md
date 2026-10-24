# Brooke build rules

Read `RECENT-WORK.md` and `BROOKE_24H_FAILURE_AUDIT_2026-10-23.md` before changing this workstream. Consult the retained Brooke 1.1 current-work record on its named branch before replacing any checkpoint.

- Keep Sophie 1 and retained Brooke 1.0/1.1 checkpoints unchanged. Record exact source hash, output path and source image identities.
- Use `.github/actions/blender-runtime` for Blender workflows. NumPy must import inside the same Blender executable that will process the model.
- Every Blender Python build and validator invocation requires `--python-exit-code 1`. Preserve positive and intentionally failing negative regression tests. Do not disable a check to get green CI.
- Validate actual reference bytes, SHA256 and dimensions before expensive reconstruction. Do not substitute an older photo or generic prototype. Keep original reference images private unless Doug explicitly authorizes their publication.
- Each stage must consume the previous stage's verified output. A separate face overlay or a proportional baseline edit is not a completed anatomical head morph.
- Automatic build verification and manual photo reconstruction are distinct. A successful runtime/roundtrip check is not a new likeness. Do not reconnect the deprecated automatic overlay/sculpt publication chain.
- Model candidates require exact-asset front, both-profile and quarter-view inspection, body/rig preservation checks, a tested viewer, and Doug's visual approval. No approval is inferred from CI, filenames or silence.
- Use one publisher and immutable candidate assets; never rebase competing generated binaries into the same model path. Do not publish models automatically from reconstruction.
- Update `RECENT-WORK.md` during each edit/run/result sequence, including failures and green runs. Log actual evidence and unknowns; include exact run/commit/viewer links. Use `[skip actions]` for documentation-only commits.
- Read and post the relevant handover in issue #29 before deployment. A Bell post is not proof other Gaters have read it.
- When an error signature repeats, stop that path and identify a root-cause change before another attempt.
