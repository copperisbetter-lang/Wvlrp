// Adapted from Luminous Lake (c) 2026 Bles Software, MIT License.
// Source: https://github.com/stas4000/luminous-lake/blob/main/src/sim/waves.js
export function waveAmplitude(calmness){const c=Math.max(0,Math.min(1,calmness));return .58*(1-c)+.02;}
export function waveHeight(x,z,time,calmness,wind=.3){
 const a=waveAmplitude(calmness),w=1+wind*1.05,t=time*(.72+wind*1.05);
 const swell=Math.sin(x*.105*w+t*1.08)*.4+Math.sin(z*.138*w-t*.92+1.7)*.3+
 Math.sin((x+z)*.066*w+t*.56+4.2)*.2+Math.sin((x*.22-z*.185)*w+t*1.55+2.6)*.1;
 const chop=(Math.sin(x*.62*w+z*.31+t*2.9)*.55+Math.sin(z*.74*w-x*.28-t*3.6+.9)*.45)*
 (.09+wind*.24)*(1-calmness*.55);
 return swell*a+chop*a;
}
