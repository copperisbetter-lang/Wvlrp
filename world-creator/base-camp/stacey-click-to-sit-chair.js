// Stacey Lake: owner-supplied Innerscene CC0 camp chair; isolated click/tap seat target.
// Keep the published lake untouched. No texture or network failures may stop the lake.
export function installStaceyLakeChair({T,scene,gltf,ground,CX,CZ,outer,diagnostics}) {
  const x=CX+5.0, z=CZ+outer(Math.PI/2)+5.1, y=ground(x,z);
  const chair=new T.Group();
  chair.name='Stacey Lake lake-facing camp chair · click to sit';
  chair.position.set(x,y,z);
  chair.rotation.y=Math.PI; // Native chair faces +Z; here it faces lakeward (-Z).
  scene.add(chair);
  const state={x,z,y,ready:false,source:'loading',facing:'lake / -Z',seatHeight:0.45};
  const note=diagnostics?.assets||{};
  note['Stacey sit chair']='loading original CC0 GLB';

  // Lightweight visual standby only: removed once actual user-selected GLB loads.
  // The placeholder is clearly flagged; do not certify its appearance as the original.
  const standby=new T.Group();standby.name='temporary chair silhouette (GLB pending)';
  const steel=new T.MeshStandardMaterial({color:0x222c32,metalness:0.4,roughness:0.7});
  const cloth=new T.MeshStandardMaterial({color:0x233e6a,roughness:0.95,side:T.DoubleSide});
  function bar(a,b,r,mat=steel) {
    const p=new T.Vector3(...a),q=new T.Vector3(...b),delta=q.clone().sub(p);
    const obj=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),6),mat);
    obj.position.copy(p.add(q).multiplyScalar(0.5));
    obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
    standby.add(obj);
  }
  for(const side of [-0.34,0.34]) {
    bar([side,0,-0.24],[side,0.67,0.24],0.014);
    bar([side,0,0.24],[side,0.95,-0.24],0.014);
    bar([side,0.61,-0.21],[side,0.61,0.24],0.016);
  }
  const seat=new T.Mesh(new T.BoxGeometry(0.72,0.035,0.50),cloth);
  seat.position.set(0,0.45,0.005);standby.add(seat);
  const back=new T.Mesh(new T.BoxGeometry(0.72,0.48,0.03),cloth);
  back.position.set(0,0.72,-0.235);standby.add(back);
  chair.add(standby);

  // Touchable hit proxy expands the target around the chair for phone users.
  const target=new T.Mesh(new T.BoxGeometry(1.25,1.28,1.1),
    new T.MeshBasicMaterial({visible:false,depthWrite:false}));
  target.name='Camp chair touch target';
  target.position.set(0,0.62,0);
  chair.add(target);
  const raycaster=new T.Raycaster(),cursor=new T.Vector2();
  function picked(camera,clientX,clientY,viewportWidth,viewportHeight) {
    if(!state.ready || !camera)return false;
    cursor.set(clientX/viewportWidth*2-1,1-clientY/viewportHeight*2);
    camera.updateMatrixWorld();
    chair.updateWorldMatrix(true,true);
    raycaster.setFromCamera(cursor,camera);
    return raycaster.intersectObject(target,false).length>0;
  }
  // Prefer the real binary stored in the branch; external source is last-resort preview only.
  const local=new URL('../assets/stacey/folding-camp-chair.glb',import.meta.url).href;
  const external='https://files.innerscene.com/library/folding-camp-chair-a2499db5/f5f20eb831e7b7465940/folding-camp-chair.glb';
  function installAsset(asset,from){
    const model=asset.scene;
    model.name='Innerscene folding camp chair · original user-selected GLB';
    chair.add(model);
    standby.visible=false;
    state.ready=true;state.source=from;state.triangles=3064;
    note['Stacey sit chair']='REAL CC0 GLB '+from+' · lake-facing · tap-to-sit ready';
    if(diagnostics)diagnostics.chair=state;
  }
  gltf.load(local,asset=>installAsset(asset,'repository'),undefined,()=>{
    note['Stacey sit chair']='repository GLB unavailable · trying original CDN';
    gltf.load(external,asset=>installAsset(asset,'external preview'),undefined,err=>{
      // Keep scene usable, but show missing original accurately.
      state.ready=true;state.source='temporary silhouette ONLY';
      note['Stacey sit chair']='original GLB UNAVAILABLE; placeholder only: '+String(err?.message||err);
      if(diagnostics)diagnostics.errors.push('Chair GLB original failed to load');
    });
  });
  // Actual Innerscene cushion is ~0.41-0.45m high, x centered and z near zero;
  // pelvis joint should rest ~0.10m above that fabric, slightly rear of center.
  // Native Gina 'Sit idle (chair)' moves Hips relative to her root, so the
  // player controller aligns this TARGET TO THE ANIMATED HIPS each frame.
  chair.updateMatrixWorld(true);
  const pelvis=chair.localToWorld(new T.Vector3(0,0.55,-0.07));
  const seatPose={x:pelvis.x,y:pelvis.y,z:pelvis.z};
  state.seatPose=seatPose;
  return {state,chair,picked,seat:{x,z},seatPose,yaw:0};
}
