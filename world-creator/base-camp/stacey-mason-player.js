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
        const id=Math.round(joint.getComponent(i,k));
        const w=weight.getComponent(i,k);
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
      const stand=glb.animations.find(a=>/Mason Stand/i.test(a.name));
      if(stand){
        standing=mixer.clipAction(stand);
        standing.setLoop(T.LoopRepeat,Infinity);
        standing.play();
      }
      state.ready=true;
      info['Playable Mason']='ready · original GLB · V8 shorts · '+state.clips.length+' clips';
      window.staceyMason={state,carrier,model,clothing,clips:state.clips};
    }catch(e){
      state.error=String(e);info['Playable Mason']='FAILED '+state.error;
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
      // Existing game physics uses camera-eye height (1.7m on dry land).
      const height=diving?1.4:swimming?1.0:sitting?1.05:1.7;
      carrier.position.set(eye.x,eye.y-height,eye.z);
      // MPFB source faces +Z. Existing game forward at yaw 0 is -Z.
      carrier.rotation.y=Math.PI+yaw;
      // Cosmetic bob only. True walking, running, swimming and sitting
      // skeletal clips must be built separately before they can be enabled.
      const moving=walking||running;
      carrier.position.y+=moving&&!swimming&&!diving&&!flying&&!sitting
        ?Math.sin(performance.now()*.001*(running?13:8))*.015:0;
      if(flying)carrier.rotation.x=-.15;else if(swimming||diving)carrier.rotation.x=-.20;else carrier.rotation.x=0;
    }
  };
}
