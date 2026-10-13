/**
 * The Wild's user-approved Appalachian village.
 * Actual navigable three-dimensional log/timber architecture, not three
 * panorama cards or marker cubes. A deliberately lightweight architectural
 * approximation of the user-owned WVLRP woodland reference photography.
 */
import {COMMUNITY_SITES,WILD_TRAIL_SEGMENTS} from "./wild-reference-layout.js";
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
 function gable(name,w,wallY,peakY,z,mat){
   const m=track(new B.Mesh(name,scene));
   const p=[-w/2,wallY,z,0,peakY,z,w/2,wallY,z];
   m.setVerticesData(B.VertexBuffer.PositionKind,new Float32Array(p));
   m.setIndices([0,1,2,2,1,0]);
   const normals=[];B.VertexData.ComputeNormals(p,[0,1,2,2,1,0],normals);
   m.setVerticesData(B.VertexBuffer.NormalKind,new Float32Array(normals));
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
   box(name+" solid walnut sign",w,h,.24,x,y,z,frame);
   box(name+" lighter inset panel",w-.19,h-.15,.28,x,y,z-.035,trim);
   const tex=track(new B.DynamicTexture(name+" engraved lettering",{width:1024,height:160},scene,false));
   tex.hasAlpha=true;
   const c=tex.getContext();c.clearRect(0,0,1024,160);
   c.fillStyle="#352517";c.textAlign="center";c.textBaseline="middle";
   const font=label.length>18?68:label.length>14?76:89;
   c.font="bold "+font+"px Georgia,serif";
   c.fillText(label,512,84,985);
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
 const front=Z-d/2,back=Z+d/2;
 // Stone rubble footing, horizontal timber planks, timber end walls.
 S.box(site.name+" thick stone foundation",w+1,1.05,d+.65,X,Y+.15,Z,materials.stone);
 S.box(site.name+" entry interior",w-.15,wall-.62,d-.15,X,Y+wall/2+.6,Z,materials.timber);
 for(let h=1.30;h<wall;h+=.66){
   S.box(site.name+" staggered horizontal log course",w+.2,.16,.26,X,Y+h,front-.09,materials.frame);
   S.box(site.name+" rear log course",w+.2,.16,.24,X,Y+h,back+.10,materials.frame);
 }
 S.gable(site.name+" front timber gable",w,Y+wall, Y+peak,front,materials.timber);
 S.gable(site.name+" rear timber gable",w,Y+wall,Y+peak,back,materials.timber);
 const rise=peak-wall,span=w/2+.75,angle=Math.atan2(rise,span);
 const sloping=Math.hypot(rise,span)+.75;
 // Real 3D standing-seam metal roofing with sloped panels and ridge cap.
 S.box(site.name+" left metal roof",sloping,.22,d+1.8,X-span/2,Y+(peak+wall)/2,Z,materials.roof,angle);
 S.box(site.name+" right metal roof",sloping,.22,d+1.8,X+span/2,Y+(peak+wall)/2,Z,materials.roof,-angle);
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
 S.box(site.name+" porch roof",w+2.2,.24,porchD+1.4,X,Y+4.18,front-porchD/2,materials.roof);
 S.box(site.name+" fascia board",w+2.25,.40,.25,X,Y+4.02,porchFront-.32,materials.timber);
 for(let i=0;i<=4;i++){
   const x=X-(w/2+.55)+i*(w+1.1)/4;
   S.column(site.name+" heavy porch beam",x,Y+2.4,porchFront,.32,3.4);
   S.box(site.name+" log post foot",.85,.78,.8,x,Y+.95,porchFront,materials.stone);
   if(i<4)S.line(site.name+" natural porch truss",x,Y+3.6,porchFront,x+2,Y+4.03,porchFront,.11);
 }
 S.porchRail(site.name+" left porch",X-w/2-.38,X-w/6,porchY,porchFront);
 S.porchRail(site.name+" right porch",X+w/6,X+w/2+.38,porchY,porchFront);
 // Front steps and stone walk-in landing.
 for(let k=0;k<4;k++){
   S.box(site.name+" entry stair "+k,4.75,.17,1.06,X,Y+.68-k*.19,porchFront-.67-k*.80,materials.stone);
 }
 // Reflective multi-paned windows and center double doors.
 const doorY=Y+2.50,entryFront=front-.18;
 S.box(site.name+" central arched door",3.2,3.85,.16,X,doorY,entryFront,materials.frame);
 for(const side of [-1,1]){
   S.box(site.name+" narrow door glazing",1.03,2.4,.22,X+side*.79,doorY+.19,entryFront-.04,materials.glass);
   S.column(site.name+" brass door knob",X+side*.22,doorY-.35,entryFront-.21,.07,.12,materials.metal);
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
   station?"Ranger Station":kitchen?"Laurels Kitchen":"Mercantile and Giftshop",
   X,Y+5.35,front-1.23,station?14.7:kitchen?12.8:17.4,1.28);
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
   S.box(site.name+" central dormer",4,2.1,1.65,X,Y+wall+1.13,front+2.1,materials.timber);
   S.window(site.name+" kitchen dormer glass",X,Y+wall+1.30,front+1.24,1.35,1.55);
 }else if(!station){
   S.window(site.name+" mercantile loft glass",X,Y+wall+1.04,front+1.22,2.1,1.35);
 }else{
   S.window(site.name+" ranger loft glass",X,Y+wall+.55,front+1.23,1.3,1.1);
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
   timber:material(B,scene,track,"WV aged honey poplar","#78583b"),
   frame:material(B,scene,track,"WV deep weathered walnut","#513a29"),
   stone:material(B,scene,track,"native cut field sandstone","#777167"),
   metal:material(B,scene,track,"aged metal seams","#414d49"),
   trim:material(B,scene,track,"light Appalachian timber","#ad8760"),
   glass:material(B,scene,track,"blue smoke window panes","#3f5858",true),
   roof:material(B,scene,track,"charcoal standing seam roof","#454c49"),
   soil:material(B,scene,track,"warm crushed woodland soil","#756348"),
   brick:material(B,scene,track,"patina brick","#76533d"),
   flowers:material(B,scene,track,"native purple asters","#805e8d"),
   flowerGold:material(B,scene,track,"native goldenrod","#c6a54a"),
   leaf:material(B,scene,track,"woodland wildflower green","#425d35")
 };
 let buildings=0;
 for(const site of COMMUNITY_SITES){
   if(Math.abs(site.x-cx)>92||Math.abs(site.z-cy)>92)continue;
   buildings+=stageVillageBuilding(B,scene,track,site,cx,cy,seed,surfaceHeight,mats);
 }
 return {buildings,paths:trails(B,scene,track,{cx,cy,seed,surfaceHeight,materials:mats})};
}
