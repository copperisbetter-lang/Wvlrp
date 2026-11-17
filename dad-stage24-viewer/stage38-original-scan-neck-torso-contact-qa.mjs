// Stage37 public-only synthetic runtime QA. Uses NO private Dad mesh or scan.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
const src=readFileSync(new URL('./stage38-real-neck-and-shoulder-surface-contacts.js',import.meta.url),'utf8');
const {realOriginalScanEdge,clipNativeG9ToActualDadScanEdge,measureNativeSurfaceContact,attemptTrueScanEdgeDonorOnlyFit}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const N=72,skin=new THREE.Skeleton([new THREE.Bone()]),scene=new THREE.Scene();
function cylinder(r,baseY,topY,skinName){
 const pos=[],norm=[],uv=[],skinIndex=[],skinWeight=[],idx=[];
 for(let h=0;h<2;h++)for(let i=0;i<N;i++){
  const theta=2*Math.PI*i/N,x=r*Math.cos(theta),z=-.034+r*Math.sin(theta);
  const y=h===0?baseY(theta):topY(theta);
  pos.push(x,y,z);norm.push(Math.cos(theta),0,Math.sin(theta));
  uv.push(i/N,h);skinIndex.push(0,0,0,0);skinWeight.push(1,0,0,0);
 }
 for(let i=0;i<N;i++){
  const j=(i+1)%N;
  idx.push(i,j,N+j,i,N+j,N+i);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));
 g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
 g.setIndex(idx);g.computeBoundingBox();g.computeBoundingSphere();
 const mesh=new THREE.SkinnedMesh(g,new THREE.MeshStandardMaterial({color:0xb9a38a}));
 mesh.name=skinName;
 mesh.bind(skin,new THREE.Matrix4());mesh.bindMode='detached';
 scene.add(mesh);mesh.updateMatrixWorld(true);
 return mesh;
}
const originalDad=cylinder(.104,t=>1.5+.015*Math.sin(t+.4),()=>1.72,'Synthetic_Dad_Scan');
const nativeG9=cylinder(.095,()=>1.44,()=>1.54,'Synthetic_Native_G9_Neck');
const nativeTorso=cylinder(.11,()=>1.38,()=>1.52,'Synthetic_Unmodified_G9_Torso_Sides');
const scanOriginal=originalDad.geometry,neckOriginal=nativeG9.geometry,torsoOriginal=nativeTorso.geometry;
const outline=realOriginalScanEdge([originalDad],THREE,{x:0,z:-.034});
assert.equal(outline.stats.scannedLowerEdgeVertices,N);
assert.equal(originalDad.geometry,scanOriginal);
const trimmed=clipNativeG9ToActualDadScanEdge(nativeG9,outline.loop,THREE);
assert(trimmed.stats.G9partiallyCutFaces>14);
assert(trimmed.stats.G9fullyRemovedFaces>=0);
assert.equal(nativeG9.geometry,neckOriginal,'Native donor geometry must remain unchanged while measuring');
const parser={associations:new WeakMap([[originalDad,{meshes:0,primitives:0}],[nativeG9,{meshes:1,primitives:4}],[nativeTorso,{meshes:1,primitives:5}]])};
const fit={cutoffY:1.528,restoredNeck:{mesh:nativeG9}};
const model={scene,parser};
const result=attemptTrueScanEdgeDonorOnlyFit(fit,model,THREE);
assert.equal(result.stats.originalScannedHeadUntouched,true);
assert.equal(result.stats.originalG9TorsoUntouched,true);
assert.equal(result.stats.headMovedOrResized,false);
assert.equal(originalDad.geometry,scanOriginal,'Original Dad scanned geometry changed');
assert.notEqual(nativeG9.geometry,neckOriginal,'Real native donor cut did not apply');
assert(result.stats.donorSurfaceContactMM.p95MM<25,'Authentic-source edge and trimmed G9 should be near');
assert(result.stats.donorSurfaceContactMM.maxMM<38);
assert(result.stats.bridgeTriangles>0,'Open seam not bridged');
assert.equal(nativeTorso.geometry,torsoOriginal,'Native torso was modified!');
assert.equal(result.stats.donorSurfaceContactMM.scans,N,'One donor surface contact per original scanned border vertex required');
result.restore();
assert.equal(nativeTorso.geometry,torsoOriginal,'Native torso changed on undo!');
assert.equal(originalDad.geometry,scanOriginal,'Original approved head was changed on restore');
assert.equal(nativeG9.geometry,neckOriginal,'Undo did not restore original G9 neck geometry');
assert.equal(scene.getObjectByName('DAD_STAGE38_REAL_136_SCAN_EDGE_TO_EXISTING_G9_CONTACT_SURFACES'),undefined,'Stitched trial not removed');
console.log('PASS Stage38: original 72-point scan ring untouched, genuine G9 neck clipped along varying Y(angle), small measured 3D gap bridged, full Undo restores native donor.');
