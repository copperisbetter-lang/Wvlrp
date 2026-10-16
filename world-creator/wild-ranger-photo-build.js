/**
 * The Wild: photo-guided Ranger Station #2 (2026-10-15).
 * Actual Babylon meshes, PBR building surfaces and furnished continuous interior.
 * Built 30 GAME METERS EAST of the untouched original station.
 * This is a first-pass reconstruction; photographs do not disclose hidden geometry.
 * Local X/Z are metres and south (-Z) is the visitor entrance.
 */
import {flatlandHeight} from "./wild-rebuild-layout.js";

export const PHOTO_RANGER_STATION=Object.freeze({
  id:"ranger-photo-build",name:"Ranger Station · Photo Build",
  x:30,z:350,width:19.2,depth:13.4,entryWidth:2.5,
  floorRise:.78,wallHeight:3.9,porchDepth:3.15,roofRise:2.95,
  front:"south",source:"WVLRP 360 exterior + office photos"
});
const smooth=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
export function photoRangerVisibleInTile(cx,cy){
  return Math.abs(PHOTO_RANGER_STATION.x-cx)<=83&&
    Math.abs(PHOTO_RANGER_STATION.z-cy)<=83;
}
export function photoRangerCollision(x,z,pad=.24){
  const s=PHOTO_RANGER_STATION,xx=x-s.x,zz=z-s.z;
  const hw=s.width/2,hd=s.depth/2;
  if(Math.abs(xx)>hw+pad+.22||Math.abs(zz)>hd+pad+.22)return false;
  if(Math.abs(zz-hd)<=pad+.20)return true;
  if(Math.abs(zz+hd)<=pad+.20)return Math.abs(xx)>s.entryWidth/2-pad;
  return Math.abs(Math.abs(xx)-hw)<=pad+.20;
}
/** 0..1 ramp up stairs to walkable front porch and matching interior floor. */
export function photoRangerDeckBlend(x,z){
  const s=PHOTO_RANGER_STATION,xx=Math.abs(x-s.x),zz=z-s.z;
  const front=-s.depth/2,deck=front-s.porchDepth;
  if(xx>s.width/2-.40||zz>s.depth/2-.28||zz<deck-3.3)return 0;
  if(zz>=deck-.1)return 1;
  if(xx>2.65)return 0;
  return smooth((zz-(deck-3.3))/3.2);
}
export function buildPhotoRangerStation(B,scene,track,{cx,cy,seed,base,surfaceHeight,mobile=false}){
  if(!photoRangerVisibleInTile(cx,cy))return 0;
  const s=PHOTO_RANGER_STATION;
  const X=s.x-cx,Z=s.z-cy;
  const measured=surfaceHeight?.(s.x,s.z);
  const ground=Number.isFinite(measured)?measured:flatlandHeight(s.x,s.z,seed,base);
  const floor=ground+s.floorRise;
  const w=s.width,d=s.depth,hw=w/2,hd=d/2;
  const front=Z-hd,back=Z+hd,porchFront=front-s.porchDepth;
  const wallTop=floor+s.wallHeight;
  const roofTop=wallTop+s.roofRise;
  const root="./assets/building/";
  const finishes=new Map();
  const small=mobile;
  const pbr=(id,{u=1,v=1,metal=false,tint=null,alpha=1}={})=>{
    const key=[id,u,v,metal,tint,alpha].join("|");
    if(finishes.has(key))return finishes.get(key);
    const mat=track(new B.PBRMaterial("PHOTO RANGER CC0 "+key,scene));
    const resolution=small?"1k":"2k";
    // Every referenced set has downloaded 2k maps; 1k fallback only where present.
    const baseRes=small&&["wood_trunk_wall","rough_pine_door","mossy_stone_wall","corrugated_iron"].includes(id)?"1k":resolution;
    const detailRes=baseRes;
    const tex=(kind,res)=>{
      const t=track(new B.Texture(root+id+"_"+kind+"_"+res+".jpg",scene));
      t.wrapU=B.Texture.WRAP_ADDRESSMODE;t.wrapV=B.Texture.WRAP_ADDRESSMODE;
      t.uScale=u;t.vScale=v;return t;
    };
    mat.albedoTexture=tex("diffuse",baseRes);
    mat.bumpTexture=tex("normal",detailRes);
    mat.bumpTexture.level=.62;
    mat.metallicTexture=tex("arm",detailRes);
    mat.useRoughnessFromMetallicTextureGreen=true;
    mat.useMetallnessFromMetallicTextureBlue=true;
    mat.metallic=metal?.42:0;mat.roughness=metal?.7:.90;
    mat.alpha=alpha;mat.backFaceCulling=false;
    if(tint)mat.albedoColor=B.Color3.FromHexString(tint);
    finishes.set(key,mat);return mat;
  };
  const simple=(name,color,{emission=null,alpha=1}={})=>{
    const mat=track(new B.PBRMaterial("PHOTO RANGER "+name,scene));
    mat.albedoColor=B.Color3.FromHexString(color);
    mat.roughness=.81;mat.metallic=0;mat.alpha=alpha;
    mat.backFaceCulling=false;
    if(emission)mat.emissiveColor=B.Color3.FromHexString(emission);
    return mat;
  };
  const wall=pbr("weathered_planks",{u:2,v:2});
  const inner=pbr("wood_planks",{u:2,v:2,tint:"#dcc3a0"});
  const beam=pbr("pine_bark",{v:2});
  const posts=pbr("wood_trunk_wall",{v:1});
  const door=pbr("rough_pine_door");
  const deckWood=pbr("wood_planks",{u:4,v:2});
  const stone=pbr("mossy_stone_wall",{u:2,v:1});
  const block=pbr("stacked_stone_wall",{u:2,v:1});
  const roof=pbr("corrugated_iron",{u:2,v:2,metal:true,tint:"#58839c"});
  const dark=simple("matte iron","#252924");
  const walnut=simple("dark stained walnut","#5e402b");
  const green=simple("canvas moss","#4d6047");
  const leather=simple("brown leather","#64452f");
  const paper=simple("old paper","#ece4cd");
  const cream=simple("warm canvas","#d9c39b");
  const glass=simple("transparent window glass","#a1c0b8",{alpha:.24});
  glass.roughness=.10;glass.metallic=.12;
  const gold=simple("aged brass","#b99a62");
  const amber=simple("warm lantern","#f5c275",{emission:"#7a4a13"});
  const iron=simple("brushed iron","#60645f");
  const boxes=[];
  const box=(name,a,b,c,x,y,z,material,rotationY=0)=>{
    const m=track(B.MeshBuilder.CreateBox("PHOTO RANGER "+name,{width:a,height:b,depth:c},scene));
    m.position.set(x,y,z);m.rotation.y=rotationY;m.material=material;
    m.isPickable=false;m.checkCollisions=false;boxes.push(m);return m;
  };
  const cyl=(name,r,h,x,y,z,material,axis="y")=>{
    const m=track(B.MeshBuilder.CreateCylinder("PHOTO RANGER "+name,{diameter:r,height:h,tessellation:12},scene));
    m.position.set(x,y,z);
    if(axis==="x")m.rotation.z=Math.PI/2;
    else if(axis==="z")m.rotation.x=Math.PI/2;
    m.material=material;m.isPickable=false;m.checkCollisions=false;return m;
  };
  const ball=(name,a,b,c,x,y,z,material)=>{
    const m=track(B.MeshBuilder.CreateSphere("PHOTO RANGER "+name,{diameter:1,segments:12},scene));
    m.scaling.set(a,b,c);m.position.set(x,y,z);
    m.material=material;m.isPickable=false;m.checkCollisions=false;return m;
  };
  const plane=(name,width,height,x,y,z,material,yaw=Math.PI)=>{
    const m=track(B.MeshBuilder.CreatePlane("PHOTO RANGER "+name,{width,height},scene));
    m.position.set(x,y,z);m.rotation.y=yaw;m.material=material;
    m.isPickable=false;m.checkCollisions=false;return m;
  };
  const surface=(name,coords,uv,mat)=>{
    const mesh=track(new B.Mesh("PHOTO RANGER "+name,scene));
    const vd=new B.VertexData();
    vd.positions=coords.flat();vd.indices=coords.length===3?[0,1,2]:[0,1,2,0,2,3];
    vd.uvs=uv.flat();
    const normals=[];B.VertexData.ComputeNormals(vd.positions,vd.indices,normals);
    vd.normals=normals;vd.applyToMesh(mesh);
    mesh.material=mat;mesh.isPickable=false;mesh.checkCollisions=false;return mesh;
  };
  const sign=(name,words,width,height,x,y,z,{bg="#ad8550",fg="#2e271d",font=88}={})=>{
    const dt=track(new B.DynamicTexture("PHOTO RANGER painted "+name,{width:1024,height:256},scene,false));
    const c=dt.getContext();
    c.fillStyle=bg;c.fillRect(0,0,1024,256);
    c.strokeStyle="#523820";c.lineWidth=11;c.strokeRect(11,11,1002,234);
    c.strokeStyle="#d8b980";c.lineWidth=3;c.strokeRect(25,25,974,206);
    c.fillStyle=fg;c.textAlign="center";c.textBaseline="middle";
    c.font="bold "+font+"px Georgia, serif";
    c.fillText(words,512,130,930);dt.update();
    const mat=track(new B.StandardMaterial("PHOTO RANGER sign print "+name,scene));
    mat.diffuseTexture=dt;mat.emissiveColor=new B.Color3(.09,.07,.04);
    mat.backFaceCulling=false;
    plane(name,width,height,x,y,z,mat,Math.PI);
  };
  // All parts are intentionally dimensioned. Side/back/buried details are inferred.
  // A slightly projecting fitted stone foundation supports the REAL indoor floor.
  box("stone foundation",w+.55,.72,d+.55,X,ground+.36,Z,stone);
  box("plank floor solid walkable",w-.35,.18,d-.35,X,floor-.09,Z,deckWood);
  for(const side of [-1,1]){
    box("stone base side "+side,.40,.70,d+.55,X+side*(hw+.09),ground+.37,Z,stone);
  }

  // Continuous solid log-paneled walls broken into accurate door and window holes.
  const frontOpenings=[
    {a:-s.entryWidth/2,b:s.entryWidth/2,lo:0,hi:2.88,type:"door"},
    ...[-7.05,-4.58,4.58,7.05].map(x=>({a:x-.71,b:x+.71,lo:1.06,hi:2.97,type:"window"}))
  ];
  const backOpenings=[-5.6,4.9].map(x=>({a:x-.88,b:x+.88,lo:.92,hi:3.19,type:"window"}));
  const sideOpenings=[-2.75,2.8].map(z=>({a:z-.84,b:z+.84,lo:1.02,hi:3.20,type:"window"}));
  function cutWall(axis,pos,min,max,openings,label,mat){
    const cuts=[min,max,...openings.flatMap(o=>[o.a,o.b])].sort((a,b)=>a-b);
    for(let k=1;k<cuts.length;k++){
      const a=cuts[k-1],b=cuts[k],center=(a+b)/2;
      if(b-a<.02)continue;
      const active=openings.find(o=>center>o.a+.002&&center<o.b-.002);
      const intervals=!active?[[0,s.wallHeight]]:[[0,active.lo],[active.hi,s.wallHeight]];
      for(const [lo,hi] of intervals){
        if(hi-lo<.06)continue;
        if(axis==="x")box(label+" wall planking "+k+" "+lo.toFixed(2),b-a,hi-lo,.22,
          X+center,floor+(lo+hi)/2,pos,mat);
        else box(label+" wall planking "+k+" "+lo.toFixed(2),.22,hi-lo,b-a,
          pos,floor+(lo+hi)/2,Z+center,mat);
      }
    }
  }
  cutWall("x",front,-hw,hw,frontOpenings,"south visitor",wall);
  cutWall("x",back,-hw,hw,backOpenings,"north rear",wall);
  cutWall("z",X-hw,-hd,hd,sideOpenings,"west flank",wall);
  cutWall("z",X+hw,-hd,hd,sideOpenings,"east flank",wall);
  // Interior finish panels occupy inner wall face, except openings.
  cutWall("x",front+.15,-hw+.15,hw-.15,frontOpenings,"south interior",inner);
  cutWall("x",back-.15,-hw+.15,hw-.15,backOpenings,"north interior",inner);
  cutWall("z",X-hw+.15,-hd+.2,hd-.2,sideOpenings,"west interior",inner);
  cutWall("z",X+hw-.15,-hd+.2,hd-.2,sideOpenings,"east interior",inner);

  // Thin realistic multi-light sash; two-sided glass with forest seen behind.
  function windowFront(x,worldZ,opening,tag){
    const y0=floor+opening.lo,y1=floor+opening.hi;
    const width=opening.b-opening.a,hh=y1-y0,center=(y1+y0)/2;
    box(tag+" aged glass",width-.085,hh-.09,.033,x,center,worldZ,glass);
    for(const sign of [-1,1]){
      box(tag+" carved sash vertical "+sign,.094,hh+.08,.23,
        x+sign*width/2,center,worldZ,door);
      box(tag+" carved sash horizontal "+sign,width+.14,.098,.23,
        x,center+sign*hh/2,worldZ,door);
    }
    for(let col=1;col<=2;col++)
      box(tag+" slim muntin vertical "+col,.035,hh,.07,
        x-width/2+col*width/3,center,worldZ-.053,door);
    for(let row=1;row<=3;row++)
      box(tag+" slim muntin horizontal "+row,width,.035,.07,
        x,y0+row*hh/4,worldZ-.053,door);
    box(tag+" sill",width+.26,.085,.31,x,y0-.07,worldZ-.06,block);
    box(tag+" inset head",width+.24,.10,.28,x,y1+.075,worldZ,beam);
  }
  for(const opening of frontOpenings.filter(o=>o.type==="window"))windowFront(X+(opening.a+opening.b)/2,front-.12,opening,"front");
  for(const opening of backOpenings)windowFront(X+(opening.a+opening.b)/2,back+.12,opening,"rear");
  for(const side of [-1,1]){
    for(const opening of sideOpenings){
      const center=Z+(opening.a+opening.b)/2,wa=opening.b-opening.a,wh=opening.hi-opening.lo;
      const x=X+side*(hw+.02),y=floor+(opening.lo+opening.hi)/2;
      box("side window glass "+side+" "+center,.033,wh-.12,wa-.12,x,y,center,glass);
      for(const dir of [-1,1]){
        box("side sash stile "+side+" "+dir,.24,wh+.10,.089,x,y,center+dir*wa/2,door);
        box("side sash head/sill "+side+" "+dir,.23,.09,wa+.17,x,y+dir*wh/2,center,door);
      }
      for(let row=1;row<4;row++)
        box("side muntin cross "+side+" "+row,.092,.034,wa,x,y-wh/2+row*wh/4,center,door);
      for(let col=1;col<3;col++)
        box("side muntin upright "+side+" "+col,.10,wh,.027,x,y,center-wa/2+col*wa/3,door);
    }
  }
  // Double leaf entry, each open along side wall to keep passage actually clear.
  const doorHeight=2.88,entry=s.entryWidth;
  for(const side of [-1,1]){
    box("entry heavy door frame side "+side,.16,doorHeight+.28,.40,
      X+side*entry/2,floor+(doorHeight+.28)/2,front-.18,posts);
    box("real timber open double door panel "+side,.075,doorHeight-.20,entry*.39,
      X+side*(entry/2+.06),floor+doorHeight/2,front+.42,door);
    for(let row=0;row<3;row++){
      box("glass door inset glass "+side+" "+row,.09,.58,entry*.28,
        X+side*(entry/2+.062),floor+1.23+row*.52,front+.42,glass);
    }
  }
  box("double doors full carved lintel",entry+.48,.19,.41,X,floor+doorHeight+.10,front-.12,posts);
  box("double door threshold",entry+.33,.09,.66,X,floor-.03,front-.24,door);

  // Main true gable roofing, with front half-timber triangle and raking timbers.
  const ridge=wallTop+s.roofRise,edge=wallTop-.14;
  const rr=hw+.68,rise=ridge-edge;
  surface("main left blue steel roof",
    [[X-rr,edge,front-.50],[X,ridge,front-.50],[X,ridge,back+.48],[X-rr,edge,back+.48]],
    [[0,0],[2.5,0],[2.5,3],[0,3]],roof);
  surface("main right blue steel roof",
    [[X,ridge,front-.50],[X+rr,edge,front-.50],[X+rr,edge,back+.48],[X,ridge,back+.48]],
    [[0,0],[2.5,0],[2.5,3],[0,3]],roof);
  box("roof standing seam ridge cap",.22,.17,d+1.03,X,ridge+.05,Z,roof);
  for(const side of [-1,1])for(let i=1;i<=6;i++){
    const fraction=i/7,px=X+side*rr*fraction,py=ridge-rise*fraction;
    box("raised roof standing metal seams "+side+" "+i,.043,.048,d+.99,
      px,py+.043,Z,roof);
  }
  surface("front tall gable inner wood triangle",
    [[X-hw,wallTop,front-.22],[X+hw,wallTop,front-.22],[X,ridge,front-.22]],
    [[0,0],[2.5,0],[1.25,1]],wall);
  surface("rear tall gable inner wood triangle",
    [[X+hw,wallTop,back+.22],[X-hw,wallTop,back+.22],[X,ridge,back+.22]],
    [[0,0],[2.5,0],[1.25,1]],wall);
  // Exposed wood rakes along high roof including underside, not floating bars.
  for(const side of [-1,1]){
    const length=Math.hypot(rr,rise);
    const rake=box("exposed main gable weathered roof rake "+side,.24,.20,length,
       X+side*rr/2,(ridge+edge)/2,front-.55,beam);
    rake.rotation.set(0,Math.PI/2,side*Math.atan2(rise,rr));
  }

  // Deep timber porch elevated to the SAME finished floor.
  const porchY=floor-.08;
  box("visible laid-stone porch foundation",w+.10,.69,s.porchDepth+.32,
    X,ground+.32,(front+porchFront)/2,stone);
  box("actual porch wooden planks",w+.02,.13,s.porchDepth+.15,
    X,porchY,(front+porchFront)/2,deckWood);
  // Two flanking shallow-sloped metal wing roofs and projecting center gable.
  const wingEdge=floor+3.20,wingBack=floor+3.60;
  for(const side of [-1,1]){
    const lo=side<0?X-hw-.40:X+4.45,hi=side<0?X-4.45:X+hw+.40;
    surface("blue metal side porch roof "+side,
      [[lo,wingEdge,porchFront-.30],[hi,wingEdge,porchFront-.30],
       [hi,wingBack,front+.35],[lo,wingBack,front+.35]],
      [[0,0],[2,0],[2,1.2],[0,1.2]],roof);
    box("porch roof edge heavy fascia "+side,hi-lo,.21,.20,
      (lo+hi)/2,wingEdge-.10,porchFront-.32,posts);
    for(let j=1;j<=5;j++){
      const px=lo+(hi-lo)*j/6;
      const q=surface("individual roof seam "+side+" "+j,
        [[px-.024,wingEdge+.03,porchFront-.36],
         [px+.024,wingEdge+.03,porchFront-.36],
         [px+.024,wingBack+.03,front+.33],
         [px-.024,wingBack+.03,front+.33]],[[0,0],[1,0],[1,1],[0,1]],roof);
      q.checkCollisions=false;
    }
  }
  const gHalf=5.2,porticoR=2.27,porticoPeak=floor+3.53+porticoR;
  const canopyFront=porchFront-.40;
  for(const side of [-1,1]){
    surface("actual central projecting gable roof slope "+side,
      [[X,porticoPeak,canopyFront],[X+side*gHalf,floor+3.53,canopyFront],
       [X+side*gHalf,floor+3.53,front+.40],[X,porticoPeak,front+.40]],
      [[0,0],[1.6,0],[1.6,1.2],[0,1.2]],roof);
  }
  surface("front dark gable wooden infill",
    [[X-gHalf,floor+3.53,canopyFront-.10],[X+gHalf,floor+3.53,canopyFront-.10],
     [X,porticoPeak,canopyFront-.10]],[[0,0],[1,0],[.5,1]],walnut);
  // Heavy exposed king post and crossed truss braces at sign's true photo location.
  const postZ=canopyFront-.20;
  box("portico true horizontal king beam",gHalf*2,.30,.32,X,floor+3.50,postZ,posts);
  box("portico center king post",.27,2.1,.30,X,floor+4.61,postZ,posts);
  for(const side of [-1,1]){
    const brace=box("angled rustic gable truss braces "+side,.23,2.90,.27,
      X+side*1.58,floor+4.26,postZ-.03,posts);
    brace.rotation.z=side*.83;
    // Face rake timber
    const rake=box("gable edge genuine timber trim "+side,.22,5.70,.23,
      X+side*2.60,floor+4.64,postZ-.03,posts);
    rake.rotation.z=side*1.16;
  }
  box("portico heavy suspended sign board",5.45,.89,.19,
    X,floor+3.79,postZ-.22,door);
  sign("front Ranger Station wood sign","Ranger Station",5.26,.73,
    X,floor+3.79,postZ-.347,{font:110});

  // Porch posts: two central bracketed posts and outer wing posts; actual stone plinths.
  for(const x0 of [-8.55,-5.2,-3.05,3.05,5.2,8.55]){
    const postX=X+x0;
    box("stone pier at porch front "+x0,.87,.80,.85,
      postX,floor-.27,porchFront+.14,stone);
    cyl("rough round support trunk "+x0,.30,2.90,
      postX,floor+1.60,porchFront+.15,beam);
    box("post rough square crown "+x0,.42,.28,.41,
      postX,floor+3.04,porchFront+.15,posts);
    if(Math.abs(x0)<=5.2){
      const br=box("porch timber knee brace "+x0,.18,1.18,.22,
        postX+(x0<0?.45:-.45),floor+2.68,porchFront+.13,posts);
      br.rotation.z=x0<0?.70:-.70;
    }
  }
  // Side rail sections; the central entry is an open stair with no obstructing rail.
  const railIntervals=[[-hw+.25,-3.45],[3.45,hw-.25]];
  for(const [lo,hi] of railIntervals){
    const mid=X+(lo+hi)/2,len=hi-lo;
    box("front porch top rail "+lo,len,.115,.13,mid,floor+1.06,porchFront+.12,posts);
    box("front porch lower rail "+lo,len,.085,.12,mid,floor+.30,porchFront+.12,posts);
    for(let x=lo+.33;x<hi-.20;x+=.27){
      box("individual spindle "+lo+" "+x,.044,.68,.056,
        X+x,floor+.69,porchFront+.12,posts);
    }
  }
  for(const side of [-1,1]){
    box("side porch timber guardrail upper "+side,.13,.10,s.porchDepth-.45,
      X+side*(hw-.25),floor+1.05,front-s.porchDepth/2,posts);
    for(let z=porchFront+.55;z<front-.25;z+=.33)
      box("side railing narrow baluster "+side+" "+z,.055,.68,.055,
        X+side*(hw-.25),floor+.67,z,posts);
  }
  // Physically distinct 5 rough-cut stone steps to the 0.78m floor.
  for(let i=0;i<5;i++){
    const h=.15*(5-i),zz=porchFront-.34-i*.53;
    box("solid five-run stone entry stair "+i,5.15,h,.54,
      X,ground+h/2,zz,block);
    box("individual stone stair tread "+i,5.20,.044,.55,
      X,ground+h+.004,zz,stone);
  }
  for(const side of [-1,1]){
    const x=X+side*2.62;
    const railing=box("sloping stair side timber handrail "+side,.13,.13,3.03,
      x,ground+.73,porchFront-1.35,posts);
    railing.rotation.x=-.24;
    for(let j=0;j<3;j++)
      box("stair handrail support "+side+" "+j,.13,.71-j*.17,.12,
        x,ground+(.71-j*.17)/2,porchFront-.38-j*.76,posts);
  }
  // Exterior timber lanterns, the warm photographic anchor.
  for(const px of [-7.9,-2.05,2.05,7.9]){
    box("porch wrought lantern arm "+px,.10,.12,.35,
      X+px,floor+2.62,front-.35,dark);
    cyl("authentic amber porch lantern glass "+px,.22,.38,
      X+px,floor+2.32,front-.51,amber);
    cyl("lantern hood dark forged iron "+px,.32,.07,
      X+px,floor+2.57,front-.51,dark);
    cyl("lantern rounded base iron "+px,.28,.06,
      X+px,floor+2.09,front-.51,dark);
  }
  // Right wing stone chimney is EXTERIOR, outside desk/rooms.
  box("right-side massive outdoor chimney masonry",1.13,5.60,1.35,
    X+hw+.93,ground+3.0,Z+3.88,block);
  box("right chimney natural stone cap",1.44,.20,1.65,
    X+hw+.93,ground+5.83,Z+3.88,stone);
  box("right chimney black flue recess",.48,.028,.66,
    X+hw+.93,ground+5.95,Z+3.88,dark);

  // Interior DESK: L return projects into room, chair back points NORTH.
  // Long visitor-facing bowed wood cabinetry placed right-of-centre so
  // the WEST visitor wall and center walking aisle remain open.
  const deskX=X+3.80,deskZ=Z+2.16,deskTop=floor+.81;
  box("L workstation visitor-facing hardwood writing surface",
    4.20,.10,1.14,deskX,deskTop,deskZ,deckWood);
  const returnX=X+1.97,returnZ=Z+3.53;
  box("L desk side return genuine hardwood writing surface",
    1.07,.10,3.45,returnX,deskTop,returnZ,deckWood);
  // Faceted bow of 9 closely aligned recessed timber panels, shallow curve.
  for(let i=0;i<9;i++){
    const x=deskX-1.90+i*.475;
    const bulge=.12*Math.sin((i+.5)*Math.PI/9);
    const faceZ=deskZ-.59-bulge;
    box("desk bowed panel solid base "+i,.47,.67,.12,x,floor+.40,faceZ,walnut);
    box("desk deeply recessed aged wood panel "+i,.38,.47,.026,
      x,floor+.43,faceZ-.073,door);
    box("desk lower trim scotia "+i,.44,.055,.055,
      x,floor+.14,faceZ-.083,posts);
    for(const sign of [-1,1])
      box("desk vertical panel frame "+i+" "+sign,.04,.55,.045,
        x+sign*.208,floor+.43,faceZ-.10,walnut);
  }
  box("L desk bow continuous hardwood cornice",4.22,.09,.20,
    deskX,deskTop-.09,deskZ-.66,posts);
  for(let j=0;j<6;j++){
    const z=Z+2.27+j*.55;
    box("L desk return solid paneled visitor wing "+j,.105,.65,.54,
      returnX-.56,floor+.40,z,walnut);
    box("L desk return recessed face "+j,.02,.43,.44,
      returnX-.63,floor+.42,z,door);
  }
  // Only end pedestal outside chair knee area; NO central pillar.
  box("desk outer drawer cabinet",.61,.69,.89,
    deskX+1.73,floor+.37,deskZ+.11,walnut);
  const chairX=X+4.67,chairZ=Z+4.52;
  cyl("ranger office chair swivel stem",.13,.35,
    chairX,floor+.32,chairZ,dark);
  ball("deep cushioned brown leather chair seat",.78,.14,.72,
    chairX,floor+.59,chairZ,leather);
  ball("tall rounded leather chair back",.81,.88,.16,
    chairX,floor+1.18,chairZ+.38,leather);
  for(const side of [-1,1]){
    box("ranger chair padded armrest "+side,.14,.10,.54,
      chairX+side*.45,floor+.78,chairZ-.02,leather);
    cyl("chair armrest black support "+side,.065,.30,
      chairX+side*.43,floor+.64,chairZ+.15,dark);
  }
  for(let k=0;k<5;k++){
    const a=k*Math.PI*2/5;
    box("swivel chair five caster spokes "+k,.075,.07,.48,
      chairX+Math.sin(a)*.21,floor+.15,chairZ+Math.cos(a)*.21,dark,a);
  }
  // Seven independent note stacks on visitor edge.
  for(let k=0;k<7;k++){
    const xx=deskX-1.76+k*.57;
    for(let l=0;l<3+k%3;l++)
      box("separate ranger case notes pile "+k+" page "+l,.49,.012,.36,
        xx,deskTop+.07+l*.015,deskZ-.22,paper);
  }
  // Single six-feed desktop monitor, photo-style labels, two represented feeds.
  const mx=deskX-.14,mz=deskZ+.20;
  box("real LCD monitor black back housing",1.29,.73,.10,
    mx,deskTop+.62,mz,dark);
  box("LCD monitor central upright",.065,.31,.09,
    mx,deskTop+.17,mz+.03,iron);
  box("monitor actual base",.49,.042,.27,mx,deskTop+.04,mz+.08,dark);
  const lcd=track(new B.DynamicTexture("PHOTO RANGER six camera status",
    {width:768,height:480},scene,false));
  const lctx=lcd.getContext();
  lctx.fillStyle="#09151a";lctx.fillRect(0,0,768,480);
  for(let k=0;k<6;k++){
    const tx=7+(k%3)*252,ty=8+Math.floor(k/3)*238;
    lctx.fillStyle=k<2?"#23433a":"#0c2025";
    lctx.fillRect(tx,ty,244,228);
    lctx.fillStyle="#e6eee9";lctx.font="bold 17px Arial";lctx.textAlign="center";
    lctx.fillText(["EAST BANK","THE ROOST","WEST BANK","SOUTH HILL","INFRARED","CAMERA 6"][k],
      tx+122,ty+206);
    if(k<2){
      lctx.fillStyle="#698075";lctx.beginPath();lctx.moveTo(tx,ty+168);
      lctx.lineTo(tx+60,ty+88);lctx.lineTo(tx+135,ty+150);
      lctx.lineTo(tx+195,ty+76);lctx.lineTo(tx+244,ty+155);
      lctx.lineTo(tx+244,ty+188);lctx.lineTo(tx,ty+188);lctx.fill();
    }else{lctx.font="bold 19px Arial";lctx.fillText("NO SIGNAL",tx+122,ty+115);}
  }
  lcd.update();
  const lcdMat=track(new B.StandardMaterial("Photo ranger LCD screen",scene));
  lcdMat.diffuseTexture=lcd;lcdMat.emissiveColor=new B.Color3(.14,.20,.21);
  lcdMat.backFaceCulling=false;
  plane("visible six-status feed display",1.18,.64,
    mx,deskTop+.62,mz-.062,lcdMat,Math.PI);
  // Physical CB transceiver on east return; knobs and a detached corded mic.
  const rx=returnX,rz=returnZ+.58;
  box("CB real black radio metal chassis",.77,.25,.41,rx,deskTop+.19,rz,dark);
  box("CB silver front faceplate",.71,.19,.023,rx,deskTop+.19,rz-.22,iron);
  box("CB small green display",.28,.092,.025,rx-.20,deskTop+.23,rz-.24,green);
  for(let i=0;i<3;i++)
    cyl("CB circular channel volume knob "+i,.091,.06,
      rx+.05+i*.125,deskTop+.18,rz-.26,gold,"z");
  box("CB coiled microphone",.18,.11,.34,rx+.45,deskTop+.16,rz+.36,dark);
  const cord=[];
  for(let i=0;i<=26;i++){
    const t=i/26;
    cord.push(new B.Vector3(rx+.28+.032*Math.sin(t*20*Math.PI),
      deskTop+.12+.028*Math.cos(t*20*Math.PI),rz+t*.37));
  }
  const tube=track(B.MeshBuilder.CreateTube("PHOTO RANGER microphone curled cable",
    {path:cord,radius:.014,tessellation:6},scene));
  tube.material=dark;tube.isPickable=false;tube.checkCollisions=false;
  cyl("ranger desk ceramic coffee mug",.18,.20,
    deskX+1.47,deskTop+.18,deskZ+.14,cream);
  // Flared realistic brass-and-fabric lamp.
  const lx=deskX-1.37,lz=deskZ+.31;
  cyl("desk lamp brass stand",.072,.52,lx,deskTop+.38,lz,gold);
  cyl("lamp base patinated bronze",.23,.053,lx,deskTop+.09,lz,gold);
  const shade=track(B.MeshBuilder.CreateCylinder("PHOTO RANGER flared cream linen shade",
    {height:.41,diameterTop:.35,diameterBottom:.68,tessellation:20},scene));
  shade.position.set(lx,deskTop+.81,lz);shade.material=cream;
  shade.isPickable=false;shade.checkCollisions=false;
  const warm=track(new B.PointLight("PHOTO RANGER warm desk task light",
    new B.Vector3(lx,deskTop+.72,lz),scene));
  warm.diffuse=new B.Color3(1,.72,.45);warm.intensity=.32;warm.range=4.1;
  // WOODLAND VISITOR WALL: big West Virginia map, large notices, bench+equipment.
  // Both are separate wall-mounted surfaces, not a screenshot pretending to be a room.
  const west=X-hw+.29;
  const boardY=floor+2.23;
  box("WV topo map real timber surround",.13,2.65,3.15,
    west,boardY,Z-2.63,posts);
  box("large ivory paper map substrate",.16,2.42,2.97,
    west+.08,boardY,Z-2.63,paper);
  box("public notice board natural cork frame",.14,2.74,3.38,
    west,boardY,Z+2.02,posts);
  const wallLabels=[
    {name:"West Virginia map",z:Z-2.63,words:"WEST VIRGINIA",width:2.76,height:2.24},
    {name:"Forest and wildlife information",z:Z+2.02,
      words:"OUR FORESTS\nOUR WATER\nOUR WILDLIFE\nOUR HOME",width:3.11,height:2.54}
  ];
  for(const item of wallLabels){
    const dt=track(new B.DynamicTexture("PHOTO RANGER authentic reference "+item.name,
      {width:512,height:640},scene,false));
    const g=dt.getContext();
    g.fillStyle=item.name.includes("map")?"#e9e2ca":"#b99b70";
    g.fillRect(0,0,512,640);
    if(item.name.includes("map")){
      g.fillStyle="#2f382e";g.textAlign="center";g.font="bold 38px Georgia";
      g.fillText(item.words,256,63,485);
      g.fillStyle="#90b495";g.beginPath();
      [[95,280],[155,242],[192,164],[251,232],[279,177],[334,226],
       [429,278],[350,343],[326,380],[245,420],[177,464],[100,402],
       [73,335]].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
      g.closePath();g.fill();
      g.strokeStyle="#65846e";g.lineWidth=3;g.stroke();
      g.strokeStyle="#527761";g.lineWidth=1.5;
      for(let j=0;j<15;j++){g.beginPath();g.moveTo(130,255+j*7);g.lineTo(350,220+j*13);g.stroke();}
    }else{
      g.fillStyle="#ede5cf";g.fillRect(28,24,456,288);
      g.fillStyle="#31573e";g.textAlign="center";g.font="bold 31px Arial";
      item.words.split("\n").forEach((line,i)=>g.fillText(line,256,83+i*49));
      for(let i=0;i<10;i++){
        const xx=24+(i%3)*164,yy=326+Math.floor(i/3)*73;
        g.fillStyle=i%2?"#cfd9c9":"#e9e8df";g.fillRect(xx,yy,147,63);
        g.fillStyle="#849981";g.fillRect(xx+7,yy+10,95,4);
        g.fillStyle="#768d6c";g.fillRect(xx+7,yy+23,127,3);
      }
    }
    dt.update();
    const mat=track(new B.StandardMaterial("PHOTO RANGER visitor poster "+item.name,scene));
    mat.diffuseTexture=dt;mat.backFaceCulling=false;
    plane("genuine visitor map and cork prints "+item.name,
      item.width,item.height,west+.19,boardY,item.z,mat,-Math.PI/2);
  }
  // Printed photos and documents are thin planar surfaces ON real cork, never room-wide scenery.
  box("rough visitor gear bench handcrafted top",.80,.11,5.7,
    X-hw+1.15,floor+.83,Z-.22,deckWood);
  for(const dz of [-2.60,2.28]){
    box("rustic visitor bench leg "+dz,.14,.78,.15,
      X-hw+1.14,floor+.42,Z+dz,posts);
  }
  box("heavy brown storage trunk under bench",.63,.56,1.32,
    X-hw+1.12,floor+.29,Z-1.03,leather);
  for(const dd of [-.5,.5])box("trunk reinforced metal straps "+dd,
    .66,.058,.058,X-hw+1.12,floor+.34,Z-1.03+dd,dark);
  ball("soft olive backpack on visitor desk",.38,.57,.28,
    X-hw+1.12,floor+1.34,Z-2.16,green);
  for(const side of [-1,1])box("rucksack straps "+side,.09,.64,.045,
    X-hw+1.49,floor+1.31,Z-2.16+side*.17,leather);
  for(const side of [-1,1])cyl("field binocular black eyepiece "+side,.11,.22,
    X-hw+1.07,floor+1.04,Z-.80+side*.14,dark,"x");
  cyl("stainless ranger water bottle",.11,.35,
    X-hw+1.16,floor+1.08,Z+1.55,iron);
  // Adjacent green canvas folding visitor seat and small rustic chest.
  const vcX=X-6.47,vcZ=Z+4.55;
  for(const side of [-1,1])for(const dz of [-.25,.25])
    cyl("visitor canvas chair actual timber leg "+side+" "+dz,.075,1.0,
      vcX+side*.34,floor+.50,vcZ+dz,posts);
  box("canvas folding green seat",.69,.07,.62,vcX,floor+.56,vcZ,green);
  const backrest=box("green fabric visitor chair back",.76,.62,.05,
    vcX,floor+1.08,vcZ+.32,green);
  backrest.rotation.x=.08;
  box("wall photo bulletin small visitor box",.08,1.25,1.55,
    west,boardY,Z+4.95,posts);
  // Rear office shelves at WEST of large chair; filing cabinet and ranger hat EAST.
  const shX=X+.05,shZ=back-.56;
  for(let row=0;row<5;row++){
    const yy=floor+.16+row*.60;
    box("shelf rough wood level "+row,1.35,.09,.52,shX,yy,shZ,posts);
    if(row<4)for(let book=0;book<7;book++)
      box("individual real 3D field guide "+row+" "+book,.13,.32+(book%3)*.07,.34,
        shX-.53+book*.17,yy+.22,shZ,(row+book)%2?green:leather);
  }
  for(const side of [-1,1])box("bookshelf tall lumber stile "+side,
    .13,2.70,.57,shX+side*.68,floor+1.43,shZ,posts);
  const cabinetX=X+7.65,cabinetZ=back-.57;
  box("green olive metal ranger filing cabinet",.79,1.78,.63,
    cabinetX,floor+.91,cabinetZ,green);
  for(let i=0;i<4;i++){
    box("filing cabinet drawer panel "+i,.64,.30,.03,
      cabinetX,floor+.33+i*.39,cabinetZ-.32,iron);
    box("filing drawer metallic handle "+i,.24,.04,.05,
      cabinetX,floor+.34+i*.39,cabinetZ-.35,gold);
  }
  cyl("filing cabinet glowing oil lantern",.20,.36,
    cabinetX,floor+2.08,cabinetZ,amber);
  cyl("ranger hat crown",.33,.15,X+7.4,floor+2.54,back-.33,cream);
  cyl("wide hat brim",.65,.045,X+7.4,floor+2.45,back-.33,cream);
  box("hanging ranger coat dark olive",.65,1.06,.13,
    X+8.52,floor+1.65,back-.31,green);
  // Distinct permanent detail: planked framed walls, overhead exposed beams.
  for(const dx of [-6.8,-2.4,2.4,6.8])
    box("interior visible overhead timber beam "+dx,.19,.23,d-.62,
      X+dx,wallTop-.25,Z,posts);
  for(const dx of [-5.2,0,5.2]){
    box("warm rustic accent overhead support "+dx,1.12,.18,.23,
      X+dx,wallTop-.31,back-.38,posts);
  }
  // Lightweight outdoor landscaping: natural small stones and hardy flowering pots,
  // actual 3D items beside stairs; no fake photo backdrop.
  const grass=pbr("mossy_stone_wall",{u:1,v:1});
  for(const side of [-1,1]){
    const x=X+side*3.23,z=porchFront-.83;
    cyl("outside clay flower planter pot "+side,.54,.43,x,ground+.23,z,stone);
    ball("natural green plant foliage "+side,.66,.52,.68,x,ground+.62,z,green);
    for(let i=0;i<5;i++){
      const ang=i*2*Math.PI/5;
      ball("warm yellow flower "+side+" "+i,.11,.09,.10,
        x+Math.cos(ang)*.23,ground+.88,z+Math.sin(ang)*.24,amber);
    }
  }
  for(let i=0;i<15;i++){
    const side=i%2?-1:1;
    const px=X+side*(3.8+(i%5)*.55);
    const pz=porchFront-1.4-(Math.floor(i/2)%4)*.56;
    const y=surfaceHeight?.(s.x+side*(3.8+(i%5)*.55),s.z-(hd+s.porchDepth+1.4+
      (Math.floor(i/2)%4)*.56));
    box("natural irregular entry path stone "+i,.42+(i%3)*.11,.034,
      .25+(i%4)*.09,px,Number.isFinite(y)?y+.07:ground+.07,pz,grass,(i%4)*.33);
  }
  return 1;
}