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
  // Teleport to the NEW station, 350m north, without moving Hearthside.
  // Its authentic log panels and metal roofing render on photographed ground.
  await page.locator("#village").click();
  await page.waitForFunction(()=>window.__wildDiagnostics()?.communityBuildings===2 &&
      window.__wildDiagnostics()?.photographicTerrainStatus==="ready",
    {timeout:25000});
  const village=await page.evaluate(()=>window.__wildDiagnostics());
  console.log("NORTH_RANGER_STATION_STATE",JSON.stringify(village));
  assert.equal(village.photographicTerrainStatus,"ready");
  assert.equal(village.communityBuildings,2,"Both the original Ranger Station and the new 30m-east photo rebuild are visible");
  assert.equal(village.communityFirePits,0);
  assert.equal(village.communityPaths,0);
  assert.equal(village.villageMountainLayers,0);
  assert.ok(Math.abs(village.eyeHeight-1.98)<.08,"Walker must keep adult height");
  assert.ok(Math.abs(village.position[0])<2&&Math.abs(village.position[2]-337)<2,
    "Ranger spawn must be outside south-facing porch at (0,337)");
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
  // The photo rebuild is a separate physical place 30m east of the old one.
  // Verify real meshes, approach camera, and photo-station dedicated spawn.
  await page.locator("#photoRanger").click();
  await page.waitForTimeout(1800);
  const newRanger=await page.evaluate(()=>window.__wildDiagnostics());
  console.log("PHOTO_RANGER_30M_EAST",JSON.stringify(newRanger));
  assert.equal(newRanger.communityBuildings,2,
    "Must retain original while rendering the separate rebuilt Ranger Station");
  assert.deepEqual(newRanger.photoRangerPosition,[30,350],
    "New build is precisely 30m east of the old station");
  assert.ok(Math.abs(newRanger.position[0]-30)<.25 &&
    Math.abs(newRanger.position[2]-333)<.25,
    "Photo station spawn is south of the real entrance");
  assert.ok(newRanger.photoRangerMeshCount>180,
    "New Ranger Station must have actual 3D geometry and furnished interior");
  await page.screenshot({path:"wild-photo-ranger-qa.png",fullPage:true});
  // Inspect actual in-world geometric stacks, not a page of texture links.
  await page.locator("#materialYard").click();
  await page.waitForFunction(()=>window.__wildMaterialsDiagnostics?.()?.ready===true,{
    timeout:25000});
  const yard=await page.evaluate(()=>window.__wildMaterialsDiagnostics());
  const materialWalk=await page.evaluate(()=>window.__wildDiagnostics());
  console.log("REAL_HD_MATERIAL_YARD",JSON.stringify(yard));
  assert.equal(yard.count,10,"Ten real sample piles must be installed in-world");
  assert.ok(yard.meshes>160,"Actual 3D logs, stone, planks, slate and roof rib meshes must exist");
  assert.equal(yard.enabled,true,"Material yard should be visible at player location");
  assert.deepEqual(yard.ids,[
    "wood_trunk_wall","pine_bark","raw_plank_wall","weathered_planks",
    "wood_planks","stacked_stone_wall","mossy_stone_wall","rough_pine_door",
    "roof_slates_03","corrugated_iron"],"Only verified, locally downloaded 2K CC0 sources");
  assert.ok(Math.abs(materialWalk.position[0]+151)<1.0&&
    Math.abs(materialWalk.position[2]-282)<1.0,
    "Material button must teleport beside the display for first-person inspection");
  assert.equal(warnings.filter(s=>/TypeError|ReferenceError|SyntaxError|WebGL context lost/i.test(s)).length,0,
    "The new display must not break the game: "+warnings.join("; "));
  await page.waitForTimeout(1600);
  await page.screenshot({path:"wild-materials-qa.png",fullPage:true});
  // Regression: direct-link ?spawn=ranger-photo must NOT reset to Hearthside.
  // This caught the real bug: the initial camera was correctly constructed
  // then the final startup if/else branch called resetToCabin().
  await page.goto("http://127.0.0.1:8765/walk.html?spawn=ranger-photo&test=direct-20261016",{
    waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>typeof window.__wildDiagnostics==="function",
    {timeout:60000});
  const direct=await page.evaluate(()=>window.__wildDiagnostics());
  console.log("PHOTO_RANGER_DIRECT_LINK",JSON.stringify({
    position:direct.position,spawnLocation:direct.spawnLocation,
    photoRangerMeshCount:direct.photoRangerMeshCount,
    communityBuildings:direct.communityBuildings
  }));
  assert.equal(direct.spawnLocation,"ranger-photo",
    "Direct-photo URL must be an explicit spawn option");
  assert.ok(Math.abs(direct.position[0]-30)<.25 &&
    Math.abs(direct.position[2]-333)<.25,
    "DIRECT URL must stay at new station (30,333), not reset to girls' cabin near (0,16)");
  assert.ok(direct.photoRangerMeshCount>180,"Direct arrival should load the new station");
  await page.screenshot({path:"wild-photo-ranger-directlink-qa.png",fullPage:true});
  console.log("WILD_BABYLON_BROWSER_SMOKE_PASSED");
  if(warnings.length)console.log("NONFATAL_WARNINGS",JSON.stringify(warnings.slice(0,12)));
}catch(err){
  console.error("WILD_BROWSER_QA_FAILED",String(err.stack||err));
  console.error("BROWSER_ERRORS",JSON.stringify(warnings.slice(0,20)));
  await page.screenshot({path:"wild-walk-qa.png",fullPage:true}).catch(()=>{});
  throw err;
}finally{await browser.close();}
