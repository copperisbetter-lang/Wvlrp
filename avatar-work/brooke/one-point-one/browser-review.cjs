// Exercise the actual mobile WebGL viewer, including texture/shape isolation.
const {chromium}=require(process.env.BROOKE_PLAYWRIGHT || 'playwright');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  const page=await browser.newPage({viewport:{width:709,height:1250},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/world-creator/brooke-1.1-head-detail.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('3 meshes'),{timeout:120000});
  await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
  const stage=page.locator('#stage');
  const out='world-creator/brooke-1.1-review';
  await page.selectOption('#view',{label:'Front'});
  await page.locator('#zoom').evaluate(el=>{el.value='125';el.dispatchEvent(new Event('input',{bubbles:true}));});
  for(const mode of ['skin','texture','clay']){
   await page.selectOption('#surface',mode);await page.waitForTimeout(700);
   await stage.screenshot({path:path.join(out,'webgl-front-'+mode+'.png')});
  }
  await page.selectOption('#surface','skin');await page.locator('#zoom').evaluate(el=>{el.value='75';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.selectOption('#view',{label:'Side'});await page.waitForTimeout(700);
  await stage.screenshot({path:path.join(out,'webgl-profile.png')});
  await page.click('#resetAll');
  if(await page.locator('#surface').inputValue()!=='skin')throw Error('Reset did not restore skin material');
  if(errors.length)throw Error(errors.join('\n'));
  const report={browser:await browser.version(),status:await page.locator('#status').textContent(),surface_modes:['skin','texture','clay'],front_profile_captured:true,page_errors:errors};
  fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
