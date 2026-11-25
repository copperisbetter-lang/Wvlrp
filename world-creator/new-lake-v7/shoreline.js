// Checkpoint 05: sparse, deterministic native shoreline vegetation.
// Non-solid grass and flexible reeds; existing rock and cliff colliders remain authoritative.
export function plantShoreline(T,scene,L,P){
 const rng=(()=>{let state=73193;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}})();
 const grass=[],reed=[],N=L.N,TAU=2*Math.PI;
 const beach=i=>i>=48&&i<=80;
 const safe=i=>!beach(i)&&!(i>=L.cliffStart-6&&i<=L.cliffEnd+6);
 function spot(i,offset,spread){
  const a=(i+(rng()-.5)*spread)/N*TAU,r=Math.hypot(...L.shore[i])+offset;
  const x=r*Math.cos(a),z=r*Math.sin(a),y=P.ground(x,z);
  if(y===null||P.rocks.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.2))return null;
  return {x,y,z};
 }
 for(let i=0;i<N;i++){
  if(!safe(i))continue;
  const density=.5+.5*Math.sin(i*.31+1);
  for(let j=0;j<Math.floor(5+7*density);j++){
   const p=spot(i,2+rng()*34,2);
   if(p&&p.y>.08)grass.push({...p,h:.15+rng()*.38,w:.13+rng()*.14});
  }
  if(Math.sin(i*.19)>.20&&i%4===0){
   for(let j=0;j<9;j++){
    const p=spot(i,-.85+rng()*2.0,2);
    if(p&&p.y>-.55&&p.y<.3)reed.push({...p,h:.75+rng()*.65,w:.025+rng()*.025});
   }
  }
 }
 function bladeGeometry(){
  const p=[],ind=[];
  for(let k=0;k<5;k++){
   const a=k*2.39996,dx=Math.cos(a),dz=Math.sin(a),sx=-dz,sz=dx,b=p.length/3;
   p.push(sx*.12,0,sz*.12,-sx*.12,0,-sz*.12,dx*.18+sx*.065,.52,dz*.18+sz*.065,dx*.18-sx*.065,.52,dz*.18-sz*.065,dx*.55,.96,dz*.55);
   ind.push(b,b+1,b+2,b+1,b+3,b+2,b+2,b+3,b+4);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ind);g.computeVertexNormals();return g;
 }
 const dummy=new T.Object3D(),color=new T.Color();
 function batch(name,geo,items,material,configure){
  if(!items.length){geo.dispose();material.dispose();return}
  const mesh=new T.InstancedMesh(geo,material,items.length);mesh.name=name;
  items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);configure(p,i);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color)});
  mesh.computeBoundingSphere();scene.add(mesh);
 }
 const leaf=new T.MeshStandardMaterial({color:0xffffff,roughness:1,side:T.DoubleSide});
 batch('Patchy shoreline grass',bladeGeometry(),grass,leaf,(p,i)=>{dummy.rotation.y=i*2.39996;dummy.scale.set(p.w*3,p.h,p.w*3);color.setHSL(.22+(i%7)*.008,.32,.22+(i%5)*.022)});
 batch('Cattail leaves',bladeGeometry(),reed,leaf.clone(),(p,i)=>{dummy.rotation.y=i*2.39996;dummy.scale.set(.30,p.h*.93,.30);color.setHSL(.22+(i%5)*.012,.39,.25+(i%3)*.035)});
 batch('Cattail stems',new T.CylinderGeometry(1,1,1,5),reed,leaf.clone(),(p,i)=>{dummy.position.y+=p.h*.5;dummy.scale.set(.012,p.h,.012);color.setHex(0x6c783f)});
 batch('Cattail seed heads',new T.CylinderGeometry(1,1,1,7),reed,leaf.clone(),(p,i)=>{dummy.position.y+=p.h*.88;dummy.scale.set(p.w*.65,p.h*.19,p.w*.65);color.setHex(i%3===0?0x62472c:0x795535)});
 return {grass:grass.length,cattails:reed.length,drawCallsMax:4,seed:73193};
}
