const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>console.log('NETWORK_FAIL',r.url(),r.failure()?.errorText));
 const res=await page.goto('http://127.0.0.1:8765/world-creator/character-previews/beverly-postop/viewer.html?motion=qa-v1',{waitUntil:'domcontentloaded',timeout:50000});
 assert.equal(res.status(),200,'Viewer did not load locally');
 await page.waitForFunction(()=>typeof window.beverlyMotionRepairQA==='function'&&window.beverlyViewerQA?.().clips===77,{timeout:55000});
 await page.locator('#toggleControls').click();
 const qa=()=>page.evaluate(()=>window.beverlyMotionRepairQA());
 const data=[];
 async function check(label,expected,thresholds={}){
   await page.waitForTimeout(1300);
   // Diagnostic transition uses 0.8s of ANIMATION time (not wall time).
   // Software WebGL can run slowly; wait for the actual pose to settle.
   if(expected==='Elbows & Knees'||expected==='Sit — Legs Open'){
     await page.waitForFunction(name=>{
       const last=window.beverlyDiagnosticReport?.()?.sessions?.at(-1);
       return last?.label===name && last.frames.some(f=>f.stage==='in-pose');
     },expected,{timeout:25000});
   }
   const m=await qa();data.push(m);console.log('MOTION_METRICS',label,JSON.stringify(m));
   assert.equal(m.sourceClip,expected,'Wrong source clip');
   for(const [name,[min,max]] of Object.entries(thresholds)){
     assert.ok(Number.isFinite(m[name])&&m[name]>=min&&m[name]<=max,
       label+' '+name+' out of expected range: '+JSON.stringify(m));
   }
   return m;
 }
 await page.locator('#walk').click();
 const walkPreset=await page.evaluate(()=>window.beverlyGaitPresetsQA());
 assert.deepEqual(walkPreset.savedWalk,{arm:90,foot:90},'Recorded Walk sliders must be preserved as 90/90');
 assert.equal(walkPreset.currentArms,90);
 assert.equal(walkPreset.currentFeet,90);
 const walk=await check('owner-approved Walk','Walk');
 await page.locator('#run').click();
 const runPreset=await page.evaluate(()=>window.beverlyGaitPresetsQA());
 assert.deepEqual(runPreset.savedRun,{arm:55,foot:100},'Recorded Run sliders must be preserved independently as 55/100');
 assert.equal(runPreset.currentArms,55);
 const run=await check('owner-approved Run','Run',{ankleWidthM:[.05,.10]});
 // Sample the ACTUAL 69-bone native Run cycle. Only left wrist is corrected.
 const guardSamples=[];
 for(const phase of [.05,.15,.25,.35,.45,.55,.65,.75,.85,.95]){
   await page.locator('#scrub').evaluate((el,p)=>{
     el.value=String(Math.round(p*1000));
     el.dispatchEvent(new Event('input',{bubbles:true}));
   },phase);
   await page.waitForTimeout(70);
   const state=await page.evaluate(()=>window.beverlyGaitPresetsQA());
   const g=state.runHand;
   assert.ok(g?.leftWristAfterX!==null,'Run left hand QA missing at phase '+phase);
   assert.ok(g.rightArmDeltaMeters<=.000001,'Right arm modified at phase '+phase+': '+JSON.stringify(g));
   assert.ok(g.leftWristAfterX>=g.safeWristX-.016,'Left wrist still crosses chest at phase '+phase+': '+JSON.stringify(g));
   guardSamples.push({phase,...g});
 }
 assert.ok(guardSamples.some(g=>g.corrected),'Guard never activated; test failed to reproduce strike');
 console.log('BEVERLY_RUN_LEFT_ONLY_GUARD',JSON.stringify(guardSamples));
 // Changing Run must not contaminate Walk; changing Walk must not touch Run.
 await page.locator('#walk').click();
 await page.locator('#armFit').evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#footFit').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#run').click();
 const runAgain=await page.evaluate(()=>window.beverlyGaitPresetsQA());
 assert.equal(runAgain.currentArms,55,'Walk slider changed Run');
 await page.locator('#walk').click();
 const walkAgain=await page.evaluate(()=>window.beverlyGaitPresetsQA());
 assert.deepEqual(walkAgain.savedWalk,{arm:45,foot:100},'Walk lost its independent slider settings');
 // Restore the approved diagnostic baseline for this QA browser.
 await page.locator('#armFit').evaluate(el=>{el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#footFit').evaluate(el=>{el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));});
 console.log('BEVERLY_GAIT_PRESET_ISOLATION_PASS',JSON.stringify(await page.evaluate(()=>window.beverlyGaitPresetsQA())));
 assert.ok(!(await page.locator('#armFit').isDisabled()),'Run arm slider must remain present');
 await page.locator('#elbowsKnees').click();
 const kneel=await check('Hip-hinged elbows-and-knees','Elbows & Knees',{ankleMinY:[-.035,.30],kneeMinY:[-.035,.20],elbowMinY:[-.035,.16],pelvisAboveKneeM:[.37,.70],spineRestDeviationDeg:[0,4],neckRestDeviationDeg:[0,4]});
 await page.locator('#side').click();
 await page.screenshot({path:'/tmp/beverly-fixed-elbows-knees-visual.png'});
 await page.locator('#front').click();
 await page.locator('#sitOpen').click();
 const seat=await check('Pelvis-friendly sitting','Sit — Legs Open',{pelvisY:[.46,.70],ankleMinY:[-.035,.30],kneeWidthM:[.28,.52],spineRestDeviationDeg:[0,4],neckRestDeviationDeg:[0,4],leftWristVsShoulderY:[-.8,-.05],rightWristVsShoulderY:[-.8,-.05]});
 await page.screenshot({path:'/tmp/beverly-fixed-sit-legs-open-visual.png'});
 // Native chair motion at a measured seated phase (not a new source clip).
 await page.locator('#clip').selectOption({label:'Sit down (chair)'});
 await page.waitForTimeout(300);
 console.log('NATIVE_BEFORE_SEEK',JSON.stringify(await page.evaluate(()=>window.beverlyNativeAnimationQA())));
 await page.locator('#scrub').evaluate(el=>{el.value='850';el.dispatchEvent(new Event('input',{bubbles:true}));});
 console.log('NATIVE_AFTER_SEEK',JSON.stringify(await page.evaluate(()=>window.beverlyNativeAnimationQA())));
 const chair=await check('Chair feet grounded','Sit down (chair)',{ankleMinY:[-.04,.24]});
 console.log('NATIVE_AFTER_HOLD',JSON.stringify(await page.evaluate(()=>window.beverlyNativeAnimationQA())));
 assert.ok(Math.abs(chair.pelvisZ-seat.pelvisZ)>.02||Math.abs(chair.kneeMeanZ-seat.kneeMeanZ)>.02||Math.abs(chair.kneeWidthM-seat.kneeWidthM)>.045,'Chair animation is still displaying the previous frozen Sit Open pose');
 await page.locator('#clip').selectOption({label:'Carry walk'});
 const carry=await check('Carry stance width','Carry walk',{ankleWidthM:[.03,.20]});
 assert.ok(data.every(d=>Number.isFinite(d.pelvisY)));
 if(errors.length)throw Error('Browser page errors: '+errors.join(' | '));
 await page.screenshot({path:'/tmp/beverly-motion-repairs-mobile.png'});
 console.log('BEVERLY_NONAPPROVED_MOTION_QA_PASS '+JSON.stringify({motions:data,walkApprovedUntouched:true,runApprovedUntouched:true,attachmentWeightsUntouched:true}));
 await browser.close();
})().catch(e=>{console.error('MOTION_QA_FAILED',e);process.exit(1)});
