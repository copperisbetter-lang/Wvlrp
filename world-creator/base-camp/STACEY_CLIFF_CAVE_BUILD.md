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
