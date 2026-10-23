// First approved Base Camp trail: lake shore to nearest empty inland campsite clearing.
// Fences and mossy rocks are actual 3D geometry; the path is a terrain-following walkable surface.
// Uses the exact user-approved trail PNG. Tile at near-native detail instead of stretching over 76 feet; a future purpose-made long photograph is still needed to remove visible repeats.
export function installVillageCampsiteTrail(THREE,scene,{terrainY,interiorClearings,textureLoader,LAKE}){
 // Keep the walking trail inland of the sandy/rocky beach transition (beach ends around normalized lake radius 1.23).
 const start={x:0,z:LAKE.z+LAKE.rz*1.34};
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
  for(const side of [-1,1]){const x=p.x+nx*side*width/2,z=p.z+nz*side*width/2;vertices.push(x,terrainY(x,z)+.025,z);uv.push(side<0?0:1,i*distance/segments/5.5)}
  if(i<segments){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide});
 const trail=new THREE.Mesh(geometry,material);trail.receiveShadow=true;trail.name='village-to-nearest-campsite-trail';scene.add(trail);
 // Extract only the center ground from the approved photograph. Its perspective fences
 // and distant horizon must never be painted onto a walkable floor.
 // Crossfade adjacent samples to remove the abrupt rectangular repetition seams.
 textureLoader.load('./a_realistic_high_detail_outdoor_forest_trail_scen.png',source=>{
  const image=source.image,canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=2048;
  const ctx=canvas.getContext('2d');
  const sw=image.width,sh=image.height;
  // The bottom-center of the source is the nearest ground. Exclude side fences.
  const cropX=sw*.36,cropW=sw*.28,cropY=sh*.70,cropH=sh*.24;
  const tiles=8,step=canvas.height/tiles;
  for(let i=0;i<tiles;i++){
   const y=i*step;
   ctx.drawImage(image,cropX,cropY,cropW,cropH,0,y,canvas.width,step+1);
   if(i>0){
    const fade=28;
    ctx.save();ctx.beginPath();ctx.rect(0,y,canvas.width,fade);ctx.clip();
    ctx.globalAlpha=.5;
    ctx.drawImage(image,cropX,cropY+cropH*.18,cropW,cropH*.55,0,y,canvas.width,fade);
    ctx.restore();
   }
  }
  const t=new THREE.CanvasTexture(canvas);
  t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
  t.anisotropy=8;
  material.map=t;material.needsUpdate=true;
 },undefined,err=>console.error('WVLRP approved trail photo missing',err));
 function rendererCapabilitiesAnisotropy(){return 16;}

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
 // Removed placeholder cone vegetation: it looked artificial beside the new mountain backdrop.\n // Continuous rails: separate 3D objects, not painted onto the ground photograph.
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
