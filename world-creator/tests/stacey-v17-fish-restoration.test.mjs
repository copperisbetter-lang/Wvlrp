import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../base-camp');
const read=(file)=>fs.readFileSync(path.join(dir,file),'utf8');

test('Stacey V17 imports and runs both original fish schools',()=>{
 const game=read('stacey-dive.html');
 assert.match(game,/import \{installBass\} from '\.\/stacey-bass\.js'/);
 assert.match(game,/import \{installStaceyFlatheads\} from '\.\/stacey-flatheads-restored\.js'/);
 assert.match(game,/const flatheadSystem=installStaceyFlatheads\(/);
 assert.match(game,/installBass\(\{T,GLTFLoader,scene,CX,CZ,CY,outer,inner,diagnostics:diag\}\)/);
 assert.match(game,/flatheadSystem\.update\(\(now-start\)\/1000,dt,pos\)/);
 assert.match(game,/bassSystem\?\.update\)bassSystem\.update\(dt,pos\)/);
 assert.match(game,/bass · /);
 assert.match(game,/flatheads/);
});

test('Bass GLB is pinned to the verified earlier asset-bearing commit, not absent V16 path',()=>{
 const bass=read('stacey-bass.js');
 assert.match(bass,/COUNT=250/);
 assert.match(bass,/9eb1ce8ee868d0703f52c7fdcd1bff91dc22b932/);
 assert.match(bass,/model_67a_-_largemouth_bass\.glb/);
 assert.match(bass,/nextWave\+=120/);
 assert.match(bass,/cloneSkinned/);
 assert.match(bass,/f\.children\[0\]\.rotation\.x=leap>=0\?/);
});

test('Approved seventy flathead sizes and underwater lakebed cruising restored',()=>{
 const cat=read('stacey-flatheads-restored.js');
 assert.match(cat,/i<70/);
 assert.match(cat,/i<30\?40:i<60\?20:60/);
 assert.match(cat,/flathead-catfish\.glb/);
 assert.match(cat,/const targetY=Math\.min\(CY-\.65,bottom\+f\.offset/);
 assert.match(cat,/distanceToSquared\(playerPosition\)<65\*65/);
 assert.match(cat,/get count\(\)/);
});

test('Approved water shader and player action console are left in original scene',()=>{
 const game=read('stacey-dive.html');
 for(const name of ['actionRun','actionFly','actionSwim','actionDive','actionSit'])assert.match(game,new RegExp(name));
 assert.match(game,/water\.material\.fragmentShader/);
 assert.match(game,/createStaceyPurpleTrails/);
 assert.match(game,/new URLSearchParams\(location\.search\)\.get\('spawn'\)==='lake'/);
});
