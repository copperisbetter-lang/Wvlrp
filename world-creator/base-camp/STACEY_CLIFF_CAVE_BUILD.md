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

## Brooke first encounter / follow-on quest (2026-10-26)
- Exact quest title: **For the Love of Brooke** (user-corrected spelling).
- Sequence: Start **Dark and Damp** -> uncover/enter the waterfall cave -> discover the deep cavern pool -> swim the one-way underwater passage -> emerge in Stacey Lake near the slope of the central island -> Brooke interacts with the player for the first time -> trigger **For the Love of Brooke**.
- Trigger requires verified completion of the cave-to-island underwater passage AND surfacing/emerging into Stacey Lake. Ordinary swimmers near the island, teleporting, or passing close to Brooke do NOT trigger this first encounter.
- Track discovery, transit completion, Brooke first interaction and follow-on quest state **per player**; ensure idempotent triggers on rejoin/reload/multiplayer. Brooke's normal lake animation can remain visible earlier, but her quest interaction is locked until this event.
- Dialogue and detailed objectives for For the Love of Brooke are pending authoring; do not invent them.
- This is an approved narrative specification, not yet implemented gameplay.

## Interlocked quest narrative: For the Love of Brooke / Dark and Damp (2026-10-26)
Canonical user-provided story:
- Brooke lost her father when she was young. Her father bought her a treasured keepsake pendant necklace.
- At the beginning of this summer, Brooke was swimming in Stacey Lake. When she got out to sunbathe, she realized the pendant was missing. She does not know exactly how or where she lost it.
- During Brooke's first interaction after the player exits the hidden cavern-to-island underwater passage, she shares the story and **shows the player a photograph of the pendant on her phone**. The goal of **For the Love of Brooke** is to work out how and where it was lost, recover the real pendant, and personally return it to Brooke. The pendant's actual location, loss mechanism, and search clues are NOT YET SPECIFIED; do not fabricate a solution.
- **Dark and Damp cannot be completed** until the pendant is found and returned to Brooke. This is a strict quest dependency, not merely optional dialogue.
- Upon return of the pendant, Brooke recalls her father bringing her to Stacey Lake as a little girl. She remembers a particular rock **inside the cavern**, bearing a symbol.
- This unlocks the next stage of **Dark and Damp**: return to the underground cavern, identify that symbol-marked rock, and discover the next clue there. The nature of the symbol and actual next clue remain unspecified.
- Preserve both quests' separate state. Proposed flags: darkDamp.started, loveOfBrooke.started, pendant.referenceSeen, pendant.recovered, pendant.returned, brooke.fatherMemoryTold, darkDamp.symbolRockClueDiscovered. Completion gate for Dark and Damp requires at least pendant.returned plus subsequent symbol-rock clue chain.
- Brooke's father and pendant are handled with emotional care; avoid trivializing her loss or automatically solving the mystery. Re-entry to the cavern remains via the waterfall entrance, not reverse passage from island.
- On reload/multiplayer, phone-photo disclosure, pendant handoff, memory reveal and clue gate must each occur once per player. Do not invent the rest of the quest.

## Pendant mystery — actual loss location (user reveal 2026-10-26)
- **Canon: Brooke did NOT lose the keepsake necklace at Stacey Lake.** She mistakenly assumes it happened there because she noticed it missing after swimming and getting out to sunbathe.
- The actual event: **Brooke left her father's pendant at the Mercantile while trying on another necklace she was considering buying.**
- This is the central misdirection in **For the Love of Brooke**. Players should have reason to investigate the lake initially, but ultimately discover the Mercantile connection through as-yet-undefined clues.
- Do not assume or invent who found the necklace, where it was stored afterward, who may have moved it, how it is recovered, or how two additional connected quests unfold. Those links remain reserved for future user direction.
- The pendant must ultimately be recovered and returned to Brooke; only then does her father's recollection of the symbol-marked cavern rock unlock the next Dark and Damp stage.
- This reveal is internal design canon; **do not spoil it in player-facing dialogue, objectives, item descriptions or UI before discovery**.

## Brooke friendship interaction unlock after quest (2026-10-26)
- Before the player completes **For the Love of Brooke**, retain Brooke's established behavior of swimming away when that player approaches her sunbathing rock. Initial story interaction after island tunnel emergence is an explicit scripted exception.
- Once that individual player **completes For the Love of Brooke** (pendant returned and quest completion acknowledged), Brooke no longer swims away from THAT player.
- The player can approach, sit beside Brooke and talk with her via a friendly repeatable conversation interaction. "Sit and stalk" in voice dictation is understood contextually as **sit and talk**; confirm wording if later necessary.
- This is per-player relationship progression. Other players who have not completed the quest still get Brooke's original shy/swim-away behavior. Prevent multiplayer state or NPC movement for one player from incorrectly changing another player's unlocked state; design an instanced or interaction-specific presentation as needed.
- Preserve Brooke's agency: player-initiated conversations and optional sitting, not automatic pursuit. Specific dialogue and further friendship steps await user direction.
- Design requirement only; no NPC code has yet been modified.

## Brooke's quest-aware friendly conversations (2026-10-26)
- After the player completes **For the Love of Brooke**, Brooke is approachable for sitting and conversation. She organically mentions the **specific past quests that this player actually completed**. Her dialogue reflects the player's reputation and known deeds around town.
- Example for a player who completed **Jenny's Surprise** and helped rescue the mother dog and nine puppies: “I heard you helped Jenny save those helpless little pups and their mama. That was so nice of you. Folks around town think you did that family a great service.” This is illustrative dialogue based on the user's example, not a required verbatim line.
- No spoilers: Brooke must not mention Jenny's puppy rescue before that player's quest is completed, in keeping with existing quest dialogue gates; likewise no comments revealing undiscovered plot details from other quests.
- Choose contextually relevant lines from completed-quest flags, with varied wording, gentle transitions and natural repeat handling. Avoid repeating the same story every time the player sits with her. Keep her warm, believable, and conversational rather than robotic or overly flattering.
- Multiplayer: query the interacting player's completed-quest state, not another player's. Brooke's approach behavior remains gated per player.
- Dialogue engine and actual character runtime remain to be implemented and tested.

## Brooke three-quest completion -> verified adult Resort trial (2026-10-26)
- After the player has completed **all three Brooke-related quests** (only **For the Love of Brooke** is named so far; do not fabricate the others), Brooke personally invites that player for a drink at **the Resort**, a separate adults-only member subworld.
- Invite available ONLY if the account has passed appropriate **adult (18+) verification**, all three quests are completed, and the account has not already redeemed its one-time invitation. No inferred adulthood from avatar appearance, chat statements, or self-selected birthdate alone.
- Reward is a **single-use complimentary Resort visit/pass** to preview the adult-membership subworld. It is NOT an automatic subscription, automatic purchase, renewal, or paid conversion. Show clear pass terms and a distinct optional opt-in if user later decides to subscribe.
- Enforce eligibility, entitlement issuance, redemption and account separation **server-side**, with an auditable consumed flag, even if the client is modified or links are shared. No guest/underage route into the Resort through portal, deep link, or multiplayer.
- Brooke's invitation should fit the friendship progression and feel natural rather than a jarring purchase pitch. If the player is not adult-verified, do not show or tease adult-only features; use normal friendship dialogue without the invite.
- 'One-time' here means one complimentary access redemption, not a recurring free perk. Pass duration and whether re-entry during the same visit is allowed are TBD and require explicit product definition.
- No Resort access/verification/subscription mechanics implemented in this branch. These are design requirements only.

## Brooke's Resort presentation (adult-only environment, 2026-10-26)
- After adult-verified player earns/redeems their one-time Resort invitation, Brooke appears in a **tiny miniskirt**, distinct from her lake attire.
- Brooke intentionally performs a playful, flirtatious **bend-over animation** in front of the player as part of the Resort encounter. Treat this as an adult character's suggestive, non-explicit animation, not a graphic or forced sexual scene.
- Ensure adult-only access gate described above applies to this encounter. Confirm mesh, clothing physics, pose rigging, camera behavior and mobile FPS in implementation.
- Do not alter Brooke's ordinary lakeside appearance or behavior for players outside the Resort. Design note only; not yet implemented.

## Resort Brooke — progressive comfort and opt-in preference (2026-10-26)
- Brooke arrives in her Resort miniskirt but stays fully clothed. No exposed intimate body parts by default, including during bending animations (ensure clothing/pose coverage and camera-safe presentation).
- Before any revealing adult-only presentation, Brooke can engage the adult-verified player in a short sequence of natural, tactful preference questions. These are conversation choices, not deceptive "tests" or inferences from player behavior.
- The player must get a **clear, unambiguous opt-in** to reveal more. Neutral, declining, skipping, or unclear answers mean Brooke remains clothed, and the player can enjoy the Resort without pressure or penalty.
- Offer a simple, accessible setting to change preferences or withdraw consent anytime. Treat answers as privacy-sensitive, minimize retention, and avoid sharing preferences with other players.
- The Resort's promotional purpose may inform optional preference research but must not manipulate the player or gate ordinary subscriptions behind sexualized engagement. Never assume willingness to subscribe based on interest in revealing content.
- These rules only apply to the adult-gated Resort encounter. Do not change main-game Brooke's knee-length-skirt wardrobe or her ordinary quests.
- This is design documentation, not a completed feature or implemented content.

## Resort experience paths: social-first and optional adult areas (2026-10-26)
- The adult-verified Resort is a worthwhile destination for every eligible player, regardless of interest in revealing/adult content.
- Social-first experience: dancing, cocktails (optional nonalcoholic alternatives), conversations, music, games, and mini-quests. This path offers a complete, rewarding experience with no nudity expectation or subscription penalty.
- If a verified adult explicitly expresses interest in additional adults-only experiences, the Resort can offer access to other optional doors/areas. Do not unlock those areas based only on guesses, behavioral profiling, or ambiguous dialogue.
- Explicit choice, clear previews/labels of content, and easily reversible preferences control access. Default to the social-first path; declining adult-only content never blocks normal quests or social opportunities.
- Brooke can introduce both tracks naturally without treating the social-first player as less valuable. Adult-area permissions must be enforced server-side with age verification.
- Details of adult-only rooms, activities, and their quests remain unspecified pending user direction. This is design documentation, not implemented logic.
