// Carol's private, visible cabin-porch movement test.
export async function startCarolTest(B,scene,camera,cabinGrade,seed){
 const status=document.getElementById("message");
 const say=s=>{if(status)status.textContent="Carol test · "+s;};
 const file="./assets/caroline-inspection.glb";
 let data;
 try{data=await B.SceneLoader.ImportMeshAsync(null,"",file,scene,undefined,".glb");}
 catch(e){say("MODEL LOAD FAILED: "+e.message);return;}
 const root=new B.TransformNode("Carol cabin movement test",scene);
 const meshes=data.meshes||[];
 for(const m of meshes.filter(m=>!m.parent||!meshes.includes(m.parent)))m.parent=root;
 let lo=Infinity,hi=-Infinity;
 for(const m of meshes){if(!m.getTotalVertices?.())continue;m.computeWorldMatrix(true);const bb=m.getBoundingInfo().boundingBox;lo=Math.min(lo,bb.minimumWorld.y);hi=Math.max(hi,bb.maximumWorld.y);}
 if(!Number.isFinite(lo)||hi-lo<.05){say("MODEL HAS NO VISIBLE GEOMETRY");return;}
 root.scaling.setAll(1.7/(hi-lo));
 root.computeWorldMatrix(true);
 lo=Infinity;
 for(const m of meshes){if(!m.getTotalVertices?.())continue;m.computeWorldMatrix(true);lo=Math.min(lo,m.getBoundingInfo().boundingBox.minimumWorld.y);}
 const groundOffset=-lo+.04;
 const groups=data.animationGroups||[];
 groups.forEach(g=>g.stop());
 const find=(name)=>groups.find(g=>g.name.toLowerCase().includes(name.toLowerCase()));
 let active=null;
 function animate(names){
   if(active){active.stop();active=null;}
   for(const name of names){const g=find(name);if(g){active=g;g.start(true);break;}}
 }
 // The front porch is at positive Z. Keep Carol visible in front of the door.
 const path=[
  {x:0,z:7.5,d:1,action:"stand",label:"At cabin door"},
  {x:0,z:10.7,d:4,action:"walk",label:"Walking out onto porch"},
  {x:0,z:13,d:3,action:"walk",label:"Walking down the steps"},
  {x:0,z:13,d:3,action:"stand",label:"Standing at steps"},
  {x:0,z:13,d:5,action:"kneel",label:"Kneeling at steps"},
  {x:0,z:13,d:4,action:"stand",label:"Standing up"},
  {x:0,z:7.5,d:5,action:"walk",label:"Walking back to cabin"}
 ];
 let index=0,elapsed=0;
 function setPose(){
  const p=path[index];animate(p.action==="walk"?["walk"]:p.action==="kneel"?["kneel","sit"]:["stand","idle"]);
  say(p.label+" · Carol visible at porch");
 }
 function place(x,z){
  root.position.set(x,cabinGrade(x,z,seed)+groundOffset,z);
 }
 place(path[0].x,path[0].z);
 camera.position.set(3,cabinGrade(3,19,seed)+1.72,19);
 camera.setTarget(new B.Vector3(0,cabinGrade(0,11,seed)+1.1,11));
 setPose();
 scene.onBeforeRenderObservable.add(()=>{
  const dt=Math.min(scene.getEngine().getDeltaTime()/1000,.05);
  elapsed+=dt;
  const p=path[index],prev=path[(index+path.length-1)%path.length];
  const t=Math.min(elapsed/p.d,1);
  if(p.action==="walk"){place(prev.x+(p.x-prev.x)*t,prev.z+(p.z-prev.z)*t);}
  else place(p.x,p.z);
  if(elapsed>=p.d){elapsed=0;index=(index+1)%path.length;setPose();}
 });
 window.__carolTest={root,groups:groups.map(g=>g.name),get position(){return root.position.asArray()},get step(){return path[index].label}};
}
