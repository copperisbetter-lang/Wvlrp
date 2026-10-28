# Stacey Spring V14 — owner Android visual correction, 2026-10-28

## Owner rejected V13 visually
Screenshots at ~3:57–3:59 PM show a bridge of oversized dark boulders hanging over the spring, broad flat/pale photo creek bed, glaring white polygonal imagery near Stacey Lake, and exposed twin canyon slabs in aerial mode. This is NOT approved.

## Safe isolated source correction
- Base: immutable V13 scene 35b23f7695f09a37ffeb9d2c348dda8b88d97139
- Branch: `gater/stacey-spring-embedded-rock-v14-20261028`
- Code checkpoint: `985dcd12608a9545bae3addd93175a2754c7fd56`
- Changed ONLY: `world-creator/base-camp/stacey-spring-bedrock-v12.js`
- Removed 12 cross-mouth overhanging rock clusters and oversized mixed side rocks; replaced with 32 smaller bank stone clusters, outside the 8.8m headwater stream, height seated against actual `ground(x,z)`, leaving the mountain mouth and source water unobstructed.
- Retained the jagged recessed stone opening but replaced solid black material with dark photographic limestone.
- Dry photo-bedrock mesh now tapers at both stream ends, has raised irregular rocky banks, and buries outside edges into terrain rather than ending as a wide flat rectangular sheet.
- Neutralized the formerly bright bluish stone cast. Kept original flowing 1-to-2-stream water meshes, waterfall, lower creek, lake surface, V6 canyon GLB, cavern, footpath, and trees untouched.

## Validation / status
11 exact source replacements validated; JS parsed without syntax error; direct source assertions passed. NO full WebGL, automated browser or owner Android visual verification yet, so this is a QA candidate only. Production and main remain frozen/unchanged.

Preview: https://raw.githack.com/copperisbetter-lang/Wvlrp/985dcd12608a9545bae3addd93175a2754c7fd56/world-creator/base-camp/stacey-dive.html?spawn=spring

## Remaining independently scoped issues (NOT fixed by V14)
The large pale white photo triangles near the lake and split-block aerial V6 canyon remain open for texture/GLB geometry diagnosis. Do NOT claim the above code resolves them. Inspect V6 sky-color masking shader, material/backface intersections and the visible cliff wing/rock asset extents before modifying approved V6. Coordinate with Gater 1's independently developed Woodland Trail V14 to avoid overwriting either branch.
