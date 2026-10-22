import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {BASE_CAMP_RADIUS_M,PERIMETER_COUNT,perimeterClearings,CENTER_EXCLUSION_M} from '../base-camp/orientation-config.js';

const dirname=path.dirname(fileURLToPath(import.meta.url));
const page=readFileSync(path.join(dirname,'../base-camp/index.html'),'utf8');
const forest=readFileSync(path.join(dirname,'../base-camp/real-forest.js'),'utf8');
const understory=readFileSync(path.join(dirname,'../base-camp/real-understory.js'),'utf8');

test('Base Camp perimeter sites retain approved 200-foot spacing',()=>{
  assert.equal(PERIMETER_COUNT,41);
  assert.equal(perimeterClearings.length,41);
  assert.equal(CENTER_EXCLUSION_M,60.96);
  assert.ok(Math.abs(2*Math.PI*BASE_CAMP_RADIUS_M/41-61.65)<.1);
  assert.ok(perimeterClearings.every(p=>p.furnished===false));
});

test('phone startup has safe bypass and deferred photo-real forest streaming',()=>{
  assert.match(page,/const safeMode=params\.has\("safe"\)/);
  assert.match(page,/if\(safeMode\)/);
  assert.match(page,/setTimeout\(\(\)=>\{/);
  assert.match(page,/activeForest\?\.update\?\.\(pos\.x,pos\.z,yaw\)/);
  assert.match(forest,/const maxVisible=lowPower\?\(fullForest\?128:64\):320/);
  assert.match(forest,/const CELL=48,positionCells=new Map\(\)/);
  assert.match(page,/id="treeDensity"/);
  assert.doesNotMatch(page,/Grandview|grandviewUrl|panoramaStatus/);
  assert.match(forest,/fullForest\?\[0,1,2\]:\[1,2\]/);
  assert.match(forest,/village-oak-detailed\.glb/);
  assert.match(forest,/village-pbr-tree_small_02\.glb/);
  assert.match(forest,/village-pbr-fir_sapling\.glb/);
  assert.doesNotMatch(forest,/id:"oak-canopy"/);
  assert.match(forest,/const sources=legacyForest\?LEGACY_SOURCES:STABLE_SOURCES/);
  assert.match(forest,/Math\.min\(2, t\.height\/rec\.height\)/);
  assert.match(page,/rev=basecamp-upright-forest-v10-20261021/);
  assert.match(page,/installBaseCampUnderstory/);
  assert.match(page,/legacyForest/);
  assert.doesNotMatch(forest,/THREE\.ConeGeometry\(/);
});

test('viewer inline browser module parses as JavaScript',()=>{
  const match=page.match(/<script type="module">([\s\S]*?)<\/script>/i);
  assert.ok(match,'inline module is present');
  const run=spawnSync(process.execPath,['--input-type=module','--check'],{input:match[1],encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
});

test('forest loader JavaScript syntax parses',()=>{
  const run=spawnSync(process.execPath,['--check',path.join(dirname,'../base-camp/real-forest.js')],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
});

test('real forest-floor mesh details are streamed without hiding campsites or paths',()=>{
  assert.match(understory,/village-floor-fern_02\.glb/);
  assert.match(understory,/material\.alphaTest=Math\.max\(\.5/);
  assert.match(understory,/village-floor-dead_tree_trunk\.glb/);
  assert.match(understory,/perimeterClearings\.some/);
  assert.match(understory,/interiorClearings\.some/);
  assert.match(understory,/new THREE\.InstancedMesh/);
  assert.doesNotMatch(understory,/THREE\.ConeGeometry/);
});
test('understory JavaScript syntax parses',()=>{
  const run=spawnSync(process.execPath,['--check',path.join(dirname,'../base-camp/real-understory.js')],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
});

test('mobile forest avoids whole-world scans, culls remote tree geometry, and manages render resolution',()=>{
  assert.match(forest,/positionCells\.get\(ix\+":"\+iz\)/);
  assert.match(forest,/mesh\.frustumCulled=true/);
  assert.match(forest,/mesh\.computeBoundingSphere\(\)/);
  assert.match(page,/renderer\.setPixelRatio\(renderScale\)/);
  assert.match(page,/renderScale=Math\.max\(\.58/);
  assert.match(page,/Math\.min\(\.08,elapsed\/1000\)/);
  assert.match(page,/fps/);
});

test('steady 25 FPS must trigger mobile adaptation even above 23 FPS',()=>{
  assert.match(page,/fps<34 \|\| slowFrames>17/);
  assert.match(page,/next=Math\.max\(12,current-\(fps<27\?12:6\)\)/);
  assert.match(page,/fps>50 && fastFrames>65/);
  assert.match(page,/renderer\.info\.render\.calls/);
  assert.match(page,/renderer\.info\.render\.triangles/);
  assert.match(forest,/now-lastBuild<280/);
});

test('broken 625-draw-call artificial oak is excluded from default phone forest',()=>{
  assert.match(page,/visibleTreeBudget:mobileProfile\?48:96/);
  assert.match(forest,/fullForest\?\[0,1,2\]:\[1,2\]/);
  assert.match(forest,/cosHalfCone=lowPower\?Math\.cos\(halfHorizontalFov\+\.16\)/);
  assert.match(forest,/const drawRadius=lowPower\?155:390/);
});

test('tree planner actually produces visible mobile forest placements without runtime errors',()=>{
  const start=forest.indexOf('const SEED = 20261021;');
  const end=forest.indexOf('async function loadParts(',start);
  assert.ok(start>=0&&end>start,'extract real forest placement function');
  const createPositions=new Function(forest.slice(start,end)+'; return createPositions;')();
  const placements=createPositions({
    radius:402,terrainY:()=>0,lakeRadius:()=>Infinity,beachZone:()=>false,
    pathDistance:()=>Infinity,paths:[],perimeterClearings:[],interiorClearings:[],
    lowPower:true,fullForest:false
  });
  assert.ok(placements.length>100,'forest is actually populated');
  assert.ok(placements.every(tree=>tree.source===1||tree.source===2),
    'mobile trees are photo-textured sources; artificial oak remains excluded');
});

test('photo trees are oriented upright BEFORE deriving their placement height',()=>{
  const bake=forest.indexOf('geometry.applyMatrix4(mesh.matrixWorld);');
  const measure=forest.indexOf('geometry.computeBoundingBox();',bake);
  assert.ok(bake>=0&&measure>bake);
  const segment=forest.slice(bake,measure);
  assert.match(segment,/photo-understory-broadleaf/);
  assert.match(segment,/geometry.rotateX\(-Math.PI\/2\)/);
  assert.match(segment,/natural-fir-sapling/);
  assert.match(segment,/geometry.rotateZ\(Math.PI\/2\)/);
});
