# Tank 1 V10 — owner 11:32 PM screenshot fixes + rearward head alignment
2026-10-27 local project time.

Owner reviewed V9 Android screenshots (front, side, tight side) showing huge vertical wedge/fan on the back of the neck, light neck differing from dark head scan, dress top too wide/straps still awkward, and clarified **4672 head sits too far FORWARD**.

## Completed in isolated local Blender 5.2.3 session
- Opened original V9 immutable source **Tank1_4672_V9_Seamless_Body_Neck.blend** and created working V10 clone, leaving V9 and original SAV4 masters unchanged.
- Shifted 4672 imported head geometry **3.2 cm rearward** (+Y Blender source) and 2 mm downward. Head remains weighted to original Head/Neck bones; one 52-bone skeleton preserved.
- Discovered V9 extension rings had nontrivial Blender mesh vertex indexing: used boundary-face graph shortest path to explicitly recover the 57-per-ring / 12-row topology, then deformed only 684 extension vertices toward a much lower back-height profile, from old 1.513 m peak to ~1.454 m at rear; original body first 10,053 vertices and 18,154 faces unchanged. Correctly converted world-space target Z into body mesh local coordinates using body matrix world scale 1.2283.
- Protected complete original body texture: SHA-256 **b2a6ac8cd4f9febdb447368e29c76cd68410bb66e46d9dcfa2d5f75126eea8fc**, verified unchanged after export. Head-only custom image stays V5/V9.
- Exported **Tank1_4672_V10_RecessedHead_Neck.glb**, 16,948,656 bytes SHA-256 **9f200f515f33b9d76afbbf7e39d39db58531c411314ee0f54e816c9895d5061e**. Editable **Tank1_4672_V10_RecessedHead_Neck.blend** saved.
- Blender roundtrip verified 52 bones and neck mesh; rendered V10 Front/Side/ThreeQuarter QA PNGs. Side wedge is shortened significantly. A thin jagged seam **remains under the jaw**, and remaining head scan side-vs-body color discrepancy plus ragged rear texture still need final fitting. Dress straps remain imperfect; no claim of final approval.
- Packaged standalone HTML **Tank1_4672_V10_RecessedHead_Viewer.html** (~22.6 MB) with embedded exact V10 GLB; embedded SHA check passed and JS source `node --check` passed; no Android/WebGL live-session QA.
- Files exist as ChatGPT conversation downloadable artifacts; **not uploaded to GitHub** or production. No Flat 03 installation, per owner's explicit sequence: head approved first, then private licensed Flat 03.
- No main/production deployment due GitHub Issue #29 freeze.

## Next step
Do not create another long spire/collar. Inspect actual head scan lower boundary, weld or bridge at correct anatomical neck attachment without overshoot and seam, repair dark edge and clean cloth neckline, keep body atlas immutable. Test front/side/back and head motion; then request owner sign-off before installing Flat 03.
