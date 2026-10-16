/** Walk The Wild: real downloaded Poly Haven tree model inspection line.
 * One of each verified local GLB, beginning 30 m north of Hearthside Cabin.
 * Load on approach to protect Android memory; preserve all existing world assets.
 */
export function installTreeInspectionLine(B,scene,{seed,cabinGrade,camera}){
 const entries=[
  ["oak_tree",545000],["oak_tree_small",458000],
  ["fir_sapling_medium",7199688],["fir_tree_01",30224784],
  ["pine_sapling_medium",18025200],["pine_sapling_small",1717548],
  ["fir_sapling",2648492],["island_tree_01",5290604],
  ["island_tree_02",3904436],["island_tree_03",6700476],
  ["tree_small_02",5403644],["jacaranda_tree",14137844]
 ];
 const spots=entries.map(([id,bytes],i)=>({id,bytes,x:0,z:-30-i*24,status:"waiting",root:null,label:null}));
 // Physical labeled test markers make positions visible even if a GLB fails to load.
 const markerMat=new B.StandardMaterial("tree-test-marker-material",scene);markerMat.diffuseColor=new B.Color3(.98,.78,.2);markerMat.emissiveColor=new B.Color3(.24,.17,.02);
 for(const spot of spots){
   const post=B.MeshBuilder.CreateCylinder("TREE TEST "+spot.id,{height:2.6,diameter:.14,tessellation:8},scene);
   post.position.set(spot.x+3,cabinGrade(spot.x,spot.z,seed)+1.3,spot.z);post.material=markerMat;post.isPickable=false;
   const plane=B.MeshBuilder.CreatePlane("TREE LABEL "+spot.id,{width:4.4,height:1},scene);
   plane.position.set(spot.x+3,cabinGrade(spot.x,spot.z,seed)+2.9,spot.z);plane.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
   const tex=new B.DynamicTexture("label "+spot.id,{width:512,height:128},scene,false);
   tex.drawText(spot.id,16,76,"bold 39px Arial","#fff3bc","#163e2e",true);
   spot.label=tex;
   const mat=new B.StandardMaterial("label mat "+spot.id,scene);mat.diffuseTexture=tex;mat.emissiveColor=new B.Color3(.4,.4,.4);mat.backFaceCulling=false;plane.material=mat;
 }
 let busy=false;
 async function load(spot){
  busy=true;spot.status="loading";spot.label?.drawText(spot.id+" LOADING",8,76,"bold 31px Arial","#ffffff","#224455",true);
  try{
   const result=await B.SceneLoader.ImportMeshAsync(null,"./assets/",(spot.id.startsWith("oak_tree")?spot.id:"village-pbr-"+spot.id)+".glb",scene,undefined,".glb");
   const meshes=result.meshes.filter(m=>m.getTotalVertices?.()>0);
   const roots=result.meshes.filter(m=>!m.parent||!result.meshes.includes(m.parent));
   const root=new B.TransformNode("TREE INSPECTION: "+spot.id,scene);
   for(const node of roots)node.parent=root;
   root.position.set(0,0,0);
   root.computeWorldMatrix(true);
   // Normalize source origins and scale to inspectable real-world sizes.
   let minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
   for(const m of meshes){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;
    minY=Math.min(minY,b.minimumWorld.y);maxY=Math.max(maxY,b.maximumWorld.y);
    minX=Math.min(minX,b.minimumWorld.x);maxX=Math.max(maxX,b.maximumWorld.x);
    minZ=Math.min(minZ,b.minimumWorld.z);maxZ=Math.max(maxZ,b.maximumWorld.z);}
   const height=maxY-minY;
   if(!meshes.length||!Number.isFinite(height)||height<=0)throw Error("Downloaded GLB contains no renderable mesh");
   if(Number.isFinite(height)&&height>0){
    const target=spot.id==="oak_tree"?17:spot.id.includes("sapling")||spot.id.includes("small")?5:spot.id.includes("island")?12:17;
    const scale=Math.min(8,Math.max(.08,target/height));
    root.scaling.setAll(scale);
    root.position.y=cabinGrade(spot.x,spot.z,seed)-minY*scale;
    root.position.x=spot.x-(minX+maxX)*.5*scale;
    root.position.z=spot.z-(minZ+maxZ)*.5*scale;
   }
   for(const m of meshes){m.isPickable=false;m.checkCollisions=false;m.alwaysSelectAsActiveMesh=true;const mats=m.material?.subMaterials||[m.material];for(const mat of mats){if(!mat)continue;mat.backFaceCulling=false;mat.twoSidedLighting=true;if(mat.albedoTexture?.hasAlpha||mat.diffuseTexture?.hasAlpha){mat.transparencyMode=B.Material.MATERIAL_ALPHATEST;mat.useAlphaFromAlbedoTexture=true;}}}
   spot.root=root;spot.status="ready";spot.label?.drawText(spot.id+" READY",8,76,"bold 32px Arial","#b8ffb5","#163e2e",true);
  }catch(err){spot.status="error";spot.error=String(err);spot.label?.drawText(spot.id+" FAILED",8,76,"bold 32px Arial","#ffaaaa","#661b1b",true);console.warn("Tree sample failed",spot.id,err);}
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
