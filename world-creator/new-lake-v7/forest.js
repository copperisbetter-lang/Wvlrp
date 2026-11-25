// Low-cost, layered 3D woodland, not a photographic perimeter wall.
// All decorative trees are noncolliding; playable terrain boundary is unchanged.
export function plantForest(T,scene,L,P){
 let seed=48291;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const N=L.N,trees=[],TAU=Math.PI*2;
 for(let i=0;i<N;i+=2){
  const cliff=i>=L.cliffStart+11&&i<=L.cliffEnd-11,shoulder=i>=L.cliffStart-8&&i<=L.cliffEnd+8;
  const beach=i>=45&&i<=83;
  const crest=L.rings[i].at(-1),r=Math.hypot(...L.shore[i]),edge=Math.hypot(crest[0],crest[2]);
  for(let j=0;j<(cliff?3:beach?4:8);j++){
   const a=(i+(rng()-.5)*1.7)/N*TAU;
   const rr=cliff?edge+1+rng()*15:edge-(beach?10:35)*rng()+rng()*11;
   const x=Math.cos(a)*rr,z=Math.sin(a)*rr;
   if(!cliff&&rr<r+20)continue;
   const gy=P.ground(x,z),y=gy===null?crest[1]-.7-rng()*1.6:gy;
   trees.push({x,y,z,h:(cliff?6:8)+rng()*8,w:2+rng()*2.8,rot:rng()*TAU,shade:rng()});
  }
 }
 // Fill nonplayable outer scenery with terrain skirts under the back rows of trees.
 const pos=[],ix=[];
 for(let i=0;i<=N;i++){let k=i%N,a=k/N*TAU,crest=L.rings[k].at(-1),r=Math.hypot(crest[0],crest[2]),cliff=k>=L.cliffStart&&k<=L.cliffEnd;
  for(let j=0;j<3;j++){let d=[0,25,65][j],h=crest[1]+(j===0?-.08:j===1?2+3*Math.sin(a*7):3+7*Math.sin(a*5+.5));if(cliff)h=crest[1]+(j===0?-.08:j===1?-1:-5);pos.push((r+d)*Math.cos(a),h,(r+d)*Math.sin(a))}}
 for(let i=0;i<N;i++)for(let j=0;j<2;j++){let a=i*3+j,b=a+3;ix.push(a,b,a+1,b,b+1,a+1)}
 const gg=new T.BufferGeometry();gg.setAttribute('position',new T.Float32BufferAttribute(pos,3));gg.setIndex(ix);gg.computeVertexNormals();
 const skirt=new T.Mesh(gg,new T.MeshStandardMaterial({color:0x405632,roughness:1,side:T.DoubleSide}));scene.add(skirt);
 const trunk=new T.InstancedMesh(new T.CylinderGeometry(1,.9,1,5),new T.MeshStandardMaterial({color:0x76634a,roughness:1}),trees.length);
 const crown=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0xffffff,roughness:1}),trees.length*3);
 const ob=new T.Object3D(),color=new T.Color();
 trees.forEach((p,i)=>{ob.position.set(p.x,p.y+p.h*.42,p.z);ob.rotation.set(0,p.rot,0);ob.scale.set(.15+p.h*.012,p.h*.84,.15+p.h*.012);ob.updateMatrix();trunk.setMatrixAt(i,ob.matrix);
 for(let j=0;j<3;j++){const a=p.rot+j*2.4;ob.position.set(p.x+Math.cos(a)*p.w*.35,p.y+p.h*(.62+j*.12),p.z+Math.sin(a)*p.w*.35);ob.rotation.set(.15*Math.sin(a),a,.12*Math.cos(a));ob.scale.set(p.w*(1-j*.14),p.h*.24,p.w*(.85-j*.08));ob.updateMatrix();crown.setMatrixAt(i*3+j,ob.matrix);color.setHSL(.22+p.shade*.08,.38+p.shade*.12,.18+p.shade*.12+j*.009);crown.setColorAt(i*3+j,color)}});
 trunk.computeBoundingSphere();crown.computeBoundingSphere();scene.add(trunk,crown);return {trees:trees.length,additionalDrawCalls:3};
}