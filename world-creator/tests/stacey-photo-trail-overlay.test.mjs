// Owner's photo trail surface, source and walk-height regression checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const path=await readFile(new URL('../base-camp/stacey-purple-main-lake-spur.js',import.meta.url),'utf8');
const photo=await readFile(new URL('../base-camp/stacey-woodland-360-photo.js',import.meta.url),'utf8');
test('both approved trails receive the approved original 360 photo',()=>{
  assert.match(path,/applyWoodlandTrail360Photo\(THREE,installed\)/);
  assert.match(photo,/assets\/woodland-trail-hd\.webp/);
  assert.match(photo,/for\(const mesh of meshes\)/);
  assert.match(photo,/mesh\.material\.map=map/);
  assert.match(photo,/THREE\.MirroredRepeatWrapping/);
  assert.match(photo,/fade\.addColorStop/);
});
test('photo tread follows the graded walk collision, without brown tint',()=>{
  assert.match(path,/v\.push\(x,ground\(x,z\)\+\.022,z\)/);
  assert.match(path,/uv\.push\(offset\/2\.6\+\.5,p\.s\/7\.5\)/);
  assert.match(path,/map:soilTexture,color:0xffffff/);
  assert.match(path,/if\(domeClearance\(x,z\)<13\|\|shoreClearance\(x,z\)<61\)return original/);
  assert.match(path,/const routes=\[main,spur\]/);
});
