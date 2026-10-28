// Independent numeric/geometry QA for first dry woodland purple-path cut.
// Uses exact module source and game-seeded campsite locations. No browser GPU required.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const src=readFileSync(new URL('../base-camp/purple-woodland-excavation.js',import.meta.url),'utf8');
const w=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const {WOODLAND,woodlandGradeHeight,woodlandGradeAudit,woodlandStaceyClearance,generateWoodlandProfile,installWoodlandExcavation}=w;
const base=(x,z)=>7*Math.sin(x/92)*Math.cos(z/78)+3*Math.sin(z/34)+2*Math.cos(x/43);
const terrain=(x,z)=>woodlandGradeHeight(x,z,base(x,z),base);
const R=WOODLAND.radiusM,rad=Math.PI/180,grade=woodlandGradeAudit(base);
console.log('Woodland route grade',grade);
assert.ok(grade.corePass,'Full-width main tread must meet 8% longitudinal and 3% cross');
assert.ok(grade.gradedLengthM>855&&grade.gradedLengthM<860);
assert.ok(grade.maxNaturalLongPct>12,'Expected steep original hillside');
assert.ok(grade.maxCutM>3&&grade.maxCutM<3.3);
const profile=generateWoodlandProfile(base);
for(let i=0;i<profile.n;i++){
 assert.ok(profile.target[i]<=profile.raw[i]+.000001,'Planned excavation fills above natural ground');
 if(i)assert.ok(Math.abs(profile.target[i]-profile.target[i-1])/profile.ds<.077501);
}
for(const [x,z] of [[140,-240],[140,-125],[0,-108],[-30,-266],[246,-107],[317.861,-169.010]]){
 assert.ok(Math.abs(terrain(x,z)-base(x,z))<1e-9,'Protected lake or other source terrain modified');
}
let minClearance=Infinity;
for(let a=350;a<=545;a+=.025)for(const off of [-12,-9,-1.3,0,1.3,9,12]){
 const ang=a*rad,r=R+off,x=r*Math.cos(ang),z=r*Math.sin(ang);
 minClearance=Math.min(minClearance,woodlandStaceyClearance(x,z));
 assert.ok(woodlandStaceyClearance(x,z)>61,'Graded route enters protected lake or tree opening');
}
// Replicate deterministic Base Camp campsite siteSeed and placement without touching actual game data.
const LAKE={x:0,z:-108,rx:82,rz:5*4046.8564224/(Math.PI*82)};
function oldLakeRadius(x,z){const dx=x-LAKE.x,dz=z-LAKE.z,a=Math.atan2(dz,dx);return Math.hypot(dx/LAKE.rx,dz/LAKE.rz)/(1+.025*Math.sin(5*a)+.018*Math.cos(9*a))}
function oldBeach(x,z){const r=oldLakeRadius(x,z);return z>LAKE.z+20&&Math.abs(x)<39&&r>.79&&r<1.23}
let seed=32178;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const camps=[];
for(let trial=0;trial<5000&&camps.length<24;trial++){
 const r=75+random()*260,a=random()*Math.PI*2,x=Math.cos(a)*r,z=Math.sin(a)*r;
 if(oldLakeRadius(x,z)<1.45||oldBeach(x,z))continue;
 if(camps.some(p=>Math.hypot(x-p.x,z-p.z)<32))continue;
 camps.push({id:camps.length+42,x,z});
}
assert.equal(camps.length,24);camps[22].x=317.861133;camps[22].z=-169.009763;
let closest={id:null,d:Infinity,angle:0};
for(const camp of camps){
 for(let a=WOODLAND.startDeg;a<=WOODLAND.endDeg;a+=.125){
  const ang=a*rad,x=R*Math.cos(ang),z=R*Math.sin(ang),d=Math.hypot(camp.x-x,camp.z-z);
  if(d<closest.d)closest={id:camp.id,d,angle:a};
 }
}
assert.ok(closest.d>27,'Within 12m excavation mesh + 10m campsite pad + 5m extra buffer');
class Geo{setAttribute(k,v){(this.attributes??={})[k]=v}setIndex(x){this.indices=x}computeVertexNormals(){}}
class Attr{constructor(array,n){this.array=array;this.itemSize=n}}
class Mesh{constructor(g,m){this.geometry=g;this.material=m}}
class Group{constructor(){this.children=[]}add(x){this.children.push(x)}}
class Mat{constructor(o){this.o=o}}
const THREE={BufferGeometry:Geo,Float32BufferAttribute:Attr,Mesh,Group,MeshStandardMaterial:Mat,DoubleSide:2};
const scene={children:[],add(x){this.children.push(x)}};
const m=installWoodlandExcavation(THREE,scene,{terrainY:terrain,baseTerrainY:base,soilMaterial:{}});
assert.ok(m.terrainTriangles>40000&&m.terrainTriangles<60000);
assert.ok(m.rockTriangles>1000&&m.rockTriangles<12000);
assert.ok(m.treadTriangles>5000);
assert.ok(scene.children.includes(m.surface)&&scene.children.includes(m.rockGroup)&&scene.children.includes(m.tread));
const pos=m.surface.geometry.attributes.position.array,ix=m.surface.geometry.indices;
for(const k of ix){
 const x=pos[k*3],y=pos[k*3+1],z=pos[k*3+2];
 assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));
 assert.ok(woodlandStaceyClearance(x,z)>61);
 assert.ok(Math.abs(y-.035-terrain(x,z))<.00001,'Ground rendering does not match player walking height');
}
const game=readFileSync(new URL('../base-camp/index.html',import.meta.url),'utf8');
assert.ok(game.includes('const woodlandExcavation=installWoodlandExcavation'),'Woodland excavation not part of game');
assert.ok(game.includes('woodlandGradeHeight(x,z,excavatedHeight(x,z,baseTerrainY(x,z)),baseTerrainY)'),'Collision does not use same grade');
assert.ok(game.includes('woodAngle>349.95&&woodAngle<545.05'),'Old coarse triangles still overlap the cut');
assert.ok(game.includes("spawnTarget==='woodland'"),'No woodland test spawn');
assert.ok(game.includes('ringTreadWoodlandClearance(deg)'),'New Stacey Lake gap was removed');
console.log('PASS',JSON.stringify({gradedMeters:grade.gradedLengthM,maxLong:grade.maxLongPct,maxCross:grade.maxCrossPct,maxCut:grade.maxCutM,triangles:m.terrainTriangles,rockTriangles:m.rockTriangles,minLakeClearance:minClearance,closestCamp:closest}));
console.log('LIMIT: ungraded 6-degree approaches at both ends, dry ring segment from 185 to 263.67 and 336.5 to 350 are provisional; entire 360-degree route NOT complete or approved.');
