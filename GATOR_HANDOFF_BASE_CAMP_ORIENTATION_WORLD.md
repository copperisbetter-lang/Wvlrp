# GATOR HANDOFF — THE WILD: BASE CAMP ORIENTATION WORLD
Date: 2026-10-21
Owner direction: BUILD A SEPARATE ORIENTATION WORLD. DO NOT REPLACE OR MODIFY THE EXISTING LARGE WILD WORLD.

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
- Scenic campsites should feel like individually appealing overlooks, with safe walkable pads, realistic camping details and unobstructed views. Never sacrifice phone performance by eagerly rendering all ~166 at full detail.

## Acceptance criteria
- Existing main Wild remains operational and unchanged.
- Base Camp launches independently on Android via a live web viewer.
- World footprint circular; Base Camp precisely centered; 200-ft central exclusion for interior campsites; perimeter sites sampled at 50-ft intervals (or documented user-approved deviation).
- Panoramic mountain scenery covers 360 degrees with no visible square boundary; sun/light moves independently and casts changing shadows.
- No off-world forest assets loaded; network and render inspection confirms this.
- Ranger Station looks photorealistic and matches approved references, not a generic model.
- At least three short quests playable end-to-end; walk/run/camera and multiplayer regression tested.
- Report actual asset size, initial transfer size, FPS on representative mobile device, and any unresolved issues. Do not invent measurements.

## Handoff / reporting
Use this file as the single master brief. Create a separate implementation checklist and log of commits/build URLs once work starts. Request reference assets if approved originals cannot be located; do not silently substitute low-quality ones.
