// Completely synthetic topology fixture — NO private Dad mesh or G9 data.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('./stage34-measured-mesh-surgery.js',import.meta.url),'utf8');
const {getLoops,interpolateRing}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
class P {
 constructor(x,y,z){this.x=x;this.y=y;this.z=z;}
 clone(){return new P(this.x,this.y,this.z);}
 lerp(p,t){this.x+=(p.x-this.x)*t;this.y+=(p.y-this.y)*t;this.z+=(p.z-this.z)*t;return this;}
}
const THREE={Vector3:P},mesh={localToWorld:p=>p};
const N=60,offset=.12,seg=[],R=.10;
const ring=Array.from({length:N},(_,i)=>{
 const theta=offset+i*2*Math.PI/N,position=[R*Math.cos(theta),1.55,R*Math.sin(theta)];
 return {mesh,position,attrs:{position,normal:[Math.cos(theta),0,Math.sin(theta)],uv:[i/N,.5]}};
});
for(let i=0;i<N;i++)seg.push([ring[i],ring[(i+1)%N]]);
const loops=getLoops(seg,{THREE,x:0,z:0});
assert.equal(loops.length,1,'Expected one physically closed synthetic ring');
assert.equal(loops[0].sequence.length,N);
const order=loops[0].sequence.map((v,i)=>{
 const p=loops[0].points[i];
 const angle=(Math.atan2(p.z,p.x)+2*Math.PI)%(2*Math.PI);
 return {angle,pos:p,v};
}).sort((a,b)=>a.angle-b.angle);
for(const theta of [0.001,.05,.119,.12,.18,Math.PI,6.22,6.27]){
 const result=interpolateRing(order,theta);
 assert(Math.hypot(result.pos.x-R*Math.cos(theta),result.pos.z-R*Math.sin(theta))<.002,
   'Polar contour interpolation error at '+theta);
}
console.log('PASS Stage34: 60 genuine synthetic mesh-edge segments -> one closed ring; angular seam wraps 0/360 degrees without jumps.');
