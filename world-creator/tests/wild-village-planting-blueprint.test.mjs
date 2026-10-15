import test from "node:test";
import assert from "node:assert/strict";
import {COMMUNITY_SITES,VILLAGE_CLEARING} from "../wild-reference-layout.js";
import {VILLAGE_SECTION} from "../wild-acre-regions.js";
import {
 HERO_WILLOW,VILLAGE_PROPOSED_TREES,VILLAGE_TREE_COUNT,
 VILLAGE_PLANTING_REGIONS,VILLAGE_PLANTING_METADATA,villagePlantingViolations
} from "../wild-village-planting-blueprint.js";

test("Exactly one weeping-willow focal point and 59 surrounding trees are planned",()=>{
 assert.equal(HERO_WILLOW.species,"weeping-willow");
 assert.equal(VILLAGE_TREE_COUNT,59);
 assert.equal(VILLAGE_PROPOSED_TREES.length,59);
 assert.equal(VILLAGE_PLANTING_REGIONS.reduce((n,s)=>n+s.count,0),59);
 assert.equal(VILLAGE_PLANTING_METADATA.geometryInstalled,false);
 assert.equal(VILLAGE_PLANTING_METADATA.photoRealisticModelsAvailable,false);
});
test("All specimen centers lie inside the three-acre region, none in the square",()=>{
 assert.ok(VILLAGE_SECTION.acres>2.99&&VILLAGE_SECTION.acres<3.02);
 for(const t of VILLAGE_PROPOSED_TREES)
   assert.deepEqual(villagePlantingViolations(t),[],t.id);
 assert.deepEqual(villagePlantingViolations(HERO_WILLOW),[],"willow keeps fire clear");
});
test("Planting uses different true model variants and at least fifteen species",()=>{
 const species=new Set(VILLAGE_PROPOSED_TREES.map(t=>t.species));
 assert.equal(species.size,15);
 assert.ok(VILLAGE_PROPOSED_TREES.every(t=>/^pbr-/.test(t.modelVariant)));
 const keys=new Set(VILLAGE_PROPOSED_TREES.map(t=>t.modelVariant));
 assert.ok(keys.size>=35,`Expected distinct species-age-variant combos, got ${keys.size}`);
 const ids=new Set(VILLAGE_PROPOSED_TREES.map(t=>t.id));
 assert.equal(ids.size,VILLAGE_TREE_COUNT);
});
test("Buildings and fire remain protected while keeping forest on both sides",()=>{
 const left=VILLAGE_PROPOSED_TREES.filter(t=>t.x<70);
 const right=VILLAGE_PROPOSED_TREES.filter(t=>t.x>116);
 assert.ok(left.length>=20);
 assert.ok(right.length>=20);
 assert.ok(VILLAGE_PLANTING_REGIONS.some(z=>z.id==="northwest-transition"));
 assert.ok(VILLAGE_PLANTING_REGIONS.some(z=>z.id==="northeast-transition"));
 for(const site of COMMUNITY_SITES)
   assert.ok(!VILLAGE_PROPOSED_TREES.some(t=>Math.hypot(t.x-site.x,t.z-site.z)<4),site.name);
 assert.ok(Math.hypot(HERO_WILLOW.x-VILLAGE_CLEARING.fireX,HERO_WILLOW.z-VILLAGE_CLEARING.fireZ)>19);
});
test("No two peripheral trunks are stacked or at the hero willow location",()=>{
 const all=VILLAGE_PROPOSED_TREES;
 for(let i=0;i<all.length;i++){
  assert.ok(Math.hypot(all[i].x-HERO_WILLOW.x,all[i].z-HERO_WILLOW.z)>13);
  for(let j=i+1;j<all.length;j++)
    assert.ok(Math.hypot(all[i].x-all[j].x,all[i].z-all[j].z)>=5.4,
       `Overlapping trunks: ${all[i].id} and ${all[j].id}`);
 }
});
