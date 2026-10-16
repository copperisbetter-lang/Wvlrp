import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  NORTH_RANGER_STATION,rangerVisibleInTile,rangerWallCollision
} from "../wild-ranger-station.js";
const file=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("wide 360-inspired Ranger Station stays exactly 350m north of Hearthside",()=>{
  const s=NORTH_RANGER_STATION;
  assert.deepEqual([s.x,s.z],[0,350]);
  assert.equal(s.panelsWide,6);
  assert.equal(s.panelsDeep,4);
  assert.equal(s.panelMetres,3);
  assert.equal(s.width,18);
  assert.equal(s.depth,12);
  assert.equal(s.entryWidth,2.8);
  assert.equal(s.front,"south");
});
test("only tiles near the station render it, and station perimeter stops walking",()=>{
  assert.equal(rangerVisibleInTile(0,350),true);
  assert.equal(rangerVisibleInTile(0,0),false);
  assert.equal(rangerVisibleInTile(93,85),false);
  assert.equal(rangerVisibleInTile(0,268),true);
  assert.equal(rangerVisibleInTile(0,259),false);
  assert.equal(rangerWallCollision(0,350),false);
  assert.equal(rangerWallCollision(0,344),false); // open main door
  assert.equal(rangerWallCollision(3,344),true);  // solid front wall
  assert.equal(rangerWallCollision(9,350),true);  // solid east wall
  assert.equal(rangerWallCollision(0,356),true);  // solid rear wall
  assert.equal(rangerWallCollision(0,337),false); // open stair approach
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

test("new lodge has a proper portico, full porch and recognizable indoor ranger room",()=>{
  const script=file("../wild-ranger-station.js");
  assert.match(script,/projecting central lodge gable|center cross gable|portico/i);
  assert.match(script,/RANGER STATION/);
  assert.match(script,/bulletin board|VISITOR BOARD/i);
  assert.match(script,/six-monitor|monitorLabels/);
  assert.match(script,/desk|radio|report sheet|wall field map/i);
  assert.match(script,/assets\/building/);
});
