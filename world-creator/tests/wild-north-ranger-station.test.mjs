import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  NORTH_RANGER_STATION,rangerVisibleInTile,rangerWallCollision
} from "../wild-ranger-station.js";
const file=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("one new 3x3 Ranger Station stands exactly 350m north of Hearthside",()=>{
  const s=NORTH_RANGER_STATION;
  assert.deepEqual([s.x,s.z],[0,350]);
  assert.equal(s.panelsWide,3);
  assert.equal(s.panelsDeep,3);
  assert.equal(s.panelMetres,3);
  assert.equal(s.width,9);
  assert.equal(s.depth,9);
  assert.equal(s.front,"south");
});
test("only tiles near the station render it, and station perimeter stops walking",()=>{
  assert.equal(rangerVisibleInTile(0,350),true);
  assert.equal(rangerVisibleInTile(0,0),false);
  assert.equal(rangerVisibleInTile(93,85),false);
  assert.equal(rangerVisibleInTile(0,268),true);
  assert.equal(rangerVisibleInTile(0,259),false);
  assert.equal(rangerWallCollision(0,350),false);
  assert.equal(rangerWallCollision(0,345.5),true);
  assert.equal(rangerWallCollision(4.5,350),true);
  assert.equal(rangerWallCollision(0,337),false);
});
test("station uses locally downloaded authenticated Poly Haven texture sets",()=>{
  const s=NORTH_RANGER_STATION;
  const manifest=JSON.parse(file("../assets/building/building-sources.json"));
  for(const id of [s.walls,s.door,s.roof,"mossy_stone_wall"]){
    const asset=manifest.find(x=>x.id===id);
    assert.ok(asset,id+" must exist");
    assert.equal(asset.license,"CC0");
    for(const kind of ["diffuse","normal","arm"]){
      const local=asset.resolutions["1k"][kind];
      assert.ok(local.includes(id+"_"+kind+"_1k"));
      const localFile=file("../"+local.replace("./",""));
      assert.ok(localFile.length>30000,"missing local "+kind+" texture");
    }
  }
});
test("real building installed into active landscape instead of retired village code",()=>{
  const renderer=file("../wild-flatland-rebuild.js");
  const walk=file("../walk.js");
  assert.match(renderer,/buildNorthRangerStation\(B,scene,track/);
  assert.match(renderer,/communityBuildings:buildings/);
  assert.match(walk,/rangerWallCollision\(x,z\)/);
  assert.match(walk,/tileZ:NORTH_RANGER_STATION.z/);
});
