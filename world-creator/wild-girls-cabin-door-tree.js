/** Single 3D hardwood specimen immediately north of girls cabin door. */
export function installDoorTree(B,scene,y=0){
 const root=new B.TransformNode("GIRLS CABIN DOOR TREE — 3D HARDWOOD",scene);
 root.position.set(0,y,-13);
 let seed=177;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const bark=new B.StandardMaterial("door-tree-dark-ridged-bark",scene);bark.diffuseColor=new B.Color3(.25,.19,.12);bark.specularColor=new B.Color3(.03,.03,.02);
 const foliage=[new B.Color3(.17,.36,.12),new B.Color3(.24,.44,.14),new B.Color3(.31,.49,.18),new B.Color3(.13,.31,.13)].map((c,i)=>{const m=new B.StandardMaterial("door-tree-leaves-"+i,scene);m.diffuseColor=c;m.backFaceCulling=false;m.specularColor=new B.Color3(.02,.03,.01);return m;});
 function segment(a,b,r){const d=b.subtract(a),len=d.length();const m=B.MeshBuilder.CreateCylinder("3D woody branch",{height:len,diameterBottom:r*2,diameterTop:r*1.12,tessellation:9},scene);m.position=B.Vector3.Lerp(a,b,.5);const axis=B.Vector3.Cross(B.Axis.Y,d.normalize());const angle=Math.acos(Math.max(-1,Math.min(1,B.Vector3.Dot(B.Axis.Y,d))));if(axis.lengthSquared()>1e-8)m.rotationQuaternion=B.Quaternion.RotationAxis(axis.normalize(),angle);m.material=bark;m.parent=root;}
 function cluster(p,r,i){const m=B.MeshBuilder.CreateIcoSphere("3D leaf canopy",{radius:r,subdivisions:1},scene);m.position=p;m.scaling.set(1.25,.65,1.05);m.material=foliage[i%foliage.length];m.parent=root;}
 const h=18;segment(new B.Vector3(0,0,0),new B.Vector3(.4,h*.65,.1),.75);segment(new B.Vector3(.4,h*.65,.1),new B.Vector3(.2,h,0),.31);
 for(let i=0;i<19;i++){const theta=i*2.399+rnd()*.3,baseY=6+rnd()*9,reach=3+rnd()*4;const a=new B.Vector3(.3,baseY,.1),b=new B.Vector3(Math.cos(theta)*reach,baseY+1.2+rnd()*3,Math.sin(theta)*reach);segment(a,b,.12+rnd()*.17);for(let k=0;k<4;k++){const p=B.Vector3.Lerp(a,b,.55+rnd()*.45);p.addInPlace(new B.Vector3((rnd()-.5)*2,(rnd()-.5)*2,(rnd()-.5)*2));cluster(p,1.1+rnd()*.7,i+k);}}
 root.metadata={species:"Appalachian broadleaf prototype",location:"13m north of cabin origin",type:"fully 3D procedural",quality:"prototype — not photorealistic"};
 return root;
}