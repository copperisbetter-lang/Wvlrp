// First approved Base Camp trail: lake shore to nearest empty inland campsite clearing.
// Fences and mossy rocks are actual 3D geometry; the path is a terrain-following walkable surface.
// Uses WVLRP's own woodland-trail-hd.webp reference image rather than an external generic dirt texture. Perspective source needs replacement with approved ground-specific photograph.
export function installVillageCampsiteTrail(THREE,scene,{terrainY,interiorClearings,textureLoader,LAKE}){
 const start={x:0,z:LAKE.z+LAKE.rz+8};
 const nearest=interiorClearings.filter(p=>p.z>start.z+12&&Math.hypot(p.x-start.x,p.z-start.z)>12)
   .sort((a,b)=>Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z))[0];
 if(!nearest)return null;
 const end={x:nearest.x,z:nearest.z};
 const distance=Math.hypot(end.x-start.x,end.z-start.z);
 const segments=Math.max(16,Math.ceil(distance/2));
 const width=3.6,points=[];
 for(let i=0;i<=segments;i++){
  const t=i/segments;
  const sway=Math.sin(t*Math.PI)*Math.sin(t*Math.PI*2)*Math.min(2,distance*.025);
  const dx=(end.x-start.x)/distance,dz=(end.z-start.z)/distance;
  points.push({x:start.x+(end.x-start.x)*t-dz*sway,z:start.z+(end.z-start.z)*t+dx*sway});
 }
 const vertices=[],uv=[],indices=[];
 for(let i=0;i<points.length;i++){
  const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
  const len=Math.hypot(b.x-a.x,b.z-a.z)||1,nx=-(b.z-a.z)/len,nz=(b.x-a.x)/len;
  for(const side of [-1,1]){const x=p.x+nx*side*width/2,z=p.z+nz*side*width/2;vertices.push(x,terrainY(x,z)+.09,z);uv.push(side<0?0:1,i*distance/segments/23.1648)}
  if(i<segments){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide});
 const trail=new THREE.Mesh(geometry,material);trail.receiveShadow=true;trail.name='village-to-nearest-campsite-trail';scene.add(trail);
 textureLoader.load('../../assets/woodland-trail-hd.webp',t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);material.map=t;material.needsUpdate=true},undefined,err=>console.error('WVLRP woodland photo missing',err));
 const wood=new THREE.MeshStandardMaterial({color:0x74563a,roughness:1});
 const moss=new THREE.MeshStandardMaterial({color:0x576747,roughness:1});
 const stone=new THREE.MeshStandardMaterial({color:0x77786b,roughness:1});
 const postGeometry=new THREE.CylinderGeometry(.095,.12,.98,6);
 const railGeometry=new THREE.CylinderGeometry(.055,.065,1,6);
 const rockGeometry=new THREE.DodecahedronGeometry(1,0);
 for(let i=0;i<points.length;i+=Math.max(1,Math.round(segments/Math.max(4,distance/3)))){
  const p=points[i],next=points[Math.min(segments,i+1)],prev=points[Math.max(0,i-1)];
  const tx=next.x-prev.x,tz=next.z-prev.z,l=Math.hypot(tx,tz)||1,nx=-tz/l,nz=tx/l;
  for(const side of [-1,1]){
   const x=p.x+nx*side*(width/2+.28),z=p.z+nz*side*(width/2+.28),y=terrainY(x,z);
   const post=new THREE.Mesh(postGeometry,wood);post.position.set(x,y+.49,z);scene.add(post);
   const rock=new THREE.Mesh(rockGeometry,stone);rock.scale.set(.32,.17,.26);rock.position.set(x-nx*side*.22,y+.06,z-nz*side*.22);scene.add(rock);
   const cap=new THREE.Mesh(rockGeometry,moss);cap.scale.set(.28,.045,.22);cap.position.set(rock.position.x,y+.19,rock.position.z);scene.add(cap);
  }
 }
 // Continuous rails: separate 3D objects, not painted onto the ground photograph.
 for(const side of [-1,1])for(let i=0;i<segments;i+=Math.max(1,Math.round(segments/Math.max(4,distance/3)))){
  const j=Math.min(segments,i+Math.max(1,Math.round(segments/Math.max(4,distance/3))));
  const a=points[i],b=points[j],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
  for(const height of [.42,.83]){
   const ax=a.x+nx*side*(width/2+.28),az=a.z+nz*side*(width/2+.28),bx=b.x+nx*side*(width/2+.28),bz=b.z+nz*side*(width/2+.28);
   const va=new THREE.Vector3(ax,terrainY(ax,az)+height,az),vb=new THREE.Vector3(bx,terrainY(bx,bz)+height,bz);
   const beam=new THREE.Mesh(railGeometry,wood);beam.position.copy(va).add(vb).multiplyScalar(.5);beam.scale.y=va.distanceTo(vb);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());scene.add(beam);
  }
 }
 return {start,end,width,length:distance,trail};
}
