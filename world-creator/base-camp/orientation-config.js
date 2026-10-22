// The Wild — independent Base Camp Orientation World configuration
// Units are meters. This module is isolated from the original Wild.
export const BASE_CAMP_WORLD_ID = "base-camp-orientation-v1";
export const BASE_CAMP_RADIUS_M = 402.336; // quarter mile
export const CLEARING_SPACING_M = 15.24; // 50 feet
export const CENTER_EXCLUSION_M = 60.96; // 200 feet
export const PERIMETER_COUNT = Math.round(2 * Math.PI * BASE_CAMP_RADIUS_M / CLEARING_SPACING_M);
export const WORLD_CENTER = Object.freeze({x:0,z:0});
export const CLEARING_TYPE = "natural-unfurnished-clearing";
export const perimeterClearings = Array.from({length:PERIMETER_COUNT},(_,i)=>{
  const angle = 2*Math.PI*i/PERIMETER_COUNT;
  return {id:`edge-${String(i+1).padStart(3,"0")}`,type:CLEARING_TYPE,
    x:BASE_CAMP_RADIUS_M*Math.cos(angle),z:BASE_CAMP_RADIUS_M*Math.sin(angle),
    facingRadians:angle, scenicOverlook:true, furnished:false};
});
export function validInteriorClearing(x,z,additionalSetbackM=0){
  const distance=Math.hypot(x,z);
  return distance>=CENTER_EXCLUSION_M+additionalSetbackM &&
    distance<=BASE_CAMP_RADIUS_M-additionalSetbackM;
}
export function sunDirection(timeHours, latitudeDegrees=38.4){
  // Preliminary independently controlled solar arc; replace with validated solar ephemeris for seasonal realism.
  const phase=(timeHours-6)/12*Math.PI;
  const elevation=Math.max(-Math.PI/2,Math.min(Math.PI/2,Math.sin(phase)*(Math.PI/2-Math.abs(latitudeDegrees)*Math.PI/360)));
  const azimuth=(timeHours/24)*2*Math.PI;
  return {x:Math.cos(elevation)*Math.sin(azimuth),y:Math.sin(elevation),z:Math.cos(elevation)*Math.cos(azimuth)};
}
export const renderRequirements=Object.freeze({
  physicallyBasedMaterials:true,dynamicSunShadows:true,panoramaIndependentOfSun:true,
  nativeAppalachianVegetation:true,photorealisticAssetsRequired:true,
  originalWildAssetsLoaded:false,campsitePropsAllowed:false
});
