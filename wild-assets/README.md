# The Wild — Asset Download Bridge

This is a GitHub Actions download worker, not a chat plugin or a live-game change.

## From this chat
Once this workflow is merged into main, the GitHub connector can create a reviewed JSON file in `wild-assets/requests/<id>.json`. The push starts the worker. GitHub Actions downloads the model into a **14-day workflow artifact**, not the published site or game. Retrieve it from the successful run's Artifacts section. Models must be inspected, converted/optimized, animated as necessary, and installed separately.

## Example request (NOT a real download URL)
```json
{
  "url": "https://example.org/files/animal.glb",
  "filename": "animal.glb",
  "source_page": "https://example.org/animal",
  "license": "CC BY 4.0 — verify attribution",
  "allowed_hosts": ["example.org"]
}
```
The hostnames must be explicitly reviewed, including any redirect hostnames. Supported files: GLB, GLTF, FBX, OBJ, BLEND, ZIP. Maximum 95 MiB. HTTPS only. Public internet endpoints only. Direct download URLs must work without signing in. No secrets or private downloads. License metadata is recorded but cannot be automatically verified. Avoid downloading unknown archives without review.

This bridge **does not independently read chat messages**. GitHub connector actions initiated from this chat create the request file. It also cannot automatically select sources or guarantee compatibility with our engine.
