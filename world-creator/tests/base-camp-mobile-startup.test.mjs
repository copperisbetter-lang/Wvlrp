import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {BASE_CAMP_RADIUS_M,PERIMETER_COUNT,perimeterClearings,CENTER_EXCLUSION_M} from '../base-camp/orientation-config.js';

const dirname=path.dirname(fileURLToPath(import.meta.url));
const page=readFileSync(path.join(dirname,'../base-camp/index.html'),'utf8');
const forest=readFileSync(path.join(dirname,'../base-camp/real-forest.js'),'utf8');
const understory=readFileSync(path.join(dirname,'../base-camp/real-understory.js'),'utf8');

test('the 41 approved 200-foot perimeter clearings survive the reset',()=>{
  assert.equal(PERIMETER_COUNT,41);
  assert.equal(perimeterClearings.length,41);
  assert.equal(CENTER_EXCLUSION_M,60.96);
  assert.ok(Math.abs(2*Math.PI*BASE_CAMP_RADIUS_M/41-61.65)<.1);
  assert.ok(perimeterClearings.every(p=>p.furnished===false));
});

test('all vegetation loaders, render batches and tree UI are ABSENT from active Base Camp',()=>{
  assert.doesNotMatch(page,/installBaseCampRealForest|installBaseCampUnderstory/);
  assert.doesNotMatch(page,/from ['"].*real-(forest|understory)\.js/);
  assert.doesNotMatch(page,/activeForest|activeUnderstory|treeDensity/);
  assert.doesNotMatch(page,/forestStatus|understoryStatus|GLTFLoader|InstancedMesh/);
  assert.doesNotMatch(page,/new THREE\.(ConeGeometry|CylinderGeometry)/);
  assert.doesNotMatch(page,/new THREE\.TextureLoader\(\).*tree/i);
  assert.doesNotMatch(page,/params\.get\(['"](?:forest|details)['"]\)/);
  assert.match(page,/id="vegetationStatus"/);
  assert.match(page,/vegetation-free clearings/);
  assert.match(page,/vegetation 0/);
  assert.ok(forest.includes('installBaseCampRealForest'),
    'old experimental forest source is retained for a future rebuild only');
  assert.ok(understory.includes('installBaseCampUnderstory'),
    'old experimental understory source is retained outside the live scene');
});

test('circular terrain, lake, beach, trails, sunshine, and campsites remain',()=>{
  assert.match(page,/RADIAL_STEPS=82,ANGLE_STEPS=320/);
  assert.match(page,/scene\.add\(ground\)/);
  assert.match(page,/scene\.add\(water\)/);
  assert.match(page,/scene\.add\(beachMesh\)/);
  assert.match(page,/trailBranches/);
  assert.match(page,/interiorClearings\.length<24/);
  assert.match(page,/perimeterClearings\.length/);
  assert.match(page,/sunDirection\(\+clock\.value\)/);
  assert.match(page,/document\.getElementById\('reset'\)\.onclick/);
});

test('mobile joystick, look controls, FPS HUD and resolution adaptation survive',()=>{
  assert.match(page,/id="pad"/);
  assert.match(page,/id="look"/);
  assert.match(page,/id="hudToggle"/);
  assert.match(page,/renderer\.setPixelRatio\(renderScale\)/);
  assert.match(page,/fps<30/);
  assert.match(page,/fps>48/);
  assert.match(page,/renderer\.info\.render\.calls/);
  assert.match(page,/renderer\.info\.render\.triangles/);
  assert.match(page,/renderer\.render\(scene,camera\)/);
});

test('Base Camp inline browser module still parses as JavaScript',()=>{
  const m=page.match(/<script type="module">([\s\S]*?)<\/script>/i);
  assert.ok(m,'script module exists');
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:m[1],encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});
