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
    // Select separate tree/LOD0 nodes, rather than cloning the whole packed scene.
    const nodes=container.transformNodes.filter(n=>n.getChildMeshes?.(false).some(m=>m.getTotalVertices?.()>0));
    const treeNodes=nodes.filter(n=>/tree|maple|lod.?0/i.test(n.name||"")&&!/lod.?[1-9]|proxy|billboard|collision/i.test(n.name||""));
    const sourceRoots=treeNodes.length?treeNodes:nodes.filter(n=>!/lod.?[1-9]|proxy|billboard|collision/i.test(n.name||""));

    if(!sourceRoots.length)throw Error("Maple GLB has no instantiable tree roots; split collection into individual tree GLBs first.");
    state.sourceRoots=sourceRoots.length;
    // Imported GLB nodes remain disabled until explicitly enabled on each clone.
    // Place a deterministic near-cabin test tree outside the protected cabin clearing.
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
        clone.setEnabled(true);
        for(const child of clone.getChildMeshes(false))child.setEnabled(true);
        // Remove imported display platforms, including unnamed flat bases.
        for(const mesh of clone.getChildMeshes(false).filter(m=>m.getTotalVertices?.()>0)){
          mesh.computeWorldMatrix(true);
          const bb=mesh.getBoundingInfo().boundingBox;
          const e=bb.maximumWorld.subtract(bb.minimumWorld);
          const name=(mesh.name+" "+(mesh.material?.name||"")).toLowerCase();
          const platform=/platform|pedestal|plinth|display.?base|ground.?plane|floor|stage|terrain|socle/.test(name);
          const flat=e.y>0&&e.x>e.y*7&&e.z>e.y*7&&e.x>2&&e.z>2;
          if(platform||flat){mesh.setEnabled(false);mesh.isVisible=false;}
        }
        // Normalize only remaining tree geometry, not the removed platforms.
        const meshes=clone.getChildMeshes(false).filter(m=>m.getTotalVertices?.()>0&&m.isEnabled()&&m.isVisible);
        if(!meshes.length){clone.dispose(false,true);continue;}
        for(const m of meshes) m.computeWorldMatrix(true);
        let min=new B.Vector3(Infinity,Infinity,Infinity),max=new B.Vector3(-Infinity,-Infinity,-Infinity);
        for(const m of meshes){const bb=m.getBoundingInfo().boundingBox;min=B.Vector3.Minimize(min,bb.minimumWorld);max=B.Vector3.Maximize(max,bb.maximumWorld);}
        const height=max.y-min.y;
        if(!Number.isFinite(height)||height<=0){clone.dispose(false,true);continue;}
        const targetHeight=12+hash(ix,iz,4)*18;
        // Apply rotation and scale first, then measure the transformed visible trunk.
        clone.scaling.scaleInPlace(targetHeight/height);
        clone.rotation.y=hash(ix,iz,5)*Math.PI*2;
        clone.position.set(0,0,0);
        clone.computeWorldMatrix(true);
        for(const m of meshes)m.computeWorldMatrix(true);
        let bottom=Infinity,lowX=0,lowZ=0;
        // World bounds after scaling/rotation are essential: the GLB may have
        // parent transforms and offsets unrelated to the removed display platform.
        for(const m of meshes){
          const bb=m.getBoundingInfo().boundingBox;
          if(bb.minimumWorld.y<bottom){
            bottom=bb.minimumWorld.y;
            lowX=(bb.minimumWorld.x+bb.maximumWorld.x)*.5;
            lowZ=(bb.minimumWorld.z+bb.maximumWorld.z)*.5;
          }
        }
        if(!Number.isFinite(bottom)){clone.dispose(false,true);continue;}
        clone.position.set(x-lowX,y-bottom-.12,z-lowZ);
        clone.computeWorldMatrix(true);
        const tint=B.Color3.FromHexString(palettes[Math.floor(hash(ix,iz,6)*palettes.length)]);
        for(const mesh of clone.getChildMeshes(false)){
          if(!mesh.isEnabled()||!mesh.isVisible)continue;
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
