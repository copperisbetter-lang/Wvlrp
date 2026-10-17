import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {VILLAGE_PROPOSED_TREES,VILLAGE_PLANTING_METADATA} from "../wild-village-planting-blueprint.js";
import {chooseGroveAsset,isNearVillageGrove} from "../wild-village-pbr-grove.js";

const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const walk=read("../walk.js"),renderer=read("../wild-landscape-renderer.js");
const installer=read("../../.github/workflows/install-wild-village-grove-trees.yml");

test("PBR grove library is preserved but not instantiated in cabin-only ground test",()=>{
 assert.doesNotMatch(walk,/installVillageGrove\(B,scene,\{/);
 assert.match(walk,/const villageGrove=\{status:"rebuild-cleared"/);
 assert.match(walk,/villageGroveTreesPlanted:villageGrove\.planted/);
 assert.match(read("../walk.html"),/id="world"/);
});
test("Old generic/procedural tree models are disabled within the three-acre grove",()=>{
 assert.match(renderer,/import \{VILLAGE_SECTION\} from/);
 assert.match(renderer,/const inVillageGrove=t=>/);
 assert.match(renderer,/const squareAllowsTree=t=>!inVillageGrove\(t\)/);
 // No generic forest trunks, understory, hero thickets or legacy square floor
 // can intrude across the ten-acre PBR-only sponsor inspection boundary.
 assert.match(renderer,/isVillagePrototypeExclusion\(t\.x,t\.y,VILLAGE_PROTOTYPE_TREE_MARGIN_METRES\)/);
 assert.match(renderer,/if\(isVillagePrototypeExclusion\(v\.centerX,v\.centerZ,v\.radiusMetres\)\)return 0/);
 assert.match(renderer,/isVillagePrototypeExclusion\(x,z,2\)/);
 assert.match(read("../wild-investor-graphics.js"),/keepUnderstory\(x,y\)/);
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
test("New photo-textured crown shapes and summer leaf palettes are configured",()=>{
 const grove=read("../wild-village-pbr-grove.js");
 const recolor=read("../scripts/recolor_village_foliage.py");
 assert.match(installer,/"tree_small_02","jacaranda_tree"/);
 assert.match(grove,/"tree_small_02","island_tree_01"/);
 assert.match(grove,/jacaranda_tree/);
 assert.match(grove,/MAX_PER_ASSET_MOBILE=14/);
 assert.match(recolor,/"tree_small_02":/);
 assert.match(recolor,/"jacaranda_tree":/);
 assert.match(installer,/recolor_village_foliage.py/);
 assert.match(recolor,/No leaf materials identified/);
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

test("PBR trees vary across nearby village placements without fake species",()=>{
 const models=[{id:"tree_small_02"},{id:"island_tree_01"},
   {id:"island_tree_02"},{id:"island_tree_03"}];
 const target={x:42,z:80,species:"white-oak",age:"mature"};
 const placed=[{x:42.5,z:80.5,sourceId:"island_tree_01"},
   {x:43,z:81,sourceId:"tree_small_02"},
   {x:40,z:80,sourceId:"island_tree_03"}];
 assert.equal(chooseGroveAsset(target,models,placed).id,"island_tree_02",
   "Pick the one truly different nearby source instead of a clone");
 const assignments=[];
 for(const tree of VILLAGE_PROPOSED_TREES){
   if(["eastern-hemlock","eastern-white-pine","virginia-pine"].includes(tree.species))continue;
   const model=chooseGroveAsset(tree,models,assignments);
   assert.ok(model);
   assignments.push({x:tree.x,z:tree.z,sourceId:model.id});
 }
 assert.equal(new Set(assignments.map(a=>a.sourceId)).size,4);
 const counts=models.map(model=>assignments.filter(a=>a.sourceId===model.id).length);
 assert.ok(Math.max(...counts)-Math.min(...counts)<=4,
   "Model usage should be fairly balanced across the grove");
});
