/**
 * Native WV forest renderer. No spherical crowns, no cylinder-and-ball trees.
 * Procedural woody branch frames, layered leaf/needle cards and batched GPU
 * thin instances. This is an art-directed prototype, not scanned vegetation.
 */
import { treesInArea, supplementalTreesInArea, creekPath, riverY, riverWidth, riverLevel, terrainHeight, cabinGrade, earthColor, biomeAt, waterAt } from "./wild-nature.js?v=preserved-forest-20261013-v7";
import {hash,noise} from "./world-core.js";
import {makeGroundHeightSampler} from "./terrain-height.js?v=ground-follow-fix-20261013-v1";
import {gradeCommunityGround,keepForestTree,keepUnderstory} from "./wild-reference-layout.js?v=actual-distant-mountain-valley-20261013-v9";
import {renderWildVillage} from "./wild-village.js?v=mountain-cove-v9";
import {createForestSurfaceTextures,buildHeroTree,renderHeroUnderstory} from "./wild-investor-graphics.js?v=mountain-sightline-v9";
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
  const count=evergreen?15:19;
  for(let n=0;n<count;n++){
    const a=random()*Math.PI*2,t=random(),length=size*(.20+.80*t);
    const x=at[0]+Math.cos(a)*length,y=at[1]+(random()-.5)*size*.85,
      z=at[2]+Math.sin(a)*length;
    const axisA=a+random()*.6;
    const wx=Math.cos(axisA),wz=Math.sin(axisA);
    const half=size*(evergreen?.19:.28)*(0.60+random()*.75);
    const long=size*(evergreen?.46:.40)*(0.65+random()*.65);
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
      spray(leaves,lids,lcolors,near,null,conifer?1.03:1.48,rng,conifer);
    }
  }
  if(!conifer)for(let s=0;s<5;s++){
    const a=s*2.4,tip=[Math.cos(a)*r*.23,h*(.88+.09*rng()),Math.sin(a)*r*.23];
    spray(leaves,lids,lcolors,tip,null,1.78,rng,false);
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
function setInstances(B,mesh,trees,cx,cy,verticalScale=1){
  const data=new Float32Array(trees.length*16);
  const q=new B.Quaternion(),pos=new B.Vector3(),sc=new B.Vector3(),matrix=new B.Matrix();
  for(let i=0;i<trees.length;i++){
    const t=trees[i],s=t.scale;
    sc.set(s*(.91+t.variation*.19),s*verticalScale,s*(.90+t.variation*.21));
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

// Shared native understory prototypes: thin instances keep lush woodland
// affordable on phones. Species and cover are placed in habitat-aware patches.
function floorPrototype(B,scene,track,kind){
  const verts=[],ids=[],cols=[];
  const kinds=["fern","laurel","rhododendron","spicebush","blueberry","pawpaw",
    "bramble","sedge","moss","leaflitter","wildflower","rock","deadfall",
    "fallen-log","rock-cluster"];
  const rng=randomSeed(213+Math.max(0,kinds.indexOf(kind))*863);
  const leafy={
    fern:[.27,.57,.25],laurel:[.23,.48,.23],rhododendron:[.20,.43,.27],
    spicebush:[.40,.58,.24],blueberry:[.33,.48,.20],pawpaw:[.33,.61,.26],
    bramble:[.27,.52,.23],sedge:[.39,.52,.23],moss:[.25,.39,.18],
    wildflower:[.35,.58,.25]
  };
  function color(base){
    const v=.73+rng()*.46;
    return [Math.min(1,base[0]*v),Math.min(1,base[1]*v),Math.min(1,base[2]*v)];
  }
  function tri(a,b,c,base){
    const at=verts.length/3;
    verts.push(...a,...b,...c);ids.push(at,at+1,at+2);
    const col=color(base);
    for(let i=0;i<3;i++)cols.push(...col,1);
  }
  function stem(a,b,r=.018){
    const at=verts.length/3;
    addBranch(verts,ids,a,b,r,r*.25,5);
    for(let i=at;i<verts.length/3;i++)cols.push(.27,.29,.17,1);
  }
  function leaf(a,b,w,base){
    const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz)||1;
    const px=-dz/len,pz=dx/len,mid=[
      a[0]*.43+b[0]*.57,a[1]*.43+b[1]*.57+.045,a[2]*.43+b[2]*.57];
    const left=[mid[0]+px*w,mid[1],mid[2]+pz*w];
    const right=[mid[0]-px*w,mid[1],mid[2]-pz*w];
    tri(a,left,b,base);tri(a,b,right,base);
  }
  if(kind==="fern"){
    // Lacy pinnate fronds, arching away from the crown rather than flat fans.
    for(let i=0;i<13;i++){
      const a=i*2.39996+rng()*.3,reach=.62+rng()*.45;
      const tip=[Math.cos(a)*reach,.33+rng()*.32,Math.sin(a)*reach];
      stem([0,.07,0],tip,.009);
      for(let k=1;k<8;k++){
        const t=k/8,anchor=[tip[0]*t,.07+(tip[1]-.07)*t+.20*Math.sin(t*Math.PI),
          tip[2]*t];
        const width=.19*Math.sin(t*Math.PI)*(.8+rng()*.4);
        for(const sign of [-1,1]){
          const out=[anchor[0]-Math.sin(a)*width*sign+Math.cos(a)*.07,
            anchor[1]-.02,anchor[2]+Math.cos(a)*width*sign+Math.sin(a)*.07];
          leaf(anchor,out,.033,leafy.fern);
        }
      }
    }
  }else if(["laurel","rhododendron","spicebush","blueberry","pawpaw","bramble"].includes(kind)){
    const rhodo=kind==="rhododendron",pawpaw=kind==="pawpaw";
    const count=rhodo?19:kind==="laurel"?16:kind==="bramble"?13:pawpaw?8:12;
    const tall=rhodo?1.65:kind==="laurel"?1.23:pawpaw?1.72:
      kind==="spicebush"?1.20:kind==="blueberry"?.83:1.09;
    const spread=rhodo?1.12:kind==="laurel"?.91:pawpaw?.68:.78;
    for(let i=0;i<count;i++){
      const a=i*2.39996+rng()*.45,reach=spread*(.5+rng()*.52);
      const tip=[Math.cos(a)*reach,tall*(.63+rng()*.42),Math.sin(a)*reach];
      stem([0,.08,0],[tip[0]*.40,tall*.35,tip[2]*.40],.025);
      stem([tip[0]*.40,tall*.35,tip[2]*.40],tip,.016);
      const n=rhodo?8:kind==="laurel"?7:pawpaw?5:6;
      for(let k=0;k<n;k++){
        const angle=a+k*2.39996,reachLeaf=(rhodo?.36:kind==="laurel"?.28:pawpaw?.32:.20)*(.68+rng()*.4);
        const from=[tip[0]+Math.cos(angle)*.04,tip[1]-.02,tip[2]+Math.sin(angle)*.04];
        const to=[tip[0]+Math.cos(angle)*reachLeaf,tip[1]+(rng()-.45)*.23,
          tip[2]+Math.sin(angle)*reachLeaf];
        leaf(from,to,(pawpaw?.085:rhodo?.080:kind==="laurel"?.060:.050),leafy[kind]);
      }
    }
  }else if(kind==="sedge"){
    for(let i=0;i<28;i++){
      const a=i*2.39996,lean=.26+rng()*.55;
      const from=[(rng()-.5)*.22,.035,(rng()-.5)*.22];
      const to=[from[0]+Math.cos(a)*lean,.27+rng()*.41,
        from[2]+Math.sin(a)*lean];
      leaf(from,to,.023+rng()*.022,leafy.sedge);
    }
  }else if(kind==="moss"){
    for(let i=0;i<24;i++){
      const a=rng()*Math.PI*2,r=.11+Math.sqrt(rng())*.52;
      const x=Math.cos(a)*r,z=Math.sin(a)*r;
      const size=.11+rng()*.18;
      tri([x-size,.027,z-size*.38],[x+size*.8,.028,z-size*.5],
        [x+(rng()-.5)*size,.044,z+size],leafy.moss);
    }
  }else if(kind==="leaflitter"){
    const browns=[[.45,.29,.15],[.51,.34,.20],[.36,.28,.15],[.60,.43,.24]];
    for(let i=0;i<25;i++){
      const a=rng()*Math.PI*2,r=Math.sqrt(rng())*.78,x=Math.cos(a)*r,z=Math.sin(a)*r;
      const turn=rng()*Math.PI*2,sz=.07+rng()*.11,c=Math.cos(turn),s=Math.sin(turn);
      const base=browns[i%browns.length];
      tri([x-c*sz,.031,z-s*sz],[x+s*sz*.55,.036,z-c*sz*.55],
        [x+c*sz*.65,.033,z+s*sz],base);
    }
  }else if(kind==="wildflower"){
    for(let i=0;i<16;i++){
      const a=i*2.39996,r=.13+rng()*.44,x=Math.cos(a)*r,z=Math.sin(a)*r;
      const top=[x,.25+rng()*.39,z];
      stem([x,.03,z],top,.007);
      for(let j=0;j<4;j++){
        const p=a+j*1.57;
        leaf([x,top[1]-.12,z],[x+Math.cos(p)*.17,top[1]-.15,z+Math.sin(p)*.17],
          .035,leafy.wildflower);
      }
      if(i%3===0){
        const petal=[.73,.70,.44];
        tri([x-.04,top[1],z],[x+.04,top[1]+.04,z],
          [x+.03,top[1]-.03,z+.05],petal);
      }
    }
  }else if(kind==="fallen-log"){
    // Irregular fallen trees in varying decay stages, branch snags, broken
    // ends and exposed smaller limbs. Keep the main trunk near ground level.
    addBranch(verts,ids,[-2.8,.29,-.10],[-.75,.22,.10],.34,.28,9);
    addBranch(verts,ids,[-.75,.22,.10],[1.45,.14,-.05],.28,.18,8);
    addBranch(verts,ids,[1.45,.14,-.05],[3.08,.11,-.17],.18,.025,7);
    addBranch(verts,ids,[-1.4,.23,.04],[-1.78,.78,.73],.11,.018,5);
    addBranch(verts,ids,[.33,.20,.07],[.74,.55,-.82],.075,.008,5);
    addBranch(verts,ids,[2.12,.12,-.09],[2.45,.37,.61],.052,.006,5);
    for(let i=0;i<verts.length/3;i++){
      const v=.73+rng()*.40;
      cols.push(.35*v,.27*v,.17*v,1);
    }
  }else if(kind==="rock-cluster"){
    // Locally weathered sandstone in tight irregular ledges and talus clusters.
    for(const [x,z,r,h] of [
      [-.83,-.19,.93,.63],[.31,.30,1.18,.88],
      [1.38,-.34,.62,.39],[-.18,-1.11,.68,.37],
      [-1.23,.75,.47,.36]]){
      const count=7,at=verts.length/3;
      verts.push(x,h,z);
      for(let j=0;j<count;j++){
        const a=j*2*Math.PI/count,rad=r*(.78+.33*rng());
        verts.push(x+Math.cos(a)*rad,.10+.24*rng(),z+Math.sin(a)*rad);
      }
      for(let j=0;j<count;j++){
        const a=at+1+j,b=at+1+(j+1)%count;
        ids.push(at,a,b);
      }
      for(let j=0;j<count+1;j++){
        const shade=.78+rng()*.3;
        cols.push(.51*shade,.50*shade,.45*shade,1);
      }
    }
  }else if(kind==="rock"){
    const ringCount=9;verts.push(0,.84,0);
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
  const mesh=geometry(B,scene,track,"WV understory "+kind,verts,ids,cols);
  const material=track(new B.StandardMaterial("WV understory "+kind+" material",scene));
  material.diffuseColor=B.Color3.FromHexString(
    kind==="rock"||kind==="rock-cluster"?"#aaa69a":
    kind==="deadfall"||kind==="fallen-log"?"#715a46":"#a7b69a");
  material.backFaceCulling=false;
  material.specularColor=new B.Color3(.018,.024,.015);
  material.useVertexColors=true;
  mesh.material=material;
  return mesh;
}
function renderForestFloor(B,scene,track,{cx,cy,seed,surfaceHeight=null}){
  const floorHeight=(x,y)=>{const h=surfaceHeight?.(x,y);
    return Number.isFinite(h)?h:cabinGrade(x,y,seed);};
  const habitats={
    "riparian":["fern","fern","sedge","spicebush","pawpaw","bramble","moss","leaflitter","rock","rhododendron"],
    "moist-cove":["fern","fern","fern","rhododendron","rhododendron","laurel","spicebush","pawpaw","moss","leaflitter"],
    "dry-ridge":["blueberry","blueberry","laurel","bramble","sedge","fern","leaflitter","leaflitter","rock","deadfall"],
    "mixed-slope":["fern","fern","laurel","spicebush","blueberry","bramble","pawpaw","sedge","leaflitter","rhododendron"]
  };
  const types=["fern","laurel","rhododendron","spicebush","blueberry","pawpaw",
    "bramble","sedge","moss","leaflitter","wildflower","rock","deadfall",
    "fallen-log","rock-cluster"];
  const groups=Object.fromEntries(types.map(kind=>[kind,[]]));
  // ~80% denser vegetation/forest debris than the preceding release. The
  // layered thickets, scattered logs and sandstone clusters are still batched.
  const step=3.68,half=101;
  const minI=Math.floor((cx-half)/step)-1,maxI=Math.ceil((cx+half)/step)+1;
  const minJ=Math.floor((cy-half)/step)-1,maxJ=Math.ceil((cy+half)/step)+1;
  const place=(kind,x,y,i,j,salt,multiplier=1)=>{
    if(Math.abs(x-cx)>half||Math.abs(y-cy)>half||Math.hypot(x,y)<17||!keepUnderstory(x,y))return;
    if(waterAt(x,y,seed))return;
    // Keep a narrow, usable approach to the cabin steps.
    if(Math.abs(x)<2.5&&y>0&&y<35)return;
    const roll=hash(i,j,seed+salt);
    const size=kind==="rock"?.37+roll*.85:kind==="rock-cluster"?.53+roll*.55:
      kind==="fallen-log"?.57+roll*.65:kind==="deadfall"?.55+roll*.65:
      kind==="leaflitter"?.75+roll*.5:kind==="moss"?.83+roll*.54:
      .84+roll*.71;
    groups[kind].push({x,y,height:floorHeight(x,y)+
      (kind==="rock"||kind==="rock-cluster"?-.10:
      kind==="deadfall"||kind==="fallen-log"?-.06:.015),
      scale:size*multiplier,variation:hash(i,j,seed+salt+4),
      heading:hash(i,j,seed+salt+8)*Math.PI*2});
  };
  for(let i=minI;i<=maxI;i++)for(let j=minJ;j<=maxJ;j++){
    const x=(i+(hash(i,j,seed+336)-.5)*.76)*step;
    const y=(j+(hash(i,j,seed+337)-.5)*.76)*step;
    if(Math.abs(x-cx)>half||Math.abs(y-cy)>half||Math.hypot(x,y)<17||!keepUnderstory(x,y))continue;
    const roll=hash(i,j,seed+338);
    // Bare patches, stones, and woody debris still punctuate the rich floor.
    if(roll<.07)continue;
    const biome=biomeAt(x,y,seed),palette=habitats[biome]||habitats["mixed-slope"];
    const index=Math.floor(hash(i,j,seed+342)*palette.length);
    const kind=palette[index];
    place(kind,x,y,i,j,339);
    // Natural companion plants in irregular overlapping thickets.
    if(hash(i,j,seed+343)<.40&&kind!=="rock"&&kind!=="deadfall"){
      const accent=palette[Math.floor(hash(i,j,seed+344)*palette.length)];
      if(accent!=="deadfall"&&accent!=="rock")
        place(accent,x+(hash(i,j,seed+345)-.5)*2.5,
          y+(hash(i,j,seed+346)-.5)*2.5,i,j,347,.68);
    }
    if(hash(i,j,seed+355)<.075&&biome!=="dry-ridge")
      place("wildflower",x+1,y-1,i,j,358,.78);
    // Layer loose duff over the brown hillside: these tiny overlapping mats
    // stay visible among vegetation instead of a clean bare-soil blanket.
    if(hash(i,j,seed+381)<.58)
      place("leaflitter",x+(hash(i,j,seed+382)-.5)*1.8,
        y+(hash(i,j,seed+383)-.5)*1.8,i,j,384,1.13);
    if(hash(i,j,seed+385)<.22)
      place("moss",x+(hash(i,j,seed+386)-.5)*2,
        y+(hash(i,j,seed+387)-.5)*2,i,j,388,1.05);
    // Coarse natural deadwood and genuine clusters of sandstone boulders.
    if(hash(i,j,seed+360)<.024)
      place("fallen-log",x+(hash(i,j,seed+361)-.5)*2,
        y+(hash(i,j,seed+362)-.5)*2,i,j,363,.76);
    if(hash(i,j,seed+368)<.027)
      place("rock-cluster",x+(hash(i,j,seed+369)-.5)*2,
        y+(hash(i,j,seed+370)-.5)*2,i,j,371,.83);
  }
  let total=0;
  for(const kind of types){
    if(!groups[kind].length)continue;
    const model=floorPrototype(B,scene,track,kind);
    // Living underbrush stays low; rocks, logs and floor debris keep their height.
    const lowGrowing=!["rock","rock-cluster","deadfall","fallen-log",
      "leaflitter","moss"].includes(kind);
    setInstances(B,model,groups[kind],cx,cy,lowGrowing?.28:1);
    total+=groups[kind].length;
  }
  return total;
}
export function renderWildLandscape(B,scene,track,{cx,cy,seed,mobile=false}){
  const textures=createForestSurfaceTextures(B,scene,track,seed);
  const soil=track(new B.StandardMaterial("Appalachian leaf litter and stone",scene));
  soil.diffuseTexture=textures.duff;
  soil.diffuseColor=new B.Color3(1,1,1);
  soil.specularColor=new B.Color3(.015,.017,.012);
  function terrain(size,subdivisions,offset){
    const mesh=track(B.MeshBuilder.CreateGround("Appalachian terrain "+size,
      {width:size,height:size,subdivisions,updatable:true},scene));
    const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),tints=[];
    for(let i=0;i<positions.length;i+=3){
      const x=cx+positions[i],y=cy+positions[i+2];
      positions[i+1]=gradeCommunityGround(x,y,cabinGrade(x,y,seed),
         site=>cabinGrade(site.x,site.z,seed))-offset;
      // Woodland duff atlas stays visible; biome-specific color and dampness
      // tint it without turning the near ground into a flat brown carpet.
      const earth=earthColor(x,y,seed);
      const light=(noise(x/12,y/12,seed+918)-.5)*.22;
      tints.push(.70+earth[0]*.42+light,
        .69+earth[1]*.48+light*.9,
        .62+earth[2]*.56+light*.68,1);
    }
    const normals=[];
    B.VertexData.ComputeNormals(positions,mesh.getIndices(),normals);
    const uvs=mesh.getVerticesData(B.VertexBuffer.UVKind);
    // World-space UVs prevent the forest-duff atlas from stretching over a
    // whole ridge; the same 8m material scale covers near and far terrain.
    for(let j=0;j<uvs.length;j+=2){
      const k=j/2*3;
      uvs[j]=(cx+positions[k])/8.5;
      uvs[j+1]=(cy+positions[k+2])/8.5;
    }
    mesh.setVerticesData(B.VertexBuffer.UVKind,uvs);
    mesh.updateVerticesData(B.VertexBuffer.PositionKind,positions,true);
    mesh.updateVerticesData(B.VertexBuffer.NormalKind,normals);
    mesh.setVerticesData(B.VertexBuffer.ColorKind,new Float32Array(tints));
    mesh.useVertexColors=true;mesh.material=soil;
    // GroundMesh altitude lookup must use the UPDATED geometry, not its old
    // flat construction heights. Rebuild its per-cell collision surface once.
    if(typeof mesh.updateCoordinateHeights==="function")mesh.updateCoordinateHeights();
    return mesh;
  }
  // High-resolution local terrain plus distant ridge panoramas. Far land is
  // offset very slightly beneath the local ground to avoid z-fighting.
  terrain(1100,96,.40);
  const localWalkingGround=terrain(196,mobile?86:120,0);
  // The previous GroundMesh height cache was not guaranteed to match the
  // reshaped mountain mesh. Read its finished triangles directly instead.
  const walkSurface=makeGroundHeightSampler(
    localWalkingGround.getVerticesData(B.VertexBuffer.PositionKind),
    localWalkingGround.getIndices(),196,mobile?86:120,cx,cy);
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
  // Preserve prior forest: add about half again as many new trees, with 40%
  // evergreen additions (hemlock, white pine, Virginia pine) and +30%
  // old-growth veterans. Existing positions stay untouched.
  const near=treesInArea(cx,cy,102,seed,8.65).filter(t=>keepForestTree(t.x,t.y));
  // The old transition leapt from ~9m stands to 34m stands, producing the
  // photographically barren hillside beyond the first line of trees.
  // Fill that gap with mid-distance timber while retaining cheap LOD meshes.
  const mid=treesInArea(cx,cy,255,seed,16.7).filter(t=>{
    if(!keepForestTree(t.x,t.y))return false;
    const d=Math.max(Math.abs(t.x-cx),Math.abs(t.y-cy));
    return d>104&&d<=255;
  });
  const far=treesInArea(cx,cy,470,seed,33.9).filter(t=>
    keepForestTree(t.x,t.y)&&
    Math.max(Math.abs(t.x-cx),Math.abs(t.y-cy))>255);
  const addedNear=supplementalTreesInArea(cx,cy,102,seed,8.65).filter(t=>keepForestTree(t.x,t.y));
  const addedMid=supplementalTreesInArea(cx,cy,255,seed,16.7).filter(t=>{
    if(!keepForestTree(t.x,t.y))return false;
    const d=Math.max(Math.abs(t.x-cx),Math.abs(t.y-cy));
    return d>104&&d<=255;
  });
  const addedFar=supplementalTreesInArea(cx,cy,470,seed,33.9).filter(t=>
    keepForestTree(t.x,t.y)&&
    Math.max(Math.abs(t.x-cx),Math.abs(t.y-cy))>255);
  // Anchor every trunk to the exact reshaped terrain, including trees along
  // the shoulder of the new mountain-view valley (not just near-camera ones).
  // The previous natural-only heights would leave distant trunks floating.
  const allTrees=near.concat(mid,far,addedNear,addedMid,addedFar);
  const flatHeight=cabinGrade(93,85,seed);
  for(const t of allTrees){
    const y=walkSurface(t.x,t.y);
    t.height=(Number.isFinite(y)?y:
      gradeCommunityGround(t.x,t.y,cabinGrade(t.x,t.y,seed),()=>flatHeight))+.04;
  }
  // Near-camera timber is entirely re-authored: tapered buttress roots,
  // curved trunks, irregular limb forks and diffuse-shaded native crowns.
  // Distant groves retain inexpensive LOD prototypes for phone performance.
  const groups=new Map();
  // Approved village pilot: higher-detail existing tree meshes only within
  // 50 world metres of the Ranger Station village centre (93,85).
  // Keep the rest of the streamed world on the existing inexpensive LOD.
  const pilotX=93,pilotZ=85,pilotRadius=50;
  const insidePilot=t=>Math.hypot(t.x-pilotX,t.y-pilotZ)<=pilotRadius;
  const heroZone=Math.hypot(cx-pilotX,cy-pilotZ)<255;
  const addGroup=(t,lod)=>{
    const variant=lod==="near"?(t.variation>.51?1:0):0;
    const key=t.species+"/"+lod+"/"+variant;
    if(!groups.has(key))groups.set(key,{species:t.species,lod,variant,trees:[]});
    groups.get(key).trees.push(t);
  };
  for(const t of near.concat(addedNear))addGroup(t,heroZone&&insidePilot(t)?"near":"far");
  for(const t of mid.concat(far,addedMid,addedFar))addGroup(t,heroZone&&insidePilot(t)?"near":"far");
  for(const {species,lod,variant,trees} of groups.values()){
    const model=lod==="near"?
      buildHeroTree(B,scene,track,species,seed+species.length*17,variant,textures):
      prototype(B,scene,track,species,seed+species.length*17);
    setInstances(B,model.bark,trees,cx,cy);
    setInstances(B,model.foliage,trees,cx,cy);
  }
  const understory=renderForestFloor(B,scene,track,{cx,cy,seed,surfaceHeight:walkSurface});
  const heroPlants=heroZone?renderHeroUnderstory(B,scene,track,
    {cx,cy,seed,mobile,surfaceHeight:walkSurface}):0;
   const community=renderWildVillage(B,scene,track,{cx,cy,seed,surfaceHeight:walkSurface});
  const addedTrees=addedNear.concat(addedMid,addedFar);
  return {nearTrees:near.length+addedNear.length,
    distantTrees:mid.length+far.length+addedMid.length+addedFar.length,
    addedTrees:addedTrees.length,
    addedEvergreens:addedTrees.filter(t=>t.evergreen).length,
    elderTrees:allTrees.filter(t=>t.elder).length,
    collidableTrees:allTrees,species:new Set(allTrees.map(t=>t.species)).size,
    understory:understory+heroPlants,heroPlants,
     communityBuildings:community.buildings,communityPaths:community.paths,
     communityFirePits:community.firePits,
    heroGraphics:heroZone,forestExtentMetres:470,
    // True interpolated altitude of the visible ground, including on steep
    // slopes and after streamed-tile changes. No Babylon stale height cache.
    surfaceHeight(x,z){
      return walkSurface(x,z);
    }};
}
