import test from "node:test";
import assert from "node:assert/strict";
import {
  CELL, seedNumber, creekY, heightAt, trailHorizontal, trailVertical,
  newWorld, sanitizedWorld, spawnDeer, addTestCharacters, TEST_CHARACTER_STARTERS
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
