# The Wild — approved October 13, 2026 reference landscape

## Source of truth
The user provided six screenshots of their existing WVLRP pages, namely **Adventures / camp**, **West Hills / woodland path**, and four **Community** views. Treat these screenshots and the underlying WVLRP original 360° artwork as the **definitive appearance target**, not as optional mood-board examples.

### Forest and trails
- Make the complete walkable world resemble the photos: mature WV hardwood forest with intermittent eastern hemlock / white pine, broken native canopy, plentiful younger trees, high-density mountain laurel / rhododendron / ferns / brambles, mossy sandstone clusters, natural decaying fallen logs, and windblown broadleaf litter.
- Narrow, naturally winding walking paths, depressed into the soil, worn by feet and runoff; avoid unnaturally straight, evenly spaced, uniformly clean trails or regular tree poles.
- Bright warm daylight under a textured canopy with visible sun patches, color variety and convincing Appalachian habitat composition, without cartoon shapes.
- Retain existing functional Hearthside Cabin and the approved saved avatar characters/identities.

### Village orientation and exact original user markers
| Original user cabin | Name | Map X | Map Z | Visual arrangement |
| --- | --- | --- | --- | --- |
| 2 | Ranger Station | **93** | **77** | **CENTER**, dominant timber-and-stone lodge |
| 3 | Laurel's Kitchen | **90** | **78** | **LEFT** of Ranger Station |
| 4 | Mercantile & Gift Shop | **90** | **75** | **RIGHT** of Ranger Station |

These markers are local game metres from Hearthside Cabin X=0/Z=0. They were intentionally placed by the user; **never change the original marker coordinates**. They overlap the footprints of full-scale architecture, so distinct *visual building facades* are arranged around the common walkable clearing while retaining the user's map anchor markers. The user explicitly reaffirmed on October 13: *ranger station in the center and the other two to each side of ranger.*

### Building appearance
- **Ranger Station:** wide, symmetrical, imposing Appalachian timber-beam and stone lodge; central gable/truss, spacious porch, centered broad entry stair and wood-engraved Ranger Station sign.
- **Laurel's Kitchen:** welcoming sloped-roof woodland chalet with broad wood porch, warm timber, dormers, flowers and informal garden edge, signage reading Laurel's Kitchen.
- **Mercantile & Gift Shop:** large rustic two-story timber general store, long shaded porch, standing-seam roof, large wood storefront sign and heritage-tree surroundings.

All three buildings must be navigable 3D geometry, not 360° screenshots pasted on flat cards, while photos remain the high-fidelity target.

### Development / verification checkpoint
- world-creator/wild-reference-layout.js: immutable marker coords, visual building layout, path segments, vegetation exclusions.
- world-creator/wild-village.js: prototype 3D timber/stones/roof/porch models and walking-path meshes.
- world-creator/world-core.js: preservation of original three markers during wilderness-reset, plus seven avatars and Hearthside.
- world-creator/wild-landscape-renderer.js: village, paths, flattening and forest clearances connected to streamed woodland.
- world-creator/wild-investor-graphics.js: dense undergrowth still survives everywhere except walkable trails.
- world-creator/walk.js, walk.html: **Village** button to stand facing the central Ranger Station with Kitchen to left and Mercantile to right.
- JS syntax and marker idempotence checked October 13. **Not yet demonstrated visually in a real browser or confirmed deployed on wvlrp.com.** Procedural architecture is an initial 3D approximation, **not yet photo-equivalent**. Do not claim it matches screenshots photorealistically until the user inspects and approves.

Keep evolving scene quality to match screenshots instead of replacing their exact composition or inventing new arrangements.
