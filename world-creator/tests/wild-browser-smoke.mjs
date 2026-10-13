import { chromium } from "playwright-core";
import {strict as assert} from "node:assert";
const browser=await chromium.launch({
  executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",
  headless:true,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
    "--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]
});
const page=await browser.newPage({viewport:{width:412,height:915},
  deviceScaleFactor:1,hasTouch:true,isMobile:true});
const warnings=[];
page.on("pageerror",e=>warnings.push("JavaScript: "+e.message));
page.on("console",m=>{if(m.type()==="error")warnings.push("Console: "+m.text().slice(0,200));});
try{
  await page.goto("http://127.0.0.1:8765/walk.html?v=qa",{
    waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>typeof window.__wildDiagnostics==="function",
    {timeout:60000});
  await page.waitForTimeout(1500);
  let state=await page.evaluate(()=>window.__wildDiagnostics());
  console.log("INITIAL_WILD_STATE",JSON.stringify(state));
  const joystick=await page.locator("#joystick").boundingBox();
  assert.ok(joystick&&joystick.x<30,"Joystick must be lower left");
  assert.ok(joystick.y>650,"Joystick must sit near bottom on phone");
  assert.ok(state.cabin,"Cabin must exist");
  assert.ok(state.nativeTrees>0,"Near forest trees must be rendered");
  assert.ok(state.distantTrees>0,"Distant forests must exist");
  assert.ok(state.species>=5,"Distinct WV native species should be present");
  assert.ok(state.understory>0,"Native ground cover must exist");
  assert.equal(state.heroGraphics,true,"Hearthside must load investor-grade visual mode");
  assert.ok(state.heroPlants>7000,
    "Cabin underbrush must form a dense layered forest, not sparse props");
  assert.ok(state.nativeTrees>0&&state.distantTrees>0,
    "Improved graphics must keep the full native forest");
  assert.ok(Math.abs(state.eyeHeight-1.98)<.045,
    "Walker should spawn at adult eye height above ground: "+state.eyeHeight);
  assert.ok(state.renderedSurfaceHeight!==null,
    "Ground mesh should expose real triangle altitude");
  assert.ok(Math.abs(state.renderedEyeHeight-1.98)<.08,
    "Camera must be ~1.98m above VISIBLE ground triangles at spawn: "+state.renderedEyeHeight);
  const before=state.position.slice();
  const center={x:joystick.x+joystick.width/2,y:joystick.y+joystick.height/2};
  assert.equal(state.runMode,false,"Walking must be the initial mode");
  await page.mouse.click(center.x,center.y,{clickCount:2,delay:85});
  state=await page.evaluate(()=>window.__wildDiagnostics());
  assert.equal(state.runMode,true,"Double tapping center enables running");
  assert.equal(state.moveSpeed,9.5,"Running is faster than walking");
  await page.waitForTimeout(420);
  await page.mouse.click(center.x,center.y,{clickCount:2,delay:85});
  state=await page.evaluate(()=>window.__wildDiagnostics());
  assert.equal(state.runMode,false,"Second double tap reverts to walking");
  await page.mouse.move(center.x,center.y);
  await page.mouse.down();
  await page.mouse.move(center.x,center.y-35,{steps:5});
  await page.waitForTimeout(1050);
  await page.mouse.up();
  state=await page.evaluate(()=>window.__wildDiagnostics());
  console.log("AFTER_WALK_STATE",JSON.stringify(state));
  assert.ok(state.walkedMetres>.12,
    "Joystick must actually move camera: "+JSON.stringify(before)+" => "+JSON.stringify(state.position));
  assert.ok(Math.abs(state.eyeHeight-1.98)<.045,
    "Walk camera must follow the rendered terrain without sinking: "+state.eyeHeight);
  assert.ok(Math.abs(state.renderedEyeHeight-1.98)<.08,
    "Walker must retain adult standing eye height above visible hill mesh: "+state.renderedEyeHeight);
  assert.equal(warnings.filter(s=>/TypeError|ReferenceError|SyntaxError|WebGL context lost/i.test(s)).length,0,
    "Critical browser errors: "+warnings.join("; "));
  await page.screenshot({path:"wild-walk-qa.png",fullPage:true});
  console.log("WILD_BABYLON_BROWSER_SMOKE_PASSED");
  if(warnings.length)console.log("NONFATAL_WARNINGS",JSON.stringify(warnings.slice(0,12)));
}catch(err){
  console.error("WILD_BROWSER_QA_FAILED",String(err.stack||err));
  console.error("BROWSER_ERRORS",JSON.stringify(warnings.slice(0,20)));
  await page.screenshot({path:"wild-walk-qa.png",fullPage:true}).catch(()=>{});
  throw err;
}finally{await browser.close();}
