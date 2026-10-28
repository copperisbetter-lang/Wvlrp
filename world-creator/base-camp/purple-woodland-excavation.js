// Isolated wooded purple-path excavation — no changes to Stacey Lake.
// Segment: 350° -> 185° clockwise through 0°, ~913m of dry mountain woodland.
// All points in this module are (x,z) world metres, elevation in y.
// A two-pass 7.75%-Lipschitz lower envelope produces a CUT-ONLY longitudinal design;
// the center 2.6m tread is exactly flat in the radial direction.
export const WOODLAND=Object.freeze({startDeg:350,endDeg:545,stepDeg:.125,radiusM:268.224,halfTreadM:1.3,shoulderM:9,meshHalfWidthM:12,transitionDeg:6,maxLongPct:8,maxCrossPct:3});
const RAD=Math.PI/180;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const cos=Math.cos,sin=Math.sin;
const STACEY={cx:140,cz:-240,base:113.797805566,woodedSetback:61};
export function woodlandStaceyClearance(x,z){const dx=x-STACEY.cx,dz=z-STACEY.cz,a=Math.atan2(dz,dx);return Math.hypot(dx,dz)-STACEY.base*(1+.038*sin(5*a)+.022*cos(9*a));}
export function unwrappedWoodsAngle(x,z){const a=(Math.atan2(z,x)*180/Math.PI+360)%360;return a<WOODLAND.startDeg?a+360:a}
function treadSourceMin(a,base){
 const c=cos(a*RAD),s=sin(a*RAD);
 let min=Infinity;
 for(let j=-4;j<=4;j++){const r=WOODLAND.radiusM+j*WOODLAND.halfTreadM/4;min=Math.min(min,base(r*c,r*s))}
 return min;
}
let cachedBase=null,cachedProfile=null;
export function generateWoodlandProfile(baseTerrainY){
 const n=Math.round((WOODLAND.endDeg-WOODLAND.startDeg)/WOODLAND.stepDeg)+1;
 const raw=new Float64Array(n);
 for(let i=0;i<n;i++)raw[i]=treadSourceMin(WOODLAND.startDeg+i*WOODLAND.stepDeg,baseTerrainY);
 const target=Float64Array.from(raw);
 const ds=WOODLAND.radiusM*WOODLAND.stepDeg*RAD,maxStep=.0775*ds;
 // Strict two-sided lower envelope: grade <=7.75%, never higher than natural tread source.
 for(let i=1;i<n;i++)target[i]=Math.min(target[i],target[i-1]+maxStep);
 for(let i=n-2;i>=0;i--)target[i]=Math.min(target[i],target[i+1]+maxStep);
 // Smooth abrupt grade reversals by a cut-only relaxation, re-enforcing slope caps.
 for(let repeat=0;repeat<8;repeat++){
  const relaxed=Float64Array.from(target);
  for(let i=1;i<n-1;i++)relaxed[i]=Math.min(target[i],(target[i-1]+2*target[i]+target[i+1])/4);
  for(let i=1;i<n;i++)relaxed[i]=Math.min(relaxed[i],relaxed[i-1]+maxStep);
  for(let i=n-2;i>=0;i--)relaxed[i]=Math.min(relaxed[i],relaxed[i+1]+maxStep);
  target.set(relaxed);
 }
 return {raw,target,ds,n};
}
function getProfile(baseTerrainY){if(!cachedProfile||cachedBase!==baseTerrainY){cachedProfile=generateWoodlandProfile(baseTerrainY);cachedBase=baseTerrainY}return cachedProfile}
function profileHeight(a,base){
 const p=getProfile(base),t=(a-WOODLAND.startDeg)/WOODLAND.stepDeg;
 if(t<=0)return p.target[0];
 if(t>=p.n-1)return p.target[p.n-1];
 const i=Math.floor(t),f=t-i;
 return p.target[i]*(1-f)+p.target[i+1]*f;
}
export function woodlandGradeHeight(x,z,naturalHeight,baseTerrainY){
 const a=unwrappedWoodsAngle(x,z),r=Math.hypot(x,z),off=Math.abs(r-WOODLAND.radiusM);
 if(a<WOODLAND.startDeg||a>WOODLAND.endDeg||off>=WOODLAND.shoulderM)return naturalHeight;
 if(woodlandStaceyClearance(x,z)<STACEY.woodedSetback)return naturalHeight;
 // 6° natural-soil blend at either end; approach caps still require walking QA.
 const along=smooth((a-WOODLAND.startDeg)/WOODLAND.transitionDeg)*smooth((WOODLAND.endDeg-a)/WOODLAND.transitionDeg);
 const lateral=1-smooth((off-WOODLAND.halfTreadM)/(WOODLAND.shoulderM-WOODLAND.halfTreadM));
 // Only remove earth; do not fill above original grade.
 const target=profileHeight(a,baseTerrainY);
 const cut=Math.max(0,naturalHeight-target)*along*lateral;
 const swale=.12*Math.exp(-Math.pow((off-2.7)/.42,2))*along;
 return naturalHeight-cut-swale;
}
export function woodlandGradeAudit(base){
 const R=WOODLAND.radiusM,begin=WOODLAND.startDeg+WOODLAND.transitionDeg,end=WOODLAND.endDeg-WOODLAND.transitionDeg;
 let maxLong=0,maxCross=0,maxCut=0,maxNatural=0,peakAngle=null;
 for(let a=begin;a<=end-.025;a+=.025){
  const v=o=>{const r=R+o,ang=a*RAD,x=r*cos(ang),z=r*sin(ang);return woodlandGradeHeight(x,z,base(x,z),base)};
  const na=>(o)=>{const r=R+o,ang=na*RAD,x=r*cos(ang),z=r*sin(ang);return woodlandGradeHeight(x,z,base(x,z),base)};
  maxCross=Math.max(maxCross,Math.abs(v(1.3)-v(-1.3))/2.6*100);
  for(const o of [-1.3,0,1.3])maxLong=Math.max(maxLong,Math.abs(na(a+.025)(o)-v(o))/((R+o)*.025*RAD)*100);
  const ang=a*RAD,x=R*cos(ang),z=R*sin(ang),natural=base(x,z),cut=natural-v(0);
  if(cut>maxCut){maxCut=cut;peakAngle=a}
  const aa=(a+.025)*RAD;maxNatural=Math.max(maxNatural,Math.abs(base(R*cos(aa),R*sin(aa))-natural)/(R*.025*RAD)*100);
 }
 return {coreStartDeg:begin,coreEndDeg:end,gradedLengthM:R*(end-begin)*RAD,maxLongPct:maxLong,maxCrossPct:maxCross,maxCutM:maxCut,maxNaturalLongPct:maxNatural,maxCutAtDeg:peakAngle,corePass:maxLong<=8.01&&maxCross<=3.01};
}
export function installWoodlandExcavation(THREE,scene,{terrainY,baseTerrainY,soilMaterial}){
 const from=349.75,to=545.25,angularStep=.25,radialStep=.75,radialMin=-12,radialMax=12;
 const rows=Math.round((to-from)/angularStep)+1,cols=Math.round((radialMax-radialMin)/radialStep)+1;
 const xyz=[],uv=[],indices=[];
 for(let i=0;i<rows;i++){
  const a=(from+i*angularStep)*RAD,c=cos(a),s=sin(a);
  for(let j=0;j<cols;j++){
   const r=WOODLAND.radiusM+radialMin+j*radialStep,x=r*c,z=r*s;
   xyz.push(x,terrainY(x,z)+.035,z);uv.push((x/402.336+1)/2,(z/402.336+1)/2);
   if(i&&j){const n=i*cols+j;indices.push(n,n-1,n-cols,n-1,n-cols-1,n-cols)}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 const surface=new THREE.Mesh(g,soilMaterial);surface.name='Purple wooded trail real graded terrain with matching walking collision';surface.receiveShadow=true;scene.add(surface);
 // Low-contrast packed earth ribbon along surveyed center, 2.6m across; no black overlay.
 const tv=[],ti=[];
 for(let i=0;i<rows;i++){
  const angle=(from+i*angularStep)*RAD,c=cos(angle),s=sin(angle);
  for(const off of [-1.3,-.65,0,.65,1.3]){
   const r=WOODLAND.radiusM+off,x=r*c,z=r*s;
   tv.push(x,terrainY(x,z)+.057,z);
  }
  if(i)for(let j=1;j<5;j++){const k=i*5+j;ti.push(k,k-1,k-5,k-1,k-6,k-5)}
 }
 const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute(tv,3));tg.setIndex(ti);tg.computeVertexNormals();
 const tread=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({color:0x84694c,roughness:1,side:THREE.DoubleSide,transparent:true,opacity:.72,depthWrite:false}));
 tread.name='Purple route subdued forest earth tread';tread.renderOrder=3;scene.add(tread);
 // Shale exposures follow cut shoulder surfaces and are disabled where there is no actual cut.
 const rv=[],rc=[],ri=[];
 for(let a=350;a<545;a+=.5){
  const a0=a*RAD,a1=(a+.5)*RAD;
  for(const side of [-1,1])for(let dist=2;dist<8;dist+=1){
   const quad=[];
   for(const ang of [a0,a1])for(const o of [side*dist,side*(dist+1)]){
    const r=WOODLAND.radiusM+o,x=r*cos(ang),z=r*sin(ang),y=terrainY(x,z);
    quad.push([x,z,y,baseTerrainY(x,z)-y]);
   }
   if(Math.max(...quad.map(p=>p[3]))<.45)continue;
   const k=rv.length/3;
   for(const [x,z,y] of quad){
    rv.push(x,y+.065,z);
    const n=(Math.sin(x*.42+z*.29)+1)*.5,shade=.30+.14*n;
    rc.push(shade*1.04,shade*1.03,shade);
   }
   ri.push(k,k+1,k+2,k+1,k+3,k+2);
  }
 }
 const rockGroup=new THREE.Group();rockGroup.name='Woodland purple path cut-shoulder slate';
 if(ri.length){
  const rg=new THREE.BufferGeometry();
  rg.setAttribute('position',new THREE.Float32BufferAttribute(rv,3));rg.setAttribute('color',new THREE.Float32BufferAttribute(rc,3));rg.setIndex(ri);rg.computeVertexNormals();
  const rock=new THREE.Mesh(rg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));
  rock.receiveShadow=true;rockGroup.add(rock);
 }
 scene.add(rockGroup);
 return {surface,tread,rockGroup,terrainVertices:xyz.length/3,terrainTriangles:indices.length/3,treadTriangles:ti.length/3,rockTriangles:ri.length/3,grade:woodlandGradeAudit(baseTerrainY)};
}
