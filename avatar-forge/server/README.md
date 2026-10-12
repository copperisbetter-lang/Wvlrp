# Avatar Forge API — initial backend

Run on a **private GPU machine** (not the static WVLRP website):

```bash
cd avatar-forge/server
pip install -r requirements.txt
export FORGE_TOKEN="replace-with-long-random-secret"
uvicorn main:app --host 127.0.0.1 --port 8765
```

This stage accepts five consistent photographs, validates files, stores them in a per-job private directory, reports job status, offers GLB download **only when a real generated GLB exists**, and allows deleting photos.

**Not implemented yet:** reconstruction, automatic humanoid topology, skeleton, skin weights, animation, persistence across server restart, authentication user accounts, TLS/public deployment. Do not expose this initial API directly to the public internet. A GPU reconstruction worker and a rigging/export worker must be implemented and verified before generation is enabled.

Do not store photos of real people without consent. Set a retention policy before public launch.
