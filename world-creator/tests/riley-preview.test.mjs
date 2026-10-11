import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import test from "node:test";

const studio=readFileSync(new URL("../studio.js",import.meta.url),"utf8");
const page=readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("Riley's 3D pose preview never uses the balloon mesh",()=>{
  assert.ok(!studio.includes('makeRiley('));
  assert.ok(!studio.includes('import { makeRiley }'));
  assert.match(studio,/RILEY_REAL_GLB/);
  assert.match(studio,/RILEY_KNEELING_GLB/);
  assert.match(studio,/builtInRileyFile\(o.pose\)/);
});
test("Add Riley re-selects the character rather than duplicating it",()=>{
  assert.match(studio,/const previous=world\.objects\.find\(item=>item\.type==="npc"&&item\.modelKey==="riley"\)/);
  assert.match(studio,/if\(previous\)\{\s*setSelection\(previous\)/);
});
test("Editor labels kneeling truthfully as static, not a rigged crawl",()=>{
  assert.match(page,/Kneeling \(static 3D test\)/);
  assert.doesNotMatch(page,/On hands and knees \(test pose\)/);
});
