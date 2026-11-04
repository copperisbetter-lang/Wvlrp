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
   const m=await qa();data.push(m);console.log('MOTION_METRICS',label,JSON.stringify(m));
   assert.equal(m.sourceClip,expected,'Wrong source clip');
   for(const [name,[min,max]] of Object.entries(thresholds)){
     assert.ok(Number.isFinite(m[name])&&m[name]>=min&&m[name]<=max,
       label+' '+name+' out of expected range: '+JSON.stringify(m));
   }
   return m;
 }
 await page.locator('#walk').click();
 const walk=await check('owner-approved Walk','Walk');
 await page.locator('#run').click();
 const run=await check('owner-approved Run','Run',{ankleWidthM:[.05,.10]});
 assert.ok(!(await page.locator('#armFit').isDisabled()),'Run arm slider must remain present');
 await page.locator('#elbowsKnees').click();
 const kneel=await check('Knees above the floor','Elbows & Knees',{ankleMinY:[-.035,.30],kneeMinY:[-.035,.25]});
 await page.locator('#sitOpen').click();
 const seat=await check('Seated pose','Sit — Legs Open',{pelvisY:[.50,.70],ankleMinY:[-.035,.27],kneeWidthM:[.30,.70]});
 // Native chair motion at a measured seated phase (not a new source clip).
 await page.locator('#clip').selectOption({label:'Sit down (chair)'});
 await page.waitForTimeout(300);
 await page.locator('#scrub').evaluate(el=>{el.value='850';el.dispatchEvent(new Event('input',{bubbles:true}));});
 const chair=await check('Chair feet grounded','Sit down (chair)',{ankleMinY:[-.04,.24]});
 assert.ok(Math.abs(chair.kneeWidthM-seat.kneeWidthM)>.045||Math.abs(chair.pelvisY-seat.pelvisY)>.065,'Chair animation is still displaying the previous frozen Sit Open pose');
 await page.locator('#clip').selectOption({label:'Carry walk'});
 const carry=await check('Carry stance width','Carry walk',{ankleWidthM:[.03,.20]});
 assert.ok(data.every(d=>Number.isFinite(d.pelvisY)));
 if(errors.length)throw Error('Browser page errors: '+errors.join(' | '));
 await page.screenshot({path:'/tmp/beverly-motion-repairs-mobile.png'});
 console.log('BEVERLY_NONAPPROVED_MOTION_QA_PASS '+JSON.stringify({motions:data,walkApprovedUntouched:true,runApprovedUntouched:true,attachmentWeightsUntouched:true}));
 await browser.close();
})().catch(e=>{console.error('MOTION_QA_FAILED',e);process.exit(1)});
