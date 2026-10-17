/** Autumn maple scatter for The Wild. Call installAutumnMaples after terrain setup.
 * Requires a hosted, licensed GLB URL; does not alter public access controls.
 * Deterministic cell placement keeps multiplayer clients in agreement.
 */
export function installAutumnMaples(B,scene,{
  assetUrl="./assets/maple_trees_optimized_single_upload.glb",
  terrainHeight=()=>0, excluded=()=>false, seed=20261016,
  cellSize=90, radius=900, density=0.20, maxVisible=180
}={}){
  const state={status:"loading",planted:0,error:"",roots:[],dispose(){
    for(const root of this.roots)root.dispose(false,true);
    this.roots.length=0;
  }};
  const hash=(x,z,k=0)=>{let n=Math.imul(x^seed,374761393)^Math.imul(z,668265263)^Math.imul(k,2246822519);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
  state.ready=(async()=>{
    const container=await B.SceneLoader.LoadAssetContainerAsync("",assetUrl,scene);
    const sourceRoots=container.rootNodes.filter(n=>n.getChildMeshes?.(false).some(m=>m.getTotalVertices?.()>0));
    if(!sourceRoots.length)throw Error("Maple GLB has no instantiable tree roots; split collection into individual tree GLBs first.");
    state.sourceRoots=sourceRoots.length;
    const palettes=["#b71e1c","#db481c","#ec7922","#a94620","#7e4829","#e69b34"];
    const count=Math.min(maxVisible,Math.ceil((2*radius/cellSize)**2*density));
    let planted=0;
    for(let ix=-Math.ceil(radius/cellSize);ix<=Math.ceil(radius/cellSize)&&planted<count;ix++){
      for(let iz=-Math.ceil(radius/cellSize);iz<=Math.ceil(radius/cellSize)&&planted<count;iz++){
        if(hash(ix,iz)>density)continue;
        const x=ix*cellSize+(hash(ix,iz,1)-.5)*cellSize;
        const z=iz*cellSize+(hash(ix,iz,2)-.5)*cellSize;
        if(Math.hypot(x,z)>radius||excluded(x,z,12))continue;
        const y=terrainHeight(x,z);
        if(!Number.isFinite(y))continue;
        const source=sourceRoots[Math.floor(hash(ix,iz,3)*sourceRoots.length)];
        const clone=source.clone("autumn-maple-"+ix+"-"+iz,null,false);
        if(!clone)continue;
        clone.position.set(x,y,z);
        const size=.65+hash(ix,iz,4)*1.35;
        clone.scaling.scaleInPlace(size);
        clone.rotation.y=hash(ix,iz,5)*Math.PI*2;
        const tint=B.Color3.FromHexString(palettes[Math.floor(hash(ix,iz,6)*palettes.length)]);
        for(const mesh of clone.getChildMeshes(false)){
          mesh.isPickable=false;mesh.checkCollisions=false;
          if(!mesh.material)continue;
          const name=(mesh.material.name+" "+mesh.name).toLowerCase();
          if(!/leaf|foliage|crown|canopy/.test(name))continue;
          const mat=mesh.material.clone(mesh.material.name+"-autumn-"+ix+"-"+iz);
          if(mat.albedoColor)mat.albedoColor=tint;
          else if(mat.diffuseColor)mat.diffuseColor=tint;
          mesh.material=mat;
        }
        state.roots.push(clone);planted++;
      }
    }
    state.planted=planted;state.status="ready";return state;
  })().catch(err=>{state.status="error";state.error=String(err.message||err);return state;});
  return state;
}
