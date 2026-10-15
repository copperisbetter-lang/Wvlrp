/**
 * The Wild: first new building after the photographic greenfield reset.
 * Hearthside Cabin is (0,0). North is +Z. Station center is 350m north.
 * All dimensions are in metres; 3 separately framed, 3m-wide panels/side.
 * Assets are verified CC0 Poly Haven materials committed to ./assets/building.
 */
import {flatlandHeight} from "./wild-rebuild-layout.js";

export const NORTH_RANGER_STATION=Object.freeze({
  id:"north-ranger-station",name:"Ranger Station",
  x:0,z:350,front:"south",panelsWide:3,panelsDeep:3,
  panelMetres:3,width:9,depth:9,door:"rough_pine_door",
  walls:"wood_trunk_wall",roof:"corrugated_iron"
});

// Tile mesh is 196m across; reserve 6m from the edge for the roof/porch.
export function rangerVisibleInTile(cx,cy){
  return Math.abs(NORTH_RANGER_STATION.x-cx)<=90 &&
         Math.abs(NORTH_RANGER_STATION.z-cy)<=90;
}

// Physical perimeter in walk.js; close the door until an interaction is added.
export function rangerWallCollision(x,z,padding=.25){
  const s=NORTH_RANGER_STATION;
  const dx=Math.abs(x-s.x),dz=Math.abs(z-s.z);
  const wall=.27+padding;
  return (dx<=s.width/2+wall && Math.abs(dz-s.depth/2)<=wall) ||
         (dx<=s.width/2+wall && Math.abs(dz+s.depth/2)<=wall) ||
         (dz<=s.depth/2+wall && Math.abs(dx-s.width/2)<=wall);
}
export function buildNorthRangerStation(B,scene,track,{cx,cy,seed,base,surfaceHeight}){
  if(!rangerVisibleInTile(cx,cy))return 0;
  const s=NORTH_RANGER_STATION;
  const X=s.x-cx,Z=s.z-cy;
  const measured=surfaceHeight?.(s.x,s.z);
  const Y=Number.isFinite(measured)?measured:flatlandHeight(s.x,s.z,seed,base);
  const p=s.panelMetres,half=s.width/2;
  const floor=Y+.58,wallHeight=3.30,top=floor+wallHeight,rise=1.95;
  const front=Z-s.depth/2,back=Z+s.depth/2;
  const basePath="./assets/building/";
  const mats=new Map();
  function finish(id,{metal=false}={}){
    if(mats.has(id))return mats.get(id);
    const m=track(new B.PBRMaterial("CC0 ranger "+id,scene));
    const file=kind=>basePath+id+"_"+kind+"_1k.jpg";
    const albedo=track(new B.Texture(file("diffuse"),scene));
    const normal=track(new B.Texture(file("normal"),scene));
    const packed=track(new B.Texture(file("arm"),scene));
    for(const tex of [albedo,normal,packed]){
      tex.wrapU=B.Texture.WRAP_ADDRESSMODE;
      tex.wrapV=B.Texture.WRAP_ADDRESSMODE;
      if(metal){tex.uScale=2;tex.vScale=3;}
    }
    m.albedoTexture=albedo;
    m.bumpTexture=normal;
    m.bumpTexture.level=metal?.85:.58;
    m.metallicTexture=packed;
    m.useRoughnessFromMetallicTextureGreen=true;
    m.useMetallnessFromMetallicTextureBlue=true;
    m.metallic=metal?.8:0;m.roughness=metal?.78:.97;
    if(!metal){albedo.vScale=3;normal.vScale=3;packed.vScale=3;}
    m.backFaceCulling=false;
    mats.set(id,m);return m;
  }
  const logs=finish(s.walls),gable=finish("weathered_plank_siding"),pine=finish(s.door),
        metal=finish(s.roof,{metal:true}),
        stone=finish("mossy_stone_wall");
  const trim=track(new B.StandardMaterial("ranger timber framing",scene));
  trim.diffuseColor=B.Color3.FromHexString("#68503a");
  const glass=track(new B.StandardMaterial("ranger glass",scene));
  glass.diffuseColor=B.Color3.FromHexString("#263f3f");
  glass.alpha=.48;
  glass.specularColor=new B.Color3(.52,.54,.52);
  glass.specularPower=90;
  const brass=track(new B.StandardMaterial("ranger aged brass",scene));
  brass.diffuseColor=B.Color3.FromHexString("#ad9563");

  function box(name,w,h,d,x,y,z,mat,rotZ=0){
    const m=track(B.MeshBuilder.CreateBox("NORTH RANGER "+name,
      {width:w,height:h,depth:d},scene));
    m.position.set(x,y,z);m.rotation.z=rotZ;
    m.material=mat;m.isPickable=false;m.checkCollisions=false;return m;
  }
  function triangle(name,z){
    const mesh=track(new B.Mesh("NORTH RANGER "+name,scene));
    const vertices=[-half,top,z,0,top+rise,z,half,top,z];
    const indices=[0,1,2,2,1,0],normals=[];
    B.VertexData.ComputeNormals(vertices,indices,normals);
    const data=new B.VertexData();
    data.positions=vertices;data.indices=indices;data.normals=normals;
    data.uvs=[0,0,.5,1,1,0];
    data.applyToMesh(mesh);
    mesh.position.x=X;mesh.material=gable;mesh.isPickable=false;
  }
  // 9m x 9m stone footing and complete wooden floor, independently buildable.
  box("mossy fieldstone footing",9.65,.48,9.65,X,Y+.20,Z,stone);
  box("pine plank floor",9.0,.22,9.0,X,Y+.48,Z,pine);
  // REAL LOG-WALL GEOMETRY — bark-wrapped ROUND timbers, not
  // a photographic bark texture stretched over 3m rectangular slabs.
  // Courses overlap enough to avoid see-through daylight strips.
  // The facade keeps three structural bays, each 3 metres wide.
  const logDiameter=.425,courseStep=.326,courseCount=10;
  function logBeam(name,length,x,y,z,axis="x",course=0){
    const m=track(B.MeshBuilder.CreateCylinder("NORTH RANGER "+name,{
      height:length,
      diameterTop:logDiameter*(.974+(course%3)*.008),
      diameterBottom:logDiameter*(.990+(course%4)*.004),
      tessellation:14,subdivisions:1,cap:B.Mesh.CAP_ALL
    },scene));
    m.position.set(x,y,z);
    if(axis==="x")m.rotation.z=-Math.PI/2;
    else m.rotation.x=Math.PI/2;
    m.material=logs;
    m.isPickable=false;m.checkCollisions=false;
    return m;
  }
  // Alternating overhangs at the four corners give true interlocked
  // stacked-log silhouettes and visible circular log ends on approach.
  for(let level=0;level<courseCount;level++){
    const y=floor+logDiameter/2+level*courseStep;
    const endExtension=level%2===0?.52:.12;
    logBeam("rear overlapping log course "+level,s.width+endExtension,
      X,y,back,"x",level);
    for(const side of [-1,1]){
      logBeam("side "+side+" overlapping log course "+level,
        s.depth+(level%2===1?.52:.12),
        X+side*half,y,Z,"z",level);
    }
  }
  // Structural bay divisions at 3m and 6m; narrow timber framing never
  // covers the rounded bark of the logs between joints.
  const timberPosts=finish("weathered_plank_siding");
  for(let bay=0;bay<=3;bay++){
    const offset=-half+bay*p;
    for(const z of [front,back]){
      box("three metre bay post X "+bay+" Z "+z,.16,wallHeight,.17,
        X+offset,floor+wallHeight/2,z,timberPosts);
    }
    for(const x of [X-half,X+half]){
      box("three metre bay post Z "+bay+" X "+x,.17,wallHeight,.16,
        x,floor+wallHeight/2,Z+offset,timberPosts);
    }
  }
  // Left and right front bays have genuine gaps for real recessed
  // windows. Below the sill and above the header: full round logs.
  // Along the glass: short log sections terminate in visible round ends.
  const glassWidth=1.7,stub=(p-glassWidth)/2;
  for(const col of [-1,1]){
    const x=X+col*p;
    for(let level=0;level<courseCount;level++){
      const y=floor+logDiameter/2+level*courseStep;
      if(y<floor+1.02||y>floor+2.62){
        logBeam("front full window course "+col+" "+level,p+.08,
          x,y,front,"x",level);
      }else{
        for(const sign of [-1,1])
          logBeam("window cut log "+col+" "+sign+" "+level,stub+.07,
            x+sign*(glassWidth/2+stub/2),y,front,"x",level);
      }
    }
    // Frames, sills and lintels are separately raised timber,
    // never a painted rectangle masquerading as the entire wall.
    box("window sill "+col,glassWidth+.30,.15,.42,
      x,floor+1.01,front-.07,timberPosts);
    box("window header "+col,glassWidth+.30,.18,.42,
      x,floor+2.63,front-.07,timberPosts);
    for(const sign of [-1,1])
      box("window cut jamb "+col+" "+sign,.13,1.54,.37,
        x+sign*(glassWidth/2+.02),floor+1.83,front-.08,timberPosts);
    box("recessed front glass "+col,glassWidth,1.50,.055,
      x,floor+1.82,front+.14,glass);
    box("window center vertical sash "+col,.085,1.50,.14,
      x,floor+1.82,front-.08,timberPosts);
    box("window center cross rail "+col,glassWidth,.08,.14,
      x,floor+1.82,front-.08,timberPosts);
  }
  // Middle panel: real framed pine door, not a green painted placeholder.
  const doorW=1.75,doorH=2.5,doorStub=(p-doorW)/2;
  for(let level=0;level<courseCount;level++){
    const y=floor+logDiameter/2+level*courseStep;
    if(y>floor+doorH+.06){
      logBeam("doorway spanning header log "+level,p+.08,
        X,y,front,"x",level);
    }else{
      for(const sign of [-1,1])
        logBeam("short doorway log "+sign+" "+level,doorStub+.08,
          X+sign*(doorW/2+doorStub/2),y,front,"x",level);
    }
  }
  box("rough pine entry door",doorW-.12,doorH-.08,.14,
    X,floor+(doorH-.08)/2+.04,front-.15,pine);
  for(const side of [-1,1]){
    box("pine entry door upright "+side,.11,doorH+.10,.20,
      X+side*doorW/2,floor+doorH/2,front-.25,trim);
  }
  box("pine door top rail",doorW+.18,.11,.20,X,floor+doorH,front-.25,trim);
  box("handcrafted door lower inset",doorW-.42,.045,.17,
    X,floor+.63,front-.28,trim);
  box("aged brass door pull",.09,.28,.14,
    X+doorW*.33,floor+1.25,front-.31,brass);
  // Authentic timber-clad gables and corrugated pitched iron roof.
  triangle("south log gable",front);
  triangle("north log gable",back);
  const span=half+.48,angle=Math.atan2(rise,span),length=Math.hypot(rise,span);
  for(const side of [-1,1]){
    box("corrugated roof slope "+side,length+.05,.15,s.depth+.95,
      X+side*span/2,top+rise/2,Z,metal,-side*angle);
  }
  // Subtle actual raised corrugations, so tin reads as shaped metal
  // from a phone instead of a single featureless green plane.
  for(const side of [-1,1]){
    for(let i=0;i<13;i++){
      const z=Z-s.depth/2+.30+i*(s.depth-.60)/12;
      box("iron roof raised rib "+side+" "+i,length+.02,.035,.045,
        X+side*span/2,top+rise/2+.082,z,metal,-side*angle);
    }
  }
  box("standing ridge cap",.26,.17,s.depth+1.05,X,top+rise,Z,metal);
  box("south timber fascia",s.width+.75,.22,.15,X,top-.12,front-.58,trim);
  box("north timber fascia",s.width+.75,.22,.15,X,top-.12,back+.58,trim);
  // Simple covered south entry, grounded posts and a legible station sign.
  box("pine porch landing",3.75,.20,2.2,X,Y+.50,front-1.20,pine);
  for(const side of [-1,1]){
    box("covered porch post "+side,.20,2.75,.20,
      X+side*1.65,Y+1.95,front-2.15,logs);
  }
  box("porch front roof edge",4.2,.15,.28,X,Y+3.37,front-2.13,metal);
  box("porch tin canopy",4.2,.16,2.42,X,Y+3.50,front-1.18,metal);
  box("door step",2.12,.17,.60,X,Y+.34,front-2.60,stone);
  const plaque=track(new B.DynamicTexture("Ranger Station painted sign",512,128,scene,false));
  const ctx=plaque.getContext();
  ctx.fillStyle="#543d2c";ctx.fillRect(0,0,512,128);
  ctx.strokeStyle="#cbb79a";ctx.lineWidth=7;ctx.strokeRect(5,5,502,118);
  ctx.font="bold 53px Georgia,serif";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillStyle="#f7e9cb";ctx.fillText("RANGER STATION",256,67);
  plaque.update();
  const signMat=track(new B.StandardMaterial("ranger sign print",scene));
  signMat.diffuseTexture=plaque;
  signMat.emissiveColor=new B.Color3(.10,.08,.05);
  signMat.backFaceCulling=false;
  const sign=track(B.MeshBuilder.CreatePlane("NORTH RANGER station nameplate",
    {width:3.4,height:.85},scene));
  sign.position.set(X,top+.54,front-.24);sign.rotation.y=Math.PI;
  sign.material=signMat;sign.isPickable=false;
  return 1;
}
