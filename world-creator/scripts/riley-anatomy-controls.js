/* WVLRP Riley reversible anatomical fitting controls.
   Viewer-only, deforming the existing MakeHuman Vulva 1 vertices.
   Real lips are sculpted from the source surface; the clitoris/hood need
   distinct detailed source geometry before honest independent controls. */
(() => {
  'use strict';
  const q=id=>document.getElementById(id);
  const specs = [
    ['outerLength', 'Outer labia length', 50, 400, 175, '%'],
    ['outerThickness', 'Outer labia fullness', 40, 400, 185, '%'],
    ['innerLength', 'Inner labia length', 50, 400, 160, '%'],
    ['innerThickness', 'Inner labia fullness', 40, 400, 170, '%'],
    ['topFlapFold', 'Fold top outer flap inward', -25, 45, 0, ' mm'],
    ['hoodLength', 'Clitoral hood length — reserved', 65, 150, 100, '%'],
    ['hoodThickness', 'Clitoral hood thickness — reserved', 50, 175, 100, '%'],
    ['clitLength', 'Clitoris length — reserved', 60, 180, 100, '%'],
    ['clitFullness', 'Clitoris fullness — reserved', 50, 200, 100, '%']
  ];
  const futureIds=new Set(['hoodLength','hoodThickness','clitLength','clitFullness']);
  const panel=document.createElement('section');
  panel.setAttribute('aria-label','Riley independent labia and upper flap fitting controls');
  panel.style.cssText='margin:12px 0;padding:12px;border:1px solid #93b89f;background:#254737;border-radius:12px;color:#f1f9ed';
  panel.innerHTML='<strong>Body-matched anatomy — inner/outer lip controls</strong>'+
    '<p style="font-size:13px;margin:7px 0;color:#e0f1e2">The detailed anatomy starts at moderate independent lengths/fullness; the extreme 400% values remain available if needed. You can enlarge the whole insert separately in the panel below. The top outer flap has its own fold-back control; 0 mm is its original position, and positive values tuck ONLY the upper flap inward toward the body. Negative values pull it outward for comparison. These controls never translate the entire insert.</p>'+
    specs.map(([id,label,min,max,initial,unit])=>
      '<label style="display:block;margin:9px 0;'+(futureIds.has(id)?'opacity:.55;':'')+'">'+label+': <output id="'+id+'Amount">'+initial+unit+'</output>'+
      '<input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="1" value="'+initial+'"'+(futureIds.has(id)?' disabled title="Reserved until separate clitoral and hood geometry is present"':'')+' style="display:block;width:100%;max-width:none;accent-color:#bce3aa"></label>'
    ).join('')+
    '<div><button type="button" id="rileyAllSizeMax">Set ALL size controls to MAX</button><button type="button" id="rileyMorphOriginal">Reset lip sizes (100%)</button>'+
    '<button type="button" id="rileyFlapOriginal">Unfold top flap (0 mm)</button></div>'+
    '<p id="rileyMorphStatus" role="status" style="font-size:12px;margin:8px 0;color:#e4f2e4">Waiting for donor mesh…</p>'+
    '<p style="font-size:12px;margin:8px 0;color:#dbe9dc">Hood/clitoris sliders are intentionally disabled until a proper detailed mesh exists. This is a reversible viewport deformation, not an exported GLB or a mesh weld.</p>';
  q('fitStatus').before(panel);
  for(const [id,,min,max,initial,unit] of specs){
    fitIds.push(id);
    try{
      const saved=JSON.parse(localStorage.getItem(fitStore)||'{}');
      const n=Number(saved[id]);
      if(saved[id]!==undefined&&Number.isFinite(n))q(id).value=Math.max(min,Math.min(max,n));
    }catch(_){}
    q(id+'Amount').textContent=q(id).value+unit;
    if(!futureIds.has(id))q(id).oninput=()=>{
      q(id+'Amount').textContent=q(id).value+unit;
      applyPelvicFit();
    };
  }
  q('rileyAllSizeMax').onclick=()=>{
    q('overallSize').value=300;
    for(const id of ['outerLength','outerThickness','innerLength','innerThickness']){
      q(id).value=400;
      q(id+'Amount').textContent='400%';
    }
    applyPelvicFit();
  };
  q('rileyMorphOriginal').onclick=()=>{
    for(const id of ['outerLength','outerThickness','innerLength','innerThickness']){
      q(id).value=100;q(id+'Amount').textContent='100%';
    }
    applyPelvicFit();
  };
  q('rileyFlapOriginal').onclick=()=>{
    q('topFlapFold').value=0;q('topFlapFoldAmount').textContent='0 mm';
    applyPelvicFit();
  };
  const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
  const bump=(t,c,w)=>{const d=(t-c)/w;return Math.exp(-2*d*d);};
  let lastMesh=null,mask=null;
  function makeMask(mesh,rest){
    const count=rest.length/3;
    let yMin=Infinity,yMax=-Infinity,xMax=.001;
    for(let i=0;i<count;i++){
      const x=rest[3*i],y=rest[3*i+1];
      xMax=Math.max(xMax,Math.abs(x));yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);
    }
    const height=Math.max(.001,yMax-yMin);
    const outer=new Float32Array(count),inner=new Float32Array(count),upperFlap=new Float32Array(count);
    let outerCount=0,innerCount=0,flapCount=0;
    for(let i=0;i<count;i++){
      const j=3*i,x=rest[j],y=rest[j+1],v=(y-yMin)/height,nx=Math.abs(x)/xMax;
      // The donor has lips much closer to the midline than its broad
      // perimeter. Earlier masks at normalized x=0.55 hit the outer sheet,
      // not the labia. Keep masks soft to avoid jagged sparse topology.
      // Localize both lips on the central lower part of this sparse donor.
      // The former weak morph moved only a few millimeters and was easily
      // obscured by the full-size body and its oversized upper sheet.
      // Source labial ridges lie close to the midline. Distinct radial
      // bands on the subdivided mesh give independent, smooth deformation.
      // Outer target ~0.15 of donor half-width; inner ~0.035.
      const o=bump(nx,.15,.115)*bump(v,.43,.30);
      const inn=bump(nx,.035,.048)*bump(v,.43,.29);
      const top=smooth((v-.69)/.28)*(.20+.80*smooth((nx-.12)/.46));
      outer[i]=o;inner[i]=inn;upperFlap[i]=top;
      if(o>.18)outerCount++;if(inn>.18)innerCount++;if(top>.18)flapCount++;
    }
    q('rileyMorphStatus').textContent='Donor vertices selected for editing: outer lips '+outerCount+', inner lips '+innerCount+', upper flap '+flapCount+' of '+count+'. Controls affect only this temporary attachment.';
    console.info('Riley labia / flap morph region counts', {count,outerCount,innerCount,flapCount});
    return {rest,outer,inner,upperFlap,height};
  }
  const originalHinge=applyPelvicHinge;
  applyPelvicHinge=function(){
    originalHinge();
    if(!addonMesh||!hingeOriginal)return;
    if(lastMesh!==addonMesh){
      lastMesh=addonMesh;
      mask=makeMask(addonMesh,hingeOriginal.positions);
    }
    if(!mask)return;
    const v=id=>Number(q(id).value);
    const outerLength=(v('outerLength')-100)/100;
    const outerThickness=(v('outerThickness')-100)/100;
    const innerLength=(v('innerLength')-100)/100;
    const innerThickness=(v('innerThickness')-100)/100;
    const foldMM=v('topFlapFold');
    const size=v('overallSize')/100;
    if(!outerLength&&!outerThickness&&!innerLength&&!innerThickness&&!foldMM){
      q('rileyMorphStatus').textContent='Lip controls at their original shape (100%). Whole attachment: '+v('overallSize')+'%. Move length or fullness to see the deformation.';
      return;
    }
    const coords=addonMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if(!coords||coords.length!==mask.rest.length)return;
    const pos=Array.from(coords),a=v('hingeFit')*Math.PI/180,c=Math.cos(a),sin=Math.sin(a);
    // Translate surface relief along WORLD depth (rather than assuming the
    // imported Blender/skinned mesh's local Z has the same sign). This fixes
    // the old 'tuck makes the flap stick out farther' direction error.
    addonMesh.computeWorldMatrix(true);
    const inverse=addonMesh.getWorldMatrix().clone().invert();
    const frontBack=BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0,0,1),inverse);
    const forwardZ=Math.hypot(frontBack.x,frontBack.y,frontBack.z)||1;
    frontBack.scaleInPlace(1/forwardZ);
    const {rest,outer,inner,upperFlap,height}=mask;
    let maxChange=0;
    for(let i=0;i<pos.length;i+=3){
      const j=i/3,x=rest[i],y=rest[i+1],nY=(y-hingeOriginal.pivotY+height)/height;
      const o=outer[j],inn=inner[j],flap=upperFlap[j];
      // Stretch ends while anchoring upper lip roots; preserve the clitoral
      // area and leave the outside sheet unaffected by length sliders.
      const extend=smooth((.88-nY)/.65);
      // Physical displacements follow the enlarged insert. Longer controls
      // stretch the lips vertically; fullness adds visible forward relief
      // AND left/right width, without enlarging the entire upper flap.
      // Max settings are intentionally strong but vertex displacements
      // remain on a human-scale range, rather than the old 0.5-meter stretch.
      const dy=-size*(.009*outerLength*o+.006*innerLength*inn)*extend;
      const relief=size*(.007*outerThickness*o+.005*innerThickness*inn);
      const lateral=Math.sign(x)*size*(.004*outerThickness*o+.0025*innerThickness*inn);
      // Independently hinge the upper outside sheet backward toward the body.
      // The change tapers smoothly to zero below its upper attachment.
      const fold=foldMM/1000*flap;
      const localY=dy*c;
      const localZ=dy*sin;
      const beforeZ=pos[i+2];
      pos[i]+=lateral+frontBack.x*(relief-fold);
      pos[i+1]+=localY+frontBack.y*(relief-fold);
      pos[i+2]+=localZ+frontBack.z*(relief-fold);
      maxChange=Math.max(maxChange,Math.abs(pos[i+2]-beforeZ),Math.abs(localY));
    }
    addonMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind,pos,true);
    const indices=addonMesh.getIndices(),normals=addonMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    if(indices&&normals&&indices.length){
      const out=Array.from(normals);
      BABYLON.VertexData.ComputeNormals(pos,indices,out);
      addonMesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind,out,false);
    }
    addonMesh.refreshBoundingInfo(true);
    q('rileyMorphStatus').textContent='Live mesh changed: whole insert '+v('overallSize')+'%, outer lip length '+v('outerLength')+'%, outer fullness '+v('outerThickness')+'%, inner lip length '+v('innerLength')+'%, inner fullness '+v('innerThickness')+'%, top flap '+foldMM+' mm. Largest movement: '+(maxChange*1000).toFixed(1)+' mm.';
  };
  q('fitReset').addEventListener('click',()=>{
    for(const [id,,min,max,initial,unit] of specs){
      const original = futureIds.has(id) ? initial : (id==='topFlapFold' ? 0 : 100);
      q(id).value=original;q(id+'Amount').textContent=original+unit;
    }
    applyPelvicFit();
  });
  applyPelvicFit();
})();
