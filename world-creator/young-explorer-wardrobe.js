/* Young Explorer outfit fitting and safe motion controls for the actual rigged 3D character.
   Does not replace skin, face, hairstyle, shoes, or the character skeleton. */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const fmt = n => Number.isFinite(n) ? (n * 100).toFixed(1) + ' cm / ' + (n * 39.37008).toFixed(1) + ' in' : 'Unavailable';
const normalize = name => String(name || '').toLowerCase().replace(/mixamorig/g,'').replace(/[^a-z0-9]/g,'');
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const shades = {
  plaid:['#73534d','#344152','#b78c7b'],
  floral:['#385d91','#eff2da','#dfb96e'],
  sunflower:['#dfb94c','#f7ead6','#be773b'],
  denim:['#416c99','#f1e6c9'],
  hiking:['#66764c','#eacb7a'],
  navy:['#293a61','#c995a9']
};
const outfits = [
  {id:'plaid',label:'Cranberry plaid sundress',type:'dress'},
  {id:'floral',label:'Blue floral sundress',type:'dress'},
  {id:'sunflower',label:'Golden summer dress',type:'dress'},
  {id:'denim',label:'Denim shorts + cream shirt',type:'shorts'},
  {id:'hiking',label:'Forest hiking shorts + yellow shirt',type:'shorts'},
  {id:'navy',label:'Navy shorts + rose shirt',type:'shorts'},
  {id:'regular-shorts',label:'Regular shorts + cream shirt',type:'shorts'},
  {id:'loose-shorts',label:'Loose-fitting shorts + cream shirt',type:'shorts'}
];
function clothTexture(B,scene,id,color,floral=false){
 const tex = new B.DynamicTexture('Young Explorer fabric ' + id,{width:512,height:512},scene,false);
 const ctx=tex.getContext();ctx.fillStyle=color;ctx.fillRect(0,0,512,512);
 if (floral) {
  for(let y=12;y<512;y+=55)for(let x=12;x<512;x+=55){
   let px=x+(y%110?15:0),py=y;
   for(let i=0;i<5;i++){
    const t=i*Math.PI*2/5;ctx.beginPath();
    ctx.ellipse(px+9*Math.cos(t),py+9*Math.sin(t),6,9,t,0,Math.PI*2);
    ctx.fillStyle='#e4eace';ctx.fill();
   }
   ctx.beginPath();ctx.arc(px,py,3.8,0,Math.PI*2);ctx.fillStyle='#e5b954';ctx.fill();
  }
 }else{
  ctx.fillStyle='rgba(255,255,255,.035)';
  for(let i=0;i<512;i+=5){ctx.fillRect(i,0,1,512);ctx.fillRect(0,i,512,1);}
 }
 tex.update();tex.uScale=1;tex.vScale=1;
 return tex;
}
function fabric(B,scene,id,color,floral=false){
 const m=new B.PBRMaterial('Young Explorer fitted ' + id,scene);
 m.albedoColor=new B.Color3(1,1,1);m.albedoTexture=clothTexture(B,scene,id,color,floral);
 m.roughness=.96;m.metallic=0;m.backFaceCulling=false;
 return m;
}
function crossSection(points,low,high,centerX,maxOffset) {
 let min=Infinity,max=-Infinity,n=0;
 for(const p of points){
  if(p.y<low||p.y>high||Math.abs(p.x-centerX)>maxOffset)continue;
  min=Math.min(min,p.x);max=Math.max(max,p.x);n++;
 }
 return n>=8 ? max-min : NaN;
}
function bodyMeasurements(B,body) {
 body.computeWorldMatrix(true);
 const pos=body.getVerticesData(B.VertexBuffer.PositionKind);
 const world=body.getWorldMatrix(),pts=[],tmp=new B.Vector3();
 for(let i=0;i<pos.length;i+=3){
  B.Vector3.TransformCoordinatesToRef(new B.Vector3(pos[i],pos[i+1],pos[i+2]),world,tmp);
  pts.push({x:tmp.x,y:tmp.y,z:tmp.z});
 }
 let minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity;
 for(const p of pts){minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);}
 const H=maxY-minY,cx=(minX+maxX)/2;
 const section=(a,b,off=.22)=>crossSection(pts,minY+a*H,minY+b*H,cx,off*H);
 return {height:H,shoulder:section(.77,.81,.33),waist:section(.60,.63,.22),
   hip:section(.52,.56,.26),armSpan:maxX-minX,minY,maxY,H,cx,
   modelVertexCount:body.getTotalVertices(),meshName:body.name};
}
function makeSkinnedShell(B,body,id,range,inflate,material,measure) {
 const positions=body.getVerticesData(B.VertexBuffer.PositionKind);
 const normals=body.getVerticesData(B.VertexBuffer.NormalKind);
 const indices=body.getIndices();
 if(!positions||!indices||!normals)return null;
 const world=body.getWorldMatrix(),vy=new Array(positions.length/3),vx=new Array(positions.length/3);
 const tmp=new B.Vector3();
 for(let i=0;i<vy.length;i++){
  B.Vector3.TransformCoordinatesToRef(new B.Vector3(positions[i*3],positions[i*3+1],positions[i*3+2]),world,tmp);
  vy[i]=(tmp.y-measure.minY)/measure.H;
  vx[i]=Math.abs(tmp.x-measure.cx)/measure.H;
 }
 const kept=[];
 for(let i=0;i<indices.length;i+=3){
  const a=indices[i],b=indices[i+1],c=indices[i+2];
  const reach=id.includes('shorts')?.195:.265;
  if(vy[a]>=range[0]&&vy[b]>=range[0]&&vy[c]>=range[0]&&
     vy[a]<=range[1]&&vy[b]<=range[1]&&vy[c]<=range[1]&&
     vx[a]<reach&&vx[b]<reach&&vx[c]<reach) kept.push(a,b,c);
 }
 if(kept.length<15)throw Error('Outfit '+id+' has no fitted surface; check model dimensions');
 // A unique skinned shell preserves the original skeleton weights, UVs and bone motion.
 const shell=body.clone('Young Explorer wearable '+id,body.parent,true);
 shell.makeGeometryUnique();
 shell.setIndices(kept);
 const raised=Float32Array.from(positions);
 for(let i=0;i<raised.length;i+=3){
  raised[i]+=normals[i]*inflate*measure.H;
  raised[i+1]+=normals[i+1]*inflate*measure.H;
  raised[i+2]+=normals[i+2]*inflate*measure.H;
 }
 shell.updateVerticesData(B.VertexBuffer.PositionKind,raised);
 shell.material=material;shell.skeleton=body.skeleton;
 shell.isPickable=false;shell.setEnabled(false);shell.alwaysSelectAsActiveMesh=true;
 return shell;
}
class YoungExplorerWardrobe {
 constructor(B,scene,result){
  this.B=B;this.scene=scene;this.model=result;
  const ms=result.meshes||[];
  this.body=ms.filter(x=>x.getTotalVertices?.()>10000).sort((a,b)=>b.getTotalVertices()-a.getTotalVertices())[0];
  if(!this.body)throw Error('Real child body geometry was not found; clothing was not substituted');
  this.measure=bodyMeasurements(B,this.body);
  this.dress=ms.find(m=>/opaque plaid sundress/i.test(m.material?.name||'') ||
   (m.material?.subMaterials||[]).some(n=>/opaque plaid sundress/i.test(n?.name||'')));
  if(!this.dress)throw Error('Original fitted dress was not found');
  // Correct misplaced exported clothing by aligning its world-space vertical center
  // with the child's shoulder-to-thigh region. Keep original skeleton and scale.
  this.dress.computeWorldMatrix(true);
  this.body.computeWorldMatrix(true);
  const db=this.dress.getBoundingInfo().boundingBox;
  const dressCenter=(db.minimumWorld.y+db.maximumWorld.y)/2;
  const targetCenter=this.measure.minY+this.measure.H*.665;
  const targetTop=this.measure.minY+this.measure.H*.805;
  const delta=targetTop-db.maximumWorld.y;
  if(Math.abs(delta)>this.measure.H*.08){
    const parent=this.dress.parent;
    if(parent){parent.computeWorldMatrix(true);const inv=parent.getWorldMatrix().clone().invert();
      const localShift=B.Vector3.TransformNormal(new B.Vector3(0,delta,0),inv);
      this.dress.position.addInPlace(localShift);
    }else this.dress.position.y+=delta;
    this.dress.computeWorldMatrix(true);
  }
  this.originalDressMaterial=this.dress.material;
  this.originalBodyMaterial=this.body.material;
  // The imported continuous skin must render from both sides, including at the neckline.
  for(const m of (this.body.material?.subMaterials||[this.body.material])){if(m){m.backFaceCulling=false;m.twoSidedLighting=true;}}
  for(const m of (this.dress.material?.subMaterials||[this.dress.material])){if(m){m.backFaceCulling=false;m.twoSidedLighting=true;}}
  this.fitMaterial=new B.StandardMaterial('Opaque neutral fitting mannequin',scene);
  this.fitMaterial.diffuseColor=new B.Color3(.46,.57,.49);
  this.fitMaterial.backFaceCulling=false;
  this.dressStyles={
   plaid:this.originalDressMaterial,
   floral:fabric(B,scene,'blue floral sundress','#385d91',true),
   sunflower:fabric(B,scene,'golden summer dress','#dfb94c',false)
  };
  const create=(id,shirt,shorts)=>({
   shirt:makeSkinnedShell(B,this.body,id+' top',[.62,.76],.008,
        fabric(B,scene,id+' shirt',shirt),this.measure),
   shorts:makeSkinnedShell(B,this.body,id+' shorts',[.42,.618],.011,
        fabric(B,scene,id+' woven shorts',shorts),this.measure)
  });
  this.suits={
   denim:create('denim',shades.denim[1],shades.denim[0]),
   hiking:create('hiking',shades.hiking[1],shades.hiking[0]),
   navy:create('navy',shades.navy[1],shades.navy[0]),
   'regular-shorts':create('regular-shorts','#f1e6c9','#64809a'),
   'loose-shorts':create('loose-shorts','#f1e6c9','#64809a')
  };
  // Loose shorts use a roomier outward normal offset without altering the body.
  const loose=this.suits['loose-shorts']?.shorts;
  if(loose){const p=loose.getVerticesData(B.VertexBuffer.PositionKind);const n=loose.getVerticesData(B.VertexBuffer.NormalKind);if(p&&n){const q=Float32Array.from(p);for(let i=0;i<q.length;i++)q[i]+=n[i]*this.measure.H*.018;loose.updateVerticesData(B.VertexBuffer.PositionKind,q);}}
  this.poseTokens=[];this.poseTime=0;this.poseElapsed=0;
  this.poseObserver=scene.onBeforeRenderObservable.add(()=>this.stepPose());
  this.buildMeasurements();this.bindSelector();this.bindFitControls();this.bindDressSizes();
  this.select('plaid');
  this.bindLayers();
 }
 buildMeasurements(){
  const m=this.measure;
  if(!$('model-measurements'))return;
  $('model-measurements').innerHTML=
   '<strong>Actual 3D body sizing (model scale)</strong>'+
   '<span>Height: '+fmt(m.height)+'</span>'+
   '<span>Shoulder width: '+fmt(m.shoulder)+'</span>'+
   '<span>Waist width: '+fmt(m.waist)+'</span>'+
   '<span>Hip width: '+fmt(m.hip)+'</span>'+
   '<small>Widths are straight-line mesh measurements, not body circumferences. Clothing is fitted to this character\'s rigged mesh; figures are not physical measurements of a real child.</small>';
 }
 bindDressSizes(){
  const size=$('dress-size-select'),vertical=$('dress-position'),width=$('dress-width'),depth=$('dress-depth'),reset=$('dress-reset');
  if(!size||!vertical||!width||!depth)return;
  const base=this.dress.scaling.clone(),origin=this.dress.position.clone();
  // Upper bodice needs its own fit: whole-dress width/depth also changes the skirt.
  this.dress.makeGeometryUnique();
  const originalVertices=this.dress.getVerticesData(this.B.VertexBuffer.PositionKind)?.slice();
  const bounds=this.dress.getBoundingInfo().boundingBox;
  const low=bounds.minimum.y,high=bounds.maximum.y,span=Math.max(.001,high-low);
  const topWidth=$('dress-top-width'),topDepth=$('dress-top-depth'),rim=$('dress-rim-diameter');
  const saveKey='wvlrp-young-explorer-wardrobe-v1';
  const controls={size,vertical,width,depth,topWidth,topDepth,rim};
  try{
    const saved=JSON.parse(localStorage.getItem(saveKey)||'{}');
    for(const [key,el] of Object.entries(controls))if(el&&saved[key]!=null)el.value=String(saved[key]);
  }catch(_){}
  const save=()=>{try{localStorage.setItem(saveKey,JSON.stringify(Object.fromEntries(Object.entries(controls).filter(([,el])=>el).map(([key,el])=>[key,el.value]))));}catch(_){}};
  const adjustBodice=()=>{
    if(!originalVertices)return;
    const updated=originalVertices.slice();
    const wx=Number(topWidth?.value||75)/100,dz=Number(topDepth?.value||75)/100, rimRatio=Number(rim?.value||100)/100;
    for(let i=0;i<updated.length;i+=3){
      const t=(originalVertices[i+1]-low)/span;
      const blend=Math.max(0,Math.min(1,(t-.48)/.32));
      const rimBlend=Math.max(0,Math.min(1,(t-.67)/.27));
      updated[i]=originalVertices[i]*(1-blend*(1-wx))*(1-rimBlend*(1-rimRatio));
      // Side-view correction: the imported skirt balloons in depth around the
      // waist/seat even when the front silhouette is already right. Reduce only
      // front-to-back skirt volume; leave X (front-view width) untouched.
      // Smooth falloff avoids a sharp crease at the bodice and hem.
      const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
      const skirtWeight=(1-smooth((t-.49)/.16))*smooth((t-.04)/.19);
      const profileFactor=1-.23*skirtWeight;
      updated[i+2]=originalVertices[i+2]*profileFactor*(1-blend*(1-dz))*(1-rimBlend*(1-rimRatio));
    }
    this.dress.updateVerticesData(this.B.VertexBuffer.PositionKind,updated,true);
    this.dress.refreshBoundingInfo();
  };
  const factors={2:.88,3:.91,4:.94,5:.97,6:1,7:1.03,8:1.06,10:1.10};
  const update=()=>{
   const ratio=factors[size.value]||1;
   adjustBodice();
   this.dress.scaling.set(base.x*ratio*(Number(width.value)/100),base.y,base.z*ratio*(Number(depth.value)/100));
   this.dress.position.copyFrom(origin);
   const parent=this.dress.parent;
   const shift=new this.B.Vector3(0,Number(vertical.value)/100,0);
   if(parent){parent.computeWorldMatrix(true);const inverse=parent.getWorldMatrix().clone().invert();this.dress.position.addInPlace(this.B.Vector3.TransformNormal(shift,inverse));}
   else this.dress.position.addInPlace(shift);
   // Re-anchor the garment AFTER resizing: scaling around the imported origin
   // otherwise raises it over the child's head on some GLB exports.
   this.dress.computeWorldMatrix(true);
   const top=this.dress.getBoundingInfo().boundingBox.maximumWorld.y;
   const shoulderY=this.measure.minY+this.measure.H*.805+Number(vertical.value)/100;
   const correction=shoulderY-top;
   if(Math.abs(correction)>0.001){
     if(parent){const inverse=parent.getWorldMatrix().clone().invert();this.dress.position.addInPlace(this.B.Vector3.TransformNormal(new this.B.Vector3(0,correction,0),inverse));}
     else this.dress.position.y+=correction;
     this.dress.computeWorldMatrix(true);
   }
   if($('dress-position-value'))$('dress-position-value').textContent=vertical.value+' cm';
   if($('dress-width-value'))$('dress-width-value').textContent=width.value+'%';
   if($('dress-depth-value'))$('dress-depth-value').textContent=depth.value+'%';
   if($('dress-top-width-value'))$('dress-top-width-value').textContent=(topWidth?.value||75)+'%';
   if($('dress-top-depth-value'))$('dress-top-depth-value').textContent=(topDepth?.value||75)+'%';
   if($('dress-rim-diameter-value'))$('dress-rim-diameter-value').textContent=(rim?.value||100)+'%';
   save();
  };
  for(const el of [size,vertical,width,depth,topWidth,topDepth,rim].filter(Boolean))el.addEventListener('input',update);
  if(reset)reset.onclick=()=>{size.value='4';vertical.value='0';width.value='100';depth.value='100';if(topWidth)topWidth.value='75';if(topDepth)topDepth.value='75';if(rim)rim.value='100';update();};
  update();
 }

 bindSelector(){
  const el=$('outfit-select');if(!el)return;
  el.innerHTML=outfits.map(o=>'<option value="'+o.id+'">'+o.label+'</option>').join('');
  el.onchange=()=>this.select(el.value);
 }
 bindFitControls(){
  const remove=$('remove-all'),hair=$('hair-select');
  if(remove)remove.onclick=()=>{
   this.dress.setEnabled(false);
   for(const suit of Object.values(this.suits)){suit.shirt?.setEnabled(false);suit.shorts?.setEnabled(false);}
   this.body.material=this.fitMaterial;
   this.selectedOutfit='fit-test';
   if($('outfit-feedback'))$('outfit-feedback').textContent='Clothing hidden for non-anatomical mannequin fit inspection. Select an outfit to restore.';
  };
  if(hair){
   const B=this.B,scene=this.scene;
   const original=this.model.meshes.filter(m=>/hair/i.test(m.name||''));
   const mat=new B.StandardMaterial('Young Explorer natural brown hair strands',scene);
   mat.diffuseColor=new B.Color3(.19,.105,.075);mat.specularColor=new B.Color3(.045,.035,.025);
   mat.backFaceCulling=false;
   const head=this.model.skeletons?.flatMap(s=>s.bones||[]).find(b=>normalize(b.name)==='head');
   const headNode=head?.getTransformNode?.()||head?._linkedTransformNode;
   const cx=this.measure.cx,top=this.measure.maxY,H=this.measure.H;
   const strands={ponytail:[],pigtails:[]};
   const build=(kind,x,z,length)=>{
     // Many narrow, tapering, curved locks replace the old oval primitives.
     for(let i=0;i<18;i++){
       const theta=i*2.39996,rad=Math.sqrt((i+.5)/18);
       const ox=Math.cos(theta)*rad*.036*H,oz=Math.sin(theta)*rad*.030*H;
       const start=new B.Vector3(cx+x+ox,top-.145*H,z+oz);
       const path=[];
       for(let j=0;j<=9;j++){
         const t=j/9;
         path.push(new B.Vector3(start.x+(.014*H*Math.sin(t*2.5+i*.13)),start.y-length*t,start.z+.045*H*t*t));
       }
       const lock=B.MeshBuilder.CreateTube('realistic '+kind+' hair lock '+i,{path,radius:.0048*H,tessellation:6,cap:B.Mesh.CAP_ALL},scene);
       lock.material=mat;lock.isPickable=false;
       if(headNode){lock.setParent(headNode);}
       lock.setEnabled(false);strands[kind].push(lock);
     }
   };
   build('ponytail',0,-.075*H,.29*H);
   build('pigtails',-.102*H,-.01*H,.23*H);
   build('pigtails',.102*H,-.01*H,.23*H);
   hair.onchange=()=>{
     for(const meshes of Object.values(strands))for(const mesh of meshes)mesh.setEnabled(false);
     // Retain the scalp and original textured hair; additional strands hang naturally.
     original.forEach(m=>m.setEnabled(true));
     for(const mesh of strands[hair.value]||[])mesh.setEnabled(true);
   };
  }
 }
 bindLayers(){
  const box=$('layer-shorts'),kind=$('layer-shorts-style'),key='wvlrp-young-explorer-shorts-layer-v1';
  if(!box||!kind)return;
  try{const saved=JSON.parse(localStorage.getItem(key)||'{}');box.checked=!!saved.enabled;if(saved.style&&this.suits[saved.style])kind.value=saved.style;}catch(_){}
  const apply=()=>{
    for(const suit of Object.values(this.suits))suit.shorts?.setEnabled(false);
    if(box.checked&&this.suits[kind.value])this.suits[kind.value].shorts?.setEnabled(true);
    else if(!box.checked&&this.selectedOutfit&&!['plaid','floral','sunflower'].includes(this.selectedOutfit))
      this.suits[this.selectedOutfit]?.shorts?.setEnabled(true);
    try{localStorage.setItem(key,JSON.stringify({enabled:box.checked,style:kind.value}));}catch(_){}
  };
  box.addEventListener('change',apply);kind.addEventListener('change',apply);this.applyShortsLayer=apply;apply();
 }
 select(id){
  if(!outfits.some(o=>o.id===id))return;
  this.body.material=this.originalBodyMaterial;
  for(const suit of Object.values(this.suits)){suit.shirt?.setEnabled(false);suit.shorts?.setEnabled(false);}
  const dress=id==='plaid'||id==='floral'||id==='sunflower';
  this.dress.setEnabled(dress);
  if(dress) this.dress.material=this.dressStyles[id];
  else {const suit=this.suits[id];suit.shirt?.setEnabled(true);suit.shorts?.setEnabled(true);}
  if($('outfit-select'))$('outfit-select').value=id;
  if($('outfit-feedback'))$('outfit-feedback').textContent=
    outfits.find(x=>x.id===id).label+' fitted to Young Explorer.';
  this.selectedOutfit=id;
  this.applyShortsLayer?.();
 }
 boneTarget(name){
  const skel=this.model.skeletons?.[0];if(!skel)return null;
  const b=skel.bones.find(b=>normalize(b.name)===name);
  return b?.getTransformNode?.()||b?._linkedTransformNode||null;
 }
 // Animate linked skin joints, keeping clothes and body on exactly the same bones.
 pose(kind) {
  this.model.animationGroups?.forEach(x=>x.stop());
  this.resetPose();
  const angles=kind==='wave' ?
   {rightarm:[0,0,-1.55],rightforearm:[0,0,-.45],rightshoulder:[0,0,-.18]} : kind==='pickup' ?
   {hips:[.10,0,0],spine:[1.0,0,0],spine1:[.42,0,0],leftarm:[.55,0,0],rightarm:[.55,0,0],leftupleg:[0,0,0],rightupleg:[0,0,0]} : kind==='hands-knees' ?
   {hips:[.15,0,0],spine:[.75,0,0],leftupleg:[-1.15,0,0],rightupleg:[-1.15,0,0],leftleg:[1.35,0,0],rightleg:[1.35,0,0],leftarm:[.85,0,0],rightarm:[.85,0,0]} : kind==='elbows-knees' ?
   {hips:[.15,0,0],spine:[.9,0,0],leftupleg:[-1.15,0,0],rightupleg:[-1.15,0,0],leftleg:[1.35,0,0],rightleg:[1.35,0,0],leftarm:[.9,0,0],rightarm:[.9,0,0],leftforearm:[-1.0,0,0],rightforearm:[-1.0,0,0]} : kind==='bend' ?
   {hips:[.12,0,0],spine:[.70,0,0],spine1:[.33,0,0],
    leftupleg:[-.16,0,0],rightupleg:[-.16,0,0],neck:[-.20,0,0]} :
   {hips:[-.12,0,0],spine:[.10,0,0],leftupleg:[-1.10,0,0],rightupleg:[-1.10,0,0],
    leftleg:[1.22,0,0],rightleg:[1.22,0,0],leftfoot:[-.14,0,0],rightfoot:[-.14,0,0]};
  this.poseTokens=[];
  for(const [name,euler] of Object.entries(angles)){
   const joint=this.boneTarget(name);if(!joint)continue;
   const from=(joint.rotationQuaternion || this.B.Quaternion.FromEulerVector(joint.rotation)).clone();
   const delta=this.B.Quaternion.RotationYawPitchRoll(euler[1],euler[0],euler[2]);
   this.poseTokens.push({joint,from,to:from.multiply(delta)});
  }
  if(kind==='sit'){
    const hips=this.boneTarget('hips');
    if(hips){
      const from=hips.position.clone();
      const to=from.clone();to.y-=this.measure.H*.23;
      this.poseTokens.push({joint:hips,fromPosition:from,toPosition:to});
    }
  }
  this.poseElapsed=0;this.poseTime=kind==='pickup'?.8:.35;this.activePose=kind;
  if(kind==='wave'){
   this.waveElapsed=0;
   this.waveObserver&&this.scene.onBeforeRenderObservable.remove(this.waveObserver);
   this.waveObserver=this.scene.onBeforeRenderObservable.add(()=>{
    if(this.activePose!=='wave'){this.scene.onBeforeRenderObservable.remove(this.waveObserver);this.waveObserver=null;return;}
    this.waveElapsed+=this.scene.getEngine().getDeltaTime()/1000;
    const forearm=this.boneTarget('rightforearm');
    if(forearm&&this.poseTime===0){const base=forearm.metadata?._wvlrpBaseRotation;
     if(base)forearm.rotationQuaternion=base.multiply(this.B.Quaternion.RotationAxis(this.B.Axis.Z,-.45+.22*Math.sin(this.waveElapsed*7)));}
   });
  }
  if($('pose-feedback'))$('pose-feedback').textContent=({bend:'Bend Over pose selected',pickup:'Straight-legged reach to ground selected','hands-knees':'Hands and knees selected','elbows-knees':'Elbows and knees selected',sit:'Sit Down pose selected',wave:'Wave selected'})[kind]||'Pose selected';
 }
 stepPose(){
  if(!this.poseTokens.length||!this.poseTime)return;
  this.poseElapsed+=Math.min(.06,this.scene.getEngine().getDeltaTime()/1000);
  const t=clamp(this.poseElapsed/this.poseTime,0,1),smooth=t*t*(3-2*t);
  for(const item of this.poseTokens){
   if(item.fromPosition){item.joint.position.copyFrom(this.B.Vector3.Lerp(item.fromPosition,item.toPosition,smooth));}
   else item.joint.rotationQuaternion=this.B.Quaternion.Slerp(item.from,item.to,smooth);
   item.joint.markAsDirty?.('rotation');
  }
  if(t===1){this.poseTokens=[];this.poseTime=0;}
 }
 resetPose(){
  this.poseTokens=[];this.poseTime=0;this.activePose=null;
  const skel=this.model.skeletons?.[0];if(!skel)return;
  for(const b of skel.bones){
   const node=b.getTransformNode?.()||b._linkedTransformNode;
   if(!node)continue;
   if(node.metadata?._wvlrpBaseRotation){
    node.rotationQuaternion=node.metadata._wvlrpBaseRotation.clone();
    if(node.metadata._wvlrpBasePosition)node.position.copyFrom(node.metadata._wvlrpBasePosition);
   }else{
    node.metadata=node.metadata||{};
    node.metadata._wvlrpBaseRotation=
     (node.rotationQuaternion||this.B.Quaternion.FromEulerVector(node.rotation)).clone();
    node.metadata._wvlrpBasePosition=node.position.clone();
   }
  }
  if($('pose-feedback'))$('pose-feedback').textContent='';
 }
 naturalStand(){
  // A relaxed standing pose instead of the exported wide A-pose.
  // Rotate the actual upper-arm joints, so skin and sleeves follow the rig.
  this.model.animationGroups?.forEach(g=>g.stop());
  this.resetPose();
  for(const [name,angle] of [['leftarm',-.48],['rightarm',.48]]){
    const joint=this.boneTarget(name);if(!joint)continue;
    const base=(joint.rotationQuaternion||this.B.Quaternion.FromEulerVector(joint.rotation)).clone();
    joint.rotationQuaternion=base.multiply(this.B.Quaternion.RotationAxis(this.B.Axis.Z,angle));
    joint.markAsDirty?.('rotation');
  }
  if($('pose-feedback'))$('pose-feedback').textContent='Relaxed standing pose';
 }
 rememberBindPose(){
  for(const b of this.model.skeletons?.[0]?.bones||[]){
   const node=b.getTransformNode?.()||b._linkedTransformNode;
   if(!node)continue;node.metadata=node.metadata||{};
   node.metadata._wvlrpBaseRotation=(node.rotationQuaternion||
     this.B.Quaternion.FromEulerVector(node.rotation)).clone();
   node.metadata._wvlrpBasePosition=node.position.clone();
  }
 }
}
window.WVLRPYoungExplorerWardrobe=YoungExplorerWardrobe;
})();