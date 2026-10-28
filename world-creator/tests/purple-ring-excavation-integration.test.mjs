// Proves the purple route ends at both approved Stacey Lake woodland entrances.
// Actual new lake geometry comes from stacey-dive.html, not old Base Camp water.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const src=readFileSync(new URL('../base-camp/purple-ring-excavation.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const {STACEY_LAKE,PURPLE_RING,excavatedHeight,staceyLakeShoreClearance,ringTreadWoodlandClearance,lakeWoodlandEndpoints,cutMetrics,installPurpleRingExcavation}=m;
const base=(x,z)=>7*Math.sin(x/92)*Math.cos(z/78)+3*Math.sin(z/34)+2*Math.cos(x/43);
const terrain=(x,z)=>excavatedHeight(x,z,base(x,z));
assert.equal(STACEY_LAKE.cx,140);assert.equal(STACEY_LAKE.cz,-240);
assert.equal(STACEY_LAKE.treeClearanceM,60);
assert.ok(STACEY_LAKE.woodlandSetbackM>=STACEY_LAKE.treeClearanceM);
assert.ok(staceyLakeShoreClearance(140,-240)<0,'Stacey center must be water');
const stops=lakeWoodlandEndpoints();
assert.equal(stops.length,2,'Exactly two woodland-edge endpoints');
assert.ok(stops[0].angleDeg>263&&stops[0].angleDeg<265,'Southwest woods entrance changed');
assert.ok(stops[1].angleDeg>335&&stops[1].angleDeg<338,'Northeast woods entrance changed');
for(const p of stops)assert.ok(Math.abs(p.shoreClearanceM-STACEY_LAKE.woodlandSetbackM)<.0001,'Endpoint not on woodland boundary');
const waterGapM=PURPLE_RING.radius*(stops[1].angleDeg-stops[0].angleDeg)*Math.PI/180;
assert.ok(waterGapM>330&&waterGapM<355,'Path must terminate across entire lake clearing');
const toPoint=(a,o=0)=>{const angle=a*Math.PI/180,r=PURPLE_RING.radius+o;return [r*Math.cos(angle),r*Math.sin(angle)]};
for(let a=0;a<360;a+=.05){
 const permitted=ringTreadWoodlandClearance(a)>=STACEY_LAKE.woodlandSetbackM;
 for(const off of [-9,-4,-1.3,0,1.3,4,9]){
  const [x,z]=toPoint(a,off),clr=staceyLakeShoreClearance(x,z);
  if(clr<STACEY_LAKE.woodlandSetbackM-1e-7){
   assert.ok(Math.abs(terrain(x,z)-base(x,z))<1e-10,'EARTHWORK INSIDE LAKE CLEARING');
  }
 }
 if(a>stops[0].angleDeg+.05&&a<stops[1].angleDeg-.05){
  assert.equal(permitted,false,'Purple trail runs across shoreline/lake opening');
 }
}
const dry=cutMetrics(base);
assert.ok(dry.coreGradePass,'Remaining dry 300–344 woodland tread exceeds grade limits');
assert.ok(dry.maxCoreLongPct<=8.01);
assert.ok(dry.maxCoreCrossPct<=3.01);
assert.ok(dry.skippedLakeStations>1200,'Old underwater earthworks must be canceled');
assert.ok(dry.maxCoreCutMeters<.02,'Unexpected deep cuts next to Stacey Lake');
const camp64={x:317.861133,z:-169.009763};
assert.ok(Math.abs(Math.hypot(camp64.x,camp64.z)-PURPLE_RING.radius)>90,'Campsite 64 moved into ring');
assert.equal(terrain(0,-108),base(0,-108),'Old lake geometry unexpectedly changed');
class Geo{setAttribute(k,v){(this.attributes??={})[k]=v}setIndex(v){this.indices=v}computeVertexNormals(){}}
class Attr{constructor(array,itemSize){this.array=array;this.itemSize=itemSize}}
class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material}}
class Group{constructor(){this.children=[]}add(x){this.children.push(x)}}
class Mat{constructor(o){this.options=o}}
class Color{constructor(n){this.value=n}clone(){return new Color(this.value)}lerp(){return this}}
const THREE={BufferGeometry:Geo,Float32BufferAttribute:Attr,Mesh,Group,MeshStandardMaterial:Mat,Color,DoubleSide:2},scene={children:[],add(x){this.children.push(x)}};
const mesh=installPurpleRingExcavation(THREE,scene,{terrainY:terrain,baseTerrainY:base,groundMaterial:{}});
assert.ok(mesh.triangles>5000&&mesh.triangles<25000,'Excavation mesh must only remain on dry side');
const vertices=mesh.patch.geometry.attributes.position.array,indices=mesh.patch.geometry.indices;
let min=Infinity,maxMismatch=0;
for(let i=0;i<indices.length;i++){
 const k=indices[i],x=vertices[k*3],y=vertices[k*3+1],z=vertices[k*3+2];
 const clear=staceyLakeShoreClearance(x,z);
 min=Math.min(min,clear);
 assert.ok(clear>=STACEY_LAKE.woodlandSetbackM-1e-5,'Surface triangle enters Stacey woods opening');
 assert.ok(Number.isFinite(y),'Nonfinite geometry height');
 maxMismatch=Math.max(maxMismatch,Math.abs(y-.035-terrain(x,z)));
}
assert.ok(maxMismatch<1e-4,'Rendered surface must match walk-height function');
const game=readFileSync(new URL('../base-camp/index.html',import.meta.url),'utf8');
assert.ok(game.includes('staceyLakeShoreClearance(x,z)>=STACEY_LAKE.woodlandSetbackM'),'Original base mesh cutout ignores new lake');
assert.ok(game.includes('ringTreadWoodlandClearance(deg)>=STACEY_LAKE.woodlandSetbackM'),'Purple ring ribbon still crosses lake');
assert.ok(game.includes('ringTreadWoodlandClearance(next)>=STACEY_LAKE.woodlandSetbackM'),'A ribbon segment endpoint crosses lake');
assert.ok(game.includes("spawnTarget==='excavation'"),'No direct entrance test spawn');
assert.ok(game.includes('PURPLE_RING.radius*Math.cos(340*Math.PI/180)'),'Spawn is not on dry woodland side');
assert.ok(game.includes('const purpleExcavation=installPurpleRingExcavation'),'Excavation not connected to Base Camp');
console.log('PASS: Stacey Lake at (140,-240); 60m treeline, plus 1m margin, fully protected');
console.log('WOODLAND ENDS:',JSON.stringify(stops));
console.log('SAFE INTERRUPTED RING GAP:',waterGapM.toFixed(2),'meters');
console.log('PASS: All',mesh.triangles,'drawn ground faces remain on safe wooded ground; zero lake crossings');
console.log('PASS: dry section grade max',dry.maxCoreLongPct.toFixed(3),'%, cross-slope max',dry.maxCoreCrossPct.toFixed(3),'%');
console.log('LIMIT: prior deeper excavation canceled because it would cut through new lake; the full dry ring is NOT certified');
