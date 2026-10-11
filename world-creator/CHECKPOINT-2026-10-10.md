# WVLRP World Creator — saved checkpoint (October 10, 2026)

## Work completed and actually committed to GitHub

Repository: `copperisbetter-lang/Wvlrp`, branch `main`.
Live preview: https://wvlrp.com/world-creator/
Source: https://github.com/copperisbetter-lang/Wvlrp/tree/main/world-creator

- Standalone world-creator prototype created, without modifying the approved Ranger Station or camera scenes.
- Babylon.js v9.27.0 integrated for the initial 3D terrain preview, using a pinned CDN URL in the current GitHub Pages prototype and a declared npm dependency.
- Zoomable 2D map (pan, pinch, scroll, coordinates), object placement and editing, and user-adjustable detailed X/Y coordinates.
- Prototype object types: deer, NPCs, other animals, cabins, markers; fixed landmark anchors: Base Camp, Woodland Trail, Ranger Station and planned Safety Lake.
- NPC metadata fields for body shape, face shape, hair, outfit; photo **reference preview only**, with no photo-to-3D conversion yet.
- Ability to scatter 100 deer (configurable) in small herds and assign home-range / wide-roaming / stationary *settings*. Wildlife AI and movement not yet implemented.
- Seeded terrain functions for Appalachian-style ridge and valley height, valley-bottom creeks and deterministic connected path loops (lattice-network prototype, not organic final pathways).
- Local-browser saves, JSON export/import, and sample Babylon 3D terrain preview. No Oracle synchronization or live player publishing.
- Unit tests for deterministic terrain, creeks, path junctions, 100-deer herd creation and import validation, in GitHub Actions workflow `World Creator Checks`. The workflow was reported successful during creation.
- GitHub Pages deployment and the public world-creator page were verified reachable.

## October 10 evening — feedback and character-model improvement

- User tested creator and placed **101 deer and 2 people** in their own browser. Both appeared as pills/capsules. Their existing browser-local placements remain independent of the repository edits; no reset/migration was performed.
- Removed `CreateCapsule` preview rendering and added procedurally composed deer (body, legs, hooves, face, ears, tail, variation/antlers) and adult people (distinct limbs, face with eyes/nose/mouth, hair styles and ranger clothing).
- User specifically wants realistic adult women like the redheaded Ranger Station image. Added an adult woman/person selector, complexion, hair style, face/body/outfit options, and a **Redheaded Ranger Station woman** one-click preset. New people default to adult women; existing NPC records without a gender render as women without losing their coordinates/names.
- Added `Inspect selected` close-up orbit/zoom button to examine the figures at short range.
- Added optional local `.glb` loader for **already modeled 3D characters** (under 45 MB) and link to a free CC0 realistic woman example. A GLB file works as a browser-session preview, is **not saved/published** with world JSON, and has a procedural fallback. Reference photograph remains visual only, **not photo-to-3D**.
- No professionally modeled photorealistic Ranger Station NPC is bundled yet; photo-real level requires licensed/sculpted mesh, textures, hairstyle/clothes and ultimately rigging. Current built-in model is a recognizably human stylized interim representation. Do not claim realism equivalent to the Ranger Station portrait.
- Committed changes in `world-creator/character-models.js`, `studio.js`, `index.html`, `world-core.js`, and `README.md`. Static JS syntax of all three JS files checked; browser visual rendering and complete GLB import were not end-to-end verified.
- Avoid modifying cameras/approved Ranger Station page or resetting user's locally saved world objects.

## October 10 evening — deer preview discovery fix

- Phone screenshot showed 101 deer visible as 2D map markers, but no deer in the 3D preview. Root cause in code: herd scattering starts at ~90 m from the map center and spreads much farther, while Babylon initially displays only the center 180 m × 180 m tile. The deer were not deleted.
- Added **Find deer in 3D / Next herd** button to cycle through individual deer/herd leaders, re-center the 2D map and matching local 3D tile, and show nearby deer. Existing **Inspect selected** remains a closer viewpoint. The status caption now reports the count of deer within the local rendered area.
- Adjusted mobile layout of the preview buttons. No deer positions, saved local world records, terrain data, or approved camera/Ranger Station pages were modified. GitHub code changes committed; live visual acceptance on the user's phone is still pending.

## User-approved design direction to preserve

1. The **world generator** extends wilderness in chunks before a player approaches the visible boundary; players should never run into an abrupt edge. Generated locations should re-create identically upon return.
2. Terrain should follow West Virginia's ridge-and-hollow character; creeks belong in valley bottoms. Paths may form naturally as a player explores off trail.
3. A newly encountered generated path should be planned to join the existing trail network again, in either direction, so exploration never requires retracing an eight-hour walk. The prototype's grid-loops demonstrate connectivity, but a more natural routing system, distance limits and optional reliable return method still need engineering.
4. The user should have a **separate creator console** with a zoomable map of the game world, precise placement, character/person/animal editing, clothing and body customization, and eventually a workflow for turning appropriately authorized photographs into character likenesses.
5. Deer: create around 100 white-tailed deer initially, with groups of three or four or similar, some fixed to local home ranges and others wandering across wider world areas. Deer should detect nearby players, look up/startle, and sometimes bolt away.
6. Planned characters and places include the permanent redheaded Ranger Station secretary, mercantile NPCs, beach lifeguard at a separate swimming lake, Base Camp, Woodland Trail, Ranger Station, and expansion across all 55 West Virginia counties.
7. Phone controls: tap terrain/path to make the avatar walk there, with camera follow and natural obstacle avoidance. The game should work on mobile and desktop.
8. Longer-term: player-owned vehicles and camps, quests and wildlife research, multiplayer, persistent state and the ability to keep adding new quests, places and NPCs.
9. Host the real game/editor services on a **separate Oracle server** under the wife's Oracle account (the account exists; the VM has **not** yet been set up), kept isolated from existing WVLRP live-camera infrastructure. User intends to establish authorized access using a phone SSH client and connected deployment tools so assistant can handle most setup.
10. Engine licensing: Babylon.js is Apache 2.0 open source. Respect notices, third-party asset rights, and permission to use real people's likenesses.

## What is NOT done yet

- An Oracle game server or authenticated, privileged console; current GitHub Pages prototype is public and stores only local draft JSON. Do **not** put secrets/private assets into it.
- A full procedurally streamed playable world (only terrain functions and a local 3D preview).
- Real character meshes, faces, clothing fitting, photo-to-3D conversion, deer movement/AI, tap-to-walk gameplay, navmesh/collision, multiplayer, accounts, quests integration, and versioned Oracle publishing.
- An actual 55-county terrain model or guaranteed fast return for very distant hikes.
- Device/browser-based end-to-end visual acceptance testing by the user; initial automated unit tests and HTML reachability succeeded.

## Suggested next implementation order

1. Inspect the page on the user's phone and desktop; fix any usability or rendering issues.
2. Implement organic trail graph planning that always reconnects to handcrafted paths, with appropriate home/fast-travel safeguards.
3. Add chunk streaming, stable world coordinates, route-finding/tap-to-walk and fixed handcrafted landmarks.
4. Add reusable character generation with costumes and wildlife behavior/state.
5. Provision separate Oracle game services; implement authentication, server persistence, backups, previews and publish/rollback. Only then connect creator console to the actual game.
6. Do not disrupt the production camera pages or overwrite approved video-film work while continuing game development.
