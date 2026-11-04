/** Clone-only Beverly U-shaped dark join-stroke texture repair.
 * Only changes the clone's separate transition PATCH texture.
 * Source GLB, mesh, bones, skin weights and attachment are never edited.
 */
const MARKS=[
 {width:58,points:[[392,546],[385,611],[366,667],[345,721],[315,769],[314,790],[370,814],[441,819]]},
 {width:58,points:[[633,545],[647,609],[667,666],[692,717],[729,770],[728,787],[667,811],[580,819]]},
 {width:42,points:[[439,819],[483,819]]},
 {width:42,points:[[543,819],[584,819]]}
];
export function createBeverlyJoinTextureFix(THREE,model){
 const patch=model.getObjectByName('SURG_BEVERLY__base001_1');
 const original=patch?.material,source=original?.map,image=source?.image;
 if(!patch?.isSkinnedMesh||!source||!image||image.width!==1024||image.height!==1024){
   return {available:false,reason:'Unexpected original patch material or texture'};
 }
 let replacement=null,replacementMap=null,current='original';
 function apply(){
   if(replacement){patch.material=replacement;current='clean';return {available:true,current}}
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   if(!ctx)return {available:false,reason:'Texture canvas unavailable'};
   ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,1024,1024),raw=pixels.data;
   const maskCanvas=document.createElement('canvas');maskCanvas.width=1024;maskCanvas.height=1024;
   const mctx=maskCanvas.getContext('2d',{willReadFrequently:true});
   mctx.strokeStyle='#ffffff';mctx.lineJoin='round';mctx.lineCap='round';
   for(const {points,width} of MARKS){
     mctx.lineWidth=width;mctx.beginPath();mctx.moveTo(...points[0]);
     for(let i=1;i<points.length;i++)mctx.lineTo(...points[i]);
     mctx.stroke();
   }
   const mdata=mctx.getImageData(0,0,1024,1024).data;
   const mask=new Uint8Array(1024*1024);
   for(let y=0;y<835;y++)for(let x=0;x<1024;x++){
     const i=y*1024+x;mask[i]=mdata[i*4+3]>30?1:0;
   }
   const hor=new Uint8ClampedArray(raw),ver=new Uint8ClampedArray(raw);
   for(let y=0;y<1024;y++){
     let x=0;
     while(x<1024){
       while(x<1024&&!mask[y*1024+x])x++;
       const start=x;
       while(x<1024&&mask[y*1024+x])x++;
       const end=x;
       if(start===end||start===0||end>=1024)continue;
       const l=Math.max(0,start-5),r=Math.min(1023,end+5);
       for(let xx=start;xx<end;xx++){
         const p=4*(y*1024+xx),a=4*(y*1024+l),b=4*(y*1024+r),t=(xx-l)/(r-l);
         for(let c=0;c<3;c++)hor[p+c]=raw[a+c]*(1-t)+raw[b+c]*t;
       }
     }
   }
   for(let x=0;x<1024;x++){
     let y=0;
     while(y<1024){
       while(y<1024&&!mask[y*1024+x])y++;
       const start=y;
       while(y<1024&&mask[y*1024+x])y++;
       const end=y;
       if(start===end||start===0||end>=1024)continue;
       const top=Math.max(0,start-5),bottom=Math.min(1023,end+5);
       for(let yy=start;yy<end;yy++){
         const p=4*(yy*1024+x),a=4*(top*1024+x),b=4*(bottom*1024+x),t=(yy-top)/(bottom-top);
         for(let c=0;c<3;c++)ver[p+c]=raw[a+c]*(1-t)+raw[b+c]*t;
       }
     }
   }
   let edited=0;
   for(let i=0;i<mask.length;i++)if(mask[i]){
     const p=i*4;
     for(let c=0;c<3;c++)raw[p+c]=Math.round((hor[p+c]+ver[p+c])*.5);
     edited++;
   }
   ctx.putImageData(pixels,0,0);
   replacementMap=source.clone();replacementMap.image=canvas;replacementMap.needsUpdate=true;
   replacement=original.clone();replacement.map=replacementMap;replacement.needsUpdate=true;
   patch.material=replacement;current='clean';
   return {available:true,current,editedPixels:edited};
 }
 function restore(){patch.material=original;current='original';return {available:true,current}}
 return {available:true,apply,restore,state:()=>({current,available:true})};
}
