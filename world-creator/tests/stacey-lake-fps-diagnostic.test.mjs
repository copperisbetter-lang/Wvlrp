import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const original=readFileSync(path.join(root,'../base-camp/stacey-dive.html'),'utf8');
const diagnostic=readFileSync(path.join(root,'../base-camp/stacey-lake-fps-diagnostic.html'),'utf8');

test('approved realistic water and terrain kept unchanged',()=>{
 for(const text of [
  'const N=384,R=150',
  'const WN=384,WR=96',
  'new Water(waterGeo',
  'water.material.fragmentShader=',
  "installCanyonV6();",
  "water.material.depthWrite=false",
  'Beverly-approved-dressed.glb',
  'Gina_6_FITTED_GOLD_BIKINI.glb'
 ]) {
  assert.ok(original.includes(text),'reference missing '+text);
  assert.ok(diagnostic.includes(text),'diagnostic missing '+text);
 }
 assert.doesNotMatch(diagnostic,/reflectionRate|renderLakeReflection|worldQuality/);
});

test('character models load only when player presses comparison buttons',()=>{
 assert.match(diagnostic,/function startProbeBeverly\(\)/);
 assert.match(diagnostic,/function startProbeGina\(\)/);
 assert.match(diagnostic,/probeBeverly\.onclick=/);
 assert.match(diagnostic,/probeGina\.onclick=/);
 assert.match(diagnostic,/diag\.assets\.Beverly='NOT loaded for FPS comparison'/);
 assert.match(diagnostic,/diag\.assets\.Gina='NOT loaded for FPS comparison'/);
});

test('diagnostic measures real wall-clock FPS rather than capped movement time',()=>{
 assert.match(diagnostic,/probeFrames\/\(\(now-probeLast\)\/1000\)/);
 assert.match(diagnostic,/diag\.realFps=observed/);
 assert.match(diagnostic,/fpsReading\.textContent=observed\+' REAL FPS'/);
 assert.match(diagnostic,/window\.staceyFpsProbe=/);
 assert.match(diagnostic,/const dt=Math\.min\(\.05,\(now-last\)\/1000\)/);
});

test('diagnostic JavaScript still parses as a module',()=>{
 const m=diagnostic.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(m);
 const p=spawnSync(process.execPath,['--input-type=module','--check'],{input:m[1],encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
});