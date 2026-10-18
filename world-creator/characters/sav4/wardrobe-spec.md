# SAV 4 realistic 3D wardrobe — production specification

SAV 4 is an adult (18), 5 ft 6 in, slender/petite character. Garments must be independent mesh assets, not primitive cylinders or painted skin materials.

## Initial wardrobe
- Three mini skirts: dark indigo denim with stitched seams, black cotton twill with waistband, dusty rose pleated woven fabric.
- Four tank tops: ivory rib knit, charcoal fitted cotton, sage relaxed tank, blue scoop-neck jersey.
- Two bikinis: ocean-blue and coral, each with separately modeled cups, straps, and briefs.
- Casual: denim shorts, white tee, straight-leg jeans.

## Asset acceptance
- Use legal/redistributable source meshes, recording origin and license per garment.
- Fit garments against actual SAV 4 body vertices, not a generic size chart. Retain waist/hip/chest measurements and export transform.
- Garments need closed or hemmed thickness, UVs, PBR materials, normal maps where appropriate, and no visible intersections in neutral, walk, sit and bend poses.
- Bind garments to the character armature with validated weights. Export separate GLB per item with matching skeleton coordinates and descriptive mesh names.
- Do not label procedural geometry or missing asset references as completed garments. Hide clothing buttons until the corresponding asset loads, or show an explicit unavailable status.

## Build sequence
1. Verify the SAV 4 base GLB, rig and body dimensions.
2. Import and inspect the existing MakeHuman mini skirt; repair and fit before enabling it.
3. Create tank tops, then bikinis and remaining skirts; test every outfit in the viewer.
4. Publish only after mobile inspection and verified working clothing switches.
