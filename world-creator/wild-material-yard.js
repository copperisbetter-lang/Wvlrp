/**
 * The Wild: interactive walking material yard — real CC0 Poly Haven 2K assets.
 *
 * Places ten PHYSICAL 3D material stacks west of the cabin comparison field;
 * not a menu of photos, signs-only stand-ins, or changes to existing cabins.
 * Published assets are verified in assets/building/hd-building-downloads.json.
 * Preview uses 2K photographic albedo; approach a stack to progressively load
 * its 2K normal + ARM maps. This bounds active GPU texture memory on phones.
 */
import {HD_BUILDING_MATERIALS} from "./wild-modular-cabin-kit.js?v=hd-material-library-20261015-v2";

export const MATERIAL_YARD=Object.freeze({
  x:-151,z:310, spawnX:-151,spawnZ:282,
  columns:5,rowSpacing:14,columnSpacing:14,
  previewDistance:87,unloadDistance:135,detailDistance:9
});
const COLLECTION=Object.freeze([
  {id:"wood_trunk_wall",title:"Stacked Log Wall",kind:"log",note:"Cabin wall timber"},
  {id:"pine_bark",title:"Natural Pine Bark",kind:"log",note:"Round logs and posts"},
  {id:"raw_plank_wall",title:"Rough-Cut Lumber",kind:"plank",note:"Framing and interiors"},
  {id:"weathered_planks",title:"Weathered Boards",kind:"plank",note:"Old exterior siding"},
  {id:"wood_planks",title:"Wooden Floorboards",kind:"plank",note:"Floors and porches"},
  {id:"stacked_stone_wall",title:"Stacked Fieldstone",kind:"stone",note:"Fireplaces and chimneys"},
  {id:"mossy_stone_wall",title:"Mossy Old Stone",kind:"stone",note:"Foundations and walls"},
  {id:"rough_pine_door",title:"Rough Pine Doors",kind:"doors",note:"Rustic doors and trim"},
  {id:"roof_slates_03",title:"Natural Roof Slate",kind:"slates",note:"Rustic slate roofs"},
  {id:"corrugated_iron",title:"Corrugated Roofing",kind:"sheet",note:"Weathered metal roofs"}
]);
const FILES=new Set(HD_BUILDING_MATERIALS.map(x=>x.id));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function createBuildingMaterialYard({B,scene,groundAt,camera,onStatus}){
  const state={ready:false,busy:false,error:"",entries:[],meshes:0,nearest:null};
  const root=new B.TransformNode("The Wild real HD building-material sample stacks",scene);
  root.setEnabled(false);
  const textures=new Map(),materials=new Map(),labels=[];
  let pendingDetail=null,disposed=false,lastActive=0;
  const catalogue=COLLECTION.filter(c=>FILES.has(c.id));

  const at=(i)=>{
    const col=i%MATERIAL_YARD.columns,row=Math.floor(i/MATERIAL_YARD.columns);
    return {x:MATERIAL_YARD.x+(col-2)*MATERIAL_YARD.columnSpacing,
      z:MATERIAL_YARD.z+(row-.5)*MATERIAL_YARD.rowSpacing};
  };
  function namedMaterial(id){
    if(materials.has(id))return materials.get(id);
    const m=new B.PBRMaterial("HD 2K Poly Haven material: "+id,scene);
    m.metallic=id==="corrugated_iron"?.64:0;
    m.roughness=id==="corrugated_iron"?.77:.97;
    m.useRoughnessFromMetallicTextureGreen=true;
    m.useMetallnessFromMetallicTextureBlue=true;
    m.backFaceCulling=false;
    const tex=new B.Texture("./assets/building/"+id+"_diffuse_2k.jpg",scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE);
    tex.wrapU=tex.wrapV=B.Texture.WRAP_ADDRESSMODE;
    m.albedoTexture=tex;
    textures.set(id,{albedo:tex,normal:null,arm:null});
    materials.set(id,m);
    return m;
  }
  function detail(id){
    if(!materials.has(id))return;
    const t=textures.get(id),mat=materials.get(id);
    if(t.normal||t.arm)return;
    // Two additional real 2K maps for the stack selected by proximity.
    t.normal=new B.Texture("./assets/building/"+id+"_normal_2k.jpg",scene);
    t.arm=new B.Texture("./assets/building/"+id+"_arm_2k.jpg",scene);
    for(const tex of [t.normal,t.arm])tex.wrapU=tex.wrapV=B.Texture.WRAP_ADDRESSMODE;
    mat.bumpTexture=t.normal;mat.bumpTexture.level=.71;
    mat.metallicTexture=t.arm;
  }
  function dropDetail(id){
    const t=textures.get(id),m=materials.get(id);
    if(!t||!m)return;
    m.bumpTexture=null;m.metallicTexture=null;
    t.normal?.dispose();t.arm?.dispose();t.normal=t.arm=null;
  }
  function part(name,make,mat,parent,x,y,z){
    const m=make();m.name="MATERIAL YARD "+name;
    m.parent=parent;m.position.set(x,y,z);
    m.material=mat;m.isPickable=false;m.checkCollisions=false;
    state.meshes++;return m;
  }
  function box(name,w,h,d,parent,mat,x,y,z){
    return part(name,()=>B.MeshBuilder.CreateBox("material box",{width:w,height:h,depth:d},scene),mat,parent,x,y,z);
  }
  function signs(txt,detailText,i,p,parent){
    const bg=new B.DynamicTexture("material sign "+i,{width:1024,height:256},scene,false);
    const ctx=bg.getContext();ctx.fillStyle="#173329";ctx.fillRect(0,0,1024,256);
    ctx.strokeStyle="#e2d4aa";ctx.lineWidth=10;ctx.strokeRect(6,6,1012,244);
    ctx.textAlign="center";ctx.fillStyle="#fff4d3";ctx.font="bold 59px Arial";
    ctx.fillText((i+1)+". "+txt,512,108);
    ctx.font="35px Arial";ctx.fillText(detailText+"  ·  2K PBR / CC0",512,174);
    bg.update();labels.push(bg);
    const signMat=new B.StandardMaterial("material sign printed "+i,scene);
    signMat.diffuseTexture=bg;signMat.emissiveColor=new B.Color3(.15,.17,.11);
    signMat.backFaceCulling=false;labels.push(signMat);
    const sign=part("placard "+txt,
      ()=>B.MeshBuilder.CreatePlane("label",{width:4.65,height:1.16},scene),
      signMat,parent,0,2.8,2.27);
    // Face the viewer approaching the front (-Z) of each sample stack.
    sign.rotation.y=Math.PI;
    const timber=materials.get("wood_planks")||namedMaterial("wood_planks");
    box("placard mounting board "+i,4.85,1.25,.13,parent,timber,0,2.8,2.37);
    for(const side of [-1,1])box("label post "+i,.13,2.35,.13,parent,timber,side*2.2,1.18,2.39);
  }
  function pallet(parent){
    const m=namedMaterial("wood_planks");
    for(const x of [-1.5,0,1.5])
      box("pallet runner",.29,.22,2.6,parent,m,x,.12,0);
    for(let n=0;n<7;n++)
      box("pallet deck board",3.95,.10,.30,parent,m,0,.29,-1.12+n*.37);
  }
  function lumber(parent,mat){
    for(let layer=0;layer<4;layer++){
      for(let slot=0;slot<4;slot++){
        const x=-1.27+slot*.84;
        const z=layer%2===0?.07:-.08;
        box("real plank layer "+layer+" board "+slot,.72,.18,2.95,parent,mat,x,.47+layer*.26,z);
      }
      if(layer<3){
        for(const x of [-1.47,1.47])
          box("timber separator",.15,.08,3.17,parent,mat,x,.64+layer*.26,0);
      }
    }
  }
  function logs(parent,mat,i){
    for(let layer=0;layer<3;layer++){
      const count=4-layer;
      for(let j=0;j<count;j++){
        const diameter=.48+.05*((layer+j)%3);
        const x=(j-(count-1)/2)*.76;
        const cylinder=part("whole 3D log "+i+" "+layer+" "+j,
          ()=>B.MeshBuilder.CreateCylinder("full round trunk",
            {height:3.7,diameterTop:diameter*.96,diameterBottom:diameter,
              tessellation:16,cap:B.Mesh.CAP_ALL},scene),
          mat,parent,x,.57+layer*.49,0);
        cylinder.rotation.x=Math.PI/2;
        cylinder.rotation.y=((j+layer)%2?-.04:.04);
      }
    }
  }
  function stone(parent,mat){
    // Individual fieldstone blocks: staggered courses and non-identical sizes.
    for(let layer=0;layer<4;layer++){
      for(let j=0;j<5;j++){
        const x=-1.58+j*.80+(layer%2)*.28;
        const ww=.64+(((j*7+layer*3)%4)*.065);
        const h=.32+((layer+j)%3)*.03;
        const stone=box("separate natural stone "+layer+" "+j,ww,h,.85,
          parent,mat,x,.51+layer*.36,-.03+((j%3)-1)*.07);
        stone.rotation.y=(((j+layer)%5)-2)*.06;
        stone.rotation.z=(((j*3+layer)%3)-1)*.035;
      }
    }
  }
  function doors(parent,mat){
    const timber=namedMaterial("wood_planks");
    for(let j=0;j<3;j++){
      const x=(j-1)*1.21;
      const door=box("solid real 3D pine door panel "+j,1.04,2.0,.13,parent,mat,x,1.44,-.08);
      door.rotation.y=(j-1)*-.11;
      for(const yy of [.66,1.5,2.23])
        box("transverse door rail",.94,.115,.08,parent,mat,x,yy,-.20);
      box("upright door batten",.13,1.94,.13,parent,timber,x-.36,1.44,-.24);
      const knob=part("iron door knob",
        ()=>B.MeshBuilder.CreateSphere("forged iron knob",{diameter:.09,segments:8},scene),
        mat,parent,x+.30,1.35,-.19);
      knob.isPickable=false;
    }
  }
  function slates(parent,mat){
    for(let level=0;level<5;level++){
      for(let j=0;j<6;j++){
        const x=(j-2.5)*.55;
        const tile=box("separate quarried slate tile "+level+" "+j,.50,.085,1.23,
          parent,mat,x,.43+level*.105,(level%2)*.08);
        tile.rotation.z=((j+level)%3-1)*.028;
      }
    }
  }
  function sheets(parent,mat){
    for(let layer=0;layer<5;layer++){
      const y=.45+layer*.15;
      const sheet=box("entire metal roof sheet "+layer,3.85,.035,2.1,parent,mat,0,y,0);
      sheet.rotation.z=layer%2===0?-.015:.012;
      for(let rib=0;rib<17;rib++){
        box("physical corrugated standing rib "+layer+" "+rib,.065,.06,2.1,
          parent,mat,-1.79+rib*.224,y+.04,0);
      }
    }
  }
  function createAll(){
    if(state.ready||disposed)return;
    state.busy=true;
    try{
      // Make the shared pallet texture first; imported assets are fetched only
      // when this display is enabled in the world.
      namedMaterial("wood_planks");
      for(let i=0;i<catalogue.length;i++){
        const c=catalogue[i],p=at(i);
        const anchor=new B.TransformNode("HD material sample "+(i+1)+" "+c.id,scene);
        anchor.parent=root;
        anchor.position.set(p.x,groundAt(p.x,p.z)+.02,p.z);
        const mat=namedMaterial(c.id);
        pallet(anchor);
        if(c.kind==="log")logs(anchor,mat,i);
        else if(c.kind==="plank")lumber(anchor,mat);
        else if(c.kind==="stone")stone(anchor,mat);
        else if(c.kind==="doors")doors(anchor,mat);
        else if(c.kind==="slates")slates(anchor,mat);
        else if(c.kind==="sheet")sheets(anchor,mat);
        signs(c.title,c.note,i,p,anchor);
        state.entries.push({id:c.id,title:c.title,kind:c.kind,x:p.x,z:p.z});
      }
      state.ready=true;
      state.error="";
    }catch(err){
      state.error=String(err.message||err);console.warn("HD material yard",err);
    }finally{state.busy=false;}
  }
  function distanceToYard(){
    const dx=camera.position.x-MATERIAL_YARD.x;
    const dz=camera.position.z-MATERIAL_YARD.z;
    return Math.hypot(dx,dz);
  }
  function update(force=false){
    if(disposed)return;
    const distance=distanceToYard();
    if(!state.ready&&(force||distance<MATERIAL_YARD.previewDistance))createAll();
    if(!state.ready)return;
    const active=force||distance<MATERIAL_YARD.unloadDistance;
    root.setEnabled(active);
    if(!active){
      for(const c of catalogue)dropDetail(c.id);
      state.nearest=null;return;
    }
    let nearest=null,best=Infinity;
    for(const c of state.entries){
      const d=Math.hypot(camera.position.x-c.x,camera.position.z-c.z);
      if(d<best){best=d;nearest=c;}
    }
    state.nearest=nearest?.id||null;
    const detailId=best<MATERIAL_YARD.detailDistance?nearest?.id:null;
    if(detailId!==pendingDetail){
      for(const c of catalogue)if(c.id!==detailId)dropDetail(c.id);
      if(detailId)detail(detailId);
      pendingDetail=detailId;
    }
    lastActive=distance;
  }
  function collides(x,z){
    if(!state.ready||!root.isEnabled())return false;
    for(const {x:px,z:pz} of state.entries){
      // Three-dimensional stacks are solid; the area between piles is walkable.
      if(Math.abs(x-px)<2.37&&Math.abs(z-pz)<1.72)return true;
    }
    return false;
  }
  function stats(){
    return {ready:state.ready,count:state.entries.length,
      ids:state.entries.map(o=>o.id),meshes:state.meshes,
      error:state.error,enabled:root.isEnabled(),
      nearest:state.nearest,detailMapLoaded:pendingDetail,
      center:{x:MATERIAL_YARD.x,z:MATERIAL_YARD.z},
      spawn:{x:MATERIAL_YARD.spawnX,z:MATERIAL_YARD.spawnZ},
      source:"Verified Poly Haven CC0 2K color, normal, ARM maps"};
  }
  return {update,collides,stats,spawn:{x:MATERIAL_YARD.spawnX,z:MATERIAL_YARD.spawnZ}};
}
