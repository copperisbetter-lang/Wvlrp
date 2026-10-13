/* WVLRP Riley body-measured attachment size; visual/artistic fit only. */
(()=>{
'use strict';
const byId=id=>document.getElementById(id);
let breadth=.30,measured=false,seenMesh=null;
function attachmentBounds(){
 if(!hingeOriginal)return null;
 const p=hingeOriginal.positions;let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
 for(let i=0;i<p.length;i+=3){x0=Math.min(x0,p[i]);x1=Math.max(x1,p[i]);y0=Math.min(y0,p[i+1]);y1=Math.max(y1,p[i+1]);}
 const w=x1-x0,h=y1-y0;return w>.02&&w<.5?{w,h}:null;
}
function pelvicWidth(){
 const body=imported.find(m=>/Riley sculpted anatomical body/i.test(m.name)&&m.getTotalVertices?.()>8000);
 if(!body)return {value:.30,actual:false};
 try{
  const p=body.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  if(!p||p.length<24000)return {value:.30,actual:false};
  body.computeWorldMatrix(true);
  const world=body.getWorldMatrix();
  let min=Infinity,max=-Infinity,n=0;
  for(let i=0;i<p.length;i+=3){
   const v=BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(p[i],p[i+1],p[i+2]),world);
   if(v.y<.87||v.y>1.00||Math.abs(v.x)>.27)continue;
   min=Math.min(min,v.x);max=Math.max(max,v.x);n++;
  }
  if(n>=35&&max-min>=.24&&max-min<=.54)return {value:max-min,actual:true};
 }catch(e){console.warn('Could not measure mesh pelvis; using Riley reference estimate',e);}
 return {value:.30,actual:false};
}
function updateReadout(){
 const d=attachmentBounds();if(!d||!byId('rileyProportions'))return;
 const s=Number(byId('overallSize').value)/100;
 byId('rileyProportions').textContent=
 'Riley pelvic breadth: '+(breadth*100).toFixed(1)+' cm ('+
 (measured?'3D mesh cross-section':'estimated from approved body measurements')+
 '). Anatomical attachment: '+(d.w*s*100).toFixed(1)+' cm across, '+
 (d.h*s*100).toFixed(1)+' cm long ('+(100*d.w*s/breadth).toFixed(0)+
 '% of the pelvic breadth). Detailed labial contours occupy the center of this surface.';
}
function match(force){
 if(!addonMesh||!hingeOriginal)return;
 const dims=attachmentBounds();if(!dims)return;
 const body=pelvicWidth();breadth=body.value;measured=body.actual;
 if(force){
  // Keep donor attachment near 39% of actual pelvis width, within human-scale bounds.
  // We avoid the former tripled full-sheet size and instead control labia separately.
  const target=Math.min(.135,Math.max(.100,breadth*.39));
  const percent=Math.round(Math.max(90,Math.min(145,target/dims.w*100))/5)*5;
  byId('overallSize').value=percent;
  applyPelvicFit();
 }
 updateReadout();
}
window.rileyAutoFit=(initial)=>{seenMesh=addonMesh;match(initial);};
byId('rileyAutoMatch').onclick=()=>{
 if(!addonMesh){byId('rileyProportions').textContent='Riley must load before calibration.';return;}
 byId('hingeFit').value=0;byId('backFit').value=0;byId('upFit').value=0;byId('inFit').value=0;
 match(true);
};
byId('overallSize').addEventListener('input',updateReadout);
})();