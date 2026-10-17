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
      // Sample the terrain at the actual trunk footprint, not just the cell anchor.
      // A sloping terrain can be several metres different across a tree's canopy.
      const ground=terrainHeight(item.x,item.z);
      if(!Number.isFinite(ground))continue;
      let lowest=Infinity;
      item.root.computeWorldMatrix(true);
      for(const mesh of (item.trunkMeshes||item.meshes)){mesh.computeWorldMatrix(true);lowest=Math.min(lowest,mesh.getBoundingInfo().boundingBox.minimumWorld.y);}
      if(!Number.isFinite(lowest))continue;
      // Move the world anchor, not the imported child pivot. Repeat until
      // the visible geometry actually meets the terrain after nested transforms.
      let delta=ground-.18-lowest;
      if(Math.abs(delta)>.02){
        for(let pass=0;pass<3&&Math.abs(delta)>.02;pass++){
          item.root.position.y+=delta;
          item.root.computeWorldMatrix(true);
          let measured=Infinity;
          for(const mesh of (item.trunkMeshes||item.meshes)){
            mesh.computeWorldMatrix(true);
            measured=Math.min(measured,mesh.getBoundingInfo().boundingBox.minimumWorld.y);
          }
          delta=ground-.18-measured;
        }
        corrected++;
      }
    }
    this.lastRegroundCorrections=corrected;
    this.groundingErrors=this.placements.map(item=>{
      const surface=terrainHeight(item.x,item.z);
      let bottom=Infinity;
      for(const mesh of (item.trunkMeshes||item.meshes)){
        mesh.computeWorldMatrix(true);
        bottom=Math.min(bottom,mesh.getBoundingInfo().boundingBox.minimumWorld.y);
      }
      return {x:item.x,z:item.z,error:bottom-surface};
    }).filter(p=>Number.isFinite(p.error)&&Math.abs(p.error)>.5).slice(0,20);
    return corrected;
  },dispose(){
    if(this.groundObserver)scene.onBeforeRenderObservable.remove(this.groundObserver);
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
        // Each of the twelve original Acer models is treated as a master.
        // All clones use the same trunk-footprint normalization, independent
        // of the imported showroom layout and its arbitrary node pivots.
        const source=sourceRoots[Math.floor(hash(ix,iz,3)*sourceRoots.length)];
        const clone=source.clone("autumn-maple-"+ix+"-"+iz,null,false);
        if(!clone)continue;
        clone.parent=null;
        const anchor=new B.TransformNode("maple-ground-anchor-"+ix+"-"+iz,scene);
        clone.parent=anchor;
        clone.setEnabled(true);
        for(const child of clone.getChildMeshes(false))child.setEnabled(true);
        for(const mesh of clone.getChildMeshes(false).filter(m=>m.getTotalVertices?.()>0)){
          mesh.computeWorldMatrix(true);
          const bb=mesh.getBoundingInfo().boundingBox;
          const e=bb.maximumWorld.subtract(bb.minimumWorld);
          const name=(mesh.name+" "+(mesh.material?.name||"")).toLowerCase();
          if(/platform|pedestal|plinth|display.?base|ground.?plane|floor|stage|terrain|socle/.test(name)
             ||(e.y>0&&e.x>e.y*7&&e.z>e.y*7&&e.x>2&&e.z>2)){
            mesh.setEnabled(false);mesh.isVisible=false;
          }
        }
        const meshes=clone.getChildMeshes(false).filter(m=>m.getTotalVertices?.()>0&&m.isEnabled()&&m.isVisible);
        if(!meshes.length){anchor.dispose(false,true);continue;}
        const bark=meshes.filter(m=>/bark|trunk|stem|wood/i.test((m.name||"")+" "+(m.material?.name||"")));
        const trunkMeshes=bark.length?bark:meshes;
        // Debug actual rendered trunk bounds per instance; these are independent
        // of the imported collection's showroom pivot.
        const diagnostic={source:source.name,meshes:meshes.length,bark:bark.length};
        const bounds=arr=>{
          let lo=new B.Vector3(Infinity,Infinity,Infinity),hi=new B.Vector3(-Infinity,-Infinity,-Infinity);
          for(const m of arr){m.computeWorldMatrix(true);const bb=m.getBoundingInfo().boundingBox;
            lo=B.Vector3.Minimize(lo,bb.minimumWorld);hi=B.Vector3.Maximize(hi,bb.maximumWorld);}
          return {lo,hi};
        };
        const initial=bounds(meshes);
        const height=initial.hi.y-initial.lo.y;
        if(!Number.isFinite(height)||height<=0){anchor.dispose(false,true);continue;}
        clone.scaling.scaleInPlace((12+hash(ix,iz,4)*18)/height);
        clone.rotation.y=hash(ix,iz,5)*Math.PI*2;
        clone.position.set(0,0,0);
        // The original pack has twelve separate showroom positions.
        // Translate each clone so its TRUNK, not its foliage or parent
        // pivot, sits at the selected scatter coordinate.
        const tb=bounds(trunkMeshes);
        // World bounds already include the anchor transform. Normalize the imported
        // showroom offset in anchor-local coordinates, not world coordinates.
        clone.position.x-=(tb.lo.x+tb.hi.x)/2;
        clone.position.z-=(tb.lo.z+tb.hi.z)/2;
        anchor.position.set(x,0,z);
        // Recenter again after parenting and placement, since world bounds
        // must be evaluated at the final anchor location.
        const centered=bounds(trunkMeshes);
        clone.position.x+=x-(centered.lo.x+centered.hi.x)/2;
        clone.position.z+=z-(centered.lo.z+centered.hi.z)/2;
        // Move the trunk's actual world-space bottom to the visible ground.
        // Recompute after every transform; never reuse a pre-anchor Y value.
        const groundAtTrunk=()=>terrainHeight(x,z);
        for(let pass=0;pass<5;pass++){
          const low=bounds(trunkMeshes).lo.y;
          const surface=groundAtTrunk();
          if(!Number.isFinite(low)||!Number.isFinite(surface))break;
          const delta=surface-.12-low;
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
        state.roots.push(anchor);state.placements.push({root:anchor,meshes,trunkMeshes,x,z,diagnostic});planted++;
      }
    }
    // Record a real, post-transform sample for remote phone diagnostics.
    state.samples=state.roots.slice(0,6).map(root=>{
      const visible=root.getChildMeshes(false).filter(m=>m.isEnabled()&&m.isVisible&&m.getTotalVertices?.()>0);
      let low=Infinity;
      for(const mesh of visible){mesh.computeWorldMatrix(true);low=Math.min(low,mesh.getBoundingInfo().boundingBox.minimumWorld.y);}
      return {x:Math.round(root.position.x),z:Math.round(root.position.z),bottom:Math.round(low*10)/10,ground:Math.round(terrainHeight(root.position.x,root.position.z)*10)/10};
    });
    // Terrain may load or change after the trees. Recheck actual world-space mesh
    // bounds as terrain becomes available, without shifting correctly grounded trees.
    // Correct immediately and on every early frame while photographic terrain
    // finishes loading; later checks remain inexpensive and periodic.
    let frames=0;
    state.groundObserver=scene.onBeforeRenderObservable.add(()=>{
      if(++frames<=120 || frames%120===0)state.reground();
    });
    state.reground();
    state.diagnostics=state.placements.slice(0,12).map(p=>({
      source:p.diagnostic.source,meshCount:p.diagnostic.meshes,
      barkCount:p.diagnostic.bark,x:p.x,z:p.z,
      anchorY:p.root.position.y,
      ground:terrainHeight(p.x,p.z),
      lowestTrunk:Math.min(...p.trunkMeshes.map(m=>{m.computeWorldMatrix(true);return m.getBoundingInfo().boundingBox.minimumWorld.y; }))
    }));
    console.info("MAPLE_GROUND_DIAGNOSTICS",JSON.stringify(state.diagnostics));
    state.planted=planted;state.status="ready";console.info("CLEAN_MAPLE_GROUND_TEST",JSON.stringify({planted,samples:state.samples}));return state;
  })().catch(err=>{state.status="error";state.error=String(err.message||err);return state;});
  return state;
}
