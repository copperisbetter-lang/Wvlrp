# Sweetface — Wandering Wanda eye repair

Source viewer: /laura-3d-viewer.html
Protected baseline: /sweetface-laura-eye-repair.html
Source original mesh: /world-creator/assets/laura-3d/face.part00.b64 through face.part09.b64

## Root cause (user photographic evidence)
Three source photos contained inconsistent gaze direction; in one Laura looked to her right. Reconstruction baked this displaced iris/pupil into the face. This is NOT evidence of a misplaced eye socket.

## Sweetface Rule
Every removal/change must be intentional. Do not remove sweetness (natural sclera proportions, lid puffs, shadows, cheek contours, fine texture). Keep original head and Laura 2.5 intact.

## Required correction
1. Preserve original face vertices, skin color, and eyelid outlines.
2. Isolate the misdirected iris and pupil in source photo / color texture (original GLB may contain vertex colors rather than editable texture).
3. Obtain straight-gaze reference from the other photographs. Determine exact pupil centers and iris radius before moving anything.
4. Move/reproject only affected iris/pupil color information; restore naturally exposed sclera and occluded area using reference imagery, no bright-white fake replacement.
5. Inspect frontal and oblique views at neutral light and compare to untouched baseline. Reject if lids, puffs, cheek, nose-to-jaw rift or photographic detail degrade.
6. Do not claim repaired until actual model preview is inspected.

Status: ORIGINAL BASELINE RESTORED; EYE CORRECTION NOT YET IMPLEMENTED. Shader eye cutout + new white eyeballs from Lauren 3 v13 is specifically rejected.
