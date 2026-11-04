const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const url='https://wvlrp.com/world-creator/character-previews/beverly-postop/viewer.html?v=gait-v3-20261103';
 let loaded=false;
 for(let i=0;i<6;i++){
  const resp=await page.goto(url+'&reload='+i,{waitUntil:'domcontentloaded',timeout:40000});
  if(resp?.status()!==200)continue;
  try{await page.waitForFunction(()=>window.beverlyViewerQA?.().options===79 && window.beverlyViewerQA?.().clips===77,{timeout:18000});loaded=true;break}
  catch(e){await page.waitForTimeout(4500)}
 }
 if(!loaded)throw new Error('Expected post-op 79 motion viewer / state '+JSON.stringify(await page.evaluate(()=>window.beverlyViewerQA?.()))+' errors '+errors);
 const get=()=>page.evaluate(()=>window.beverlyGaitQA());
 const set=async(id,v)=>page.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))},v);
 await page.locator('#toggleControls').click();
 await page.locator('#walk').click();
 await page.locator('#play').click();
 const samples=[];
 for(let f=0;f<=1000;f+=100){
   await set('armFit',0);await set('footFit',0);await set('scrub',f);const raw=await get();
   await set('armFit',100);await set('footFit',100);const fixed=await get();
   samples.push({f,
     armRaw:raw.elbowGap,armFixed:fixed.elbowGap,
     footRaw:raw.ankleGap,footFixed:fixed.ankleGap,
     rollLeft:fixed.heelToePitchRadians.left,
     rollRight:fixed.heelToePitchRadians.right});
 }
 const avg=(key)=>samples.reduce((sum,x)=>sum+x[key],0)/samples.length;
 const armChange=avg('armRaw')-avg('armFixed'),footChange=avg('footRaw')-avg('footFixed');
 if(armChange<.06)throw new Error('Arm slider improvement visually too small '+JSON.stringify({armChange,samples}));
 if(footChange<.05)throw new Error('Walk feet slider improvement too small '+JSON.stringify({footChange,samples}));
 if(!samples.some(x=>Math.abs(x.rollLeft)>.08&&x.rollLeft*x.rollRight<0))
   throw new Error('Alternating heel-to-toe roll missing '+JSON.stringify(samples));

 await page.locator('#run').click();
 await page.locator('#play').click();
 const run=[];
 for(let f=0;f<=1000;f+=100){
   await set('scrub',f);
   const q=await get();
   run.push({f,width:q.ankleGap,armGap:q.elbowGap,footSliderDisabled:q.footSliderDisabled});
 }
 if(run.some(x=>!Number.isFinite(x.width)||Math.abs(x.width-.0762)>.010))
   throw new Error('Run ankle spacing exceeds ±1 cm of 3 inches: '+JSON.stringify(run));
 if(run.some(x=>x.footSliderDisabled!==true))
   throw new Error('Run 3-inch stance must be fixed not changed by walk slider');
 
 await page.locator('#elbowsKnees').click();
 await page.waitForTimeout(300);
 const elbows=await get();
 if(elbows.poseMode!=='elbows-knees'||elbows.clip!=='Elbows & Knees')
   throw new Error('Elbows & Knees selection failed '+JSON.stringify(elbows));
 if(!Number.isFinite(elbows.poseMetrics.kneeHeightM)||!Number.isFinite(elbows.poseMetrics.elbowsHeightM))
   throw new Error('Elbows/Knees pose lacks measurable joints '+JSON.stringify(elbows));
 await page.locator('#fullBody').click();
 await page.screenshot({path:'/tmp/beverly-elbows-knees.png',fullPage:true});
 await page.locator('#toggleControls').click();
 await page.locator('#sitOpen').click();
 await page.waitForTimeout(300);
 const sit=await get();
 if(sit.poseMode!=='sit-open'||sit.clip!=='Sit — Legs Open')
   throw new Error('Sit Legs Open selection failed '+JSON.stringify(sit));
 if(!Number.isFinite(sit.poseMetrics.kneeGapM)||sit.poseMetrics.kneeGapM<.35)
   throw new Error('Sit Legs Open knees not spread enough '+JSON.stringify(sit));
 await page.locator('#fullBody').click();
 await page.screenshot({path:'/tmp/beverly-sit-open.png',fullPage:true});

 const result={nativeClips:77,totalOptions:79,
    walk:{armGapReductionMeters:+armChange.toFixed(4),ankleGapReductionMeters:+footChange.toFixed(4),rollRange:samples.map(x=>+x.rollLeft.toFixed(3))},
    run:{targetWidthMeters:.0762,widthsMeters:run.map(x=>x.width)},
    elbowsKnees:elbows.poseMetrics,sitOpen:sit.poseMetrics,garmentMeshes:(await page.evaluate(()=>window.beverlyViewerQA())).swimwearMeshes};
 if(errors.length)throw new Error('Browser exceptions '+errors.join(' | '));
 console.log('BEVERLY_MOTION_V3_QA_PASS',JSON.stringify(result));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
