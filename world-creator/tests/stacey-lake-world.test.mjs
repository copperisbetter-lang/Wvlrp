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
    'Gina_6_FITTED_GOLD_BIKINI.glb',
    'installCanyonV6()',
    'installGinaPlayer',
    'installStaceyFlatheads',
    "if(depthMode==='dive'&&pos.y<CY)loadFishUnderwater()",
    'staceyWaterfall'
  ]) assert.ok(separate.includes(marker),marker);
});

test('Beverly no longer spawns while Gina retains native Walk',()=>{
  for(const page of [original,separate]){
    assert.doesNotMatch(page,/Beverly-approved-dressed\.glb|installBeverlyShorelineWalk|installBeverlyArmSwing|connectGinaWalk/);
    assert.match(page,/diag\.assets\.Beverly='offstage \(owner requested removal\)'/);
    assert.match(page,/Gina_6_FITTED_GOLD_BIKINI\.glb/);
    assert.match(page,/asset\.animations\.find\(a=>a\.name==='Walk'\)/);
    assert.match(page,/ginaBeachNPC=installGinaBeachWalk/);
    assert.match(page,/ginaBeachNPC\?\.update\(dt\)/);
  }
});

test('playable Gina is an isolated clone with all 77 source animations, beach Gina untouched',()=>{
  const player=readFileSync(path.join(root,'../base-camp/stacey-gina-player.js'),'utf8');
  const native=JSON.parse(readFileSync(path.join(root,'../../prototypes/gina6-20261102/Gina_6_NATIVE_BIKINI_QA.json'),'utf8'));
  assert.equal(native.clothed.animation_count,77);
  for(const name of ['Idle','Walk','Run','Walk backwards','Strafe left','Strafe right','Sit idle (chair)']){
    assert.ok(native.clothed.animation_names.includes(name),name);
  }
  for(const page of [original,separate]){
    assert.doesNotMatch(page,/installMasonPlayer|masonPlayer\.update|staceyMason/);
    assert.match(page,/import \{installGinaPlayer\}/);
    assert.match(page,/ginaPlayer\.attach\(asset\)/);
    assert.match(page,/ginaPlayer\.update\(/);
    assert.match(page,/GINA PLAYER · 77 ANIMATIONS/);
    assert.match(page,/ginaAnimationSelect\.onchange=/);
    assert.match(page,/ginaBeachNPC=installGinaBeachWalk/);
    assert.match(page,/ginaBeachNPC\?\.update\(dt\)/);
  }
  assert.match(player,/cloneSkinned\(asset\.scene\)/);
  assert.match(player,/new T\.AnimationMixer\(model\)/);
  assert.match(player,/const clips=new Map\(\)/);
  assert.match(player,/asset\.animations\.map\(clip=>clip\.name\)/);
  assert.match(player,/play\('Idle'\)/);
  assert.match(player,/target='Run'/);
  assert.match(player,/target='Walk'/);
  assert.match(player,/carrier\.visible=visible/);
});

test('new Gina player module parses as JavaScript without needing a game browser',()=>{
  const module=readFileSync(path.join(root,'../base-camp/stacey-gina-player.js'),'utf8');
  const parsed=spawnSync(process.execPath,['--input-type=module','--check'],{input:module,encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);
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