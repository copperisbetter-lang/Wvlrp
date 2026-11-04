const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const r=await page.goto('http://127.0.0.1:8765/world-creator/character-previews/beverly-postop/viewer.html?kneelqa=1',{waitUntil:'domcontentloaded',timeout:55000});
 assert.equal(r.status(),200);
 await page.waitForFunction(()=>window.beverlyViewerQA?.().clips===77&&typeof window.beverlyMotionRepairQA==='function',{timeout:60000});
 const originalPresets=await page.evaluate(()=>window.beverlyGaitPresetsQA());
 await page.locator('#toggleControls').click();
 await page.locator('#elbowsKnees').click();
 await page.waitForFunction(()=>{
   const p=window.beverlyMotionRepairQA();
   return p.inspectionPose==='elbows-knees'&&p.headY!==null&&p.elbowMinY!==null;
 },{timeout:15000});
 // Diagnostic pose has an intentional animated transition; source clip name
 // changes first, but joint transforms settle only at 'in-pose' frame stage.
 await page.waitForFunction(()=>{
   const sessions=window.beverlyDiagnosticReport?.()?.sessions;
   const last=sessions?.at(-1);
   return last?.label==='Elbows & Knees'&&last.frames?.some(f=>f.stage==='in-pose');
 },{timeout:30000});
 await page.waitForTimeout(300);
 const p=await page.evaluate(()=>window.beverlyMotionRepairQA());
 console.log('BEVERLY_KNEEL_POSE_MEASURED',JSON.stringify(p));
 // ALWAYS capture independent visual evidence before assertions.
 await page.locator('#toggleControls').click();
 await page.screenshot({path:'/tmp/beverly-kneel-side-framed.png'});
 await page.locator('#toggleControls').click();
 await page.locator('#back').click();
 await page.locator('#toggleControls').click();
 await page.screenshot({path:'/tmp/beverly-kneel-rear-framed.png'});
 assert.ok(p.headY>=.23&&p.headY<=.85,'Head against floor');
 assert.ok(p.headAboveElbowsM>=.16,'Head fails to clear grounded forearms');
 assert.ok(p.elbowMinY>=-.03&&p.elbowMinY<=.16,'Elbows not grounded');
 assert.ok(p.kneeMinY>=-.03&&p.kneeMinY<=.20,'Knees not grounded');
 assert.ok(p.pelvisAboveKneeM>=.32&&p.pelvisAboveKneeM<=.60,'Pelvis/knee angle incorrect');
 assert.ok(p.spineRestDeviationDeg<=4&&p.neckRestDeviationDeg<=4,'Unwanted spine/neck hinge');
 const after=await page.evaluate(()=>window.beverlyGaitPresetsQA());
 assert.deepEqual(after.savedWalk,originalPresets.savedWalk,'Approved Walk modified');
 assert.deepEqual(after.savedRun,originalPresets.savedRun,'Approved Run modified');
 assert.equal(errors.length,0,errors.join(' | '));
 console.log('BEVERLY_KNEEL_POSE_QA_PASS');
 await browser.close();
})().catch(e=>{console.error('BEVERLY_KNEEL_POSE_QA_FAIL',e);process.exit(1)});
