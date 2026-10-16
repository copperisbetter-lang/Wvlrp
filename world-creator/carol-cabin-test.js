// Private Carol cabin pose test. Activated only by ?carolTest=1.
export async function startCarolTest(B,scene,camera,cabinGrade,seed){
 const status=document.getElementById("message");
 const say=s=>{if(status)status.textContent="Carol test · "+s};
 const file="./assets/caroline-inspection.glb";
 let data;
 try{data=await B.SceneLoader.ImportMeshAsync(null,"",file,scene,undefined,".glb");}
 catch(e){say("Carol model unavailable: "+e.message);return;}
 const root=new B.TransformNode("Carol cabin grounded pose test",scene);
 const meshes=data.meshes||[];
 for(const m of meshes.filter(m=>!m.parent||!meshes.includes(m.parent)))m.parent=root;
 let low=Infinity,high=-Infinity;
 for(const m of meshes){if(!m.getTotalVertices?.())continue;m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;low=Math.min(low,b.minimumWorld.y);high=Math.max(high,b.maximumWorld.y)}
 if(!Number.isFinite(low)||high-low<.05){say("Carol mesh has no measurable body");return;}
 root.scaling.setAll(1.7/(high-low));
 root.computeWorldMatrix(true);
 low=Infinity;
 for(const m of meshes){if(!m.getTotalVertices?.())continue;m.computeWorldMatrix(true);low=Math.min(low,m.getBoundingInfo().boundingBox.minimumWorld.y)}
 const floor=cabinGrade(0,10.7,seed)+.04;
 root.position.set(0,floor-low,10.7);
 camera.position.set(2,cabinGrade(2,16,seed)+1.72,16);
 camera.setTarget(new B.Vector3(0,floor+1,10.7));
 const groups=data.animationGroups||[];
 groups.forEach(g=>g.stop());
 const lookup=name=>groups.find(g=>g.name.toLowerCase()===("caroline "+name).toLowerCase())||groups.find(g=>g.name.toLowerCase().endsWith(" "+name.toLowerCase()));
 const steps=[["Stand",2],["Kneel",12]];
 let index=-1,active=null;
 function next(){
  if(active)active.stop();
  index=(index+1)%steps.length;
  const [name,duration]=steps[index];
  if(index===4)root.rotation.y=Math.PI;
  if(index===0)root.rotation.y=0;
  const g=lookup(name);
  if(!g){say(name+" animation missing from Carol GLB");return;}
  active=g;g.start(false,1,g.from,g.to,false);
  say(name==="Kneel"?"On front steps · seated pose requires new animation":name+" · "+(index+1)+"/"+steps.length);
 }
 next();
 let elapsed=0;
 scene.onBeforeRenderObservable.add(()=>{
  const dt=Math.min(scene.getEngine().getDeltaTime()/1000,.05);
  elapsed+=dt;
  if(elapsed>=steps[index][1]){elapsed=0;next();}
 });
 window.__carolTest={root,groups:groups.map(g=>g.name)};
}
