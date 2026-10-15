import { chromium } from "playwright-core";
import { strict as assert } from "node:assert";
const browser=await chromium.launch({
  executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",
  headless:true,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
    "--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]
});
const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1,
  hasTouch:true,isMobile:true});
const warnings=[];
page.on("pageerror",err=>warnings.push("JS "+err.message));
page.on("console",msg=>{if(msg.type()==="error")warnings.push("Console "+msg.text().slice(0,200));});
try{
  await page.goto("http://127.0.0.1:8765/walk.html?compare=1&qa=real-buildings",{
    waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>typeof window.__wildCabinLineupDiagnostics==="function",null,{
    timeout:70000});
  const initial=await page.evaluate(()=>window.__wildDiagnostics());
  assert.ok(Math.abs(initial.position[2]-274)<1,
    "Comparison link must spawn in front of real cabins, not at girls' cabin.");
  await page.waitForFunction(()=>{
    const data=window.__wildCabinLineupDiagnostics?.();
    return data?.length===4&&data.every(slot=>slot.loaded);
  },null,{timeout:130000,polling:1000});
  const loaded=await page.evaluate(()=>window.__wildCabinLineupDiagnostics());
  assert.equal(loaded.filter(s=>s.loaded).length,4);
  const threeD=await page.evaluate(()=>{
    const B=window.BABYLON;const cvs=document.getElementById("world");
    return {width:cvs.width,height:cvs.height,babylon:!!B,panelText:document.getElementById("fourCabinPanel").innerText};
  });
  assert.ok(threeD.width>0&&threeD.height>0&&threeD.babylon,
    "Four buildings must load into a real WebGL scene.");
  assert.ok((threeD.panelText.match(/Actual 3D building visible:/g)||[]).length===4,
    "UI must report four actual imported meshes");
  await page.screenshot({path:"wild-four-real-cabins-mobile.png",fullPage:true});
  console.log("FOUR_ACTUAL_CABIN_MODELS_RENDERED",JSON.stringify(loaded));
  console.log("CABIN_BROWSER_QA_PASSED");
}catch(err){
  console.error("CABIN_BROWSER_QA_FAILED",String(err.stack||err));
  console.error("ERRORS",JSON.stringify(warnings.slice(0,15)));
  console.error("SLOTS",JSON.stringify(await page.evaluate(()=>window.__wildCabinLineupDiagnostics?.()||[]).catch(()=>[])));
  console.error("PANEL",String(await page.locator("#fourCabinPanel").innerText().catch(()=>'')));
  await page.screenshot({path:"wild-four-real-cabins-mobile.png",fullPage:true}).catch(()=>{});
  throw err;
}finally{await browser.close();}
