/** Streaming animated Appalachian lakes and creeks; no external assets required. */
export function installWildWaters(B,scene,{height,getPosition,seed=1}){
 const sites=[{x:-165,z:-180,rx:72,rz:52},{x:410,z:-340,rx:95,rz:72}];
 const root=new B.TransformNode("Wild living waters",scene);
 const mat=new B.StandardMaterial("deep reflective lake water",scene);
 mat.diffuseColor=new B.Color3(.075,.26,.29);mat.specularColor=new B.Color3(.75,.86,.84);
 mat.specularPower=95;mat.alpha=.82;mat.backFaceCulling=false;
 const creekMat=mat.clone("clear moving stream");creekMat.diffuseColor=new B.Color3(.12,.31,.32);creekMat.alpha=.78;
 const groups=[];
 function waterMesh(name,points,material){
  const mesh=new B.Mesh(name,scene),positions=[],indices=[],uvs=[];
  for(let i=0;i<points.length;i++){const p=points[i];positions.push(p[0],p[1],p[2]);uvs.push(p[0]/12,p[2]/12);}
  for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
  const data=new B.VertexData();data.positions=positions;data.indices=indices;data.uvs=uvs;data.applyToMesh(mesh);
  mesh.material=material;mesh.parent=root;mesh.isPickable=false;return mesh;
 }
 for(const [idx,s] of sites.entries()){
  const points=[[s.x,height(s.x,s.z)+1.25,s.z]];
  for(let i=0;i<=64;i++){const a=i*Math.PI*2/64,r=1+.045*Math.sin(5*a+idx);const x=s.x+Math.cos(a)*s.rx*r,z=s.z+Math.sin(a)*s.rz*r;points.push([x,height(s.x,s.z)+.11,z]);}
  const mesh=waterMesh("living lake "+(idx+1),points,mat);
  groups.push({mesh,x:s.x,z:s.z,range:450});
 }
 // Narrow meandering streams, made from individual local ribbons rather than one enormous plane.
 for(let stream=0;stream<3;stream++){
  const points=[];const origin=sites[stream%2],n=72;
  for(let i=0;i<n;i++){
   const t=i/(n-1),z=origin.z+(t-.5)*700;
   const x=origin.x+origin.rx*.7+30*Math.sin(t*10+stream*2)+stream*75;
   const y=height(x,z)+.08;
   const width=2.6+1.1*Math.sin(t*12+stream);
   points.push([x-width,y,z],[x+width,y,z]);
  }
  const mesh=new B.Mesh("flowing mountain creek "+stream,scene);
  const pos=points.flat(),uv=[],indices=[];
  for(let i=0;i<n;i++){uv.push(0,i*.55,1,i*.55);if(i<n-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const d=new B.VertexData();d.positions=pos;d.indices=indices;d.uvs=uv;d.applyToMesh(mesh);
  mesh.material=creekMat;mesh.parent=root;mesh.isPickable=false;
  groups.push({mesh,x:origin.x+origin.rx*.7+stream*75,z:origin.z,range:510});
 }
 let frame=0;
 const observer=scene.onBeforeRenderObservable.add(()=>{
  if(++frame%15!==0)return;
  const p=getPosition();
  for(const g of groups)g.mesh.setEnabled(Math.hypot(p.x-g.x,p.z-g.z)<g.range);
  const t=performance.now()*.00025;
  mat.diffuseColor.r=.075+.012*Math.sin(t);creekMat.diffuseColor.g=.31+.018*Math.sin(t*3);
 });
 return {sites,dispose(){scene.onBeforeRenderObservable.remove(observer);root.dispose(false,true);mat.dispose();creekMat.dispose();}};
}
