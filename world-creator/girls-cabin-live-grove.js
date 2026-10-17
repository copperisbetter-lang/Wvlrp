/** Living PBR grove around Hearthside girls' cabin. 500 m² circle; no deadwood. */
const ASSETS=["island_tree_01","island_tree_02","island_tree_03","tree_small_02"];
const AREA=500, R=Math.sqrt(AREA/Math.PI);
export function installGirlsCabinLiveGrove(B,scene,{seed,cabinGrade}){
 const state={status:"loading",planted:0,failed:0,areaSquareMetres:AREA,roots:[]};
 state.ready=(async()=>{
  const manifests=await fetch("./assets/village-grove-sources.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Tree manifest unavailable");return r.json()});
  const candidates=ASSETS.map(id=>manifests.find(m=>m.id===id&&m.license==="CC0")).filter(Boolean);
  if(candidates.length<3)throw Error("Need at least three living PBR tree sources");
  const loaded=[];
  for(const asset of candidates){try{
   const container=await B.SceneLoader.LoadAssetContainerAsync("",asset.url,scene);
   if(!container.meshes.some(m=>m.getTotalVertices?.()>0))throw Error("Empty mesh");
   loaded.push({asset,container});
  }catch(e){console.warn("Girls cabin living tree asset",asset.id,e)}}
  if(loaded.length<3)throw Error("Fewer than three living tree meshes loaded");
  // Deterministic positions for multiplayer. Ring avoids cabin footprint and porch.
  const positions=[];
  for(let i=0;i<22;i++){
   const theta=i*2.399963229728653;
   const radial=8.6+(i%5)*.92;
   const x=Math.cos(theta)*radial,z=Math.sin(theta)*radial;
   if(Math.abs(x)<4.5&&z<0)continue; // porch / entrance approach
   if(Math.abs(x)<5&&Math.abs(z)<6)continue; // cabin footprint
   positions.push({x,z,i});
  }
  for(const {x,z,i} of positions){
   const {asset,container}=loaded[i%loaded.length];let instance;
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
    const desired=7+(i%5)*1.4;
    root.scaling.setAll(desired/(hi-lo));
    root.rotation.y=i*2.399963229728653;
    root.computeWorldMatrix(true);
    lo=Infinity;
    for(const m of meshes){m.computeWorldMatrix(true);lo=Math.min(lo,m.getBoundingInfo().boundingBox.minimumWorld.y);m.isPickable=false;m.checkCollisions=false}
    root.position.set(x,cabinGrade(x,z,seed)-lo+.02,z);
    root.metadata={kind:"living-pbr-tree",source:asset.id,worldAnchored:true};
    state.roots.push(root);state.planted++;
   }catch(e){state.failed++;instance?.rootNodes?.forEach(n=>n.dispose(false,true));console.warn("Tree placement failed",i,e)}
  }
  state.status=state.planted?"ready":"empty";
 })().catch(e=>{state.status="error";state.error=String(e);console.error("Girls cabin grove",e)});
 return state;
}
