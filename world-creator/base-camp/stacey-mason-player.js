// Mason: default playable adult avatar for The Wild's Stacey Lake entry.
// Loads the original MPFB GLB; creates an isolated skinned dark-denim shorts
// garment using the same V8 waist/hem dimensions and bone-weight interpolation.
// No edits to the source model and no fabricated motion clips.
export function installMasonPlayer({T, GLTFLoader, scene, diagnostics}) {
  const carrier = new T.Group();
  carrier.name = 'Playable Mason at Stacey Lake';
  scene.add(carrier);
  const state = {ready:false, avatar:'Mason', clothing:'loading', clips:[], error:null};
  let model=null, mixer=null, standing=null, clothing=null;
  let footOriginY=0, gaitPhase=0, gaitBlend=0, gaitRunBlend=0;
  const gaitBones={};
  const gaitRotation=new T.Quaternion();

  // The five original Mason GLB clips are POSES, not walking animations.
  // Use the actual 52-bone rig and derive each joint's local bend axis from
  // the original Kneel clip, so glTF / Blender axis conversions stay correct.
  // Drive the bones AFTER the Stand mixer update; leave the master GLB alone.
  function configureGait(animations){
    const norm=name=>String(name).toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^mixamorig/,'');
    const bones=[];
    model.traverse(o=>{if(o.isBone)bones.push(o);});
    const kneel=animations.find(a=>/Mason Kneel/i.test(a.name));
    const names={
      leftThigh:['leftupleg','leftthigh','lthigh'],
      rightThigh:['rightupleg','rightthigh','rthigh'],
      leftShin:['leftleg','leftshin','lshin'],
      rightShin:['rightleg','rightshin','rshin'],
      leftArm:['leftarm','leftupperarm','lupperarm'],
      rightArm:['rightarm','rightupperarm','rupperarm']
    };
    for(const [part,aliases] of Object.entries(names)){
      const bone=bones.find(b=>aliases.some(alias=>norm(b.name).endsWith(alias)));
      if(!bone)continue;
      const track=kneel?.tracks.find(t=>
        t.name.endsWith('.quaternion') &&
        (norm(t.name.slice(0,-'.quaternion'.length))===norm(bone.name) ||
         norm(t.name.slice(0,-'.quaternion'.length)).endsWith(norm(bone.name))));
      // A nonzero pose delta yields the correct signed local joint axis
      // even when the imported skeleton has rotated bone bases.
      let axis=new T.Vector3(1,0,0);
      if(track?.values?.length>=8){
        const values=track.values;
        const first=new T.Quaternion(...Array.from(values.slice(0,4))).normalize();
        let best=0;
        for(let i=4;i+3<values.length;i+=4){
          const next=new T.Quaternion(values[i],values[i+1],values[i+2],values[i+3]).normalize();
          const delta=first.clone().invert().multiply(next).normalize();
          if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
          const amount=delta.x*delta.x+delta.y*delta.y+delta.z*delta.z;
          if(amount>best){
            best=amount;
            axis.set(delta.x,delta.y,delta.z).normalize();
          }
        }
      }
      gaitBones[part]={bone,axis};
    }
    const required=['leftThigh','rightThigh','leftShin','rightShin'];
    state.gaitBones=Object.keys(gaitBones).map(part=>part+':'+gaitBones[part].bone.name);
    state.gaitReady=required.every(part=>!!gaitBones[part]);
    info['Mason gait']=state.gaitReady
      ?'original hip/knee rig driven · walk/run · '+state.gaitBones.length+' bones'
      :'missing leg joints: '+required.filter(part=>!gaitBones[part]).join(', ');
    if(!state.gaitReady)diagnostics?.errors?.push('Mason gait rig incomplete');
  }
  function bend(part,angle){
    const entry=gaitBones[part];
    if(!entry)return;
    gaitRotation.setFromAxisAngle(entry.axis,angle);
    entry.bone.quaternion.multiply(gaitRotation).normalize();
  }
  function animateGait(dt,walking,running,sitting,flying,swimming,diving){
    const grounded=walking&&!sitting&&!flying&&!swimming&&!diving;
    const t=Math.max(0,Math.min(.05,dt));
    const ease=(rate)=>1-Math.exp(-rate*t);
    gaitBlend+=(Number(grounded)-gaitBlend)*ease(9);
    // Blend RUN and WALK smoothly rather than snapping a leg mid-step.
    gaitRunBlend+=(Number(grounded&&running)-gaitRunBlend)*ease(5);
    if(!state.gaitReady||gaitBlend<.001)return;
    if(grounded)gaitPhase+=t*(8.6+3.1*gaitRunBlend);
    const swing=Math.sin(gaitPhase),midSwing=Math.cos(gaitPhase);
    // Modest thigh motion instead of the high-knee hurdling effect:
    // walk ±14 degrees, run ±24 degrees. No body bounce.
    const thigh=(.245+.18*gaitRunBlend)*gaitBlend;
    // Bend the knee during center-of-swing recovery, then straighten it
    // BEFORE forward foot plant, rather than folding at maximum thigh lift.
    // Walk knee ~17 degrees, run ~31 degrees; slight flex on planted leg.
    const knee=(.29+.25*gaitRunBlend)*gaitBlend;
    const softKnee=(.025+.035*gaitRunBlend)*gaitBlend;
    const leftRecovery=Math.pow(Math.max(0,midSwing),1.25);
    const rightRecovery=Math.pow(Math.max(0,-midSwing),1.25);
    bend('leftThigh',swing*thigh);
    bend('rightThigh',-swing*thigh);
    bend('leftShin',softKnee*(1-leftRecovery)+knee*leftRecovery);
    bend('rightShin',softKnee*(1-rightRecovery)+knee*rightRecovery);
    // Arms counter-swing naturally rather than pumping too far.
    const arm=(.15+.14*gaitRunBlend)*gaitBlend;
    bend('leftArm',-swing*arm);
    bend('rightArm',swing*arm);
    state.gaitMode=grounded?(gaitRunBlend>.5?'run':'walk'):'settling';
  }
  const info = diagnostics?.assets || {};
  info['Playable Mason']='loading original 52-bone GLB';

  function makeShorts(body) {
    const g=body.geometry, p=g.getAttribute('position'),
      normal=g.getAttribute('normal'), uv=g.getAttribute('uv'),
      joint=g.getAttribute('skinIndex'), weight=g.getAttribute('skinWeight');
    if(!body.isSkinnedMesh || !p || !normal || !joint || !weight)
      throw new Error('Original Mason body missing skinned position/weight data');
    body.updateWorldMatrix(true,false);
    const world=body.matrixWorld.clone(), inverse=world.clone().invert();
    const verts=[],tmp=new T.Vector3(),bb=new T.Box3();
    const allowed=new Set([0,1,2,5,6,9,10,11]);
    const indices=g.index?.array || Array.from({length:p.count},(_,i)=>i);
    for(let i=0;i<p.count;i++){
      const local=[p.getX(i),p.getY(i),p.getZ(i)];
      tmp.set(...local).applyMatrix4(world);
      const worldPos=[tmp.x,tmp.y,tmp.z];bb.expandByPoint(tmp);
      const bones=[];
      for(let k=0;k<4;k++){
        const get=[a=>a.getX(i),a=>a.getY(i),a=>a.getZ(i),a=>a.getW(i)];
        const id=Math.round(get[k](joint));
        const w=get[k](weight);
        if(w>1e-7)bones.push([id,w]);
      }
      const good=bones.reduce((s,b)=>s+(allowed.has(b[0])?b[1]:0),0);
      verts.push({local,world:worldPos,normal:[normal.getX(i),normal.getY(i),normal.getZ(i)],
        uv:uv?[uv.getX(i),uv.getY(i)]:[0,0],bones,good});
    }
    const size=bb.getSize(new T.Vector3()), h=size.y;
    if(h<1.2||h>2.5)throw new Error('Unexpected Mason body height: '+h);
    const cx=(bb.min.x+bb.max.x)/2,cz=(bb.min.z+bb.max.z)/2;
    // V8 approved dimensions: waist raised 1.5cm; unchanged V7 hems and fit.
    const waist=bb.min.y+h*.661,hem=bb.min.y+h*.388,sideLimit=h*.221;
    const outPos=[],outNormals=[],outUV=[],outJoints=[],outWeights=[],outIndex=[];
    const normalMatrix=new T.Matrix3().getNormalMatrix(world);
    const nWorld=new T.Vector3(),point=new T.Vector3(),rest=new T.Vector3();
    function blend(a,b,t){
      const lerp=(x,y)=>x.map((v,i)=>v+(y[i]-v)*t);
      const weights=new Map();
      for(const [k,w] of a.bones)weights.set(k,(weights.get(k)||0)+w*(1-t));
      for(const [k,w] of b.bones)weights.set(k,(weights.get(k)||0)+w*t);
      const bones=[...weights].filter(([,w])=>w>1e-7).sort((x,y)=>y[1]-x[1]).slice(0,4);
      const sum=bones.reduce((s,b)=>s+b[1],0)||1;
      bones.forEach(b=>b[1]/=sum);
      return {local:lerp(a.local,b.local),world:lerp(a.world,b.world),
        normal:lerp(a.normal,b.normal),uv:lerp(a.uv,b.uv),bones,
        good:a.good*(1-t)+b.good*t};
    }
    function clip(poly,score){
      if(!poly.length)return poly;
      const list=[];
      for(let i=0;i<poly.length;i++){
        const a=poly[(i+poly.length-1)%poly.length],b=poly[i];
        const da=score(a),db=score(b);
        if((da>=0)!==(db>=0))list.push(blend(a,b,da/(da-db)));
        if(db>=0)list.push(b);
      }
      return list;
    }
    function emit(v){
      nWorld.set(...v.normal).applyMatrix3(normalMatrix).normalize();
      point.set(cx+(v.world[0]-cx)*1.07,v.world[1],cz+(v.world[2]-cz)*1.07)
        .addScaledVector(nWorld,h*.016);
      rest.copy(point).applyMatrix4(inverse);
      outPos.push(rest.x,rest.y,rest.z);
      outNormals.push(...v.normal);
      outUV.push(...v.uv);
      const bones=v.bones.slice().sort((a,b)=>b[1]-a[1]).slice(0,4),
        total=bones.reduce((s,b)=>s+b[1],0)||1;
      for(let k=0;k<4;k++){
        outJoints.push(bones[k]?.[0]||0);
        outWeights.push(bones[k]?bones[k][1]/total:0);
      }
      outIndex.push(outIndex.length);
    }
    let clipped=0,rejected=0;
    for(let i=0;i<indices.length;i+=3){
      let poly=[verts[indices[i]],verts[indices[i+1]],verts[indices[i+2]]];
      if(poly.some(v=>v.good<.67)){rejected++;continue;}
      if(poly.every(v=>v.world[1]<hem||v.world[1]>waist))continue;
      if(poly.every(v=>Math.abs(v.world[0]-cx)>sideLimit))continue;
      poly=clip(poly,v=>v.world[1]-hem);
      poly=clip(poly,v=>waist-v.world[1]);
      poly=clip(poly,v=>v.world[0]-(cx-sideLimit));
      poly=clip(poly,v=>(cx+sideLimit)-v.world[0]);
      if(poly.length<3)continue;
      if(poly.length>3)clipped++;
      for(let j=1;j+1<poly.length;j++){emit(poly[0]);emit(poly[j]);emit(poly[j+1]);}
    }
    if(outIndex.length<4500)throw new Error('Shorts face coverage incomplete: '+(outIndex.length/3));
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(outPos,3));
    geo.setAttribute('normal',new T.Float32BufferAttribute(outNormals,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(outUV,2));
    geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(outJoints,4));
    geo.setAttribute('skinWeight',new T.Float32BufferAttribute(outWeights,4));
    geo.setIndex(outIndex);geo.computeBoundingSphere();
    const mat=new T.MeshStandardMaterial({color:0x334b64,metalness:0,roughness:.96,
      side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
    const shorts=new T.SkinnedMesh(geo,mat);
    shorts.name='Mason V8 fitted shorts — game garment';
    shorts.bindMode=body.bindMode;
    shorts.bind(body.skeleton,body.bindMatrix.clone());
    shorts.bindMatrixInverse.copy(body.bindMatrixInverse);
    shorts.position.copy(body.position);
    shorts.quaternion.copy(body.quaternion);
    shorts.scale.copy(body.scale);
    shorts.frustumCulled=false;
    body.parent.add(shorts);
    info['Mason shorts V8']='skinned faces '+outIndex.length/3+'; clipped seams '+clipped;
    return shorts;
  }

  const loader = new GLTFLoader();
  loader.load('../assets/mason-mpfb-trial.glb',glb=>{
    try{
      model=glb.scene;
      carrier.add(model);
      model.updateMatrixWorld(true);
      const bodies=[];
      model.traverse(o=>{
        if(o.isSkinnedMesh && o.geometry?.getAttribute('position')) bodies.push(o);
        if(o.isMesh){o.frustumCulled=false;o.castShadow=false;}
      });
      bodies.sort((a,b)=>b.geometry.getAttribute('position').count-a.geometry.getAttribute('position').count);
      if(!bodies.length)throw new Error('Mason full-body skeletal mesh was not found');
      // Keep a full original rig. Generate clothing, not a new character.
      clothing=makeShorts(bodies[0]);
      state.clothing='V8 skinned dark-denim shorts';
      state.clips=glb.animations.map(a=>a.name);
      mixer=new T.AnimationMixer(model);
      configureGait(glb.animations);
      state.gaitVersion='natural stride v2 · lower knee / mid-swing bend';
      const stand=glb.animations.find(a=>/Mason Stand/i.test(a.name));
      if(stand){
        standing=mixer.clipAction(stand);
        standing.setLoop(T.LoopRepeat,Infinity);
        standing.play();
      }
      // Anchor the lowest skinned foot to terrain, not an assumed mesh origin.
      // The game's eye is already 1.7m above land; this offset eliminates
      // gliding in the air on models whose GLB root is above the soles.
      model.updateMatrixWorld(true);
      const bodyBox=new T.Box3().setFromObject(model);
      footOriginY=Number.isFinite(bodyBox.min.y)?bodyBox.min.y:0;
      state.footOriginY=footOriginY;
      state.ready=true;
      info['Playable Mason']='ready · original GLB · V8 shorts · '+state.clips.length+' clips';
      window.staceyMason={state,carrier,model,clothing,clips:state.clips};
    }catch(e){
      state.error=String(e);if(model)model.visible=false;info['Playable Mason']='FAILED '+state.error;
      diagnostics?.errors?.push('Mason fitting: '+state.error);
    }
  },undefined,e=>{
    state.error=String(e);info['Playable Mason']='FAILED GLB: '+state.error;
    diagnostics?.errors?.push('Mason load: '+state.error);
  });
  return {
    state,
    update({eye,yaw,dt,walking,running,sitting,flying,swimming,diving}){
      if(!state.ready)return;
      mixer?.update(Math.min(.05,Math.max(0,dt)));
      animateGait(dt,walking,running,sitting,flying,swimming,diving);
      // Existing game physics uses camera-eye height (1.7m on dry land).
      // Compensate for the GLB foot elevation rather than floating the feet
      // above the collision floor. Never use a cosmetic up/down hover bob.
      const height=diving?1.4:swimming?1.0:sitting?1.05:1.7;
      carrier.position.set(eye.x,eye.y-height-footOriginY,eye.z);
      // MPFB source faces +Z. Existing game forward at yaw 0 is -Z.
      carrier.rotation.y=Math.PI+yaw;
      if(flying)carrier.rotation.x=-.15;else if(swimming||diving)carrier.rotation.x=-.20;else carrier.rotation.x=0;
    }
  };
}
