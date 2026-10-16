/** Walk The Wild: real downloaded Poly Haven tree model inspection line.
 * One of each verified local GLB, beginning 30 m north of Hearthside Cabin.
 * Load on approach to protect Android memory; preserve all existing world assets.
 */
export function installTreeInspectionLine(B,scene,{seed,cabinGrade,camera}){
 const entries=[
  ["fir_tree_01",30224784],["fir_sapling_medium",7199688],
  ["pine_sapling_medium",18025200],["pine_sapling_small",1717548],
  ["fir_sapling",2648492],["island_tree_01",5290604],
  ["island_tree_02",3904436],["island_tree_03",6700476],
  ["tree_small_02",5403644],["jacaranda_tree",14137844]
 ];
 const spots=entries.map(([id,bytes],i)=>({id,bytes,x:0,z:-30-i*24,status:"waiting",root:null}));
 let busy=false;
 async function load(spot){
  busy=true;spot.status="loading";
  try{
   const result=await B.SceneLoader.ImportMeshAsync(null,"./assets/","village-pbr-"+spot.id+".glb",scene);
   const meshes=result.meshes.filter(m=>m.getTotalVertices?.()>0);
   const roots=result.meshes.filter(m=>!m.parent||!result.meshes.includes(m.parent));
   const root=new B.TransformNode("TREE INSPECTION: "+spot.id,scene);
   for(const node of roots)node.parent=root;
   root.position.set(spot.x,cabinGrade(spot.x,spot.z,seed),spot.z);
   root.computeWorldMatrix(true);
   // Normalize source origins and scale to inspectable real-world sizes.
   let minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
   for(const m of meshes){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;
    minY=Math.min(minY,b.minimumWorld.y);maxY=Math.max(maxY,b.maximumWorld.y);
    minX=Math.min(minX,b.minimumWorld.x);maxX=Math.max(maxX,b.maximumWorld.x);
    minZ=Math.min(minZ,b.minimumWorld.z);maxZ=Math.max(maxZ,b.maximumWorld.z);}
   const height=maxY-minY;
   if(Number.isFinite(height)&&height>0){
    const target=spot.id.includes("sapling")||spot.id.includes("small")?5:spot.id.includes("island")?12:17;
    const scale=Math.min(8,Math.max(.08,target/height));
    root.scaling.setAll(scale);
    root.position.y-=minY*scale;
    root.position.x-=(minX+maxX)*.5*scale;
    root.position.z-=(minZ+maxZ)*.5*scale;
   }
   for(const m of meshes){m.isPickable=false;m.checkCollisions=false;}
   spot.root=root;spot.status="ready";
  }catch(err){spot.status="error";spot.error=String(err);console.warn("Tree sample failed",spot.id,err);}
  finally{busy=false;}
 }
 const tick=()=>{
  if(busy)return;
  // Do not decode all ten heavy models at once on mobile.
  const next=spots.find(p=>p.status==="waiting"&&Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<70);
  if(next)void load(next);
 };
 tick();
 return {spots,tick};
}
