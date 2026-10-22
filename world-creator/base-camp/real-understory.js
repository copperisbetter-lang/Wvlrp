/**
 * The Wild 2 Base Camp: mobile-budget phototextured Appalachian-style forest floor.
 * True GLB meshes from the existing CC0 Poly Haven library; no polygon stand-ins.
 * Independent of the original Wild game's village ground-cover renderer.
 */
import {GLTFLoader} from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js";

const SOURCES=[
  {id:"fern-fronds",url:"../assets/village-floor-fern_02.glb",maxHeight:.55},
  {id:"mossy-stones",url:"../assets/village-floor-rock_moss_set_01.glb",maxHeight:.58},
  {id:"fallen-deadwood",url:"../assets/village-floor-dead_tree_trunk.glb",maxHeight:.82}
];
function random(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};}
function positionsFor(options){
  const {radius,terrainY,lakeRadius,beachZone,pathDistance,paths,perimeterClearings,interiorClearings}=options;
  const rand=random(319107),spots=[],spacing=4.8,cells=Math.ceil((radius-10)/spacing);
  for(let i=-cells;i<=cells;i++)for(let j=-cells;j<=cells;j++){
    if(rand()>.53)continue;
    const x=(i+(rand()-.5)*.9)*spacing,z=(j+(rand()-.5)*.9)*spacing;
    const r=Math.hypot(x,z);
    if(r<38||r>radius-10||lakeRadius(x,z)<1.38||beachZone(x,z))continue;
    if(paths.some(p=>pathDistance(x,z,p)<4))continue;
    if(perimeterClearings.some(p=>Math.hypot(x-p.x*.985,z-p.z*.985)<16))continue;
    if(interiorClearings.some(p=>Math.hypot(x-p.x,z-p.z)<16))continue;
    const slope=Math.hypot(terrainY(x+1,z)-terrainY(x-1,z),terrainY(x,z+1)-terrainY(x,z-1))*.5;
    if(slope>.58)continue;
    const kind=rand()<.69?0:(rand()<.7?1:2);
    spots.push({x,z,y:terrainY(x,z)-.08,kind,angle:rand()*Math.PI*2,
      size:kind===0?.28+rand()*.24:kind===1?.22+rand()*.28:.48+rand()*.28});
  }
  return spots;
}
async function sourceMeshes(THREE,loader,src){
  const doc=await loader.loadAsync(src.url),box=new THREE.Box3(),parts=[];
  doc.scene.updateMatrixWorld(true);
  doc.scene.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.geometry||!mesh.material)return;
    const geo=mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);geo.computeBoundingBox();
    if(!geo.boundingBox||geo.boundingBox.isEmpty())return;
    box.union(geo.boundingBox);
    const name=(mesh.name+" "+(mesh.material.name||"")).toLowerCase();
    let material=mesh.material;
    if(src.id==="fern-fronds"){
      // Reject untextured opaque foliage panels; these are the infamous
      // rectangular green fences, not valid photographic undergrowth.
      if(!material.map) return;
      material=material.clone();
      material.alphaTest=Math.max(.5,material.alphaTest||0);
      material.transparent=false;
      material.depthWrite=true;
      material.side=THREE.DoubleSide;
      material.needsUpdate=true;
    }
    parts.push({geometry:geo,material,name});
  });
  if(!parts.length||box.isEmpty())throw Error("Ground asset missing meshes: "+src.id);
  const c=new THREE.Vector3();box.getCenter(c);
  for(const part of parts)part.geometry.translate(-c.x,-box.min.y,-c.z);
  return {parts,height:Math.max(.04,box.max.y-box.min.y),
    footprint:Math.max(.04,box.max.x-box.min.x,box.max.z-box.min.z)};
}
export async function installBaseCampUnderstory(THREE,scene,options){
  const lowPower=!!options.lowPower;
  const placements=positionsFor(options);
  const maxPerSource=lowPower?[170,52,15]:[300,90,25],radius=lowPower?112:160;
  const status={state:"loading",sources:[],visible:0};
  options.report?.("Loading real ferns, moss-covered rocks and fallen wood…");
  const loader=new GLTFLoader(),group=new THREE.Group();
  group.name="Base Camp natural forest-floor details";
  const records=[];
  // Load individually: keep the mobile GPU from decoding all models at once.
  for(let i=0;i<SOURCES.length;i++){
    const src=SOURCES[i];
    try{
      const loaded=await sourceMeshes(THREE,loader,src);
      const batches=loaded.parts.map(part=>{
        const mesh=new THREE.InstancedMesh(part.geometry,part.material,maxPerSource[i]);
        mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.name=src.id+" / "+part.name;
        group.add(mesh);
        return mesh;
      });
      records.push({src,batches,height:loaded.height,kind:i,
        pool:placements.filter(p=>p.kind===i),budget:maxPerSource[i],
        footprint:loaded.footprint});
      status.sources.push(src.id);
    }catch(e){console.warn("Base Camp ground-detail asset unavailable:",src.id,e);}
  }
  scene.add(group);
  const dummy=new THREE.Object3D();
  let lastX=NaN,lastZ=NaN;
  status.update=(x,z,force=false)=>{
    if(!force&&Math.hypot(x-lastX,z-lastZ)<9)return;
    lastX=x;lastZ=z;
    let total=0;
    for(const rec of records){
      const visible=rec.pool.map(p=>({p,d2:(p.x-x)**2+(p.z-z)**2}))
        .filter(v=>v.d2<radius*radius).sort((a,b)=>a.d2-b.d2)
        .slice(0,rec.budget);
      visible.forEach((v,k)=>{
        const p=v.p;
        dummy.position.set(p.x,p.y,p.z);
        dummy.rotation.set(0,p.angle,0);
        // Bound *both* height and width; a fern lying sideways in its GLB
        // must never be enlarged into a green rectangular barricade.
        const maxWidth=p.kind===0?1.05:p.kind===1?1.2:4.1;
        dummy.scale.setScalar(Math.min(1.35,p.size/rec.height,maxWidth/rec.footprint));
        dummy.updateMatrix();
        for(const mesh of rec.batches)mesh.setMatrixAt(k,dummy.matrix);
      });
      for(const mesh of rec.batches){
        mesh.count=visible.length;mesh.instanceMatrix.needsUpdate=true;
      }
      total+=visible.length;
    }
    status.visible=total;
    options.report?.(total+" nearby real fern, moss-rock and deadwood details");
  };
  status.state=records.length?"ready":"unavailable";
  status.update(options.startX??0,options.startZ??15,true);
  return status;
}
