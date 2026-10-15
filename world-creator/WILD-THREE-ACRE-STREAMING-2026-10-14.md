# The Wild — three-acre streaming regions (October 14, 2026)

## Approved design

**Do not subdivide the village into tiny chunks.** Keep the three buildings,
fire ring, square and their immediate walkable ground in one approximately
three-acre region. Existing in-game world coordinates are authoritative;
these are **not real property lines**, saleable deeds or GPS parcels.

**Backcountry:** Load a corridor following the trail, 30 ft / 9.144 m from
each side of the route centreline. The full width is 60 ft / 18.288 m.
A nominal three-acre straight corridor travels about 663.85 m (2,178 ft)
along the path. Winding or overlapping trails need geometric area accounting
before calling the physical union *exactly* three acres.

**Off-trail:** Once the player is more than 30 ft from the path centreline,
activate a separate 3-acre woods region based on their current coordinates.
Off-trail square chunks have approximately 110.184 m sides. Rejoining the path
returns to path-corridor streaming automatically.

## Existing live code versus new groundwork

- `wild-acre-regions.js`: pure independent region selection and prediction,
  with village, authored and infinitely generated paths, 30-ft boundaries,
  off-trail regions and neighbor prefetch.
- `tests/wild-acre-regions.test.mjs`: boundary and continuity tests.
- **Not yet connected to Babylon rendering.** The live `walk.js` still calls
  `renderWildLandscape` to replace an entire local landscape, with a 196m
  walking terrain and 1100m far terrain. The region module alone does **not**
  reduce the currently rendered meshes. Do not claim the live feature is
  installed until renderer and on-device behavior are validated.

## Implementation requirements for the renderer phase

1. Scene chunk manager keyed by stable `section.id`, per local player.
   Never reset the camera, avatars, quests, inventory or multiplayer on switch.
2. Village geometry is **owned by the village section only**; no duplicated
   shops, campfire, or imported PBR tree when adjoining terrain loads.
3. Split near geometry (terrain, collidable tree trunks, rocks, wildlife, paths,
   detailed vegetation) from cheaper distant silhouettes, mountains, sky/sun
   and fog. Those distant views remain visible and inexpensive across sections.
4. Load the next section asynchronously **before** crossing the boundary.
   Keep the previous section while the next section becomes ready. Only then
   dispose the old region and its meshes, textures, buffers and colliders.
   Reuse cached GLB models/textures instead of re-fetching on every transition.
5. Keep the hero PBR tree and realistic future native trees at high quality
   close to the camera. Use instancing, lower-detail meshes, and foliage LOD
   farther along the long three-acre path corridor; three acres does not
   imply all 3 acres use maximum polygon counts simultaneously.
6. Use deterministic world seed and absolute world coordinates across section
   boundaries; the player should never see a path, stream or terrain seam.
7. Because a path can fork inside the next 30ft, prefetch branch corridors,
   not only the current route's next linear index. Village departure/return
   similarly prefetch the appropriate adjacent corridor or wilderness.
8. Off-trail transitions must work when walking, running or teleporting. Test
   on Android at the original ~19–22 FPS baseline and measure memory, FPS,
   stall times and network bytes before claiming a performance improvement.
9. Multiplayer avatars are streamed based on actual game coordinates, never
   tied to an individual player's terrain chunks or phone GPS.

## Sign-off tests before switching the public beta

- Walk between all three village buildings and fire pit: zero chunk changes.
- Walk from village to trail for more than one 3-acre section: no pause/blackout.
- Step 29 ft then 31 ft to either side of the same trail: at 31 ft off-trail
  section preloads/switches; player position persists.
- Repeat on a sharp bend and at a fork with independent players nearby.
- Walk away and return: identical trail, vegetation, object IDs and player state.
- No village building duplication or disappearance across loading boundaries.
- No regression in camera height, collisions, joystick, map or multiplayer.
