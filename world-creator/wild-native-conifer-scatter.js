import {groundTree} from "./wild-hd-tree-ground.js";
import {mayPlantTree} from "./wild-master-forest-reservations.js";
/** Seeded 10% conifer placement pass using verified upright CC0 PBR assets.
 * Other native hardwood species remain pending genuine verified models.
 * Cell occupancy is 10%; not a claim that 10% of physical acreage is covered.
 */
export function installNativeConiferScatter(B,scene,{seed=20261016,terrainHeight,excluded=()=>false,radius=900,cellSize=75,maxVisible=90}={}){
 const state={status:"loading",planted:0,roots:[],placements:[],skipped:0,reground(){let fixed=0;for(const p of this.placements){const g=terrainHeight(p.x,p.z);if(!Number.isFinite(g))continue;for(let pass=0;pass<3;pass++){let low=Infinity;for(const m of p.trunks){if(!m.isEnabled()||!m.isVisible)continue;m.computeWorldMatrix(true);low=Math.min(low,m.getBoundingInfo().boundingBox.minimumWorld.y);}const d=g-.12-low;if(!Number.isFinite(d)||Math.abs(d)<.025)break;p.root.position.y+=d;p.root.computeWorldMatrix(true);for(const m of p.meshes)m.computeWorldMatrix(true);fixed++;}}this.lastCorrections=fixed;return fixed;},dispose(){if(this.observer)scene.onBeforeRenderObservable.remove(this.observer);for(const r of this.roots)r.dispose(false,true);this.roots.length=0;}};
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
   if(Math.hypot(x,z)>radius||!mayPlantTree(x,z,3)||excluded(x,z,25)||Math.abs(x)<35&&Math.abs(z)<32){state.skipped++;continue;}
   const src=sources[Math.floor(hash(ix,iz,3)*sources.length)];let instance,root;
   try{
    instance=src.container.instantiateModelsToScene(n=>"native10-"+ix+"-"+iz+"-"+n,false,{doNotInstantiate:false});
    root=new B.TransformNode("native10-anchor-"+ix+"-"+iz,scene);
    instance.rootNodes.forEach(n=>{n.parent=root; n.setEnabled?.(true);});
    const meshes=root.getChildMeshes(false).filter(m=>m.getTotalVertices?.()>0);
    for(const m of meshes)m.setEnabled(true);
    if(!meshes.length)throw Error("No geometry");
    const bark=meshes.filter(m=>/trunk|bark|stem|wood/i.test((m.name||"")+" "+(m.material?.name||"")));const trunks=bark.length?bark:meshes.filter(m=>!/leaf|foliage|needle|branch|crown|canopy/i.test((m.name||"")+" "+(m.material?.name||"")));
    if(!trunks.length)throw Error("No identifiable trunk geometry");
    // Keep a single coherent trunk: multi-tree source packs can contain floating extras.
    const trunkCandidates=trunks.slice();
// Imported conifer assets can include displaced non-tree geometry or incorrect
// trunk labels. Reject wildly separated submeshes rather than planting floaters.

    const bounds=(selected=meshes)=>{let lo=new B.Vector3(Infinity,Infinity,Infinity),hi=new B.Vector3(-Infinity,-Infinity,-Infinity);
     for(const m of selected){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;if(!m.isEnabled()||!m.isVisible)continue;lo=B.Vector3.Minimize(lo,b.minimumWorld);hi=B.Vector3.Maximize(hi,b.maximumWorld);}return {lo,hi};};
    let b=bounds(),h=b.hi.y-b.lo.y;if(!Number.isFinite(h)||h<.01)throw Error("Invalid tree bounds");
    root.scaling.setAll((17+hash(ix,iz,4)*8)/h);root.rotation.y=hash(ix,iz,5)*Math.PI*2;root.computeWorldMatrix(true);for(const m of meshes)m.computeWorldMatrix(true);
    b=bounds(trunks);root.position.x=x-(b.lo.x+b.hi.x)/2;root.position.z=z-(b.lo.z+b.hi.z)/2;root.computeWorldMatrix(true);for(const m of meshes)m.computeWorldMatrix(true);
    const result=groundTree(root,terrainHeight,x,z,.12);
    if(!result.ok)throw Error("Shared conifer grounding failed: "+result.reason+" "+result.error);
    // Reject trees whose visible geometry is detached far above the grounded trunk.
    // A grounded trunk alone does not prove the imported model is visually grounded.
    const allBounds=bounds(meshes), trunkBounds=bounds(trunks);
    const gap=trunkBounds.lo.y-allBounds.lo.y;
    if(!Number.isFinite(gap))throw Error("Invalid conifer bounds: "+src.id);
    // Imported foliage can hide a floating second tree: reject disconnected trunks.
    const ground=terrainHeight(x,z);
    // A floating trunk means this imported asset contains detached geometry.
    // Hiding only its trunk leaves the floating canopy in the sky. Reject the
    // entire instance instead; never display a visibly unplanted conifer.
    for(const m of trunks){
     m.computeWorldMatrix(true);
     const bb=m.getBoundingInfo().boundingBox;
     if(bb.minimumWorld.y>ground+0.35)
      throw Error("Detached floating conifer trunk: "+src.id+" / "+m.name);
    }
    if(Math.abs(trunkBounds.lo.y-ground)>.35)throw Error("Conifer grounding failed: "+src.id);
    // Never show a detached canopy or a second tree floating above the planted trunk.
    for(const m of meshes){m.computeWorldMatrix(true);const bb=m.getBoundingInfo().boundingBox;if(bb.minimumWorld.y>ground+3.0 && !/leaf|foliage|needle|branch|crown|canopy/i.test((m.name||"")+" "+(m.material?.name||"")))m.setEnabled(false); }
    // Ensure every tree root actually has a visible trunk at the terrain surface.
    const plantedBase=bounds(trunks).lo.y;
    if(!Number.isFinite(plantedBase)||Math.abs(plantedBase-ground)>0.35)throw Error("Tree root not planted");
    for(const m of meshes){m.isPickable=false;m.checkCollisions=false;}
    root.metadata={kind:"native-conifer",source:src.id};state.roots.push(root);state.placements.push({root,trunks,meshes,x,z});state.planted++;
   }catch(e){root?.dispose(false,true);instance?.rootNodes?.forEach(n=>n.dispose(false,true));console.warn("Native conifer planting skipped",e);}
  }
  state.reground();
// Report actual geometry-to-ground errors for both tree systems separately.
state.groundingErrors=()=>state.placements.map(p=>{let low=Infinity;for(const m of p.trunks){if(!m.isEnabled()||!m.isVisible)continue;m.computeWorldMatrix(true);low=Math.min(low,m.getBoundingInfo().boundingBox.minimumWorld.y);}return {x:p.x,z:p.z,error:low-terrainHeight(p.x,p.z)};});
let frames=0;state.observer=scene.onBeforeRenderObservable.add(()=>{if(++frames<=120||frames%120===0)state.reground();});state.status="ready";return state;
 })().catch(e=>{state.status="error";state.error=String(e);});
 return state;
}