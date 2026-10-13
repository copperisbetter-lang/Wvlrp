/* WVLRP Riley trial only. Reversible local morphs layered after the existing
   hinge, without overwriting the approved Riley or experimental trial GLB.
   "Labia" regions are normalized geometry masks, not surgical segmentation. */
(() => {
  'use strict';
  const q = id => document.getElementById(id);
  const specs = [
    ['outerLength', 'Outer labia length', 65, 150, 100, '%'],
    ['outerThickness', 'Outer labia thickness', 50, 175, 100, '%'],
    ['innerLength', 'Inner labia length', 65, 150, 100, '%'],
    ['innerThickness', 'Inner labia thickness', 50, 175, 100, '%'],
    ['hoodLength', 'Clitoral hood length', 65, 150, 100, '%'],
    ['hoodThickness', 'Clitoral hood thickness', 50, 175, 100, '%'],
    ['sideSeal', 'Sink exposed outer flap only', 0, 35, 0, ' mm']
  ];
  const panel = document.createElement('section');
  panel.setAttribute('aria-label', 'Independent anatomical size and side-edge controls');
  panel.style.cssText = 'margin:12px 0;padding:12px;border:1px solid #93b89f;background:#254737;border-radius:12px;color:#f1f9ed';
  panel.innerHTML = '<strong>Shape each area separately — reversible trial</strong>' +
    '<p style="font-size:13px;margin:7px 0;color:#e0f1e2">Length changes vertical extent; thickness changes surface fullness. 100% is the original mesh. First tuck the stray side edge without burying the center, then adjust the visible anatomy as needed. This is an approximate visual morph, not a finished welded mesh.</p>' +
    specs.map(([id,label,min,max,initial,unit]) =>
      '<label style="display:block;margin:9px 0">' + label + ': <output id="' + id + 'Amount">' + initial + unit + '</output>' +
      '<input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="1" value="' + initial + '" style="display:block;width:100%;max-width:none;accent-color:#bce3aa"></label>'
    ).join('') +
    '<div><button type="button" id="rileyMorphOriginal">Original sizes (100%)</button>' +
    '<button type="button" id="rileyFlapOriginal">Show old flap (0 mm)</button></div>' +
    '<p style="font-size:12px;margin:8px 0;color:#dbe9dc">Your existing hinge/placement values stay as they are. These edits are displayed in this viewer only; no GLB export yet.</p>';
  q('fitStatus').before(panel);

  // Save new values with the existing persisted slider group. Restoring is
  // done after the elements have been added so it works with old saved fits.
  for (const [id,,min,max,initial,unit] of specs) {
    fitIds.push(id);
    try {
      const saved = JSON.parse(localStorage.getItem(fitStore) || '{}');
      const n = Number(saved[id]);
      if (saved[id] !== undefined && Number.isFinite(n)) q(id).value = Math.max(min,Math.min(max,n));
    } catch (_) {}
    q(id+'Amount').textContent = q(id).value + unit;
    q(id).oninput = () => {
      q(id+'Amount').textContent = q(id).value + unit;
      applyPelvicFit();
    };
  }
  q('rileyMorphOriginal').onclick = () => {
    for (const [id,,,,initial,unit] of specs.filter(s=>s[0]!=='sideSeal')) {
      q(id).value = initial;
      q(id+'Amount').textContent=initial+unit;
    }
    applyPelvicFit();
  };
  q('rileyFlapOriginal').onclick = () => {
    q('sideSeal').value=0;q('sideSealAmount').textContent='0 mm';applyPelvicFit();
  };

  const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
  const bump=(t,c,w)=>{const d=(t-c)/w;return Math.exp(-2*d*d);};
  let lastMesh=null,mask=null;

  function makeMask(mesh,rest) {
    const len=rest.length/3;
    let yMin=Infinity,yMax=-Infinity,xMax=.001;
    for(let i=0;i<len;i++){
      const x=rest[3*i],y=rest[3*i+1];
      xMax=Math.max(xMax,Math.abs(x)); yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);
    }
    const height=Math.max(.001,yMax-yMin);
    // Identify the *true* perimeter by triangle edge usage. Coincident
    // positions are mapped together to avoid treating UV splits as cuts.
    const indices=mesh.getIndices(), canonical=new Map(), ids=[],reps=[],edgeCount=new Map();
    for(let i=0;i<len;i++){
      const key=[rest[3*i],rest[3*i+1],rest[3*i+2]].map(v=>Math.round(v*100000)).join(':');
      if(!canonical.has(key)){canonical.set(key,reps.length);reps.push(i);}
      ids.push(canonical.get(key));
    }
    if(indices)for(let i=0;i+2<indices.length;i+=3){
      const tri=[ids[indices[i]],ids[indices[i+1]],ids[indices[i+2]]];
      for(let j=0;j<3;j++){
        const a=Math.min(tri[j],tri[(j+1)%3]),b=Math.max(tri[j],tri[(j+1)%3]);
        if(a===b)continue;
        const key=a+':'+b;edgeCount.set(key,(edgeCount.get(key)||0)+1);
      }
    }
    const border=new Set();
    for(const [key,count] of edgeCount)if(count===1){
      const pair=key.split(':').map(Number);border.add(pair[0]);border.add(pair[1]);
    }
    const rim=[...border].map(id=>{
      const index=reps[id]*3;return [rest[index],rest[index+1]];
    });
    const rimWeights=new Float32Array(len),width=Math.max(.008,xMax*.28);
    if(rim.length>2)for(let i=0;i<len;i++){
      const x=rest[3*i],y=rest[3*i+1];
      let d2=Infinity;
      for(const [rx,ry] of rim){const dx=x-rx,dy=y-ry;d2=Math.min(d2,dx*dx+dy*dy);}
      const near=smooth(1-Math.sqrt(d2)/width);
      const lateral=smooth((Math.abs(x)/xMax-.23)/.24);
      rimWeights[i]=near*lateral;
    }
    console.info('Riley independent anatomical morph masks', {boundaryVertices:border.size,vertices:len,xMax,height});
    return {rest,yMin,height,xMax,rimWeights,borderCount:border.size};
  }
  const existingHinge=applyPelvicHinge;
  applyPelvicHinge = function(){
    existingHinge();
    if(!addonMesh||!hingeOriginal)return;
    if(lastMesh!==addonMesh){
      lastMesh=addonMesh;
      mask=makeMask(addonMesh,hingeOriginal.positions);
    }
    if(!mask)return;
    const vals=Object.fromEntries(specs.map(([id])=>[id,Number(q(id).value)]));
    const dl={
      outerLength:(vals.outerLength-100)/100,outerThickness:(vals.outerThickness-100)/100,
      innerLength:(vals.innerLength-100)/100,innerThickness:(vals.innerThickness-100)/100,
      hoodLength:(vals.hoodLength-100)/100,hoodThickness:(vals.hoodThickness-100)/100
    };
    if(vals.sideSeal===0&&Object.values(dl).every(v=>v===0))return;
    const data=addonMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if(!data||data.length!==mask.rest.length)return;
    const p=Array.from(data),rot=-Number(q('hingeFit').value)*Math.PI/180;
    const c=Math.cos(rot),sin=Math.sin(rot);
    const {rest,yMin,height,xMax,rimWeights}=mask;
    for(let i=0;i<p.length;i+=3){
      const j=i/3,x=rest[i],y=rest[i+1],v=(y-yMin)/height;
      const nx=Math.abs(x)/xMax;
      const outer=bump(nx,.55,.32)*bump(v,.62,.39);
      const inner=bump(nx,.23,.20)*bump(v,.53,.29);
      const hood=bump(nx,.105,.20)*bump(v,.88,.16);
      // Move affected local regions in their own axes, then rotate local
      // deltas along the hinge. Other body/attachment vertices stay untouched.
      const dy=height*(dl.outerLength*outer*(v-.62)*.38 +
        dl.innerLength*inner*(v-.53)*.46 +
        dl.hoodLength*hood*(v-.88)*.55);
      const dz=-(dl.outerThickness*outer*.008 +
        dl.innerThickness*inner*.006 +
        dl.hoodThickness*hood*.005);
      const dx=Math.sign(x)*(dl.outerThickness*outer*.002 +
        dl.innerThickness*inner*.0015 +
        dl.hoodThickness*hood*.001);
      p[i]+=dx;
      p[i+1]+=dy*c-dz*sin;
      p[i+2]+=dy*sin+dz*c;
      // Perimeter tuck comes *after* size morph, in viewer skinward depth.
      // This mask is zero around the inner labia/hood centerline.
      const edge=mask.rimWeights[j];
      p[i]-=Math.sign(p[i])*vals.sideSeal/1000*edge*.17;
      p[i+2]+=vals.sideSeal/1000*edge;
    }
    addonMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind,p,true);
    const indices=addonMesh.getIndices(),ns=addonMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    if(indices&&ns&&indices.length){
      const normals=Array.from(ns);
      BABYLON.VertexData.ComputeNormals(p,indices,normals);
      addonMesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind,normals,false);
    }
  };
  // The existing "original placement" button remains a complete reset.
  q('fitReset').addEventListener('click',()=>{
    for(const [id,,,,initial,unit] of specs){
      q(id).value=initial;q(id+'Amount').textContent=initial+unit;
    }
    applyPelvicFit();
  });
  applyPelvicFit();
})();