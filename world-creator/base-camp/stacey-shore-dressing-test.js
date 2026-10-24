import {STACEY,shoreRadius,islandRadius} from './stacey-lake-v3.js';
// Reusable shoreline dressing; isolated from terrain and trail geometry.
export function installShoreDressing(THREE,scene){
 const rockMat=new THREE.MeshStandardMaterial({color:0x777d70,roughness:.96});
 const mossMat=new THREE.MeshStandardMaterial({color:0x506c43,roughness:1});
 const reedMat=new THREE.MeshStandardMaterial({color:0x637d3f,roughness:1,side:THREE.DoubleSide});
 const stalkMat=new THREE.MeshStandardMaterial({color:0x74834b,roughness:1});
 const headMat=new THREE.MeshStandardMaterial({color:0x58422a,roughness:1});
 const rockGeo=new THREE.DodecahedronGeometry(1,0);
 const leafGeo=new THREE.ConeGeometry(.14,1.7,3);
 const stalkGeo=new THREE.CylinderGeometry(.022,.027,1.55,4);
 const headGeo=new THREE.CylinderGeometry(.075,.075,.35,5);
 const meshes=[];
 let seed=17023;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const rockCount=220,reedCount=165;
 const rock=new THREE.InstancedMesh(rockGeo,rockMat,rockCount),moss=new THREE.InstancedMesh(rockGeo,mossMat,rockCount);
 const leaves=new THREE.InstancedMesh(leafGeo,reedMat,reedCount*3);
 const stalks=new THREE.InstancedMesh(stalkGeo,stalkMat,reedCount),heads=new THREE.InstancedMesh(headGeo,headMat,reedCount);
 const dummy=new THREE.Object3D();let ri=0,li=0,si=0;
 function at(a,offset,inner){const radius=(inner?islandRadius(a):shoreRadius(a))+(inner?offset:-offset);return [STACEY.x+Math.cos(a)*radius,STACEY.z+Math.sin(a)*radius]}
 // Reserve two broad outer-shore access corridors for swimming and trail entry.
 function access(a){const delta=x=>Math.abs(Math.atan2(Math.sin(a-x),Math.cos(a-x)));return delta(-.8)<.17||delta(2.3)<.17}
 for(let k=0;k<rockCount;k++){
  const inner=k%7===0,a=rand()*Math.PI*2;if(!inner&&access(a))continue;
  const [x,z]=at(a,(rand()-.5)*3.2,inner),scale=.22+rand()*.72;
  dummy.position.set(x,STACEY.waterY-.13+scale*.17,z);dummy.rotation.set(rand()*.25,rand()*6.28,rand()*.3);dummy.scale.set(scale*1.7,scale*.48,scale*1.25);dummy.updateMatrix();rock.setMatrixAt(ri,dummy.matrix);
  dummy.position.y+=scale*.28;dummy.scale.set(scale*1.1,scale*.13,scale*.75);dummy.updateMatrix();moss.setMatrixAt(ri,dummy.matrix);ri++;
 }
 for(let k=0;k<reedCount;k++){
  const inner=k%9===0,a=rand()*Math.PI*2;if(!inner&&access(a))continue;
  const [x,z]=at(a,(rand()-.5)*2.5,inner),height=.75+rand()*.7;
  dummy.position.set(x,STACEY.waterY+height*.48-.2,z);dummy.rotation.set(0,rand()*6.28,0);dummy.scale.set(.8,height,.8);dummy.updateMatrix();stalks.setMatrixAt(si,dummy.matrix);
  dummy.position.y=STACEY.waterY+height*1.18-.2;dummy.scale.set(.8,.8,.8);dummy.updateMatrix();heads.setMatrixAt(si,dummy.matrix);
  for(let j=0;j<3;j++){dummy.position.set(x+Math.cos(j*2.094)*.17,STACEY.waterY+.55*height-.18,z+Math.sin(j*2.094)*.17);dummy.rotation.set(0,j*2.094+rand()*.3,.22);dummy.scale.set(.9,height,.9);dummy.updateMatrix();leaves.setMatrixAt(li++,dummy.matrix)}
  si++;
 }
 for(const [mesh,n] of [[rock,ri],[moss,ri],[stalks,si],[heads,si],[leaves,li]]){mesh.count=n;mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;scene.add(mesh);meshes.push(mesh)}
 return {meshes,rockCount:ri,cattailCount:si};
}
