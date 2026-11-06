import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const original=readFileSync(path.join(root,'../base-camp/stacey-dive.html'),'utf8');
const separate=readFileSync(path.join(root,'../base-camp/stacey-lake-world.html'),'utf8');
const worldHub=readFileSync(path.join(root,'../worlds/index.html'),'utf8');
const moduleCode=html=>html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

test('separate Stacey Lake has exactly the approved gameplay code and rendering',()=>{
  const originalCode=moduleCode(original),separateCode=moduleCode(separate);
  assert.ok(originalCode && separateCode);
  const worldStamp="window.staceyLakeWorld={id:'the-wild:stacey-lake:v1',label:'Stacey Lake',terrainRadiusM:340,playableRadiusM:338,originalRenderSettings:true};\n";
  assert.ok(separateCode.includes(worldStamp));
  assert.equal(separateCode.replace(worldStamp,''),originalCode,
    'standalone world must not alter approved lake physics, fish, characters, water, rendering or motion');
});

test('lake bounds, approved scene, water reflections and dive-only fish are restored',()=>{
  assert.match(separate,/const N=384,R=150/);
  assert.match(separate,/const WN=384,WR=96/);
  assert.match(separate,/const r=Math\.hypot\(pos\.x-CX,pos\.z-CZ\);if\(r>338\)/);
  assert.match(separate,/new Water\(waterGeo,/);
  assert.match(separate,/Water\.js planar reflection/);
  assert.doesNotMatch(separate,/reflectionRate|renderLakeReflection|worldQuality|profile\.terrainAngles|profile\.waterAngles/);
  for(const marker of [
    'Beverly-approved-dressed.glb',
    'Gina_6_FITTED_GOLD_BIKINI.glb',
    'installCanyonV6()',
    'installMasonPlayer',
    'installStaceyFlatheads',
    "if(depthMode==='dive'&&pos.y<CY)loadFishUnderwater()",
    'staceyWaterfall'
  ]) assert.ok(separate.includes(marker),marker);
});

test('separate world has its own selectable entry and an exit to world hub',()=>{
  assert.match(worldHub,/stacey-lake-world\.html\?spawn=lake/);
  assert.match(separate,/id="exitWorld"/);
  assert.match(separate,/href="\.\.\/worlds\/index\.html"/);
  assert.match(separate,/the-wild:stacey-lake:v1/);
  assert.match(separate,/noindex,nofollow/);
});

test('copied original module syntax remains valid',()=>{
  const code=moduleCode(separate);
  const parsed=spawnSync(process.execPath,['--input-type=module','--check'],{input:code,encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);
});