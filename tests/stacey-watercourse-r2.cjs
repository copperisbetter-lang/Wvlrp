const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('world-creator/base-camp/stacey-dive.html','utf8');
const smoothstep=(x,a,b)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const ctx={T:{MathUtils:{smoothstep,clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),lerp:(a,b,t)=>a+(b-a)*t}},window:{},Math};
vm.createContext(ctx);
const start=html.indexOf('const smooth=(a,b,x)');
const end=html.indexOf('// Reuse Gater 1');
// Ground definitions only; diagnostic tree-mask initialization uses Matrix4.
let source=html.slice(start,end);
source=source.replace(/const hiddenTreeMatrix=.*?;/,'const hiddenTreeMatrix=null;');
vm.runInContext(source+';globalThis.groundCheck=naturalGround;',ctx);
let minimum=Infinity;
for(let i=0;i<=240;i++){
 const t=i/240,x=-36+17.4*t,z=-240+.32*Math.sin(t*2.8),water=21.34+(15.49-21.34)*t;
 const clearance=water-ctx.groundCheck(x,z);minimum=Math.min(minimum,clearance);
 assert(clearance>.25,`Trunk obstruction at ${x}: clearance ${clearance}`);
}
for(let i=0;i<=200;i++)for(const side of [-1,1]){
 const t=i/200,x=-18.6+11.3057*t,z=-240+side*(1.1+2.71*smoothstep(t,0,1)),water=15.49+(12.04-15.49)*t;
 const clearance=water-ctx.groundCheck(x,z);minimum=Math.min(minimum,clearance);
 assert(clearance>.25,`Branch obstruction at ${x}: clearance ${clearance}`);
}
assert(!html.includes('ids.push(...refinedIds)'), 'large spread overflows JS argument limit');
console.log(JSON.stringify({sampledCenterlinePoints:643,minimumBedClearance:minimum,terrainProfile:'PASS'}));
