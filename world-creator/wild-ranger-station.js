/**
 * The Wild — Appalachian Ranger Lodge, inspired by WVLRP's approved
 * Community 360 Ranger Station (assets/community-clearing-v1.webp).
 *
 * Distinct from the original interactive 360 interior. This is a true,
 * enterable 3D timber-and-fieldstone structure with PBR materials from
 * the approved Poly Haven material yard. Static interior props are not
 * substitutes for the original ranger-station.html interactive quests.
 *
 * All game coordinates are metres. Hearthside (0,0), station (0,350).
 * Everything, including Babylon textures, is tracked for tile teardown.
 */
import {flatlandHeight} from "./wild-rebuild-layout.js";

export const NORTH_RANGER_STATION=Object.freeze({
  id:"north-ranger-station",name:"Ranger Station",x:0,z:350,
  front:"south",panelsWide:6,panelsDeep:4,panelMetres:3,
  width:18,depth:12,entryWidth:2.8,
  door:"rough_pine_door",walls:"pine_bark",roof:"corrugated_iron"
});

export function rangerVisibleInTile(cx,cy){
  return Math.abs(NORTH_RANGER_STATION.x-cx)<=90 &&
         Math.abs(NORTH_RANGER_STATION.z-cy)<=90;
}
export function rangerWallCollision(x,z,padding=.25){
  const s=NORTH_RANGER_STATION,dx=x-s.x,dz=z-s.z;
  const wall=.24+padding,hw=s.width/2,hd=s.depth/2;
  if(Math.abs(dx)>hw+wall||Math.abs(dz)>hd+wall)return false;
  if(Math.abs(dz-hd)<=wall)return true;
  // Open 2.8m doorway centered on the southern wall, so visitors enter.
  if(Math.abs(dz+hd)<=wall)return Math.abs(dx)>s.entryWidth/2-padding;
  return (Math.abs(dx-hw)<=wall||Math.abs(dx+hw)<=wall);
}
export function buildNorthRangerStation(B,scene,track,{cx,cy,seed,base,surfaceHeight}){
  if(!rangerVisibleInTile(cx,cy))return 0;
  const s=NORTH_RANGER_STATION;
  const X=s.x-cx,Z=s.z-cy;
  const measured=surfaceHeight?.(s.x,s.z);
  const Y=Number.isFinite(measured)?measured:flatlandHeight(s.x,s.z,seed,base);
  const w=s.width,d=s.depth,half=w/2,front=Z-d/2,back=Z+d/2;
  const floor=Y+.76,wallH=4.0,top=floor+wallH,roofRise=3.05;
  const rootPath="./assets/building/";
  const materials=new Map();
  const finish=(id,{texture="1k",metal=false,repeatU=1,repeatV=1}={})=>{
    const key=id+"-"+texture+"-"+repeatU+"-"+repeatV;
    if(materials.has(key))return materials.get(key);
    const mat=track(new B.PBRMaterial("Ranger lodge CC0 "+key,scene));
    const tex=(kind,res)=>{
      const t=track(new B.Texture(rootPath+id+"_"+kind+"_"+res+".jpg",scene));
      t.wrapU=B.Texture.WRAP_ADDRESSMODE;t.wrapV=B.Texture.WRAP_ADDRESSMODE;
      t.uScale=repeatU;t.vScale=repeatV;return t;
    };
    // HD 2K color on the most visible bark, timber, stone and metal surfaces.
    mat.albedoTexture=tex("diffuse",texture);
    // Newly downloaded HD materials have no 1K normal/ARM variants;
    // avoid broken texture requests and missing relief on the live station.
    const detailRes=new Set(["pine_bark","weathered_planks","wood_planks",
      "stacked_stone_wall"]).has(id)?"2k":"1k";
    mat.bumpTexture=tex("normal",detailRes);
    mat.bumpTexture.level=metal?.56:.69;
    mat.metallicTexture=tex("arm",detailRes);
    mat.useRoughnessFromMetallicTextureGreen=true;
    mat.useMetallnessFromMetallicTextureBlue=true;
    mat.metallic=metal?.67:0;mat.roughness=metal?.79:.96;
    mat.backFaceCulling=false;
    materials.set(key,mat);
    return mat;
  };
  const bark=finish("pine_bark",{texture:"2k",repeatV:2});
  const stacked=finish("wood_trunk_wall",{texture:"2k",repeatU:2});
  const timber=finish("weathered_planks",{texture:"2k",repeatV:2});
  const wood=finish("wood_planks",{texture:"2k",repeatU:2,repeatV:2});
  const doorMat=finish("rough_pine_door",{texture:"2k"});
  const stone=finish("mossy_stone_wall",{texture:"2k",repeatU:2});
  const masonry=finish("stacked_stone_wall",{texture:"2k"});
  const metal=finish("corrugated_iron",{texture:"2k",metal:true,repeatV:2});

  const makeMat=(name,hex,{emission=null,alpha=1}={})=>{
    const m=track(new B.StandardMaterial("Ranger "+name,scene));
    m.diffuseColor=B.Color3.FromHexString(hex);
    m.specularColor=new B.Color3(.12,.13,.13);
    if(emission)m.emissiveColor=B.Color3.FromHexString(emission);
    m.alpha=alpha;
    m.backFaceCulling=false;return m;
  };
  const dark=makeMat("charcoal iron","#262b27");
  const darkWood=makeMat("deep brown timber","#402e22");
  const brass=makeMat("aged brass","#ba9561");
  const glass=makeMat("clear window glass","#aab4b2",{alpha:.13});
  const warmLight=makeMat("warm lantern glow","#f4cd87",{emission:"#cf9c54"});
  const paper=makeMat("old paper","#e6d9b4");
  const brownPaper=makeMat("brown card","#a98762");
  const ink=makeMat("black display","#0f2023",{emission:"#102a29"});
  const foliage=makeMat("paper map green","#769479");

  function box(name,ww,hh,dd,x,y,z,mat,rz=0,rx=0){
    const m=track(B.MeshBuilder.CreateBox("RANGER LODGE "+name,
      {width:ww,height:hh,depth:dd},scene));
    m.position.set(x,y,z);m.rotation.z=rz;m.rotation.x=rx;
    m.material=mat;m.isPickable=false;m.checkCollisions=false;
    return m;
  }
  function cylinder(name,diam,len,x,y,z,mat,axis="y"){
    const m=track(B.MeshBuilder.CreateCylinder("RANGER LODGE "+name,
      {height:len,diameter:diam,tessellation:16,cap:B.Mesh.CAP_ALL},scene));
    m.position.set(x,y,z);
    if(axis==="x")m.rotation.z=-Math.PI/2;
    if(axis==="z")m.rotation.x=Math.PI/2;
    m.material=mat;m.isPickable=false;m.checkCollisions=false;return m;
  }
  function signText(name,label,ww,hh,x,y,z,size=64){
    const tex=track(new B.DynamicTexture("Ranger carved sign "+name,
      {width:1024,height:256},scene,false));
    const c=tex.getContext();
    c.fillStyle="#4d3420";c.fillRect(0,0,1024,256);
    c.strokeStyle="#bd9a65";c.lineWidth=13;c.strokeRect(10,10,1004,236);
    c.strokeStyle="#634c2c";c.lineWidth=3;c.strokeRect(25,25,974,206);
    c.textAlign="center";c.textBaseline="middle";
    c.font="bold "+size+"px Georgia,serif";c.fillStyle="#f6ddb0";
    c.fillText(label,512,130,958);tex.update();
    const m=track(new B.StandardMaterial("Ranger sign text "+name,scene));
    m.diffuseTexture=tex;m.emissiveColor=new B.Color3(.11,.075,.035);
    m.backFaceCulling=false;
    const plane=track(B.MeshBuilder.CreatePlane("RANGER LODGE "+name,
      {width:ww,height:hh},scene));
    plane.position.set(x,y,z);plane.rotation.y=Math.PI;
    plane.material=m;plane.isPickable=false;return plane;
  }
  // The foundation and porches are true separate masonry/plank shapes.
  box("foundation full stonework",w+.80,.73,d+.75,X,Y+.30,Z,stone);
  box("stone water table",w+.90,.16,d+.85,X,Y+.67,Z,masonry);
  box("wide pine-plank interior floor",w-.5,.16,d-.5,X,floor-.065,Z,wood);
  box("stone exterior west skirt",.52,1.03,d+.82,X-half-.12,Y+.46,Z,stone);
  box("stone exterior east skirt",.52,1.03,d+.82,X+half+.12,Y+.46,Z,stone);
  box("stone exterior rear skirt",w+.74,1.03,.48,X,Y+.46,back+.13,stone);
  for(const side of [-1,1]){
    box("front stone skirt "+side,(w-s.entryWidth)/2,.93,.42,
      X+side*(w+s.entryWidth)/4,Y+.41,front-.12,masonry);
  }

  const logDia=.42,logStep=.345,logCount=12;
  const log=(name,len,x,y,z,axis="x",n=0)=>{
    const m=track(B.MeshBuilder.CreateCylinder("RANGER LODGE "+name,{
      height:len,diameterTop:logDia*(1-.012*(n%3)),
      diameterBottom:logDia*(1-.013*((n+1)%3)),
      tessellation:14,cap:B.Mesh.CAP_ALL},scene));
    m.position.set(x,y,z);
    if(axis==="x")m.rotation.z=-Math.PI/2;
    else m.rotation.x=Math.PI/2;
    m.material=bark;m.isPickable=false;m.checkCollisions=false;return m;
  };
  // Three horizontal lodge zones: two flanking window wings and central portico.
  // Logs remain fully cylindrical with real rounded end grains and uneven lap ends.
  const frontWindows=[-6.65,-3.70,3.70,6.65];
  const windowW=1.85,sill=floor+1.25,lintel=floor+2.94;
  const opening=(y)=>{
    const gap=[];
    if(y<floor+2.96)gap.push([-s.entryWidth/2,s.entryWidth/2]);
    if(y>=sill&&y<=lintel)
      for(const x of frontWindows)gap.push([x-windowW/2,x+windowW/2]);
    return gap.sort((a,b)=>a[0]-b[0]);
  };
  function segments(a,b,holes){
    const out=[];let start=a;
    for(const [u,v] of holes){
      if(u>start+.13)out.push([start,u]);
      start=Math.max(start,v);
    }
    if(start<b-.13)out.push([start,b]);
    return out;
  }
  for(let n=0;n<logCount;n++){
    const y=floor+.18+n*logStep;
    log("rear round-timber course "+n,w+(n%2?.24:.74),X,y,back,"x",n);
    for(const side of [-1,1]){
      log("east/west interlocked timber "+side+" "+n,
        d+(n%2?.76:.18),X+side*half,y,Z,"z",n);
    }
    for(const [a,b] of segments(-half,half,opening(y))){
      log("front door/window cut round timber "+n+" "+a.toFixed(2),
        b-a+.08,X+(a+b)/2,y,front,"x",n);
    }
  }
  // Raised full-height massive corner timbers and exposed framing.
  for(const side of [-1,1])for(const z of [front,back]){
    box("solid structural corner post "+side+" "+z,.49,wallH+.48,.50,
      X+side*(half-.06),floor+wallH/2,z,timber);
    box("corner stone plinth "+side+" "+z,.93,.95,.94,
      X+side*(half-.06),Y+.44,z-.02,masonry);
  }
  for(const side of [-1,1]){
    box("facade lodge wing structural upright "+side,.26,wallH+.24,.34,
      X+side*5.15,floor+wallH/2,front-.26,timber);
    box("central pavilion heavy upright "+side,.30,wallH+.24,.38,
      X+side*1.62,floor+wallH/2,front-.27,timber);
  }
  // Four real four-light sash windows. Keep muntins slim, avoid the
  // duplicate central sash and cartoon-thick crossed boards of the first pass.
  // Side shutters are narrow, open-louver timber shutters with proper stiles,
  // top/bottom rails and wrought-iron hinges — NOT four ladder-like bars.
  const windowHeight=lintel-sill;
  for(const [i,x0] of frontWindows.entries()){
    const x=X+x0,mid=(sill+lintel)/2;
    box("window almost clear glazing "+i,windowW-.13,windowHeight-.11,.028,
      x,mid,front+.135,glass);
    // Slim inset wooden sash perimeter, plus one of each central muntin.
    for(const side of [-1,1]){
      box("window narrow vertical outer sash "+i+" "+side,
        .078,windowHeight+.055,.16,
        x+side*(windowW/2-.035),mid,front-.335,timber);
    }
    for(const side of [-1,1]){
      box("window narrow horizontal outer sash "+i+" "+side,
        windowW+.055,.080,.16,
        x,mid+side*(windowHeight/2-.033),front-.335,timber);
    }
    box("window single slender vertical muntin "+i,
      .043,windowHeight-.07,.095,
      x,mid,front-.414,wood);
    box("window single slender horizontal muntin "+i,
      windowW-.085,.040,.095,
      x,mid,front-.416,wood);

    // True louvered shutters mounted beside—not across—the glass.
    for(const side of [-1,1]){
      const centerX=x+side*(windowW/2+.265);
      const shutterZ=front-.390;
      const shutterW=.52,shutterH=windowHeight+.02;
      // Narrow recessed backing shows through real louver gaps.
      box("shutter recessed dark shadow "+i+" "+side,
        shutterW-.055,shutterH-.055,.035,
        centerX,mid,shutterZ+.055,darkWood);
      for(const edge of [-1,1]){
        box("shutter slim weathered vertical stile "+i+" "+side+" "+edge,
          .074,shutterH,.084,
          centerX+edge*(shutterW/2-.037),mid,shutterZ-.025,timber);
      }
      for(const edge of [-1,1]){
        box("shutter narrow horizontal frame rail "+i+" "+side+" "+edge,
          shutterW,.114,.083,
          centerX,mid+edge*(shutterH/2-.057),shutterZ-.026,timber);
      }
      // Closely spaced angled individual louvers (not broad raised planks).
      // 12 per shutter give fine shadow lines up close on a mobile screen.
      const slats=12;
      for(let k=0;k<slats;k++){
        box("shutter angled narrow timber louver "+i+" "+side+" "+k,
          shutterW-.148,.048,.093,
          centerX,mid-.684+k*(1.368/(slats-1)),shutterZ-.048,
          wood,0,-.31);
      }
      const hingeX=centerX-side*(shutterW/2-.012);
      for(const high of [-1,1]){
        const hingeY=mid+high*(shutterH/2-.32);
        box("small black iron shutter hinge leaf "+i+" "+side+" "+high,
          .14,.030,.020,hingeX,hingeY,shutterZ-.081,dark);
        box("black iron hinge pivot "+i+" "+side+" "+high,
          .030,.075,.025,
          hingeX-side*.069,hingeY,shutterZ-.087,dark);
      }
    }
    // A restrained header and realistic stone drip sill; no huge beam.
    box("window narrow exterior head trim "+i,
      windowW+.20,.11,.25,x,lintel+.068,front-.30,timber);
    box("window thin natural sandstone sill "+i,
      windowW+.24,.105,.38,x,sill-.085,front-.30,masonry);
  }
  // Open entry into the actual 3D room — two doors stood open against the jambs.
  for(const side of [-1,1]){
    box("open vertical pine entry door "+side,.86,2.73,.13,
      X+side*1.58,floor+1.37,front+.26,doorMat,0);
    box("carved entrance jamb "+side,.22,3.04,.34,
      X+side*(s.entryWidth/2+.13),floor+1.5,front-.30,timber);
    cylinder("entry iron latch "+side,.095,.10,
      X+side*1.12,floor+1.33,front+.13,brass,"z");
  }
  box("heavy entry transom",s.entryWidth+.54,.33,.50,
    X,floor+3.04,front-.29,timber);
  // Deep lodge main gables, not cardboard square-ended walls.
  function gable(name,z0,width,height,yTop,mat){
    const m=track(new B.Mesh("RANGER LODGE "+name,scene));
    const vertices=[X-width/2,yTop,z0,X,yTop+height,z0,
      X+width/2,yTop,z0];
    const indices=[0,1,2,2,1,0],normals=[];
    B.VertexData.ComputeNormals(vertices,indices,normals);
    const v=new B.VertexData();
    v.positions=vertices;v.indices=indices;
    v.normals=normals;v.uvs=[0,0,.5,1,1,0];
    v.applyToMesh(m);m.material=mat;m.isPickable=false;return m;
  }
  gable("main south chalet gable",front,w,roofRise,top,stacked);
  gable("main rear chalet gable",back,w,roofRise,top,stacked);
  const overhang=.89,roofSpan=half+overhang;
  const pitch=Math.atan2(roofRise,roofSpan),slope=Math.hypot(roofSpan,roofRise);
  for(const side of [-1,1]){
    box("large weathered iron gable roof "+side,slope+.20,.19,d+2.15,
      X+side*roofSpan/2,top+roofRise/2,Z,metal,-side*pitch);
    box("main roof front edge structural rake "+side,slope+.23,.19,.25,
      X+side*roofSpan/2,top+roofRise/2,front-1.05,timber,-side*pitch);
    box("main gable trim diagonal "+side,slope+.12,.23,.32,
      X+side*half/2,top+roofRise/2,front-.23,timber,-side*pitch);
    for(let i=0;i<18;i++){
      const z=Z-d/2-.74+i*(d+1.48)/17;
      box("physical roof corrugated standing ribs "+side+" "+i,
        slope+.03,.045,.045,
        X+side*roofSpan/2,top+roofRise/2+.09,z,metal,-side*pitch);
    }
  }
  box("main ridge cap",.32,.20,d+2.2,X,top+roofRise,Z,metal);
  // Loft truss, queen-post braces, and visible dark timber in the large gable.
  box("main gable collar tie",w*.62,.20,.43,X,top+roofRise*.40,front-.37,timber);
  for(const side of [-1,1]){
    box("heavy queen post "+side,.23,roofRise*.57,.27,
      X+side*w*.195,top+roofRise*.32,front-.45,timber);
    box("king truss diagonal "+side,4.4,.22,.27,
      X+side*2.35,top+roofRise*.57,front-.47,timber,-side*.53);
  }
  // Full-length 17m porch, broad middle stairway and timber/stone colonnade.
  const porchDepth=4.60,porchFront=front-porchDepth;
  box("deep walkable covered porch stone understructure",w-.35,.52,porchDepth+.10,
    X,Y+.42,front-porchDepth/2,masonry);
  box("separate authentic planked porch deck",w-.28,.19,porchDepth+.12,
    X,floor-.09,front-porchDepth/2,wood);
  box("porch broad front fascia",w-.2,.28,.24,
    X,floor-.10,porchFront-.07,timber);
  // Roof pitches down toward the porch front and runs full facade width.
  box("long slate-grey iron porch roof",w+1.10,.19,porchDepth+1.08,
    X,top-.63,front-porchDepth/2-.06,metal,0,-.12);
  box("porch front edge heavy wood fascia",w+.83,.26,.24,
    X,top-.97,porchFront-.39,timber);
  for(let i=0;i<21;i++){
    const x=X-half-.30+i*((w+.60)/20);
    box("porch tin standing seam "+i,.042,.052,porchDepth+1.10,
      x,top-.53,front-porchDepth/2-.06,metal,0,-.12);
  }
  for(const x0 of [-7.7,-4.75,4.75,7.7]){
    const x=X+x0;
    box("porch stone load pier "+x0,.95,1.02,.95,
      x,Y+.49,porchFront+.16,masonry);
    cylinder("full round hardwood porch column "+x0,.44,2.85,
      x,floor+1.02+2.85/2,porchFront+.13,bark);
    box("post timber footing "+x0,.69,.16,.69,
      x,floor+1.10,porchFront+.13,timber);
    box("capital cross timber "+x0,.84,.22,.62,
      x,top-.63,porchFront+.13,timber);
    for(const side of [-1,1]){
      box("angled handcrafted front knee brace "+x0+" "+side,.13,1.25,.21,
        x+side*.46,top-1.28,porchFront+.12,timber,-side*.66);
    }
  }
  // Porch timber rails leave 5m middle completely clear for visitors and stairs.
  for(const side of [-1,1]){
    const start=2.6,end=8.2,length=end-start,center=(end+start)/2;
    const x=X+side*center;
    for(const z of [porchFront+.17]){
      box("continuous timber railing "+side,length,.13,.21,x,floor+1.04,z,wood);
      box("lower timber railing "+side,length,.12,.19,x,floor+.33,z,wood);
      for(let k=0;k<11;k++){
        const xx=X+side*(start+.25+k*(length-.5)/10);
        box("individual porch railing baluster "+side+" "+k,
          .10,.75,.11,xx,floor+.67,z,wood);
      }
    }
  }
  // Broad three-tier fieldstone stairs with no steep step near doorway.
  for(let n=0;n<3;n++){
    const stepD=.55;
    box("wide handmade sandstone approach step "+n,
      5.15+.30*n,.20+n*.14,stepD,
      X,Y+.07+n*.12,porchFront-.33-n*.52,masonry);
  }
  box("entry flagstone threshold",s.entryWidth+.50,.09,.85,
    X,floor-.06,front-.38,masonry);
  // Signature projecting central lodge gable over the entry (visual reference).
  // A peaked roof over the middle of the long porch breaks up the canopy.
  const porticoW=7.55,porticoRise=1.75,porticoTop=top-.57;
  const porticoZ=porchFront-.47;
  gable("large center-facing portico triangular timber pediment",
    porticoZ,porticoW,porticoRise,porticoTop,stacked);
  const portHalf=porticoW/2+.42,portLen=Math.hypot(portHalf,porticoRise);
  const portAngle=Math.atan2(porticoRise,portHalf);
  for(const side of [-1,1]){
    box("porch dramatic center cross gable roof "+side,
      portLen+.16,.19,porchDepth+1.13,
      X+side*portHalf/2,porticoTop+porticoRise/2,
      front-porchDepth/2-.15,metal,-side*portAngle);
    box("porch exposed timber gable rake "+side,
      portLen+.13,.22,.27,
      X+side*portHalf/2,porticoTop+porticoRise/2,
      porticoZ-.08,timber,-side*portAngle);
  }
  box("front portico ridge cap",.23,.21,porchDepth+1.14,
    X,porticoTop+porticoRise,front-porchDepth/2-.15,metal);
  box("center gable bottom structural beam",porticoW+.30,.31,.34,
    X,porticoTop+.10,porticoZ-.16,timber);
  for(const side of [-1,1]){
    box("decorative central gable exposed diagonal truss "+side,
      2.85,.16,.21,X+side*1.30,porticoTop+.78,porticoZ-.24,
      timber,-side*.58);
  }
  box("raised routed sign mounting board",5.45,1.06,.24,
    X,porticoTop+.73,porticoZ-.39,doorMat);
  signText("Ranger Station carved lodge front","RANGER STATION",
    5.23,.90,X,porticoTop+.73,porticoZ-.57,95);
  // The former 1.65-m-wide chimney was at local (+5.95,+2.70),
  // DIRECTLY INTERSECTING the ranger desk at (+5.76,+2.15).
  // Delete the entire floor-to-roof chimney shaft and its cap;
  // no post, column or fake chimney may pass through the workstation.
  // Timber interior: real walk-in open room, not a fake facade.
  box("interior rear exposed long ceiling beam",w-.65,.27,.30,
    X,top-.30,back-.34,timber);
  for(const xx of [-7.8,-3.9,0,3.9,7.8]){
    box("loft exposed ceiling joist "+xx,.26,.25,d-.48,
      X+xx,top-.28,Z,timber);
  }
  // REAL L-SHAPED RANGER WORKSTATION — BACK-RIGHT CORNER OFFICE (v6).
  // Entrance is SOUTH (-Z). A seated ranger looks SOUTH, straight toward
  // the entrance; chair back is toward the rear wall, NEVER the front door.
  // Put the RANGER'S CHAIR in the empty north-east nook, not the desktop.
  // The return reaches the BACK WALL, projects 3m into the room, and joins
  // the front east-west wing. Viewed from the doorway this is an L, not a
  // bank-teller counter or a desktop laid along the rear walls.
  // No interior chimney, pillar, tree trunk or column belongs in this space.
  // Standard 32.5-inch writing surface above the station's raised floor.
  const deskY=floor+.76;
  const frontDeskX=X+6.50,frontDeskZ=Z+2.70;
  const returnDeskX=X+4.85,returnDeskZ=Z+4.19;
  const chairX=X+7.05,chairZ=Z+4.72;
  box("continuous L desk FRONT wing facing south entrance",
    3.80,.13,1.10,frontDeskX,deskY,frontDeskZ,doorMat);
  box("continuous L desk SIDE return projecting from rear wall",
    1.10,.13,3.02,returnDeskX,deskY,returnDeskZ,doorMat);
  box("L desk seamless joined corner both wings",
    1.10,.134,1.10,returnDeskX,deskY+.003,frontDeskZ,doorMat);
  // Keep a large uninterrupted knee space directly in front of chair.
  // Slim pedestals appear at the OUTER ends only, not in the seat opening.
  box("front L desk east end compact drawer pedestal",.69,.59,.76,
    X+8.05,floor+.37,frontDeskZ,wood);
  box("return L desk front end compact drawer pedestal",.75,.59,.73,
    returnDeskX,floor+.37,Z+2.93,wood);
  for(const y0 of [.27,.45,.63]){
    box("front wing small drawer "+y0,.58,.12,.035,
      X+8.05,floor+y0,frontDeskZ-.48,timber);
    box("return wing side drawer "+y0,.63,.12,.035,
      returnDeskX-.385,floor+y0,Z+2.93,timber);
    box("front wing black drawer pull "+y0,.13,.04,.025,
      X+8.05,floor+y0,frontDeskZ-.51,dark);
    box("return wing black drawer pull "+y0,.025,.04,.13,
      returnDeskX-.417,floor+y0,Z+2.93,dark);
  }
  box("front L desk narrow end leg",.12,.63,.88,
    X+4.65,floor+.35,frontDeskZ,wood);
  box("side L desk back slim leg",.86,.63,.12,
    returnDeskX,floor+.35,Z+5.58,wood);

  // Ranger's actual chair is in the open nook BEHIND the connected L desktop.
  // Its upright back faces the far wall, seat and occupant face the main door.
  const seat=makeMat("ranger weathered green upholstered chair","#314a40");
  box("ranger chair seat toward south entrance",.82,.16,.78,
    chairX,floor+.54,chairZ,seat);
  box("ranger chair backrest at rear toward wall",.84,.88,.16,
    chairX,floor+1.04,chairZ+.39,seat);
  for(const side of [-1,1]){
    box("ranger chair arm "+side,.10,.07,.55,
      chairX+side*.45,floor+.82,chairZ-.01,dark);
    box("ranger chair arm support "+side,.09,.25,.09,
      chairX+side*.45,floor+.69,chairZ+.12,dark);
  }
  cylinder("ranger chair pedestal",.13,.42,
    chairX,floor+.31,chairZ,dark);
  for(let i=0;i<5;i++){
    const a=i*2*Math.PI/5;
    const leg=box("ranger chair swivel leg "+i,.09,.08,.52,
      chairX+Math.sin(a)*.20,floor+.13,chairZ+Math.cos(a)*.20,dark);
    leg.rotation.y=a;
    cylinder("ranger chair caster "+i,.085,.055,
      chairX+Math.sin(a)*.27,floor+.075,
      chairZ+Math.cos(a)*.27,dark);
  }
  // The six-monitor camera wall reuses the original two online/four
  // unavailable labels. These are static props; no live HLS streams here.
  const monitorX=[-1.30,0,1.30],monitorY=[floor+2.95,floor+2.18];
  const monitorLabels=["EAST BANK","THE ROOST","WEST BANK",
    "SOUTH HILL","INFRARED","CAMERA 6"];
  for(let i=0;i<6;i++){
    const col=i%3,row=Math.floor(i/3),x=X+monitorX[col];
    const y=monitorY[row],z=back-.43;
    box("monitor black housing "+i,1.18,.72,.12,x,y,z,dark);
    box("monitor screen "+i,1.02,.52,.035,x,y,z-.079,ink);
    signText("camera screen "+i,monitorLabels[i],.94,.28,
      x,y-.19,z-.13,46);
    if(i>=2){
      box("offline screen lower black band "+i,.98,.17,.038,
        x,y+.16,z-.101,dark);
    }else{
      box("green monitor status LED "+i,.055,.055,.043,
        x+.48,y-.28,z-.15,warmLight);
    }
  }
  // Twin large bulletin boards and wall map on the long interior rear wall.
  for(const [x0,title] of [[-6.10,"RANGER NOTICES"],[6.10,"VISITOR BOARD"]]){
    box("large pinned cork board "+title,3.12,1.75,.15,
      X+x0,floor+2.56,back-.40,brownPaper);
    for(const xx of [-.85,.0,.85]){
      const j=Math.round((xx+1)*10);
      box("individual pinned paper "+title+" "+j,.67,.92,.018,
        X+x0+xx,floor+2.46+(j%2)*.05,back-.53,paper);
    }
    signText("bulletin label "+title,title,2.8,.33,
      X+x0,floor+3.45,back-.54,49);
  }
  // Old-world field map and documents next to the entrance.
  box("wall field map mounting board",2.5,1.55,.12,
    X-7.25,floor+2.2,front+.33,wood);
  box("wall actual West Virginia field map",2.26,1.31,.025,
    X-7.25,floor+2.2,front+.25,foliage);
  for(let n=0;n<9;n++){
    box("field map irregular topographic stroke "+n,.7,.02,.025,
      X-8.05+(n%3)*.67,floor+1.77+Math.floor(n/3)*.39,
      front+.22,n%2?paper:brass);
  }
  signText("interior wall map caption","WV FIELD MAP",2.2,.26,
    X-7.25,floor+1.42,front+.18,52);
  // Seven field-note piles across the ranger's worktop, with the CB radio
  // and coffee close enough for someone actually seated in the corner.
  for(let i=0;i<7;i++){
    const x=X+5.12+(i%4)*.83,z=frontDeskZ+(i>=4?.19:-.19);
    for(let sheet=0;sheet<3+(i%3);sheet++){
      const page=box("individual report sheet stack "+i+" "+sheet,
        .61,.015,.34,x+(sheet%2)*.018,deskY+.09+sheet*.018,z,paper);
      page.rotation.y=(i%3-1)*.07;
    }
  }
  // Ranger's old-fashioned 40-channel CB transceiver: distinct die-cast
  // housing, metallic faceplate, real controls, green LCD and handheld mic.
  const cbShell=makeMat("CB powder coated graphite chassis","#262c2e");
  const cbPanel=makeMat("CB brushed stainless faceplate","#606769");
  const cbRubber=makeMat("CB dark rubber grip","#171b1b");
  const cbSilver=makeMat("CB machine-turned chrome","#aab0ab");
  const cbLCD=makeMat("CB backlit green window","#102b26",{emission:"#315f43"});
  const cbAmber=makeMat("CB transmit orange lamp","#ca9b47",{emission:"#a66a19"});
  const rx=returnDeskX,rz=Z+4.52,ry=deskY+.25;
  box("CB solid 10 inch radio chassis",.86,.31,.49,rx,ry,rz,cbShell);
  box("CB brushed aluminum front bezel",.828,.255,.025,rx,ry,rz-.260,cbPanel);
  box("CB black inset channel aperture",.32,.154,.014,
    rx-.172,ry+.026,rz-.281,cbLCD);
  const lcd=track(new B.DynamicTexture("CB 40 channel LCD artwork",
    {width:512,height:240},scene,false));
  const lc=lcd.getContext();
  lc.fillStyle="#09211c";lc.fillRect(0,0,512,240);
  lc.strokeStyle="#6f967d";lc.lineWidth=9;lc.strokeRect(7,7,498,226);
  lc.fillStyle="#c5ebaf";lc.textAlign="center";
  lc.font="bold 98px monospace";lc.fillText("19",256,128);
  lc.font="bold 38px monospace";lc.fillText("CB  AM",256,200);
  lcd.update();
  const lcdMat=track(new B.StandardMaterial("CB luminous channel digits",scene));
  lcdMat.diffuseTexture=lcd;lcdMat.emissiveColor=new B.Color3(.18,.37,.24);
  lcdMat.backFaceCulling=false;
  const lcdGlassPlane=track(B.MeshBuilder.CreatePlane("RANGER LODGE CB LCD CHANNEL 19",
    {width:.292,height:.134},scene));
  lcdGlassPlane.position.set(rx-.172,ry+.025,rz-.293);
  lcdGlassPlane.rotation.y=Math.PI;lcdGlassPlane.material=lcdMat;
  lcdGlassPlane.isPickable=false;lcdGlassPlane.checkCollisions=false;
  for(const [i,x0,diam] of [[0,.13,.135],[1,.31,.109]]){
    cylinder("CB machined knob bezel "+i,diam+.026,.020,
      rx+x0,ry-.032,rz-.285,cbSilver,"z");
    cylinder("CB rubber knurled tuning knob "+i,diam,.075,
      rx+x0,ry-.032,rz-.324,cbRubber,"z");
    for(let t=0;t<12;t++){
      const a=t*Math.PI/6;
      box("CB grooved tuning knurl "+i+" "+t,.009,.021,.008,
        rx+x0+Math.sin(a)*(diam/2-.007),
        ry-.032+Math.cos(a)*(diam/2-.007),rz-.365,cbPanel);
    }
    box("CB white index mark "+i,.012,.027,.008,
      rx+x0,ry-.032+diam/2-.012,rz-.373,paper);
  }
  for(let k=0;k<3;k++){
    box("CB rubber pushbutton "+k,.053,.035,.032,
      rx-.330+k*.093,ry-.088,rz-.295,cbRubber);
  }
  cylinder("CB genuine amber power indicator",.029,.012,
    rx+.324,ry+.087,rz-.282,cbAmber,"z");
  for(let i=0;i<20;i++){
    box("CB stamped black speaker grille slot "+i,.038,.005,.065,
      rx-.03+(i%5)*.071,ry+.159,rz-.16+Math.floor(i/5)*.077,cbRubber);
  }
  for(const side of [-1,1])for(const high of [-1,1])
    cylinder("CB front chassis rivet "+side+" "+high,.017,.010,
      rx+side*.388,ry+high*.105,rz-.280,cbSilver,"z");
  cylinder("CB rubber aerial mount",.070,.065,
    rx-.32,ry+.19,rz+.14,cbRubber);
  cylinder("CB steel aerial whip",.012,.49,
    rx-.32,ry+.46,rz+.14,cbSilver);
  // Separate PTT mic resting by the base; it isn't another rectangular box
  // masquerading as an all-in-one radio.
  const micX=rx+.22,micZ=Z+5.28;
  box("CB push to talk microphone shell",.205,.125,.33,
    micX,deskY+.16,micZ,cbRubber);
  box("CB microphone alloy mesh panel",.155,.008,.148,
    micX,deskY+.228,micZ-.070,cbPanel);
  for(let i=0;i<8;i++)
    box("CB microphone vent opening "+i,.131,.004,.007,
      micX,deskY+.234,micZ-.130+i*.017,cbRubber);
  box("CB microphone side PTT switch",.028,.027,.075,
    micX+.115,deskY+.170,micZ+.07,cbAmber);
  const wire=[];
  for(let i=0;i<=64;i++){
    const t=i/64,a=t*16*Math.PI;
    wire.push(new B.Vector3(rx+.22+.030*Math.cos(a),
      deskY+.16+.031*Math.sin(a),rz+.19+t*.54));
  }
  const coil=track(B.MeshBuilder.CreateTube("RANGER LODGE CB coiled handset cable",
    {path:wire,radius:.014,tessellation:7},scene));
  coil.material=cbRubber;coil.isPickable=false;coil.checkCollisions=false;
  cylinder("ranger enamel coffee mug",.21,.24,
    X+6.72,deskY+.20,frontDeskZ-.04,paper);
  cylinder("ranger mug handle",.055,.21,
    X+6.91,deskY+.20,frontDeskZ-.04,brass,"z");
  box("field passport folio",.49,.075,.55,
    X+7.61,deskY+.105,frontDeskZ+.14,foliage);
  box("ranger office field map on side return",.68,.035,.51,
    returnDeskX,deskY+.09,Z+3.74,paper);
  // Practical, reassuring warm hanging station lanterns.
  for(const x0 of [-5.5,0,5.5]){
    cylinder("hanging entry station lantern chain "+x0,.06,.43,
      X+x0,top-.51,Z-1.75,dark);
    cylinder("station amber lantern glass "+x0,.44,.55,
      X+x0,top-.92,Z-1.75,warmLight);
    cylinder("lantern metal base "+x0,.52,.08,
      X+x0,top-1.24,Z-1.75,dark);
  }
  return 1;
}
