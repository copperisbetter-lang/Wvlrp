const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:8765/world-creator/character-previews/beverly-postop/viewer.html?surfaceprobe=1';
 const resp=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 if(resp.status()!==200)throw Error('Viewer load failure '+resp.status());
 await page.waitForFunction(()=>window.beverlySurfaceProbeControl?.textureDump,{timeout:55000});
 const dat=await page.evaluate(()=>window.beverlySurfaceProbeControl.textureDump(['SURG_BEVERLY__base001_1'])['SURG_BEVERLY__base001_1']);
 if(!dat?.uri||dat.width!==1024||dat.height!==1024)throw Error('Unexpected Beverly patch original image');
 fs.writeFileSync('/tmp/Beverly_Original_Join_Texture.png',Buffer.from(dat.uri.split(',')[1],'base64'));
 console.log('PATCH_SOURCE_EXPORTED',dat.width,dat.height);
 if(errors.length)throw Error('Page errors '+errors.join(' | '));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
