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
      root.position.set(VILLAGE_OAK.x,groundY,VILLAGE_OAK.z);
      root.scaling.setAll(2);
      root.rotation.y=0.38;
      // Keep the glTF's own coordinate conversion / material hierarchy.
      for(const mesh of result.meshes){
        if(!mesh.parent)mesh.parent=root;
        mesh.isPickable=false;
        if(mesh.getTotalVertices?.()>0)state.meshCount++;
      }
      // The imported model may not have its origin at the root flare.
      root.computeWorldMatrix(true);
      let lowest=Infinity;
      for(const mesh of result.meshes){
        if(mesh.getTotalVertices?.()>0){
          mesh.computeWorldMatrix(true);
          lowest=Math.min(lowest,mesh.getBoundingInfo().boundingBox.minimumWorld.y);
        }
      }
      if(Number.isFinite(lowest))root.position.y+=groundY-lowest+0.035;
      root.computeWorldMatrix(true);
      state.root=root;
      state.status=state.meshCount?"loaded":"error";
      if(!state.meshCount)state.error="Tree file contained no drawable meshes";
    })
    .catch(err=>{
      state.status="error";
      state.error=String(err?.message||err);
      console.error("Village detailed CC0 oak GLB could not load:",err);
    });
  return state;
}
