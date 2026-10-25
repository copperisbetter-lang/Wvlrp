# Brooke 3948 — V4 handover (2026-10-25)

Owner: Gater working on Brooke head; G3 works on Mona, separate workstream.

V3 viewer: /3948-calibrated-face-v3.html
V4 viewer: /3948-calibrated-face-v4.html
Source model: /3948-3d.glb (unchanged)

User evaluated six screenshots of V3. Neutral resets correctly. Jaw opening gives downward lip pout rather than true jaw opening. Smile has limited mouth corner movement. Brow raise works but distorts eyes/eyelids. Lips round was user-confirmed as recognizable puckered kiss, PASS with minor refinement required; preserve the effect.

V4 code changes: jaw now moves broader lower region; reduces lip-only movement; smile localized to corners; lips round slightly softened; brow motion damped near eye band. Original 3948, Brooke 1, Sophie 1 and V3 untouched. V4 deployed source committed cfa910e214398bf48b5e9bfaf04987ad85c5e20c. Needs user visual testing; no claim that mesh is fixed yet. The source V3 crown switch calls setCrown and then faceUpdate is not invoked, so crown toggle with active expression may reset expression until slider changes; investigate in later revision.

Next: open V4 on phone; test jaw, smile, lips round, brows and neutral separately; compare screenshot; correct based on results. Do not overwrite prior versions.
