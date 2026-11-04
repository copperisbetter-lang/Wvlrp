/* Read-only bent mesh isolation. Do not mutate source GLB.
 * Captures identical post-op elbow/knee pose and camera with:
 * complete clone, transition patch hidden, attachment hidden.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errs=[];page.on('pageerror',e=>errs.push(String(e)));
 const response=await page.goto('http://127.0.0.1:8765/world-creator/character-previews/beverly-postop/viewer.html?surfaceprobe=1&cleanjoin=1&inspect_bent=1',{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.beverlySurfaceProbeControl?.geometryDump && window.beverlyViewerQA?.().clips===77,{timeout:65000});
 const mesh=await page.evaluate(()=>window.beverlySurfaceQA().filter(m=>/^SURG_BEVERLY__base001(_[12])?$/.test(m.name)).map(({name,skinned,triangles,sizeM})=>({name,skinned,triangles,sizeM})));
 console.log('BENT_LAYER_MESH_IDENTIFIERS',JSON.stringify(mesh));
 await page.locator('#toggleControls').click();
 // Match the owner's screenshots: the UI shows RESTORE CLOTHES,
 // therefore the approved fitted clothing is hidden.
 await page.locator('#removeClothes').click();
 assert.equal((await page.evaluate(()=>window.beverlyViewerQA())).swimwearHidden,true,
   'Owner screenshot comparison must run with clothing hidden');
 await page.locator('#elbowsKnees').click();
 await page.waitForFunction(()=>{
   const last=window.beverlyDiagnosticReport?.()?.sessions?.at(-1);
   return last?.label==='Elbows & Knees'&&last.frames?.some(f=>f.stage==='in-pose');
 },{timeout:35000});
 await page.locator('#toggleControls').click();
 const variants=[
  {name:'all',hide:[]},
  {name:'patch-hidden',hide:['SURG_BEVERLY__base001_1']},
  {name:'attachment-hidden',hide:['SURG_BEVERLY__base001_2']},
  {name:'body-hidden',hide:['SURG_BEVERLY__base001']}
 ];
 // Fixed elevated rear and oblique cameras chosen to match owner's screenshots.
 const views=[
   {name:'rear',eye:[0,.98,-1.42],lookY:.56},
   {name:'rear-oblique',eye:[.69,.85,-1.13],lookY:.54},
   {name:'side',eye:[1.42,.65,.30],lookY:.48}
 ];
 for(const view of views){
   for(const variant of variants){
     await page.evaluate((v)=>{
       const api=window.beverlySurfaceProbeControl;
       api.restore();
       if(v.hide.length)api.hideNames(v.hide);
     },variant);
     await page.evaluate(v=>window.beverlySurfaceProbeControl.cameraView(v.eye[0],v.eye[1],v.eye[2],v.lookY),view);
     await page.waitForTimeout(250);
     await page.screenshot({path:'/tmp/beverly-bent-'+view.name+'-'+variant.name+'.png'});
   }
 }
 await page.evaluate(()=>window.beverlySurfaceProbeControl.restore());
 if(errs.length)throw Error('Page errors '+errs.join(' | '));
 console.log('BENT_LAYER_ISOLATION_PASS');
 await browser.close();
})().catch(err=>{console.error('BENT_LAYER_ISOLATION_FAIL',err);process.exit(1)});
