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
 // Independent sewn-like garment surface: NOT a copy of the character's skin.
 // Ring vertices form a roomy shirt or two distinct shorts legs.
 const src=body.getVerticesData(B.VertexBuffer.PositionKind);
 const bi=body.getVerticesData(B.VertexBuffer.MatricesIndicesKind);
 const bw=body.getVerticesData(B.VertexBuffer.MatricesWeightsKind);
 if(!src||!bi||!bw)throw Error('Rigged source vertex data missing for garments');
 const H=measure.H, world=body.getWorldMatrix(), inv=world.clone().invert();
 const worldPts=[], tmp=new B.Vector3();
 for(let i=0;i<src.length;i+=3){
  B.Vector3.TransformCoordinatesToRef(B.Vector3.FromArray(src,i),world,tmp);
  worldPts.push([tmp.x,tmp.y,tmp.z]);
 }
 const sections=[],isShorts=id.includes('shorts');
 const y0=measure.minY+range[0]*H,y1=measure.minY+range[1]*H;
 const groups=isShorts?[-1,1]:[0];
 for(const side of groups){
  const verts=[],indices=[],normals=[],uv=[],weights=[],bones=[];
  const rings=13,segments=28;
  for(let j=0;j<rings;j++){
   const t=j/(rings-1),y=y0+(y1-y0)*t;
   const band=worldPts.filter(p=>Math.abs(p[1]-y)<H*.018 && (side===0?Math.abs(p[0]-measure.cx)<H*.115:(p[0]-measure.cx)*side>H*.018 && Math.abs(p[0]-measure.cx)<H*.135));
   const xcenter=side===0?measure.cx:measure.cx+side*H*.077;
   const zcenter=band.length?band.reduce((a,p)=>a+p[2],0)/band.length:0;
   const radiusX=band.length?Math.max(...band.map(p=>Math.abs(p[0]-xcenter))):H*(side===0?.105:.060);
   const radiusZ=band.length?Math.max(...band.map(p=>Math.abs(p[2]-zcenter))):H*(side===0?.085:.060);
   const ease=isShorts?1-.08*t:1-.06*t;
   const rx=Math.max(radiusX,H*(side===0?.080:.042))*1.015*ease+H*.004;
   const rz=Math.max(radiusZ,H*(side===0?.070:.042))*1.015*ease+H*.004;
   for(let k=0;k<segments;k++){
    const theta=2*Math.PI*k/segments;
    const x=xcenter+rx*Math.cos(theta),z=zcenter+rz*Math.sin(theta);
    B.Vector3.TransformCoordinatesToRef(new B.Vector3(x,y,z),inv,tmp);
    verts.push(tmp.x,tmp.y,tmp.z);uv.push(k/segments,t);
    let closest=0,best=Infinity;
    for(let i=0;i<worldPts.length;i++){
     const p=worldPts[i],d=(p[0]-x)**2+(p[1]-y)**2+(p[2]-z)**2;
     if(d<best){best=d;closest=i;}
    }
    // Dresses must not inherit nearby arm/head/leg skin weights: those weights
    // were pulling the skirt over Jenny's head in articulated poses.
    if(!isShorts && id.includes('dress')){
      const skeleton=body.skeleton;
      const findBone=(names)=>skeleton?.bones?.findIndex(b=>names.includes(normalize(b.name)))??-1;
      const pelvis=findBone(['hips','pelvis']);
      const spine=findBone(['spine','spine1','spine2','chest']);
      const anchor=spine>=0?spine:pelvis;
      if(anchor>=0){bones.push(anchor,0,0,0);weights.push(1,0,0,0);}
      else for(let n=0;n<4;n++){bones.push(bi[closest*4+n]);weights.push(bw[closest*4+n]);}
    } else for(let n=0;n<4;n++){bones.push(bi[closest*4+n]);weights.push(bw[closest*4+n]);}
   }
  }
  for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
   const a=j*segments+k,b=j*segments+(k+1)%segments,c=(j+1)*segments+k,d=(j+1)*segments+(k+1)%segments;
   indices.push(a,c,b,b,c,d);
  }
  const mesh=new B.Mesh('Young Explorer independent garment '+id+' '+side,body.getScene());
  const data=new B.VertexData();
  data.positions=verts;data.indices=indices;data.uvs=uv;
  data.matricesIndices=bones;data.matricesWeights=weights;
  B.VertexData.ComputeNormals(verts,indices,normals);data.normals=normals;
  data.applyToMesh(mesh);
  mesh.parent=body.parent;mesh.position.copyFrom(body.position);
  mesh.rotationQuaternion=body.rotationQuaternion?.clone()||null;
  mesh.rotation.copyFrom(body.rotation);mesh.scaling.copyFrom(body.scaling);
  mesh.skeleton=body.skeleton;mesh.material=material;mesh.isPickable=false;
  mesh.alwaysSelectAsActiveMesh=true;mesh.setEnabled(false);sections.push(mesh);
 }
 // Wrapper allows the existing outfit controls to toggle both leg panels together.
 const group=new B.TransformNode('Young Explorer outfit '+id,body.getScene());
 group.setEnabled=function(value){sections.forEach(m=>m.setEnabled(value));};
  Object.defineProperty(group,'material',{get(){return sections[0]?.material;},set(value){sections.forEach(m=>m.material=value);}});
 return group;
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
  // Preserve the imported skinned mesh transform and bind pose.
  this.dress.computeWorldMatrix(true);
  this.body.computeWorldMatrix(true);
  // The imported dress is visibly displaced in the source asset. Hide it and
  // use a separate rigged garment generated at Jenny's measured torso instead.
  this.dress.setEnabled(false);
  const fittedDress=makeSkinnedShell(B,this.body,'plaid dress',[.49,.81],.022,this.dress.material,this.measure);
  this.importedDress=this.dress;
  this.dress=fittedDress;
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
  this.poseTokens=[];this.poseTime=0;this.poseElapsed=0;
  this.poseObserver=scene.onBeforeRenderObservable.add(()=>this.stepPose());
  this.buildMeasurements();this.bindSelector();this.bindFitControls();this.bindDressSizes();
  this.select('plaid');
  this.bindLayers();
 }
 alignImportedDress(){
  // Align the imported garment's actual bounding box with the torso, not the head.
  const B=this.B,body=this.body,dress=this.dress;
  body.refreshBoundingInfo();dress.refreshBoundingInfo();
  const bb=body.getBoundingInfo().boundingBox,db=dress.getBoundingInfo().boundingBox;
  const h=bb.maximumWorld.y-bb.minimumWorld.y;
  const desiredTop=bb.minimumWorld.y+h*.81;
  const desiredBottom=bb.minimumWorld.y+h*.49;
  const actualHeight=Math.max(.001,db.maximumWorld.y-db.minimumWorld.y);
  const desiredHeight=desiredTop-desiredBottom;
  const factor=clamp(desiredHeight/actualHeight,.35,2.4);
  dress.scaling.scaleInPlace(factor);
  dress.computeWorldMatrix(true);dress.refreshBoundingInfo();
  const adjusted=dress.getBoundingInfo().boundingBox;
  const centerX=(bb.minimumWorld.x+bb.maximumWorld.x)/2;
  const centerZ=(bb.minimumWorld.z+bb.maximumWorld.z)/2;
  const dressX=(adjusted.minimumWorld.x+adjusted.maximumWorld.x)/2;
  const dressZ=(adjusted.minimumWorld.z+adjusted.maximumWorld.z)/2;
  const desiredY=bb.minimumWorld.y+h*.65;
  const dressY=(adjusted.minimumWorld.y+adjusted.maximumWorld.y)/2;
  const offset=new B.Vector3(centerX-dressX,desiredY-dressY,centerZ-dressZ);
  const parent=dress.parent;
  if(parent){
   const inverse=parent.getWorldMatrix().clone().invert();
   B.Vector3.TransformNormalToRef(offset,inverse,offset);
  }
  dress.position.addInPlace(offset);
  dress.computeWorldMatrix(true);
 }
 rebindDressToTorso(){
  const B=this.B, dress=this.dress, skel=this.model.skeletons?.[0];
  if(!skel||!dress.getVerticesData(B.VertexBuffer.MatricesIndicesKind))return;
  const find=(...names)=>skel.bones.findIndex(b=>names.includes(normalize(b.name)));
  const hip=find('hips','pelvis'),spine=find('spine'),chest=find('spine1','spine2','chest');
  if(hip<0||spine<0)return;
  dress.makeGeometryUnique();
  const pos=dress.getVerticesData(B.VertexBuffer.PositionKind);
  const oldIndices=dress.getVerticesData(B.VertexBuffer.MatricesIndicesKind);
  const oldWeights=dress.getVerticesData(B.VertexBuffer.MatricesWeightsKind);
  if(!pos||!oldIndices||!oldWeights)return;
  const indices=new Float32Array(oldIndices.length),weights=new Float32Array(oldWeights.length);
  let low=Infinity,high=-Infinity;
  for(let i=1;i<pos.length;i+=3){low=Math.min(low,pos[i]);high=Math.max(high,pos[i]);}
  const n=Math.min(pos.length/3,Math.floor(indices.length/4));
  for(let i=0;i<n;i++){
   const t=clamp((pos[i*3+1]-low)/Math.max(.001,high-low),0,1);
   // Skirt hangs from pelvis; upper dress follows the spine and chest.
   const upper=clamp((t-.42)/.36,0,1);
   const top=chest>=0?clamp((t-.72)/.24,0,1):0;
   indices[i*4]=hip;indices[i*4+1]=spine;indices[i*4+2]=chest>=0?chest:spine;
   weights[i*4]=1-upper;weights[i*4+1]=upper*(1-top);weights[i*4+2]=upper*top;
  }
  dress.setVerticesData(B.VertexBuffer.MatricesIndicesKind,indices,false);
  dress.setVerticesData(B.VertexBuffer.MatricesWeightsKind,weights,false);
  dress.skeleton=skel;
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
  // Imported clothing is rigged at authoring time; runtime resizing invalidates its bind pose.
  for(const id of ['dress-size-select','dress-position','dress-width','dress-depth','dress-top-width','dress-top-depth','dress-rim-diameter','dress-reset']){
   const el=$(id);if(el){el.disabled=true;el.title='Fit is controlled by the imported rigged garment';}
  }
 }

 bindSelector(){
  const el=$('outfit-select');if(!el)return;
  el.innerHTML=outfits.map(o=>'<option value="'+o.id+'">'+o.label+'</option>').join('');
  el.onchange=()=>this.select(el.value);
 }
 bindFitControls(){
  const remove=$('remove-all'),hair=$('hair-select');
  if(remove)remove.onclick=()=>{
   // Fitting inspection uses an abstract opaque mannequin, never an undressed child.
   if(!this.fittingMannequin){
    const B=this.B, scene=this.scene, m=this.measure;
    const mat=new B.StandardMaterial('opaque fitting mannequin material',scene);
    mat.diffuseColor=new B.Color3(.42,.52,.48);
    const root=new B.TransformNode('abstract fitting mannequin',scene);
    const part=(name,y,height,diameter)=>{
      const mesh=B.MeshBuilder.CreateCylinder(name,{height,diameter,tessellation:24},scene);
      mesh.parent=root;mesh.position.set(m.cx,y,0);mesh.material=mat;
    };
    part('neutral torso',m.minY+m.H*.65,m.H*.32,m.H*.23);
    part('neutral head',m.minY+m.H*.89,m.H*.16,m.H*.15);
    for(const s of [-1,1]){
      const leg=B.MeshBuilder.CreateCapsule('neutral leg',{height:m.H*.43,radius:m.H*.055},scene);
      leg.parent=root;leg.position.set(m.cx+s*m.H*.09,m.minY+m.H*.22,0);leg.material=mat;
      const arm=B.MeshBuilder.CreateCapsule('neutral arm',{height:m.H*.32,radius:m.H*.035},scene);
      arm.parent=root;arm.position.set(m.cx+s*m.H*.18,m.minY+m.H*.62,0);arm.material=mat;
    }
    this.fittingMannequin=root;root.setEnabled(false);
   }
   this.fittingVisibility=this.model.meshes.map(mesh=>[mesh,mesh.isEnabled()]);
   for(const [mesh] of this.fittingVisibility)mesh.setEnabled(false);
   for(const suit of Object.values(this.suits)){suit.shirt?.setEnabled(false);suit.shorts?.setEnabled(false);}
   this.fittingMannequin.setEnabled(true);
   this.selectedOutfit='fit-test';
   if($('outfit-feedback'))$('outfit-feedback').textContent='Opaque fitting mannequin active. Select an outfit to restore Jenny.';
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
   // Do not create the former lobster-like tube hair. New hairstyles must be
   // authored as complete, separate Blender hair assets before enabling them.
   for(const option of [...hair.options]){
     if(option.value==='ponytail'||option.value==='pigtails')option.disabled=true;
   }
   hair.onchange=()=>{
     for(const meshes of Object.values(strands))for(const mesh of meshes)mesh.setEnabled(false);
     // Retain original authored hairstyle until alternatives are available.
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
  if(this.fittingMannequin)this.fittingMannequin.setEnabled(false);
  if(this.fittingVisibility){for(const [mesh,enabled] of this.fittingVisibility)mesh.setEnabled(enabled);this.fittingVisibility=null;}
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
 pose(kind){
  this.stopLocomotion();
  const clips=this.model.animationGroups||[];
  clips.forEach(g=>g.stop());
  this.resetPose();
  const matches={wave:/wave/i,bend:/bend/i,pickup:/pick.?up/i,sit:/sit/i,
    'hands-knees':/hands.?and.?knees/i,'elbows-knees':/elbows.?and.?knees/i};
  const clip=clips.find(g=>matches[kind]?.test(g.name));
  if(!clip){if($('pose-feedback'))$('pose-feedback').textContent='Missing saved skeleton movement: '+kind+'; available: '+clips.map(g=>g.name).join(', ');return;}
  // Do not present the broken authored crawl as a valid rescue animation.
  // A safe neutral pose is preferable to visibly reversed limbs in the cave.
  // Elbows-and-knees is Jenny's cave-crawl posture. Allow the authored
  // animation to run instead of silently forcing the character to stand.
  // Hinge QA is still required on the exported skeleton.

  clip.start(false,1,clip.from,clip.to,false);
  // Bend and floor movements must reach their maximum authored articulation.
  const holdFraction=(kind==='bend'||kind==='pickup')?.92:((kind==='hands-knees'||kind==='elbows-knees')?.65:.82);
  const frame=clip.from+(clip.to-clip.from)*holdFraction;
  clip.goToFrame(frame);clip.pause();
  // Preserve authored knee rotations. The former hard-coded X-axis override
  // inverted knee flexion on this rig and broke floor poses.
  // Until hinge axes are calibrated from the actual GLB, do not overwrite
  // the animation clip's joint rotations with guessed local rotations.
  this.activePose=kind;
  this.savePoseSnapshot(kind,frame);
  if($('pose-feedback'))$('pose-feedback').textContent=kind+' · saved skeletal pose';
 }
 savePoseSnapshot(kind,frame){
  // Persist per-character bone transforms; never overwrite Penny or another avatar.
  const bones=this.model.skeletons?.[0]?.bones||[];
  const rotations={};
  for(const b of bones){
   const n=b.getTransformNode?.()||b._linkedTransformNode;
   if(n){const q=n.rotationQuaternion||this.B.Quaternion.FromEulerVector(n.rotation);
    rotations[b.name]=[q.x,q.y,q.z,q.w];}
  }
  try{localStorage.setItem('wvlrp-jenny-skeleton-'+kind,JSON.stringify({version:1,frame,rotations}));}catch(_){}
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
 startLocomotion(kind){
  this.model.animationGroups?.forEach(g=>g.stop());
  this.resetPose();
  if(this.locomotionObserver)this.scene.onBeforeRenderObservable.remove(this.locomotionObserver);
  const B=this.B,run=kind==='run',rate=run?8.2:5.1,stride=run?.48:.32;
  const parts=['leftupleg','rightupleg','leftleg','rightleg','leftarm','rightarm'];
  const joints=parts.map(n=>this.boneTarget(n));
  const bases=joints.map(j=>j?(j.rotationQuaternion||B.Quaternion.FromEulerVector(j.rotation)).clone():null);
  const begun=performance.now();
  this.locomotionObserver=this.scene.onBeforeRenderObservable.add(()=>{
   const t=(performance.now()-begun)/1000*rate;
   for(let side=0;side<2;side++){
    const phase=t+side*Math.PI,step=Math.sin(phase);
    const hip=joints[side],knee=joints[side+2],arm=joints[side+4];
    if(hip&&bases[side])hip.rotationQuaternion=bases[side].multiply(B.Quaternion.RotationAxis(B.Axis.X,step*stride));
    // Knee flexion is one-directional; never hyperextend backward during stride.
    if(knee&&bases[side+2])knee.rotationQuaternion=bases[side+2].clone(); // no uncalibrated backward knee flexion
    if(arm&&bases[side+4])arm.rotationQuaternion=bases[side+4].multiply(B.Quaternion.RotationAxis(B.Axis.X,-step*(run?.38:.22)));
   }
  });
 }
 stopLocomotion(){
  if(this.locomotionObserver){this.scene.onBeforeRenderObservable.remove(this.locomotionObserver);this.locomotionObserver=null;}
 }
 naturalStand(){
  // A relaxed standing pose instead of the exported wide A-pose.
  // Rotate the actual upper-arm joints, so skin and sleeves follow the rig.
  this.stopLocomotion();
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