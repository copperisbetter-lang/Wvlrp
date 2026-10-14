/** The Wild: zero-cost realistic vegetation trial, restricted to Hearthside girls' cabin. 
 * Staging manifest only: external models are NOT yet bundled or enabled.
 * World units are metres. 29 feet = 8.8392 metres.
 * Never place trees through the cabin, porch, doors, paths, or NPCs.
 */
export const GIRLS_CABIN_VEGETATION_TRIAL = Object.freeze({
  centerX: 0, centerZ: 0, radiusMetres: 29 * 0.3048,
  maxAssetCostUSD: 0,
  preserveExistingOutsideRadius: true,
  sources: Object.freeze([
    {name:"Fern 02", url:"https://polyhaven.com/a/fern_02", license:"CC0", kind:"fern", status:"source-verified-not-installed"},
    {name:"Shrub 02", url:"https://polyhaven.com/a/shrub_02", license:"CC0", kind:"shrub", status:"source-verified-not-installed"},
    {name:"Shrub 01", url:"https://polyhaven.com/a/shrub_01", license:"CC0", kind:"shrub", status:"source-verified-not-installed"}
  ])
});
export function insideGirlsCabinTrial(x,z){
  return Math.hypot(x-GIRLS_CABIN_VEGETATION_TRIAL.centerX,z-GIRLS_CABIN_VEGETATION_TRIAL.centerZ)<=GIRLS_CABIN_VEGETATION_TRIAL.radiusMetres;
}
