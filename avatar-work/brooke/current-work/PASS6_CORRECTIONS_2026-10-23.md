# Brooke 1.1 — Pass 6 correction specification

Status: planned, NOT built or verified. Preserve Sophie 1, Brooke 1.0 and Pass 5.

Observed in five front-to-profile screenshots (2026-10-23): lips sit too far posterior to facial plane; upper brow is prominent, eyes over-open, upper-lip shading dark, lower-lip color incomplete.

## Required mesh changes
- Duplicate Pass 5 assets before editing; never alter approved baselines.
- Project both lips forward in the local facial normal direction, with smoothly blended philtrum, vermilion borders and chin transitions. Do not move entire mouth region rigidly or cause intersecting surfaces.
- Restore full, firm upper and lower lip volumes; lower lip modestly fuller; retain natural cupid bow and corners. Use photo reference to determine final displacement, not arbitrary fixed millimeters.
- Correct lip material coverage and eliminate mustache-like shadow above upper lip without flattening normal facial shading.
- Soften brow ridge and reduce dark eyebrow density; narrow excessive eyelid opening without moving eyeballs or compromising blink geometry.
- Verify front, 3/4, left/right profile, close-up and GLB round-trip; confirm no inverted normals, cracks, or clipping.
- Keep viewer controls and 52-bone rig intact; investigate zero animation clips independently.

Do not mark pass complete until a working viewer and successful build are verified. Post work/status to issue #29 before deployment.