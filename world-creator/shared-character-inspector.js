/* WVLRP Universal 3D inspector v1. Real clip/pose controls only; never fake a rig. */
(()=>{'use strict';
function mount(){
 if(document.getElementById('wv-universal-inspector'))return;
 const mv=document.querySelector('model-viewer');
 const canvas=mv?null:document.querySelector('#renderCanvas,#scene,canvas');
 if(!mv&&!canvas)return;
 const motions=[
  ['Stand',['stand','idle']],['Walk',['walk']],['Run',['run']],['Wave',['wave']],
  ['Bend Over',['bend','bendover']],['Touch Toes',['touchtoes']],['Sit Down',['sit']],
  ['Crouch',['crouch']],['Kneel',['kneel']],['Pick Up',['pickup']],
  ['Hands & Knees',['handsandknees']],['Elbows & Knees',['elbowsandknees']],
  ['Crawl',['crawl']],['Lie Down',['liedown']],['Jump',['jump']],['Turn',['turn']]
 ];
 const views=['Full body','Face','Upper body','Pelvis','Legs','Feet','Front','Left','Right','Back','Top','Bottom','Zoom +','Zoom −','Reset camera'];
 const normalize=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const section=document.createElement('section');section.id='wv-universal-inspector';
 section.innerHTML='<details open><summary>Complete 3D controls: poses, views & movement</summary>'+
 '<p class="wv-help">All characters use the same inspection options. A pose is available only when the model actually has its animation or an existing pose controller.</p>'+
 '<h3>Camera inspection</h3><div class="wv-buttons" id="wv-views"></div>'+
 '<h3>All character poses</h3><div class="wv-buttons" id="wv-motions"></div>'+
 '<h3>Motion playback and fitting</h3><div class="wv-buttons">'+
 '<select id="wv-clips" aria-label="Actual available animations"><option value="">Waiting for clips…</option></select>'+
 '<button data-wv-action="play">Play</button><button data-wv-action="pause">Pause</button>'+
 '<button data-wv-action="hold">Hold end</button><button data-wv-action="stand">Reset / Stand</button>'+
 '<label>Speed <select id="wv-speed"><option value="0.25">¼×</option><option value="0.5">½×</option><option value="1" selected>1×</option><option value="1.5">1½×</option><option value="2">2×</option></select></label>'+
 '<label><input type="checkbox" id="wv-loop" checked> Loop</label>'+
 '<label class="wv-scrub">Frame <input id="wv-frame" type="range" min="0" max="100" step="1" value="0"></label>'+
 '<button data-wv-action="remove-all" type="button" style="background:#77532d;border-color:#e2be83;font-weight:700">Remove All (inspect fit)</button>'+
 '<button data-wv-action="restore-clothes" type="button">Restore clothing</button>'+
 '<button data-wv-action="clothes">Clothing & fitting options</button>'+
 '<button data-wv-action="reload">Reload model</button></div>'+
 '<p id="wv-message" role="status" aria-live="polite">Waiting for model initialization…</p></details>';
 const style=document.createElement('style');
 style.textContent='#wv-universal-inspector{box-sizing:border-box;max-width:1100px;margin:10px auto;padding:10px 12px;border-radius:12px;border:1px solid #779984;background:#152d22;color:#f2f8f0;font:14px system-ui,sans-serif}'+
 '#wv-universal-inspector *{box-sizing:border-box}#wv-universal-inspector summary{font-weight:700;font-size:16px;cursor:pointer;padding:5px 0}'+
 '#wv-universal-inspector .wv-help{font-size:13px;color:#cae1ce;line-height:1.5}#wv-universal-inspector h3{font-size:14px;margin:12px 0 7px}'+
 '#wv-universal-inspector .wv-buttons{display:flex;gap:7px;flex-wrap:wrap;align-items:center}'+
 '#wv-universal-inspector button,#wv-universal-inspector select{border:1px solid #88b29a;border-radius:8px;background:#29523d;color:#fff;padding:9px 10px;font:inherit;min-height:44px;cursor:pointer}'+
 '#wv-universal-inspector button:disabled{opacity:.45;cursor:not-allowed}#wv-universal-inspector button[aria-pressed=true]{background:#d4c38d;color:#17271c}'+
 '#wv-universal-inspector label{display:flex;align-items:center;gap:4px}#wv-universal-inspector #wv-clips{max-width:100%;flex:1;min-width:180px}'+
 '#wv-universal-inspector .wv-scrub{width:100%}#wv-universal-inspector #wv-frame{max-width:350px;width:70%;touch-action:auto}'+
 '#wv-universal-inspector #wv-message{color:#d1e7d6;font-size:13px;line-height:1.45}';
 document.head.append(style);
 const mountAfter=mv? (document.querySelector('model-viewer + #status')||mv) : (canvas.closest('#stage,#view')||canvas);
 mountAfter.insertAdjacentElement('afterend',section);
 const $=s=>section.querySelector(s);
 const message=$('#wv-message'),vbuttons={},pbuttons={};
 for(const v of views){
  const b=document.createElement('button');b.type='button';b.textContent=v;b.dataset.view=v;
  $('#wv-views').append(b);vbuttons[v]=b;
 }
 for(const [name] of motions){
  const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.pose=name;
  $('#wv-motions').append(b);pbuttons[name]=b;
 }
 let chosen='',ready=false,known='',lastNote='',lastScene=null;
 const fittingSnapshots=[];
 const clothingPattern=/dress|sundress|pinafore|apron|skirt|blouse|sweater|trouser|pants|shorts|shirt|sleeve|outfit|wardrobe|garment|fabric|cloth|calico|denim|corset|jacket|coat|vest|boot|shoe|sock|uniform|cloak|robe|belt|hat|glove/i;
 const bodyPattern=/body|base.?mesh|skin|human|head|face|eye|mouth|nose|anatom|vulva|pelvis|breast|hair|lash|brow|rig|bone|skeleton|ground|floor|light|camera|mannequin/i;
 const isChild=/carrie|young-explorer|jenny|laura|mary|child/i.test(location.pathname);
 const clothingName=(name)=>clothingPattern.test(name||'') && !bodyPattern.test(name||'');
 const garmentMeshes=()=>{
   const scene=sc(); if(!scene)return [];
   return (scene.meshes||[]).filter(mesh=>{
     if(!(mesh.getTotalVertices?.()>0)||mesh.isDisposed?.())return false;
     const name=mesh.name||'', materialName=mesh.material?.name||'';
     const sub=(mesh.material?.subMaterials||[]).map(x=>x?.name||'').join(' ');
     return clothingName(name)||clothingName(materialName)||clothingName(sub);
   });
 };
 const garmentMaterials=()=>{
   if(!mv?.loaded||!mv.model?.materials)return [];
   return mv.model.materials.filter(mat=>clothingName(mat.name));
 };
 // For child character inspections, do not reveal a bare anatomical mesh:
 // retain the fitted base outfit and allow only optional overlays to disappear.
 const isSafeOverlay=(name)=>/apron|overlay|outer|jacket|coat|cloak|vest|hat/i.test(name||'');
 const removeAllClothing=()=>{
   if(fittingSnapshots.length){message.textContent='Clothing already hidden. Use Restore clothing to put it back.';return;}
   let count=0;
   if(mv){
     for(const mat of garmentMaterials()){
       if(isChild&&!isSafeOverlay(mat.name))continue;
       const pbr=mat.pbrMetallicRoughness;
       if(!pbr?.setBaseColorFactor)continue;
       const color=[...(pbr.baseColorFactor||[1,1,1,1])];
       fittingSnapshots.push({kind:'mv',material:mat,rgba:color,alphaMode:mat.alphaMode});
       mat.setAlphaMode('BLEND');
       pbr.setBaseColorFactor([color[0],color[1],color[2],0]);
       count++;
     }
   }else{
     for(const mesh of garmentMeshes()){
       if(isChild&&!isSafeOverlay((mesh.name||'')+' '+(mesh.material?.name||'')))continue;
       fittingSnapshots.push({kind:'babylon',mesh,enabled:mesh.isEnabled?.()??true,visible:mesh.isVisible});
       mesh.setEnabled?.(false);
       count++;
     }
   }
   message.textContent=count?
    count+' separate clothing layer'+(count===1?'':'s')+' hidden for model-fit inspection. The original model is unchanged; Restore clothing brings everything back.':
    (isChild?'No optional outer layers could be safely removed; base clothing remains on for this child character.':
     'This GLB has no separately identified clothing layers. Garments fused into the body mesh must be separated in the 3D source before they can be hidden.');
   const btn=$('button[data-wv-action="remove-all"]');btn.setAttribute('aria-pressed',String(count>0));
 };
 const restoreClothing=()=>{
   let n=0;
   for(const item of fittingSnapshots.splice(0)){
     try{
       if(item.kind==='mv'){
         item.material.pbrMetallicRoughness.setBaseColorFactor(item.rgba);
         if(item.alphaMode)item.material.setAlphaMode(item.alphaMode);
       }else if(!item.mesh.isDisposed?.()){
         item.mesh.setEnabled?.(item.enabled);
         item.mesh.isVisible=item.visible;
       }
       n++;
     }catch(e){console.warn('Unable to restore clothing item',e);}
   }
   $('button[data-wv-action="remove-all"]').setAttribute('aria-pressed','false');
   message.textContent=n?n+' clothing layer'+(n===1?'':'s')+' restored.':'No hidden clothing layers to restore.';
 };
 const B=()=>window.BABYLON;
 const sc=()=>B()?.EngineStore?.LastCreatedScene||null;
 const cam=()=>sc()?.activeCamera;
 const groups=()=>sc()?.animationGroups||[];
 const clips=()=> mv?(mv.loaded?[...(mv.availableAnimations||[])]:[]):groups().map(g=>g.name).filter(Boolean);
 const find=(aliases)=>clips().find(c=>aliases.some(a=>normalize(c)===a||normalize(c).endsWith(a)))||null;
 const nativePose=(aliases)=>{
   const selected=[...document.querySelectorAll('[data-pose],[data-motion],[data-clip]')]
     .filter(b=>!section.contains(b)&&!b.disabled&&typeof b.click==='function');
   const hit=selected.find(b=>aliases.some(a=>normalize(b.dataset.pose||b.dataset.motion||b.dataset.clip).endsWith(a)));
   if(hit)return hit;
   const selectors={
     stand:['idle'],walk:['walk'],run:['run'],wave:['wave'],bend:['bend'],
     sit:['sit'],pickup:['pickup'],handsandknees:['hands-knees'],elbowsandknees:['elbows-knees'],crawl:['crawl']
   };
   if(!window.youngExplorerWardrobe)return null;
   for(const a of aliases)for(const id of selectors[a]||[]){
     const el=document.getElementById(id);
     if(el&&!section.contains(el)&&typeof el.onclick==='function')return el;
   }
   return null;
 };
 const bounds=()=>{
   if(mv){
    if(!mv.loaded)return null;
    const d=mv.getDimensions(),c=mv.getBoundingBoxCenter();
    return {min:{x:c.x-d.x/2,y:c.y-d.y/2,z:c.z-d.z/2},c,h:Math.max(.5,d.y),span:Math.max(.5,d.x,d.y,d.z)};
   }
   const scene=sc(),lib=B();if(!scene||!lib)return null;
   let mn=new lib.Vector3(Infinity,Infinity,Infinity),mx=new lib.Vector3(-Infinity,-Infinity,-Infinity),n=0;
   for(const m of scene.meshes||[]){
    if(!m.getTotalVertices?.()||!m.isEnabled?.()||m.isVisible===false||/ground|floor|sky|grid/i.test(m.name))continue;
    m.computeWorldMatrix(true);
    const bb=m.getBoundingInfo()?.boundingBox;if(!bb)continue;
    const len=bb.maximumWorld.subtract(bb.minimumWorld).length();if(len<.001||len>15)continue;
    mn=lib.Vector3.Minimize(mn,bb.minimumWorld);mx=lib.Vector3.Maximize(mx,bb.maximumWorld);n++;
   }
   return n?{min:mn,c:mn.add(mx).scale(.5),h:Math.max(.5,mx.y-mn.y),span:Math.max(.5,mx.subtract(mn).length())}:null;
 };
 const cameraAction=name=>{
   const box=bounds();if(!box){message.textContent='Model still loading; camera controls activate when geometry is ready.';return;}
   const parts={'Full body':.52,'Face':.91,'Upper body':.72,'Pelvis':.48,'Legs':.27,'Feet':.08,'Reset camera':.52};
   const factors={'Full body':2,'Face':.38,'Upper body':.75,'Pelvis':.50,'Legs':.68,'Feet':.38,'Reset camera':2};
   if(mv){
    const o=mv.getCameraOrbit();let az=o.theta*180/Math.PI,polar=o.phi*180/Math.PI,r=o.radius;
    if(name in parts){
     mv.cameraTarget=box.c.x+'m '+(box.min.y+box.h*parts[name])+'m '+box.c.z+'m';
     r=box.span*factors[name];az=0;polar=80;
    }
    if(name==='Front')az=0;if(name==='Left')az=-90;if(name==='Right')az=90;if(name==='Back')az=180;
    if(name==='Top')polar=5;if(name==='Bottom')polar=175;
    if(name==='Zoom +')r*=.7;if(name==='Zoom −')r*=1.4;
    mv.cameraOrbit=az+'deg '+polar+'deg '+Math.max(.12,Math.min(box.span*8,r)).toFixed(3)+'m';
    mv.jumpCameraToGoal?.();
   }else{
    const c=cam(),lib=B();if(!c||!lib)return;
    if(name in parts){
     c.setTarget?.(new lib.Vector3(box.c.x,box.min.y+box.h*parts[name],box.c.z));
     c.lowerRadiusLimit=Math.min(c.lowerRadiusLimit||.4,.3);
     c.radius=Math.max(.3,box.span*factors[name]);
     if(name==='Full body'||name==='Reset camera'){c.alpha=-Math.PI/2;c.beta=Math.PI/2.1;}
    }
    if(name==='Front')c.alpha=-Math.PI/2;if(name==='Left')c.alpha=-Math.PI;if(name==='Right')c.alpha=0;if(name==='Back')c.alpha=Math.PI/2;
    if(name==='Top')c.beta=.15;if(name==='Bottom')c.beta=Math.PI-.15;
    if(name==='Zoom +')c.radius=Math.max(c.lowerRadiusLimit||.3,c.radius*.7);
    if(name==='Zoom −')c.radius=Math.min(c.upperRadiusLimit||20,c.radius*1.4);
   }
   message.textContent='Camera: '+name+'. Drag to rotate, pinch to zoom.';
 };
 const stop=()=>{if(mv)mv.pause?.();else groups().forEach(g=>g.pause?.());};
 const play=name=>{
   if(!name)return;
   try{
    if(mv){
     mv.pause?.();mv.animationName=name;mv.currentTime=0;
     mv.timeScale=Number($('#wv-speed').value);mv.loop=$('#wv-loop').checked;mv.play();
    }else{
     groups().forEach(g=>g.stop());
     const g=groups().find(x=>x.name===name);
     if(!g)throw Error('missing animation group');
     g.start($('#wv-loop').checked,Number($('#wv-speed').value),g.from,g.to,false);
    }
    chosen=name;$('#wv-clips').value=name;$('#wv-frame').value=0;
    message.textContent='Playing '+name+' from actual exported animation.';
   }catch(err){message.textContent='Could not play '+name+': '+err.message;}
 };
 const runPose=name=>{
   const row=motions.find(p=>p[0]===name);if(!row)return;
   const found=find(row[1]);
   const native=!mv?nativePose(row[1]):null;
   if(native && (window.youngExplorerWardrobe||!found)){
    native.click();chosen='';
    message.textContent='Using existing '+name+' pose controller.';
   }else if(found){play(found);}
   else if(native){native.click();message.textContent='Using existing '+name+' pose controller.';}
   else {message.textContent=name+' is not in this character’s rig yet. No placeholder applied.';return;}
   for(const [n,b] of Object.entries(pbuttons))b.setAttribute('aria-pressed',String(name===n));
 };
 const scrub=(value)=>{
   const name=chosen||$('#wv-clips').value;if(!name)return;
   const pct=Number(value)/100;stop();
   if(mv){mv.animationName=name;mv.currentTime=(mv.duration||0)*pct;}
   else {
    const g=groups().find(x=>x.name===name);if(!g)return;
    if(!g.isStarted)g.start(false,1,g.from,g.to,false);
    g.goToFrame(g.from+(g.to-g.from)*pct);g.pause();
   }
   chosen=name;message.textContent='Holding '+name+' at '+value+'% of the motion.';
 };
 $('#wv-views').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)cameraAction(b.dataset.view);});
 $('#wv-motions').addEventListener('click',e=>{const b=e.target.closest('[data-pose]');if(b)runPose(b.dataset.pose);});
 $('#wv-clips').addEventListener('change',e=>play(e.target.value));
 $('#wv-frame').addEventListener('input',e=>scrub(e.target.value));
 section.querySelectorAll('[data-wv-action]').forEach(button=>button.onclick=()=>{
   const a=button.dataset.wvAction;
   if(a==='play'){const name=chosen||$('#wv-clips').value;if(name)play(name);else message.textContent='Choose an available clip first.';}
   if(a==='pause'){stop();message.textContent='Motion paused.';}
   if(a==='hold')scrub(100);
   if(a==='stand')runPose('Stand');
   if(a==='remove-all')removeAllClothing();
   if(a==='restore-clothes')restoreClothing();
   if(a==='clothes'){
     const element=[...document.querySelectorAll('#wardrobe,#outfits,#outfit-select,#dress,#dress-size-select,.wardrobe,#wardrobeStatus')]
       .find(el=>!section.contains(el));
     if(element){element.scrollIntoView({behavior:'smooth',block:'center'});message.textContent='Jumped to this character’s existing clothing and fitting controls.';}
     else message.textContent='This character does not have a fitted wardrobe in its current model.';
   }
   if(a==='reload'){
    if(mv){const source=new URL(mv.src,location.href);source.searchParams.set('fresh',Date.now());mv.src=source.href;}
    else location.reload();
    message.textContent='Reloading the actual 3D model…';
   }
 });
 const refresh=()=>{
   try{
    const box=bounds(),cl=clips(),signature=cl.join('|');
    ready=!!box;
    if(known!==signature){
     const current=$('#wv-clips').value;$('#wv-clips').replaceChildren(new Option(cl.length?'Choose a real animation':'No exported animations',''));
     cl.forEach(x=>$('#wv-clips').add(new Option(x,x)));if(cl.includes(current))$('#wv-clips').value=current;
     known=signature;
    }
    for(const b of Object.values(vbuttons))b.disabled=!ready;
    for(const [name,b] of Object.entries(pbuttons)){
     const aliases=motions.find(x=>x[0]===name)[1];
     b.disabled=!ready||!(find(aliases)||(!mv&&nativePose(aliases)));
     b.title=b.disabled?'Pose unavailable in this character’s current model':'Use actual rig pose';
    }
    for(const name of ['play','pause','hold'])$('button[data-wv-action="'+name+'"]').disabled=!ready||!cl.length;
    $('button[data-wv-action="stand"]').disabled=!ready||pbuttons['Stand'].disabled;
    $('#wv-clips').disabled=!ready||!cl.length;$('#wv-frame').disabled=!ready||!cl.length;
    if(ready&&!lastNote){
     message.textContent='Model ready · '+cl.length+' real animation clips · '+
      Object.values(pbuttons).filter(b=>!b.disabled).length+' available poses. Missing poses cannot be enabled until rigged.';
     lastNote='ready';
    }
   }catch(err){message.textContent='Inspector setup: '+err.message;}
 };
 if(mv){
  mv.addEventListener('load',()=>{lastNote='';refresh();});
  mv.addEventListener('error',()=>{lastNote='error';message.textContent='Model failed to load. Inspect the model file and reload.';});
 }
 refresh();
 const poll=setInterval(()=>{refresh();if(!document.body.contains(section))clearInterval(poll);},1500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();