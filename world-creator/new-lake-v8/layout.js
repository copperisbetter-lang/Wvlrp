// Copyright © 2026 WVLRP / The Wild. All rights reserved in original project-created material only.
// New lake, pass 01. Units are metres. This independent scene does not import or edit Stacey Lake.
export function buildLayout(){
 const N=256, TAU=2*Math.PI, target=4.5*4046.8564224;
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const smooth=(x)=>{x=clamp(x,0,1);return x*x*(3-2*x)};
 const raw=a=> (1+.045*Math.sin(3*a+.4)+.026*Math.cos(7*a)+.018*Math.sin(11*a-.5));
 const rawPoints=Array.from({length:N},(_,i)=>{let a=TAU*i/N;return [raw(a)*Math.cos(a),raw(a)*Math.sin(a)];});
 const area=p=>Math.abs(p.reduce((s,q,i)=>{const r=p[(i+1)%p.length];return s+q[0]*r[1]-q[1]*r[0]},0))/2;
 const scale=Math.sqrt(target/area(rawPoints));
 const shore=rawPoints.map(p=>p.map(v=>v*scale));
 const lengths=shore.map((p,i)=>Math.hypot(shore[(i+1)%N][0]-p[0],shore[(i+1)%N][1]-p[1]));
 const perimeter=lengths.reduce((s,x)=>s+x,0);
 // North is negative z, choose a continuous arc centered approximately there.
 let start=192,end=192,total=0;
 while(total/perimeter<.42){if(192-start<=end-192){start--;total+=lengths[start]}else{total+=lengths[end];end++}}
 const edgeType=i=>i>=start&&i<=end;
 const profile=i=>{
   let a=TAU*i/N;const p=shore[i],r=Math.hypot(...p);
   const weight=edgeType(i)?smooth(Math.min(i-start,end-i)/11):0;
   // The boundary is the cliff crest on the entire cliff sector.
   const cliffH=24+1.8*Math.sin(a*5)+.7*Math.cos(a*13);
   const landH=5+3*Math.sin(a*5)**2;
   const lerp=(x,y)=>x+(y-x)*weight;
   const shelf=lerp(12,3.5);
   const edge=lerp(76,10); const ledge=.75*Math.sin(i*.43)+.35*Math.sin(i*1.17);
   return [[0,-10],[r*.42,-9.6],[r*.78,-8.5],[r-shelf,-3.8],[r-shelf*.38,-1.2],[r,0],[r+lerp(5,.7),lerp(.35,1.8)],[r+lerp(22,1.8+ledge*.35),lerp(1.1,cliffH*.34)],[r+lerp(47,3.6+ledge),lerp(3.2,cliffH*.73)],[r+edge,lerp(landH,cliffH)]].map(([radius,y])=>[radius*Math.cos(a),y,radius*Math.sin(a)]);
 };
 const rings=Array.from({length:N},(_,i)=>profile(i));
 return {N,shore,rings,cliffStart:start,cliffEnd:end,cliffFraction:total/perimeter,area:area(shore),perimeter,waterLevel:0,worldEdgeRule:'outermost terrain ring; cliff crest equals edge on cliff sector; no terrain beyond it'};
}
export const layout=buildLayout();
