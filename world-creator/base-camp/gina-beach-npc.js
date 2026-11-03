// Gina 6: original gold-bikini character, original native Walk animation.
// Independent NPC near Stacey Lake beach; does not modify Beverly.
export function installGinaBeachWalk({THREE:T,scene,model,mixer,clip,outer,terrainY,lake}){
 const root=new T.Group();root.name='Gina 6 — gold bikini beach walker';root.add(model);scene.add(root);
 const action=mixer.clipAction(clip);action.reset().setLoop(T.LoopRepeat,Infinity).play();
 // South beach, short back-and-forth walking segment; offset inland.
 const center=Math.PI*.5,span=.22,clearance=6,speed=.95;
 let distance=0,heading=1;
 const at=a=>{const r=outer(a)+clearance;return new T.Vector3(lake.x+Math.cos(a)*r,0,lake.z+Math.sin(a)*r)};
 const update=dt=>{
  const step=Math.max(0,Math.min(.05,dt));
  const a=center+distance*span,position=at(a);
  const forward=at(a+heading*.001);
  const ground=terrainY(position.x,position.z);
  root.position.set(position.x,ground,position.z);
  root.rotation.y=Math.atan2(forward.x-position.x,forward.z-position.z);
  // Use real path length, so native animation keeps its original joint timing.
  const tangent=at(a+.001).distanceTo(position)/.001;
  distance+=heading*speed*step/Math.max(.01,tangent*span);
  if(distance>=1){distance=1;heading=-1}
  if(distance<=-1){distance=-1;heading=1}
  mixer.update(step);
 };
 update(0);
 return {root,update,state:{ready:true,animation:clip.name,speed},dispose(){action.stop();root.removeFromParent()}};
}
