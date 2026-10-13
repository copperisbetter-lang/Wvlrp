import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {wildPeerDirection,wildPlayerMapViewport} from "../wild-player-map.js";

const file=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const walk=file("../walk.js");
const html=file("../walk.html");
const net=file("../wild-multiplayer.js");

test("Distance and cardinal direction are computed from shared game X/Z",()=>{
  assert.deepEqual(wildPeerDirection({x:0,z:0},{x:0,z:207}),
    {metres:207,degrees:0,cardinal:"N"});
  assert.equal(wildPeerDirection({x:0,z:0},{x:207,z:0}).cardinal,"E");
  assert.equal(wildPeerDirection({x:0,z:0},{x:-207,z:0}).cardinal,"W");
  assert.equal(wildPeerDirection({x:0,z:0},{x:0,z:-207}).cardinal,"S");
  assert.equal(wildPeerDirection({x:93,z:45},{x:93,z:45}).metres,0);
});
test("Map fits local and distant visitors beyond 190m avatar render limit",()=>{
  const points=[{x:93,z:45},{x:-170,z:115},{x:800,z:520}];
  const frame=wildPlayerMapViewport(points);
  for(const p of points){
    assert.ok(Math.abs(p.x-frame.x)<=frame.halfSpan);
    assert.ok(Math.abs(p.z-frame.z)<=frame.halfSpan);
  }
});
test("Beta game map uses WebRTC live coordinates and never tracks GPS",()=>{
  assert.match(walk,/createWildPlayerMap\(/);
  assert.match(walk,/getPeers:\(\)=>multiplayer\?\.getPeerPositions\?\.\(\)/);
  assert.match(walk,/playerMap\?\.update\(performance\.now\(\)\)/);
  assert.match(net,/getPeerPositions:\(\)=>\[\.\.\.peers\.entries\(\)\]/);
  assert.match(html,/id="playerMapToggle"/);
  assert.match(html,/id="playerMapCanvas"/);
  assert.match(html,/id="playerMapContacts"/);
  assert.doesNotMatch(file("../wild-player-map.js"),/navigator\.geolocation|sendBeacon|localStorage/);
});
