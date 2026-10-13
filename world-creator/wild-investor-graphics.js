/**
 * The Wild / Hearthside investor visual pass.
 * Purely local deterministic art assets: bark grain, fallen-leaf litter,
 * tree-root structure and layered thickets. No runtime image CDN dependency.
 * Still a procedural 3D demo, not a photogrammetric scan.
 */
import { hash, noise } from "./world-core.js";
import { cabinGrade, biomeAt, waterAt } from "./wild-nature.js";

const TAU=Math.PI*2;
const speciesColor={
 "american-sycamore":[.76,.73,.63],"river-birch":[.60,.48,.37],
 "american-beech":[.55,.56,.51],"eastern-hemlock":[.34,.27,.22],
 "eastern-white-pine":[.43,.32,.25],"virginia-pine":[.47,.30,.20],
 "white-oak":[.49,.39,.30],"northern-red-oak":[.39,.33,.28],
 "chestnut-oak":[.43,.35,.28],"tulip-poplar":[.51,.42,.32]
};
const treePalette={
 "tulip-poplar":{h:29,r:4.3,start:.46,shade:[.36,.51,.22]},
 "white-oak":{h:24,r:6.1,start:.31,shade:[.31,.43,.22]},
 "northern-red-oak":{h:26,r:5.8,start:.35,shade:[.34,.46,.21]},
 "chestnut-oak":{h:23,r:5.2,start:.34,shade:[.36,.45,.23]},
 "sugar-maple":{h:25,r:4.9,start:.34,shade:[.31,.51,.25]},
 "red-maple":{h:22,r:4.6,start:.40,shade:[.35,.52,.23]},
 "american-beech":{h:25,r:4.6,start:.44,shade:[.39,.53,.30]},
 "black-cherry":{h:24,r:4.3,start:.43,shade:[.30,.42,.21]},
 "shagbark-hickory":{h:27,r:4.3,start:.40,shade:[.34,.45,.20]},
 "eastern-hemlock":{h:25,r:5.6,start:.15,shade:[.18,.38,.29],needle:true},
 "eastern-white-pine":{h:29,r:5.0,start:.22,shade:[.26,.42,.32],needle:true},
 "virginia-pine":{h:20,r:4.2,start:.26,shade:[.26,.39,.27],needle:true},
 "american-sycamore":{h:30,r:6.5,start:.32,shade:[.35,.52,.26]},
 "river-birch":{h:23,r:4.6,start:.34,shade:[.35,.52,.27]},
 "black-walnut":{h:26,r:5.7,start:.38,shade:[.30,.46,.23]}
};
function seeded(seed){
 let state=(seed|0)>>>0;
 return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function clamp(x){return Math.max(0,Math.min(255,Math.round(x)));}
function tex(B,scene,track,label,w,h,pixel,drawExtra){
 const dt=track(new B.DynamicTexture(label,{width:w,height:h},scene,false,B.Texture.BILINEAR_SAMPLINGMODE));
 const ctx=dt.getContext(),data=ctx.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const p=(y*w+x)*4,c=pixel(x,y,w,h);
   data.data[p]=clamp(c[0]);data.data[p+1]=clamp(c[1]);
   data.data[p+2]=clamp(c[2]);data.data[p+3]=255;
 }
 ctx.putImageData(data,0,0);
 if(drawExtra)drawExtra(ctx,w,h);
 dt.update(false);
 dt.wrapU=B.Texture.WRAP_ADDRESSMODE;
 dt.wrapV=B.Texture.WRAP_ADDRESSMODE;
 return dt;
}
export function createForestSurfaceTextures(B,scene,track,seed){
 const rand=seeded(seed+3713);
 const bark=tex(B,scene,track,"relief oak and hemlock bark",256,512,(x,y)=>{
   const longitudinal=Math.sin(x*.095+Math.sin(y*.021)*1.2)*.52+
     Math.sin(x*.26+Math.sin(y*.015)*2.2)*.25+
     Math.sin(x*.67+y*.035)*.12;
   const cracks=Math.pow(Math.max(0,.55-longitudinal),2)*75;
   const coarse=hash(x>>2,y>>2,seed+14)*18;
   const grain=hash(x,y,seed+16)*13;
   const lichen=noise(x/39,y/29,seed+320)>.73?22:0;
   const value=142+longitudinal*38-cracks+coarse+grain+lichen;
   return [value,value*.96,value*.87];
 },(ctx,w,h)=>{
   const rng=seeded(seed+621);
   for(let i=0;i<400;i++){
     const x=rng()*w,y=rng()*h;
     ctx.strokeStyle=rng()>.5?"#342b21a0":"#e2d7bd4d";
     ctx.lineWidth=.4+rng()*1.5;ctx.beginPath();ctx.moveTo(x,y);
     ctx.lineTo(x+(-2+rng()*4),y+8+rng()*29);ctx.stroke();
   }
 });
 const duff=tex(B,scene,track,"Appalachian leaf litter photographic-style texture",512,512,(x,y)=>{
   const large=noise(x/83,y/72,seed+200);
   const small=noise(x/11,y/11,seed+201);
   const sand=hash(x,y,seed+202)*29;
   const damp=large>.60?-.12:0;
   const r=(83+50*large+28*small+sand)*(1+damp);
   const g=(77+35*large+23*small+sand*.70)*(1+damp);
   const b=(55+26*large+18*small+sand*.55)*(1+damp);
   return [r,g,b];
 },(ctx,w,h)=>{
   const rng=seeded(seed+812);
   // Leaf-shaped silhouettes of mixed oak, maple, beech and poplar.
   for(let i=0;i<6700;i++){
     const x=rng()*w,y=rng()*h,angle=rng()*TAU;
     const length=1.8+rng()*7.0,width=.32+rng()*2.4;
     const hue=rng();
     ctx.save();ctx.translate(x,y);ctx.rotate(angle);
     ctx.fillStyle=hue<.24?"#5e5030ad":hue<.49?"#795737ac":
       hue<.70?"#9a7345a2":hue<.85?"#514b2faa":"#6e6b3da0";
     ctx.beginPath();ctx.moveTo(0,-length);
     ctx.quadraticCurveTo(width*1.7,-length*.18,0,length);
     ctx.quadraticCurveTo(-width*1.7,-length*.18,0,-length);
     ctx.fill();ctx.restore();
   }
   for(let i=0;i<900;i++){
     const x=rng()*w,y=rng()*h,len=2+rng()*24,a=rng()*TAU;
     ctx.strokeStyle=rng()>.6?"#3b2c1a9a":"#ac93645c";
     ctx.lineWidth=.5+rng()*1.4;ctx.beginPath();ctx.moveTo(x,y);
     ctx.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);ctx.stroke();
   }
 });
 return {bark,duff};
}
function mesh(B,scene,track,name,vertices,indices,colors,uvs){
 const m=track(new B.Mesh(name,scene));
 m.setVerticesData(B.VertexBuffer.PositionKind,new Float32Array(vertices));
 const normals=[];B.VertexData.ComputeNormals(vertices,indices,normals);
 m.setVerticesData(B.VertexBuffer.NormalKind,new Float32Array(normals));
 if(colors?.length)m.setVerticesData(B.VertexBuffer.ColorKind,new Float32Array(colors));
 if(uvs?.length)m.setVerticesData(B.VertexBuffer.UVKind,new Float32Array(uvs));
 m.setIndices(indices);m.alwaysSelectAsActiveMesh=true;return m;
}
function segment(vertices,indices,colors,uvs,a,b,r0,r1,sides,col,height){
 const delta=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
 const d=Math.hypot(...delta)||1,u=delta.map(v=>v/d);
 let v=[-u[2],0,u[0]],vl=Math.hypot(...v);
 if(vl<.1){v=[1,0,0];vl=1;}v=v.map(x=>x/vl);
 const w=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 const at=vertices.length/3;
 for(let ring=0;ring<2;ring++)for(let j=0;j<sides;j++){
   const ang=j*TAU/sides,c=Math.cos(ang),sn=Math.sin(ang);
   const p=ring?b:a,r=ring?r1:r0;
   vertices.push(p[0]+r*(v[0]*c+w[0]*sn),
     p[1]+r*(v[1]*c+w[1]*sn),p[2]+r*(v[2]*c+w[2]*sn));
   const shade=.77+.14*c+.12*sn;
   colors.push(...col.map(z=>z*shade),1);
   uvs.push(j/sides*2.2,(p[1]/height)*4.8);
 }
 for(let j=0;j<sides;j++){
   const n=(j+1)%sides;
   indices.push(at+j,at+sides+j,at+n,at+n,at+sides+j,at+sides+n);
 }
}
function leaf(vertices,indices,colors,at,tip,width,shade,rand,needle){
 const dir=[tip[0]-at[0],tip[1]-at[1],tip[2]-at[2]],d=Math.hypot(dir[0],dir[2])||1;
 const perp=[-dir[2]/d,dir[0]/d],w=width*(.8+rand()*.45);
 const m=[at[0]*.35+tip[0]*.65,at[1]*.35+tip[1]*.65+.09,at[2]*.35+tip[2]*.65];
 const p1=[m[0]+perp[0]*w,m[1],m[2]+perp[1]*w],
   p2=[m[0]-perp[0]*w,m[1],m[2]-perp[1]*w];
 const begin=vertices.length/3;
 vertices.push(...at,...p1,...tip,...p2);
 indices.push(begin,begin+1,begin+2,begin,begin+2,begin+3);
 const colorScale=.64+rand()*.56;
 for(let i=0;i<4;i++)colors.push(
   Math.min(1,shade[0]*colorScale),Math.min(1,shade[1]*colorScale),
   Math.min(1,shade[2]*colorScale),1);
}
/** Rounded, crooked old trunks with buttress roots, broken side limbs and
 * varied tiered canopies. Two different seed variants avoid copy-paste rows. */
export function buildHeroTree(B,scene,track,species,seed,variant,textures){
 const p=treePalette[species]||treePalette["white-oak"];
 const rand=seeded(seed+variant*143337+species.length*113);
 const conifer=!!p.needle,h=p.h,r=p.r;
 const bV=[],bI=[],bC=[],bUV=[],lV=[],lI=[],lC=[];
 const bark=speciesColor[species]||[.47,.38,.29];
 const curve=variant===0?1:-1;
 const bendX=(y)=>curve*(y/h)**1.8*(.55+randSeedBend*.7);
 const bendZ=(y)=>(y/h)**1.5*(variant===0?-.44:.63);
 const randSeedBend=rand();
 // Multi-section curved trunk, wide buttress base, tapered fork.
 const cuts=[0,.38,1.1,2.7,h*.22,h*.42,h*.62,h*.79,h*.90,h];
 const origin=(y)=>[bendX(y),y,bendZ(y)];
 for(let i=0;i<cuts.length-1;i++){
   const y0=cuts[i],y1=cuts[i+1],k=i/(cuts.length-1);
   const taper=(y)=>Math.max(.055,.43*(1-y/(h*1.08)));
   segment(bV,bI,bC,bUV,origin(y0),origin(y1),
     taper(y0)*(i===0?2.4:i===1?1.54:1),
     taper(y1)*(i===0?1.56:i===1?1.10:1),
     10,bark,h);
 }
 // Roots radiate naturally across the duff, not upright pencil posts.
 for(let k=0;k<7;k++){
   const ang=TAU*k/7+rand()*.45,reach=.8+rand()*1.3;
   const p0=[Math.cos(ang)*.24,.20,Math.sin(ang)*.24];
   const p1=[Math.cos(ang)*reach*.55,.16,Math.sin(ang)*reach*.55];
   const p2=[Math.cos(ang)*reach,-.01,Math.sin(ang)*reach];
   segment(bV,bI,bC,bUV,p0,p1,.22,.10,6,bark,h);
   segment(bV,bI,bC,bUV,p1,p2,.10,.008,5,bark,h);
 }
 const limbs=conifer?23:variant===0?20:17;
 for(let i=0;i<limbs;i++){
   const u=i/(limbs-1),level=p.start+u*(conifer?.76:.59),y=h*level;
   const a=i*2.39996323+rand()*.6;
   const width=r*(conifer?Math.pow(1-u,.80)*(.58+rand()*.4):
     (.50+.55*rand())*(.84+.32*Math.sin(u*Math.PI)));
   const start=origin(y),elbow=[
     start[0]+Math.cos(a)*width*.48,y+h*(conifer?-.023:.046),
     start[2]+Math.sin(a)*width*.48
   ];
   const end=[start[0]+Math.cos(a)*width,
     y+h*(conifer?-.064:.08)+(rand()-.5)*.32,
     start[2]+Math.sin(a)*width];
   segment(bV,bI,bC,bUV,start,elbow,conifer?.065:.095,.043,6,bark,h);
   segment(bV,bI,bC,bUV,elbow,end,.046,.009,5,bark,h);
   if(!conifer&&i%5===0){
     const forkA=a+(.35+rand()*.8)*(i%2?-1:1);
     const fork=[start[0]+Math.cos(forkA)*width*.94,end[1]+.4,
       start[2]+Math.sin(forkA)*width*.94];
     segment(bV,bI,bC,bUV,elbow,fork,.035,.007,5,bark,h);
   }
   const branchCount=conifer?4:5;
   for(let c=0;c<branchCount;c++){
     const f=.39+c*.15,center=[
       start[0]+(end[0]-start[0])*f,
       start[1]+(end[1]-start[1])*f,
       start[2]+(end[2]-start[2])*f
     ];
     const leaves=conifer?9:8;
     for(let j=0;j<leaves;j++){
       const phase=TAU*(j/leaves)+rand()*.30;
       const spread=conifer?.45:.75,dist=(.20+rand()*.8)*spread;
       const tip=[center[0]+Math.cos(phase)*dist,
         center[1]+(rand()-.35)*(conifer?.48:.71),
         center[2]+Math.sin(phase)*dist];
       leaf(lV,lI,lC,center,tip,conifer?.027:.11,p.shade,rand,conifer);
     }
   }
 }
 if(!conifer){
   for(let j=0;j<45;j++){
     const a=rand()*TAU,d=rand()*r*.53,y=h*(.80+rand()*.18);
     const center=[bendX(y)+Math.cos(a)*d,y,bendZ(y)+Math.sin(a)*d];
     for(let q=0;q<4;q++){
       const ang=a+q*TAU/4,dist=.30+rand()*.55;
       leaf(lV,lI,lC,center,[center[0]+Math.cos(ang)*dist,
         center[1]+(rand()-.5)*.55,center[2]+Math.sin(ang)*dist],
         .10,p.shade,rand,false);
     }
   }
 }
 const trunk=mesh(B,scene,track,species+" irregular bark "+variant,bV,bI,bC,bUV);
 const tm=track(new B.StandardMaterial(species+" weathered bark "+variant,scene));
 tm.diffuseColor=new B.Color3(1,1,1);
 tm.diffuseTexture=textures.bark;
 tm.specularColor=new B.Color3(.012,.012,.010);
 tm.useVertexColors=true;tm.backFaceCulling=false;trunk.material=tm;
 const foliage=mesh(B,scene,track,species+" broken crown "+variant,lV,lI,lC);
 const lm=track(new B.StandardMaterial(species+" multi-tone canopy "+variant,scene));
 lm.diffuseColor=new B.Color3(.82,.94,.72);
 lm.specularColor=new B.Color3(.015,.028,.015);
 lm.useVertexColors=true;lm.backFaceCulling=false;
 foliage.material=lm;
 return {bark:trunk,foliage,vertices:bV.length/3+lV.length/3};
}
function detailPrototype(B,scene,track,kind){
 const rand=seeded(711+kind.length*69),v=[],ids=[],colors=[];
 const palette=kind==="fern-field"?[.28,.49,.20]:
   kind==="rhododendron-mass"?[.19,.35,.19]:
   kind==="stiltgrass"?[.32,.46,.20]:
   kind==="sapling"?[.32,.47,.25]:[.33,.45,.18];
 function quad(points,base){
   const at=v.length/3;
   for(const pt of points){v.push(...pt);
     const shade=.68+rand()*.54;colors.push(...base.map(x=>x*shade),1);}
   ids.push(at,at+1,at+2,at,at+2,at+3);
 }
 const n=kind==="rhododendron-mass"?28:kind==="fern-field"?35:
   kind==="sapling"?20:kind==="briar-tangle"?25:34;
 for(let i=0;i<n;i++){
   const angle=TAU*(i/n)+rand()*.4,r=.2+rand()*.88;
   const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
   const tall=kind==="rhododendron-mass"?1.20:kind==="sapling"?1.4:
     kind==="fern-field"?.58:kind==="briar-tangle"?.97:.46;
   const h=tall*(.5+rand()*.65);
   const reach=.18+rand()*.39,dx=Math.cos(angle)*reach,dz=Math.sin(angle)*reach;
   const wid=kind==="fern-field"?.09:kind==="rhododendron-mass"?.18:.072;
   quad([[x,.035,z],[x-wid,h*.63,z+.02],[x+dx,h,z+dz],
     [x+wid,h*.58,z-.02]],palette);
   if(kind==="rhododendron-mass"||kind==="sapling"){
     quad([[x,h*.56,z],[x+wid,h*.80,z-wid],
       [x-dz*.45,h+.10,z+dx*.45],[x-wid,h*.75,z+wid]],palette);
   }
 }
 const m=mesh(B,scene,track,"WV near-canopy floor "+kind,v,ids,colors);
 const mat=track(new B.StandardMaterial("WV near floor "+kind,scene));
 mat.diffuseColor=new B.Color3(.73,.91,.73);mat.useVertexColors=true;
 mat.backFaceCulling=false;mat.specularColor=new B.Color3(.01,.02,.008);
 m.material=mat;return m;
}
function detailMatrices(B,model,placements,cx,cy){
 const data=new Float32Array(placements.length*16);
 const q=new B.Quaternion(),pos=new B.Vector3(),sc=new B.Vector3(),matrix=new B.Matrix();
 for(let i=0;i<placements.length;i++){
   const t=placements[i];
   sc.set(t.sx,t.sy,t.sz);
   B.Quaternion.RotationAxisToRef(B.Axis.Y,t.yaw,q);
   pos.set(t.x-cx,t.h,t.y-cy);
   B.Matrix.ComposeToRef(sc,q,pos,matrix);matrix.copyToArray(data,i*16);
 }
 model.thinInstanceSetBuffer("matrix",data,16,true);
 model.thinInstanceRefreshBoundingInfo(true);
}
/** Dense undergrowth for the walk's first ~90m. Deliberately patchy: wet
 * coves support banks of fern and rhodo, higher slopes favor briar and sedge. */
export function renderHeroUnderstory(B,scene,track,{cx,cy,seed,mobile=false}){
 const kinds=["fern-field","rhododendron-mass","stiltgrass","sapling","briar-tangle"];
 const groups=Object.fromEntries(kinds.map(k=>[k,[]]));
 // Four-fold visually layered forest floor within the investor walk zone.
 const step=mobile?1.60:1.48,half=89;
 const xmin=Math.floor((cx-half)/step)-1,xmax=Math.ceil((cx+half)/step)+1;
 const ymin=Math.floor((cy-half)/step)-1,ymax=Math.ceil((cy+half)/step)+1;
 for(let i=xmin;i<=xmax;i++)for(let j=ymin;j<=ymax;j++){
   const x=(i+(hash(i,j,seed+922)-.5)*.93)*step;
   const y=(j+(hash(i,j,seed+923)-.5)*.93)*step;
   if(Math.abs(x-cx)>half||Math.abs(y-cy)>half||
     Math.hypot(x,y)<25||Math.abs(x)<2.7&&y>0&&y<36||
     waterAt(x,y,seed))continue;
   // Organic gaps and dense colonies are controlled by a low-frequency patch.
   const patch=noise(x/26,y/27,seed+2021);
   const chance=.74+patch*.22;
   if(hash(i,j,seed+924)>chance)continue;
   const b=biomeAt(x,y,seed),sample=hash(i,j,seed+925);
   const kind=b==="moist-cove"||b==="riparian"?
     sample<.40?"fern-field":sample<.72?"rhododendron-mass":
     sample<.86?"sapling":"briar-tangle":
     sample<.33?"stiltgrass":sample<.55?"fern-field":
     sample<.78?"briar-tangle":sample<.90?"sapling":"rhododendron-mass";
   const sx=.67+hash(i,j,seed+926)*.83;
   const sy=(.62+hash(i,j,seed+927)*.85)*(patch>.56?1.20:1);
   groups[kind].push({x,y,h:cabinGrade(x,y,seed)+.035,
     sx,sy,sz:sx*(.8+hash(i,j,seed+928)*.3),
     yaw:hash(i,j,seed+929)*TAU});
   if(patch>.60&&hash(i,j,seed+930)<.48){
     const x2=x+(hash(i,j,seed+931)-.5)*1.8;
     const y2=y+(hash(i,j,seed+932)-.5)*1.8;
     if(Math.hypot(x2,y2)>25&&!waterAt(x2,y2,seed))
       groups[kind].push({x:x2,y:y2,h:cabinGrade(x2,y2,seed)+.02,
         sx:sx*.66,sy:sy*.90,sz:sx*.74,
         yaw:hash(i,j,seed+933)*TAU});
   }
 }
 let total=0;
 for(const kind of kinds){
   const m=detailPrototype(B,scene,track,kind);
   detailMatrices(B,m,groups[kind],cx,cy);total+=groups[kind].length;
 }
 return total;
}
