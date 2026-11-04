const {chromium}=require('playwright');
const zlib=require('zlib');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
 const context=await browser.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true,acceptDownloads:true});
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://wvlrp.com'});
 const page=await context.newPage(), errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const base='https://wvlrp.com/world-creator/character-previews/beverly-postop/viewer.html';
 let loaded=false;
 for(let i=0;i<10;i++){
  const resp=await page.goto(base+'?diag=full69v2&attempt='+i,{waitUntil:'domcontentloaded',timeout:40000});
  if(resp?.status()!==200)continue;
  try{await page.waitForFunction(()=>typeof window.beverlyDiagnosticReport==='function'&&window.beverlyDiagnosticsQA?.().ready===true&&window.beverlyViewerQA?.().options===79,{timeout:15000});loaded=true;break}
  catch(e){await page.waitForTimeout(4000)}
 }
 assert.ok(loaded,'New diagnostic viewer 79 poses + 69 bones must load: '+await page.locator('#status').textContent());
 const qa=()=>page.evaluate(()=>window.beverlyDiagnosticsQA());
 const report=()=>page.evaluate(()=>window.beverlyDiagnosticReport());
 await page.locator('#toggleControls').click();
 await page.locator('#walk').click();
 await page.waitForTimeout(3300);
 let q=await qa();assert.ok(q.sessionCount>=1,'No Walk session saved');
 let r=await report(),walk=r.sessions[r.sessions.length-1];
 assert.equal(walk.label,'Walk');
 assert.ok(walk.complete,'Walk record not completed');
 assert.ok(walk.frames.length>=18,'Walk entry did not capture 18 frames: '+walk.frames.length);
 assert.equal(walk.jointHierarchy.length,69,'Whole-body joint hierarchy incomplete');
 assert.ok(walk.frames.some(f=>f.stage==='entering-pose'),'No transition frames');
 assert.ok(walk.frames.some(f=>f.stage==='in-pose'),'No sustained pose frames');
 const f=walk.frames[2],hips=f.joints.Hips;
 assert.ok(hips&&hips.worldPositionM.length===3&&hips.localQuaternionXYZW.length===4&&hips.worldEulerDeg.length===3,
  'Missing full world/local joint poses');
 assert.ok(typeof f.bodyMetrics.ankleCenterWidthM==='number','Missing measured stance width');
 await page.locator('#run').click();
 await page.waitForTimeout(3300);
 q=await qa();assert.ok(q.sessionCount>=2,'Run not captured');
 await page.locator('#elbowsKnees').click();
 await page.waitForTimeout(2900);
 q=await qa();assert.ok(q.sessionCount>=3,'Elbows Knees inspection pose not captured');
 await page.locator('#sitOpen').click();
 await page.waitForTimeout(2900);
 q=await qa();assert.ok(q.sessionCount>=4,'Sit Legs Open inspection pose not captured');
 await page.locator('#diagOpen').click();
 assert.equal(await page.locator('#diagPanel').isVisible(),true);
 const l=await page.locator('#diagLive').textContent();
 assert.ok(l.includes('69-joint skeleton'),'Live measurements not displayed');
 await page.screenshot({path:'/tmp/beverly-diagnostics-panel.png',fullPage:true});
 await page.locator('#diagCopy').click();
 await page.waitForTimeout(500);
 const copied=await page.evaluate(()=>navigator.clipboard.readText());
 const prefix='BEVERLY_POSE_DIAGNOSTICS_GZIP_BASE64_V1:';
 assert.ok(copied.startsWith(prefix),'Copy All did not yield single compressed report: '+copied.slice(0,80));
 const parsed=JSON.parse(zlib.gunzipSync(Buffer.from(copied.slice(prefix.length),'base64')).toString('utf8'));
 assert.equal(parsed.schema,'WVLRP_BEVERLY_ALL_POSE_DIAGNOSTICS_V1');
 assert.ok(parsed.sessions.length>=4);
 assert.ok(parsed.sessions.every(s=>s.frames.length>=10&&s.jointHierarchy.length===69),'Incomplete report');
 assert.ok(parsed.sessions.every(s=>s.frames.every(f=>Object.keys(f.joints).length===69)),'Missing full joint frame');
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#diagSave').click();
 const download=await downloadPromise;
 assert.ok(download.suggestedFilename().startsWith('Beverly_Pose_Diagnostics_ALL_'));
 const path=await download.path();
 const fs=require('node:fs');
 const fullJSON=JSON.parse(fs.readFileSync(path,'utf8'));
 assert.equal(fullJSON.sessions.length,parsed.sessions.length);
 assert.ok(fs.statSync(path).size>100000,'Saved JSON unexpectedly small');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.beverlyDiagnosticsQA?.().sessionCount>=4,{timeout:20000});
 q=await qa();assert.ok(q.storageReady,'IndexedDB not available after reload');
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 console.log('BEVERLY_DIAG_COPY_ALL_QA_PASS',JSON.stringify({
   totalSessions:parsed.sessions.length,frames:parsed.sessions.map(s=>({label:s.label,frames:s.frames.length})),
   skeletonJoints:69,firstStage:walk.frames[0].stage,
   compressedCopyChars:copied.length,downloadedJSONBytes:fs.statSync(path).size,
   persistedAfterReload:q.sessionCount,storageReady:q.storageReady
 }));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
