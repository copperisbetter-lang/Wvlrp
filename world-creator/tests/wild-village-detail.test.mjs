import {strict as assert} from "node:assert";
import test from "node:test";
import {COMMUNITY_SITES,VILLAGE_CLEARING} from "../wild-reference-layout.js";
import {
  VILLAGE_DETAIL_ZONE,VILLAGE_SQUARE_TREES_ENABLED,VILLAGE_HD_OAK_ENABLED,insideVillageDetail,
  allowVillageEdgeTree,allowVillageGroundDetail
} from "../wild-village-detail-spec.js";

test("realistic village pilot is 75m across, not 75m in radius",()=>{
  assert.deepEqual([VILLAGE_DETAIL_ZONE.centerX,VILLAGE_DETAIL_ZONE.centerZ],[
    VILLAGE_CLEARING.centerX,VILLAGE_CLEARING.centerZ]);
  assert.equal(VILLAGE_DETAIL_ZONE.diameterMetres,75);
  assert.equal(VILLAGE_DETAIL_ZONE.radiusMetres,37.5);
  assert.equal(insideVillageDetail(93,85),true);
  assert.equal(insideVillageDetail(130.5,85),true);
  assert.equal(insideVillageDetail(130.51,85),false);
  assert.equal(insideVillageDetail(93,122.51),false);
});
test("75m village prototype permits one imported HD oak, not procedural square trees",()=>{
  assert.equal(VILLAGE_SQUARE_TREES_ENABLED,false);
  assert.equal(VILLAGE_HD_OAK_ENABLED,true);
});
test("village edge shade trees preserve fire circle, paths, and building doors",()=>{
  assert.equal(allowVillageEdgeTree(93,65),false);
  assert.equal(allowVillageEdgeTree(93,115),false);
  for(const site of COMMUNITY_SITES)
    assert.equal(allowVillageEdgeTree(site.x,site.z),false,site.name);
  let placements=0;
  for(let x=55;x<=131;x+=1.5)for(let z=47;z<=123;z+=1.5)
    if(allowVillageEdgeTree(x,z))placements++;
  assert.ok(placements>8,"ring includes possible shade tree positions");
});
test("village low ground cover can fill safe places in the formerly barren plaza",()=>{
  assert.equal(allowVillageGroundDetail(93,65,"sedge"),false);
  assert.equal(allowVillageGroundDetail(93,65,"leaflitter"),false);
  for(const site of COMMUNITY_SITES)
    assert.equal(allowVillageGroundDetail(site.x,site.z,"rock"),false);
  let covered=0;
  for(let x=57;x<=129;x+=1.5)for(let z=49;z<=121;z+=1.5){
    if(allowVillageGroundDetail(x,z,"moss"))covered++;
  }
  assert.ok(covered>250,"village contains enough plantable soil for a visible detail pass");
});
