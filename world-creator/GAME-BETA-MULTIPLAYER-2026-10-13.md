# The Wild — Public Game Beta Test (13 October 2026)

## Public routes
- Homepage navigation, hero, Adventure tile and footer now point to `/adventure-portal.html`.
- Two-choice portal: **Game Beta Test** opens `/world-creator/walk.html?mode=beta&spawn=ranger`.
- **Original 360° World** opens the unchanged `/adventures.html` panorama and original trail.
- Ordinary `world-creator/walk.html` and World Creator preview links retain their old behavior.

## Public game launch
- No account and no avatar pick is required.
- Every visitor starts with the existing first-person camera / mobile joystick / desktop WASD controls.
- Village launch stays in the Ranger Station approach (small per-session randomized spawn offsets avoid stacking visitors at one point).
- Hearthside Cabin, approved village layout, all resident models, camera streaming and the 360° site are unchanged.

## Initial multiplayer implementation
- Source: `world-creator/wild-multiplayer.js`, `wild-multiplayer-protocol.js`.
- Public beta joins Trystero 0.26.0 Nostr-signaled WebRTC room `first-person-world-v1`, app ID `com.wvlrp.the-wild.public-beta.20261013`.
- Sends position (world metres) and facing approximately every 150ms when peers are connected; broadcasts an initial packet upon connecting.
- Other visitors show as anonymous, modestly detailed **clothed explorer** figures. Their local view remains first person. Visitors are not any saved avatar / NPC and don't interfere with their files.
- Dynamic remote figures disappear when a browser leaves, goes stale for >18 seconds, or leaves nearby rendering radius.
- HUD displays peer count and fallback message if the connection module fails.
- Defensive packet validation accepts only finite x, z and yaw values inside sanity bounds. No received names or HTML are rendered.

## QA and limitations
- Automated route, protocol and syntax tests are in `world-creator/tests/wild-multiplayer.test.mjs` and the World Creator Checks workflow.
- **Live two-device WebRTC connection has not been verified** from this session (Oracle/Desktop Commander was offline and no direct public-browser session available). Don't claim public two-player QA passed before testing.
- Public Nostr relays provide signaling. Without your own relay / TURN some carrier, strict NAT or enterprise connections will be unable to connect, and public relay reachability affects discovery. This is a **small-room beta** for pairs / a handful of users, not a production-scale authoritative server.
- To manually test: open the Game Beta Test link from two different devices (or two independent browser tabs). Allow the scene and peer connection to initialize. Each page should display `You + 1 other explorer nearby`, and each browser should see a moving generic explorer. Walk and turn independently. Check that leaving removes that explorer on the remaining screen. Retry using two different networks to assess NAT limitations.

## Future if beta grows
- Move presence to an authoritative WSS server if many simultaneous players are expected; introduce authentication / moderation, terrain chunk proximity, and optional TURN.
- Keep the user's first-person camera and preserve the original 360° path.
