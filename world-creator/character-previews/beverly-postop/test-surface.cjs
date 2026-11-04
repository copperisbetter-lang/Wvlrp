const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const url='http://127.0.0.1:8765/world-creator/character-previews/beverly-postop/viewer.html?surfaceprobe=1&analysis=materials1';
 const resp=await page.goto(url,{waitUntil:'domcontentloaded',timeout:50000});
 if(resp.status()!==200)throw Error('viewer status '+resp.status());
 await page.waitForFunction(()=>!!window.beverlySurfaceProbeControl&&window.beverlySurfaceQA?.()?.length>=25,{timeout:55000});
 const meshes=await page.evaluate(()=>window.beverlySurfaceQA());
 console.log('BEVERLY_SURFACE_MESHES '+JSON.stringify(meshes));
 fs.writeFileSync('/tmp/beverly-surface-meshes.json',JSON.stringify(meshes,null,2));
 await page.evaluate(()=>window.beverlySurfaceProbeControl.cameraView(0,.58,.8,.72));
 await page.waitForTimeout(1500);
 await page.screenshot({path:'/tmp/beverly-surface-all.png'});
 await page.evaluate(()=>window.beverlySurfaceProbeControl.hideNames(['V51','V19','Beverly_Fitted_Swimwear','GINA_6','Flat','Round']));
 await page.waitForTimeout(200);
 await page.screenshot({path:'/tmp/beverly-surface-hidden-accessories.png'});
 await page.evaluate(()=>window.beverlySurfaceProbeControl.restore());
 // Match owner's under-hip camera view at several elevations and isolate
 // the exact join patch versus the body and approved attachment.
 for(const [label,eyeY,targetY,dist] of [
  ['under-view',.31,.71,.63],
  ['upper-hip',.43,.73,.64],
  ['below-hip',.20,.76,.64]
 ]){
  await page.evaluate(([y,ty,z])=>window.beverlySurfaceProbeControl.cameraView(0,y,z,ty),[eyeY,targetY,dist]);
  await page.waitForTimeout(250);
  await page.screenshot({path:'/tmp/beverly-surface-'+label+'-all.png'});
  await page.evaluate(()=>window.beverlySurfaceProbeControl.hideNames(['SURG_BEVERLY__base001_1']));
  await page.waitForTimeout(150);
  await page.screenshot({path:'/tmp/beverly-surface-'+label+'-without-transition.png'});
  await page.evaluate(()=>window.beverlySurfaceProbeControl.restore());
  await page.evaluate(()=>window.beverlySurfaceProbeControl.hideNames(['SURG_BEVERLY__base001_2']));
  await page.waitForTimeout(150);
  await page.screenshot({path:'/tmp/beverly-surface-'+label+'-without-attachment.png'});
  await page.evaluate(()=>window.beverlySurfaceProbeControl.restore());
 }
 const names=meshes.map(x=>x.name);
 const candidates=names.filter(n=>/base|body|skin|flat|round|att|pelv|vag|thigh|pant|brief|seam/i.test(n));
 console.log('BEVERLY_SURFACE_CANDIDATES '+JSON.stringify(candidates));
 for(const name of candidates.slice(0,6)){
   await page.evaluate(n=>{window.beverlySurfaceProbeControl.restore();window.beverlySurfaceProbeControl.showOnly([n]);},name);
   await page.waitForTimeout(150);
   const safe=name.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,30);
   await page.screenshot({path:'/tmp/beverly-surface-only-'+safe+'.png'});
 }
 await page.evaluate(()=>window.beverlySurfaceProbeControl.restore());
 console.log('BEVERLY_SURFACE_STATE '+JSON.stringify(await page.evaluate(()=>window.beverlySurfaceProbeControl.state()).then(o=>({camera:o.camera,target:o.target}))));
 if(errors.length)throw Error('Viewer page errors '+errors.join(' | '));
 await browser.close();
})().catch(e=>{console.error('BEVERLY_SURFACE_PROBE_FAIL',e);process.exit(1)});
