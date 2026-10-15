import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const mountain=readFileSync(new URL("../wild-mountain-backdrop.js",import.meta.url),"utf8");
const walk=readFileSync(new URL("../walk.js",import.meta.url),"utf8");
const layout=readFileSync(new URL("../wild-reference-layout.js",import.meta.url),"utf8");
const stage=readFileSync(new URL("../wild-visible-mountain-stage.js",import.meta.url),"utf8");

test("The visible mountain is fixed behind the real 3D village, not behind a moving camera",()=>{
  assert.match(mountain,/vistaWall\.position\.set\(villageX,villageGroundY\+13,villageBackZ\)/);
  assert.match(mountain,/solidCliff\.position\.set\(villageX\+5,villageGroundY-27,villageBackZ\+5\)/);
  assert.doesNotMatch(mountain,/camera\.position\.z\+200/);
  assert.doesNotMatch(mountain,/camera\.position\.z\+174/);
  assert.match(mountain,/vistaWall\.checkCollisions=false/);
  assert.match(mountain,/solidCliff\.checkCollisions=false/);
});

test("Mountain source geometry is retained for future reintroduction",()=>{
  assert.match(layout,/backExtension:100,transition:18/);
  assert.match(layout,/isVillageMountainSightline/);
  assert.match(stage,/installVisibleVillageMountains/);
  assert.match(stage,/const meshes=\[\],materials=\[\],textures=\[\]/);
});
test("Clean photographic scene has no old blocky mountain layers",()=>{
  assert.doesNotMatch(walk,/installWildMountainBackdrop\(B,scene,camera/);
  assert.doesNotMatch(walk,/installVisibleVillageMountains\(B,scene,camera/);
  assert.match(walk,/const villageMountains=\{meshes:\[\]\}/);
});
