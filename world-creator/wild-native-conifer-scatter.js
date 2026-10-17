/** Seeded 10% conifer placement pass using verified upright CC0 PBR assets.
 * Other native hardwood species remain pending genuine verified models.
 * Cell occupancy is 10%; not a claim that 10% of physical acreage is covered.
 */
export function installNativeConiferScatter(B,scene,{seed=20261016,terrainHeight,excluded=()=>false,radius=900,cellSize=75,maxVisible=90}={}){
 const state={status:"loading",planted:0,roots:[],placements:[],skipped:0,reground(){let fixed=0;for(const p of this.placements){const g=terrainHeight(p.x,p.z);if(!Number.isFinite(g))continue;for(let pass=0;pass<3;pass++){let low=Infinity;for(const m of p.trunks){m.computeWorldMatrix(true);low=Math.min(low,m.getBoundingInfo().boundingBox.minimumWorld.y);}const d=g-.15-low;if(!Number.isFinite(d)||Math.abs(d)<.025)break;p.root.position.y+=d;fixed++;}}this.lastCorrections=fixed;return fixed;},dispose(){if(this.observer)scene.onBeforeRenderObservable.remove(this.observer);for(const r of this.roots)r.dispose(false,true);this.roots.length=0;}};
 const hash=(x,z,k=0)=>{let n=Math.imul(x^seed,374761393)^Math.imul(z,668265263)^Math.imul(k,2246822519);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296};
 state.ready=(async()=>{
  const manifest=await fetch("./assets/village-grove-sources.json").then(r=>r.json());
  const ids=["fir_tree_01","fir_sapling_medium","pine_sapling_medium","pine_sapling_small","fir_sapling"];
  const sources=[];
  for(const id of ids){const a=manifest.find(v=>v.id===id&&v.license==="CC0");if(!a)continue;
   try{const c=await B.SceneLoader.LoadAssetContainerAsync("",a.url,scene);if(c.meshes.some(m=>m.getTotalVertices?.()>0))sources.push({id,container:c});}
   catch(e){console.warn("Native conifer source unavailable",id,e);}
  }
  if(!sources.length)throw Error("No verified conifer meshes loaded");
  const half=Math.ceil(radius/cellSize);
  for(let ix=-half;ix<=half&&state.planted<maxVisible;ix++)for(let iz=-half;iz<=half&&state.planted<maxVisible;iz++){
   if(hash(ix,iz) >= .10)continue;
   const x=(ix+(hash(ix,iz,1)-.5)*.65)*cellSize,z=(iz+(hash(ix,iz,2)-.5)*.65)*cellSize;
   if(Math.hypot(x,z)>radius||excluded(x,z,25)||Math.abs(x)<35&&Math.abs(z)<32){state.skipped++;continue;}
   const src=sources[Math.floor(hash(ix,iz,3)*sources.length)];let instance,root;
   try{
    instance=src.container.instantiateModelsToScene(n=>"native10-"+ix+"-"+iz+"-"+n,false,{doNotInstantiate:false});
    root=new B.TransformNode("native10-anchor-"+ix+"-"+iz,scene);
    instance.rootNodes.forEach(n=>n.parent=root);
    const meshes=root.getChildMeshes(false).filter(m=>m.getTotalVertices?.()>0);
    if(!meshes.length)throw Error("No geometry");
    const bark=meshes.filter(m=>/trunk|bark|stem|wood/i.test((m.name||"")+" "+(m.material?.name||"")));const trunks=bark.length?bark:meshes;
    const bounds=(selected=meshes)=>{let lo=new B.Vector3(Infinity,Infinity,Infinity),hi=new B.Vector3(-Infinity,-Infinity,-Infinity);
     for(const m of selected){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;lo=B.Vector3.Minimize(lo,b.minimumWorld);hi=B.Vector3.Maximize(hi,b.maximumWorld);}return {lo,hi};};
    let b=bounds(),h=b.hi.y-b.lo.y;if(!Number.isFinite(h)||h<.01)throw Error("Invalid tree bounds");
    root.scaling.setAll((17+hash(ix,iz,4)*8)/h);root.rotation.y=hash(ix,iz,5)*Math.PI*2;
    b=bounds(trunks);root.position.x=x-(b.lo.x+b.hi.x)/2;root.position.z=z-(b.lo.z+b.hi.z)/2;
    for(let pass=0;pass<5;pass++){b=bounds(trunks);const g=terrainHeight(x,z);if(!Number.isFinite(g))throw Error("Invalid ground");const d=g-.12-b.lo.y;if(Math.abs(d)<.02)break;root.position.y+=d;}
    for(const m of meshes){m.isPickable=false;m.checkCollisions=false;}
    root.metadata={kind:"native-conifer",source:src.id};state.roots.push(root);state.placements.push({root,trunks,x,z});state.planted++;
   }catch(e){root?.dispose(false,true);instance?.rootNodes?.forEach(n=>n.dispose(false,true));console.warn("Native conifer planting skipped",e);}
  }
  state.reground();let frames=0;state.observer=scene.onBeforeRenderObservable.add(()=>{if(++frames<=120||frames%120===0)state.reground();});state.status="ready";return state;
 })().catch(e=>{state.status="error";state.error=String(e);});
 return state;
}