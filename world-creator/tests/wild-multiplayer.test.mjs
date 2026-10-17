import {readFileSync} from "node:fs";
import {strict as assert} from "node:assert";
import test from "node:test";
import {normalizeWildPose,wildVisitorColor} from "../wild-multiplayer-protocol.js";
const read=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");
const home=read("../../index.html");
const portal=read("../../adventure-portal.html");
const walk=read("../walk.js");
const view=read("../walk.html");
const network=read("../wild-multiplayer.js");

test("Homepage Adventures entry stays accessible while beta portal remains available",()=>{
  assert.match(home,/href="adventures\.html"/);
  assert.match(portal,/Game Beta Test/);
  assert.match(portal,/Game Beta Test/);
  assert.match(portal,/world-creator\/walk\.html\?mode=beta&amp;spawn=ranger/);
  assert.match(portal,/Original 360° World/);
  assert.match(portal,/href="adventures\.html"/);
});
test("Game beta keeps first person, walk controls and resident avatars untouched",()=>{
  assert.match(walk,/FreeCamera\("first-person explorer"/);
  assert.match(walk,/BETA_MODE=betaParams\.get\("mode"\)==="beta"/);
  assert.match(walk,/multiplayer\?\.update\(dt\)/);
  assert.match(walk,/buildHearthsideCabin\(/);
  assert.match(walk,/B\.SceneLoader\.ImportMeshAsync/);
  assert.match(view,/id="joystick"/);
  assert.match(view,/id="players"/);
});
test("Remote explorers use separate peers, position packets and an explicit leave",()=>{
  assert.match(network,/joinRoom\(/);
  assert.match(network,/makeAction\("pose"\)/);
  assert.match(network,/onPeerJoin/);
  assert.match(network,/onPeerLeave/);
  assert.match(network,/setEnabled\(distance<190\)/);
  assert.match(network,/room\.leave\(\)/);
  assert.match(network,/makeExplorer\(B,scene,peerId\)/);
});
test("Reject malformed WebRTC packets before rendering another player",()=>{
  assert.equal(normalizeWildPose(null),null);
  assert.equal(normalizeWildPose({v:1,x:"93",z:45,yaw:0}),null);
  assert.equal(normalizeWildPose({v:1,x:Infinity,z:45,yaw:0}),null);
  assert.equal(normalizeWildPose({v:1,x:0,z:0,yaw:NaN}),null);
  assert.equal(normalizeWildPose({v:1,x:1e8,z:0,yaw:0}),null);
  assert.deepEqual(normalizeWildPose({v:1,x:93,z:45,yaw:0}),{x:93,z:45,yaw:0});
});
test("Visitor color is stable and one of five bounded choices",()=>{
  for(const id of ["peer-1","peer-2","peer-3","other-tab"]){
    const result=wildVisitorColor(id);
    assert.equal(result,wildVisitorColor(id));
    assert.ok(result>=0&&result<5);
  }
});
