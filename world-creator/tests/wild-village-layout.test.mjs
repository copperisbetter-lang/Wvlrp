import {strict as assert} from "node:assert";
import test from "node:test";
import {
  COMMUNITY_SITES,VILLAGE_CLEARING,gradeCommunityGround,
  keepForestTree,keepUnderstory,isCommunityClearing
} from "../wild-reference-layout.js";

test("The three user-placed map markers remain exactly unchanged",()=>{
  assert.deepEqual(COMMUNITY_SITES.map(s=>[s.name,s.markerX,s.markerZ]),[
    ["Ranger Station",93,77],
    ["Laurel's Kitchen",90,78],
    ["Mercantile & Gift Shop",90,75]
  ]);
});
test("All three foundations, porches, steps and the campfire share one level plateau",()=>{
  const natural=(x,z)=>170+x*.19+z*.24;
  const ground=(x,z)=>gradeCommunityGround(x,z,natural(x,z),site=>natural(site.x,site.z));
  const expected=natural(VILLAGE_CLEARING.centerX,VILLAGE_CLEARING.centerZ);
  for(const s of COMMUNITY_SITES){
    for(const dx of [-s.width/2,0,s.width/2])
      for(const dz of [-s.depth/2-8,0,s.depth/2+3]){
        assert.ok(Math.abs(ground(s.x+dx,s.z+dz)-expected)<.00001,
          s.name+" must sit level at "+(s.x+dx)+","+(s.z+dz));
      }
  }
  assert.equal(ground(VILLAGE_CLEARING.fireX,VILLAGE_CLEARING.fireZ),expected);
});
test("Forest and brush line the open plaza without breaking the Hearthside woods",()=>{
  assert.equal(isCommunityClearing(93,65),true);
  assert.equal(keepForestTree(93,65),false);
  assert.equal(keepUnderstory(93,65),false);
  assert.equal(isCommunityClearing(93,151),false);
  assert.equal(keepForestTree(93,151),true);
  assert.equal(keepUnderstory(93,151),true);
  assert.equal(isCommunityClearing(0,0),false);
});
