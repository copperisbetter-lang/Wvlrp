# Base Camp checkpoint — 2026-10-22

## User-approved direction
- WVLRP original Woodland Trail 360 panorama at `assets/woodland-trail-hd.webp` is the definitive visual reference for the new Base Camp forest: trails, native Appalachian trees, leaves, understory and shrubs.
- User specifically wants real photographic ground/trail imagery laid flat onto terrain, **not** artificial brown ribbon trails or generic substitutes. Previous attempts using cropped panorama and a different forest-floor texture were not accepted.
- User asked for a top-down map **posted directly in chat**, not a link. A map was generated from Base Camp code showing 41 perimeter clearings, 24 interior clearings, five-acre lake and previous trail routes. Main village buildings are **not placed** in current Base Camp scene.
- User then instructed: **remove ALL existing trails** before proceeding. This is the latest controlling instruction. Do not add trails back until the user gives new placement directions.

## Work completed and status
- Earlier trail commits: `18d4c5edccd33a2e3131a38d95fe8a130b5ec398` (curved trails), `a9bb59a5b8c0e83ee9c557e242b1aced9d4ddb59` (attempted 360 photo crop), `5ef0d1122958a6aa0c8c1390c960fc647a60f443` (generic leaf-floor photo fallback). None met the user's photographic trail standard.
- **Current accepted code action:** commit `f370abbfd3547ad8313d967b499a58894589c292` removes all trail definitions, path geometry, trail texture loading, and trail-related campsite exclusions from `world-creator/base-camp/index.html`. No trail routes are rendered by that scene.
- Preserve lake, terrain, perimeter/interior clearings, performance protections, and separate Wild game. The Base Camp vegetation was already cleared before these changes. Do not claim new photorealistic trees or shrubs are built.
- Screenshot user supplied showed objectionable brown ribbon paths across the terrain. User expects future work to match the approved original 360° photographic appearance.
- Current live viewer: `https://wvlrp.com/world-creator/base-camp/`. Source repo: `copperisbetter-lang/Wvlrp`, branch main.
- Current layout map generated in chat: `/mnt/data/base_camp_actual_layout_map.png` (conversation artifact, not committed to repo).

## Other live-camera context
- Website recovered; East Bank camera is back. Roost still required physical reset by user; do not assume its status has changed.

## Next action
- Wait for user's instructions about where and how to lay out new trails. Do not restore old paths, create placeholder roads, or add vegetation without instruction.
