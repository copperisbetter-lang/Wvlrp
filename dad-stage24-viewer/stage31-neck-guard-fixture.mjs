// Stage31 regression: a 972-source-triangle neck may yield 1028 clipped output triangles.
// Synthetic geometry ONLY. No Dad scan, private access key, encrypted file or model copied.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./stage28-recover-original-g9-neck.js',import.meta.url),'utf8');
const {clipToShortNeck}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
class Attribute {
  constructor(values,itemSize){this.array=Float32Array.from(values);this.itemSize=itemSize;this.count=this.array.length/itemSize;}
  getComponent(i,j){return this.array[i*this.itemSize+j];}
  getY(i){return this.getComponent(i,1);}
}
class Geometry {
  constructor(){this.attributes={};}
  setAttribute(key,a){this.attributes[key]=a;return this;}
  getAttribute(key){return this.attributes[key];}
  computeBoundingBox(){}
  computeBoundingSphere(){}
}
const THREE={BufferGeometry:Geometry,Uint16BufferAttribute:Attribute,Float32BufferAttribute:Attribute};
const pts=[],normals=[],uvs=[];
for(let t=0;t<972;t++){
  const x=(t%100)*.001;
  const ys=t<916?[0,0,0]:[0,0,2];
  pts.push(x,ys[0],0,x+.0002,ys[1],0,x+.0001,ys[2],.0002);
  normals.push(0,1,0,0,1,0,0,1,0);
  uvs.push(0,0,1,0,.5,1);
}
const input=new Geometry().setAttribute('position',new Attribute(pts,3)).setAttribute('normal',new Attribute(normals,3)).setAttribute('uv',new Attribute(uvs,2));
const indices=Uint32Array.from({length:972*3},(_,i)=>i);
const output=clipToShortNeck(input,indices,1,THREE);
assert.equal(output.stats.originalNativeNeckFaces,972);
assert.equal(output.stats.remainingNativeFaces,1028,'crossing original triangles split into two output faces');
assert.equal(output.stats.partiallyClippedNativeFaces,56);
assert.equal(output.stats.cutNativeFaces,0);
assert.equal(output.geometry.getAttribute('position').count,1028*3);
for(let i=0;i<output.geometry.getAttribute('position').count;i++)
  assert(output.geometry.getAttribute('position').getY(i)<=1.000001,'no output vertex above cut plane');
assert.throws(()=>clipToShortNeck(input,indices,3,THREE),/could not be cut/, 'no actual cut must fail');
assert.throws(()=>clipToShortNeck(input,indices,-1,THREE),/could not be cut/, 'remove-all cut must fail');
console.log('PASS: 972 genuine source triangles -> 1028 clipped triangles; plane enforced; no-cut and empty-cut cases rejected.');
