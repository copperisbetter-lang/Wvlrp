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
  assert.match(walk,/FreeCamera\("first person at Hearthside"/);
  assert.match(walk,/camera\.rotation\.set\(0,Math\.PI,0\)/);
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
  assert.match(walk,/resetToWildCabin\(world\)/);
  assert.match(walk,/buildHearthsideCabin\(/);
  assert.match(walk,/\.\/assets\/riley-rigged-v1\.glb/);
  assert.match(walk,/\.\/assets\/sav-realistic-shell\.glb/);
  assert.match(walk,/B\.SceneLoader\.ImportMeshAsync/);
  assert.doesNotMatch(walk,/makeFigureBuilder\(/);
});
