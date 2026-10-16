/** Weeping willow landmark, 30 m due north of Hearthside cabin (0,0). */
export function installGirlsCabinWillow(B,scene,groundY=0){
 const root=new B.TransformNode("girls-cabin-willow-30m-north",scene);
 root.position.set(0,groundY,30);
 const bark=new B.PBRMaterial("willow-weathered-bark",scene);
 bark.albedoColor=new B.Color3(.24,.19,.13);bark.roughness=1;
 const leaves=new B.StandardMaterial("willow-summer-leaves",scene);
 leaves.diffuseColor=new B.Color3(.19,.38,.12);leaves.backFaceCulling=false;
 leaves.specularColor=new B.Color3(.025,.035,.015);
 const trunk=B.MeshBuilder.CreateCylinder("willow-trunk",{height:9,diameterBottom:2.1,diameterTop:.75,tessellation:11},scene);
 trunk.position.y=4.5;trunk.material=bark;trunk.parent=root;
 const branches=[],foliage=[];
 let state=987654;const rand=()=>((state=(1664525*state+1013904223)>>>0)/4294967296);
 const branch=(a,b,r)=>{const d=new B.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);const m=B.MeshBuilder.CreateCylinder("willow-branch",{height:d.length(),diameterBottom:r*2,diameterTop:r*.52,tessellation:5},scene);m.position=a.add(b).scale(.5);m.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef?undefined:undefined;m.rotationQuaternion=B.Quaternion.RotationAlignToRef?undefined:undefined;const up=B.Vector3.Up();const axis=B.Vector3.Cross(up,d.normalize());const angle=Math.acos(Math.max(-1,Math.min(1,B.Vector3.Dot(up,d))));if(axis.lengthSquared()>1e-8)m.rotationQuaternion=B.Quaternion.RotationAxis(axis.normalize(),angle);m.material=bark;m.parent=root;branches.push(m);};
 for(let i=0;i<17;i++){
  const theta=i*Math.PI*2/17+rand()*.22,reach=5.2+rand()*4.1;
  const start=new B.Vector3(Math.sin(theta)*.35,7.6+rand()*1.6,Math.cos(theta)*.35);
  const end=new B.Vector3(Math.sin(theta)*reach,8.3+rand()*3.5,Math.cos(theta)*reach);
  branch(start,end,.18+rand()*.13);
  for(let j=0;j<18;j++){
   const t=.25+rand()*.75,anchor=B.Vector3.Lerp(start,end,t);
   const length=3+rand()*5.2;
   const tip=anchor.add(new B.Vector3((rand()-.5)*1.2,-length,(rand()-.5)*1.2));
   const ribbon=B.MeshBuilder.CreatePlane("willow-drooping-leaf-spray",{width:.22+rand()*.24,height:length,sideOrientation:B.Mesh.DOUBLESIDE},scene);
   ribbon.position=anchor.add(tip).scale(.5);ribbon.rotation.y=theta+(rand()-.5);
   ribbon.material=leaves;ribbon.parent=root;foliage.push(ribbon);
  }
 }
 root.metadata={species:"Salix babylonica",northOfCabinMetres:30,assetType:"procedural willow prototype",foliageCount:foliage.length};
 return root;
}
