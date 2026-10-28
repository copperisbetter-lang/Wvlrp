// Purple Ring excavation — isolated Base Camp trail implementation.
// The same excavatedHeight function drives BOTH high-detail drawn terrain and player collision.
// Only 300°–344° has a verified 7.8%-maximum mathematical centerline; cap approaches still require QA.
export const PURPLE_RING=Object.freeze({radius:268.224,startDeg:300,endDeg:344,firstCapDeg:298.75,lastCapDeg:345.25,treadHalfWidth:1.3,shoulderEnd:9});
// New Stacey Lake authoritative physical shoreline (stacey-dive.html, 2026-10-28).
// Protect lake + 60m open tree-clearance, and stop the path 1m BEFORE the estimated woods edge.
// This guard does NOT alter Stacey's lake model, water shader or approved location.
export const STACEY_LAKE=Object.freeze({cx:140,cz:-240,baseRadius:113.797805566,treeClearanceM:60,woodlandSetbackM:61,shoreFadeM:15});
export function staceyLakeShoreClearance(x,z){
 const dx=x-STACEY_LAKE.cx,dz=z-STACEY_LAKE.cz,a=Math.atan2(dz,dx);
 const shore=STACEY_LAKE.baseRadius*(1+.038*Math.sin(5*a)+.022*Math.cos(9*a));
 return Math.hypot(dx,dz)-shore;
}
function ringPoint(angle,offset=0){const a=angle*Math.PI/180,r=PURPLE_RING.radius+offset;return {x:r*Math.cos(a),z:r*Math.sin(a)}}
export function ringTreadWoodlandClearance(angle){
 return Math.min(...[-PURPLE_RING.treadHalfWidth,0,PURPLE_RING.treadHalfWidth].map(o=>{
  const p=ringPoint(angle,o);return staceyLakeShoreClearance(p.x,p.z);
 }));
}
export function lakeWoodlandEndpoints(){
 const stops=[];
 let last=ringTreadWoodlandClearance(0)-STACEY_LAKE.woodlandSetbackM;
 for(let a=.05;a<=360.00001;a+=.05){
  const next=ringTreadWoodlandClearance(a)-STACEY_LAKE.woodlandSetbackM;
  if((next<0)!==(last<0)){
   let lo=a-.05,hi=a;
   for(let j=0;j<24;j++){
    const mid=(lo+hi)/2,side=ringTreadWoodlandClearance(mid)-STACEY_LAKE.woodlandSetbackM;
    if((side<0)===(last<0))lo=mid;else hi=mid;
   }
   const angle=(lo+hi)/2,p=ringPoint(angle);
   stops.push({angleDeg:angle,x:p.x,z:p.z,shoreClearanceM:ringTreadWoodlandClearance(angle)});
  }
  last=next;
 }
 return stops;
}
const TARGETS=new Float64Array([-10.427090,-10.405241,-10.382584,-10.359120,-10.334851,-10.309779,-10.283905,-10.257232,-10.229761,-10.201493,-10.172433,-10.142580,-10.111939,-10.080512,-10.048301,-10.015308,-9.981538,-9.946992,-9.911675,-9.875588,-9.838736,-9.801122,-9.762749,-9.723622,-9.683743,-9.643117,-9.601748,-9.559640,-9.516797,-9.473224,-9.428925,-9.383904,-9.338261,-9.292617,-9.246974,-9.201330,-9.155687,-9.110043,-9.064399,-9.018756,-8.973112,-8.927469,-8.881825,-8.836182,-8.790538,-8.744894,-8.699251,-8.653607,-8.607964,-8.562320,-8.516677,-8.471033,-8.425389,-8.379746,-8.334102,-8.288459,-8.242815,-8.197172,-8.151528,-8.105884,-8.060241,-8.014597,-7.968954,-7.923310,-7.877667,-7.832023,-7.786379,-7.740736,-7.695092,-7.649449,-7.603805,-7.558162,-7.512518,-7.466874,-7.421231,-7.375587,-7.329944,-7.284300,-7.238657,-7.193013,-7.147369,-7.101726,-7.056082,-7.010439,-6.964795,-6.919152,-6.873508,-6.827864,-6.782221,-6.736577,-6.690934,-6.645290,-6.599647,-6.554003,-6.508359,-6.462716,-6.417072,-6.371429,-6.325785,-6.280142,-6.234498,-6.188854,-6.143211,-6.097567,-6.051924,-6.006280,-5.960637,-5.914993,-5.869349,-5.823706,-5.778062,-5.732419,-5.686775,-5.641132,-5.595488,-5.549844,-5.504201,-5.458557,-5.412914,-5.367270,-5.321627,-5.275983,-5.230339,-5.184696,-5.139052,-5.093409,-5.047765,-5.002122,-4.956478,-4.910834,-4.865191,-4.819547,-4.773904,-4.728260,-4.682617,-4.636973,-4.591329,-4.545686,-4.500042,-4.454399,-4.408755,-4.363112,-4.317468,-4.271824,-4.226181,-4.180537,-4.134894,-4.089250,-4.043607,-3.997963,-3.952319,-3.906676,-3.861032,-3.815389,-3.769745,-3.724102,-3.678458,-3.632814,-3.587171,-3.541527,-3.495884,-3.450240,-3.404597,-3.358953,-3.313309,-3.267666,-3.222022,-3.176379,-3.130735,-3.085092,-3.039448,-2.993804,-2.948161,-2.902517,-2.856874,-2.811230,-2.765587,-2.719943,-2.674299,-2.628656,-2.583012,-2.537369,-2.491725,-2.446082,-2.400438,-2.354794,-2.309151,-2.263507,-2.217864,-2.172220,-2.126577,-2.080933,-2.035289,-1.989646,-1.944002,-1.898359,-1.852715,-1.807072,-1.761428,-1.715784,-1.670141,-1.624497,-1.578854,-1.533210,-1.487567,-1.441923,-1.396279,-1.350636,-1.304992,-1.259349,-1.213705,-1.168062,-1.122418,-1.076774,-1.031131,-0.985487,-0.939844,-0.894200,-0.848557,-0.802913,-0.757269,-0.711626,-0.665982,-0.620339,-0.574695,-0.529052,-0.483408,-0.437764,-0.392121,-0.346477,-0.300834,-0.255190,-0.209547,-0.163903,-0.118259,-0.072616,-0.026972,0.018671,0.064315,0.109958,0.155602,0.201246,0.246889,0.292533,0.338176,0.383820,0.429463,0.475107,0.520751,0.566394,0.612038,0.657681,0.703325,0.748968,0.794612,0.840256,0.885899,0.931543,0.977186,1.022830,1.068473,1.114116,1.159759,1.205400,1.251040,1.296677,1.342309,1.387932,1.433540,1.479123,1.524666,1.570148,1.615534,1.660777,1.705811,1.750544,1.794856,1.838592,1.881558,1.923514,1.964180,2.003234,2.040319,2.075053,2.107045,2.135911,2.161292,2.182877,2.200422,2.213762,2.222823,2.227629,2.228296,2.225025,2.218090,2.207817,2.194569,2.178720,2.160646,2.140700,2.119209,2.096463,2.072709,2.048157,2.022977,1.997305,1.971246,1.944884,1.918281,1.891484,1.864530,1.837449,1.810262,1.782987,1.755641,1.728237,1.700786,1.673298,1.645784,1.618251,1.590707,1.563157,1.535658,1.508234,1.480897,1.453663,1.426546,1.399559,1.372716,1.346032,1.319519,1.293192,1.267065,1.241151,1.215463,1.190015,1.164821,1.139894,1.115247,1.090892,1.066844,1.043116,1.019719,0.996667,0.973972,0.951647,0.929703,0.908155,0.887012,0.866289,0.845995,0.826143,0.806744]);
const RAD=Math.PI/180;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
function sampleTarget(angle){
 const t=(angle-300)*8;
 if(t<=0)return TARGETS[0]+t*(TARGETS[1]-TARGETS[0]);
 if(t>=TARGETS.length-1)return TARGETS.at(-1)+(t-(TARGETS.length-1))*(TARGETS.at(-1)-TARGETS.at(-2));
 const n=Math.floor(t),f=t-n;
 return TARGETS[n]*(1-f)+TARGETS[n+1]*f;
}
export function excavationAt(x,z){
 const radius=Math.hypot(x,z),angle=(Math.atan2(z,x)/RAD+360)%360;
 return {radius,angle,offset:radius-PURPLE_RING.radius};
}
export function excavatedHeight(x,z,naturalHeight){
 const {angle,offset}=excavationAt(x,z);
 if(angle<PURPLE_RING.firstCapDeg||angle>PURPLE_RING.lastCapDeg||Math.abs(offset)>=PURPLE_RING.shoulderEnd)return naturalHeight;
 // New-lake hard stop: no earth movement in lake or the 60m open shore/approach.
 const clearance=staceyLakeShoreClearance(x,z);
 if(clearance<=STACEY_LAKE.woodlandSetbackM)return naturalHeight;
 const shoreFade=smooth((clearance-STACEY_LAKE.woodlandSetbackM)/STACEY_LAKE.shoreFadeM);
 // Extend the landform a little past the engineered core so the cut never ends in a vertical wall.
 // Approach caps are deliberately marked as NOT grade-certified.
 const cap=smooth((angle-PURPLE_RING.firstCapDeg)/1.25)*smooth((PURPLE_RING.lastCapDeg-angle)/1.25);
 const sideFade=1-smooth((Math.abs(offset)-PURPLE_RING.treadHalfWidth)/(PURPLE_RING.shoulderEnd-PURPLE_RING.treadHalfWidth));
 const graded=naturalHeight+(sampleTarget(angle)-naturalHeight)*cap*sideFade*shoreFade;
 // Genuine ~14 cm depressed drainage swale OUTSIDE the 2.6 m walkable tread on both shoulders.
 const swale=.14*Math.exp(-Math.pow((Math.abs(offset)-2.8)/.39,2))*cap*shoreFade;
 return graded-swale;
}
export function cutMetrics(baseTerrainY){
 let maxCoreLong=0,maxCoreCross=0,maxCut=0,safeStations=0,skippedLakeStations=0;
 const R=PURPLE_RING.radius, stops=lakeWoodlandEndpoints();
 for(let i=0;i<=1760;i++){
  const deg=300+i*.025,a=deg*RAD;
  const dry=ringTreadWoodlandClearance(deg)>=STACEY_LAKE.woodlandSetbackM;
  if(!dry){skippedLakeStations++;continue}
  safeStations++;
  const at=(offset)=>{const x=(R+offset)*Math.cos(a),z=(R+offset)*Math.sin(a);return excavatedHeight(x,z,baseTerrainY(x,z))};
  maxCoreCross=Math.max(maxCoreCross,Math.abs(at(1.3)-at(-1.3))/2.6*100);
  maxCut=Math.max(maxCut,baseTerrainY(R*Math.cos(a),R*Math.sin(a))-at(0));
  if(i<1760&&ringTreadWoodlandClearance(deg+.025)>=STACEY_LAKE.woodlandSetbackM){
   const b=(deg+.025)*RAD;
   for(const o of [-1.3,0,1.3]){
    const v=at(o),r=R+o,y=excavatedHeight(r*Math.cos(b),r*Math.sin(b),baseTerrainY(r*Math.cos(b),r*Math.sin(b)));
    maxCoreLong=Math.max(maxCoreLong,Math.abs(y-v)/(r*.025*RAD)*100);
   }
  }
 }
 return {maxCoreLongPct:maxCoreLong,maxCoreCrossPct:maxCoreCross,maxCoreCutMeters:maxCut,safeStations,skippedLakeStations,woodlandEndpoints:stops,coreGradePass:safeStations>0&&maxCoreLong<=8.01&&maxCoreCross<=3.01,
 note:'Only remaining dry 300–344 segment is audited; lake-clearing portion has NO path. Full dry ring is not grade-certified.'};
}
export function installPurpleRingExcavation(THREE,scene,{terrainY,baseTerrainY,groundMaterial}){
 // Replaces the deleted coarse-triangle zone with a continuous indexed fine-resolution surface.
 // Extra 7m of untouched ground either side masks the mesh boundary and keeps the cut reversible.
 const from=297.5,to=346.5,step=.125,offMin=-16,offMax=16,offStep=.5;
 const angularN=Math.round((to-from)/step)+1,radialN=Math.round((offMax-offMin)/offStep)+1;
 const vertices=[],uv=[],faces=[],allowed=[];
 for(let i=0;i<angularN;i++){
  const a=(from+i*step)*RAD,cs=Math.cos(a),sn=Math.sin(a);
  for(let j=0;j<radialN;j++){
   const r=PURPLE_RING.radius+offMin+j*offStep,x=r*cs,z=r*sn;
   vertices.push(x,terrainY(x,z)+.035,z);uv.push((x/402.336+1)*.5,(z/402.336+1)*.5);
   allowed.push(staceyLakeShoreClearance(x,z)>=STACEY_LAKE.woodlandSetbackM);
   if(i&&j){
    const n=i*radialN+j;
    for(const t of [[n,n-1,n-radialN],[n-1,n-radialN-1,n-radialN]]){
     if(t.every(k=>allowed[k])){
      const xavg=t.reduce((s,k)=>s+vertices[k*3],0)/3;
      const zavg=t.reduce((s,k)=>s+vertices[k*3+2],0)/3;
      if(staceyLakeShoreClearance(xavg,zavg)>=STACEY_LAKE.woodlandSetbackM)faces.push(...t);
     }
    }
   }
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(faces);
 geometry.computeVertexNormals();
 const patch=new THREE.Mesh(geometry,groundMaterial);patch.name='Purple ring real graded and walkable 300–344 excavation';patch.receiveShadow=true;scene.add(patch);
 // Exposed stone follows the actual cut shoulder, not stand-alone vertical fake panels.
 // One batched indexed mesh avoids hundreds of draw calls on Android.
 const rv=[],rc=[],ri=[];
 const shale=new THREE.Color(0x726e61),dark=new THREE.Color(0x4e514c),light=new THREE.Color(0x89806c);
 for(let i=0;i<angularN-1;i++){
  const a=(from+i*step)*RAD,b=(from+(i+1)*step)*RAD;
  if(a/RAD<300||a/RAD>344)continue;
  for(const side of [-1,1])for(let o=2;o<8;o+=.5){
   const off0=side*o,off1=side*(o+.5),coords=[];
   for(const angle of [a,b])for(const off of [off0,off1]){
    const r=PURPLE_RING.radius+off,x=r*Math.cos(angle),z=r*Math.sin(angle);
    const y=terrainY(x,z),cut=baseTerrainY(x,z)-y;coords.push([x,y,z,cut]);
   }
   if(Math.max(...coords.map(v=>v[3]))<.55||coords.some(v=>staceyLakeShoreClearance(v[0],v[2])<STACEY_LAKE.woodlandSetbackM))continue;
   const n=rv.length/3;
   for(const [x,y,z,cut] of coords){
    rv.push(x,y+.06,z);
    const shade=(Math.sin(x*1.3+z*1.7)+1)/2;
    const color=shale.clone().lerp(shade>.5?light:dark,Math.abs(shade-.5)*.45);
    rc.push(color.r,color.g,color.b);
   }
   ri.push(n,n+1,n+2,n+1,n+3,n+2);
  }
 }
 const rocks=new THREE.Group();rocks.name='Real cut shoulder stone exposure';
 if(ri.length){
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(rv,3));
  rg.setAttribute('color',new THREE.Float32BufferAttribute(rc,3));rg.setIndex(ri);rg.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
  const rockMesh=new THREE.Mesh(rg,material);rockMesh.receiveShadow=true;rocks.add(rockMesh);
 }
 scene.add(rocks);
 return {patch,rocks,triangles:faces.length/3,rockTriangles:ri.length/3,metrics:cutMetrics(baseTerrainY),lakeStops:lakeWoodlandEndpoints()};
}
