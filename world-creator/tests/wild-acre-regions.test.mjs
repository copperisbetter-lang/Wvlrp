import test from "node:test";
import assert from "node:assert/strict";
import {
  ACRE_SQUARE_METRES,SECTION_AREA,SECTION_ACRES,PATH_SIDE_METRES,
  PATH_SECTION_LENGTH,WILDERNESS_SIDE,VILLAGE_SECTION,VILLAGE_BUILDINGS_FIT,
  wildSectionAt,wildSectionPreloads,makeWildSectionTracker
} from "../wild-acre-regions.js";

test("Village is one ~3-acre section with all three buildings and the fire pit",()=>{
  assert.equal(SECTION_ACRES,3);
  assert.ok(Math.abs(SECTION_AREA-12140.5692672)<.000001);
  assert.ok(Math.abs(VILLAGE_SECTION.acres-3)<.01);
  assert.equal(VILLAGE_BUILDINGS_FIT,true);
  for(const p of [[93,45],[93,65],[55,110],[93,110],[131,110]]){
    assert.equal(wildSectionAt(...p).id,"village:main");
  }
});
test("30 feet on each side of a trail, with a 3-acre linear segment",()=>{
  assert.equal(PATH_SIDE_METRES,9.144);
  assert.ok(Math.abs(PATH_SECTION_LENGTH-663.852)<.05);
  const x=600,center=18*Math.sin(x/92);
  assert.equal(wildSectionAt(x,center+9.0).kind,"trail");
  assert.equal(wildSectionAt(x,center+9.5).kind,"woods");
});
test("Natural forest trails extend indefinitely, including negative coordinates",()=>{
  for(const x of [-1600,-900,900,1600]){
    const z=18*Math.sin(x/92);
    assert.equal(wildSectionAt(x,z).kind,"trail");
  }
  assert.equal(wildSectionAt(104,190).kind,"trail");
});
test("Crossing a trail segment advances to the next 3-acre section",()=>{
  const z=x=>18*Math.sin(x/92);
  const a=wildSectionAt(650,z(650)),b=wildSectionAt(680,z(680));
  assert.equal(a.kind,"trail");
  assert.equal(b.kind,"trail");
  assert.equal(a.routeId,b.routeId);
  assert.notEqual(a.id,b.id);
});
test("Off-trail chunks occupy precisely 3 acres",()=>{
  assert.ok(Math.abs(WILDERNESS_SIDE**2/ACRE_SQUARE_METRES-3)<1e-9);
  const x=1000,z=1000;
  const a=wildSectionAt(x,z);
  assert.equal(a.kind,"woods");
  assert.ok(x>=a.minX&&x<a.maxX&&z>=a.minZ&&z<a.maxZ);
  const b=wildSectionAt(a.maxX+1,z);
  assert.notEqual(a.id,b.id);
});
test("Village stays loaded while its neighbor is prefetched at the edge",()=>{
  const tracker=makeWildSectionTracker();
  const a=tracker.update(93,65);
  assert.equal(a.changed,true);
  const b=tracker.update(158,85);
  assert.equal(b.changed,false);
  assert.equal(b.section.id,"village:main");
  assert.ok(b.preload.some(s=>s.id!=="village:main"));
});
test("Off-trail loader warms neighbors without replacing the player state",()=>{
  const x=1000,z=1000,cell=wildSectionAt(x,z);
  const warmed=wildSectionPreloads(cell.maxX-2,z,cell);
  assert.ok(warmed.some(s=>s.id!==cell.id));
  const tracker=makeWildSectionTracker();
  tracker.update(x,z);
  const again=tracker.update(x+1,z);
  assert.equal(again.changed,false);
  const beyond=tracker.update(cell.maxX+1,z);
  assert.equal(beyond.changed,true);
  assert.equal(beyond.previous.id,cell.id);
});
test("Invalid coordinates fail safely",()=>{
  assert.throws(()=>wildSectionAt(Infinity,0),/finite/);
  assert.throws(()=>wildSectionAt(0,NaN),/finite/);
});
