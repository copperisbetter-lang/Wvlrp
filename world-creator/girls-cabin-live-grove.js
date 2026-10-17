/** Living PBR grove around Hearthside girls' cabin. 500 m² circle; no deadwood. */
// Prefer upright evergreen PBR assets; retire all island trees with sprawling roots.
const ASSETS=["fir_sapling_medium","pine_sapling_small","fir_sapling","fir_tree_01","tree_small_02"];
const AREA=500, R=Math.sqrt(AREA/Math.PI);
export function installGirlsCabinLiveGrove(B,scene,{seed,cabinGrade}){
 const state={status:"loading",planted:0,failed:0,areaSquareMetres:AREA,roots:[]};
 state.ready=(async()=>{
  const manifests=await fetch("./assets/village-grove-sources.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Tree manifest unavailable");return r.json()});
  const candidates=ASSETS.map(id=>manifests.find(m=>m.id===id&&m.license==="CC0")).filter(Boolean);
  if(candidates.length<2)throw Error("Need at least two upright living PBR tree sources");
  const loaded=[];
  for(const asset of candidates){try{
   const container=await B.SceneLoader.LoadAssetContainerAsync("",asset.url,scene);
   if(!container.meshes.some(m=>m.getTotalVertices?.()>0))throw Error("Empty mesh");
   loaded.push({asset,container});
  }catch(e){console.warn("Girls cabin living tree asset",asset.id,e)}}
  if(loaded.length<2)throw Error("Fewer than two upright living tree meshes loaded");
  // Six well-spaced mature trees around the OUTER perimeter of the 500 m²
  // circle. The earlier 22 trees crowded the porch and overlapped canopies.
  // Keep the central cabin/porch completely open for visibility and walking.
  const positions=[];
  for(let i=0;i<6;i++){
    const theta=(i+.5)*Math.PI/3;
    // Keep trunks outside the 18 x 14 m cabin, porch, and a generous walking buffer.
    const radial=Math.max(R-0.35,25);
    const x=Math.cos(theta)*radial,z=Math.sin(theta)*radial;
    // Cabin footprint x ±9, z ±7; include 8 m access/branch buffer.
    if(Math.abs(x)<17 && Math.abs(z)<15)continue;
    positions.push({x,z,i});
  }
  const autumn=new Date().getMonth()===9; // October in the real calendar
  for(const {x,z,i} of positions){
   // Use upright conifers plus two broadleaf trees; never recolor evergreen needles.
   const broadleaf=autumn&&(i===1||i===4);
   const chosen=broadleaf?loaded.find(v=>v.asset.id==="tree_small_02"):null;
   const evergreens=loaded.filter(v=>v.asset.id!=="tree_small_02");
   const {asset,container}=chosen||evergreens[i%evergreens.length];let instance;
   try{
    instance=container.instantiateModelsToScene(n=>"girls-live-"+i+"-"+n,false,{doNotInstantiate:false});
    const root=new B.TransformNode("girls-cabin-fixed-world-tree-"+i,scene);
    instance.rootNodes.forEach(n=>n.parent=root);
    const meshes=root.getChildMeshes(false).filter(m=>m.getTotalVertices?.()>0);
    if(!meshes.length)throw Error("No tree mesh");
    root.computeWorldMatrix(true);
    let lo=Infinity,hi=-Infinity;
    for(const m of meshes){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;lo=Math.min(lo,b.minimumWorld.y);hi=Math.max(hi,b.maximumWorld.y)}
    if(!Number.isFinite(hi-lo)||hi-lo<.01)throw Error("Invalid bounds");
    // Size all standing trees as mature specimens. If a future manifest entry
    // is labeled sapling, it must not render at its tiny source-file scale.
    const isSapling=/sapling|young|small/i.test(asset.id);
    const desired=isSapling?17+(i%3)*1.5:19+(i%3)*1.5;
    root.scaling.setAll(desired/(hi-lo));
    // Expand existing foliage meshes only; do not duplicate heavy geometry.
    for(const m of meshes){
      const label=(m.name+" "+(m.material?.name||"")).toLowerCase();
      if(/leaf|leaves|foliage|needle|canopy|branchlet/.test(label)&&!/trunk|bark|stem/.test(label)){
        m.scaling.x*=1.28;
        m.scaling.z*=1.28;
      }
    }
    if(autumn&&asset.id==="tree_small_02"){
      // Source mesh names are often generic. Inspect material AND texture names,
      // and avoid recoloring woody trunks or bark.
      const colors=[new B.Color3(.94,.52,.17),new B.Color3(.80,.31,.12)];
      const tint=colors[i===1?0:1];
      let tinted=0;
      for(const m of meshes){
        const mat=m.material;
        if(!mat)continue;
        const label=[m.name,mat.name,mat.albedoTexture?.name,mat.diffuseTexture?.name]
          .filter(Boolean).join(" ").toLowerCase();
        const woody=/trunk|bark|wood|stem|branch/.test(label);
        const leafy=/leaf|leaves|foliage|canopy|crown|twig|plant/.test(label);
        if(woody||!leafy)continue;
        const copy=mat.clone("october-leaves-"+i+"-"+tinted++);
        if(copy.albedoColor)copy.albedoColor=tint.clone();
        if(copy.diffuseColor)copy.diffuseColor=tint.clone();
        // A small warm emissive lift stops green base textures from completely
        // swallowing the autumn tint while retaining photographic leaf detail.
        if(copy.emissiveColor)copy.emissiveColor=tint.scale(.20);
        m.material=copy;
      }
      root.metadata={octoberLeafMeshes:tinted};
      console.info("OCTOBER_TREE_FOLIAGE",asset.id,i,"leafMeshes",tinted);
    }
    root.rotation.y=i*2.399963229728653;
    root.computeWorldMatrix(true);
    lo=Infinity;
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(const m of meshes){
      m.computeWorldMatrix(true);
      const box=m.getBoundingInfo().boundingBox;
      lo=Math.min(lo,box.minimumWorld.y);
      minX=Math.min(minX,box.minimumWorld.x);maxX=Math.max(maxX,box.maximumWorld.x);
      minZ=Math.min(minZ,box.minimumWorld.z);maxZ=Math.max(maxZ,box.maximumWorld.z);
      m.isPickable=false;m.checkCollisions=false;
    }
    // Source GLBs often contain a displaced origin. Center actual world-space
    // geometry over the planned tree coordinate, not the source-file pivot.
    root.position.set(x-(minX+maxX)/2,cabinGrade(x,z,seed)-lo+.02,z-(minZ+maxZ)/2);
    // Imported hierarchies may retain nontrivial parent transforms. Correct
    // against the actual world-space bottom AFTER translating the root.
    for(let pass=0;pass<5;pass++){
      root.computeWorldMatrix(true);
      let actualBottom=Infinity;
      for(const m of meshes){
        m.computeWorldMatrix(true);
        actualBottom=Math.min(actualBottom,m.getBoundingInfo().boundingBox.minimumWorld.y);
      }
      const ground=cabinGrade(x,z,seed);
      if(!Number.isFinite(actualBottom)||!Number.isFinite(ground))throw Error("Invalid final tree grounding");
      const correction=ground+.02-actualBottom;
      if(Math.abs(correction)<.015)break;
      root.position.y+=correction;
    }
    root.computeWorldMatrix(true);
    // Anchor using the actual trunk bottom, not stray leaf/scene geometry.\n    const trunkMeshes=meshes.filter(m=>/trunk|bark|stem|wood/i.test((m.name||"")+" "+(m.material?.name||"")));\n    if(!trunkMeshes.length)throw Error("No trunk geometry: skip floating conifer");\n    for(let pass=0;pass<5;pass++){\n      root.computeWorldMatrix(true);\n      let bottom=Infinity;\n      for(const m of trunkMeshes){m.computeWorldMatrix(true);bottom=Math.min(bottom,m.getBoundingInfo().boundingBox.minimumWorld.y)}\n      const delta=cabinGrade(x,z,seed)-.10-bottom;\n      if(!Number.isFinite(delta))throw Error("Invalid trunk ground height");\n      if(Math.abs(delta)<.015)break;\n      root.position.y+=delta;\n    }\n    root.computeWorldMatrix(true);\n    root.metadata={kind:"living-pbr-tree",source:asset.id,worldAnchored:true,matureHeightMetres:desired,sourceLabeledSapling:isSapling};
    state.roots.push(root);state.planted++;
   }catch(e){state.failed++;instance?.rootNodes?.forEach(n=>n.dispose(false,true));console.warn("Tree placement failed",i,e)}
  }
  state.status=state.planted?"ready":"empty";
  console.info("GIRLS_CABIN_LIVING_GROVE",JSON.stringify({status:state.status,planted:state.planted,failed:state.failed,areaSquareMetres:AREA}));
 })().catch(e=>{state.status="error";state.error=String(e);console.error("Girls cabin grove",e)});
 return state;
}
