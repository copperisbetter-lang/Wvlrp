/**
 * Pure validation for anonymous Game Beta Test position packets.
 * Never accept names, markup or executable data from remote browsers.
 */
export function normalizeWildPose(value){
  if(!value||typeof value!=="object"||value.v!==1)return null;
  const fields=["x","z","yaw"];
  if(fields.some(k=>typeof value[k]!=="number"||!Number.isFinite(value[k])))return null;
  if(Math.abs(value.x)>100000||Math.abs(value.z)>100000||Math.abs(value.yaw)>1e6)return null;
  return {x:value.x,z:value.z,yaw:Math.atan2(Math.sin(value.yaw),Math.cos(value.yaw))};
}
export function wildVisitorColor(peerId){
  let hash=2166136261;
  for(const c of String(peerId)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return (hash>>>0)%5;
}
