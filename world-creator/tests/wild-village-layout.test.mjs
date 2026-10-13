import {strict as assert} from "node:assert";
import test from "node:test";
import {
  COMMUNITY_SITES,VILLAGE_CLEARING,gradeCommunityGround,
  keepForestTree,keepUnderstory,isCommunityClearing,isVillageMountainSightline
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
  // The rear treeline now starts beyond the Ranger Station to expose hills.
  assert.equal(isCommunityClearing(93,151),true);
  assert.equal(keepForestTree(93,151),false);
  assert.equal(keepUnderstory(93,151),false);
  assert.equal(isCommunityClearing(0,0),false);
});
test("Behind the village, an uninterrupted northward mountain view opens",()=>{
  assert.equal(isVillageMountainSightline(93,220),true);
  assert.equal(isVillageMountainSightline(93,400),true);
  assert.equal(isVillageMountainSightline(93,100),false);
  assert.equal(isVillageMountainSightline(280,300),false);
  assert.equal(keepForestTree(93,300),false);
  assert.equal(keepForestTree(0,330),true);
});
test("Northern backland grades smoothly into a lower valley without moving foundations",()=>{
  const natural=(_x,z)=>190+(z-85)*.24;
  const ground=(x,z)=>gradeCommunityGround(x,z,natural(x,z),p=>natural(p.x,p.z));
  const base=natural(93,85);
  assert.equal(ground(93,110),base);
  assert.ok(Math.abs(ground(93,160)-base)<.1,"back edge should grade almost level");
  assert.ok(ground(93,270)<base-5,"mountain window should be below village level");
  assert.ok(ground(93,400)<base-15,"rear ground must not hide mountain");
  assert.equal(ground(300,400),natural(300,400),"outside corridor retain forest hills");
  assert.equal(ground(93,650),natural(93,650),"far backcountry untouched");
});
