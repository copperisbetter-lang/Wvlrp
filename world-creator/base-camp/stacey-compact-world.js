/**
 * Stacey Lake's compact surface footprint. World units are metres.
 * The real waterfall/headwaters are on the western bank, so the western
 * limit has a wider lobe. Elsewhere only a short band of terrain lies past
 * the beach/shore, preventing a long empty walk toward the panorama.
 * Does not move any lake, cliff, waterfall or character assets.
 */
export const STACEY_SHORE_RADIUS = 152;
export const STACEY_WEST_WATERFALL_RADIUS = 190;

export function staceyWorldRadius(angle) {
  const west = Math.max(0, -Math.cos(angle));
  return STACEY_SHORE_RADIUS + (STACEY_WEST_WATERFALL_RADIUS - STACEY_SHORE_RADIUS) * west * west;
}

export function staceyWithinWorld(x, z, centerX=140, centerZ=-240, inset=1.5) {
  const dx=x-centerX,dz=z-centerZ;
  return Math.hypot(dx,dz) <= staceyWorldRadius(Math.atan2(dz,dx)) - inset;
}

export function keepStaceyInside(pos, centerX=140, centerZ=-240, inset=1.5) {
  const dx=pos.x-centerX,dz=pos.z-centerZ;
  const radius=Math.hypot(dx,dz);
  const limit=staceyWorldRadius(Math.atan2(dz,dx))-inset;
  if(radius>limit) {
    pos.x=centerX + dx*limit/radius;
    pos.z=centerZ + dz*limit/radius;
    return true;
  }
  return false;
}

export function nearWaterfallCave(x,z,portalX,portalZ=-240,range=9) {
  const dx=x-portalX,dz=z-portalZ;
  // Requires proximity to the exterior mouth, not to the former buried chamber.
  return Math.hypot(dx,dz)<=range;
}
