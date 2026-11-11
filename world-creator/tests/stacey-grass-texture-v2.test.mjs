import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const asset = readFileSync(new URL('../../assets/stacey-rugged-meadow-grass-v1.webp', import.meta.url));
const game = readFileSync(new URL('../base-camp/stacey-dive.html', import.meta.url),'utf8');

test('selected second grass texture is present, matches the uploaded texture, and fits mobile budget',()=>{
  assert.equal(asset.toString('ascii',0,4),'RIFF');
  assert.equal(asset.toString('ascii',8,12),'WEBP');
  assert.equal(createHash('sha256').update(asset).digest('hex'),'e6e839fb56222a31a2de432ed9de0dc55ce40a090e4b0c138c60bf7483883305');
  assert.ok(asset.length > 100000 && asset.length < 300000,'compressed grass image should be under 300 KB');
});

test('the actual lake terrain shader samples the new image without changing mesh geometry',()=>{
  assert.match(game,/texture\('\.\.\/\.\.\/assets\/stacey-rugged-meadow-grass-v1\.webp','rugged grass'\)/);
  assert.match(game,/s\.uniforms\.grassMap=\{value:ruggedGrass\}/);
  assert.match(game,/uniform sampler2D grassMap;/);
  assert.match(game,/vec3 grassC=texture2D\(grassMap,vGround\.xz\*\.22\)\.rgb;/);
  assert.match(game,/vec3 c=mix\(sandC,hillsideC,forest\);/);
});

test('beach remains sand and off toggle restores original hillside color',()=>{
  assert.match(game,/get\('grass'\)!=='off'/);
  assert.match(game,/s\.uniforms\.grassEnabled=\{value:ruggedGrassEnabled\?1:0\}/);
  assert.match(game,/mix\(soilC\*vec3\(\.60,\.88,\.48\),ruggedGrassC,grassEnabled\)/);
  assert.match(game,/float forest=max\(smoothstep\(6\.\+n\*2\.,17\.,r-o\),island\*\.8\);/);
  assert.match(game,/vec3 sandC=texture2D\(sandMap/);
});

test('keeps the existing mountain panorama and animated sky module intact',()=>{
  assert.match(game,/installStaceyForest360Wrap\(/);
  assert.match(game,/installStaceyRealisticClouds\(/);
  assert.match(game,/const sky=new Sky\(\)/);
});
