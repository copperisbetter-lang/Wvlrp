import test from "node:test";
import { resetToWildCabin } from "../world-core.js";
import { NATIVE_TREES,NATIVE_EVERGREENS,riverY,riverLevel,terrainHeight,waterAt,creekPath,treesInArea,supplementalTreesInArea } from "../wild-nature.js";

import assert from "node:assert/strict";
import {
  CELL, seedNumber, creekY, heightAt, trailHorizontal, trailVertical,
  newWorld, sanitizedWorld, spawnDeer, addTestCharacters, TEST_CHARACTER_STARTERS, addCaitlyn, CAITLYN_STARTER, addMason, MASON_STARTER, gatherCabinCrew, HEARTHSIDE_CABIN, CABIN_CREW_KEYS
} from "../world-core.js";

test("world seed makes terrain deterministic",()=>{
  const seed=seedNumber("WVLRP");
  assert.equal(heightAt(132.5,-212,seed),heightAt(132.5,-212,seed));
  assert.equal(creekY(210,seed),creekY(210,seed));
});
test("creek lies inside its own carved valley",()=>{
  const seed=seedNumber("WVLRP");
  for(const x of [-1200,-600,0,600,1200]){
    const c=creekY(x,seed);
    assert.ok(heightAt(x,c,seed) < heightAt(x,c+180,seed));
  }
});
test("every grid crossing has an exact connected four-way trail junction",()=>{
  const seed=seedNumber("WVLRP");
  for(let col=-8;col<=8;col++)for(let row=-8;row<=8;row++){
    const x=col*CELL,y=row*CELL;
    assert.ok(Math.abs(trailHorizontal(x,row,seed)-y)<1e-8);
    assert.ok(Math.abs(trailVertical(y,col,seed)-x)<1e-8);
  }
});
test("deer can spawn in small herds with local and wide-roaming modes",()=>{
  const w=newWorld(),animals=spawnDeer(w,100,0,0,4);
  assert.equal(animals.length,100);
  assert.equal(new Set(animals.map(o=>o.herd)).size,25);
  assert.ok(animals.every(o=>o.type==="deer"&&Number.isFinite(o.x)));
  assert.ok(animals.every(o=>["wide-roamer","home-range"].includes(o.behavior)));
});
test("invalid world import is refused; clean worlds do not inject landmarks",()=>{
  assert.throws(()=>sanitizedWorld({nope:true}));
  const w=sanitizedWorld({seed:"my-seed",objects:[{id:"deer-1",type:"deer",name:"Buck",x:1,y:2}]});
  assert.equal(newWorld().objects.length,0);
  assert.equal(w.objects.some(o=>o.id==="anchor-ranger"),false);
  assert.ok(w.objects.some(o=>o.name==="Buck"));
});

test("Riley hands-and-knees pose survives JSON round-trip without disturbing deer",()=>{
  const w=newWorld();
  const allDeer=spawnDeer(w,101,0,0,4);
  w.objects.push({id:"riley-pose-test",type:"npc",modelKey:"riley",name:"Riley (test)",pose:"allfours",x:3,y:3});
  const read=sanitizedWorld(JSON.parse(JSON.stringify(w)));
  assert.equal(read.objects.find(o=>o.id==="riley-pose-test").pose,"allfours");
  assert.equal(read.objects.filter(o=>o.type==="deer").length,101);
  assert.deepEqual(read.objects.filter(o=>o.type==="deer").map(o=>[o.id,o.x,o.y]),allDeer.map(o=>[o.id,o.x,o.y]));
});

test("Amy and Christy join a preexisting world exactly once without moving deer",()=>{
  const w=newWorld();
  const deer=spawnDeer(w,24,12,13,4);
  w.objects.push({id:"owner-cabin",type:"cabin",name:"My cabin",x:75,y:90});
  const before=deer.map(d=>[d.id,d.x,d.y]);
  const placed=addTestCharacters(w);
  assert.deepEqual(placed.map(o=>o.modelKey),["amy","chrissy"]);
  assert.equal(placed.length,2);
  assert.equal(addTestCharacters(w).length,0);
  const reloaded=sanitizedWorld(JSON.parse(JSON.stringify(w)));
  assert.equal(reloaded.objects.find(o=>o.id==="npc-amy-wild").modelKey,"amy");
  assert.equal(reloaded.objects.find(o=>o.id==="npc-christy-wild").modelKey,"chrissy");
  assert.deepEqual(reloaded.objects.filter(o=>o.type==="deer").map(o=>[o.id,o.x,o.y]),before);
  assert.ok(reloaded.objects.some(o=>o.id==="owner-cabin"));
  assert.equal(TEST_CHARACTER_STARTERS.length,2);
});

test("Add only missing test character if one already exists",()=>{
  const w=newWorld();
  w.objects.push({id:"custom-amy",name:"Amy",type:"npc",modelKey:"amy",x:90,y:20});
  assert.deepEqual(addTestCharacters(w).map(o=>o.name),["Christy (test)"]);
  assert.equal(w.objects.find(o=>o.id==="custom-amy").x,90);
});

test("Caitlyn is added once to existing world without moving existing characters or deer",()=>{
  const world=newWorld();
  spawnDeer(world,20,11,7,4);
  addTestCharacters(world);
  world.objects.push({id:"user-cabin",type:"cabin",name:"Cabin",x:150,y:55});
  const before=world.objects.map(o=>[o.id,o.x,o.y,o.modelKey]);
  assert.deepEqual(addCaitlyn(world).map(o=>o.modelKey),["caitlyn"]);
  assert.equal(addCaitlyn(world).length,0);
  assert.deepEqual(world.objects.slice(0,before.length).map(o=>[o.id,o.x,o.y,o.modelKey]),before);
  const saved=sanitizedWorld(JSON.parse(JSON.stringify(world)));
  const person=saved.objects.find(o=>o.id==="npc-caitlyn-wild");
  assert.deepEqual([person.modelKey,person.x,person.y,person.pose],["caitlyn",0,-76,"standing"]);
  assert.equal(saved.objects.filter(o=>o.type==="deer").length,20);
  assert.equal(CAITLYN_STARTER.id,"npc-caitlyn-wild");
});

test("Caitlyn's articulated pose and moved map coordinates survive JSON serialization",()=>{
  const world=newWorld(),person=addCaitlyn(world)[0];
  person.x=13;person.y=-88;person.pose="allfours";
  let copy=sanitizedWorld(JSON.parse(JSON.stringify(world))).objects[0];
  assert.deepEqual([copy.x,copy.y,copy.pose,copy.modelKey],[13,-88,"allfours","caitlyn"]);
  copy.pose="bend";
  assert.equal(sanitizedWorld({objects:[copy]}).objects[0].pose,"bend");
});

test("A customized Caitlyn is not duplicated or repositioned by a future install",()=>{
  const world=newWorld();
  world.objects.push({id:"custom-caitlyn",type:"npc",name:"Caitlyn",modelKey:"caitlyn",x:555,y:43});
  assert.equal(addCaitlyn(world).length,0);
  assert.deepEqual([world.objects.length,world.objects[0].x],[1,555]);
});


test("Every avatar can save the new elbows-and-knees pose in the shared world schema",()=>{
  for(const modelKey of ["caitlyn","riley","amy","chrissy","mason"]){
    const world=sanitizedWorld({objects:[{id:"pose-"+modelKey,type:"npc",modelKey,pose:"elbows",x:0,y:0}]});
    assert.equal(world.objects[0].pose,"elbows");
    assert.equal(world.objects[0].modelKey,modelKey);
  }
});

test("Mason gets his own visible starter location without altering earlier test characters",()=>{
  const world=newWorld();
  addTestCharacters(world);addCaitlyn(world);
  const originals=world.objects.map(o=>[o.id,o.x,o.y,o.modelKey]);
  assert.equal(addMason(world).length,1);
  assert.equal(addMason(world).length,0);
  assert.deepEqual(world.objects.slice(0,originals.length).map(o=>[o.id,o.x,o.y,o.modelKey]),originals);
  const m=world.objects.find(o=>o.id==="npc-mason-wild");
  assert.equal(m.modelKey,"mason");
  assert.ok(Math.abs(m.x)<=86&&Math.abs(m.y)<=86,"Mason must be in the initial 180x180m preview");
  assert.deepEqual([m.x,m.y],[MASON_STARTER.x,MASON_STARTER.y]);
  const persisted=sanitizedWorld(JSON.parse(JSON.stringify(world)));
  assert.equal(persisted.objects.find(o=>o.id===m.id).modelKey,"mason");
});
test("A personally placed Mason is not duplicated or moved",()=>{
  const world=newWorld();
  world.objects.push({id:"own-mason",type:"npc",name:"Mason",modelKey:"mason",pose:"elbows",x:400,y:234});
  assert.equal(addMason(world).length,0);
  const person=sanitizedWorld(JSON.parse(JSON.stringify(world))).objects[0];
  assert.deepEqual([person.x,person.y,person.modelKey,person.pose],[400,234,"mason","elbows"]);
});

test("A one-room cabin gathers our seven built-in avatars without deleting the world's wildlife",()=>{
  const w=newWorld();
  const deer=spawnDeer(w,24,300,200,4);
  w.objects.push({id:"old-cabin",type:"cabin",name:"Old Forest Cabin",x:980,y:300});
  w.objects.push({id:"quest-important",type:"marker",name:"Find a pawpaw",x:72,y:88});
  const originals=w.objects.map(o=>[o.id,o.x,o.y,o.type]);
  const made=gatherCabinCrew(w);
  assert.equal(made.madeCabin,true);
  assert.equal(made.totalPeople,7);
  assert.equal(new Set(w.objects.filter(o=>o.type==="npc").map(o=>o.modelKey)).size,7);
  assert.deepEqual(w.objects.filter(o=>o.type==="npc").map(o=>o.modelKey).sort(),[...CABIN_CREW_KEYS].sort());
  assert.deepEqual(w.objects.slice(0,originals.length).map(o=>[o.id,o.x,o.y,o.type]),originals);
  assert.ok(w.objects.find(o=>o.id===HEARTHSIDE_CABIN.id));
  assert.equal(w.objects.filter(o=>o.type==="deer").length,deer.length);
  const cabin=w.objects.find(o=>o.id===HEARTHSIDE_CABIN.id);
  assert.ok(w.objects.filter(o=>o.type==="npc").every(o=>Math.abs(o.x-cabin.x)<9&&Math.abs(o.y-cabin.y)<7));
  assert.equal(gatherCabinCrew(w).addedPeople,0);
  assert.equal(w.objects.filter(o=>o.id===HEARTHSIDE_CABIN.id).length,1);
  const saved=sanitizedWorld(JSON.parse(JSON.stringify(w)));
  assert.ok(saved.objects.some(o=>o.modelKey==="sav"),"Sav must survive reload");
  assert.equal(saved.objects.filter(o=>o.type==="deer").length,24);
});
test("Cabin gathering repositions existing people but never replaces their identities or pose",()=>{
  const w=newWorld();
  w.objects.push({id:"my-amy",type:"npc",modelKey:"amy",name:"Customized Amy",x:852,y:-200,pose:"elbows"});
  w.objects.push({id:"my-visitor",type:"npc",name:"Visitor",x:-500,y:600,pose:"standing"});
  const originalLength=w.objects.length;
  const result=gatherCabinCrew(w);
  assert.equal(result.totalPeople,8);
  const amy=w.objects.find(o=>o.id==="my-amy");
  assert.equal(amy.name,"Customized Amy");
  assert.equal(amy.pose,"elbows");
  assert.ok(Math.abs(amy.x)<9&&Math.abs(amy.y)<7);
  assert.ok(Math.abs(w.objects.find(o=>o.id==="my-visitor").x)<9);
  assert.equal(w.objects.length,originalLength+1+6);
});

test("Wilderness reset keeps only Hearthside and seven authored GLB identities",()=>{
  const w=newWorld();
  w.objects.push({id:"another-house",type:"cabin",name:"Old House",x:500,y:300});
  w.objects.push({id:"mystery-marker",type:"marker",name:"Old Quest",x:1,y:1});
  spawnDeer(w,40,0,0,4);
  w.objects.push({id:"custom-riley",type:"npc",name:"Customized Riley",modelKey:"riley",
    x:100,y:200,pose:"elbows",skin:"tan"});
  const info=resetToWildCabin(w);
  assert.equal(info.people,7);
  assert.equal(w.objects.length,8);
  assert.deepEqual(new Set(w.objects.map(o=>o.type)),new Set(["cabin","npc"]));
  assert.equal(w.objects.filter(o=>o.type==="cabin")[0].id,HEARTHSIDE_CABIN.id);
  assert.equal(w.objects.find(o=>o.modelKey==="riley").id,"custom-riley");
  assert.equal(w.objects.find(o=>o.modelKey==="riley").pose,"elbows");
  assert.equal(w.objects.find(o=>o.modelKey==="riley").skin,"tan");
  assert.ok(w.objects.filter(o=>o.type==="npc").every(o=>Math.abs(o.x)<9&&Math.abs(o.y)<7));
  const state=JSON.stringify(w);
  resetToWildCabin(w);
  assert.equal(JSON.stringify(w),state,"repeat reset does not relocate or rewrite the crew");
  assert.deepEqual(sanitizedWorld(JSON.parse(state)).objects.map(o=>o.id),w.objects.map(o=>o.id));
});
test("WV relief is reproducible; water follows incised river and joined tributaries",()=>{
  const seed=seedNumber("The-Wild-WV");
  for(const x of [-1100,-550,0,550,1100]){
    const y=riverY(x,seed);
    assert.equal(waterAt(x,y,seed).kind,"river");
    assert.ok(terrainHeight(x,y,seed)<terrainHeight(x,y+190,seed),
      "a river should lie below the nearby slopes at x="+x);
    assert.equal(terrainHeight(x,y,seed),terrainHeight(x,y,seed));
  }
  const branch=creekPath(0,1,380,seed);
  assert.equal(waterAt(branch.x,branch.y,seed).kind,"creek");
  assert.ok(riverLevel(branch.anchorX)<riverLevel(branch.anchorX)+380*.028,
    "tributary headwaters are higher than their mouths");
});
test("WV forest has fifteen native species, fixed distribution and no trees in cabin",()=>{
  const seed=seedNumber("The-Wild-WV");
  assert.equal(NATIVE_TREES.length,15);
  assert.equal(new Set(NATIVE_TREES).size,15);
  const a=treesInArea(0,0,270,seed,11),b=treesInArea(0,0,270,seed,11);
  assert.deepEqual(a,b);
  assert.ok(a.length>200,"a dense forest should be present");
  assert.ok(a.every(t=>NATIVE_TREES.includes(t.species)));
  assert.ok(a.every(t=>Math.hypot(t.x,t.y)>=33),"the cabin clearing stays open");
  assert.ok(new Set(a.map(t=>t.species)).size>=8,"multiple WV tree species present");
  assert.ok(a.every(t=>Number.isFinite(t.height)));
});

test("new forest stands stay native, seeded, older and about 40% evergreen",()=>{
  let originalCount=0,addedCount=0,addedEvergreen=0,oldCount=0,addedOld=0;
  for(const seed of [12345,230115,99991,20261013,301,708]){
    const base=treesInArea(0,0,102,seed,8.65).concat(
      treesInArea(0,0,470,seed,33.9).filter(t=>Math.max(Math.abs(t.x),Math.abs(t.y))>104));
    const near=supplementalTreesInArea(0,0,102,seed,8.65);
    const far=supplementalTreesInArea(0,0,470,seed,33.9).filter(t=>
      Math.max(Math.abs(t.x),Math.abs(t.y))>104);
    const added=near.concat(far);
    assert.deepEqual(near,supplementalTreesInArea(0,0,102,seed,8.65),
      "forest additions must be reproducible");
    assert.ok(added.every(t=>NATIVE_TREES.includes(t.species)));
    assert.ok(added.every(t=>Math.hypot(t.x,t.y)>=33),
      "no trees inside the cabin clearing");
    assert.ok(added.every(t=>t.evergreen===NATIVE_EVERGREENS.includes(t.species)));
    originalCount+=base.length;addedCount+=added.length;
    addedEvergreen+=added.filter(t=>t.evergreen).length;
    oldCount+=base.filter(t=>t.elder).length;
    addedOld+=added.filter(t=>t.elder).length;
  }
  assert.ok(addedCount/originalCount>.45&&addedCount/originalCount<.60,
    "aim for roughly 50% additional trees");
  assert.ok(addedEvergreen/addedCount>.33&&addedEvergreen/addedCount<.47,
    "aim for 40% native evergreens among additions");
  assert.ok(addedOld/oldCount>.23&&addedOld/oldCount<.43,
    "aim for 30% more established old-growth trees");
});
