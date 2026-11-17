// Stage40 PUBLIC SYNTHETIC runtime QA — no protected source / no private key.
// It verifies real topology clipping, new edge contact, untouched originals,
// 4-row patch and full Undo. It is NOT a Samsung visual acceptance test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
const code=readFileSync(new URL('./stage40-measured-scan-rim-resection.js',import.meta.url),'utf8');
const {realOriginalScanEdge,attemptStage40ScanRimResection}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const N=72,skeleton=new THREE.Skeleton([new THREE.Bone()]),scene=new THREE.Scene();
function cylinder(r,baseY,topY,name,rings=2){
 const pos=[],norm=[],uv=[],skinIndex=[],skinWeight=[],idx=[];
 for(let h=0;h<rings;h++)for(let i=0;i<N;i++){
  const theta=2*Math.PI*i/N,t=h/(rings-1),x=r*Math.cos(theta),z=-.034+r*Math.sin(theta);
  pos.push(x,baseY(theta)*(1-t)+topY(theta)*t,z);
  norm.push(Math.cos(theta),0,Math.sin(theta));uv.push(i/N,t);
  skinIndex.push(0,0,0,0);skinWeight.push(1,0,0,0);
 }
 for(let h=0;h<rings-1;h++)for(let i=0;i<N;i++){
  const j=(i+1)%N,a=h*N+i,b=h*N+j,c=(h+1)*N+j,d=(h+1)*N+i;
  idx.push(a,b,c,a,c,d);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));
 g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
 g.setIndex(idx);g.computeBoundingBox();g.computeBoundingSphere();
 const mesh=new THREE.SkinnedMesh(g,new THREE.MeshStandardMaterial({color:0xb9a38a}));
 mesh.name=name;mesh.bind(skeleton,new THREE.Matrix4());mesh.bindMode='detached';
 scene.add(mesh);mesh.updateMatrixWorld(true);return mesh;
}
const head=cylinder(.104,t=>1.5+.009*Math.sin(t+.4),()=>1.72,'Synthetic_Original_Scanned_Head',12);
const nativeNeck=cylinder(.095,()=>1.44,()=>1.54,'Synthetic_Genuine_Neck');
const torso=cylinder(.11,()=>1.38,()=>1.52,'Synthetic_Unmodified_G9_Torso');
const originalHead=head.geometry,originalMaterial=head.material,originalNeck=nativeNeck.geometry,originalTorso=torso.geometry;
const outline=realOriginalScanEdge([head],THREE,{x:0,z:-.034});
assert.equal(outline.stats.scannedLowerEdgeVertices,N);
const parser={associations:new WeakMap([[head,{meshes:0,primitives:0}],[nativeNeck,{meshes:1,primitives:4}],[torso,{meshes:1,primitives:5}]])};
const fit={cutoffY:1.528,restoredNeck:{mesh:nativeNeck}};
const model={scene,parser};
const res=attemptStage40ScanRimResection(fit,model,THREE);
assert.equal(res.stats.stage,40);
assert.equal(res.stats.originalDadFaceBeardAndUpperNeckRetained,true);
assert.equal(res.stats.originalGen9TorsoGeometryUnchanged,true);
assert.equal(res.stats.originalSourceGLBUnchanged,true);
assert(res.stats.newCut.resectionDepthMM>=14);
assert(res.stats.newCut.removedWholeTriangles>10);
assert(res.stats.newCut.newRimVertices>=40);
assert(res.stats.newCut.cutTriangles>20);
assert.equal(res.stats.scannedHeadBoundary.scannedLowerEdgeVertices,N);
assert(res.stats.seam.patchTriangles>=res.stats.seam.newScanRimVertices*6);
assert.equal(res.stats.seam.stitchRows,4);
assert.equal(res.stats.seam.watertightWeldCertified,false);
assert.equal(res.stats.donorSurfaceContactMM.scans,res.stats.seam.newScanRimVertices);
assert.notEqual(head.geometry,originalHead);
assert.notEqual(nativeNeck.geometry,originalNeck);
assert.equal(torso.geometry,originalTorso);
assert.equal(head.material,originalMaterial);
const patch=scene.getObjectByName('DAD_STAGE40_RESECTED_REAL_SCAN_TO_NATIVE_G9_MULTIRING_CONTACT');
assert(patch && patch.isSkinnedMesh);
assert(patch.geometry.getAttribute('position').count/3===res.stats.seam.patchTriangles);
const upperPos=originalHead.attributes.position;
const top=nativeNeck.geometry.getAttribute('position');
assert(top.count>0);
for(let i=0;i<N;i++)assert(Math.abs(upperPos.getY((12-1)*N+i)-1.72)<1e-6,'Source upper original head must stay unchanged');
res.restore();
assert.equal(head.geometry,originalHead,'Undo did not restore original scanned head');
assert.equal(head.material,originalMaterial,'Undo did not restore original scan material');
assert.equal(nativeNeck.geometry,originalNeck,'Undo did not restore native neck');
assert.equal(torso.geometry,originalTorso,'Undo modified real G9 torso');
assert.equal(scene.getObjectByName('DAD_STAGE40_RESECTED_REAL_SCAN_TO_NATIVE_G9_MULTIRING_CONTACT'),undefined);
console.log('PASS Stage40: synthetic original 72-point scan; resected real connected lower surface; new contour fitted to donor; multirow seam; preserved head/torso sources; full Undo.');
