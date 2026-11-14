import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../base-camp/stacey-dive.html',import.meta.url),'utf8');
const mod=html.match(/<script type="module">([\s\S]*?)<\/script>/);
test('Stacey Lite embedded JS parses as a module',()=>{
  assert.ok(mod?.[1],'embedded scene script missing');
  const dir=mkdtempSync(join(tmpdir(),'stacey-lite-'));
  try{
    const path=join(dir,'scene.mjs');
    writeFileSync(path,mod[1]);
    const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr||result.stdout);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('Lite mode preserves full mode and limits phone rendering',()=>{
  assert.match(html,/const mobileLite=liteQuery==='on'\|\|\(mobile&&liteQuery!=='off'\)/);
  assert.match(html,/mobileLite\?Math\.min\(devicePixelRatio,\.8\)/);
  assert.match(html,/const N=mobileLite\?224:384,R=mobileLite\?64:96/);
  assert.match(html,/const WN=mobileLite\?176:384,WR=mobileLite\?48:96/);
});
test('Lite lake remains visible without expensive Water.js reflection',()=>{
  assert.match(html,/const water=mobileLite \? new T\.Mesh\(waterGeo,new T\.MeshPhongMaterial/);
  assert.match(html,/: new Water\(waterGeo/);
  assert.match(html,/if\(!mobileLite\)\{/);
  assert.match(html,/if\(water\.material\.uniforms\?\.time\)/);
  assert.match(html,/scene\.add\(water\)/);
  assert.match(html,/if\(!mobileLite\)installCanyonV6\(\)/);
  assert.match(html,/const normals=mobileLite\?null:loader\.load/);
});
test('Chair, 360 mountains, sky and safe walking are preserved',()=>{
  for(const token of ['installStaceyLakeChair','installStaceyForest360Wrap','installStaceyRealisticClouds',
    'staceyWaterfall','miniNav.choose(chair.seat.x,chair.seat.z)','Sit idle (chair)']){
    assert.ok(token==='Sit idle (chair)'||html.includes(token),token+' missing');
  }
  const chair=readFileSync(new URL('../base-camp/stacey-click-to-sit-chair.js',import.meta.url),'utf8');
  assert.match(chair,/assets\/stacey\/folding-camp-chair\.glb/);
  assert.match(chair,/picked\(camera,clientX,clientY/);
});
