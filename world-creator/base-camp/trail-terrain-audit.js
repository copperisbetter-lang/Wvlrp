// Base Camp trail planning: assess BOTH travel grade and lateral cross-slope.
// Map-stage utility only; does not modify production terrain or place trail floors.
// Coordinates are world metres, +z points north. Call with the scene's terrainY.
export function auditTrail(points, terrainY, {spacing=1.5, halfWidth=0.9, maxGrade=0.08, maxCrossSlope=0.03}={}) {
  const failures=[], samples=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
    const length=Math.hypot(dx,dz);if(length<1e-6)continue;
    const tx=dx/length,tz=dz/length,nx=-tz,nz=tx;
    const steps=Math.max(1,Math.ceil(length/spacing));
    for(let j=0;j<=steps;j++){
      const t=j/steps,x=a.x+dx*t,z=a.z+dz*t;
      const h=terrainY(x,z),ahead=terrainY(x+tx*.5,z+tz*.5),behind=terrainY(x-tx*.5,z-tz*.5);
      const left=terrainY(x+nx*halfWidth,z+nz*halfWidth),right=terrainY(x-nx*halfWidth,z-nz*halfWidth);
      const grade=Math.abs(ahead-behind),crossSlope=Math.abs(left-right)/(2*halfWidth);
      const sample={segment:i-1,x,z,height:h,grade,crossSlope,pass:grade<=maxGrade&&crossSlope<=maxCrossSlope};
      samples.push(sample);
      if(!sample.pass)failures.push(sample);
    }
  }
  return {pass:failures.length===0,sampleCount:samples.length,failedCount:failures.length,
    maxGrade:Math.max(0,...samples.map(s=>s.grade)),maxCrossSlope:Math.max(0,...samples.map(s=>s.crossSlope)),
    failures,samples};
}
// Evaluate an optional set of nearby route candidates without pretending that
// an arbitrary wiggle is terrain-aware. Reject every candidate with slope failures.
export function chooseWalkableCandidate(candidates,terrainY,options){
  const ranked=candidates.map((points,index)=>{
    const audit=auditTrail(points,terrainY,options);
    const distance=points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.z-points[i].z),0);
    return {index,points,distance,audit};
  }).filter(c=>c.audit.pass).sort((a,b)=>a.distance-b.distance);
  return ranked[0]??null;
}
