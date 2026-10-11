import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import test from "node:test";

const studio=readFileSync(new URL("../studio.js",import.meta.url),"utf8");
const page=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const measurements=JSON.parse(readFileSync(new URL("../riley-measurements.json",import.meta.url),"utf8"));
const modelBuilder=readFileSync(new URL("../scripts/build_riley_rigged.py",import.meta.url),"utf8");

test("Riley uses exactly one rigged GLB instead of disfigured pose models",()=>{
  assert.match(studio,/RILEY_RIGGED_GLB/);
  assert.match(studio,/riley-rigged-v1\.glb/);
  assert.ok(!studio.includes('riley-blonde-standing.glb'));
  assert.ok(!studio.includes('riley-blonde-kneeling.glb'));
  assert.ok(!studio.includes('riley-blonde-allfours.glb'));
  assert.ok(!studio.includes('makeRiley('));
  assert.match(studio,/builtInRileyFile\(o\.pose\)/);
});

test("Riley's game animation needs a real loaded skeleton",()=>{
  assert.match(studio,/result\.skeletons/);
  assert.match(studio,/verified articulated skeleton/);
  assert.match(studio,/Riley HandsAndKnees/);
  assert.match(studio,/Riley Kneel/);
  assert.match(studio,/Riley Idle/);
  assert.match(modelBuilder,/bpy\.data\.armatures\.new/);
  assert.match(modelBuilder,/Riley skeletal skinning/);
  assert.match(modelBuilder,/action\("Riley Walk"/);
});

test("Add Riley re-selects the character rather than duplicating it",()=>{
  assert.match(studio,/const previous=world\.objects\.find\(item=>item\.type==="npc"&&item\.modelKey==="riley"\)/);
  assert.match(studio,/if\(previous\)\{\s*setSelection\(previous\)/);
});

test("Approved design has stable size baseline for outfits",()=>{
  assert.equal(measurements.height_cm,170);
  assert.equal(measurements.bust_circumference_cm,94);
  assert.equal(measurements.waist_circumference_cm,70);
  assert.equal(measurements.full_hip_circumference_cm,99);
  assert.equal(measurements.shoulder_width_cm,40);
  assert.match(page,/id="rileyOutfitMeasurements"/);
});

test("Editor labels early skeletal movement truthfully",()=>{
  assert.match(page,/The new Riley uses one skeleton/);
  assert.match(page,/Kneeling/);
});
