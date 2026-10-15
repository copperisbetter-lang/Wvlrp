import {readFileSync} from "node:fs";
import {strict as assert} from "node:assert";
import test from "node:test";
const page=readFileSync(new URL("../walk.html",import.meta.url),"utf8");
const walk=readFileSync(new URL("../walk.js",import.meta.url),"utf8");
const studio=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("Dedicated first-person page launches at Hearthside and has a lower-left thumb joystick",()=>{
  assert.match(page,/id="world"/);
  assert.match(page,/id="joystick"/);
  assert.match(page,/#joystick\{position:fixed;z-index:9;left:/);
  assert.match(page,/id="stick"/);
  assert.match(walk,/FreeCamera\("first-person explorer"/);
  assert.match(walk,/START_AT_RANGER\?0:Math\.PI/);
  assert.match(studio,/walk\.html\?v=/);
});
test("Walking uses thumb movement, touch-look, WASD and terrain-following eye height",()=>{
  assert.match(walk,/joystick\.addEventListener\("pointerdown"/);
  assert.match(walk,/canvas\.addEventListener\("pointermove"/);
  assert.match(walk,/camera\.position\.x\+dx/);
  assert.match(walk,/cameraGround\(camera\.position\.x,camera\.position\.z\)/);
  assert.match(walk,/keys\.has\("w"\)/);
  assert.match(walk,/Math\.abs\(camera\.position\.x-tileCx\)/);
  assert.match(walk,/renderWildLandscape\(B,scene,tracked/);
});
test("First-person cabin preserves real resident models with no blob replacement",()=>{
  assert.match(walk,/gatherCabinCrew\(world\)/);
  assert.match(walk,/buildHearthsideCabin\(/);
  assert.match(walk,/\.\/assets\/riley-rigged-v1\.glb/);
  assert.match(walk,/\.\/assets\/sav-realistic-shell\.glb/);
  assert.match(walk,/B\.SceneLoader\.ImportMeshAsync/);
  assert.doesNotMatch(walk,/makeFigureBuilder\(/);
});

test("Double tapping the joystick center switches between running and walking",()=>{
  assert.match(walk,/DOUBLE_TAP_MS=800,CENTER_TAP_RADIUS=27,CENTER_TAP_MAX_MS=500/);
  assert.match(walk,/betaParams\.get\("lite"\)==="1"/);
  assert.match(walk,/setRunMode\(!runMode\)/);
  assert.match(walk,/runMode\|\|keys\.has\("shift"\)\?9\.5:5\.7/);
  assert.match(page,/#joystick\.running/);
  assert.match(page,/Double-tap stick center: run \/ walk/);
});

test("Joystick steering turns the camera toward the movement vector, not sideways",()=>{
  assert.match(walk,/moveReferenceHeading=camera\.rotation\.y/);
  assert.match(walk,/moveReferenceHeading\+Math\.atan2\(side,f\)/);
  assert.match(walk,/START_AT_RANGER\?0:Math\.PI/);
  assert.match(walk,/const dx=Math\.sin\(yaw\)\*pace,dz=Math\.cos\(yaw\)\*pace/);
  assert.match(walk,/else moveReferenceHeading=null/);
  assert.match(page,/Left thumb: steer & move/);
});
test("Cabin-only rebuild retains cabin, characters and streaming but no scenery",()=>{
  assert.match(walk,/communityFirePits:0/);
  assert.match(walk,/const villageMountains=\{meshes:\[\]\}/);
  assert.match(walk,/renderWildLandscape\(B,scene,tracked/);
  assert.match(walk,/buildHearthsideCabin\(/);
});
