// Focused source geometry checks for Stacey V9's isolated purple fork staging.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../base-camp/stacey-purple-main-lake-spur.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const flat=(x,z)=>5+.10*(8-x)+.012*(z+374);
const trail=m.createStaceyPurpleTrails(flat);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
test('owner through-route remains continuous beyond fork',()=>{
 const fork={x:-166,z:-310};
 const nearest=trail.main.samples.reduce((a,p)=>dist(p,fork)<dist(a,fork)?p:a);
 assert.ok(dist(nearest,fork)<.001,'junction is actually part of main route');
 assert.ok(trail.main.end-nearest.s>60,'main must keep going beyond the lake turnoff');
 const start=trail.spur.samples[0];
 assert.ok(dist(start,fork)<.001,'lake branch must physically meet main route');
 assert.ok(dist(trail.spur.samples.at(-1),trail.main.samples.at(-1))>130,'lake spur is NOT an extension of through-trail');
});
test('spur breaks away from main immediately and reaches lake-side woods',()=>{
 const p=trail.spur.samples.find(x=>x.s>=24);
 const main=trail.main.samples.reduce((best,q)=>dist(p,q)<dist(p,best)?q:best);
 assert.ok(dist(p,main)>7,'the two trails should not overlap for first 24m');
 const last=trail.spur.samples.at(-1);
 assert.ok(last.x>0,'spur should reach eastern lakeside clearing, not end at waterfall');
 assert.ok(trail.shoreClearance(last.x,last.z)>65);
});
test('no 5.5m trail earthwork strip penetrates lake water buffer or V9 dome safety buffer',()=>{
 let visits=0,minDome=Infinity,minShore=Infinity;
 for(const route of [trail.main,trail.spur]){
  for(let i=0;i<route.samples.length;i++){
   const p=route.samples[i],a=route.samples[Math.max(0,i-1)],b=route.samples[Math.min(route.samples.length-1,i+1)];
   const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
   for(const offset of [-5.5,-1.3,0,1.3,5.5]){
    const x=p.x+offset*nx,z=p.z+offset*nz;
    minDome=Math.min(minDome,trail.domeClearance(x,z));
    minShore=Math.min(minShore,trail.shoreClearance(x,z));visits++;
   }
  }
 }
 assert.ok(minDome>=13,'V9 cave clearance too small: '+minDome);
 assert.ok(minShore>=61,'shore buffer too small: '+minShore);
 assert.ok(visits>1000);
});
test('last ten metres of approach are nearly level; existing terrain elsewhere untouched',()=>{
 const end=trail.spur.end,tail=trail.spur.samples.filter(p=>end-p.s<=8);
 for(let i=1;i<tail.length;i++){
  const slope=Math.abs((tail[i].grade-tail[i-1].grade)/(tail[i].s-tail[i-1].s));
  assert.ok(slope<.026,'terminal grade should be less than 2.6% on example terrain');
 }
 assert.equal(trail.gradeGround(-85,-240,flat(-85,-240)),flat(-85,-240),'no cave excavation');
 assert.equal(trail.gradeGround(140,-240,flat(140,-240)),flat(140,-240),'no lake excavation');
 assert.equal(trail.gradeGround(300,-200,flat(300,-200)),flat(300,-200),'no remote terrain change');
});

test('both trails have walkable grades, bounded earthwork and continuous fork',()=>{
 const fork=trail.main.samples.find(p=>Math.hypot(p.x+166,p.z+310)<.001);
 assert.ok(fork,'ridge main contains approved lake fork');
 assert.ok(Math.abs(fork.grade-trail.spur.samples[0].grade)<.002,'fork tread heights must connect');
 for(const route of [trail.main,trail.spur]){
  for(let i=0;i<route.samples.length;i++){
   const p=route.samples[i];
   assert.ok(p.natural-p.grade<=3.005,'excessive earth cut at '+route.name+' '+p.s);
   assert.ok(p.grade-p.natural<=2.005,'excessive earth fill at '+route.name+' '+p.s);
   if(i>0){
    const prev=route.samples[i-1],rise=Math.abs(p.grade-prev.grade);
    assert.ok(rise<=.0781*(p.s-prev.s)+.00001,'steep step at '+route.name+' '+p.s);
   }
  }
 }
 const samples=trail.spur.samples,end=trail.spur.end,tail=samples.filter(p=>end-p.s<=9);
 for(let i=1;i<tail.length;i++)assert.ok(
  Math.abs((tail[i].grade-tail[i-1].grade)/(tail[i].s-tail[i-1].s))<=.02,
  'last 9 metres must enter lake woods almost level');
});
