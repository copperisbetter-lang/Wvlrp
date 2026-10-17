/** Autumn maple scatter for The Wild. Call installAutumnMaples after terrain setup.
 * Requires a hosted, licensed GLB URL; does not alter public access controls.
 * Deterministic cell placement keeps multiplayer clients in agreement.
 */
export function installAutumnMaples(B,scene,{
  assetUrl="./assets/maple_trees_planting_clean.glb",
  terrainHeight=()=>0, excluded=()=>false, seed=20261016,
  cellSize=90, radius=900, density=0.18, maxVisible=180
}={}){
  const state={status:"loading",planted:0,error:"",roots:[],placements:[],reground(){
    let corrected=0;
    for(const item of this.placements){
      const ground=terrainHeight(item.x,item.z);
      if(!Number.isFinite(ground))continue;
      let lowest=Infinity;
      item.root.computeWorldMatrix(true);
      for(const mesh of item.meshes){mesh.computeWorldMatrix(true);lowest=Math.min(lowest,mesh.getBoundingInfo().boundingBox.minimumWorld.y);}
      if(!Number.isFinite(lowest))continue;
      const delta=ground-.12-lowest;
      if(Math.abs(delta)>.02){item.root.position.y+=delta;item.root.computeWorldMatrix(true);corrected++;}
    }
    this.lastRegroundCorrections=corrected;
    return corrected;
  },dispose(){
    for(const root of this.roots)root.dispose(false,true);
    this.roots.length=0;
  }};
  const hash=(x,z,k=0)=>{let n=Math.imul(x^seed,374761393)^Math.imul(z,668265263)^Math.imul(k,2246822519);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
  state.ready=(async()=>{
    const container=await B.SceneLoader.LoadAssetContainerAsync("",assetUrl,scene);
    // The extracted planting GLB contains twelve Acer roots, each with only
    // LOD0 bark and foliage. The original checker platform is not included.
    const sourceRoots=container.transformNodes.filter(n=>
      /^Acer_(Sapling|large|medium|small)_[123]$/.test(n.name||""));
    if(sourceRoots.length!==12)throw Error("Expected twelve clean Acer roots; found "+sourceRoots.length);
    if(!sourceRoots.length)throw Error("Maple GLB has no instantiable tree roots; split collection into individual tree GLBs first.");
    state.sourceRoots=sourceRoots.length;
    // Imported GLB nodes remain disabled until explicitly enabled on each clone.
    // Scatter deterministically across terrain cells, respecting campsite and trail exclusions.
    const palettes=["#b71e1c","#db481c","#ec7922","#a94620","#7e4829","#e69b34"];
    const count=Math.min(maxVisible,Math.ceil((2*radius/cellSize)**2*density));
    let planted=0;
    const cells=Math.ceil(radius/cellSize);
    for(let ix=-cells;ix<=cells&&planted<count;ix++){
      for(let iz=-cells;iz<=cells&&planted<count;iz++){
        if(hash(ix,iz,0)>=density)continue;
        // Seeded placement stays identical across multiplayer clients.
        const x=(ix+(hash(ix,iz,1)-.5)*.72)*cellSize;
        const z=(iz+(hash(ix,iz,2)-.5)*.72)*cellSize;
        if(Math.hypot(x,z)>radius||excluded(x,z,16))continue;
        const y=terrainHeight(x,z);
        if(!Number.isFinite(y))continue;
        const source=sourceRoots[Math.floor(hash(ix,iz,3)*sourceRoots.length)];
        const clone=source.clone("autumn-maple-"+ix+"-"+iz,null,false);
        if(!clone)continue;
        // A dedicated world-space anchor prevents imported GLB parent transforms
        // from turning local Y corrections into floating world-space trees.
        clone.parent=null;
        const anchor=new B.TransformNode("maple-ground-anchor-"+ix+"-"+iz,scene);
        clone.parent=anchor;
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
        clone.position.set(-lowX,-bottom,-lowZ);
        anchor.position.set(x,y-.12,z);
        // Re-measure after translation: GLB hierarchy transforms can invalidate
        // the first estimate, particularly when nodes carry imported offsets.
        // Iteratively correct the *actual* rendered world-space bottom.
        for(let pass=0;pass<3;pass++){
          clone.computeWorldMatrix(true);
          let actualBottom=Infinity;
          for(const m of meshes){
            m.computeWorldMatrix(true);
            actualBottom=Math.min(actualBottom,m.getBoundingInfo().boundingBox.minimumWorld.y);
          }
          if(!Number.isFinite(actualBottom))break;
          const error=(y-.12)-actualBottom;
          if(Math.abs(error)<.02)break;
          anchor.position.y+=error;
        }
        clone.computeWorldMatrix(true);
        // Final grounding uses the same terrain-height provider as the walker.
        // The provider can be updated when streamed terrain becomes available.
        for(let pass=0;pass<3;pass++){
          clone.computeWorldMatrix(true);
          let lowest=Infinity;
          for(const mesh of meshes){
            mesh.computeWorldMatrix(true);
            lowest=Math.min(lowest,mesh.getBoundingInfo().boundingBox.minimumWorld.y);
          }
          const surface=terrainHeight(x,z);
          if(!Number.isFinite(lowest)||!Number.isFinite(surface))break;
          const delta=surface-.12-lowest;
          if(Math.abs(delta)<.01)break;
          anchor.position.y+=delta;
        }
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
        state.roots.push(anchor);state.placements.push({root:anchor,meshes,x,z});planted++;
      }
    }
    // Record a real, post-transform sample for remote phone diagnostics.
    state.samples=state.roots.slice(0,6).map(root=>{
      const visible=root.getChildMeshes(false).filter(m=>m.isEnabled()&&m.isVisible&&m.getTotalVertices?.()>0);
      let low=Infinity;
      for(const mesh of visible){mesh.computeWorldMatrix(true);low=Math.min(low,mesh.getBoundingInfo().boundingBox.minimumWorld.y);}
      return {x:Math.round(root.position.x),z:Math.round(root.position.z),bottom:Math.round(low*10)/10,ground:Math.round(terrainHeight(root.position.x,root.position.z)*10)/10};
    });
    state.planted=planted;state.status="ready";console.info("CLEAN_MAPLE_GROUND_TEST",JSON.stringify({planted,samples:state.samples}));return state;
  })().catch(err=>{state.status="error";state.error=String(err.message||err);return state;});
  return state;
}
