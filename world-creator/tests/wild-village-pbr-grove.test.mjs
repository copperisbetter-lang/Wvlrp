import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {VILLAGE_PROPOSED_TREES,VILLAGE_PLANTING_METADATA} from "../wild-village-planting-blueprint.js";
import {chooseGroveAsset,isNearVillageGrove} from "../wild-village-pbr-grove.js";

const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const walk=read("../walk.js"),renderer=read("../wild-landscape-renderer.js");
const installer=read("../../.github/workflows/install-wild-village-grove-trees.yml");

test("The actual first-person walk scene instantiates real 3D PBR grove",()=>{
 assert.match(walk,/installVillageGrove\(B,scene,\{seed,mobile\}\)/);
 assert.match(walk,/villageGrove\.collidableTrees/);
 assert.match(walk,/villageGrove\.setNear\(isNearVillageGrove/);
 assert.match(walk,/villageGroveTreesPlanted:villageGrove\.planted/);
 assert.match(read("../walk.html"),/three-acre-pbr-grove-20261014-v1/);
});
test("Old generic/procedural tree models are disabled within the three-acre grove",()=>{
 assert.match(renderer,/import \{VILLAGE_SECTION\} from/);
 assert.match(renderer,/const inVillageGrove=t=>/);
 assert.match(renderer,/const squareAllowsTree=t=>!inVillageGrove\(t\)/);
});
test("Only genuinely authored GLBs are allowed; no mock geometry fallback",()=>{
 const grove=read("../wild-village-pbr-grove.js");
 assert.match(grove,/SceneLoader\.LoadAssetContainerAsync/);
 assert.match(grove,/instantiateModelsToScene/);
 assert.match(grove,/awaiting-real-assets/);
 assert.doesNotMatch(grove,/CreateCylinder|CreateSphere|buildHeroTree/);
 assert.match(installer,/https:\/\/api\.polyhaven\.com\/files\//);
 assert.match(installer,/checksum error/);
 assert.match(installer,/license":"CC0"/);
 assert.match(installer,/self-contained textured glTF/);
});
test("Assets chosen by type, never substitute conifer for missing native hardwood",()=>{
 const all=[
  {id:"island_tree_01"},{id:"island_tree_02"},
  {id:"fir_tree_01"},{id:"pine_tree_01"},
  {id:"pine_sapling_medium"},{id:"fir_sapling_medium"}
 ];
 const hardwood=VILLAGE_PROPOSED_TREES.find(t=>t.species==="white-oak"&&t.age==="mature");
 const conifer=VILLAGE_PROPOSED_TREES.find(t=>t.species==="eastern-hemlock");
 assert.ok(hardwood&&conifer);
 assert.match(chooseGroveAsset(hardwood,all).id,/island_tree/);
 assert.match(chooseGroveAsset(conifer,all).id,/fir|pine/);
 assert.equal(chooseGroveAsset(hardwood,[{id:"fir_tree_01"}]),null);
});
test("Three acres stay populated without per-tile recreation",()=>{
 assert.ok(isNearVillageGrove(93,65));
 assert.ok(isNearVillageGrove(55,110));
 assert.equal(isNearVillageGrove(1000,1000),false);
 assert.equal(VILLAGE_PLANTING_METADATA.geometryInstalled,false,
   "Blueprint remains planned; only actual runtime/model smoke test may mark installed");
});

test("Installed licensed binary source assets cover every one of the 59 peripheral tree slots",()=>{
 const sources=JSON.parse(read("../assets/village-grove-sources.json"));
 assert.ok(sources.length>=5,"At least five distinct source tree models required");
 for(const source of sources){
   assert.equal(source.license,"CC0");
   assert.ok(source.source.startsWith("https://polyhaven.com/a/"));
   const relative=source.url.startsWith("./")?"../"+source.url.slice(2):source.url;
   const info=statSync(new URL(relative,import.meta.url));
   assert.ok(info.size>100000,"No missing/empty source GLB: "+source.id);
   assert.equal(info.size,source.bytes,"Manifest size must match real model bytes");
 }
 const allocated=new Map();
 for(const tree of VILLAGE_PROPOSED_TREES){
    const eligible=sources.filter(src=>(allocated.get(src.id)||0)<30);
    const match=chooseGroveAsset(tree,eligible);
    assert.ok(match,"Unassigned village tree: "+tree.id);
    allocated.set(match.id,(allocated.get(match.id)||0)+1);
 }
 assert.equal([...allocated.values()].reduce((a,b)=>a+b,0),59);
});
