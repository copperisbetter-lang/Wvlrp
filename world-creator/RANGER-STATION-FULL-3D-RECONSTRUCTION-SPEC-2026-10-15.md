# The Wild — Ranger Station complete 3D reconstruction specification

**Status:** APPROVED REFERENCE TARGET / engineering specification; **not** a claim that the rebuilt mesh has been visually verified.  
**Date:** 2026-10-15  
**Primary references:** User-supplied photographs of original WVLRP 360 exterior and interior, shown in the 2026-10-15 conversation. Original WVLRP reference assets: `assets/community-clearing-v1.webp` and `assets/ranger-station-v1.webp`. These reference photos overrule generic picture examples and earlier procedural cabin designs.

## Target
Construct **one physically continuous, metrically coherent, walkable Ranger Station** for The Wild. Player approaches the photographic-style exterior from the Appalachian forest, climbs the real porch steps, enters double doors, sees actual interior furniture and windows, and walks around the desk and information displays. All significant objects are real 3D geometry, not projected whole-room panoramas or fake picture cards. Recreate appearance from multiple angles, keeping reasonable mobile performance.

## Coordinate frame / starter measurements — provisional
- Keep present `NORTH_RANGER_STATION` world center at `x:0, z:350`, until owner changes it. South-facing entry = **-Z**, north/back = **+Z**. Looking toward entrance from outside, viewer's right = **+X**.
- Current code dimensions: **18 m wide x 12 m deep**, raised floor roughly **0.76 m** above grade; main walls **4.0 m** above interior floor; gable rise **3.05 m**; porch **4.60 m deep**. These are game-code estimates, **not actual sizes extracted from photos**.
- Measured-looking proportions matter more than preserving this current envelope. Use doorway/stair/post/window scale ratios to refine, and rerun path/spawn checks if resizing.
- Exactly **one continuous actual indoor room with porch and outdoor walls**, no disconnected picture room, no 360 teleport.

## Exterior — photo-matching specification

### E1. Building silhouette and roof
- Centered **large steep timber gable**, dark triangular space with thick exposed king posts, braces and realistic visible joinery; center roof advances over entrance.
- Two asymmetric flanking roof wings with **weathered blue standing-seam metal roofing**, exposed eaves/rakes and modest overhang. **Do not** reduce photograph to a simple box under one uniform A-roof.
- Exterior walls are large warm-toned horizontal natural timbers/log-siding with irregular aged wood coloration and believable edge geometry; trim has depth, no plastic-looking procedural bars.
- Prominent wooden sign suspended/secured across main front gable, mixed-case exact wording: **Ranger Station**. Legible from approach distance, not all-caps if matching photo.

### E2. Entry/porch/stairs
- Broad, deep walkable covered **wood plank porch** across facade.
- **Centered double wooden glazed doors** with correct hinges, frames, inset panels and functional doorway; game collision must leave doorway actually traversable.
- **Wide central staircase** projecting out toward path with individual dimensional treads/risers and timber side handrails.
- Rounded thick timber porch posts with authentic corner bracing, stone column bases, detailed rails and balusters. Keep clear entry route; no posts floating or intersecting the stairs.
- Four warm wall lanterns around entry/front windows, amber light on wooden surfaces at dusk.

### E3. Wings, windows, chimney
- Tall front multi-light window openings spaced around entrance and under covered wings. Glass is translucent/reflective with thin muntins, accurate recessed trim; **no thick cross-frame shutters**.
- Stone **right-side exterior** chimney emerges beside/through roof of viewer's right-hand wing. It belongs **outside** wall, **never inside** the office and **never through** desk/chair.
- Roof shape should have actual thickness, protruding fascia, gables and distinct side-ridge lines; textures must not stretch across surfaces at incorrect scale.

### E4. Immediate woodland scene
- Dirt, worn earth and embedded flat stones approaching the centered stairs, with uneven real ground (not a straight painted rectangle).
- Healthy Appalachian green deciduous trees with species variation and occasional evergreen; ferns, rocks, logs, wildflowers, potted flowers flanking stair and stone base.
- Optional **Jeep at left**, **ATV at right** as **separate** physically placed licensed geometry. They are props, not part of building.
- Natural filtered daylight, physically plausible wood shadows, outdoor-to-indoor brightness that reads realistically on a mid-range phone.

## Interior — photo-matching specification

### I1. Connected room / surfaces
- Interior shares the exterior's real walls, windows and doorway. Plank floors and warm honey-brown horizontal timber interior walls, solid wood trim, corner joinery and exposed overhead beams.
- Tall multi-pane windows reveal forest and contribute natural daylight; **no opaque window painting**.
- Where source screenshots do not show ceiling or rear/side exterior, mark geometry as **inferred** and revise when additional views arrive.

### I2. Main ranger workstation (strict)
- From front entrance (south) visitors look north toward desk's **finished paneled visitor-facing front**.
- A true **L-shaped desk** with the long visitor-facing front and a return projecting back toward rear wall, leaving **clear inner corner for ranger's chair**.
- Seated ranger faces **SOUTH (-Z), toward the door**; the ranger's chair back faces back/north wall. Don't rotate 180° the wrong way or place chair on public side.
- Desk front should look like curved/bowed rustic hardwood cabinetry with separate recessed panels, molding, trim, naturally variegated grain—not a bank teller counter. Desktop and return are fully joined, not floating.
- Desk height approximately **0.76–0.85 m** above floor; standing camera eye height **1.65–1.75 m** above floor and can look **down** to read papers.
- **Forbidden:** load-bearing column, fake pillar, chimney or other artifact **through the desk**; giant counter; chair facing away from doors; oversized radio.

### I3. Ranger desk equipment
- One ordinary desk monitor presenting **six labeled camera tiles**, not six wall monitors. Two may show previews, remaining four labeled **NO SIGNAL** until real stream integration. Don't falsely claim live feed.
- Compact recognizably detailed **CB radio with knobs, speaker, digital display, separate handheld mic and coiled cable**, physically sized to desk.
- **Seven piles of ranger notes/case files** on desk; pencils, mug, compass, passport/map folio, a warm flared-shade desk lamp. Small objects don't intersect one another or chair.
- Brown padded, buttoned leather swivel armchair, physically credible cushion seams/casters.

### I4. West/left visitor information wall
- Large framed **WEST VIRGINIA** terrain/map board, legible title, appropriate regional silhouette and trails.
- Beside it a dense cork bulletin board with photographs, papers, headings and distinct prominent **OUR FORESTS / OUR WATER / OUR WILDLIFE / OUR HOME** sign.
- Below: rustic rough-hewn equipment bench/table. Olive field backpack, binoculars, stainless bottle, field pamphlets, and dark worn storage chest with clasps under bench.
- Adjacent visitor green canvas chair and additional smaller bulletin/photo notice board.

### I5. Rear / side work corner
- One large multipane **north/back window behind the leather chair**, woodland visible through it; tall side windows near desk.
- Tall irregularly filled wood bookcase containing many real book-spine meshes, landscape photos, warm brass-toned table lamp, rustic small cabinet.
- To chair's right: dark olive metal filing cabinet with drawer pulls, oil lantern on top, wall peg/hook with light-colored ranger hat, hanging coat, framed wall landscape prints.
- Worn wool oval area rug at desk/visitor zone with woven texture rather than solid flat color.

## Photo-to-walkable-3D implementation
1. References: do **not** use the phone photo including bezel and browser controls as a 3D exterior wall texture. Prefer source WVLRP image assets; crop and rectify isolated map/poster/sign texture only where legitimately planar.
2. Start geometry-first from explicit measured proportions; build porch steps, roof wings, signs, window holes and multi-level site. Split parts into named meshes or instanced reusable patterns, preserve simple material naming.
3. Match image color and reflectance using the local **PBR** wood, planks, mossy stone, roof metal, painted iron and bark assets in `world-creator/assets/building/`.
4. Add actual interior props with transform coordinates, camera height, walk-through door, correct occlusion, shadows, and plausible object scale.
5. Use screenshots from **the game engine** at photo-matched camera angles to compare against original, then revise mesh geometry/material. No standalone generated poster or illustration is accepted as 3D progress.
6. Store all new asset sources and licenses. Photo reconstruction can't guarantee accurate hidden geometry from one angle; missing views are inferred.
7. Export/reimport GLB or build directly with Babylon meshes, preserve game chunk tracking and collision meshes; keep images/meshes performant on Android. Place final replacement in real `walk.html` experience, NOT just the offline workshop.

## Existing code; preserve integration
- `world-creator/wild-ranger-station.js`: contains the old `NORTH_RANGER_STATION` location, building and desk; revise to spec rather than layering duplicates.
- `world-creator/wild-ranger-reference-interior.js`: user-approved references to desk, map, boards, chairs and props; improve their visual meshes/materials rather than merely adding silhouettes.
- `world-creator/walk.js`, `world-creator/walk.html`: actual first-person game and collision test target.
- `world-creator/photo-to-3d.html` and `photo-to-3d.js`: **v0.1 prototype workshop** only: a textured shell based on photo guidance; **not** fully automatic photogrammetry and **not** yet this full reference reconstruction.
- `assets/ranger-station-v1.webp`, `assets/community-clearing-v1.webp`: existing first-party source artwork. The user's more recent photographic captures specify wanted visuals.

## Acceptance / QA gates (all required before calling project 'finished')
- [ ] Walk toward real building: silhouette, sign, asymmetric side roof, stairs, porch, timber posts and outdoor chimney match 360 front photos from center AND diagonal view.
- [ ] Path remains navigable; steps lead to entrance with sensible avatar size; player crosses open two-door threshold without clipping or teleporting.
- [ ] Walking around either side reveals actual 3D structure, not a flat screenshot. Roof/chimney/posts do not float or appear inside.
- [ ] Look out from inside: sunlight enters clear windows and forest is visible.
- [ ] Visitor desk looks toward incoming player, chair behind facing door, L-return **projects into room**. Desk standard writing height, and no intersecting pillar/chimney.
- [ ] West map/board/bench, north window, filing/hat/coat, shelf/lamp, six-feed monitor and CB are correctly located and sized at standing eye height.
- [ ] Ranger monitor = ONE device with six labeled feeds; active/offline statuses accurate; desk papers visible from above.
- [ ] Browser test at 360-matched exterior & interior viewpoints; capture direct screenshots from game and compare side-by-side with user's **own** originals.
- [ ] Test on Android for performance, memory, WebGL render, joystick/look controls, collisions; no phone crashes.
- [ ] Save source and pass validation before saying game rebuild is installed or photorealistic.

## Build phases
**A.** Lock ratios and exterior footprint/gable, compare exterior reference.  
**B.** Porch/stairs/columns/doors/windows/right chimney, compare again.  
**C.** Seamless interior real shell and sunlight/windows.  
**D.** Correct wood L-desk/chair/camera eye height, remove any pillar artifacts.  
**E.** Information wall and office props/monitor/CB/fixtures.  
**F.** Material, texture, lighting, and tree/ground realism with performance budgets.  
**G.** Complete in-game walk QA and photo comparison; only then replace legacy assets and mark accepted.

**Core standard:** The two sides of this station are inseparable. A pretty picture is not a completed model; accurate-looking **walkable 3D geometry** is the deliverable.
