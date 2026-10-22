# GATOR HANDOFF — THE WILD: BASE CAMP ORIENTATION WORLD
Date: 2026-10-21
Owner direction: BUILD A SEPARATE ORIENTATION WORLD. DO NOT REPLACE OR MODIFY THE EXISTING LARGE WILD WORLD.

## LATEST APPROVED CAMPSITE DECISION — 2026-10-21 (OVERRIDES EARLIER FURNISHING LANGUAGE)
- ALL approximately 166 perimeter campsite locations are **CLEARINGS ONLY** during the first build. NO tents, fire pits, benches, tables, shelters, cabins, constructed pads, or other campsite furnishings/structures at these locations yet.
- Keep approximately 50-foot arc-length spacing around the circular outer edge, with spectacular uninterrupted mountain/valley views and organic natural forest surroundings. These are future campsite locations, not furnished campsites at launch.
- Interior campsite locations are ALSO **CLEARINGS ONLY**: scattered organically within the circle, never within 200 feet (60.96 m) of the CENTER of Base Camp, and with appropriate clearance from village structures/paths. No tents, fire pits, benches, or campsite structures there either.
- Preserve a clear, navigable path to each clearing without making them identical artificial cutouts; use varied natural ground textures and vegetation edges. Mark their positions in metadata so furnishings can be added in a later phase, without loading detailed campsite props now.
- The central Base Camp village is the only exception: its approved CENTRAL communal campfire and benches remain part of the village design. This exception must NOT be copied to perimeter/interior clearings.
- Verify initial version consists of clearings only. Do not pre-populate campsite assets or quietly add props as placeholders.

## Immediate instructions for the next Gator
1. Read this entire file before changing code. Inspect current repo architecture, existing world routes, scene assets, and deployment/build workflow.
2. Create a NEW independent scene/route for "The Wild: Base Camp" (Orientation World). Preserve the existing large Wild scene, its locations, characters, quests, data, multiplayer and routing. Use separate world IDs and scene-loading boundaries; avoid accidentally loading the big world in Base Camp.
3. Build incrementally, verify actual build output, deploy to a phone-accessible viewer, and supply Doug a working clickable URL. Never claim work is deployed or tested without evidence. Document changes and failures.
4. The user works on an Android phone, not a PC. No local downloads or desktop-only workflow required to review.

## Approved world design
- Shape: CIRCULAR, NOT SQUARE. Proposed radius 0.25 mile = 1,320 feet = 402.336 meters; diameter 0.5 mile. Radius is initial design target, adjustable in one config value.
- Base Camp village at EXACT WORLD CENTER (0,0 in horizontal world plane). Main Ranger Station prominent and exceptionally realistic, with Laurel's Kitchen, Mercantile & Gift Shop, central burning campfire, benches, and walkable paths. Preserve the approved original 360-world visual references for individual buildings; no generic prefab-looking architecture. Match real West Virginia/Appalachian textures, proportions, woodwork, stone, windows, roofing and signage.
- At the outer edge, place one scenic campsite approximately EVERY 50 FEET measured as arc length around the circular circumference. For radius 1,320 ft: circumference 2*pi*1320 = 8,294 ft; target ~166 sites, equally spaced. This is a density target, not permission to place sites on cliffs or overlap. Each site must have a spectacular valley/mountain view. Check practical site footprints, terrain safety, sightlines, and mobile performance; if 166 cannot fit well, report the conflict and propose clustered/instanced or reduced physical sites BEFORE changing the user's requirement.
- Additional campsites scattered throughout the INNER CIRCLE, but NONE within 200 feet (60.96 m) of the Base Camp center. Define a configurable Base Camp exclusion zone and also check clearance from village buildings and trails. Distribute sites organically with adequate separation and accessible footpaths.
- Include a handful (3–5) of complete, functional beginner quests for public orientation, using existing quest systems where feasible: ranger's missing keys, lost pocketknife, beginner wildlife observation, etc. Do not prematurely bring the larger Jenny/poacher narrative into the orientation world.
- Native Appalachian hardwoods/hemlocks, convincing undergrowth, mossy boulders, logs, narrow trails, streams where appropriate; true high-definition photorealistic assets, NOT generic placeholders. Avoid excessively tall vegetation blocking camera view. Clear, warm daylight.
- Full 360-degree seamless panoramic Appalachian mountain/valley backdrop, New River Gorge-inspired: high mountaintop overlook, layered ridges, deep valleys, forested slopes. Blend real 3D near terrain into panorama; prevent obvious horizon seams and inaccessible visible terrain. The world should feel vast even though the active area is small.
- The SUN MUST BE INDEPENDENT OF THE PANORAMA: separate movable directional light and visible sun treatment with configurable time-of-day cycle, solar azimuth/elevation, shadow direction/length, sky brightness, exposure and ambient fill. Do not bake the sun into the panoramic texture; avoid double suns. Shadows must actually move with time of day. Provide controls or time presets for review.
- A panorama alone does NOT prevent downloading/rendering off-scene terrain. Explicitly scope chunk generation, vegetation instantiation, network asset requests, physics, AI, and draw distance to the Base Camp scene. Never load the main Wild's trees/mountains behind the panorama. Use compressed, mipmapped textures, LOD, instancing, occlusion/frustum culling, and measured mobile performance without compromising close-up quality.
- Preserve and reuse existing avatar, inventory, quest, and multiplayer systems when feasible, but keep Base Camp content and world state separately keyed. Add an obvious later gateway to the full Wild, without loading the big world.
- Campsite CLEARINGS should feel like individually appealing natural overlooks with clear ground and unobstructed views. Do not create physical camp furnishings or constructed pads in this phase. Never sacrifice phone performance by eagerly rendering all ~166 at full detail.

## Acceptance criteria
- Existing main Wild remains operational and unchanged.
- Base Camp launches independently on Android via a live web viewer.
- World footprint circular; Base Camp precisely centered; 200-ft central exclusion for interior campsite clearings; perimeter clearing locations sampled at 50-ft intervals (or documented user-approved deviation). All perimeter and interior campsite spots are CLEARINGS ONLY with no campsite structures/furnishings; only central Base Camp communal campfire/benches permitted.
- Panoramic mountain scenery covers 360 degrees with no visible square boundary; sun/light moves independently and casts changing shadows.
- No off-world forest assets loaded; network and render inspection confirms this.
- Ranger Station looks photorealistic and matches approved references, not a generic model.
- At least three short quests playable end-to-end; walk/run/camera and multiplayer regression tested.
- Report actual asset size, initial transfer size, FPS on representative mobile device, and any unresolved issues. Do not invent measurements.

## Handoff / reporting
Use this file as the single master brief. Create a separate implementation checklist and log of commits/build URLs once work starts. Request reference assets if approved originals cannot be located; do not silently substitute low-quality ones.


## Mandatory visual quality — photorealism (2026-10-21)
EVERY visible element of the Orientation World must target photorealism: terrain, Appalachian trees, underbrush, rocks, soil, leaf litter, paths, campsite clearings, distant ridges, sky, lighting, shadows, and Base Camp. No cartoon, low-poly, stylized, placeholder, or generic-looking assets in the player-facing build. Use high-quality physically based materials, convincing varied native vegetation, realistic scale, natural terrain transitions, detailed distant panoramas, and a separate physically plausible moving sun casting dynamic shadows. Optimize with LOD/instancing/culling rather than sacrificing close-up visual fidelity. Campsites remain EMPTY NATURAL CLEARINGS ONLY. Do not claim photorealism achieved until screenshots and the playable viewer demonstrate it.
