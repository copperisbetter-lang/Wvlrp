/** SAV4 lakeside resident: 55 minutes seated, 5 minutes strolling per wall-clock hour. */
export async function installSav4LakesideResident(B,scene,{height}={}){
 const root=new B.TransformNode("sav4-lakeside-resident",scene);
 // North bank of lake centered at (-165,-180), north radius 52; keep just outside the water.
 const home={x:-165,z:-124};
 const ground=(x,z)=>Number(height?.(x,z))||0;
 root.position.set(home.x,ground(home.x,home.z),home.z);
 let container;
 try{
  container=await B.SceneLoader.LoadAssetContainerAsync("./assets/","sav4-realistic.glb",scene);
  container.addAllToScene();
  const nodes=container.meshes.filter(m=>!m.parent);
  for(const node of nodes)node.parent=root;
 }catch(err){console.warn("SAV4 lakeside model unavailable",err);root.dispose();return null;}
 // The approved SAV4 viewer dresses this same base GLB with two separate assets.
 // Fit the garments against the resident's actual world-space body bounds.
 const clothing=[];
 let clothingFailed=false;
 async function dress(filename,region,desiredWidth){
  try{
   const outfit=await B.SceneLoader.LoadAssetContainerAsync("./assets/",filename,scene);
   outfit.addAllToScene();
   const top=outfit.meshes.filter(m=>!m.parent);
   const garmentRoot=new B.TransformNode("sav4-"+region+"-clothing",scene);
   for(const node of top)node.parent=garmentRoot;
   garmentRoot.parent=root;
   root.computeWorldMatrix(true);
   const bounds=(meshes)=>{
    let min=new B.Vector3(Infinity,Infinity,Infinity),max=new B.Vector3(-Infinity,-Infinity,-Infinity);
    for(const mesh of meshes){if(!mesh.getBoundingInfo)continue;mesh.computeWorldMatrix(true);const b=mesh.getBoundingInfo().boundingBox;min=B.Vector3.Minimize(min,b.minimumWorld);max=B.Vector3.Maximize(max,b.maximumWorld)}
    return {min,max,size:max.subtract(min),center:min.add(max).scale(.5)};
   };
   const bodyMeshes=container.meshes.filter(m=>m.getTotalVertices?.()>0);
   const garmentMeshes=outfit.meshes.filter(m=>m.getTotalVertices?.()>0);
   const body=bounds(bodyMeshes),garment=bounds(garmentMeshes);
   if(!Number.isFinite(garment.size.y)||garment.size.y<=0)throw Error("invalid garment bounds");
   const width=body.size.x*desiredWidth;
   const factor=width/Math.max(.001,garment.size.x);
   garmentRoot.scaling.scaleInPlace(factor);
   garmentRoot.computeWorldMatrix(true);
   const fitted=bounds(garmentMeshes);
   const targetY=region==="skirt"?body.min.y+body.size.y*.51:body.min.y+body.size.y*.76;
   const offset=new B.Vector3(body.center.x-fitted.center.x,targetY-fitted.center.y,body.center.z-fitted.center.z);
   garmentRoot.position.addInPlace(offset);
   clothing.push({outfit,garmentRoot});
  }catch(e){clothingFailed=true;console.error("SAV4 approved "+region+" failed to load; resident will not be displayed undressed",e)}
 }
 await dress("sav4_makehuman_mini_skirt_01.glb","skirt",.95);
 await dress("sav4-peasant-blouse.glb","blouse",1.18);
 if(clothingFailed||clothing.length!==2){clothing.forEach(c=>{c.outfit.dispose();c.garmentRoot.dispose()});container.dispose();root.dispose();return null;}
 const groups=container.animationGroups||[];
 const pick=(name)=>groups.find(g=>name.test(g.name));
 const walk=pick(/walk/i),sit=pick(/sit/i),idle=pick(/idle|breath/i);
 let current=null;
 const play=(group)=>{if(current===group)return;current?.stop();current=group||null;current?.start(true)};
 let last=performance.now();
 const observer=scene.onBeforeRenderObservable.add(()=>{
  const now=performance.now(),dt=Math.min((now-last)/1000,.1);last=now;
  const second=(Date.now()/1000)%3600;
  const strolling=second>=3300;
  // A short safe path along the north shore, always beyond the lake's water ellipse.
  if(strolling){
   const t=(second-3300)/300;
   const x=home.x+Math.sin(t*Math.PI*2)*17;
   const z=home.z+2*(1-Math.cos(t*Math.PI*2));
   const dx=x-root.position.x,dz=z-root.position.z;
   root.position.set(x,ground(x,z),z);
   if(Math.hypot(dx,dz)>.0001)root.rotation.y=Math.atan2(dx,dz);
   play(walk);
  }else{
   root.position.set(home.x,ground(home.x,home.z),home.z);
   root.rotation.y=Math.PI; // Face south toward the lake while seated.
   play(sit||idle);
  }
 });
 return {root,dispose(){scene.onBeforeRenderObservable.remove(observer);current?.stop();clothing.forEach(c=>{c.outfit.dispose();c.garmentRoot.dispose()});container?.dispose();root.dispose()}};
}
