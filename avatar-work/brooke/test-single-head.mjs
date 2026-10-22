// Brooke single-head prototype structural regression test.
// Run: node avatar-work/brooke/test-single-head.mjs
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const src=readFileSync(new URL('./single-head-morph-test.html',import.meta.url),'utf8');
const occurrences=(pattern)=>(src.match(pattern)||[]).length;
assert.equal(occurrences(/new THREE\.Mesh\(geometry,material\)/g),1,'Expected exactly one head mesh');
assert.equal(occurrences(/scene\.add\(head\)/g),1,'Expected exactly one head added to scene');
assert.equal(occurrences(/data-photo="[012]"/g),3,'Expected three reference-photo inputs');
for(const id of ['strength','jaw','cheek','chin'])assert.ok(src.includes('id="'+id+'"'),'Missing '+id+' control');
assert.ok(src.includes('geometry.computeVertexNormals()'),'Morph must recompute normals');
assert.ok(src.includes('a.needsUpdate=true'),'Morph must upload changed vertices');
assert.ok(src.includes('automated photo fitting is not implemented'),'Prototype must not misrepresent photo fitting');
console.log('PASS: Brooke morph prototype has one head mesh, three photo inputs, four sliders, and geometry refresh hooks.');
