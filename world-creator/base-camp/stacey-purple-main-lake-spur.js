// WVLRP The Wild — owner's Oct 28 Stacey Lake path sketch.
// Continuously connected ridge THROUGH-trail and a separate branching lake spur.
// Isolated staging only. Coordinates in Stacey scene world metres, not pixels.
// No updates to live Base Camp, underwater quests, lake, or underground cavern.
export const STACEY_PURPLE_SPEC=Object.freeze({
  domeX:-86.744253843548,domeZ:-240,domeRadius:42,exclusionRadius:55,
  shoreX:140,shoreZ:-240,minShoreSetback:61,
  mainWidth:2.6,lakeSpurWidth:2.6,earthShoulder:5.5
});
export const RIDGE_WAYPOINTS=Object.freeze([
  [-167,-110],[-172,-160],[-169,-208],[-173,-260],
  [-166,-310],[-165,-356],[-153,-382]
]);
// Longer hillside switchbacks in woods. Preserve the approved fork and landing;
// no loop around the lake, waterfall photo, or underground 84m cavern.
export const LAKE_SPUR_WAYPOINTS=Object.freeze([[-166,-310],[-142,-332],[-130,-354],[-106,-369],[-106,-370],[-106,-366],[-102,-354],[-90,-346],[-86,-350],[-10,-422],[14,-426],[34,-442],[38,-438],[38,-434],[34,-430],[-26,-366],[-22,-358],[-14,-354],[-10,-358],[6,-374],[8,-374]]);
const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clip(t,0,1);return t*t*(3-2*t)};
function nearSegment(x,z,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,inv=1/Math.max(.0001,dx*dx+dz*dz);
  const f=clip(((x-a.x)*dx+(z-a.z)*dz)*inv,0,1);
  const qx=a.x+f*dx,qz=a.z+f*dz;
  return {distance:Math.hypot(x-qx,z-qz),along:a.s+f*(b.s-a.s)};
}
function interpolate(waypoints){
  const result=[];
  for(let k=0;k<waypoints.length-1;k++){
    const a=waypoints[Math.max(0,k-1)],b=waypoints[k],c=waypoints[k+1],d=waypoints[Math.min(waypoints.length-1,k+2)];
    const n=Math.max(4,Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/1.3));
    for(let i=0;i<n;i++){
      const t=i/n,t2=t*t,t3=t2*t;
      const val=(v0,v1,v2,v3)=>.5*((2*v1)+(-v0+v2)*t+(2*v0-5*v1+4*v2-v3)*t2+(-v0+3*v1-3*v2+v3)*t3);
      const p={x:val(a[0],b[0],c[0],d[0]),z:val(a[1],b[1],c[1],d[1])};
      if(result.length){const prev=result[result.length-1];p.s=prev.s+Math.hypot(p.x-prev.x,p.z-prev.z)}else p.s=0;
      result.push(p);
    }
  }
  const [x,z]=waypoints[waypoints.length-1],prev=result[result.length-1];
  result.push({x,z,s:prev.s+Math.hypot(x-prev.x,z-prev.z)});
  return result;
}
function shoreClearance(x,z){
  const dx=x-STACEY_PURPLE_SPEC.shoreX,dz=z-STACEY_PURPLE_SPEC.shoreZ,a=Math.atan2(dz,dx);
  const radius=113.797805566*(1+.038*Math.sin(5*a)+.022*Math.cos(9*a));
  return Math.hypot(dx,dz)-radius;
}
function domeClearance(x,z){
  return Math.hypot(x-STACEY_PURPLE_SPEC.domeX,z-STACEY_PURPLE_SPEC.domeZ)-STACEY_PURPLE_SPEC.domeRadius;
}
function preparedRoute(name,points,natural,flattenAtEnd){
  const samples=interpolate(points),end=samples[samples.length-1].s;
  const endY=natural(samples[samples.length-1].x,samples[samples.length-1].z);
  for(const p of samples){
    p.natural=natural(p.x,p.z);
    const remaining=end-p.s;
    // Preserve natural uphill topology and avoid deep route cuts.
    // Only the wooded lake approach levels off over the last 10 metres,
    // feathered into the earlier slope over the preceding 23 metres.
    const transition=flattenAtEnd?1-ease((remaining-10)/23):0;
    const tailTarget=endY+.018*Math.max(0,remaining);
    p.grade=p.natural-Math.min(2.7,Math.max(0,p.natural-tailTarget))*transition;
  }
  return {name,samples,end,width:2.6};
}
function nearest(x,z,route){
  let best={distance:Infinity,along:0};
  const s=route.samples;
  for(let i=1;i<s.length;i++){
    const a=s[i-1],b=s[i];
    if(x<Math.min(a.x,b.x)-7||x>Math.max(a.x,b.x)+7||
       z<Math.min(a.z,b.z)-7||z>Math.max(a.z,b.z)+7)continue;
    const v=nearSegment(x,z,a,b);
    if(v.distance<best.distance)best=v;
  }
  return best;
}
function heightAt(route,s){
  const list=route.samples;
  if(s<=0)return list[0].grade;
  if(s>=route.end)return list[list.length-1].grade;
  let lo=0,hi=list.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(list[mid].s<s)lo=mid;else hi=mid}
  const t=(s-list[lo].s)/Math.max(.001,list[hi].s-list[lo].s);
  return list[lo].grade*(1-t)+list[hi].grade*t;
}
export function createStaceyPurpleTrails(natural){
  const main=preparedRoute('Continuous ridge through-trail',RIDGE_WAYPOINTS,natural,false);
  const spur=preparedRoute('Branch down to lake woods',LAKE_SPUR_WAYPOINTS,natural,true);
  const routes=[main,spur];
  function near(x,z,radius=4.8){return routes.some(route=>nearest(x,z,route).distance<radius)}
  function gradeGround(x,z,original){
    // Perpendicular soil shoulders fall back to untouched mountainside.
    // The approved lake shore, photographed canyon and V9 cave roof are never excavated.
    if(x< -188||x>44||z< -466||z> -99)return original;
    if(domeClearance(x,z)<13||shoreClearance(x,z)<61)return original;
    let target=original,blend=0;
    for(const route of routes){
      const loc=nearest(x,z,route);
      if(loc.distance>=STACEY_PURPLE_SPEC.earthShoulder)continue;
      const alpha=1-ease((loc.distance-1.3)/(STACEY_PURPLE_SPEC.earthShoulder-1.3));
      const correction=heightAt(route,loc.along)-original;
      // Cut only and never deeper than 2.7m (deep trenches require separately approved earthworks).
      if(alpha>blend){target=original+clip(correction,-2.7,0)*alpha;blend=alpha}
    }
    return target;
  }
  const audit=[];
  for(const route of routes){
    let minDome=Infinity,minLake=Infinity,maxSlope=0,minSlope=Infinity,maxCut=0;
    let prev=null;
    for(const p of route.samples){
      for(const ox of [-5.5,0,5.5]){
        minDome=Math.min(minDome,domeClearance(p.x+ox,p.z));
        minLake=Math.min(minLake,shoreClearance(p.x+ox,p.z));
      }
      maxCut=Math.max(maxCut,p.natural-p.grade);
      if(prev){const grade=Math.abs((p.grade-prev.grade)/(p.s-prev.s));
        maxSlope=Math.max(maxSlope,grade);minSlope=Math.min(minSlope,grade);}
      prev=p;
    }
    audit.push({route:route.name,lengthM:Math.round(route.end*10)/10,
      minDomeWallM:Math.round(minDome*10)/10,minLakeShoreM:Math.round(minLake*10)/10,
      maxLongitudinalGradePct:Math.round(maxSlope*1000)/10,
      maxLocalCutM:Math.round(maxCut*100)/100});
  }
  function install(THREE,scene,ground,soilTexture,showGuide=false){
    const installed=[];
    for(const route of routes){
      const v=[],uv=[],tri=[];
      for(let i=0;i<route.samples.length;i++){
        const p=route.samples[i],prev=route.samples[Math.max(0,i-1)],next=route.samples[Math.min(route.samples.length-1,i+1)];
        const dx=next.x-prev.x,dz=next.z-prev.z,len=Math.max(.001,Math.hypot(dx,dz)),nx=-dz/len,nz=dx/len;
        for(const offset of [-1.3,-.65,0,.65,1.3]){
          const x=p.x+nx*offset,z=p.z+nz*offset;
          v.push(x,ground(x,z)+.065,z);
          uv.push(offset/2.6+.5,p.s/8);
        }
        if(i>0)for(let j=1;j<5;j++){const k=i*5+j;tri.push(k,k-1,k-5,k-1,k-6,k-5)}
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      geometry.setIndex(tri);geometry.computeVertexNormals();
      const material=new THREE.MeshStandardMaterial({map:soilTexture,color:0xaa9277,side:THREE.DoubleSide,roughness:1,polygonOffset:true,polygonOffsetFactor:-1});
      const mesh=new THREE.Mesh(geometry,material);mesh.name='Stacey purple path — '+route.name;mesh.receiveShadow=true;
      scene.add(mesh);installed.push(mesh);
      if(showGuide){
        const guideGeom=new THREE.BufferGeometry().setFromPoints(route.samples.map(p=>new THREE.Vector3(p.x,ground(p.x,p.z)+.19,p.z)));
        const line=new THREE.Line(guideGeom,new THREE.LineBasicMaterial({color:0xd850ff,depthTest:false,transparent:true,opacity:.95}));
        line.name='Temporary PURPLE route proof (guide mode only)';line.renderOrder=8;scene.add(line);
      }
    }
    return installed;
  }
  return {main,spur,audit,near,gradeGround,install,shoreClearance,domeClearance};
}
