# Brooke 1.1 — Complaints and proposed corrections

**Baseline:** Skin & Contour Pass 4 (verified viewer in README). **Status:** proposals only; no corrective geometry committed here yet.

| User complaint | Proposed correction | Verification |
| --- | --- | --- |
| Lips look sunken/recessed | Carefully advance lip vermilion and soften surrounding philtrum/chin transitions using measured local shape correction; preserve mouth closure and original likeness. | Front, profile and 3/4 views; no floating geometry. |
| Five-o'clock-shadow discoloration above upper lip | Audit skin texture, UV mask, lighting and normals; remove unintended dark band without erasing natural philtrum shading. | Consistent under neutral and current viewer lighting. |
| Lower lip only partially colored | Repair lower-lip vermilion mask/UV coverage and feather edges into skin. | Complete natural lower-lip color in front and profile. |
| Forehead looks caveman-like from the side | Reduce excessive brow ridge/projection and improve forehead-to-nasal-root curvature conservatively. | Profile comparison with approved reference; no eye socket collapse. |
| Eye openings too wide (earlier feedback) | Reduce eyelid aperture only if Pass 4 review confirms need; preserve blink and rig. | Front and 3/4, eyelid movement. |
| Skin discoloration along face-to-neck transition (earlier feedback) | Refine jaw/neck texture transition without changing protected source assets. | Neutral-light 3/4 and side views. |

## Next adjustment record — pending
- **Proposed target:** Brooke 1.1 Pass 5 on the verified Pass 4 GLB.
- **Files to modify:** To be listed precisely before editing.
- **User approval:** User requested fixes; preserve original baseline.
- **Outcome:** Not started on verified Pass 4 source.

## 2026-10-23 — Photo comparison / Pass 5 request
**Evidence:** User supplied Pass 4 profile, lip/nose close-up, three-quarter, earlier Pass 3 front view, and front/profile reference photographs.

**Complaints confirmed from screenshots:** Excessively convex brow/forehead in profile; upper lip protrudes as a thin separate ridge while adjacent mouth tissue looks recessed; lower-lip vermilion texture is mostly pale/skin colored with vertical stripes; dark upper-lip band; nostril interior appears polygonal; eyes look more open than the reference. Note that earlier "sunken lips" and the profile's protruding upper rim require distinct, locally bounded corrections, not a blanket forward push.

**Proposed correction order:** (1) Preserve exact Pass 4 GLB as baseline; (2) soften upper forehead/brow with reference-aligned profile morph; (3) reshape mouth rim and support tissue locally, avoiding detachment; (4) repair upper-lip shadow and lower-lip color in UV texture using anatomy masks; (5) round nostril rims without sealing airways; (6) tune eyelids only after new render. Verify front, profile, three-quarter, close-up, and original rig. Never edit Sophie 1 or Brooke 1.0.

**Status:** Logged before implementation; pending build and visual approval.
