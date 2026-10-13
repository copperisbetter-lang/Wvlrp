# The Wild — Hearthside Cabin checkpoint (October 12, 2026)

## Approved change request
Pause the adult Riley anatomical trial and switch to actual WVLRP *The Wild* world building. Build a **really nice, rustic, cozy, single-room mountain cabin** first; put **all existing people** inside; remove the **generic grassy ground and primitive cylindrical/ball trees** from the World Creator 3D preview.

## Built and versioned on main
- `world-creator/cabin-builder.js`: one large furnished single-room Appalachian timber cabin (18 × 14 game metres); plank floor, stone foundation, wood log walls, actual doorway/open door, real side-wall window openings, large gable roof with cutaway toggle, porch and steps, stone fireplace and amber lighting, table/stools, bookshelf, sofa, bed, rug.
- `world-creator/world-core.js`: `HEARTHSIDE_CABIN` and `gatherCabinCrew` define repeatable placement of all existing NPCs. Adds missing test models **Riley, Amy, Christy/Chrissy, Caitlyn, Mason, Sha, and Sav** without duplicating. If user has other custom people, gathers them too. Respects their names/appearance keys/poses. Does not remove deer, custom cabins, other world markers or quests.
- `world-creator/studio.js`: one-time browser-local migration installs the new cabin/crew without wiping saved world; renders real cabin instead of a cube, flattens ground inside the building, retires generic ball trees and uniform grassy ground from 3D preview. Adds first-person close inspection via camera orbit, cutaway roof, nameplates, and direct resident inspection controls. Cabin is selectable as map object.
- `world-creator/index.html`: buttons to gather people, visit cabin, show/hide roof, choose resident, load all detailed avatars (heavy), plus description of Android performance tradeoff.
- `world-creator/tests/world-core.test.mjs`: tests crew count, seven unique built-in model keys, existing NPC identity retention, JSON roundtrip, re-entry idempotence, deer/custom marker preservation.

## Phone performance
By default at most two characters are imported as detailed GLBs inside cabin; other people remain visible through lightweight preview figures and name labels. The user can choose a resident to import it for close inspection, or enable all detailed models at once on a more powerful device. This prevents unbounded simultaneous 10–18 MB GLB imports on Android. This is still a prototype, not photoreal, and not a multiplayer Oracle-published world.

## Verification and test entry
- New World Creator entry: `https://wvlrp.com/world-creator/?focus=cabin&v=hearthside-cabin-20261012`
- GitHub workflow `World Creator Checks` ran successfully on each of the integration commits; latest deployment should separately be checked for GitHub Pages success.
- 3D final visual quality requires the user's actual Android/browser inspection; passing source code checks does not prove appearance or performance. Leave Riley anatomy as separate suspended work.

## Future world-building stages
Native WV hardwood/pine/tree geometry and realistic leaf litter, walkable cabin collision and furniture use, front door interaction, camera transition from outside to inside, character moving around, shared Oracle persistence, local trail connections and ranger/mercantile locations. Maintain independent current avatar identities. Do NOT use the separate Riley trial as the permanent world character without approval.
