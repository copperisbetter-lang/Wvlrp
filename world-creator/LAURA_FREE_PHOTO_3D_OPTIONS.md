# Free photo-to-3D options for Laura 2

Recorded 2026-10-21. No paid API or subscription required for the selected first experiment.

1. **3DDFA_V2** — https://github.com/cleardusk/3DDFA_V2
   - MIT-licensed; CPU/ONNX support; OBJ and PLY export.
   - First choice. Its `demo.py -o obj` produces a face mesh from one photograph.
   - Output is not a MakeHuman .target; fitting or topology transfer remains necessary.
2. **DECA** — https://github.com/yfeng95/DECA
   - Free for specified noncommercial uses, NOT unrestricted commercial use.
   - Detailed 3D head reconstruction; separate assets/dependencies and license restrictions.
3. **FaceVerse** — https://github.com/LizhenWangT/FaceVerse
   - Research face reconstruction; check model/checkpoint and derivative licensing before use.
   - Alternative newer code: https://github.com/LizhenWangT/FaceVerse_v4

**Privacy:** Never commit Laura's face photographs or reconstructed identifiable face to this public repo. Process user photos only in a private job with authorized input and publish private artifacts. The workflow initially tests only 3DDFA's public example image.

**Status:** Candidate list saved; sample-image smoke test to be performed before any real photo processing.
