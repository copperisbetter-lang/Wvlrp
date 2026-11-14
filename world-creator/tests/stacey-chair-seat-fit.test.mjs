import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const src=new URL('../base-camp/',import.meta.url);
const chair=readFileSync(new URL('stacey-click-to-sit-chair.js',src),'utf8');
const gina=readFileSync(new URL('stacey-gina-player.js',src),'utf8');
const game=readFileSync(new URL('stacey-dive.html',src),'utf8');
test('chair uses physical seat geometry and a world-space pelvis anchor',()=>{
 assert.match(chair,/chair\.localToWorld\(new T\.Vector3\(0,0\.55,-0\.07\)\)/);
 assert.match(chair,/return \{state,chair,picked,seat:\{x,z\},seatPose,yaw:0\}/);
 assert.match(game,/seatTarget:chairSeated\?chair\.seatPose:null/);
});
test('Gina aligns animated Hips rather than guessed model origin',()=>{
 assert.match(gina,/rig\.bones\.Hips\.getWorldPosition\(hipWorld\)/);
 assert.match(gina,/const anchorChair=Boolean\(sitting&&seatTarget&&rig\?\.bones\?\.Hips\)/);
 assert.match(gina,/seatOffset\.x\+=T\.MathUtils\.clamp/);
 assert.match(gina,/seatOffset\.y\+=T\.MathUtils\.clamp/);
 assert.match(gina,/seatOffset\.z\+=T\.MathUtils\.clamp/);
 assert.match(gina,/if\(!anchorChair\)seatOffset\.set\(0,0,0\)/);
 assert.match(gina,/target=clips\.has\('Sit idle \(chair\)'\)/);
});
test('navigation, chair seat and underwater protections remain wired',()=>{
 assert.match(game,/miniNav\.choose\(chair\.seat\.x,chair\.seat\.z\)/);
 assert.match(game,/isSitting=true;chairSeated=true;playerHeading=chair\.yaw/);
 assert.match(game,/function toggleSit\(\)\{chairWalk=false;chairSeated=false;/);
 assert.match(game,/const mobileLite=liteQuery/);
 assert.match(game,/installStaceyForest360Wrap/);
});
test('chair module and Gina player module parse',()=>{
 for(const source of [chair,gina]){
  const dir=mkdtempSync(join(tmpdir(),'seat-'));
  try{
   const file=join(dir,'test.mjs');writeFileSync(file,source);
   const cmd=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
   assert.equal(cmd.status,0,cmd.stderr);
  }finally{rmSync(dir,{force:true,recursive:true});}
 }
});
