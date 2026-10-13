/**
 * The Wild's permanent shared village fire ring and rustic log seating.
 * Real walkable 3D objects, not a static photo. The flame animates for the
 * lifetime of the streamed terrain tile and cleans itself up on tile unload.
 */
import {VILLAGE_CLEARING} from "./wild-reference-layout.js?v=wide-plaza-20261013-v2";
import {cabinGrade} from "./wild-nature.js";

export function stageVillageCampfire(B,scene,track,{cx,cy,seed,surfaceHeight,materials}){
  const x=VILLAGE_CLEARING.fireX,z=VILLAGE_CLEARING.fireZ;
  if(Math.abs(x-cx)>88||Math.abs(z-cy)>88)return 0;
  const surface=surfaceHeight?.(x,z);
  const ground=Number.isFinite(surface)?surface:cabinGrade(x,z,seed);
  const X=x-cx,Z=z-cy;
  const {stone,frame,brick}=materials;
  const embers=track(new B.StandardMaterial("village warm glowing embers",scene));
  embers.diffuseColor=new B.Color3(.70,.13,.025);
  embers.emissiveColor=new B.Color3(.55,.11,.013);
  const ash=track(new B.StandardMaterial("charcoal and ash",scene));
  ash.diffuseColor=new B.Color3(.15,.115,.08);
  ash.specularColor=new B.Color3(.015,.01,.008);

  const build=(name,shape,opts,px,py,pz,mat)=>{
    const mesh=track(B.MeshBuilder[shape](name,opts,scene));
    mesh.position.set(px,py,pz);mesh.material=mat;mesh.isPickable=false;
    return mesh;
  };
  build("fire bed in native soil","CreateCylinder",{diameter:3.65,height:.12,tessellation:24},X,ground+.05,Z,ash);
  build("continuous glowing coals","CreateCylinder",{diameter:2.15,height:.13,tessellation:14},X,ground+.12,Z,embers);
  // Irregular fieldstone circle, stone by stone instead of a perfect torus.
  for(let i=0;i<18;i++){
    const a=i*Math.PI/9,dist=1.92+.18*Math.sin(i*17.4);
    const rock=build("hand laid sandstone fire ring "+i,"CreateSphere",
      {diameter:1,segments:6},X+Math.cos(a)*dist,ground+.34+Math.sin(i*4.3)*.045,
      Z+Math.sin(a)*dist,i%5===0?brick:stone);
    rock.scaling.set(.54+.12*Math.abs(Math.sin(i*6)),.36+.10*Math.abs(Math.cos(i*3)),
                     .40+.14*Math.abs(Math.cos(i*9)));
    rock.rotation.set(.15*Math.sin(i*3),a,.18*Math.cos(i*11));
  }
  // Crossed firewood is positioned above the embers.
  for(let i=0;i<5;i++){
    const log=build("stacked split firewood "+i,"CreateCylinder",
      {diameter:.27,height:2.12,tessellation:7},X+Math.sin(i*2)*.25,
      ground+.26+(i%3)*.13,Z+Math.cos(i*2)*.20,frame);
    log.rotation.z=Math.PI/2;log.rotation.y=i*1.23;
  }
  // Thick log benches face the fire, supported at both ends.
  const benches=[
    {x:0,z:-5.6,alongX:true},
    {x:0,z:5.9,alongX:true},
    {x:-6.0,z:0,alongX:false},
    {x:6.0,z:0,alongX:false}
  ];
  for(const [i,b] of benches.entries()){
    const seat=build("fire circle log seat "+i,"CreateCylinder",
      {diameter:.66,height:4.25,tessellation:10},
      X+b.x,ground+.65,Z+b.z,frame);
    seat.rotation[b.alongX?"z":"x"]=Math.PI/2;
    for(const side of [-1,1]){
      const sx=X+b.x+(b.alongX?side*1.6:0);
      const sz=Z+b.z+(b.alongX?0:side*1.6);
      const foot=build("log bench support "+i+" "+side,"CreateCylinder",
        {diameter:.69,height:.52,tessellation:8},sx,ground+.27,sz,frame);
      foot.rotation.y=i*.65;
    }
  }

  // Semi-transparent flame-sprite crossed planes are always active, with a
  // slight per-frame flicker and an actual warm point-light near the coals.
  const flameTexture=track(new B.DynamicTexture("live flame artwork",
    {width:128,height:256},scene,false));
  const ctx=flameTexture.getContext();
  ctx.clearRect(0,0,128,256);
  const outer=ctx.createRadialGradient(64,199,5,64,154,110);
  outer.addColorStop(0,"rgba(255,251,183,.96)");
  outer.addColorStop(.27,"rgba(255,174,34,.95)");
  outer.addColorStop(.65,"rgba(242,63,7,.61)");
  outer.addColorStop(1,"rgba(198,34,0,0)");
  ctx.fillStyle=outer;
  for(let i=0;i<6;i++){
    const xx=24+i*17,peak=15+(i*49)%89;
    ctx.beginPath();ctx.moveTo(xx-25,253);
    ctx.bezierCurveTo(xx-19,155,xx-29,115,xx,peak);
    ctx.bezierCurveTo(xx+14,100,xx+8,157,xx+25,253);
    ctx.closePath();ctx.fill();
  }
  const core=ctx.createLinearGradient(0,125,0,255);
  core.addColorStop(0,"rgba(255,230,102,.25)");
  core.addColorStop(.55,"rgba(255,243,135,.90)");
  core.addColorStop(1,"rgba(255,238,165,.98)");
  ctx.fillStyle=core;ctx.beginPath();ctx.moveTo(64,112);
  ctx.bezierCurveTo(96,187,76,211,96,255);
  ctx.lineTo(32,255);ctx.bezierCurveTo(55,210,35,164,64,112);ctx.fill();
  flameTexture.hasAlpha=true;flameTexture.update();
  const flameMat=track(new B.StandardMaterial("permanently burning fire",scene));
  flameMat.diffuseTexture=flameTexture;
  flameMat.useAlphaFromDiffuseTexture=true;
  flameMat.emissiveColor=new B.Color3(1,.65,.24);
  flameMat.disableLighting=true;
  flameMat.backFaceCulling=false;
  flameMat.alphaMode=B.Engine.ALPHA_COMBINE;
  const flames=[];
  for(let i=0;i<4;i++){
    const f=build("animated campfire flame "+i,"CreatePlane",
      {width:1.6,height:2.7,sideOrientation:B.Mesh.DOUBLESIDE},
      X+Math.cos(i*2.4)*.23,ground+1.36,Z+Math.sin(i*2.4)*.23,flameMat);
    f.rotation.y=i*Math.PI/4;
    flames.push(f);
  }
  const light=track(new B.PointLight("warm village campfire glow",
    new B.Vector3(x,ground+1.15,z),scene));
  light.diffuse=new B.Color3(1,.42,.13);
  light.intensity=1.5;light.range=13;
  let elapsed=0;
  const observer=scene.onBeforeRenderObservable.add(()=>{
    if(flames[0].isDisposed()){
      scene.onBeforeRenderObservable.remove(observer);
      return;
    }
    elapsed+=Math.min(.08,scene.getEngine().getDeltaTime()/1000);
    for(let i=0;i<flames.length;i++){
      const wave=Math.sin(elapsed*(8.2+i*.92)+i*1.8);
      flames[i].scaling.set(.88+.12*wave,.79+.13*wave,1);
      flames[i].position.y=ground+1.30+.11*wave;
    }
    light.intensity=1.17+.27*Math.sin(elapsed*11)+.10*Math.sin(elapsed*17.2);
  });
  return 1;
}
