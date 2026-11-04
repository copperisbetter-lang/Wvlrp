const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('requestfailed',request=>console.log('ASSET_NETWORK_FAIL',request.url(),request.failure()?.errorText));
 const r=await page.goto('http://127.0.0.1:8765/prototypes/gina6-20261102/pose-viewer.html?QA=1',{waitUntil:'domcontentloaded',timeout:55000});
 assert.equal(r.status(),200);
 await page.waitForFunction(()=>window.ginaPoseQA?.().ready&&window.ginaPoseQA?.().clipCount===77,{timeout:65000});
 const results={};
 for(const garment of ['bikini','neutral']){
   if(garment==='neutral'){
     await page.locator('#neutral').click();
     await page.waitForFunction(()=>window.ginaPoseQA?.().selected==='neutral'&&window.ginaPoseQA?.().ready,{timeout:60000});
   }
   for(const [pose,id] of [['kneel','#kneel'],['sit','#sit']]){
     await page.locator(id).click();
     await page.waitForTimeout(600);
     const qa=await page.evaluate(()=>window.ginaPoseQA());
     console.log('GINA_POSE_METRICS',garment,pose,JSON.stringify(qa));
     assert.equal(qa.selected,garment);
     assert.equal(qa.pose,pose);
     assert.equal(qa.boneCount,69);
     assert.equal(qa.clipCount,77);
     assert.ok(Number.isFinite(qa.metrics.pelvisY),'No pelvis joint');
     assert.ok(Number.isFinite(qa.metrics.kneeWidthM),'No knees');
     assert.ok(Number.isFinite(qa.metrics.headY),'No head');
     assert.ok(qa.metrics.kneeWidthM>0,'Collapsed knees');
     if(pose==='kneel'){
       assert.ok(qa.metrics.headY>.18,'Gina head still near floor: '+JSON.stringify(qa.metrics));
       assert.ok(qa.metrics.elbowMinY<.20,'Gina elbows not grounded: '+JSON.stringify(qa.metrics));
       assert.ok(qa.metrics.kneeMinY<.23,'Gina knees not grounded: '+JSON.stringify(qa.metrics));
       for(const [name,heights,maximum] of [
         ['knees',qa.metrics.kneeJointHeightsM,.125],
         ['elbows',qa.metrics.elbowJointHeightsM,.115]
       ]){
         assert.ok(Array.isArray(heights)&&heights.length===2&&heights.every(Number.isFinite),
           name+' bilateral joint measurements unavailable');
         assert.ok(heights.every(h=>h>=.005&&h<=maximum),
           name+' both sides must touch/support ground, not float or penetrate: '+JSON.stringify(qa.metrics));
       }
       assert.ok(qa.metrics.headY>.18,'Head may not be embedded in floor');
       assert.ok(qa.metrics.headAboveElbowsM>.12,'Head must stay above elbow line');
       assert.ok(qa.metrics.kneeBehindPelvisM>.025,'Knees must be BEHIND the hips, not folded ahead: '+JSON.stringify(qa.metrics));
       assert.ok(qa.metrics.torsoDeclineM>.035&&qa.metrics.torsoDeclineM<.36,
         'Natural low torso slope missing: '+JSON.stringify(qa.metrics));
       await page.locator('#side').click();
       await page.screenshot({path:'/tmp/Gina6-'+garment+'-slumped-crawl-side-mobile.png'});
       await page.locator('#back').click();
       await page.screenshot({path:'/tmp/Gina6-'+garment+'-slumped-crawl-rear-mobile.png'});
       await page.locator('#front').click();
     }
     await page.screenshot({path:'/tmp/Gina6-'+garment+'-'+pose+'-mobile.png'});
     results[garment+':'+pose]=qa.metrics;
   }
 }
 await page.locator('#stand').click();
 const standing=await page.evaluate(()=>window.ginaPoseQA());
 assert.equal(standing.pose,'stand');
 assert.ok(standing.modelsLoaded.includes('bikini')&&standing.modelsLoaded.includes('neutral'));
 if(errors.length)throw Error('Browser exceptions '+errors.join(' | '));
 console.log('GINA_6_TWO_POSE_VIEWER_SUCCESS '+JSON.stringify({clips:standing.clipCount,bones:standing.boneCount,variants:Object.keys(results),safeSourceModels:true}));
 await browser.close();
})().catch(e=>{console.error('GINA_6_TWO_POSE_VIEWER_FAIL',e);process.exit(1)});
