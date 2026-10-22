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

test('Base Camp perimeter sites retain approved 200-foot spacing',()=>{
  assert.equal(PERIMETER_COUNT,41);
  assert.equal(perimeterClearings.length,41);
  assert.equal(CENTER_EXCLUSION_M,60.96);
  assert.ok(Math.abs(2*Math.PI*BASE_CAMP_RADIUS_M/41-61.65)<.1);
  assert.ok(perimeterClearings.every(p=>p.furnished===false));
});

test('phone startup has safe bypass and deferred photo-real forest streaming',()=>{
  assert.match(page,/const safeMode=params\.has\("safe"\)/);
  assert.match(page,/if\(safeMode\)/);
  assert.match(page,/setTimeout\(\(\)=>\{/);
  assert.match(page,/activeForest\?\.update\?\.\(pos\.x,pos\.z\)/);
  assert.match(forest,/const maxVisible=lowPower\?64:160/);
  assert.match(forest,/const minSpacing=lowPower\?23:19/);
  assert.match(page,/id="treeDensity"/);
  assert.doesNotMatch(page,/Grandview|grandviewUrl|panoramaStatus/);
  assert.match(forest,/lowPower&&!fullForest\?\[0\]:\[0,1\]/);
  assert.doesNotMatch(forest,/THREE\.ConeGeometry\(/);
});

test('viewer inline browser module parses as JavaScript',()=>{
  const match=page.match(/<script type="module">([\s\S]*?)<\/script>/i);
  assert.ok(match,'inline module is present');
  const run=spawnSync(process.execPath,['--input-type=module','--check'],{input:match[1],encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
});

test('forest loader JavaScript syntax parses',()=>{
  const run=spawnSync(process.execPath,['--check',path.join(dirname,'../base-camp/real-forest.js')],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
});
