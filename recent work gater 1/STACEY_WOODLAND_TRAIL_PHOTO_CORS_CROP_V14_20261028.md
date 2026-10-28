# Stacey Woodland Trail — V14 original photographic path (28 Oct 2026)

## Owner Android finding
V13 screenshot at approximately 3:48 PM EDT displayed an elongated, pale leaf/dirt strip instead of the original 360° Woodland Trail. The HUD gave the actual failure:
`SecurityError: Failed to execute 'getImageData' ... canvas has been tainted by cross-origin data.`
Status read `Trail photo failed`, proving the photograph never applied and the generic underlying material rendered.

## Original asset inspection
Verified existing `assets/woodland-trail-hd.webp`: an autumn forest equirectangular panorama with the genuine rocky walking trail in the image center. Older code drew from bottom foreground leaves, then desaturated it into beige synthetic dirt and repeated every 7.5 metres.

## V14 staged fixes — isolated, not merged
Branch: `gater/stacey-woodland-photo-cors-crop-v14-20261028`, based on complete V13 integrated lake/spring/path scene at commit `044f3db6b25dc23b2277cde07db430f0dd4f1a11`.
- `stacey-woodland-360-photo.js`: set `img.crossOrigin='anonymous'` BEFORE loading. First try immutable same-repository image path, then immutable raw.githubusercontent CORS-enabled fallback. No getImageData or putImageData.
- Photo crop now uses actual center rocky walkway, x=40.5–59.5%, y=52–90% of the source, near-square natural pixels. Preserve original fall colors, rock/shadows and detail; blend only side edges using compositing, no artificial light tan color.
- `stacey-purple-main-lake-spur.js`: change photo travel-distance UV period from 7.5m to 2.8m, so leaf and rock pixels are not stretched lengthwise.
- `stacey-visible-photo-trail-20261028.test.mjs`: regression ensures CORS, no canvas readback, preserved photo crop, nonstretched UV, 3D visible terrain surface and first-person trail spawn.
- All V13 geometry, first-person spawn, photo-height matching and original main + lake spur remain, as do V12 spring, V11 mountain, V9 dome, water, trees and cliff. No production/main updates.

## QA and limits
Direct source inspection assertions passed for CORS-before-src, real photo crop, origin-safe compositing, geometry/UV, correct first-person spawn and diagnostics. CI job started and may include four pre-existing unrelated Base Camp failures.
**Owner's Android GPU rendering still unverified**; do NOT claim appearance is approved. The status HUD must say `Trail photo ready` (not failed) before evaluating appearance.

## Preview
https://raw.githack.com/copperisbetter-lang/Wvlrp/gater/stacey-woodland-photo-cors-crop-v14-20261028/world-creator/base-camp/stacey-dive.html?spawn=trail
