// WVLRP / The Wild — V8 massive dome OUTER mountainside bypass.
// Does not alter Stacey Lake, its V8 chamber, hidden entry tunnel or approved wooded lake-endpoints.
// The former WEST dry purple-ring alignment would cross the dome. THIS replaces it with
// one continuous outer loop, always on the uphill/outside side of the V8 chamber.
// All measurements are in game-world meters (x,z), Blender/Three y is vertical.
export const DOME_V8=Object.freeze({
 x:-86.744253843548,z:-240,radius:42,wallHeight:8,roofHeight:24,
 tunnelStartX:-54.744253843548,tunnelEndX:4.755746156452,tunnelZ:-240,tunnelHalfWidth:1.32,
 earthworkExclusionR:55
});
export const WEST_BYPASS=Object.freeze({
 startDeg:185,endDeg:263.6736605122942,offsetRampDeg:230,offsetPlateauEndDeg:258,
 ringRadius:268.224,peakOutwardM:85,treadHalfM:1.3,shoulderM:9,meshHalfM:12,
 profileStepDeg:.1,meshStepDeg:.25,radialMeshStep:.75,gradeTarget:.0775,
 maxLongPct:8,maxCrossPct:3,lakeSetbackM:61,approachTransitionDeg:6
});
const RAD=Math.PI/180,sm=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const sder=t=>{t=Math.max(0,Math.min(1,t));return 6*t*(1-t)};
export function outerBypassRadialOffset(deg){
 const q=sm((deg-WEST_BYPASS.startDeg)/(WEST_BYPASS.offsetRampDeg-WEST_BYPASS.startDeg));
 const r=1-sm((deg-WEST_BYPASS.offsetPlateauEndDeg)/(WEST_BYPASS.endDeg-WEST_BYPASS.offsetPlateauEndDeg));
 return WEST_BYPASS.peakOutwardM*q*r;
}
export function bypassPoint(deg){
 const a=deg*RAD,r=WEST_BYPASS.ringRadius+outerBypassRadialOffset(deg);
 return {x:r*Math.cos(a),z:r*Math.sin(a)};
}
export function bypassTangent(deg){
 const t=.02,lo=bypassPoint(deg-t),hi=bypassPoint(deg+t);
 const dx=hi.x-lo.x,dz=hi.z-lo.z,len=Math.hypot(dx,dz);
 return {x:dx/len,z:dz/len};
}
export function bypassAt(deg,perpendicularM=0){
 const p=bypassPoint(deg),v=bypassTangent(deg);
 return {x:p.x-v.z*perpendicularM,z:p.z+v.x*perpendicularM};
}
export function domeClearance(x,z){return Math.hypot(x-DOME_V8.x,z-DOME_V8.z)-DOME_V8.radius}
export function staceyClearance(x,z){
 const dx=x-140,dz=z+240,a=Math.atan2(dz,dx);
 return Math.hypot(dx,dz)-113.797805566*(1+.038*Math.sin(5*a)+.022*Math.cos(9*a));
}
export function bypassFootprintSafe(x,z){
 return domeClearance(x,z)>=DOME_V8.earthworkExclusionR-DOME_V8.radius&&staceyClearance(x,z)>=WEST_BYPASS.lakeSetbackM;
}
export function closestBypass(x,z){
 // Seed from angle, then project onto smooth centerline; no costly brute-force global search.
 const angle=(Math.atan2(z,x)/RAD+360)%360;
 let deg=Math.max(WEST_BYPASS.startDeg,Math.min(WEST_BYPASS.endDeg,angle));
 for(let i=0;i<7;i++){
  const p=bypassPoint(deg),t=bypassTangent(deg);
  const d=Math.hypot(x-p.x,z-p.z),speed=Math.hypot(...[bypassPoint(deg+.02).x-bypassPoint(deg-.02).x,bypassPoint(deg+.02).z-bypassPoint(deg-.02).z])/.04;
  if(!Number.isFinite(speed)||speed<.001)break;
  let delta=((x-p.x)*t.x+(z-p.z)*t.z)/speed;
  delta=Math.max(-3,Math.min(3,delta));
  deg=Math.max(WEST_BYPASS.startDeg,Math.min(WEST_BYPASS.endDeg,deg+delta));
  if(Math.abs(delta)<.00002)break;
 }
 const p=bypassPoint(deg),v=bypassTangent(deg);
 const offset=(x-p.x)*(-v.z)+(z-p.z)*v.x;
 return {deg,offset,distance:Math.hypot(x-p.x,z-p.z)};
}
let cacheBase=null,cache=null;
export function buildBypassProfile(base){
 const n=Math.round((WEST_BYPASS.endDeg-WEST_BYPASS.startDeg)/WEST_BYPASS.profileStepDeg)+1;
 const pts=[],natural=[],lengths=[0];
 for(let i=0;i<n;i++){
  const a=WEST_BYPASS.startDeg+(WEST_BYPASS.endDeg-WEST_BYPASS.startDeg)*i/(n-1);
  const p=bypassPoint(a),min=Math.min(...[-1.3,-.975,-.65,-.325,0,.325,.65,.975,1.3].map(o=>{const q=bypassAt(a,o);return base(q.x,q.z)}));
  pts.push({a,p});natural.push(min);
  if(i)lengths.push(lengths[i-1]+Math.hypot(p.x-pts[i-1].p.x,p.z-pts[i-1].p.z));
 }
 const profile=Float64Array.from(natural),cap=WEST_BYPASS.gradeTarget;
 for(let i=1;i<n;i++)profile[i]=Math.min(profile[i],profile[i-1]+cap*(lengths[i]-lengths[i-1]));
 for(let i=n-2;i>=0;i--)profile[i]=Math.min(profile[i],profile[i+1]+cap*(lengths[i+1]-lengths[i]));
 return {pts,natural,profile,lengths,n};
}
function profile(base){if(cacheBase!==base||!cache){cacheBase=base;cache=buildBypassProfile(base)}return cache}
function targetHeight(deg,base){
 const p=profile(base),step=(WEST_BYPASS.endDeg-WEST_BYPASS.startDeg)/(p.n-1),t=(deg-WEST_BYPASS.startDeg)/step;
 if(t<=0)return p.profile[0];
 if(t>=p.n-1)return p.profile.at(-1);
 const i=Math.floor(t),f=t-i;
 return p.profile[i]*(1-f)+p.profile[i+1]*f;
}
export function bypassGradedHeight(x,z,natural,base){
 if(!bypassFootprintSafe(x,z))return natural;
 const loc=closestBypass(x,z),a=loc.deg,d=loc.distance;
 if(a<=WEST_BYPASS.startDeg||a>=WEST_BYPASS.endDeg||d>=WEST_BYPASS.shoulderM)return natural;
 const along=sm((a-WEST_BYPASS.startDeg)/WEST_BYPASS.approachTransitionDeg)*
  sm((WEST_BYPASS.endDeg-a)/WEST_BYPASS.approachTransitionDeg);
 const across=1-sm((d-WEST_BYPASS.treadHalfM)/(WEST_BYPASS.shoulderM-WEST_BYPASS.treadHalfM));
 const cut=Math.max(0,natural-targetHeight(a,base))*along*across;
 const swale=.11*Math.exp(-Math.pow((d-2.8)/.42,2))*along;
 return natural-cut-swale;
}
export function bypassAudit(base){
 let maxLong=0,maxCross=0,maxCut=0,maxNaturalLong=0,minCenterDome=Infinity,minShoulderDome=Infinity,minStacey=Infinity,
  maxRadius=0,length=0,deepAt=0;
 const coreStart=WEST_BYPASS.startDeg+WEST_BYPASS.approachTransitionDeg,coreEnd=WEST_BYPASS.endDeg-WEST_BYPASS.approachTransitionDeg;
 let prev=null;
 for(let a=WEST_BYPASS.startDeg;a<=WEST_BYPASS.endDeg;a+=.05){
  const p=bypassPoint(a),d=domeClearance(p.x,p.z);minCenterDome=Math.min(minCenterDome,d);
  maxRadius=Math.max(maxRadius,Math.hypot(p.x,p.z));
  if(prev)length+=Math.hypot(prev.x-p.x,prev.z-p.z);prev=p;
  for(const off of [-12,-9,-1.3,0,1.3,9,12]){
   const q=bypassAt(a,off);
   minShoulderDome=Math.min(minShoulderDome,domeClearance(q.x,q.z));
   minStacey=Math.min(minStacey,staceyClearance(q.x,q.z));
  }
  const at=o=>{const q=bypassAt(a,o);return bypassGradedHeight(q.x,q.z,base(q.x,q.z),base)};
  if(a>=coreStart&&a<coreEnd-.05){
   const nextA=a+.05,next= bypassPoint(nextA);
   const dist=Math.hypot(p.x-next.x,p.z-next.z);
   for(const off of [-1.3,0,1.3]){
    const q=bypassAt(nextA,off),dy=Math.abs(at(off)-bypassGradedHeight(q.x,q.z,base(q.x,q.z),base));
    maxLong=Math.max(maxLong,dy/dist*100);
    const src=bypassAt(a,off),dst=bypassAt(nextA,off);
    maxNaturalLong=Math.max(maxNaturalLong,Math.abs(base(src.x,src.z)-base(dst.x,dst.z))/dist*100);
   }
   maxCross=Math.max(maxCross,Math.abs(at(1.3)-at(-1.3))/2.6*100);
  }
  let cut=base(p.x,p.z)-at(0);
  if(cut>maxCut){maxCut=cut;deepAt=a}
 }
 return {lengthM:length,coreLengthM:length*(coreEnd-coreStart)/(WEST_BYPASS.endDeg-WEST_BYPASS.startDeg),
 coreStartDeg:coreStart,coreEndDeg:coreEnd,maxLongPct:maxLong,maxCrossPct:maxCross,maxNaturalLongPct:maxNaturalLong,
 maxCutM:maxCut,deepestAtDeg:deepAt,minDomeWallCenterlineM:minCenterDome,minDomeWallShoulder12m:minShoulderDome,
 minStaceyShoreShoulder12m:minStacey,maxBaseCampRadiusM:maxRadius,
 coreGradePass:maxLong<=WEST_BYPASS.maxLongPct+.02&&maxCross<=WEST_BYPASS.maxCrossPct+.02,
 domeSafetyPass:minShoulderDome>=13.0};
}
export function installPurpleDomeBypass(THREE,scene,{terrainY,baseTerrainY,soilMaterial}){
 const from=WEST_BYPASS.startDeg,to=WEST_BYPASS.endDeg,step=WEST_BYPASS.meshStepDeg;
 const rows=Math.ceil((to-from)/step)+1,cols=Math.round(WEST_BYPASS.meshHalfM*2/WEST_BYPASS.radialMeshStep)+1;
 const xyz=[],uv=[],tri=[],allowed=[];
 for(let i=0;i<rows;i++){
  const a=from+(to-from)*i/(rows-1);
  for(let j=0;j<cols;j++){
   const offset=-WEST_BYPASS.meshHalfM+j*2*WEST_BYPASS.meshHalfM/(cols-1),p=bypassAt(a,offset);
   xyz.push(p.x,terrainY(p.x,p.z)+.035,p.z);uv.push((p.x/402.336+1)/2,(p.z/402.336+1)/2);
   allowed.push(bypassFootprintSafe(p.x,p.z));
   if(i&&j){const n=i*cols+j;
    for(const t of [[n,n-1,n-cols],[n-1,n-cols-1,n-cols]]){
     if(!t.every(k=>allowed[k]))continue;
     const cx=t.reduce((s,k)=>s+xyz[k*3],0)/3,cz=t.reduce((s,k)=>s+xyz[k*3+2],0)/3;
     if(bypassFootprintSafe(cx,cz))tri.push(...t);
    }
   }
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(tri);g.computeVertexNormals();
 const terrain=new THREE.Mesh(g,soilMaterial);terrain.name='Purple path safe outer V8 dome bypass: fine terrain & walking collision';
 terrain.receiveShadow=true;scene.add(terrain);
 const tv=[],tidx=[],okay=[];
 for(let i=0;i<rows;i++){
  const a=from+(to-from)*i/(rows-1);
  for(const off of [-1.3,-.65,0,.65,1.3]){
   const p=bypassAt(a,off);
   tv.push(p.x,terrainY(p.x,p.z)+.065,p.z);okay.push(bypassFootprintSafe(p.x,p.z));
  }
  if(i)for(let j=1;j<5;j++){
   const k=i*5+j;for(const t of [[k,k-1,k-5],[k-1,k-6,k-5]])if(t.every(z=>okay[z]))tidx.push(...t);
  }
 }
 const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute(tv,3));
 tg.setIndex(tidx);tg.computeVertexNormals();
 const tread=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({color:0x83664b,roughness:1,side:THREE.DoubleSide,transparent:true,opacity:.78,depthWrite:false}));
 tread.name='Purple V8 dome outer bypass packed-earth tread';tread.renderOrder=3;scene.add(tread);
 return {terrain,tread,terrainTriangles:tri.length/3,treadTriangles:tidx.length/3,grade:bypassAudit(baseTerrainY)};
}
