// Beverly — certified The Wild character, shoreline NPC controller.
// Uses the owner-approved character GLB only. Do not substitute a mannequin.
// Attach this module to the live scene after Beverly's full approved visual asset is published.
export function installBeverlyShorelineWalk({THREE, scene, model, lake, terrainY}) {
  if (!model) throw new Error('Beverly approved visual model is required');
  const {x:cx,z:cz,rx,rz}=lake;
  const root=new THREE.Group();root.name='Beverly — Certified Wild Member';
  root.add(model);scene.add(root);
  let a=0, distance=0;
  const speed=1.2, edge=1.035;
  const positionAt=t=>{
    const wave=1+.025*Math.sin(5*t)+.018*Math.cos(9*t);
    const x=cx+Math.cos(t)*rx*wave*edge,z=cz+Math.sin(t)*rz*wave*edge;
    return new THREE.Vector3(x,terrainY(x,z),z);
  };
  const walk=(dt)=>{
    const t=Math.min(.05,Math.max(0,dt));
    const p=positionAt(a),p2=positionAt(a+.001);
    const metresPerRadian=Math.max(.001,p.distanceTo(p2)*1000);
    a=(a+t*speed/metresPerRadian)%(Math.PI*2);
    const here=positionAt(a),next=positionAt(a+.001);
    root.position.copy(here);
    root.rotation.y=Math.atan2(next.x-here.x,next.z-here.z);
    distance+=t*speed;
    const mixer=model.userData.beverlyWalkMixer;
    if(mixer)mixer.update(t);
  };
  walk(0);
  return {root,update:walk,dispose:()=>scene.remove(root)};
}
