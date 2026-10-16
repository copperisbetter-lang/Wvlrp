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
  const legacy=JSON.parse(file("../assets/building/building-sources.json"));
  const hd=JSON.parse(file("../assets/building/hd-building-downloads.json")).materials;
  for(const id of [s.walls,s.door,s.roof,"mossy_stone_wall",
    "wood_planks","weathered_planks","stacked_stone_wall"]){
    const asset=hd.find(x=>x.id===id);
    assert.ok(asset,id+" must exist in new material-yard downloads");
    assert.equal(asset.license,"CC0");
    for(const kind of ["diffuse","normal","arm"]){
      assert.ok(asset.maps[kind].file.includes(id+"_"+kind+"_2k.jpg"));
      assert.ok(asset.maps[kind].bytes>30000);
    }
  }
  for(const id of [s.door,s.roof,"mossy_stone_wall"]){
    assert.ok(legacy.find(x=>x.id===id)?.resolutions?.["1k"]);
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

test("ranger window renovation uses slim sash and individual narrow shutter louvers",()=>{
  const script=file("../wild-ranger-station.js");
  assert.match(script,/shutter angled narrow timber louver/);
  assert.match(script,/const slats=12/);
  assert.match(script,/shutter slim weathered vertical stile/);
  assert.match(script,/small black iron shutter hinge leaf/);
  assert.match(script,/window single slender vertical muntin/);
  assert.match(script,/window single slender horizontal muntin/);
  assert.match(script,/clear window glass/);
  assert.doesNotMatch(script,/shutter raised plank|window sash crossing|working slatted shutter/);
});

test("ranger desk remains clear of the former full-height chimney shaft",()=>{
  const script=file("../wild-ranger-station.js");
  assert.doesNotMatch(script,/box\("lodge fieldstone chimney main shaft"/);
  assert.doesNotMatch(script,/box\("lodge chimney corbel"/);
  assert.doesNotMatch(script,/box\("lodge iron flue cover"/);
  assert.match(script,/continuous L desk FRONT wing facing south entrance/);
  assert.match(script,/continuous L desk SIDE return projecting from rear wall/);
  assert.match(script,/const chairX=X\+7\.05,chairZ=Z\+4\.72/);
  assert.match(script,/const frontDeskX=X\+6\.50,frontDeskZ=Z\+2\.70/);
  assert.match(script,/const returnDeskX=X\+4\.85,returnDeskZ=Z\+4\.19/);
  assert.match(file("../walk.js"),/ranger-chair-corner-entry-facing-20261015-v6/);
  assert.match(file("../wild-flatland-rebuild.js"),/ranger-chair-corner-entry-facing-20261015-v6/);
  assert.match(file("../walk.html"),/ranger-chair-corner-entry-facing-20261015-v6/);
  assert.match(script,/ranger chair backrest at rear toward wall/);
  assert.match(script,/full round hardwood porch column/);
});
