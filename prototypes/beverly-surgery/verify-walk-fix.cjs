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
  await page.locator('#armFit').evaluate(el=>{el.value=0;el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.locator('#footFit').evaluate(el=>{el.value=0;el.dispatchEvent(new Event('input',{bubbles:true}))});
  const before=await page.evaluate(()=>window.beverlyGaitQA());
  await page.locator('#armFit').evaluate(el=>{el.value=100;el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.locator('#footFit').evaluate(el=>{el.value=100;el.dispatchEvent(new Event('input',{bubbles:true}))});
  const after=await page.evaluate(()=>window.beverlyGaitQA());
  if(before.clip!=='Walk'||after.clip!=='Walk')throw new Error('Not testing Walk');
  const keySum=(obj,keys)=>keys.reduce((s,k)=>s+Math.abs(obj.lateral[k]||0),0);
  const arms=['LeftArm','RightArm'],legs=['LeftUpLeg','RightUpLeg','LeftLeg','RightLeg'];
  const metrics={arms_before:keySum(before,arms),arms_after:keySum(after,arms),
                 legs_before:keySum(before,legs),legs_after:keySum(after,legs)};
  if(!metrics.arms_before||!metrics.legs_before)throw new Error('Missing actual joint metrics '+JSON.stringify({before,after}));
  if(metrics.arms_after > metrics.arms_before+.001 ||metrics.legs_after > metrics.legs_before+.001)
    throw new Error('Corrections increased lateral drift '+JSON.stringify(metrics));
  if(errors.length)throw new Error('Browser exceptions: '+errors.join(' | '));
  await page.screenshot({path:'/tmp/beverly-walkfix-v2.png',fullPage:true});
  console.log('BEVERLY_WALK_FIX_BROWSER_QA_PASS',JSON.stringify({metrics,before,after}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
