# Tank 1 head swap — 4672 — staging record (2026-10-27 ET)

**Requested:** Replace Tank 1's original SAV4 V21 head with the user's supplied `4672-3d.glb` while retaining dress. Preserve approved SAV4 V21/Sophie 1, independent Tank 1 backup, other models, main and production.

**Current source branch:** `gater/tank-1-sav4-v21-dress-20261027`, original body copy `world-creator/assets/tank-1-v21.glb` (blob SHA `b4e70180ac44c4e3626fcc1fcf7390cf46342b45`).

**New uploaded source:** `4672-3d.glb` 8,233,328 bytes received as conversation attachment (not in GitHub repository). Includes head, shoulders and shirt; one static textured mesh with no bones or animation, 138,956 vertices and 194,330 triangles. Material's metallic factor was 1.0; adjust to skin-appropriate matte appearance on clone.

**Prepared head-only output:** `Tank1_4672_HeadOnly.glb`, 6,134,336 bytes, SHA-256 `6f14ebfd1f9361efd46ef24d1c76db08d2e55df8db9968bd1bb4506292a31ea4`, 96,510 vertices / 132,586 triangles. Trimmed old shirt/shoulder region at head-local Y > -0.095 m, source original unchanged. New GLB is static/unrigged.

**Prepared in-chat standalone artifact:** `Tank1_4672_HeadSwap_Viewer.html` (~8.2 MB), embeds this exact trimmed head binary; at runtime fetches the existing Tank 1 SAV4 V21 body from the version-pinned raw GitHub URL and shader-clips the original head above the neck. Has fitted removable teal dress, front/side/rear/head camera, six live fit sliders, comparison toggle, fit JSON export and optional GLB export with actual old-head faces cut from a COPY of the body (preserving neutral-pose rig attributes). No changes to the body origin and source. JS source parsed successfully and embedded head GLB validated with trimesh; live WebGL Android 3D fit not confirmed, and exported file not yet tested. Browser GLB export head remains static/unrigged and needs neck seam finishing and head-bone attachment before animation.

**Important limitation:** `4672` asset is NOT yet present on the GitHub branch. The resulting combined physical GLB is NOT committed, and should not be claimed as ready/rigged. Local viewer exists in the owner ChatGPT conversation file attachment; remote GitHub connector currently does not support direct binary upload from the session container. Do not silently replace the pinned body GLB. Complete and QA exact head integration once binary source can be committed through an authorized transfer workflow.

**Staging rule:** Under Issue #29 production freeze, no main deploy and no edits to locked masters. Distinct Tank1 branch only.
