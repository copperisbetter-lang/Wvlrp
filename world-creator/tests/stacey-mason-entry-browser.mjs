import { chromium } from 'playwright-core';
import { strict as assert } from 'node:assert';
const browser=await chromium.launch({
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle',
    '--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const page=await browser.newPage({viewport:{width:412,height:915},
  deviceScaleFactor:1,hasTouch:true,isMobile:true});
const issues=[];
page.on('pageerror',e=>issues.push('JS: '+e.message));
page.on('console',e=>{if(e.type()==='error')issues.push('Console: '+e.text().slice(0,200));});
try{
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded',timeout:45000});
  const play=page.locator('a.button').filter({hasText:'Play Game'}).first();
  assert.ok(await play.count(),'Homepage must display Play Game');
  await play.click();
  await page.waitForURL(/stacey-dive\.html\?spawn=lake/,{timeout:30000});
  assert.ok(await page.locator('#actionConsole #viewMode').count(),'Third-person button must be inside game console');
  assert.equal((await page.locator('#actionConsole #viewMode').innerText()).replace(/\s+/g,' ').trim(),'3RD PERSON');
  assert.equal(await page.locator('#actionConsole button').count(),6,'Game console must contain six controls');
  await page.waitForFunction(()=>window.staceyPlayable?.avatar==='Mason',{timeout:40000});
  console.log('ENTRY',JSON.stringify(await page.evaluate(()=>({
    avatar:window.staceyPlayable?.avatar,
    view:window.staceyPlayable?.view,
    spawn:window.staceyDiagnostics?.defaultSpawn
  }))));
  assert.equal(await page.evaluate(()=>window.staceyPlayable.avatar),'Mason');
  await page.waitForFunction(()=>window.staceyPlayable?.masonReady===true ||
    !!window.staceyPlayable?.masonError,null,{timeout:105000});
  const state=await page.evaluate(()=>({
    ready:window.staceyPlayable.masonReady,
    error:window.staceyPlayable.masonError,
    models:window.staceyMason?.model?.children?.length||0,
    garment:window.staceyMason?.clothing?.name,
    meshFaces:window.staceyMason?.clothing?.geometry?.index?.count/3||0,
    clips:window.staceyMason?.clips,
    bass:window.staceyFish?.bass,flatheads:window.staceyFish?.flatheads
  }));
  console.log('MASON_LOAD',JSON.stringify(state));
  assert.ok(state.ready,'Original Mason GLB + V8 shorts should load: '+JSON.stringify(state));
  assert.ok(state.meshFaces>1200,'V8 body-skinned shorts need full-seat coverage');
  assert.ok(state.clips?.length>=5,'Mason should retain 5 original skeletal clips');
  await page.locator('#actionConsole #viewMode').click();
  assert.equal(await page.evaluate(()=>window.staceyPlayable.view),'first-person');
  assert.equal((await page.locator('#actionConsole #viewMode').innerText()).replace(/\s+/g,' ').trim(),'1ST PERSON');
  await page.waitForFunction(()=>window.staceyMason?.model?.visible===false,null,{timeout:6000});
  await page.locator('#actionConsole #viewMode').click();
  assert.equal(await page.evaluate(()=>window.staceyPlayable.view),'third-person');
  assert.equal((await page.locator('#actionConsole #viewMode').innerText()).replace(/\s+/g,' ').trim(),'3RD PERSON');
  await page.waitForFunction(()=>window.staceyMason?.model?.visible===true,null,{timeout:6000});
  const cameraState=await page.evaluate(()=>({camera:window.staceyDebug.camera.position.toArray(),
    mason:window.staceyMason.carrier.position.toArray(),visible:window.staceyMason.model.visible}));
  const distance=Math.hypot(...cameraState.camera.map((v,i)=>v-cameraState.mason[i]));
  assert.ok(distance>2,'Third-person camera must stand behind Mason, distance='+distance);
  console.log('CONSOLE_THIRD_PERSON_VERIFIED',JSON.stringify({cameraState,distance}));
  await page.waitForTimeout(600);
  await page.screenshot({path:'world-creator/stacey-mason-mobile-test.png'});
  console.log('MASON_BROWSER_QA_PASS',JSON.stringify({state,errors:issues.slice(-8)}));
}catch(e){
 console.log('MASON_BROWSER_QA_FAIL',e.stack||String(e),'ERRORS',JSON.stringify(issues.slice(-18)));
 await page.screenshot({path:'world-creator/stacey-mason-failure.png'}).catch(()=>{});
 throw e;
}finally{await browser.close();}
