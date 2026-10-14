# The Wild — Ingalls family, Season 3 (1976–77)

Status: **reference and build acceptance specification; no finished GLBs yet.** These are separate NPCs, not reskins of Jenny, Penny, or the five-year-old explorer.

## Cast and appearance references
- Charles (Michael Landon): adult man; dark wavy hair, sideburns, expressive face, lean working build; earth-tone shirt, suspenders, trousers, leather boots.
- Caroline (Karen Grassle): adult woman; light hair in a period updo; long-sleeve high-neck prairie dress, apron, sturdy shoes.
- Mary (Melissa Sue Anderson): older child; blonde hair, pale blue eyes; modest period dress and boots.
- Laura (Melissa Gilbert): younger child; dark brown braids, freckles, expressive face; prairie dress and boots.
- Carrie (Lindsay and Sidney Greenbush): very young child; light hair, child-proportioned face; age-appropriate prairie outfit and boots.

References are specifically **television Season 3**, not historic photos, later-season designs, or generic frontier characters. Face shapes must be distinct and independently reviewed against licensed/authorized reference stills; do not label a generic MakeHuman preset as an actor likeness.

## Additional Season 3 characters
- **Jack**: the Ingalls family's scruffy little dog; build a distinct four-legged canine model, period-accurate coat and markings based on Season 3 stills, quadruped skeleton, idle, walk, trot, run, sit, lie down, bark, and follow-family behavior. Do not use a human rig.
- **Isaiah Edwards / Mr. Edwards (Victor French)**: sturdy adult man, bushy beard, weathered face, broad-brimmed hat, frontier shirt, vest, trousers and boots. Distinct realistic facial likeness and separate 56-joint human rig, with his own viewer and GLB.

## Build order
1. Charles prototype, own character definition, rig, clothes and viewer route.
2. Caroline.
3. Mary.
4. Laura.
5. Carrie.
6. Mr. Edwards.
7. Jack (dedicated quadruped pipeline).

## Per-character deliverables
Human 56-joint requirement applies to humans only; Jack needs a proper canine quadruped rig.
- Separate full-body opaque GLB and standalone viewer entry, distinct asset filename and identity; no fallback silently substituting Jenny.
- Anatomically coherent proportions, natural face, realistic textured skin and hair.
- Full-body rig with 56 functional deform joints (or report precise deviation rather than padding joints for a numerical pass).
- Idle, walk, run, sit, wave, bend/pick up, crouch, hands-and-knees, elbows-and-knees; verify knees and elbows bend anatomically and contact the ground where appropriate.
- Fitted period clothing, sleeves and hems weighted to the rig; no hovering, intersections, torn hip gaps, head-level dresses, or painted-on fabric.
- Viewer camera orbit and close zoom must show continuous solid mesh; no missing body surfaces.
- Export a front/side/back preview and pose contact sheet; visually inspect before publishing.
- Automated GLB sanity checks: mesh, armature, joints, animation clips, materials, texture image presence, unique output path.

## Publishing gates
Never announce a finished character based only on a script commit. Confirm GitHub Actions success, the output GLB actually changed, viewer references the correct GLB, and visual QA passed. Preserve existing game coordinates and all prior characters.
