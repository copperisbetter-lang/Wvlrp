// Copyright © 2026 WVLRP / The Wild.
import {createCave} from './cave.js';
export function makePhysics(L){
 const TAU=2*Math.PI,M=L.rings[0].length,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const polar=(x,z)=>(Math.atan2(z,x)+TAU)%TAU/TAU*L.N;
 function tri(x,z,a,b,c){
  const d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(d)<1e-10)return null;
  const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,w=1-u-v;
  return Math.min(u,v,w)>=-1e-7?u*a[1]+v*b[1]+w*c[1]:null;
 }
 function ground(x,z){
  if(Math.hypot(x,z)<1e-7)return -10;
  const i=Math.floor(polar(x,z))%L.N,A=L.rings[i],B=L.rings[(i+1)%L.N];
  for(let j=0;j<M-1;j++){
   const t=j===0?null:tri(x,z,A[j],B[j],B[j+1]);if(t!==null)return t;
   const q=tri(x,z,A[j],B[j+1],A[j+1]);if(q!==null)return q;
  }return null;
 }
 const cave=createCave(L);
 const rocks=[];
 for(let i=0;i<L.N;i+=5){
  if(i>=L.cliffStart-4&&i<=L.cliffEnd+4||i>54&&i<74)continue;
  const a=i/L.N*TAU,r=Math.hypot(...L.shore[i])+7+3*Math.sin(i*2.7),x=r*Math.cos(a),z=r*Math.sin(a),y=ground(x,z),s=.45+1.4*(.5+.5*Math.sin(i*4.31));
  if(y!==null&&y>0)rocks.push({x,z,y,r:s,h:s*(.65+.22*Math.sin(i))});
 }
 function spawn(){const r=Math.hypot(...L.shore[64])+18;return {x:0,z:r,y:ground(0,r),mode:'walk'}}
 function step(p,dx,dz,dt,diving=false,rising=false){
  dt=clamp(dt,0,.1);
  const len=Math.hypot(dx,dz),max=(p.mode==='swim'||p.mode==='dive'?2:p.mode==='wade'?1.35:3.2)*dt;
  if(len>max&&len>0){dx*=max/len;dz*=max/len}
  let x=p.x+dx,z=p.z+dz;
  const caveMove=cave.advance(p,x,z,dt,diving,rising);
  if(caveMove)return caveMove.exit?{x:caveMove.x,z:caveMove.z,y:caveMove.y,mode:'dive',cave:false}:caveMove;
  let g=ground(x,z),old=ground(p.x,p.z),i=polar(x,z);
  const cliff=i>=L.cliffStart+3&&i<=L.cliffEnd-3&&g!==null&&g>-.35;
  const steep=g!==null&&old!==null&&g>Math.max(0,old)+Math.max(.23,Math.hypot(dx,dz)*.72);
  if(g===null||cliff||steep||rocks.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.34)){x=p.x;z=p.z;g=old}
  if(g===null)return {...p};
  let mode,y,depth=-g;
  if(depth<.12){mode='walk';y=g}
  else if(depth<1.18){mode='wade';y=g}
  else if(diving||p.mode==='dive'&&!rising){mode='dive';y=clamp((p.mode==='dive'?p.y:-.65)-(diving?1.5:0)*dt,g+.28,-.65)}
  else if(rising&&p.mode==='dive'&&p.y<-.7){mode='dive';y=Math.min(-.65,p.y+1.8*dt)}
  else{mode='swim';y=-.73}
  return {x,z,y,mode};
 }
 return {ground,rocks,cave,spawn,step};
}
