import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const mountain=readFileSync(new URL("../wild-mountain-backdrop.js",import.meta.url),"utf8");
const walk=readFileSync(new URL("../walk.js",import.meta.url),"utf8");
const layout=readFileSync(new URL("../wild-reference-layout.js",import.meta.url),"utf8");

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
  assert.match(layout,/backExtension:40,transition:15/);
  assert.match(layout,/isVillageMountainSightline/);
  assert.match(layout,/isCommunityClearing/);
  assert.match(layout,/markerX:93,markerZ:77/);
});
