// WVLRP: assert new 526m outer bypass avoids Stacey V8 massive cavern & cave access.
// This test intentionally references V8 geometry from e6c1c48f74e85d19a831119d180f49d7738885bf
// (other branch); rerun if Gater changes its footprint.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as bypass from '../base-camp/purple-dome-outer-bypass.js';
const {WEST_BYPASS,DOME_V8,bypassPoint,bypassAt,closestBypass,bypassAudit,bypassFootprintSafe,bypassGradedHeight,installPurpleDomeBypass,staceyClearance,domeClearance,bypassWorkingHalfWidth,buildBypassProfile}=bypass;
const base=(x,z)=>7*Math.sin(x/92)*Math.cos(z/78)+3*Math.sin(z/34)+2*Math.cos(x/43);
const terrain=(x,z)=>bypassGradedHeight(x,z,base(x,z),base);
const audit=bypassAudit(base);console.log('V8 bypass QA',audit);
assert.ok(audit.coreGradePass,'Bypass core violates 8% long / 3% cross');
assert.ok(audit.domeSafetyPass,'Tapered excavation shoulders too close to V8 dome');
assert.ok(audit.lengthM>515&&audit.lengthM<540);
assert.ok(audit.maxCutM>=.5&&audit.maxCutM<2);
assert.ok(audit.minDomeWallShoulder12m>=13.0,'Bypass working shoulders <13m outside V8 42m chamber');
assert.ok(audit.maxBaseCampRadiusM<395,'Bypass violates playable world edge');
assert.ok(audit.minDomeWallCenterlineM>19,'V8 dome wall too close to new walking trail');
assert.equal(DOME_V8.radius,42);assert.equal(DOME_V8.x,-86.744253843548);assert.equal(DOME_V8.z,-240);
assert.equal(WEST_BYPASS.endDeg,263.6736605122942);
const profile=buildBypassProfile(base);
for(let i=0;i<profile.n;i++){
 assert.ok(profile.profile[i]<=profile.natural[i]+1e-8,'Do not raise above source ground');
 if(i)assert.ok(Math.abs(profile.profile[i]-profile.profile[i-1])<=.077501*(profile.lengths[i]-profile.lengths[i-1]));
}
let minCenterToCamp=Infinity,closestCamp='';let sampleCount=0;
for(let a=WEST_BYPASS.startDeg;a<=WEST_BYPASS.endDeg;a+=.05){
 const p=bypassPoint(a),loc=closestBypass(p.x,p.z);
 assert.ok(Math.abs(loc.deg-a)<.06,'Bypass closest path projection wrong');
 assert.ok(loc.distance<.05);
 assert.ok(staceyClearance(p.x,p.z)>=60.99,'Path centerline entered lake wood-clearing zone');
 assert.ok(domeClearance(p.x,p.z)>=19.0,'Trail crossed V8 cavern roof');
 for(const offset of [-1.3,0,1.3]){
  const q=bypassAt(a,offset),z=closestBypass(q.x,q.z);
  if(a>185.5&&a<263.25)assert.ok(Math.abs(z.distance-Math.abs(offset))<.09,'Track geometry perpendicular offset drift');
 }
 sampleCount++;
}
// Camps are seeded deterministically by Base Camp code, 24 interior + 41 perimeter.
const LAKE={x:0,z:-108,rx:82,rz:(5*4046.8564224)/(Math.PI*82)};
function oldLakeRadius(x,z){const dx=x-LAKE.x,dz=z-LAKE.z,a=Math.atan2(dz,dx);return Math.hypot(dx/LAKE.rx,dz/LAKE.rz)/(1+.025*Math.sin(5*a)+.018*Math.cos(9*a))}
function beach(x,z){const r=oldLakeRadius(x,z);return z>-88&&Math.abs(x)<39&&r>.79&&r<1.23}
let seed=32178;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const camps=[];
for(let trial=0;trial<5000&&camps.length<24;trial++){
 const radius=75+random()*260,a=random()*Math.PI*2,x=Math.cos(a)*radius,z=Math.sin(a)*radius;
 if(oldLakeRadius(x,z)<1.45||beach(x,z)||camps.some(v=>Math.hypot(x-v.x,z-v.z)<32))continue;
 camps.push({id:'interior-'+String(camps.length+1).padStart(2,'0'),x,z});
}
assert.equal(camps.length,24);
camps[22].x=317.861133;camps[22].z=-169.009763;
for(let i=0;i<41;i++){const a=2*Math.PI*i/41;camps.push({id:'perimeter-'+i,x:402.336*Math.cos(a),z:402.336*Math.sin(a)})}
for(let a=WEST_BYPASS.startDeg;a<=WEST_BYPASS.endDeg;a+=.125){
 const p=bypassPoint(a);
 for(const camp of camps){
  const d=Math.hypot(p.x-camp.x,p.z-camp.z);
  if(d<minCenterToCamp){minCenterToCamp=d;closestCamp=camp.id}
 }
}
assert.ok(minCenterToCamp>=32,'Nearby campsite may overlap 12m earthwork or its pad');
for(const [x,z] of [[DOME_V8.x,DOME_V8.z],[DOME_V8.x+42,DOME_V8.z],[140,-240],[-29.55593,-266.59062]]){
 assert.ok(Math.abs(terrain(x,z)-base(x,z))<1e-8,'Protected chamber, shoreline or wooded end changed');
}
class Geo{setAttribute(k,v){(this.attributes??={})[k]=v}setIndex(v){this.indices=v}computeVertexNormals(){}}
class Attr{constructor(array,n){this.array=array;this.itemSize=n}}
class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material}}
class Mat{constructor(opts){this.opts=opts}}
const THREE={BufferGeometry:Geo,Float32BufferAttribute:Attr,Mesh,MeshStandardMaterial:Mat,DoubleSide:2};
const scene={children:[],add(x){this.children.push(x)}};
const g=installPurpleDomeBypass(THREE,scene,{terrainY:terrain,baseTerrainY:base,soilMaterial:{}});
assert.ok(g.terrainTriangles>18000&&g.terrainTriangles<26000);
assert.ok(g.treadTriangles>2000);
let renderMinDome=Infinity,renderMinLake=Infinity,maxError=0;
const v=g.terrain.geometry.attributes.position.array;
for(let i of g.terrain.geometry.indices){
 const x=v[i*3],y=v[i*3+1],z=v[i*3+2];
 assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));
 assert.ok(bypassFootprintSafe(x,z),'Excavation mesh enters cavern exclusion or Stacey Lake wood clearing');
 renderMinDome=Math.min(renderMinDome,domeClearance(x,z));
 renderMinLake=Math.min(renderMinLake,staceyClearance(x,z));
 maxError=Math.max(maxError,Math.abs(y-.035-terrain(x,z)));
}
assert.ok(renderMinDome>=13,'Rendered mesh within protected cave buffer');
assert.ok(renderMinLake>=61,'Rendered mesh entered the lake clearing');
assert.ok(maxError<1e-5,'Mesh Y not equivalent to player collision Y');
const game=readFileSync(new URL('../base-camp/index.html',import.meta.url),'utf8');
assert.ok(game.includes('const domeBypass=installPurpleDomeBypass'),'New bypass not installed');
assert.ok(game.includes('bypassGradedHeight(x,z,first,baseTerrainY)'),'Player height not connected to bypass');
assert.ok(game.includes('!domeBypassSection'),'Unsafe original circular route line still rendered near dome');
assert.ok(game.includes('spawnTarget===\'domebypass\''),'No safe bypass spawn');
assert.ok(game.includes('closestBypass(x,z).distance<10.5'),'Coarse collision terrain still overlaps bypass patch');
console.log('PASS',JSON.stringify({sampleCount,meters:audit.lengthM,coreMaxGrade:audit.maxLongPct,coreMaxCross:audit.maxCrossPct,maxCut:audit.maxCutM,minDomeWallRendered:renderMinDome,minLakeRendered:renderMinLake,minCampCenterline:minCenterToCamp,closestCamp,triangles:g.terrainTriangles,maxPhysicsError:maxError}));
console.log('LIMIT: end approaches need phone QA and scene merge; Stacey V8 vertical roof overburden cannot be certified from this separate Base Camp heightfield.');
