// Procedural Appalachian tree test for Babylon.js. No GLB downloads.
// Usage: const grove = window.WVLRPTrees.plant(scene, new BABYLON.Vector3(x,y,z));
// Call grove.dispose() to remove.
(function(){
function plant(scene, origin, count=5){
 const B=BABYLON, meshes=[], rand=(a,b)=>a+Math.random()*(b-a);
 const bark=new B.StandardMaterial("wvlrp-bark",scene);bark.diffuseColor=B.Color3.FromHexString("#65523c");
 const greens=["#4c7732","#628c38","#789d44","#315f36","#8cae50"];
 const leaves=greens.map((c,i)=>{let m=new B.StandardMaterial("wvlrp-leaf-"+i,scene);m.diffuseColor=B.Color3.FromHexString(c);m.backFaceCulling=false;return m;});
 function limb(a,b,r,mat){let d=b.subtract(a),mesh=B.MeshBuilder.CreateCylinder("branch",{height:d.length(),diameterTop:r*.55,diameterBottom:r,tessellation:7},scene);mesh.position=a.add(b).scale(.5);mesh.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef?undefined:null;mesh.lookAt(b);mesh.rotate(B.Axis.X,Math.PI/2,B.Space.LOCAL);mesh.material=mat;meshes.push(mesh);}
 function leaf(pos,size,mat){let m=B.MeshBuilder.CreatePlane("leaf-cluster",{size:1},scene);m.position=pos;m.scaling.set(size,size*1.35,1);m.rotation.set(rand(-.6,.6),rand(0,6.28),rand(-.6,.6));m.material=mat;meshes.push(m);}
 for(let t=0;t<count;t++){
  const angle=t*2.399,dist=t===0?0:8+Math.sqrt(t)*6,root=origin.add(new B.Vector3(Math.cos(angle)*dist,0,Math.sin(angle)*dist));
  const height=rand(14,23),width=rand(.65,1.3),species=t%5;
  const top=root.add(new B.Vector3(rand(-1,1),height,rand(-1,1)));
  limb(root,top,width,bark);
  for(let j=0;j<11;j++){let y=height*(.34+j*.052),a=rand(0,6.28),reach=rand(3,6)*(species===4?.7:1),base=root.add(new B.Vector3(0,y,0)),end=base.add(new B.Vector3(Math.cos(a)*reach,rand(1,4),Math.sin(a)*reach));limb(base,end,rand(.12,.28),bark);
   for(let k=0;k<5;k++){let p=B.Vector3.Lerp(base,end,rand(.55,1));p.y+=rand(-1,2);leaf(p,rand(2.2,4.1),leaves[(t+k)%leaves.length]);}
  }
 }
 return {dispose(){meshes.forEach(m=>m.dispose());[bark,...leaves].forEach(m=>m.dispose());},meshes};
}
window.WVLRPTrees={plant};
})();