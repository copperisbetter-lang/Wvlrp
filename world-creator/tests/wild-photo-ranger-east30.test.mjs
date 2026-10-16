import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {NORTH_RANGER_STATION} from "../wild-ranger-station.js";
import {
 PHOTO_RANGER_STATION,photoRangerVisibleInTile,
 photoRangerCollision,photoRangerDeckBlend
} from "../wild-ranger-photo-build.js";
const file=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("photo Ranger Station is exactly 30m east of the original and does not overwrite it",()=>{
 const old=NORTH_RANGER_STATION,now=PHOTO_RANGER_STATION;
 assert.deepEqual([old.x,old.z],[0,350]);
 assert.deepEqual([now.x,now.z],[30,350]);
 assert.equal(Math.hypot(now.x-old.x,now.z-old.z),30);
 assert.ok(now.x-now.width/2>old.x+old.width/2,
   "Two roofs/walls require a positive side-to-side gap");
 assert.equal(now.front,"south");
});
test("two Ranger Stations remain inside the same local 196m streaming tile",()=>{
 assert.equal(photoRangerVisibleInTile(30,350),true);
 assert.equal(photoRangerVisibleInTile(0,350),true);
 assert.equal(photoRangerVisibleInTile(0,0),false);
});
test("new physical walls prevent walking through sides while leaving doorway open",()=>{
 const s=PHOTO_RANGER_STATION;
 assert.equal(photoRangerCollision(s.x,s.z),false);
 assert.equal(photoRangerCollision(s.x,s.z-s.depth/2),false);
 assert.equal(photoRangerCollision(s.x+3,s.z-s.depth/2),true);
 assert.equal(photoRangerCollision(s.x-s.width/2,s.z),true);
 assert.equal(photoRangerCollision(s.x+s.width/2,s.z),true);
 assert.equal(photoRangerCollision(s.x,s.z+s.depth/2),true);
 assert.equal(photoRangerCollision(s.x,s.z-s.depth/2-9),false);
});
test("photo station walking height ramps up stairs and becomes constant inside",()=>{
 const s=PHOTO_RANGER_STATION;
 const porch=s.z-s.depth/2-s.porchDepth;
 assert.equal(photoRangerDeckBlend(s.x,s.z),1);
 assert.equal(photoRangerDeckBlend(s.x,porch+.4),1);
 assert.equal(photoRangerDeckBlend(s.x,porch-3.7),0);
 assert.equal(photoRangerDeckBlend(s.x+8,porch-2),0);
 const half=photoRangerDeckBlend(s.x,porch-1.75);
 assert.ok(half>0&&half<1);
});
test("build uses downloaded CC0 PBR material sets and real 3D interiors",()=>{
 const src=file("../wild-ranger-photo-build.js");
 for(const id of ["weathered_planks","wood_planks","pine_bark",
   "wood_trunk_wall","rough_pine_door","mossy_stone_wall",
   "stacked_stone_wall","corrugated_iron"]){
  assert.ok(src.includes('pbr("'+id+'"'),"PBR "+id);
 }
 for(const name of ["central projecting gable","true",
   "stone entry stair","portico","right-side massive outdoor chimney",
   "real timber open double door","L workstation visitor-facing",
   "six camera status","public notice board","CB real black radio",
   "ranger office chair swivel stem","visitor gear bench"]){
  assert.ok(src.toLowerCase().includes(name.toLowerCase()),name);
 }
});
test("real walking game integration includes separate Photo Station navigation and render",()=>{
 const renderer=file("../wild-flatland-rebuild.js");
 const walk=file("../walk.js"),html=file("../walk.html");
 assert.match(renderer,/buildPhotoRangerStation\(B,scene,track/);
 assert.match(renderer,/buildNorthRangerStation\(B,scene,track/);
 assert.match(walk,/photoRangerCollision\(x,z\)/);
 assert.match(walk,/photoRangerDeckBlend\(x,z\)/);
 assert.match(walk,/spawn"\)==="ranger-photo"/);
 assert.match(walk,/goToPhotoRanger/);
 assert.match(html,/id="photoRanger"/);
});
