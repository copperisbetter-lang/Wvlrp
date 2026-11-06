import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {STACEY_LAKE_WORLD,staceyLakeProfile,boundLakePosition,createStaceyLakeQualityController} from '../base-camp/stacey-lake-world-config.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const newGame=readFileSync(path.join(root,'../base-camp/stacey-lake-world.html'),'utf8');
const sourceGame=readFileSync(path.join(root,'../base-camp/stacey-dive.html'),'utf8');
const hub=readFileSync(path.join(root,'../worlds/index.html'),'utf8');

test('Stacey Lake has its own 90-acre bounded scene without shrinking the approved lake',()=>{
  assert.equal(STACEY_LAKE_WORLD.id,'the-wild:stacey-lake:v1');
  assert.equal(STACEY_LAKE_WORLD.worldAreaAcres,90);
  assert.equal(STACEY_LAKE_WORLD.terrainRadiusM,340);
  assert.ok(STACEY_LAKE_WORLD.playableRadiusM>=330);
  const inside=boundLakePosition(140,-240);
  assert.deepEqual(inside,{x:140,z:-240,clamped:false});
  const edge=boundLakePosition(140+1000,-240);
  assert.equal(edge.clamped,true);
  assert.equal(Math.round(edge.x),140+STACEY_LAKE_WORLD.playableRadiusM);
  assert.equal(edge.z,-240);
  assert.equal(boundLakePosition(NaN,2).x,140);
});

test('mobile has smaller terrain and water meshes but same scene radius',()=>{
  const mobile=staceyLakeProfile(true,4),desktop=staceyLakeProfile(false,8);
  assert.ok(mobile.terrainAngles*mobile.terrainRings<desktop.terrainAngles*desktop.terrainRings*.6);
  assert.ok(mobile.waterAngles*mobile.waterRings<desktop.waterAngles*desktop.waterRings*.6);
  assert.equal(mobile.fishLoading,'underwater-only');
  assert.ok(mobile.dprStart<=1);
  assert.equal(desktop.terrainAngles,384);
});

test('quality controller lowers pixel cost under pressure, restores gradually, and honors detail toggle',()=>{
  const profile=staceyLakeProfile(true,4),pixels=[];
  const renderer={setPixelRatio:dpr=>pixels.push(dpr)};
  const q=createStaceyLakeQualityController(renderer,profile,2.75);
  const start=q.pixelRatio;
  q.observe(19,1);q.observe(18,1);
  assert.ok(q.pixelRatio<start);
  const reduced=q.pixelRatio;
  for(let i=0;i<8;i++)q.observe(43,1);
  assert.ok(q.pixelRatio>=reduced);
  assert.equal(q.setMode('detail'),'detail');
  assert.ok(q.pixelRatio<=profile.dprMax);
  assert.equal(q.setMode('auto'),'auto');
  assert.ok(pixels.length>=3);
});

test('new world retains the original approved lake and its assets, without modifying original viewer',()=>{
  assert.match(sourceGame,/Beverly-approved-dressed\.glb/);
  for(const marker of [
    'installCanyonV6()','Beverly-approved-dressed.glb',
    'Gina_6_FITTED_GOLD_BIKINI.glb','installMasonPlayer',
    'installStaceyFlatheads','loadFishUnderwater',
    'createStaceyPurpleTrails','hiddenCave','water.material',
    "if(depthMode==='dive'&&pos.y<CY)loadFishUnderwater()"
  ]) assert.ok(newGame.includes(marker),marker);
  assert.match(newGame,/profile\.terrainAngles/);
  assert.match(newGame,/profile\.waterAngles/);
  assert.match(newGame,/boundLakePosition\(pos\.x,pos\.z,CX,CZ\)/);
  assert.match(newGame,/worldQuality\.observe\(fps,count\)/);
  assert.match(newGame,/window\.staceyLakeWorld/);
  assert.match(newGame,/href="\.\.\/worlds\/index\.html"/);
  assert.match(hub,/stacey-lake-world\.html\?spawn=lake/);
  assert.match(hub,/\.\.\/\.\.\/adventures\.html/);
});

test('Stacey Lake inline JavaScript parses as a module',()=>{
  const match=newGame.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(match,'game module must be present');
  const parsed=spawnSync(process.execPath,['--input-type=module','--check'],{input:match[1],encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);
});
