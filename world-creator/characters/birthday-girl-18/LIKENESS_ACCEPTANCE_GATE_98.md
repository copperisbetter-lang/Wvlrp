# Birthday Girl 18 — facial likeness acceptance gate (31 Oct 2026)

**Reference (do not overwrite):** Library /The Wild/Character References/Birthday Girl 18/Blonde Character Study Montage.png (stable Library ID `libfile_051fca84c7388191b702a1f86c18407b`).

**Approved technical baseline:** Stage 2 editable MPFB MakeHuman .blend and rigged GLB. The eyebrow/eyelash texture repair and public 3D inspection viewer are separate from likeness approval.

**Current status:** NOT APPROVED. Earlier qualitative 55–60% estimate is subjective, not a calibrated metric. The owner's target is **98% perceived visual resemblance**, *not* 98% of Blender sliders or a guaranteed numerical facial-recognition score. Do not claim 98% without user's inspection and approval.

**Do not modify:** Stage 1, Stage 2, original montage, Sophie, Bev, Laura, or any previously approved character. Make Stage 3 an isolated editable MakeHuman branch and GLB preview. Keep both older versions available.

## Visual differences to resolve, in priority order

1. **Overall face silhouette:** Original front view has an oval/soft heart shape with tapered jaw and subtly rounded chin. Stage 2 render is more generic and shorter-looking vertically. Compare ear-to-ear and cheek-to-chin relationships under equalized eye spacing and perspective. Recheck profile jaw/chin projection.
2. **Eyes:** Match blue-gray iris, iris-to-sclera ratio, eyelid exposure, upper eyelid crease, slight eye tilt, brow-to-eye distance, lower lid fullness and natural lashes. Ensure fixed eyebrow/eyelash textures don't render magenta in *both* image render and online viewer.
3. **Nose:** Model photo shows petite soft nasal bridge, delicate tip and realistic profile projection; compare bridge width, alar width, tip position and nose-to-lip gap on frontal and side views. No guess from reference panel cropped at mismatched focal length.
4. **Mouth and lower face:** Match upper/lower lip fullness, Cupid's bow, lip coloration, mouth width relative to interpupillary width, philtrum length and neutral subtle smile; avoid waxy-looking lips.
5. **Cheeks and expression:** Match roundness, mid-face volume, nasolabial softness and slight natural asymmetry; avoid a flat symmetric mask appearance.
6. **Skin:** Retain authentic MakeHuman texture with warm natural human hue, cheeks/nose subtle color variation, correct alpha and roughness, realistic specular highlight and microdetail. Avoid clay, porcelain and flat light. Confirm textures remain embedded.
7. **Hair:** Match reference **blonde ponytail tied back** with face-framing strands, not current long uniformly straight hair curtain; hair color shades must preserve root/shadow variation. Don't substitute a new hair mesh without testing MakeHuman head fit.
8. **Consistency:** Front, left, right, quarter view and close-ups (eyes, nose, lips); compare under similar camera orientation, head scale and lighting. Verify neutral and subtle expression; check no clipping.

## Approval process

- Save the existing source and reference **unchanged**.
- For each Stage 3 iteration, document all MakeHuman morph targets and render front/profile/quarter views using actual GLB, not an image-only reconstruction.
- Capture reference-relative landmark **ratios** (pupil spacing, eye-to-mouth, eye-to-chin, nasal width, mouth width, jaw taper) from consistent frontal/profile views; retain source and measured coordinates with uncertainty.
- Color/lighting similarity is evaluated separately from mesh shape so a skin-color adjustment cannot masquerade as a likeness improvement.
- **No fabricated percentage.** The user makes final visual approval call; 98% is a demanding subjective goal, not a measurable score from current assets.
- Validate usable interactive viewer on Chrome Android, correct all texture maps, retain motion rig and original controls.
