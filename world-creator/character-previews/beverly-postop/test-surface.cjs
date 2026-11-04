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
 // Controlled source dump: these are separate, existing skinned geometries.
 // Saves coordinates and influences for OFFLINE overlap analysis, not edit.
 const geo=await page.evaluate(()=>window.beverlySurfaceProbeControl.geometryDump());
 fs.writeFileSync('/tmp/beverly-three-layer-geometry.json',JSON.stringify(geo));
 console.log('BEVERLY_GEOM_DUMP '+JSON.stringify(Object.fromEntries(
  Object.entries(geo).map(([k,v])=>[k,{vertices:v.vertexCount,triangles:v.triangleCount,
   skinned:v.skin.length>0,indexed:!!v.index}])
 ))));
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

 await page.evaluate(()=>window.beverlySurfaceProbeControl.cameraView(0,.31,.63,.71));
 for(const [factor,units] of [[0,0],[10,10],[100,100],[1000,1000],[-10,-10]]){
   await page.evaluate(([f,u])=>window.beverlySurfaceProbeControl.patchDepthBias(f,u),[factor,units]);
   await page.waitForTimeout(180);
   await page.screenshot({path:'/tmp/beverly-patch-bias-'+factor+'-'+units+'.png'});
 }
 await page.evaluate(()=>window.beverlySurfaceProbeControl.restorePatchMaterial());

 // Does the joint-driven patch also distort in a deep hip fold?
 await page.locator('#toggleControls').click();
 await page.locator('#elbowsKnees').click();
 await page.waitForTimeout(1800);
 await page.evaluate(()=>window.beverlySurfaceProbeControl.cameraView(1.45,.55,.35,.62));
 await page.waitForTimeout(350);
 await page.screenshot({path:'/tmp/beverly-kneel-patch-on.png'});
 await page.evaluate(()=>window.beverlySurfaceProbeControl.hideNames(['SURG_BEVERLY__base001_1']));
 await page.waitForTimeout(200);
 await page.screenshot({path:'/tmp/beverly-kneel-patch-hidden.png'});
 await page.evaluate(()=>window.beverlySurfaceProbeControl.restore());
 await page.evaluate(()=>window.beverlySurfaceProbeControl.patchDepthBias(100,100));
 await page.waitForTimeout(200);
 await page.screenshot({path:'/tmp/beverly-kneel-patch-depth100.png'});
 await page.evaluate(()=>window.beverlySurfaceProbeControl.restorePatchMaterial());
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
