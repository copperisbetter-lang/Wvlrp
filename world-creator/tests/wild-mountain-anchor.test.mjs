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

test("The village plateau gives the Ranger Station an unobstructed mountain view",()=>{
  assert.match(walk,/villageGroundY:cabinGrade\(VILLAGE_CLEARING\.centerX,VILLAGE_CLEARING\.centerZ,seed\)/);
  assert.match(walk,/villageBackZ:VILLAGE_CLEARING\.centerZ\+VILLAGE_CLEARING\.halfDepth\+/);
  assert.match(layout,/backExtension:100,transition:18/);
  assert.match(layout,/isVillageMountainSightline/);
  assert.match(layout,/isCommunityClearing/);
  assert.match(layout,/markerX:93,markerZ:77/);
});


test("The real game mountain has exposed cliff above the back of the village",()=>{
  assert.match(walk,/installVisibleVillageMountains\(B,scene,camera/);
  assert.match(stage,/surface\("BACK Appalachian blue-green mountain ridge",245/);
  assert.match(stage,/surface\("VISIBLE sunlit rocky cliff above Ranger Station",176/);
  assert.match(stage,/const alpha=clamp\(\(153-dz\)\/30,0,1\)/);
  assert.match(layout,/!isVillageMountainSightline\(x,z\)/);
});
