# Beverly in live Stacey Lake

Owner requested approved Beverly continuously walking outside the treeless Stacey Lake shoreline.

## Approved source

Recovered user-uploaded `Beverly_CERTIFIED_WILD_MASTER_BACKUP.zip`.
Exact original `Beverly_APPROVED_Visual_Master.html` SHA256:
`d1ac470a2ad31fd21bfbf55e79ba2ad467ed407b97f98296defb5945e8d6e5e7`.
Original master remains unmodified. An additional private Library backup attempt failed because storage is full. Do not claim the original HTML/ZIP is backed up by this repository.

## Game asset and integration

- `world-creator/base-camp/Beverly-approved-dressed.glb` contains the approved body, face, hair, USA bikini, cups, bows and straps. 18,798,120 bytes; SHA256 `fc55a17bb9c228ecc1a2a3f24ccd5e3a4ec26a987cb2ffe123ce00d12530a7fc`.
- Derived from the exact master fitting/geometry code. The shader-only front hem is baked into geometry. Swimwear binds to the existing rig without changing its initial fitted coordinates. Includes `Beverly_Shoreline_Walk`, a gentle 8-track looping skeletal walk.
- `beverly-shoreline-npc.js` uses the game's actual `outer(a)+3m` and terrain sampler, at 1.2m/s. Starts in front of the south beach. It never enters an idle state. Creek-bank elevations are sampled once and blended for continuous footfalls; terrain is unchanged. She briefly wades in the shallow creek outlet (maximum sampled foot depth about 0.26m).
- `stacey-dive.html` loads the dressed GLB asynchronously and updates the NPC from the existing game frame loop. Exposes `window.beverlyShoreline.state` and `staceyDiagnostics.assets.Beverly`.
- Restores the owner-requested treeless, dropdown/minimap/Mason game from commit `562abe8b9d5e9807e8e8421150fea8e1c957d909`, including omitted game modules and canyon chunks. Previous main had reverted to the short reference lake. No trees are started; existing lake scenery is preserved.

The dressed game asset is stored durably as `beverly-asset/Beverly.glb.b64.part00` through `part25`. The existing Pages workflow reconstructs the GLB and verifies its checksum before publication. These parts are the complete dressed asset, not the original master HTML/ZIP.

## Validation

- Original approval checksum matched.
- Local GLTFLoader successfully reloaded the final game asset, 30 skinned meshes and 8 animation tracks.
- Sampled skinned vertices remained finite and within expected character bounds through an 800-second simulation.
- Actual terrain/shoreline controller simulation: 959.999m traveled; minimum radial land clearance 3.000m; largest 20ms step 0.024089m; loop crosses starting angle without a stop.
- Game inline module and NPC controller pass JavaScript syntax checks.
- Test browser cannot create a WebGL context. Visual game rendering, Android FPS, and owner acceptance remain unverified. Do not claim phone QA passed.

Direct game route: `/world-creator/base-camp/stacey-dive.html?spawn=lake`.
