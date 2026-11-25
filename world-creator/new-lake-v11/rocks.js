// Layered, chipped sandstone with actual photographic rock grain. Original collision radii retained.
export function makeRocks(T,scene,P){
 let seed=41891;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const meshes=[],materials=[],color=new T.Color(),ob=new T.Object3D();
 // Three distinct compact slab geometries. Maximum horizontal radius <= original collision proxy.
 for(let v=0;v<3;v++){
  const count=8+v,vertices=[],indices=[],uv=[],rings=[-.43,-.13,.18,.40],radius=[.65,.98,.91,.62];
  const angles=Array.from({length:count},(_,i)=>2*Math.PI*i/count+(rand()-.5)*.15);
  const lobes=angles.map(()=>.84+rand()*.14);
  for(let j=0;j<rings.length;j++)for(let i=0;i<count;i++){
   let a=angles[i],r=radius[j]*lobes[i]*(.94+rand()*.06);vertices.push(Math.cos(a)*r,rings[j]+(rand()-.5)*.10,Math.sin(a)*r);uv.push(i/count,j/3);
  }
  for(let j=0;j<3;j++)for(let i=0;i<count;i++){let k=(i+1)%count,a=j*count+i,b=j*count+k,c=a+count,d=b+count;indices.push(a,b,c,b,d,c)}
  for(let i=1;i<count-1;i++){indices.push(0,i+1,i);let b=3*count;indices.push(b,b+i,b+i+1)}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);const flat=geo.toNonIndexed();geo.dispose();flat.computeVertexNormals();
  // Per-face shading rather than rounded smooth stones.
  const p=flat.getAttribute('position'),u=flat.getAttribute('uv'),norm=flat.getAttribute('normal');
  for(let i=0;i<p.count;i++){const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i)),nz=Math.abs(norm.getZ(i));let x=p.getX(i),y=p.getY(i),z=p.getZ(i);u.setXY(i,.5+(ny>nx&&ny>nz?x:nx>nz?z:x)*.45,.5+(ny>nx&&ny>nz?z:y)*.65)}
  u.needsUpdate=true;
  const mat=new T.MeshStandardMaterial({color:0xb9ae96,roughness:.96,flatShading:true});materials.push(mat);
  const list=P.rocks.filter((o,i)=>i%3===v),mesh=new T.InstancedMesh(flat,mat,list.length);
  list.forEach((o,i)=>{ob.position.set(o.x,o.y+o.h*.29,o.z);ob.rotation.set(0,rand()*Math.PI*2,0);ob.scale.set(o.r,o.h*(1.15+rand()*.55),o.r*(.68+rand()*.25));ob.updateMatrix();mesh.setMatrixAt(i,ob.matrix);color.setRGB(.78+rand()*.20,.77+rand()*.19,.70+rand()*.20);mesh.setColorAt(i,color)});
  mesh.computeBoundingSphere();scene.add(mesh);meshes.push(mesh);
 }
 function loadPhoto(c){
  // Crop three rock-only regions from the selected waterfall-free panorama.
  const patches=[[.29,.62,.08,.12],[.53,.67,.055,.095],[.65,.64,.075,.105]];
  materials.forEach((mat,i)=>{const [x,y,w,h]=patches[i],texCanvas=document.createElement('canvas');texCanvas.width=256;texCanvas.height=256;const ctx=texCanvas.getContext('2d');ctx.drawImage(c,x*c.width,y*c.height,w*c.width,h*c.height,0,0,256,256);const tex=new T.CanvasTexture(texCanvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=2;mat.map?.dispose();mat.map=tex;mat.color.setHex(0xffffff);mat.needsUpdate=true});
 }
 return {loadPhoto,count:P.rocks.length,batches:meshes.length};
}
