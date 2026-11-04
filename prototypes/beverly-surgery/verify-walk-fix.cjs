const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
  const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='https://wvlrp.com/world-creator/character-previews/beverly-postop/viewer.html?v=walk-20261103-v2';
  let loaded=false;
  for(let i=0;i<8;i++){
    await page.goto(url+'&attempt='+i,{waitUntil:'domcontentloaded',timeout:40000});
    try{
      await page.waitForFunction(()=>window.beverlyGaitQA&&document.getElementById('clip')?.options.length===77,{timeout:16000});
      loaded=true;break;
    }catch(e){await page.waitForTimeout(3000)}
  }
  if(!loaded)throw new Error('Latest walking fix viewer did not load '+(await page.locator('#status').textContent()));
  await page.locator('#walk').click();
  await page.waitForTimeout(500);
  await page.locator('#play').click(); // Pause to hold the same animation time
  const set=async(id,value)=>page.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))},value);
  const qa=()=>page.evaluate(()=>window.beverlyGaitQA());
  const samples=[];
  for(let frame=0;frame<=1000;frame+=100){
    await set('armFit',0);await set('footFit',0);await set('scrub',frame);
    const before=await qa();
    await set('armFit',100);await set('footFit',100);
    const after=await qa();
    if(before.clip!=='Walk'||after.clip!=='Walk')throw Error('Wrong sampled action');
    samples.push({frame,before,after,
      armImprovement:before.elbowGap-after.elbowGap,
      legImprovement:before.ankleGap-after.ankleGap});
  }
  const total=(p)=>samples.reduce((x,y)=>x+y[p],0);
  const max=(p)=>Math.max(...samples.map(x=>x[p]));
  const metrics={armImprovementTotal:+total('armImprovement').toFixed(4),
    legImprovementTotal:+total('legImprovement').toFixed(4),
    bestArmReduction:+max('armImprovement').toFixed(4),
    bestFootReduction:+max('legImprovement').toFixed(4),
    totalSamples:samples.length};
  if(metrics.bestArmReduction<.015)throw new Error('Arm swing not measurably narrower: '+JSON.stringify(samples));
  if(metrics.bestFootReduction<.008)throw new Error('Feet not measurably closer: '+JSON.stringify(samples));
  if(errors.length)throw new Error('Browser exceptions: '+errors.join(' | '));
  await page.screenshot({path:'/tmp/beverly-walkfix-v2.png',fullPage:true});
  console.log('BEVERLY_WALK_FIX_BROWSER_QA_PASS',JSON.stringify({metrics,samples}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
