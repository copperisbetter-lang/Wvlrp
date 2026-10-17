/** The Wild: verified downloaded HD tree source registry.
 * Shares source IDs with the installed PBR asset manifest.
 * Weights are target shares of planted trees, NOT acreage.
 * A missing verified species remains pending; never substitute a cartoon tree.
 */
export const FOREST_SPECIES_TARGETS=Object.freeze([
  {species:"maple",weight:18,asset:"./assets/maple_trees_planting_clean.glb",status:"installed"},
  {species:"oak",weight:25,asset:null,status:"pending-native-model-verification"},
  {species:"hickory",weight:15,asset:null,status:"pending-native-model-verification"},
  {species:"beech",weight:12,asset:null,status:"pending-native-model-verification"},
  {species:"conifer",weight:15,assetIds:Object.freeze(["fir_tree_01","pine_tree_01","fir_sapling_medium","pine_sapling_medium","pine_sapling_small","fir_sapling"]),manifest:"./assets/village-grove-sources.json",status:"installed-visual-stand-ins"},
  {species:"other-hardwood",weight:15,assetIds:Object.freeze(["tree_small_02","island_tree_01","island_tree_02","island_tree_03"]),manifest:"./assets/village-grove-sources.json",status:"installed-visual-stand-ins"}
]);
export const FOREST_PLANTING_RULES=Object.freeze({campSideMetres:15.24,campBufferMetres:3.048,minCampCount:100,mainTrailWidthMetres:3.048,woodlandTrailWidthMetres:1.829,explorationTrailWidthMetres:.9144,groundBurialMetres:.12,terrainStreamingPreserved:true});
export function validateForestTargets(){
  const sum=FOREST_SPECIES_TARGETS.reduce((n,t)=>n+t.weight,0);
  if(sum!==100)throw Error("Forest target weights must total 100; got "+sum);
  return true;
}
validateForestTargets();
