import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {planVillageForestFloor} from "../wild-village-pbr-floor.js";
import {VILLAGE_SECTION} from "../wild-acre-regions.js";
import {VILLAGE_CLEARING,COMMUNITY_SITES,pathDistance,siteDistance} from "../wild-reference-layout.js";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Licensed forest-floor plan is deterministic and covers the village perimeter",()=>{
 const a=planVillageForestFloor(24681357,false);
 const b=planVillageForestFloor(24681357,false);
 assert.deepEqual(a,b,"Multiplayer players must see the same woodland props");
 assert.ok(a.length>25,"Realistic props should appear in the surrounding three acres");
 const kinds=new Set(a.map(item=>item.kind));
 assert.ok(kinds.has("fern")&&kinds.has("rock"),"Green ferns and rock detail both present");
});

test("Forest-floor models never block village gathering, entrances or paths",()=>{
 for(const item of planVillageForestFloor(24681357,false)){
   assert.ok(item.x>=VILLAGE_SECTION.minX&&item.x<=VILLAGE_SECTION.maxX);
   assert.ok(item.z>=VILLAGE_SECTION.minZ&&item.z<=VILLAGE_SECTION.maxZ);
   assert.ok(Math.hypot(item.x-VILLAGE_CLEARING.centerX,
     item.z-VILLAGE_CLEARING.centerZ)>=41,"Square stays clear");
   assert.ok(Math.hypot(item.x-VILLAGE_CLEARING.fireX,
     item.z-VILLAGE_CLEARING.fireZ)>=16,"Fire stays clear");
   const clearance=item.kind==="fern"?3.3:item.kind==="rock"?4.8:7;
   assert.ok(pathDistance(item.x,item.z)>=clearance);
   for(const site of COMMUNITY_SITES){
     assert.ok(siteDistance(item.x,item.z,site)>=clearance+1.4);
   }
   assert.ok(item.spanMetres>0&&item.spanMetres<5);
   assert.ok(["fern_02","rock_moss_set_01","dead_tree_trunk","tree_stump_01"]
     .includes(item.sourceId));
 }
});
test("Mobile has a smaller persistent PBR undergrowth budget",()=>{
 const phone=planVillageForestFloor(24681357,true);
 const desktop=planVillageForestFloor(24681357,false);
 assert.ok(phone.length<desktop.length);
 assert.ok(phone.filter(item=>item.kind==="fern").length<=65);
 assert.ok(phone.filter(item=>item.kind==="rock").length<=14);
});
test("Real asset manifest gates geometry, no generic tree fallback",()=>{
 const module=read("../wild-village-pbr-floor.js");
 const walk=read("../walk.js");
 assert.match(module,/SceneLoader\.LoadAssetContainerAsync/);
 assert.match(module,/instantiateModelsToScene/);
 assert.match(module,/awaiting-real-assets/);
 assert.doesNotMatch(module,/CreateSphere|CreateCylinder|renderHeroUnderstory/);
 assert.match(walk,/installVillageForestFloor\(B,scene,\{seed,mobile,lite:LITE_MODE,startAfter:villageGrove\.ready\}\)/);
 assert.match(module,/lite\?fullPlan\.filter/);
 assert.match(walk,/villageFloor\.setNear\(isNearVillageGrove/);
 assert.match(walk,/villageFloorDetailsPlanted/);
});
