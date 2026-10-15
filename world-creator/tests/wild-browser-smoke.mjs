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
  // Clean-slate photographic test: everything in the 3D landscape is
  // deliberately removed except Hearthside Cabin, its crew and ground.
  await page.waitForFunction(()=>window.__wildDiagnostics()?.photographicTerrainStatus==="ready",
    {timeout:25000});
  state=await page.evaluate(()=>window.__wildDiagnostics());
  assert.equal(state.photographicTerrainStatus,"ready",
    "Locally installed photographic JPEG material must load");
  assert.deepEqual(state.photographicTerrainSource,
    ["forest_leaves_02","forest_ground_05","forest_ground_04"],
    "The seamless photo atlas blends the three verified CC0 ground materials");
  assert.equal(state.photographicNearDetailMetres,2,
    "Nearby soil and leaf photograph must have sharp 2 m microdetail");
  assert.equal(state.photographicFarDetailDisabled,true,
    "Far ground must avoid normal-map and detail alias bands");
  assert.equal(state.nativeTrees,0);
  assert.equal(state.distantTrees,0);
  assert.equal(state.understory,0);
  assert.equal(state.heroGraphics,false);
  assert.equal(state.communityBuildings,0);
  assert.equal(state.communityFirePits,0);
  assert.equal(state.communityPaths,0);
  assert.equal(state.reservedClearings,0);
  assert.equal(state.villageMountainLayers,0);
  assert.equal(state.mountainTopVisible,false);
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
  // Teleport to the former village: it must also have genuine photographic
  // terrain, not the old green mountain wall or procedural dirt.
  await page.locator("#village").click();
  await page.waitForFunction(()=>window.__wildDiagnostics()?.spawnLocation==="hearthside" ||
      window.__wildDiagnostics()?.photographicTerrainStatus==="ready",
    {timeout:25000});
  const village=await page.evaluate(()=>window.__wildDiagnostics());
  console.log("CLEARED_FIELD_STATE",JSON.stringify(village));
  assert.equal(village.photographicTerrainStatus,"ready");
  assert.equal(village.communityBuildings,0);
  assert.equal(village.communityFirePits,0);
  assert.equal(village.communityPaths,0);
  assert.equal(village.villageMountainLayers,0);
  assert.ok(Math.abs(village.eyeHeight-1.98)<.08,"Walker must keep adult height");
  assert.ok(village.position[2]<80,"Former village spawn must remain walkable");
  await page.screenshot({path:"wild-village-qa.png",fullPage:true});

  // Command left movement. The camera must turn left and move in the same
  // direction (old behavior strafed sideways with a fixed camera heading).
  const heading=village.facingYaw;
  await page.mouse.move(center.x,center.y);
  await page.mouse.down();
  await page.mouse.move(center.x-35,center.y,{steps:5});
  await page.waitForTimeout(700);
  const turning=await page.evaluate(()=>window.__wildDiagnostics());
  assert.equal(turning.movementHeadingLocked,true,"Joystick must control view while held");
  assert.ok(Math.abs(turning.facingYaw-heading)>.35,
    "Looking direction must follow movement instead of staying fixed");
  await page.mouse.up();
  const released=await page.evaluate(()=>window.__wildDiagnostics());
  assert.equal(released.movementHeadingLocked,false,"Release must restore free-look");
  await page.screenshot({path:"wild-walk-qa.png",fullPage:true});
  console.log("WILD_BABYLON_BROWSER_SMOKE_PASSED");
  if(warnings.length)console.log("NONFATAL_WARNINGS",JSON.stringify(warnings.slice(0,12)));
}catch(err){
  console.error("WILD_BROWSER_QA_FAILED",String(err.stack||err));
  console.error("BROWSER_ERRORS",JSON.stringify(warnings.slice(0,20)));
  await page.screenshot({path:"wild-walk-qa.png",fullPage:true}).catch(()=>{});
  throw err;
}finally{await browser.close();}
