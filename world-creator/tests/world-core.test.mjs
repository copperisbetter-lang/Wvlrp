import test from "node:test";
import assert from "node:assert/strict";
import {
  CELL, seedNumber, creekY, heightAt, trailHorizontal, trailVertical,
  newWorld, sanitizedWorld, spawnDeer
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
test("invalid world import is refused; original anchors are preserved",()=>{
  assert.throws(()=>sanitizedWorld({nope:true}));
  const w=sanitizedWorld({seed:"my-seed",objects:[{id:"deer-1",type:"deer",name:"Buck",x:1,y:2}]});
  assert.ok(w.objects.some(o=>o.id==="anchor-ranger"));
  assert.ok(w.objects.some(o=>o.name==="Buck"));
});
