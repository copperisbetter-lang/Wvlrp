/**
 * The Wild's user-approved Appalachian village.
 * Actual navigable three-dimensional log/timber architecture, not three
 * panorama cards or marker cubes. A deliberately lightweight architectural
 * approximation of the user-owned WVLRP woodland reference photography.
 */
import {COMMUNITY_SITES,WILD_TRAIL_SEGMENTS} from "./wild-reference-layout.js?v=wide-plaza-20261013-v2";
import {stageVillageCampfire} from "./wild-campfire.js?v=tapered-live-fire-20261013-v2";
import {cabinGrade} from "./wild-nature.js";
import {hash} from "./world-core.js";

function material(B,scene,track,name,hex,emissive=false){
  const m=track(new B.StandardMaterial(name,scene));
  m.diffuseColor=B.Color3.FromHexString(hex);
  m.specularColor=emissive?new B.Color3(.11,.12,.11):new B.Color3(.012,.013,.011);
  if(emissive)m.emissiveColor=B.Color3.FromHexString(hex).scale(.22);
  m.backFaceCulling=false;return m;
}
function structure(B,scene,track,materials){
 const {timber,frame,stone,metal,trim,glass,roof,soil,brick,flowers,flowerGold,leaf}=materials;
 function box(name,w,h,d,x,y,z,mat,rz=0){
   const m=track(B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene));
   m.position.set(x,y,z);m.rotation.z=rz;m.material=mat;m.isPickable=false;
   return m;
 }
 function column(name,x,y,z,r,h,mat=timber){
   const m=track(B.MeshBuilder.CreateCylinder(name,{diameter:r*2,height:h,tessellation:9},scene));
   m.position.set(x,y,z);m.material=mat;m.isPickable=false;
   return m;
 }
 function line(name,ax,ay,az,bx,by,bz,r,mat=frame){
   const dx=bx-ax,dy=by-ay,dz=bz-az,length=Math.hypot(dx,dy,dz);
   const m=track(B.MeshBuilder.CreateCylinder(name,{diameter:r*2,height:length,tessellation:8},scene));
   m.position.set((ax+bx)/2,(ay+by)/2,(az+bz)/2);
   // A vertical cylinder already points along +Y; rotate only for braces.
   if(Math.hypot(dx,dz)>1e-6){
     const axis=new B.Vector3(dz,0,-dx).normalize();
     m.rotationQuaternion=B.Quaternion.RotationAxis(axis,
       Math.acos(Math.max(-1,Math.min(1,dy/length))));
   }else if(dy<0){
     m.rotationQuaternion=B.Quaternion.RotationAxis(B.Axis.X,Math.PI);
   }
   m.material=mat;m.isPickable=false;return m;
 }
 function gable(name,w,wallY,peakY,z,mat,centerX=0){
   const m=track(new B.Mesh(name,scene));
   const p=[-w/2,wallY,z,0,peakY,z,w/2,wallY,z];
   m.setVerticesData(B.VertexBuffer.PositionKind,new Float32Array(p));
   m.setIndices([0,1,2,2,1,0]);
   const normals=[];B.VertexData.ComputeNormals(p,[0,1,2,2,1,0],normals);
   m.setVerticesData(B.VertexBuffer.NormalKind,new Float32Array(normals));
   m.position.x=centerX;
   m.material=mat;m.isPickable=false;return m;
 }
 function window(name,x,y,z,w,h){
   box(name+" dark reflective glazing",w,h,.11,x,y,z,glass);
   for(const v of [-1,1]){
     box(name+" vertical frame",.12,h+.18,.20,x+v*w/2,y,z,trim);
     box(name+" inner sash",.065,h,.22,x+v*w/7,y,z,trim);
     box(name+" horizontal frame",w+.22,.115,.20,x,y+v*h/2,z,trim);
   }
   box(name+" waist rail",w,.065,.22,x,y-.06,z,trim);
 }
 function sign(name,label,x,y,z,w,h){
   box(name+" carved sign edge",w,h,.24,x,y,z,trim);
   box(name+" deep walnut signboard",w-.19,h-.15,.28,x,y,z-.035,frame);
   const tex=track(new B.DynamicTexture(name+" engraved lettering",{width:1024,height:160},scene,false));
   tex.hasAlpha=true;
   const c=tex.getContext();c.clearRect(0,0,1024,160);
   c.save();c.translate(1024,0);c.scale(-1,1);
   c.fillStyle="#f8e5bf";c.textAlign="center";c.textBaseline="middle";
   const font=label.length>18?68:label.length>14?76:89;
   c.font="bold "+font+"px Georgia,serif";
   c.fillText(label,512,84,985);c.restore();
   tex.update();
   const mat=track(new B.StandardMaterial(name+" sign text",scene));
   mat.diffuseTexture=tex;mat.useAlphaFromDiffuseTexture=true;
   mat.emissiveColor=new B.Color3(.22,.16,.08);
   mat.backFaceCulling=false;
   const face=track(B.MeshBuilder.CreatePlane(name+" legible sign",{width:w-.42,height:h-.3},scene));
   face.position.set(x,y,z-.188);face.rotation.y=Math.PI;face.material=mat;face.isPickable=false;
 }
 function porchRail(name,left,right,y,z){
   box(name+" railing",right-left,.12,.13,(left+right)/2,y+.98,z,frame);
   for(let x=left;x<=right+.2;x+=1.2){
     box(name+" baluster",.105,.82,.11,x,y+.53,z,timber);
   }
 }
 function planter(name,x,y,z,color=flowers){
   box(name+" planter box",.93,.43,.85,x,y+.23,z,frame);
   const offsets=[[-.26,-.14],[-.03,.21],[.22,-.06]];
   for(let i=0;i<3;i++){
     const [ox,oz]=offsets[i];
     column(name+" flowering stem",x+ox,y+.72,z+oz,.045,.70,leaf);
     const head=track(B.MeshBuilder.CreateSphere(name+" flowering plant",{diameter:.46,segments:5},scene));
     head.position.set(x+ox,y+1.04+(i%2)*.16,z+oz);head.scaling.y=.64;
     head.material=i===1?flowerGold:color;head.isPickable=false;
   }
 }
 return {box,column,line,gable,window,sign,porchRail,planter};
}
function stageVillageBuilding(B,scene,track,site,cx,cy,seed,surfaceHeight,materials){
 const S=structure(B,scene,track,materials),X=site.x-cx,Z=site.z-cy;
 // The graded land platform is already baked into the actual collision terrain.
 const ground=surfaceHeight?.(site.x,site.z);
 const Y=Number.isFinite(ground)?ground:cabinGrade(site.x,site.z,seed);
 const w=site.width,d=site.depth,station=site.id==="wild-ranger-station",
  kitchen=site.id==="wild-laurels-kitchen";
 const wall=station?5.45:5.6,peak=station?10.4:kitchen?9.6:10.5;
 // Different architectural identities, on the same existing walkable plots.
 const woodFinish=station?materials.timber:kitchen?materials.kitchenWood:materials.storeWood;
 const roofFinish=station?materials.roof:kitchen?materials.kitchenRoof:materials.storeRoof;
 const trimFinish=station?materials.trim:kitchen?materials.kitchenTrim:materials.storeTrim;
 const front=Z-d/2,back=Z+d/2;
 // Stone rubble footing, horizontal timber planks, timber end walls.
 S.box(site.name+" thick stone foundation",w+1,1.05,d+.65,X,Y+.15,Z,materials.stone);
 S.box(site.name+" entry interior",w-.15,wall-.62,d-.15,X,Y+wall/2+.6,Z,woodFinish);
 for(let h=1.30;h<wall;h+=.66){
   S.box(site.name+" staggered horizontal log course",w+.2,.16,.26,X,Y+h,front-.09,station?materials.frame:woodFinish);
   S.box(site.name+" rear log course",w+.2,.16,.24,X,Y+h,back+.10,station?materials.frame:woodFinish);
 }
 S.gable(site.name+" front timber gable",w,Y+wall, Y+peak,front,woodFinish,X);
 S.gable(site.name+" rear timber gable",w,Y+wall,Y+peak,back,woodFinish,X);
 const rise=peak-wall,span=w/2+.75,angle=Math.atan2(rise,span);
 const sloping=Math.hypot(rise,span)+.75;
 // Real 3D standing-seam metal roofing with sloped panels and ridge cap.
 S.box(site.name+" left metal roof",sloping,.22,d+1.8,X-span/2,Y+(peak+wall)/2,Z,roofFinish,angle);
 S.box(site.name+" right metal roof",sloping,.22,d+1.8,X+span/2,Y+(peak+wall)/2,Z,roofFinish,-angle);
 S.box(site.name+" ridge cap",.29,.21,d+1.7,X,Y+peak+.06,Z,materials.metal);
 for(let u=2;u<sloping-1;u+=1.12){
   const dx=(span-u*Math.cos(angle));
   const yy=Y+wall+u*Math.sin(angle);
   S.box(site.name+" left raised roof seam",.045,.07,d+1.2,X-dx,yy+.11,Z,materials.metal,angle);
   S.box(site.name+" right raised roof seam",.045,.07,d+1.2,X+dx,yy+.11,Z,materials.metal,-angle);
 }
 // Massive porch and its slate/log awning.
 const porchD=station?4.45:4.65,porchY=Y+.78,porchFront=front-porchD;
 S.box(site.name+" covered porch floor",w+2,.33,porchD+1,X,porchY,front-porchD/2,materials.frame);
 S.box(site.name+" porch roof",w+2.2,.24,porchD+1.4,X,Y+4.18,front-porchD/2,roofFinish);
 S.box(site.name+" fascia board",w+2.25,.40,.25,X,Y+4.02,porchFront-.32,materials.timber);
 S.box(site.name+" weathered roof edge",w+2.1,.12,.23,X,Y+4.21,porchFront-.43,materials.trim);
 for(let i=0;i<=4;i++){
   const x=X-(w/2+.55)+i*(w+1.1)/4;
   S.column(site.name+" heavy porch beam",x,Y+2.4,porchFront,.32,3.4);
   S.box(site.name+" log post foot",.85,.78,.8,x,Y+.95,porchFront,materials.stone);
   if(i<4)S.line(site.name+" natural porch truss",x,Y+3.6,porchFront,x+2,Y+4.03,porchFront,.11);
   S.line(site.name+" handmade porch knee brace",x,Y+3.05,porchFront,
     x+(i<2?.72:-.72),Y+3.90,porchFront,.095,materials.trim);
 }
 S.porchRail(site.name+" left porch",X-w/2-.38,X-w/6,porchY,porchFront);
 S.porchRail(site.name+" right porch",X+w/6,X+w/2+.38,porchY,porchFront);
 // Front steps and stone walk-in landing.
 for(let k=0;k<4;k++){
   S.box(site.name+" entry stair "+k,4.75,.17,1.06,X,Y+.68-k*.19,porchFront-.67-k*.80,materials.stone);
 }
 // Reflective multi-paned windows and center double doors.
 // Hand-paneled doors. The handles should sit below a standing adult's eyes.
 const doorY=Y+2.70,entryFront=front-.18;
 S.box(site.name+" double door surround",3.48,4.03,.24,X,doorY,entryFront,materials.trim);
 for(const side of [-1,1]){
   const dx=X+side*.82;
   S.box(site.name+" green door panel",1.60,3.84,.15,dx,doorY,entryFront-.18,materials.door);
   S.box(site.name+" lower door panel",1.18,1.02,.17,dx,Y+1.49,entryFront-.28,materials.frame);
   S.box(site.name+" middle stile",1.38,.09,.18,dx,Y+2.12,entryFront-.30,materials.trim);
   for(const off of [-.33,.33])for(const rise of [0,.60]){
     S.box(site.name+" glazed door panes",.53,.54,.19,dx+off,
       Y+2.83+rise,entryFront-.30,materials.glass);
   }
   S.column(site.name+" brass door handle",X+side*.13,Y+1.60,entryFront-.37,.075,.12,materials.metal);
   S.window(site.name+" porch windows",X+side*(w*.29),Y+3.0,front-.26,3.0,2.7);
   S.window(site.name+" endwall windows",X+side*(w*.46),Y+3.1,Z+1.2,1.3,2.2);
 }
 // Front-facing timber truss and large visible sign (as in the photographs).
 S.line(site.name+" gable peak support",X,Y+peak-.30,front-1.0,X,Y+wall+.5,front-1.0,.18);
 for(const side of [-1,1]){
   S.line(site.name+" diagonal gable truss",X,Y+peak-.22,front-1.0,
    X+side*w*.28,Y+wall+.22,front-1.0,.19);
 }
 S.sign(site.name+" hand-lettered plaque",
   station?"Ranger Station":kitchen?"Laurel's Kitchen":"Mercantile & Gift Shop",
   X,Y+(station?5.35:kitchen?5.45:8.18),station?front-1.23:kitchen?front-1.23:front-1.65,station?14.7:kitchen?12.8:17.4,1.28);
 // Lanterns glow by day under the sheltered porch.
 for(const side of [-1,1]){
   const lx=X+side*2.45;
   S.box(site.name+" lantern mount",.22,.56,.25,lx,Y+3.70,front-.51,materials.metal);
   S.box(site.name+" glowing lantern",.19,.33,.29,lx,Y+3.67,front-.69,materials.lantern);
 }
 // A stone chimney, short porch benches and native flower tubs.
 const chX=X+(station?-.36:-.34)*w, chZ=Z+d*.22;
 S.box(site.name+" Appalachian stone chimney",2.2,peak-1.2,2.6,chX,Y+(peak+1.0)/2,chZ,materials.stone);
 S.box(site.name+" chimney cap",2.57,.25,2.91,chX,Y+peak-.02,chZ,materials.trim);
 for(const side of [-1,1]){
   const px=X+side*w*.42,pz=porchFront-.62;
   S.planter(site.name+" porch flowers",px,Y+.2,pz,kitchen?materials.flowers:materials.flowerGold);
   S.box(site.name+" hand-hewn seat",2.75,.19,.74,
     X+side*w*.36,Y+.60,porchFront-3.0,materials.frame);
 }
 // Kitchen: an additional front dormer and garden edge, Mercantile: upstairs
 // broad windows and business-like porch, Ranger: center loft windows.
 if(kitchen){
   S.box(site.name+" central dormer",4,2.1,1.65,X,Y+wall+1.13,front+2.1,woodFinish);
   S.window(site.name+" kitchen dormer glass",X,Y+wall+1.30,front+1.24,1.35,1.55);
 }else if(!station){
   S.window(site.name+" mercantile loft glass",X,Y+wall+1.04,front+1.22,2.1,1.35);
 }else{
   S.window(site.name+" ranger loft glass",X,Y+wall+.55,front+1.23,1.3,1.1);
 }

 // Local details are decorative; foundations, entrances, original world-marker
 // coordinates, walk controls and network synchronization are unchanged.
 if(kitchen){
   // Cottage board-and-batten detailing, window shutters, herbs and flowers.
   for(let i=0;i<15;i++){
     const x=X-w*.46+i*w*.92/14;
     if(Math.abs(x-X)<2.2||Math.abs(Math.abs(x-X)-w*.29)<2.2)continue;
     S.box(site.name+" vertical cottage batten "+i,.12,wall-1.12,.22,
       x,Y+wall*.56,front-.24,trimFinish);
   }
   for(const side of [-1,1]){
     const x=X+side*w*.29;
     for(const sh of [-1,1])S.box(site.name+" painted window shutter",
        .44,2.7,.20,x+sh*1.77,Y+3.0,front-.40,materials.kitchenShutter);
     S.planter(site.name+" blooming window herb trough",x,Y+1.55,front-.8,materials.flowers);
     S.planter(site.name+" porch herb garden",X+side*w*.43,Y+.15,porchFront-1.8,materials.flowers);
   }
   S.box(site.name+" kitchen roof ridge trim",.34,.26,d+2,X,Y+peak+.09,Z,trimFinish);
 }else if(station){
   // The ranger lodge is the substantial stone-and-timber central landmark.
   for(const side of [-1,1]){
     S.box(site.name+" carved timber porch brace",1.22,.42,.55,
       X+side*w*.39,Y+3.72,porchFront,materials.trim);
     S.box(site.name+" solid entrance sandstone pier",1.0,1.12,1.0,
       X+side*(w*.5+.45),Y+1.05,porchFront,materials.stone);
   }
   S.box(site.name+" ranger stone and timber crest base",2.5,1.1,.33,
     X,Y+7.6,front-1.21,materials.frame);
 }else{
   // Mercantile: unmistakable old-fashioned false-front general store.
   // Facade fronts the real roof; visually different silhouette than gables.
   S.box(site.name+" old general-store raised false-front",w+.95,3.8,.46,
     X,Y+7.25,front-1.13,woodFinish);
   S.box(site.name+" storefront top coping",w+1.3,.34,.73,
     X,Y+9.31,front-1.28,trimFinish);
   S.box(site.name+" storefront top inset band",w*.87,.18,.52,
     X,Y+8.90,front-1.43,materials.frame);
   for(let j=0;j<19;j++){
      S.box(site.name+" vertical cedar storefront board "+j,.13,3.54,.19,
        X-w*.46+j*w*.92/18,Y+7.22,front-1.43,trimFinish);
   }
   // Store sign is mounted in front of the false-front, not buried inside it.
   S.sign(site.name+" main painted trading-post sign","Mercantile & Gift Shop",
     X,Y+8.22,front-1.75,w*.77,1.25);
   for(const side of [-1,1]){
     const x=X+side*w*.35;
     S.box(site.name+" broad store display window",3.90,2.84,.20,
       x,Y+2.75,front-.54,materials.glass);
     S.box(site.name+" window display shelf",4.18,.24,1.05,
       x,Y+1.42,front-1.12,materials.frame);
     for(let j=0;j<3;j++)S.box(site.name+" local goods crates "+j,
       .80,.62,.68,x+(j-1)*1.08,Y+1.86,front-1.24,materials.storeTrim);
   }
   for(const side of [-1,1]){
      S.box(site.name+" trading post barrel",.83,1.25,.83,
        X+side*w*.44,Y+.78,porchFront-1.18,materials.frame);
   }
 }
 return 1;
}
function trails(B,scene,track,{cx,cy,seed,surfaceHeight,materials}){
 let rendered=0;
 for(const [pathIndex,waypoints] of WILD_TRAIL_SEGMENTS.entries()){
   const samples=[];
   for(let i=1;i<waypoints.length;i++){
     const a=waypoints[i-1],b=waypoints[i],length=Math.hypot(a[0]-b[0],a[1]-b[1]);
     const steps=Math.max(2,Math.ceil(length/1.1));
     for(let j=0;j<steps;j++){
       const t=j/steps;
       const x=a[0]*(1-t)+b[0]*t,z=a[1]*(1-t)+b[1]*t;
       if(Math.abs(x-cx)>96||Math.abs(z-cy)>96)continue;
       const h=surfaceHeight?.(x,z);
       if(!Number.isFinite(h))continue;
       samples.push({x,z,h,w:1.24+.19*Math.sin(x*.34+pathIndex*3)+.16*Math.sin(z*.23)});
     }
   }
   if(samples.length<2)continue;
   const verts=[],indices=[],uvs=[];
   for(let i=0;i<samples.length;i++){
     const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)];
     const dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz)||1;
     const p=samples[i],px=-dz/n,pz=dx/n;
     for(const sign of [-1,1]){
       const x=p.x+px*sign*p.w,z=p.z+pz*sign*p.w;
       const h=surfaceHeight?.(x,z);
       verts.push(x-cx,(Number.isFinite(h)?h:p.h)+.068,z-cy);
       uvs.push(i*.19,sign>0?1:0);
     }
     if(i)indices.push(2*i-2,2*i-1,2*i,2*i-1,2*i+1,2*i);
   }
   const m=track(new B.Mesh("leaf strewn winding footpath "+pathIndex,scene));
   m.setVerticesData(B.VertexBuffer.PositionKind,new Float32Array(verts));
   m.setVerticesData(B.VertexBuffer.UVKind,new Float32Array(uvs));
   const normals=[];B.VertexData.ComputeNormals(verts,indices,normals);
   m.setVerticesData(B.VertexBuffer.NormalKind,new Float32Array(normals));
   m.setIndices(indices);m.material=materials.soil;m.isPickable=false;rendered++;
 }
 return rendered;
}
export function renderWildVillage(B,scene,track,{cx,cy,seed,surfaceHeight}){
 const mats={
   kitchenWood:material(B,scene,track,"Laurel honey cottage timber","#b58c62"),
   kitchenRoof:material(B,scene,track,"Laurel weathered brown shingle","#62544a"),
   kitchenTrim:material(B,scene,track,"Laurel cream cabin trim","#c6a47c"),
   kitchenShutter:material(B,scene,track,"Laurel sage shutters","#60765c"),
   storeWood:material(B,scene,track,"mercantile aged reddish cedar","#80503c"),
   storeRoof:material(B,scene,track,"mercantile dark weathered tin","#565351"),
   storeTrim:material(B,scene,track,"mercantile warm timber edging","#ac8161"),

   timber:material(B,scene,track,"WV aged honey poplar","#78583b"),
   frame:material(B,scene,track,"WV deep weathered walnut","#513a29"),
   stone:material(B,scene,track,"native cut field sandstone","#777167"),
   metal:material(B,scene,track,"aged metal seams","#414d49"),
   trim:material(B,scene,track,"light Appalachian timber","#ad8760"),
   glass:material(B,scene,track,"deep glazed forest reflections","#24352e"),
   roof:material(B,scene,track,"charcoal standing seam roof","#454c49"),
   soil:material(B,scene,track,"warm crushed woodland soil","#756348"),
   brick:material(B,scene,track,"patina brick","#76533d"),
   flowers:material(B,scene,track,"native purple asters","#805e8d"),
   flowerGold:material(B,scene,track,"native goldenrod","#c6a54a"),
   leaf:material(B,scene,track,"woodland wildflower green","#425d35"),
   door:material(B,scene,track,"heritage forest-green doors","#24423a"),
   lantern:material(B,scene,track,"warm amber porch lantern","#ffbe58",true)
 };
 // Material-specific, irregular surfaces. Flat one-color boxes were making
 // all three buildings read as the same generic low-poly structure.
 // These procedural textures are baked ONCE and reused across the settlement.
 function surfaceTexture(name,w,h,paint){
   const tex=track(new B.DynamicTexture(name,{width:w,height:h},scene,false,
     B.Texture.BILINEAR_SAMPLINGMODE));
   const c=tex.getContext();paint(c,w,h);
   tex.update(false);
   tex.wrapU=B.Texture.WRAP_ADDRESSMODE;
   tex.wrapV=B.Texture.WRAP_ADDRESSMODE;
   return tex;
 }
 function rand(i,s=0){
   const a=Math.sin(i*128.1+s*311.7+42.8)*43758.5453;
   return a-Math.floor(a);
 }
 const woodgrain=surfaceTexture("varied aged Appalachian board grain",256,512,(c,w,h)=>{
   c.fillStyle="#e5dfd1";c.fillRect(0,0,w,h);
   // Each broad band has its own wood tone, weathering and checking.
   for(let y=0;y<h;y+=34){
     const v=Math.floor(201+rand(y,1)*41);
     c.fillStyle=`rgb(${v},${Math.max(0,v-9)},${Math.max(0,v-24)})`;
     c.fillRect(0,y,w,33);
     c.fillStyle="#43342575";c.fillRect(0,y+32,w,2);
     c.fillStyle="#f4e6c34c";c.fillRect(0,y+3,w,2);
   }
   for(let i=0;i<930;i++){
     const x=rand(i,3)*w,y=rand(i,4)*h;
     c.strokeStyle=i%9===0?"#3b292d63":i%3===0?"#6453424d":"#fff8e933";
     c.lineWidth=.30+rand(i,5)*1.2;
     c.beginPath();c.moveTo(x,y);
     c.bezierCurveTo(x+3,y+6,x-5,y+14,x+2,y+36+rand(i,6)*50);
     c.stroke();
   }
 });
 const fieldstone=surfaceTexture("native split sandstone fieldstone and mortar",512,512,(c,w,h)=>{
   c.fillStyle="#4d4b45";c.fillRect(0,0,w,h);
   let row=0;
   for(let y=-23;y<h+32;){
     const rh=37+Math.floor(rand(row,20)*33),offset=(row%2)*37;
     for(let x=-90+offset,i=0;x<w+90;i++){
       const rw=51+Math.floor(rand(row*41+i,21)*67);
       const jitter=rand(row*27+i,22);
       const pale=170+Math.floor(rand(row*73+i,23)*53);
       const r=Math.floor(pale*.98),g=Math.floor(pale*.97),b=Math.floor(pale*.89);
       c.fillStyle=`rgb(${r},${g},${b})`;
       c.beginPath();
       c.moveTo(x+4,y+4+jitter*2);
       c.lineTo(x+rw-4,y+4+rand(i,24)*4);
       c.lineTo(x+rw-2,y+rh-8);
       c.lineTo(x+rw-7,y+rh-4);
       c.lineTo(x+3,y+rh-5);
       c.closePath();c.fill();
       c.strokeStyle="#fff8e15a";c.lineWidth=1.3;
       c.beginPath();c.moveTo(x+6,y+6);c.lineTo(x+rw*.75,y+7);c.stroke();
       c.strokeStyle="#35393675";c.lineWidth=2;
       c.beginPath();c.moveTo(x+7,y+rh-7);c.lineTo(x+rw-7,y+rh-7);c.stroke();
       // Mineral flecks and weathered pores in each large fieldstone.
       for(let k=0;k<16;k++){
         const px=x+9+rand(i*71+k,row)*Math.max(2,rw-18),
           py=y+9+rand(i*31+k,row+1)*Math.max(2,rh-18);
         c.fillStyle=k%3===0?"#43494540":"#faf7de40";
         c.fillRect(px,py,.8+rand(k,i)*2.5,.8+rand(k,i+1)*1.8);
       }
       x+=rw+3;
     }
     y+=rh+2;row++;
   }
 });
 const shingles=surfaceTexture("irregular hand-laid slate shingle roofs",512,512,(c,w,h)=>{
   c.fillStyle="#b2b0a4";c.fillRect(0,0,w,h);
   const sh=22;
   for(let row=0;row<Math.ceil(h/sh);row++){
     const y=row*sh,offset=(row%2)*24;
     for(let x=-60+offset,i=0;x<w+60;i++){
       const rw=37+Math.floor(rand(i+row*17,40)*31);
       const v=128+Math.floor(rand(i+row*31,41)*75);
       c.fillStyle=`rgb(${v},${v+1},${Math.max(0,v-4)})`;
       c.fillRect(x+1,y+1,rw-2,sh-2);
       c.fillStyle="#292e2c46";c.fillRect(x+2,y+sh-4,rw-2,3);
       c.strokeStyle="#f1ead447";c.lineWidth=1;
       c.beginPath();c.moveTo(x+4,y+4);c.lineTo(x+rw-3,y+4);c.stroke();
       x+=rw;
     }
   }
 });
 const leafTrail=surfaceTexture("village crushed soil natural fallen leaf path",256,256,(c,w,h)=>{
   c.fillStyle="#aaa08a";c.fillRect(0,0,w,h);
   for(let i=0;i<4300;i++){
     const x=rand(i,51)*w,y=rand(i,52)*h;
     const l=2+rand(i,53)*8,a=rand(i,54)*Math.PI*2;
     c.save();c.translate(x,y);c.rotate(a);
     c.fillStyle=["#655b3e","#a38451","#85744b","#5f6546","#cac099"][i%5];
     c.beginPath();c.moveTo(0,-l*.55);
     c.quadraticCurveTo(l*.46,0,0,l*.52);
     c.quadraticCurveTo(-l*.46,0,0,-l*.55);
     c.fill();c.restore();
   }
   for(let i=0;i<1100;i++){
     c.fillStyle=i%2?"#b8b8ad9b":"#64695d82";
     c.beginPath();c.arc(rand(i,55)*w,rand(i,56)*h,.25+rand(i,57)*1.5,0,Math.PI*2);c.fill();
   }
 });
 for(const mat of [mats.timber,mats.frame,mats.trim,mats.door,mats.kitchenWood,
   mats.kitchenTrim,mats.storeWood,mats.storeTrim,mats.kitchenShutter])
   mat.diffuseTexture=woodgrain;
 mats.stone.diffuseTexture=fieldstone;
 for(const mat of [mats.roof,mats.kitchenRoof,mats.storeRoof])mat.diffuseTexture=shingles;
 mats.soil.diffuseTexture=leafTrail;
 mats.glass.specularColor=new B.Color3(.32,.36,.33);
 mats.glass.specularPower=95;
 mats.glass.emissiveColor=new B.Color3(.018,.027,.021);
 let buildings=0;
 for(const site of COMMUNITY_SITES){
   if(Math.abs(site.x-cx)>92||Math.abs(site.z-cy)>92)continue;
   buildings+=stageVillageBuilding(B,scene,track,site,cx,cy,seed,surfaceHeight,mats);
 }
 const firePits=stageVillageCampfire(B,scene,track,{cx,cy,seed,surfaceHeight,materials:mats});
 return {buildings,firePits,
   paths:trails(B,scene,track,{cx,cy,seed,surfaceHeight,materials:mats})};
}
