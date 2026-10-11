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
- Place people, animals, cabins and quest markers. Edit names, X/Y world coordinates, outfits, hair color/style, complexion, adult character type, body and face presets. The viewer now renders procedurally assembled, recognizable deer and people with simple facial features, clothing and limbs rather than capsule markers. These are still stylized preview meshes, **not realistic rigged 3D game assets**.
- Upload a reference photo locally to view beside the NPC editor; **does not** convert photos into 3D likenesses and **does not** upload or save photo bytes. A separate GLB import uses an already built 3D mesh, does **not** build 3D from the reference photo, and is session-only: the model file is not embedded into exports or synced.
- The 3D preview shows only a local 180 m × 180 m tile, while the 2D map covers a much larger area. **Find deer in 3D / Next herd** cycles through herd locations, moving the 2D view and 3D preview together without changing animal placements. The caption counts deer inside the current tile.
- Preview a small 3D terrain area and 3D figures using Babylon.js. Select a character and choose **Inspect selected** for a close view. Use the ranger redhead preset for an adult woman with long wavy red hair and Ranger Station clothing. You may optionally load a legally obtained, textured `.glb` person model for the selected character in your current browser session (under 45 MB) to achieve significantly greater realism.
- Save metadata to *this browser's* localStorage and import/export a portable JSON blueprint.

## Riley — textured 3D preview upgrade (October 10)

- Click **Add / find Riley — 3D** near the preview. It creates one Riley if none exists, or focuses the existing Riley (without repeatedly duplicating her). Existing deer, NPCs, quests and Ranger Station are untouched.
- Riley's **standing** preview loads a genuine textured full-body CC0 adult female GLB from `world-creator/assets/riley-real.glb`. Her **kneeling** preview uses `world-creator/assets/riley-kneeling.glb`, another source mesh of the same named Riley. They are real orbitable 3D geometry, NOT rigged animation.
- Source: Innerscene's [Riley – 3D Person, Woman Standing](https://www.innerscene.com/tools/library/3d-parts/riley-3d-person-woman-standing-8d40398f), adapted from MakeHuman CC0 assets and released to the public domain (CC0). Standing and matching kneeling assets are downloaded by `.github/workflows/riley-real-model.yml`, validated as GLBs, and committed locally for same-origin loading; it does not require browsing to another site on the phone.
- The old balloon-joint `riley-model.js` is **not** called by the world preview anymore. Both pose options use textured GLBs; the regular procedural person renders only while the GLB is loading or if asset loading fails. The second pose is **kneeling**, not on hands and knees. True hands-and-knees positioning and fluid transitions will require a rigged and retextured custom character.
- **Appearance honesty:** The existing CC0 Riley source has dark short hair, teal top, and denim trousers; it is **not** the desired long-haired blonde tomboy character in a fitted top, very short baggy beige shorts and tennis shoes. Hair/clothing geometry, correct proportions, textures and skeletal animation are still necessary. Do not claim the finished game character exists.
- Keep using `Inspect selected`, `＋ Zoom closer`, drag-to-orbit, and `Expand 3D`. Riley's position, identity and pose stay in local browser saves/exports; the shared mesh is part of the site source and need not be copied into world JSON.

### Riley temporary beach-model test (October 10, later revision)

- Current source script removes the old shirt, trousers, bob hair and shoes and builds a teal string bikini on the existing adult anatomical model, with modeled triangle cups, straps, tied sides, and coordinated briefs. It also substitutes broad soft layered blonde hair geometry for the original straw-like cylinders and attempts a very subtle asymmetric smile.
- GitHub Actions rebuilds three `.glb` files after `world-creator/scripts/make_riley_blonde.py` changes. **The code commit alone does not prove the finished assets or their on-phone appearance:** inspect Actions success, changed GLB commits and close-up screenshots before calling this a visual fix.
- These are static mesh poses, not a rigged animated body. Photo-to-model generation and true cloth/hair simulation are not implemented. Existing deer positions and user-local world saves are not changed by the model build.

### Latest Riley test: featureless adult mannequin

- The latest source replaces the teal string bikini with an **unclothed, non-anatomical, smooth Barbie-style test mannequin**, including a matte skin surface and softened central pelvis, without detailed intimate anatomy. It retains the test figure’s blonde hair and subtle smile.
- The model builder produces updated GLBs for standing, kneeling and hands-and-knees preview poses. These poses remain baked static meshes; the experimental soft hair sway in Babylon is not skeletal or cloth physics.
- The source/build does not modify existing deer, other NPCs, world JSON, or the Ranger Station. Phone preview and actual generated files must be checked before claiming final visual quality.

## Critical safety and security boundaries

- **Not an authenticated administrator console.** This repository is public, so the static editor page is also publicly viewable by anyone with the URL. The prototype never publishes changes to live gameplay; all edits are local to the visitor's browser.
- **No Oracle service yet.** Real shared persistence and publishing require a separately secured admin API, authorization checks, backups and server-side object validation. Do not put Oracle credentials, API tokens or confidential photographs into this prototype.
- **Does not change** the current WVLRP site navigation, approved Ranger Station, existing 360° forest scenes, or camera streams.
- **No infinite playable forest yet.** The terrain/path *data* is repeatable at arbitrary coordinates, but Babylon's 3D preview renders only a local patch. Chunk streaming, navigation meshes, character locomotion, animated wildlife, quest rules, and game-client integration are next phases.
- **Procedural habitat still needs review.** The current terrain and creek equations are a visual prototype, not a surveyed/topographically accurate model of West Virginia.
- Preserve Babylon.js and other third-party licensing and attribution when creating the production bundle.

## Next build steps

1. Refine the path generator to produce believable branching and reconnection loops using graph constraints, with preplanned endpoints joining established trails.
2. Replace current procedural preview figures with licensed, textured, rigged production-grade characters (adult women and men), including hair/outfit customization, animation and deer behavior. Add photo-assisted modeling only with appropriate consent/rights and an image-processing service.
3. Implement streamed terrain chunks with true world-coordinate persistence, collision and tap-to-walk navigation; use a distance-to-home/fast-return option so a player never needs an eight-hour hike back.
4. Put the private studio behind secure admin authentication and connect the versioned world blueprint to Oracle. Add staging, preview, rollback and controlled publishing.
5. Integrate the approved Woodland Trail, Base Camp, Ranger Station and future statewide game map while leaving existing live camera pages functional.
