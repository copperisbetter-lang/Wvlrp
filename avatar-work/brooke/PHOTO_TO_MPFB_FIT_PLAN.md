# Brooke photo-to-MPFB fitting: implementation gate

Status: **isolated branch, not a finished likeness**.

## Confirmed source inspection
- `scripts/build_mpfb_base.py` imports `world-creator/assets/morph-head-clone.glb`, preserves its meshes, and exports an anatomical base. It has **no facial fitting stage**.
- `single-head-morph-test.html` uses a procedural sphere and manual controls. It is **not** an MPFB photographic morph pipeline.
- `scripts/build_complete_head.py` produces a face patch, not a complete skull and neck.
- Green workflows alone do not validate photographic likeness.

## Required pipeline
1. **Inputs**: approved frontal and profile Brooke reference photos, source provenance, camera/pose estimates, and a consistent 3DDFA landmark set; reject inconsistent or missing inputs rather than silently generating guesses.
2. **Base**: import approved MPFB head clone and inventory real head, neck, eyeball meshes, UVs, materials, topology, and available morph targets. Record actual mesh names and vertex counts.
3. **Fit**: align photographic landmarks in a shared coordinate system; optimize supported MPFB facial morph parameters (eyes, nose, cheeks, jaw, chin, mouth, forehead, depth), using both frontal and profile constraints. Keep the complete anatomical surface; never overlay the raw 3DDFA face as a second skin.
4. **Appearance**: after geometry is validated, align approved image-derived facial color to the base UVs; keep eyes independently functional. Avoid solid-color neutral previews being labeled final textures.
5. **Quality gates**: capture front, left, right, rear, top, underside; compare landmarks numerically; verify closed anatomy, eyes, neck, no intersecting face shell, no grotesque stretching, and exported GLB round trip. Document failures and reasons.
6. **Release**: artifact and viewer must explicitly identify their build SHA and source GLB; only branch-scoped preview and phone inspection until Gator 1 reviews. No main merge, production publish, or automatic Pages trigger during freeze.

## Immediate engineering next steps
- Inventory MPFB GLB structure and morph target availability; determine whether fitting can use native morphs or requires non-destructive surface deformation.
- Verify reference photos and landmark JSON actually exist in repository or uploaded artifact. Do not invent measurements.
- Implement a branch-scoped fit script and workflow that fails when photo inputs are absent.
- Produce an annotated before/after landmark report and multi-view render before asking owner to judge resemblance.

**Owner's target:** Brooke's photo measurements morph the complete MakeHuman/MPFB head and neck, rather than publishing the isolated 3DDFA face patch.
