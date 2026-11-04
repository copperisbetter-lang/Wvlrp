const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
  const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const url='https://wvlrp.com/world-creator/character-previews/beverly-postop/viewer.html?v=mobile-controls-20261103-v3';
  let ok=false;
  for(let i=0;i<9;i++){
    const res=await page.goto(url+'&attempt='+i,{waitUntil:'domcontentloaded',timeout:40000});
    if(res?.status()!==200)continue;
    try{
      await page.waitForFunction(()=>window.beverlyViewerQA?.().clips===77&&window.beverlyViewerQA?.().swimwearMeshes>=15,{timeout:16000});
      ok=true;break;
    }catch(e){await page.waitForTimeout(3500)}
  }
  if(!ok)throw new Error('Viewer did not load 77 clips and clothes control: '+await page.locator('#status').textContent());
  const get=()=>page.evaluate(()=>window.beverlyViewerQA());
  const initial=await get();
  if(!initial.controlsCollapsed)throw new Error('Controls must start collapsed');
  if(!initial.panEnabled)throw new Error('Touch pan must be enabled');
  if(initial.visibleClothing!==initial.swimwearMeshes)throw new Error('Clothing not initially visible');

  // User-requested controls must remain accessible even while panel is closed.
  await page.locator('#subjectUp').click();
  const up=await get();
  if(up.cameraTargetY>=initial.cameraTargetY-.05)throw new Error('UP button did not move subject upwards');
  await page.locator('#subjectDown').click();
  const down=await get();
  if(Math.abs(down.cameraTargetY-initial.cameraTargetY)>.005)throw new Error('DOWN button did not reverse UP');

  await page.locator('#removeClothes').click();
  const undressed=await get();
  if(!undressed.swimwearHidden||undressed.visibleClothing!==0)throw new Error('Remove Clothes button failed '+JSON.stringify(undressed));
  if(undressed.clothesButtonText!=='Restore Clothes')throw new Error('Restore Clothes label not shown');

  await page.locator('#removeClothes').click();
  const restored=await get();
  if(restored.swimwearHidden||restored.visibleClothing!==restored.swimwearMeshes)throw new Error('Restore Clothes failed');
  await page.locator('#toggleControls').click();
  const expanded=await get();
  if(expanded.controlsCollapsed)throw new Error('Controls did not expand');
  if(await page.locator('#clip option').count()!==77)throw new Error('77 motion dropdown lost');
  await page.locator('#walk').click();
  if((await page.locator('#clipname').innerText()).trim()!=='Walk')throw new Error('Walk action not available');

  await page.locator('#fullBody').click();
  const finalState=await get();
  if(!finalState.controlsCollapsed)throw new Error('Full Body failed to collapse controls');
  if(errors.length)throw new Error('Browser error: '+errors.join(' | '));
  await page.screenshot({path:'/tmp/beverly-controls-fixed-dressed.png',fullPage:true});
  console.log('BEVERLY_POSTOP_MOBILE_UI_QA_PASS',JSON.stringify({
    clips:finalState.clips,
    clothesFound:initial.swimwearMeshes,
    removedClothes:undressed.swimwearMeshes-undressed.visibleClothing,
    restoredClothes:restored.visibleClothing,
    initialTargetY:initial.cameraTargetY,upTargetY:up.cameraTargetY,downTargetY:down.cameraTargetY,
    fullBodyCollapsed:finalState.controlsCollapsed,panEnabled:finalState.panEnabled
  }));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
