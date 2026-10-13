/**
 * Native WV forest renderer. No spherical crowns, no cylinder-and-ball trees.
 * Procedural woody branch frames, layered leaf/needle cards and batched GPU
 * thin instances. This is an art-directed prototype, not scanned vegetation.
 */
import { treesInArea, creekPath, riverY, riverWidth, riverLevel, terrainHeight, cabinGrade, earthColor } from "./wild-nature.js";
import {hash} from "./world-core.js";
const PROFILES={
 "tulip-poplar":{height:29,radius:4.2,base:.51,crown:.43,leaf:"#627d37",kind:"broad"},
 "white-oak":{height:23,radius:6.4,base:.36,crown:.36,leaf:"#53683a",kind:"wide"},
 "northern-red-oak":{height:25,radius:6.0,base:.39,crown:.39,leaf:"#536d36",kind:"wide"},
 "chestnut-oak":{height:21,radius:5.3,base:.37,crown:.41,leaf:"#596b32",kind:"wide"},
 "sugar-maple":{height:25,radius:5.2,base:.43,crown:.39,leaf:"#53783d",kind:"broad"},
 "red-maple":{height:21,radius:4.7,base:.39,crown:.42,leaf:"#62803c",kind:"broad"},
 "american-beech":{height:25,radius:5.2,base:.38,crown:.40,leaf:"#638146",kind:"broad"},
 "black-cherry":{height:24,radius:4.2,base:.49,crown:.40,leaf:"#416e3e",kind:"broad"},
 "shagbark-hickory":{height:26,radius:4.1,base:.53,crown:.35,leaf:"#687838",kind:"broad"},
 "eastern-hemlock":{height:22,radius:5.2,base:.16,crown:.80,leaf:"#2c513c",kind:"conifer"},
 "eastern-white-pine":{height:29,radius:4.9,base:.23,crown:.69,leaf:"#456c59",kind:"pine"},
 "virginia-pine":{height:19,radius:4.4,base:.26,crown:.64,leaf:"#446341",kind:"pine"},
 "american-sycamore":{height:29,radius:7,base:.37,crown:.45,leaf:"#598347",kind:"wide"},
 "river-birch":{height:21,radius:4.6,base:.32,crown:.52,leaf:"#64854b",kind:"broad"},
 "black-walnut":{height:25,radius:5.5,base:.46,crown:.38,leaf:"#4b713e",kind:"broad"}
};
function randomSeed(n){let k=n>>>0;return ()=>{k=(Math.imul(k,1664525)+1013904223)>>>0;return k/4294967296;};}
function geometry(B,scene,track,name,vertices,indices,colors){
  const m=track(new B.Mesh(name,scene));
  m.setVerticesData(B.VertexBuffer.PositionKind,new Float32Array(vertices));
  const normals=[];B.VertexData.ComputeNormals(vertices,indices,normals);
  m.setVerticesData(B.VertexBuffer.NormalKind,new Float32Array(normals));
  if(colors)m.setVerticesData(B.VertexBuffer.ColorKind,new Float32Array(colors));
  m.setIndices(indices);
  m.alwaysSelectAsActiveMesh=true; // thin instances extend beyond prototype origin
  return m;
}
function addBranch(vertices,indices,from,to,r0,r1,sides=6){
  const dx=to[0]-from[0],dy=to[1]-from[1],dz=to[2]-from[2];
  const len=Math.hypot(dx,dy,dz)||1,ux=dx/len,uy=dy/len,uz=dz/len;
  const tx=Math.abs(uy)<.9?-uz:1,ty=Math.abs(uy)<.9?0:0,tz=Math.abs(uy)<.9?ux:0;
  const tlen=Math.hypot(tx,ty,tz)||1;
  const vx=tx/tlen,vy=ty/tlen,vz=tz/tlen;
  const wx=uy*vz-uz*vy,wy=uz*vx-ux*vz,wz=ux*vy-uy*vx;
  const start=vertices.length/3;
  for(let k=0;k<2;k++)for(let i=0;i<sides;i++){
    const a=2*Math.PI*i/sides,rad=k?r1:r0;
    const c=Math.cos(a),s=Math.sin(a);
    const p=k?to:from;
    vertices.push(p[0]+rad*(vx*c+wx*s),p[1]+rad*(vy*c+wy*s),p[2]+rad*(vz*c+wz*s));
  }
  for(let i=0;i<sides;i++){
    const a=start+i,b=start+(i+1)%sides,c=start+sides+i,d=start+sides+(i+1)%sides;
    indices.push(a,c,b,b,c,d);
  }
}
function spray(vertices,indices,colors,at,dir,size,random,evergreen){
  const count=evergreen?11:17;
  for(let n=0;n<count;n++){
    const a=random()*Math.PI*2,t=random(),length=size*(.20+.80*t);
    const x=at[0]+Math.cos(a)*length,y=at[1]+(random()-.5)*size*.85,
      z=at[2]+Math.sin(a)*length;
    const axisA=a+random()*.6;
    const wx=Math.cos(axisA),wz=Math.sin(axisA);
    const half=size*(evergreen?.064:.105)*(0.55+random()*.7);
    const long=size*(evergreen?.27:.23)*(0.65+random()*.65);
    const offset=vertices.length/3;
    // Two irregular, double-sided tapered leaf blades. No canopy spheres.
    vertices.push(x-wx*half,y-long*.27,z-wz*half,
      x+wx*half,y-long*.27,z+wz*half,
      x+Math.sin(a)*long*.30,y+long*.78,z+Math.cos(a)*long*.30,
      x-wx*half*.38,y+long*.42,z-wz*half*.38);
    indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
    const shade=.69+random()*.56,clr=evergreen?[.44,.71,.54]:[.69,.86,.48];
    for(let q=0;q<4;q++)colors.push(Math.min(1,clr[0]*shade),Math.min(1,clr[1]*shade),Math.min(1,clr[2]*shade),1);
  }
}
function prototype(B,scene,track,species,seed){
  const cfg=PROFILES[species],rng=randomSeed(seed);
  const verts=[],ids=[],leaves=[],lids=[],lcolors=[];
  const h=cfg.height,r=cfg.radius,conifer=cfg.kind==="conifer"||cfg.kind==="pine";
  addBranch(verts,ids,[0,0,0],[0,h*.72,0],.26+.15*rng(),.12,9);
  addBranch(verts,ids,[0,h*.72,0],[0,h,0],.12,.009,7);
  const limbs=conifer?16:13;
  for(let k=0;k<limbs;k++){
    const level=cfg.base+(k+(rng()-.5)*.5)/limbs*cfg.crown;
    const theta=k*2.39996+rng()*.45;
    const coniferSpread=Math.pow(1-(level-cfg.base)/cfg.crown,.75);
    const reach=r*(conifer?(.23+.77*coniferSpread):(.58+.42*rng()));
    const from=[0,h*level,0];
    const elbow=[Math.cos(theta)*reach*.48,h*(level+(conifer?-.06:.045)),Math.sin(theta)*reach*.48];
    const end=[Math.cos(theta)*reach,h*(level+(conifer?-.095:.13)+rng()*.05),Math.sin(theta)*reach];
    addBranch(verts,ids,from,elbow,.074+.029*rng(),.047,6);
    addBranch(verts,ids,elbow,end,.05,.008,5);
    for(let s=0;s<2;s++){
      const q=.55+s*.34,near=[elbow[0]*(1-q)+end[0]*q,
        elbow[1]*(1-q)+end[1]*q,elbow[2]*(1-q)+end[2]*q];
      spray(leaves,lids,lcolors,near,null,conifer?.76:1.18,rng,conifer);
    }
  }
  if(!conifer)for(let s=0;s<5;s++){
    const a=s*2.4,tip=[Math.cos(a)*r*.23,h*(.88+.09*rng()),Math.sin(a)*r*.23];
    spray(leaves,lids,lcolors,tip,null,1.3,rng,false);
  }
  const bark=geometry(B,scene,track,species+" bark",verts,ids);
  const foliage=geometry(B,scene,track,species+" layered foliage",leaves,lids,lcolors);
  const barkMat=track(new B.StandardMaterial(species+" bark material",scene));
  barkMat.diffuseColor=B.Color3.FromHexString(
    species==="american-sycamore"?"#a19b87":species==="american-beech"?"#808379":
    species==="river-birch"?"#9a8270":"#534739");
  barkMat.specularColor=new B.Color3(.055,.052,.05);
  bark.material=barkMat;
  const foliageMat=track(new B.StandardMaterial(species+" leaf material",scene));
  foliageMat.diffuseColor=B.Color3.FromHexString(cfg.leaf);
  foliageMat.specularColor=new B.Color3(.03,.045,.02);
  foliageMat.backFaceCulling=false;foliageMat.useVertexColors=true;
  foliage.material=foliageMat;
  return {bark,foliage};
}
function setInstances(B,mesh,trees,cx,cy){
  const data=new Float32Array(trees.length*16);
  const q=new B.Quaternion(),pos=new B.Vector3(),sc=new B.Vector3(),matrix=new B.Matrix();
  for(let i=0;i<trees.length;i++){
    const t=trees[i],s=t.scale;
    sc.set(s*(.91+t.variation*.19),s,s*(.90+t.variation*.21));
    B.Quaternion.RotationAxisToRef(B.Axis.Y,t.heading,q);
    pos.set(t.x-cx,t.height,t.y-cy);
    B.Matrix.ComposeToRef(sc,q,pos,matrix);matrix.copyToArray(data,i*16);
  }
  mesh.thinInstanceSetBuffer("matrix",data,16,true);
  mesh.thinInstanceRefreshBoundingInfo(true);
}
function waterRibbon(B,scene,track,name,pts,width,mat){
  if(pts.length<2)return;
  const left=[],right=[];
  for(let i=0;i<pts.length;i++){
    const p=pts[i],previous=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)];
    const dx=next[0]-previous[0],dz=next[2]-previous[2],inv=1/(Math.hypot(dx,dz)||1);
    const w=width(p,i)*.5;
    left.push(new B.Vector3(p[0]-dz*inv*w,p[1]+.05,p[2]+dx*inv*w));
    right.push(new B.Vector3(p[0]+dz*inv*w,p[1]+.05,p[2]-dx*inv*w));
  }
  const mesh=track(B.MeshBuilder.CreateRibbon(name,{pathArray:[left,right],sideOrientation:B.Mesh.DOUBLESIDE},scene));
  mesh.material=mat;return mesh;
}

function floorPrototype(B,scene,track,kind){
  const verts=[],ids=[],cols=[];
  const rng=randomSeed(kind==="fern"?213:786);
  if(kind==="fern"||kind==="laurel"){
    const fronds=kind==="fern"?9:15;
    for(let i=0;i<fronds;i++){
      const a=i*2.39996,reach=(kind==="fern"?.68:.82)*(.73+rng()*.45);
      const stalkHeight=kind==="fern"?.67:1.18;
      const end=[Math.cos(a)*reach,stalkHeight*(.8+rng()*.3),Math.sin(a)*reach];
      const from=[.03*Math.sin(a),.06,.03*Math.cos(a)];
      // Fern fronds and mountain laurel leaves use shaped tapered polygons.
      for(let k=0;k<6;k++){
        const t=(k+.55)/6;
        const sx=from[0]+end[0]*t,sy=from[1]+(end[1]-from[1])*t,sz=from[2]+end[2]*t;
        const tangent=[-Math.sin(a),0,Math.cos(a)],w=(1-t)*.18*(kind==="fern"?1:1.42);
        const index=verts.length/3;
        verts.push(sx-tangent[0]*w,sy,sz-tangent[2]*w,
          sx+tangent[0]*w,sy,sz+tangent[2]*w,
          sx+Math.cos(a)*.14,sy+.13,sz+Math.sin(a)*.14);
        ids.push(index,index+1,index+2);
        const shade=.57+rng()*.38;
        for(let q=0;q<3;q++)cols.push(.24*shade,.60*shade,.28*shade,1);
      }
    }
  }else if(kind==="rock"){
    const ringCount=9;
    verts.push(0,.84,0);
    for(let k=0;k<ringCount;k++){
      const a=k*2*Math.PI/ringCount,rr=.62+rng()*.49;
      verts.push(Math.cos(a)*rr,.27+rng()*.35,Math.sin(a)*rr);
    }
    for(let k=0;k<ringCount;k++){
      const a=k*2*Math.PI/ringCount,rr=.75+rng()*.25;
      verts.push(Math.cos(a)*rr,-.18+rng()*.20,Math.sin(a)*rr);
    }
    verts.push(0,-.21,0);
    for(let i=0;i<ringCount;i++){
      const next=(i+1)%ringCount;
      ids.push(0,i+1,next+1);
      ids.push(i+1,i+1+ringCount,next+1+ringCount,
        i+1,next+1+ringCount,next+1);
      ids.push(1+ringCount*2,next+1+ringCount,i+1+ringCount);
    }
    for(let i=0;i<verts.length/3;i++)cols.push(.56+rng()*.11,.54+rng()*.09,.49+rng()*.08,1);
  }else if(kind==="deadfall"){
    addBranch(verts,ids,[-2,.18,0],[2,.10,0],.28,.19,9);
    addBranch(verts,ids,[-.9,.14,0],[-.18,.55,.55],.13,.018,6);
    addBranch(verts,ids,[1,.14,0],[1.44,.43,-.65],.13,.018,6);
    for(let i=0;i<verts.length/3;i++)cols.push(.43,.35,.28,1);
  }
  const m=geometry(B,scene,track,"WV floor "+kind,verts,ids,cols);
  const mat=track(new B.StandardMaterial("WV floor "+kind+" material",scene));
  mat.diffuseColor=kind==="fern"?B.Color3.FromHexString("#638449"):
    kind==="laurel"?B.Color3.FromHexString("#506d45"):
    kind==="rock"?B.Color3.FromHexString("#a6a49a"):
    B.Color3.FromHexString("#715a46");
  mat.backFaceCulling=false;mat.specularColor=new B.Color3(.025,.03,.025);
  mat.useVertexColors=true;m.material=mat;
  return m;
}
function renderForestFloor(B,scene,track,{cx,cy,seed}){
  const types=["fern","laurel","rock","deadfall"];
  const groups=Object.fromEntries(types.map(t=>[t,[]]));
  const step=6.2,half=100;
  const minI=Math.floor((cx-half)/step)-1,maxI=Math.ceil((cx+half)/step)+1;
  const minJ=Math.floor((cy-half)/step)-1,maxJ=Math.ceil((cy+half)/step)+1;
  for(let i=minI;i<=maxI;i++)for(let j=minJ;j<=maxJ;j++){
    const x=(i+(hash(i,j,seed+336)-.5)*.70)*step,
      y=(j+(hash(i,j,seed+337)-.5)*.70)*step;
    if(Math.abs(x-cx)>half||Math.abs(y-cy)>half||Math.hypot(x,y)<35)continue;
    const roll=hash(i,j,seed+338);
    let kind=roll<.46?"fern":roll<.69?"laurel":roll<.85?"rock":roll<.93?"deadfall":null;
    if(!kind)continue;
    const scale=kind==="rock"?.4+hash(i,j,seed+339)*1.5:
      kind==="deadfall"?.7+hash(i,j,seed+339)*.7:
      .46+hash(i,j,seed+339)*.9;
    groups[kind].push({x,y,height:cabinGrade(x,y,seed)+
      (kind==="rock"?-.09:kind==="deadfall"?-.04:0),scale,
      variation:hash(i,j,seed+340),heading:hash(i,j,seed+341)*Math.PI*2});
  }
  let total=0;
  for(const kind of types){
    if(!groups[kind].length)continue;
    const model=floorPrototype(B,scene,track,kind);
    setInstances(B,model,groups[kind],cx,cy);total+=groups[kind].length;
  }
  return total;
}
export function renderWildLandscape(B,scene,track,{cx,cy,seed}){
  const soil=track(new B.StandardMaterial("Appalachian leaf litter and stone",scene));
  soil.diffuseColor=new B.Color3(1,1,1);
  soil.specularColor=new B.Color3(.015,.017,.012);
  function terrain(size,subdivisions,offset){
    const mesh=track(B.MeshBuilder.CreateGround("Appalachian terrain "+size,
      {width:size,height:size,subdivisions,updatable:true},scene));
    const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),tints=[];
    for(let i=0;i<positions.length;i+=3){
      const x=cx+positions[i],y=cy+positions[i+2];
      positions[i+1]=cabinGrade(x,y,seed)-offset;
      tints.push(...earthColor(x,y,seed));
    }
    const normals=[];
    B.VertexData.ComputeNormals(positions,mesh.getIndices(),normals);
    mesh.updateVerticesData(B.VertexBuffer.PositionKind,positions);
    mesh.updateVerticesData(B.VertexBuffer.NormalKind,normals);
    mesh.setVerticesData(B.VertexBuffer.ColorKind,new Float32Array(tints));
    mesh.useVertexColors=true;mesh.material=soil;return mesh;
  }
  // High-resolution local terrain plus distant ridge panoramas. Far land is
  // offset very slightly beneath the local ground to avoid z-fighting.
  terrain(1100,96,.40);
  terrain(196,66,0);
  const waterMat=track(new B.StandardMaterial("river glints",scene));
  waterMat.diffuseColor=new B.Color3(.18,.33,.36);
  waterMat.specularColor=new B.Color3(.34,.38,.41);waterMat.specularPower=38;
  waterMat.alpha=.89;waterMat.backFaceCulling=false;
  const river=[];
  for(let x=cx-560;x<=cx+560;x+=6){
    const y=riverY(x,seed);
    river.push([x-cx,riverLevel(x)+.24,y-cy]);
  }
  waterRibbon(B,scene,track,"winding WV river",river,(p,i)=>riverWidth(cx+p[0],seed)*2,waterMat);
  for(let j=Math.floor((cx-650)/780)-1;j<=Math.ceil((cx+650)/780)+1;j++)
    for(const side of [-1,1]){
      const path=[];
      for(let t=0;t<=970;t+=9){
        const p=creekPath(j,side,t,seed);
        if(Math.abs(p.x-cx)>565||Math.abs(p.y-cy)>565)continue;
        path.push([p.x-cx,riverLevel(p.anchorX)+t*.028+.23,p.y-cy,t]);
      }
      if(path.length>2)waterRibbon(B,scene,track,"flowing hollow creek",path,
        p=>2*Math.max(.65,3.5-p[3]*.0025),waterMat);
    }
  // Dense native canopy nearby. Distant groves use fewer, spaced trunks and
  // thinner height scaling to keep the mobile GPU cost bounded.
  const near=treesInArea(cx,cy,102,seed,11);
  const far=treesInArea(cx,cy,470,seed,43).filter(t=>
    Math.max(Math.abs(t.x-cx),Math.abs(t.y-cy))>104);
  const groups=new Map();
  for(const t of near.concat(far)){
    if(!groups.has(t.species))groups.set(t.species,[]);
    groups.get(t.species).push(t);
  }
  for(const [species,trees] of groups){
    const model=prototype(B,scene,track,species,seed+species.length*17);
    setInstances(B,model.bark,trees,cx,cy);
    setInstances(B,model.foliage,trees,cx,cy);
  }
  const understory=renderForestFloor(B,scene,track,{cx,cy,seed});
  return {nearTrees:near.length,distantTrees:far.length,species:groups.size,
    understory,forestExtentMetres:470};
}
