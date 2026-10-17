// Align a tree's rendered geometry to the terrain after all transforms.
export function groundTree(root, heightAt, x, z, burial=0.12) {
  const meshes=root.getChildMeshes(false).filter(m=>m.getTotalVertices?.()>0 && m.isEnabled() && m.isVisible);
  const bark=meshes.filter(m=>/trunk|bark|stem|wood/i.test((m.name||'')+' '+(m.material?.name||'')));
  const selected=bark.length?bark:meshes;
  if(!selected.length)return {ok:false,reason:'no geometry'};
  const bounds=()=>{
    let low=Infinity,left=Infinity,right=-Infinity,front=Infinity,back=-Infinity;
    for(const mesh of selected){
      mesh.computeWorldMatrix(true);
      const b=mesh.getBoundingInfo().boundingBox;
      low=Math.min(low,b.minimumWorld.y);
      left=Math.min(left,b.minimumWorld.x);right=Math.max(right,b.maximumWorld.x);
      front=Math.min(front,b.minimumWorld.z);back=Math.max(back,b.maximumWorld.z);
    }
    return {low,left,right,front,back};
  };
  for(let pass=0;pass<6;pass++){
    const b=bounds();
    root.position.x+=x-(b.left+b.right)/2;
    root.position.z+=z-(b.front+b.back)/2;
    const y=heightAt(x,z);
    if(!Number.isFinite(y))return {ok:false,reason:'terrain unavailable'};
    const delta=y-burial-bounds().low;
    root.position.y+=delta;
    if(Math.abs(delta)<0.015)break;
  }
  const terrain=heightAt(x,z);
  const error=bounds().low-terrain+burial;
  // Reject imported packs with a grounded trunk and additional floating trunks.
  const detached=[];
  if(Number.isFinite(terrain)&&bark.length){
    for(const mesh of bark){
      mesh.computeWorldMatrix(true);
      const base=mesh.getBoundingInfo().boundingBox.minimumWorld.y;
      if(!Number.isFinite(base)||base>terrain+0.35)detached.push(mesh.name);
    }
  }
  return {ok:Number.isFinite(error)&&Math.abs(error)<0.25&&detached.length===0,
    error,usedBark:bark.length>0,detached,
    reason:detached.length?'detached trunks in imported model':undefined};
}
