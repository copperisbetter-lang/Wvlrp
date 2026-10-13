const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
 const output=[];
 for(const [name,url] of [
   ['local','http://127.0.0.1:8765/world-creator/young-explorer.html?v=ci-real'],
   ['live','https://wvlrp.com/world-creator/young-explorer.html?v=ci-real-'+Date.now()]
 ]){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const rec={name,url,consoleErrors:[],pageErrors:[]};
  page.on('pageerror',e=>rec.pageErrors.push(e.message.slice(0,400)));
  page.on('console',msg=>{if(msg.type()==='error')rec.consoleErrors.push(msg.text().slice(0,400));});
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.waitForFunction(()=>{const s=document.querySelector('#status')?.textContent||'';
     return s.includes('Realistic full body loaded')||s.includes('3D model ready')||
       s.includes('viewer unable to load')||s.includes('Model not published');
   },null,{timeout:105000});
   rec.scene=await page.evaluate(()=>{
     const s=window.BABYLON?.EngineStore?.LastCreatedScene;
     return {status:document.querySelector('#status')?.textContent,
       canvasWidth:document.querySelector('canvas')?.width,
       canvasHeight:document.querySelector('canvas')?.height,
       meshVertices:s?.meshes.reduce((acc,m)=>acc+(m.getTotalVertices?.()||0),0),
       skeletonBones:s?.skeletons.map(x=>x.bones.length),
       materialNames:s?.materials.map(x=>x.name).filter(x=>/young explorer|olive|plaid/i.test(x))};
   });
   rec.wardrobe=await page.evaluate(()=>{
     const w=window.youngExplorerWardrobe;
     if(!w)return {ready:false,error:'Wardrobe not initialized'};
     const outfits=['plaid','floral','sunflower','denim','hiking','navy'];
     const state=[];
     for(const name of outfits){
       document.querySelector('#outfit-select').value=name;
       document.querySelector('#outfit-select').dispatchEvent(new Event('change',{bubbles:true}));
       state.push({name,selected:w.selectedOutfit,
         dressEnabled:w.dress.isEnabled(),
         shirtEnabled:w.suits[name]?.shirt?.isEnabled()||false,
         shortsEnabled:w.suits[name]?.shorts?.isEnabled()||false});
     }
     document.querySelector('#bend').click();
     const bend=w.poseTokens.length;
     document.querySelector('#sit').click();
     const sit=w.poseTokens.length;
     document.querySelector('#idle').click();
     const m=w.measure;
     return {ready:true,measurements:{heightMeters:m.height,shoulderWidthMeters:m.shoulder,
       waistWidthMeters:m.waist,hipWidthMeters:m.hip,bodyVertices:m.modelVertexCount},
       outfits:state,bendBones:bend,sitBones:sit,
       restoredPose:!w.activePose};
   });
   rec.pass=!!rec.scene?.status?.includes('Realistic full body loaded')&&
     rec.scene?.meshVertices>=10000&&Math.max(0,...(rec.scene?.skeletonBones||[]))>=25&&
     !!rec.wardrobe?.ready&&rec.wardrobe.outfits.length===6&&
     rec.wardrobe.outfits.every(o=>o.selected===o.name&&
       (['plaid','floral','sunflower'].includes(o.name)?o.dressEnabled:
         !o.dressEnabled&&o.shirtEnabled&&o.shortsEnabled))&&
     rec.wardrobe.bendBones>=3&&rec.wardrobe.sitBones>=3&&
     rec.wardrobe.restoredPose&&Math.abs(rec.wardrobe.measurements.heightMeters-1.22)<.025;
   await page.screenshot({path:'/tmp/young-explorer-'+name+'.png',fullPage:true});
  }catch(err){
   rec.error=String(err).slice(0,800);
   rec.scene=await page.evaluate(()=>({status:document.querySelector('#status')?.textContent})).catch(()=>({}));
   rec.pass=false;
  }
  output.push(rec);
  await page.close();
 }
 await browser.close();
 fs.writeFileSync('world-creator/YOUNG-EXPLORER-BROWSER-AUDIT.json',JSON.stringify(output,null,2)+'\n');
 console.log('WVLRP_BROWSER_AUDIT',JSON.stringify(output));
 if(!output.find(x=>x.name==='local')?.pass)process.exitCode=1;
})();