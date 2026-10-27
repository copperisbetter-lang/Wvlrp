# Stacey Lake — Left-bank cliff, twin falls and walk-behind-waterfall cavern
Status: approved creative direction; design staging only, NOT yet an implemented or tested scene.
Reference: latest beach screenshot (looking left, lake on right) and generated twin-waterfall concept render, 2026-10-26.

## Required exterior
- Preserve original lake/water physics, camera, joystick, beach, trees outside the 60 m shore exclusion, and mobile frame budget.
- Excavation on the left bank from the beach-facing view: replace current sloping hill with a broad, sheer, layered Appalachian rock cliff. Keep top forest behind the face; ensure playable terrain collision at rim and base.
- Two smaller waterfall cascades spaced ~50 ft (15.24 m) horizontally. One conceals a player-scale cave entrance accessible on foot from rock path beside/behind the waterfall, without forcing entry through a solid water collider.
- Both waterfalls collect in ONE distinct small pond at cliff foot, with a visible small outflow stream descending into Stacey Lake. Pond and stream must be actual walkable/swimmable game geometry/water, not painted-only scenery.
- Water flows continuously; use mobile-conscious meshes, texture animation, particle mist budget.
- No trees in forbidden 60 m lake-shore zone; do not mistake 60 m from lake center for 60 m from outer shoreline.

## Cave interior
- Behind ONE waterfall, a natural irregular entrance leads via walkable, bent rock passage into a very large, high-ceilinged natural chamber, visually like a stone ballroom. Natural limestone/sandstone walls, pillars, stalactites, stalagmites and varied rock formations around the room. Avoid manufactured walls or a literal decorated ballroom.
- A broad level central floor allows groups of avatars to stand/walk/dance, while perimeter contains rock terraces and formations. Proposed gameplay dimensions pending terrain fit: chamber ~35–45 m across; ceiling ~12–18 m, passage ~2.5–3 m wide. These are provisional implementation targets, not user-approved exact measures.
- No teleport: actual continuous walk path, stable collision and player head clearance, daylight at waterfall entrance transitioning to indirect ambient cavern light.
- Cave shall be modeled as an interior shell with a real traversable entrance / visibility transition. Do NOT simply add a dark decal into a solid cliff.
- Preserve mobile performance especially Samsung A16/A17; limit transparencies, reflections, draw calls, physics and shadow casters.

## Build stages / acceptance
1. Make coordinate plan from existing camera and coastline; snapshot/branch; keep production scene unchanged.
2. Construct cliff and terrain cut with realistic rock face and collision; verify beach and lake unaffected.
3. Build pond + outlet channel, then waterfall placement 15.24 m apart; verify visible stream actually reaches lake.
4. Add cave passage and large vaulted room with natural formations and safe movement/return.
5. Mobile browser smoke test and screenshots from beach, waterfall entrance, and chamber. Confirm scene startup, non-blue-screen, FPS, navigation and cave reachability before merging.

## Quest gate — Dark and Damp (user direction, 2026-10-26)
- Quest name: **Dark and Damp** (interpreted from voice transcription “fark amd damp”; verify exact label before shipping UI).
- BEFORE this quest is started by the individual player: a **large natural boulder** fully blocks the concealed entrance behind one waterfall. The cave mouth MUST remain visibly identifiable from outside: show a dark, intriguing rock opening or recess behind the falls, with the large natural boulder lodged across the passage. The boulder prevents access, not curiosity. The actual deep cave interior must not activate/render/load as player-visible content. Waterfalls, pond and stream remain visible and work normally.
- WHEN this player's quest transitions to STARTED: remove or move the blocking stone according to quest reveal event and enable that player's cave passage / cavern geometry, visibility, collision and navigation. Never reveal due to proximity alone.
- Persist the quest state per player; gate must survive reload and multiplayer joins. Players without quest activation must not see the opened cave because another player started the quest. Avoid collision mismatches across player instances (instance/phase the cave or use a per-player portal transition).
- Until unlocked, players MAY see the cave mouth and the blocking rock, but camera clipping, aerial view, swimming, or terrain seams must not reveal the large hidden interior. If practical, don't download heavy cavern assets until the gate opens (mobile FPS).
- Acceptance tests: prequest cave mouth visibly recognizable, blocked and inaccessible, with no glimpse of the underground ballroom; quest-start transition; entry/exit and reload; two players with different quest states; mobile performance.

## Exterior mystery / player curiosity — clarification 2026-10-26
- The waterfall cave is **not invisible** before the quest. Players should recognize a cavern entrance, dark recess and unmistakable boulder barrier from a suitable exterior viewpoint. Give subtle visual intrigue without revealing the enormous room.
- “Dark and Damp” controls **access and loading of the deep cave**, not whether the entrance exists visually. Keep the exterior boulder persistent and collidable until the player's quest progression permits entry.

## Secret underwater one-way exit (approved direction 2026-10-26)
- Inside the enormous natural cavern is a separate **deep pool**. At its bottom, keen explorers can discover a small submerged opening.
- Underwater passage is just wide enough for a single player avatar to swim through (single-file navigation, no bypass by walking). It leads from the cavern pool to an underwater outlet in **Stacey Lake immediately beneath the slope of the central island**.
- **Strict one-way traversal**: cavern pool -> narrow submerged passage -> lake beneath island. No reverse passage, entrance, door, or teleport back from lake into cavern. Prevent backtracking using one-way flow/collision/triggers and player-specific gate state. Do not expose cavern assets from the lake outlet.
- Cave access still requires beginning **Dark and Damp**; external waterfall cave mouth and blocking boulder remain visible before the quest, but not enterable.
- Implement as a continuous-feeling swim transition, keeping camera, movement and buoyancy coherent. Never trap players mid-tunnel. Include sufficient breathing/air or other safe in-game traversal mechanics to guarantee a possible successful exit; avoid frustrating soft locks.
- Design outlet to avoid island terrain intersection, lake water-surface bugs or accidental reverse access, and maintain physical continuity with actual lake underwater environment.
- Multiplayer: serialize single-file tunnel occupancy or handle collision/instancing safely. On reconnect during transit, spawn player in safe cavern-pool or island-lake location consistent with progress.
- Test underwater entry, tunnel traversal, one-way enforcement, island emergence, quest-lock bypass, reload, and mobile FPS. Not yet built or visually verified.
