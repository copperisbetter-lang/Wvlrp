# WVLRP World Creator — prototype v0.1

The builder for the planned **statewide West Virginia adventure game** lives here, entirely isolated from existing WVLRP camera and Ranger Station pages.

## Open the studio

This is a no-build static prototype at `world-creator/index.html`. GitHub Pages serves it from the repository's existing deployment. It currently loads Babylon.js `9.27.0` from a version-pinned jsDelivr npm URL. The same dependency is declared in `package.json` for a future self-hosted production build. The CDN is for this experimental stage, **not** final production distribution.

For local development, serve the folder using `python3 -m http.server 8000` from the repository root, then visit `http://localhost:8000/world-creator/`. Use `cd world-creator && npm install && npm test` to install the engine package and run world-core tests.

## What the prototype can do now

- Zoom and pan a 2D generated world map on mobile or desktop; tap to place and select markers or drag selected markers for precise placement.
- Preserve fixed Base Camp, Woodland Trail, Ranger Station, and proposed Safety Lake anchors on the map.
- Generate an effectively unbounded deterministic terrain map from a world seed using Appalachian-style ridges, wooded slopes, and a creek cut into a valley.
- Generate connected procedural trails. Prototype graph is a four-direction interconnected trail lattice with every edge part of a loop and junctions joining across chunk boundaries. **This demonstrates reconnection logic, not final organic trail layout or guaranteed short travel time back to home base.**
- Scatter up to 500 deer in a batch, including a 100-deer default and user-selectable herd sizes, with local home-range / wide-roamer / stationary *settings*. Movement simulation is not running yet.
- Place people, animals, cabins and quest markers. Edit names, X/Y world coordinates, chosen outfits, hair, body and face presets. These are metadata and prototype markers; detailed 3D character meshes are not built yet.
- Upload a reference photo locally to view beside the NPC editor; **does not** convert photos into 3D likenesses and **does not** upload or save photo bytes.
- Preview a small 3D terrain area and object proxies using Babylon.js.
- Save metadata to *this browser's* localStorage and import/export a portable JSON blueprint.

## Critical safety and security boundaries

- **Not an authenticated administrator console.** This repository is public, so the static editor page is also publicly viewable by anyone with the URL. The prototype never publishes changes to live gameplay; all edits are local to the visitor's browser.
- **No Oracle service yet.** Real shared persistence and publishing require a separately secured admin API, authorization checks, backups and server-side object validation. Do not put Oracle credentials, API tokens or confidential photographs into this prototype.
- **Does not change** the current WVLRP site navigation, approved Ranger Station, existing 360° forest scenes, or camera streams.
- **No infinite playable forest yet.** The terrain/path *data* is repeatable at arbitrary coordinates, but Babylon's 3D preview renders only a local patch. Chunk streaming, navigation meshes, character locomotion, animated wildlife, quest rules, and game-client integration are next phases.
- **Procedural habitat still needs review.** The current terrain and creek equations are a visual prototype, not a surveyed/topographically accurate model of West Virginia.
- Preserve Babylon.js and other third-party licensing and attribution when creating the production bundle.

## Next build steps

1. Refine the path generator to produce believable branching and reconnection loops using graph constraints, with preplanned endpoints joining established trails.
2. Create reusable character models, clothing/hair parts, body customization, and deer animations. Add photo-assisted modeling only with appropriate consent/rights and an image-processing service.
3. Implement streamed terrain chunks with true world-coordinate persistence, collision and tap-to-walk navigation; use a distance-to-home/fast-return option so a player never needs an eight-hour hike back.
4. Put the private studio behind secure admin authentication and connect the versioned world blueprint to Oracle. Add staging, preview, rollback and controlled publishing.
5. Integrate the approved Woodland Trail, Base Camp, Ranger Station and future statewide game map while leaving existing live camera pages functional.
