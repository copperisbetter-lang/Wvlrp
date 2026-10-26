import {chromium} from 'playwright';
import {resolve,dirname,join} from 'node:path';
const file=resolve(process.argv[2]);
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
  const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+file,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>document.getElementById('stage')?.dataset.ready==='true',null,{timeout:90000});
  const info=await page.locator('#stats').innerText();
  console.log('SANDY_GLTF_LOADED',info);
  if(!info.includes('meshes'))throw Error('No mesh metadata after load');
  const sliders=page.locator('.morph-input');
  if(await sliders.count()){
    await sliders.first().fill('0.4');
    const got=await page.locator('.morph-row output').first().innerText();
    if(got!=='40%')throw Error('Morph did not respond: '+got);
  }
  await page.getByRole('button',{name:'Face close-up'}).click();
  await page.getByRole('button',{name:'3/4 view'}).click();
  await page.getByRole('button',{name:'Reset'}).click();
  await page.screenshot({path:join(dirname(file),'Sandy_Blonde_Android_Smoke.png'),fullPage:true});
  if(errors.length)throw Error('Browser JS exceptions: '+errors.join(' ; '));
  console.log('SANDY_ANDROID_VIEWER_SMOKE_PASS',info);
} finally{if(browser)await browser.close();}
