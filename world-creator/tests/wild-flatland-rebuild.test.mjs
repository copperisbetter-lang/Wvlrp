import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  REBUILD_CLEARINGS,REBUILD_CONNECTIONS,REBUILD_PATHS,
  flatlandHeight,isTrailConnected,REBUILD_LAYOUT_VERSION
} from "../wild-rebuild-layout.js";
const file=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("all village, cabin, campsite and overlook reserves connect to the same walking trail graph",()=>{
  assert.equal(REBUILD_CLEARINGS.length,13);
  assert.equal(REBUILD_PATHS.length,18);
  assert.ok(isTrailConnected());
  const ids=new Set(REBUILD_CLEARINGS.map(c=>c.id));
  assert.ok(ids.has("hearthside")&&ids.has("village"));
  for(const [a,b] of REBUILD_CONNECTIONS)assert.ok(ids.has(a)&&ids.has(b));
  const map=new Map(REBUILD_CLEARINGS.map(c=>[c.id,c]));
  for(const route of REBUILD_PATHS){
    const a=map.get(route.from),b=map.get(route.to);
    const first=route.points[0],last=route.points.at(-1);
    assert.deepEqual(first,[a.x,a.z]);
    assert.deepEqual(last,[b.x,b.z]);
  }
  assert.ok(REBUILD_LAYOUT_VERSION.includes("flatland"));
});
test("gentle lowland is continuous around village and protected Hearthside crew cabin",()=>{
  const seed=24681357,base=180;
  assert.ok(Math.abs(flatlandHeight(0,0,seed,base)-base)<.001);
  let smallest=Infinity,tallest=-Infinity,steepest=0;
  for(let x=-470;x<=470;x+=20)for(let z=-450;z<=450;z+=20){
    const a=flatlandHeight(x,z,seed,base);
    const b=flatlandHeight(x+4,z,seed,base);
    const c=flatlandHeight(x,z+4,seed,base);
    smallest=Math.min(smallest,a);tallest=Math.max(tallest,a);
    steepest=Math.max(steepest,Math.abs(a-b)/4,Math.abs(a-c)/4);
  }
  assert.ok(tallest-smallest<15,"Old steep ridges have returned");
  assert.ok(steepest<.20,"Too steep for a casual walking game");
  assert.ok(flatlandHeight(1900,1200,seed,base)>base+30,
    "Distant mountains should stay visible only beyond the playland");
});
test("world reboot retains character files and removes old scenery loaders",()=>{
  const walk=file("../walk.js"),renderer=file("../wild-flatland-rebuild.js");
  assert.match(walk,/gatherCabinCrew\(world\)/);
  assert.doesNotMatch(walk,/^resetToWildCabin\(world\);/m);
  for(const name of ["amy","chrissy","caitlyn","mason","riley","sha","sav"])
    assert.match(walk,new RegExp(name+':"\\./assets/'));
  assert.match(walk,/renderRebuiltLandscape as renderWildLandscape/);
  assert.match(renderer,/makeFootpaths/);
  assert.match(renderer,/reservedPad/);
  assert.match(renderer,/makeGroundHeightSampler/);
  assert.doesNotMatch(renderer,/renderWildVillage|buildHeroTree|treesInArea/);
});
