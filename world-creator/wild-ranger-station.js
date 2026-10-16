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
import {installRangerReferenceInterior} from "./wild-ranger-reference-interior.js?v=photo-reference-20261015-v8";

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
  // Four verified 1K PBR sets cut mobile texture memory sharply while
  // keeping the 2K building finishes on desktop. Screenshots must not OOM.
  const mobileRenderer=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const mobile1k=new Set(["wood_trunk_wall","rough_pine_door",
    "mossy_stone_wall","corrugated_iron"]);
  const materials=new Map();
  const finish=(id,{texture="1k",metal=false,repeatU=1,repeatV=1}={})=>{
    const key=id+"-"+texture+"-"+repeatU+"-"+repeatV;
    if(materials.has(key))return materials.get(key);
    const mat=track(new B.PBRMaterial("Ranger lodge CC0 "+key,scene));
    const tex=(kind,res)=>{
      const actualRes=mobileRenderer&&mobile1k.has(id)?"1k":res;
      const t=track(new B.Texture(rootPath+id+"_"+kind+"_"+actualRes+".jpg",scene));
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
  // The photographed lodge has a faded BLUE standing-seam steel roof,
  // not the neutral charcoal sheet metal of the first 3D prototype.
  metal.albedoColor=new B.Color3(.42,.65,.83);

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
  // The 360 station has daylight behind the chair and side walls, not
  // a sealed dark log box. Leave genuine openings in the timber courses.
  const backWindows=[-6.82,6.82],sideWindows=[-2.05,2.05];
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
    const backHoles=y>=sill&&y<=lintel?
      backWindows.map(x=>[x-windowW/2,x+windowW/2]):[];
    for(const [a,b] of segments(-half,half,backHoles)){
      log("rear timber with true glazing recess "+n+" "+a.toFixed(2),
        b-a+.08,X+(a+b)/2,y,back,"x",n);
    }
    const sideHoles=y>=sill&&y<=lintel?
      sideWindows.map(z=>[z-windowW/2,z+windowW/2]):[];
    for(const side of [-1,1]){
      for(const [a,b] of segments(-d/2,d/2,sideHoles)){
        log("east/west timbers cut for window "+side+" "+n+" "+a.toFixed(2),
          b-a+.08,X+side*half,y,Z+(a+b)/2,"z",n);
      }
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
    // Reference photograph: traditional tall 3 x 4 glazing, not a
    // cartoon 4-pane cross. Match the slender cream-colored timber bars.
    for(let col=1;col<3;col++)
      box("window single slender vertical muntin "+i+" "+col,
        .032,windowHeight-.07,.085,
        x-windowW/2+windowW*col/3,mid,front-.414,timber);
    for(let row=1;row<4;row++)
      box("window single slender horizontal muntin "+i+" "+row,
        windowW-.085,.032,.085,
        x,mid-windowHeight/2+windowHeight*row/4,front-.416,timber);

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
  // True rear and side sash openings: natural forest remains visible
  // through them from the ranger's leather office chair.
  for(const [i,x0] of backWindows.entries()){
    const x=X+x0,mid=(sill+lintel)/2,z=back-.10,h=lintel-sill;
    box("rear clear view into forest "+i,windowW-.11,h-.10,.027,x,mid,z,glass);
    for(const q of [-1,1]){
      box("rear glazed sash jamb "+i+" "+q,.085,h+.12,.15,
        x+q*windowW/2,mid,z-.19,timber);
      box("rear glazed sash head sill "+i+" "+q,windowW+.08,.086,.17,
        x,mid+q*h/2,z-.19,timber);
    }
    for(let col=1;col<3;col++)
      box("rear narrow vertical glazed mullion "+i+" "+col,.033,h,.07,
        x-windowW/2+windowW*col/3,mid,z-.19,timber);
    for(let row=1;row<4;row++)
      box("rear narrow horizontal glazed mullion "+i+" "+row,
        windowW,.033,.07,x,mid-h/2+h*row/4,z-.19,timber);
  }
  for(const side of [-1,1])for(const [i,z0] of sideWindows.entries()){
    const x=X+side*(half-.12),z=Z+z0,mid=(sill+lintel)/2,h=lintel-sill;
    box("side window glass in actual log-wall opening "+side+" "+i,
      .025,h-.10,windowW-.10,x,mid,z,glass);
    for(const q of [-1,1]){
      box("side narrow sash vertical jamb "+side+" "+i+" "+q,
        .15,h+.09,.087,x-side*.15,mid,z+q*windowW/2,timber);
      box("side narrow sash top or bottom "+side+" "+i+" "+q,
        .16,.086,windowW+.07,x-side*.15,mid+q*h/2,z,timber);
    }
    for(let col=1;col<3;col++)
      box("side window divided glass upright "+side+" "+i+" "+col,
        .065,h,.032,x-side*.16,mid,z-windowW/2+windowW*col/3,timber);
    for(let row=1;row<4;row++)
      box("side window divided glass rail "+side+" "+i+" "+row,
        .065,.034,windowW,x-side*.16,mid-h/2+h*row/4,z,timber);
  }
  // Interior pine boards cover solid log courses only, preserving every
  // window opening. This is the warm fitted timber room in the 360 images.
  for(let n=0;n<11;n++){
    const y=floor+.17+n*.345;
    const backHoles=y>=sill&&y<=lintel?
      backWindows.map(x=>[x-windowW/2,x+windowW/2]):[];
    for(const [a,b] of segments(-half+.26,half-.26,backHoles))
      box("interior rear horizontal real-wood plank "+n+" "+a.toFixed(1),
        b-a,.32,.071,X+(a+b)/2,y,back-.30,wood);
    const sideHoles=y>=sill&&y<=lintel?
      sideWindows.map(z=>[z-windowW/2,z+windowW/2]):[];
    for(const side of [-1,1]){
      for(const [a,b] of segments(-d/2+.25,d/2-.25,sideHoles))
        box("interior west/east fitted pine board "+side+" "+n+" "+a.toFixed(1),
          .075,.32,b-a,X+side*(half-.29),y,Z+(a+b)/2,timber);
    }
  }
  // The 360 entrance has traditional double glazed timber doors, not
  // two opaque rectangular slabs. Their leaves stand open at the jamb
  // so the full center path stays walkable.
  for(const side of [-1,1]){
    const doorX=X+side*1.58,doorZ=front+.26,doorW=.86,doorH=2.73;
    for(const edge of [-1,1])
      box("open glazed entry door stile "+side+" "+edge,
        .12,doorH,.13,doorX+edge*(doorW/2-.06),
        floor+doorH/2,doorZ,doorMat);
    for(const y0 of [.065,1.13,2.67])
      box("open glazed entry door transom "+side+" "+y0,
        doorW,.12,.13,doorX,floor+y0,doorZ,doorMat);
    box("traditional six light glazing "+side,
      doorW-.25,1.45,.026,doorX,floor+1.91,doorZ+.012,glass);
    box("door glass mullion vertical "+side,
      .039,1.43,.065,doorX,floor+1.91,doorZ-.07,timber);
    for(const yy of [1.67,2.15])
      box("door glass slender cross rail "+side+" "+yy,
        doorW-.23,.038,.065,doorX,floor+yy,doorZ-.072,timber);
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
  // Five real 15cm risers descend AWAY from the raised porch. Previously
  // the steps were upside-down in elevation and only three slabs thick.
  for(let n=0;n<5;n++){
    box("wide handmade sandstone approach step "+n,
      5.15+.30*n,.15,.55,
      X,floor-.075-n*.15,porchFront-.26-n*.48,masonry);
  }
  // Hardwood entry handrails and their angled supports, either side
  // of the same clear center walkway in the photographed station.
  for(const side of [-1,1]){
    const xx=X+side*2.70;
    for(let n=0;n<3;n++)
      box("stair timber newel "+side+" "+n,.13,.96,.13,
        xx,floor-.03-n*.30,porchFront-.20-n*.95,timber);
    const rail=box("descending pine stair rail "+side,.13,.13,2.20,
      xx,floor+.39,porchFront-1.17,timber);
    rail.rotation.x=-.30;
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
  // The photographed desk is solid framed-and-paneled cabinetry, never
  // a floating slab or a bank-teller glass counter. Each recessed panel
  // carries real 2K aged-wood grain and layered solid hardwood trim.
  const carved=finish("weathered_planks",
    {texture:"2k",repeatU:.63,repeatV:.85});
  const inset=finish("wood_planks",
    {texture:"2k",repeatU:.58,repeatV:.76});
  for(let i=0;i<7;i++){
    const xx=frontDeskX-1.64+i*.54;
    const bow=Math.sin((i+.5)*Math.PI/7)*.065;
    const zz=frontDeskZ-.565-bow;
    box("solid framed desk visitor facade "+i,.535,.61,.070,
      xx,floor+.385,zz,carved);
    box("real raised desk grain panel "+i,.405,.43,.028,
      xx,floor+.365,zz-.053,inset);
    for(const edge of [-1,1])
      box("handset cabinet panel vertical stile "+i+" "+edge,
        .042,.47,.045,xx+edge*.23,floor+.365,zz-.078,carved);
    box("handset cabinet lower bevel "+i,.49,.046,.068,
      xx,floor+.12,zz-.078,carved);
  }
  box("carved desk full width upper cornice",3.80,.083,.11,
    frontDeskX,deskY-.105,frontDeskZ-.565,carved);
  box("carved desk full width foot plinth",3.80,.10,.12,
    frontDeskX,floor+.085,frontDeskZ-.575,carved);
  for(let i=0;i<5;i++){
    const zz=Z+2.96+i*.53;
    box("solid carved L-return public side panel "+i,.065,.57,.49,
      returnDeskX-.565,floor+.38,zz,carved);
    box("L-return timber inset panel "+i,.033,.42,.38,
      returnDeskX-.605,floor+.37,zz,inset);
  }
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
  const seat=makeMat("ranger weathered brown leather chair","#674333");
  const leatherPiping=makeMat("ranger chair dark brown leather seams","#38291f");
  box("ranger chair seat toward south entrance",.82,.16,.78,
    chairX,floor+.54,chairZ,seat);
  box("ranger chair backrest at rear toward wall",.84,.88,.16,
    chairX,floor+1.04,chairZ+.39,seat);
  // Actual leather upholstery has a softened seat and button-tufted back,
  // as opposed to the two flat green cubes shown in the earlier model.
  const cushion=track(B.MeshBuilder.CreateSphere(
    "RANGER LODGE ranger worn leather seat cushion",
    {diameter:1,segments:16},scene));
  cushion.scaling.set(.76,.105,.70);
  cushion.position.set(chairX,floor+.655,chairZ-.035);
  cushion.material=seat;cushion.isPickable=false;
  for(const side of [-1,1])for(const high of [-1,1]){
    const stud=track(B.MeshBuilder.CreateSphere(
      "RANGER LODGE leather upholstery button "+side+" "+high,
      {diameter:.052,segments:8},scene));
    stud.position.set(chairX+side*.19,
      floor+1.03+high*.19,chairZ+.30);
    stud.material=leatherPiping;stud.isPickable=false;
  }
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
  // The 360 reference used ONE six-feed LCD on the wooden desk.
  // The photographed map, public notices and field equipment are built by
  // installRangerReferenceInterior below. No floating back-wall monitors.
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
  // Four amber porch wall lanterns are a signature of the photographed
  // front elevation; they belong between the glazing and the entry.
  for(const x0 of [-5.15,-1.92,1.92,5.15]){
    box("weathered porch lantern arm "+x0,.10,.17,.43,
      X+x0,floor+2.43,front-.42,dark);
    cylinder("porch glass lantern warm amber "+x0,.22,.44,
      X+x0,floor+2.19,front-.72,warmLight);
    cylinder("porch lantern dark iron cap "+x0,.30,.09,
      X+x0,floor+2.46,front-.72,dark);
    cylinder("porch lantern dark iron base "+x0,.25,.08,
      X+x0,floor+1.94,front-.72,dark);
  }
  // Practical warm interior field lanterns.
  for(const x0 of [-5.5,0,5.5]){
    cylinder("hanging entry station lantern chain "+x0,.06,.43,
      X+x0,top-.51,Z-1.75,dark);
    cylinder("station amber lantern glass "+x0,.44,.55,
      X+x0,top-.92,Z-1.75,warmLight);
    cylinder("lantern metal base "+x0,.52,.08,
      X+x0,top-1.24,Z-1.75,dark);
  }
  // Realistic outdoor-right stone chimney stays fully OUTSIDE the room;
  // nothing can pass through the ranger desk or its chair again.
  box("exterior stone chimney east wall outer mass",1.20,6.10,1.50,
    X+half+1.05,Y+3.05,Z+4.45,masonry);
  box("exterior chimney cap with rain ledge",1.53,.24,1.85,
    X+half+1.05,Y+6.12,Z+4.45,stone);
  box("chimney recessed black flue",.68,.025,.81,
    X+half+1.05,Y+6.25,Z+4.45,dark);
  // Photo references: walnut maps, notices, equipment bench, field guides,
  // ranger hat, filing cabinet and single six-slot tabletop monitor.
  installRangerReferenceInterior(B,scene,track,{
    X,Z,front,back,floor,deskY,frontDeskX,frontDeskZ,returnDeskX,
    box,cylinder,makeMat,wood,timber,dark,brass,doorMat,paper
  });
  return 1;
}
