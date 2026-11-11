import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../base-camp/stacey-realistic-clouds.js', import.meta.url), 'utf8');
const game = readFileSync(new URL('../base-camp/stacey-dive.html', import.meta.url), 'utf8');
const {installStaceyRealisticClouds} = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));

class Vec3 {
  constructor(x=0,y=0,z=0) { this.x=x; this.y=y; this.z=z; }
  clone() {return new Vec3(this.x,this.y,this.z);}
  normalize() {return this;}
  copy(v) {this.x=v.x;this.y=v.y;this.z=v.z;return this;}
}
class ShaderMaterial {
  constructor(options) {Object.assign(this,options);}
  dispose() {this.disposed=true;}
}
class SphereGeometry {
  constructor(...args) {this.args=args;}
  dispose() {this.disposed=true;}
}
class Mesh {
  constructor(geometry,material) {
    this.geometry=geometry;this.material=material;
    this.position=new Vec3();this.userData={};
  }
}
const T={ShaderMaterial,SphereGeometry,Mesh,BackSide:1};
const previousLocation=globalThis.location;
function setup(search,mobile=true) {
  globalThis.location={search};
  const objects=[];
  const scene={add:(x)=>objects.push(x),remove:(x)=>{const i=objects.indexOf(x);if(i>=0)objects.splice(i,1)}};
  const camera={position:new Vec3(140,5,-240)};
  const sunlight=new Vec3(-0.48,0.57,-0.66);
  const diagnostics={assets:{}};
  const clouds=installStaceyRealisticClouds(T,scene,{camera,sunDirection:sunlight,mobile,diagnostics});
  return {clouds,scene,objects,camera,diagnostics};
}

test('only opt-in ?clouds=on creates the cloud scene layer',()=>{
  const off=setup('?spawn=lake');
  assert.equal(off.objects.length,0);
  assert.equal(off.clouds.status.state,'disabled');
  const on=setup('?spawn=lake&clouds=on');
  assert.equal(on.objects.length,1);
  assert.equal(on.clouds.status.samples,3);
  assert.match(on.objects[0].material.fragmentShader,/noise3/);
  assert.equal(on.objects[0].userData.nonColliding,true);
  on.clouds.dispose();
  assert.equal(on.objects.length,0);
  globalThis.location=previousLocation;
});

test('mobile low mode uses two samples and update follows player camera',()=>{
  const {clouds,objects,camera}=setup('?clouds=low');
  assert.equal(clouds.status.samples,2);
  camera.position.x=201;
  clouds.update(10,camera,new Vec3(0,1,0));
  assert.equal(objects[0].position.x,201);
  assert.equal(objects[0].material.uniforms.uTime.value,10);
  clouds.dispose();
  globalThis.location=previousLocation;
});

test('feature-branch game integrates sky clouds without demo balls/grid',()=>{
  assert.match(game,/import \{installStaceyRealisticClouds\}/);
  assert.match(game,/staceyCloudTest\.update\(/);
  assert.match(game,/staceyForest360=installStaceyForest360Wrap/);
  assert.doesNotMatch(source,/GridHelper|0xff00ff|0x00ff00|sphereRed|green ball/i);
});
