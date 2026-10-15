/**
 * ONE imported, licensed CC0 detailed-leaf oak in The Wild's village square.
 * Not a generated primitive tree or a billboard. Coordinates are in world metres.
 * Source: Innerscene's "Oak street tree, detailed leaves", oak-detailed.glb,
 * https://www.innerscene.com/tools/library/3d-parts/oak-street-tree-detailed-leaves-a273fef9
 * Installed in /world-creator/assets by the companion GitHub Actions workflow.
 */
export const VILLAGE_OAK=Object.freeze({
  x:109,z:72,heightMetres:17.2,collisionRadius:2.1,
  model:"./assets/village-oak-detailed.glb"
});

/** Loads exactly one local GLB, with an explicit failure state instead of
 * silently substituting a cheap-looking generated tree. */
export function installVillageOak(B,scene,{groundY}){
  const state={status:"loading",meshCount:0,source:VILLAGE_OAK.model,error:"",root:null};
  if(!B.SceneLoader?.ImportMeshAsync){
    state.status="error";
    state.error="Babylon GLB loader not available";
    return state;
  }
  B.SceneLoader.ImportMeshAsync("","./assets/","village-oak-detailed.glb",scene)
    .then(result=>{
      const root=new B.TransformNode("Village Square: imported CC0 HD oak",scene);
      root.rotation.y=0.38;
      // Preserve the imported glTF hierarchy/materials and count real geometry.
      for(const mesh of result.meshes){
        if(!mesh.parent)mesh.parent=root;
        mesh.isPickable=false;
        if(mesh.getTotalVertices?.()>0)state.meshCount++;
      }
      if(!state.meshCount)throw new Error("Tree GLB contains no drawable meshes");
      // Source GLBs use different native units and pivot locations. Measure
      // the actual vertices rather than imposing an arbitrary 2x scale.
      const bounds=()=>{
        let minX=Infinity,minY=Infinity,minZ=Infinity;
        let maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
        root.computeWorldMatrix(true);
        for(const mesh of result.meshes){
          if(!(mesh.getTotalVertices?.()>0))continue;
          mesh.computeWorldMatrix(true);
          const bb=mesh.getBoundingInfo().boundingBox;
          minX=Math.min(minX,bb.minimumWorld.x);
          minY=Math.min(minY,bb.minimumWorld.y);
          minZ=Math.min(minZ,bb.minimumWorld.z);
          maxX=Math.max(maxX,bb.maximumWorld.x);
          maxY=Math.max(maxY,bb.maximumWorld.y);
          maxZ=Math.max(maxZ,bb.maximumWorld.z);
        }
        return {minX,minY,minZ,maxX,maxY,maxZ};
      };
      const raw=bounds();
      const rawHeight=raw.maxY-raw.minY;
      if(!Number.isFinite(rawHeight)||rawHeight<.01)
        throw new Error("Imported oak has invalid model dimensions");
      const scale=VILLAGE_OAK.heightMetres/rawHeight;
      root.scaling.setAll(scale);
      // Center the real geometry over the intended plaza planting location
      // even if the downloaded file has a wildly offset source pivot.
      const box=bounds();
      root.position.set(
        VILLAGE_OAK.x-(box.minX+box.maxX)*.5,
        groundY-box.minY+.035,
        VILLAGE_OAK.z-(box.minZ+box.maxZ)*.5
      );
      root.computeWorldMatrix(true);
      state.sourceHeight=rawHeight;
      state.scale=scale;
      state.root=root;
      state.status="loaded";
      if(!state.meshCount)state.error="Tree file contained no drawable meshes";
    })
    .catch(err=>{
      state.status="error";
      state.error=String(err?.message||err);
      console.error("Village detailed CC0 oak GLB could not load:",err);
    });
  return state;
}
