// Beverly — owner-approved V51 appearance, continuous outside-shoreline walk.
// Path uses the same outer shoreline and terrain sampler as Stacey Lake.
export function installBeverlyShorelineWalk({THREE:T,scene,model,outer,terrainY,lake}) {
  if(!model||!outer||!terrainY)throw new Error('Approved Beverly model and lake terrain are required');
  const root=new T.Group();root.name='Beverly — Certified Wild Member';root.add(model);scene.add(root);
  let angle=Math.PI/2,distance=0;
  const speed=1.2,clearance=3;
  // Sample once and blend creek-bank elevations into a continuous footpath.
  // X/Z always follows outer(a)+3m; no changes to the terrain mesh.
  const samples=2048,heights=Array.from({length:samples},(_,i)=>{
    const a=i/samples*2*Math.PI,r=outer(a)+clearance;
    return terrainY(lake.x+Math.cos(a)*r,lake.z+Math.sin(a)*r);
  });
  const eased=heights.map((_,i)=>{
    let sum=0,total=0;for(let j=-4;j<=4;j++){const w=5-Math.abs(j);sum+=heights[(i+j+samples)%samples]*w;total+=w;}return sum/total;
  });
  const positionAt=a=>{
    const r=outer(a)+clearance,x=lake.x+Math.cos(a)*r,z=lake.z+Math.sin(a)*r;
    const f=((a/(2*Math.PI)%1+1)%1)*samples,i=Math.floor(f),blend=f-i;
    return new T.Vector3(x,eased[i]*(1-blend)+eased[(i+1)%samples]*blend,z);
  };
  const state={ready:true,speed,clearance,distance:0,angle,position:[0,0,0]};
  const update=dt=>{
    const seconds=Number.isFinite(dt)?Math.min(.1,Math.max(0,dt)):0;
    const p=positionAt(angle),next=positionAt(angle+.0001);
    const metresPerRadian=Math.max(.001,p.distanceTo(next)*10000);
    angle=(angle+seconds*speed/metresPerRadian)%(2*Math.PI);
    const here=positionAt(angle),ahead=positionAt(angle+.0001);
    root.position.copy(here);root.rotation.y=Math.atan2(ahead.x-here.x,ahead.z-here.z);
    distance+=seconds*speed;model.userData.beverlyWalkMixer?.update(seconds);model.userData.beverlyArmSwing?.update(seconds);
    state.distance=distance;state.angle=angle;state.position=root.position.toArray();
  };
  update(0);
  return {root,state,update,dispose:()=>{model.userData.beverlyWalkMixer?.stopAllAction();root.removeFromParent();}};
}
